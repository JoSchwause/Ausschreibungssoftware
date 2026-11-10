// SPDX-License-Identifier: AGPL-3.0-or-later
// Das eine gemeinsame Grid (U2): TanStack Table (Spaltenmodell) + TanStack Virtual (Zeilen) mit eigener Baum- und
// Editierlogik (ADR 0004). Vollständig gesteuert: Zeilen, Spalten und Summen kommen als Eigenschaften, jede
// Änderung geht als Befehl hinaus (A5). Das Grid rechnet nie (N1). Der einzige Zustand im Grid ist flüchtig:
// aktive Zelle, Zeilenauswahl, Eingabeentwurf, abgelehnte Eingaben und eine Statusmeldung.

import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import { useTable } from '@tanstack/react-table';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, FocusEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import type { KnotenId, LvSpalte } from '@tethys/vertrag';
import type { EditorAktionen, Richtung } from './Editor';
import { anzeigeText, befehlAusEingabe, istBearbeitbar } from './eingabe';
import { Hinweisleiste } from './Hinweisleiste';
import { planeEinfuegen } from './einfuegen';
import type { Einfuegeanker } from './einfuegen';
import { tabZiel, zielZelle } from './navigation';
import type { Raster, Zelle } from './navigation';
import { SPALTENBREITE, STANDARDSPALTEN, features, spaltenDefinitionen } from './tabelle';
import { meldungEingefuegt, texte } from './texte';
import { parseTsv } from './tsv';
import type { LvGridProps } from './typen';
import { Zeile } from './Zeile';
import type { Abgelehnt } from './Zeile';

const KEINE_AUSWAHL: ReadonlySet<string> = new Set();
const KEINE_ABLEHNUNGEN: ReadonlyMap<string, Abgelehnt> = new Map();
const FLEXSPALTE: LvSpalte = 'kurztext';

interface Aktiv {
  readonly id: string;
  readonly spalte: LvSpalte;
}
interface Bearbeitung extends Aktiv {
  readonly entwurf: string;
}
type Auswahlart = 'ersetzen' | 'erweitern';

const schluessel = (id: string, spalte: LvSpalte): string => `${id}|${spalte}`;

function istSpalte(wert: string | undefined, spalten: readonly LvSpalte[]): LvSpalte | null {
  return spalten.find((s) => s === wert) ?? null;
}

export function LvGrid(props: LvGridProps): ReactElement {
  const { ansicht, zahlen, ids, onBefehl, onAufklappen, onAuswahlChange } = props;
  const spalten = props.spalten ?? STANDARDSPALTEN;
  const baumspalte = props.baumspalte ?? 'kurztext';
  const zh = props.zeilenhoehe ?? 28;
  const zeilen = ansicht.zeilen;

  // --- TanStack Table: Spalten-, Kopf- und Zellenmodell ----------------------------------------------------
  const columns = useMemo(() => spaltenDefinitionen(spalten), [spalten]);
  const table = useTable({ features, columns, data: zeilen, getRowId: (z) => z.knoten.id }, () => ({}));
  const rows = table.getRowModel().rows;
  const kopf = table.getHeaderGroups()[0]?.headers ?? [];

  const vorlage = useMemo(
    () =>
      spalten
        .map((s) =>
          s === FLEXSPALTE ? `minmax(${String(SPALTENBREITE[s])}px, 1fr)` : `${String(SPALTENBREITE[s])}px`,
        )
        .join(' '),
    [spalten],
  );
  const mindestbreite = useMemo(() => spalten.reduce((summe, s) => summe + SPALTENBREITE[s], 0), [spalten]);

  // --- flüchtiger Zustand -------------------------------------------------------------------------------------
  const [aktiv, setAktiv] = useState<Aktiv | null>(null);
  const [bearbeitung, setBearbeitung] = useState<Bearbeitung | null>(null);
  const [auswahl, setAuswahlZustand] = useState<ReadonlySet<string>>(KEINE_AUSWAHL);
  const [abgelehnt, setAbgelehnt] = useState<ReadonlyMap<string, Abgelehnt>>(KEINE_ABLEHNUNGEN);
  const [status, setStatus] = useState('');
  const anker = useRef<string | null>(null);
  const letzterIndex = useRef(0);
  const fokusAnfrage = useRef(false);
  const editorBeendet = useRef(false);
  const wurzel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const indexVonId = useMemo(() => {
    const m = new Map<string, number>();
    zeilen.forEach((z, i) => m.set(z.knoten.id, i));
    return m;
  }, [zeilen]);

  // Die aktive Zelle wird über die Knotenkennung gehalten: Sie bleibt an ihrem Knoten, wenn Zeilen davor
  // dazukommen oder wegfallen. Verschwindet der Knoten (zugeklappt, gelöscht), gilt die Zeile am letzten Index.
  const aktivIndex =
    zeilen.length === 0
      ? -1
      : aktiv
        ? (indexVonId.get(aktiv.id) ?? Math.min(letzterIndex.current, zeilen.length - 1))
        : 0;
  const aktivSpaltenIndex = Math.max(0, aktiv ? spalten.indexOf(aktiv.spalte) : 0);
  const aktivSpalte = spalten[aktivSpaltenIndex];
  const aktiveZeile = aktivIndex >= 0 ? zeilen[aktivIndex] : undefined;
  const aktiveId = aktiveZeile?.knoten.id;

  useLayoutEffect(() => {
    if (aktivIndex >= 0) letzterIndex.current = aktivIndex;
  });

  // Ein Entwurf an einem verschwundenen Knoten ist hinfällig.
  const bearbeitungGueltig = bearbeitung !== null && indexVonId.has(bearbeitung.id) ? bearbeitung : null;
  useLayoutEffect(() => {
    if (bearbeitung !== null && bearbeitungGueltig === null) setBearbeitung(null);
  }, [bearbeitung, bearbeitungGueltig]);

  // --- Virtualisierung ---------------------------------------------------------------------------------------
  const aktivIndexRef = useRef(aktivIndex);
  aktivIndexRef.current = aktivIndex;
  const virtualizer = useVirtualizer({
    count: zeilen.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => zh,
    overscan: 10,
    scrollMargin: zh,
    scrollPaddingStart: zh,
    getItemKey: (i) => zeilen[i]?.knoten.id ?? i,
    // Die aktive Zeile bleibt immer im DOM, auch wenn sie aus dem Sichtbereich scrollt: So überlebt der Fokus
    // die Virtualisierung und das Grid bleibt per Tab erreichbar.
    rangeExtractor: (bereich) => {
      const basis = defaultRangeExtractor(bereich);
      const a = aktivIndexRef.current;
      if (a < 0 || a >= bereich.count || basis.includes(a)) return basis;
      const ergebnis = [...basis, a];
      ergebnis.sort((x, y) => x - y);
      return ergebnis;
    },
  });
  const seite = useCallback(() => {
    const h = scroller.current?.clientHeight ?? 0;
    return Math.max(1, Math.floor((h - zh) / zh) - 1);
  }, [zh]);
  const raster = (): Raster => ({ zeilen: zeilen.length, spalten: spalten.length, seite: seite() });

  // --- Auswahl --------------------------------------------------------------------------------------------------
  const setzeAuswahl = (neu: ReadonlySet<string>): void => {
    setAuswahlZustand(neu);
    if (onAuswahlChange) {
      onAuswahlChange(zeilen.filter((z) => neu.has(z.knoten.id)).map((z) => z.knoten.id as KnotenId));
    }
  };
  const waehleBereich = (von: string | null, bis: number): ReadonlySet<string> => {
    const a = von === null ? bis : (indexVonId.get(von) ?? bis);
    const [lo, hi] = a <= bis ? [a, bis] : [bis, a];
    const m = new Set<string>();
    for (let i = lo; i <= hi; i++) {
      const z = zeilen[i];
      if (z) m.add(z.knoten.id);
    }
    return m;
  };

  // --- Aktivieren, Fokus ------------------------------------------------------------------------------------
  const aktiviere = (ziel: Zelle, auswahlart: Auswahlart | null, mitFokus: boolean): void => {
    const z = zeilen[ziel.zeile];
    const spalte = spalten[ziel.spalte];
    if (!z || spalte === undefined) return;
    setAktiv({ id: z.knoten.id, spalte });
    if (auswahlart === 'ersetzen') {
      anker.current = z.knoten.id;
      setzeAuswahl(new Set([z.knoten.id]));
    } else if (auswahlart === 'erweitern') {
      anker.current ??= aktiveId ?? z.knoten.id;
      setzeAuswahl(waehleBereich(anker.current, ziel.zeile));
    }
    if (mitFokus) {
      fokusAnfrage.current = true;
      virtualizer.scrollToIndex(ziel.zeile, { align: 'auto' });
    }
  };

  useLayoutEffect(() => {
    if (!fokusAnfrage.current || bearbeitungGueltig !== null || aktivIndex < 0 || aktivSpalte === undefined)
      return;
    const el = wurzel.current?.querySelector<HTMLElement>(
      `[data-i="${String(aktivIndex)}"] [data-spalte="${aktivSpalte}"]`,
    );
    if (el) {
      el.focus({ preventScroll: true });
      fokusAnfrage.current = false;
    }
  });

  // --- Bearbeiten ---------------------------------------------------------------------------------------------
  const ablehnungFuer = (id: string, spalte: LvSpalte, text: string): Abgelehnt | undefined => {
    const a = abgelehnt.get(schluessel(id, spalte));
    return a?.basis === text ? a : undefined;
  };
  const entferneAblehnung = (id: string, spalte: LvSpalte): void => {
    setAbgelehnt((alt) => {
      if (!alt.has(schluessel(id, spalte))) return alt;
      const neu = new Map(alt);
      neu.delete(schluessel(id, spalte));
      return neu;
    });
  };

  const beginneBearbeitung = (zi: number, spalte: LvSpalte, startText?: string): void => {
    const z = zeilen[zi];
    if (!z) return;
    if (!istBearbeitbar(z, spalte)) {
      setStatus(texte.schreibgeschuetzt);
      return;
    }
    const anzeige = anzeigeText(z, spalte, zahlen);
    editorBeendet.current = false;
    setStatus('');
    setBearbeitung({
      id: z.knoten.id,
      spalte,
      entwurf: startText ?? ablehnungFuer(z.knoten.id, spalte, anzeige)?.text ?? anzeige,
    });
  };

  /** Übernimmt einen Text in eine bestehende Zelle: ein Befehl, keine Änderung oder eine markierte Ablehnung. */
  const uebernimmText = (zi: number, spalte: LvSpalte, text: string): void => {
    const z = zeilen[zi];
    if (!z) return;
    const r = befehlAusEingabe(z, spalte, text, zahlen);
    switch (r.art) {
      case 'befehl':
        entferneAblehnung(z.knoten.id, spalte);
        onBefehl(r.befehl);
        break;
      case 'keine-aenderung':
        entferneAblehnung(z.knoten.id, spalte);
        break;
      case 'ungueltig':
        setAbgelehnt((alt) =>
          new Map(alt).set(schluessel(z.knoten.id, spalte), {
            text,
            meldung: r.meldung,
            basis: anzeigeText(z, spalte, zahlen),
          }),
        );
        setStatus(`${texte.eingabeUngueltig}: ${r.meldung}`);
        break;
      case 'schreibgeschuetzt':
        setStatus(texte.schreibgeschuetzt);
        break;
    }
  };

  const schliesseEditor = (): Bearbeitung | null => {
    const b = bearbeitungGueltig;
    editorBeendet.current = true;
    setBearbeitung(null);
    return b;
  };

  const bewege = (von: Zelle, richtung: Richtung): Zelle => {
    switch (richtung) {
      case 'unten':
        return { zeile: Math.min(von.zeile + 1, zeilen.length - 1), spalte: von.spalte };
      case 'oben':
        return { zeile: Math.max(von.zeile - 1, 0), spalte: von.spalte };
      case 'rechts':
        return tabZiel(von, false, raster()) ?? von;
      case 'links':
        return tabZiel(von, true, raster()) ?? von;
      case 'keine':
        return von;
    }
  };

  const editorAktionen: EditorAktionen = {
    entwurf: (text) => {
      setBearbeitung((b) => (b ? { ...b, entwurf: text } : b));
    },
    bestaetigen: (richtung) => {
      const b = schliesseEditor();
      if (!b) return;
      const zi = indexVonId.get(b.id);
      if (zi === undefined) return;
      uebernimmText(zi, b.spalte, b.entwurf);
      const von = { zeile: zi, spalte: Math.max(0, spalten.indexOf(b.spalte)) };
      aktiviere(bewege(von, richtung), 'ersetzen', true);
    },
    tab: (rueckwaerts) => {
      const b = bearbeitungGueltig;
      if (!b) return false;
      const zi = indexVonId.get(b.id);
      if (zi === undefined) return false;
      const von = { zeile: zi, spalte: Math.max(0, spalten.indexOf(b.spalte)) };
      const ziel = tabZiel(von, rueckwaerts, raster());
      schliesseEditor();
      uebernimmText(zi, b.spalte, b.entwurf);
      if (ziel === null) {
        // Anfang/Ende des Grids: Der Fokus verlässt das Grid wie bei jedem anderen Tab, kein Tastaturfang.
        fokusAnfrage.current = true;
        return false;
      }
      aktiviere(ziel, 'ersetzen', true);
      return true;
    },
    verwerfen: () => {
      schliesseEditor();
      fokusAnfrage.current = true;
      setStatus('');
    },
    verloren: () => {
      if (editorBeendet.current) return;
      const b = schliesseEditor();
      if (!b) return;
      const zi = indexVonId.get(b.id);
      if (zi !== undefined) uebernimmText(zi, b.spalte, b.entwurf);
    },
  };
  // Der Editor sieht immer die aktuellsten Funktionen, die Zeilen bekommen aber einen stabilen Verweis.
  const editorRef = useRef(editorAktionen);
  editorRef.current = editorAktionen;
  const editorStabil = useMemo<EditorAktionen>(
    () => ({
      entwurf: (t) => {
        editorRef.current.entwurf(t);
      },
      bestaetigen: (r) => {
        editorRef.current.bestaetigen(r);
      },
      tab: (r) => editorRef.current.tab(r),
      verwerfen: () => {
        editorRef.current.verwerfen();
      },
      verloren: () => {
        editorRef.current.verloren();
      },
    }),
    [],
  );

  // --- Auf- und Zuklappen -----------------------------------------------------------------------------------
  const klappe = (zi: number, auf: boolean): void => {
    const z = zeilen[zi];
    if (z?.hatUnterknoten && z.aufgeklappt !== auf) onAufklappen?.(z.knoten.id, auf);
  };

  // --- Ereignisse (Delegation am Wurzelelement) ------------------------------------------------------------
  const zelleVon = (ziel: EventTarget | null): { zi: number; si: number; spalte: LvSpalte } | null => {
    if (!(ziel instanceof Element)) return null;
    const zelle = ziel.closest<HTMLElement>('[data-spalte]');
    const zeile = zelle?.closest<HTMLElement>('[data-i]');
    const spalte = istSpalte(zelle?.dataset['spalte'], spalten);
    const zi = Number(zeile?.dataset['i']);
    if (spalte === null || Number.isNaN(zi)) return null;
    return { zi, si: spalten.indexOf(spalte), spalte };
  };
  const imEditor = (ziel: EventTarget | null): boolean =>
    ziel instanceof Element && ziel.closest('[data-editor]') !== null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (imEditor(e.target)) return;
    const zelle = zelleVon(e.target);
    if (!zelle) return;
    const { zi, si, spalte } = zelle;
    const z = zeilen[zi];
    if (!z) return;
    const strg = e.ctrlKey || e.metaKey;
    const von: Zelle = { zeile: zi, spalte: si };

    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      klappe(zi, e.key === 'ArrowRight');
      return;
    }
    if (!strg && !e.altKey && !e.shiftKey && spalte === baumspalte && z.hatUnterknoten) {
      if (e.key === 'ArrowRight' && !z.aufgeklappt) {
        e.preventDefault();
        klappe(zi, true);
        return;
      }
      if (e.key === 'ArrowLeft' && z.aufgeklappt) {
        e.preventDefault();
        klappe(zi, false);
        return;
      }
    }

    switch (e.key) {
      case 'Tab': {
        const ziel = tabZiel(von, e.shiftKey, raster());
        if (ziel) {
          e.preventDefault();
          aktiviere(ziel, 'ersetzen', true);
        }
        return;
      }
      case 'F2':
        e.preventDefault();
        beginneBearbeitung(zi, spalte);
        return;
      case 'Enter':
        e.preventDefault();
        if (istBearbeitbar(z, spalte)) beginneBearbeitung(zi, spalte);
        else aktiviere(bewege(von, e.shiftKey ? 'oben' : 'unten'), 'ersetzen', true);
        return;
      case 'Escape':
        if (auswahl.size > 1) aktiviere(von, 'ersetzen', false);
        setStatus('');
        return;
      case 'Delete':
        if (istBearbeitbar(z, spalte)) {
          e.preventDefault();
          uebernimmText(zi, spalte, '');
        }
        return;
      case ' ': {
        e.preventDefault();
        const neu = new Set(auswahl);
        if (neu.has(z.knoten.id)) neu.delete(z.knoten.id);
        else neu.add(z.knoten.id);
        anker.current = z.knoten.id;
        setzeAuswahl(neu);
        return;
      }
      case 'a':
      case 'A':
        if (strg) {
          e.preventDefault();
          setzeAuswahl(new Set(zeilen.map((x) => x.knoten.id)));
          return;
        }
        break;
      default:
        break;
    }

    const ziel = zielZelle(e.key, strg, von, raster());
    const istNavigation = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ].includes(e.key);
    if (istNavigation) {
      e.preventDefault();
      if (ziel) aktiviere(ziel, e.shiftKey ? 'erweitern' : 'ersetzen', true);
      return;
    }
    if (e.key.length === 1 && !strg && !e.altKey && istBearbeitbar(z, spalte)) {
      e.preventDefault();
      beginneBearbeitung(zi, spalte, e.key);
    }
  };

  const onMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    if (imEditor(e.target)) return;
    if (e.target instanceof Element && e.target.closest('[data-aufklappen]')) {
      e.preventDefault(); // der Knopf nimmt keinen Fokus; das Auf-/Zuklappen läuft über onClick
      return;
    }
    const zelle = zelleVon(e.target);
    if (!zelle) return;
    const z = zeilen[zelle.zi];
    if (!z) return;
    setAktiv({ id: z.knoten.id, spalte: zelle.spalte });
    if (e.shiftKey) {
      anker.current ??= aktiveId ?? z.knoten.id;
      setzeAuswahl(waehleBereich(anker.current, zelle.zi));
    } else if (e.ctrlKey || e.metaKey) {
      const neu = new Set(auswahl);
      if (neu.has(z.knoten.id)) neu.delete(z.knoten.id);
      else neu.add(z.knoten.id);
      anker.current = z.knoten.id;
      setzeAuswahl(neu);
    } else {
      anker.current = z.knoten.id;
      setzeAuswahl(new Set([z.knoten.id]));
    }
  };

  const onClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (!(e.target instanceof Element) || !e.target.closest('[data-aufklappen]')) return;
    const zelle = zelleVon(e.target);
    const z = zelle ? zeilen[zelle.zi] : undefined;
    if (zelle && z) klappe(zelle.zi, !z.aufgeklappt);
  };

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (imEditor(e.target) || (e.target instanceof Element && e.target.closest('[data-aufklappen]'))) return;
    const zelle = zelleVon(e.target);
    if (zelle) beginneBearbeitung(zelle.zi, zelle.spalte);
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>): void => {
    if (imEditor(e.target)) return;
    const zelle = zelleVon(e.target);
    const z = zelle ? zeilen[zelle.zi] : undefined;
    if (zelle && z && (aktiv?.id !== z.knoten.id || aktiv.spalte !== zelle.spalte)) {
      setAktiv({ id: z.knoten.id, spalte: zelle.spalte });
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>): void => {
    if (imEditor(e.target)) return; // im Eingabefeld gilt das übliche Einfügen von Text
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    const matrix = parseTsv(text);
    if (matrix.length === 0) {
      setStatus(texte.leereZwischenablage);
      return;
    }
    // Eine einzelne Zelle ersetzt den Inhalt der aktiven Zelle wie eine Eingabe.
    const einzeln = matrix.length === 1 && matrix[0]?.length === 1;
    if (einzeln && aktiveZeile && aktivSpalte !== undefined) {
      uebernimmText(aktivIndex, aktivSpalte, matrix[0]?.[0] ?? '');
      return;
    }
    // In ein leeres LV (keine aktive Zeile) wird am Ende der Wurzel eingefügt.
    const einfuegeanker: Einfuegeanker = aktiveZeile
      ? { art: 'nach', knotenId: aktiveZeile.knoten.id }
      : { art: 'ende', elternId: ansicht.wurzelId };
    const plan = planeEinfuegen(matrix, aktivSpaltenIndex, spalten, einfuegeanker, zahlen, ids);
    for (const befehl of plan.befehle) onBefehl(befehl);
    if (plan.ungueltig.length > 0) {
      setAbgelehnt((alt) => {
        const neu = new Map(alt);
        for (const u of plan.ungueltig) {
          // Die neue Position ist noch nicht in der Ansicht. Ihr Feld ist leer (`null`), also ist der Anzeigetext leer.
          neu.set(schluessel(u.knotenId, u.spalte), { text: u.text, meldung: u.meldung, basis: '' });
        }
        return neu;
      });
    }
    setStatus(meldungEingefuegt(plan.befehle.length, plan.ungueltig.length, plan.uebersprungen));
  };

  // --- Darstellung ----------------------------------------------------------------------------------------------
  const abgelehntJeZeile = useMemo(() => {
    const m = new Map<string, Map<LvSpalte, Abgelehnt>>();
    for (const [key, wert] of abgelehnt) {
      const [id = '', spalte = ''] = key.split('|');
      const s = istSpalte(spalte, spalten);
      if (s === null) continue;
      const innen = m.get(id) ?? new Map<LvSpalte, Abgelehnt>();
      innen.set(s, wert);
      m.set(id, innen);
    }
    return m;
  }, [abgelehnt, spalten]);

  // --- Sprung aus einem Befehlshinweis ----------------------------------------------------------------------
  const springeZu = (knotenId: KnotenId): void => {
    const zi = indexVonId.get(knotenId);
    if (zi === undefined) {
      setStatus(texte.zeileNichtSichtbar);
      return;
    }
    aktiviere({ zeile: zi, spalte: aktivSpaltenIndex }, 'ersetzen', true);
  };

  const gesamt = ansicht.gesamt;
  // [Name, Wert, nicht im Netto]. Bedarfs- und Wahlsumme (F4, E-04) nur, wenn gesetzt, nach dem Brutto.
  const summen: [string, string, boolean][] = [];
  if (gesamt) {
    summen.push(
      [texte.summeNetto, zahlen.formatBetrag(gesamt.netto), false],
      [texte.summeNachlass, zahlen.formatBetrag(gesamt.nachlass), false],
      [texte.summeNettoNachNachlass, zahlen.formatBetrag(gesamt.nettoNachNachlass), false],
      [texte.summeMwst, zahlen.formatBetrag(gesamt.mwst), false],
      [texte.summeBrutto, zahlen.formatBetrag(gesamt.brutto), false],
    );
    if (gesamt.summeBedarfOhneGesamtbetrag !== undefined) {
      summen.push([texte.summeBedarf, zahlen.formatBetrag(gesamt.summeBedarfOhneGesamtbetrag), true]);
    }
    if (gesamt.summeWahl !== undefined) {
      summen.push([texte.summeWahl, zahlen.formatBetrag(gesamt.summeWahl), true]);
    }
  }

  return (
    <div className="tx-grid" ref={wurzel}>
      <div
        ref={scroller}
        className="tx-grid__scroll"
        role="treegrid"
        aria-label={props.beschriftung ?? texte.standardBeschriftung}
        aria-multiselectable="true"
        aria-rowcount={zeilen.length + 1}
        aria-colcount={spalten.length}
        tabIndex={zeilen.length === 0 ? 0 : undefined}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onFocus={onFocus}
        onPaste={onPaste}
        style={{ ['--tx-grid-zeilenhoehe' as string]: `${String(zh)}px` }}
      >
        <div role="rowgroup" className="tx-grid__kopf" style={{ minWidth: mindestbreite }}>
          <div
            role="row"
            aria-rowindex={1}
            className="tx-grid__kopfzeile"
            style={{ height: zh, gridTemplateColumns: vorlage, minWidth: mindestbreite }}
          >
            {kopf.map((h, i) => (
              <div
                key={h.id}
                role="columnheader"
                aria-colindex={i + 1}
                className={`tx-grid__kopfzelle tx-grid__kopfzelle--${h.column.id}`}
              >
                {h.isPlaceholder ? null : <table.FlexRender header={h} />}
              </div>
            ))}
          </div>
        </div>
        <div
          role="rowgroup"
          className="tx-grid__koerper"
          style={{ height: virtualizer.getTotalSize(), minWidth: mindestbreite }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            if (!row) return null;
            const id = row.original.knoten.id;
            const istAktiv = item.index === aktivIndex;
            const b = bearbeitungGueltig?.id === id ? bearbeitungGueltig : null;
            return (
              <Zeile
                key={row.id}
                row={row}
                index={item.index}
                versatz={item.start - zh}
                hoehe={zh}
                vorlage={vorlage}
                breite={mindestbreite}
                tabbar={istAktiv && aktivSpalte !== undefined ? aktivSpalte : null}
                aktiv={istAktiv && aktivSpalte !== undefined ? aktivSpalte : null}
                ausgewaehlt={auswahl.has(id)}
                bearbeitung={b ? { spalte: b.spalte, entwurf: b.entwurf } : null}
                abgelehnt={abgelehntJeZeile.get(id)}
                baumspalte={baumspalte}
                zahlen={zahlen}
                editor={editorStabil}
              />
            );
          })}
        </div>
        {zeilen.length === 0 ? <p className="tx-grid__leer">{texte.leer}</p> : null}
      </div>
      <Hinweisleiste hinweise={props.hinweise ?? []} onSprung={springeZu} />
      <div className="tx-grid__status" role="status" aria-live="polite">
        {status}
      </div>
      <div className="tx-grid__summen" role="group" aria-label={texte.summen}>
        {gesamt ? (
          summen.map(([name, wert, ausweis]) => (
            <div key={name} className={ausweis ? 'tx-grid__summe tx-grid__summe--ausweis' : 'tx-grid__summe'}>
              <span className="tx-grid__summe-name">{name}</span>
              <span className="tx-grid__summe-wert">{wert}</span>
              {ausweis ? <span className="tx-grid__summe-vermerk">({texte.nichtImNetto})</span> : null}
            </div>
          ))
        ) : (
          <span className="tx-grid__summe-name">{texte.keineSummen}</span>
        )}
      </div>
    </div>
  );
}

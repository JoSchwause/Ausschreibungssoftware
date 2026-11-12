// SPDX-License-Identifier: AGPL-3.0-or-later
// Das eine gemeinsame Grid (U2): TanStack Table (Spaltenmodell) + TanStack Virtual (Zeilen) mit eigener Baum- und
// Editierlogik (ADR 0004). Vollständig gesteuert: Zeilen, Spalten und Summen kommen als Eigenschaften, jede
// Änderung geht als Befehl hinaus (A5). Das Grid rechnet nie (N1). Der einzige Zustand im Grid ist flüchtiger
// Bedienzustand: aktive Zelle, Zeilenauswahl, Eingabeentwurf, abgelehnte Eingaben, Merkliste der Zwischenablage,
// offene Rückfrage und eine Statusmeldung.

import { useTable } from '@tanstack/react-table';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, FocusEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import type {
  Einfuegeort,
  KnotenId,
  KostengruppeSetzen,
  LvBefehl,
  LvSpalte,
  LvZeile,
  PositionAnlegen,
} from '@tethys/vertrag';
import { Button, Dialog } from '@tethys/ui-basis';
import type { EditorAktionen, Richtung } from './Editor';
import {
  anzeigeText,
  befehlAusEingabe,
  istBearbeitbar,
  istBearbeitbareSpalte,
  leseKostengruppe,
} from './eingabe';
import { Hinweisleiste } from './Hinweisleiste';
import { leerePositionsdaten, planeEinfuegen, planeKostengruppen } from './einfuegen';
import type { Einfuegeanker, UngueltigeZelle } from './einfuegen';
import { NAVIGATIONSTASTEN, klappAbsicht, useGridKern, useSprung } from './gridKern';
import { tabZiel, zielZelle } from './navigation';
import type { Zelle } from './navigation';
import { SPALTENBREITE, STANDARDSPALTEN, features, spaltenDefinitionen } from './tabelle';
import { frageLoeschen, meldungEingefuegt, meldungKostengruppen, meldungZeilen, texte } from './texte';
import { parseTsv } from './tsv';
import type { LvGridProps } from './typen';
import { Zeile } from './Zeile';
import type { Abgelehnt } from './Zeile';
import { liegtInMenge, loeschUmfang, obersteKnoten, planeVerschieben, zeilenAlsTsv } from './zeilenaktionen';
import type { Verschieberichtung } from './zeilenaktionen';

const KEINE_AUSWAHL: ReadonlySet<string> = new Set();
const KEINE_ABLEHNUNGEN: ReadonlyMap<string, Abgelehnt> = new Map();
const FLEXSPALTE: LvSpalte = 'kurztext';

interface Bearbeitung {
  readonly id: string;
  readonly spalte: LvSpalte;
  readonly entwurf: string;
}
type Auswahlart = 'ersetzen' | 'erweitern';

/** Was das Grid zuletzt in die Zwischenablage geschrieben hat (Bedienzustand, Ticket 46). */
interface Merkliste {
  /**
   * Der geschriebene Text; nur wenn die Zwischenablage genau ihn enthält (oder das Schreiben noch läuft), gilt das
   * Einfügen als eigenes.
   */
  readonly text: string;
  /** Die obersten kopierten Knoten in Anzeigereihenfolge. */
  readonly knotenIds: readonly KnotenId[];
  readonly art: 'kopiert' | 'ausgeschnitten';
  /** Die ausgewählten Zeilen beim Kopieren (für die Markierung „ausgeschnitten“). */
  readonly zeilen: ReadonlySet<string>;
}

interface Rueckfrage {
  readonly knotenIds: readonly KnotenId[];
  readonly frage: string;
}

/** Zeilenumbrüche vereinheitlichen: Die Zwischenablage des Systems darf `\r\n` und `\n` tauschen. */
const zeilenumbruchNormal = (text: string): string => text.replace(/\r\n?/g, '\n');

const schluessel = (id: string, spalte: LvSpalte): string => `${id}|${spalte}`;

function istSpalte(wert: string | undefined, spalten: readonly LvSpalte[]): LvSpalte | null {
  return spalten.find((s) => s === wert) ?? null;
}

export function LvGrid(props: LvGridProps): ReactElement {
  const { ansicht, zahlen, onAufklappen, onAuswahlChange, onAktiveZeileChange, onZeileOeffnen, sprungziel } =
    props;
  /**
   * Die Ausgänge für Änderungen (Befehle, Kennungen), nur im bearbeitbaren Grid. Im schreibgeschützten Grid ist er
   * `null`: Kein Weg führt dort zu einem Befehl (Ticket 54, Punkt 3).
   */
  const aenderung = props.schreibgeschuetzt === true ? null : props;
  const nurLesen = aenderung === null;
  /** Ausgang der Spalte „KG“ im schreibgeschützten Grid (Ticket 93), sonst `null`. */
  const kgAusnahme = props.schreibgeschuetzt === true ? (props.onKostengruppen ?? null) : null;
  /**
   * Die Lesefunktion der Spalte „KG“, wenn die Spalte hier bearbeitbar ist: mit Lesefunktion der App, im
   * schreibgeschützten Grid nur mit `onKostengruppen` (Ticket 93).
   */
  const kgLeser = nurLesen && kgAusnahme === null ? undefined : props.kostengruppeLesen;
  const kgBearbeitbar = kgLeser !== undefined;
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

  /** Spalten, die sich in diesem Grid bearbeiten lassen (an den passenden Zeilen, `istBearbeitbar`). */
  const bearbeitbareSpalten = useMemo(
    (): ReadonlySet<LvSpalte> =>
      new Set(
        spalten.filter((s) => istBearbeitbareSpalte(s) && (s === 'kostengruppe' ? kgBearbeitbar : !nurLesen)),
      ),
    [spalten, kgBearbeitbar, nurLesen],
  );
  /** Schreibgeschützt bis auf die Spalte „KG“ (Ticket 93, z. B. Auftrags-LV). */
  const nurKg = nurLesen && bearbeitbareSpalten.has('kostengruppe');
  const schreibschutzText = nurKg ? texte.gridNurKostengruppe : texte.gridSchreibgeschuetzt;
  // Hinweis zur Form im Editor der Spalte „KG“: stabil für die memoisierten Zeilen, liest immer die aktuelle Funktion.
  const kgLeserRef = useRef(kgLeser);
  kgLeserRef.current = kgLeser;
  const kgPruefen = useMemo(
    () =>
      kgBearbeitbar
        ? (text: string): string | undefined => {
            const lesen = kgLeserRef.current;
            if (lesen === undefined) return undefined;
            const r = leseKostengruppe(text, lesen);
            return r.ok ? undefined : r.meldung;
          }
        : undefined,
    [kgBearbeitbar],
  );

  // --- flüchtiger Zustand -------------------------------------------------------------------------------------
  const [bearbeitung, setBearbeitung] = useState<Bearbeitung | null>(null);
  const [auswahl, setAuswahlZustand] = useState<ReadonlySet<string>>(KEINE_AUSWAHL);
  const [abgelehnt, setAbgelehnt] = useState<ReadonlyMap<string, Abgelehnt>>(KEINE_ABLEHNUNGEN);
  const [status, setStatus] = useState('');
  const [merkliste, setMerkliste] = useState<Merkliste | null>(null);
  /** Text, den das Grid gerade in die System-Zwischenablage schreibt; `null`, sobald `writeText` fertig ist. */
  const schreibtNoch = useRef<string | null>(null);
  const [rueckfrage, setRueckfrage] = useState<Rueckfrage | null>(null);
  /** Bestätigen-Schaltfläche der Rückfrage: Anfangsfokus des Dialogs, damit Enter bestätigt (D-26). */
  const bestaetigen = useRef<HTMLButtonElement>(null);
  /** Nur ein Anstoß zum Neuzeichnen, damit eine Fokusanfrage außerhalb eines Ereignisses ausgeführt wird. */
  const [, setFokusRunde] = useState(0);
  /** Neue Zeile, die nach dem Befehl in den Eigenschaften erscheinen soll und dann den Fokus bekommt. */
  const wartetAuf = useRef<{ readonly id: string; readonly spalte: LvSpalte } | null>(null);
  const anker = useRef<string | null>(null);
  const editorBeendet = useRef(false);
  const nurLesenId = `${useId()}-nur-lesen`;

  // Ein Entwurf an einem verschwundenen Knoten ist hinfällig.
  const zeilenIds = useMemo((): readonly string[] => zeilen.map((z) => z.knoten.id), [zeilen]);
  const bearbeitungGueltig = bearbeitung !== null && zeilenIds.includes(bearbeitung.id) ? bearbeitung : null;

  // Aktive Zelle, Virtualisierung, Fokus: der gemeinsame Kern (U2). Die aktive Zeile meldet er nach dem Rendern,
  // sobald sie sich ändert, gleich aus welchem Grund (Ticket 54, Punkt 1).
  const kern = useGridKern({
    zeilenIds,
    spalten,
    zeilenhoehe: zh,
    kopfhoehe: zh,
    fokusGesperrt: bearbeitungGueltig !== null,
    onAktiveZeileChange:
      onAktiveZeileChange &&
      ((id) => {
        onAktiveZeileChange(id as KnotenId | null);
      }),
  });
  const {
    wurzel,
    scroller,
    virtualizer,
    indexVonId,
    aktiv,
    setAktiv,
    aktivIndex,
    aktivSpaltenIndex,
    aktivSpalte,
  } = kern;
  const { aktiveId, fokusAnfrage, scrollAnfrage, raster, zelleVon } = kern;
  const aktiveZeile = aktivIndex >= 0 ? zeilen[aktivIndex] : undefined;

  /** Ob sich die Zelle bearbeiten lässt; im schreibgeschützten Grid keine (außer der Spalte „KG“ mit Ausgang). */
  const bearbeitbar = (z: LvZeile, spalte: LvSpalte): boolean =>
    bearbeitbareSpalten.has(spalte) && istBearbeitbar(z, spalte);
  /** Ansage, wenn im schreibgeschützten Grid etwas geändert werden soll. */
  const meldeNurLesen = (): void => {
    setStatus(schreibschutzText);
  };

  useLayoutEffect(() => {
    if (bearbeitung !== null && bearbeitungGueltig === null) setBearbeitung(null);
  }, [bearbeitung, bearbeitungGueltig]);

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
    if (!z || spalten[ziel.spalte] === undefined) return;
    wartetAuf.current = null;
    kern.zeigeZelle(ziel, mitFokus);
    if (auswahlart === 'ersetzen') {
      anker.current = z.knoten.id;
      setzeAuswahl(new Set([z.knoten.id]));
    } else if (auswahlart === 'erweitern') {
      anker.current ??= aktiveId ?? z.knoten.id;
      setzeAuswahl(waehleBereich(anker.current, ziel.zeile));
    }
  };

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
    if (nurLesen && !bearbeitbareSpalten.has(spalte)) {
      meldeNurLesen();
      return;
    }
    if (!bearbeitbar(z, spalte)) {
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

  /** Eine Eingabe, ein Befehl; im schreibgeschützten Grid nur eine Kostengruppe, als Folge (Ticket 93). */
  const sendeEingabe = (befehl: LvBefehl): void => {
    if (aenderung) aenderung.onBefehl(befehl);
    else if (befehl.art === 'KostengruppeSetzen') kgAusnahme?.([befehl]);
  };

  /** Übernimmt einen Text in eine bestehende Zelle: ein Befehl, keine Änderung oder eine markierte Ablehnung. */
  const uebernimmText = (zi: number, spalte: LvSpalte, text: string): void => {
    const z = zeilen[zi];
    if (!z) return;
    if (!bearbeitbareSpalten.has(spalte)) {
      if (nurLesen) meldeNurLesen();
      else setStatus(texte.schreibgeschuetzt);
      return;
    }
    const r = befehlAusEingabe(z, spalte, text, zahlen, kgLeser);
    switch (r.art) {
      case 'befehl':
        entferneAblehnung(z.knoten.id, spalte);
        sendeEingabe(r.befehl);
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

  // --- Zeilenaktionen (Ticket 46) ------------------------------------------------------------------------------
  /** Die ausgewählten Zeilen, die noch in der Ansicht stehen; ohne solche die aktive Zeile. */
  const auswahlOderAktiv = (): ReadonlySet<string> => {
    const vorhanden = [...auswahl].filter((id) => indexVonId.has(id));
    if (vorhanden.length > 0) return new Set(vorhanden);
    return aktiveId === undefined ? KEINE_AUSWAHL : new Set([aktiveId]);
  };
  /** Hinter der aktiven Zeile (bei einer Gliederung: als erstes Kind), im leeren LV am Ende der Wurzel. */
  const ortHinterAktiv = (): Einfuegeort =>
    aktiveZeile === undefined
      ? { art: 'ende', elternId: ansicht.wurzelId }
      : { art: 'nach', knotenId: aktiveZeile.knoten.id };
  /** Eine Benutzeraktion, eine Befehlsfolge (Punkt 6). */
  const sendeFolge = (befehle: readonly LvBefehl[]): void => {
    if (befehle.length === 0 || !aenderung) return;
    if (aenderung.onBefehlsfolge) aenderung.onBefehlsfolge(befehle);
    else for (const b of befehle) aenderung.onBefehl(b);
  };
  /** Kostengruppen aus einer Aktion als eine Folge, auch im schreibgeschützten Grid mit Ausnahme (Ticket 93). */
  const sendeKostengruppen = (befehle: readonly KostengruppeSetzen[]): void => {
    if (aenderung) sendeFolge(befehle);
    else if (befehle.length > 0) kgAusnahme?.(befehle);
  };
  /**
   * Markiert Zellen, deren eingefügter Text nicht gelesen wurde (U5). Basis ist der Anzeigetext der Zeile, wenn sie schon
   * in der Ansicht steht; eine neue Position ist es noch nicht, ihr Feld ist leer, also auch ihr Anzeigetext.
   */
  const markiereUngueltig = (liste: readonly UngueltigeZelle[]): void => {
    if (liste.length === 0) return;
    setAbgelehnt((alt) => {
      const neu = new Map(alt);
      for (const u of liste) {
        const zi = indexVonId.get(u.knotenId);
        const z = zi === undefined ? undefined : zeilen[zi];
        const basis = z ? anzeigeText(z, u.spalte, zahlen) : '';
        neu.set(schluessel(u.knotenId, u.spalte), { text: u.text, meldung: u.meldung, basis });
      }
      return neu;
    });
  };
  /**
   * Eine Spalte aus der Zwischenablage in die Spalte „KG“ (Ticket 93, D-93.2): setzt die Kostengruppen der Zeilen ab der
   * aktiven, statt Positionen anzulegen. `false`, wenn der Block nicht so aussieht (dann gilt das übliche Einfügen).
   */
  const fuelleKostengruppen = (matrix: readonly (readonly string[])[]): boolean => {
    if (
      aktivSpalte !== 'kostengruppe' ||
      kgLeser === undefined ||
      !bearbeitbareSpalten.has('kostengruppe') ||
      aktivIndex < 0 ||
      matrix.length === 0 ||
      matrix.some((z) => z.length !== 1)
    ) {
      return false;
    }
    if (matrix.length === 1) {
      uebernimmText(aktivIndex, 'kostengruppe', matrix[0]?.[0] ?? '');
      return true;
    }
    const plan = planeKostengruppen(matrix, aktivIndex, zeilen, kgLeser);
    sendeKostengruppen(plan.befehle);
    markiereUngueltig(plan.ungueltig);
    setStatus(meldungKostengruppen(plan.befehle.length, plan.ungueltig.length, plan.uebersprungen));
    return true;
  };

  /** Strg+C auch im schreibgeschützten Grid (es ändert nichts); Strg+X nur im bearbeitbaren. */
  const kopiere = (ausschneiden: boolean): void => {
    if (ausschneiden && nurLesen) {
      meldeNurLesen();
      return;
    }
    const menge = auswahlOderAktiv();
    if (menge.size === 0) return;
    const text = zeilenAlsTsv(zeilen, menge, spalten, zahlen);
    setMerkliste({
      text,
      knotenIds: obersteKnoten(zeilen, menge),
      art: ausschneiden ? 'ausgeschnitten' : 'kopiert',
      zeilen: menge,
    });
    setStatus(meldungZeilen(menge.size, ausschneiden ? 'ausgeschnitten' : 'kopiert'));
    // Die System-Zwischenablage ist asynchron (Chrome ist erst nach dem nächsten Bild fertig); die Merkliste gilt
    // sofort, auch für ein Einfügen, bevor das Schreiben fertig ist (siehe `onPaste`).
    schreibtNoch.current = text;
    const geschrieben = (): void => {
      if (schreibtNoch.current === text) schreibtNoch.current = null;
    };
    navigator.clipboard.writeText(text).then(geschrieben, () => {
      geschrieben();
      setStatus(texte.zwischenablageGesperrt);
    });
  };

  const fragLoeschen = (): void => {
    if (!aenderung) {
      meldeNurLesen();
      return;
    }
    const knotenIds = obersteKnoten(zeilen, auswahlOderAktiv());
    if (knotenIds.length === 0) return;
    setRueckfrage({
      knotenIds,
      frage: frageLoeschen(loeschUmfang(zeilen, knotenIds, aenderung.positionenZaehlen)),
    });
  };
  const bestaetigeLoeschen = (): void => {
    if (!rueckfrage || !aenderung) return;
    setRueckfrage(null);
    aenderung.onBefehl({
      art: 'KnotenInPapierkorbLegen',
      eintragId: aenderung.ids.papierkorbeintrag(),
      knotenIds: rueckfrage.knotenIds,
    });
    setStatus(texte.inPapierkorb);
    // Die gelöschte Zeile hatte den Fokus, als der Dialog aufging; der Dialog kann ihn nicht zurückgeben. Erst wenn er
    // geschlossen ist (Fokusfalle abgebaut), holt das Grid den Fokus auf die aktive Zelle.
    window.setTimeout(() => {
      fokusAnfrage.current = true;
      setFokusRunde((n) => n + 1);
    }, 0);
  };
  const brichLoeschenAb = (): void => {
    setRueckfrage(null);
    setStatus(texte.loeschenAbgebrochen);
  };

  const verschiebe = (richtung: Verschieberichtung): void => {
    if (!aenderung) {
      meldeNurLesen();
      return;
    }
    const befehl = planeVerschieben(zeilen, obersteKnoten(zeilen, auswahlOderAktiv()), richtung);
    if (!befehl) {
      setStatus(texte.verschiebenNichtMoeglich);
      return;
    }
    fokusAnfrage.current = true;
    scrollAnfrage.current = true;
    aenderung.onBefehl(befehl);
    setStatus(texte.verschoben);
  };

  const legePositionAn = (): void => {
    if (!aenderung) {
      meldeNurLesen();
      return;
    }
    let befehl: PositionAnlegen = {
      art: 'PositionAnlegen',
      id: aenderung.ids.position(),
      ort: ortHinterAktiv(),
      daten: leerePositionsdaten(),
    };
    if (aenderung.vorPositionAnlegen) befehl = aenderung.vorPositionAnlegen(befehl);
    // Eine zugeklappte Gliederung bekommt die Position als erstes Kind; aufklappen, damit sie sichtbar wird.
    if (aktiveZeile?.hatUnterknoten && !aktiveZeile.aufgeklappt) klappe(aktivIndex, true);
    wartetAuf.current = {
      id: befehl.id,
      spalte: spalten.includes('kurztext') ? 'kurztext' : (aktivSpalte ?? 'kurztext'),
    };
    aenderung.onBefehl(befehl);
    setStatus(texte.positionAngelegt);
  };

  // Eine neu angelegte Zeile bekommt den Fokus, sobald sie in den Eigenschaften steht (Strg+Plus).
  useLayoutEffect(() => {
    const w = wartetAuf.current;
    const zi = w ? indexVonId.get(w.id) : undefined;
    if (!w || zi === undefined) return;
    aktiviere({ zeile: zi, spalte: Math.max(0, spalten.indexOf(w.spalte)) }, 'ersetzen', true);
  });

  // Sprungziel (Prüf-Links): ein neuer Wert von `nr` springt zur Zelle; eine nicht sichtbare Zeile übergeht das Grid.
  useSprung(
    sprungziel && { zeilenId: sprungziel.knotenId, spalte: sprungziel.spalte, nr: sprungziel.nr },
    kern,
    spalten,
    (ziel) => {
      aktiviere(ziel, 'ersetzen', true);
    },
  );

  // --- Ereignisse (Delegation am Wurzelelement) ------------------------------------------------------------
  const imEditor = (ziel: EventTarget | null): boolean =>
    ziel instanceof Element && ziel.closest('[data-editor]') !== null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (imEditor(e.target)) return;
    const zelle = zelleVon(e.target);
    if (!zelle) {
      // Leeres LV: Strg+Plus legt die erste Position an (W-06).
      if (zeilen.length === 0 && (e.ctrlKey || e.metaKey) && e.key === '+') {
        e.preventDefault();
        legePositionAn();
      }
      return;
    }
    const { zi, si, spalte } = zelle;
    const z = zeilen[zi];
    if (!z) return;
    const strg = e.ctrlKey || e.metaKey;
    const von: Zelle = { zeile: zi, spalte: si };

    const klappen = klappAbsicht(e, z, spalte === baumspalte);
    if (klappen !== null) {
      e.preventDefault();
      klappe(zi, klappen);
      return;
    }
    if (e.altKey && !strg && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      verschiebe(e.key === 'ArrowUp' ? 'hoch' : 'runter');
      return;
    }
    if (strg && !e.altKey) {
      const taste = e.key.toLowerCase();
      if (taste === 'c' || taste === 'x') {
        e.preventDefault();
        kopiere(taste === 'x');
        return;
      }
      if (e.key === 'Delete' || e.key === '-') {
        e.preventDefault();
        fragLoeschen();
        return;
      }
      if (e.key === '+') {
        e.preventDefault();
        legePositionAn();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && onZeileOeffnen) {
        e.preventDefault();
        onZeileOeffnen(z.knoten.id, spalte);
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
        if (bearbeitbar(z, spalte)) beginneBearbeitung(zi, spalte);
        else aktiviere(bewege(von, e.shiftKey ? 'oben' : 'unten'), 'ersetzen', true);
        return;
      case 'Escape':
        // Zuerst bricht Escape ein Ausschneiden ab (die Zeilen bleiben kopiert), erst danach verkleinert es die Auswahl.
        if (merkliste?.art === 'ausgeschnitten') {
          setMerkliste({ ...merkliste, art: 'kopiert' });
          setStatus(texte.ausschneidenAbgebrochen);
          return;
        }
        if (auswahl.size > 1) aktiviere(von, 'ersetzen', false);
        setStatus('');
        return;
      case 'Delete':
        if (istBearbeitbar(z, spalte)) {
          e.preventDefault();
          uebernimmText(zi, spalte, ''); // schreibgeschützt: nur die Ansage
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
    if (NAVIGATIONSTASTEN.has(e.key)) {
      e.preventDefault();
      if (ziel) aktiviere(ziel, e.shiftKey ? 'erweitern' : 'ersetzen', true);
      return;
    }
    if (e.key.length === 1 && !strg && !e.altKey && istBearbeitbar(z, spalte)) {
      e.preventDefault();
      beginneBearbeitung(zi, spalte, e.key); // schreibgeschützt: nur die Ansage
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
    wartetAuf.current = null;
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
    const z = zelle ? zeilen[zelle.zi] : undefined;
    if (!zelle || !z) return;
    // Eine bearbeitbare Zelle bearbeitet der Doppelklick (U3); jede andere öffnet die Zeile, wenn die App das will.
    if (onZeileOeffnen && !bearbeitbar(z, zelle.spalte)) onZeileOeffnen(z.knoten.id, zelle.spalte);
    else beginneBearbeitung(zelle.zi, zelle.spalte);
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
    const inhalt = e.clipboardData.getData('text/plain');
    e.preventDefault();
    if (!aenderung) {
      // Im schreibgeschützten Grid nur eine Spalte in die Spalte „KG“, wenn die App das zulässt (Ticket 93).
      if (!fuelleKostengruppen(parseTsv(inhalt))) meldeNurLesen();
      return;
    }
    // Eigener Text (zuletzt vom Grid geschrieben): verlustfrei verschieben bzw. kopieren (Ticket 46, Punkt 2).
    // Läuft das Schreiben noch, liefert die Zwischenablage ihren alten Inhalt; gemeint sind aber die eben kopierten
    // bzw. ausgeschnittenen Zeilen, nicht dieser alte Text.
    const eigen =
      merkliste !== null &&
      (schreibtNoch.current === merkliste.text ||
        zeilenumbruchNormal(inhalt) === zeilenumbruchNormal(merkliste.text))
        ? merkliste
        : null;
    const text = eigen ? eigen.text : inhalt;
    if (eigen?.art === 'ausgeschnitten') {
      if (aktivIndex >= 0 && liegtInMenge(zeilen, aktivIndex, new Set(eigen.knotenIds))) {
        setStatus(texte.zielAusgeschnitten);
        return;
      }
      aenderung.onBefehl({
        art: 'KnotenlisteVerschieben',
        knotenIds: eigen.knotenIds,
        ziel: ortHinterAktiv(),
      });
      setMerkliste(null);
      setStatus(meldungZeilen(eigen.knotenIds.length, 'eingefügt'));
      return;
    }
    if (eigen && aenderung.onKopieEinfuegen) {
      aenderung.onKopieEinfuegen(eigen.knotenIds, ortHinterAktiv());
      setStatus(meldungZeilen(eigen.knotenIds.length, 'eingefügt'));
      return;
    }
    const matrix = parseTsv(text);
    if (matrix.length === 0) {
      setStatus(texte.leereZwischenablage);
      return;
    }
    // Eine einzelne Zelle ersetzt den Inhalt der aktiven Zelle wie eine Eingabe.
    const einzeln = !eigen && matrix.length === 1 && matrix[0]?.length === 1;
    if (einzeln && aktiveZeile && aktivSpalte !== undefined) {
      uebernimmText(aktivIndex, aktivSpalte, matrix[0]?.[0] ?? '');
      return;
    }
    if (!eigen && fuelleKostengruppen(matrix)) return;
    // In ein leeres LV (keine aktive Zeile) wird am Ende der Wurzel eingefügt.
    const einfuegeanker: Einfuegeanker = aktiveZeile
      ? { art: 'nach', knotenId: aktiveZeile.knoten.id }
      : { art: 'ende', elternId: ansicht.wurzelId };
    // Eigener Text ohne `onKopieEinfuegen` trägt alle sichtbaren Spalten: spaltengenau ab der ersten einfügen.
    const plan = planeEinfuegen(
      matrix,
      eigen ? 0 : aktivSpaltenIndex,
      spalten,
      einfuegeanker,
      zahlen,
      aenderung.ids,
      kgLeser,
    );
    sendeFolge(plan.befehle);
    markiereUngueltig(plan.ungueltig);
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
        aria-readonly={nurLesen && !nurKg ? true : undefined}
        aria-describedby={nurLesen ? nurLesenId : undefined}
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
                versatz={kern.versatz(item.start)}
                hoehe={zh}
                vorlage={vorlage}
                breite={mindestbreite}
                tabbar={istAktiv && aktivSpalte !== undefined ? aktivSpalte : null}
                aktiv={istAktiv && aktivSpalte !== undefined ? aktivSpalte : null}
                ausgewaehlt={auswahl.has(id)}
                ausgeschnitten={merkliste?.art === 'ausgeschnitten' && merkliste.zeilen.has(id)}
                bearbeitung={b ? { spalte: b.spalte, entwurf: b.entwurf } : null}
                abgelehnt={abgelehntJeZeile.get(id)}
                baumspalte={baumspalte}
                zahlen={zahlen}
                bearbeitbareSpalten={bearbeitbareSpalten}
                editor={editorStabil}
                kgPruefen={kgPruefen}
              />
            );
          })}
        </div>
        {zeilen.length === 0 ? <p className="tx-grid__leer">{texte.leer}</p> : null}
      </div>
      {nurLesen ? (
        <span id={nurLesenId} className="tx-grid__nur-sr">
          {schreibschutzText}
        </span>
      ) : null}
      <Hinweisleiste hinweise={props.hinweise ?? []} onSprung={springeZu} />
      {/* Rückfrage vor dem Löschen (Q5): Der Fokus steht beim Öffnen auf der Bestätigung, Enter wirkt nur auf die
          fokussierte Schaltfläche (D-26, Ticket 74). */}
      <Dialog
        offen={rueckfrage !== null}
        onOffenChange={(offen) => {
          if (!offen) brichLoeschenAb();
        }}
        titel={texte.loeschenTitel}
        beschreibung={rueckfrage?.frage ?? ''}
        anfangsfokus={bestaetigen}
        fuss={
          <>
            <Button variante="sekundaer" onClick={brichLoeschenAb}>
              {texte.abbrechen}
            </Button>
            <Button ref={bestaetigen} variante="gefahr" onClick={bestaetigeLoeschen}>
              {texte.loeschenBestaetigen}
            </Button>
          </>
        }
      />
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

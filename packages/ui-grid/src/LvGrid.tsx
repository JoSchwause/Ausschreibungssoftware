// SPDX-License-Identifier: AGPL-3.0-or-later
// Das eine gemeinsame Grid (U2): TanStack Table (Spaltenmodell) + TanStack Virtual (Zeilen) mit eigener Baum- und
// Editierlogik (ADR 0004). Vollständig gesteuert: Zeilen, Spalten und Summen kommen als Eigenschaften, jede
// Änderung geht als Befehl hinaus (A5). Das Grid rechnet nie (N1). Der einzige Zustand im Grid ist flüchtiger
// Bedienzustand: aktive Zelle, Zeilenauswahl, Eingabeentwurf, abgelehnte Eingaben, Merkliste der Zwischenablage,
// offene Rückfrage und eine Statusmeldung.

import { useTable } from '@tanstack/react-table';
import { useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  ClipboardEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactElement,
} from 'react';
import type { Einfuegeort, KnotenId, LvSpalte, LvZeile, PositionAnlegen } from '@tethys/vertrag';
import { Button, Dialog } from '@tethys/ui-basis';
import type { EditorAktionen, Richtung } from './Editor';
import { anzeigeText, befehlAusEingabe, istBearbeitbar } from './eingabe';
import { Hinweisleiste } from './Hinweisleiste';
import { Kontextmenue } from './Kontextmenue';
import type { Menuepunkt } from './Kontextmenue';
import { leerePositionsdaten, planeEinfuegen, planeKostengruppen } from './einfuegen';
import type { Einfuegeanker, UngueltigeZelle } from './einfuegen';
import { klappAbsicht, useGridKern, useSprung } from './gridKern';
import { NAVIGATIONSAKTIONEN, kuerzelAktion } from './kuerzel';
import { tabZiel, zielZelle } from './navigation';
import type { Zelle } from './navigation';
import { eingabeart, schreibrechte } from './schreibrechte';
import type { Eingabeart } from './schreibrechte';
import { BREITENSCHRITT, geaenderteBreite } from './spaltenbreiten';
import {
  KEIN_FILTER,
  filterAktiv,
  filterText,
  gefilterteZeilen,
  suchtreffer,
  vorfahrenZugeklappt,
} from './suche';
import type { Zeilenfilter } from './suche';
import { Suchleiste } from './Suchleiste';
import { STANDARDSPALTEN, features, spaltenDefinitionen } from './tabelle';
import {
  SPALTENKOPF,
  SPALTENNAME,
  SPALTENTITEL,
  frageLoeschen,
  meldungBreite,
  meldungEingefuegt,
  meldungKostengruppen,
  meldungTreffer,
  meldungZeilen,
  filterStand,
  menuetexte,
  suchtexte,
  texte,
  trefferStand,
} from './texte';
import { parseTsv } from './tsv';
import type { LvGridProps } from './typen';
import { useSpaltenbreiten } from './useSpaltenbreiten';
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
  const { alleZeilen, onKuerzelhilfe } = props;
  const spalten = props.spalten ?? STANDARDSPALTEN;
  const baumspalte = props.baumspalte ?? 'kurztext';
  const zh = props.zeilenhoehe ?? 28;
  // Filter (Ticket 156): Mit Filter zeigt das Grid die passenden Zeilen des ganzen LV samt ihrer Gliederungen, alles offen.
  // Ohne Filter bleibt es bei `ansicht.zeilen` (dieselbe Liste, kein Mehraufwand im Renderpfad, Q4).
  const [filter, setFilter] = useState<Zeilenfilter>(KEIN_FILTER);
  const gefiltert = filterAktiv(filter);
  const filterung = useMemo(() => {
    if (!gefiltert) return { zeilen: ansicht.zeilen, gesamt: ansicht.zeilen.length };
    const alle = alleZeilen?.() ?? ansicht.zeilen;
    return { zeilen: gefilterteZeilen(alle, filter), gesamt: alle.length };
  }, [gefiltert, filter, alleZeilen, ansicht.zeilen]);
  const zeilen = filterung.zeilen;
  // Was sich ändern lässt und wohin die Befehle gehen, samt der Ausnahme „KG“ im Schreibschutz (`schreibrechte`).
  const rechte = schreibrechte(props, spalten);
  const { aenderung, nurLesen, schreibschutzText } = rechte;
  // Dieselbe Menge, solange sich ihr Inhalt nicht ändert: Die Zeilen sind memoisiert.
  const bearbeitbarSchluessel = [...rechte.bearbeitbareSpalten].join(' ');
  const bearbeitbareSpalten = useMemo(() => rechte.bearbeitbareSpalten, [bearbeitbarSchluessel]);
  const kgLeser = rechte.kostengruppeLesen;

  // --- TanStack Table: Spalten-, Kopf- und Zellenmodell ----------------------------------------------------
  const columns = useMemo(() => spaltenDefinitionen(spalten), [spalten]);
  const table = useTable({ features, columns, data: zeilen, getRowId: (z) => z.knoten.id }, () => ({}));
  const rows = table.getRowModel().rows;
  const kopf = table.getHeaderGroups()[0]?.headers ?? [];

  // --- Spaltenbreiten: Inhalt (OZ, Zahlen), gezogen und gemerkt (Ticket 130) ----------------------------------
  const breiten = useSpaltenbreiten({
    spalten,
    flexspalte: FLEXSPALTE,
    zeilen,
    zahlen,
    ozMaske: props.ozMaske,
    schluessel: props.spaltenbreitenSchluessel,
    speicher: props.spaltenbreitenSpeicher,
  });

  // Eingabeart je Spalte für den Editor; der Hinweis der Spalte „KG“ liest immer die aktuelle Lesefunktion.
  const kgLeserRef = useRef(kgLeser);
  kgLeserRef.current = kgLeser;
  const eingabearten = useMemo(
    (): ReadonlyMap<LvSpalte, Eingabeart> =>
      new Map(spalten.map((s) => [s, eingabeart(s, () => kgLeserRef.current)])),
    [spalten],
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
  /**
   * Zeile, die nach einem Befehl (neue Position) oder nach dem Aufklappen (Treffer der Suche) in den Eigenschaften
   * erscheinen soll und dann aktiv wird, mit Fokus, wenn nicht anders gesagt.
   */
  const wartetAuf = useRef<{
    readonly id: string;
    readonly spalte: LvSpalte;
    readonly mitFokus?: boolean;
  } | null>(null);
  // Suchen und Kontextmenü (Ticket 156): flüchtiger Bedienzustand wie die übrigen.
  const [suchOffen, setSuchOffen] = useState(false);
  const [anfrage, setAnfrage] = useState('');
  const [suchstand, setSuchstand] = useState<string | null>(null);
  const sucheingabe = useRef<HTMLInputElement>(null);
  /** Nach dem Öffnen der Suche den Fokus ins Suchfeld (sobald es steht). */
  const suchfokus = useRef(false);
  const [menue, setMenue] = useState<{ readonly x: number; readonly y: number } | null>(null);
  /** Sofort gesetzt (nicht erst nach dem Rendern): Eine Menütaste löst danach noch das Ereignis `contextmenu` aus. */
  const menueOffen = useRef(false);
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

  /** Ob sich die Zelle bearbeiten lässt (`schreibrechte`). */
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
        rechte.eingabe(r.befehl);
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
    rechte.folge(plan.befehle);
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
    // Im gefilterten Grid fehlen Geschwister: Ein Schritt „nach oben“ spränge über verborgene Zeilen (Ticket 156).
    if (gefiltert) {
      setStatus(suchtexte.verschiebenImFilter);
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

  // Eine neu angelegte Zeile bekommt den Fokus, sobald sie in den Eigenschaften steht (Strg+Plus); ein Treffer unter einer
  // eben aufgeklappten Gliederung wird aktiv (beim Tippen im Suchfeld ohne Fokus, damit weitergetippt werden kann).
  useLayoutEffect(() => {
    const w = wartetAuf.current;
    const zi = w ? indexVonId.get(w.id) : undefined;
    if (!w || zi === undefined) return;
    const mitFokus = w.mitFokus ?? true;
    aktiviere({ zeile: zi, spalte: Math.max(0, spalten.indexOf(w.spalte)) }, 'ersetzen', mitFokus);
    if (!mitFokus) virtualizer.scrollToIndex(zi, { align: 'auto' });
  });

  // --- Suchen und Filtern (Ticket 156) ----------------------------------------------------------------------------
  // Die Treffer entstehen erst im Ereignis (Tippen, Enter, F3), nie beim Rendern; der Suchtext hängt je Knoten im
  // Zwischenspeicher (`suche.ts`). So bleibt das Budget beim Scrollen unberührt (Q4).
  /** Wo gesucht wird: im gefilterten Grid die gezeigten Zeilen, sonst das ganze LV (`alleZeilen`) bzw. die Ansicht. */
  const suchbereich = (): readonly LvZeile[] => (gefiltert ? zeilen : (alleZeilen?.() ?? zeilen));
  /** Macht einen Treffer zur aktiven Zelle; unter zugeklappten Gliederungen klappt es diese erst auf. */
  const zeigeTreffer = (id: string, spalte: LvSpalte, mitFokus: boolean): void => {
    const si = Math.max(0, spalten.indexOf(spalte));
    const zi = indexVonId.get(id);
    if (zi !== undefined) {
      aktiviere({ zeile: zi, spalte: si }, 'ersetzen', mitFokus);
      if (!mitFokus) virtualizer.scrollToIndex(zi, { align: 'auto' });
      return;
    }
    const zu = vorfahrenZugeklappt(alleZeilen?.() ?? [], id);
    if (zu.length === 0 || !onAufklappen) {
      setStatus(texte.zeileNichtSichtbar);
      return;
    }
    for (const g of zu) onAufklappen(g as KnotenId, true);
    wartetAuf.current = { id, spalte, mitFokus };
  };
  /**
   * Springt zum nächsten (1) oder vorigen (-1) Treffer, von der aktiven Zeile aus; 0: zum ersten Treffer ab der aktiven
   * Zeile (beim Tippen). Sagt Stand und Feld des Treffers an.
   */
  const springeZuTreffer = (richtung: 1 | -1 | 0, text: string, mitFokus: boolean): void => {
    const bereich = suchbereich();
    const treffer = suchtreffer(bereich, text);
    if (treffer.length === 0) {
      const leer = text.trim() === '';
      setSuchstand(leer ? null : suchtexte.keineTreffer);
      setStatus(leer ? '' : suchtexte.keineTreffer);
      return;
    }
    const lage = new Map<string, number>(bereich.map((z, i) => [z.knoten.id, i]));
    const von = aktiveId === undefined ? -1 : (lage.get(aktiveId) ?? -1);
    const stelle = (t: { readonly knotenId: string }): number => lage.get(t.knotenId) ?? -1;
    let nr: number;
    if (richtung === -1) {
      nr = treffer.findLastIndex((t) => stelle(t) < von);
      if (nr < 0) nr = treffer.length - 1;
    } else {
      const ab = richtung === 0 ? Math.max(von, 0) : von + 1;
      nr = treffer.findIndex((t) => stelle(t) >= ab);
      if (nr < 0) nr = 0;
    }
    const t = treffer[nr];
    if (!t) return;
    setSuchstand(trefferStand(nr + 1, treffer.length));
    setStatus(meldungTreffer(nr + 1, treffer.length, suchtexte.ort[t.feld]));
    const spalte: LvSpalte =
      t.feld === 'ordnungszahl' && spalten.includes('ordnungszahl')
        ? 'ordnungszahl'
        : spalten.includes('kurztext')
          ? 'kurztext'
          : (aktivSpalte ?? 'kurztext');
    zeigeTreffer(t.knotenId, spalte, mitFokus);
  };
  const oeffneSuche = (): void => {
    suchfokus.current = true;
    setSuchOffen(true);
    // Schon offen: kein neues Rendern nötig, das Feld steht.
    sucheingabe.current?.focus();
    sucheingabe.current?.select();
  };
  const schliesseSuche = (): void => {
    setSuchOffen(false);
    setSuchstand(null);
    fokusAnfrage.current = true;
    setFokusRunde((n) => n + 1);
  };
  useLayoutEffect(() => {
    if (!suchfokus.current || !sucheingabe.current) return;
    suchfokus.current = false;
    sucheingabe.current.focus();
    sucheingabe.current.select();
  });
  /** Treffer in Worten an der Leiste; aus F3 im Grid bleibt der Fokus im Grid. */
  const weiterSuchen = (richtung: 1 | -1, mitFokus: boolean): void => {
    if (anfrage.trim() === '') {
      oeffneSuche();
      return;
    }
    springeZuTreffer(richtung, anfrage, mitFokus);
  };
  const setzeFilter = (f: Zeilenfilter): void => {
    setFilter(f);
    setStatus(filterAktiv(f) ? `${suchtexte.gefiltert}: ${filterText(f)}.` : suchtexte.filterAufgehoben);
    // Verschwindet die Leiste mit dem Filter (Suche zu), geht der Fokus zurück ins Grid statt ins Leere.
    if (!filterAktiv(f) && !suchOffen) {
      fokusAnfrage.current = true;
      setFokusRunde((n) => n + 1);
    }
  };
  useImperativeHandle(props.steuerung, () => ({ suchen: oeffneSuche }));

  // Sprungziel (Prüf-Links): ein neuer Wert von `nr` springt zur Zelle; eine nicht sichtbare Zeile übergeht das Grid.
  useSprung(
    sprungziel && { zeilenId: sprungziel.knotenId, spalte: sprungziel.spalte, nr: sprungziel.nr },
    kern,
    spalten,
    (ziel) => {
      aktiviere(ziel, 'ersetzen', true);
    },
  );

  // --- Spaltenbreite ändern (Ticket 130) -------------------------------------------------------------------------
  /** Tastatur: um einen Schritt breiter (1) oder schmaler (-1), `null` zurück zur Standardbreite; gemerkt und angesagt. */
  const aendereBreite = (spalte: LvSpalte, richtung: 1 | -1 | null): void => {
    const neu =
      richtung === null
        ? null
        : geaenderteBreite(
            breiten.breiten[spalte] ?? 0,
            richtung * BREITENSCHRITT,
            breiten.mindest[spalte] ?? 0,
          );
    breiten.setze(spalte, neu, true);
    setStatus(meldungBreite(SPALTENTITEL[spalte], neu));
  };
  /** Ziehen am Griff im Kopf: Spalte, Startpunkt und Startbreite, bis die Maus losgelassen wird. */
  const ziehen = useRef<{ readonly spalte: LvSpalte; readonly x: number; readonly breite: number } | null>(
    null,
  );
  const beginneZiehen = (spalte: LvSpalte, e: PointerEvent<HTMLElement>): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    ziehen.current = { spalte, x: e.clientX, breite: breiten.breiten[spalte] ?? 0 };
  };
  const zieheWeiter = (e: PointerEvent<HTMLElement>): void => {
    const z = ziehen.current;
    if (!z) return;
    const neu = geaenderteBreite(z.breite, e.clientX - z.x, breiten.mindest[z.spalte] ?? 0);
    if (neu !== breiten.breiten[z.spalte]) breiten.setze(z.spalte, neu, false);
  };
  const beendeZiehen = (): void => {
    if (!ziehen.current) return;
    ziehen.current = null;
    breiten.merke();
  };

  // --- Ereignisse (Delegation am Wurzelelement) ------------------------------------------------------------
  const imEditor = (ziel: EventTarget | null): boolean =>
    ziel instanceof Element && ziel.closest('[data-editor]') !== null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (imEditor(e.target)) return;
    // Suchen und Kontextmenü (Ticket 156) gehen auch ohne Zelle (leeres oder leer gefiltertes LV).
    const sonder = kuerzelAktion(e, 'lv');
    switch (sonder) {
      case 'suchen':
        e.preventDefault();
        oeffneSuche();
        return;
      case 'treffer-weiter':
      case 'treffer-zurueck':
        e.preventDefault();
        weiterSuchen(sonder === 'treffer-weiter' ? 1 : -1, true);
        return;
      case 'kontextmenue': {
        e.preventDefault();
        const r = (e.target as HTMLElement).getBoundingClientRect();
        oeffneMenue(r.left + 8, zelleVon(e.target) ? r.bottom : r.top + 8);
        return;
      }
      default:
        break;
    }
    const zelle = zelleVon(e.target);
    if (!zelle) {
      // Leeres LV: Strg+Plus legt die erste Position an (W-06).
      if (zeilen.length === 0 && kuerzelAktion(e, 'lv') === 'position-anlegen') {
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

    const klappen = klappAbsicht(e, z, spalte === baumspalte, 'lv');
    if (klappen !== null) {
      e.preventDefault();
      klappe(zi, klappen);
      return;
    }
    // Die Tasten kommen aus der einen Kürzeltabelle (`GRID_KUERZEL`), aus der auch die Hilfeseite entsteht.
    let aktion = kuerzelAktion(e, 'lv');
    if (aktion === 'zeile-oeffnen' && !onZeileOeffnen) aktion = 'enter';
    if (aktion !== null && NAVIGATIONSAKTIONEN.has(aktion)) {
      e.preventDefault();
      const ziel = zielZelle(e.key, strg, von, raster());
      if (ziel) aktiviere(ziel, e.shiftKey ? 'erweitern' : 'ersetzen', true);
      return;
    }
    switch (aktion) {
      case 'spalte-breiter':
      case 'spalte-schmaler':
      case 'spalte-standardbreite':
        e.preventDefault();
        aendereBreite(
          spalte,
          aktion === 'spalte-standardbreite' ? null : aktion === 'spalte-breiter' ? 1 : -1,
        );
        return;
      case 'nach-oben-verschieben':
      case 'nach-unten-verschieben':
        e.preventDefault();
        verschiebe(aktion === 'nach-oben-verschieben' ? 'hoch' : 'runter');
        return;
      case 'kopieren':
      case 'ausschneiden':
        e.preventDefault();
        kopiere(aktion === 'ausschneiden');
        return;
      case 'loeschen':
        e.preventDefault();
        fragLoeschen();
        return;
      case 'position-anlegen':
        e.preventDefault();
        legePositionAn();
        return;
      case 'zeile-oeffnen':
        e.preventDefault();
        onZeileOeffnen?.(z.knoten.id, spalte);
        return;
      case 'alles-auswaehlen':
        e.preventDefault();
        setzeAuswahl(new Set(zeilen.map((x) => x.knoten.id)));
        return;
      case 'zeile-auswaehlen': {
        e.preventDefault();
        const neu = new Set(auswahl);
        if (neu.has(z.knoten.id)) neu.delete(z.knoten.id);
        else neu.add(z.knoten.id);
        anker.current = z.knoten.id;
        setzeAuswahl(neu);
        return;
      }
      case 'tab': {
        const ziel = tabZiel(von, e.shiftKey, raster());
        if (ziel) {
          e.preventDefault();
          aktiviere(ziel, 'ersetzen', true);
        }
        return;
      }
      case 'bearbeiten':
        e.preventDefault();
        beginneBearbeitung(zi, spalte);
        return;
      case 'enter':
        e.preventDefault();
        if (bearbeitbar(z, spalte)) beginneBearbeitung(zi, spalte);
        else aktiviere(bewege(von, e.shiftKey ? 'oben' : 'unten'), 'ersetzen', true);
        return;
      case 'abbrechen':
        // Zuerst bricht Escape ein Ausschneiden ab (die Zeilen bleiben kopiert), erst danach verkleinert es die Auswahl.
        if (merkliste?.art === 'ausgeschnitten') {
          setMerkliste({ ...merkliste, art: 'kopiert' });
          setStatus(texte.ausschneidenAbgebrochen);
          return;
        }
        if (auswahl.size > 1) aktiviere(von, 'ersetzen', false);
        setStatus('');
        return;
      case 'zelle-leeren':
        if (istBearbeitbar(z, spalte)) {
          e.preventDefault();
          uebernimmText(zi, spalte, ''); // schreibgeschützt: nur die Ansage
        }
        return;
      case 'tippen':
        if (istBearbeitbar(z, spalte)) {
          e.preventDefault();
          beginneBearbeitung(zi, spalte, e.key); // schreibgeschützt: nur die Ansage
        }
        return;
      default:
        // Strg+V geht über das Einfügen-Ereignis (`onPaste`); andere Tasten gehören nicht dem Grid.
        return;
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
    // Die rechte Maustaste in der Auswahl lässt sie stehen: Das Kontextmenü wirkt auf alle gewählten Zeilen.
    if (e.button === 2 && auswahl.has(z.knoten.id)) return;
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
    fuegeEin(inhalt);
  };

  /** Einfügen aus dem Kontextmenü: Die Zwischenablage liest das Grid selbst (der Browser fragt danach ggf. nach). */
  const einfuegenAusMenue = (): void => {
    const ablage = navigator.clipboard as Clipboard | undefined;
    if (ablage === undefined || typeof ablage.readText !== 'function') {
      setStatus(menuetexte.einfuegenGesperrt);
      return;
    }
    ablage.readText().then(fuegeEin, () => {
      setStatus(menuetexte.einfuegenGesperrt);
    });
  };

  /** Strg+V und „Einfügen“ im Kontextmenü: derselbe Weg für den Text der Zwischenablage. */
  const fuegeEin = (inhalt: string): void => {
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
    rechte.folge(plan.befehle);
    markiereUngueltig(plan.ungueltig);
    setStatus(meldungEingefuegt(plan.befehle.length, plan.ungueltig.length, plan.uebersprungen));
  };

  // --- Kontextmenü (Ticket 156) -------------------------------------------------------------------------------------
  const oeffneMenue = (x: number, y: number): void => {
    menueOffen.current = true;
    setMenue({ x, y });
  };
  const onContextMenu = (e: MouseEvent<HTMLDivElement>): void => {
    if (imEditor(e.target)) return; // im Eingabefeld das Menü des Browsers (Ausschneiden, Rechtschreibung)
    if (menueOffen.current) {
      e.preventDefault();
      return;
    }
    const zelle = zelleVon(e.target);
    // Kopf und Rand: Menü des Browsers; nur im leeren LV gibt es ohne Zelle etwas zu tun (anlegen, einfügen).
    if ((!zelle || !zeilen[zelle.zi]) && zeilen.length > 0) return;
    e.preventDefault();
    oeffneMenue(e.clientX, e.clientY);
  };
  const schliesseMenue = (): void => {
    menueOffen.current = false;
    setMenue(null);
  };
  /** Nach dem Schließen: Fokus auf die aktive Zelle, dann die gewählte Aktion (ein Dialog gibt ihn dorthin zurück). */
  const nachMenue = (aktion: (() => void) | null): void => {
    menueOffen.current = false;
    const sc = scroller.current;
    const el = sc?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]') ?? sc;
    el?.focus({ preventScroll: true });
    aktion?.();
  };
  /** Die Punkte des Menüs: dieselben Aktionen wie die Tasten (U3), gesperrt, wo die Taste nur den Schreibschutz ansagt. */
  const menuepunkte = (): readonly Menuepunkt[] => {
    const z = aktiveZeile;
    const spalte = aktivSpalte;
    const zi = aktivIndex;
    const punkte: Menuepunkt[] = [];
    if (z !== undefined && spalte !== undefined) {
      punkte.push({
        schluessel: 'bearbeiten',
        text: menuetexte.bearbeiten,
        kuerzel: 'bearbeiten',
        gesperrt: !bearbeitbar(z, spalte),
        ausfuehren: () => {
          beginneBearbeitung(zi, spalte);
        },
      });
      if (onZeileOeffnen) {
        punkte.push({
          schluessel: 'oeffnen',
          text: menuetexte.zeileOeffnen,
          kuerzel: 'zeile-oeffnen',
          ausfuehren: () => {
            onZeileOeffnen(z.knoten.id, spalte);
          },
        });
      }
      punkte.push({
        schluessel: 'leeren',
        text: menuetexte.zelleLeeren,
        kuerzel: 'zelle-leeren',
        gesperrt: !bearbeitbar(z, spalte),
        ausfuehren: () => {
          uebernimmText(zi, spalte, '');
        },
      });
    }
    const mitZelle = z !== undefined && spalte !== undefined;
    punkte.push({
      schluessel: 'anlegen',
      text: menuetexte.positionAnlegen,
      kuerzel: 'position-anlegen',
      gesperrt: !aenderung,
      trenner: mitZelle,
      ausfuehren: legePositionAn,
    });
    if (mitZelle) {
      punkte.push(
        {
          schluessel: 'ausschneiden',
          text: menuetexte.ausschneiden,
          kuerzel: 'ausschneiden',
          gesperrt: !aenderung,
          ausfuehren: () => {
            kopiere(true);
          },
        },
        {
          schluessel: 'kopieren',
          text: menuetexte.kopieren,
          kuerzel: 'kopieren',
          ausfuehren: () => {
            kopiere(false);
          },
        },
      );
    }
    punkte.push({
      schluessel: 'einfuegen',
      text: menuetexte.einfuegen,
      kuerzel: 'einfuegen',
      gesperrt: !aenderung && !(spalte !== undefined && bearbeitbareSpalten.has(spalte)),
      ausfuehren: einfuegenAusMenue,
    });
    if (z !== undefined && spalte !== undefined) {
      punkte.push(
        {
          schluessel: 'hoch',
          text: menuetexte.nachOben,
          kuerzel: 'nach-oben-verschieben',
          gesperrt: !aenderung || gefiltert,
          trenner: true,
          ausfuehren: () => {
            verschiebe('hoch');
          },
        },
        {
          schluessel: 'runter',
          text: menuetexte.nachUnten,
          kuerzel: 'nach-unten-verschieben',
          gesperrt: !aenderung || gefiltert,
          ausfuehren: () => {
            verschiebe('runter');
          },
        },
        {
          schluessel: 'loeschen',
          text: menuetexte.loeschen,
          kuerzel: 'loeschen',
          gesperrt: !aenderung,
          gefahr: true,
          ausfuehren: fragLoeschen,
        },
      );
      if (z.hatUnterknoten) {
        punkte.push({
          schluessel: 'klappen',
          text: z.aufgeklappt ? menuetexte.zuklappen : menuetexte.aufklappen,
          kuerzel: z.aufgeklappt ? 'zuklappen' : 'aufklappen',
          trenner: true,
          ausfuehren: () => {
            klappe(zi, !z.aufgeklappt);
          },
        });
      }
      punkte.push({
        schluessel: 'alles',
        text: menuetexte.allesAuswaehlen,
        kuerzel: 'alles-auswaehlen',
        trenner: !z.hatUnterknoten,
        ausfuehren: () => {
          setzeAuswahl(new Set(zeilen.map((x) => x.knoten.id)));
        },
      });
    }
    punkte.push({
      schluessel: 'suchen',
      text: menuetexte.suchen,
      kuerzel: 'suchen',
      trenner: true,
      ausfuehren: oeffneSuche,
    });
    if (onKuerzelhilfe) {
      punkte.push({ schluessel: 'kuerzel', text: menuetexte.kuerzel, ausfuehren: onKuerzelhilfe });
    }
    return punkte;
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
    <div className="tx-grid tx-grid--lv" ref={wurzel}>
      <Suchleiste
        offen={suchOffen}
        anfrage={anfrage}
        stand={suchstand}
        filter={filter}
        filterStand={filterStand(zeilen.length, filterung.gesamt)}
        eingabe={sucheingabe}
        onAnfrage={(text) => {
          setAnfrage(text);
          springeZuTreffer(0, text, false);
        }}
        onWeiter={() => {
          weiterSuchen(1, false);
        }}
        onZurueck={() => {
          weiterSuchen(-1, false);
        }}
        onSchliessen={schliesseSuche}
        onFilter={setzeFilter}
      />
      <div
        ref={scroller}
        className="tx-grid__scroll"
        role="treegrid"
        aria-label={props.beschriftung ?? texte.standardBeschriftung}
        aria-multiselectable="true"
        aria-readonly={nurLesen ? true : undefined}
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
        onContextMenu={onContextMenu}
        style={{
          ['--tx-grid-zeilenhoehe' as string]: `${String(zh)}px`,
          // Raster und Mindestbreite der Kopf- und Datenzeilen (CSS): Ändert sich eine Breite, zeichnen die Zeilen nicht neu.
          ['--tx-grid-vorlage' as string]: breiten.vorlage,
          ['--tx-grid-breite' as string]: `${String(breiten.gesamtbreite)}px`,
        }}
      >
        <div role="rowgroup" className="tx-grid__kopf">
          <div role="row" aria-rowindex={1} className="tx-grid__kopfzeile" style={{ height: zh }}>
            {kopf.map((h, i) => {
              const spalte = spalten[i];
              if (spalte === undefined) return null;
              const kurz = SPALTENNAME[spalte] !== SPALTENKOPF[spalte];
              return (
                <div
                  key={h.id}
                  role="columnheader"
                  aria-colindex={i + 1}
                  aria-label={kurz ? SPALTENNAME[spalte] : undefined}
                  title={kurz ? SPALTENNAME[spalte] : undefined}
                  className={`tx-grid__kopfzelle tx-grid__kopfzelle--${spalte}`}
                >
                  <span className="tx-grid__kopftext">{SPALTENKOPF[spalte]}</span>
                  {/* Ziehgriff (Maus); per Tastatur Alt+Umschalt+Pfeil in einer Zelle der Spalte. Doppelklick: Standardbreite. */}
                  <span
                    className="tx-grid__ziehgriff"
                    data-ziehgriff={spalte}
                    aria-hidden="true"
                    onPointerDown={(e) => {
                      beginneZiehen(spalte, e);
                    }}
                    onPointerMove={zieheWeiter}
                    onPointerUp={beendeZiehen}
                    onPointerCancel={beendeZiehen}
                    onLostPointerCapture={beendeZiehen}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      breiten.setze(spalte, null, true);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div role="rowgroup" className="tx-grid__koerper" style={{ height: virtualizer.getTotalSize() }}>
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
                tabbar={istAktiv && aktivSpalte !== undefined ? aktivSpalte : null}
                aktiv={istAktiv && aktivSpalte !== undefined ? aktivSpalte : null}
                ausgewaehlt={auswahl.has(id)}
                ausgeschnitten={merkliste?.art === 'ausgeschnitten' && merkliste.zeilen.has(id)}
                bearbeitung={b ? { spalte: b.spalte, entwurf: b.entwurf } : null}
                abgelehnt={abgelehntJeZeile.get(id)}
                baumspalte={baumspalte}
                zahlen={zahlen}
                bearbeitbareSpalten={bearbeitbareSpalten}
                gridSchreibgeschuetzt={nurLesen}
                editor={editorStabil}
                eingabearten={eingabearten}
              />
            );
          })}
        </div>
        {zeilen.length === 0 ? (
          <p className="tx-grid__leer">{gefiltert ? suchtexte.keineZeileImFilter : texte.leer}</p>
        ) : null}
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
      <Kontextmenue
        ort={menue}
        punkte={menue === null ? [] : menuepunkte()}
        onZu={schliesseMenue}
        onFokusZurueck={nachMenue}
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

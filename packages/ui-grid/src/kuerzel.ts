// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Tastenkürzel der Grids (Ticket 130, B-09) an einer Stelle: Die Grids binden ihre Tasten aus dieser Tabelle, und die
// App erzeugt aus derselben Tabelle die Hilfeseite. Kein zweites Verzeichnis. Reine Daten und eine reine Funktion.

/** Die Tasten eines Ereignisses, soweit die Kürzel sie brauchen (Teil von `KeyboardEvent`). */
export interface Tastendruck {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

/** Wo ein Kürzel gilt: im LV-Grid (`LvGrid`) oder im schreibgeschützten Vergleichsgrid (`VergleichsGrid`). */
export type Gridart = 'lv' | 'vergleich';

/** Überschrift einer Gruppe auf der Hilfeseite. */
export type Kuerzelbereich =
  'Navigation' | 'Auswahl' | 'Bearbeiten' | 'Zeilen' | 'Zwischenablage' | 'Gliederung' | 'Spalten';

export type KuerzelAktion =
  | 'spalte-breiter'
  | 'spalte-schmaler'
  | 'spalte-standardbreite'
  | 'aufklappen'
  | 'zuklappen'
  | 'nach-oben-verschieben'
  | 'nach-unten-verschieben'
  | 'kopieren'
  | 'ausschneiden'
  | 'einfuegen'
  | 'loeschen'
  | 'position-anlegen'
  | 'zeile-oeffnen'
  | 'alles-auswaehlen'
  | 'zeile-auswaehlen'
  | 'tab'
  | 'auswahl-erweitern'
  | 'tabellenrand'
  | 'rand'
  | 'zelle-wechseln'
  | 'zeilenrand'
  | 'seite'
  | 'bearbeiten'
  | 'enter'
  | 'abbrechen'
  | 'zelle-leeren'
  | 'tippen';

/** Taste für „ein druckbares Zeichen“ (Ziffer, Buchstabe, Satzzeichen). */
export const ZEICHEN = 'Zeichen';

/**
 * Eine Tastenkombination: `taste` ist `KeyboardEvent.key` (ein Zeichen ohne Groß-/Kleinschreibung) oder `ZEICHEN`. Ein
 * Umschalter ohne Angabe ist gleich, `true` muss gedrückt sein, `false` darf nicht. `strg` ist Strg oder Cmd.
 */
export interface Tastenmuster {
  readonly taste: string;
  readonly strg?: boolean;
  readonly alt?: boolean;
  readonly umschalt?: boolean;
}

export interface Kuerzel {
  readonly aktion: KuerzelAktion;
  /** Die Tasten in Worten, wie sie auf der Hilfeseite stehen, z. B. „Strg+Plus“. */
  readonly taste: string;
  /** Was das Kürzel tut, in Worten (de-DE, unpersönlich, L4/L5). */
  readonly beschreibung: string;
  readonly bereich: Kuerzelbereich;
  /** `alle`: in jedem Grid; `lv`: nur im LV-Grid. */
  readonly gilt: 'alle' | Gridart;
  readonly muster: readonly Tastenmuster[];
}

const PFEILE = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const;
const RAENDER = ['Home', 'End'] as const;
const SEITEN = ['PageUp', 'PageDown'] as const;
const jede = (tasten: readonly string[], m: Omit<Tastenmuster, 'taste'> = {}): Tastenmuster[] =>
  tasten.map((taste) => ({ taste, ...m }));

/**
 * Alle Kürzel der Grids in der Reihenfolge, in der sie geprüft werden: Der erste passende Eintrag gilt. Das Einfügen
 * (Strg+V) bindet der Browser über das Einfügen-Ereignis; der Eintrag steht hier für die Hilfeseite und damit Strg+V
 * kein anderes Kürzel trifft.
 */
export const GRID_KUERZEL: readonly Kuerzel[] = [
  {
    aktion: 'spalte-breiter',
    taste: 'Alt+Umschalt+Pfeil rechts',
    beschreibung: 'Aktive Spalte verbreitern',
    bereich: 'Spalten',
    gilt: 'lv',
    muster: [{ taste: 'ArrowRight', alt: true, umschalt: true, strg: false }],
  },
  {
    aktion: 'spalte-schmaler',
    taste: 'Alt+Umschalt+Pfeil links',
    beschreibung: 'Aktive Spalte verschmälern (Zahlen und Ordnungszahlen bleiben ganz sichtbar)',
    bereich: 'Spalten',
    gilt: 'lv',
    muster: [{ taste: 'ArrowLeft', alt: true, umschalt: true, strg: false }],
  },
  {
    aktion: 'spalte-standardbreite',
    taste: 'Alt+Umschalt+Pos1',
    beschreibung:
      'Aktive Spalte auf die Standardbreite zurücksetzen (wie ein Doppelklick auf den Ziehgriff im Kopf)',
    bereich: 'Spalten',
    gilt: 'lv',
    muster: [{ taste: 'Home', alt: true, umschalt: true, strg: false }],
  },
  {
    aktion: 'aufklappen',
    taste: 'Alt+Pfeil rechts',
    beschreibung: 'Gliederung aufklappen; in der Spalte mit dem Baum auch Pfeil rechts',
    bereich: 'Gliederung',
    gilt: 'alle',
    muster: [{ taste: 'ArrowRight', alt: true }],
  },
  {
    aktion: 'zuklappen',
    taste: 'Alt+Pfeil links',
    beschreibung: 'Gliederung zuklappen; in der Spalte mit dem Baum auch Pfeil links',
    bereich: 'Gliederung',
    gilt: 'alle',
    muster: [{ taste: 'ArrowLeft', alt: true }],
  },
  {
    aktion: 'nach-oben-verschieben',
    taste: 'Alt+Pfeil hoch',
    beschreibung: 'Ausgewählte Zeilen unter ihren Geschwistern nach oben verschieben',
    bereich: 'Zeilen',
    gilt: 'lv',
    muster: [{ taste: 'ArrowUp', alt: true, strg: false }],
  },
  {
    aktion: 'nach-unten-verschieben',
    taste: 'Alt+Pfeil runter',
    beschreibung: 'Ausgewählte Zeilen unter ihren Geschwistern nach unten verschieben',
    bereich: 'Zeilen',
    gilt: 'lv',
    muster: [{ taste: 'ArrowDown', alt: true, strg: false }],
  },
  {
    aktion: 'kopieren',
    taste: 'Strg+C',
    beschreibung:
      'Kopieren: im Leistungsverzeichnis die ausgewählten Zeilen, in Vergleichstabellen die ausgewählten Zellen',
    bereich: 'Zwischenablage',
    gilt: 'alle',
    muster: [{ taste: 'c', strg: true, alt: false }],
  },
  {
    aktion: 'ausschneiden',
    taste: 'Strg+X',
    beschreibung: 'Ausgewählte Zeilen ausschneiden; Esc bricht das Ausschneiden ab',
    bereich: 'Zwischenablage',
    gilt: 'lv',
    muster: [{ taste: 'x', strg: true, alt: false }],
  },
  {
    aktion: 'einfuegen',
    taste: 'Strg+V',
    beschreibung:
      'Einfügen hinter der aktiven Zeile: kopierte oder ausgeschnittene Zeilen, aus einer Tabellenkalkulation neue Positionen; eine einzelne Zelle ersetzt den Inhalt der aktiven Zelle',
    bereich: 'Zwischenablage',
    gilt: 'lv',
    muster: [{ taste: 'v', strg: true, alt: false }],
  },
  {
    aktion: 'loeschen',
    taste: 'Strg+Entf oder Strg+Minus',
    beschreibung: 'Ausgewählte Zeilen nach Rückfrage in den Papierkorb legen',
    bereich: 'Zeilen',
    gilt: 'lv',
    muster: [
      { taste: 'Delete', strg: true, alt: false },
      { taste: '-', strg: true, alt: false },
    ],
  },
  {
    aktion: 'position-anlegen',
    taste: 'Strg+Plus',
    beschreibung: 'Neue Position hinter der aktiven Zeile anlegen',
    bereich: 'Zeilen',
    gilt: 'lv',
    muster: [{ taste: '+', strg: true, alt: false }],
  },
  {
    aktion: 'zeile-oeffnen',
    taste: 'Strg+Enter',
    beschreibung: 'Zeile öffnen, z. B. im Positionsdialog',
    bereich: 'Zeilen',
    gilt: 'lv',
    muster: [{ taste: 'Enter', strg: true, alt: false, umschalt: false }],
  },
  {
    aktion: 'alles-auswaehlen',
    taste: 'Strg+A',
    beschreibung: 'Alles auswählen',
    bereich: 'Auswahl',
    gilt: 'alle',
    muster: [{ taste: 'a', strg: true, alt: false }],
  },
  {
    aktion: 'zeile-auswaehlen',
    taste: 'Leertaste',
    beschreibung: 'Aktive Zeile zur Auswahl hinzufügen oder aus ihr entfernen',
    bereich: 'Auswahl',
    gilt: 'lv',
    muster: [{ taste: ' ' }],
  },
  {
    aktion: 'tab',
    taste: 'Tab oder Umschalt+Tab',
    beschreibung: 'Nächste oder vorige Zelle; am Anfang und Ende verlässt der Fokus die Tabelle',
    bereich: 'Navigation',
    gilt: 'alle',
    muster: [{ taste: 'Tab' }],
  },
  {
    aktion: 'auswahl-erweitern',
    taste: 'Umschalt+Pfeiltaste, Pos1, Ende, Bild auf oder Bild ab',
    beschreibung: 'Auswahl bis zur Zielzelle erweitern',
    bereich: 'Auswahl',
    gilt: 'alle',
    muster: jede([...PFEILE, ...RAENDER, ...SEITEN], { umschalt: true }),
  },
  {
    aktion: 'tabellenrand',
    taste: 'Strg+Pos1 oder Strg+Ende',
    beschreibung: 'Erste oder letzte Zelle der Tabelle',
    bereich: 'Navigation',
    gilt: 'alle',
    muster: jede(RAENDER, { strg: true }),
  },
  {
    aktion: 'rand',
    taste: 'Strg+Pfeiltaste',
    beschreibung: 'An den Rand der Tabelle in Pfeilrichtung',
    bereich: 'Navigation',
    gilt: 'alle',
    muster: jede(PFEILE, { strg: true }),
  },
  {
    aktion: 'zelle-wechseln',
    taste: 'Pfeiltasten',
    beschreibung: 'Zur benachbarten Zelle',
    bereich: 'Navigation',
    gilt: 'alle',
    muster: jede(PFEILE),
  },
  {
    aktion: 'zeilenrand',
    taste: 'Pos1 oder Ende',
    beschreibung: 'Erste oder letzte Zelle der Zeile',
    bereich: 'Navigation',
    gilt: 'alle',
    muster: jede(RAENDER),
  },
  {
    aktion: 'seite',
    taste: 'Bild auf oder Bild ab',
    beschreibung: 'Eine Seite nach oben oder unten',
    bereich: 'Navigation',
    gilt: 'alle',
    muster: jede(SEITEN),
  },
  {
    aktion: 'bearbeiten',
    taste: 'F2',
    beschreibung: 'Aktive Zelle bearbeiten',
    bereich: 'Bearbeiten',
    gilt: 'lv',
    muster: [{ taste: 'F2' }],
  },
  {
    aktion: 'enter',
    taste: 'Enter oder Umschalt+Enter',
    beschreibung:
      'Eine Zeile weiter oder zurück; im Leistungsverzeichnis beginnt Enter das Bearbeiten einer bearbeitbaren Zelle und übernimmt die Eingabe',
    bereich: 'Bearbeiten',
    gilt: 'alle',
    muster: [{ taste: 'Enter' }],
  },
  {
    aktion: 'abbrechen',
    taste: 'Esc',
    beschreibung: 'Bearbeiten oder Ausschneiden abbrechen, sonst die Auswahl aufheben',
    bereich: 'Bearbeiten',
    gilt: 'alle',
    muster: [{ taste: 'Escape' }],
  },
  {
    aktion: 'zelle-leeren',
    taste: 'Entf',
    beschreibung: 'Inhalt der aktiven Zelle leeren',
    bereich: 'Bearbeiten',
    gilt: 'lv',
    muster: [{ taste: 'Delete' }],
  },
  {
    aktion: 'tippen',
    taste: 'Zeichen tippen',
    beschreibung: 'Bearbeiten beginnen; das Zeichen ersetzt den Inhalt der Zelle',
    bereich: 'Bearbeiten',
    gilt: 'lv',
    muster: [{ taste: ZEICHEN, strg: false, alt: false }],
  },
];

const umschalter = (gefordert: boolean | undefined, gedrueckt: boolean): boolean =>
  gefordert === undefined || gefordert === gedrueckt;

function passt(e: Tastendruck, m: Tastenmuster): boolean {
  const taste =
    m.taste === ZEICHEN
      ? e.key.length === 1 && e.key !== ' '
      : m.taste.length === 1
        ? e.key.toLowerCase() === m.taste
        : e.key === m.taste;
  return (
    taste &&
    umschalter(m.strg, e.ctrlKey || e.metaKey) &&
    umschalter(m.alt, e.altKey) &&
    umschalter(m.umschalt, e.shiftKey)
  );
}

/** Die Aktion eines Tastendrucks im Grid der Art `grid`, oder `null`, wenn er kein Kürzel ist. */
export function kuerzelAktion(e: Tastendruck, grid: Gridart): KuerzelAktion | null {
  for (const k of GRID_KUERZEL) {
    if (k.gilt !== 'alle' && k.gilt !== grid) continue;
    if (k.muster.some((m) => passt(e, m))) return k.aktion;
  }
  return null;
}

/** Aktionen, die nur die aktive Zelle bewegen (über `zielZelle`), mit Umschalt die Auswahl erweiternd. */
export const NAVIGATIONSAKTIONEN: ReadonlySet<KuerzelAktion> = new Set<KuerzelAktion>([
  'auswahl-erweitern',
  'tabellenrand',
  'rand',
  'zelle-wechseln',
  'zeilenrand',
  'seite',
]);

/** Tasten, die die aktive Zelle bewegen (`zielZelle`): aus den Navigationskürzeln der Tabelle. */
export const NAVIGATIONSTASTEN: ReadonlySet<string> = new Set(
  GRID_KUERZEL.filter((k) => NAVIGATIONSAKTIONEN.has(k.aktion)).flatMap((k) => k.muster.map((m) => m.taste)),
);

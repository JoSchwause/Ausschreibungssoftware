// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffentliche Typen des Vergleichsgrids (Ticket 60), z. B. für den Preisspiegel. Eigene, generische Typen des Pakets,
// nicht aus `vertrag`: Das Grid kennt weder Angebote noch Bieter, nur Zeilen, Spalten und fertige Texte. Es rechnet und
// formatiert nie (N1, A5); Zahlen kommen als Text, ihre Bedeutung als Kennzeichen.

/**
 * Kennzeichen einer Zelle. Die bekannten haben Symbol, Beschreibung und Farbe im Grid; jedes andere ist erlaubt
 * (offene Vereinigung) und bekommt seine Texte über `kennzeichenTexte`, sonst ein neutrales Symbol und sich selbst als
 * Beschreibung.
 */
export type Kennzeichen =
  'hoch' | 'niedrig' | 'min' | 'max' | 'nicht-angeboten' | 'nullpreis' | 'hinweis' | (string & {});

/** Wie ein Kennzeichen erscheint: ein kurzes Symbol in der Zelle und eine Beschreibung in Worten (Tooltip, Screenreader). */
export interface KennzeichenText {
  readonly symbol: string;
  readonly beschreibung: string;
}

/** Eine Zelle: fertiger Anzeigetext, optional Kennzeichen (in dieser Reihenfolge angezeigt) und ein Tooltip. */
export interface VergleichsZelle {
  readonly text: string;
  readonly kennzeichen?: readonly Kennzeichen[];
  /** Zusatztext beim Überfahren und für den Screenreader, hinter den Beschreibungen der Kennzeichen. */
  readonly tooltip?: string;
  /** Balken der Zelle; wirkt nur in einer Spalte mit `zeitleiste` (Ticket 96). Der Text steht rechts neben dem Balken. */
  readonly balken?: Balken;
}

// --- Balkenspalte (Ticket 96), z. B. für den Bauzeitenplan --------------------------------------------------------
// Das Grid rechnet nie mit Kalendern oder Daten: Alle Lagen sind Tagesindizes (ganze Zahl ab 0 = erster Tag der Achse),
// alle Texte kommen fertig formatiert vom Aufrufer (N4), wie die Zelltexte. Ein Tagesindex ist eine Grenze: Der Balken
// `vonTag: 2, bisTag: 5` beginnt am Anfang von Tag 2 und endet am Anfang von Tag 5, deckt also die Tage 2, 3 und 4.

/** Ein Abschnitt der Zeitachse im Kopf, z. B. ein Monat oder eine Kalenderwoche. */
export interface Zeitabschnitt {
  /** Fertiger Text, z. B. „Januar 2027“ oder „KW 3“. */
  readonly text: string;
  readonly vonTag: number;
  /** Exklusiv. Ein Abschnitt, der über die Achse hinausreicht, wird abgeschnitten. */
  readonly bisTag: number;
}

/** Senkrechte Linie über die ganze Balkenspalte, z. B. ein Stichtag. */
export interface Zeitmarkierung {
  /** Die Linie steht am Anfang dieses Tages, wie der linke Rand eines Balkens mit diesem `vonTag`. */
  readonly tag: number;
  /** Art der Linie, z. B. `stichtag`; aus Kleinbuchstaben, Ziffern und Bindestrich wird eine CSS-Klasse. */
  readonly art: string;
  /** Fertiger Text für Tooltip und Screenreader, z. B. „Stichtag 01.03.2027“. */
  readonly beschreibung: string;
}

/** Die Zeitachse einer Balkenspalte. Die Spalte ist `tage × pixelJeTag` breit; `breite` der Spalte gilt dann nicht. */
export interface Zeitleiste {
  /** Zahl der Tage der Achse, mindestens 1. */
  readonly tage: number;
  /** Standard 16. Die App wählt den Maßstab (kein Zoom im Grid). */
  readonly pixelJeTag?: number;
  /** Obere Kopfzeile, z. B. Monate; ohne `unterkopf` über die volle Höhe des Kopfes. */
  readonly kopf: readonly Zeitabschnitt[];
  /** Untere Kopfzeile, z. B. Kalenderwochen oder Tage. */
  readonly unterkopf?: readonly Zeitabschnitt[];
  /** Tagesindizes, die schattiert werden, z. B. Wochenenden und Feiertage. */
  readonly freieTage?: readonly number[];
  readonly markierungen?: readonly Zeitmarkierung[];
}

/** Vorgang als Balken, Sammelvorgang als schmale Klammer, Meilenstein als Raute bei `vonTag`. */
export type Balkenart = 'vorgang' | 'sammelvorgang' | 'meilenstein';

/** Der Balken einer Zelle in einer Spalte mit `zeitleiste`. Liegt er (teils) außerhalb der Achse, wird er abgeschnitten
 * und bekommt am Rand ein Kennzeichen; nichts verschwindet still (Q5). */
export interface Balken {
  readonly vonTag: number;
  /** Exklusiv; gleich `vonTag` bei einem Meilenstein. */
  readonly bisTag: number;
  readonly art: Balkenart;
  /** Kritisch: anders gefärbt und zusätzlich gemustert (Vorgang) oder gerahmt (Sammelvorgang, Meilenstein), U8. */
  readonly kritisch?: boolean;
  /** Fertiger Anteil 0 bis 100, von links gefüllt. */
  readonly fortschritt?: number;
  /** Ist-Termine als zweiter, schmaler Balken unter dem Balken. */
  readonly ist?: { readonly vonTag: number; readonly bisTag: number };
  /** Pflicht: Tooltip und Name für den Screenreader, z. B. „12.01.2027 bis 23.01.2027, 10 Arbeitstage, kritisch“. */
  readonly beschreibung: string;
}

/** Spaltengruppe für den zweizeiligen Kopf, z. B. ein Bieter über seinen Spalten EP und GP. */
export interface VergleichsSpaltengruppe {
  /** Aufeinanderfolgende Spalten mit derselben Gruppen-Kennung teilen sich einen Gruppenkopf. */
  readonly id: string;
  readonly kopf: string;
}

export interface VergleichsSpalte {
  /** Eindeutig im Grid; Schlüssel in `zellen` der Zeilen. */
  readonly id: string;
  /** Spaltenkopf (bei einer Gruppe die untere Kopfzeile, z. B. „EP“). */
  readonly kopf: string;
  readonly gruppe?: VergleichsSpaltengruppe;
  /** Standard `links`; Beträge stehen üblicherweise `rechts`. */
  readonly ausrichtung?: 'links' | 'rechts' | 'mitte';
  /** Breite in Pixeln; Standard 120. */
  readonly breite?: number;
  /**
   * Macht die Spalte zur Balkenspalte (Ticket 96): Zeitachse im Kopf, je Zelle ein `balken`. Die Breite ist dann
   * `tage × pixelJeTag`; `breite` und `gruppe` gelten nicht (die Achse braucht beide Kopfzeilen). `kopf` ist der
   * zugängliche Name der Spalte.
   */
  readonly zeitleiste?: Zeitleiste;
}

/**
 * Eine sichtbare Zeile des Baums. Wie bei `LvAnsicht` sind die Zeilen schon der sichtbare, flache Baum: Zugeklappte
 * Unterzeilen fehlen, der Aufklappzustand gehört dem Aufrufer.
 */
export interface VergleichsZeile {
  /** Eindeutig im Grid, auch gegenüber den Summenzeilen. */
  readonly id: string;
  readonly art: 'gliederung' | 'position';
  /** 0 = oberste Stufe; bestimmt den Einzug in der Baumspalte. */
  readonly tiefe: number;
  readonly hatUnterknoten: boolean;
  readonly aufgeklappt: boolean;
  /** Zellen je Spalten-Kennung; eine fehlende Zelle bleibt leer. */
  readonly zellen: Readonly<Record<string, VergleichsZelle | undefined>>;
}

/** Feste Zeile unter dem Körper (Netto, Nachlass, Brutto, Rang …), immer sichtbar und per Tastatur erreichbar. */
export interface VergleichsSummenzeile {
  /** Eindeutig im Grid, auch gegenüber den Zeilen. */
  readonly id: string;
  /** Die Beschriftung steht als Zelle einer Spalte (z. B. Kurztext), wie jeder andere Wert. */
  readonly zellen: Readonly<Record<string, VergleichsZelle | undefined>>;
}

/** Eine Zelle des Grids, benannt über Zeilen- und Spalten-Kennung. */
export interface VergleichsZellort {
  readonly zeilenId: string;
  readonly spalte: string;
}

/** Ziel eines Sprungs: Ändert sich `nr`, springt das Grid zur Zelle (wie `Sprungziel` des `LvGrid`). */
export interface VergleichsSprungziel {
  readonly zeilenId: string;
  /** Spalte der Zelle; ohne Angabe bleibt die aktive Spalte. */
  readonly spalte?: string;
  /** Zähler des Aufrufers: Jeder neue Wert ist ein neuer Sprung, auch zur selben Zelle. */
  readonly nr: number;
}

export interface VergleichsGridProps {
  /** Spalten in Anzeige- und Navigationsreihenfolge. */
  readonly spalten: readonly VergleichsSpalte[];
  /** Sichtbare Zeilen des Baums (virtualisiert). */
  readonly zeilen: readonly VergleichsZeile[];
  /** Summenzeilen am Ende in dieser Reihenfolge; sie kleben am unteren Rand. */
  readonly summen?: readonly VergleichsSummenzeile[];
  /** Zahl der linken Spalten, die beim waagerechten Scrollen stehen bleiben (z. B. 2 für OZ und Kurztext); Standard 0. */
  readonly fixierteSpalten?: number;
  /** Spalte mit Einzug und Auf-/Zuklappknopf; Standard die erste Spalte. */
  readonly baumspalte?: string;
  /** Zugänglicher Name des Grids; Standard „Vergleich“. */
  readonly beschriftung?: string;
  /** Zeilenhöhe in Pixeln; Standard 28 (wie `--tx-control-height`). */
  readonly zeilenhoehe?: number;
  /** Texte für eigene Kennzeichen oder statt der eingebauten. */
  readonly kennzeichenTexte?: Readonly<Record<string, KennzeichenText>>;
  /** Sprung zu einer Zelle. Steht die Zeile nicht in der Ansicht (zugeklappt), tut das Grid nichts. */
  readonly sprungziel?: VergleichsSprungziel;
  /** Der Nutzer will eine Zeile auf- oder zuklappen. Der Zustand gehört dem Aufrufer. */
  readonly onAufklappen?: (zeilenId: string, aufgeklappt: boolean) => void;
  /**
   * Die Zeile der aktiven Zelle hat sich geändert (auch eine Summenzeile). Gemeldet nach dem Rendern, auch beim ersten
   * (ohne Klick die erste Zeile) und wenn die Zeile aus der Ansicht verschwindet; `null` ohne Zeilen.
   */
  readonly onZeileAktiv?: (zeilenId: string | null) => void;
  /** Wie `onZeileAktiv`, aber bei jedem Wechsel der aktiven Zelle, auch nur der Spalte. */
  readonly onZelleAktiv?: (zelle: VergleichsZellort | null) => void;
}

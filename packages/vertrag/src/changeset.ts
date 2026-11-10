// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet (A6), Ergebniswerte und Fehler abgewiesener Befehle. Nur Typen.

import type { AngebotBefehl, AuftragsLvBefehl, LvBefehl, ProjektBefehl } from './befehle';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  KnotenId,
  LeistungsverzeichnisId,
  ProjektId,
} from './marken';
import type {
  Angebot,
  AngebotKopf,
  Angebotsposition,
  AuftragsLeistungsverzeichnis,
  AuftragsLvKopf,
  Knoten,
  Leistungsverzeichnis,
  LvKopf,
  Projekt,
} from './modell';
import type { Summenaenderung, Summenstand } from './summen';

// --- Ergebnis und Fehler ------------------------------------------------------------------------------------

/** Ergebniswert statt Ausnahme: erwartbare Fehler sind Werte. Gilt für Befehle, Parser, Speicher. */
export type Ergebnis<T, F> =
  { readonly ok: true; readonly wert: T } | { readonly ok: false; readonly fehler: F };

/** Grund, aus dem ein Befehl abgewiesen wird. Ein abgewiesener Befehl ändert nichts und erzeugt kein ChangeSet. */
export type Befehlsfehlercode =
  | 'ungueltige-eingabe' // Form oder Wert unzulässig (z. B. Hinweistext mit Menge/Preis, Skala falsch)
  | 'knoten-unbekannt'
  | 'eltern-unbekannt'
  | 'id-vergeben'
  | 'zyklus' // Verschieben unter den eigenen Unterbaum
  | 'ebene-ueberschritten' // mehr als 5 Gliederungsebenen
  | 'knotenart-unzulaessig' // z. B. Positionen unter einer Position
  | 'bezug-unbekannt' // Bezugs- oder Grundposition fehlt
  | 'oz-ungueltig' // Zeichen oder Länge verletzen die Maske
  | 'maske-ungueltig'
  | 'oz-doppelt' // v1.1a: Umnummerieren oder Vergabe würde eine Ordnungszahl doppelt belegen (F2; die Handeingabe lässt sie zu, U5)
  /**
   * v1.1a: Überlauf der Ordnungszahl, nur wenn auch der kleinste Schritt (1) nicht mehr in die Maske passt (F2, E-09).
   * Das Ausweichen von Schritt 10 auf 5, 2, 1 ist kein Fehler, sondern ein Hinweis (`oz-schritt-ausgewichen`,
   * `Befehlshinweis`); der Befehl wird dabei ausgeführt.
   */
  | 'oz-ueberlauf'
  | 'angebot-unbekannt'
  | 'befehl-nicht-zustaendig'; // Befehl passt nicht zum übergebenen Zustand

export interface Befehlsfehler {
  readonly code: Befehlsfehlercode;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
  readonly knotenId?: KnotenId;
  /** Betroffenes Feld, z. B. `menge`. */
  readonly feld?: string;
}

// --- Hinweise aus angenommenen Befehlen (v1.1a, Punkt 10) ------------------------------------------------------

/**
 * Stabiler Code eines Befehlshinweises. Geschlossene Liste wie `Befehlsfehlercode`; ein neuer Wert braucht ein
 * Vertragsticket. Die Zeichenketten sind Teil des Vertrags (Golden-Tests, Oberfläche).
 */
export type Befehlshinweiscode =
  /** F2: Bei Überlauf wich die OZ-Vergabe automatisch auf Schritt 5, 2 oder 1 aus. */
  | 'oz-schritt-ausgewichen'
  /** N5, E-06: Das Netto nach Nachlass ist negativ. Ein Befund, keine Sperre. */
  | 'netto-nach-nachlass-negativ';

/**
 * Hinweis zu einem angenommenen Befehl. Der Befehl wird trotzdem ausgeführt und liefert sein ChangeSet; ein Hinweis
 * ist nie ein Grund, ihn abzuweisen (dafür gibt es `Befehlsfehler`). Er ist flüchtig: Er gehört zur Antwort auf den
 * Befehl, wird nicht gespeichert und von `LvChangeSetAnwenden` nicht ausgewertet. Die dauerhafte Fassung des
 * negativen Nettos ist der Prüfbefund der LV-Prüfung (K8), der denselben Code als `Pruefbefund.code` führt.
 */
export interface Befehlshinweis {
  readonly code: Befehlshinweiscode;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
  readonly knotenId?: KnotenId;
  /** Betroffenes Feld, z. B. `ordnungszahl`. */
  readonly feld?: string;
}

// --- Zustände ------------------------------------------------------------------------------------------------

/** Zustand, auf dem LV-Befehle arbeiten: das LV samt dem zuletzt berechneten Summenstand. */
export interface LvZustand {
  readonly leistungsverzeichnis: Leistungsverzeichnis;
  readonly summen: Summenstand;
}

export interface AngebotZustand {
  readonly angebot: Angebot;
  readonly summen: Summenstand;
}

/** Auftrags-LV samt Summen. */
export interface AuftragsLvZustand {
  readonly auftragsLeistungsverzeichnis: AuftragsLeistungsverzeichnis;
  readonly summen: Summenstand;
}

// --- ChangeSet -----------------------------------------------------------------------------------------------

/**
 * Geänderter Wert mit altem und neuem Stand. `vorher: null` heißt neu, `nachher: null` heißt gelöscht. Bei einem
 * Aggregat (Projekt, LV, Angebot, Auftrags-LV) ist `nachher: null` das Löschen (v1.1a, Punkt 4); der volle Stand steht
 * dann in `vorher` und in den entfernten Elementen des ChangeSets.
 */
export interface Aenderung<T> {
  readonly vorher: T | null;
  readonly nachher: T | null;
}

/**
 * Geänderte Elemente einer Sammlung. `geaendert` trägt alten und neuen Stand, `entfernt` den vollständigen
 * Stand der entfernten Elemente: so lässt sich jedes ChangeSet ohne den Kern umkehren (Undo, S3).
 * `hinzugefuegt` ist so geordnet, dass Eltern vor Kindern stehen.
 */
export interface Aenderungen<T> {
  readonly hinzugefuegt: readonly T[];
  readonly geaendert: readonly { readonly vorher: T; readonly nachher: T }[];
  readonly entfernt: readonly T[];
}

export interface ProjektChangeSet {
  readonly art: 'projekt';
  readonly projektId: ProjektId;
  /** `nachher: null`: das Projekt wird gelöscht (`ProjektLoeschen`); `vorher` ist der volle Stand samt Bietern. */
  readonly projekt: Aenderung<Projekt>;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
}

/**
 * ChangeSet am Ausschreibungs-LV: geänderte Knoten und betroffene Summen (A6). `kopf` ist nur gesetzt, wenn sich
 * Stammdaten ändern oder das LV entsteht oder gelöscht wird. Geschwister, deren `reihenfolge` sich ändert, stehen
 * unter `geaendert`.
 *
 * Umkehrbar ohne Vorzustand (v1.1a): `kopf` und `knoten` tragen alte und neue Stände, `summen.vorher` die alten
 * Summen. Anlegen (`kopf.vorher: null`) und Löschen (`kopf.nachher: null`, alle Knoten in `knoten.entfernt`, alle Summen
 * in `summen.vorher.entfernt`) sind Gegenstücke: die Umkehrung des einen ist das andere.
 */
export interface LvChangeSet {
  readonly art: 'leistungsverzeichnis';
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  readonly kopf: Aenderung<LvKopf> | null;
  readonly knoten: Aenderungen<Knoten>;
  readonly summen: Summenaenderung;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
}

export interface AngebotChangeSet {
  readonly art: 'angebot';
  readonly angebotId: AngebotId;
  readonly kopf: Aenderung<AngebotKopf> | null;
  readonly positionen: Aenderungen<Angebotsposition>;
  readonly summen: Summenaenderung;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
}

/**
 * ChangeSet am Auftrags-LV (v1.1a, Punkt 5), gleich gebaut wie `LvChangeSet`. Mehr als das Anlegen erzeugt bis zur
 * Vergabe (Welle 4) kein Befehl; der Typ ist aber schon vollständig, damit Speicher und Undo nichts nachrüsten müssen.
 */
export interface AuftragsLvChangeSet {
  readonly art: 'auftrags-leistungsverzeichnis';
  readonly auftragsLeistungsverzeichnisId: AuftragsLeistungsverzeichnisId;
  readonly kopf: Aenderung<AuftragsLvKopf> | null;
  readonly knoten: Aenderungen<Knoten>;
  readonly summen: Summenaenderung;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
}

export type ChangeSet = ProjektChangeSet | LvChangeSet | AngebotChangeSet | AuftragsLvChangeSet;

// --- Signaturen für Kern und Vergabe -----------------------------------------------------------------------

/** Aus Befehl und Zustand wird ein ChangeSet oder ein Fehlerwert; rein und deterministisch (A2). */
export type LvBefehlAusfuehren = (
  zustand: LvZustand | null,
  befehl: LvBefehl,
) => Ergebnis<LvChangeSet, Befehlsfehler>;

export type AngebotBefehlAusfuehren = (
  zustand: AngebotZustand | null,
  befehl: AngebotBefehl,
) => Ergebnis<AngebotChangeSet, Befehlsfehler>;

export type ProjektBefehlAusfuehren = (
  zustand: Projekt | null,
  befehl: ProjektBefehl,
) => Ergebnis<ProjektChangeSet, Befehlsfehler>;

export type AuftragsLvBefehlAusfuehren = (
  zustand: AuftragsLvZustand | null,
  befehl: AuftragsLvBefehl,
) => Ergebnis<AuftragsLvChangeSet, Befehlsfehler>;

/**
 * Wendet ein ChangeSet auf einen Zustand an (reine Funktion). `null` als Zustand: das Aggregat entsteht erst
 * (`changeSet.kopf.vorher` ist `null`). `null` als Ergebnis (v1.1a): das Aggregat verschwindet
 * (`changeSet.kopf.nachher` ist `null`, also das Löschen eines LV oder die Umkehrung des Anlegens). Wer diese
 * Funktion liefert, ist `kern`.
 */
export type LvChangeSetAnwenden = (zustand: LvZustand | null, changeSet: LvChangeSet) => LvZustand | null;

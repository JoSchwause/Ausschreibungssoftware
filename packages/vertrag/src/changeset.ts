// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet (A6), Ergebniswerte und Fehler abgewiesener Befehle. Nur Typen.

import type { AngebotBefehl, LvBefehl, ProjektBefehl } from './befehle';
import type { AngebotId, KnotenId, LeistungsverzeichnisId, ProjektId } from './marken';
import type {
  Angebot,
  AngebotKopf,
  Angebotsposition,
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

// --- ChangeSet -----------------------------------------------------------------------------------------------

/** Geänderter Wert mit altem und neuem Stand. `vorher: null` heißt neu, `nachher: null` heißt gelöscht. */
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
  readonly projekt: Aenderung<Projekt>;
}

/**
 * ChangeSet am Ausschreibungs-LV: geänderte Knoten und betroffene Summen (A6). `kopf` ist nur gesetzt, wenn sich
 * Stammdaten ändern oder das LV entsteht. Geschwister, deren `reihenfolge` sich ändert, stehen unter `geaendert`.
 */
export interface LvChangeSet {
  readonly art: 'leistungsverzeichnis';
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  readonly kopf: Aenderung<LvKopf> | null;
  readonly knoten: Aenderungen<Knoten>;
  readonly summen: Summenaenderung;
}

export interface AngebotChangeSet {
  readonly art: 'angebot';
  readonly angebotId: AngebotId;
  readonly kopf: Aenderung<AngebotKopf> | null;
  readonly positionen: Aenderungen<Angebotsposition>;
  readonly summen: Summenaenderung;
}

export type ChangeSet = ProjektChangeSet | LvChangeSet | AngebotChangeSet;

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

/**
 * Wendet ein ChangeSet auf einen Zustand an (reine Funktion). `null` als Zustand: das Aggregat entsteht erst.
 * Wer diese Funktion liefert, legt ein späteres Ticket fest (siehe „Offene Typfragen“, Ticket 02).
 */
export type LvChangeSetAnwenden = (zustand: LvZustand | null, changeSet: LvChangeSet) => LvZustand;

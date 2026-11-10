// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet (A6), Ergebniswerte und Fehler abgewiesener Befehle. Nur Typen.

import type { AngebotBefehl, AuftragsLvBefehl, LvBefehl, ProjektBefehl } from './befehle';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  KnotenId,
  LeistungsverzeichnisId,
  LvStandId,
  ProjektId,
  Zeitstempel,
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
  PapierkorbEintrag,
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
  | 'netto-nach-nachlass-negativ'
  /**
   * v1.2, U5: `LeistungsverzeichnisAnlegen` (GAEB-Import) nahm eine OZ-Maske an, die der Kern beanstandet
   * (`maskePruefen`). Der Befehl wird ausgeführt; der Befund kommt als Hinweis mit (Ticket 30).
   */
  | 'oz-maske-ungueltig';

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

// --- LV-Stand (v1.2, S3; ADR 0006) -----------------------------------------------------------------------------

/** Kopf eines LV-Stands: was das ChangeSet von `LvStandAnlegen` trägt (`LvChangeSet.lvStand`). */
export interface LvStandKopf {
  readonly id: LvStandId;
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  readonly name: string;
}

/**
 * LV-Stand (v1.2, ADR 0006): ein eingefrorener, unveränderlicher Stand eines LV samt Summen. `speicher` legt ihn in
 * derselben Transaktion an wie das ChangeSet von `LvStandAnlegen`, aus dem gespeicherten Stand des LV; `angelegt` ist
 * `Protokolleintrag.wann` dieses Befehls. Er wird nie geändert; ein LV aus einem Stand zurückholen geht über
 * `LeistungsverzeichnisAnlegen` mit dem Inhalt des Stands (kein Zurückschreiben in das bestehende LV).
 */
export interface LvStand extends LvStandKopf {
  readonly angelegt: Zeitstempel;
  readonly zustand: LvZustand;
}

/** LV-Stand ohne den Zustand, für Listen (`LvStandRepository.auflisten`). */
export type LvStandUebersicht = Omit<LvStand, 'zustand'>;

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
  /**
   * Geänderte Papierkorbeinträge (v1.2, K9); fehlt: keine Änderung. Hineinlegen (`KnotenInPapierkorbLegen`) =
   * `knoten.entfernt` + `papierkorb.hinzugefuegt`; Wiederherstellen = `knoten.hinzugefuegt` + `papierkorb.entfernt`;
   * Entfernen und Leeren = nur `papierkorb.entfernt`. Umkehrbar ohne Vorzustand wie seit v1.1a.
   */
  readonly papierkorb?: Aenderungen<PapierkorbEintrag>;
  /**
   * LV-Stand (v1.2, S3); fehlt: keine Änderung. `vorher: null`: `LvStandAnlegen`, `speicher` friert den gespeicherten
   * Stand des LV in derselben Transaktion ein. `nachher: null` kommt nur als Umkehrung vor: der Stand entfällt.
   * Ein Stand wird nie geändert (beide Seiten gesetzt kommt nicht vor).
   */
  readonly lvStand?: Aenderung<LvStandKopf>;
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

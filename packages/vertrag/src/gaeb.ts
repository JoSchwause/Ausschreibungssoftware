// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB-neutrale Austauschtypen, nur soweit `gaeb` (G1) und die Oberfläche sie brauchen. Keine XML-Elemente.

import type { KnotenId } from './marken';
import type { LvInhalt } from './modell';

/** Austauschphase (Glossar „GAEB-Austauschphasen“). v1 unterstützt davon X81, X83, X84, X86. */
export type GaebPhase = 'X81' | 'X82' | 'X83' | 'X84' | 'X85' | 'X86' | 'X89' | 'X31';

/**
 * GAEB DA XML Version. GAEB 90 und 2000 sind kein Ziel von v1. `3.1` ist nur erkennbar (v1.1a): Eine 3.1-Datei
 * liefert einen Befund und keinen Inhalt (Ticket 22, G4); als Export-Version ist `3.1` kein Ziel.
 */
export type GaebVersion = '3.1' | '3.2' | '3.3';

export type Befundschwere = 'warnung' | 'fehler';

/**
 * Woher ein Befund stammt. XSD-Befunde entstehen nur in der CI, nicht zur Laufzeit (ADR 0010).
 *
 * v1.5 (Ticket 95 Punkt 2; Ticket 76, D-76.4): dazu `erechnung-lesen`, das Lesen einer E-Rechnung (heute eine XRechnung in
 * UBL oder CII, `xrechnungLesen` in `erechnung`; ein späterer ZUGFeRD-Leser meldet unter derselben Quelle). So legt
 * `erechnung` seine Befunde in die gemeinsame Befundliste statt in einen eigenen Befundtyp (Umstellung Ticket 104). Den
 * Ort eines solchen Befunds beschreibt `Befundort`.
 */
export type Befundquelle =
  'gaeb-lesen' | 'gaeb-pruefung' | 'lv-pruefung' | 'xsd-gegenpruefung' | 'erechnung-lesen';

/**
 * Ort eines Befunds: in der Datei (Pfad, Zeile, Spalte) und/oder im Modell (Knoten, Feld).
 *
 * v1.5 (Ticket 95 Punkt 2), Lesart für die Quelle `erechnung-lesen` (vorläufige Annahme, Entscheidung offen; so liefert
 * `erechnung` seine Befunde seit Ticket 76): `feld` ist die Kennung des Business Terms der EN 16931, zu dem der Befund
 * gehört (`BT-115`), bei jedem Befund zu einem Wert, einer Pflichtangabe oder einer Summenregel; `pfad` das Element in der
 * Datei, wenn der Befund an einem Element hängt (eine Summenregel hängt an keinem); `zeile` und `spalte` nur, wenn die
 * Datei kein lesbares XML ist; `knotenId` nie (eine E-Rechnung hat keine Knoten). Ein Befund zur Datei als Ganzes (fremdes
 * Wurzelelement, Unterposition ohne Oberposition) hat nur den Pfad. Der Business Term heißt in UBL und CII gleich, der
 * Pfad nicht: Wer Befunde zuordnet oder vergleicht, nimmt `feld`. Alternative: siehe Offene Typfragen, Ticket 95.
 */
export interface Befundort {
  /**
   * Pfad im XML, z. B. `/GAEB/Award/BoQ/BoQBody`. Bei einer E-Rechnung (v1.5) aus lokalen Elementnamen ohne Präfix, mit
   * `[n]` (ab 1), wo gleichnamige Geschwister stehen, z. B. `/Invoice/InvoiceLine[2]/LineExtensionAmount`.
   */
  readonly pfad?: string;
  readonly zeile?: number;
  readonly spalte?: number;
  readonly knotenId?: KnotenId;
  /**
   * Feld des Knotens oder der Grid-Spalte, z. B. `menge`. Bei einer E-Rechnung (v1.5) der Business Term, z. B. `BT-115`.
   */
  readonly feld?: string;
}

/** Prüfbefund: Warnung oder Fehler mit Quelle und Ort. Sperrt nie die Eingabe (U5). */
export interface Pruefbefund {
  readonly schwere: Befundschwere;
  readonly quelle: Befundquelle;
  /** Stabiler Code für Golden-Dateien und Tests, z. B. `dezimalkomma`. */
  readonly code: string;
  readonly meldung: string;
  readonly ort: Befundort;
}

/**
 * Ergebnis des tolerant lesenden Parsers: ein Leseergebnis auch bei Befunden. `inhalt` ist `null`, wenn gar
 * keine Struktur zu retten war. Kennungen stammen aus der `IdQuelle`, das Projekt vergibt die App
 * beim Übernehmen (`LeistungsverzeichnisAnlegen`).
 */
export interface GaebLesung {
  readonly phase: GaebPhase | null;
  readonly version: GaebVersion | null;
  readonly inhalt: LvInhalt | null;
  readonly befunde: readonly Pruefbefund[];
}

/**
 * Ergebnis des streng schreibenden Exports. `entwurf` ist gesetzt, wenn die eigene Prüfung Fehler fand: Der
 * Export wird nicht gesperrt, sondern gewarnt und als Entwurf gekennzeichnet (G-13, ADR 0010).
 */
export interface GaebExport {
  readonly phase: GaebPhase;
  readonly version: GaebVersion;
  /** Die XML-Datei als Text (UTF-8). */
  readonly xml: string;
  readonly befunde: readonly Pruefbefund[];
  readonly entwurf: boolean;
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB-neutrale Austauschtypen, nur soweit `gaeb` (G1) und die Oberfläche sie brauchen. Keine XML-Elemente.

import type { KnotenId } from './marken';
import type { LvInhalt } from './modell';

/** Austauschphase (Glossar „GAEB-Austauschphasen“). v1 unterstützt davon X81, X83, X84, X86. */
export type GaebPhase = 'X81' | 'X82' | 'X83' | 'X84' | 'X85' | 'X86' | 'X89' | 'X31';

/** GAEB DA XML Version. GAEB 90 und 2000 sind kein Ziel von v1. */
export type GaebVersion = '3.2' | '3.3';

export type Befundschwere = 'warnung' | 'fehler';

/** Woher ein Befund stammt. XSD-Befunde entstehen nur in der CI, nicht zur Laufzeit (ADR 0010). */
export type Befundquelle = 'gaeb-lesen' | 'gaeb-pruefung' | 'lv-pruefung' | 'xsd-gegenpruefung';

/** Ort eines Befunds: in der Datei (Pfad, Zeile, Spalte) und/oder im Modell (Knoten, Feld). */
export interface Befundort {
  /** Pfad im XML, z. B. `/GAEB/Award/BoQ/BoQBody`. */
  readonly pfad?: string;
  readonly zeile?: number;
  readonly spalte?: number;
  readonly knotenId?: KnotenId;
  /** Feld des Knotens oder der Grid-Spalte, z. B. `menge`. */
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

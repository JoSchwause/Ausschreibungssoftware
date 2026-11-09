// SPDX-License-Identifier: AGPL-3.0-or-later
// Repository-Schnittstellen für `speicher` (S1), Befehlsprotokoll und Projektdatei. Nur Typen.

import type { Befehl } from './befehle';
import type { AngebotZustand, ChangeSet, Ergebnis, LvZustand } from './changeset';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  LeistungsverzeichnisId,
  NutzerId,
  ProjektId,
  ProtokollId,
  Zeitstempel,
} from './marken';
import type { AuftragsLeistungsverzeichnis, Projekt } from './modell';
import type { Summenstand } from './summen';

// --- Befehlsprotokoll (ADR 0009) -----------------------------------------------------------------------------

/** Aggregat, auf das ein Befehl wirkt. */
export type AggregatBezug =
  | { readonly art: 'projekt'; readonly id: ProjektId }
  | { readonly art: 'leistungsverzeichnis'; readonly id: LeistungsverzeichnisId }
  | { readonly art: 'angebot'; readonly id: AngebotId }
  | { readonly art: 'auftrags-leistungsverzeichnis'; readonly id: AuftragsLeistungsverzeichnisId };

/**
 * Ein Eintrag des Befehlsprotokolls: wer, was, wann. Nebenbuch, kein Quellzustand (ADR 0009). Genau ein Eintrag
 * je Befehl; `wann` liefert der Aufrufer (A2).
 */
export interface Protokolleintrag {
  readonly id: ProtokollId;
  readonly projektId: ProjektId;
  readonly aggregat: AggregatBezug;
  readonly wer: NutzerId;
  readonly wann: Zeitstempel;
  readonly befehl: Befehl;
}

// --- Fehler ----------------------------------------------------------------------------------------------------

export type Speicherfehlercode =
  | 'nicht-gefunden'
  | 'speicher-voll' // Quote erschöpft (Q5)
  | 'gesperrt' // z. B. OPFS nicht verfügbar
  | 'datei-ungueltig' // Projektdatei nicht lesbar oder nicht schemakonform
  | 'schema-zu-neu' // Projektdatei stammt von einer neueren Version
  | 'migration-fehlgeschlagen'
  | 'unbekannt';

/** Speicherfehler als Wert: nie stiller Datenverlust (Q5). */
export interface Speicherfehler {
  readonly code: Speicherfehlercode;
  readonly meldung: string;
}

// --- Repositories ---------------------------------------------------------------------------------------------

export interface Projektuebersicht {
  readonly id: ProjektId;
  readonly name: string;
}

export interface ProjektRepository {
  auflisten(): Promise<Ergebnis<readonly Projektuebersicht[], Speicherfehler>>;
  laden(id: ProjektId): Promise<Ergebnis<Projekt, Speicherfehler>>;
}

export interface LvRepository {
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly LeistungsverzeichnisId[], Speicherfehler>>;
  laden(id: LeistungsverzeichnisId): Promise<Ergebnis<LvZustand, Speicherfehler>>;
}

export interface AngebotRepository {
  auflisten(
    leistungsverzeichnisId: LeistungsverzeichnisId,
  ): Promise<Ergebnis<readonly AngebotId[], Speicherfehler>>;
  laden(id: AngebotId): Promise<Ergebnis<AngebotZustand, Speicherfehler>>;
}

/** Zustand der Persistenz des Browser-Speichers (Spec §9). */
export interface Persistenzstatus {
  readonly angefragt: boolean;
  /** `null`: unbekannt oder nicht unterstützt. */
  readonly persistent: boolean | null;
}

/**
 * Einziger Schreibweg (A5): ChangeSet und Protokolleintrag werden in einer Transaktion gespeichert, genau ein
 * Eintrag je Befehl. Schreibt der Aufrufer nur über `anwenden`, gibt es keinen direkten Tabellenzugriff.
 * Speichern bei jedem Befehl (G-35).
 */
export interface Speicher {
  readonly projekte: ProjektRepository;
  readonly leistungsverzeichnisse: LvRepository;
  readonly angebote: AngebotRepository;
  anwenden(eintrag: Protokolleintrag, changeSet: ChangeSet): Promise<Ergebnis<void, Speicherfehler>>;
  protokoll(projektId: ProjektId): Promise<Ergebnis<readonly Protokolleintrag[], Speicherfehler>>;
  persistenzstatus(): Promise<Persistenzstatus>;
  /** Exportiert die Projektdatei (JSON, G-56). Byte-stabil: kanonische Schlüsselreihenfolge. */
  projektdateiExportieren(projektId: ProjektId): Promise<Ergebnis<string, Speicherfehler>>;
  /** Importiert eine Projektdatei beliebiger älterer Schemaversion (A8). `inhalt` ist der JSON-Text. */
  projektdateiImportieren(inhalt: string): Promise<Ergebnis<ProjektId, Speicherfehler>>;
}

// --- Projektdatei (G-56, A8) -----------------------------------------------------------------------------------

/** Schemaversion der Projektdatei: positive ganze Zahl, bei jeder Migration erhöht (liegt bei `speicher`). */
export type Schemaversion = number;

/** Auftrags-LV samt Summen. */
export interface AuftragsLvZustand {
  readonly auftragsLeistungsverzeichnis: AuftragsLeistungsverzeichnis;
  readonly summen: Summenstand;
}

/**
 * Inhalt der JSON-Projektdatei in der aktuellen Schemaversion. Dezimalwerte stehen als Zeichenketten
 * (siehe `Dezimal`). Ältere Versionen liest `speicher` über Migrationen; dafür gibt es hier keinen Typ.
 */
export interface Projektdatei {
  readonly schemaVersion: Schemaversion;
  readonly projekt: Projekt;
  readonly leistungsverzeichnisse: readonly LvZustand[];
  readonly angebote: readonly AngebotZustand[];
  readonly auftragsLeistungsverzeichnisse: readonly AuftragsLvZustand[];
  readonly protokoll: readonly Protokolleintrag[];
}

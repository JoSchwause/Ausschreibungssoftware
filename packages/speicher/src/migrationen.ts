// SPDX-License-Identifier: AGPL-3.0-or-later
// Nummerierte Vorwärts-Migrationen (A8). Die Schemaversion steht in `PRAGMA user_version`, ändert sich
// atomar mit der Migration und ist zugleich die `schemaVersion` der JSON-Projektdatei.
//
// Regeln für eine neue Migration N+1:
//  1. Eintrag am Ende von `MIGRATIONEN` anfügen (lückenlos nummeriert). Bestehende Einträge nie ändern.
//  2. `hoch` verändert das Schema und überführt vorhandene Zeilen; kein Datenverlust (Q5).
//  3. `datei` hebt eine Projektdatei der Version N auf N+1 (reine Funktion über das geparste JSON).
//  4. Die eingefrorene Datei `fixtures/projektdatei-v1.json` bleibt unverändert und wird weiter geöffnet;
//     für N+1 kommt eine weitere eingefrorene Datei dazu.

import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';
import { fehlerAusAusnahme } from './fehler';
import { fehler, ok } from './ergebnis';
import type { Datenbank } from './sql';

export interface Migration {
  readonly version: number;
  readonly name: string;
  /** Verändert das Schema von `version - 1` auf `version`. Läuft in einer Transaktion. */
  readonly hoch: (db: Datenbank) => void;
  /** Hebt eine Projektdatei von `version - 1` auf `version`. `null` für Version 1 (Anfang der Reihe). */
  readonly datei: ((roh: Record<string, unknown>) => Record<string, unknown>) | null;
}

/**
 * Version 1. Alle Dezimalwerte sind TEXT in kanonischer Punktnotation und werden nie gerechnet (N1). Zahlen
 * (`reihenfolge`, Flags) sind INTEGER. `knoten` und die Summentabellen sind nach `aggregat_id` geschlüsselt:
 * das ist die Kennung eines LV, Angebots oder Auftrags-LV (Positionsidentität ist je Aggregat eindeutig).
 */
const SCHEMA_V1 = `
CREATE TABLE projekt (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  bauherr_name TEXT NOT NULL,
  bauherr_anschrift TEXT
) STRICT;

CREATE TABLE bieter (
  projekt_id TEXT NOT NULL REFERENCES projekt (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  reihenfolge INTEGER NOT NULL,
  PRIMARY KEY (projekt_id, id)
) STRICT;

CREATE TABLE leistungsverzeichnis (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  name TEXT NOT NULL,
  oz_maske TEXT NOT NULL,
  mwst_satz TEXT NOT NULL,
  nachlass_art TEXT CHECK (nachlass_art IN ('prozent', 'betrag')),
  nachlass_wert TEXT,
  CHECK ((nachlass_art IS NULL) = (nachlass_wert IS NULL))
) STRICT;
CREATE INDEX leistungsverzeichnis_projekt ON leistungsverzeichnis (projekt_id);

CREATE TABLE angebot (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  bieter_id TEXT NOT NULL,
  nachlass_art TEXT CHECK (nachlass_art IN ('prozent', 'betrag')),
  nachlass_wert TEXT,
  CHECK ((nachlass_art IS NULL) = (nachlass_wert IS NULL)),
  FOREIGN KEY (projekt_id, bieter_id) REFERENCES bieter (projekt_id, id)
) STRICT;
CREATE INDEX angebot_lv ON angebot (leistungsverzeichnis_id);

CREATE TABLE angebotsposition (
  angebot_id TEXT NOT NULL REFERENCES angebot (id) ON DELETE CASCADE,
  position_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('angeboten', 'nicht-angeboten')),
  einheitspreis TEXT,
  epa TEXT,
  PRIMARY KEY (angebot_id, position_id),
  CHECK (status = 'angeboten' OR (einheitspreis IS NULL AND epa IS NULL)),
  CHECK (status = 'nicht-angeboten' OR einheitspreis IS NOT NULL)
) STRICT;

CREATE TABLE auftrags_lv (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  angebot_id TEXT NOT NULL REFERENCES angebot (id),
  name TEXT NOT NULL,
  oz_maske TEXT NOT NULL,
  mwst_satz TEXT NOT NULL,
  nachlass_art TEXT CHECK (nachlass_art IN ('prozent', 'betrag')),
  nachlass_wert TEXT,
  CHECK ((nachlass_art IS NULL) = (nachlass_wert IS NULL))
) STRICT;

CREATE TABLE knoten (
  aggregat_id TEXT NOT NULL,
  id TEXT NOT NULL,
  art TEXT NOT NULL CHECK (art IN ('los', 'titel', 'position', 'hinweis')),
  eltern_id TEXT NOT NULL,
  reihenfolge INTEGER NOT NULL CHECK (reihenfolge >= 0),
  ordnungszahl TEXT,
  oz_index TEXT,
  kurztext TEXT,
  positionsart TEXT CHECK (positionsart IN ('normal', 'bedarf', 'wahl', 'zuschlag', 'stundenlohn')),
  pauschal INTEGER CHECK (pauschal IN (0, 1)),
  bedarf_mit_gesamtbetrag INTEGER CHECK (bedarf_mit_gesamtbetrag IN (0, 1)),
  bezugsposition_id TEXT,
  grundposition_id TEXT,
  text_json TEXT,
  menge TEXT,
  einheit TEXT,
  einheitspreis TEXT,
  epa TEXT,
  PRIMARY KEY (aggregat_id, id),
  CHECK (art NOT IN ('los', 'titel', 'position') OR kurztext IS NOT NULL),
  CHECK (art NOT IN ('hinweis', 'position') OR text_json IS NOT NULL),
  CHECK (art <> 'position' OR (positionsart IS NOT NULL AND pauschal IS NOT NULL
                               AND bedarf_mit_gesamtbetrag IS NOT NULL))
) STRICT;
CREATE INDEX knoten_eltern ON knoten (aggregat_id, eltern_id, reihenfolge);

CREATE TABLE summe_position (
  aggregat_id TEXT NOT NULL,
  position_id TEXT NOT NULL,
  gesamtpreis TEXT,
  geht_in_summe INTEGER NOT NULL CHECK (geht_in_summe IN (0, 1)),
  PRIMARY KEY (aggregat_id, position_id)
) STRICT;

CREATE TABLE summe_gliederung (
  aggregat_id TEXT NOT NULL,
  gliederung_id TEXT NOT NULL,
  summe TEXT NOT NULL,
  PRIMARY KEY (aggregat_id, gliederung_id)
) STRICT;

CREATE TABLE summe_gesamt (
  aggregat_id TEXT NOT NULL PRIMARY KEY,
  netto TEXT NOT NULL,
  nachlass TEXT NOT NULL,
  netto_nach_nachlass TEXT NOT NULL,
  mwst TEXT NOT NULL,
  brutto TEXT NOT NULL
) STRICT;

CREATE TABLE protokoll (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  aggregat_art TEXT NOT NULL CHECK (aggregat_art IN
    ('projekt', 'leistungsverzeichnis', 'angebot', 'auftrags-leistungsverzeichnis')),
  aggregat_id TEXT NOT NULL,
  wer TEXT NOT NULL,
  wann TEXT NOT NULL,
  befehl TEXT NOT NULL
) STRICT;
CREATE INDEX protokoll_projekt ON protokoll (projekt_id, seq);
`;

export const MIGRATIONEN: readonly Migration[] = [
  {
    version: 1,
    name: 'Grundschema',
    hoch: (db) => {
      db.skript(SCHEMA_V1);
    },
    datei: null,
  },
];

/** Aktuelle Schemaversion: die der letzten Migration. */
export const SCHEMA_VERSION: number = MIGRATIONEN[MIGRATIONEN.length - 1]?.version ?? 0;

export function aktuelleVersion(db: Datenbank): number {
  const zeile = db.zeilen('PRAGMA user_version')[0];
  const v = zeile?.['user_version'];
  return typeof v === 'number' ? v : 0;
}

/** Wendet alle noch fehlenden Migrationen an, jede in einer eigenen Transaktion. */
export function migriere(
  db: Datenbank,
  migrationen: readonly Migration[] = MIGRATIONEN,
): Ergebnis<number, Speicherfehler> {
  const ziel = migrationen[migrationen.length - 1]?.version ?? 0;
  const start = aktuelleVersion(db);
  if (start > ziel) {
    return fehler(
      'schema-zu-neu',
      `Die Datenbank hat Schemaversion ${String(start)}, diese Version kennt höchstens ${String(ziel)}.`,
    );
  }
  for (const m of migrationen) {
    if (m.version <= start) continue;
    try {
      db.ausfuehren('BEGIN IMMEDIATE');
      try {
        m.hoch(db);
        db.skript(`PRAGMA user_version = ${String(m.version)}`);
        db.ausfuehren('COMMIT');
      } catch (e) {
        try {
          db.ausfuehren('ROLLBACK');
        } catch {
          // Der Erstfehler bleibt maßgeblich.
        }
        throw e;
      }
    } catch (e) {
      const ursache = fehlerAusAusnahme(e);
      return fehler(
        'migration-fehlgeschlagen',
        `Migration ${String(m.version)} (${m.name}) fehlgeschlagen: ${ursache.meldung}`,
      );
    }
  }
  return ok(ziel);
}

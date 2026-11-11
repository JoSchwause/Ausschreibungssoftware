// SPDX-License-Identifier: AGPL-3.0-or-later
// Nummerierte Vorwärts-Migrationen (A8). Die Schemaversion steht in `PRAGMA user_version`, ändert sich
// atomar mit der Migration und ist zugleich die `schemaVersion` der JSON-Projektdatei.
//
// Regeln für eine neue Migration N+1:
//  1. Eintrag am Ende von `MIGRATIONEN` anfügen (lückenlos nummeriert). Bestehende Einträge nie ändern.
//  2. `hoch` verändert das Schema und überführt vorhandene Zeilen; kein Datenverlust (Q5).
//  3. `datei` hebt eine Projektdatei der Version N auf N+1 (reine Funktion über das geparste JSON).
//  4. Die eingefrorenen Dateien `packages/speicher/fixtures/projektdatei-v<N>.json` bleiben unverändert und werden
//     weiter geöffnet; für N+1 kommt eine weitere eingefrorene Datei dazu.
//  5. Das SQL steht hier (A5: Schema nur in dieser Datei), die Dateimigration ab Version 2 in `dateimigration<N>.ts`.

import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';
import { fehlerAusAusnahme } from './fehler';
import { fehler, ok } from './ergebnis';
import { dateiAuf2 } from './dateimigration2';
import { dateiAuf3 } from './dateimigration3';
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

// --- Version 2 (Ticket 38) ------------------------------------------------------------------------------------------
//
// Das Inhaltsmodell von `vertrag` v1.1b/v1.2 verlustfrei ablegen. Die Tabelle `knoten` verliert die Spalten der alten
// Positionsform (`positionsart`, `pauschal`, `bedarf_mit_gesamtbetrag`, `bezugsposition_id`, `grundposition_id`) und
// bekommt `merkmale`, `zuschlag` und `leitbeschreibung` als kanonisches JSON (Dezimalwerte darin als Zeichenketten,
// N1). SQLite kann Spalten, die in einer CHECK-Regel stehen, nicht löschen; die Tabelle wird deshalb neu angelegt und
// umkopiert (keine Fremdschlüssel zeigen auf sie). Die übrigen Tabellen bekommen nur Spalten dazu (`NULL` = fehlt bzw.
// nicht berechnet). Vorhandene Positionen werden überführt wie in `dateimigration2.ts` (Altform, nichts erfunden).

// Schlüssel in `json_object` alphabetisch: so ist das Ergebnis schon kanonisch (wie `kanonischKompakt`).
const MERKMALE_AUS_V1 = `CASE WHEN art = 'position' THEN json_object(
    'bedarf', CASE WHEN positionsart = 'bedarf'
                   THEN CASE WHEN bedarf_mit_gesamtbetrag = 1 THEN 'mit-gesamtbetrag' ELSE 'ohne-gesamtbetrag' END
              END,
    'pauschal', json(CASE WHEN pauschal = 1 THEN 'true' ELSE 'false' END),
    'stundenlohn', json(CASE WHEN positionsart = 'stundenlohn' THEN 'true' ELSE 'false' END),
    'wahl', CASE WHEN positionsart = 'wahl'
                 THEN json_object('grundpositionId', grundposition_id, 'gruppe', NULL, 'variante', NULL) END,
    'zuschlagskennzeichen', json('false')) END`;

const ZUSCHLAG_AUS_V1 = `CASE WHEN art = 'position' AND positionsart = 'zuschlag' THEN json_object(
    'bezug', json_object('art', 'positionen', 'positionen',
      CASE WHEN bezugsposition_id IS NULL THEN json_array()
           ELSE json_array(json_object('positionId', bezugsposition_id, 'teilmenge', NULL)) END),
    'prozentsatz', NULL) END`;

/** Schema von Version 1 auf 2. Läuft in der Transaktion von `migriere`. */
const SCHEMA_V2 = `
CREATE TABLE knoten_v2 (
  aggregat_id TEXT NOT NULL,
  id TEXT NOT NULL,
  art TEXT NOT NULL CHECK (art IN ('los', 'titel', 'position', 'hinweis')),
  eltern_id TEXT NOT NULL,
  reihenfolge INTEGER NOT NULL CHECK (reihenfolge >= 0),
  ordnungszahl TEXT,
  oz_index TEXT,
  kurztext TEXT,
  merkmale TEXT,
  zuschlag TEXT,
  leitbeschreibung TEXT,
  text_json TEXT,
  menge TEXT,
  einheit TEXT,
  einheitspreis TEXT,
  epa TEXT,
  PRIMARY KEY (aggregat_id, id),
  CHECK (art NOT IN ('los', 'titel', 'position') OR kurztext IS NOT NULL),
  CHECK (art NOT IN ('hinweis', 'position') OR text_json IS NOT NULL),
  CHECK ((art = 'position') = (merkmale IS NOT NULL)),
  CHECK (art = 'position' OR (zuschlag IS NULL AND leitbeschreibung IS NULL))
) STRICT;

INSERT INTO knoten_v2 (aggregat_id, id, art, eltern_id, reihenfolge, ordnungszahl, oz_index, kurztext, merkmale,
                       zuschlag, leitbeschreibung, text_json, menge, einheit, einheitspreis, epa)
SELECT aggregat_id, id, art, eltern_id, reihenfolge, ordnungszahl, oz_index, kurztext, ${MERKMALE_AUS_V1},
       ${ZUSCHLAG_AUS_V1}, NULL, text_json, menge, einheit, einheitspreis, epa
FROM knoten;

DROP TABLE knoten;
ALTER TABLE knoten_v2 RENAME TO knoten;
CREATE INDEX knoten_eltern ON knoten (aggregat_id, eltern_id, reihenfolge);

ALTER TABLE leistungsverzeichnis ADD COLUMN auftraggeber TEXT;
ALTER TABLE leistungsverzeichnis ADD COLUMN vergabeinformationen TEXT;
ALTER TABLE auftrags_lv ADD COLUMN auftraggeber TEXT;
ALTER TABLE auftrags_lv ADD COLUMN vergabeinformationen TEXT;

ALTER TABLE summe_gesamt ADD COLUMN summe_bedarf_ohne_gb TEXT;
ALTER TABLE summe_gesamt ADD COLUMN summe_wahl TEXT;
ALTER TABLE summe_gliederung ADD COLUMN summe_bedarf_ohne_gb TEXT;
ALTER TABLE summe_gliederung ADD COLUMN summe_wahl TEXT;

ALTER TABLE angebotsposition ADD COLUMN zuschlagssatz TEXT CHECK (zuschlagssatz IS NULL OR status = 'angeboten');
`;

// --- Version 3 (Ticket 43, S3) ---------------------------------------------------------------------------------------
//
// Papierkorb und LV-Stände (ADR 0006, `vertrag` v1.2). Beide hängen am LV (Fremdschlüssel): Ein LV mit Ständen lässt
// sich nicht löschen (D-12), sein Papierkorb geht beim Löschen im ChangeSet mit (`papierkorb.entfernt`).
//
// `papierkorb_eintrag`: ein Eintrag je Löschvorgang, `nummer` ist die Reihenfolge des Hineinlegens (D-12). Die Knoten
// stehen als kanonisches JSON im Eintrag (flach, Eltern vor Kindern, mit alter Lage), nicht in `knoten`: Der Baum, seine
// Prüfungen und Summen bleiben unberührt, und ein Eintrag wird nur als Ganzes hineingelegt, wiederhergestellt oder
// entfernt.
//
// `lv_stand`: eingefrorener `LvZustand` (samt Summen und Papierkorb) als kanonisches JSON, `angelegt` ist
// `Protokolleintrag.wann` des Befehls. `seq` hält die Reihenfolge des Anlegens (ältester zuerst).
const SCHEMA_V3 = `
CREATE TABLE papierkorb_eintrag (
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  id TEXT NOT NULL,
  nummer INTEGER NOT NULL CHECK (nummer >= 1),
  knoten TEXT NOT NULL,
  PRIMARY KEY (leistungsverzeichnis_id, id),
  UNIQUE (leistungsverzeichnis_id, nummer)
) STRICT;

CREATE TABLE lv_stand (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  name TEXT NOT NULL,
  angelegt TEXT NOT NULL,
  zustand TEXT NOT NULL
) STRICT;
CREATE INDEX lv_stand_lv ON lv_stand (leistungsverzeichnis_id, seq);
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
  {
    version: 2,
    name: 'Inhaltsmodell v1.1b/v1.2: Merkmale, Zuschlag, Leitbeschreibung, Kopfdaten, Ausweise, Zuschlagssatz',
    hoch: (db) => {
      db.skript(SCHEMA_V2);
    },
    datei: dateiAuf2,
  },
  {
    version: 3,
    name: 'Papierkorb und LV-Stände',
    hoch: (db) => {
      db.skript(SCHEMA_V3);
    },
    datei: dateiAuf3,
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

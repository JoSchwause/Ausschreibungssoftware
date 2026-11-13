// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: stellt aus einer Datenbank der Version 5 eine der Version 4 nach (Migrationstest 4 → 5). Die Spalten von
// Migration 5 dürfen dafür nur `NULL` enthalten und ihre Tabellen nur leer sein; sie werden entfernt, `protokoll` bekommt
// die CHECK-Regel der Version 1 zurück (Zeilen, `seq` und Zähler bleiben), die Version wird zurückgesetzt. Seit Version 6
// geht es zuerst auf Version 5 (`aufSchema5`, wie D-79.6).

import type { Datenbank } from '../sql';
import { aufSchema5 } from './schema5';

const anzahl = (db: Datenbank, sql: string): unknown => db.zeilen(sql)[0]?.['n'];

export function aufSchema4(db: Datenbank): void {
  aufSchema5(db);
  for (const [tabelle, spalte] of [
    ['leistungsverzeichnis', 'nachtrag'],
    ['leistungsverzeichnis', 'vorlage'],
    ['knoten', 'kostengruppe'],
    ['knoten', 'textquelle'],
  ] as const) {
    if (anzahl(db, `SELECT COUNT(*) AS n FROM ${tabelle} WHERE ${spalte} IS NOT NULL`) !== 0)
      throw new Error(`${tabelle}.${spalte} ist gesetzt; die Datenbank passt nicht zu Version 4.`);
    db.skript(`ALTER TABLE ${tabelle} DROP COLUMN ${spalte}`);
  }
  for (const tabelle of ['aufmass', 'rechnung', 'kostenermittlung']) {
    if (anzahl(db, `SELECT COUNT(*) AS n FROM ${tabelle}`) !== 0)
      throw new Error(`${tabelle} ist nicht leer; die Datenbank passt nicht zu Version 4.`);
    db.skript(`DROP TABLE ${tabelle}`);
  }
  db.skript(`
CREATE TABLE protokoll_v4 (
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
INSERT INTO protokoll_v4 SELECT seq, id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl FROM protokoll;
UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'protokoll')
  WHERE name = 'protokoll_v4';
DROP TABLE protokoll;
ALTER TABLE protokoll_v4 RENAME TO protokoll;
CREATE INDEX protokoll_projekt ON protokoll (projekt_id, seq);
PRAGMA user_version = 4;
`);
}

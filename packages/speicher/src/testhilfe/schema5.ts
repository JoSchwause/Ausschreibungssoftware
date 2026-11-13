// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: stellt aus einer Datenbank der Version 6 eine der Version 5 nach (Migrationstest 5 → 6). Die Spalte von
// Migration 6 darf dafür nur `NULL` enthalten und ihre Tabellen nur leer sein; sie werden entfernt, `protokoll` bekommt die
// CHECK-Regel der Version 5 zurück (Zeilen, `seq` und Zähler bleiben), die Version wird zurückgesetzt. Eine Datenbank, die
// schon Version 5 hat, bleibt, wie sie ist. Seit Version 7 geht es zuerst auf Version 6 (`aufSchema6`, wie D-79.6).

import type { Datenbank } from '../sql';
import { aufSchema6 } from './schema6';

const anzahl = (db: Datenbank, sql: string): unknown => db.zeilen(sql)[0]?.['n'];

export function aufSchema5(db: Datenbank): void {
  aufSchema6(db);
  if (db.zeilen('PRAGMA user_version')[0]?.['user_version'] !== 6) return;
  if (anzahl(db, 'SELECT COUNT(*) AS n FROM knoten WHERE bauteile IS NOT NULL') !== 0)
    throw new Error('knoten.bauteile ist gesetzt; die Datenbank passt nicht zu Version 5.');
  db.skript('ALTER TABLE knoten DROP COLUMN bauteile');
  // Abhängige Tabellen zuerst (Fremdschlüssel).
  for (const tabelle of [
    'mangel',
    'bautagebucheintrag',
    'honorarberechnung',
    'bauzeitenplan',
    'bauwerksmodell_inhalt',
    'bauwerksmodell',
    'modelldatei',
  ]) {
    if (anzahl(db, `SELECT COUNT(*) AS n FROM ${tabelle}`) !== 0)
      throw new Error(`${tabelle} ist nicht leer; die Datenbank passt nicht zu Version 5.`);
    db.skript(`DROP TABLE ${tabelle}`);
  }
  db.skript(`
CREATE TABLE protokoll_v5 (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  aggregat_art TEXT NOT NULL CHECK (aggregat_art IN
    ('projekt', 'leistungsverzeichnis', 'angebot', 'auftrags-leistungsverzeichnis', 'aufmass', 'rechnung',
     'kostenermittlung')),
  aggregat_id TEXT NOT NULL,
  wer TEXT NOT NULL,
  wann TEXT NOT NULL,
  befehl TEXT NOT NULL
) STRICT;
INSERT INTO protokoll_v5 SELECT seq, id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl FROM protokoll;
UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'protokoll')
  WHERE name = 'protokoll_v5';
DROP TABLE protokoll;
ALTER TABLE protokoll_v5 RENAME TO protokoll;
CREATE INDEX protokoll_projekt ON protokoll (projekt_id, seq);
PRAGMA user_version = 5;
`);
}

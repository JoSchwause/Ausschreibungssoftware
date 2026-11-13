// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: stellt aus einer Datenbank der Version 7 eine der Version 6 nach (Migrationstest 6 → 7). Die Spalten von
// Migration 7 dürfen dafür nur `NULL` enthalten und die Tabellen der Einstellungen nur leer sein; sie werden entfernt, die
// Version wird zurückgesetzt. Eine Datenbank, die schon Version 6 hat, bleibt, wie sie ist.

import type { Datenbank } from '../sql';

const anzahl = (db: Datenbank, sql: string): unknown => db.zeilen(sql)[0]?.['n'];

export function aufSchema6(db: Datenbank): void {
  if (db.zeilen('PRAGMA user_version')[0]?.['user_version'] !== 7) return;
  for (const [tabelle, spalte] of [
    ['projekt', 'angaben'],
    ['bieter', 'angaben'],
    ['leistungsverzeichnis', 'preisspiegel'],
    ['knoten', 'kalkulation'],
  ] as const) {
    if (anzahl(db, `SELECT COUNT(*) AS n FROM ${tabelle} WHERE ${spalte} IS NOT NULL`) !== 0)
      throw new Error(`${tabelle}.${spalte} ist gesetzt; die Datenbank passt nicht zu Version 6.`);
    db.skript(`ALTER TABLE ${tabelle} DROP COLUMN ${spalte}`);
  }
  for (const tabelle of ['einstellungen', 'einstellungen_protokoll']) {
    if (anzahl(db, `SELECT COUNT(*) AS n FROM ${tabelle}`) !== 0)
      throw new Error(`${tabelle} ist nicht leer; die Datenbank passt nicht zu Version 6.`);
    db.skript(`DROP TABLE ${tabelle}`);
  }
  db.skript('PRAGMA user_version = 6');
}

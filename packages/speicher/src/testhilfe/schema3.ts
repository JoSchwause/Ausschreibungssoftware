// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: stellt aus einer Datenbank der Version 4 eine der Version 3 nach (Migrationstest 3 → 4). Die Spalten
// von Migration 4 dürfen dafür nur `NULL` enthalten; sie werden entfernt und die Version zurückgesetzt.

import type { Datenbank } from '../sql';

export function aufSchema3(db: Datenbank): void {
  for (const [tabelle, spalte] of [
    ['leistungsverzeichnis', 'auftragnehmer'],
    ['leistungsverzeichnis', 'epa_bezeichnungen'],
    ['auftrags_lv', 'auftragnehmer'],
    ['auftrags_lv', 'epa_bezeichnungen'],
    ['knoten', 'mengenansatz'],
  ] as const) {
    const n = db.zeilen(`SELECT COUNT(*) AS n FROM ${tabelle} WHERE ${spalte} IS NOT NULL`)[0]?.['n'];
    if (n !== 0) throw new Error(`${tabelle}.${spalte} ist gesetzt; die Datenbank passt nicht zu Version 3.`);
    db.skript(`ALTER TABLE ${tabelle} DROP COLUMN ${spalte}`);
  }
  db.skript('PRAGMA user_version = 3');
}

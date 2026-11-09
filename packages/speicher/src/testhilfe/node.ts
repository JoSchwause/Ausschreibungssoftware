// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests unter Node: Kern auf einer In-Memory-Datenbank derselben SQLite-WASM-Bauart (`@sqlite.org/sqlite-wasm`,
// Node-Einstieg; ohne Persistenz). Dieselbe Logik läuft im Browser gegen OPFS (siehe `e2e/`).

import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';
import { oeffneInMemory } from '../backends';
import { SpeicherKern } from '../kern';
import type { Migration } from '../migrationen';
import type { Datenbank } from '../sql';
import type { Schritt } from './fixtures';

export async function neueDatenbank(): Promise<Datenbank> {
  return (await oeffneInMemory()).db;
}

export function kernAufDb(db: Datenbank, migrationen?: readonly Migration[]): SpeicherKern {
  const r = SpeicherKern.oeffnen(db, migrationen);
  if (!r.ok) throw new Error(`Kern konnte nicht geöffnet werden: ${r.fehler.meldung}`);
  return r.wert;
}

export async function neuerKern(): Promise<{ kern: SpeicherKern; db: Datenbank }> {
  const db = await neueDatenbank();
  return { kern: kernAufDb(db), db };
}

/** Erwartet einen Erfolg und liefert den Wert; sonst schlägt der Test mit der Fehlermeldung fehl. */
export function wert<T>(r: Ergebnis<T, Speicherfehler>): T {
  if (!r.ok) throw new Error(`Unerwarteter Fehler ${r.fehler.code}: ${r.fehler.meldung}`);
  return r.wert;
}

export function speichere(kern: SpeicherKern, schritte: readonly Schritt[]): void {
  for (const s of schritte) wert(kern.anwenden(s.eintrag, s.changeSet));
}

export function zaehle(db: Datenbank, tabelle: string): number {
  const v = db.zeilen(`SELECT COUNT(*) AS n FROM ${tabelle}`)[0]?.['n'];
  return typeof v === 'number' ? v : -1;
}

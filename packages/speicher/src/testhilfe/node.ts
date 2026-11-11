// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests unter Node: Kern auf einer In-Memory-Datenbank derselben SQLite-WASM-Bauart (`@sqlite.org/sqlite-wasm`,
// Node-Einstieg; ohne Persistenz). Dieselbe Logik läuft im Browser gegen OPFS (siehe `e2e/`).

import { createHash } from 'node:crypto';
import type { Ergebnis, Protokolleintrag, Pruefsumme, Speicherfehler } from '@tethys/vertrag';
import { oeffneInMemory } from '../backends';
import { kanonischesJson } from '../kanonisch';
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

export async function speichere(kern: SpeicherKern, schritte: readonly Schritt[]): Promise<void> {
  for (const s of schritte) wert(await kern.anwenden(s.eintrag, s.changeSet));
}

export function zaehle(db: Datenbank, tabelle: string): number {
  const v = db.zeilen(`SELECT COUNT(*) AS n FROM ${tabelle}`)[0]?.['n'];
  return typeof v === 'number' ? v : -1;
}

/** Kopie ohne das Feld `feld` (für den erwarteten Massenbefehlskopf). */
function ohne<T extends object>(o: T, feld: keyof T): never {
  const kopie = { ...o };
  Reflect.deleteProperty(kopie, feld);
  return kopie as never;
}

/**
 * Erwartete Form eines Eintrags im Protokoll (E-13), unabhängig von `kurzfassung.ts` gebildet (Node-`crypto`):
 * Massenbefehle als Kurzfassung mit SHA-256 über `kanonischesJson(befehl)`, alle anderen Befehle unverändert.
 */
export function imProtokoll(e: Protokolleintrag): Protokolleintrag {
  const b = e.befehl;
  const pruefsumme: Pruefsumme = {
    algorithmus: 'sha-256',
    wert: createHash('sha256').update(kanonischesJson(b), 'utf8').digest('hex'),
  };
  switch (b.art) {
    case 'LeistungsverzeichnisAnlegen':
      return {
        ...e,
        befehl: {
          art: 'Befehlskurzfassung',
          kopf: { art: b.art, id: b.id, projektId: b.projektId, inhalt: ohne(b.inhalt, 'knoten') },
          pruefsumme,
        },
      };
    case 'AngebotAnlegen':
      return {
        ...e,
        befehl: {
          art: 'Befehlskurzfassung',
          kopf: { art: b.art, angebot: ohne(b.angebot, 'positionen') },
          pruefsumme,
        },
      };
    case 'AuftragsLeistungsverzeichnisAnlegen':
      return {
        ...e,
        befehl: {
          art: 'Befehlskurzfassung',
          kopf: { art: b.art, auftragsLeistungsverzeichnis: ohne(b.auftragsLeistungsverzeichnis, 'knoten') },
          pruefsumme,
        },
      };
    case 'AufmassAnlegen':
      return {
        ...e,
        befehl: {
          art: 'Befehlskurzfassung',
          kopf: { art: b.art, aufmass: ohne(b.aufmass, 'positionen') },
          pruefsumme,
        },
      };
    default:
      return e;
  }
}

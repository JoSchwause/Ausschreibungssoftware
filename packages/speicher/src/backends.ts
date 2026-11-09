// SPDX-License-Identifier: AGPL-3.0-or-later
// Speicher-Backends hinter der schmalen `Datenbank`-Schnittstelle.
//
//  - `oeffneInMemory`: dieselbe SQLite-WASM-Bauart ohne Persistenz. Läuft in Node (Unit-Tests) und im Browser.
//  - `oeffneOpfs`: SQLite-WASM im Origin Private File System über den VFS „opfs-sahpool“. Nur in einem Worker.
//
// VFS-Wahl: `opfs-sahpool` braucht weder SharedArrayBuffer noch COOP/COEP-Header (anders als der VFS `opfs`
// mit Async-Proxy); er läuft damit auch auf GitHub Pages. Preis: Die Datenbank gehört exklusiv einer
// Verbindung (ein Tab/Worker je Ursprung), die Dateien liegen als Pool im OPFS und sind dort nicht als
// normale Dateien lesbar. Ein zweiter Tab bekommt den Fehlercode `gesperrt`.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { sqliteDatenbank, type Datenbank } from './sql';

export interface GeoeffneteDatenbank {
  readonly db: Datenbank;
  /** Gibt gehaltene Ressourcen frei (OPFS-Zugriffshandles), nachdem die Datenbank geschlossen wurde. */
  readonly freigeben: () => Promise<void>;
}

export async function oeffneInMemory(): Promise<GeoeffneteDatenbank> {
  const sqlite3 = await sqlite3InitModule();
  return { db: sqliteDatenbank(new sqlite3.oo1.DB(':memory:', 'c')), freigeben: () => Promise.resolve() };
}

/** Anzahl vorgehaltener Dateihandles im Pool: Datenbank, Journal und Hilfsdateien. */
const POOLGROESSE = 12;

/**
 * Öffnet (oder legt an) die Datenbank im OPFS. `name` trennt Datenbanken im selben Ursprung (Tests); die
 * Anwendung nutzt einen festen Namen. Wirft, wenn OPFS fehlt oder gesperrt ist; der Aufrufer macht daraus
 * einen Fehlerwert.
 */
export async function oeffneOpfs(name: string): Promise<GeoeffneteDatenbank> {
  const sqlite3 = await sqlite3InitModule();
  const pool = await sqlite3.installOpfsSAHPoolVfs({
    name: `tethys-${name}`,
    directory: `.tethys-${name}`,
    initialCapacity: POOLGROESSE,
  });
  const db = new pool.OpfsSAHPoolDb('/projekte.sqlite3');
  return {
    db: sqliteDatenbank(db),
    // `pauseVfs` gibt die Zugriffshandles frei und lässt die Daten stehen; `removeVfs` würde sie löschen.
    freigeben: () => {
      pool.pauseVfs();
      return Promise.resolve();
    },
  };
}

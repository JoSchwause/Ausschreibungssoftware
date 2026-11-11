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
 * Obergrenze der WAL-Datei nach einem Checkpoint: 1.000 Seiten zu 4 KiB, so viel wie der automatische Checkpoint
 * zulässt. Nur ein großer Befehl (GAEB-Import, Projektdatei) lässt sie darüber wachsen; danach wird sie gekürzt.
 */
const WAL_GRENZE_BYTES = 4 * 1024 * 1024;

/**
 * Schreibmodus der OPFS-Datenbank (Ticket 52): Write-Ahead-Log statt Rückroll-Journal, Sperrmodus exklusiv.
 *
 * Grund: Im OPFS kostet jeder Schreibzugriff des Zugriffshandles einzeln (im Prüfstand rund 1 ms). Das Rückroll-Journal
 * schreibt je geänderter Seite drei Teile ins Journal und die Seite beim COMMIT noch einmal in die Datenbank; das WAL
 * schreibt je Seite einen Rahmen (Kopf und Seite) und überträgt ihn erst beim Checkpoint. Eine Einzeländerung braucht so
 * etwa halb so viele Schreibzugriffe. Haltbarkeit unverändert: `synchronous` bleibt FULL, das WAL wird bei jedem COMMIT
 * auf den Datenträger gebracht, und nach einem Absturz stellt SQLite den Stand beim nächsten Öffnen aus dem WAL wieder
 * her (atomar wie bisher).
 *
 * Der exklusive Sperrmodus muss vor dem WAL gesetzt sein: Der VFS „opfs-sahpool“ hat keinen gemeinsamen Speicher für
 * den WAL-Index, mit exklusiver Sperre liegt er im Arbeitsspeicher. Die Datenbank gehört ohnehin genau einer Verbindung
 * (siehe oben). Eine Datenbank im alten Modus wird beim Öffnen umgestellt; die Projektdatei und das Schema bleiben gleich.
 * Lehnt SQLite das WAL ab, bleibt das Rückroll-Journal (langsamer, ebenso sicher); der Browser-Test prüft den Modus.
 */
function schreibmodusSetzen(db: { exec(sql: string): unknown }): void {
  db.exec('PRAGMA locking_mode = EXCLUSIVE');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`PRAGMA journal_size_limit = ${String(WAL_GRENZE_BYTES)}`);
}

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
    // Scheitert das Einrichten (meist `gesperrt`: der Worker der vorigen Seite hält die Dateien noch), löscht der VFS
    // sonst sein ganzes Verzeichnis (`removeVfs`). Gibt der alte Worker die Dateien gerade in diesem Moment frei, gehen
    // dabei Datenbank oder WAL verloren (Ticket 52, im Prüfstand nachgestellt). Mit dieser Option bleiben sie liegen.
    preserveOnInitFailure: true,
  });
  const db = new pool.OpfsSAHPoolDb('/projekte.sqlite3');
  try {
    schreibmodusSetzen(db);
  } catch (e) {
    db.close();
    pool.pauseVfs();
    throw e;
  }
  return {
    db: sqliteDatenbank(db),
    // `pauseVfs` gibt die Zugriffshandles frei und lässt die Daten stehen; `removeVfs` würde sie löschen.
    freigeben: () => {
      pool.pauseVfs();
      return Promise.resolve();
    },
  };
}

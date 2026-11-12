// SPDX-License-Identifier: AGPL-3.0-or-later
// Schmale, synchrone Datenbankschnittstelle. Alles darüber (Schema, Migrationen, Repositories) kennt nur sie;
// dahinter steht entweder SQLite-WASM im OPFS (Worker) oder eine In-Memory-Datenbank (Node-Tests).

import type { Database } from '@sqlite.org/sqlite-wasm';

/** Ein Wert einer Spalte; `Uint8Array` nur für BLOB-Spalten (Schema 6: die Bytes der Modelldateien). */
export type SqlWert = string | number | null | Uint8Array;
export type SqlZeile = Record<string, SqlWert>;

export interface Datenbank {
  /** Führt ein oder mehrere Anweisungen ohne Bindungen aus. */
  skript(sql: string): void;
  ausfuehren(sql: string, bind?: readonly SqlWert[]): void;
  zeilen(sql: string, bind?: readonly SqlWert[]): SqlZeile[];
  /** Eine vorbereitete Anweisung, einmal je Bindungsliste ausgeführt. */
  stapel(sql: string, bindungen: Iterable<readonly SqlWert[]>): void;
  schliessen(): void;
}

/** Hüllt ein SQLite-WASM-`Database` (In-Memory oder OPFS-SAH-Pool) in die schmale Schnittstelle. */
export function sqliteDatenbank(db: Database): Datenbank {
  return {
    skript: (sql) => {
      db.exec(sql);
    },
    ausfuehren: (sql, bind) => {
      if (bind === undefined) db.exec(sql);
      else db.exec({ sql, bind });
    },
    zeilen: (sql, bind) => db.selectObjects(sql, bind) as SqlZeile[],
    stapel: (sql, bindungen) => {
      const stmt = db.prepare(sql);
      try {
        for (const bind of bindungen) stmt.bind(bind).stepReset();
      } finally {
        stmt.finalize();
      }
    },
    schliessen: () => {
      db.close();
    },
  };
}

/** Führt `f` in einer Transaktion aus: bei jeder Ausnahme wird zurückgerollt und die Ausnahme weitergereicht. */
export function transaktion<T>(db: Datenbank, f: () => T): T {
  db.ausfuehren('BEGIN IMMEDIATE');
  let ergebnis: T;
  try {
    ergebnis = f();
    db.ausfuehren('COMMIT');
  } catch (e) {
    try {
      db.ausfuehren('ROLLBACK');
    } catch {
      // Zweitfehler beim Zurückrollen (z. B. Datenbank gesperrt): der Erstfehler bleibt maßgeblich.
    }
    throw e;
  }
  return ergebnis;
}

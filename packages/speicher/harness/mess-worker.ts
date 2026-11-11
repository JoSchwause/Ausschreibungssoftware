// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für den Prüfstand (Ticket 52): derselbe Speicher-Worker wie `src/worker.ts`, aber jede SQL-Anweisung wird
// gemessen. Die Antwort auf eine Anfrage trägt zusätzlich `messung` (Zeit im Worker und je Anweisung); der Client des
// Speichers liest nur `id` und `ergebnis` und übersieht das Feld. So lässt sich `anwenden` in Phasen zerlegen:
// Transaktion (BEGIN, COMMIT mit dem Schreiben ins OPFS), Prüfungen (Lesen des Vorherstands, Baumprüfung),
// Schreiben, übriges JavaScript im Worker (Vergleiche, Protokollform) und Worker-Antwort (Nachrichten hin und zurück).

import { oeffneOpfs } from '../src/backends';
import type { Datenbank } from '../src/sql';
import { betreibeWorker, type WorkerScope } from '../src/worker-host';

/**
 * Messung einer Anfrage: Zeit im Worker (Eingang bis Antwort), Summe je SQL-Anweisung (erste 60 Zeichen) und die
 * Dateizugriffe im OPFS (Zugriffshandle: Anzahl und Zeit je Methode; sie liegen innerhalb der Anweisungen).
 */
export interface Workermessung {
  readonly workerMs: number;
  readonly sql: Readonly<Record<string, number>>;
  readonly opfs: Readonly<Record<string, { readonly anzahl: number; readonly ms: number }>>;
}

let sql: Record<string, number> = {};
let opfs: Record<string, { anzahl: number; ms: number }> = {};
let eingang = 0;

// Die Zugriffshandles des VFS „opfs-sahpool“ (write, read, flush, truncate) zählen und messen.
const handle = (
  globalThis as unknown as { FileSystemSyncAccessHandle?: { prototype: Record<string, unknown> } }
).FileSystemSyncAccessHandle?.prototype;
for (const methode of ['write', 'read', 'flush', 'truncate', 'getSize'] as const) {
  const original = handle?.[methode];
  if (handle === undefined || typeof original !== 'function') continue;
  handle[methode] = function (this: unknown, ...args: unknown[]): unknown {
    const t0 = performance.now();
    try {
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    } finally {
      const e = (opfs[methode] ??= { anzahl: 0, ms: 0 });
      e.anzahl += 1;
      e.ms += performance.now() - t0;
    }
  };
}

function gemessen<T>(anweisung: string, f: () => T): T {
  const t0 = performance.now();
  try {
    return f();
  } finally {
    const k = anweisung.replace(/\s+/g, ' ').trim().slice(0, 60);
    sql[k] = (sql[k] ?? 0) + performance.now() - t0;
  }
}

function messend(db: Datenbank): Datenbank {
  return {
    skript: (s) => {
      gemessen(s, () => {
        db.skript(s);
      });
    },
    ausfuehren: (s, b) => {
      gemessen(s, () => {
        db.ausfuehren(s, b);
      });
    },
    zeilen: (s, b) => gemessen(s, () => db.zeilen(s, b)),
    stapel: (s, b) => {
      gemessen(s, () => {
        db.stapel(s, b);
      });
    },
    schliessen: () => {
      db.schliessen();
    },
  };
}

const scope: WorkerScope = {
  addEventListener: (art, f) => {
    self.addEventListener(art, (e) => {
      // Die Anfragen des Prüfstands kommen nacheinander (jede wartet auf ihre Antwort): Eingang = Beginn.
      sql = {};
      opfs = {};
      eingang = performance.now();
      f(e);
    });
  },
  postMessage: (antwort) => {
    const messung: Workermessung = { workerMs: performance.now() - eingang, sql, opfs };
    self.postMessage({ ...(antwort as object), messung });
  },
};

/** Schreibmodus der geöffneten Datenbank (Ticket 52); geht mit der Antwort auf `oeffnen` hinaus. */
export interface Schreibmodus {
  readonly journalMode: unknown;
  readonly lockingMode: unknown;
  readonly synchronous: unknown;
  readonly journalSizeLimit: unknown;
}

betreibeWorker(scope, async (optionen) => {
  const offen = await oeffneOpfs(optionen.datenbank);
  const wert = (pragma: string): unknown => Object.values(offen.db.zeilen(`PRAGMA ${pragma}`)[0] ?? {})[0];
  const modus: Schreibmodus = {
    journalMode: wert('journal_mode'),
    lockingMode: wert('locking_mode'),
    synchronous: wert('synchronous'),
    journalSizeLimit: wert('journal_size_limit'),
  };
  self.postMessage({ schreibmodus: modus });
  return { db: messend(offen.db), freigeben: offen.freigeben };
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Sicherungsordner über die File System Access API (nur Chromium, G-03). Die Schreiblogik arbeitet gegen die kleine
// Schnittstelle `OrdnerHandle`, damit sie sich mit einer Attrappe prüfen lässt; der Ordner-Handle selbst liegt in
// IndexedDB (ein Handle lässt sich dort, nicht in `localStorage`, ablegen).

/** Der Teil von `FileSystemDirectoryHandle`, den die App braucht. */
export interface OrdnerHandle {
  readonly kind: 'directory';
  readonly name: string;
  getFileHandle(
    name: string,
    optionen?: { create?: boolean },
  ): Promise<{
    createWritable(): Promise<{ write(daten: string): Promise<void>; close(): Promise<void> }>;
  }>;
  queryPermission(optionen: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(optionen: { mode: 'readwrite' }): Promise<PermissionState>;
}

/** Gibt es die Funktion in diesem Browser? Sonst zeigt die App nichts davon an (G-03). */
export function ordnerWahlUnterstuetzt(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
  );
}

/**
 * Schreibt `inhalt` als Datei `name` in den Ordner; eine vorhandene Datei gleichen Namens wird ersetzt (bei
 * `createWritable` erst mit `close`, ein abgebrochener Schreibvorgang lässt die alte Datei unberührt).
 */
export async function inOrdnerSchreiben(
  ordner: OrdnerHandle,
  name: string,
  inhalt: string,
): Promise<{ ok: true } | { ok: false; meldung: string }> {
  try {
    const datei = await ordner.getFileHandle(name, { create: true });
    const schreiber = await datei.createWritable();
    await schreiber.write(inhalt);
    await schreiber.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, meldung: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Hat die App Schreibrecht auf den Ordner? Nach einem Neustart des Browsers fehlt es oft. `anfragen` nur aus einer
 * Nutzeraktion (Klick auf „Jetzt sichern“): im Hintergrund wäre die Nachfrage unzulässig und stört.
 */
export async function berechtigungSichern(ordner: OrdnerHandle, anfragen: boolean): Promise<boolean> {
  try {
    if ((await ordner.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    if (!anfragen) return false;
    return (await ordner.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/** Der Nutzer wählt den Ordner. `null`: abgebrochen. */
export async function ordnerWaehlen(): Promise<OrdnerHandle | null> {
  try {
    const w = window as unknown as {
      showDirectoryPicker(o: { id: string; mode: 'readwrite' }): Promise<OrdnerHandle>;
    };
    return await w.showDirectoryPicker({ id: 'tethys-sicherung', mode: 'readwrite' });
  } catch {
    return null; // AbortError: nichts gewählt
  }
}

// --- Ablage des Handles in IndexedDB -------------------------------------------------------------------------------

const DB_NAME = 'tethys-sicherung';
const STORE = 'ordner';
const SCHLUESSEL = 'sicherungsordner';

function dbOeffnen(): Promise<IDBDatabase> {
  return new Promise((ok, fehler) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore(STORE);
    };
    r.onsuccess = () => {
      ok(r.result);
    };
    r.onerror = () => {
      fehler(r.error ?? new Error('IndexedDB nicht verfügbar'));
    };
  });
}

async function mitStore<T>(modus: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await dbOeffnen();
  try {
    return await new Promise<T>((ok, fehler) => {
      const anfrage = f(db.transaction(STORE, modus).objectStore(STORE));
      anfrage.onsuccess = () => {
        ok(anfrage.result);
      };
      anfrage.onerror = () => {
        fehler(anfrage.error ?? new Error('IndexedDB-Fehler'));
      };
    });
  } finally {
    db.close();
  }
}

export async function ordnerLaden(): Promise<OrdnerHandle | null> {
  try {
    return ((await mitStore('readonly', (s) => s.get(SCHLUESSEL))) as OrdnerHandle | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function ordnerMerken(ordner: OrdnerHandle): Promise<boolean> {
  try {
    await mitStore('readwrite', (s) => s.put(ordner, SCHLUESSEL));
    return true;
  } catch {
    return false;
  }
}

export async function ordnerVergessen(): Promise<void> {
  try {
    await mitStore('readwrite', (s) => s.delete(SCHLUESSEL));
  } catch {
    // nichts zu vergessen
  }
}

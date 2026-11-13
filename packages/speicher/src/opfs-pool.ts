// SPDX-License-Identifier: AGPL-3.0-or-later
// Stille Probe, ob die Dateien des OPFS-Pools frei sind (Ticket 139 Punkt 6, Befund aus Ticket 134).
//
// Ursache des Befunds: Beim Neuladen startet die neue Seite ihren Speicher-Worker, während der Worker der alten Seite die
// Zugriffshandles der Datenbankdateien noch hält. Die App schließt den Speicher bei `pagehide` (ohne warten zu können) und
// versucht das Öffnen bei `gesperrt` einige Male (`SpeicherAnbieter`). Den gescheiterten ersten Versuch meldet aber der VFS
// „opfs-sahpool“ von SQLite selbst in der Konsole (`createSyncAccessHandle … another open Access Handle`), bevor er den Fehler
// weitergibt. Darum prüft der Worker die Dateien vorher selbst, ohne Meldung: Hält sie noch jemand, ist das Öffnen `gesperrt`
// wie bisher (die App versucht es wieder), aber SQLite hat nichts versucht und nichts gemeldet.

/** Ein Zugriffshandle (Teil von `FileSystemSyncAccessHandle`). */
interface Zugriff {
  close(): void;
}

/** Was die Probe vom OPFS braucht (Teil von `FileSystemDirectoryHandle` und `FileSystemFileHandle`; in Tests nachgebildet). */
export interface Ordner {
  readonly kind: 'directory';
  getDirectoryHandle(name: string): Promise<Ordner>;
  values(): AsyncIterable<Ordner | { readonly kind: 'file'; createSyncAccessHandle(): Promise<Zugriff> }>;
}

/** Das Unterverzeichnis, in dem der VFS „opfs-sahpool“ die Dateien des Pools hält. */
const OPAK = '.opaque';

/** Fehler „Datei gehalten“: Name wie die Ausnahme des Browsers, damit `fehlerAusAusnahme` ihn `gesperrt` nennt. */
export class PoolGehalten extends Error {
  override readonly name = 'NoModificationAllowedError';
}

/** Liefert das Unterverzeichnis oder `null`, wenn es (noch) nicht da ist. */
async function unterordner(o: Ordner, name: string): Promise<Ordner | null> {
  try {
    return await o.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

/**
 * Öffnet jede Datei des Pools im Verzeichnis `verzeichnis` (Pfad unter der Wurzel des OPFS, wie `directory` beim Einrichten des
 * VFS) kurz mit einem Zugriffshandle und schließt es wieder. Hält ein anderer Worker eine davon, wirft sie `PoolGehalten`. Ein
 * Pool, den es noch nicht gibt, ist frei. Andere Fehler gibt sie weiter.
 */
export async function pruefePoolFrei(wurzel: Ordner, verzeichnis: string): Promise<void> {
  let o: Ordner | null = wurzel;
  for (const teil of [...verzeichnis.split('/').filter((t) => t !== ''), OPAK]) {
    o = await unterordner(o, teil);
    if (o === null) return;
  }
  for await (const eintrag of o.values()) {
    if (eintrag.kind !== 'file') continue;
    let zugriff: Zugriff;
    try {
      zugriff = await eintrag.createSyncAccessHandle();
    } catch (e) {
      // Eine `DOMException` des Browsers; ihr Name sagt, dass ein anderer Zugriff die Datei hält.
      if (
        typeof e === 'object' &&
        e !== null &&
        (e as { name?: unknown }).name === 'NoModificationAllowedError'
      )
        throw new PoolGehalten(
          'Die Datenbankdateien hält noch ein anderer Zugriff (anderer Tab oder vorige Seite).',
        );
      throw e;
    }
    zugriff.close();
  }
}

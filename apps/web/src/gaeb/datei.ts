// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateien am Rand der App (A1: nur über die Dateiauswahl des Browsers, kein Netz): lesen und herunterladen.

/** Gibt dem Browser einen Zug, damit eine Wartemeldung erscheint, bevor eine lange Rechnung den Thread belegt. */
export const naechsterZug = (): Promise<void> =>
  new Promise((fertig) => {
    setTimeout(fertig, 0);
  });

/**
 * Der Browser gibt die Bytes einer gewählten Datei nicht heraus (gelöscht, gesperrt, keine Berechtigung). Das ist der
 * erwartete Lesefehler, den die Seite als „nicht lesbar“ meldet; jeder andere Fehler beim Einlesen ist ein
 * Programmfehler und wird nicht geschluckt (Review S8, Q5).
 */
export class DateiNichtLesbar extends Error {
  constructor(
    readonly datei: string,
    options?: ErrorOptions,
  ) {
    super(`Die Datei ${datei} ließ sich nicht lesen.`, options);
    this.name = 'DateiNichtLesbar';
  }
}

/** Die Bytes der Datei; kann der Browser sie nicht lesen: `DateiNichtLesbar` mit der Ursache. */
export async function dateiBytes(f: File): Promise<Uint8Array> {
  let puffer: ArrayBuffer;
  try {
    puffer = await f.arrayBuffer();
  } catch (e) {
    throw new DateiNichtLesbar(f.name, { cause: e });
  }
  return new Uint8Array(puffer);
}

export function herunterladen(name: string, inhalt: string, typ: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

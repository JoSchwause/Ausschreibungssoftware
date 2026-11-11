// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateien am Rand der App (A1: nur über die Dateiauswahl des Browsers, kein Netz): lesen und herunterladen.

/** Gibt dem Browser einen Zug, damit eine Wartemeldung erscheint, bevor eine lange Rechnung den Thread belegt. */
export const naechsterZug = (): Promise<void> =>
  new Promise((fertig) => {
    setTimeout(fertig, 0);
  });

export async function dateiBytes(f: File): Promise<Uint8Array> {
  return new Uint8Array(await f.arrayBuffer());
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

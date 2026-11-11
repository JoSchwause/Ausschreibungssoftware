// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: Bytes als Datei herunterladen (A1: kein Netz). Das Gegenstück zu `gaeb/datei.ts` für Binärdateien.

export function herunterladenBytes(name: string, bytes: Uint8Array, typ: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: typ }));
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

// SPDX-License-Identifier: AGPL-3.0-or-later
// Schriftdaten, die ins PDF eingebettet werden. Die Bytes liefert der Aufrufer (Browser: fetch/Bündler, Node: Datei),
// damit dieses Modul weder Dateizugriff noch Netz braucht.

/** Noto Sans, Latin-Teilmenge, WOFF (OFL-1.1, siehe `schriften/README.md` und REUSE.toml). */
export interface Schriften {
  readonly normal: Uint8Array;
  readonly fett: Uint8Array;
}

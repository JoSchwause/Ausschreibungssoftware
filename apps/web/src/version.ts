// SPDX-License-Identifier: AGPL-3.0-or-later
// Version und Build-Stand: Vite setzt sie beim Bauen per `define` (vite.config.ts); in Tests und im Entwicklungsserver
// ohne Build gilt der Ersatzwert. Kein `Date.now()`: Das Datum ist das Datum des Commits. Den lesbaren Text baut
// `hilfe/stand.ts` (deutsches Datum, Wörter aus den Texten).

export interface BuildStand {
  /** Kurzer Commit-Hash oder „unbekannt“. */
  readonly commit: string;
  /** Datum des Commits (JJJJ-MM-TT) oder „unbekannt“. */
  readonly datum: string;
}

const ERSATZ: BuildStand = { commit: 'unbekannt', datum: 'unbekannt' };

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
export const APP_BUILD: BuildStand = typeof __APP_BUILD__ === 'object' ? __APP_BUILD__ : ERSATZ;

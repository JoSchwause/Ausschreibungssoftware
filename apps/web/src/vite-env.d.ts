// SPDX-License-Identifier: AGPL-3.0-or-later
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `1` nimmt die Katalogseite (/katalog) in einen Produktions-Build auf (nur für E2E-Tests). */
  readonly VITE_KATALOG?: string;
  /** `1` nimmt den Testpfad (`window.tethysTest`, `src/testpfad.ts`) in einen Build auf (nur für E2E-Tests). */
  readonly VITE_TESTPFAD?: string;
}

/** Version aus `package.json`, beim Bauen von Vite gesetzt (`define`, Ticket 134). */
declare const __APP_VERSION__: string;
/** Build-Stand (kurzer Commit-Hash, Commit-Datum), beim Bauen von Vite gesetzt. */
declare const __APP_BUILD__: { readonly commit: string; readonly datum: string };

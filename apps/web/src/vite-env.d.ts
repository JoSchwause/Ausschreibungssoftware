// SPDX-License-Identifier: AGPL-3.0-or-later
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `1` nimmt die Katalogseite (/katalog) in einen Produktions-Build auf (nur für E2E-Tests). */
  readonly VITE_KATALOG?: string;
  /** `1` nimmt den Testpfad (`window.tethysTest`, `src/testpfad.ts`) in einen Build auf (nur für E2E-Tests). */
  readonly VITE_TESTPFAD?: string;
}

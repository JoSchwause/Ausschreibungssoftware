// SPDX-License-Identifier: AGPL-3.0-or-later
// Vite-Konfiguration nur für den Browser-Prüfstand dieses Pakets (`harness/`). Absichtlich OHNE die Header
// COOP/COEP: Der VFS „opfs-sahpool“ braucht keine, und die Tests belegen das (`crossOriginIsolated === false`).

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'harness',
  build: { outDir: '../dist/harness', emptyOutDir: true },
  worker: { format: 'es' },
  // Der Vorab-Bündler zerlegt die WASM-Einbindung des Pakets; es bleibt unverändert.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
});

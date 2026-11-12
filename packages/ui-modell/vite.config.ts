// SPDX-License-Identifier: AGPL-3.0-or-later
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// Nur für die Browser-Testseite des Pakets (e2e/harness); das Paket selbst wird nicht gebündelt.
//
// Die Hausmodelle aus Ticket 99 liegen unter fixtures/ifc/. Die Paketgrenzen erlauben `ui-modell` keinen Import aus
// `fixtures/` außerhalb von Tests; dieses Plugin liefert die Dateien deshalb unter `modelle/<name>.ifc` aus
// (wie die Fixtures im Prüfstand von ui-grid). Fehlt eine Datei, fehlt nur ihr Fall.
const MODELLE = ['haus-v1', 'haus-v2'] as const;
const modellDatei = (name: string): string =>
  fileURLToPath(new URL(`../../fixtures/ifc/${name}.ifc`, import.meta.url));

function modelleBereitstellen(): Plugin {
  return {
    name: 'modelle-bereitstellen',
    generateBundle() {
      for (const name of MODELLE) {
        if (!existsSync(modellDatei(name))) continue;
        this.emitFile({
          type: 'asset',
          fileName: `modelle/${name}.ifc`,
          source: readFileSync(modellDatei(name)),
        });
      }
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL('./e2e/harness', import.meta.url)),
  base: './',
  plugins: [react(), modelleBereitstellen()],
  // Der Geometrie-Worker ist ein ES-Modul (wie der Speicher-Worker der App).
  worker: { format: 'es' },
  // Der Vorab-Bündler des Entwicklungsservers soll web-ifc nicht zerlegen (die WASM-Datei kommt über `?url`).
  optimizeDeps: { exclude: ['web-ifc'] },
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5185, strictPort: true },
  preview: { port: 4185, strictPort: true },
});

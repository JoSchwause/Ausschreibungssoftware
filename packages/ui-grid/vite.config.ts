import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// Nur für die Browser-Testseite des Pakets (e2e/harness); das Paket selbst wird nicht gebündelt.
//
// Die Testseite braucht die Fixtures (Ticket 19). Die Paketgrenzen (tools/boundaries.mjs) erlauben `ui-grid` keinen
// Import aus `fixtures/`, auch nicht in Tests. Deshalb liest dieses Plugin die Dateien vom Dateisystem und liefert
// sie unter `fixtures/<name>.json` aus (Entwicklungsserver) bzw. legt sie in den Build; die Seite holt sie per fetch.
const FIXTURES = ['typisch', 'gross'] as const;
const fixtureDatei = (name: string): string =>
  fileURLToPath(new URL(`../../fixtures/${name}.json`, import.meta.url));

function fixturesBereitstellen(): Plugin {
  return {
    name: 'fixtures-bereitstellen',
    configureServer(server) {
      server.middlewares.use((req, res, weiter) => {
        const name = FIXTURES.find((n) => req.url?.split('?')[0] === `/fixtures/${n}.json`);
        if (!name) {
          weiter();
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(readFileSync(fixtureDatei(name)));
      });
    },
    generateBundle() {
      for (const name of FIXTURES) {
        this.emitFile({
          type: 'asset',
          fileName: `fixtures/${name}.json`,
          source: readFileSync(fixtureDatei(name)),
        });
      }
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL('./e2e/harness', import.meta.url)),
  base: './',
  plugins: [react(), fixturesBereitstellen()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Vier Testseiten: das LV-Grid (index.html), das Vergleichsgrid (vergleich.html, Ticket 60), die Balkenspalte im
    // Vergleichsgrid (bauzeit.html, Ticket 96) und der Modellbaum mit 10.000 Zeilen (modellbaum.html, Ticket 122, D-54).
    rolldownOptions: {
      input: {
        index: fileURLToPath(new URL('./e2e/harness/index.html', import.meta.url)),
        vergleich: fileURLToPath(new URL('./e2e/harness/vergleich.html', import.meta.url)),
        bauzeit: fileURLToPath(new URL('./e2e/harness/bauzeit.html', import.meta.url)),
        modellbaum: fileURLToPath(new URL('./e2e/harness/modellbaum.html', import.meta.url)),
      },
    },
  },
  server: { port: 4180, strictPort: true },
  preview: { port: 4180, strictPort: true },
});

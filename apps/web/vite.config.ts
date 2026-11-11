import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Der Speicher läuft in einem Worker (SQLite-WASM im OPFS, `@tethys/speicher/worker`).
  worker: { format: 'es' },
  // Der Vorab-Bündler zerlegt die WASM-Einbindung des Pakets; es bleibt unverändert.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});

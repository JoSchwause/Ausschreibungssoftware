import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // Ticket 62

export default defineConfig({
  plugins: [
    react(),
    // Ticket 62: installierbar und offline (Manifest + Service Worker). Der Service Worker entsteht nur im Build
    // (`devOptions` bleibt aus), damit der Dev-Server und die Tests nicht von einem Zwischenspeicher gestört werden.
    // `prompt`: Ein neuer Stand wird nicht still mitten in der Arbeit aktiviert, die App fragt (`src/sicherung/pwa.ts`).
    // Basis-Pfad (G-53): Manifest, `start_url`, `scope` und die vorgehaltenen Adressen folgen `base`.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Tethys AVA',
        short_name: 'Tethys AVA',
        description: 'Ausschreibung, Vergabe und Abrechnung im Browser',
        lang: 'de',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#14532d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Alle Bündel: JS (auch der Speicher-Worker), CSS, WASM von SQLite, Schriften, Bilder.
        globPatterns: ['**/*.{js,css,html,wasm,svg,png,woff2,woff,webmanifest}'],
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // Der Speicher läuft in einem Worker (SQLite-WASM im OPFS, `@tethys/speicher/worker`).
  worker: { format: 'es' },
  // Der Vorab-Bündler zerlegt die WASM-Einbindung des Pakets; es bleibt unverändert.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});

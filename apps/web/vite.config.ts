import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // Ticket 62

// Ticket 114: Content-Security-Policy für den Build (D-100, Punkt „CSP“): WebAssembly von web-ifc und SQLite braucht
// `'wasm-unsafe-eval'` (kein `'unsafe-eval'`), Worker sind eigene Dateien des Bündels (kein `blob:`), die `.wasm`-Dateien kommen
// vom eigenen Ursprung (kein CDN, ADR 0001). Inline-Stile (`style`-Attribute von React und Radix) bleiben erlaubt. Nur im Build:
// Der Entwicklungsserver spritzt Inline-Skripte ein.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "connect-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function inhaltsrichtlinie(): Plugin {
  return {
    name: 'tethys-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  plugins: [
    react(),
    inhaltsrichtlinie(), // Ticket 114
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
        // Alle Bündel: JS (auch der Speicher-Worker), CSS, WASM von SQLite, Schriften, Bilder. Ticket 114: dazu der Worker der
        // Modellansicht (≈ 3,5 MB) und `web-ifc.wasm` (≈ 1,6 MB), beide unter der Grenze von 16 MB.
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
  // Ticket 114: ebenso web-ifc (die WASM-Datei kommt über `?url` aus dem Bündel, D-100.8).
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm', 'web-ifc'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});

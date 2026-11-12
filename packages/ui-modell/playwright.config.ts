// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, devices } from '@playwright/test';

// Lokal ohne `playwright install`: PW_CHROMIUM_PATH zeigt auf ein vorhandenes Chromium.
// In der CI bleibt die Variable leer, dort installiert der Workflow die Browser.
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
// Anderer Port für parallele Läufe auf einer Maschine (mehrere Worktrees).
const port = process.env['PW_MODELL_PORT'] || '4185';

// WebGL 2 in Headless-Chromium ohne GPU: ANGLE auf SwiftShader (Software-Vulkan). Seit Chromium 137 nimmt Chromium
// SwiftShader für WebGL nur noch mit `--enable-unsafe-swiftshader` (Playwright 1.65 setzt den Schalter schon selbst; er
// steht hier ausdrücklich, damit der Lauf nicht an dieser Voreinstellung hängt). `--use-angle=swiftshader` nimmt
// SwiftShader auch auf Maschinen mit GPU, damit die Messungen vergleichbar bleiben (D-54).
const WEBGL_SCHALTER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  forbidOnly: !!process.env['CI'],
  // Die Leistungsmessung braucht eine ruhige Maschine: nacheinander, nicht parallel.
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    launchOptions: { args: WEBGL_SCHALTER, ...(executablePath ? { executablePath } : {}) },
  },
  webServer: {
    // Produktions-Build der Testseite (gebündelter Worker samt WASM-Datei wie in der App).
    command: `pnpm exec vite build && pnpm exec vite preview --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

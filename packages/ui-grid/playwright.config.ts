import { defineConfig, devices } from '@playwright/test';

// Lokal ohne `playwright install`: PW_CHROMIUM_PATH zeigt auf ein vorhandenes Chromium.
// In der CI bleibt die Variable leer, dort installiert der Workflow die Browser.
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  forbidOnly: !!process.env['CI'],
  // Die Leistungsmessung braucht eine ruhige Maschine: nacheinander, nicht parallel.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4180',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    // Produktions-Build der Testseite: Die Messung der Bildrate darf nicht im Entwicklungsmodus von React laufen.
    command: 'pnpm exec vite build && pnpm exec vite preview',
    url: 'http://localhost:4180',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

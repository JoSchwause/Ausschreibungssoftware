import { defineConfig, devices } from '@playwright/test';

// Lokal ohne `playwright install`: PW_CHROMIUM_PATH zeigt auf ein vorhandenes Chromium.
// In der CI bleibt die Variable leer, dort installiert der Workflow die Browser.
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
// Anderer Port für parallele Läufe auf einer Maschine (mehrere Worktrees, Ticket 122); Standard wie bisher 4180.
const port = process.env['PW_GRID_PORT'] || '4180';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  forbidOnly: !!process.env['CI'],
  // Die Leistungsmessung braucht eine ruhige Maschine: nacheinander, nicht parallel.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    // Produktions-Build der Testseite: Die Messung der Bildrate darf nicht im Entwicklungsmodus von React laufen.
    command: `pnpm exec vite build && pnpm exec vite preview --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

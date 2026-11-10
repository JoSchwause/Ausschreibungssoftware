import { defineConfig, devices } from '@playwright/test';

// Lokal ohne `playwright install`: PW_CHROMIUM_PATH zeigt auf ein vorhandenes Chromium.
// In der CI bleibt die Variable leer, dort installiert der Workflow die Browser.
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
// Anderer Port für parallele Läufe auf einer Maschine (mehrere Worktrees); Standard wie `vite preview`.
const port = process.env['PW_WEB_PORT'] || '4173';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env['CI'],
  reporter: 'list',
  // Eine OPFS-Datenbank gehört je Browser-Kontext genau einer Verbindung; die Tests sind unabhängig, die
  // Leistungsmessung soll aber nicht mit anderen Tests um die Maschine konkurrieren.
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    // VITE_KATALOG=1 nimmt die Katalogseite (/katalog) in den Test-Build auf, VITE_TESTPFAD=1 den Testpfad
    // (`src/testpfad.ts`); `pnpm build` ohne die Variablen lässt beides weg.
    command: `VITE_KATALOG=1 VITE_TESTPFAD=1 pnpm build && pnpm preview --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

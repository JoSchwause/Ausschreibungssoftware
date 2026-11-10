import { defineConfig, devices } from '@playwright/test';

// Lokal ohne `playwright install`: PW_CHROMIUM_PATH zeigt auf ein vorhandenes Chromium.
// In der CI bleibt die Variable leer, dort installiert der Workflow die Browser.
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env['CI'],
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    // VITE_KATALOG=1 nimmt die Katalogseite (/katalog) in den Test-Build auf; `pnpm build` ohne die Variable lässt sie weg.
    command: 'VITE_KATALOG=1 pnpm build && pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

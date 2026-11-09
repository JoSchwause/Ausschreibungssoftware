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
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

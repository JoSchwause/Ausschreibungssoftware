// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, devices } from '@playwright/test';

// Lokal ohne `playwright install`: PW_CHROMIUM_PATH zeigt auf ein vorhandenes Chromium.
// In der CI bleibt die Variable leer, dort installiert der Workflow die Browser.
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env['CI'],
  // Eine OPFS-Datenbank gehört je Browser-Kontext genau einer Verbindung; die Tests laufen nacheinander.
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4174',
    ...devices['Desktop Chrome'],
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: 'pnpm exec vite build && pnpm exec vite preview',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});

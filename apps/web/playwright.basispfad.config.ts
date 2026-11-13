import { defineConfig, devices } from '@playwright/test';

// Ticket 134 (G-53): Probe des Builds mit Basis-Pfad, wie ihn GitHub Pages ausliefert (`/<repo>/`). Eigener Port und eigenes
// Ausgabeverzeichnis, damit der Standard-Build der übrigen E2E-Tests unberührt bleibt. Aufruf: `pnpm probe:basispfad`.
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
const port = process.env['PW_BASIS_PORT'] || '4174';

export default defineConfig({
  testDir: './e2e-basispfad',
  forbidOnly: !!process.env['CI'],
  reporter: 'list',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: `VITE_OUTDIR=dist/basispfad VITE_BASE=/tethys-probe/ pnpm exec vite build && VITE_OUTDIR=dist/basispfad VITE_BASE=/tethys-probe/ pnpm exec vite preview --port ${port}`,
    url: `http://localhost:${port}/tethys-probe/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

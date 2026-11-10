// SPDX-License-Identifier: AGPL-3.0-or-later
// Eigene Konfiguration für die Messung (nicht Teil von `pnpm test`): `pnpm --dir packages/ausgabe messen`.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['messung/**/*.spec.ts'], testTimeout: 600_000 },
  root: fileURLToPath(new URL('..', import.meta.url)),
});

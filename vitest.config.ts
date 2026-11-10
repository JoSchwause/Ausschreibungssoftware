import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/**/*.test.mjs', 'packages/*/src/**/*.test.ts', 'apps/web/src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    passWithNoTests: true,
    testTimeout: 60_000,
  },
});

# Tethys AVA

Freie Software für Ausschreibung, Vergabe und Abrechnung (AVA) im Bauwesen: eine lokale Einzelnutzer-PWA
(React, Vite, TypeScript), Lizenz AGPL-3.0-or-later. Arbeitsname, Stand: Aufbau.

## Befehle

Voraussetzung: Node 22 und pnpm 10. Mit `pnpm install` starten, dann:

- `pnpm dev` startet die App, `pnpm build` baut sie.
- `pnpm lint` (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean-Room), `pnpm typecheck`, `pnpm test` (Vitest) und
  `pnpm e2e` (Playwright, baut die App selbst) sind in der CI Pflicht.
- Playwright-Browser einmalig mit `pnpm --filter @tethys/web exec playwright install chromium` holen; oder
  `PW_CHROMIUM_PATH` auf ein vorhandenes Chromium setzen.

## Paketregeln

Abhängigkeiten laufen nur in eine Richtung: `vertrag` ← `dezimal`/`kern` ← Fachpakete (`speicher`, `gaeb`, …) ←
`apps/web`; Fachpakete importieren einander nie, `ui-basis` kennt keine Fachlogik. Die erlaubten Importe je Paket
stehen in `tools/boundaries.mjs` und werden von `pnpm lint` geprüft; ein neues Paket muss dort eingetragen werden.
Verbindliche Regeln: `docs/regeln.md`, Arbeitsplan: `.scratch/ava-oss/plan.md`, Mitarbeit: `CONTRIBUTING.md`.

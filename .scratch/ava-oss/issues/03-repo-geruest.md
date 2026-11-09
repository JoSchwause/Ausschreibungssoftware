# 03: Repo-Gerüst, Tooling und CI (F1)

Status: ready-for-agent
Type: task
Welle: 0 · Strang: F · Paket: Repo-Wurzel, `.github/`, Konfiguration
Blocked by: -
Regeln: A3, C1, C2, C5, Q2, P2, P3

## What to build

pnpm-Monorepo nach Zielstruktur aus `plan.md` §1, aber nur als **leere Pakete mit Eintrittspunkt**:
`packages/vertrag`, `dezimal`, `kern`, `speicher`, `gaeb`, `ui-grid`, `ui-basis`, `apps/web`, `fixtures/`.
TypeScript streng, Vitest, Playwright, ESLint, Prettier, GitHub Actions. Die CI erzwingt von Anfang an:

1. **Paketgrenzen (A3):** `vertrag` ← `kern` ← Fachpakete ← `apps/web`; Fachpakete importieren einander nie.
2. **Lizenzprüfung (C5):** Jede Abhängigkeit AGPL-3.0-or-later-kompatibel; REUSE-Lint (ADR 0008) mit DCO-Prüfung.
3. **Clean-Room-Prüfung (C2):** CI schlägt fehl, wenn etwas unter `docs/research/nova-ava/` oder `okf/research/`
   versioniert ist.
4. **Lint-Regel gegen `number` für Geld (N1)** als Platzhalter, sobald `dezimal` existiert (hier nur Regel anlegen).
5. Leere Startseite der PWA, die `pnpm dev` startet. Kein XSD-Schritt (kommt mit G2).

## Acceptance criteria

- [ ] `pnpm lint`, `pnpm test`, `pnpm e2e` laufen lokal und in der CI (lokal verifiziert, CI nicht beobachtbar)
- [ ] CI grün auf einem Pull Request; ein absichtlich verbotener Import zwischen zwei Fachpaketen lässt sie rot werden (Test dafür)
- [x] Eine nicht lizenzkonforme Testabhängigkeit und eine versionierte Datei unter `okf/research/` lassen die CI rot werden (je ein Negativtest)
- [x] `LICENSE` (AGPL-3.0-or-later), `REUSE.toml`, `CONTRIBUTING` mit DCO-Hinweis vorhanden
- [x] `apps/web` startet mit leerer Startseite; PWA-Manifest vorhanden
- [x] `README` nennt die Befehle und die Paketregeln in drei Sätzen

## Nicht-Ziele

Fachcode, Speicher, GAEB, Oberfläche über die leere Seite hinaus, Hosting auf GitHub Pages (kommt mit S4).

## Comments

Verifiziert (lokal, Node 22.23, pnpm 10.28): `pnpm install`, `pnpm lint` (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean-Room), `pnpm typecheck`, `pnpm test` (4 Dateien, 35 Tests), `pnpm e2e` (1 Test, Chromium über `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`), `reuse lint` (reuse 6.3.0, konform), `pnpm dev` liefert die Startseite auf Port 5173.

Werkzeuge: dependency-cruiser (MIT) für Paketgrenzen, Tabelle in `tools/boundaries.mjs`, enthält auch noch nicht angelegte Fachpakete und prüft, dass jedes Paket dort registriert ist. Lizenzprüfung: eigenes `tools/licenses.mjs` über `pnpm licenses list --json` mit SPDX-Allowlist. Clean-Room und DCO: `tools/clean-room.mjs` (git ls-files bzw. git log). N1-Platzhalter: eigene ESLint-Regel `tethys/keine-number-fuer-geld` (`tools/eslint-regeln.mjs`), schlägt bei `number`-typisierten Geld-Bezeichnern an (Namensheuristik, außer in `dezimal` und Tests).

Negativtests (echte automatisierte Tests gegen temporäre Setups, laufen in `pnpm test`): verbotener Import zwischen Fachpaketen per Paketname und relativ, kern->speicher, ui-grid->kern, ui-basis->vertrag, nicht registriertes Paket, Fixtures in Produktivcode (`tools/boundaries.test.mjs`); Abhängigkeit mit `GPL-2.0-only`/`UNLICENSED` in einem temporären pnpm-Projekt (`tools/licenses.test.mjs`); mit `git add -f` versionierte Datei unter `okf/research/` und `docs/research/nova-ava/` sowie unsignierter Commit (`tools/clean-room.test.mjs`). Dass diese Prüfungen die CI rot färben, folgt daraus, dass `pnpm lint` und `pnpm test` im Workflow laufen; nicht auf GitHub beobachtet.

Nicht verifiziert: CI grün auf einem Pull Request (GitHub nicht erreichbar). Der Workflow `.github/workflows/ci.yml` spiegelt die lokal gelaufenen Befehle (install, lint, typecheck, test, e2e, `reuse lint`) und ergänzt die DCO-Prüfung nur bei Pull Requests (lokal nur gegen temporäres Repo und gegen `f04bc7e..HEAD` geprüft); die Playwright-Browser-Installation (`playwright install --with-deps chromium`) wurde lokal bewusst nicht ausgeführt.

Abweichungen: Der DCO-Check ist nicht Teil von `pnpm lint`, sondern ein eigener CI-Schritt. REUSE-Ausnahmen je Pfad: markierter Abschnitt am Ende von `REUSE.toml`; der Mechanismus (`precedence = "override"` unter `fixtures/extern/**`) wurde lokal probiert, braucht aber den Lizenztext unter `LICENSES/`. README hat je Abschnitt mehr als drei Sätze. Prettier ignoriert `docs`, `okf`, `.scratch`, `fixtures`, `.claude`, `GLOSSARY.md`, `AGENTS.md`. Versionen sind neuer als erwartet (eslint 10, vite 8, vitest 5, TypeScript 5.9 bewusst nicht 7). `LICENSE` und `LICENSES/AGPL-3.0-or-later.txt` sind identisch (REUSE bzw. Konvention).

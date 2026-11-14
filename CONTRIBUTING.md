# Mitarbeit

Das Repository steht unter AGPL-3.0-or-later (ADR 0008). Vor jeder Arbeit `docs/regeln.md` lesen.
Der MVP ist erreicht (Tore M1 bis M4 und die Erweiterungen); Beiträge von außen laufen seitdem über Pull Requests mit
DCO (G-43). Der Tracker bleibt bis auf Weiteres lokal (`.scratch/`, kein Remote). Vor einer öffentlichen Ankündigung
steht noch die rechtliche Prüfung der Recherche aus (G-42, G-44).

## Developer Certificate of Origin (DCO)

Jeder Commit trägt eine `Signed-off-by`-Zeile. Damit bestätigst du das
[Developer Certificate of Origin 1.1](https://developercertificate.org/): Du hast das Recht, den Beitrag unter
der Projektlizenz einzureichen. Commit mit `git commit -s`. Die CI prüft bei jedem Pull Request, ob alle Commits
signiert sind (`node tools/check-dco.mjs <Bereich>`).

Ausgenommen sind Pull Requests der Betreuer:innen: Das DCO gilt für Beiträge von außen (E-17, Regel P8). Wer dazu
gehört, steht in `.github/dco-betreuer.txt` (GitHub-Logins). Maßgeblich ist der Autor des Pull Requests, nicht die
Commit-Metadaten.

## Pakete und Schreibrechte

Das Repository ist ein pnpm-Monorepo: `apps/web` (die App) und `packages/*` (`vertrag`, `dezimal`, `kern`, die Fachpakete
`speicher`, `gaeb`, `vergabe`, `abrechnung`, `ausgabe`, `kosten`, `mengen`, `erechnung`, `ifc`, `bim`, `bauzeit`,
`honorar`, `bauleitung` sowie `ui-basis`, `ui-grid`, `ui-modell`). Abhängigkeiten laufen nur in eine Richtung
(`vertrag` ← `kern` ← Fachpakete ← `apps/web`, Regel A3); die erlaubten Importe stehen in `tools/boundaries.mjs`, `pnpm lint`
prüft sie. Ein Ticket nennt sein Paket, und ein Paket hat je Ticket einen Schreiber (P2). Änderungen an `vertrag`
sind ein eigenes Ticket (A4, P9). Ein neuer Fachbegriff kommt zuerst ins `GLOSSARY.md` (L2).

## Befehle

Voraussetzung: Node 22 und pnpm 10, dann `pnpm install --frozen-lockfile`.

- `pnpm dev` startet die App, `pnpm build` baut sie (`VITE_BASE=/<repo>/` für einen Unterpfad).
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`: ESLint, Prettier, Paketgrenzen, Lizenzen, Clean-Room. Das typgestützte
  ESLint braucht etwa 5 GB Heap.
- `pnpm typecheck`, `pnpm test` (Vitest und Fixture-Tests), `pnpm e2e` (Playwright, baut die App selbst).
- `pnpm --filter @tethys/web run probe:basispfad`: Build mit Basis-Pfad laden.
- Einzelne Prüfung: `pnpm vitest run <Datei>`; einzelne E2E-Datei:
  `CI=1 PW_CHROMIUM_PATH=<Chromium> pnpm --filter @tethys/web exec playwright test e2e/<Datei> --trace off`.
- Leistungsbudgets sind Tests (Q4) und werden nie gelockert; schlägt einer nur unter Last fehl, wird das vermerkt.

## Lizenzen (REUSE)

Jede Datei ist durch `REUSE.toml` als AGPL-3.0-or-later gekennzeichnet; `reuse lint` muss grün sein. Dateien
Dritter bekommen einen eigenen Eintrag im dafür markierten Abschnitt von `REUSE.toml` und ihren Lizenztext unter
`LICENSES/` (Regel C4). Jede neue Abhängigkeit braucht eine AGPL-kompatible Lizenz; `pnpm lint` prüft das (C5).

## Clean Room

Kein fremder Code, keine fremden UI-Assets, keine lizenzierten Texte im Repository. `docs/research/nova-ava/`
und `okf/research/` bleiben git-ignoriert; die CI schlägt fehl, wenn dort etwas versioniert ist (C2).

## Vor dem Push

`pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` müssen grün sein. Veröffentlicht wird `main` automatisch auf
GitHub Pages (`.github/workflows/pages.yml`).

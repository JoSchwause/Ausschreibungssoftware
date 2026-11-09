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

- [ ] `pnpm lint`, `pnpm test`, `pnpm e2e` laufen lokal und in der CI
- [ ] CI grün auf einem Pull Request; ein absichtlich verbotener Import zwischen zwei Fachpaketen lässt sie rot werden (Test dafür)
- [ ] Eine nicht lizenzkonforme Testabhängigkeit und eine versionierte Datei unter `okf/research/` lassen die CI rot werden (je ein Negativtest)
- [ ] `LICENSE` (AGPL-3.0-or-later), `REUSE.toml`, `CONTRIBUTING` mit DCO-Hinweis vorhanden
- [ ] `apps/web` startet mit leerer Startseite; PWA-Manifest vorhanden
- [ ] `README` nennt die Befehle und die Paketregeln in drei Sätzen

## Nicht-Ziele

Fachcode, Speicher, GAEB, Oberfläche über die leere Seite hinaus, Hosting auf GitHub Pages (kommt mit S4).

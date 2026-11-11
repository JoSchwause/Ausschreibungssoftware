# Schnitt des Laufs „Welle 4“

Stand 2026-11-11, Orchestrator (`/implement-welle 4`). Integrationsbranch `integration/welle-4` (lokal) ab `main` bei
`491389c` (Welle 3 gemergt, PR #9). Entscheidungen: `entscheidungen-auto.md` ab D-20. Ein Schreiber je Paket (P2);
in `apps/web` je Ordner `src/<strang>/` (D-20).

Welle 4 (`plan.md` §3): V3+V4 · O1+O2 · M2 · S4 · C1, dazu die Folgetickets 51–54 aus Welle 3.
Tor **M3** (`plan.md` §4): E2E importiert zwei X84-Angebote, Preisspiegel-Summen stimmen mit den Sollwerten, der
Zuschlag erzeugt das Auftrags-LV.

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Stufe | Modell |
|---|---|---|---|---|---|---|
| 51 | F | Fixtures `typisch`, `gross`, `typisch-angebote` auf GAEB-Zuschlagsform | `fixtures/` + Fixture-Testcode (Ausnahme) | – | 1 | opus |
| 52 | S | Einzeländerung bei 5.000 Positionen < 100 ms | `packages/speicher` | – | 1 | opus |
| 53 | F | `vertrag` v1.3 (+ Punkte 9–10, D-22) | `packages/vertrag` + markierte mechanische Zeilen | – | 1 | opus |
| 54a | U | `ui-grid`: aktive Zeile, Zeile öffnen, schreibgeschützt, Löschzahl | `packages/ui-grid` | – | 1 | opus |
| 54b | U | `ui-basis`: Tabelle einfügen, Dialog-Anfangsfokus | `packages/ui-basis` | – | 1 | sonnet |
| 55 | C1 | Kostengliederung (nur Nummern) und Kostenermittlung | `packages/kosten` (neu) | – | 1 | opus |
| 58 | O1 | LV-Druck als PDF vervollständigen (ADR 0012) | `packages/ausgabe` | – | 1 | sonnet |
| 62 | S4 | PWA (Installation, offline) und Datensicherung (Erinnerung, Sicherungsordner) | `apps/web/src/sicherung/`, Vite-Konfiguration | – | 1 | sonnet |
| 69 | F | X84-Dateien der Angebote zu `typisch` | `fixtures/` | 51 | 2 | opus |
| 56 | K | Kern v1.3: Mengenansatz, Einfügen hinter einer Gliederung, leere Langtext-Strukturen | `packages/kern` | 53, 51 | 2 | opus |
| 57 | S | Speicher v1.3: Migration 4, LV-Übersicht | `packages/speicher` | 53, 52 | 2 | opus |
| 59 | V4 | Zuschlag → Auftrags-LV (Rechnung) | `packages/vergabe` | 53, 51 | 2 | opus |
| 60 | U2 | `ui-grid`: Vergleichsgrid (schreibgeschützt, freie Spalten) für den Preisspiegel | `packages/ui-grid` | 54a | 2 | opus |
| 61 | O2 | Excel-Export und -Import (LV für Bieter, Rücklauf als Angebot) | `packages/ausgabe` | 58 | 2 | opus |
| 68 | G | `gaeb` v1.3: Auftragnehmer in X86, EPA-Bezeichnungen, Import der X84 aus 69 | `packages/gaeb` | 53, 51, 57, 69 | 3 | opus |
| 63 | V3 | Preisspiegel-Ansicht in der App | `apps/web/src/vergabe/` | 60, 51 | 3 | opus |
| 64 | V4 | Zuschlag und Auftrags-LV in der App, **E2E Tor M3** | `apps/web/src/vergabe/`, `src/auftrag/` | 63, 59, 57, 69 | 4 | opus |
| 65 | M2 | Mengenermittlungs-Panel | `apps/web/src/mengen/` | 56, 57 | 3 | sonnet |
| 66 | O1/O2 | Drucken und Excel-Rundlauf in der App | `apps/web/src/ausgabe/` | 58, 61 | 3 | sonnet |
| 67 | U | Umwege aus Welle 3 in der App zurückbauen | `apps/web/src/lv/` | 54a, 54b | 3 | sonnet |

## Gemeinsame Regeln für Umsetzer (Kurzfassung, verbindlich bleibt `docs/regeln.md`)

- Lies zuerst `docs/regeln.md`, `GLOSSARY.md`, dein Ticket in `.scratch/ava-oss/issues/` und die dort genannten
  Tickets. **Nie** `okf/research/` lesen (C3).
- Arbeite nur in deinem Paket bzw. Ordner (P2). Brauchst du eine Änderung woanders (vor allem `vertrag`), hör auf und
  melde es dem Orchestrator; nicht selbst ändern.
- Setze im Ticket `Status: claimed`. Prüfe, dass dein Worktree auf `integration/welle-4` steht
  (`git merge-base --is-ancestor integration/welle-4 HEAD`). Branchname `welle-4/<nr>-<kurz>`.
- `pnpm install --frozen-lockfile` im Worktree (neue Abhängigkeit: `pnpm add`, Lockfile mit committen, Lizenz C5).
- TDD (Skill `tdd`). Während der Arbeit Typecheck und einzelne Testdateien; am Ende einmal die ganze Suite:
  `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test`, dazu die E2E deines Pakets
  (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter <paket> e2e`), wenn das Ticket sie verlangt.
- Klein und oft committen, Commit-Nachricht englisch, mit den Zeilen
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` und
  `Claude-Session: https://claude.ai/code/session_01BBemrE1SkXVD117dBryobw` am Ende. Entscheidungen, die du selbst triffst,
  unter `## Comments` im Ticket als `D-<nr>.<n>` mit Frage, Entscheidung, Grund.
- Am Ende: Integrationsstand in deinen Branch mergen (`git merge integration/welle-4`), Suite grün, dann in ≤ 10 Zeilen
  melden: Branch, letzte Commits, was fehlt.
- Kein Push, kein Pull Request, keine Remote-Operation.

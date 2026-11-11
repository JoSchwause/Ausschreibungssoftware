# Schnitt des Laufs „Welle 5“

Stand 2026-11-11, Orchestrator (`/implement-welle 5`). Integrationsbranch `integration/welle-5` (lokal) ab dem Ende von
Welle 4 (`97bd414`, Branch `integration/welle-4`; Welle 4 liegt noch nicht auf `main`, D-31). Entscheidungen:
`entscheidungen-auto.md` ab D-31. Ein Schreiber je Paket (P2); in `apps/web` je Ordner `src/<strang>/` (D-20).

Welle 5 (`plan.md` §3): A1–A4 · M3 · C2–C5 · O3, dazu die Folgetickets 70–75 aus Welle 4.
Tor **M4** „durchgehende Kette LPH 6–8“: Definition in `plan.md` §4 (ergänzt in diesem Lauf).

## Stufe 1 (sofort)

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|
| 72 | V | `summen.vorher` bei neuer LV-Position | `packages/vergabe` | – | opus |
| 73 | G | Wahlgruppe verliert Grundposition im X83-Rundweg | `packages/gaeb` | – | opus |
| 74 | U | `ui-grid`: Restpunkte aus Welle 4 | `packages/ui-grid` | – | opus |
| 75 | F | Fixtures: Restpunkte aus Welle 4 | `fixtures/` | – | opus |
| 76 | A4 | XRechnung lesen (UBL, CII) | `packages/erechnung` (neu), `fixtures/extern/xrechnung/` | – | opus |
| 77 | O3 | Druckprofile, Spike getaggtes PDF | `packages/ausgabe` | – | sonnet |
| 78 | C4 | EP-Kalkulation | `packages/kosten` | – | opus |
| 70 | F | `vertrag` v1.4 (Auftrags-LV, Nachtrag, Aufmaß, Rechnung, Kostenermittlung; D-34 bis D-40) | `packages/vertrag` + markierte mechanische Zeilen | – | opus |

Vor Stufe 2: Opus-Review von v1.4 gegen alle Verbraucher, Torvermerk im Log (wie D-27).

## Stufe 2 (nach `vertrag` v1.4)

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|
| 71 | K | Kern v1.4: Befehle am Auftrags-LV, Umkehrung, neue LV-Befehle | `packages/kern` | 70 | opus |
| 79 | S | Speicher v1.4: Migration 5, Repositories | `packages/speicher` | 70 | opus |
| 80 | A1+A2 | `abrechnung`: Nachtrag übernehmen, Aufmaß-Befehle | `packages/abrechnung` (neu) | 70 | opus |
| 81 | A2+A3 | Soll/Ist, Leistungsstand, Rechnungsprüfung | `packages/abrechnung` | 70, 80 | opus |
| 82 | C2+C3 | Kostenermittlung als Aggregat, Kostenkontrolle | `packages/kosten` | 70, 78 | opus |
| 83 | M3 | GAEB X31 lesen und schreiben | `packages/gaeb` | 70, 73 | opus |
| 84 | G/C2 | `gaeb` v1.4: Kostengruppe als Katalogzuordnung | `packages/gaeb` | 70, 83 | opus |
| 85 | F | Fixture M4 mit hergeleiteten Sollwerten | `fixtures/` | 70, 75 | opus |

## Stufe 3 (App, Tor M4)

| Nr | Strang | Titel | Ordner (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|
| 86 | A1 | Auftrags-LV über den Vertrag, Nachträge | `apps/web/src/auftrag/`, `src/nachtrag/` | 71, 79, 80 | opus |
| 87 | A2+M3 | Aufmaßblätter, Soll/Ist, X31 | `apps/web/src/abrechnung/`, `src/mengen/` | 79, 80, 81, 83 | opus |
| 88 | A3+A4 | Rechnungen prüfen und freigeben, XRechnung | `apps/web/src/rechnung/` | 76, 79, 81 | opus |
| 89 | C2–C4 | Kostenermittlung, KG zuordnen, Kostenkontrolle, EP-Kalkulation | `apps/web/src/kosten/` | 71, 78, 79, 82 | opus |
| 90 | O3+C5 | Druckprofile, Muster-LV, Textquelle | `apps/web/src/ausgabe/`, `src/vorlage/` | 71, 77, 79 | sonnet |
| 91 | – | Tor M4: Kettentest und E2E | `apps/web/e2e/m4.spec.ts`, `src/m4-kette.test.ts` | 73, 85, 86–89 | opus |

Gemeinsame Dateien der App (`App.tsx`, `lv/LvSeite.tsx`, `lv/befehlsweg.ts`, `auftrag/AuftragsLvSeite.tsx`,
`projekt/ProjektSeite.tsx`) fasst ein Ticket nur an einer markierten Einhängestelle an (`// Ticket <nr>`); Konflikte dort
löst der Merger (D-20). Kürzungsreihenfolge bei Überlauf (D-36): 90 → 84 → X31-Schreiben in 83/87 → XRechnung in 88 nur
Kopfsummen → EP-Kalkulation in 89. Nie gekürzt: 71, 79, 80, 81, 82, 85, 86–88 (ohne die genannten Teile), 89 (C2, C3), 91.

## Gemeinsame Regeln für Umsetzer (Kurzfassung, verbindlich bleibt `docs/regeln.md`)

- Lies zuerst `docs/regeln.md`, `GLOSSARY.md`, `AGENTS.md`, dein Ticket in `.scratch/ava-oss/issues/` und die dort genannten
  Tickets und Entscheidungen (`entscheidungen-auto.md`). **Nie** `okf/research/` lesen (C3).
- Arbeite nur in deinem Paket bzw. Ordner (P2). Brauchst du eine Änderung woanders (vor allem `vertrag`), hör auf und
  melde es dem Orchestrator; nicht selbst ändern. Ausnahmen nennt das Ticket ausdrücklich.
- Setze im Ticket `Status: claimed`. Prüfe, dass dein Worktree auf `integration/welle-5` steht
  (`git merge-base --is-ancestor integration/welle-5 HEAD`). Branchname `welle-5/<nr>-<kurz>`.
- `pnpm install --frozen-lockfile` im Worktree (neue Abhängigkeit: `pnpm add`, Lockfile mit committen, Lizenz C5).
- TDD (Skill `tdd`). Während der Arbeit Typecheck und einzelne Testdateien; am Ende einmal die ganze Suite:
  `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test`, dazu die E2E deines Pakets
  (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter <paket> e2e`), wenn das Ticket sie verlangt.
- Bis zu 8 Agenten teilen sich 4 Kerne. Fällt ein Leistungsbudget (CPU-Zeit) nur in der vollen Suite, die Datei allein
  wiederholen und beide Messungen im Ticket nennen. **Nie** ein Budget lockern oder einen Test überspringen.
- Klein und oft committen, Commit-Nachricht englisch, mit den Zeilen
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` und
  `Claude-Session: https://claude.ai/code/session_01BBemrEptmwSzRDThRpAYew` am Ende. Entscheidungen, die du selbst triffst,
  unter `## Comments` im Ticket als `D-<nr>.<n>` mit Frage, Entscheidung, Grund.
- Am Ende: Integrationsstand in deinen Branch mergen (`git merge integration/welle-5`), Suite grün, dann in ≤ 10 Zeilen
  melden: Branch, letzte Commits, was fehlt.
- Kein Push, kein Pull Request, keine Remote-Operation (Lesen aus dem Netz für Testdateien und XSD ist erlaubt).

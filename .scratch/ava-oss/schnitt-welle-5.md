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

Stufen 2 und 3 folgen unten, sobald `vertrag` v1.4 geschnitten ist.

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

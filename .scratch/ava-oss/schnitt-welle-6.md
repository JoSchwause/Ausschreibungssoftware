# Schnitt des Laufs „Welle 6“

Stand 2026-11-12, Orchestrator (`/implement-welle 6`). Integrationsbranch `integration/welle-6` (lokal) ab `79e6680`
(Merge von PR #10 „Welle 4 und 5“, also `main` mit Welle 4 und 5; der lokale Ref `main` ist veraltet, D-49). Entscheidungen:
`entscheidungen-auto.md` ab D-49. Ein Schreiber je Paket (P2); in `apps/web` je Ordner `src/<strang>/` (D-20).

Welle 6 (`plan.md` §3, G-05 Nachtrag 2026-11-12): zuerst die Folgetickets 93–95, danach X1–X5, Schwerpunkt X1 BIM.
Tore je Modul: siehe `plan.md` §4 (in diesem Lauf ergänzt).

Beraterrunde vor dem Schnitt (2 Aufrufe): D-50 bis D-58; Schnitt D-59. Neue Pakete: `ifc`, `bim`, `ui-modell`, `bauzeit`,
`honorar`, `bauleitung` (`plan.md` §1). Jedes neue Paket trägt sich in `tools/boundaries.mjs` ein (Konflikte dort löst der
Merger).

## Stufe 1 (sofort)

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|
| 95 | F | `vertrag` v1.5: Kleinpunkte, `LvSpalte` KG | `packages/vertrag` + markierte mechanische Zeilen | – | opus |
| 94 | S, A2 | Aufmaßblatt mit 5.000 Zeilen: Einzeländerung und Undo < 100 ms | `packages/speicher` | – | opus |
| 96 | U, X2 | `ui-grid`: Balkenspalte (Zeitleiste) im Vergleichsgrid | `packages/ui-grid` | – | opus |
| 98 | X1a | IFC lesen (eigener STEP-Leser, IFC 2x3/4) | `packages/ifc` (neu) | – | opus |
| 99 | F, X1 | Fixtures: IFC-Haus v1/v2, Erzeuger 10k, Sollwerte X1 | `fixtures/` | – | opus |
| 100 | X1b | 3D-Leinwand (web-ifc, three.js) | `packages/ui-modell` (neu) | – | opus |
| 101 | X3 | HOAI-Rechenkern | `packages/honorar` (neu) | – | opus |
| 102 | X2 | Terminrechnung, Arbeitskalender | `packages/bauzeit` (neu) | – | opus |
| 103 | X5 | ADR 0013 (Vorschlag), G-57 | `docs/adr/`, `grilling.md`, `plan.md` §2 | – (nächster freier Platz) | sonnet |

## Stufe 1b (nach 95)

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|
| 97 | F | `vertrag` v1.6: Typen für X1–X4 (D-51 bis D-57) | `packages/vertrag` + markierte mechanische Zeilen | 95 | opus |
| 104 | A4 | `erechnung` nutzt die gemeinsame Befundliste | `packages/erechnung` | 95 | sonnet |
| 93 | U, C2 | `ui-grid`: editierbare KG-Spalte, App stellt um | `packages/ui-grid`, danach `apps/web/src/kosten/` + Einhängestellen | 95, 96 | opus |

Vor Stufe 2: Opus-Review von v1.5 und v1.6 gegen alle Verbraucher, Torvermerk im Log (D-42-Muster).

## Stufe 2 (nach `vertrag` v1.6)

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|
| 105 | K | Kern v1.5/v1.6: Fehlercode, OZ-Vorschlag Auftrags-LV, `BauteileZuordnen` | `packages/kern` | 97 | opus |
| 106 | S | Speicher v1.5/v1.6: Migration 6, Modelldateien, neue Aggregate | `packages/speicher` | 94, 97 | opus |
| 107 | X1a | `ifc` bildet auf `Bauwerksmodell` ab, Budgets | `packages/ifc` | 97, 98, 99 | opus |
| 108 | X1c–f | `bim`: Mengenübernahme, Aufmaß aus Auswahl, DIN 277, Kennwerte, Vergleich | `packages/bim` (neu) | 97 | opus |
| 109 | X2 | `bauzeit`: Befehle, Vertragstypen | `packages/bauzeit` | 97, 102 | opus |
| 110 | X3 | `honorar`: Befehle, anrechenbare Kosten aus Kostenermittlung | `packages/honorar` | 97, 101 | opus |
| 111 | X4 | `bauleitung`: Mängel, Bautagebuch | `packages/bauleitung` (neu) | 97 | opus |
| 112 | F | Fixtures: Sollwerte X2–X4 | `fixtures/` | 97, 99 | opus |
| 113 | O | `ausgabe`: PDF für Mängel, Bautagebuch, Honorar, Bauzeitenplan | `packages/ausgabe` | 97 | sonnet |

## Stufe 3 (App, Tore)

| Nr | Strang | Titel | Ordner (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|
| 114 | X1a+b | Modelle einlesen, Baum ↔ 3D, Eigenschaften | `apps/web/src/bim/` | 100, 106, 107 | opus |
| 115 | X1c–e | Zuordnen, Mengen übernehmen, Kennwerte, Aufmaß aus Auswahl | `apps/web/src/bim/` (nach 114) | 105, 108, 114 | opus |
| 116 | X1f | Modellvergleich | `apps/web/src/modellvergleich/` | 108, 114 | opus |
| 117 | X1 | Tor X1-Kern und X1-Erweitert | `apps/web/e2e/x1*.spec.ts`, `src/x1-kette.test.ts` | 99, 114–116 | opus |
| 118 | X2 | Bauzeitenplan in der App, Tor X2 | `apps/web/src/bauzeit/` | 96, 106, 109, 112, 113 | opus |
| 119 | X3 | Honorarberechnung in der App, Tor X3 | `apps/web/src/honorar/` | 106, 110, 112, 113 | sonnet |
| 120 | X4 | Mängel und Bautagebuch in der App, Tor X4 | `apps/web/src/bauleitung/` | 106, 111, 112, 113 | sonnet |
| 121 | – | Folgearbeit v1.5 in der App (Netto, OZ-Vorschlag, Druckprofile) | `apps/web/src/projekt/`, `src/auftrag/`, `src/ausgabe/` | 105, 106 | sonnet |

Gemeinsame Dateien der App (`App.tsx`, `lv/LvSeite.tsx`, `lv/befehlsweg.ts`, `auftrag/AuftragsLvSeite.tsx`,
`projekt/ProjektSeite.tsx`, `historie/`) fasst ein Ticket nur an einer markierten Einhängestelle an (`// Ticket <nr>`);
Konflikte dort löst der Merger (D-20).

**Kürzungsreihenfolge bei Überlauf** (Nutzungslimit oder Zeit): § 40/44/48 in 101 → 3D-Färbung in 116 (nur Liste) →
PDF des Bauzeitenplans, dann der Honorarberechnung in 113 (das Tor nennt die Kürzung) → 121 → 104. **Nie gekürzt:** 93, 94, 95
(G-05: zuerst die Folgetickets), der Weg X1-Kern (97, 98, 100, 105, 106, 107, Mengenübernahme in 108, 114, 115, 117) und je
Modul X2–X4 die App mit Kettentest.

## Gemeinsame Regeln für Umsetzer (Kurzfassung, verbindlich bleibt `docs/regeln.md`)

- Lies zuerst `docs/regeln.md`, `GLOSSARY.md`, `AGENTS.md`, dein Ticket in `.scratch/ava-oss/issues/` und die dort genannten
  Tickets und Entscheidungen (`entscheidungen-auto.md`). **Nie** `okf/research/` lesen (C3).
- Arbeite nur in deinem Paket bzw. Ordner (P2). Brauchst du eine Änderung woanders (vor allem `vertrag`), hör auf und
  melde es dem Orchestrator; nicht selbst ändern. Ausnahmen nennt das Ticket ausdrücklich.
- Setze im Ticket `Status: claimed`. Prüfe, dass dein Worktree auf `integration/welle-6` steht
  (`git merge-base --is-ancestor integration/welle-6 HEAD`); sonst `git checkout -b welle-6/<nr>-<kurz> integration/welle-6`.
  Branchname `welle-6/<nr>-<kurz>`.
- `pnpm install --frozen-lockfile` im Worktree. Neue Abhängigkeit: `pnpm add` mit genauer Version, die mindestens zwei Wochen
  alt ist (Lieferkette), Lockfile mit committen, Lizenz nach C5 (`tools/licenses.mjs`).
- TDD (Skill `tdd`). Während der Arbeit Typecheck und einzelne Testdateien; am Ende einmal die ganze Suite:
  `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test`, dazu die E2E deines Pakets
  (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter <paket> e2e`), wenn das Ticket sie verlangt.
- Bis zu 8 Agenten teilen sich 4 Kerne. Fällt ein Leistungsbudget (CPU-Zeit) nur in der vollen Suite, die Datei allein
  wiederholen und beide Messungen im Ticket nennen. **Nie** ein Budget lockern oder einen Test überspringen.
- Klein und oft committen, Commit-Nachricht englisch, mit den Zeilen
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` und
  `Claude-Session: https://claude.ai/code/session_01BBemrD7Dj7434JJMsjUxtP` am Ende. Entscheidungen, die du selbst triffst,
  unter `## Comments` im Ticket als `D-<nr>.<n>` mit Frage, Entscheidung, Grund.
- Am Ende: Integrationsstand in deinen Branch mergen (`git merge integration/welle-6`), Suite grün, dann in ≤ 10 Zeilen
  melden: Branch, letzte Commits, was fehlt.
- Kein Push, kein Pull Request, keine Remote-Operation (Lesen aus dem Netz für Testdateien, Normtexte und Pakete ist erlaubt).

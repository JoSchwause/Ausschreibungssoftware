# 163: Reste aus 158, 159a, 159b

Status: ready-for-agent
Type: task
Welle: 7 · Strang: – · Paket/Ordner: `apps/web/src/rechnung/`, `apps/web/src/gaeb/`, `apps/web/src/bauzeit/`, `packages/bauzeit` (nur Alias), `packages/speicher` (nur Dateikopf), `apps/web/e2e/` (nur `zahlungsfreigabe.spec.ts`, `nachtrag.spec.ts`), Ordner der Ursache des Wacklers
Blocked by: 158, 159a, 159b gemergt
Modell: opus
Priorität: P (Review-Behebung, D-104, D-109)
Regeln: L4, L5, E13, N1, Q1–Q5; D-104, D-109
Herkunft: Abschlussberichte von 158, 159a, 159b; D-110

## What to build

1. **Eine Regel für den Skonto-Stand.** Bildschirm (`rechnung/pruefung.ts` um Zeile 303, `rechnung/texte.ts:206-207`) und PDF
   (`skontoStandText` aus `@tethys/ausgabe`, PA2) müssen dieselbe Regel nutzen: „noch nicht verwirklicht“, solange die Frist
   läuft (bis einschließlich Fristende), „nicht verwirklicht“ danach oder wenn eine Zahlung nach Fristende erfasst ist. Bildschirm
   ruft `skontoStandText` (oder eine gemeinsame Funktion) auf; ein Test belegt, dass Bildschirm und PDF für dieselben Eingaben
   denselben Text liefern. `e2e/zahlungsfreigabe.spec.ts:341` (PDF-Erwartung) passend nachziehen.
2. **PB2:** `angebot.keinX84` in `apps/web/src/gaeb/` nennt alle lesbaren Formate: „… X84 als GAEB DA XML 3.1, 3.2 oder 3.3,
   GAEB 90 oder GAEB 2000 …“; Kommentar `gaeb.ts:60` richtigstellen.
3. **Alias `Datum`** in `packages/bauzeit` entfernen; `apps/web/src/bauzeit/ansicht.ts` importiert `Kalenderdatum`.
4. **SA6:** Dateikopf von `packages/speicher/src/dateimigration7.ts` präzisieren: Schema 7 gilt als veröffentlicht „ab dem Merge
   nach `main`“ (D-104).
5. **Wackler `nachtrag.spec.ts:164`** (Escape schließt den schreibgeschützten Positionsdialog „01.0010 Baustelle einrichten“
   manchmal nicht; allein mit `--repeat-each 3` 1 von 3 rot). Ursache mit dem Skill `diagnosing-bugs` finden (Verdacht: eine
   Meldung oder ein Fokuswechsel fängt Escape, vgl. D-162.3, oder Escape kommt vor dem Öffnen an). Ursache im Code beheben, nicht
   im Test verstecken; kein `retry`, kein längerer Timeout als einzige Änderung. Beleg: `--repeat-each 10` grün.

## Acceptance criteria

- [ ] Punkte 1–5 erledigt, Entscheidungen als D-163.n unter `## Comments`
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (Leistungsbudgets unter Last melden,
  nie lockern); `zahlungsfreigabe.spec.ts`, `rechnung.spec.ts`, `nachtrag.spec.ts --repeat-each 10`, `vergabe.spec.ts` grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Texte für Nutzer nach L4/L5

## Comments

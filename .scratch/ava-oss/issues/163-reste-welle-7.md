# 163: Reste aus 158, 159a, 159b

Status: done-by-agent
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

- [x] Punkte 1–5 erledigt, Entscheidungen als D-163.n unter `## Comments`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (Leistungsbudgets unter Last melden,
  nie lockern); `zahlungsfreigabe.spec.ts`, `rechnung.spec.ts`, `nachtrag.spec.ts --repeat-each 10`, `vergabe.spec.ts` grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Texte für Nutzer nach L4/L5

## Comments

- **D-163.1 Skonto ohne Eingangsdatum.** Frage: Welcher Stand, wenn es kein Fristende gibt? Bildschirm sagte „nicht
  verwirklicht“, PDF „noch nicht verwirklicht“. Entscheidung: „noch nicht verwirklicht“ wie im PDF. Grund: Das Datum lässt sich
  nachtragen (Befund „Skonto ohne Eingangsdatum“ sagt, wo), der Skonto ist also nicht endgültig verfehlt; `packages/ausgabe`
  gehört nicht zu diesem Ticket (P2).
- **D-163.2 Eine Regel, zwei Fassungen mit Gleichheitstest.** Frage: Bildschirm ruft `skontoStandText` aus `@tethys/ausgabe`?
  Entscheidung: Nein; `rechnung/pruefung.ts` hat `skontoStand` mit derselben Regel und den Texten aus `texte.ts`, ein Test in
  `rechnung/zahlungsfreigabe.test.ts` verlangt für alle Varianten der Fixture und sechs Stichtage denselben Text wie
  `skontoStandText`. Grund: Der statische Import zieht pdfmake ins Hauptbündel (gemessen: `index-*.js` 938 kB → 1.810 kB);
  die App lädt `ausgabe` sonst nur nach. Eine einzige Fassung bräuchte einen Unterpfad-Export oder `sideEffects` in
  `packages/ausgabe` (anderes Paket, Bericht). Folge: AR 2 zeigt am Bildschirm jetzt „nicht verwirklicht“, sobald die
  Restzahlung nach dem Fristende erfasst ist, gleich wie die Uhr steht (wie das PDF); E2E-Hilfe und Unit-Test nachgezogen.
- **D-163.3 Ursache des Wacklers `nachtrag.spec.ts:164`.** Befund (Schleife: Spec bis Zeile 164, `--repeat-each 10`, vorher 7
  von 10 rot): Escape schloss die Meldung „Zuschlag an Bieter B erteilt“, nicht den Dialog. Radix (`DismissableLayer` 1.2)
  hängt den Escape-Lauscher nur an die oberste Ebene und ordnet nach dem Öffnen eines Dialogs erst im nächsten Durchlauf mit
  normaler Priorität um; bis dahin hört die ältere Meldung (oder, ohne Meldung, niemand). Lösung in `packages/ui-basis` (Ordner
  der Ursache): Die Meldung nimmt Escape nicht, wenn der Fokus in einem Dialog steht, und gibt es frei (`escape.ts`); der
  `Dialog` schließt bei einem Escape, das keine Ebene genommen oder das eine Meldung freigegeben hat. Was eine Ebene im Dialog
  nimmt (Auswahlliste, Menü, Tooltip, innerer Dialog), bleibt bei ihr. Folge: Escape im Dialog schließt keine Meldung mehr; sie
  geht nach ihrer Zeit oder über F8 und Escape. Tests in `ui-basis/src/Toast.test.ts` (Escape gleich nach dem Öffnen, rot ohne
  Änderung; Liste im Dialog; Meldung bei offenem Dialog). Danach Schleife 10 von 10 grün, Test unverändert.
- **D-163.4 Prüfläufe.** `pnpm lint`, `pnpm typecheck` grün; `pnpm test` 4825 grün, 1 rot nur Leistungsbudget unter Last
  (`ausgabe/leistung.test.ts` „druckt gross“, 5.038 ms CPU gegen 5.000 ms, Last ~4 auf 4 Kernen, auch allein rot unter dieser
  Last; `ausgabe` unverändert, nicht gelockert). E2E: `zahlungsfreigabe`, `rechnung`, `vergabe`, `umsteiger`, `ueberlauf` 10/10;
  `nachtrag.spec.ts --repeat-each 10` 10/10; volle Web-E2E 129/129 (wegen der Änderung an `Dialog`/`Toast`).

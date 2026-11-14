# 159: Behebung des Wellen-Reviews Welle 7

Status: claimed
Type: task
Welle: 7 · Strang: – · Paket/Ordner: 159a: Pakete (`gaeb`, `ui-grid`, `bauzeit`, `ausgabe`, `abrechnung`-Paket, `vergabe`, `vertrag` nur Kommentare, `fixtures/`, `GLOSSARY.md`) und App-Ordner `gaeb/` für SB3; 159b: App-Ordner `kosten/`, `vergabe/`, `honorar/`, `bauzeit/`, `bauleitung/`, `nachtrag/`, `hilfe/`, `auftrag/`, `lv/` (nur Spec), `ui/`, `e2e/`, `e2e-basispfad/`, `README.md`. Gesperrt bis zu ihrem Merge: `apps/web/src/abrechnung/`, `rechnung/` (152), `kern`, `speicher`, `projekt/`, `historie/` (161), `apps/web/src/ausgabe/` (162)
Blocked by: alle Merges außer 152, 161, 162
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: wie je Befund; D-104
Herkunft: `../review-welle-7.md`, D-104

## What to build

Umfang und Zuordnung stehen in **D-104** (`../entscheidungen-auto.md`), die Befunde mit Datei und Zeile in
`../review-welle-7.md`. Zwei Umsetzer: **159a** (Pakete, Glossar, Fixtures, Angebotspreise im gemeinsamen Grid) und **159b**
(App-Ordner, README). Jeder Befund wird mit Test behoben oder unter `## Comments` begründet zurückgestellt. Keine Änderung in
gesperrten Ordnern; was dort nötig ist, an den Orchestrator melden.

## Acceptance criteria

- [ ] Jeder Pflichtpunkt aus D-104 erledigt oder begründet
- [ ] Volle Web-E2E einmal grün (Budget-Ausfälle unter Last werden gemeldet, nie gelockert)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

# 129: GAEB DA XML 3.1 lesen (X81, X83, X84, X86)

Status: claimed
Type: task
Welle: 7 · Strang: G4 · Paket/Ordner: `packages/gaeb`
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q3, U5, F6, G-10, C4
Herkunft: umfang §3 E5, B-10

## What to build

- X81, X83, X84, X86 in DA XML 3.1 lesen, in dasselbe Modell wie 3.2/3.3. Unterschiede der Version als eigene, kleine Weichen;
  was 3.1 nicht abbildet oder anders kennt, ist ein Befund (U5), nie stilles Verwerfen.
- Prüfsteine: die amtlichen Musterdateien in `fixtures/extern/gaeb/3.1-musterdateien/` (alle acht Dateien lesen ohne Fehler;
  Mengen, EP, GP und Summen stimmen mit den Werten in der Datei; Zählung wie `zaehlung-bvbs.test.ts`).
- Geschrieben wird weiter nur 3.2 und 3.3 (G-10). Ein 3.1-Import exportiert als 3.3 und liest sich wieder gleich (Roundtrip
  über das Modell).
- Die Meldung `version-nicht-unterstuetzt` (`lesen.ts` ~1526) nennt kein Ticket mehr (L5); die volle Überarbeitung der
  Meldungen folgt in 136.

## Acceptance criteria

- [ ] Alle acht 3.1-Musterdateien lesen; Golden-Tests für Summen; Roundtrip 3.1 → Modell → 3.3 → Modell gleich
- [ ] XSD-Gegenprüfung (`pnpm --filter @tethys/gaeb run xsd-gegenpruefung`) unverändert grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

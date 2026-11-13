# 145: GAEB 2000 lesen (.p81/.p83/.p84/.p86)

Status: ready-for-agent
Type: task
Welle: 7 · Strang: G4, E6 · Paket/Ordner: `packages/gaeb`, `fixtures/gaeb-formate/`
Blocked by: 144
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: C1, C4, U5, Q5; D-71
Herkunft: umfang §3 E6

## What to build

Wie 144, für GAEB 2000 (Schlüsselwort-Format). **Nur, wenn eine frei zugängliche Formatbeschreibung erreichbar ist (D-71);
sonst sofort abbrechen**, im Ticket begründen und `Status: wontfix (gekürzt nach §4)` setzen – die klare Abweisung aus 136 bleibt.
Testdateien .p83/.p86 desselben LV in `fixtures/gaeb-formate/`, Formatvergleich (Tor E Punkt 3) um GAEB 2000 erweitert.

## Acceptance criteria

- [ ] Leser mit Tests oder begründete Kürzung; Formatvergleich grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

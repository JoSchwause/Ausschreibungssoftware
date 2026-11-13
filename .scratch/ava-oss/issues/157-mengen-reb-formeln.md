# 157: Weitere REB-Formeln (M4)

Status: ready-for-agent
Type: task
Welle: 7 · Strang: M4 · Paket/Ordner: `packages/mengen`, `packages/gaeb` (X31), `apps/web/src/mengen/`
Blocked by: alle P- und S-Tickets gemergt, Tor E grün
Modell: opus
Priorität: K (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: C1, C4, N1, Q1; D-75
Herkunft: umfang §3 M4, G-61

## What to build

Nach **D-75**: Quelle ist die amtliche BVBS-Prüfdatei `fixtures/extern/bvbs/3.3-mengenermittlung/*.x31` (Nummer, Name,
Parameterlage); Beschreibungen in eigenen Worten, Sollwerte selbst hergeleitet (Elementargeometrie). Stufe 1: 04, 05, 01, 31;
Stufe 2: 02, 03, 07, 13, 30. Nur umsetzen, was die Prüfdatei nach Nummer und Parameterreihenfolge belegt; sonst Befund „Formel
nicht umgesetzt“ mit erhaltener Nummer im X31-Rundweg. Formelauswahl in der App erweitern.

## Acceptance criteria

- [ ] Golden-Tests je Formel mit Herleitung; X31-Rundweg behält die Nummer
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

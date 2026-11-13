# 153: `ausgabe`: Kostenermittlung, Kostenkontrolle, Zahlungsfreigabe mit A5

Status: ready-for-agent
Type: task
Welle: 7 · Strang: O, E12 · Paket/Ordner: `packages/ausgabe`
Blocked by: 141, 128
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: ADR 0012, N4, D-72
Herkunft: umfang §3 E12, E11 (A5-Zeilen)

## What to build

1. **Kostenermittlung** und **Kostenkontrolle** als PDF und Excel (je KG, mit Bezeichnungen, wo vorhanden; netto, Nachlass als
   eigene Zeile, D-37).
2. **Rechnungsprüfung/Zahlungsfreigabe** um die A5-Zeilen (Vertragsstrafe, Skonto beider Szenarien, Bauabzugsteuer „an das
   Finanzamt“, Auszahlung, Zahlungen, offen) ergänzen.
3. **K:** Bauzeitenplan-PDF mit Balken – nur, wenn Zeit bleibt; sonst im Ticket als gekürzt vermerken.

## Acceptance criteria

- [ ] Seitentext-/Zelltests für 1–2
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

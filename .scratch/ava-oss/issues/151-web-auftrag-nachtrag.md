# 151: App: Auftrags-LV (Langtext, Excel) und geführter Nachtrag

Status: claimed
Type: task
Welle: 7 · Strang: A1, E9 · Paket/Ordner: `apps/web/src/auftrag/`, `nachtrag/`
Blocked by: 142
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U3, Q5
Herkunft: umfang §3 E9, B-17, B-18

## What to build

1. Auftrags-LV-Seite: **Positionsdialog nur lesen** (Langtext sichtbar), **Excel-Ausgabe** (bestehende LV-Excel-Ausgabe).
2. **Nachtrag geführt:** der Auftragnehmer ist als Bieter vorbelegt; nach dem Einlesen des Angebots schlägt die App den Status
   „angeboten“ vor; „Beauftragen“ ist der sichtbare nächste Schritt (Schrittanzeige oder hervorgehobene Schaltfläche).
3. `nachtrag.spec.ts` auf den geführten Weg umstellen (M4-Tor bleibt grün).

## Acceptance criteria

- [ ] E2E für 1–2; M4 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

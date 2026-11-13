# 143: `abrechnung`: Vertragsstrafe, Skonto, Bauabzugsteuer, Zahlungen; Fixture und Kettentest

Status: ready-for-agent
Type: task
Welle: 7 · Strang: A5 · Paket/Ordner: `packages/abrechnung`, `fixtures/` (neue Datei `typisch-zahlungen.json` o. ä.)
Blocked by: 128
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: N1–N3, A2, Q1, Q5, C4; D-34, D-72
Herkunft: umfang §3 A5, G-61

## What to build

1. **Sollwerte zuerst:** eine Fixture mit Herleitung je Zahl (Regel D-72, D-34; C4), aufbauend auf `typisch-abrechnung.json`:
   Rechnung 1 mit Skonto (Zahlung in der Frist), Rechnung 2 mit Vertragsstrafe und Zahlung nach der Frist (kein Skonto),
   Bauabzugsteuer an einer Rechnung, Teilzahlung mit offenem Betrag. Die Herleitung unabhängig vom Code (z. B. in
   `fixtures/rechnen.mjs` oder als Text in der Fixture).
2. **Rechnung prüfen** nach D-72 (beide Skonto-Szenarien, Fristende, verwirklichter Skonto, Bauabzugsteuer, Auszahlung, offen);
   Befunde (kein Eingangsdatum, Zahlung über Auszahlung, …).
3. **Befehle:** Zahlung erfassen/ändern/löschen (nur bei freigegebener Rechnung), Freigabe aufheben gesperrt bei Zahlungen,
   Vertragsstrafe/Skonto/Bauabzugsteuer setzen; Vorschlag der kumulierten Vertragsstrafe aus der Vorrechnung.
4. Alte Rechnungen ohne neue Felder ergeben dieselben Zahlen (Goldens M4 unverändert).
5. **Kettentest ohne Oberfläche** (`packages/abrechnung` oder `apps/web/src/a5-kette.test.ts` – nur wenn Ordnerbesitz frei;
   sonst im Paket) mit derselben Fixture. Property-Tests für Rundung und Nichtnegativität des offenen Betrags.

## Acceptance criteria

- [ ] Fixture mit Herleitung; Kettentest gleich Soll; M4-Goldens unverändert
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

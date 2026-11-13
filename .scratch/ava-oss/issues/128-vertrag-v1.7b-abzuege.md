# 128: `vertrag` v1.7b: Vertragsstrafe, Skonto, Bauabzugsteuer, Zahlungen

Status: claimed
Type: task
Welle: 7 · Strang: F, A5 · Paket/Ordner: `packages/vertrag` (+ `GLOSSARY.md`)
Blocked by: 127
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A4, P9, N1–N3, A8, Q5; D-34, D-72
Herkunft: umfang §3 A5, G-61

## What to build

Typen für A5 genau nach **D-72** (`../entscheidungen-auto.md`), additiv zu D-34:

- An der Rechnung: Vertragsstrafe (Betrag brutto, Grund; kumuliert geführt, Vorschlag aus der Vorrechnung), Skonto (Satz in
  Prozent, Frist in Kalendertagen), Schalter Bauabzugsteuer (Standard aus), Satz 15 als Konstante.
- Zahlungen je Rechnung (Datum, Betrag; nur auf freigegebene Rechnungen); Befehle Zahlung erfassen/ändern/löschen;
  Fehlercode „Freigabe aufheben gesperrt, solange Zahlungen bestehen“.
- Ergebnisfelder der Prüfung: Vertragsstrafe, möglicher Skonto, Fristende, verwirklichter Skonto, Bauabzugsteuer, Auszahlung
  (beide Szenarien), Σ Zahlungen, offener Betrag; neue Befundcodes (u. a. „kein Eingangsdatum, kein Skonto“).
- Neue Felder optional/`null` bei alten Rechnungen; alte Ergebnisse bleiben gleich (A8).
- Glossar: Vertragsstrafe, Skonto, Skontofrist, Bauabzugsteuer, Zahlung, offener Betrag, Auszahlung.

## Acceptance criteria

- [ ] Typen und Befehle nach D-72 mit Typtests; Lesarten unter `## Comments` (D-128.x)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

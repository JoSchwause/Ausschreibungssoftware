# 152: App: Aufmaß- und Rechnungsausgaben, Skonto, Zahlungen

Status: claimed
Type: task
Welle: 7 · Strang: A2, A3, A5, E11 · Paket/Ordner: `apps/web/src/abrechnung/`, `rechnung/`
Blocked by: 141, 143, 153
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q5, N4, U5; D-72
Herkunft: umfang §3 E11, A5

## What to build

1. **PDF/Excel:** Aufmaßblatt mit Mengenansätzen, Soll/Ist, Rechnungsprüfung mit Zahlungsfreigabe (Abzugskette Zeile für
   Zeile); Vorschau im Dialog.
2. **A5 an der Rechnung:** Vertragsstrafe (Betrag, Grund, Vorschlag aus der Vorrechnung), Skonto (Satz, Frist), Schalter
   Bauabzugsteuer; Anzeige beider Szenarien („bei Zahlung bis TT.MM.JJJJ: …, danach: …“).
3. **Zahlungen** je Rechnung (Datum, Betrag) erfassen, ändern, löschen; offener Betrag; „Freigabe aufheben“ gesperrt mit Text,
   solange Zahlungen bestehen.
5. **Aus 142 (D-89):** Schaltflächenreihen auf `Werkzeuggruppe`/`Werkzeugverweis` aus `ui-basis` umstellen, wo billig; `abrechnung/Verweis.tsx` ist unbenutzt und entfällt.
6. **Texte wie im PDF (153):** „Bauabzugsteuer 15,00 % an das Finanzamt“, „Auszahlung an den Auftragnehmer“, „Summe der Zahlungen“, „Offen“ – am Bildschirm dieselben Bezeichnungen.
7. **D-95:** `Einstellungen.buero` und `Projekt` in jede PDF-Eingabe (Köpfe nach D-141).
4. E2E mit den Sollwerten der Fixture aus 143.

## Acceptance criteria

- [ ] E2E für 1–4 gleich den Sollwerten; M4 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

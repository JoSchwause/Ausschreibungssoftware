# 88: A3+A4 in der App: Rechnungen prüfen und freigeben, XRechnung einlesen

Status: ready-for-agent
Type: task
Welle: 5 · Strang: A3, A4 · Ordner: `apps/web/src/rechnung/` (neu); Einhängestellen in `App.tsx`,
`auftrag/AuftragsLvSeite.tsx`, `lv/befehlsweg.ts` (markiert `// Ticket 88`, D-20)
Blocked by: 76, 79, 81
Regeln: A5, N4, U3, U5, U7, Q2, Q5, D-20, D-34, D-36
Herkunft: `plan.md` §2 A3, A4; G-27 (D-34)

## What to build

1. **Rechnungsliste** je Auftrags-LV (`/projekt/<id>/auftrag/<id>/rechnungen`): Nummer, Art, Eingang, gefordert brutto,
   geprüfter Zahlbetrag, Status (offen/freigegeben). „Neue Rechnung“: Art (Abschlag/Schluss), Eingangsdatum,
   Rechnungsnummer des AN, geforderte Beträge, Aufmaßblätter (Vorauswahl: alle bisherigen, kumuliert, D-34), Umlagen
   (Liste Bezeichnung + Satz), Sicherheits- bzw. Gewährleistungssatz. Jede Änderung ein Befehl, Undo/Redo.
2. **Prüfansicht** (`rechnungPruefen`, Ticket 81): die Abzugskette Zeile für Zeile (Leistung, Nachlass, Netto n. N., MwSt,
   Brutto kumuliert, Umlagen, Einbehalt, frühere Zahlbeträge, Zahlbetrag), gefordert vs. geprüft mit Differenz, Befunde (U5).
   Zahlen nur am Rand de-DE formatiert (N4).
3. **Freigeben:** Bestätigungsdialog (Q5: friert den Zahlbetrag ein), Befehl `RechnungFreigeben { zahlbetrag }` mit dem
   gerechneten Wert; gesperrt mit Erklärung, wenn eine frühere Rechnung nicht freigegeben ist (`freigabeMoeglich`).
   „Freigabe aufheben“ nach der Lesart aus v1.4.
4. **XRechnung einlesen** (`erechnung`, Ticket 76): Datei wählen → Vorschau (Rechnungsnummer, Datum, Art, Summen, Befunde)
   → übernimmt Rechnungsnummer, Eingangsdatum, geforderte Beträge (netto BT-109, brutto BT-112) und die Art (875/877 →
   Abschlag/Schluss, sonst fragen) in eine neue oder die gewählte Rechnung.
5. **E2E** `apps/web/e2e/rechnung.spec.ts`: Aufmaßblatt → Abschlagsrechnung 1 → Prüfansicht → freigeben → zweites Blatt →
   Abschlagsrechnung 2 zieht AR 1 ab → XRechnung (selbst verfasste Testdatei aus `fixtures/extern/xrechnung/` oder Ticket 76)
   einlesen → Neuladen.

## Grenzen

- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Logik, E2E `rechnung.spec.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Die App muss `rechnung`-ChangeSets umkehren (wie 87 für `aufmass`; `rechnungChangeSetUmkehren` aus `abrechnung`);
  Einhängestellen in `historie.ts`, `befehlsweg.ts`, `HistorieAnbieter.tsx` markiert `// Ticket 88`.
- `gefordert` (D-44): fehlende Werte als „–“ ohne Differenz; Differenzzeile bevorzugt den Zahlbetrag (BT-115); XRechnung
  übernimmt netto (BT-109), brutto (BT-112), zahlbetrag (BT-115), je wie vorhanden.

## Comments

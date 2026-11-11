# 81: A2+A3: Soll/Ist, Leistungsstand, Rechnungsprüfung

Status: ready-for-agent
Type: task
Welle: 5 · Strang: A2, A3 · Paket: `packages/abrechnung`
Blocked by: 70, 80
Regeln: A2, A3, A6, F3, F4, N1–N5, E-06, E-07, U5, Q1, Q5, D-03, D-34, D-35, D-36, D-37, D-38
Herkunft: `plan.md` §2 A2, A3; G-27 (Annahme D-34)

## What to build

1. **Soll/Ist (D-35).** `sollIstBerechnen(auftragsLv: AuftragsLvZustand, aufmasse: readonly Aufmass[], optionen?:
   { abgeschlossen?: boolean; oberSchwelle?: Prozent; unterSchwelle?: Prozent })`: je Position Soll-Menge (Auftrags-LV),
   Ist-Menge (Σ der Aufmaßblätter, 3 Stellen), Differenz, Anteil Ist/Soll in Prozent (2 Stellen, kaufmännisch), GP Soll (aus
   den Summen des Kerns), GP Ist = round(Ist × EP, 2); Befund `ueber-schwelle` bei Ist > 110 % (streng), `unter-schwelle` bei
   Ist < 90 % nur mit `abgeschlossen: true`; kein Befund bei Soll 0/`null` oder Pauschal; Summen je Gliederung und gesamt;
   Positionen ohne Aufmaß zählen Ist 0. Schwellen einstellbar (Standard 110,00 / 90,00).
2. **Leistungsstand (Vertragstyp aus v1.4, D-34 Schritt 1–3).** `leistungsstandBerechnen(auftragsLv, aufmasse, art)`:
   Leistung = Σ round(kumulierte Aufmaßmenge × Vertrags-EP, 2); EP `null` zählt 0 mit Befund; Bedarf zählt, sobald
   aufgemessen (F4 gilt für die Ausschreibung, nicht für ausgeführte Leistung – im Code begründen); Zuschlagsposition =
   round(Satz × Σ geprüfte GP ihrer Bezugspositionen / 100, 2) (Bezugsformen wie im Kern, D-03/D-37.2; Kern-Hilfen nutzen,
   wo es sie gibt); Nachlass nach D-34 Schritt 2 (Prozent; Absolut anteilig in Abschlag mit `min(…, abs)`, voll in Schluss;
   Basis 0 → 0 mit Befund); Netto nach Nachlass.
3. **Rechnungsprüfung (D-34 Schritt 4–7).** `rechnungPruefen(rechnung, auftragsLv, aufmasse, fruehereRechnungen)` →
   Prüfergebnis mit jeder Zeile der Kette (Leistung, Nachlass, Netto n. N., MwSt, Brutto kumuliert, Umlagen einzeln,
   Einbehalt, frühere Zahlbeträge, Zahlbetrag) und Befunden: Überzahlung (negativer Zahlbetrag), frühere Rechnung nicht
   freigegeben, Aufmaß aus einer früheren Rechnung fehlt in `aufmassIds` (kumuliert!), geforderter Betrag weicht vom
   geprüften ab (Differenz ausweisen), Schlussrechnung nicht die letzte. Frühere Zahlbeträge sind die **gespeicherten**
   `freigabe.zahlbetrag` (eingefroren), nie neu gerechnet. Jede Zwischenzahl auf 2 Stellen gerundet, dann verrechnet
   (N2, N5, E-07). `freigabeMoeglich(rechnung, fruehereRechnungen)`.
4. **Rechnung-Befehle:** `rechnungBefehlAusfuehren`, `rechnungChangeSetAnwenden`, `rechnungChangeSetUmkehren` (Signaturen
   v1.4; Formprüfungen; freigegebene Rechnung nur über „Freigabe aufheben“ änderbar, Lesart aus v1.4).
5. **Golden-Tests mit hergeleiteten Zahlen** (Rechenweg als Kommentar, Regel zitiert: N2, N5, D-34): Abschlag mit Prozent-
   Nachlass, Umlage und Sicherheitseinbehalt; zweite Abschlagsrechnung mit eingefrorenem Zahlbetrag (und Aufmaßkorrektur
   nach der Freigabe der ersten: ändert nur die zweite); absoluter Nachlass anteilig und in der Schlussrechnung voll;
   Gewährleistungseinbehalt in der Schlussrechnung; Überzahlung als Befund. Sobald Ticket 85 die M4-Fixture liefert, ein
   Test gegen ihre Sollwerte (falls 85 später fertig wird: der Test kommt mit Ticket 91).

## Grenzen

- Nur `packages/abrechnung`. Keine Speicherung, keine Oberfläche. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Golden- und Property-Tests (Q1): Zahlbetrag aller Rechnungen bis zur Schlussrechnung = Brutto kumuliert der
      Schlussrechnung − Umlagen − Gewährleistungseinbehalt; Reihenfolge der Aufmaßblätter ändert nichts
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

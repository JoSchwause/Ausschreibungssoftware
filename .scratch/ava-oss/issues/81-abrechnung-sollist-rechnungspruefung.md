# 81: A2+A3: Soll/Ist, Leistungsstand, Rechnungsprüfung

Status: done-by-agent
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

- [x] Golden- und Property-Tests (Q1): Zahlbetrag aller Rechnungen bis zur Schlussrechnung = Brutto kumuliert der
      Schlussrechnung − Umlagen − Gewährleistungseinbehalt; Reihenfolge der Aufmaßblätter ändert nichts
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Befund, wenn die Freigabe-Invariante verletzt ist (freigegebene Rechnung mit größerer Nummer als eine offene).
- `gefordert` ist `{ netto | null, brutto | null, zahlbetrag | null } | null` (D-44): Differenz nur, wo ein Wert da ist,
  bevorzugt Zahlbetrag; kein Befund für fehlende Forderungen.
- Zuschlagsposition: round(Satz × Σ gp / 100, 2); `prozentsatz: null` → gp 0.00 mit Befund (wie EP `null`).

## Comments

### Ergebnis (Branch `welle-5/81-rechnungspruefung`, Basis `integration/welle-5`)

Nur `packages/abrechnung` und `GLOSSARY.md` (Leistungsbefund, Rechnungsprüfung/Abzugskette, Soll/Ist). Die öffentlichen
Signaturen samt Ergebnistypen standen zuerst im Commit `1413276` (für die Tickets 87 und 88), die Rechnungen danach.

Dateien: `leistungsstand.ts` (D-34 (1) bis (3)), `soll-ist.ts` (D-35), `rechnung-pruefen.ts` (D-34 (4) bis (7),
`freigabeMoeglich`), `rechnung-befehle.ts`, `rechnung-changeset.ts`, `baum.ts` (Dokumentreihenfolge), `testhilfen.ts`
(`m4Stand`: Auftrags-LV nach N01 über `nachtragUebernehmen` und den Kern, Blätter 1, 2 und 1 korrigiert, AR 1 und AR 2).

Tests (39 neue, Paket jetzt 96):
- **Golden gegen `fixtures/typisch-abrechnung.json`:**
  - Leistungsstand von AR 1, AR 2 vor und nach der Korrektur, je ganze Zeilenliste.
  - Kette AR 1 8.874,40; AR 2 10.100,84 bzw. 10.070,67, mit eingefrorenem AR 1. AR 1 neu geprüft wäre 8.844,23
    (`gegenprobeOhneEinfrieren`); das meldet der Befund `freigabe-abweichend`.
  - Soll/Ist in allen drei Ständen mit genau einem `ueber-schwelle` (02.0040, 112,50 %); 04.01.0010 genau 110,00 % ohne
    Befund.
  - Summen: Soll 59.803,77, Ist 17.395,50; Nachtrag 1.445,24 / 1.363,24.
- **Hand-Beispiele mit Rechenweg:**
  - Bedarf aufgemessen.
  - Zuschlag auf die geprüften GP; ohne Satz 0,00 mit Befund.
  - EP `null`.
  - Prozent-Nachlass; absoluter Nachlass anteilig mit `min`, in der Schlussrechnung voll; Basis 0.
  - Schlussrechnung mit Gewährleistungseinbehalt.
  - Überzahlung −31,21.
  - Jeder Rechnungsbefund; gefordert nach D-44; `freigabeMoeglich`.
- **Rechnungsbefehle:** Golden an AR 1 und AR 2, `rechnung-freigegeben`, alle Formprüfungen.
- **Property-Tests:**
  - Σ Zahlbeträge bis zur Schlussrechnung = Brutto kum. − Umlagen − Gewährleistung.
  - Reihenfolge der Blätter egal.
  - Σ gp = Leistung.
  - Rechnungsbefehle: anwenden ∘ umkehren = Identität.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-81.1** Wie zählt die Zuschlagsposition im Leistungsstand, und wer rechnet die Bezugsformen? **Der Kern.**
  `zuschlagsbasen` rechnet auf einem gedachten LV der ausgeführten Leistung: jede Position mit ihrer kumulierten Menge, ohne
  die Merkmale Bedarf, Wahl und Pauschal. Grund: Die Bezugsformen R1 bis R5 und R2 (nur Positionen, deren Betrag ins Netto
  geht) bleiben an einer Stelle. F4 regelt, was eine Ausschreibung summiert. Ausgeführte und aufgemessene Leistung wird
  bezahlt, also zählt eine aufgemessene Bedarfsposition auch in der Zuschlagsbasis. Eine nicht aufgemessene
  Pauschalposition rechnet nicht mit der Menge 1 (Kern-Annahme D-37.1 gilt für die Ausschreibung).
- **D-81.2** Befund `ohne-zuschlagssatz`? **Nur, wenn die Basis der Zuschlagsposition nicht 0,00 ist**; der GP ist immer
  0,00. Befund `ohne-einheitspreis` nur für aufgemessene Positionen. Grund: Eine nie aufgemessene Position ohne EP (03.0070
  in M4, D-85.1) soll nicht jede Rechnung füllen.
- **D-81.3** Teilmenge einer Bezugsposition? **Höchstens bis zur aufgemessenen Menge** (min(Teilmenge, kumulierte Menge),
  ohne Aufmaß keine Basis). Grund: Die Kern-Regel R5 (Teilmenge × EP, D-37.2) gälte sonst schon vor der Ausführung. Nicht im
  M4-Weg.
- **D-81.4** Rückgabe und Parameter:
  - `leistungsstandBerechnen` liefert `{ leistungsstand, befunde }`; `kosten` liest nur `leistungsstand`.
  - `rechnungPruefen(rechnung, auftragsLv, aufmasse, rechnungen)`: `aufmasse` sind alle Blätter des Auftrags-LV, gezählt
    werden die aus `aufmassIds`. `rechnungen` sind alle Rechnungen des Auftrags-LV; sie dürfen die geprüfte und fremde
    enthalten, die gefiltert werden.
  - Grund: Die App reicht die Listen der Repositories unverändert weiter. Für „Schlussrechnung nicht die letzte“ und die
    Freigabe-Invariante braucht die Prüfung auch spätere Rechnungen; der Ticketname `fruehereRechnungen` reichte dafür
    nicht.
- **D-81.5** Befunde der Rechnung:
  - Global prüft sie die Freigabe-Invariante (je freigegebene Rechnung die offenen mit kleinerer Nummer) und „Schluss-
    rechnung nicht die letzte“ (jede Schlussrechnung mit späterer Rechnung).
  - Neu ist `freigabe-abweichend`: eine freigegebene Rechnung, deren eingefrorener Betrag nicht der heute geprüfte ist
    (D-38: so sieht die Oberfläche, dass eine Korrektur nach der Freigabe nur die nächste Rechnung ändert).
  - `aufmass-unbekannt`: eine Kennung ohne Blatt zählt nichts.
  - gefordert (D-44): Vergleich je genanntem Wert (Netto gegen Netto n. N., Brutto gegen Brutto kum., Zahlbetrag gegen
    Zahlbetrag, kumuliert gelesen). Befund nur für den Zahlbetrag, sonst Brutto, sonst Netto; kein Befund für fehlende
    Forderungen.
- **D-81.6** Formprüfung der Rechnungsbefehle (D-70.3, D-70.4):
  - Kennungen nicht leer, Nummer ≥ 1, Art, Eingang wie das Datum des Aufmaßblatts (D-80.4).
  - `gefordert` nach D-44, Blätter ohne Doppelte, Umlagen mit Bezeichnung und Satz, Sätze und Zahlbetrag kanonisch.
  - Anlegen mit Freigabe und Aufheben ohne Freigabe weist der Ausführer mit `ungueltige-eingabe` ab; an einer
    freigegebenen Rechnung jeden anderen Befehl mit `rechnung-freigegeben`.
  - `rechnungsnummerAuftragnehmer: ''` wird `null` (der Vertrag sagt „nie `''`“; wie Einheit und Bemerkung).
  - Rechnung im ChangeSet kanonisch.
- **D-81.7** Soll/Ist:
  - Je Position eine Zeile, auch ohne Aufmaß (Ist 0,000); die Fixture listet nur aufgemessene (D-85.5), der Test filtert.
  - Zuschlagspositionen mit Ist `null` und `gpIst` aus ihrer Basis.
  - Befunde streng und exakt (Ist × 100 gegen Soll × Schwelle), nicht am gerundeten Anteil.
  - Summen: Soll je Gliederung und gesamt aus den Summen des Kerns (Netto vor Nachlass, F4), Ist = Σ `gpIst`
    (Leistung, Bedarf aufgemessen eingeschlossen).

### Prüfung

Nach dem Merge von `integration/welle-5` (`e17df7f`): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck
&& pnpm test` grün: Vitest 181 Dateien, 2458 Tests bestanden, 3 übersprungen (keiner in `abrechnung`); Fixtures 29/29.

## Answer

Paket `@tethys/abrechnung` (Branch `welle-5/81-rechnungspruefung`), neu aus Ticket 81:

- `sollIstBerechnen(auftragsLv, aufmasse, optionen?)` → `SollIst { zeilen, gliederungen, gesamt, befunde }` (D-81.7).
- `leistungsstandBerechnen(auftragsLv, aufmasse, art)` → `{ leistungsstand: Leistungsstand; befunde: Leistungsbefund[] }`
  (D-34 (1)–(3), D-81.1–D-81.3).
- `rechnungPruefen(rechnung, auftragsLv, aufmasse, rechnungen)` → `Rechnungspruefung { leistungsstand, kette: Abzugskette,
  forderung, befunde: Rechnungsbefund[] }`; `freigabeMoeglich(rechnung, rechnungen)` → `{ moeglich, hindernisse }`.
- `rechnungBefehlAusfuehren`, `rechnungChangeSetAnwenden`, `rechnungChangeSetUmkehren` (Signaturen v1.4, D-81.6).

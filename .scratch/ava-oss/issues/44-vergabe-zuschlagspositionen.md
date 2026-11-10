# 44: Vergabe: Zuschlagspositionen im Angebot und im Preisspiegel; Fixture `typisch` auf GAEB-Form

Status: claimed
Type: task
Welle: 3 (Phase B) · Strang: V · Paket: `packages/vergabe` (benannte Ausnahmen: `fixtures/` und die Fixture-Testhelfer, siehe Grenzen)
Blocked by: 36, 37, 29
Regeln: A3, F3, F4, N1, N2, N5, Q1, Q5, C3, C4, G-26, E-03, D-03, D-04, D-05
Herkunft: D-03, D-04 (Zuschlagssatz des Bieters in `Angebotsposition`, Ticket 29), D-05 (Ausreißer bei 0,00), E-03 (Fixture `typisch` ändert sich), Ticket 36 (Bieter, Angebot, Bietersummen über das gedachte LV, Preisspiegel-Rechnung), Ticket 37 (Rechenregeln R1–R8)

## What to build

Ein Bieter bepreist eine Zuschlagsposition nicht mit einem EP, sondern mit einem **Zuschlagssatz** (D-04, Ticket 29:
`Angebotsposition.zuschlagssatz`). `vergabe` rechnet Bietersummen und Preisspiegel mit genau den Regeln des Kerns (Ticket
37), nur mit den Preisen des Bieters. Danach wird die Fixture `typisch` auf die GAEB-Form umgestellt (E-03), weil erst
jetzt Kern und Vergabe beide so rechnen. Vorgehen: TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck &&
pnpm test` grün. `okf/research/` wird nicht gelesen (C3).

Vor dem Entwurf lesen: Ticket 37 (Teil 2, Rechenregeln R1–R8, R7 „gedachtes LV“), Ticket 36 (Punkt 2 und Comments: wie
Bietersummen und Preisspiegel heute rechnen), Ticket 29 (Punkt 1 und Comments: Form von `zuschlagssatz`, Platzhalter-EP).

1. **Bietersummen über den Kern.** Ticket 36 rechnet Bietersummen über ein „gedachtes LV“ (Knoten des Ausschreibungs-LV,
   jede Position mit dem EP des Angebots) und `summenBerechnen` aus `@tethys/kern`. Dieses Ticket ergänzt nur: An jeder
   Zuschlagsposition steht im gedachten LV der Satz des Bieters als `zuschlag.prozentsatz` (`zuschlagssatz` der
   Angebotsposition, Vertrag v1.2). Den EP einer Angebotsposition mit gesetztem Satz rechnet niemand (Ticket 29, Punkt 1:
   der Erzeuger setzt dort den EP der Datei oder `0.000`); im gedachten LV bleibt er deshalb `null`. Basis, Betrag und
   „Bezug ohne Preis“ je Zuschlagsposition kommen aus `zuschlagsbasen` (Ticket 37, R7), nicht aus eigener Rechnung in
   `vergabe`. Ein Angebot zu einem LV in der Altform (Ticket 37, R8) ohne Satz des Bieters rechnet weiter Menge × EP des
   Bieters (wie heute in `typisch-angebote`).
2. **Lücken des Bieters** (Vorschlag, protokollieren als `D-xx`):
   - Zuschlagsposition ohne Satz des Bieters → wie „nicht angeboten“ (kein Betrag), eigenes Kennzeichen
     `zuschlagssatz-fehlt` im Ergebnis.
   - Eine Bezugsposition, die der Bieter nicht angeboten hat, trägt nichts zur Basis bei; die Zuschlagsposition bekommt
     das Kennzeichen `basis-unvollstaendig`.
   - Satz 0,00 ist ein angebotener Wert (Betrag 0,00), verschieden von „fehlt“ (wie EP 0,00 ≠ „nicht angeboten“).
3. **Preisspiegel** (Ergebnistypen bleiben in `vergabe`, D-04): Für eine Zuschlagsposition zeigt jede Bieterspalte Satz,
   Basis und Betrag. Virtuelle Bieter Min, Mittel, Max über die **Beträge** nach D-05 (nur Beträge > 0; 0,00 und „fehlt“
   mit eigenem Kennzeichen, nie Ausreißer; unter zwei bepreisten Bietern oder Mittel 0 keine Markierung; Schwelle 20 %,
   einstellbar). Der Schätzpreis (virtueller Bieter aus dem LV) rechnet mit `zuschlag.prozentsatz` des LV, sonst „kein
   Satz“. Rangfolge über das Netto nach Nachlass einschließlich der Zuschlagsbeträge.
4. **Goldens aus den amtlichen Dateien (D-03).** Ein Test baut LV und Angebot aus den Werten der BVBS-Prüfdatei
   (`fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84`: EP und `<Markup>10.00</Markup>` des
   Bieters; Mengen aus der zugehörigen X81; Zeilen in Ticket 37 zitiert) und erwartet für den Bieter:
   1.30.20 = **1.790,00** (Beträge 140,00 / 140,00 / 10,00), 1.30.30 = **819,10** (40,00 / 279,10). Für 1.30.10 ergibt
   sich **1.500,00** statt der 1.450,50 der Datei, weil der Positionsnachlass von 5 % an 1.30.10.30
   (`<DiscountPcnt>5.00</DiscountPcnt>`, `IT` 855,00 statt 900,00) in v1 nicht abbildbar ist (G-23, G-26): Basis 1.000,00,
   Betrag 100,00. Der Test hält beide Zahlen und den Grund fest.
5. **Fixture `typisch` auf GAEB-Form (E-03).** Bis hierher rechnet `typisch` die Zuschlagsposition 02.0050 A in der
   Altform (Menge × EP, Annahme A4, Ticket 37 R8). Umstellung (Vorschlag, Werte nachgerechnet):
   - LV: 02.0050 A bekommt `zuschlag` = Satz **8,50 %**, Bezugsform Liste mit 02.0050 (GP 6.544,88), Menge, Einheit und
     EP werden `null`. Betrag gerundet(6.544,88 × 8,5 / 100, 2) = **556,31** (vorher 554,13). Titel 02 **25.222,42**,
     Netto **55.465,59**, Nachlass 2 % **1.109,31**, Netto nach Nachlass **54.356,28**, MwSt 19 % **10.327,69**, Brutto
     **64.683,97**. Bedarfssumme 586,80 und Wahlsumme 5.880,00 kommen als Sollwerte dazu (je LV und je Titel).
   - `typisch-angebote.json`: Jeder Bieter bekommt für 02.0050 A einen `zuschlagssatz` statt eines EP (Werte per Seed
     aus dem Generator, nachvollziehbar), Sollwerte neu berechnet.
   - `gross.json`: Zuschlagspositionen ebenso in GAEB-Form (Satz per Seed, Bezug wie bisher); Sollwerte neu.
   - `erzeugen.mjs`/`rechnen.mjs` rechnen die neue Form unabhängig vom Kern (BigInt); `README.md`: Annahme A4 ersetzt
     durch die Regel aus Ticket 37 (R1–R6), mit Verweis auf D-03.
   - Fixture-Testhelfer, die das Format lesen, ziehen mechanisch nach (jede Stelle markiert
     `// Ticket 44: Fixture-Format, mechanisch`, Liste in den Comments): `packages/vertrag/src/fixtures-abbildung.test.ts`,
     `packages/speicher/src/testhilfe/fixtures.ts`, `packages/ausgabe/src/testhilfen.ts`, `packages/kern/src/testhilfen.ts`,
     `packages/ui-grid/e2e/harness/fixture-ansicht.ts`, Testhelfer in `apps/web` und `vergabe`. Nur Testcode; kein
     Produktivcode anderer Pakete. Erwartungen, die feste Zahlen der alten Fixture nennen, werden auf die neuen
     Sollwerte gesetzt, nicht abgeschwächt.

## Grenzen

- **Paket `packages/vergabe`.** Benannte Ausnahmen von P2: `fixtures/` (Generator, drei JSON-Dateien, README, Selbsttest)
  und die oben genannten Fixture-Testhelfer anderer Pakete (nur Testcode, mechanisch). Der Orchestrator merged dieses
  Ticket, wenn in `vertrag`, `speicher`, `kern`, `ausgabe` und `ui-grid` kein anderer Schreiber offen ist, oder löst
  Konflikte beim Rebase.
- `vergabe` darf `vertrag`, `dezimal`, `kern` importieren (A3), nie `gaeb` oder `speicher`.
- Keine Änderung an `vertrag` (P9); Preisspiegel-Typen bleiben in `vergabe` (D-04).
- Nur ein Nachlass je Angebot (G-26): Positions- und Gliederungsnachlässe aus GAEB gibt es nicht.
- Glossar (L2): „Zuschlagssatz“ (Satz des Bieters) trägt Ticket 29 ein; fehlt er, dieses Ticket. Die Kennzeichen `zuschlagssatz-fehlt` und `basis-unvollstaendig` sind Bezeichner, keine Fachbegriffe.
- **Zu groß?** Zuerst streichen: Punkt 5 als eigenes Folgeticket (dann bleibt die Altform in `typisch` und `gross`,
  Vermerk in den Comments und in `fixtures/README.md`), danach der Schätzpreis-Teil von Punkt 3.

## Acceptance criteria

- [x] Bietersummen einschließlich Zuschlagsbeträgen, Bedarfs- und Wahlsumme kommen aus `summenBerechnen` über das gedachte LV mit dem Satz des Bieters; keine zweite Implementierung der Zuschlagsregel in `vergabe`
- [x] Goldens aus Punkt 4: 1.790,00 und 819,10 wie in der Datei; 1.500,00 statt 1.450,50 mit festgehaltenem Grund
- [x] Lücken des Bieters (Satz fehlt, Satz 0,00, Bezugsposition nicht angeboten) je mit Test und Kennzeichen
- [x] Preisspiegel: Zuschlagszeile mit Satz, Basis, Betrag je Bieter; Min/Mittel/Max und Ausreißer nach D-05 über die Beträge; Test mit einem Bieter mit Satz 0,00
- [ ] (abgespalten, D-44.2) `typisch`, `typisch-angebote`, `gross` in GAEB-Form; Sollwerte unabhängig berechnet; `typisch` ergibt die Zahlen aus Punkt 5; alle Fixture-Verbraucher grün
- [x] Jede Demo-Entscheidung als `D-xx` in `entscheidungen-auto.md`
- [x] `pnpm lint && pnpm typecheck && pnpm test` grün (und `pnpm e2e`, weil Grid- und App-Testhelfer betroffen sind)

## Nicht-Ziele

Preisspiegel-Ansicht (V3, Welle 4), Zuschlag und Auftrags-LV (V4), X84-Import (45), Positions- oder Titelnachlass,
Excel-Rundlauf (V5), Änderungen an `vertrag`.

## Comments

### Umsetzer

- Seams (Demo-Modus, nicht mit dem Nutzer abgestimmt): `angebotSummenBerechnen`, neu `angebotZuschlaegeBerechnen`
  (Satz, Basis, Betrag, Kennzeichen je Zuschlagsposition), `angebotBefehlAusfuehrer` (`AngebotspositionSetzen`),
  `preisspiegelBerechnen`. Tests: `zuschlag.test.ts`, `bvbs.test.ts`, `preisspiegel-zuschlag.test.ts`, Property-Test in
  `eigenschaften.test.ts` um Zuschlagspositionen aller drei Bezugsformen und Sätze erweitert (dazu Minimalität).
- Gedachtes LV: an jeder Zuschlagsposition der Satz des Bieters (nie der des LV), EP dann `null`; ohne Satz der EP des
  Bieters (rechnet nur die Altform). Basis, Betrag, „Bezug ohne Preis“ aus `zuschlagsbasen`, Summen aus `summenBerechnen`.
- `AngebotspositionSetzen` inkrementell: betroffene Zuschlagspositionen (Elternknoten R3/R4, Listen R5 über einen
  Rückwärtsindex je Fabrik) rechnet `summenBerechnen` des Kerns auf einem Teil-LV; Differenzen je Betragsziel die
  Elternketten hinauf. `gross` (Altform-Listen) bleibt unter 16 ms.
- Lücken des Bieters, Satz an falscher Stelle, Preisspiegel-Zuschlagszeile: D-44.1 (auch in `PREISSPIEGEL_ANNAHMEN`).
- Goldens (BVBS 3.3 AVA X81/X84): 1.30.20 = 1.790,00, 1.30.30 = 819,10 wie in der Datei; 1.30.10 = 1.500,00 statt
  1.450,50 (Positionsnachlass 5 % an `CBHMEALA` nicht abbildbar, G-23/G-26); Grund steht im Test.
- **Punkt 5 abgespalten (D-44.2).** `typisch`, `gross`, `typisch-angebote` bleiben in der Altform (Vermerk in
  `fixtures/README.md`). Grund: Kern-Testhelfer und -Sollwerttests (Ticket 41 schreibt parallel in `kern`), dazu die
  GAEB-Export-Goldens. Verbraucher für das Folgeticket (alle Testcode): `fixtures/` (Generator, `rechnen.mjs`,
  Selbsttest, README A4); `packages/kern/src/testhilfen.ts`, `fixtures.test.ts`, `summen.test.ts`, `merkmale.test.ts`,
  `summen-leistung.test.ts`, `auftrags-lv.test.ts`, `oz-fixtures.test.ts`; `packages/vertrag/src/fixtures-abbildung.test.ts`;
  `packages/speicher/src/testhilfe/fixtures.ts` (und `fixtures/projektdatei-v2.json`, falls aus `typisch` erzeugt);
  `packages/ausgabe/src/testhilfen.ts`, `ausgabe.test.ts`, `druck.test.ts`; `packages/ui-grid/e2e/harness/fixture-ansicht.ts`
  und E2E mit festen Summen; `packages/gaeb/src/testhilfen.ts`, `schreiben.test.ts` mit
  `testdaten/golden/export/typisch-X8?-3.3.*` und `gross.sha256.json` (nicht in Ticket 44 genannt); `apps/web`
  Testhelfer; `packages/vergabe/src/testhilfen.ts` (`fxZuschlag`) und `summen.test.ts`. `GLOSSARY.md` „Altform der
  Zuschlagsposition“ nennt noch Ticket 44 als Umsteller.


# 91: Tor M4: Kettentest und E2E „LPH 6–8“

Status: claimed
Type: task
Welle: 5 · Strang: – · Ordner: `apps/web/e2e/m4.spec.ts`, `apps/web/e2e/m3.spec.ts`, `apps/web/src/m4-kette.test.ts` (neu);
kleine Reparaturen in den App-Ordnern der Welle nur mit Vermerk im Ticket
Blocked by: 73, 85, 86, 87, 88, 89
Regeln: Q2, C4, D-38, D-64.1
Herkunft: D-38 (Definition M4), Ticket 73 (M3 per X83)

## What to build

1. **Kettentest ohne Oberfläche** `apps/web/src/m4-kette.test.ts` (die App darf alle Pakete importieren): mit der Fixture
   `fixtures/typisch-abrechnung.json` (Ticket 85) den Weg `vergabe.zuschlagErteilen` → Kern → `abrechnung.nachtragUebernehmen`
   → Kern → Aufmaß (mit `mengen` gerechnet) → `sollIstBerechnen` → `rechnungPruefen` AR 1 → Freigabe → AR 2 (vor und nach
   der Korrektur) → `kosten.kostenkontrolleBerechnen`; jede Zahl gegen die Sollwerte der Fixture.
2. **E2E** `apps/web/e2e/m4.spec.ts` nach D-38, ganz über die Oberfläche: neues Projekt, LV `typisch` (per X83, wenn Ticket
   73 es trägt, sonst Testweg wie M3, D-64.1), zwei X84, Zuschlag nach der Fixture, Nachtrag N01 beauftragen, Kostengruppen
   und Kostenberechnung, Aufmaßblatt 1, Soll/Ist-Befund, AR 1 prüfen = Sollwert, freigeben, Aufmaßblatt 2, AR 2 = Sollwert,
   Korrektur an Blatt 1 ändert AR 2, nicht den eingefrorenen Wert von AR 1, Kostenkontrolle = Sollwerte, Neuladen.
   Dreimal hintereinander grün. Ist die E2E wackelig, gelten Kettentest plus eine verkürzte E2E als Tor (D-38) – im Ticket
   begründen.
3. **`m3.spec.ts` per X83** (Ticket 73): LV per X83-Rundweg statt Testweg einlesen, wenn `gaeb` es trägt.

## Grenzen

- Fehler in Paketen nicht dort beheben, sondern dem Orchestrator melden (eigenes Fix-Ticket). `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [ ] Kettentest grün; `m4.spec.ts` dreimal hintereinander grün; `m3.spec.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün, `pnpm e2e` grün

## Comments

Branch `welle-5/91-m4` (ab `integration/welle-5`). Dateien: `apps/web/src/m4-kette.test.ts` (neu), `apps/web/e2e/m4.spec.ts`
(neu), `apps/web/e2e/m3.spec.ts`, `apps/web/e2e/fixture-inhalt.ts` (`fixtureAlsX83`), `apps/web/e2e/hilfen.ts`
(`gaebEinlesen`). Keine Änderung in Paketen oder App-Ordnern anderer Tickets; kein Fehler in einem Paket gefunden: Der
Kettentest lief beim ersten Lauf bis auf eine Lesart der Fixture (Kostengruppe `null`, siehe D-91.3) grün.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-91.1** Woher kommt die X83 für M3 und M4 (D-64.1 zurückgenommen)? → **Im Test geschrieben: `schreibeGaeb` von `gaeb`
  über `fixtureInhalt('typisch')` (X83 3.3, festes Datum), dann „GAEB einlesen“ über die Oberfläche** (`fixtureAlsX83`,
  `gaebEinlesen`). Nicht die Golden-Datei von `gaeb` (Testdaten eines anderen Pakets, ändert sich mit dem Writer ohnehin
  gleich) und nicht der Export über die Oberfläche (bräuchte das LV schon im Projekt, also wieder den Testweg). So ist es
  der Rundweg Fixture → Writer → Leser der App, mit neuen Kennungen aus der App; die X84 ordnen über die OZ zu. Grund: D-73.4
  verweist die Umstellung hierher; seit Ticket 73 trägt die Wahlgruppe nach dem Rundweg ihre Grundposition (M3 mit Wahl
  grün). Reversible: yes.
- **D-91.2** Wie baut der Kettentest seine Eingaben? → **Abbildung der Fixtures mit den Testhilfen von `abrechnung`
  (`fxKnoten`, `lvZustand`, `angebot`, `fxAufmass`, `fxRechnung`; wie `nachtrag.test.ts`), jede Rechnung aber über die
  Funktionen und Befehle, die die App ruft:** LV über den Kern, Auftrags-LV über `vergabe.zuschlagErteilen` (nicht
  `m4AuftragsLv` der Testhilfen, das D-21 von Hand nachbaut), `nachtragUebernehmen` → Kern, `NachtragsangabenSetzen`,
  `KostengruppeSetzen` je Position, `KostenermittlungAnlegen` (Fixture in Vertragsform), Aufmaßblätter als `AufmassAnlegen`
  mit leerem Blatt plus `AufmasspositionSetzen` je Zeile mit der Menge aus `mengen.mengenansatzBerechnen`, Rechnungen über
  `rechnungBefehlAusfuehren` (Anlegen, `RechnungFreigeben` mit dem geprüften Zahlbetrag), Leistungsstand für die
  Kostenkontrolle über `leistungsstandBerechnen` der Rechnung mit der höchsten Nummer (wie Ticket 89). Zusätzlich die
  Gegenprobe ohne Einfrieren (AR 2 = 10.100,84 mit dem neu geprüften AR 1). Reversible: yes.
- **D-91.3** Positionen ohne Kostengruppe in der Fixture? → Die Fixture schreibt `kostengruppe: null` (nicht fehlend); der
  Test setzt dort keinen Befehl und vergleicht „fehlt am Knoten“ mit `null`. Leeres Budget in „ohne Kostengruppe“ und
  „Nachlass“: Kettentest bildet `null` → `0,00` ab und prüft `null` ausdrücklich (D-82.5 gegen D-85.3, wie der Golden-Test
  in `kosten`); die E2E erwartet dort „–“. Reversible: yes.
- **D-91.4** Zuordnung App ↔ Fixture in der E2E? → **Über die OZ** (`positionen[].oz`), weil die App beim GAEB-Import und im
  Nachtrag eigene Kennungen vergibt. Die Nachtragspositionen tragen nach dem Beauftragen 04.01.0010/04.01.0020 (D-80.1,
  geprüft). Kostengruppen am Auftrags-LV je Gruppe über die Häkchen der Zeilen (sechs Schritte, `Setzen`), danach jede Zeile
  des Dialogs gegen die Fixture. Reversible: yes.
- **D-91.5** Testweg in der E2E? → Nur Lesen: `leerlauf` und `projektdatei`, um die Excel-Rücklaufdatei des
  Nachtragsangebots aus dem gespeicherten Nachtrags-LV mit den EP der Fixture zu bauen (wie D-86.9). Alles andere (LV,
  Angebote, Zuschlag, Nachtrag, Budget, KG, Blätter, Rechnungen, Freigabe, Korrektur) läuft über die Oberfläche; die
  Aufmaßblätter über die Mengenermittlung aus Ticket 87 (Ausdrücke getippt, Zeilenergebnisse und Summe im Panel gegen die
  Fixture), nicht über den Testweg wie in `rechnung.spec.ts` (D-88.3). Reversible: yes.
- **D-91.6** Umfang der E2E? → **Zahlen und Neuladen, kein Undo/Redo.** Rückgängig/Wiederholen prüfen die Tickets 86–89
  je Seite; M4 prüft jede Zahl der Kette (Summen, Zeilenergebnisse, Soll/Ist samt Befundtext, jede Zeile der Abzugskette,
  eingefrorener Betrag und Befund `freigabe-abweichend` an AR 1, jede Zeile der Kostenkontrolle) und nach dem Neuladen
  Kostenkontrolle, AR 2, AR 1, Blatt 1 und Soll/Ist. Zwei X84 (A und B) wie D-38, Zuschlag an B ohne Wahl (D-85.1).
  Reversible: yes.
- **D-91.7** Wie die E2E schreiben, solange 87 und 88 laufen? → Gegen einen lokalen Probe-Merge der Branches 87 und 88
  (`tmp/91-probe`, nicht im Ticket-Branch, Konflikte nur an den Einhängestellen); in den Ticket-Branch kommt nur
  `m4.spec.ts`. Der Lauf im Ticket-Branch zählt erst nach dem Merge von 87 aus `integration/welle-5`. Reversible: yes.

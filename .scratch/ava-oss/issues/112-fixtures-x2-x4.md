# 112: Fixtures: Sollwerte für die Tore X2, X3, X4

Status: done-by-agent
Type: task
Welle: 6 · Strang: F · Paket: `fixtures/`
Blocked by: 99 (gleicher Ordner); 97 nur für Punkt 3 (Formen der Mängel und des Bautagebuchs)
Modell: opus
Regeln: C4, N1–N3, D-56, D-57, D-58
Herkunft: `plan.md` §4 (Tore X2, X3, X4; D-58)

## What to build

Drei Fixture-Dateien in der Form der Vertragstypen (v1.6; für Bauzeitenplan und Honorar gelten bis zum Merge von 97 die Typen der
gemergten Pakete `bauzeit` und `honorar`, die 97 übernimmt; Punkt 3 erst nach dem Merge von 97), je mit **unabhängig von Hand hergeleiteten** Sollwerten und
Herleitung (C4), dazu eine eigene Nachrechnung in `fixtures.test.mjs` (wie `rechnen.mjs`, ohne die Pakete).

1. **`fixtures/bauzeit.json`:** ein Plan mit 6–8 Vorgängen, allen vier Anordnungsarten, einem Abstand 0 und einem negativen,
   einem Meilenstein, einem Sammelvorgang, einem Feiertag und einem Wochenende auf dem kritischen Weg (Bundesland und Jahr
   nennen); Sollwerte: Beginn/Ende je Vorgang, Puffer, kritischer Weg, Projektende. Lesarten wie Ticket 102 (`BAUZEIT_ANNAHMEN`
   im Paket, falls gemergt; sonst die Lesarten aus Ticket 102 und D-57).
2. **`fixtures/honorar.json`:** Gebäude, Honorarzone III, Honorarsatz 50 % (so benannt), anrechenbare Kosten aus einer
   Kostenberechnung mit KG 300 und KG 400, wobei KG 400 über 25 % der sonstigen anrechenbaren Kosten liegt (beide Zweige von
   § 33 Abs. 2) und die anrechenbaren Kosten streng zwischen zwei Tafelzeilen liegen; LPH 1–9; Umbauzuschlag; Nebenkosten in
   Prozent; USt 19 %. Die Tafelzeilen und Phasenanteile **selbst** aus `https://www.gesetze-im-internet.de/hoai_2013/` abschreiben
   (§ 35, § 34; unabhängig vom Paket `honorar`), Rundungskette D-56; Sollwerte je Schritt.
3. **`fixtures/bauleitung.json`:** fünf Mängel an zwei Auftragnehmern mit Fristen und Verläufen, ein Stichtag, an dem genau
   einer überfällig ist (und einer mit Frist genau am Stichtag, nicht überfällig); drei Bautagebucheinträge mit Arbeitskräften;
   Sollwerte der Auswertungen.
4. `fixtures/README.md` ergänzen.

## Grenzen

- Nur `fixtures/`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Drei Dateien mit Herleitung; `node --test "fixtures/*.test.mjs"` grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

- **D-112.1 Von Hand geschrieben, nicht erzeugt.** Frage: Erzeugt `erzeugen.mjs` die drei Dateien wie die übrigen Fixtures?
  Entscheidung: Nein. Eingaben und Sollwerte stehen von Hand in den JSON-Dateien, je mit einem Feld `herleitung` (Rechenweg
  Schritt für Schritt). Die zweite, unabhängige Rechnung steht in `fixtures.test.mjs` (eigener Kalender mit Osterformel und
  Feiertagsliste, eigene Vorwärts- und Rückwärtsrechnung, HOAI-Kette in ganzen Cent mit `rechnen.mjs`, eigene Auswertung der
  Mängel und des Bautagebuchs); sie importiert kein Paket. Grund: Erzeugte Sollwerte wären die Ausgabe desselben Codes, den
  der Test prüft; so stehen sich Handrechnung und Code gegenüber (C4). Die Liste in Test (a) bleibt unverändert. Reversible:
  yes.
- **D-112.2 Ganze Zahlen als JSON-Zahl.** Frage: D-85.4 schreibt ganze Zahlen des Vertrags als Text. Gilt das hier?
  Entscheidung: Nein für diese drei Dateien. Dauer, Abstand, Puffer, Wochentage, Phasennummer, Mangelnummer, Köpfe, Grad und
  die Zähler der Auswertungen sind in den Typen `number` (N1 gilt nicht); als JSON-Zahl sind die Eingaben den Typen direkt
  zuweisbar (die Pakete rechnen sie ohne Umwandlung). Beträge und Prozente bleiben kanonischer Text mit 2 Stellen. Ein Test
  erlaubt JSON-Zahlen nur an den genannten Feldern und nur ganzzahlig. Reversible: yes.
- **D-112.3 Bauzeitenplan.** Entscheidung: Sachsen 2026 (Montag bis Freitag), weil der Buß- und Bettag nur in Sachsen gilt und
  sein Datum aus einer Regel folgt (Mittwoch vor dem 23. November; SächsSFG § 1 Abs. 1 nennt kein Datum, Lesart über § 2 Nr. 2
  Totensonntag); ein falsches Land oder eine fehlende Landesregel verschiebt das Projektende. Projektbeginn So 01.11.2026
  (prüft „erster Arbeitstag danach“). Acht Vorgänge: Sammelvorgang 1 mit 1.1–1.3, Meilenstein 2 nach einem Freitag (D-63),
  Anfang-Anfang +2, Ende-Anfang −1 und 0, Anfang-Ende 0, Ende-Ende +2; jede Art bestimmt einen Termin (Spielraum 0, im Test
  geprüft). Bei Vorgang 4 ist der freie Puffer 0 und der Gesamtpuffer 4. Gegenprobe ohne Land: Projektende einen Arbeitstag
  früher. Form: `Bauzeitenplaneingabe` des Pakets plus `id`, `projektId`, `name` und je Vorgang `bezug: null` (geplanter
  v1.6-Typ, im Branch von 97 Pflichtfeld); Sollwerte als `Bauzeitenplanergebnis` des Pakets mit `id` je Vorgang. Hinweis für
  109: Der v1.6-Entwurf in Ticket 97 nennt die Kennung im Ergebnis `vorgangId` und die Befunde `Pruefbefund`; hier sind keine
  Befunde. Reversible: yes.
- **D-112.4 Honorar.** Entscheidung: anrechenbare Kosten zwischen den Zeilen 1.000.000 und 1.500.000 (der Golden-Fall von
  Ticket 101 liegt zwischen 750.000 und 1.000.000), Zahlen so gewählt, dass sechs Rundungen genau auf einen halben Cent fallen
  (Grenze 25 %, Hälfte, Honorar, LPH 6, Umbauzuschlag, MwSt) und das Grundhonorar 1 Cent über dem Honorar liegt; Umbauzuschlag
  25 % (unter 33 %, kein Befund), Nebenkosten 4,50 %. Die Kostenberechnung steht in der Vertragsform `Kostenermittlung` nur mit
  Einträgen der zweiten Ebene (KG 300 = Σ 3xx, KG 400 = Σ 4xx); KG 210 und 520 zählen nicht, KG 610 kommt als `weitereKosten`
  nach § 33 Abs. 3 von Hand (D-56). Tafelzeilen und Phasen selbst von `gesetze-im-internet.de` (§ 35 Abs. 1, § 34 Abs. 3)
  abgeschrieben, abgerufen 2026-11-12; der Name der LPH 8 trägt den Halbgeviertstrich der Quelle. Form: `Honorarberechnung`
  und `Honorarergebnis` des Pakets (Zone `'III'`, Phasen `{ nummer }`, `umbauzuschlagssatz`). Reversible: yes.
- **D-112.5 Bauleitung in der Form des Ticket-97-Texts.** Frage: 97 war beim Schreiben nicht auf `integration/welle-6`
  gemergt (der Branch von 97 hatte X1 und X2, noch keine Typen für X4). Entscheidung: Formen nach Ticket 97 Punkt 6 (`Mangel`
  mit `nummer`, `auftragsLvId`, `positionId`, `bauteil`, `festgestellt`, `frist`, `verlauf: { status, datum, bemerkung }[]`;
  `Bautagebucheintrag` mit `wetter { beschreibung, temperaturMin, temperaturMax }`, `arbeitskraefte { firma, anzahl }[]` und
  den Textfeldern). Weicht v1.6 ab, passt Ticket 111 oder 120 die Datei mechanisch an; die Sollwerte hängen nicht an Namen.
  Lesarten (für 111 und 120): Status = letzter Verlaufseintrag; überfällig = Frist streng vor dem Stichtag und Status offen
  oder angezeigt (Ticket 111 Punkt 2); „offen“ in der Auswertung = Status offen oder angezeigt (dieselbe Menge wie bei der
  Fristprüfung), die Zahl je Status steht daneben; der Auftragnehmer folgt aus dem Auftrags-LV (Liste `auftraege`, wie die App
  ihn übergibt); alle Verlaufseinträge liegen vor dem Stichtag, damit die offene Frage „Status am Stichtag oder letzter
  Eintrag“ die Sollwerte nicht berührt; Bautagebuch je Zeitraum mit beiden Grenzen, Tage ohne Eintrag fehlen, Firmen nach
  Namen. Reversible: yes.
- **D-112.6 Gegenprobe gegen die Pakete.** Ein Wegwerf-Test (nicht committet) hat `bauzeitenplanBerechnen` mit
  `bauzeit.json` (samt Gegenprobe ohne Land) und `honorarBerechnen` mit `honorar.json` gerechnet: Beide Ergebnisse sind gleich
  den Sollwerten, keine Abweichung. `bauleitung` gibt es noch nicht.

### Ergebnis

Dateien: `fixtures/bauzeit.json`, `fixtures/honorar.json`, `fixtures/bauleitung.json` (neu), `fixtures/fixtures.test.mjs`
(11 neue Tests: Kalender und Osterformel, Abdeckung des Tors je Datei, Nachrechnung, Gegenproben, JSON-Zahlen),
`fixtures/README.md` (Abschnitte „Bauzeitenplan: Tor X2“, „Honorar: Tor X3“, „Bauleitung: Tor X4“, Tabelle der Dateien).

Wichtigste Sollwerte:

- **X2:** Sachsen 2026, Projektbeginn So 01.11. → Mo 02.11.2026; Projektende **Di 24.11.2026**; kritischer Weg 1.1 → 1.2 →
  1.3 → 2 → 3 mit dem Buß- und Bettag 18.11. und drei Wochenenden; Meilenstein Mo 16.11.; Vorgang 4 GP 4 / FP 0, Vorgang 5
  GP 4 / FP 4. Ohne Land: Projektende Mo 23.11.2026.
- **X3:** aK 1.373.618,34 (Grenze 255.864,20, Hälfte 44.907,36); Zone III von 153.213,18, bis 191.086,11; Honorar (50 %)
  172.149,65; Grundhonorar 172.149,66; Umbauzuschlag 43.037,42; Nebenkosten 9.683,42; Netto 224.870,50; MwSt 42.725,40;
  **Brutto 267.595,90**.
- **X4:** Stichtag Do 26.11.2026: überfällig genau Mangel 3 (Frist 25.11.), Mangel 5 mit Frist am Stichtag nicht; je
  Auftragnehmer Rohbau 3 Mängel / offen 2 / überfällig 1, Tiefbau 2 / 1 / 0; nächste Nummer 6; Bautagebuch 16.–20.11.: je Tag
  9, 8, 9, je Firma 2 / 19 / 5, Summe 26.

Suite (Branch `welle-6/112-fixtures-x2-x4` nach Merge von `integration/welle-6` @ `31b55a1`):
`NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` grün (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean-Room);
`pnpm typecheck` grün; `pnpm test`: Vitest 248 Dateien grün, 1 übersprungen, 3.169 Tests grün, 3 übersprungen;
`node --test "fixtures/*.test.mjs"` 53 von 53 grün.

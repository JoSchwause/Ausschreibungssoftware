# 85: Fixture M4: Nachtrag, Aufmaß, Rechnungen, Kostenkontrolle mit hergeleiteten Sollwerten

Status: resolved
Type: task
Welle: 5 · Strang: F · Paket: `fixtures/`
Blocked by: 70, 75
Regeln: C4, N2, N3, N5, E-06, E-07, F4, D-21, D-34, D-35, D-37, D-38
Herkunft: D-38 (Tor M4)

## What to build

Eine Fixture `fixtures/typisch-abrechnung.json` (Form wie `typisch-angebote.json`, Feldnamen wie die Typen aus `vertrag`
v1.4, wo es geht) mit **unabhängig hergeleiteten** Sollwerten für den M4-Weg (D-38). Die Rechnung dafür steht im
Selbsttest der Fixtures (`fixtures/rechnen.mjs` bzw. `fixtures.test.mjs`), ruft nie `kern`, `vergabe`, `abrechnung` oder
`kosten` auf, und jede Zahl hat ihren Rechenweg als Kommentar mit Regel (N2, N5, D-34, VOB/B § 2 Abs. 3).

Inhalt (Kennungen fest, UUIDv7-Form wie die übrigen Fixtures):

1. **Zuschlag:** an einen Bieter aus `typisch-angebote.json` mit **Prozent-Nachlass** (D-38): Bieter B (3,00 %) – dessen nicht
   angebotene Position wird nicht aufgemessen –, oder ein anderer Weg, begründet. Auftrags-LV-Summen als Sollwert (nach D-21).
2. **Nachtrag N01:** Nachtrags-LV mit 2 Positionen (Menge, Einheit, Kurztext erfunden), Angebot des Auftragnehmers mit EP;
   erwartete Knoten nach Übernahme (Gliederung „Nachtrag N01“, OZ nach D-35) und Summen des Auftrags-LV danach.
3. **Kostengruppen:** Zuordnung für die meisten Positionen (mindestens zwei KG der Ebene 3 unter verschiedenen Ebene-2-Gruppen,
   eine Position auf Ebene 2), mindestens eine Position ohne KG; eine **Kostenberechnung** als Budget (Einträge erfunden).
4. **Aufmaßblatt 1** (Formel-91-Ausdrücke mit erwarteten Zeilenergebnissen, 3 Stellen) mit einer Nachtragsposition und einer
   Position > 110 % der Auftragsmenge; **Aufmaßblatt 2**; eine **Korrektur** an Blatt 1 nach Freigabe von AR 1.
5. **Abschlagsrechnung 1** (Blatt 1; eine Umlage, z. B. 0,50 %; Sicherheitseinbehalt, z. B. 5,00 %) mit allen Zwischenwerten
   der Kette (D-34) und Zahlbetrag; **Abschlagsrechnung 2** (Blätter 1+2 kumuliert) vor und nach der Korrektur, jeweils mit
   eingefrorenem Zahlbetrag von AR 1.
6. **Soll/Ist:** erwartete Befunde (genau ein `ueber-schwelle`, kein `unter-schwelle`).
7. **Kostenkontrolle:** erwartete Zeilen je KG (Budget, Vergabe, Abrechnung, Abweichung), „ohne Kostengruppe“, „Nachlass“,
   Gesamt (D-37), für den Stand nach AR 2.

## Grenzen

- Nur `fixtures/` (nicht `fixtures/extern/`). `okf/research/` wird nicht gelesen (C3). Werte erfunden, keine echten Namen.

## Acceptance criteria

- [x] Selbsttest rechnet jeden Sollwert unabhängig nach; README der Fixtures ergänzt
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

Branch `welle-5/85-fixture-m4` (ab `welle-5/70-vertrag-v1.4`, danach `integration/welle-5` samt v1.4-Review gemergt).
Dateien: `fixtures/typisch-abrechnung.json` (neu, erzeugt), `fixtures/erzeugen.mjs` (Eingaben `M4`, `erzeugeAbrechnung`),
`fixtures/rechnen.mjs` (`kumulierteMengen`, `leistungsstandBerechnen`, `abschlagsketteBerechnen`, `sollIstBerechnen`,
`kostenkontrolleBerechnen`, `formatMitVorzeichen`), `fixtures/fixtures.test.mjs` (sieben neue Tests), `fixtures/README.md`
(Abschnitt „M4-Abrechnung“). Die übrigen Fixtures bleiben byte-gleich.

Vorgehen (TDD): Selbsttest zuerst mit den von Hand hergeleiteten Literalen und einer eigenen Gegenrechnung (rot,
`adb0e10`), dann Erzeugung (grün, `00a2be4`). Die Gegenrechnung im Test nutzt nur `parse`/`format`/`gesamtpreis`/
`prozentVon` und rechnet Formel 91 mit einem eigenen kleinen Rechner (Zahlen mit Komma, + - * und Klammern; keine
Division, damit keine Zwischenrundung auf 10 Stellen ins Spiel kommt). Nie `kern`, `vergabe`, `abrechnung`, `kosten`,
`mengen`.

Rundungsfälle genau auf der Hälfte (kaufmännisch): GP 0,500 × 1.951,750 = 975,875 → 975,88; Formel 91 `2,5*1,75*0,3` =
1,3125 → 1,313; MwSt AR 1 1.499,385 → 1.499,39; Prozent-Nachlass AR 2 vor der Korrektur 521,865 → 521,87; Einbehalt AR 2
nach der Korrektur 1.002,385 → 1.002,39. Kein Prozent-Nachlass geht glatt auf (1.750,7559; 1.794,1131; 244,0671; 521,865;
521,0355).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-85.1** Welcher Zuschlag? **Bieter B (3,00 %), keine Wahlposition gewählt** (`gewaehlt: []`): Nach D-21 entfällt die
  Alternative 02.0070 A, die Grundposition 02.0070 bleibt, Bedarf 01.0040 bleibt Bedarf, 03.0070 (von B nicht angeboten)
  hat keinen EP und wird nie aufgemessen. Grund: D-38 verlangt den Prozent-Nachlass; die Wahl prüft schon das Tor M3, sie
  hier zu wiederholen brächte nur mehr Fläche. B ist im Preisspiegel Rang 2; die M3-Datei liest A und B ein, also ist B
  auf dem E2E-Weg vorhanden.
- **D-85.2** OZ der übernommenen Nachtragsknoten? **Die neue Gliederung bekommt die nächste freie OZ der obersten Stufe
  (`04`), der Baum des Nachtrags behält seine OZ mit dieser davor** (`01` → `04.01`, `01.0010` → `04.01.0010`; Maske
  `NN.NN.NNNN[I]` passt). Grund: D-35 nennt nur die OZ der Gliederung; das Beispiel in `vertrag`
  (`beispielNachtragUebernehmen`, `02` → `02.01` → `02.01.0010`) liest es ebenso. Annahme: Entscheidet Ticket 80 anders,
  gelten Kennungen, Lage, EP und alle Summen weiter, nur die OZ-Texte in `uebernahme.knoten`, `positionen[].oz` und
  `gliederungen[].oz` sind anzupassen.
- **D-85.3** Zeilen und leere Zellen der Kostenkontrolle? **Zeilen = alle KG aus Budget und Positionen samt Vorfahren aus
  den Ziffern (D-24), nach Nummer; Budget ohne Eintrag 0,00 (auch „ohne Kostengruppe“ und „Nachlass“); Abweichung =
  Vergabe − Budget in jeder Zeile.** Vergabe nur zählende Positionen (F4: Bedarf 01.0040 ohne Gesamtbetrag zählt nicht),
  ohne EP 0; Abrechnung = `Leistungsstand.gp` der Rechnung mit der höchsten Nummer (AR 2 nach der Korrektur; Bedarf zählt,
  weil aufgemessen). Grund: So gehen Ebene 1 + ohne KG + Nachlass je Spalte auf den Cent auf (Property von Ticket 82);
  Ticket 82 darf leere Zellen anders anzeigen, die Zahlen bleiben.
- **D-85.4** JSON-Zahlen für die ganzen Zahlen des Vertrags (`nummer`, `zeile`, `formel`)? **Nein, Text** wie der Rang
  (Ticket 69; „keine JSON-Zahlen in den Fixtures“); Verbraucher bilden mit `Number(…)` ab. Ebenso `gliederungReihenfolge`.
- **D-85.5** Welche Soll/Ist-Zeilen? **Nur Positionen mit Aufmaß** (Soll, Ist, Anteil = round_half_up(Ist / Soll × 100, 2));
  Positionen ohne Aufmaß haben Ist 0 und ohne Schlussrechnung keinen Befund. Grenzfall absichtlich: 04.01.0010 nach Blatt 2
  genau 110,00 %, kein Befund (D-35: streng).
- **D-85.6** EP im Nachtrags-LV? **Keine (EP `null`)**, die EP stammen aus dem Nachtragsangebot des Auftragnehmers;
  Nachtragsstatus vor der Übernahme `angeboten`, danach `beauftragt` (D-35: erst übernehmen, dann beauftragen).
- **D-85.7** `gefordert`? **`null` in beiden Rechnungen** (gültig auch in der Form nach D-44). Grund: Ob die Forderung
  kumuliert ist, ist offen (Offene Typfrage 8 zu Ticket 70); kein Befund nötig für M4.
- **D-85.8** Wo stehen die Kostengruppen? **Am Auftrags-LV** (`KostengruppeSetzen` als AuftragsLvBefehl, nach Zuschlag und
  Nachtrag). Grund: Das LV kommt im E2E per X83 ohne KG; die Kostenkontrolle liest das Auftrags-LV.

### Annahmen zu den Typen von v1.4 (Feldnamen)

Stand nach dem Review (`integration/welle-5` bis `6ab0857`): `Aufmass` (`id, projektId, auftragsLvId, nummer, bezeichnung,
datum, positionen[{positionId, mengenansatz[{zeile, formel, ausdruck, variable}] | null, menge}]`), `Rechnung` (alle
Felder; `gefordert` in der Form von D-44, hier `null`), `Leistungsstand` (`positionen[{positionId, menge, gp}], leistung,
nachlass, nettoNachNachlass`), `Kostenermittlung` (`id, projektId, stufe, name, eintraege[{nummer, betrag, bemerkung?}]`),
`Nachtragsangaben` (`auftragsLvId, nummer, status`), `NachtragUebernehmen` (`art, nachtragLvId, knoten`; Knoten im
Fixture-Format, abbildbar wie `apps/web/e2e/fixture-inhalt.ts`). Das Review hat nur `gefordert` in der Form geändert.
Die Namen der Prüfkette (`kette`), der Soll/Ist-Zeilen und der Kostenkontrolle sind Fixture-Namen; Ticket 81 und 82
legen ihre eigenen Typen fest und bilden ab.

### Prüfung

`NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün nach dem Merge von
`integration/welle-5`: Vitest 154 Dateien (1 übersprungen), 2.175 Tests bestanden, 2 übersprungen wie zuvor; Fixtures
29/29.

## Answer

Merged: af7c74c in integration/welle-5


Fixture `fixtures/typisch-abrechnung.json` (Tor M4, D-38) mit hergeleiteten Sollwerten; Rechenweg in README
(„M4-Abrechnung“) und als Kommentar im Selbsttest; Lesarten D-85.1 bis D-85.8 oben.

**Sollwerte**

| Wert | Netto | Nachlass 3 % | Netto n. N. | MwSt 19 % | Brutto |
|---|---|---|---|---|---|
| Auftrags-LV vor Nachtrag (Zuschlag B, D-21) | 58.358,53 | 1.750,76 | 56.607,77 | 10.755,48 | 67.363,25 |
| Auftrags-LV nach Nachtrag N01 (+ 922,49 + 522,75) | 59.803,77 | 1.794,11 | 58.009,66 | 11.021,84 | 69.031,50 |

| Rechnung | Leistung | Nachlass | Netto n. N. | MwSt | Brutto kum. | Umlage 0,50 % | Einbehalt 5 % | frühere | Zahlbetrag |
|---|---|---|---|---|---|---|---|---|---|
| AR 1 (Blatt 1, freigegeben) | 8.135,57 | 244,07 | 7.891,50 | 1.499,39 | 9.390,89 | 46,95 | 469,54 | 0,00 | **8.874,40** |
| AR 2 vor Korrektur | 17.395,50 | 521,87 | 16.873,63 | 3.205,99 | 20.079,62 | 100,40 | 1.003,98 | 8.874,40 | **10.100,84** |
| AR 2 nach Korrektur | 17.367,85 | 521,04 | 16.846,81 | 3.200,89 | 20.047,70 | 100,24 | 1.002,39 | 8.874,40 | **10.070,67** |

Gegenprobe ohne Einfrieren: AR 1 neu 8.844,23, AR 2 dann 10.100,84 (die Korrektur verschwände). Soll/Ist: genau ein
`ueber-schwelle` (02.0040, 112,50 %), kein `unter-schwelle`, in allen drei Ständen. Kostenkontrolle (Stand AR 2 nach
Korrektur), Gesamtzeile: Budget **60.900,00**, Vergabe **58.009,66**, Abrechnung **16.846,81**, Abweichung **−2.890,34**;
Nachlasszeile −1.794,11 / −521,04; ohne Kostengruppe 722,28 / 348,50.

**Feldnamen für die Verbraucher** (Ticket 81: Golden gegen die Fixture; Ticket 91: Kettentest und E2E)

- Zuordnung über die OZ: `positionen[{positionId, oz, kurztext, kostengruppe}]`, `gliederungen[{id, oz, kurztext}]`.
- Zuschlag: `zuschlag.{angebotId, bieterId, bieterName, gewaehlt, auftragsLvId, nachlass, entfallen, ohnePreis, sollwerte}`
  (Sollwerte wie in `typisch.json`: `positionen`, `titel`, `summen`, `ausweise`).
- Nachtrag: `nachtrag.lv` (Fixture-LV mit `nachtrag`), `nachtrag.angebot` (Angebotsform), `nachtrag.uebernahme.{art,
  nachtragLvId, gliederungReihenfolge, knoten}`, `nachtrag.sollwerte` (Auftrags-LV danach), `nachtrag.statusNachUebernahme`.
- Aufmaß: `aufmasse[i].aufmass` (Vertragsform `Aufmass`), `aufmasse[i].zeilenergebnisse[positionId]`;
  `korrektur.{aufmassId, befehl (AufmasspositionSetzen), zeilenergebnisse, aufmassNachher}`.
- Rechnungen: `rechnungen[]` (Vertragsform `Rechnung`, AR 1 mit `freigabe.zahlbetrag`); Prüfung:
  `pruefungen.{ar1, ar2VorKorrektur, ar2NachKorrektur}.{rechnungId, korrigiert, leistungsstand (Vertragsform), kette}` mit
  `kette.{leistung, nachlass, nettoNachNachlass, mwst, bruttoKumuliert, umlagen[{bezeichnung, satz, betrag}], einbehalt,
  fruehereZahlbetraege, zahlbetrag}`; `gegenprobeOhneEinfrieren.{ar1Zahlbetrag, ar2Zahlbetrag}`.
- Soll/Ist: `sollIst.{nachBlatt1, nachBlatt2, nachKorrektur}.{aufmassIds, korrigiert, zeilen[{positionId, soll, ist,
  anteil}], befunde[{positionId, art, anteil}]}`.
- Kosten: `kostenermittlung` (Vertragsform), `kostenkontrolle.{rechnungId, kostenermittlungId, zeilen[{kostengruppe, budget,
  vergabe, abrechnung, abweichung}], ohneKostengruppe, nachlass, gesamt}`; negative Beträge als `"-1794.11"`.
- Ganze Zahlen (`nummer`, `zeile`, `formel`, `gliederungReihenfolge`) sind Text, beim Abbilden `Number(…)` (D-85.4).

Offen für andere Tickets: die OZ-Lesart der Nachtragsknoten (D-85.2) bestätigt oder ändert Ticket 80.

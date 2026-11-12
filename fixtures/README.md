<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 Tethys AVA contributors
-->

# Fixtures v1

Selbst verfasste, erfundene Leistungsverzeichnisse (LV) mit Sollwerten (Ticket 19, Regeln C1, C4, N2, N3).
Keine echten Namen, keine STLB- oder DIN-Katalogtexte. Das JSON ist ein **Fixture-Format**; die endgültigen
Typen liegen in `packages/vertrag` (Ticket 02).

## Erzeugen und prüfen

```
node fixtures/erzeugen.mjs        # schreibt alle JSON- und X84-Dateien neu
node --test                       # im Wurzelverzeichnis; oder: node --test "fixtures/*.test.mjs"
```

`node --test fixtures/` (Verzeichnis als Argument) funktioniert unter Node 22 nicht, dort wird das Argument als
Moduldatei gelesen. Das Erzeugungsskript ist deterministisch (eigener Seed-PRNG, feste IDs, kein `Date.now()`, kein
`Math.random()`) und rechnet Geld und Mengen ausschließlich mit BigInt-Festkommazahlen (`rechnen.mjs`).

## Dateien und Herkunft

| Datei | Inhalt | Herkunft |
|---|---|---|
| `winzig.json` | 1 Titel, 3 Positionen, Netto 2.565,00 | selbst verfasst, vom Skript erzeugt |
| `typisch.json` | 3 Titel, 25 Positionen, 2 Hinweistexte, MwSt 19 %, Nachlass 2,00 %; Netto 55.465,59, Brutto 64.683,97 | selbst verfasst, Daten im Skript, Sollwerte berechnet |
| `typisch-angebote.json` | 3 Bieter (A, B, C) mit Angeboten zu `typisch`, je ein Zuschlagssatz an 02.0050 A; Ausreißer nach D-05 (Ticket 75); Preisspiegel-Sollwerte (Ticket 69) | selbst verfasst, Preise und Sätze per Seed gestreut |
| `angebote/typisch-bieter-{a,b,c}.x84` | die drei Angebote als GAEB DA XML 3.3, Phase 84 (Ticket 69) | vom Skript aus `typisch-angebote.json` erzeugt, eigener XML-Baustein |
| `typisch-abrechnung.json` | Tor M4 (D-38, Ticket 85): Zuschlag an Bieter B, Nachtrag N01, zwei Aufmaßblätter und eine Korrektur, AR 1 und AR 2, Soll/Ist, Kostenberechnung und Kostenkontrolle; Zahlbetrag AR 1 8.874,40, AR 2 10.100,84 / 10.070,67 | selbst verfasst, Eingaben im Skript, Sollwerte berechnet (siehe „M4-Abrechnung“) |
| `gross.json` | 5.000 Positionen, 5 Titelebenen (5 × 3 × 3 × 3 × 3 Titel), Seed `fixtures-v1/gross`, Zuschlagssätze aus Seed `fixtures-v1/gross/zuschlagssatz` | vollständig erzeugt, nicht von Hand gepflegt |
| `handbeispiele.json` | Hand-Beispiele aus Ticket 19 und 07 mit Zwischenwerten | selbst verfasst, vom Skript erzeugt |
| `zuschlag.json` | Zuschlagspositionen in GAEB-Form, alle drei Bezugsformen, Einheitspreisanteile; Netto 6.850,60, Brutto 8.152,21 (Ticket 37) | selbst verfasste Texte, Zahlen aus BVBS 3.3 AVA X86 Bereich 1.30 und 1.10.30.20 (D-03), Sollwerte vom Skript berechnet |
| `erzeugen.mjs`, `rechnen.mjs`, `fixtures.test.mjs` | Generator, Dezimalrechnung, Selbsttest | selbst verfasst |

Lizenz: AGPL-3.0-or-later (REUSE-Abdeckung über den Repo-weiten Glob für `fixtures/**`).

## JSON-Form

Dezimalwerte sind **Strings** in kanonischer Punktnotation mit allen Nachkommastellen (`"1.235"`, `"10.000"`,
`"12.35"`), nie JSON-Zahlen. Stellen: Menge 3, EP 3, Prozent 2, Betrag 2 (N3).

```
LV:      { schemaVersion, art:"leistungsverzeichnis", id, name, ozMaske, mwstSatz, nachlass|null, knoten[], sollwerte }
Knoten:  flach, in Dokumentreihenfolge; parentId = LV-ID oder Titel-ID; Reihenfolge der Geschwister = Arrayreihenfolge
  titel:    { id, parentId, art:"titel", ordnungszahl, kurztext }
  position: { id, parentId, art:"position", positionsart:"normal|bedarf|wahl|zuschlag", ordnungszahl, [ozIndex],
              kurztext, langtext, menge, einheit, einheitspreis, [bedarfMitGesamtbetrag], [grundpositionId], [zuschlag] }
  hinweis:  { id, parentId, art:"hinweis", text }
  Zuschlagsposition (GAEB-Form, alle Dateien seit Ticket 51): positionsart:"zuschlag", menge/einheit/einheitspreis: null,
              zuschlag: { prozentsatz, bezug: {art:"gliederung"} | {art:"kennzeichnung"} | {art:"positionen", positionen:[{positionId, teilmenge}]} }
              (Form wie im Vertrag; `typisch` und `gross` nutzen nur die Liste mit einer Bezugsposition, ohne Teilmenge)
Nachlass: { art:"prozent"|"betrag", wert }
Sollwerte: { positionen:{id:{gp, inSumme}}, titel:{id:{summe}}, summen:{netto, nachlass, nettoNachNachlass, mwst, brutto}, nichtAngeboten:[id] }
  `gp` einer Zuschlagsposition ist ihr Betrag.
  typisch, gross, Angebote (Ticket 51) zusätzlich: zuschlaege:{id:{basis, betrag}},
              ausweise:{gesamt:{summeBedarfOhneGesamtbetrag, summeWahl}, titel:{id:{summeBedarfOhneGesamtbetrag, summeWahl}}}
  zuschlag.json (Ticket 37, additiv; die übrigen Dateien tragen diese Felder nicht):
  position: [zuschlagskennzeichen: true], [epa: { lohn, stoffe, geraete, nachunternehmer, sonstiges, frei, freiBezeichnung }]
  Sollwerte zusätzlich: zuschlaege:{id:{basis, betrag}}, epa:{gesamt:{lohn,…,frei}, titel:{id:{lohn,…,frei}}}
Angebotsset: { schemaVersion, art:"angebotsset", lvId, lvName, bieter[{id,name}],
               angebote[{id, bieterId, nachlass|null, positionen[{positionId, status, [einheitspreis], [zuschlagssatz]}], sollwerte}],
               ausreisserAnnahmeA7, preisspiegel }
ausreisserAnnahmeA7 (Ticket 75, nach D-05): { schwellePromille:"200", regel, jeAngebot:{angebotId:[positionId]} }
  Positions-IDs je Angebot in Dokumentreihenfolge, alle drei Angebote zusammen verglichen (siehe A7).
Preisspiegel (Ticket 69, additiv): { regel,
               bieter[{angebotId, bieterId, name, datei, summen:{netto, nachlass, nettoNachNachlass, mwst, brutto}, titel:{OZ: summe}}],
               vergleiche[{angebotIds[], rang:{angebotId: "1"}, virtuelleSummen:{min, mittel, max, schaetzpreis}}] }
  `vergleiche`: alle drei Angebote, dann die Paare A+B, A+C, B+C (das Tor M3 liest zwei Dateien ein). Titel über die
  OZ, weil ein per GAEB eingelesenes LV andere IDs hat. Der Rang ist ein String (keine JSON-Zahlen in den Fixtures).
  Eine Zuschlagsposition bietet der Bieter mit `zuschlagssatz` statt `einheitspreis` an (Vertrag v1.2,
  `Angebotsposition.zuschlagssatz`); den Platzhalter-EP `0.000` des Vertrags setzt der Testhelfer beim Abbilden.
Abrechnungsset (Ticket 85, Tor M4): { schemaVersion, art:"abrechnungsset", regel, lvId, lvName, projektId,
               zuschlag{angebotId, bieterId, bieterName, gewaehlt[], auftragsLvId, nachlass, mwstSatz, entfallen[],
                        ohnePreis[], sollwerte},
               nachtrag{lv{id, name, ozMaske, mwstSatz, nachlass, nachtrag{auftragsLvId, nummer, status}, knoten[]},
                        angebot{id, bieterId, nachlass, positionen[], sollwerte}, statusNachUebernahme,
                        uebernahme{art, nachtragLvId, gliederungReihenfolge, knoten[]}, sollwerte},
               positionen[{positionId, oz, kurztext, kostengruppe|null}], gliederungen[{id, oz, kurztext}],
               kostenermittlung, aufmasse[{aufmass, zeilenergebnisse{positionId:[…]}}],
               korrektur{aufmassId, befehl, zeilenergebnisse[], aufmassNachher}, rechnungen[],
               pruefungen{ar1, ar2VorKorrektur, ar2NachKorrektur: {rechnungId, korrigiert, leistungsstand, kette}},
               gegenprobeOhneEinfrieren{ar1Zahlbetrag, ar2Zahlbetrag},
               sollIst{nachBlatt1, nachBlatt2, nachKorrektur: {aufmassIds[], korrigiert, zeilen[], befunde[]}},
               kostenkontrolle{rechnungId, kostenermittlungId, zeilen[], ohneKostengruppe, nachlass, gesamt} }
  `kostenermittlung`, `aufmass`, `rechnungen[]`, `leistungsstand`, `nachtrag.lv.nachtrag` und `uebernahme` (ohne
  `gliederungReihenfolge`) tragen die Feldnamen der Vertragstypen v1.4 (`Kostenermittlung`, `Aufmass`, `Rechnung`,
  `Leistungsstand`, `Nachtragsangaben`, `NachtragUebernehmen`); Knoten und Angebote stehen im Fixture-Format wie oben.
  Ganze Zahlen des Vertrags (Blatt- und Rechnungsnummer, `zeile`, `formel`, `gliederungReihenfolge`) sind Text wie der
  Rang (keine JSON-Zahlen); beim Abbilden `Number(…)`. Negative Beträge mit führendem `-` (nur Kostenkontrolle).
  `kette`: {leistung, nachlass, nettoNachNachlass, mwst, bruttoKumuliert, umlagen[{bezeichnung, satz, betrag}], einbehalt,
  fruehereZahlbetraege, zahlbetrag}; Soll/Ist-Zeile {positionId, soll, ist, anteil}, Befund {positionId, art, anteil};
  Kostenkontrolle-Zeile {kostengruppe, budget, vergabe, abrechnung, abweichung} (diese Namen sind Fixture-Namen).
```

`ozMaske` ist ein Text: vor dem ersten `:` stehen die Stellen (`N` Ziffer, `I` Index, `.` Trennzeichen zählt nicht),
danach eine Erläuterung. Höchstens 14 Stellen einschließlich des einstelligen Index (F2); der Fixture-Test prüft das.
`winzig` und `typisch`: `NN.NN.NNNN[I]` (9 Stellen, zwei Titelebenen, genutzt wird eine); `gross`: `NN.NN.NN.NN.NN.NNNN`
(14 Stellen, fünf Titelebenen, kein Index).
Die Knoten stehen in Dokumentreihenfolge (Eltern vor Kindern, Geschwister in Arrayreihenfolge); der Erzeuger sortiert so
und lässt IDs und Werte unverändert.

IDs sind UUIDv7-förmig (fester Zeitstempel, je ID +1 ms, Rest aus dem Seed-PRNG) und über alle Dateien eindeutig.
Die Ordnungszahl ist Anzeigedatum, kein Schlüssel; Bezüge laufen über IDs. Der EP im LV ist ein Schätzpreis
(Kostenansatz), er speist den „Schätzpreis“ des virtuellen Bieters.

## Berechnungsregel je Sollwert

| Sollwert | Regel |
|---|---|
| `gp` | `round_half_up(Menge × EP, 2)`; Menge × EP wird exakt mit 6 Nachkommastellen gerechnet, dann gerundet (N2) |
| Titelsumme | Summe der gerundeten GPs aller darunterliegenden Positionen, die in die Summe eingehen, einschließlich Untertitel |
| `netto` | Summe der gerundeten GPs aller Positionen, die in die Summe eingehen |
| `nachlass` | `prozent`: `round_half_up(netto × p / 100, 2)`; `betrag`: der Betrag. Kein Nachlass: `0.00` |
| `nettoNachNachlass` | `netto − nachlass` |
| `mwst` | `round_half_up(nettoNachNachlass × Satz / 100, 2)`, einmal auf die Summe, nicht je Position (N2) |
| `brutto` | `nettoNachNachlass + mwst` |
| Zuschlagsbetrag (`gp` der Zuschlagsposition, `zuschlaege`) | R1: `round_half_up(Basis × Satz / 100, 2)`; Basis nach R2 bis R5 (siehe Annahme A4) |
| `ausweise` | Summe der Beträge der Wahlpositionen (`summeWahl`) bzw. der Bedarfspositionen ohne Gesamtbetrag (`summeBedarfOhneGesamtbetrag`), je Titel einschließlich Untertitel und für das LV (F4, Ticket 37 Teil 1); Herleitung siehe „Bedarfs- und Wahlsumme der LV“ |

Negative Werte kommen nicht vor; das Skript lehnt sie ab, bis Ticket 04 die Rundung negativer Beträge entscheidet.
Ausnahme (Ticket 85): Differenzen der Kostenkontrolle (Nachlasszeile, Abweichung) stehen mit Vorzeichen da
(`formatMitVorzeichen`, E-07); gerundet wird dabei nie ein negativer Wert.
Ein Angebot rechnet mit denselben Regeln, nur mit den EP und Sätzen des Bieters (R7, „gedachtes LV“).

## X84 der Angebote (Ticket 69)

`erzeugen.mjs` schreibt je Bieter `angebote/typisch-bieter-<a|b|c>.x84` (UTF-8, LF, feste Zeitangabe) mit einem eigenen,
kleinen XML-Baustein, unabhängig vom Writer in `packages/gaeb`. Form nach den amtlichen X84 (`fixtures/extern/bvbs/
3.3-ava`, `3.3-bauausfuehrung`) und dem X84-Leser (Ticket 45, D-45.1):

- Kopf: Namensraum `DA84/3.3`, `Award/DP` 84, `CTR/Address/Name1` = „Bieter A“ usw. (erfunden, keine Adresse, C4).
- `BoQInfo`: Maske wie der X83-Export von `typisch` (zwei Titelebenen zu 2, Position 4, Index 1 alphanumerisch), damit
  der Leser keine `maske-abweichend` meldet; `Totals` mit Netto, Nachlass des Angebots (`DiscountPcnt`, nur Bieter B,
  3,00 %), Netto nach Nachlass, MwSt-Satz des LV, MwSt, Brutto.
- Je Titel `BoQCtgy` mit `RNoPart` und Titelsumme; je Position eine Zeile, zugeordnet über OZ (`RNoPart`, `RNoIndex`):
  `Item` mit `UP` (EP des Bieters) und `IT` (GP); die Zuschlagsposition 02.0050 A als `MarkupItem` mit `ITMarkup`
  (Basis des Bieters), `Markup` (Satz des Bieters) und `IT` (Betrag). Wahl- und Bedarfsposition tragen ihren GP als `IT`
  (wie der eigene X86-Export; der Leser prüft `IT` nur auf Menge × EP).
- „Nicht angeboten“ (Bieter B, 03.0070): `Item` ohne `UP` und ohne `IT`. Die amtlichen X84 enthalten keinen solchen Fall;
  die Form ist die des Lesers (Ticket 45: `UP` fehlt → nicht angeboten). Der Preis 0,000 (Bieter C, 03.0080) steht als
  `UP` 0.000 da.
- Hinweistexte und Langtexte bleiben weg (sie gehören dem LV, nicht dem Angebot).

Der Selbsttest liest jede Datei mit einem strengen Wohlgeformtheits-Prüfer und vergleicht jede Zeile mit dem Angebot.

## Preisspiegel-Sollwerte (Ticket 69)

`preisspiegelSollwerte` in `rechnen.mjs` (BigInt, nie aus `kern` oder `vergabe`). Regeln wie D-05, D-36.1, D-44.1
(Annahmen für die Demo):

| Sollwert | Regel |
|---|---|
| Bieter: `summen`, `titel` | die Sollwerte des Angebots (`berechneSollwerteGaeb`, R7), Titel über die OZ |
| Bieter: `ausweise` | Bedarfssumme ohne Gesamtbetrag und Wahlsumme des Angebots (`ausweise.gesamt` aus `berechneSollwerteGaeb`): Summe der GP mit den EP des Bieters, ausgewiesen und nicht im Netto (F4, E-04; Review Welle 4, P1) |
| `rang` | 1 + Anzahl der Angebote mit kleinerem Netto nach Nachlass (gleiche Werte gleicher Rang: 1, 1, 3) |
| Min, Mittel, Max je Position | nur Positionen, die laut LV ins Netto gehen; verglichen werden Werte > 0 (0,000 und „nicht angeboten“ zählen nicht, D-05); an einer Normalposition der EP, an einer Zuschlagsposition der Betrag des Bieters (D-44.1) |
| Mittel | `round_half_up(Summe / Anzahl)` auf die Stellen des Werts: EP 3, Betrag 2 |
| GP des virtuellen Bieters | `round_half_up(Menge × EP, 2)`, an der Zuschlagsposition der Betrag selbst; ohne Wert > 0 nichts |
| `virtuelleSummen.min/mittel/max` | Summe dieser GP, ohne Nachlass |
| `virtuelleSummen.schaetzpreis` | Netto des LV mit seinen Schätzpreisen (55.465,59) |

Herleitung an drei Positionen (alle drei Angebote):

- 03.0070 (31,600 m; B nicht angeboten): A 4,101, C 3,844. Min 3,844 → 121,47; Max 4,101 → 129,59; Mittel
  7,945 / 2 = 3,9725 → 3,973 → 31,600 × 3,973 = 125,5468 → **125,55**.
- 03.0080 (88,250 m²; C 0,000): nur A 2,107 und B 2,261 zählen. Mittel 4,368 / 2 = 2,184 → 192,738 → **192,74**;
  Min 185,94; Max 199,53.
- 02.0050 A (Zuschlag, Beträge): A 544,71, B 617,02, C 772,62; Mittel 1.934,35 / 3 = 644,7833 → **644,78**.
- Bedarf 01.0040 (12,000 h, ohne Gesamtbetrag) und Wahl 02.0070 A (96,000) sind die einzigen ihrer Art: Bieter A
  12,000 × 50,123 = 601,476 → **601,48** Bedarfssumme, 96,000 × 60,148 = 5.774,208 → **5.774,21** Wahlsumme;
  B 608,51 / 6.297,50; C 538,68 / 5.427,26.

Rang: A 55.481,84 < B 56.607,77 (58.358,53 − 3 % = 1.750,76) < C 56.721,09 → 1, 2, 3; in jedem Paar entsprechend 1, 2.
Der Selbsttest rechnet die virtuellen Summen ein zweites Mal unmittelbar aus den Angebotszeilen nach.

Hinweis für Verbraucher: Der Schätzpreis setzt ein LV mit den EP aus `typisch.json` voraus. Ein per X83 eingelesenes
LV trägt keine EP (X83 ist die Angebotsaufforderung); dort ist der Schätzpreis 0,00. Alle übrigen Werte hängen nur an
Mengen, Bezügen und den Preisen der Bieter.

## Bedarfs- und Wahlsumme der LV (Ticket 75)

Unabhängige Sollwerte für den LV-Druck (Ticket 58, D-58.4) und jeden anderen Verbraucher: `sollwerte.ausweise.gesamt`
und `sollwerte.ausweise.titel[<Titel-ID>]` mit `summeBedarfOhneGesamtbetrag` und `summeWahl` (dieselben Namen wie in den
Gesamt- und Gliederungssummen des Vertrags). Regel: GP je Position = `round_half_up(Menge × EP, 2)` (N2); eine
Bedarfsposition ohne Gesamtbetrag (GAEB `Provis` = `WithoutTotal`) und eine Wahlposition (GAEB `ALNGroupNo`/`ALNSerNo`)
gehen nicht in Netto und Titelsumme ein, ihre GP werden getrennt summiert und ausgewiesen (F4, E-04), je Titel
einschließlich Untertitel. Der Selbsttest zählt beide Summen ein zweites Mal unmittelbar aus den Knoten nach (nicht über
`berechneSollwerteGaeb`).

| Datei | `ausweise` | Bedarfssumme ohne GB | Wahlsumme |
|---|---|---|---|
| `typisch` | ja | 586,80 (Titel 01) | 5.880,00 (Titel 02) |
| `gross` | ja | 5.442.164,43 | 3.600.459,51 |
| `winzig`, `zuschlag` | nein: keine Bedarfs- und keine Wahlposition, beide Summen 0,00 (im Druck keine Zeile, D-58.4) | – | – |

Handrechnung `typisch`: 01.0040 (Bedarf ohne Gesamtbetrag) 12,000 h × 48,900 = **586,80**; 02.0070 A (Wahl)
96,000 m² × 61,250 = **5.880,00**; Titel 03 trägt beide Summen mit 0,00. Netto (55.465,59) enthält keine der beiden.

## M4-Abrechnung (Ticket 85)

`typisch-abrechnung.json` trägt die Sollwerte des Tors M4 (D-38) für den Kettentest und die E2E (Ticket 91) und für die
Golden-Tests in `abrechnung` (Ticket 81) und `kosten` (Ticket 82). Eingaben (alle erfunden) stehen in `erzeugen.mjs`
(`M4`), gerechnet wird in `rechnen.mjs` (`leistungsstandBerechnen`, `abschlagsketteBerechnen`, `sollIstBerechnen`,
`kostenkontrolleBerechnen`), nur BigInt und nie aus `kern`, `vergabe`, `abrechnung`, `kosten` oder `mengen`. Der
Selbsttest rechnet jede Zahl ein zweites Mal: von Hand (Literale mit Rechenweg) und eigens aus den Eingaben, die
Formel-91-Zeilen mit einem eigenen kleinen Rechner. Verbraucher ordnen über `positionen[].oz` und `gliederungen[].oz` zu,
wenn ihre Kennungen andere sind (LV per X83, Kennungen aus der App).

| Schritt | Regel | Sollwert |
|---|---|---|
| Zuschlag an Bieter B, keine Wahl | D-21: Alternative 02.0070 A entfällt, Grundposition bleibt, Bedarf bleibt Bedarf, 03.0070 (nicht angeboten) ohne EP; Nachlass, EP und Satz von B | Netto 58.358,53; Nachlass 3 % 1.750,76; Netto n. N. 56.607,77; MwSt 10.755,48; Brutto 67.363,25 |
| Nachtrag N01 übernehmen | D-35: Titel „Nachtrag N01“ mit nächster freier OZ `04` ans Ende der obersten Ebene; Baum des Nachtrags mit seinen Kennungen und OZ mit `04.` davor (D-85.2); EP aus dem Angebot | 24,000 × 38,437 = 922,49; 6,000 × 87,125 = 522,75; Netto 59.803,77; Nachlass 1.794,11; Netto n. N. 58.009,66; MwSt 11.021,84; Brutto 69.031,50 |
| Zeilenergebnis Formel 91 | Ticket 35: exakt, kaufmännisch auf 3 Stellen; Menge = Summe der gerundeten Zeilen | `2,5*1,75*0,3` = 1,3125 → **1,313** |
| Leistungsstand | D-34 (1)–(3): Σ round(kum. Menge × Vertrags-EP, 2); Bedarf zählt aufgemessen; Zuschlag round(Σ GP Bezug × Satz / 100, 2); Nachlass round(Leistung × 3 %, 2) über das ganze Auftrags-LV | siehe unten |
| Abzugskette | D-34 (4)–(7): MwSt, Brutto kum., Umlage 0,50 %, Sicherheitseinbehalt 5 %, je round(…, 2); Zahlbetrag = Brutto − Umlage − Einbehalt − frühere **eingefrorene** Zahlbeträge | AR 1 8.874,40; AR 2 10.100,84 vor, 10.070,67 nach der Korrektur |
| Soll/Ist | D-35, VOB/B § 2 Abs. 3: Befund bei Ist > 110 % (streng, exakt), < 90 % nur mit Schlussrechnung; Anteil round(Ist / Soll × 100, 2) | genau ein `ueber-schwelle`: 02.0040 mit 112,50 %; 04.01.0010 nach Blatt 2 genau 110,00 %, kein Befund |
| Kostenkontrolle | D-37, D-24, D-85.3: Zeilen je KG samt Vorfahren, „ohne Kostengruppe“, „Nachlass“ (negativ), Gesamt; Vergabe = GP zählender Positionen (F4), Abrechnung = `Leistungsstand.gp` von AR 2 nach der Korrektur; Budget ohne Eintrag 0,00; Abweichung = Vergabe − Budget | Gesamt: Budget 60.900,00, Vergabe 58.009,66, Abrechnung 16.846,81, Abweichung −2.890,34 |

Handrechnung (Preise von Bieter B; „→“ heißt kaufmännisch gerundet, „(.5)“ eine Rundung genau auf der Hälfte):

- **AR 1** (Blatt 1): 01.0010 0,500 × 1.951,750 = 975,875 → 975,88 (.5); 01.0020 86,500 × 7,726 = 668,299 → 668,30;
  02.0010 89,250 × 6,506 = 580,6605 → 580,66; 02.0040 108,000 × 12,502 = 1.350,216 → 1.350,22; 02.0050 21,473 ×
  174,980 = 3.757,34554 → 3.757,35; Zuschlag 02.0050 A 3.757,35 × 9,10 % = 341,91885 → 341,92; 04.01.0010 12,000 ×
  38,437 = 461,244 → 461,24. Leistung **8.135,57**; Nachlass 244,0671 → 244,07; Netto n. N. 7.891,50; MwSt 1.499,385 →
  1.499,39 (.5); Brutto 9.390,89; Umlage 46,95445 → 46,95; Einbehalt 469,5445 → 469,54; Zahlbetrag **8.874,40**
  (freigegeben, eingefroren).
- **AR 2 vor der Korrektur** (Blatt 1 + 2): dazu 01.0040 (Bedarf) 7,000 × 50,709 → 354,96; 02.0010 99,150 → 645,07;
  02.0050 31,553 → 5.521,14, Zuschlag → 502,42; 03.0010 114,125 × 52,699 = 6.014,273375 → 6.014,27; 04.01.0010 26,400
  → 1.014,74; 04.01.0020 4,000 × 87,125 = 348,50. Leistung 17.395,50; Nachlass 521,865 → 521,87 (.5); Netto n. N.
  16.873,63; MwSt 3.205,99; Brutto 20.079,62; Umlage 100,40; Einbehalt 1.003,98; Zahlbetrag 20.079,62 − 100,40 −
  1.003,98 − 8.874,40 = **10.100,84**.
- **Korrektur** an Blatt 1 nach der Freigabe von AR 1: 02.0010 `17*20*0,25` = 85,000 statt 89,250.
- **AR 2 nach der Korrektur**: 02.0010 94,900 → 617,42; Leistung 17.367,85; Nachlass 521,0355 → 521,04; Netto n. N.
  16.846,81; MwSt 3.200,89; Brutto 20.047,70; Umlage 100,24; Einbehalt 1.002,385 → 1.002,39 (.5); Zahlbetrag
  **10.070,67**. AR 1 bleibt 8.874,40.
- **Gegenprobe ohne Einfrieren** (`gegenprobeOhneEinfrieren`): AR 1 neu geprüft wäre 8.844,23 und AR 2 damit
  10.100,84, also gleich dem Wert vor der Korrektur. Wer frühere Zahlbeträge neu rechnet statt sie einzufrieren, sieht
  die Korrektur in AR 2 nicht.

Lesarten, die die Regeln offen lassen (Ticket 85, D-85.1 bis D-85.8; Annahmen für die Demo):

- **D-85.1** Zuschlag an Bieter B (3,00 %) ohne gewählte Wahlposition: Die Wahl wurde im Tor M3 geprüft; hier zählt der
  Prozent-Nachlass. 03.0070 (von B nicht angeboten) hat im Auftrags-LV keinen EP und wird nie aufgemessen.
- **D-85.2** OZ der übernommenen Nachtragsknoten: die neue Gliederung bekommt die nächste freie OZ der obersten Stufe,
  der Baum des Nachtrags behält seine OZ mit dieser davor (`01` → `04.01`, `01.0010` → `04.01.0010`), wie das Beispiel in
  `vertrag` (`beispielNachtragUebernehmen`). D-35 nennt nur die OZ der Gliederung; Ticket 80 entscheidet endgültig.
- **D-85.3** Kostenkontrolle: Zeilen sind alle Kostengruppen aus Budget und Positionen samt Vorfahren (D-24), nach
  Nummer; Budget ohne Eintrag ist 0,00, auch in „ohne Kostengruppe“ und „Nachlass“; Abweichung = Vergabe − Budget in
  jeder Zeile. So gehen Ebene 1 + ohne KG + Nachlass je Spalte auf den Cent auf (Property von Ticket 82).
- **D-85.4** Keine JSON-Zahlen: ganze Zahlen des Vertrags stehen als Text (Präzedenz: Rang, Ticket 69).
- **D-85.5** Soll/Ist-Zeilen nur für Positionen mit Aufmaß; Positionen ohne Aufmaß haben Ist 0 und ohne
  Schlussrechnung keinen Befund.
- **D-85.6** Das Nachtrags-LV trägt keine Schätzpreise (EP `null`); die EP kommen aus dem Nachtragsangebot des
  Auftragnehmers. Status vor der Übernahme `angeboten`, danach `beauftragt` (D-35: erst übernehmen, dann beauftragen).
- **D-85.7** `gefordert` ist in beiden Rechnungen `null` (ob kumuliert, ist offen; Offene Typfrage 8 zu Ticket 70).
- **D-85.8** Kostengruppen werden am Auftrags-LV gesetzt (`KostengruppeSetzen` als AuftragsLvBefehl), nicht im LV.

## Handrechnung `winzig` (MwSt 19 %, kein Nachlass)

- 01.0010: 1,235 × 10,000 = 12,35 (exakt 12,35000)
- 01.0020: 3,333 × 4,560 = 15,19848, gerundet **15,20**
- 01.0030: 5,000 × 507,490 = 2.537,45
- Titelsumme = Netto = 12,35 + 15,20 + 2.537,45 = **2.565,00**
- MwSt: 2.565,00 × 19 % = 487,35 (exakt); Brutto = 2.565,00 + 487,35 = **3.052,35**

Die Kette 27,55 → 5,2345 → 5,23 → 32,78 steht nicht in `winzig` (die dritte Position ist nötig, damit es drei
sind), sondern in `handbeispiele.json`, zusammen mit 402,73 − 3 % (Nachlass 12,0819 → 12,08; netto 390,65;
MwSt 74,2235 → 74,22; brutto 464,87).

## Annahmen

Die Regeln (N2, Glossar) legen diese Fälle nicht vollständig fest. Die Fixtures wählen jeweils die einfachste,
vorsichtigste Darstellung. **Spätere Tickets (K5/K6, V1/V2, 04) dürfen diese Wahl nicht als Regel erben**; die
Sollwerte der betroffenen Fälle gelten nur unter der jeweiligen Annahme.

- **A1 Bedarfsposition ohne Gesamtbetrag:** GP wird berechnet und ausgewiesen (`gp`), geht aber nicht in
  Titelsummen und Netto ein (`inSumme: false`). Seit Ticket 51 tragen `typisch`, `gross` und die Angebote die
  getrennte Bedarfssumme (`ausweise.…summeBedarfOhneGesamtbetrag`, F4); `winzig` hat keine Bedarfsposition.
- **A2 Bedarfsposition mit Gesamtbetrag** (`bedarfMitGesamtbetrag: true`): geht wie eine Normalposition in die Summen
  ein. `typisch` enthält keine; `gross` enthält etwa 2 %.
- **A3 Wahlposition:** GP wird berechnet und ausgewiesen, geht nicht in die Summen ein, aber in die Wahlsumme
  (`ausweise.…summeWahl`, seit Ticket 51). Es findet kein Ersetzen der Grundposition statt (`grundpositionId` ist nur ein
  Verweis). Der Zustand „Auftraggeber hat gewählt“ ist nicht abgebildet.
- **A4 Zuschlagsposition** (seit Ticket 51 in allen Dateien GAEB-Form; ersetzt die frühere Annahme „eigene Menge × EP“):
  Die Rechenregel ist Ticket 37, R1 bis R6, belegt aus den amtlichen Prüfdateien (D-03; BVBS 3.3 AVA X86 Bereich 1.30,
  Musterdatei 3.1 X84). `rechnen.mjs` setzt sie unabhängig vom Kern um (`zuschlagsbasis`, `berechneSollwerteGaeb`).
  - R1 Betrag = `round_half_up(Basis × Satz / 100, 2)`; ohne Satz kein Betrag.
  - R2 Basis = Summe der GP der Bezugspositionen, die selbst einen GP haben und ins Netto gehen (keine Wahl, kein
    Bedarf ohne Gesamtbetrag); eine Zuschlagsposition ist nie Basis.
  - R3 `gliederung`: die Positionen vor der Zuschlagsposition unter demselben Elternknoten, rückwärts bis zur nächsten
    Zuschlagsposition oder zum Anfang; unmittelbar davorstehende Zuschlagspositionen teilen dieselbe Basis.
  - R4 `kennzeichnung`: wie R3, nur Positionen mit `zuschlagskennzeichen`.
  - R5 `positionen`: die genannten Positionen, wo immer sie stehen (Teilmenge × EP, falls gesetzt; Annahme D-37.2).
  - R6 Der Betrag geht wie ein GP in die Titelsummen und, nach den Merkmalen der Zuschlagsposition, in Netto,
    Bedarfs- oder Wahlsumme.
  `typisch`: 02.0050 A mit Satz 8,50 % auf 02.0050 (GP 6.544,88), Betrag 556,31 (in der Altform waren es
  38,750 × 14,300 = 554,13). `gross`: jede Zuschlagsposition mit Satz 1,00 bis 15,00 % (eigener Seed) auf die
  vorangehende Normalposition. `typisch-angebote`: Satz des Bieters = Satz des LV × Promille des Bieters (Basis plus
  Streuung aus dem Seed), auf 2 Stellen gerundet. Die „Altform der Zuschlagsposition“ (Glossar; Kern R8) kommt in
  keiner Fixture mehr vor; `bezugspositionId` entfällt, der Bezug steht in `zuschlag.bezug`.
- **A5 Nicht angebotene Position:** Eintrag mit `status: "nicht-angeboten"`, ohne Feld `einheitspreis`; `gp` ist
  `null`, `inSumme: false`, die ID steht in `nichtAngeboten`. Ein angebotener Preis von `0.000` (`status: "angeboten"`)
  ist davon verschieden und ergibt GP `0.00`. Wie ein Preisspiegel nicht angebotene Positionen bewertet
  (Ergänzen aus Mittel, Ausschluss), ist nicht festgelegt und kommt hier nicht vor.
- **A6 Nachlass-Rundung:** Der Nachlassbetrag wird auf 2 Stellen gerundet, dann subtrahiert. Ticket 07 formuliert
  „402,73 − 3 % = 390,6481 → 390,65“, das rundet das Ergebnis. Beide Wege stimmen überein, außer bei einem
  Rundungsgleichstand; der Selbsttest prüft für jede Fixture, dass beide Wege dasselbe liefern. Welcher Weg gilt, ist offen.
  Ein Angebot trägt seinen eigenen Nachlass; es erbt den des LV nicht. MwSt-Satz des Angebots ist der des LV (19,00).
- **A7 Ausreißer** (nur in `typisch-angebote.json`, Schlüssel `ausreisserAnnahmeA7`; seit Ticket 75 nach D-05, D-36.1 und
  D-44.1, Annahmen für die Demo; der Schlüssel heißt weiter so, damit Verbraucher ihn finden): Das Glossar nennt ±20 % vom
  Mittelwert. Je Position (alle Zeilen des Preisspiegels) ist der verglichene Wert eines Angebots sein EP, an einer
  Zuschlagsposition sein Betrag. Gezählt werden nur Werte > 0: Ein Nullpreis (0,000) und „nicht angeboten“ haben eigene
  Kennzeichen und sind nie Ausreißer. Ab zwei Werten > 0 mit Summe > 0 ist ein Wert Ausreißer, wenn er strikt mehr als
  20 % vom Mittel abweicht, exakt ganzzahlig: |n × Wert − Summe| × 100 > 20 × Summe. Verglichen werden alle drei Angebote
  zusammen. Ergebnis (`rechnen.mjs`, `ausreisserSollwerte`; der Selbsttest rechnet es eigens aus den Angebotszeilen nach):
  nur Bieter C, an 02.0050 und 03.0030, beide nach oben (absichtlich 150 % des Basispreises):
  - 02.0050: EP 165,184 / 174,980 / 253,350, Summe 593,514, Mittel 197,838; C: 3 × 253,350 − 593,514 = 166,536 >
    0,20 × 593,514 = 118,7028 (+28,1 %). A (−16,5 %) und B (−11,6 %) nicht.
  - 03.0030: EP 21,647 / 23,609 / 32,700, Summe 77,956; C: 98,100 − 77,956 = 20,144 > 15,5912 (+25,8 %).
  - 03.0080: C bietet 0,000 (Nullpreis, zählt nicht); A 2,107 und B 2,261 weichen je 0,077 (3,5 %) vom Mittel 2,184 ab.
    Vor Ticket 75 verglich A7 den GP und zählte den Nullpreis mit; dann waren hier alle drei Bieter Ausreißer.
  - 02.0050 A (Beträge 544,71 / 617,02 / 772,62, Summe 1.934,35): C 3 × 772,62 − 1.934,35 = 383,51 < 386,87
    (+19,8 %), knapp kein Ausreißer.
  - 03.0070 (B nicht angeboten): A 4,101 und C 3,844, zwei Werte, je 3,2 % vom Mittel, kein Ausreißer.
  Bei einer Schwelle von 200 % gibt es keinen Ausreißer (D-63.9: bei drei Werten > 0 liegt keiner mehr als 200 % über
  oder 100 % unter dem Mittel). Für die Paare in `preisspiegel.vergleiche` trägt die Fixture keine Ausreißer.
- **A8 Titelsummen** enthalten nur Positionen mit `inSumme: true`. Hinweistexte tragen keine Beträge.
- **A9 „Gliederungsebenen“** zählt Titelebenen (`gross`: 5). Lose werden in v1 nicht verwendet.
- **A10 Indexposition:** `ozIndex` ist ein Buchstabe neben der Ordnungszahl; in `typisch` tragen die Wahl- und die
  Zuschlagsposition den Index „A“ zur Ordnungszahl ihrer Bezugsposition. Eine Bedeutung über die Anzeige hinaus ist nicht festgelegt.
- **A11 `winzig`** hat Netto 2.565,00 (siehe oben), nicht 27,55.
- **A13 Maskentext (vorläufige Annahme, Entscheidung offen):** Die frühere Maske `NN.NN.NN.NN.NN.NNNN[I]` hatte 15 Stellen
  und verletzte F2. Gekürzt ist so, dass die vorhandenen OZ unverändert passen (je Datei eine Maske, siehe oben).
  Alternative: eine Maske für alle mit Position dreistellig (5 × 2 + 3 + 1 = 14); dann müssten alle Positionsnummern
  dreistellig werden.
- **A12 `gross`** enthält Normal- (etwa 90 %), Bedarfs-, Wahl- und Zuschlagspositionen sowie 5 Hinweistexte (nicht
  als Positionen gezählt) und einen Nachlass von 1,50 %.

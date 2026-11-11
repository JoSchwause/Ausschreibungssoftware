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
| `typisch-angebote.json` | 3 Bieter (A, B, C) mit Angeboten zu `typisch`, je ein Zuschlagssatz an 02.0050 A; Preisspiegel-Sollwerte (Ticket 69) | selbst verfasst, Preise und Sätze per Seed gestreut |
| `angebote/typisch-bieter-{a,b,c}.x84` | die drei Angebote als GAEB DA XML 3.3, Phase 84 (Ticket 69) | vom Skript aus `typisch-angebote.json` erzeugt, eigener XML-Baustein |
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
Preisspiegel (Ticket 69, additiv): { regel,
               bieter[{angebotId, bieterId, name, datei, summen:{netto, nachlass, nettoNachNachlass, mwst, brutto}, titel:{OZ: summe}}],
               vergleiche[{angebotIds[], rang:{angebotId: "1"}, virtuelleSummen:{min, mittel, max, schaetzpreis}}] }
  `vergleiche`: alle drei Angebote, dann die Paare A+B, A+C, B+C (das Tor M3 liest zwei Dateien ein). Titel über die
  OZ, weil ein per GAEB eingelesenes LV andere IDs hat. Der Rang ist ein String (keine JSON-Zahlen in den Fixtures).
  Eine Zuschlagsposition bietet der Bieter mit `zuschlagssatz` statt `einheitspreis` an (Vertrag v1.2,
  `Angebotsposition.zuschlagssatz`); den Platzhalter-EP `0.000` des Vertrags setzt der Testhelfer beim Abbilden.
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
| `ausweise` | Summe der Beträge der Wahlpositionen (`summeWahl`) bzw. der Bedarfspositionen ohne Gesamtbetrag (`summeBedarfOhneGesamtbetrag`), je Titel einschließlich Untertitel und für das LV (F4, Ticket 37 Teil 1) |

Negative Werte kommen nicht vor; das Skript lehnt sie ab, bis Ticket 04 die Rundung negativer Beträge entscheidet.
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

Rang: A 55.481,84 < B 56.607,77 (58.358,53 − 3 % = 1.750,76) < C 56.721,09 → 1, 2, 3; in jedem Paar entsprechend 1, 2.
Der Selbsttest rechnet die virtuellen Summen ein zweites Mal unmittelbar aus den Angebotszeilen nach.

Hinweis für Verbraucher: Der Schätzpreis setzt ein LV mit den EP aus `typisch.json` voraus. Ein per X83 eingelesenes
LV trägt keine EP (X83 ist die Angebotsaufforderung); dort ist der Schätzpreis 0,00. Alle übrigen Werte hängen nur an
Mengen, Bezügen und den Preisen der Bieter.

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
- **A7 Ausreißer** (nur in `typisch-angebote.json`, Schlüssel `ausreisserAnnahmeA7`): Das Glossar nennt ±20 % vom Mittelwert
  oder Referenzpreis, ohne Bezugsgröße. Hier: je Position der GP; Mittel = arithmetisches Mittel der GP aller Angebote, die
  die Position angeboten haben (einschließlich des geprüften), mindestens 3 Werte, Mittel > 0; Ausreißer, wenn die
  Abweichung strikt größer als 20 % ist, exakt per Ganzzahlvergleich. Folgen: Bieter C hat zwei absichtliche Ausreißer
  (150 % des Basispreises) und einen 0,000-Preis; der 0,000-Preis zieht das Mittel so weit herunter, dass auch A und B
  an dieser Position als Ausreißer erscheinen. Das ist eine Folge der Annahme, kein Sollwert für V2.
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

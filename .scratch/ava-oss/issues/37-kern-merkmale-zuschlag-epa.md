# 37: Kern: Positionsmerkmale, Wahl- und Zuschlagspositionen, EPA (K5–K7)

Status: ready-for-agent
Type: task
Welle: 3 (Phase A) · Strang: K (K5–K7) · Paket: `packages/kern` (benannte Ausnahmen: `GLOSSARY.md`, eine neue Datei unter `fixtures/`, siehe Grenzen)
Blocked by: 30
Regeln: A2, A5, A6, F3, F4, F5, N1, N2, N3, L1, L2, U5, Q1, Q4, C3, C4
Herkunft: E-03, E-04, E-05 (`grilling.md`), D-03 (`entscheidungen-auto.md`), Ticket 26 (Folgeliste `kern` und „Nicht rein mechanisch“, Punkt 1), `plan.md` §2 K5–K7, alte Tickets `.scratch/ava-mvp/issues/08`, `09`, `17`

## What to build

Der Kern rechnet ab diesem Ticket mit dem Inhaltsmodell aus `vertrag` v1.1b: kombinierbare Positionsmerkmale, getrennte
Ausweise für Bedarf und Wahl, die Zuschlagsposition mit GAEB-Semantik und die Einheitspreisanteile. Alles rein und
deterministisch (A2), alle Zahlen über `@tethys/dezimal` (N1). Vorgehen: TDD mit dem Skill `tdd`; am Ende
`pnpm lint && pnpm typecheck && pnpm test` grün. `okf/research/` wird nicht gelesen (C3); alles Nötige steht hier.

Offene Fachfragen entscheidet der Umsetzer im Demo-Modus selbst und trägt jede Entscheidung als `D-xx` in
`.scratch/ava-oss/entscheidungen-auto.md` ein. Die Vorschläge unten sind die Vorgabe; wer abweicht, begründet es dort.

### 1. Positionsmerkmale (K5, F4, F5, E-04, E-05)

- **Handler `PositionsmerkmaleSetzen`** (setzt `merkmale` und `zuschlag` gemeinsam). Der Schlüssel verschwindet aus
  `ZUSTAENDIGES_TICKET`. Minimales ChangeSet (A6): die Position, ihre Positionssumme, die Gliederungen bis zur Wurzel,
  die Gesamtsummen, dazu jede Zuschlagsposition, deren Basis sich dadurch ändert (Teil 2). Gleicher Wert: leeres ChangeSet.
  `summen.vorher` wird gefüllt wie seit Ticket 30.
- **Wohin ein Betrag geht** (eine benannte Funktion in `summenregeln.ts`, Eintrag in `SUMMEN_ANNAHMEN` von „vorläufig“ auf
  „entschieden (E-04, E-05, Demo D-xx)“). Jeder Betrag (GP oder Zuschlagsbetrag) geht in genau eines von vier Zielen:

  | Merkmale der Position | Ziel |
  |---|---|
  | `wahl` gesetzt und `wahl.variante` ist nicht `0` | Wahlsumme (`summeWahl`) |
  | sonst `bedarf = 'ohne-gesamtbetrag'` | Bedarfssumme (`summeBedarfOhneGesamtbetrag`) |
  | sonst (normal, `bedarf = 'mit-gesamtbetrag'`, Grundausführung mit Variante 0, Stundenlohn, Pauschal) | Netto und Gliederungssumme |
  | kein Betrag (Menge oder EP fehlt; Zuschlag ohne Satz und nicht in der Altform R8) | nirgends |

  Vorschlag (protokollieren): Wahl vor Bedarf, d. h. eine Wahlposition, die zugleich Bedarf ist, steht nur in der
  Wahlsumme. Variante 0 ist die Grundausführung (Glossar „Wahlzuordnung“) und zählt wie eine Normalposition.
- **Ausweise füllen.** `Gesamtsummen.summeBedarfOhneGesamtbetrag` und `summeWahl` sowie dieselben Felder an jeder
  `Gliederungssumme` werden immer gesetzt (`0.00`, wenn es keine solchen Positionen gibt). Sie gehen nicht in Netto,
  Nachlass, MwSt oder Brutto ein (F4). `Positionssumme.gehtInSummeEin` bleibt „geht ins Netto ein“.
- **Pauschal** (Vorschlag, protokollieren): ohne Menge ist der GP der auf 2 Stellen gerundete EP (Menge 1 angenommen;
  GAEB lässt bei Pauschalpositionen die Menge weg oder setzt 1), mit Menge wie immer Menge × EP. **Stundenlohn** ändert
  an der Rechnung nichts.
- **Formprüfungen wiederherstellen** (Ticket 26, „Nicht rein mechanisch“, Punkt 1: die Prüfung „Merkmal nur bei
  passender Art“ ist in v1.1b entfallen). Neu in `pruefung.ts`, gelten für `PositionAnlegen`, `LeistungsverzeichnisAnlegen`
  und `PositionsmerkmaleSetzen`, Fehler `ungueltige-eingabe` mit `feld`:
  1. Zuschlagsposition mit `pauschal` oder `stundenlohn` → `feld: 'merkmale'` (ein Prozentzuschlag hat weder Menge noch Zeit).
  2. Zuschlagsposition mit `zuschlagskennzeichen` → `feld: 'merkmale.zuschlagskennzeichen'` (eine Zuschlagsposition ist nie Basis).
  3. Bezugsliste nennt eine Zuschlagsposition → `feld: 'zuschlag.bezug.positionen'` (D-03: nie Basis einer anderen).
  4. `wahl.variante` außerhalb 0 bis 9 oder `wahl.gruppe` negativ → `feld: 'merkmale.wahl'`.
  5. Doppelte Bezugsposition in derselben Liste → `feld: 'zuschlag.bezug.positionen'`.
  Mehr wird nicht abgewiesen (U5): Teilmenge größer als die Menge, leere Bezugsliste, Satz fehlt sind Befunde von K8 (Ticket 41).
- **Testhelfer** `testhilfen.positionsfelder` (Kurzform `positionsart: …`) durch Testdaten mit echten `merkmale`/`zuschlag`
  ablösen, soweit die Tests es brauchen (Ticket 26, Folgeliste `kern`).
- **Marker aufräumen** (Ticket 30 überlässt sie diesem Ticket): Jede Stelle mit `// v1.1b: mechanisch angepasst,
  Folgeticket` im Kern (`summenregeln.ts`, `knoten-befehle.ts`, `pruefung.ts`, `ausfuehren.ts`, `testhilfen.ts`,
  `baum.test.ts`, `fixtures.test.ts`, `summen.test.ts`, `summen-eigenschaften.test.ts`, `feld-befehle.test.ts`) ist danach
  durch die endgültige Regel ersetzt oder der Marker begründet entfernt.

### 2. Zuschlagsposition (K6, F3, E-03, D-03)

**Beleg statt Zitat der Fachdokumentation (D-03).** Die Rechenregel stammt aus den amtlichen Prüfdateien im Repo. Die
folgenden Zeilen sind gekürzt (`Description` weggelassen) und unverändert in den Werten.

`fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X86`, Bereich 1.30 „Bereich Zuschläge“:

```xml
<!-- 1.30.10 „Zuschlag auf gekennzeichnete Positionen“ -->
<Item ID="CBNEFPDI" RNoPart="10"><MarkupIt>Yes</MarkupIt><Qty>10.000</Qty><QU>m</QU><UP>10.000</UP><IT>100.00</IT>…</Item>
<Item ID="CBNEGEAI" RNoPart="20"><Qty>20.000</Qty><QU>m</QU><UP>20.000</UP><IT>400.00</IT>…</Item>
<Item ID="CBNEGIGI" RNoPart="30"><MarkupIt>Yes</MarkupIt><Qty>30.000</Qty><QU>m</QU><UP>30.000</UP><DiscountPcnt>5.00</DiscountPcnt><IT>855.00</IT>…</Item>
<MarkupItem ID="CBNEGNDI" RNoPart="40"><MarkupType>IdentAsMark</MarkupType><ITMarkup>955.00</ITMarkup><Markup>10.00</Markup><IT>95.50</IT>…</MarkupItem>
<!-- Totals 1.30.10: <Total>1450.50</Total> -->

<!-- 1.30.20 „Zuschläge auf davorstehende Positionen“ -->
<Item ID="CBNEHEEA" RNoPart="10"><Qty>10.000</Qty><QU>m</QU><UP>10.000</UP><IT>100.00</IT>…</Item>
<Item ID="CBNEHJCI" RNoPart="20"><Qty>20.000</Qty><QU>m</QU><UP>20.000</UP><IT>400.00</IT>…</Item>
<Item ID="CBNEHNLA" RNoPart="30"><Qty>30.000</Qty><QU>m</QU><UP>30.000</UP><IT>900.00</IT>…</Item>
<MarkupItem ID="CBNEICEA" RNoPart="40"><MarkupType>AllInCat</MarkupType><ITMarkup>1400.00</ITMarkup><Markup>10.00</Markup><IT>140.00</IT>…</MarkupItem>
<MarkupItem ID="CBNEIFHI" RNoPart="50"><MarkupType>AllInCat</MarkupType><ITMarkup>1400.00</ITMarkup><Markup>10.00</Markup><IT>140.00</IT>…</MarkupItem>
<Item ID="CBNEIJFI" RNoPart="60"><Qty>10.000</Qty><QU>m</QU><UP>10.000</UP><IT>100.00</IT>…</Item>
<MarkupItem ID="CBNEIOCA" RNoPart="70"><MarkupType>AllInCat</MarkupType><ITMarkup>100.00</ITMarkup><Markup>10.00</Markup><IT>10.00</IT>…</MarkupItem>
<!-- Totals 1.30.20: <Total>1790.00</Total> -->

<!-- 1.30.30 „Zuschlag auf beliebige Positionen“ -->
<Item ID="CBNEJFBA" RNoPart="10"><Qty>10.000</Qty><QU>m</QU><UP>10.000</UP><IT>100.00</IT>…</Item>
<Item ID="CBNEJJPI" RNoPart="20"><Qty>20.000</Qty><QU>m</QU><UP>20.000</UP><IT>400.00</IT>…</Item>
<MarkupItem ID="CBNEJOII" RNoPart="30"><MarkupType>ListInSubQty</MarkupType><MarkupSubQty><RefItem IDRef="CBNEJJPI" /></MarkupSubQty><ITMarkup>400.00</ITMarkup><Markup>10.00</Markup><IT>40.00</IT>…</MarkupItem>
<MarkupItem ID="CBNEKBMA" RNoPart="40"><MarkupType>ListInSubQty</MarkupType><MarkupSubQty><RefItem IDRef="CBNEBKMI" /></MarkupSubQty><ITMarkup>2791.00</ITMarkup><Markup>10.00</Markup><IT>279.10</IT>…</MarkupItem>
<!-- Totals 1.30.30: <Total>819.10</Total>;  Totals 1.30: <Total>4059.60</Total> -->

<!-- Bezugsposition von 1.30.30.40 steht in einem anderen Bereich, 1.10.30.20: -->
<Item ID="CBNEBKMI" RNoPart="20">…<Qty>100.000</Qty>…<QU>m</QU>…<UP>27.910</UP><UPComp1>2.230</UPComp1><UPComp2>23.120</UPComp2><UPComp3>2.560</UPComp3><UPComp4>0.000</UPComp4><IT>2791.00</IT>…</Item>
```

Die Kurztexte der Datei nennen die Regel ausdrücklich: 1.30.20.40 „Zuschläge auf alle Positionen bis Gruppenanfang“;
1.30.20.50 „Wenn diese Zuschlagspositionen unmittelbar hintereinander stehen, wird die davor liegende Zuschlagsposition
nicht in die Basis eingerechnet. Dies ermöglicht 2 Zuschläge auf die gleiche Basis.“; 1.30.20.70 „Zuschlag auf alle
Positionen bis Gruppenanfang oder einer davorstehenden Zuschlagsposition“. (1.30.20.50 nennt außerdem einen Nachlass
von 10 %, den die Daten nicht tragen: `IT` ist 140,00. Es gilt, was in den Daten steht.) Dieselben Zahlen stehen
unabhängig davon in `fixtures/extern/gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X84` (Bereich 1.30: 955,00/95,50;
1400,00/140,00 zweimal; 100,00/10,00; 400,00/40,00; 2791,00/279,10). Ein zweites Beispiel aus
`fixtures/extern/bvbs/3.3-bauausfuehrung/BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84`, Bereich 002.001:

```xml
<Item … RNoPart="0010"><UP>1.000</UP><IT>450000.00</IT></Item>
<Item … RNoPart="0020"><UP>2.000</UP><IT>400000.00</IT></Item>
<MarkupItem ID="ID0ACC2708" RNoPart="0030"><ITMarkup>850000.00</ITMarkup><Markup>10.00</Markup><IT>85000.00</IT></MarkupItem>
<Item ID="ID02BDF450" RNoPart="0040"><UP>1.110</UP><IT>111.00</IT></Item>
<!-- Totals 002.001: <Total>935111.00</Total>; in der zugehörigen X83 ist 0030 als <MarkupType>AllInCat</MarkupType> geführt -->
```

**Herleitung (gilt als Rechenregel, D-03):**

| Fall | Basis | Satz | Betrag | Gliederungssumme |
|---|---|---|---|---|
| 1.30.10.40 Kennzeichnung | 100,00 + 855,00 = 955,00 (nur `MarkupIt`, 400,00 nicht) | 10,00 % | 95,50 | 100 + 400 + 855 + 95,50 = **1.450,50** |
| 1.30.20.40 Gliederung | 100 + 400 + 900 = 1.400,00 | 10,00 % | 140,00 | |
| 1.30.20.50 Gliederung, direkt hinter 40 | 1.400,00 (40 wird übersprungen, gleiche Basis) | 10,00 % | 140,00 | |
| 1.30.20.70 Gliederung | 100,00 (nur 60; 50 beendet den Bereich) | 10,00 % | 10,00 | 100+400+900+140+140+100+10 = **1.790,00** |
| 1.30.30.30 Liste | 400,00 (1.30.30.20) | 10,00 % | 40,00 | |
| 1.30.30.40 Liste, Bezug in anderem Bereich | 2.791,00 (1.10.30.20 = 100,000 × 27,910) | 10,00 % | 279,10 | 100 + 400 + 40 + 279,10 = **819,10** |
| Bereich 1.30 | | | | 1.450,50 + 1.790,00 + 819,10 = **4.059,60** |
| 002.001.0030 Gliederung (Bauausführung) | 450.000 + 400.000 = 850.000,00 (0040 steht dahinter) | 10,00 % | 85.000,00 | **935.111,00** |

Rechenregeln (eine benannte Funktion je Regel, Konstante mit Status wie `SUMMEN_ANNAHMEN`):

- **R1 Betrag** = kaufmännisch gerundet(Basis × Satz / 100, 2) (`prozentVon` aus `dezimal`). Ohne Satz kein Betrag
  (`gesamtpreis: null`), außer bei der Altform (R8).
- **R2 Basis** = Summe der GP der Bezugspositionen, die selbst einen GP haben. Eine Zuschlagsposition ist nie Basis.
  Vorschlag (protokollieren): nur Bezugspositionen, deren Betrag ins Netto geht (keine Wahl mit Variante ≠ 0, kein Bedarf
  ohne Gesamtbetrag). Einen Positionsnachlass (`DiscountPcnt` am `Item`) gibt es in v1 nicht (G-23); im Test steht
  1.30.10.30 deshalb als 30,000 × 28,500 = 855,00.
- **R3 Bezugsform `gliederung`** (`AllInCat`): Geschwister unter demselben Elternknoten (Gliederung oder Wurzel), die
  **vor** der Zuschlagsposition stehen. Rückwärts ab der Zuschlagsposition: erst unmittelbar davor stehende
  Zuschlagspositionen überspringen (sie teilen dieselbe Basis), dann Positionen sammeln bis zur nächsten
  Zuschlagsposition oder zum Anfang des Elternknotens. Hinweistexte werden übersprungen. Vorschlag (protokollieren):
  Untergliederungen unter demselben Elternknoten werden übersprungen, sie beenden den Bereich nicht und zählen nicht
  (GAEB kennt Gliederungen und Positionen nie nebeneinander; der Kern erlaubt es).
- **R4 Bezugsform `kennzeichnung`** (`IdentAsMark`): derselbe Bereich wie R3, davon nur Positionen mit
  `zuschlagskennzeichen`.
- **R5 Bezugsform `positionen`** (`ListInSubQty`): die genannten Positionen, wo immer sie im LV stehen, auch hinter der
  Zuschlagsposition. `teilmenge: null` → der GP der Bezugsposition. `teilmenge` gesetzt → gerundet(Teilmenge × EP, 2).
  **Lücke, nicht aus den Daten belegt:** Keine amtliche Datei führt eine Teilmenge (`MarkupSubQty` enthält nur
  `RefItem`); die Regel für Teilmengen ist eine vorläufige Annahme und wird als `D-xx` protokolliert.
- **R6** Der Betrag geht in die Gliederungssumme und, je nach Merkmalen der Zuschlagsposition, in Netto, Bedarfs- oder
  Wahlsumme (Teil 1), wie ein GP.
- **R7 Preisquelle.** `vergabe` muss mit den Preisen eines Bieters nach genau diesen Regeln rechnen können, ohne die
  Regel zu kopieren. Ticket 36 macht das über ein „gedachtes LV“: die Knoten des Ausschreibungs-LV, jede Position mit dem
  EP des Angebots (`null` bei „nicht angeboten“), darauf `summenBerechnen`. Ticket 44 setzt in dieses gedachte LV an jeder
  Zuschlagsposition den Satz des Bieters als `zuschlag.prozentsatz` ein. Damit das trägt, gilt: `summenBerechnen(lv)`
  rechnet nur aus den Daten des übergebenen LV (Menge, EP, Satz, Merkmale), ohne Zwischenspeicher, der an der Identität
  des Ausschreibungs-LV hängt. Zusätzlich exportiert der Kern (Vorschlag, Name frei)
  `zuschlagsbasen(lv): ReadonlyMap<PositionId, { basis: Betrag; betrag: Betrag | null; bezugOhnePreis: boolean }>`,
  damit `vergabe` Basis und Betrag je Zuschlagsposition anzeigen und eine Bezugsposition ohne Preis kennzeichnen kann
  (Ticket 44). Eine eigene Schnittstelle „Preisquelle“ ist nicht nötig; wer sie trotzdem einführt, protokolliert das.
- **R8 Altform** (Vorschlag, protokollieren): Eine Zuschlagsposition ohne Satz, aber mit Menge und EP rechnet wie bisher
  Menge × EP. Grund: Fixture `typisch` und `gross` (Annahme A4) sowie gespeicherte Projekte der Schemaversion 1 tragen
  Zuschlagspositionen in dieser Form; ohne die Regel änderten sich ihre Summen still (Q5), und fünf Pakete müssten im
  selben Ticket ihre Fixture-Testhelfer umbauen. Die Umstellung von `typisch` auf die GAEB-Form (E-03) macht Ticket 44.
  K8 (Ticket 41) meldet die Altform als Befund.
- **Löschen einer Bezugsposition** (`KnotenLoeschen`, auch im Unterbaum): Der Verweis verschwindet im selben ChangeSet aus
  jeder Bezugsliste (geänderte Zuschlagsposition unter `knoten.geaendert`), damit `pruefeLvInvarianten` hält und die
  Umkehrung ihn zurückbringt. Kein stiller Verlust: Undo stellt ihn her.
- **Neuberechnung im Teilbaum (A6, Q4).** Ändert sich ein GP, ändern sich die Zuschlagspositionen, deren Bereich (R3/R4)
  die Position enthält, und jede Zuschlagsposition, deren Liste (R5) sie nennt, auch in anderen Gliederungen (Rückwärtsindex
  Bezug → Zuschlag, je Zustand gemerkt wie der Baumindex). Anlegen, Löschen, Verschieben und Merkmaländerungen im
  Elternknoten berechnen die Zuschlagspositionen dieses Elternknotens neu. Das ChangeSet enthält alle geänderten
  Positions- und Gliederungssummen.

### 3. Einheitspreisanteile (K7)

- **Handler `EinheitspreisanteileSetzen`** (Schlüssel verschwindet aus `ZUSTAENDIGES_TICKET`). Vorschlag (protokollieren):
  Sind Anteile gesetzt, wird der EP im selben ChangeSet zur Summe der gesetzten Anteile (EP-Skala 3), GP und Summen ziehen
  nach. `epa: null` entfernt nur die Anteile, der EP bleibt. Beleg: in der X86 oben ist `UP` 27,910 = 2,230 + 23,120 +
  2,560 + 0,000, bei 1.10.30.10 ist 30,000 = 5,120 + 4,880 + 0,000 + 20,000. `EinheitspreisAendern` an einer Position mit
  Anteilen lässt die Anteile stehen; die Abweichung meldet K8 (Ticket 41). Anteile an einer Zuschlagsposition (nicht
  Altform) → `knotenart-unzulaessig`.
- **Anteilsummen je Ebene** (altes Ticket 17): reine Funktion `epaSummen(lv)` → je Gliederung und für das LV je Anteil
  die Summe von gerundet(Menge × Anteil, 2) über die Positionen, die ins Netto gehen. Nicht im ChangeSet (der Vertrag hat
  dafür kein Feld). Golden: 1.10.30.20 mit Menge 100,000 ergibt 223,00 / 2.312,00 / 256,00 / 0,00, zusammen 2.791,00 = GP.

### 4. Neue Fixture `fixtures/zuschlag.json`

Ein selbst verfasstes LV (eigene Texte, Zahlen aus der Tabelle oben, C4), das alle drei Bezugsformen enthält: Titel 01
mit Untertiteln 01.01 (Kennzeichnung), 01.02 (Gliederung, zwei Zuschlagspositionen direkt hintereinander), 01.03 (Liste,
eine Bezugsposition in Titel 02); Titel 02 mit der Position 100,000 m × 27,910 und ihren Anteilen. MwSt 19,00 %, kein
Nachlass. Sollwerte: Titel 01.01 1.450,50 · 01.02 1.790,00 · 01.03 819,10 · 01 4.059,60 · 02 2.791,00 · Netto 6.850,60 ·
MwSt 1.301,61 · Brutto 8.152,21. Das Fixture-Format bekommt dafür additiv die Felder `zuschlag` (Form wie im Vertrag) und
`zuschlagskennzeichen`; `erzeugen.mjs` rechnet die Sollwerte **unabhängig** vom Kern mit `rechnen.mjs` (BigInt), so dass
Kern und Generator zwei getrennte Zähler sind. Alle anderen Fixture-Dateien bleiben byte-gleich.

## Grenzen

- **Paket `packages/kern`.** Benannte Ausnahmen von P2: `GLOSSARY.md` (L2) und in `fixtures/` nur additiv
  (`erzeugen.mjs`, `fixtures.test.mjs`, `README.md`, neue Datei `zuschlag.json`); vorhandene Fixture-Dateien bleiben
  byte-gleich. Kein anderes Paket wird angefasst; `typisch`, `gross` und `typisch-angebote` stellt Ticket 44 um.
- **Glossar (L2):** Eintrag „Zuschlagsposition“ an die Regel anpassen (Satz auf die Basis, drei Bezugsformen, Altform),
  neu „Zuschlagsbasis“ (Summe der GP der Bezugspositionen) und „Altform der Zuschlagsposition“.
- Bis `speicher` Schema 2 hat (Ticket 38), weist `speicher` ChangeSets mit den Ausweisen ab (`pruefeSummenfelder`). Das
  ist erwartet und kein Grund, die Ausweise wegzulassen; `apps/web` (39) wartet auf 38.
- Nicht raten, sondern entscheiden und protokollieren: jede mit „Vorschlag“ markierte Regel.
- **Zu groß?** Zuerst streichen: Teil 4 (die Fixture; die Goldens stehen dann nur als Kern-Test), danach `epaSummen`, danach
  der Leistungstest. Teil 1 und 2 bleiben.

## Acceptance criteria

- [ ] `PositionsmerkmaleSetzen` und `EinheitspreisanteileSetzen` sind zuständig; `ZUSTAENDIGES_TICKET` nennt sie nicht mehr
- [ ] Je Merkmalskombination ein Test für das Ziel des Betrags (Netto, Bedarfssumme, Wahlsumme, nirgends), darunter Bedarf im Stundenlohn, Wahl mit Bedarf, Grundausführung Variante 0, Pauschal ohne Menge
- [ ] `summeBedarfOhneGesamtbetrag` und `summeWahl` sind in `Gesamtsummen` und jeder `Gliederungssumme` gesetzt; für `typisch` 586,80 und 5.880,00 (aus den Fixture-Sollwerten von 01.0040 und 02.0070 A), Netto unverändert 55.463,41
- [ ] Die fünf Formprüfungen aus Teil 1 weisen mit `ungueltige-eingabe` und dem genannten `feld` ab, je ein Test
- [ ] Golden-Tests mit den Zahlen der Tabelle in Teil 2: alle sechs Zuschlagspositionen aus 1.30 und 002.001.0030, Gliederungssummen 1.450,50, 1.790,00, 819,10, 4.059,60 und 935.111,00; der Test nennt Datei und Element (`ID`) wie oben
- [ ] Je Bezugsform ein Test, dass eine Änderung an einer Bezugsposition den Zuschlagsbetrag im ChangeSet aktualisiert (auch Bezug in anderer Gliederung); Löschen einer Bezugsposition entfernt den Verweis und ist umkehrbar
- [ ] Gedachtes LV (R7): ein Test ersetzt in einem LV alle EP und Sätze durch die eines Bieters und bekommt mit `summenBerechnen` die nachgerechneten Bieterzahlen; `zuschlagsbasen` liefert Basis, Betrag und das Kennzeichen „Bezug ohne Preis“
- [ ] Altform (R8): `typisch` und `gross` rechnen unverändert; die vorhandenen Fixture-Tests des Kerns bleiben grün
- [ ] Property-Test: nach jeder Befehlsfolge (inkl. Merkmale, Zuschläge, EPA) ist der Summenstand gleich `summenBerechnen`, und `changeSetUmkehren` stellt den Zustand exakt her
- [ ] EPA: EP folgt den Anteilen; `epaSummen` ergibt den Golden aus Teil 3
- [ ] Leistung (Q4): Mengenänderung an einer Bezugsposition in einem LV mit 5.000 Positionen und Zuschlagspositionen aller drei Formen < 16 ms (Messwert im Ticket)
- [ ] `fixtures/zuschlag.json` mit unabhängig berechneten Sollwerten; Kern-Test vergleicht dagegen; andere Fixtures byte-gleich
- [ ] `GLOSSARY.md` angepasst; jede Demo-Entscheidung steht als `D-xx` in `entscheidungen-auto.md`
- [ ] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Prüfregeln und Befunde (41), Kopieren/Verschieben/Papierkorb (42), Preise und Satz eines Bieters (44), Umstellung der
Fixtures `typisch`, `gross`, `typisch-angebote` (44), GAEB-Abbildung von `MarkupType`, `UPComp` und Teilmengen (32, 40,
45), Zeitansatz (kein Vertragsfeld), Positionsnachlass (G-23), das Wählen einer Wahlposition (Welle 4), Änderungen an `vertrag`.

## Comments

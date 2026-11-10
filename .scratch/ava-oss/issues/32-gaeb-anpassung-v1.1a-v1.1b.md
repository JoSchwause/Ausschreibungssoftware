# 32: Anpassung `gaeb` an v1.1a/v1.1b (`wurzelId`, 3.1, `losStufe`, Merkmale, Langtext, Kopfdaten lesen)

Status: claimed
Type: task
Welle: 3 (Phase A) · Strang: G · Paket: `packages/gaeb`
Blocked by: -
Regeln: F1, F2, F4, F5, F6, N1, N4, Q3, Q5, U5, C4, L1, ADR 0010
Herkunft: Ticket 24, Comments „Folgetickets: gaeb“; Ticket 26, Comments Punkt 1–6 (Abbildung auf GAEB) und „Folgetickets: gaeb“; D-02, D-03 (`entscheidungen-auto.md`); Abschnitt C (`next-decisions-welle-2.md`)

## What to build

Der Leser (X81/X83, GAEB DA XML 3.3) füllt das Inhaltsmodell von v1.1b, statt es auf eine einzelne Positionsart
herunterzubrechen, und räumt die Marker `// v1.1a/v1.1b: mechanisch angepasst, Folgeticket` in `lesen.ts` und
`testhilfen.ts` ab. Die Element- und Attributnamen unten sind GAEB-Namen aus den amtlichen Dateien unter
`fixtures/extern/` (dort nachsehen; jede Aussage hier ist an einer Datei zu prüfen, nicht aus dem Gedächtnis).

**v1.1a**
1. **Wurzel nur noch im Inhalt.** `GaebLesungErgebnis.wurzelId` entfällt; die Wurzel steht in `inhalt.wurzelId`
   (`baueInhalt`, `leseGaeb`, Export in `index.ts`). Aufrufer und Tests lesen sie dort.
2. **Version 3.1.** `GaebVersion` kennt `3.1`: eine 3.1-Datei (Namensraum `…/200407`, `erkennung.ts`) meldet
   `version: '3.1'` statt `null`, weiterhin mit Befund `version-nicht-unterstuetzt` und ohne Inhalt (G4).
3. **Los-Stufe (F1).** Liest die Maske (`leseMaske`) ein `Lot` an erster Stelle der Gliederung, setzt sie
   `losStufe: true`; sonst bleibt das Feld weg. Tiefere `Lot`-Stufen bleiben `los-zu-titel` wie heute.
4. **Überlauf-Codes.** Die Befundcodes zum OZ-Überlauf (`oz-ueberlauf`, `oz-teil-ueberlauf`, `oz-maske-ueberlauf`)
   prüfen: Wo sie dasselbe meinen wie der Befehlsfehler `oz-ueberlauf` des Vertrags, gleicher Name; sonst bleiben sie
   und die Comments sagen, warum. Goldens nur ändern, wenn ein Name sich ändert.

**v1.1b (Merkmale, Wahl, Zuschlag)**
5. **Alle Merkmale zugleich (F5).** `Bedarf` (`Provis`: `WithTotal`/`WithoutTotal`), Wahl, Stundenlohn (`HourIt`),
   Pauschal und das Zuschlagskennzeichen (`MarkupIt`) werden **unabhängig** gesetzt. Die Rangfolge „Wahl vor Bedarf vor
   Stundenlohn“ (`lesen.ts`, Marker bei Zeile ~115 und ~811) und der Befund `positionsart-kombination` entfallen.
6. **Wahl (F4, E-04).** `gruppe` und `variante` aus `ALNGroupNo`/`ALNSerNo` (Befund `wahl-variante-nicht-abgebildet`
   entfällt). Variante 0 ist die Grundausführung: die Position bekommt `wahl` mit `variante: 0` und
   `grundpositionId: null` (so sagt es der Vertragskommentar an `Positionsmerkmale.wahl`). `grundpositionId` der
   Alternativen wie heute (Marker ~845). **Achtung Summen:** Der Kern zählt heute jede Position mit `wahl` nicht mit;
   Variante 0 zählen richtet Ticket 37. Das steht als Hinweis in den Comments, der Leser erfindet nichts dafür.
7. **Zuschlag (F3, D-03).** Alle drei Bezugsformen: `ListInSubQty` → `positionen` (mit `RefItem`, Teilmenge nur, wenn
   eine amtliche Datei sie zeigt, sonst `null` und Vermerk), `AllInCat` → `gliederung`, `IdentAsMark` → `kennzeichnung`;
   Prozentsatz aus `Markup`, falls vorhanden (X81/X83 tragen meist keinen). Der Befund `zuschlag-bezug-nicht-abbildbar`
   bleibt nur für Formen, die wirklich nicht passen (Marker ~880, ~951).

**v1.1b (Langtext, Kopfdaten, Leitbeschreibung)**
8. **Langtext (F6, E-10).** `text.ts` liest die GAEB-abbildbare Teilmenge in die Bausteine von v1.1b, wie in Ticket 26,
   Comments Punkt 5 „Abbildung auf GAEB“, beschrieben: `span` mit `font-weight`/`font-style`/`text-decoration` →
   Textlauf mit `fett`/`kursiv`/`unterstrichen`; `br` → `umbruch`; `p` → `absatz`; `ul`/`ol`/`li` → `liste`;
   `table`/`tr`/`td` mit `colspan` → `tabelle`; `image` → `bild` (wie heute); `TextComplement` (`Kind`, `MarkLbl`,
   `Empty`, `ComplCaption`/`ComplBody`/`ComplTail`) → `ergaenzung`, nur auf oberster Ebene (sonst Befund). Ein `\n` im
   Text entsteht nicht mehr; Zeilenumbrüche sind `umbruch`. `formatierung-verworfen` meldet nur noch, was nicht
   abgebildet ist: Schriftart, -größe, Farbe, Ausrichtung, Seitenumbruch, Bildgröße, Tabellenbreiten, `ComplBodyDec`,
   `ArtChrIdent`. Der Kopfkommentar von `text.ts` wird neu geschrieben.
9. **Kopfdaten (E-11).** `OWN` → `inhalt.auftraggeber` (`Address/Name1`, `Street`, `PCode`, `City`; `AwardNo`);
   `AwardInfo` → `inhalt.vergabeinformationen` (`OpenDate`, `OpenTime`, `SubmLoc`, `CnstStart`, `CnstEnd`, `ContrNo`,
   `ContrDate`, `AcceptType`, `WarrDur`/`WarrUnit`). Felder ohne Wert `null`; fehlt das Element ganz, fehlt das Feld.
   Nicht abgebildete Teile (`DPNo`, `Cat`, `EvalEnd`, `Cur`, `CurLbl`) bleiben Befund `nicht-abgebildet`.
10. **Leitbeschreibung (E-11).** `Item` mit `SumDescr` = Yes und `SubDescr` (`SubDNo`, `Description`, `QtySpec`, `Qty`,
    `QU`) → `leitbeschreibung.unterbeschreibungen`. `SumDescr` steht heute in der Liste nicht abgebildeter Elemente
    (`lesen.ts` ~105): dort streichen.
11. **Einheit.** Eine leere `QU` ergibt `null`, nie `''` (Vertrag v1.2). `----` bleibt Text.
12. **Testhelfer.** `positionsartVon`/`bezugVon` in `testhilfen.ts` (Marker ~62) werden durch Prüfungen auf
    `merkmale`/`zuschlag` ersetzt oder gelöscht; die Ausschließlichkeits-Prüfung fällt mit Punkt 5 weg.

## Grenzen

- **Größer als 4 h.** Wird es eng, in dieser Reihenfolge abgeben (Folgeticket `gaeb`, Comments): Punkt 10, Punkt 9,
  Tabellen aus Punkt 8. Punkt 1–7 und der Rest von 8 bleiben (G2/Ticket 40 baut darauf).
- Nur Lesen. Schreiben (X81/X83/X86) ist Ticket 40, X84 und der Bieter-Zuschlagssatz sind Ticket 45.
- Jede geänderte Golden-Datei (`testdaten/golden`) bekommt in den Comments eine Zeile: welcher Befund oder Wert sich
  warum ändert. Die BVBS-Zählung (`zaehlung-bvbs.test.ts`, 12/28/4) bleibt grün oder die Abweichung ist begründet.
- Ticket 29 ergänzt `testIds()` in `testhilfen.ts` um zwei markierte Methoden (`papierkorbeintrag`, `lvStand`);
  beim Zusammenführen übernehmen.
- Keine Änderung an `vertrag`. `okf/research/` wird nicht gelesen (C3). Offene Punkte entscheidet der Umsetzer und
  protokolliert sie in `.scratch/ava-oss/entscheidungen-auto.md` (Demo-Modus).
- TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün.

## Acceptance criteria

- [x] `GaebLesungErgebnis` hat kein Feld `wurzelId` mehr; `inhalt.wurzelId` ist gesetzt, wenn `inhalt` gesetzt ist
- [x] 3.1-Musterdatei: `version: '3.1'`, Befund `version-nicht-unterstuetzt`, `inhalt: null`
- [x] Eine Datei mit `Lot` an erster Stelle liefert `ozMaske.losStufe === true`; ohne `Lot` fehlt das Feld
- [x] Test: eine Position mit Bedarf und Stundenlohn zugleich wird mit beiden Merkmalen gelesen, ohne Befund `positionsart-kombination`
- [x] Wahlpositionen der AVA-X81 tragen `gruppe` und `variante` wie in der Datei (0, 1, 2); Grundausführung mit `variante: 0`
- [x] Je Bezugsform eine Zuschlagsposition aus einer amtlichen Datei korrekt gelesen (Bezug, Kennzeichen an den Bezugspositionen)
- [x] Langtext: eine Position mit Liste, eine mit Tabelle (`colspan`), eine mit Textergänzung aus den amtlichen Dateien ergeben die erwarteten Bausteine (Golden); `formatierung-verworfen` nur noch für die oben genannten Reste (plus weitere nicht abgebildete Formate der Dateien, siehe Comments)
- [x] `OWN`, `AwardInfo` und eine Leitbeschreibung aus der AVA-X81 erscheinen im Inhalt (Golden)
- [x] Kein Marker `mechanisch angepasst` mehr in `packages/gaeb`
- [x] Jede Golden-Änderung in den Comments begründet
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

Writer und eigene Prüfung (Ticket 40). X84 → Angebot (Ticket 45). GAEB 3.2 und 90/2000 (G4). Rechenregeln für Wahl,
Bedarf und Zuschlag (Ticket 37). Befehle zum Bearbeiten der Kopfdaten (D-02, mit U4).

## Comments

### Umsetzung (Branch `ticket/32-gaeb-v1.1a`)

Alle Punkte 1–12 umgesetzt, nichts abgegeben. Neue Tests: `langtext.test.ts` (Seam `leseGaeb`, kleine selbst
geschriebene Dateien je Regel, Golden aus der AVA-X81), Kopfdaten-, Leitbeschreibungs-, Merkmal-, Wahl- und
Zuschlagstests in `lesen.test.ts`/`grenzen.test.ts`. BVBS-Zählung (12/28/4) unverändert grün. Protokoll: D-32.1 in
`entscheidungen-auto.md`.

### Entscheidungen (Frage – Entscheidung – Grund)

- Überlauf-Codes (Punkt 4) – `oz-ueberlauf`, `oz-teil-ueberlauf`, `oz-maske-ueberlauf` bleiben – Der Befehlsfehler
  `oz-ueberlauf` meint „die Vergabe findet auch mit Schritt 1 keine freie Nummer mehr“; die Lesecodes melden eine
  vorhandene OZ über 14 Zeichen, einen Teil länger als seine Stelle bzw. eine Maske über 14 Zeichen. Gleicher Name
  hieße gleiche Behandlung in der Oberfläche, die Lage ist aber eine andere (Datei vs. Befehl). Keine Golden-Änderung.
- Grundausführung – `wahl: { gruppe, variante: 0, grundpositionId: null }`; Alternativen verweisen wie bisher auf die
  erste Variante 0 derselben Gruppe im selben `Itemlist` – Vertragskommentar. **Summen:** Der Kern zählt heute jede
  Position mit `wahl` nicht mit, also auch Variante 0; das richtet Ticket 37, der Leser erfindet nichts dafür.
- Unvollständige ALN-Angabe – Position ohne `wahl`, Befund `wahl-angabe-unvollstaendig` wie bisher – eine Wahl ohne
  Variante wäre weder Grund- noch Alternativposition.
- Merkmale an `MarkupItem` – dieselben Merkmalelemente werden auch an der Zuschlagsposition gelesen – F5, „Bedarf mit
  jeder Art“ (Vertragskommentar an `zuschlag`).
- Zuschlag – `IdentAsMark` → `kennzeichnung`, `AllInCat` → `gliederung`, `ListInSubQty` → alle `RefItem` in
  Dateireihenfolge; `teilmenge` immer `null` (keine amtliche Datei zeigt `SubQty`; steht eins da, Befund
  `nicht-abgebildet` „MarkupSubQty/SubQty“); `Markup` → `prozentsatz`, sonst `null`. `zuschlag-bezug-nicht-abbildbar`
  nur noch bei fehlender/ungültiger Bezugsform (dann Liste aus den `RefItem`, sonst leer) und bei `RefItem` an
  `AllInCat`/`IdentAsMark` (nicht übernommen). Befundfeld jetzt `zuschlag.bezug` statt `bezugspositionId`.
- Langtext, Form – `span`/`br` ohne `p` bleiben lose (kein Absatz erfunden); ein leeres `p` bleibt leerer Absatz
  (Leerzeile); ein `p` mit Liste/Tabelle darin wird dort geteilt; benachbarte Textläufe gleicher Auszeichnung
  verschmelzen, leere entfallen (Kanon wie Ticket 34); Zeilenwechsel im Dateitext werden ein Leerzeichen (kein `\n`).
- Langtext, Reste – `formatierung-verworfen` nennt außer der Ticketliste auch Durchgestrichen, Hoch- und Tiefstellung,
  Rahmen, Einzug und Abstand, Listenstil, `Attribut org` (an `table`) und unbekannte Elemente – die AVA-X81 trägt sie;
  sie zu verschweigen wäre stiller Verlust (Q5). Die Meldung heißt jetzt „Formatierung verworfen … Der Text bleibt
  ohne diese Formatierung erhalten“.
- Textergänzung nicht auf oberster Ebene oder ohne gültiges `Kind`/`MarkLbl` – Text bleibt (im Fluss bzw. als
  Absatz), neue Befunde `ergaenzung-nicht-oben` bzw. `ergaenzung-ungueltig` – kein Verlust, keine erfundene Herkunft.
- Kurztext – bleibt Einzeiler; Auszeichnung, Liste, Tabelle, Textergänzung darin sind `formatierung-verworfen`
  („… im Kurztext“), weil der Vertrag dort nur eine Zeichenkette hält.
- Hinweistext – ein Detailtext nur aus leeren Absätzen gilt als leer (dann trägt wie bisher der Kurztext) – sonst
  ginge der Text eines Hinweises der Bauausführung-X83 verloren.
- Kopfdaten – Datum/Uhrzeit nur in der Form `JJJJ-MM-TT`/`HH:MM:SS`, sonst `null` und Befund `wert-ungueltig`;
  Gewährleistung nur mit Zahl und Einheit, sonst `null` und `wert-ungueltig`; leere Elemente (`<ContrNo/>`) ergeben
  `null`. Nicht abgebildete Kinder (`OWN/DPNo`, `AwardInfo/Cat|Cur|CurLbl|EvalEnd`, weitere Adressfelder) sind
  `nicht-abgebildet` (auch leere wie `<CurLbl/>`).
- Leitbeschreibung – Menge nur bei `QtySpec` = Yes (sonst `null`; `Qty` ohne `QtySpec` ist Befund); `StLNo` und
  `ComplTSA` der Unterbeschreibung sind `nicht-abgebildet`; `SubDescr` ohne `SumDescr` Yes wird trotzdem übernommen
  (Befund `leitbeschreibung-ohne-kennzeichen`); fehlende `SubDNo` ist Befund `unterbeschreibung-ohne-nummer`.
- Testhelfer – `positionsartVon`/`bezugVon` gelöscht; neu `ohneMerkmale` und `alleBausteine` (flacht verschachtelte
  Bausteine für Zählungen ab). Ticket-29-Methoden in `testIds()` übernommen, Marker entfernt.

### Golden-Änderungen (`packages/gaeb/testdaten/golden`)

- Alle 15 `.golden.jsonl`, erste Zeile: Die Zusammenfassung zählt jetzt `merkmale` (ohne, bedarf, wahl, stundenlohn,
  zuschlagskennzeichen, leitbeschreibung), `zuschlaege` je Bezugsform und `langtextBausteine` statt der einen
  `positionsarten` und zeigt `auftraggeber`/`vergabeinformationen` – seit v1.1b gibt es keine einzelne Art mehr.
- `ava-x81`: vier `zuschlag-bezug-nicht-abbildbar` entfallen (alle Bezugsformen abbildbar); `positionsart-kombination`
  (Hilfskraft: Bedarf + Stundenlohn) entfällt (F5); `wahl-variante-nicht-abgebildet` entfällt (Gruppe/Variante
  gespeichert); `nicht-abgebildet` für `Item/SumDescr`, `Item/SubDescr`, `Item/MarkupIt`, `Award/OWN`,
  `Award/AwardInfo` entfällt; neu `nicht-abgebildet` für `SubDescr/Description/StLNo` (3),
  `SubDescr/CompleteText/ComplTSA` (1), `AwardInfo/Cat|Cur|CurLbl|EvalEnd`; `formatierung-verworfen` zählt 91 statt 88
  Texte (die drei Langtexte der Unterbeschreibungen werden jetzt gelesen) und nennt nur noch nicht abgebildete Arten.
- `bauausfuehrung-x83`: `zuschlag-bezug-nicht-abbildbar` (AllInCat) und `wahl-variante-nicht-abgebildet` entfallen;
  `Item/SumDescr`, `Item/SubDescr`, `Award/OWN`, `Award/AwardInfo` nicht mehr `nicht-abgebildet`, dafür `OWN/DPNo`,
  `AwardInfo/Cur`, `AwardInfo/CurLbl`; `formatierung-verworfen` 7 statt 9 Texte (Textergänzung und Absatzformat sind
  jetzt abgebildet), Arten Ausrichtung, Bildgröße, Farbe, Schriftart, Schriftgröße.
- `texterstellung-x81`: `formatierung-verworfen` entfällt (die einzige Art war die Textergänzung);
  `Award/AwardInfo` → `AwardInfo/Cur`, `AwardInfo/CurLbl`.
- `fehler-01` … `fehler-12`: erste Zeile wie oben, `Award/AwardInfo` → `AwardInfo/Cur`; die Befunde der Fehlerfälle
  selbst unverändert.
- Neu `ava-x81-langtext.golden.json`: Langtext der Positionen „Formatierungen“, „Textausrichtung“ (Listen),
  „Position mit Katalogzuordnungen“ (Tabelle mit `colspan` 3/4), „Position mit 3 TE Bieter“ (Textergänzungen) und
  die Leitbeschreibung „Trennwand …“; Bilddaten gekürzt.

### Offen / Hinweise

- REUSE: `ava-x81-langtext.golden.json` enthält längere Textauszüge der amtlichen AVA-X81 und steht heute unter der
  Repo-Lizenz (`REUSE.toml`, `**`). Ob ein Override wie für `fixtures/extern/bvbs/**` nötig ist, entscheidet der
  Orchestrator (Datei außerhalb `packages/gaeb`, nicht geändert).
- Ticket 37: Variante 0 trägt jetzt `wahl` (siehe oben, Summen).
- Ticket 40 (Writer): lose Inline-Bausteine, leere Absätze und die Kanonisierung oben sind die Form, die der Leser
  liefert; ein Rundweg Import → Export → Import kann auf Gleichheit prüfen.

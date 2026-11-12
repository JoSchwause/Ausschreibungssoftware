# 95: `vertrag` v1.5: Kleinpunkte aus Welle 5

Status: done-by-agent
Type: task
Welle: 6 · Strang: F · Paket: `packages/vertrag` (+ markierte mechanische Zeilen); P9 (Mensch prüft; im Demo-Lauf Opus-Review,
D-42-Muster)
Blocked by: –
Modell: opus
Regeln: A4, L2, U5, P9, Q5, D-59
Herkunft: Ticket 71 (D-71.3), Ticket 76 (eigener `XRechnungBefund`), Ticket 80 (OZ-Vorschlag am Auftrags-LV, D-80.1), Ticket 70
(Offene Typfragen, z. B. Rechnungsdatum, Bemerkung an `Aufmassposition`, kumulierte `gefordert`-Beträge), Ticket 89 (D-89.1:
keine KG-Spalte im Grid, weil `LvSpalte` sie nicht kennt), Ticket 92 (D-92.4, D-92.6)

## What to build

Eine kleine Fassung v1.5 im Stil von Ticket 29/53/70: enge, umkehrbare Lesart im Typ, jede Lesart als Kommentar am Typ,
Alternativen als „Offene Typfragen“ unter Comments, Nicht-Additives nur mit der mechanischen Anpassung im selben Ticket
(markiert `// v1.5: mechanisch angepasst, Folgeticket`). Keine Logik außerhalb von `vertrag` (die Handler kommen in den
Folgetickets 104, 105, 106, 93, 121). Dieses Ticket läuft **vor** Ticket 97 (`vertrag` v1.6, Typen für X1–X4; D-59) und soll
klein bleiben: Ziel ist ein schneller Merge, damit 97 beginnen kann.

1. **Einheitlicher Fehlercode für Feldbefehle an einer Gliederung (D-71.3).** Heute meldet `KostengruppeSetzen` an einer
   Gliederung oder einem Hinweistext `knoten-unbekannt`, `TextquelleSetzen` dagegen `knotenart-unzulaessig`. Lesart v1.5:
   `knoten-unbekannt` nur, wenn es den Knoten nicht gibt; ein Feldbefehl, der eine Position verlangt und einen anderen
   Knoten trifft, meldet `knotenart-unzulaessig` (im LV und im Auftrags-LV). Kommentar an jedem betroffenen Befehl
   anpassen; die Umsetzung im Kern macht Ticket 105.
2. **Befundquelle für E-Rechnungen (Ticket 76).** Die gemeinsame Befundliste (`Pruefbefund`, seine Quelle) bekommt eine
   Quelle für das Lesen einer XRechnung, damit `erechnung` die gemeinsame Befundliste nutzen kann statt eines eigenen
   `XRechnungBefund` (Umstellung in Ticket 104). Ort eines solchen Befunds: der Business Term (z. B. `BT-115`) bzw. der Pfad
   in der Datei; entscheide die Form und begründe sie.
3. **OZ-Vorschlag für das Auftrags-LV (D-80.1).** Ticket 80 deutet für `ozVorschlag` eine Kennung des Auftrags-LV als
   LV-Kennung um (nur lesend). Lege fest, wie der Kern einen OZ-Vorschlag für das Auftrags-LV anbietet (Signatur am Rand des
   Vertrags, wie die übrigen Signaturen für Kern-Funktionen, falls es sie dort gibt; sonst nur Lesart am Typ), ohne
   umgedeutete Kennung. Umsetzung in Ticket 105.
4. **Offene Typfragen aus Ticket 70 sichten** (Abschnitt „Offene Typfragen“ in `issues/70-vertrag-auftrags-lv-repository.md`,
   u. a. Rechnungsdatum, Bemerkung je Aufmaßposition, ob `gefordert` kumuliert ist): je Frage entscheiden (additiv, optional)
   oder ausdrücklich vertagen, mit Grund. Nichts Nicht-Additives ohne zwingenden Grund.
5. **`LvUebersicht.netto` (D-92.4).** Additiv, optional: das gespeicherte Netto nach Nachlass des LV (`Betrag`), von `speicher`
   aus den gespeicherten Summen gefüllt (Ticket 106), damit die Projektseite das LV nicht ganz laden muss (Ticket 121). Fehlt
   = noch nicht gerechnet; nie `null`.
6. **Spalte „KG“ im LV-Grid (D-89.1, Ticket 93).** `LvSpalte` bekommt `'kostengruppe'`. Weil `LvSpalte` eine geschlossene
   Liste ist, zieht dieses Ticket `ui-grid` nur so weit mechanisch nach, dass alles wie bisher aussieht (die neue Spalte ist
   nicht in den Standardspalten und wird noch nicht gezeichnet); die echte Spalte baut Ticket 93. In `ui-grid` arbeitet zur
   selben Zeit Ticket 96 am Vergleichsgrid: ändere dort nur die nötigsten, markierten Zeilen des `LvGrid`.

Begriffe zuerst ins `GLOSSARY.md` (L2), falls neu (z. B. die Befundquelle der E-Rechnung im Eintrag „Prüfbefund“).

## Grenzen

- Nur `packages/vertrag`, dazu markierte mechanische Zeilen. Keine Typen für X1–X4 (die bringt Ticket 97).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Typen mit Kommentar im Stil von `vertrag`; Lesarten am Typ; Offene Typfragen unter Comments; Beispiele und Typtests in
      `beispiele.ts`/`vertrag.test.ts`
- [x] Jede mechanische Anpassung markiert, Liste in den Comments; Folgearbeit je Paket als Stichpunkt für die Tickets 93, 104,
      105, 106, 121 unter Comments
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

Folgearbeit App (Ticket 121): zurückgehaltene, unlesbare Druckprofile exportieren oder löschen können (D-92.6, Q5).

### Ergebnis (Branch `welle-6/95-vertrag-v1.5`, Basis `integration/welle-6`)

Typen, Lesarten, Beispiele und Typtests in `packages/vertrag/src/` (`changeset.ts`, `befehle.ts`, `gaeb.ts`, `speicher.ts`,
`ansicht.ts`, `modell.ts`, `beispiele.ts`, `vertrag.test.ts`), `GLOSSARY.md` (Prüfbefund, neu OZ-Vorschlag, Kostengruppe), dazu
drei markierte mechanische Zeilen in `packages/ui-grid`. Alles ist additiv oder eine Lesart: Kein Befehl, kein ChangeSet und
keine Projektdatei ändert sich; kein Rechenwert, keine Fixture, kein Golden geändert. Je Punkt ein Commit, das Glossar vorweg.

### Je Punkt: Datei und Typ

1. **Fehlercode (D-71.3).** `changeset.ts`: Lesart an `Befehlsfehlercode` `'knoten-unbekannt'` (nur: kein Knoten mit der
   Kennung im Baum) und `'knotenart-unzulaessig'` (auch: ein Feldbefehl trifft einen Knoten, der das Feld nicht trägt).
   `befehle.ts`: die Regel für alle Feldbefehle am Abschnitt „Felder ändern“ (dazu `LeitbeschreibungSetzen`,
   `OrdnungszahlSetzen`; der Knoten wird vor dem Wert geprüft), angepasst an `KostengruppeSetzen` (beide Aggregate, bisher
   `knoten-unbekannt`) und ausdrücklich an `TextquelleSetzen`. Kein neuer Code. Beispiel `beispielFehlerKostengruppe`.
2. **Befundquelle E-Rechnung (Ticket 76).** `gaeb.ts`: `Befundquelle` + `'erechnung-lesen'`, Lesart des Orts an `Befundort`
   (D-95.2). Beispiel `beispielBefundeERechnung` (ein Befund an einem Element mit `feld` und `pfad`, eine Summenregel nur mit
   `feld`).
3. **OZ-Vorschlag (D-80.1).** `changeset.ts`: `OzVorschlag { ordnungszahl, ozIndex, hinweis? }` und die Signatur
   `OzVorschlagen = (zustand: LvZustand | AuftragsLvZustand, ort: Einfuegeort, art: 'position' | 'titel' | 'los') =>
   OzVorschlag | null` mit Lesart (D-95.3). Beispiel `beispielOzVorschlagAuftragsLv` (Gliederung „Nachtrag N01“ → `02`).
4. **Offene Typfragen aus Ticket 70.** `modell.ts`: Lesart „kumuliert“ an `Rechnung.gefordert`; „in v1.5 vertagt“ an
   `Rechnung.eingang`, `Positionsdaten.textquelle` und `Aufmassposition`; `changeset.ts`: „bleibt“ an `AufmassChangeSet`
   (Ticket 94); der veraltete Kommentar an `Kostenermittlungseintrag` ist berichtigt; eine Verweiszeile in Ticket 70.
   Ergebnis je Frage: D-95.4.
5. **Netto in der LV-Übersicht (D-92.4).** `speicher.ts`: `LvUebersicht.nettoNachNachlass?: Betrag` (Name: D-95.5). Beispiel
   `beispielLvUebersichtNetto` (nach 10 % Nachlass 11,11, nicht das Netto 12,35).
6. **Spalte „KG“ (D-89.1).** `ansicht.ts`: `LvSpalte` + `'kostengruppe'` mit Lesart; `ui-grid` mechanisch (Tabelle unten).

Typtests in `vertrag.test.ts`, Abschnitte „v1.5 Punkt 1“ bis „Punkt 6“ und „v1.5: reine Daten und Werte vor v1.5“.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-95.0** Welche Nähte werden getestet (Demo-Modus, keine Rückfrage)? **Die öffentliche Typfläche von `@tethys/vertrag`**
  (`expectTypeOf` in `vertrag.test.ts`, geprüft von `pnpm typecheck`) und die Stimmigkeit der Beispiele zur Laufzeit; in
  `ui-grid` keine neuen Tests, die bestehenden bleiben grün. Grund: wie D-71.1 und D-76.1; `vertrag` hat keine Logik, die
  Zeilen in `ui-grid` sind mechanisch, die Spalte selbst baut Ticket 93.
- **D-95.1** Wie wird der Fehlercode einheitlich (D-71.3)? **Eine Lesart für alle Feldbefehle: `knoten-unbekannt` nur, wenn
  der Baum keinen Knoten mit der Kennung hat; `knotenart-unzulaessig` für einen vorhandenen Knoten, der das Feld nicht trägt;
  der Knoten wird vor dem Wert geprüft. Kein neuer Code.** Grund: Alle Feldbefehle des Kerns tun das heute schon, nur
  `KostengruppeSetzen` folgte dem alten Wortlaut am Typ; ein eigener Code (etwa `keine-position`) bräuchte Zeilen in jeder
  `Record<Befehlsfehlercode, …>` der App und sagte nichts Neues.
- **D-95.2** Form der Befundquelle und des Orts für E-Rechnungen? **Quelle `'erechnung-lesen'` (Name aus D-76.4; ein späterer
  ZUGFeRD-Leser meldet unter derselben Quelle). Ort im vorhandenen `Befundort`: `feld` = Business Term (`BT-115`), `pfad` =
  Element aus lokalen Namen mit `[n]` ab 1, `zeile`/`spalte` nur bei unlesbarem XML, `knotenId` nie; eine Summenregel hat nur
  `feld`, ein Befund zur Datei als Ganzes nur `pfad`.** Grund: Genau so liefert `erechnung` seine Befunde seit Ticket 76
  (D-76.4), die Umstellung in 104 ist also mechanisch. Der Business Term heißt in UBL und CII gleich, der Pfad nicht; damit
  ist `feld` der stabile Schlüssel wie bei LV-Befunden. Kein neues Feld und keine Union nach Quelle (das träfe jeden Leser
  von `Pruefbefund`).
- **D-95.3** Wie bietet der Kern den OZ-Vorschlag am Auftrags-LV an? **Als Signatur am Rand (`OzVorschlagen`, neben
  `LvBefehlAusfuehren` und den übrigen Kern-Signaturen in `changeset.ts`) mit dem Ergebnistyp `OzVorschlag` im Vertrag; der
  erste Parameter ist `LvZustand | AuftragsLvZustand`, die Wurzel die eigene Kennung des Aggregats.** Grund: Der Kern kann
  seine Funktion `ozVorschlag` rückwärtsverträglich erweitern (jeder heutige Aufruf mit `LvZustand` bleibt gültig),
  `abrechnung` übergibt das Auftrags-LV, wie es ist, und die Unterscheidung braucht kein `as` (Typtest `wurzelVon`). Der Name
  ist ein Verb wie bei den übrigen Signaturen, weil `OzVorschlag` schon das Ergebnis heißt; der Kern hat einen gleich gebauten
  Typ dieses Namens, den Ticket 105 durch den aus `vertrag` ersetzt.
- **D-95.4** Die Offenen Typfragen aus Ticket 70, je Frage (additiv entscheiden oder vertagen, mit Grund):
  - 1 und 2 (`nachtrag` und `vorlage?: true` am `LvKopf`): **bleiben.** Nachtrags-LV und Muster-LV entstehen in der App, nie
    aus einem Import (D-70.2); die Tickets 86, 90 und 92 bauen darauf, D-43 hat die Übersicht ergänzt.
  - 3: schon beantwortet (D-43).
  - 4 (Textquelle an Hinweistexten): **vertagt.** Kein Verbraucher (das Muster-LV, Ticket 90, kommt ohne aus); additiv ginge es
    nur mit einem zweiten Befehl, weil `TextquelleSetzen.positionId` eine Position nennt.
  - 5 (Kostengruppe nur an Positionen): **bleibt.** Eine Quelle je Wert; die Kostenkontrolle (D-37), die Bauteile (D-52: die KG
    eines Bauteils ist die seiner Position) und die Spalte „KG“ (Ticket 93) arbeiten je Position.
  - 6 (ganzes Aufmaßblatt im ChangeSet): **bleibt.** Ticket 94 (gemergt während dieses Tickets) hält das Budget mit einer
    Lösung in `speicher`: Einzeländerung, Undo und Redo bei 5.000 Zeilen 25–31 ms statt 63–71 ms (D-45 erledigt).
    `Aenderungen<Aufmassposition>` wäre nicht additiv (Form des ChangeSets, Protokoll, Undo) und ist nicht nötig. (Eine erste
    Fassung dieses Tickets hatte „vertagt bis Ticket 94“.)
  - 7 (Blatt- und Rechnungsnummer fest): **bleibt.** Die Reihenfolge der Rechnungen hängt an der Nummer (D-34 (7)); korrigiert
    wird über Löschen und Neuanlegen.
  - 8 (ist `gefordert` kumuliert?): **entschieden, nur als Lesart:** `netto` und `brutto` sind kumuliert wie die
    Abschlagsrechnung (D-34 (1)), `zahlbetrag` nie (BT-115: nach Abzug des Gezahlten). So vergleicht `abrechnung` schon
    (Ticket 81: Netto gegen Netto nach Nachlass, Brutto gegen Brutto kumuliert); ein Kennzeichen `kumuliert` wäre ein zweiter
    Weg zur selben Aussage, und verglichen wird ohnehin zuerst der Zahlbetrag (D-44).
  - 9 (zwei Einbehaltssätze statt einer Union nach `art`): **bleibt.** Nicht additiv; die App übernimmt beide Sätze als
    Vorschlag aus der vorigen Rechnung.
  - 10 (Bemerkung je Aufmaßposition): **vertagt.** Textzeilen einer X31 stehen in der Textform der Ansatzzeile (D-83.2); in
    Welle 6 braucht niemand das Feld. Ein neues optionales Feld ginge heute still verloren: `abrechnung` baut Blatt und Zeile
    kanonisch nur aus den Vertragsfeldern (D-80.5), `speicher` hält Spalten; es bräuchte also mechanische Zeilen in beiden.
    Die Herkunft einer Zeile aus dem Modell (D-53) entscheidet Ticket 97.
  - 11 (Nummern der Kostenermittlung eindeutig): **bleibt.** `kosten` fasst Doppelte beim Anlegen zusammen (Befund, Ticket 82).
  - 12 (zwei Typen `Kostenermittlungseintrag`): **erledigt** durch Ticket 82 (`Kostenermittlungseingabe`); Kommentar berichtigt.
  - 13 (keine Herkunft am übernommenen Nachtragsknoten): **bleibt.** `nachtragsbefunde` erkennt Übernahmen an den
    Positionsidentitäten (D-80.7); `NachtragUebernehmen.nachtragLvId` steht im Protokoll.
  - 14 (`Leistungsstand` ohne Kennungen): **bleibt.** Ticket 82 trägt sie daneben; der Leistungsstand wird nie gespeichert.
  - 15 (Rechnungsdatum): **vertagt.** Fristen laufen ab Zugang (`eingang`, VOB/B § 16); die Vorschau zeigt BT-2 aus der Datei
    (Ticket 88). Additiv bräuchte es das Feld an `Rechnung` und an `RechnungsangabenSetzen` und dieselben mechanischen Zeilen
    wie bei 10 (`abrechnung` baut die Rechnung nur aus den Vertragsfeldern); in Welle 6 braucht es niemand.
- **D-95.5** Name und Wert des Nettos in der Übersicht? **`LvUebersicht.nettoNachNachlass?: Betrag`, gefüllt aus
  `summe_gesamt.netto_nach_nachlass`, wie Punkt 5 den Wert beschreibt („das gespeicherte Netto nach Nachlass“).** Grund: `netto`
  ist in `Gesamtsummen` das Netto vor Nachlass, und das Glossar trennt „Netto“ und „Netto nach Nachlass“ (L1, L2); ein Feld
  `netto` mit dem Wert nach Nachlass wäre bei jedem LV mit Nachlass eine Falle (`uebersicht.netto` ≠ `summen.gesamt.netto`).
  **Abweichung vom Arbeitsnamen in den Tickets 95, 106 und 121** (`LvUebersicht.netto`), siehe Folgearbeit. Die Projektseite
  zeigt heute unter „Netto“ `summen.gesamt.netto` (vor Nachlass, `LvNetto.tsx`); mit dem neuen Feld ändert sich die Zahl bei
  LVs mit Nachlass.
- **D-95.6** Wie weit zieht `ui-grid` für `'kostengruppe'` nach? **Drei markierte Zeilen: Breite 72 (`tabelle.ts`), Titel „KG“
  (`texte.ts`), Anzeigetext nur lesend (`eingabe.ts`: die gespeicherte Nummer an Positionen, sonst leer).** Nicht in
  `STANDARDSPALTEN` und nicht bearbeitbar (`istBearbeitbar` und `istBearbeitbareSpalte` fallen in ihren `default`), also
  sieht alles aus wie bisher. Grund: Genau das verlangt der Typprüfer (zwei `Record<LvSpalte, …>`, ein erschöpfendes
  `switch`); eine leere Zelle statt der Nummer würde gespeicherte Daten verbergen, falls ein Aufrufer die Spalte vor Ticket 93
  nennt (Q5). `LvGrid.tsx` selbst brauchte nichts, und die Zeilen liegen fern von denen, die Ticket 96 im Vergleichsgrid
  ändert.

### Offene Typfragen (enge Lesart im Typ; Alternative hier)

1. **Ort eines E-Rechnungsbefunds in `feld` und `pfad`** (D-95.2). Alternative: ein eigenes Feld `Befundort.businessTerm`
   oder ein Ort je Quelle (Union), sobald eine dritte Art von Ort dazukommt (IFC, Ticket 97 Punkt 7).
2. **`OzVorschlagen` nimmt den ganzen Zustand** (D-95.3), obwohl nur Kennung, Maske und Knoten zählen. Alternative: ein
   neutraler Baumtyp `{ id: WurzelId; ozMaske; knoten }`, dann aber ein zweiter Weg neben dem heutigen
   `ozVorschlag(zustand, …)`.
3. **Nur das Netto nach Nachlass in der Übersicht** (D-95.5). Alternative: dazu oder stattdessen `netto?` (vor Nachlass, wie
   die Projektseite heute zeigt); `AuftragsLvUebersicht` bleibt ohne Summe.
4. **Kein eigener Code für „Feld an der falschen Knotenart“** (D-95.1). Alternative: `keine-position` o. ä. (ein neues Glied
   der geschlossenen Liste, mechanische Zeilen in der App).
5. Aus Ticket 70 weiter offen, vertagt mit Grund (D-95.4): 4, 10, 15.

### Mechanische Anpassungen außerhalb von `vertrag` (markiert `// v1.5: mechanisch angepasst, Folgeticket 93`)

`grep -rn "v1.5: mechanisch angepasst"` findet alle.

| Datei | Zeile | Was | Folgeticket |
|---|---|---|---|
| `packages/ui-grid/src/tabelle.ts` | 25 | `SPALTENBREITE.kostengruppe: 72` (Typ `Record<LvSpalte, number>`) | 93 |
| `packages/ui-grid/src/texte.ts` | 14 | `SPALTENTITEL.kostengruppe: 'KG'` (Typ `Record<LvSpalte, string>`) | 93 |
| `packages/ui-grid/src/eingabe.ts` | 126–128 | `anzeigeText`: `case 'kostengruppe'` zeigt die Nummer der Position, sonst `''` (erschöpfendes `switch`) | 93 |

Sonst brauchte kein Paket etwas: `kern`, `speicher`, `abrechnung`, `erechnung`, `gaeb`, `kosten`, `vergabe`, `ausgabe` und
`apps/web` übersetzen unverändert (nichts ist erschöpfend über `Befundquelle`, `Befehlsfehlercode` ist unverändert, die neuen
Felder und Typen sind optional bzw. neu).

### Folgetickets: was sie liefern müssen

- **93 (`ui-grid`, App):** die drei Marker durch die echte Spalte ersetzen (`BearbeitbareSpalte`, `BEARBEITBAR`, `istBearbeitbar`
  nur an Positionen, `befehlAusEingabe` → `KostengruppeSetzen` mit `null` für leer, Lesefunktion der App, `planeEinfuegen`,
  Editor); den Kommentar in `typen.ts` Zeile 34 („Standard: alle sieben in der Reihenfolge von `LvSpalte`“) anpassen, weil
  `LvSpalte` jetzt acht Werte hat; in der App `GRID_SPALTEN` (`apps/web/src/lv/pruefung.ts` Zeile 59) um `'kostengruppe'`
  ergänzen, sobald die Spalte gezeigt wird, damit ein Befund mit `ort.feld: 'kostengruppe'` an die Zelle springt.
- **104 (`erechnung`):** `XRechnungBefund` → `Pruefbefund` mit `quelle: 'erechnung-lesen'`; `ort` bleibt genau wie heute (D-95.2
  beschreibt die heutige Ausgabe: Wert- und Pflichtbefunde `{ feld, pfad }`, Summenregeln `{ feld }`, fremde Wurzel und
  Unterposition ohne Oberposition `{ pfad }`, XML-Fehler `{ zeile, spalte }`); `code` ist im `Pruefbefund` ein `string`, die
  Liste der Codes kann als eigener Typ für Tests bleiben; der Kommentar in `typen.ts` Zeilen 36–40 entfällt.
- **105 (`kern`, benannte Ausnahme `abrechnung`):** D-71.3 in `kostengruppe.ts` (`kostengruppeWechsel`, Zeilen 27–44:
  Gliederung oder Hinweistext → `knotenart-unzulaessig`, unbekannt → `knoten-unbekannt`), im LV und im Auftrags-LV; die Tests
  `lv-v14.test.ts` (Zeilen 113–117) und `auftrags-lv-v14.test.ts` (Zeilen 346–349) anpassen. `ozVorschlag` als
  `OzVorschlagen` (`export const ozVorschlag: OzVorschlagen = …`), erster Parameter beide Zustände
  (`'leistungsverzeichnis' in zustand`), `OzVorschlag` aus `vertrag` statt des eigenen Typs (`oz-vorschlag.ts` Zeile 41;
  `index.ts` Zeile 53 reicht den Vertragstyp weiter). In `abrechnung/src/nachtrag-uebernehmen.ts` `alsLvAnsicht`
  (Zeilen 157–172) und den Aufruf in Zeile 325 durch den direkten Aufruf mit dem `AuftragsLvZustand` ersetzen. Wer
  `abrechnung` ohnehin anfasst: Der Kommentar in `rechnung-pruefen.ts` (Zeilen 79–81) nennt Typfrage 8 noch offen; sie ist mit
  D-95.4 entschieden.
- **106 (`speicher`):** `LvRepository.auflisten` füllt **`nettoNachNachlass`** (nicht `netto`, D-95.5) aus
  `summe_gesamt.netto_nach_nachlass` der Zeile des LV; ohne Zeile fehlt das Feld (nie `null`); Test nach Setzen und nach Undo
  gleich `summen.gesamt.nettoNachNachlass` (wie D-43). Keine Migration nötig, die Spalte gibt es seit Schema 1.
- **121 (App):** Die Projektseite liest `LvUebersicht.nettoNachNachlass` (nicht `netto`, D-95.5). Heute zeigt die Spalte „Netto“
  `summen.gesamt.netto` (vor Nachlass): Beschriftung anpassen („Netto nach Nachlass“) oder, soll sie das Netto vor Nachlass
  zeigen, `netto?` additiv im Vertrag nachfordern (Offene Typfrage 3). OZ-Vorschlag: Die App schlägt am Auftrags-LV heute keine
  OZ vor (`lv/ozergaenzen.ts` nur im LV; die OZ des Nachtrags holt `abrechnung`), dort ist also nur zu prüfen. Der App-Text
  für `knotenart-unzulaessig` („An dieser Stelle ist diese Art von Zeile nicht erlaubt.“) passt zu Feldbefehlen nur halb;
  wahlweise schärfen. Druckprofile: siehe oben (D-92.6).

### Prüfung

Nach dem letzten `git merge integration/welle-6` (Stand `ae98b7b`: die Tickets 93, 97 und 104–121 als Dateien, Ticket 94 in
`speicher` und zwei Logeinträge): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (Lint
samt Paketgrenzen, Lizenzen und Clean Room; Vitest 207 Dateien bestanden, 1 übersprungen; 2634 Tests bestanden, 3 übersprungen
wie zuvor; Fixtures 29/29). Ein Lauf davor (Stand `1859972`, ohne 94) war ebenso grün (205 Dateien, 2622 Tests).
Kein Budget fiel, keines gelockert. Die E2E von `ui-grid` verlangt das Ticket nicht und liefen nicht: Die neue Spalte wird nur
gezeichnet, wenn ein Aufrufer sie in `spalten` nennt (`props.spalten ?? STANDARDSPALTEN`), und das tut niemand.

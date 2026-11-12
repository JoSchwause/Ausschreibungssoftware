# 98: X1a: IFC lesen (eigener STEP-Leser, IFC 2x3 und IFC 4)

Status: resolved
Type: task
Welle: 6 · Strang: X1a · Paket: `packages/ifc` (neu; dazu die Zeile in `tools/boundaries.mjs`, Workspace-Dateien, `REUSE.toml`
falls nötig)
Blocked by: –
Modell: opus
Regeln: A2, A3, N1, N3, N4, U5, Q1, Q5, C1, C4, C5, D-50, D-51, D-53
Herkunft: `plan.md` §2 X1a („IFC lesen: Modellbaum, Bauteile mit Eigenschaften und Mengen, IFC 2x3/4“), Berater D-50

## What to build

Ein reines TS-Paket (A2: kein DOM, kein I/O, keine Uhr, kein Zufall), das eine IFC-Datei im STEP-Format (ISO 10303-21,
„IFC-SPF“, Endung `.ifc`) liest und ihren **Inhalt ohne Geometrie** liefert: Bauwerksstruktur, Bauteile, Eigenschaften,
Mengen, Einheiten, Klassifikation. Geometrie und 3D macht Ticket 100 mit web-ifc; dieses Paket nutzt **kein** web-ifc und
keine andere IFC-Bibliothek (D-50). Es importiert nur `vertrag` und `dezimal` (Eintrag in `tools/boundaries.mjs`:
`'packages/ifc': ['packages/vertrag', 'packages/dezimal']`, `apps/web` darf `packages/ifc` importieren).

In diesem Ticket liefert das Paket **eigene Typen** (Leseergebnis). Die Abbildung auf die Vertragstypen `Bauwerksmodell`,
`Bauteil`, `Bauteilmenge` (Ticket 97, `vertrag` v1.6) und die Leistungsbudgets mit dem großen Modell macht Ticket 107. Halte die
eigenen Typen deshalb nahe an der Form unten, damit 107 nur abbildet.

1. **STEP lesen.** HEADER (`FILE_DESCRIPTION`, `FILE_NAME`, `FILE_SCHEMA`) und DATA. Instanzen `#n=NAME(...)`, Zeichenketten mit
   `''` und den Kodierungen `\X\hh`, `\X2\…\X0\`, `\X4\…\X0\`, `\S\`, `\P?\`; Aufzählungen `.WERT.`, `$` (fehlt), `*`
   (abgeleitet), Listen, getypte Werte `IFCLABEL('…')`, Ganzzahlen, Gleitkommatext mit Exponent (`1.E-05`, `-0.5`), Binärwerte.
   Die Datei kommt als `Uint8Array`; ASCII nach Norm, abweichendes UTF-8/Latin-1 mit Befund lesen statt abbrechen. Kommentare
   `/* … */` überspringen. Schema aus `FILE_SCHEMA`: `IFC2X3` und `IFC4` (auch `IFC4X0_ADD2` usw. als IFC4); alles andere ist ein
   Fehler `schema-nicht-unterstuetzt`; keine IFC-Datei: `keine-ifc-datei`.
2. **Zahlen (N1, N3).** Kein `number` für Mengen: der Gleitkommatext der Datei wird **exakt** als Dezimalwert gelesen
   (`3.6000000000000001` → genau dieser Wert), dann in SI-Grundeinheiten umgerechnet (exakt, z. B. mm → m durch 1000) und erst
   am Ende kaufmännisch auf 3 Stellen gerundet (Menge, G-21). Nie über `Number` gehen.
3. **Einheiten.** `IfcUnitAssignment` des `IfcProject`: `IfcSIUnit` mit Präfix (MILLI, CENTI, DECI, KILO …) für Länge, Fläche,
   Volumen, Masse, Zeit; `IfcConversionBasedUnit` über ihren Umrechnungsfaktor (exakt aus dem Text) mit Befund
   `einheit-umgerechnet`; eine Menge mit eigener `Unit` nutzt diese. Fehlt eine Einheit: Befund, Menge bleibt ohne Wert (nie 0).
4. **Bauwerksstruktur.** `IfcProject` → `IfcSite` → `IfcBuilding` → `IfcBuildingStorey` → `IfcSpace` über `IfcRelAggregates`;
   Knoten mit GlobalId, Art (`projekt`, `grundstueck`, `gebaeude`, `geschoss`, `raum`), Name, Eltern und den Mengen des Knotens
   (z. B. `Qto_BuildingStoreyBaseQuantities.GrossFloorArea`, `Qto_SpaceBaseQuantities.NetFloorArea` – die DIN-277-Größen
   rechnet Ticket 108 daraus).
5. **Bauteile.** Jedes Produkt, das über `IfcRelContainedInSpatialStructure` in einem Strukturknoten steht, und seine Teile über
   `IfcRelAggregates` (mit Verweis auf das Ganze). `IfcOpeningElement`, `IfcVirtualElement`, `IfcAnnotation`, `IfcGrid` sind
   keine Bauteile. Je Bauteil: GlobalId, IFC-Klasse (wie in der Datei, z. B. `IfcWallStandardCase`), Name, Typname
   (`IfcRelDefinesByType`), enthaltender Strukturknoten, Mengen, Eigenschaften, Klassifikation, Materialname(n).
   Doppelte GlobalId: Befund `globalid-doppelt` (beide bleiben, nichts still verworfen); GlobalId nicht in Form (22 Zeichen,
   IFC-Base64-Alphabet `0-9A-Za-z_$`): Befund.
6. **Mengen.** `IfcElementQuantity` (an Bauteil und an seinem Typ; das Bauteil überschreibt den Typ) mit `IfcQuantityLength`,
   `…Area`, `…Volume`, `…Count`, `…Weight`, `…Time` (IFC 4 hat ein Attribut `Formula` mehr als 2x3). Je Menge: Mengensatz
   (Name, z. B. `Qto_WallBaseQuantities`), Name (z. B. `NetVolume`), Art (`laenge`, `flaeche`, `volumen`, `anzahl`, `gewicht`,
   `zeit`), Wert in SI-Grundeinheit (m, m², m³, Stück, kg, s). Derselbe Name in zwei Sätzen eines Bauteils bleibt beides (mit
   Satz); entscheiden muss später, wer zuordnet.
7. **Eigenschaften.** `IfcPropertySet` (an Bauteil und Typ) mit `IfcPropertySingleValue` (Wert als Text mit IFC-Typname, z. B.
   `IfcBoolean`, `IfcLengthMeasure`), `IfcPropertyEnumeratedValue`; andere Eigenschaftsarten: Befund
   `eigenschaft-nicht-gelesen`, nichts erfunden. Eigenschaften werden später **nicht gespeichert**, nur bei Bedarf gelesen
   (D-51); halte sie im Leseergebnis getrennt von den Mengen.
8. **Klassifikation.** `IfcRelAssociatesClassification` → `IfcClassificationReference` (2x3 `ItemReference`, 4
   `Identification`) samt Name der Klassifikation. Eine dreistellige Nummer aus einer Klassifikation mit „276“ im Namen ist ein
   Kostengruppen-**Vorschlag** (Form wie `Kostengruppennummer`); sonst bleibt der Text.
9. **Robust (Q5, Sicherheit).** Größengrenze (z. B. 500 MB) und Tiefengrenze für verschachtelte Listen; ein Verweis auf eine
   fehlende Instanz ist ein Befund, kein Absturz. Property-Test: beliebige Bytes führen zu Fehler oder Befunden, nie zu einer
   Ausnahme. Ausgabe deterministisch (Reihenfolge der Datei).
10. **Testdateien.** Kleine IFC-Texte für jeden Fall selbst verfasst im Test (C4). Die Hausmodelle `fixtures/ifc/` aus Ticket 99
    nimmst du dazu, sobald sie auf `integration/welle-6` liegen (`git merge integration/welle-6`); bis dahin nicht darauf warten.
    Eine Messung mit dem großen Modell (`fixtures/ifc/erzeugen.mjs`, Ticket 99) gern, das Budget selbst prüft Ticket 107.

Begriffe zuerst ins `GLOSSARY.md` (L2), Abschnitt „Datenaustausch (GAEB) & BIM“: **Bauwerksmodell** (ein eingelesenes
IFC-Modell, unveränderlich), **Bauwerksstruktur** / **Strukturknoten** (Projekt, Grundstück, Gebäude, Geschoss, Raum),
**Bauteil** (Produkt des Modells mit GlobalId), **GlobalId** (IFC-Kennung, 22 Zeichen), **Mengensatz** (`Qto_…`),
**Bauteilmenge** (Name, Art, Wert in SI-Einheit), **Eigenschaftssatz** (`Pset_…`). Ticket 97 ergänzt die Vertragsnamen; halte
die Wörter gleich.

## Grenzen

- Keine Geometrie, keine Mengen aus Geometrie (fehlt eine Menge, ist das ein Befund). Kein Schreiben von IFC.
- Kein anderes Paket ändern außer `tools/boundaries.mjs`, Workspace-Dateien, `REUSE.toml`. Kein `vertrag`.
- `okf/research/` wird nicht gelesen (C3). Klassennamen und Attributfolgen aus der öffentlichen IFC-Spezifikation sind
  erlaubt; keine fremden Quelltexte übernehmen (C1).

## Acceptance criteria

- [x] Golden-Tests je Fall (STEP-Kodierungen, Einheiten mm/m, Umrechnung, Struktur, Bauteile, Typ-Mengen, IFC 2x3 und 4 mit
      gleichem Ergebnis), Property-Test (beliebige Bytes), Sicherheitstests (Größe, Tiefe)
- [x] Paketgrenzen-Prüfung kennt `ifc`; Lint-Regel N1 gilt für das Paket; Lizenzprüfung grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Ergebnis (2026-11-12, Branch `welle-6/98-ifc-leser`)

**Öffentliche Schnittstelle** (`@tethys/ifc`, rein nach A2, importiert nur `vertrag` und `dezimal`):

- `ifcLesen(bytes: Uint8Array, optionen?: { maxBytes?; maxTiefe? }): IfcLesung`; `STANDARD_MAX_BYTES` (500 MiB),
  `STANDARD_MAX_TIEFE` (64).
- `IfcLesung { modell: Bauwerksmodell | null; befunde: IfcBefund[] }`; `modell` ist nur `null` bei `eingabe-zu-gross`,
  `keine-ifc-datei`, `schema-nicht-unterstuetzt` (dann genau ein Befund).
- `Bauwerksmodell { schema: 'IFC2X3' | 'IFC4'; kopf: IfcKopf; struktur: Strukturknoten[]; bauteile: Bauteil[] }`, beide
  Listen in der Reihenfolge der Datei.
- `IfcKopf { beschreibung[]; name; zeitstempel; autoren[]; organisationen[]; praeprozessor; erzeugendesSystem;
  autorisierung; schemakennung }`.
- `Strukturknoten { globalId; art: 'projekt' | 'grundstueck' | 'gebaeude' | 'geschoss' | 'raum'; name; elternGlobalId;
  mengen: Bauteilmenge[] }`.
- `Bauteil { globalId; ifcKlasse; name; typ; strukturGlobalId; teilVonGlobalId; kostengruppe: Kostengruppennummer | null;
  mengen: Bauteilmenge[]; eigenschaften: Eigenschaft[]; klassifikationen: Klassifikation[]; materialien: string[] }`.
- `Bauteilmenge { satz: string | null; name; art: 'laenge' | 'flaeche' | 'volumen' | 'anzahl' | 'gewicht' | 'zeit';
  wert: Menge | null }` (SI, 3 Stellen). `Eigenschaft { satz; name; werte: { typ; text }[] }`,
  `Klassifikation { system; kennung; name }`, `IfcGlobalId = string`.
- `IfcBefund { schwere; code: IfcBefundcode; meldung; ort }` wie `Pruefbefund` ohne `quelle`; `ort.pfad` = `#n`,
  `ort.zeile`, `ort.feld` (z. B. `GlobalId`). 26 Codes, siehe `typen.ts`.

**Tests:** 13 Testdateien, 120 Tests im Paket (Golden je Fall, IFC 2x3 in mm = IFC 4 in m, Hausmodelle aus Ticket 99,
Sicherheit: Größe, Tiefe 100.000 ohne Stapelüberlauf, Kreise, fehlende Verweise; Property-Tests: beliebige Bytes, Bytes
hinter gültigem Kopf, STEP-Bausteine, verstümmelte Modelle mit Determinismus und bekannten Codes, Orakel in `bigint` für
mm → m; zusammen etwa 1,5 s). **Ganze Suite am Ende** (nach dem Merge von `integration/welle-6` mit 96, 99, 100, 101, 102,
Stand `65128af`): `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 248 Dateien / 3.156 Tests grün (3 übersprungen wie vorher),
Fixtures 42/42. In früheren Läufen mit der Standardparallelität fielen unter Lastmittel 15 bis 20 auf 4 Kernen nur
Zeitbudgets fremder Pakete, die dieser Branch nicht berührt; je allein wiederholt grün, und mit `vitest run --maxWorkers=1`
war dieselbe Suite grün (247 Dateien / 3.151 Tests vor den Tests aus 99):

| Budget | volle Suite | Datei allein |
|---|---|---|
| `speicher` Aufmaß 5.000 Zeilen (Ticket 94), < 100 ms | 133,7 ms (1 von 5 Läufen) | Mediane 27,2 / 27,0 / 28,0 ms, dreimal grün |
| `vergabe` Preisspiegel `gross` mit 5 Angeboten, < 1.000 ms | 1.542,9 / 1.190,6 / 1.065,1 ms (3 von 5 Läufen) | 625,0 ms |
| `apps/web` Undo am Aufmaßblatt 5.000 Zeilen (D-45), < 100 ms | 148,0 / 147,4 ms (2 von 5 Läufen) | Median 46,6 ms (Setzen 64,4 ms) |

Kein Budget gelockert, kein Test übersprungen. Hinweis an den Orchestrator: Mit den neuen Paketen der Welle wächst die Last
der parallelen Suite; Zeitbudgets, die Wanduhrzeit neben anderen Workern messen, werden dabei wackelig.

**Messung** (einmalig, nicht committet; das Budget prüft Ticket 107): Modell des Erzeugers aus Ticket 99
(`erzeugeModell()`, 10.000 Bauteile auf 10 Geschossen, 21,0 MB): `ifcLesen` 5 Läufe 1,60 / 1,62 / 1,68 / 1,86 / 2,00 s CPU,
Median 1,68 s bei Lastmittel 7, 10.000 Bauteile, 0 Befunde. Vorher mit einem eigenen Probemodell (10.000 Wände, 19,6 MB):
Median 1,4 s.

**Hausmodelle aus Ticket 99:** kamen kurz vor Schluss auf `integration/welle-6` und sind gemergt. `haus.test.ts`:
`haus-v1.ifc`, `haus-v1-ifc2x3.ifc` und `haus-v2.ifc` lesen sich ohne Befund; Klasse, Name, Geschoss und alle Mengen der
30 Bauteile je Stand gleichen den Sollwerten in `fixtures/typisch-bim.json` (auch in der Reihenfolge der Mengen), ebenso
BGF, BRI der Geschosse und NRF der Räume; IFC 2x3 in mm = IFC 4 in m; ein Modell des Erzeugers (600 Bauteile) ohne Befund.
Für Ticket 107 bleiben die Goldens der Abbildung auf v1.6 und das Budget.

**Was Ticket 107 abbilden muss** (Vertrag v1.6, Ticket 97):

1. Gleiche Namen: `Bauwerksmodell`, `Strukturknoten`, `Bauteil`, `Bauteilmenge` gibt es dann in `ifc` und `vertrag`; die
   eigenen Typen umbenennen oder ersetzen (D-59). Die Felder heißen schon wie in Ticket 97.
2. `Bauteilmenge.wert: Menge | null` → v1.6 kennt nur `Menge`: Mengen ohne Wert weglassen (der Befund steht schon da) oder
   den Vertrag erweitern; nie 0 einsetzen.
3. `teilVonGlobalId: null` → Feld weglassen (`teilVonGlobalId?`), `kostengruppe: null` → weglassen (`kostengruppe?`).
4. `eigenschaften`, `klassifikationen`, `materialien`, `kopf` stehen nicht im Vertrag (D-51): nicht speichern. Die
   Eigenschaften bei Bedarf (Punkt 2 von 107) können den Index des STEP-Lesers (`datenLesen`) mit `Definitionen` und
   `Eigenschaftenleser` weiterverwenden, ohne die Bauteile neu zu lesen.
5. `IfcGlobalId` (hier `string`) → Marke aus v1.6 mit Erzeugungsfunktion in `ifc`; eine nicht wohlgeformte GlobalId hat schon
   den Befund `globalid-ungueltig` (Wert wie in der Datei, `''` wenn sie fehlt).
6. `IfcBefund` → `Pruefbefund` mit der Quelle aus v1.6.

### Entscheidungen

**D-98.1 Prüfstellen (TDD).** Frage: An welchen Schnittstellen wird getestet (kein Mensch zur Bestätigung im autonomen
Lauf)? Entscheidung: Einzige Prüfstelle ist `ifcLesen`; auch STEP-Kodierungen, Zahlen und Einheiten laufen über sie (kleine
IFC-Texte im Test, C4). Grund: Der STEP-Leser ist Innenleben; so überleben die Tests jeden Umbau.

**D-98.2 Form der eigenen Typen.** Frage: Welche Namen, solange v1.6 fehlt? Entscheidung: Feldnamen wie in Ticket 97
(`satz`, `elternGlobalId`, `ifcKlasse`, `typ`, `strukturGlobalId`, `teilVonGlobalId`, `kostengruppe`), Typnamen wie im
Glossar; Abweichungen: `null` statt fehlender Felder, `wert` darf `null` sein, dazu `eigenschaften`, `klassifikationen`,
`materialien`, `kopf`. Der Typ der Art einer Menge bleibt ohne eigenen Namen (`Bauteilmenge['art']`), weil „Mengenart“ im
Vertrag den Namen der Menge meint (D-52). Grund: 107 bildet nur ab.

**D-98.3 Schreibweise der Klasse.** Frage: Die Datei schreibt `IFCWALLSTANDARDCASE`, das Ticket `IfcWallStandardCase`.
Entscheidung: Schreibweise der Spezifikation aus einer Namenstabelle (Produkte und Werttypen aus IFC 2x3 und 4, nur Namen,
C1); ein unbekannter Name bleibt in Großbuchstaben wie in der Datei. Nie auf eine Oberklasse vereinheitlicht.

**D-98.4 Zwei Schritte im STEP-Leser.** Frage: Wie wird eine 25-MB-Datei schnell und ohne Kopie als Text gelesen?
Entscheidung: Ein Lauf über die Bytes legt Nummer, Klasse, Lage und Zeile jeder Instanz ab; Parameter werden nur für
gebrauchte Instanzen zerlegt (ohne Rekursion), die Geometrie nie. Folge: Ein Syntaxfehler in einer Geometrie-Instanz ist
kein Befund. Grund: Leistung (Messung oben), A2.

**D-98.5 Exponent und exakte Zahl.** Frage: Wie wird `1.E-05` exakt gelesen, ohne `Number`? Entscheidung: Der Gleitkommatext
wird lexikalisch in die Punktnotation gebracht (der Exponent verschiebt den Punkt; `zahlen.ts`, wie `dezimalLesen` in
`erechnung`) und über `alsDezimal` geprüft; gerechnet wird nur mit `dezimal` (`multipliziere`, `runden`). Exponent höchstens
±400, sonst `menge-ungueltig`.

**D-98.6 Einheiten.** Frage: Lesarten, die das Ticket offen lässt. Entscheidung: Präfix vor dem Potenzieren
(mm² = 10⁻⁶ m²), Gramm = 10⁻³ kg; umgerechnete Einheit = Wert × Faktor ihrer Basiseinheit (höchstens 4 Stufen, gleicher
Einheitentyp); `einheit-umgerechnet` einmal je Einheit, die eine Menge betrifft (der Winkel des Projekts meldet nichts);
`einheit-fehlt` einmal je Einheitentyp; `einheit-ungueltig` einmal je Einheit; nennt eine Menge eine eigene Einheit, die
fehlt, bleibt sie ohne Wert (nie still die des Projekts); Anzahl hat keine Einheit (Stück). Kein `IfcProject`:
`projekt-fehlt`, Mengen ohne Wert.

**D-98.7 Befunde statt Erfindung.** Frage: Was ist ein Befund, was wird übergangen? Entscheidung: `bauteil-ohne-mengen`
(Warnung je Bauteil ohne jede Menge: „fehlt eine Menge, ist das ein Befund“), `menge-nicht-gelesen` (z. B.
`IfcPhysicalComplexQuantity`), `eigenschaft-nicht-gelesen` (andere Arten, ungetypte Werte), `klassifikation-nicht-gelesen`
(Zuordnung zur `IfcClassification` selbst, 2x3-Notation), `kostengruppe-mehrdeutig` (mehrere verschiedene Vorschläge; der
erste gilt). Vordefinierte Sätze wie `IfcDoorLiningProperties` sind keine `IfcPropertySet` und werden ohne Befund übergangen
(sonst ein Befund je Tür).

**D-98.8 Typ und Bauteil.** Frage: Wie wirken Typ und Bauteil zusammen? Entscheidung: Mengen und Eigenschaften des Typs
(`HasPropertySets` und, IFC 4, Beziehungen am Typ) gelten mit; das Bauteil überschreibt je (Satzname, Name). Reihenfolge:
Sätze nach ihrer Stelle in der Datei, darin die Liste. Klassifikationen: die eigenen, dann die weiteren des Typs;
Materialien des Typs nur, wenn das Bauteil keine nennt.

**D-98.9 Struktur und Bauteile.** Frage: Lesarten für unvollständige Bäume. Entscheidung: Jede Instanz der fünf Klassen ist
ein Strukturknoten; Eltern aus der ersten `IfcRelAggregates`, die ihn nennt, nur wenn die Eltern ein Knoten sind; sonst
`strukturknoten-ohne-eltern`. Bauteile: enthaltene Produkte und ihre Teile (Breitensuche, kreisfest); ein Teil ohne eigenen
Behälter erbt den des Ganzen; ein Behälter, der kein Knoten ist (z. B. `IfcExternalSpatialElement`), ergibt
`strukturGlobalId: null` mit `bauteil-ohne-strukturknoten`; zweimal enthalten: der erste gilt, `bauteil-mehrfach-enthalten`.
`IfcExternalSpatialElement` und `IfcSpatialZone` sind weder Knoten noch Bauteile.

**D-98.10 Werte der Eigenschaften.** Frage: Wie wird „Wert als Text“ geschrieben? Entscheidung: Typname der Spezifikation;
Wahrheitswerte `TRUE`/`FALSE`/`UNKNOWN`, ganze Zahlen ohne `+` und führende Nullen, Gleitkommazahlen exakt als Dezimaltext
ohne Exponent, Binärwerte als Hexziffern; keine Umrechnung von Einheiten.

**D-98.11 Kodierung der Datei.** Frage: Wann UTF-8, wann Latin-1? Entscheidung: Einmal je Datei: nur ASCII ohne Befund;
sonst gültiges UTF-8 mit `kodierung-utf8` (auch bei Byte-Order-Mark); sonst Latin-1 (ISO 8859-1, ein Byte ein Zeichen) mit
`kodierung-latin1`. Zeilenumbrüche in Zeichenketten fallen weg, `\N\` und `\F\` auch; `\PB\` bis `\PI\` über die
ISO-8859-Dekodierer der Plattform (`TextDecoder`), fehlt einer: `zeichenkette-ungueltig`. Eine ungültige Anweisung bleibt als
Text stehen.

**D-98.12 Grenzen und Schwere.** Frage: Welche Grenzen, welche Schwere? Entscheidung: 500 MiB harte Grenze
(`eingabe-zu-gross`; die weiche 200-MB-Grenze aus D-51 gehört der App), Tiefe 64 je Instanz (`step-zu-tief`, die Instanz
fällt weg). Schwere `fehler`, wenn etwas verloren oder mehrdeutig ist (Syntax, fehlender Verweis, Einheit, Menge ohne Zahl,
GlobalId), sonst `warnung`. Doppelte Instanznummer: die erste gilt (`instanz-doppelt`); abgeschnittene Datei: gelesen bis zur
letzten vollständigen Instanz (`datei-unvollstaendig`).

## Answer

Gemergt in `integration/welle-6` mit `26e2399` (Branch `welle-6/98-ifc-leser`, `f61be1a`). Paket `ifc`: `ifcLesen(Uint8Array)` für IFC 2x3
und 4 ohne Geometrie (Struktur, Bauteile mit Teilen und Typdaten, Eigenschaften, Klassifikation mit KG-Vorschlag, Materialien,
Befunde statt Ausnahmen), Mengen exakt dezimal in SI. Hausmodelle aus 99 ohne Befund, Werte gleich `typisch-bim.json`; 10.000
Bauteile (21 MB) in 1,68 s CPU. Menge ohne Wert: Ticket 107 lässt sie mit Befund weg (Vertrag bleibt `wert: Menge`).

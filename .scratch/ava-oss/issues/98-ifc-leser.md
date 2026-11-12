# 98: X1a: IFC lesen (eigener STEP-Leser, IFC 2x3 und IFC 4)

Status: claimed
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

- [ ] Golden-Tests je Fall (STEP-Kodierungen, Einheiten mm/m, Umrechnung, Struktur, Bauteile, Typ-Mengen, IFC 2x3 und 4 mit
      gleichem Ergebnis), Property-Test (beliebige Bytes), Sicherheitstests (Größe, Tiefe)
- [ ] Paketgrenzen-Prüfung kennt `ifc`; Lint-Regel N1 gilt für das Paket; Lizenzprüfung grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

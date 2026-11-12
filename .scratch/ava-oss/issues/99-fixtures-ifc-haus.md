# 99: Fixtures: IFC-Haus in zwei Ständen, großes Modell, Sollwerte für das Tor X1

Status: claimed
Type: task
Welle: 6 · Strang: F, X1 · Paket: `fixtures/` (neuer Ordner `fixtures/ifc/`, dazu `fixtures/README.md`, `fixtures.test.mjs`,
`REUSE.toml` falls nötig)
Blocked by: –
Modell: opus
Regeln: C4, N2, N3, N5, Q4, D-50 bis D-54, D-58
Herkunft: `plan.md` §4 (Tor X1, D-58), Berater D-54 (großes Modell aus einem Erzeuger, nicht als Datei im Repo)

## What to build

Selbst verfasste IFC-Dateien mit Geometrie und ausdrücklichen Mengen, ein Erzeuger für ein großes Modell und eine
Sollwert-Datei mit Herleitung (C4), auf die die Tore X1-Kern und X1-Erweitert prüfen (D-58). Alles erfunden, keine fremden
Dateien.

1. **`fixtures/ifc/haus-v1.ifc` (IFC 4, Einheit m).** Ein kleines Haus mit `IfcProject` → `IfcSite` → `IfcBuilding` → zwei
   Geschossen (EG, OG) mit je zwei bis drei Räumen (`IfcSpace`). Bauteile mit einfacher, gültiger Geometrie
   (`IfcExtrudedAreaSolid` mit `IfcRectangleProfileDef`, `IfcLocalPlacement`): Außen- und Innenwände (mindestens eine Wand mit
   Fenster- oder Türöffnung über `IfcOpeningElement`/`IfcRelVoidsElement`), Bodenplatte, Decke, Fenster, Türen. Je Bauteil
   ein Mengensatz (`Qto_WallBaseQuantities` mit `Length`, `Height`, `Width`, `GrossVolume`, `NetVolume`, `NetSideArea`;
   `Qto_SlabBaseQuantities`; Fenster/Türen mit `Area`), je Geschoss `Qto_BuildingStoreyBaseQuantities` (`GrossFloorArea`,
   `GrossVolume`) und je Raum `Qto_SpaceBaseQuantities` (`NetFloorArea`, `GrossFloorArea`). Die Mengen passen zur Geometrie
   (Netto = Brutto minus Öffnung) und sind in der Herleitung nachgerechnet. Ein `Pset_WallCommon` mit `IsExternal` und
   `LoadBearing` an den Wänden; eine `IfcClassificationReference` „DIN 276“ mit KG an mindestens einem Bauteil. GlobalIds fest
   und gültig (22 Zeichen, IFC-Base64).
2. **`fixtures/ifc/haus-v1-ifc2x3.ifc`** derselbe Inhalt in IFC 2x3, Länge in **mm** (prüft Schema und Umrechnung: gleiche
   Mengen in m nach dem Lesen).
3. **`fixtures/ifc/haus-v2.ifc` (IFC 4).** Zweiter Stand desselben Hauses: eine Wand entfernt, eine Wand neu, eine Wand länger
   (andere Mengen), ein Fenster in ein anderes Geschoss, ein Bauteil umbenannt, alle übrigen GlobalIds gleich.
4. **`fixtures/ifc/erzeugen.mjs`.** Deterministischer Erzeuger eines großen IFC-4-Modells (Parameter: Zahl der Bauteile,
   Standard 10.000, etwa 10 Geschosse) mit Geometrie und Mengensätzen wie im Haus, gültigen, festen GlobalIds (aus einem Zähler,
   kein Zufall) – als Funktion, die den Text liefert, und als Kommandozeile. Keine 25-MB-Datei im Repo (D-54). Ein Test prüft
   Determinismus (gleicher Text, gleicher SHA-256) und die Zahl der Bauteile.
5. **`fixtures/typisch-bim.json` (Sollwerte, C4).** Zuordnung von Bauteilen des Hauses (v1) zu Positionen der Fixture
   `typisch` (über deren Positions-IDs), je mit Mengenart (Name der Menge, z. B. `NetSideArea`, `NetVolume`, oder `Stueck`),
   passend zur Einheit der Position (m², m³, St, m). Dazu, je mit Herleitung im Stil von `typisch-abrechnung.json`:
   - **X1-Kern:** je zugeordneter Position die Ansatzzeilen (eine je Bauteil in der Reihenfolge der Zuordnung, Formel 91, Wert
     auf 3 Stellen) und die Menge (Summe der gerundeten Zeilen); die Gesamtpreise (N2) und Netto, Nachlass, Netto nach
     Nachlass, MwSt, Brutto des LV `typisch` nach der Übernahme (N2, N5).
   - **X1-Erweitert:** BGF, BRI, NRF des Modells (Summen der Geschoss- bzw. Raummengen, 3 Stellen) und eine Kostenschätzung über
     Kennwerte (je KG ein erfundener Kennwert in €/m² BGF; Betrag = round(BGF × Kennwert, 2)); ein „Aufmaßblatt aus Auswahl“
     für die Auswahl „Geschoss EG“ (je zugeordneter Position die Summe der Mengen der ausgewählten Bauteile); der Vergleich
     v1 → v2 (hinzugefügt, entfernt, geändert mit Feldern) und je betroffener Position die Mengendifferenz; die neuen
     Vordersätze nach „Mengen aktualisieren“ mit v2.
   Die Lesart der Mengenübernahme ist D-53 (Berater): Bauteil fehlt im gewählten Modell → keine Zeile, mit Befund; fehlende
   Menge oder Einheit passt nicht zur Position → Befund, nie 0.
6. **Test in `fixtures.test.mjs`** (eigene Rechnung wie `rechnen.mjs`, unabhängig von den Paketen): die Mengen der
   Sollwert-Datei stimmen mit den Mengensätzen im IFC-Text überein (einfacher Abgleich über die GlobalId), die Summen der
   Sollwert-Datei folgen aus N2/N5.

`fixtures/README.md` nennt die Dateien, die Herkunft („selbst verfasst“) und die Herleitung.

## Grenzen

- Nur `fixtures/` (und `REUSE.toml`, falls die neue Endung einen Eintrag braucht). `okf/research/` wird nicht gelesen (C3).
- Keine fremde IFC-Datei in diesem Ticket.

## Acceptance criteria

- [ ] Die drei IFC-Dateien sind gültiges STEP (ein Test liest sie zeilenweise und prüft Kopf, Schema, eindeutige `#n`, alle
      Verweise auflösbar), der Erzeuger ist deterministisch
- [ ] `typisch-bim.json` mit Herleitung; `node --test "fixtures/*.test.mjs"` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

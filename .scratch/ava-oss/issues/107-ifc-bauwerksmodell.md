# 107: X1a: `ifc` bildet auf `Bauwerksmodell` ab, Eigenschaften bei Bedarf, Budgets

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X1a · Paket: `packages/ifc`
Blocked by: 97, 98 (gleiches Paket), 99 (Fixtures)
Modell: opus
Regeln: A2, A3, N1, N3, Q4, Q5, U5, D-50, D-51, D-53, D-54
Herkunft: Ticket 98 (Leser), Ticket 97 (Vertragstypen), Berater D-50, D-54

## What to build

1. **Abbildung.** Aus dem Leseergebnis von Ticket 98 ein `Bauwerksmodell` (v1.6): Kennung, Projekt, Name, `Modelldatei`
   (Hash, Dateiname, Größe kommen vom Aufrufer, der die Bytes ablegt), Schema, `vorgaengerId`, `eingelesen` (Datum vom
   Aufrufer, A2), Struktur, Bauteile mit Mengen (SI, 3 Stellen), `kostengruppe`-Vorschlag. GlobalIds als Marke `IfcGlobalId`
   (die Erzeugungsfunktion der Marke liegt hier). Befunde des Lesers als `Pruefbefund` mit der Quelle aus v1.6.
2. **Eigenschaften bei Bedarf (D-51).** Eine Funktion, die zu einer GlobalId die Eigenschaftssätze (Psets) aus den Bytes liest,
   für die Eigenschaftsanzeige der App; für viele Abfragen hintereinander mit einem einmal gebauten Index (die App hält ihn im
   Worker).
3. **Golden-Tests mit den Fixtures (Ticket 99):** `haus-v1.ifc` und `haus-v1-ifc2x3.ifc` ergeben dieselben Bauteile und Mengen
   (bis auf das Schema), passend zu `fixtures/typisch-bim.json`; `haus-v2.ifc` mit den erwarteten Änderungen.
4. **Leistung (Q4, D-54):** Das 10.000-Bauteile-Modell aus `fixtures/ifc/erzeugen.mjs` lesen und abbilden ≤ 5 s CPU in Node
   (Median mehrerer Läufe; unter Parallellast einzeln wiederholen und beide Werte nennen).

Hinweis aus Ticket 98: Das Leseergebnis kennt Mengen ohne Wert (`wert: Menge | null`), `Bauteilmenge.wert` in v1.6 nicht.
Entscheidung des Orchestrators: Eine Menge ohne Wert entfällt bei der Abbildung mit einem Befund (Bauteil, Mengensatz, Name), nie 0;
kein Vertragsfeld dafür.

Aus dem Review von v1.6 (D-66, Befund 4): Ringe in `elternGlobalId` (Struktur) und `teilVonGlobalId` (Teile) bricht die
Abbildung mit einem Befund auf, damit `BauwerksmodellAnlegen` eine fehlerhafte Datei nicht ganz abweist (U5). Bei doppelten
GlobalIds gilt jeder Verweis dem ersten Objekt in Dateireihenfolge (Befund 5).

## Grenzen

- Nur `packages/ifc`. Kein `vertrag`. Mengenübernahme, Vergleich und DIN 277 gehören `bim` (Ticket 108). `okf/research/` wird
  nicht gelesen (C3).

## Acceptance criteria

- [ ] Abbildung und Eigenschaften getestet, Fixture-Goldens grün, Budget grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

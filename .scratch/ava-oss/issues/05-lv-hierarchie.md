# 05: LV-Hierarchie im Kern (K2)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: K · Paket: `packages/kern` (einziger Schreiber)
Blocked by: 02, 04
Regeln: A2, A3, A5, A6, A7, L1, L2, Q1

## What to build

Reine Domänenlogik für den LV-Baum als **Befehle** `(Zustand, Befehl) → ChangeSet` (A5): Los (nur gliedernd; G-29),
bis zu 5 Gliederungsebenen, Positionen, Hinweistexte. Einfügen nach einem Knoten bestimmt den Elternknoten
automatisch; Löschen ist rekursiv; Verschieben innerhalb des Baums. Hinweistexte tragen keine Menge, keinen Preis.
IDs werden **von außen** übergeben (kein Zufall im Kern; A2).

Befehle (Namen nach `GLOSSARY.md`): `GliederungAnlegen`, `PositionAnlegen`, `HinweistextAnlegen`, `KnotenLöschen`,
`KnotenVerschieben`. Das ChangeSet enthält geänderte Knoten; Summen kommen mit Ticket 07.

## Acceptance criteria

- [ ] Einfügen/Löschen/Verschieben je mit Beispiel- und Property-Test: der Baum bleibt zyklenfrei, jede Position hat genau einen Elternknoten
- [ ] Eltern-Bestimmung beim „Einfügen nach X“: nach einer Position → gleicher Elternknoten; nach einem Titel → erster Unterknoten (festgelegt und im Test dokumentiert)
- [ ] Mehr als 5 Ebenen und Hinweistext mit Menge/Preis werden abgewiesen mit Fehlerwert
- [ ] Auf `fixtures/typisch` aufgebaut ergibt sich derselbe Baum wie in der Fixture (Strukturgleichheit)
- [ ] Der Kern importiert nur `vertrag` und `dezimal` (A3, per CI geprüft)
- [ ] Offene Fachfrage → `needs-info` im Ticket, nicht raten (P5)

## Nicht-Ziele

OZ-Vergabe (Ticket 06), Summen (07), Positionsarten außer Normal (K5), Kopieren/Papierkorb (K9), Speicher.

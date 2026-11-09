---
status: accepted
---
# Berechnungskern als reine TypeScript-Bibliothek mit Decimal-Arithmetik

Alle AVA-Berechnungen (GP, Summen, Nachlass, MwSt, Zulagen, Preisspiegel) liegen in einem UI- und speicherunabhängigen Paket mit Dezimalarithmetik (kein Float) und kaufmännischer Rundung (half-up). Änderungen liefern ein internes ChangeSet (geänderte Knoten + Gesamtsumme), das UI und Speicher anwenden.

## Consequences
- GP = round(Menge × EP, 2); Summen aus gerundeten GPs; MwSt wird auf Summenebene aus der Nettosumme nach Nachlass berechnet, nicht als Summe der Positions-MwSt.
- Golden Tests mit gemessenen Referenzwerten sind Pflicht.

# 07: Summen, Nachlass und MwSt mit ChangeSet

Status: ready-for-agent
Type: task
Blocked by: 05

## What to build

GP pro Position, Titel- und LV-Summen aus gerundeten GPs, Nachlass (Prozent/Betrag), MwSt auf Summenebene. Jede Änderung liefert ein ChangeSet mit geänderten Knoten und Gesamtsumme; Neuberechnung nur im betroffenen Teilbaum.

## Acceptance criteria

- [ ] Golden: 12,35 + 15,20 = 27,55; MwSt 19 % = 5,23 (nicht 5,24); Brutto 32,78
- [ ] Golden: 402,73 − 3 % = 390,65; MwSt 74,22; Brutto 464,87
- [ ] ChangeSet enthält nur betroffene Knoten

## Blocked by

- 05

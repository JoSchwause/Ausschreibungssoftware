# 04: Dezimal-, Rundungs- und Formatierungsmodul

Status: ready-for-agent
Type: task
Blocked by: 03

## What to build

Dezimalarithmetik (keine Floats), kaufmännische Rundung half-up, Skalen für Menge (3), EP (2/3), Beträge (2), Parsen und Formatieren im deutschen Format (1.072,55).

## Acceptance criteria

- [ ] Property-Tests für Rundung
- [ ] 1,235×10,00 = 12,35 und 3,333×4,56 = 15,20
- [ ] Parsen/Formatieren roundtrip-stabil

## Blocked by

- 03

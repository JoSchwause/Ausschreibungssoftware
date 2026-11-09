---
status: accepted
---
# Projektebene und getrennte LV-Aggregate

Ein Projekt ist die oberste Ebene mit Name und Bauherr-Feldern; mehrere LVs gehören dazu. Es gibt keine MwSt-Stammdaten im Projekt in v1 (MwSt je LV, siehe unten).

Ausschreibungs-LV, Angebot und Auftrags-LV sind getrennte Aggregate mit gemeinsamer Positionsidentität. Ein einziges LV-Objekt, das durch alle Phasen wandert, wird nicht verwendet.

Nachlass gibt es in v1 nur auf LV-Ebene, genau einen je LV, prozentual oder als Absolutbetrag. MwSt gilt mit einem Satz je LV, ohne Satzwechsel in v1. Lose gliedern im MVP nur; die getrennte Vergabe kommt später.

Grund: Trennung der Aggregate hält die Phasen unabhängig und macht die Positionsidentität zum einzigen gemeinsamen Schlüssel.

## Consequences
- Umsetzung in `packages/vertrag` (Strang F2): Typen je Aggregat, gemeinsame Positions-ID (UUIDv7, Regel A7).
- Die OZ-Maske ist je LV frei definierbar; ein GAEB-Import übernimmt eine abweichende Maske.
- Preisspiegel-Regeln: siehe Glossar (virtuelle Bieter, Ausreißer, ABC); Nachlässe werden nicht in die EP umgelegt.
- Entscheidung getroffen im Grilling vom 2026-11-09 (Fragen G-09, G-20, G-23, G-25, G-28, G-29, G-26).

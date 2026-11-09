# 07: Summen, Nachlass und MwSt mit ChangeSet (K4)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: K · Paket: `packages/kern`
Blocked by: 05
Regeln: A2, A6, N1, N2, N3, G-23, G-28, Q1, Q4

## What to build

GP je Position = `round(Menge × EP, 2)`; Titel- und LV-Summen aus den **gerundeten** GPs; Nachlass (ein Nachlass je LV,
prozentual oder absolut, umkehrbar, **nicht** in die EP eingerechnet; G-23); MwSt (ein Satz je LV) auf die **Nettosumme
nach Nachlass**, nicht je Position (N2, G-28). Jede Änderung liefert ein ChangeSet mit den geänderten Knoten und den
betroffenen Summen; Neuberechnung **nur im betroffenen Teilbaum** (A6). Hier nur Normalpositionen und Hinweistexte;
Bedarf, Wahl, Zuschlag, Pauschal kommen mit K5/K6.

## Acceptance criteria

- [ ] Golden (herleitbar aus N2): 12,35 + 15,20 = 27,55 · MwSt 19 % = 5,2345 → 5,23 (nicht 5,24) · Brutto 32,78
- [ ] Golden: 402,73 − 3 % = 390,6481 → 390,65 · MwSt 19 % = 74,2235 → 74,22 · Brutto 464,87
- [ ] `fixtures/winzig` und `fixtures/typisch` ergeben exakt die Sollwerte aus Ticket 19
- [ ] Eine Mengenänderung an einer Position liefert ein ChangeSet nur mit dieser Position, ihren Titelsummen und der LV-Summe; Test prüft, dass unbeteiligte Knoten fehlen
- [ ] Property-Test: Summe über alle Positionen = LV-Summe, für zufällige Bäume
- [ ] Nachlass setzen und entfernen stellt die Summen wieder her (Umkehrbarkeit)
- [ ] Leistungsbudget als Test: Einzeländerung in `fixtures/gross` (5.000 Positionen) unter 16 ms (Q4); Messwert im Ticket festhalten
- [ ] Rundung negativer Beträge folgt der Entscheidung aus Ticket 04

## Nicht-Ziele

Wahl-/Grundpositionen und Zuschlagspositionen (K6), mehrere Nachlässe (nicht zugelassen, G-26), MwSt-Satzwechsel, Preisspiegel (V2).

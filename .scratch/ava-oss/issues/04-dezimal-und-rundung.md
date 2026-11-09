# 04: Dezimal, Rundung und de-DE-Parsen/-Formatieren (K1)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: K · Paket: `packages/dezimal` (einziger Schreiber)
Blocked by: 02
Regeln: A2, N1, N2, N3, N4, Q1

## What to build

Dezimalarithmetik ohne Gleitkomma: Addieren, Multiplizieren, Vergleichen, Rundung auf n Stellen **kaufmännisch**
(half-up), Skalen aus der Konstantentabelle in `vertrag` (Menge 3, EP 3, Prozent 2, Betrag 2; G-21). Parsen und
Formatieren im deutschen Format (`1.072,55`, Dezimalkomma, Tausenderpunkt) **nur an den Rändern** (N4); der Kern sieht nur Dezimalwerte.
Reines Paket: kein DOM, kein I/O, keine Zeit, kein Zufall (A2). Aktiviert die Lint-Regel gegen `number` für Geld (N1) aus Ticket 03.

## Acceptance criteria

- [ ] Golden (Handrechnung, aus N2 herleitbar): 1,235 × 10,00 = 12,35 · 3,333 × 4,56 = 15,19848 → 15,20 · 2,5 → 3 und 2,4 → 2 bei Rundung auf 0 Stellen
- [ ] Property-Tests (`fast-check`): Rundung ist idempotent; `a + b = b + a`; Parsen ∘ Formatieren = Identität für alle zulässigen Werte
- [ ] Verhalten bei **negativen** Werten (Abzugspositionen) ist festgelegt, getestet und im `GLOSSARY.md` beschrieben. Lässt sich die Regel nicht aus Fachdokumentation oder VOB belegen, Ticket auf `needs-info` mit der Frage, nicht raten (P5)
- [ ] Ungültige Eingaben („1,2,3“, „abc“, leerer String) liefern einen Fehlerwert, keine Ausnahme
- [ ] Keine Abhängigkeit außer einer geprüften Dezimalbibliothek mit AGPL-kompatibler Lizenz (C5), oder eigene Implementierung mit Begründung im Ticket
- [ ] Rechenzeit: 100.000 Multiplikationen plus Rundung unter 100 ms (Messung ohne Gate, Wert ins Ticket)

## Nicht-Ziele

Summen, Nachlass, MwSt (Ticket 07), Währungsumrechnung, Datumsformate.

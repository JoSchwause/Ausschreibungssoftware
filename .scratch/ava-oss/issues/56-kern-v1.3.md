# 56: Kern v1.3: Mengenansatz, Einfügen hinter einer Gliederung, leere Langtext-Strukturen

Status: ready-for-agent
Type: task
Welle: 4 · Strang: K · Paket: `packages/kern`
Blocked by: 53 (`vertrag` v1.3), 51 (Fixture-Testcode im Kern)
Regeln: A2, A3, A5, A6, U5, Q1, Q5, F6, D-22
Herkunft: Ticket 53 (Punkte 5, 8, 9), D-22

## What to build

`vertrag` v1.3 (Ticket 53) hat neue Glieder geschlossener Listen eingeführt, die der Kern bisher markiert abweist
(`// v1.3: mechanisch angepasst, Folgeticket`). Dieses Ticket gibt ihnen Logik:

1. **`MengenansatzSetzen`** (Punkt 9): setzt `mengenansatz` und `menge` der Position in einem ChangeSet, rechnet GP und
   Summen wie `MengeAendern` (A6). Der Kern wertet den Ansatz nicht aus (kein `kern → mengen`, A3); er prüft nur die Form
   (Zeilennummern ganzzahlig, Formelnummer ganzzahlig, Ausdruck ein String, Variablenname String oder `null`) und dass
   `menge` kanonisch mit 3 Stellen ist oder `null`. `null` als Ansatz entfernt das Feld. Umkehrbar aus dem ChangeSet.
   Lesart (a) aus Ticket 53: **jeder** andere Befehl, der die Menge einer Position mit Ansatz ändert (`MengeAendern`,
   Feldbefehle, Einfügen aus der Zwischenablage, falls es Mengen setzt), entfernt den Ansatz im selben ChangeSet. Test: ein
   Property-Test über alle mengenändernden Befehle.
2. **Einfügeort „hinter einer Gliederung als Geschwister“** (Punkt 5): `PositionAnlegen`, `GliederungAnlegen`,
   `KnotenEinfuegen`, `KnotenVerschieben`, `PapierkorbeintragWiederherstellen` u. a. nehmen die neue Form an; Lage wie
   „nach“ einer Position, F1-Prüfungen wie bisher, OZ-Vorschlag nach D-42.3. Die bisherige Form („nach Gliederung = erstes
   Kind“) bleibt unverändert gültig.
3. **Leere Langtext-Strukturen** (Punkt 8, D-22 (iii)): Die formale LV-Prüfung (K8, `lv-pruefung.ts`) meldet eine leere
   Liste, eine Tabelle ohne Zeilen und eine Zeile ohne Zellen als Befund (Warnung, mit Sprungziel), sperrt nie (U5).
   `PRUEF_ANNAHMEN` ergänzen.

## Grenzen

- Nur `packages/kern`. Braucht ein anderes Paket eine Änderung, melden (P2).
- Kern bleibt rein (A2). Fixtures und Sollwerte unverändert.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Je Punkt Unit-Tests; Umkehrbarkeit (ChangeSet anwenden ∘ umkehren = Identität) für Punkt 1 und 2 als Property-Test
- [ ] Die markierten Abweisungen aus Ticket 53 sind entfernt
- [ ] Leistung: `MengenansatzSetzen` bei `gross` < 16 ms (Q4)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Auswertung des Ansatzes im Kern, Oberfläche, Speicherung.

## Comments

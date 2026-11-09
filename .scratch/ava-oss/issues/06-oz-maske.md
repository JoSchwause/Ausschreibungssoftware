# 06: OZ-Maske, OZ-Vergabe und Umnummerierung (K3)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: K · Paket: `packages/kern`
Blocked by: 05
Regeln: A2, A5, A6, A7, G-25, Q1

## What to build

OZ-Maske **je LV frei definierbar** (G-25): Stellen je Gliederungsstufe, numerisch oder alphanumerisch, Index-Stelle;
ein GAEB-Import übernimmt eine abweichende Maske (nur Typ hier, Import später). Vergabe: Gliederung +1, Positionen
+10, führende Nullen. Umnummerierung eines Teilbaums als Befehl mit ChangeSet. Die OZ ist **Anzeigedatum**, nie Schlüssel (A7):
Umnummerieren ändert keine ID. Obergrenze der OZ-Länge richtet sich nach der GAEB-Regel (max. 14 Zeichen; in Fachdokumentation 3.3 belegen und zitieren).

## Acceptance criteria

- [ ] Standardmaske `NN.NN.NNNN[.A]` und eine abweichende Maske (z. B. `1122PPPPI` aus der GAEB-Dokumentation) sind getestet
- [ ] Umnummerierung liefert für alle Knoten des Teilbaums neue OZ; IDs bleiben gleich (Property-Test)
- [ ] Ungültige Eingaben (zu lange OZ, unzulässige Zeichen, Maske mit 0 Stellen) werden abgewiesen
- [ ] Eine Maskenänderung erzeugt ein ChangeSet mit allen betroffenen Knoten, nie einen stillen Teilstand
- [ ] Zitat der GAEB-Fachdokumentation für die Längenregel im Ticket (Seite oder Abschnitt)

## Nicht-Ziele

Maske aus GAEB lesen (G1), Einfügen mit Autonummer in der Oberfläche (U3).

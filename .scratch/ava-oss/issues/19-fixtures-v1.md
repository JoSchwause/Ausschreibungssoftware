# 19: Fixtures v1: drei selbst verfasste LVs mit Sollwerten (F3)

Status: ready-for-agent
Type: task
Welle: 0 · Strang: F · Paket: `fixtures/`
Blocked by: -  (die Ordner dürfen vor 03 als lose Dateien entstehen; Einbindung ins Monorepo nach 03)
Regeln: C1, C4, G-41, L1, L3, N2

## What to build

Drei **erfundene** Leistungsverzeichnisse als Daten im Repo, jede mit **Sollwerten, die aus der Regel herleitbar sind**
(GP = round(Menge × EP, 2), Summen aus gerundeten GPs, MwSt auf Nettosumme nach Nachlass; N2). Format: ein
neutrales JSON, das **nur Fixture-Zweck** hat und in `vertrag` (Ticket 02) abgebildet wird. GAEB-Dateien kommen in Ticket 23
und 22. Erzeugung per Skript, das im Repo liegt und Sollwerte aus den Eingaben berechnet (Vorbild: Erzeugungsskript
einer freien Konformitätssuite, nur als Methode, nicht kopieren).

| Fixture | Umfang | Zweck |
|---|---|---|
| `winzig` | 1 Titel, 3 Positionen | Handrechnung, erste Tests von `dezimal` und `kern` |
| `typisch` | 3 Titel, ca. 25 Positionen, Indexpositionen (`RNoIndex`), eine Bedarfs-, eine Wahl- und eine Zuschlagsposition, Nachlass, MwSt 19 % | Grid-Entwicklung (U2), Summenregeln |
| `gross` | 5.000 Positionen, 5 Gliederungsebenen, erzeugt per Skript mit Seed | Leistungsbudgets (Q4); wird nicht von Hand gepflegt |

Zusätzlich je ein **Angebot** zu `typisch`: drei Bieter mit verschiedenen Preisen, ein Ausreißer, ein Nachlass,
eine nicht angebotene Position (≠ 0,00). Dient V1/V2 und dem Prototyp.

## Acceptance criteria

- [ ] Jede Fixture trägt `sollwerte` (GP je Position, Titelsummen, Netto, Nachlass, MwSt, Brutto), vom Skript berechnet und im README von Hand für `winzig` nachgerechnet
- [ ] Hand-Beispiele enthalten: 1,235 × 10,00 = 12,35 · 3,333 × 4,56 = 15,20 (15,19848) · 27,55 netto, MwSt 19 % = 5,23 (5,2345), brutto 32,78
- [ ] `gross` ist reproduzierbar (gleicher Seed, gleiche Datei) und bleibt unter 5 MB
- [ ] Keine echten Namen (Firmen, Projekte, Orte, Personen); Texte erfunden, keine STLB-Texte (C1)
- [ ] `fixtures/README.md` listet Herkunft je Datei (selbst verfasst) und die Berechnungsregel je Sollwert
- [ ] Skript und Dateien liegen unter AGPL-3.0-or-later mit REUSE-Eintrag

## Nicht-Ziele

GAEB-XML, amtliche Dateien (Ticket 23), echte Preise.

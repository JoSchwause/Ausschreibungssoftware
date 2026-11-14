<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 Tethys AVA contributors
-->

# Herkunft der Dateien unter `fixtures/gaeb-formate/`

**Von Hand nach Formatbeschreibung, nicht aus AVA-Software** (Regel C4, Entscheidung D-71). Alle Dateien sind 2026-11-13
für den Formatvergleich (Tor E Punkt 3) selbst geschrieben: dasselbe kleine, erfundene LV „Geräteschuppen Bauhof“ (zwei
Titel, zehn Positionen mit Bedarf ohne und mit Gesamtbetrag, Wahl, Stundenlohn, Pauschal, Zuschlag, Vor- und Nachtext,
Langtext mit Fett und Liste, Mengen und Preise mit drei Nachkommastellen) in mehreren Formaten. Namen, Orte und Firmen sind
erfunden. Lizenz wie das Repo: AGPL-3.0-or-later (Eintrag in `REUSE.toml`; die Dateien haben keinen Dateikopf, weil das
Format keinen Kommentar kennt).

| Datei | Format | Phase | Inhalt |
|---|---|---|---|
| `geraeteschuppen-3.3.X83` | GAEB DA XML 3.3 | X83 | LV ohne Preise |
| `geraeteschuppen-3.3.X86` | GAEB DA XML 3.3 | X86 | LV mit Preisen, Auftragnehmer, Steuersatz 19 % |
| `geraeteschuppen-3.1.X83` | GAEB DA XML 3.1 | X83 | wie 3.3, gemeinsamer Namensraum der 3.1 |
| `geraeteschuppen-3.1.X86` | GAEB DA XML 3.1 | X86 | wie 3.3 |
| `geraeteschuppen.d83` | GAEB 90 | 83 | LV ohne Preise, DOS-Zeichensatz (Codepage 850), CRLF |
| `geraeteschuppen.d86` | GAEB 90 | 86 | LV mit Preisen (Satz 23), Summen (32, 99) |
| `geraeteschuppen.d84` | GAEB 90 | 84 | Angebot eines Bieters zum LV der .d83: nur Ordnungszahlen und Preise |
| `geraeteschuppen.p83` | GAEB 2000 1.2 | 83 | LV ohne Preise, Zeichensatz ANSI (Windows-1252), Texte als RTF, CRLF |
| `geraeteschuppen.p86` | GAEB 2000 1.2 | 86 | LV mit Preisen (`EP`, `GB`), Auftragnehmer |
| `geraeteschuppen.p84` | GAEB 2000 1.2 | 84 | Angebot eines Bieters zum LV der .p83: Bereiche und Positionen mit OZ und Preisen |

Die GAEB-90-Dateien folgen der Spaltentabelle in `packages/gaeb/src/gaeb90.ts`, die aus frei zugänglichen Beschreibungen in
eigenen Worten zusammengestellt ist (Quellen und unsichere Punkte: Ticket 144). Was GAEB 90 nach diesen Quellen nicht
ausdrücken kann (Fett, Liste, Stundenlohn, Pauschal, Zuschlag, Nummern der Wahl), fehlt dort; die Liste der Unterschiede
steht im Kettentest `packages/gaeb/src/formatvergleich.test.ts`. Die Summen der `.d86` und `.d84` (Sätze 32 und 99) sind von
Hand nach GP = gerundet(Menge × EP, 2) gerechnet (N2); Bedarf ohne Gesamtbetrag und Wahl zählen nicht (F4).

Die GAEB-2000-Dateien (Ticket 145, 2026-11-14) folgen dem Aufbau in `packages/gaeb/src/gaeb2000.ts`, ebenso aus frei
zugänglichen Beschreibungen in eigenen Worten (Quellen und unsichere Punkte: Ticket 145). Für Bedarf, Wahl, Stundenlohn,
Pauschal und Zuschlag ist dort kein Schlüsselwort belegt; die GAEB-2000-Dateien tragen diese Positionen deshalb als normale
Positionen (mit Einheitspreis und Gesamtbetrag in der `.p86` und `.p84`), die Zuschlagsposition fehlt. Fett steht als RTF
`{\b …}`, die Liste als Zeilen mit „- “. Die Gesamtbeträge sind von Hand nach GP = gerundet(Menge × EP, 2) gerechnet (N2).

Die Dateien prüfen nur das eigene Verständnis der Formate, nicht Dateien anderer Software (D-71).

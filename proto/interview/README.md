<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 Tethys AVA contributors
-->

# Prototyp für das Nutzerinterview (Ticket 18)

**Wegwerfcode.** Eine klickbare Oberfläche, an der das Architekturbüro sagen soll, was stimmt und was nicht, bevor
Vertrag, Kern und Grid gebaut werden. Alles ist erfunden, nichts wird gespeichert, Neuladen setzt zurück. Dieser
Ordner gehört nicht in `main` (Branch `proto/interview`).

## Starten

```
pnpm install
pnpm --filter @proto/interview start      # http://127.0.0.1:5180
```

Gleichwertig: `cd proto/interview && pnpm start`.

Die Ansicht steht in der URL, die schwebende Leiste unten schaltet um:

```
?ansicht=lv&variante=baum|panel|karten
?ansicht=spiegel&variante=farbe|rang|balken
?ansicht=projekt&variante=baum|reiter|vorgang
?ansicht=gaeb&variante=schritte|seite
```

Weitere Befehle (alle im Ordner `proto/interview`):

| Befehl | Zweck |
|---|---|
| `pnpm typecheck` | Typprüfung |
| `node daten/erzeugen.mjs` | kopiert `fixtures/typisch*.json` neu nach `src/daten/` (liest `fixtures/` nur) |
| `node daten/handrechnung.mjs` | unabhängige Handrechnung, schreibt `daten/erwartet.json` |
| `node pruefung/pruefen.mjs` | vergleicht die Bildschirmwerte mit der Handrechnung und prüft die Grid-Tastatur (App muss laufen) |
| `node pruefung/screenshots.mjs` | schreibt je Ansicht und Variante ein Bild (1440×900) nach `screenshots/` |

## Was echt ist und was gespielt

**Echt**

- Rechnung von GP, Titelsummen, Netto, Nachlass und MwSt nach Regel N2 mit `@tethys/dezimal`, nirgends `number` für
  Beträge. Jede gültige Eingabe wirkt sofort auf GP, Titelsumme, Netto, Nachlass, MwSt und Brutto.
- Bieter-Summen, virtuelle Bieter Min / Mittel / Max, Ausreißer (mehr als ±20 % vom Mittel), Rangfolge nach
  Netto nach Nachlass. Mittel und Abweichung brauchen eine Division, die `dezimal` nicht hat; dort rechnet der
  Prototyp mit BigInt auf Cent-Basis (`src/spiegel.ts`).
- Das Grid der Variante „Dichte Tabelle mit Baum“ ist das echte `@tethys/ui-grid` (Pfeile, Enter, Tab, F2,
  Leertaste, Entf, Alt+Pfeile, Strg+V). Die Befehle des Grids setzt `src/store.tsx` auf die Knotenliste um (kein `kern`).
- Preisspiegel: Min / Mittel / Max je Position und Titel, Ausreißer, Rangfolge, Nachlass des Bieters getrennt (nie in
  die EP eingerechnet), „nicht angeboten“ sichtbar anders als 0,00.

**Gespielt**

- GAEB. „X83 laden“ und „X84 einlesen“ zeigen vorbereitete JSON-Dateien aus `src/daten/gaeb-*.json`. Kein
  XML-Parser, kein XSD, keine Datei wird gelesen oder geschrieben. Die Prüfliste mit den zwei Warnungen ist erfunden; ein
  dritter Eintrag wird live aus dem LV gerechnet (Positionen ohne Menge, Einheit oder Einheitspreis). „Als Entwurf
  exportieren“ ist nie gesperrt (U5).
- Das zweite LV („Haustechnik“) ist ein Platzhalter. „Zuschlag“ erzeugt nur einen Auftrags-LV-Eintrag ohne Inhalt.
- **Nicht vorhanden:** Speicherung, Undo, Positionsarten außer Normal (Bedarf, Wahl, Pauschal, Zuschlagsposition),
  Konten, Mehrbenutzer, Zeilen löschen oder verschieben, Ordnungszahl-Vergabe für neue Positionen.

**Annahmen im Prototyp (vorläufig, Entscheidung offen)**

- Die Angebote haben die Mengen des LV zum Zeitpunkt der Ausschreibung (eingefroren). Ändert man im LV eine Menge,
  ändern sich LV-Summen und Schätzpreis, nicht die Angebote.
- Ausreißer: je Position der GP; Mittel = arithmetisches Mittel der GP der Bieter, die angeboten haben (einschließlich
  des geprüften), mindestens drei Werte, Abweichung strikt größer als 20 % (Annahme A7 aus `fixtures/README.md`). Die
  0,00 von Bieter C bei 03.0080 zieht das Mittel so weit herunter, dass dort auch A und B als Ausreißer gelten. Das ist
  eine Folge der Annahme, kein Befund für den Preisspiegel.
- Rangfolge nach „Netto nach Nachlass“. Eine nicht angebotene Position macht die Summe unvollständig und wird als
  Warnung an der Summe gezeigt (Bieter B), nicht aus dem Mittel ergänzt.

## Daten

Selbst verfasst, ohne echte Firmen-, Projekt- oder Personennamen. Quelle sind Kopien von `fixtures/typisch.json` und
`fixtures/typisch-angebote.json`, die `daten/erzeugen.mjs` nach `src/daten/` schreibt (`fixtures/` bleibt unverändert).
Im Prototyp sind alle Positionen Normalpositionen; die Bedarfs-, Wahl- und Zuschlagsposition der Fixture sind dazu
Normalpositionen geworden („Zuschlag Frosteinbau“ heißt jetzt „Frostschutz beim Einbau“). Darum weichen die Summen von
den Sollwerten der Fixture ab.

Ein LV „Rohbau und Ausbau (erfunden)“ mit 3 Titeln und 25 Positionen, MwSt 19,00 %, Nachlass 2,00 %; drei Angebote:

- **Bieter A**: günstigster Bieter, kein Nachlass.
- **Bieter B**: Nachlass 3,00 %; Position 03.0070 **nicht angeboten**.
- **Bieter C**: Ausreißer bei 02.0050 (253,350 statt rund 170 je m³) und 03.0030; Position 03.0080 mit dem
  angebotenen Preis **0,000** (also GP 0,00, nicht „nicht angeboten“).

## Handrechnung

`daten/handrechnung.mjs` rechnet unabhängig von der App (nur BigInt, kein Code und keine Bibliothek der App) und
schreibt `daten/erwartet.json`. Querprüfung für die drei Angebote: Fixture-Netto plus die in der Fixture ausgenommene
Bedarfs- und Wahlposition ergibt dieselben Werte (A: 55.491,80 + 601,48 + 5.774,21 = 61.867,49; B: 58.334,42 + 608,51 +
6.297,50 = 65.240,43; C: 56.461,60 + 538,68 + 5.427,26 = 62.427,54; LV: 55.463,41 + 586,80 + 5.880,00 = 61.930,21).
Alle Beträge in EUR.

**LV (Schätzpreise)**

| Titel | Summe |
|---|---:|
| 01 Baustelleneinrichtung und Vorarbeiten | 6.090,79 |
| 02 Erd- und Betonarbeiten | 31.100,24 |
| 03 Ausbau und Oberflächen | 24.739,18 |
| **Netto** | **61.930,21** |
| Nachlass 2,00 % (1.238,6042 gerundet) | 1.238,60 |
| Netto nach Nachlass | 60.691,61 |
| MwSt 19 % (11.531,4059 gerundet) | 11.531,41 |
| **Brutto** | **72.223,02** |

**Angebote**

| | Bieter A | Bieter B | Bieter C |
|---|---:|---:|---:|
| Titel 01 | 6.024,89 | 6.378,96 | 5.633,08 |
| Titel 02 | 30.850,34 | 32.689,73 | 32.618,67 |
| Titel 03 | 24.992,26 | 26.171,74 | 24.175,79 |
| Netto | 61.867,49 | 65.240,43 | 62.427,54 |
| Nachlass | keiner | 3,00 % = 1.957,21 | keiner |
| Netto nach Nachlass | 61.867,49 | 63.283,22 | 62.427,54 |
| MwSt 19 % | 11.754,82 | 12.023,81 | 11.861,23 |
| Brutto | 73.622,31 | 75.307,03 | 74.288,77 |
| Rang (nach Netto nach Nachlass) | 1 | 3 | 2 |
| nicht angeboten | – | 03.0070 | – |

**Virtuelle Bieter über die drei Angebote**

| | Min | Mittel | Max |
|---|---:|---:|---:|
| Netto | 61.867,49 | 63.178,49 | 65.240,43 |
| Netto nach Nachlass | 61.867,49 | 62.526,08 | 63.283,22 |

**Preisspiegel je Position** (GP in EUR; Ausreißer: mehr als 20 % vom Mittel der Bieter, die angeboten haben)

| OZ | Kurztext | Bieter A | Bieter B | Bieter C | Min | Mittel | Max | Ausreißer |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 01.0010 | Baustelle einrichten | 1.814,85 | 1.951,75 | 1.683,50 | 1.683,50 | 1.816,70 | 1.951,75 |  |
| 01.0020 | Bauzaun stellen | 625,14 | 668,30 | 591,57 | 591,57 | 628,34 | 668,30 |  |
| 01.0030 | Baustrom und Bauwasser | 873,21 | 930,96 | 799,94 | 799,94 | 868,04 | 930,96 |  |
| 01.0040 | Verkehrssicherung Zufahrt | 601,48 | 608,51 | 538,68 | 538,68 | 582,89 | 608,51 |  |
| 01.0050 | Bauschutt entsorgen | 1.138,38 | 1.208,58 | 1.116,15 | 1.116,15 | 1.154,37 | 1.208,58 |  |
| 01.0060 | Grundstück räumen | 971,83 | 1.010,86 | 903,24 | 903,24 | 961,98 | 1.010,86 |  |
| 02.0010 | Oberboden abtragen | 760,82 | 803,17 | 714,78 | 714,78 | 759,59 | 803,17 |  |
| 02.0020 | Baugrube ausheben | 3.126,32 | 3.254,55 | 2.882,26 | 2.882,26 | 3.087,71 | 3.254,55 |  |
| 02.0030 | Baugrube verfüllen | 722,54 | 790,16 | 702,66 | 702,66 | 738,45 | 790,16 |  |
| 02.0040 | Sauberkeitsschicht | 1.078,94 | 1.200,19 | 997,34 | 997,34 | 1.092,16 | 1.200,19 |  |
| 02.0050 | Fundamente betonieren | 6.400,88 | 6.780,48 | 9.817,31 | 6.400,88 | 7.666,22 | 9.817,31 | C |
| 02.0050A | Frostschutz beim Einbau | 554,67 | 592,91 | 513,13 | 513,13 | 553,57 | 592,91 |  |
| 02.0060 | Betonstahl verlegen | 5.450,45 | 5.725,15 | 5.152,30 | 5.152,30 | 5.442,63 | 5.725,15 |  |
| 02.0070 | Bodenplatte herstellen | 5.155,30 | 5.256,48 | 4.715,14 | 4.715,14 | 5.042,31 | 5.256,48 |  |
| 02.0070A | Bodenplatte wasserundurchlässig | 5.774,21 | 6.297,50 | 5.427,26 | 5.427,26 | 5.832,99 | 6.297,50 |  |
| 02.0080 | Sockel abdichten | 774,52 | 842,27 | 711,48 | 711,48 | 776,09 | 842,27 |  |
| 02.0090 | Drainage verlegen | 1.051,69 | 1.146,87 | 985,01 | 985,01 | 1.061,19 | 1.146,87 |  |
| 03.0010 | Innenwände mauern | 10.364,91 | 11.193,27 | 9.660,80 | 9.660,80 | 10.406,33 | 11.193,27 |  |
| 03.0020 | Innenputz | 8.470,94 | 8.569,49 | 7.862,20 | 7.862,20 | 8.300,88 | 8.569,49 |  |
| 03.0030 | Estrich einbringen | 1.910,35 | 2.083,49 | 2.885,78 | 1.910,35 | 2.293,21 | 2.885,78 | C |
| 03.0040 | Wandanstrich | 2.172,43 | 2.323,23 | 2.022,05 | 2.022,05 | 2.172,57 | 2.323,23 |  |
| 03.0050 | Türzargen einbauen | 1.244,39 | 1.260,14 | 1.143,93 | 1.143,93 | 1.216,15 | 1.260,14 |  |
| 03.0060 | Sockelleiste | 513,71 | 542,59 | 479,56 | 479,56 | 511,95 | 542,59 |  |
| 03.0070 | Silikonfuge | 129,59 | **nicht angeboten** | 121,47 | 121,47 | 125,53 | 129,59 |  |
| 03.0080 | Endreinigung | 185,94 | 199,53 | 0,00 | 0,00 | 128,49 | 199,53 | A, B, C |

Ausreißer insgesamt: 02.0050 C, 03.0030 C und, als Folge der 0,00, 03.0080 A, B und C.

## Messung am laufenden Prototyp

`node pruefung/pruefen.mjs` liest die Werte vom Bildschirm und vergleicht sie mit `daten/erwartet.json`: LV-Summen und
Titelsummen in allen drei LV-Varianten, GP aller 25 Positionen im Grid, in allen drei Preisspiegel-Varianten Summen je
Bieter, virtuelle Bieter, Titelsummen, jede Zelle (Preis oder „nicht angeboten“), Min / Mittel / Max, Ausreißer und
Rangfolge. Dazu die Tastaturprüfung des Grids und Änderungen mit nachgerechneten Folgewerten (Menge, EP, Entf,
Nachlass 3,5 %, MwSt 7 %, Einfügen aus Excel). Ergebnis und Umgebung stehen im Ticket.

## Die vier Teilfragen und worauf das Büro je Variante achten soll

1. **LV-Grid und Tastatur.** Fühlt sich das Bearbeiten schneller und direkter an als heute? Reicht Excel-artige Navigation?
   Bekannte Abweichungen von Excel, die nur an der ersten Variante gefragt werden (E-18): Enter startet das Bearbeiten
   (Excel springt nach unten), die Leertaste wählt die Zeile (Excel beginnt zu schreiben), Einfügen aus der
   Zwischenablage legt neue Positionen an und überschreibt nie.
   - **Dichte Tabelle mit Baum** (echtes Grid): Reicht die Tastatur, um ein LV ohne Maus durchzuarbeiten? Stören die Abweichungen von Excel?
   - **Tabelle mit Seitenpanel**: Hilft ein eigenes Feld-Panel je Position, oder bremst der Wechsel zwischen Liste und Panel?
   - **Karten je Titel**: Ist die Gliederung in Karten übersichtlicher, auch wenn weniger Positionen auf den Bildschirm passen?
2. **Preisspiegel.** Erkennt man auf einen Blick, wer günstig ist, wo Preise auffallen und wie die Rangfolge aussieht?
   - **Matrix mit Farbskala**: Sieht man Ausreißer und günstige Preise an der Farbe, oder ist die Farbe zu leise oder zu laut?
   - **Matrix mit Rangzahl**: Ist „Platz 1, 2, 3 je Position“ aussagekräftiger als die Abweichung in Prozent?
   - **Balken je Position**: Zeigt der Balken mit Mittellinie und ±20-%-Band mehr als die Zahl, oder kostet er zu viel Platz?
   - In allen drei: Ist „nicht angeboten“ eindeutig etwas anderes als 0,00? Ist der Nachlass des Bieters getrennt verständlich, und die Warnung, dass eine Summe wegen einer fehlenden Position nicht vergleichbar ist?
3. **Gliederung Projekt / LV / Angebot.** Passt „ein Projekt, mehrere LVs, Angebote und Auftrags-LV als getrennte Objekte“ zur Denkweise im Büro?
   - **Baum Projekt → LV → Angebot**: Denkt das Büro in dieser Hierarchie? Wo sucht es den Auftrags-LV?
   - **Registerkarten je LV**: Ist ein LV die natürliche Arbeitseinheit, mit Ausschreibung, Angeboten und Auftrag daneben?
   - **Vorgangsliste**: Denkt das Büro eher in Schritten (Ausschreiben, Angebote, Vergabe, Auftrag) als in Objekten?
4. **GAEB-Weg.** Ist der Ablauf „X83 laden, X84 einlesen, Export mit Prüfwarnung als Entwurf“ verständlich?
   - **Assistent in Schritten**: Hilft die feste Reihenfolge, oder will das Büro frei zwischen den Dateien springen?
   - **Eine Seite mit Prüfliste**: Reicht der Überblick auf einer Seite; versteht das Büro „Entwurf“ trotz Warnungen und dass nichts gesperrt wird?

## Notizen

Antworten des Büros je Variante (nach dem Interview ausfüllen, danach unter `## Answer` in Ticket 18 übernehmen).

| Variante | Antwort des Büros |
|---|---|
| LV-Grid · Dichte Tabelle mit Baum | |
| LV-Grid · Tabelle mit Seitenpanel | |
| LV-Grid · Karten je Titel | |
| Preisspiegel · Matrix mit Farbskala | |
| Preisspiegel · Matrix mit Rangzahl | |
| Preisspiegel · Balken je Position | |
| Projektübersicht · Baum | |
| Projektübersicht · Registerkarten | |
| Projektübersicht · Vorgangsliste | |
| GAEB-Dialog · Assistent in Schritten | |
| GAEB-Dialog · Eine Seite mit Prüfliste | |
| Sonstiges | |

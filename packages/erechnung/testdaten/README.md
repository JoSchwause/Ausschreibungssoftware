<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 Tethys AVA contributors
-->

# Selbst verfasste XRechnungen (Ticket 76)

Alle Dateien hier sind selbst verfasst; Namen, Nummern und die USt-IdNr. `DE000000000` sind erfunden (C4). Die
KoSIT-Dateien liegen unter `fixtures/extern/xrechnung/`.

## Rechenregeln

Die Sollwerte folgen aus den Summenregeln der EN 16931 und der kaufmännischen Rundung auf 2 Stellen (N2):

- BR-CO-10: BT-106 = Σ BT-131 (Nettobeträge der Positionen).
- BR-CO-13: BT-109 = BT-106 − BT-107 + BT-108.
- BR-CO-17: BT-117 = round(BT-116 × BT-119 / 100, 2); BR-CO-14: BT-110 = Σ BT-117.
- BR-CO-15: BT-112 = BT-109 + BT-110.
- BR-CO-16: BT-115 = BT-112 − BT-113 + BT-114.
- Positionsbetrag: BT-131 = round(BT-129 × BT-146, 2) (Preisbasismenge 1), wie GP = round(Menge × EP, 2) (N2).

## `bau-abschlag-875.xml` (CII, 1. Abschlagsrechnung Bau)

| Pos.    | Menge     | Preis    | Rechnung              | BT-131   |
| ------- | --------- | -------- | --------------------- | -------- |
| 01.0010 | 1 LS      | 2.500,00 | 1 × 2.500,00          | 2.500,00 |
| 02.0010 | 120,5 MTQ | 18,40    | 2.217,2               | 2.217,20 |
| 02.0020 | 85,25 MTK | 64,15    | 5.468,7875 → 5.468,79 | 5.468,79 |

BT-106 = 2.500,00 + 2.217,20 + 5.468,79 = 10.185,99 = BT-109. USt 19 % = 1.935,3381 → 1.935,34 = BT-110.
BT-112 = 10.185,99 + 1.935,34 = 12.121,33 = BT-115 (nichts bereits gezahlt).

## `bau-schluss-877.xml` (UBL, Schlussrechnung Bau)

| Pos.    | Menge      | Preis    | Rechnung     | BT-131   |
| ------- | ---------- | -------- | ------------ | -------- |
| 01.0010 | 1 LS       | 2.500,00 | 1 × 2.500,00 | 2.500,00 |
| 02.0010 | 131,25 MTQ | 18,40    | 2.415,000    | 2.415,00 |
| 02.0020 | 92,4 MTK   | 64,15    | 5.927,460    | 5.927,46 |

BT-106 = 10.842,46. Nachlass 3 % auf Dokumentenebene: 325,2738 → 325,27 = BT-107. BT-109 = 10.842,46 − 325,27 =
10.517,19. USt 19 % = 1.998,2661 → 1.998,27. BT-112 = 12.515,46. Bereits gezahlt (BT-113) ist der Zahlbetrag
der ersten Abschlagsrechnung, 12.121,33. BT-115 = 12.515,46 − 12.121,33 = 394,13.

## `rechenfehler.xml` (UBL, fünf Rechenfehler)

Die Positionen der 1. Abschlagsrechnung (Σ BT-131 = 10.185,99), dazu bewusst falsch:

| Regel    | In der Datei                         | Soll                             | Befund                    |
| -------- | ------------------------------------ | -------------------------------- | ------------------------- |
| BR-CO-10 | BT-106 = 10.185,90 (Zahlendreher)    | 10.185,99                        | `summe-positionen-falsch` |
| BR-CO-13 | BT-109 = 10.185,99                   | BT-106 der Datei: 10.185,90      | `netto-falsch`            |
| BR-CO-14 | BT-110 = 1.935,43, BT-117 = 1.935,34 | 1.935,34                         | `umsatzsteuer-falsch`     |
| BR-CO-15 | BT-112 = 12.121,33                   | 10.185,99 + 1.935,43 = 12.121,42 | `brutto-falsch`           |
| BR-CO-16 | BT-113 = 5.000,00, BT-115 = 7.121,42 | 12.121,33 − 5.000,00 = 7.121,33  | `zahlbetrag-falsch`       |

Jede Regel rechnet mit den Werten der Datei, nicht mit den Sollwerten der Regel davor; deshalb meldet jede Regel genau
einen Befund.

## `cii-unterpositionen.xml` (CII, Teilschlussrechnung Bau 876, Extension)

Position 1 (Gruppe) mit den Unterpositionen 1.1 (25 MTK × 2,40 = 60,00) und 1.2 (5 MTQ × 8,00 = 40,00), zusammen
100,00. Position 2.1 (0,5 HUR × 40,00 = 20,00) verweist auf eine Oberposition 9, die es nicht gibt, und zählt deshalb
als eigene Position. BT-106 = 100,00 + 20,00 = 120,00; USt 19 % = 22,80; BT-112 = BT-115 = 142,80.

## Weitere Dateien

| Datei                         | Zweck                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `pflichtangaben-fehlen.xml`   | CII ohne BT-1, BT-2, BT-5, BT-109, BT-115 und ohne BT-131 in Position 2                        |
| `auffaellige-werte.xml`       | UBL: BT-24 ohne XRechnung, 30. Februar, USD, `1.000,00`, 3 Stellen im Betrag, 4 in Menge/Preis |
| `gutschrift-381.xml`          | UBL-Gutschrift (`CreditNote`, 381) mit Standard-Namensraum an der Wurzel                       |
| `entitaet-billion-laughs.xml` | DOCTYPE mit verschachtelten Entitäten („Billion Laughs“)                                       |
| `entitaet-extern.xml`         | DOCTYPE mit externer Entität (XXE)                                                             |
| `fremde-wurzel.xml`           | wohlgeformtes XML, aber GAEB statt XRechnung                                                   |

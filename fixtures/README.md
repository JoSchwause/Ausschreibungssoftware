<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 Tethys AVA contributors
-->

# Fixtures v1

Selbst verfasste, erfundene Leistungsverzeichnisse (LV) mit Sollwerten (Ticket 19, Regeln C1, C4, N2, N3).
Keine echten Namen, keine STLB- oder DIN-Katalogtexte. Das JSON ist ein **Fixture-Format**; die endgültigen
Typen liegen in `packages/vertrag` (Ticket 02).

## Erzeugen und prüfen

```
node fixtures/erzeugen.mjs        # schreibt alle JSON-Dateien neu
node --test                       # im Wurzelverzeichnis; oder: node --test "fixtures/*.test.mjs"
```

`node --test fixtures/` (Verzeichnis als Argument) funktioniert unter Node 22 nicht, dort wird das Argument als
Moduldatei gelesen. Das Erzeugungsskript ist deterministisch (eigener Seed-PRNG, feste IDs, kein `Date.now()`, kein
`Math.random()`) und rechnet Geld und Mengen ausschließlich mit BigInt-Festkommazahlen (`rechnen.mjs`).

## Dateien und Herkunft

| Datei | Inhalt | Herkunft |
|---|---|---|
| `winzig.json` | 1 Titel, 3 Positionen, Netto 2.565,00 | selbst verfasst, vom Skript erzeugt |
| `typisch.json` | 3 Titel, 25 Positionen, 2 Hinweistexte, MwSt 19 %, Nachlass 2,00 % | selbst verfasst, Daten im Skript, Sollwerte berechnet |
| `typisch-angebote.json` | 3 Bieter (A, B, C) mit Angeboten zu `typisch` | selbst verfasst, Preise per Seed gestreut |
| `gross.json` | 5.000 Positionen, 5 Titelebenen (5 × 3 × 3 × 3 × 3 Titel), Seed `fixtures-v1/gross` | vollständig erzeugt, nicht von Hand gepflegt |
| `handbeispiele.json` | Hand-Beispiele aus Ticket 19 und 07 mit Zwischenwerten | selbst verfasst, vom Skript erzeugt |
| `erzeugen.mjs`, `rechnen.mjs`, `fixtures.test.mjs` | Generator, Dezimalrechnung, Selbsttest | selbst verfasst |

Lizenz: AGPL-3.0-or-later (REUSE-Abdeckung über den Repo-weiten Glob für `fixtures/**`).

## JSON-Form

Dezimalwerte sind **Strings** in kanonischer Punktnotation mit allen Nachkommastellen (`"1.235"`, `"10.000"`,
`"12.35"`), nie JSON-Zahlen. Stellen: Menge 3, EP 3, Prozent 2, Betrag 2 (N3).

```
LV:      { schemaVersion, art:"leistungsverzeichnis", id, name, ozMaske, mwstSatz, nachlass|null, knoten[], sollwerte }
Knoten:  flach, in Dokumentreihenfolge; parentId = LV-ID oder Titel-ID; Reihenfolge der Geschwister = Arrayreihenfolge
  titel:    { id, parentId, art:"titel", ordnungszahl, kurztext }
  position: { id, parentId, art:"position", positionsart:"normal|bedarf|wahl|zuschlag", ordnungszahl, [ozIndex],
              kurztext, langtext, menge, einheit, einheitspreis, [bedarfMitGesamtbetrag], [bezugspositionId], [grundpositionId] }
  hinweis:  { id, parentId, art:"hinweis", text }
Nachlass: { art:"prozent"|"betrag", wert }
Sollwerte: { positionen:{id:{gp, inSumme}}, titel:{id:{summe}}, summen:{netto, nachlass, nettoNachNachlass, mwst, brutto}, nichtAngeboten:[id] }
Angebotsset: { schemaVersion, art:"angebotsset", lvId, lvName, bieter[{id,name}],
               angebote[{id, bieterId, nachlass|null, positionen[{positionId, status, [einheitspreis]}], sollwerte}],
               ausreisserAnnahmeA7 }
```

IDs sind UUIDv7-förmig (fester Zeitstempel, je ID +1 ms, Rest aus dem Seed-PRNG) und über alle Dateien eindeutig.
Die Ordnungszahl ist Anzeigedatum, kein Schlüssel; Bezüge laufen über IDs. Der EP im LV ist ein Schätzpreis
(Kostenansatz), er speist den „Schätzpreis“ des virtuellen Bieters.

## Berechnungsregel je Sollwert

| Sollwert | Regel |
|---|---|
| `gp` | `round_half_up(Menge × EP, 2)`; Menge × EP wird exakt mit 6 Nachkommastellen gerechnet, dann gerundet (N2) |
| Titelsumme | Summe der gerundeten GPs aller darunterliegenden Positionen, die in die Summe eingehen, einschließlich Untertitel |
| `netto` | Summe der gerundeten GPs aller Positionen, die in die Summe eingehen |
| `nachlass` | `prozent`: `round_half_up(netto × p / 100, 2)`; `betrag`: der Betrag. Kein Nachlass: `0.00` |
| `nettoNachNachlass` | `netto − nachlass` |
| `mwst` | `round_half_up(nettoNachNachlass × Satz / 100, 2)`, einmal auf die Summe, nicht je Position (N2) |
| `brutto` | `nettoNachNachlass + mwst` |

Negative Werte kommen nicht vor; das Skript lehnt sie ab, bis Ticket 04 die Rundung negativer Beträge entscheidet.

## Handrechnung `winzig` (MwSt 19 %, kein Nachlass)

- 01.0010: 1,235 × 10,000 = 12,35 (exakt 12,35000)
- 01.0020: 3,333 × 4,560 = 15,19848, gerundet **15,20**
- 01.0030: 5,000 × 507,490 = 2.537,45
- Titelsumme = Netto = 12,35 + 15,20 + 2.537,45 = **2.565,00**
- MwSt: 2.565,00 × 19 % = 487,35 (exakt); Brutto = 2.565,00 + 487,35 = **3.052,35**

Die Kette 27,55 → 5,2345 → 5,23 → 32,78 steht nicht in `winzig` (die dritte Position ist nötig, damit es drei
sind), sondern in `handbeispiele.json`, zusammen mit 402,73 − 3 % (Nachlass 12,0819 → 12,08; netto 390,65;
MwSt 74,2235 → 74,22; brutto 464,87).

## Annahmen

Die Regeln (N2, Glossar) legen diese Fälle nicht vollständig fest. Die Fixtures wählen jeweils die einfachste,
vorsichtigste Darstellung. **Spätere Tickets (K5/K6, V1/V2, 04) dürfen diese Wahl nicht als Regel erben**; die
Sollwerte der betroffenen Fälle gelten nur unter der jeweiligen Annahme.

- **A1 Bedarfsposition ohne Gesamtbetrag:** GP wird berechnet und ausgewiesen (`gp`), geht aber nicht in
  Titelsummen und Netto ein (`inSumme: false`). Das Glossar lässt „oder separat ausgewiesen“ zu; eine separate
  Summe gibt es hier nicht.
- **A2 Bedarfsposition mit Gesamtbetrag** (`bedarfMitGesamtbetrag: true`): geht wie eine Normalposition in die Summen
  ein. `typisch` enthält keine; `gross` enthält etwa 2 %.
- **A3 Wahlposition:** GP wird berechnet und ausgewiesen, geht nicht in die Summen ein. Es findet kein Ersetzen der
  Grundposition statt (`grundpositionId` ist nur ein Verweis). Der Zustand „Auftraggeber hat gewählt“ ist nicht abgebildet.
- **A4 Zuschlagsposition:** hat eigene Menge, Einheit und EP, kein Prozentsatz auf die Bezugsposition. Ihr GP geht wie
  bei einer Normalposition in die Summen ein; `bezugspositionId` ist nur ein Verweis.
- **A5 Nicht angebotene Position:** Eintrag mit `status: "nicht-angeboten"`, ohne Feld `einheitspreis`; `gp` ist
  `null`, `inSumme: false`, die ID steht in `nichtAngeboten`. Ein angebotener Preis von `0.000` (`status: "angeboten"`)
  ist davon verschieden und ergibt GP `0.00`. Wie ein Preisspiegel nicht angebotene Positionen bewertet
  (Ergänzen aus Mittel, Ausschluss), ist nicht festgelegt und kommt hier nicht vor.
- **A6 Nachlass-Rundung:** Der Nachlassbetrag wird auf 2 Stellen gerundet, dann subtrahiert. Ticket 07 formuliert
  „402,73 − 3 % = 390,6481 → 390,65“, das rundet das Ergebnis. Beide Wege stimmen überein, außer bei einem
  Rundungsgleichstand; der Selbsttest prüft für jede Fixture, dass beide Wege dasselbe liefern. Welcher Weg gilt, ist offen.
  Ein Angebot trägt seinen eigenen Nachlass; es erbt den des LV nicht. MwSt-Satz des Angebots ist der des LV (19,00).
- **A7 Ausreißer** (nur in `typisch-angebote.json`, Schlüssel `ausreisserAnnahmeA7`): Das Glossar nennt ±20 % vom Mittelwert
  oder Referenzpreis, ohne Bezugsgröße. Hier: je Position der GP; Mittel = arithmetisches Mittel der GP aller Angebote, die
  die Position angeboten haben (einschließlich des geprüften), mindestens 3 Werte, Mittel > 0; Ausreißer, wenn die
  Abweichung strikt größer als 20 % ist, exakt per Ganzzahlvergleich. Folgen: Bieter C hat zwei absichtliche Ausreißer
  (150 % des Basispreises) und einen 0,000-Preis; der 0,000-Preis zieht das Mittel so weit herunter, dass auch A und B
  an dieser Position als Ausreißer erscheinen. Das ist eine Folge der Annahme, kein Sollwert für V2.
- **A8 Titelsummen** enthalten nur Positionen mit `inSumme: true`. Hinweistexte tragen keine Beträge.
- **A9 „Gliederungsebenen“** zählt Titelebenen (`gross`: 5). Lose werden in v1 nicht verwendet.
- **A10 Indexposition:** `ozIndex` ist ein Buchstabe neben der Ordnungszahl; in `typisch` tragen die Wahl- und die
  Zuschlagsposition den Index „A“ zur Ordnungszahl ihrer Bezugsposition. Eine Bedeutung über die Anzeige hinaus ist nicht festgelegt.
- **A11 `winzig`** hat Netto 2.565,00 (siehe oben), nicht 27,55.
- **A12 `gross`** enthält Normal- (etwa 90 %), Bedarfs-, Wahl- und Zuschlagspositionen sowie 5 Hinweistexte (nicht
  als Positionen gezählt) und einen Nachlass von 1,50 %.

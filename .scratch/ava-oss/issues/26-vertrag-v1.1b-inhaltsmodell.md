# 26: `vertrag` v1.1b „Inhaltsmodell“ (**Mensch prüft vor Merge**)

Status: ready-for-agent
Type: task
Welle: 2 · Strang: F · Paket: `packages/vertrag`
Blocked by: 24
Regeln: A4, A9, F3, F4, F5, F6, L1, L2, N1, P2, P9, ADR 0009
Herkunft: E-02, E-03, E-04, E-05, E-10, E-11, E-13 (`next-decisions.md`)

## What to build

Der Vertrag trägt das Inhaltsmodell, das K5–K7, G2 und U4 brauchen. **Nur Typen, Konstanten, Kommentare.**

1. **Positionsmerkmale (F5, E-05).** Bedarf, Wahl, Stundenlohn und Pauschal sind einzelne, kombinierbare Merkmale
   einer Position (z. B. Bedarfsposition im Stundenlohn). Der einzelne Wert `positionsart` entfällt oder wird
   abgeleitet. „Bedarf mit/ohne Gesamtbetrag“ bleibt darstellbar. `PositionsartAendern` wird entsprechend ersetzt.
2. **Zuschlagsposition (F3, E-03).** GAEB-Semantik: ein Prozentsatz auf die Summe der Bezugspositionen, statt
   Menge × EP. Drei Bezugsformen, wie sie der Leser in den amtlichen Dateien gefunden hat (Ticket 22, Comments):
   Liste einzelner Positionen mit Teilmengen; alle Positionen einer Gliederung; Kennzeichnung an den Positionen.
   Der Vertrag hält die Bezüge; die Rechenregel legt K6 fest, **nachdem** die Fachdokumentation wörtlich zitiert
   ist. Lässt sich eine Bezugsform aus Ticket 22 nicht eindeutig typisieren: Offene Typfrage, nicht raten.
3. **Wahlposition (F4, E-04).** Gruppen- und Variantennummer aus GAEB bleiben erhalten. Es gibt **keinen** Zustand
   „gewählt“ im Ausschreibungs-LV (Wählen geschieht bei der Vergabe, Welle 4).
4. **Summen (F4).** `Gesamtsummen` (und wo nötig `Gliederungssumme`) bekommen zwei getrennt ausgewiesene Felder:
   Summe der Bedarfspositionen ohne Gesamtbetrag und Summe der Wahlpositionen. Beide gehen nicht ins Netto ein.
5. **Langtext (F6, E-10).** `Langtext` trägt die GAEB-abbildbare Teilmenge: fett, kursiv, unterstrichen, Absätze,
   Listen, Tabellen, Bilder, Textergänzungen (Stellen, die der Bieter ausfüllt, mit Kennung; sowie die des
   Ausschreibenden). Reine, JSON-taugliche Daten; ein leerer Text bleibt einfach darstellbar. Das Schema muss sich
   ohne Verlust auf TipTap (U4) und auf GAEB (G2) abbilden lassen; die Abbildung selbst ist nicht Teil des Tickets.
6. **Kopfdaten (F6, E-11).** Auftraggeber und Vergabeinformationen am LV; Leit- und Unterbeschreibung an den
   Positionen. Die Felder folgen dem, was Ticket 22 in den amtlichen Dateien gefunden hat (Comments dort); was dort
   nicht belegt ist, wird nicht erfunden.
7. **Protokoll für Massenbefehle (A5, E-13, ADR 0009).** Ein `Protokolleintrag` kann statt des ganzen Befehls Kopf
   und Prüfsumme tragen. Der Typ legt fest, was „Kopf“ ist und wie die Prüfsumme benannt wird (Algorithmus als
   Feld, damit er wechselbar bleibt). Welche Befehle Massenbefehle sind, sagt der Typ oder eine Konstante.

## Grenzen

Wie Ticket 24: der ganze Baum bleibt grün; nicht additive Änderungen dürfen in anderen Paketen nur rein mechanisch
nachgezogen werden (`// v1.1b: mechanisch angepasst, Folgeticket`), aufgelistet in den Comments. Fixtures und
`fixtures-abbildung.test.ts` werden an die neuen Typen angepasst, **ohne** die Rechenwerte zu ändern (die Fixture
`typisch` rechnet die Zuschlagsposition bis K6 weiter wie bisher; das steht als Vermerk in der Abbildung).

## Acceptance criteria

- [ ] Jede der sieben Nummern ist abgebildet; die Comments nennen je Nummer Datei und Typ
- [ ] Beispielwerte: Bedarfsposition im Stundenlohn; Zuschlagsposition je Bezugsform; Wahlposition mit Gruppe und Variante; Langtext mit Liste, Tabelle und Textergänzung; Protokolleintrag eines Massenbefehls
- [ ] Typtest: Eine Position kann zugleich Bedarf und Stundenlohn sein; eine Zuschlagsposition hat keinen EP-Zwang
- [ ] `GLOSSARY.md` enthält jeden neuen Fachbegriff (L2); „Zulage“ erscheint nirgends (L2)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün auf dem ganzen Baum
- [ ] Je Folgepaket eine Liste in den Comments: was anzupassen ist
- [ ] Offene Typfragen stehen in den Comments, nicht geraten (P5)

## Nicht-Ziele

Rechenregeln (K5, K6), TipTap-Schema (U4), GAEB-Schreiben (G2), Preisspiegel-Typen, „Wählen“ einer Wahlposition.

## Comments

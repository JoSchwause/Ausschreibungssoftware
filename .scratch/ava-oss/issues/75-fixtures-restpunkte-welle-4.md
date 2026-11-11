# 75: Fixtures: Restpunkte aus Welle 4

Status: resolved
Type: task
Welle: 5 · Strang: F · Paket: `fixtures/`
Blocked by: –
Regeln: C4, D-05
Herkunft: D-63.9, Wellen-Review 4 (P2)

## What to build

1. `typisch-angebote.json` `ausreisserAnnahmeA7` nennt Bieter C an 03.0080 (Preis 0,000) als Ausreißer; nach D-05 ist das ein
   Nullpreis. Feld nach D-05 neu berechnen oder entfernen (Verbraucher prüfen).
2. Unabhängige Sollwerte für Bedarfs- und Wahlsumme der LV-Fixtures, damit der Drucktest (Ticket 58) nicht gegen den Kern prüft.

## Acceptance criteria

- [x] Selbsttest grün; Verbraucher angepasst (kein Code-Verbraucher außerhalb `fixtures/` liest das Feld; zu ändernde Tests und Kommentare anderer Pakete unten gemeldet)

## Comments

### Ergebnis (Agent, Branch `welle-5/75-fixtures-rest`, Basis `integration/welle-5`)

**Punkt 1.** `typisch-angebote.json` `ausreisserAnnahmeA7` ist nach D-05 neu gerechnet (`rechnen.mjs`
`ausreisserSollwerte`, BigInt; das alte `ausreisser` über GP entfällt). Ergebnis: nur Bieter C an 02.0050 und 03.0030 (beide
nach oben); 03.0080 (C 0,000) und die dort früher mitmarkierten A und B fallen weg. Der Selbsttest rechnet die Ausreißer
eigens aus den Angebotszeilen nach (nicht über `rechnen.mjs`), prüft das Ergebnis von Hand (README A7) und, wie D-63.9,
dass bei 200 % nichts übrig bleibt. Alle übrigen Dateien (auch die X84) sind byte-gleich.

**Punkt 2.** Die unabhängigen Sollwerte gibt es seit Ticket 51 schon: `sollwerte.ausweise.gesamt` und
`sollwerte.ausweise.titel[<Titel-ID>]` mit `summeBedarfOhneGesamtbetrag` und `summeWahl` in `typisch` und `gross`, gerechnet
in `rechnen.mjs` (BigInt), nicht im Kern. Ticket 58 lief parallel zu 51 und kannte sie nicht (D-58.9). Neu: Der Selbsttest
zählt beide Summen für jede LV-Fixture ein zweites Mal unmittelbar aus den Knoten nach (gesamt und je Titel, nicht über
`berechneSollwerteGaeb`) und prüft, dass `winzig` und `zuschlag` (ohne `ausweise`) keine Bedarfs- und keine Wahlposition
haben. README: Abschnitt „Bedarfs- und Wahlsumme der LV“ mit Regel (N2, F4/E-04, GAEB `Provis` `WithoutTotal`,
`ALNGroupNo`/`ALNSerNo`) und Handrechnung für `typisch` (586,80; 5.880,00).

**Test zuerst.** Punkt 1: neuer Selbsttest rot (alte Regel, 03.0080 markiert), dann grün. Punkt 2: die Gegenrechnung war
sofort grün, weil die Werte schon stimmten (Prüftest, kein neues Verhalten).

**Entscheidungen.**

- **D-75.1** Frage: Feld neu berechnen oder entfernen? Entscheidung: neu berechnen; Schlüssel `ausreisserAnnahmeA7` und Form
  (`schwellePromille`, `regel`, `jeAngebot: {angebotId: [positionId]}`) bleiben, nur `regel` und die Listen ändern sich.
  Grund: Die Verbraucher (E2E und `ansicht.test.ts` in `apps/web`, D-63.9) verweisen auf das Feld; so muss kein Code
  außerhalb von `fixtures/` geändert werden. Reversible: yes.
- **D-75.2** Frage: Welcher Wert, welche Positionen? Entscheidung: wie `vergabe` nach D-05/D-36.1/D-44.1: EP des Bieters, an
  der Zuschlagsposition sein Betrag; jede Position (jede Zeile des Preisspiegels); nur Werte > 0; ab zwei solchen Werten
  und Summe > 0; strikt größer als die Schwelle, ganzzahlig. Verglichen werden die drei Angebote zusammen; für die Paare in
  `preisspiegel.vergleiche` trägt die Fixture keine Ausreißer (nicht verlangt). Keine Richtung im Feld: Beide Ausreißer
  liegen nach oben (README). Grund: gleiche Regel wie der Preisspiegel; alte Lesart (GP, Nullpreis mitgezählt, mindestens
  3 Werte) widersprach D-05. Reversible: yes.
- **D-75.3** Frage: Neue Felder für Bedarfs- und Wahlsumme? Entscheidung: keine; der Drucktest nimmt die vorhandenen
  `sollwerte.ausweise`. `winzig` und `zuschlag` bekommen keine `ausweise`: Sie haben keine Bedarfs- oder Wahlposition, und
  `packages/kern/src/summen.test.ts` prüft für `winzig` ausdrücklich `soll.ausweise` undefined (würde sonst rot). Grund:
  keine doppelten Felder, kein Bruch in einem fremden Paket. Reversible: yes.

**Hinweise für andere Pakete (nicht geändert, P2).**

1. `packages/ausgabe/src/lv-druck.test.ts`, Test „druckt Bedarfs- und Wahlsumme getrennt …“ (und `modell.test.ts`, „trennt
   Bedarfssumme und Wahlsumme …“): statt `zustand.summen.gesamt` die Fixture lesen,
   `fx.sollwerte.ausweise.gesamt.summeBedarfOhneGesamtbetrag` und `.summeWahl`; für die Zeile „nicht in der Summe
   enthalten“ je Titel `fx.sollwerte.ausweise.titel[<Titel-ID>]` (D-58.4, nur Beträge ≠ 0,00). Fehlt `ausweise`
   (`winzig`, `zuschlag`), hat das LV keine solche Position (Selbsttest sichert das). Dazu in
   `packages/ausgabe/src/testhilfen.ts` `FxLv['sollwerte']` um
   `ausweise?: { gesamt: { summeBedarfOhneGesamtbetrag: string; summeWahl: string }; titel: Record<string, { summeBedarfOhneGesamtbetrag: string; summeWahl: string }> }`
   ergänzen; Kopfkommentare in `lv-druck.test.ts` („aus dem Summenstand des Kerns“) und `testhilfe/bau.ts` anpassen.
2. `apps/web/src/vergabe/ansicht.test.ts` Zeile 148 f.: Kommentar veraltet („A7 nennt für Bieter C 02.0050, 03.0030 und
   03.0080“); richtig ist jetzt „A7 (D-05) nennt für Bieter C 02.0050 und 03.0030“. Die Erwartungen selbst stimmen.
3. `proto/interview/src/spiegel.ts` (Wegwerf-Prototyp) rechnet noch nach der alten A7 (`MIN_WERTE = 3`); nur zur Kenntnis.

**Suite.** Nach `git merge integration/welle-5`: Lint und Typecheck grün; `pnpm test`: 2025 bestanden, 1 rot, nur das Budget
`packages/vergabe/src/leistung.test.ts` „preisspiegelBerechnen für gross mit 5 Angeboten unter 1000 ms“ mit 1.177,3 ms bei
Last 15 auf 4 Kernen; die Datei allein: 710,0 ms, grün (Budget unverändert; `gross.json` und alles, was `vergabe` liest,
ist byte-gleich). Fixture-Selbsttest 22/22 grün.

## Answer

Punkt 1: `ausreisserAnnahmeA7` nach D-05 neu gerechnet (nur Bieter C an 02.0050 und 03.0030), Form und Schlüssel
unverändert, kein Verbraucher-Code geändert. Punkt 2: Die Sollwerte stehen in `sollwerte.ausweise` (`typisch`, `gross`) und
werden jetzt im Selbsttest eigens aus den Knoten nachgezählt; der Drucktest (Ticket 58) soll
`fx.sollwerte.ausweise.gesamt.summeBedarfOhneGesamtbetrag`/`.summeWahl` und `fx.sollwerte.ausweise.titel[<Titel-ID>]`
lesen (Änderung in `packages/ausgabe`, siehe Hinweis 1). README A7 und neuer Abschnitt „Bedarfs- und Wahlsumme der LV“.

Merged: 78da98fff371a71d7c97522e55689d72429ed9f1 in integration/welle-5

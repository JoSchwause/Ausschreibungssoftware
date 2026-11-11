# 51: Fixtures `typisch`, `gross`, `typisch-angebote` auf GAEB-Zuschlagsform umstellen

Status: claimed
Type: task
Welle: 4 · Strang: F · Paket: `fixtures/` (benannte Ausnahme: die Fixture-Testhelfer und -Tests anderer Pakete, siehe Grenzen)
Blocked by: – (Ticket 44 und 37 sind gemergt)
Blockiert: M3
Regeln: C4, A4, F3, F4, E-03, D-10 (1), D-44.2, D-18
Herkunft: Ticket 44 (Punkt 5, abgespalten, D-44.2), Ticket 37 (Regeln R1–R8)

## What to build

`typisch`, `gross` und `typisch-angebote` rechnen die Zuschlagspositionen noch in der Altform (Menge × EP, Annahme A4).
Ticket 44 hat den Vermerk in `fixtures/README.md` gesetzt und Punkt 5 abgespalten. Umstellung auf die GAEB-Form
(Vorschlag aus Ticket 44, Werte nachgerechnet):

- `typisch`: Position 02.0050 A bekommt `zuschlag` = Satz 8,50 %, Bezugsform Liste mit 02.0050 (GP 6.544,88); Menge,
  Einheit und EP werden `null`. Betrag 556,31 (vorher 554,13). Titel 02 25.222,42, Netto 55.465,59, Nachlass 2 %
  1.109,31, Netto nach Nachlass 54.356,28, MwSt 19 % 10.327,69, Brutto 64.683,97; Bedarfssumme 586,80 und Wahlsumme
  5.880,00 als Sollwerte je LV und je Titel.
- `typisch-angebote.json`: jeder Bieter bekommt für 02.0050 A einen `zuschlagssatz` statt eines EP (per Seed aus dem
  Generator), Sollwerte neu.
- `gross.json`: Zuschlagspositionen ebenso in GAEB-Form (Satz per Seed, Bezug wie bisher), Sollwerte neu.
- `erzeugen.mjs` und `rechnen.mjs` rechnen die neue Form unabhängig vom Kern (BigInt); `README.md`: Annahme A4 ersetzen
  durch R1–R6 aus Ticket 37, Verweis auf D-03. `GLOSSARY.md` nennt bei „Altform der Zuschlagsposition“ noch Ticket 44
  als Umsteller: nachziehen.

Fixture-Verbraucher (aus Ticket 44, Comments; alle Testcode, jede Stelle markiert `// Ticket 51: Fixture-Format, mechanisch`):
`fixtures/` (Generator, `rechnen.mjs`, Selbsttest); `packages/kern/src/testhilfen.ts`, `fixtures.test.ts`,
`summen.test.ts`, `merkmale.test.ts`, `summen-leistung.test.ts`, `auftrags-lv.test.ts`, `oz-fixtures.test.ts`;
`packages/vertrag/src/fixtures-abbildung.test.ts`; `packages/speicher/src/testhilfe/fixtures.ts` (und
`fixtures/projektdatei-v2.json`, falls aus `typisch` erzeugt); `packages/ausgabe/src/testhilfen.ts`, `ausgabe.test.ts`,
`druck.test.ts`; `packages/ui-grid/e2e/harness/fixture-ansicht.ts` und E2E mit festen Summen; `packages/gaeb/src/testhilfen.ts`,
`schreiben.test.ts` mit `testdaten/golden/export/typisch-X8?-3.3.*` und `gross.sha256.json`; Testhelfer in `apps/web`;
`packages/vergabe/src/testhilfen.ts` (`fxZuschlag`) und `summen.test.ts`. Weitere Leser per Suche nach den Fixture-Namen
finden und nachtragen.

## Grenzen

- Nur Fixtures und Testcode; kein Produktivcode. Erwartungen mit festen Zahlen der alten Fixture werden auf die neuen
  Sollwerte gesetzt, nicht abgeschwächt (C4: Sollwerte unabhängig berechnet, nicht aus dem Kern).
- Die eingefrorenen Projektdateien (`projektdatei-v1/v2/v3.json`) bleiben byte-gleich, soweit sie nicht aus `typisch`
  erzeugt sind; sonst Änderung begründen.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] `typisch` ergibt die oben genannten Zahlen; Sollwerte unabhängig von `kern` und `vergabe` berechnet
- [ ] `typisch-angebote` und `gross` in GAEB-Form; Sollwerte neu, Selbsttest der Fixtures grün
- [ ] Alle Fixture-Verbraucher (Liste oben) grün, GAEB-Export-Goldens und `gross.sha256.json` begründet aktualisiert
- [ ] `fixtures/README.md` und `GLOSSARY.md` nachgezogen (A4 ersetzt, Umsteller genannt)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` und `pnpm e2e` grün

## Nicht-Ziele

Neue Fixtures, Änderungen an Rechenregeln, `vertrag`.

## Comments

### Umsetzer

- **D-51.1 Form in der Fixture.** Frage: Wie steht die GAEB-Form im Fixture-Format? Entscheidung: wie in `zuschlag.json`
  (Ticket 37) als `zuschlag: { prozentsatz, bezug: { art: 'positionen', positionen: [{ positionId, teilmenge: null }] } }`,
  Menge, Einheit, EP `null`; `bezugspositionId` entfällt. `positionsart: 'zuschlag'` bleibt (Annahmen A1–A3 lesen sie).
  Grund: eine Form für alle Fixtures, Vertragsform, die Kern-, `gaeb`- und Vertrags-Testhelfer schon für `zuschlag.json`
  lesen.
- **D-51.2 Satz des Bieters.** Frage: Woher kommt der Satz je Bieter, und trägt die Zeile einen EP? Entscheidung: Satz
  = round_half_up(Satz des LV × Promille / 1000, 2), Promille = Basis des Bieters + die ohnehin gezogene Streuung (A 1000,
  B 1060, C 930) → 8,51 / 9,10 / 7,87. Die Zeile trägt `zuschlagssatz` und **keinen** `einheitspreis`; den
  Platzhalter-EP `0.000` (Vertrag v1.2, D-29.1) setzt der Testhelfer beim Abbilden. Grund: „Satz statt EP“ (Ticket),
  der Platzhalter ist kein Preis (D-12); keine neue Zufallsziehung, die Folge bleibt gleich.
- **D-51.3 Satz in `gross`.** Entscheidung: eigener Seed-Strom `fixtures-v1/gross/zuschlagssatz`, Satz 1,00 bis 15,00 %;
  Menge, Einheit und EP werden weiter gezogen, aber nicht gesetzt. Grund: alle übrigen 5.508 Knoten bleiben byte-gleich
  (geprüft), nur die 102 Zuschlagspositionen und die Sollwerte ändern sich.
- **D-51.4 Ausweise als Sollwerte.** Frage: Wohin mit Bedarfs- und Wahlsumme? Entscheidung: additiv
  `sollwerte.ausweise = { gesamt, titel }` mit den Feldnamen von `Gesamtsummen` (`summeBedarfOhneGesamtbetrag`,
  `summeWahl`), dazu `sollwerte.zuschlaege` (Basis, Betrag) wie in `zuschlag.json`; für `typisch`, `gross` und jedes
  Angebot. `summen` und `titel` bleiben unverändert in der Form. `winzig`, `handbeispiele`, `zuschlag.json` bleiben
  byte-gleich (eigener Zweig `gaebForm` in `baueLv`). Grund: kein Verbraucher, der `summen` per `toEqual` liest, bricht.
- **D-51.5 Eine Rechenstelle im Generator.** `rechnen.mjs` hat jetzt `zuschlagsbasis` (R2–R5), gemeinsam für
  `berechneZuschlagSollwerte` (zuschlag.json, Ausgabe byte-gleich) und das neue `berechneSollwerteGaeb` (LV und Angebot,
  R7: Preisquelle als Funktion `{ ep, satz }` je Position, `null` = nicht angeboten), plus `betragsziel` (D-37.1). Alles
  BigInt, kein Import aus `kern` oder `vergabe`. Gegenprobe: Die Kern-Tests vergleichen `summenBerechnen`,
  `zuschlagsbasen` und `angebotZuschlaegeBerechnen` gegen diese Sollwerte (alle 102 Zuschläge in `gross` stimmen).
- **D-51.6 Schemaversion 1 in `speicher`-Tests.** Frage: `inhaltMitAllenAltenArten` baut den Inhalt der Version 1 aus
  `typisch`; Version 1 fasst weder Satz noch Ausweise. Entscheidung: Der Testhelfer setzt 02.0050 A dort in die Altform mit
  den Werten vor Ticket 51 (38,750 m³ × 14,300), die Angebote nennen dort den EP 14,300, die gespeicherten Summen ohne
  Ausweise; die erwarteten Summen rechnet `mitKernSummen` wie bisher. Grund: Version-1-Daten hatten genau diese Form;
  die Migrationstests prüfen weiter die Altform.
- **D-51.7 Goldens und Unterschiedsliste.** `typisch-X86-3.3.x86` neu: 02.0050 A ist jetzt `MarkupItem` (`ListInSubQty`,
  `RefItem` auf 02.0050, `ITMarkup` 6544.88, `Markup` 8.50, `IT` 556.31) statt `Item` mit Menge × EP, dazu Totals 55465.59 /
  54356.28 / 10327.69 / 64683.97 und Titel 02 25222.42. `gross.sha256.json`: nur der X86-Hash ändert sich (gleicher Grund).
  X81/X83-Goldens aller Fixtures bleiben byte-gleich (die Altform wurde dort schon als `MarkupItem` ohne Menge geschrieben).
  `roundtrip-unterschiede.json` verliert alle 103 `altform-zuschlag`-Einträge (typisch 1, gross 102), es kommt keiner
  dazu; übrig sind die 100 `wahl-nummer-kuenstlich` (Fixtures haben keine Gruppe/Variante, README A3). Die Art
  `altform-zuschlag` ist aus dem Roundtrip-Test entfernt. `kern/golden/lv-pruefung-{typisch,gross}.golden.jsonl` verlieren
  genau die 103 Befunde `zuschlag-altform`; der Fixture-Test prüft jetzt, dass keine Fixture die Altform trägt (die Regel
  selbst prüft `lv-pruefung.test.ts`).
- Verbraucher (jede Stelle markiert `// Ticket 51: Fixture-Format, mechanisch`): `fixtures/` (Generator, `rechnen.mjs`,
  Selbsttest, README, Glossar); `kern` (`testhilfen.ts`, `merkmale.test.ts`, `summen.test.ts`, `lv-pruefung-fixtures.test.ts`);
  `vertrag/fixtures-abbildung.test.ts`; `speicher/testhilfe/fixtures.ts`, `inhalt-v1.ts`; `ausgabe/testhilfen.ts`;
  `vergabe/testhilfen.ts`, `summen.test.ts`; `gaeb/testhilfen.ts`, `roundtrip.test.ts`, Goldens; `ui-grid/e2e/harness/fixture-ansicht.ts`;
  `apps/web/e2e/fixture-inhalt.ts`, `undo.spec.ts` (Netto 55.465,59), `src/gaeb/gaeb.test.ts` (Rundweg behält 02.0050 A).
  Ohne Änderung grün: `kern` `fixtures.test.ts`, `summen-leistung.test.ts`, `auftrags-lv.test.ts`, `oz-fixtures.test.ts`;
  `ausgabe` `ausgabe.test.ts`, `druck.test.ts` (lesen die Sollwerte). Die eingefrorenen Projektdateien
  `packages/speicher/fixtures/projektdatei-v1/v2/v3.json` bleiben byte-gleich. `proto/interview/daten/erzeugen.mjs`
  (Wegwerf-Prototyp, Ausgabe eingecheckt, nicht in der Suite) nicht neu erzeugt.
- Leistung: `vergabe/leistung.test.ts` `preisspiegelBerechnen` (gross, 5 Angebote) einzeln 825 ms (vorher mit der Altform
  1.050–1.260 ms auf derselben, ausgelasteten Maschine); das Budget von 1 s ist bei voller Parallelsuite lastabhängig.

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

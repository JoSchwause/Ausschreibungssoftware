# 25: Aufräumen nach Welle 1

Status: ready-for-agent
Type: task
Welle: 2 · Paket: `fixtures/`, `tools/`; je eine benannte Stelle in `packages/kern` und `packages/gaeb`
Blocked by: -
Regeln: A3, C4, F2, N3, U5, Q1
Herkunft: E-19, E-16 (`next-decisions.md`)

## What to build

Vier kleine Korrekturen, als ein Ticket entschieden (E-19). Solange dieses Ticket läuft, schreibt kein anderer
Agent in `kern` und `gaeb` (P2).

1. **Fixtures.** (a) Der Maskentext in `fixtures/` (`NN.NN.NN.NN.NN.NNNN[I]`, 15 Stellen) verletzt die Regel
   „OZ höchstens 14 Zeichen einschließlich Index“ (F2); auf 14 Stellen korrigieren, überall wo er in `fixtures/`
   steht (Daten, README, Erzeuger), dazu in den Testhilfen von `kern`. Die Stelle in `packages/vertrag` korrigiert
   Ticket 24. (b) `handbeispiele.json` auf die kanonische Stellenzahl bringen (N3: EP 3, Menge 3,
   Prozent 2, Betrag 2, alle Nullen). (c) `gross.json` in Dokumentreihenfolge schreiben (Eltern vor Kindern,
   Geschwister nach `reihenfolge`); der Erzeuger `erzeugen.mjs` erzeugt die Datei so, byte-stabil.
   Die Sollwerte (Summen) ändern sich dadurch nicht; ein Test belegt das.
2. **Paketgrenzen.** Testdateien eines Pakets dürfen `fixtures/` lesen (`tools/boundaries.mjs`); heute geht das nur
   über einen Umweg. Produktivcode darf es weiterhin nicht. Den Umweg in den Tests, die ihn nutzen, **nicht** in
   diesem Ticket entfernen, außer in `kern` und `gaeb`.
3. **`kern`: Maske beim Anlegen.** `LeistungsverzeichnisAnlegen` prüft die OZ-Maske nicht (E-19: „ein Befund statt
   Stille“). U5 gilt: Ein GAEB-Import darf daran nicht scheitern. Dieses Ticket liefert nur die erste Hälfte; den
   Befund am Befehl liefert das Folgeticket „Anpassung `kern` an v1.1a“.
   Der Vertrag v1 kennt für einen angenommenen Befehl noch keinen Ort für Befunde (kommt mit Ticket 24). Deshalb
   hier: eine reine, exportierte Prüffunktion im Kern (`Pruefbefund[]` für eine `OzMaske`), getestet, und im
   Ticket vermerkt, dass der Befehl sie ab der Anpassung an v1.1a mitliefert. Das Verhalten des Befehls bleibt.
4. **`gaeb`: MwSt-Standard.** X81/X83 tragen keinen MwSt-Satz. Liefert der Aufrufer keinen, setzt der Leser
   19,00 % und meldet das als Befund (Warnung, stabiler Code). Liefert der Aufrufer einen, bleibt es wie heute.
5. **Ticket 22, Kriterium BVBS (E-16).** Das Kriterium in Ticket 22 lautet schon „eigene Zählung, mit zweitem
   unabhängigen Zähler bestätigt“; die Zählung dort stammt aus einem einmaligen Skript. Hier wird daraus ein
   bleibender Test in `packages/gaeb`: ein zweiter, vom Leser unabhängiger Zähler (einfacher Durchlauf über das XML,
   nicht über das Modell) für die Prüfdatei Bauausführung X83: 12 Titel, 28 Positionen (27 `Item` + 1 `MarkupItem`),
   4 Hinweistexte. Danach das Kriterium in Ticket 22 abhaken. Stimmen die Zahlen nicht, wird das gemeldet und nichts
   angepasst.

## Acceptance criteria

- [ ] Kein Maskentext mit mehr als 14 Stellen mehr in `fixtures/` und in den Testhilfen von `kern`; ein Fixture-Test prüft die 14er-Regel
- [ ] `handbeispiele.json`: jeder Dezimalwert in kanonischer Stellenzahl; Test prüft das
- [ ] `gross.json` in Dokumentreihenfolge; `erzeugen.mjs` erzeugt sie byte-gleich; Sollwerte unverändert
- [ ] `tools/boundaries.test.mjs`: Testdatei darf `fixtures/` lesen, Produktivdatei nicht
- [ ] Kern: Prüffunktion für die Maske mit Tests (gültig, zu lang, Index ≠ 1 Zeichen)
- [ ] GAEB: Lesen ohne Satz ergibt 19,00 % und genau einen Befund; mit Satz keinen
- [ ] Zweiter Zähler bestätigt 12/28/4 (oder der Unterschied steht in den Comments)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `reuse lint` grün

## Nicht-Ziele

Änderungen an `vertrag`. Fixture `typisch` auf die Zuschlags-Semantik umstellen (kommt mit K6). Dateien freier
Projekte (E-15: entfällt).

## Comments

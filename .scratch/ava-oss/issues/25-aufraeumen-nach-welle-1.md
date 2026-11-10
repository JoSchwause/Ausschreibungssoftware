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
   „OZ höchstens 14 Zeichen einschließlich Index“ (F2); auf 14 Stellen korrigieren, überall wo er steht
   (Daten, README, Erzeuger). (b) `handbeispiele.json` auf die kanonische Stellenzahl bringen (N3: EP 3, Menge 3,
   Prozent 2, Betrag 2, alle Nullen). (c) `gross.json` in Dokumentreihenfolge schreiben (Eltern vor Kindern,
   Geschwister nach `reihenfolge`); der Erzeuger `erzeugen.mjs` erzeugt die Datei so, byte-stabil.
   Die Sollwerte (Summen) ändern sich dadurch nicht; ein Test belegt das.
2. **Paketgrenzen.** Testdateien eines Pakets dürfen `fixtures/` lesen (`tools/boundaries.mjs`); heute geht das nur
   über einen Umweg. Produktivcode darf es weiterhin nicht. Den Umweg in den Tests, die ihn nutzen, **nicht** in
   diesem Ticket entfernen, außer in `kern` und `gaeb`.
3. **`kern`: Maske beim Anlegen.** `LeistungsverzeichnisAnlegen` prüft die OZ-Maske nicht. Eine ungültige Maske
   (Regeln aus `ozregeln.ts`) darf nicht still durchgehen. U5 gilt: Ein GAEB-Import darf daran nicht scheitern.
   Der Vertrag v1 kennt für einen angenommenen Befehl noch keinen Ort für Befunde (kommt mit Ticket 24). Deshalb
   hier: eine reine, exportierte Prüffunktion im Kern (`Pruefbefund[]` für eine `OzMaske`), getestet, und im
   Ticket vermerkt, dass der Befehl sie ab der Anpassung an v1.1a mitliefert. Das Verhalten des Befehls bleibt.
4. **`gaeb`: MwSt-Standard.** X81/X83 tragen keinen MwSt-Satz. Liefert der Aufrufer keinen, setzt der Leser
   19,00 % und meldet das als Befund (Warnung, stabiler Code). Liefert der Aufrufer einen, bleibt es wie heute.
5. **Ticket 22, Kriterium BVBS (E-16).** Das Kriterium lautet neu „eigene Zählung, mit zweitem unabhängigen Zähler
   bestätigt“. Einen zweiten, vom Leser unabhängigen Zähler (einfacher Durchlauf über das XML im Test, nicht über
   das Modell) für die Prüfdatei Bauausführung X83 schreiben: 12 Titel, 28 Positionen, 4 Hinweistexte. Stimmen die
   Zahlen nicht, wird das gemeldet und nichts angepasst.

## Acceptance criteria

- [x] Kein Maskentext mit mehr als 14 Stellen mehr im Repo; ein Fixture-Test prüft die 14er-Regel
- [x] `handbeispiele.json`: jeder Dezimalwert in kanonischer Stellenzahl; Test prüft das
- [x] `gross.json` in Dokumentreihenfolge; `erzeugen.mjs` erzeugt sie byte-gleich; Sollwerte unverändert
- [x] `tools/boundaries.test.mjs`: Testdatei darf `fixtures/` lesen, Produktivdatei nicht
- [x] Kern: Prüffunktion für die Maske mit Tests (gültig, zu lang, Index ≠ 1 Zeichen)
- [x] GAEB: Lesen ohne Satz ergibt 19,00 % und genau einen Befund; mit Satz keinen
- [x] Zweiter Zähler bestätigt 12/28/4 (oder der Unterschied steht in den Comments)
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `reuse lint` grün

## Nicht-Ziele

Änderungen an `vertrag`. Fixture `typisch` auf die Zuschlags-Semantik umstellen (kommt mit K6). Dateien freier
Projekte (E-15: entfällt).

## Comments

### 2026-11-10 — Umsetzung (Basis `4396721`)

**Geliefert**

1. Fixtures (`fixtures/`): Maskentext je Datei auf höchstens 14 Stellen; `erzeugen.mjs` kennt die Texte als `MASKE_KLEIN` und
   `MASKE_GROSS`, README und Daten sind nachgezogen. `handbeispiele.json`: EP `10.000` und `4.560` (vorher `10.00`, `4.56`); die
   Zwischenwerte `exakt`, `exaktNachlass`, `exaktMwst` sind exakte Rechenschritte und keine N3-Größen, sie bleiben. `gross.json`:
   Dokumentreihenfolge; der Erzeuger sortiert am Ende von `baueLv` per Tiefensuche (Eltern vor Kindern, Geschwister in
   Arrayreihenfolge), IDs und Zufallsfolge bleiben, also ändern sich nur die Zeilenlage und die Schlüsselreihenfolge der Sollwerte
   (Gleichheit der Sollwerte und der Knotenmenge mit dem Stand vor dem Ticket per Skript geprüft). Tests in `fixtures.test.mjs`:
   14er-Regel, OZ passt zur Maske der Datei, kanonische Stellen der Handbeispiele, Dokumentreihenfolge samt eingefrorenen Summen
   (netto 147417712.57, brutto 172795671.79) und Neuberechnung der Einzelwerte.
2. Paketgrenzen (`tools/boundaries.mjs`): Die Paketregeln erfassen nur noch `packages` und `apps`; für Fixtures gilt allein
   `fixtures-nur-in-tests`. Als Testdatei zählen `*.test.*`, `*.spec.*`, `e2e/` und neu `testhilfen.*` / `testhilfe/`. Tests in
   `boundaries.test.mjs`: Testdatei darf, Produktivdatei nicht (genau ein Verstoß), `e2e`-Spec mit relativem Pfad, `testhilfen.ts`.
   Umweg entfernt in `kern` (`testhilfen.ts` importiert die JSON-Dateien statt `readFileSync`). In `gaeb` gibt es keinen Umweg über
   Fixture-JSON: Die Tests lesen nur amtliche XML-Dateien aus `fixtures/extern/` per `lesePfad`; die sind nicht importierbar, der
   Dateizugriff bleibt dort richtig. Andere Pakete (`speicher`, `ui-grid`, `vertrag`) nicht angefasst.
3. `kern`: `maskePruefen` in `ozregeln.ts`, exportiert als `ozMaskePruefen(maske): readonly Pruefbefund[]`. Eine Warnung
   (`quelle: 'lv-pruefung'`, Code `oz-maske-ungueltig`, `ort.feld: 'ozMaske'`, Meldung = Text aus `maskeFehler`), leer bei gültiger
   Maske. Regeln nur in `maskeFehler`. Tests: gültig, genau 14, 15 Stellen, Index mit 2 Zeichen, Gleichheit mit `ozMaskeFehler`,
   Befehl nimmt die ungültige Maske weiter an. **Der Befehl liefert die Befunde ab der Anpassung an v1.1a (Ticket 24) mit**; bis
   dahin ruft der Aufrufer die Funktion selbst auf.
4. `gaeb`: `LeseOptionen.standardMwstSatz` ist jetzt optional; `STANDARD_MWST_SATZ = '19.00'` ist exportiert. Ohne Satz: 19,00 %
   und genau ein Befund (`warnung`, `gaeb-lesen`, Code `mwst-standardsatz`, `ort.feld: 'mwstSatz'`). Mit Satz: dessen Wert und
   der bisherige Befund `mwst-ersatzwert` (Goldens unverändert).
5. Ticket 22: Kriterium nicht umformuliert (stand schon so), abgehakt; Kommentar zum zweiten Zähler ergänzt. Der Zähler
   (`packages/gaeb/src/zaehlung-bvbs.test.ts`, Durchlauf über die Start-Tags des Rohtexts) bestätigt **12 Titel, 28 Positionen
   (27 Item + 1 MarkupItem), 4 Hinweistexte**; der Leser liefert dieselben Zahlen. Kein Unterschied.

**Vorläufige Annahmen, Entscheidung offen**

- **Maskentext (Punkt 1a):** Gewählt ist die restriktive Lesart, die vorhandene OZ unverändert lässt. `winzig` und `typisch`:
  `NN.NN.NNNN[I]` (9 Stellen; zwei Titelebenen, eine genutzt, mit Index, weil `typisch` Indexpositionen hat). `gross`:
  `NN.NN.NN.NN.NN.NNNN` (14 Stellen, fünf Ebenen, ohne Index, weil `gross` keinen nutzt). Das entspricht den Masken, die die Kern-Tests
  schon verwenden. Alternative: eine einzige Maske `NN.NN.NN.NN.NN.NNN[I]` (5 × 2 + Position 3 + Index 1 = 14); dann müssten alle
  Positionsnummern dreistellig werden, die OZ in allen Fixtures ändern sich.
- **Schwere und Codes der neuen Befunde:** Warnung; `oz-maske-ungueltig` (nur der erste Maskenfehler je Maske), `mwst-standardsatz`.
- **Befund bei gelieferter MwSt (Punkt 4):** Das Ticket sagt „bleibt wie heute“ und im Kriterium „mit Satz keinen“. Umgesetzt: kein
  Befund `mwst-standardsatz`, der bisherige `mwst-ersatzwert` bleibt. Soll auch dieser entfallen, ist es eine Zeile in `lesen.ts`
  (und ein Test in `lesen.test.ts`, Zeile „setzt den Ersatz-MwSt-Satz und meldet das“).

**Lücken und Hinweise**

- Kern-Testhilfen: `standardMaske` in `testhilfen.ts` hatte 15 Stellen (fünf Stufen, Position 4, Index); jetzt 14 ohne Index
  (Alternative: Position dreistellig mit Index; vorläufige Annahme, Entscheidung offen). Kopfkommentar und Namen in
  `oz-fixtures.test.ts` nachgezogen; der Test, der eine 15-stellige Maske abweist, bleibt als Regelprobe. Ticket 06 (Comments,
  historisch) unverändert. `packages/vertrag` (`beispiele.ts` u. a.) bleibt unberührt; Ticket 24 korrigiert es, das Kriterium
  „kein Maskentext mit mehr als 14 Stellen“ gilt daher für `fixtures/` und `kern`.
- `packages/vertrag` unberührt; `fixtures-abbildung.test.ts` bleibt grün (726 Tests gesamt).
- Der Erzeuger-Test (a) prüft weiter Byte-Gleichheit aller fünf Dateien.

**Prüfungen:** `pnpm lint` grün; `pnpm typecheck` grün; `pnpm test`: vitest 35 Dateien, 726 bestanden, 1 übersprungen; node --test 14 bestanden;
`reuse lint` konform (398/398).

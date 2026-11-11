# 50: Kern nimmt den vollen Langtext (v1.1b) an

Status: resolved
Type: task
Welle: 3 (Phase B) · Strang: K · Paket: `packages/kern`
Blocked by: 41 (gemergt)
Regeln: F6, U5, Q5, A2, L1
Herkunft: Ticket 47 (Comments), D-15 (`entscheidungen-auto.md`)

## What to build

`LangtextAendern` und `HinweistextAendern` weisen heute alles außer Textläufen und Bildern auf der obersten Ebene mit
`ungueltige-eingabe` ab (`langtextFehler` in `packages/kern/src/feld-befehle.ts`). Damit lassen sich ein zweiter
Absatz, eine Liste, eine Tabelle, ein Zeilenumbruch oder eine Textergänzung aus dem Positionsdialog (Ticket 47) nicht
speichern. Der Kern soll den ganzen `Langtext` aus `packages/vertrag/src/modell.ts` (v1.1b) annehmen und nur die
**Form** prüfen, so wie es der Vertrag beschreibt und `speicher` (Ticket 31, strenges Lesen des Langtexts) es schon tut:
Absatz, Liste, Tabelle mit Zeilen und Zellen, Textlauf mit Auszeichnung, Zeilenumbruch, Bild, Textergänzung nur auf
der obersten Ebene. Inhalt (Längen, leere Zellen) prüft weiter K8 (`lvPruefen`), nie der Befehl (U5).

## Acceptance criteria

- [x] `LangtextAendern` und `HinweistextAendern` nehmen jeden formgültigen v1.1b-Langtext an (Beispiel `beispielLangtext` aus `vertrag` und die Langtexte, die der gaeb-Leser aus den amtlichen Dateien erzeugt)
- [x] Formfehler (z. B. Textergänzung in einer Tabellenzelle, falscher Bausteintyp) bleiben `ungueltige-eingabe` mit Feld
- [x] Property-Test: ein zufälliger formgültiger Langtext wird angenommen, umkehrbar, und `summen` bleibt gleich
- [x] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Oberfläche (Ticket 48 nimmt danach `test.fixme` in `apps/web/e2e/dialog.spec.ts` heraus), Werkzeug „Tabelle einfügen“ im Editor.

## Answer

- Gebaut: `kern` (`packages/kern/src/langtext.ts`, `feld-befehle.ts`): `LangtextAendern` und `HinweistextAendern` nehmen jeden formgültigen v1.1b-Langtext an (Form wie `speicher` liest); `langtextGleich` vergleicht den ganzen Baum; Property-Test.
- Merge: `558e9f3` (integration/welle-3).
- Offen: Nichts offen; Folgeidee: dieselbe Formprüfung als dauerhafter Test gegen die amtlichen Langtexte in `gaeb`.

## Comments

- Wie streng ist „nur die Form“? Genau wie `speicher` liest (Ticket 31): Arten je Ebene, keine fehlenden oder fremden Felder, Auszeichnung nur `true`, `spalten` ganzzahlig ab 1. Grund: Was der Kern annimmt, muss `speicher` zurücklesen können; ein `fett: false` würde sonst die Projektdatei unlesbar machen. Inhalt (leere Absätze, Zellen, Listen, Texte) bleibt K8 (U5).
- `langtextGleich` vergleicht jetzt den ganzen Baum samt Auszeichnung (vorher galten `a` und fettes `a` als gleich, ein Absatz nie als gleich). Grund: „derselbe Wert → leeres ChangeSet“ muss für jeden v1.1b-Langtext stimmen. Formprüfung und Gleichheit liegen in `packages/kern/src/langtext.ts`.
- `beispielLangtext` steht nicht im Paketindex von `vertrag`; der Test importiert `../../vertrag/src/beispiele` (A3 erlaubt kern den Ordner). Die amtlichen Langtexte kann kern nicht selbst lesen (A3, kein Import von `gaeb`): im Test steht ein Langtext in deren Form; einmalig gegengeprüft (nicht versioniert): alle 255 Langtexte aus 16 Dateien unter `fixtures/extern` nimmt die Formprüfung an. Folgeidee für `gaeb`: dieselbe Prüfung als dauerhafter Test dort.
- Suite: `pnpm lint && pnpm typecheck && pnpm test` grün; 97 Testdateien bestanden (1 übersprungen), 1581 Tests bestanden, 2 übersprungen.

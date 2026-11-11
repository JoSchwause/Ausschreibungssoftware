# 50: Kern nimmt den vollen Langtext (v1.1b) an

Status: ready-for-agent
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

- [ ] `LangtextAendern` und `HinweistextAendern` nehmen jeden formgültigen v1.1b-Langtext an (Beispiel `beispielLangtext` aus `vertrag` und die Langtexte, die der gaeb-Leser aus den amtlichen Dateien erzeugt)
- [ ] Formfehler (z. B. Textergänzung in einer Tabellenzelle, falscher Bausteintyp) bleiben `ungueltige-eingabe` mit Feld
- [ ] Property-Test: ein zufälliger formgültiger Langtext wird angenommen, umkehrbar, und `summen` bleibt gleich
- [ ] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Oberfläche (Ticket 48 nimmt danach `test.fixme` in `apps/web/e2e/dialog.spec.ts` heraus), Werkzeug „Tabelle einfügen“ im Editor.

## Comments

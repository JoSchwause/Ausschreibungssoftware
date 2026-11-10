# 34: Langtext-Editor (TipTap, eingeschränktes Schema, verlustfreie Abbildung `Langtext` ↔ TipTap)

Status: claimed
Type: task
Welle: 3 (Phase A) · Strang: U4a · Paket: `packages/ui-basis` (dazu eine Zeile in `tools/boundaries.mjs`)
Blocked by: -
Regeln: A3, A5, F6, U1, U3, U4, U5, U8, L1, C1, C5, Q1, ADR 0004, ADR 0008
Herkunft: F6, E-10 (`next-decisions.md`), G-32 (`grilling.md`); Ticket 26, Comments Punkt 5 „Abbildung auf TipTap/ProseMirror“ und Offene Typfragen 1 und 10; Strang U4 (`plan.md` §2)

## What to build

Ein Editor für `Langtext` (Typen in `packages/vertrag/src/modell.ts`), gebaut auf TipTap/ProseMirror mit einem
**eingeschränkten Schema**, das genau die GAEB-abbildbare Teilmenge kennt (F6, G-32), und eine reine, getestete
Abbildung `Langtext` → Editor-Dokument → `Langtext`. Der Positionsdialog (Ticket 47) bindet ihn ein.

1. **Schema (Erlaubnisliste, ADR 0004).** Nur einzelne TipTap-Erweiterungen, kein StarterKit mit Abschalten:
   Dokument, Absatz, Text, fett, kursiv, unterstrichen, harter Zeilenumbruch, Aufzählung, nummerierte Liste,
   Listenpunkt, Tabelle, Tabellenzeile, Tabellenzelle (nur `colspan`; `rowspan` fest 1, keine Kopfzellen, keine
   Spaltenbreiten), Bild, dazu ein eigener Knoten **Textergänzung** (Block, Atom, nur auf oberster Ebene) und am
   Absatz ein eigenes Attribut `lose` (siehe 2). Nichts sonst: keine Überschriften, Zitate, Code, Links, Farben,
   Durchstreichen, Ausrichtung. Die nummerierte Liste hat keinen editierbaren Startwert (der Vertrag kennt nur
   `geordnet`). Eingefügtes HTML wird nach diesem Schema gelesen; was es nicht kennt, fällt weg; eingefügte Bilder
   fallen weg (sie hätten keine `BildId`, A2).
2. **Abbildung** (reine Funktionen, eigene Datei, ohne DOM): `langtextZuDokument(l: Langtext)` liefert das
   JSON-Dokument des Editors, `dokumentZuLangtext(d)` den `Langtext`. Je Baustein (Ticket 26, Punkt 5):
   - `text` mit Auszeichnung ↔ Textknoten mit den Marken fett/kursiv/unterstrichen; `umbruch` ↔ harter Umbruch;
     `absatz` ↔ Absatz mit `lose: false`; `liste` ↔ Aufzählung bzw. nummerierte Liste, jeder Punkt ein Listenpunkt mit
     Blöcken; `tabelle` ↔ Tabelle/Zeile/Zelle mit `colspan` = `spalten`; `bild` ↔ Bildknoten (inline, weil der Vertrag
     das Bild als Inline-Baustein im Absatz führt) mit den Attributen `id`, `medientyp`, `daten` (Anzeige als
     `data:`-URL in einem `img`, nie als HTML eingefügt).
   - **Lose Inline-Bausteine** (Textläufe, Umbrüche, Bilder direkt auf einer Ebene, ohne Absatz; Offene Typfrage 1):
     jede maximale Folge wird ein Absatz mit `lose: true`; zurück wird sein Inhalt wieder lose eingefügt. Ein leerer
     Listenpunkt oder eine leere Zelle (`[]`) ist ein leerer loser Absatz; ein leerer Langtext ist ein Dokument mit
     einem leeren losen Absatz und wird wieder `[]`.
   - **Textergänzung** ↔ Atomknoten, dessen Attribute `herkunft`, `kennung`, `leer`, `davor`, `inhalt`, `danach`
     unverändert als Daten tragen (nichts geht verloren, alles sind reine Daten).
   - **Kanonische Form (vorläufige Annahme, Entscheidung offen):** ProseMirror verschmilzt benachbarte Textknoten mit
     gleichen Marken und kennt keine leeren Textknoten. Deshalb gibt es `langtextKanonisch(l)`: benachbarte Textläufe
     mit gleicher Auszeichnung zusammenziehen, leere Textläufe streichen. Sonst nichts. Der Rundweg ist exakt
     `langtextKanonisch(l)`; für eine schon kanonische Eingabe ist er die Identität. Ein `\n` im Text (Altwerte)
     bleibt im Text stehen.
   - **Aus dem Editor neu entstandene Absätze:** Folgt ein loser Absatz direkt auf einen anderen losen (das entsteht
     nur durch Bearbeiten, z. B. Enter), wird er beim Zurückabbilden ein `absatz`. Ein Rundweg ohne Bearbeitung
     erzeugt nie zwei lose Absätze nacheinander.
3. **Komponente** `LangtextEditor` (React, Export über `src/index.ts`):
   `{ wert: Langtext; onBestaetigen(l: Langtext): void; beschriftung: string; nurLesen?: boolean }`. Der Editor
   arbeitet auf einer Kopie und meldet **einmal** beim Bestätigen (Fokus verlassen oder Strg+Enter), damit nicht jeder
   Tastendruck ein Befehl wird (A5, U7); Esc verwirft. Meldet nichts, wenn `langtextKanonisch(wert)` und das Ergebnis
   gleich sind. Werkzeugleiste aus den vorhandenen Bausteinen (`Button`, `Tooltip`, `Icon`, Tokens; U4) für fett,
   kursiv, unterstrichen, Aufzählung, nummerierte Liste; Tastenkürzel Strg+B/I/U, Umschalt+Enter für den Umbruch,
   Tab/Umschalt+Tab in Tabellen (U3). Textergänzungen und Bilder werden angezeigt, bleiben erhalten und lassen sich
   als Ganzes löschen, aber in diesem Ticket nicht neu anlegen oder bearbeiten. In Tabellen lässt sich Text bearbeiten;
   Zeilen und Spalten anlegen oder löschen ist nicht Teil des Tickets. Alle Texte deutsch in `texte.ts` (L1, U8).
4. **Paketgrenze.** `ui-basis` darf heute nichts importieren (`tools/boundaries.mjs`, `ERLAUBT`). Der Editor braucht
   die Typen aus `vertrag`: `'packages/ui-basis': ['packages/vertrag']` eintragen (A3: `vertrag` ist unten, kein Zyklus)
   und `@tethys/vertrag` als Abhängigkeit in `package.json`. Der Kopfkommentar von `src/index.ts` („Bausteine ohne
   Fachwissen“) wird ergänzt: der Langtext-Editor liegt unter `src/langtext/` und kennt nur die Typen des Vertrags.
   Falls `tools/boundaries.test.mjs` die Tabelle festschreibt, dort mitziehen.

## Grenzen

- **Lizenz (C5, ADR 0008).** Nur Pakete aus dem MIT-lizenzierten TipTap-Kern und ProseMirror (`@tiptap/core`,
  `@tiptap/pm`, `@tiptap/react` und die einzelnen Erweiterungen); kein `@tiptap-pro`, keine Cloud-Dienste, keine
  kostenpflichtigen Erweiterungen (Präzedenz ADR 0004). Feste Versionen. Die Lizenzprüfung läuft in `pnpm lint`
  (`tools/check-licenses.mjs`) und muss grün sein. Für Komponententests ist eine DOM-Umgebung als Dev-Abhängigkeit
  erlaubt (z. B. `happy-dom`, MIT), nur per Datei-Kommentar aktiviert, nicht global.
- Kein Rechnen, kein Speichern, keine Befehle: der Editor liefert einen `Langtext`, den Befehl baut der Aufrufer (A5).
- Nicht an `vertrag` ändern. Fehlt dem Typ etwas für eine verlustfreie Abbildung: Comments, nicht raten.
- **Größer als 4 h, wenn alles kommt.** Zuerst abgeben: Tabellen in der Komponente (die Abbildung behält sie), dann
  die Werkzeugleiste (Tastenkürzel reichen). Schema, Abbildung und Rundweg-Test bleiben immer drin.
- `okf/research/` wird nicht gelesen (C3). Offene Punkte entscheidet der Umsetzer und protokolliert sie in
  `.scratch/ava-oss/entscheidungen-auto.md` (Demo-Modus).
- TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün.

## Acceptance criteria

- [ ] Property-Test (fast-check, mindestens 500 Läufe, Tiefe bis 4): für jeden erzeugten gültigen `Langtext` `l` gilt `dokumentZuLangtext(langtextZuDokument(l))` tief gleich `langtextKanonisch(l)`; für kanonisches `l` gleich `l`. Der Erzeuger deckt alle Bausteine ab, auch leere Listenpunkte, leere Zellen, `spalten > 1`, Textergänzung zwischen losen Läufen, Bild auf oberster Ebene und in einer Zelle
- [ ] Property-Test: Das erzeugte Dokument ist im Schema gültig (Knoten aus dem JSON bauen und mit der Schemaprüfung von ProseMirror prüfen, ohne DOM)
- [ ] Property-Test: `langtextKanonisch` ist idempotent und ändert keinen sichtbaren Text (Klartext vorher = nachher)
- [ ] Test: Eine Textergänzung kommt mit allen sechs Feldern unverändert zurück; eine Textergänzung in einer Zelle ist im Schema nicht darstellbar
- [ ] Test: Zwei lose Absätze nacheinander (wie nach Enter) ergeben zurück einen losen Lauf und einen `absatz`
- [ ] Komponententest: Strg+B auf markiertem Text und Bestätigen liefern genau einmal den erwarteten `Langtext`; Esc liefert nichts; ohne Änderung kommt nichts
- [ ] `tools/boundaries.mjs` erlaubt `ui-basis` → `vertrag`; `pnpm lint` (Paketgrenzen, Lizenzen) grün
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

Positionsdialog und Einbindung in die App (Ticket 47). Neue Textergänzungen und Bilder anlegen (später, braucht eine
`IdQuelle` und Regeln für Kennungen). Tabellenstruktur bearbeiten. GAEB-Abbildung (Ticket 32 liest, Ticket 40 schreibt).
Bieter füllt Textergänzungen aus (X84, später).

## Comments

# 93: `ui-grid`: editierbare Spalte für die Kostengruppe im LV-Grid

Status: resolved
Type: task
Welle: 6 · Strang: U, C2 · Paket: `packages/ui-grid`, danach `apps/web/src/kosten/` und die Einhängestellen in
`apps/web/src/lv/LvSeite.tsx`, `apps/web/src/auftrag/AuftragsLvSeite.tsx` (markiert `// Ticket 93`, D-20)
Blocked by: 95 (`LvSpalte` `'kostengruppe'`), 96 (gleiches Paket, ein Schreiber)
Modell: opus
Regeln: U2, U3, U5, Q4, D-89.1, D-47
Herkunft: Wellen-Review 5, P1 (Ticket 89 verlangte eine Spalte „KG“; umgesetzt als Dialog mit Mehrfachauswahl, D-89.1)

## What to build

Eine Spalte „KG“ im LV-Grid und im Auftrags-LV, direkt editierbar wie Menge/EP (Tastatur zuerst, U3), formwidrige Eingabe als
Zellfehler (die Marke `Kostengruppennummer` lässt sie nicht in den Befehl), Einfügen aus Excel setzt mehrere KG in einem
Undo-Schritt. Leistungsbudgets des Grids bleiben grün (Q4). Der Dialog aus 89 bleibt für die Mehrfachauswahl.

1. **`ui-grid`.** `LvSpalte` kennt seit v1.5 `'kostengruppe'` (Ticket 95). Das `LvGrid` zeichnet die Spalte (nur an Positionen
   bearbeitbar; an Gliederung und Hinweistext leer), bearbeitet sie wie Menge und EP (Enter/F2 startet, Escape bricht ab,
   Tab/Enter übernimmt) und sendet `KostengruppeSetzen` (leere Eingabe = `null`). Die Prüfung der Form gehört nicht dem
   Grid: Die App reicht eine Lesefunktion herein (eigene Eigenschaft des `LvGrid`, z. B. `kostengruppeLesen(text) →
   Ergebnis<Kostengruppennummer, string>`; die App nutzt `kgLesen` aus `kosten`); ein Fehler steht als Zellfehler an der
   Zelle wie bei einer unlesbaren Menge. Einfügen aus der Zwischenablage (TSV) setzt die Spalte mit, je Zeile ein Befehl;
   ein Fehler in einer Zeile verwirft nur diese Zelle (mit Hinweis). Befunde mit `ort.feld` `'kostengruppe'` erscheinen an
   der Zelle (U5). Die Spalte ist nicht in den Standardspalten, außer die App nennt sie.
2. **E2E im Prüfstand des Pakets**: Eingabe, Zellfehler, Escape, Einfügen von drei Zeilen, Tastaturnavigation über die
   Spalte; `e2e/leistung.spec.ts` des Pakets bleibt im Budget mit der zusätzlichen Spalte.
3. **App.** LV-Seite und Auftrags-LV-Seite zeigen die Spalte „KG“ (nach der Einheit oder am Ende, Begründung im Ticket), mit
   `kgLesen`; mehrere `KostengruppeSetzen` aus einem Einfügen sind **ein** Undo-Schritt (wie das Einfügen anderer Werte,
   `Sitzung.folge`); im Auftrags-LV gehen die Befehle als AuftragsLvBefehl. Der Dialog aus Ticket 89 bleibt (Mehrfachauswahl).
   `apps/web/e2e/kosten.spec.ts` um die Spalte ergänzen; `apps/web/e2e/leistung.spec.ts` bleibt grün.

## Grenzen

- Kein `vertrag` (die Spalte gibt es seit v1.5). In `ui-grid` nur das `LvGrid` und seine Hilfen; das Vergleichsgrid gehört Ticket
  96 (gemergt). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Spalte in `ui-grid` getestet (Unit + E2E des Pakets); App stellt um; `leistung.spec.ts` (Paket und App) grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün, dazu
      `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/ui-grid e2e` und die genannten App-E2E

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-93.0** Welche Nähte werden getestet (Demo-Modus, keine Rückfrage)? **`ui-grid`: die reinen Funktionen
  `befehlAusEingabe`, `planeEinfuegen` und `planeKostengruppen` (Vitest, `eingabe.test.ts`) und das `LvGrid` über den Prüfstand
  des Pakets (Playwright `e2e/kostengruppe.spec.ts`, Zählung und Messung in `e2e/leistung.spec.ts`). App: `kgZelleLesen`
  (`kosten/kostengruppe.test.ts`), `sprungZu` (`lv/pruefung.test.ts`) und der Ablauf in `e2e/kosten.spec.ts`.** Grund: wie
  D-95.0; was das Grid tut, ist nur an DOM und Ereignissen zu beobachten. Die E2E wurden per Mutation geprüft (Füllen der
  Spalte aus, `aria-readonly` wie vorher: 3 von 9 rot). Reversible: yes.
- **D-93.1** Wie kommt die Spalte in das Grid, und wie in das schreibgeschützte Auftrags-LV? **`LvGridProps.kostengruppeLesen?:
  KostengruppeLesen` (`(text) => Ergebnis<Kostengruppennummer, string>`, aus `ui-grid` exportiert): Mit ihr ist die Spalte an
  Positionen bearbeitbar, ohne sie zeigt sie nur an; leeren Text liest das Grid selbst als `null`. Das schreibgeschützte Grid
  bekommt genau eine Ausnahme, `onKostengruppen?: (befehle: readonly KostengruppeSetzen[]) => void`: Mit Lesefunktion und
  dieser Eigenschaft lässt sich nur die Spalte „KG“ ändern (Eingabe, Entf, Einfügen einer Spalte), jede Aktion als eine Folge;
  alles andere bleibt schreibgeschützt.** Grund: Das Auftrags-LV kennt nur `KostengruppeSetzen` als Feldbefehl; ein ganz
  bearbeitbares Grid hätte dort Eingaben, Strg+Plus, Löschen und das Anlegen von Zeilen angeboten, die der Kern abweist. Eine
  allgemeine Liste „bearbeitbare Spalten“ wäre breiter als nötig. Alternative: eine solche Liste. Reversible: yes.
- **D-93.2** Was tut Einfügen in der Spalte „KG“? **Eine Spalte (mehr als eine Zeile, jede Zeile eine Zelle) bei aktiver
  Spalte „KG“ setzt die Kostengruppen der sichtbaren Zeilen ab der aktiven, Zeile für Zeile wie Excel; es entsteht keine
  Position (`planeKostengruppen`). Je geänderter Position ein `KostengruppeSetzen` (leer: `null`), alle als eine Folge; eine
  gleiche Nummer ist kein Befehl; eine formwidrige verwirft nur ihre Zelle (markiert, Ansage). Eine Nummer auf einer
  Gliederung, einem Hinweistext oder hinter der letzten Zeile wird übersprungen und gezählt, eine leere Zelle dort nicht. Eine
  einzelne Zelle wirkt wie eine Eingabe. Ein Block mit mehreren Spalten legt wie bisher neue Positionen an (E-18) und bringt
  die Kostengruppe in `Positionsdaten.kostengruppe` mit (`planeEinfuegen`, formwidrig: Position ohne KG, Zelle markiert).**
  Grund: Das Ticket verlangt mehrere `KostengruppeSetzen` aus einem Einfügen, und am Auftrags-LV lassen sich keine Positionen
  anlegen; E-18 bleibt für alle anderen Blöcke. Eine mit Strg+C kopierte Spalte (Gliederungen leer) passt so wieder auf
  dieselben Zeilen. Reversible: yes.
- **D-93.3** Wo steht die Spalte? **Am Ende, nach dem Gesamtpreis (`SPALTEN_MIT_KG = [...STANDARDSPALTEN, 'kostengruppe']`
  in `kosten/kgSpalte.ts`, `STANDARDSPALTEN` jetzt aus `ui-grid` exportiert).** Grund: Menge, Einheit, EP und GP bleiben als
  Rechenkette beieinander; ein Excel-Block ab Kurztext (Kurztext, Menge, Einheit, EP) landet wie bisher, während die Spalte
  nach der Einheit seine EP-Zelle in die KG schöbe; Strg+C liefert die KG als letzte Spalte, ein eigener Block passt also
  weiter ab der ersten Spalte. Breite 72 px aus v1.5, zusammen 1.056 px; im schmalen Fenster scrollt das Grid die Zelle per
  Tastatur in den Blick (D-96.8, E2E bei 820 px). Reversible: yes.
- **D-93.4** Hinweis beim Tippen? **Ja, wie bei Menge und EP: Das Eingabefeld der Spalte „KG“ markiert eine formwidrige
  Nummer schon beim Tippen (`aria-invalid`, `title`) über dieselbe Lesefunktion, ohne zu sperren (U5); `inputMode="numeric"`.**
  Die Funktion reicht das Grid stabil an die memoisierten Zeilen weiter (Verweis auf die aktuelle Lesefunktion). Reversible: yes.
- **D-93.5** Ansage im schreibgeschützten Grid mit Ausnahme? **„Schreibgeschützt: Nur die Spalte KG lässt sich ändern.“ als
  Beschreibung des Grids und als Ansage bei jedem anderen Änderungsversuch; das Grid behält `aria-readonly="true"`, die
  KG-Zellen der Positionen heben es für sich mit `aria-readonly="false"` auf (ARIA erlaubt der Zelle, den Wert des Grids zu
  überschreiben).** Grund: Das Auftrags-LV ist als Ganzes weiter schreibgeschützt (Ticket 54/64; `m3.spec.ts` und
  `nachtrag.spec.ts` prüfen das am Grid), nur die eine Spalte nicht. Eine erste Fassung ließ `aria-readonly` am Grid weg; die
  beiden App-E2E fielen darauf, deshalb die Überschreibung je Zelle. Reversible: yes.
- **D-93.6** Sprung aus dem Prüf-Panel? **`GRID_SPALTEN` in `apps/web/src/lv/pruefung.ts` um `'kostengruppe'` ergänzt (eine
  markierte Zeile, Folgearbeit aus Ticket 95), Test in `lv/pruefung.test.ts`: Ein Befund mit `ort.feld: 'kostengruppe'`
  springt an die Zelle statt in den Positionsdialog.** Das Grid zeigt solche Befunde an der Zelle (E2E im Prüfstand). Reversible: yes.
- **D-93.7** Hinweis „KG außerhalb der Gliederung“ (D-89.4) auch an der Zelle? **Nein, in diesem Ticket nicht.** Der Hinweis
  bleibt im Dialog, die Kostenkontrolle zeigt ihre Befunde; `lvPruefen` kennt keine Kostenermittlungen, und die LV-Seite lädt
  sie nicht. Die Anzeige an der Zelle steht bereit; ein Folgeticket kann die Kostenermittlungen laden und den Befund in
  `LvZeile.befunde` reichen. Reversible: yes.
- **D-93.8** Sitzung am Auftrags-LV? **`useKostengruppenAmAuftrag` (in `KostengruppenAmAuftrag.tsx`) hält eine Sitzung je
  geladenem Stand statt einer neuen je Aktion (Ticket 89); Dialog und Spalte nutzen denselben Weg, danach lädt die Seite neu.**
  Grund: Zelleingaben kommen rasch nacheinander; jede soll auf dem Stand nach der vorigen laufen, auch bevor neu geladen ist.
  Reversible: yes.
- **D-93.9** Leistungsmessung des Pakets? **Die beiden LV-Fälle (5.000 und 10.000 Zeilen) laufen jetzt mit der Spalte (`kg=1`,
  die Positionen der Reihe nach 310, 320, keine); neu die Zählung „je KG-Zelle nur Zelle und Text“.** Keine Schranke geändert,
  kein Test übersprungen. Reversible: yes.
- **D-93.10** Glossar? **Kein neuer Eintrag.** „Spalte KG“ steht seit v1.5 unter „Kostengruppe“; `KostengruppeLesen` ist ein
  technischer Typ der Oberfläche wie `GridZahlen`. Reversible: yes.

### Umsetzung (Branch `welle-6/93-kg-spalte`)

- **`ui-grid`:** `eingabe.ts` (Spalte bearbeitbar an Positionen, `befehlAusEingabe` → `KostengruppeSetzen` über die
  Lesefunktion, `leseKostengruppe`), `einfuegen.ts` (`planeEinfuegen` bringt die KG mit, neu `planeKostengruppen`), `LvGrid.tsx`
  (bearbeitbare Spalten je Grid, Ausnahme im schreibgeschützten Grid, Einfügen einer Spalte, Markierung mit Basis der Zeile),
  `Zeile.tsx`/`Editor.tsx` (Bearbeitbarkeit je Spalte, `aria-readonly="false"` an der KG-Zelle im schreibgeschützten Grid,
  Hinweis beim Tippen), `typen.ts` (`kostengruppeLesen`, `onKostengruppen`, `KostengruppeLesen`), `texte.ts`
  (`gridNurKostengruppe`, `meldungKostengruppen`), `index.ts` (`STANDARDSPALTEN`, `KostengruppeLesen`). Die drei Marker aus
  Ticket 95 sind ersetzt. Prüfstand: Parameter `kg=1`, `KostengruppeSetzen` in `befehle-anwenden.ts`, Attrappe
  `kostengruppeAttrappe`.
- **App:** `kosten/kgSpalte.ts` (neu: `SPALTEN_MIT_KG`, `kgSpalteImLv`, `useKgSpalteAmAuftrag`), `kosten/kostengruppe.ts`
  (`kgZelleLesen`), `kosten/KostengruppenAmAuftrag.tsx` (`useKostengruppenAmAuftrag`, D-93.8); Einhängestellen `// Ticket 93`
  in `lv/LvSeite.tsx` (Import, eine Zeile am Grid), `auftrag/AuftragsLvSeite.tsx` (Import, Hook, eine Zeile am Grid) und
  `lv/pruefung.ts` (`GRID_SPALTEN`, D-93.6). Der Dialog aus Ticket 89 bleibt.
- **Tests:** `ui-grid/src/eingabe.test.ts` (+10: Eingabe, Einfügen neuer Positionen, Füllen einer Spalte),
  `ui-grid/e2e/kostengruppe.spec.ts` (9: Anzeige und Lage, Enter/F2/Tab/Entf/Tippen, Zellfehler und Escape, Einfügen einer
  Spalte als Folge, Excel-Zeilen mit KG, Tastatur und waagerechtes Scrollen bei 820 px, Prüfhinweis an der Zelle,
  schreibgeschütztes Grid mit Ausnahme: Ansage und Folgen), `ui-grid/e2e/leistung.spec.ts` (Zählung je KG-Zelle, LV-Fälle mit
  Spalte), `apps/web/src/kosten/kostengruppe.test.ts` (+2), `apps/web/src/lv/pruefung.test.ts` (+1), `apps/web/e2e/kosten.spec.ts`
  (LV: Zellfehler, Eingabe = ein Undo-Schritt, drei KG aus einer Spalte = ein Undo-Schritt; Auftrags-LV: Menge bleibt
  schreibgeschützt mit Ansage, Eingabe und Einfügen als AuftragsLvBefehl, Rückgängig je Aktion; alles zurückgenommen, damit
  die Zahlen der Kostenkontrolle gelten).

### Ergebnis (nach `git merge integration/welle-6`, Stand `45216f3`)

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test`: grün (Lint samt Paketgrenzen, Lizenzen,
  Clean Room; Vitest 235 Dateien bestanden, 1 übersprungen, 3.048 Tests bestanden, 3 übersprungen; Fixture-Tests 42/42).
- `CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/ui-grid e2e`: 87 bestanden (davor, ohne den Merge,
  ebenso 87).
- App-E2E (`CI=1`, eigener Port): `kosten.spec.ts`, `leistung.spec.ts`, dazu `m3`, `nachtrag`, `lv`, `undo`: 15 bestanden. Ein
  Lauf davor hatte `m3` und `nachtrag` rot (sie prüfen `aria-readonly` am Grid des Auftrags-LV); behoben mit D-93.5, nicht
  an den Tests.
- Leistung `ui-grid` (Headless-Chromium ohne GPU, 4 Kerne, bis zu 8 Agenten), Mittel bei 5.600 / 28.000 px/s: ohne Spalte
  (vorher, gleicher Code ohne `kg=1`) 5.000 Zeilen 55 / 56,2 fps, 10.000 Zeilen 58,2 / 54,2 fps; mit Spalte im Lauf nach dem
  Merge 60 / 59,2 fps und 60 / 59,4 fps (0 Bilder > 33 ms). Ein Lauf unter Last davor hatte 56 / 42,5 fps mit einem
  Einzelbild von 1.067 ms und lief grün; die Schwankung kommt von der geteilten Maschine. Keine Schranke geändert.
- Leistung App: Mengenänderung bei 5.000 Positionen Median 31 ms (dauerhaftes Profil), Undo 31 ms, flüchtiger Kontext 66 ms;
  alles unter 100 ms.

Offen: der Hinweis „KG außerhalb der Gliederung“ an der Zelle (D-93.7, möglicher Folgeauftrag); sonst nichts.

## Answer

Gemergt in `integration/welle-6` mit `a56592d` (Branch `welle-6/93-kg-spalte`, `9d970a7`). Spalte „KG“ im `LvGrid` bearbeitbar wie
Menge/EP (Lesefunktion der App, Zellfehler, Einfügen einer Spalte setzt die KG der Zeilen als eine Folge), im Auftrags-LV als
einzige bearbeitbare Spalte; App stellt um, Dialog aus 89 bleibt. ui-grid-E2E 87/87, App-E2E 15/15; Integrationssuite danach ganz
grün (3.169 Tests). Folgepunkt D-93.7: Befund „KG außerhalb der Gliederung“ auch an der Zelle.

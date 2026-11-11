# 54: `ui-grid` und `ui-basis`: Lücken aus Welle 3

Status: claimed
Type: task
Welle: 4 · Strang: U · Paket: `packages/ui-grid`, `packages/ui-basis` (zwei Schreiber nacheinander, je Paket ein Pull Request; die Anbindung in `apps/web` folgt als eigenes Ticket)
Blocked by: –
Regeln: A3, A5, N1, U3, U5, F6, Q4
Herkunft: Comments der Tickets 39, 46, 47 und 48

## What to build

Die App-Tickets der Welle 3 haben Lücken in den UI-Paketen gemeldet und mit Umwegen überbrückt. Dieses Ticket schließt sie
in den Paketen (die App-Umwege werden danach in einem Folgeticket zurückgebaut):

`ui-grid`:

1. **Aktive Zeile melden** (Tickets 39, 47). Heute nur `onAuswahlChange` (letzte gemeldete Zeile); nur Fokus per Tab ins
   Grid meldet keine Auswahl. Neuer Rückruf für die aktive Zeile.
2. **Zeile öffnen** (Ticket 47). Doppelklick auf eine bearbeitbare Zelle startet immer das Bearbeiten; ein Rückruf „Zeile
   öffnen“ (für den Positionsdialog) fehlt.
3. **Schreibgeschützter Modus** (Ticket 48). Das Grid eines LV-Stands zeigt den Zelleditor noch; die Meldung „Stand ist
   schreibgeschützt“ kommt erst beim Übernehmen. Nur-Lese-Eigenschaft: kein Editor, keine Zeilenaktionen, Tastatur und
   Auswahl bleiben.
4. **Exakte Anzahl im Löschdialog** (Tickets 46, 48). Die Rückfrage zählt sichtbare Zeilen („mindestens“ bei zugeklappten
   Knoten); die App liefert die genaue Zahl über eine optionale Eigenschaft.

`ui-basis`:

5. **Werkzeug „Tabelle einfügen“** im Langtext-Editor (Tickets 34, 47). Tabellen kommen heute nur über die Zwischenablage;
   Zeilen- und Spaltenzahl, Auszeichnung wie im Schema (`colspan` bleibt Lesen/Schreiben aus Ticket 34).
6. **Dialog-Anfangsfokus** (Ticket 46). `Dialog` lässt keinen Startfokus wählen (Radix fokussiert das Schließen-Kreuz);
   Eigenschaft für das Anfangsfokus-Element, damit Enter-Bestätigung ohne Tastenhandler-Umweg geht.

## Grenzen

- `ui-grid` rechnet nie (A5, N1); `ui-basis` kennt kein Fachmodell. Keine neue Abhängigkeit zwischen den beiden Paketen.
- Bestehende Tastenbelegung und E2E bleiben grün; jede Änderung der Belegung steht in den Comments.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Je Punkt 1 bis 6 ein Test (Vitest oder Playwright über die Testseite) und eine kurze Beschreibung der Eigenschaft in den Comments
- [ ] Schreibgeschützt: kein Editor, kein Rückruf für Änderungen, Fokus und Navigation funktionieren, Screenreader-Ansage
- [ ] Löschdialog nennt die übergebene Zahl, ohne Eigenschaft wie bisher
- [ ] Tabelle einfügen: Ergebnis ist ein formgültiger v1.1b-Langtext, Rundweg `Langtext` ↔ TipTap bleibt gleich
- [ ] `pnpm lint && pnpm typecheck && pnpm test` und die E2E beider Pakete grün

## Nicht-Ziele

Rückbau der Umwege in `apps/web` (Folgeticket), neue Grid-Funktionen über die genannten hinaus.

## Comments

### ui-grid (Punkte 1–4)

Nur `packages/ui-grid`. Eigenschaften (Typen in `src/typen.ts`, Kurzbeschreibung im README):

- **Punkt 1 `onAktiveZeileChange(knotenId | null)`**: die Zeile der aktiven Zelle, gemeldet nach dem Rendern, sobald sie
  sich ändert. Test: `e2e/aktive-zeile-und-oeffnen.spec.ts` (Laden, Tab ins Grid, Pfeil, Klick, gelöschte Zeile, leeres LV).
- **Punkt 2 `onZeileOeffnen(knotenId, spalte)`**: Strg+Enter auf einer Zelle; Doppelklick auf eine Zelle, die sich nicht
  bearbeiten lässt. Test: dieselbe Datei (mit und ohne Eigenschaft).
- **Punkt 3 `schreibgeschuetzt: true`**: `LvGridProps` ist jetzt eine Vereinigung `LvGridBearbeitbar | LvGridSchreibgeschuetzt`
  (beide exportiert); im schreibgeschützten Fall sind `ids`, `onBefehl`, `onBefehlsfolge`, `onKopieEinfuegen`,
  `vorPositionAnlegen` und `positionenZaehlen` als `never` verboten. Bestehende Aufrufer bleiben gültig. Test:
  `e2e/schreibgeschuetzt.spec.ts`.
- **Punkt 4 `positionenZaehlen(knotenIds)`**: genaue Zahl der Positionen samt zugeklappter Unterknoten; die Rückfrage
  nennt sie ohne „mindestens“. Tests: `src/zeilenaktionen.test.ts` (`loeschUmfang`), `e2e/zeilenaktionen.spec.ts`
  (zugeklappter Titel mit und ohne Eigenschaft). Testseite: Parameter `nurlesen`, `oeffnen`, `zaehlen`; die
  Meldungen der aktiven Zeile stehen immer in `window.__harness.aktiveZeilen`.

Entscheidungen (Frage → Entscheidung → Grund):

- **D-54.1** Was ist „aktive Zeile“ vor dem ersten Klick? → Die Zeile, die das Grid selbst als aktiv führt: ohne Klick
  die erste Zeile (dorthin führt Tab), nach Wegfall der Zeile die an ihrer Stelle; gemeldet schon beim ersten Rendern,
  `null` im leeren LV; nur Zeilenwechsel, kein Spaltenwechsel → So sehen App und Grid (Strg+Plus, Strg+V) dieselbe
  Zeile, auch wenn der Fokus nur per Tab ins Grid kam (Lücke aus 39/47).
- **D-54.2** Wodurch wird eine Zeile geöffnet? → Strg+Enter (wie die App in 47 schon belegt) und Doppelklick auf eine
  nicht bearbeitbare Zelle; Doppelklick auf eine bearbeitbare Zelle bearbeitet weiter (U3, Excel-nah, wie in 47
  entschieden). Das Grid meldet jede Zeilenart samt Spalte, die App filtert (z. B. nur Positionen). **Belegung**: Strg+Enter
  öffnet nur mit `onZeileOeffnen`; ohne die Eigenschaft bearbeitet es wie bisher wie Enter. Sonst keine Taste geändert.
- **D-54.3** Form des Nur-Lese-Modus → Vereinigungstyp statt bloßer Schalter: Der Typ verbietet Befehlsrückrufe, und im
  Grid führt nur das bearbeitbare Props-Objekt (`aenderung`) zu einem Befehl → „kein Rückruf für Änderungen“ ist
  strukturell gesichert; das schreibgeschützte Grid braucht weder `ids` noch `onBefehl`.
- **D-54.4** Was bleibt im schreibgeschützten Grid? → Fokus, Navigation, Auswahl (inkl. `onAuswahlChange`), Auf- und
  Zuklappen (`onAufklappen`, Ansichtszustand der App), Sprungziel, Befehlshinweise, Zeile öffnen und **Strg+C**
  (Kopieren ändert nichts; Excel-Export eines Stands/Auftrags-LV per Zwischenablage). Gesperrt mit Ansage: F2, Tippen,
  Entf, Strg+X/V/Minus/Entf/Plus, Alt+Pfeil hoch/runter, Doppelklick ohne `onZeileOeffnen`. Enter bewegt nach unten
  wie bei einer Zelle ohne Eingabe.
- **D-54.5** Screenreader-Ansage → `aria-readonly="true"` am `treegrid` und an jeder Zelle, Beschreibung des Grids
  (`aria-describedby`) „Schreibgeschützt: Hier lässt sich nichts ändern.“, derselbe Text in der Live-Region bei jedem
  Änderungsversuch. Kein eigener Zellstil (Design-Tokens unverändert).
- **D-54.6** Form der genauen Löschzahl → Funktion `positionenZaehlen(knotenIds) → number` statt einer Zahl: Die
  Auswahl entsteht im Grid, erst beim Öffnen der Rückfrage steht fest, welche Knoten gemeint sind. Gezählt werden
  Positionen (wie bisher), Knoten und Gliederungen zählt das Grid weiter aus den sichtbaren obersten Knoten (die sind
  immer sichtbar). Kein Rechnen im Sinne von A5/N1 (keine Beträge).
- Wiederverwendung für 60: Navigation (`navigation.ts`), Virtualisierung und Auswahl sind unverändert; der Nur-Lese-Weg
  hängt an einer Stelle (`aenderung`/`nurLesen` in `LvGrid.tsx`).

# 54: `ui-grid` und `ui-basis`: Lücken aus Welle 3

Status: ready-for-agent
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

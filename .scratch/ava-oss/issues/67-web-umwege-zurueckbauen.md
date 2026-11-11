# 67: Umwege aus Welle 3 in der App zurückbauen

Status: claimed
Type: task
Welle: 4 · Strang: U · Paket: `apps/web` (Ordner `src/lv/`, `src/historie/`; D-20)
Blocked by: 54 (beide Teile)
Ausnahme (D-26): `Button` in `packages/ui-basis` nimmt einen `ref` an (eine Stelle, additiv), damit der Anfangsfokus auf einen Knopf zeigen kann.
Regeln: U3, U5, Q2, Q5
Herkunft: Ticket 54 (Nicht-Ziel „Rückbau der Umwege in `apps/web` (Folgeticket)“), Comments der Tickets 39, 46, 47, 48

## What to build

Ticket 54 hat in `ui-grid`/`ui-basis` ergänzt, was die App in Welle 3 mit Umwegen überbrückt hat. Hier werden die Umwege
durch die neuen Eigenschaften ersetzt (die Comments von 39, 46, 47, 48 und 54 nennen die Stellen):

1. Aktive Zeile über den neuen Rückruf statt über die letzte gemeldete Auswahl (Positionsdialog, Prüf-Panel).
2. „Zeile öffnen“ öffnet den Positionsdialog (Doppelklick/Taste laut Ticket 54).
3. LV-Stand-Seite (`LvStandSeite.tsx`) nutzt den schreibgeschützten Modus; die Meldung „Stand ist schreibgeschützt“ beim
   Übernehmen entfällt.
4. Löschdialog bekommt die exakte Anzahl aus der App.
5. Dialoge mit Enter-Bestätigung nutzen den Anfangsfokus aus `ui-basis` statt eigener Tastenhandler.

## Grenzen

- Verhalten für den Nutzer gleich oder besser; keine bestehende E2E abschwächen. Nur `src/lv/` und `src/historie/`
  (dazu `src/projekt/`, falls ein Dialog dort liegt).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Je Punkt ein E2E oder ein angepasster bestehender E2E; entfernter Umweg-Code im Ticket aufgelistet
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Neue Funktionen.

## Comments

### Umsetzung (Welle 4)

Tests: `apps/web/e2e/umwege.spec.ts` (Punkte 1, 2, 4, 5), `apps/web/e2e/undo.spec.ts` (Punkt 3, angepasst), `apps/web/src/lv/ansicht.test.ts` (`positionenImTeilbaum`), `packages/ui-basis/src/Button.test.ts` (`ref`).

Entfernter Umweg-Code:

- `LvSeite.tsx`: `onKeyDownCapture` (Strg+Enter vor dem Grid abgefangen), `onDoubleClick` samt Menge `OHNE_EINGABE`, Hilfsfunktion `gridZeile` (DOM-Suche nach `data-i`/`data-spalte`), die Ableitung der aktiven Zeile aus `onAuswahlChange` (letzte Auswahl). Ersatz: `onAktiveZeileChange`, `onZeileOeffnen`.
- `LvStandSeite.tsx`: die Rückrufe `onBefehl`/`onBefehlsfolge`/`onKopieEinfuegen`, die nur „Stand ist schreibgeschützt“ meldeten, samt `useToast`/`ids`. Ersatz: `schreibgeschuetzt`. Texte `schreibgeschuetzt` und `schreibgeschuetztText` in `historie/texte.ts` gelöscht (das Kennzeichen „schreibgeschützt“ bleibt).
- Löschdialog: „mindestens“ bei zugeklappten Titeln entfällt in der App durch `positionenZaehlen` (`positionenImTeilbaum` in `lv/ansicht.ts`).

Entscheidungen:

- **D-67.1 Dialoge mit Enter-Bestätigung.** Frage: Wo gab es in der App Tastenhandler-Umwege für Enter? Entscheidung: In der App keine; ihre Dialoge sind Formulare (Enter im Feld übernimmt). Der Tastenhandler lebt im Löschdialog von `ui-grid` und bleibt (D-26). Als Anwendung des Anfangsfokus startet der Dialog „Merkmale“ auf „Übernehmen“ (Enter bestätigt sofort; vorher lag der Fokus auf dem Schließen-Kreuz). Die übrigen Dialoge (Positionen, LV-Angaben, Stände, Projekt) bleiben, dort ist der erste Fokus ein Eingabefeld besser. `Button` nimmt `ref` an (`ComponentPropsWithRef<\x27button\x27>`, React 19). Reversible: yes.
- **D-67.2 Zeile öffnen auf einer Gliederung.** Frage: Das Grid meldet jede Zeilenart, was tut die App? Entscheidung: Positionen öffnen den Dialog; bei Gliederungen und Hinweisen erscheint die Meldung „Merkmale gibt es nur an Positionen“ (wie bisher bei Strg+Enter; neu auch beim Doppelklick auf OZ/Art/GP einer Gliederung, wo vorher nichts geschah). Reversible: yes.
- **D-67.3 Aktive Zeile.** Das Grid meldet die aktive Zeile schon beim Rendern (erste Zeile); „Titel/Position anlegen“ per Knopf ohne Klick geht damit hinter die erste Zeile statt ans LV-Ende (Verhalten besser, Test Punkt 1).

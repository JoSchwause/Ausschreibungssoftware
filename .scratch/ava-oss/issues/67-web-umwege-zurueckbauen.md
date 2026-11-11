# 67: Umwege aus Welle 3 in der App zurückbauen

Status: ready-for-agent
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

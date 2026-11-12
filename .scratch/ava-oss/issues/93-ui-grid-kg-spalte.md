# 93: `ui-grid`: editierbare Spalte für die Kostengruppe im LV-Grid

Status: ready-for-agent
Type: task
Welle: 6 · Strang: U, C2 · Paket: `packages/ui-grid`, danach `apps/web/src/kosten/`
Blocked by: –
Regeln: U2, U3, U5, Q4, D-89.1, D-47
Herkunft: Wellen-Review 5, P1 (Ticket 89 verlangte eine Spalte „KG“; umgesetzt als Dialog mit Mehrfachauswahl, D-89.1)

## What to build

Eine Spalte „KG“ im LV-Grid und im Auftrags-LV, direkt editierbar wie Menge/EP (Tastatur zuerst, U3), formwidrige Eingabe als
Zellfehler (die Marke `Kostengruppennummer` lässt sie nicht in den Befehl), Einfügen aus Excel setzt mehrere KG in einem
Undo-Schritt. Leistungsbudgets des Grids bleiben grün (Q4). Der Dialog aus 89 bleibt für die Mehrfachauswahl.

## Acceptance criteria

- [ ] Spalte in `ui-grid` getestet (Unit + E2E des Pakets); App stellt um; `leistung.spec.ts` grün

## Comments

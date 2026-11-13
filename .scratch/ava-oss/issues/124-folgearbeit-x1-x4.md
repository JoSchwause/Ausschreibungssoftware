# 124: Folgearbeit X1–X4 (Vorgang verschieben, Fortschritt aus dem Leistungsstand, KG-Hinweis an der Zelle)

Status: ready-for-agent
Type: task
Welle: 7 (Vorschlag) · Strang: X2, C2 · Ordner: `apps/web/src/bauzeit/`, `apps/web/src/lv/`, `apps/web/src/kosten/`
Blocked by: 122
Regeln: U2–U5, Q5; D-109.7, D-118.3, D-118.7, D-93.7, D-89.4
Herkunft: offene Punkte der Tickets 93 und 118, Bericht Welle 6

## What to build

1. **Vorgang verschieben (D-118.3):** innerhalb einer Ebene nach oben/unten, per Tastatur, ein Rückgängig-Schritt.
2. **Fortschritt aus dem Leistungsstand (D-109.7, D-118.7):** der Vorgangsdialog schlägt den Fortschritt aus dem Leistungsstand
   der bezogenen LV-Knoten vor (Funktion aus `bauzeit`), der Nutzer übernimmt oder überschreibt.
3. **Hinweis „KG außerhalb der Gliederung“ an der Zelle (D-93.7, D-89.4):** die LV-Seite lädt die Kostenermittlungen und reicht
   den Befund in `LvZeile.befunde`.
4. **Messung:** Preisspiegel-Budget (`vergabe`) auf ruhiger Maschine neu messen (in Welle 6 unter Last wackelig); Ergebnis im
   Ticket, nichts gelockert.

5. **Bezug auf LV-Knoten im Vorgangsdialog** (Ticket 118 §2, Review PC-a2, in 122 nicht erreicht): nicht nur ganzes LV oder
   Auftrags-LV, sondern einzelne Knoten wählbar (`bauzeit/VorgangDialog.tsx:44,54`), Voraussetzung für Punkt 2.

## Acceptance criteria

- [ ] Unit- und E2E-Tests für 1–3 und 5 grün; Messwert aus 4 im Ticket
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

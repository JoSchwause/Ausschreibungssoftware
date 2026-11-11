# 74: `ui-grid`: Restpunkte aus Welle 4

Status: claimed
Type: task
Welle: 5 · Strang: U · Paket: `packages/ui-grid`
Blocked by: –
Regeln: U3, U4, U8, Q4
Herkunft: D-65.2, D-26, Ticket 60 (Comments)

## What to build

1. Neutrales Zellkennzeichen (kein Warnstil) für „Position hat einen Mengenansatz“ (D-65.2); die App stellt darauf um.
2. Löschdialog des Grids nutzt den Anfangsfokus aus `ui-basis` statt eines eigenen Enter-Handlers (D-26; `Button` nimmt jetzt `ref`).
3. `VergleichsGrid`: schnelles Wischen über 5.000 Zeilen × 5 Bieter läuft mit 15–23 Bildern/s (LvGrid 45–60); weniger
   DOM-Elemente je Zelle, Ziel ≥ 30 Bilder/s.

## Acceptance criteria

- [ ] je Punkt ein Test; Leistungsmessung im Ticket

## Comments

# 72: `vergabe`: `summen.vorher` für eine nach dem Angebot hinzugekommene LV-Position

Status: claimed
Type: bug
Welle: 5 · Strang: V · Paket: `packages/vergabe`
Blocked by: –
Regeln: A6, Q5
Herkunft: D-57.2 (Ticket 57, Comments)

## What to build

`positionSetzen` schickt für eine LV-Position, die nach dem Anlegen des Angebots hinzukam, eine alte Summe mit, die nie
gespeichert war. `speicher` nimmt es an (nichts geht verloren), aber Rückgängig schreibt eine Summenzeile zu viel. `vorher`
muss den gespeicherten Stand (keine Zeile) wiedergeben.

## Acceptance criteria

- [ ] Test: Position im LV ergänzen, im Angebot bepreisen, Rückgängig → Summenstand gleich vorher (auch in `speicher`)

## Comments

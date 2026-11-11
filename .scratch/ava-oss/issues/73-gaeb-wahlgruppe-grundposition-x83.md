# 73: `gaeb`: Wahlgruppe verliert die Grundposition im Rundweg X83

Status: claimed
Type: bug
Welle: 5 · Strang: G · Paket: `packages/gaeb`
Blocked by: –
Regeln: F4, E-04, Q3, Q5, D-16
Herkunft: Ticket 64 (D-64.1), Ticket 69 (Import meldet `wahl-ohne-grundposition`)

## What to build

`typisch` als X83 exportiert und wieder eingelesen ergibt eine Wahlgruppe ohne Grundposition (Warnung
`wahl-ohne-grundposition`); ein Zuschlag mit gewählter Alternative ist danach nicht mehr wie in der Fixture möglich. Ursache
klären (Writer: Variante 0 der Grundposition; Leser: Zuordnung über Gruppennummer) und beheben; Roundtrip-Liste kürzen.

## Acceptance criteria

- [ ] Rundweg `typisch` X83 → Import ergibt die Wahlgruppe mit Grundposition; `m3.spec.ts` kann das LV per X83 einlesen

## Comments

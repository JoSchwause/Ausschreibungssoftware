# 71: Kern: Umkehrung für ChangeSets des Auftrags-LV

Status: ready-for-agent
Type: task
Welle: 5 · Strang: K · Paket: `packages/kern`
Blocked by: 70
Regeln: A5, A6, ADR 0011
Herkunft: D-64.4 (die App kehrt Auftrags-LV-ChangeSets mit der LV-Umkehrung um, über `as string as LeistungsverzeichnisId`)

## What to build

`auftragsLvChangeSetUmkehren` im Kern; die App (`apps/web/src/auftrag/`) stellt danach darauf um und entfernt den Umweg.

## Acceptance criteria

- [ ] Property-Test anwenden ∘ umkehren = Identität; App-Umweg entfernt, `m3.spec.ts` grün

## Comments

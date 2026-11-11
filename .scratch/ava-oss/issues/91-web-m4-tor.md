# 91: Tor M4: Kettentest und E2E „LPH 6–8“

Status: claimed
Type: task
Welle: 5 · Strang: – · Ordner: `apps/web/e2e/m4.spec.ts`, `apps/web/e2e/m3.spec.ts`, `apps/web/src/m4-kette.test.ts` (neu);
kleine Reparaturen in den App-Ordnern der Welle nur mit Vermerk im Ticket
Blocked by: 73, 85, 86, 87, 88, 89
Regeln: Q2, C4, D-38, D-64.1
Herkunft: D-38 (Definition M4), Ticket 73 (M3 per X83)

## What to build

1. **Kettentest ohne Oberfläche** `apps/web/src/m4-kette.test.ts` (die App darf alle Pakete importieren): mit der Fixture
   `fixtures/typisch-abrechnung.json` (Ticket 85) den Weg `vergabe.zuschlagErteilen` → Kern → `abrechnung.nachtragUebernehmen`
   → Kern → Aufmaß (mit `mengen` gerechnet) → `sollIstBerechnen` → `rechnungPruefen` AR 1 → Freigabe → AR 2 (vor und nach
   der Korrektur) → `kosten.kostenkontrolleBerechnen`; jede Zahl gegen die Sollwerte der Fixture.
2. **E2E** `apps/web/e2e/m4.spec.ts` nach D-38, ganz über die Oberfläche: neues Projekt, LV `typisch` (per X83, wenn Ticket
   73 es trägt, sonst Testweg wie M3, D-64.1), zwei X84, Zuschlag nach der Fixture, Nachtrag N01 beauftragen, Kostengruppen
   und Kostenberechnung, Aufmaßblatt 1, Soll/Ist-Befund, AR 1 prüfen = Sollwert, freigeben, Aufmaßblatt 2, AR 2 = Sollwert,
   Korrektur an Blatt 1 ändert AR 2, nicht den eingefrorenen Wert von AR 1, Kostenkontrolle = Sollwerte, Neuladen.
   Dreimal hintereinander grün. Ist die E2E wackelig, gelten Kettentest plus eine verkürzte E2E als Tor (D-38) – im Ticket
   begründen.
3. **`m3.spec.ts` per X83** (Ticket 73): LV per X83-Rundweg statt Testweg einlesen, wenn `gaeb` es trägt.

## Grenzen

- Fehler in Paketen nicht dort beheben, sondern dem Orchestrator melden (eigenes Fix-Ticket). `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [ ] Kettentest grün; `m4.spec.ts` dreimal hintereinander grün; `m3.spec.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün, `pnpm e2e` grün

## Comments

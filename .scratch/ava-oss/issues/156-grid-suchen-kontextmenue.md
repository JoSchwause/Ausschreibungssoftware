# 156: Suchen, Filtern und Kontextmenü im Grid

Status: ready-for-agent
Type: task
Welle: 7 · Strang: U, E4 · Paket/Ordner: `packages/ui-grid`, `apps/web/src/lv/`
Blocked by: 148, 130
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U2, U3, Q4
Herkunft: umfang §3 E4, B-09

## What to build

1. **Suchen** (Strg+F im Grid) über OZ, Kurztext und Langtext mit Sprung zum Treffer (weiter/zurück), ohne das Budget zu
   reißen (Index außerhalb des Renderpfads).
2. **Filter** nach Art, Merkmal (Bedarf, Wahl, Stundenlohn, Pauschal) und „ohne Preis“; Filter sichtbar, ein Klick hebt auf.
3. **Kontextmenü** an Zeile und Zelle (Radix, auch per Umschalt+F10/Menütaste) mit denselben Aktionen wie die Tastatur;
   Kürzelübersicht aus dem Grid heraus aufrufbar (Hilfeseite aus 147).
4. Kürzel in die Kürzeltabelle (130) aufnehmen.

## Acceptance criteria

- [ ] Prüfstand-E2E und App-E2E; Budgets 5.000/10.000 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

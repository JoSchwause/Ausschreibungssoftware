# 135: `speicher`: eine Tabelle je ChangeSet-Art

Status: ready-for-agent
Type: task
Welle: 7 · Strang: S · Paket/Ordner: `packages/speicher`
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A6, A8, Q4; D-69
Herkunft: Ticket 123 Punkt 2 (SA6, SA7) und `dekoder.ts`-Teil von Punkt 1 (nach 127)

## What to build

- Eine Tabelle je `ChangeSet['art']` statt zweier Switches (`kern.ts:116` `aggregatDes`, `:600` `anwenden`) samt
  `schreiben.ts:255` und `projektdatei.ts` (SA6).
- UPDATE-Spalten nicht positionsgekoppelt an die INSERT-Tupel (`schreiben.ts:1372,1398,1429` ↔ `zeilen.ts:562-611`, SA7).
- Keine Verhaltensänderung, keine Schemaänderung. Budgets (Einzeländerung, Undo 5.000 Zeilen < 100 ms) unverändert grün.
- Die Konstanten aus 127 (KG-Form, Hash, Artenlisten) in `dekoder.ts:992,1028,1050,1119` nutzen, sobald 127 gemergt ist
  (Integrationsspitze mergen); sonst als offener Rest für 139 im Ticket vermerken.

## Acceptance criteria

- [ ] Alle `speicher`-Tests und die `speicher`-E2E grün; keine Golden-Änderung
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

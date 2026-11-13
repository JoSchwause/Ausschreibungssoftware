# 140: Fachpakete aufräumen (Ticket 123, Rest)

Status: claimed
Type: task
Welle: 7 · Strang: – · Paket/Ordner: `packages/ifc`, `bim`, `bauzeit`, `bauleitung`, `ui-modell`
Blocked by: 127
Modell: sonnet
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A3, L2; D-69
Herkunft: Ticket 123 Punkte 1 (Verbraucher), 3, 5 (Verbraucher), 7 (`bauzeit`), 8 (Paketteile)

## What to build

- `ifc`: Nachrichtenketten `l.daten.id/name/klasse(…)` hinter einer Methode (SA9); Test-Exporte bereinigen.
- `ifc`, `bim`: Konstanten aus `vertrag` v1.7a (KG-Form, Hash, Artenlisten, `MENGENART_STUECK`) statt eigener Kopien.
- `bauzeit`, `bauleitung`: gemeinsamer Datumstyp aus `vertrag` (`bauleitung/datum.ts:6-22` entfällt), drei `Lage`-Typen in
  `bauzeit` zusammenführen, Prozentkonstanten und Namen, „offen“-Prädikat.
- `ui-modell`: GlobalIds-Punkt aus 122/20.
- Die App-Teile von 123 machen 131 und 155, nicht dieses Ticket.

## Acceptance criteria

- [ ] Keine Verhaltensänderung; alle Goldens, X1–X4-Kettentests und Paket-E2E grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

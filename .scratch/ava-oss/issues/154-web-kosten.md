# 154: App: Kalkulationsansätze speichern, Kostenausgaben, KG-Hinweis

Status: claimed
Type: task
Welle: 7 · Strang: C2–C4, E9, E12 · Paket/Ordner: `apps/web/src/kosten/`
Blocked by: 137, 139, 153
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A2, U5, Q5
Herkunft: umfang §3 E9, E12, E2 (B-14)

## What to build

1. **EP-Kalkulation:** Ansätze und Zuschlagssätze werden an der Position gespeichert, der Dialog öffnet mit ihnen (B-19); Undo.
2. **Ausgaben:** Kostenermittlung und Kostenkontrolle als PDF und Excel mit Vorschau.
4. **Aus 131 (D-131.1):** `kosten/pfad.ts` auf den Pfadbaukasten in `apps/web/src/ui/` umstellen.
5. **Aus 142 (D-89):** Schaltflächenreihen auf `Werkzeuggruppe`/`Werkzeugverweis` aus `ui-basis` umstellen, wo billig.
3. **B-14:** Hinweis und Verweis zum Einlesen der KG-Bezeichnungen, solange keine vorhanden sind.

## Acceptance criteria

- [ ] E2E für 1–3; M4 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

# 148: App: LV-Bedienung (Hinweistext, OZ-Maske, Texte, KG-Hinweis)

Status: claimed
Type: task
Welle: 7 · Strang: U, E8 · Paket/Ordner: `apps/web/src/lv/`
Blocked by: 137, 139, 142
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U3, U5, F2, Q5; D-93.7, D-89.4
Herkunft: umfang §3 E8 (LV-Teil), B-15, B-26; Ticket 124 Punkt 3

## What to build

1. **Hinweistext anlegen und ändern** (Vor- und Nachtext) über Werkzeugleiste/Menü und Tastatur; Dialog mit Langtext-Editor.
2. **OZ-Maske ändern** (Dialog, Vorschau, Prüfung der vorhandenen OZ mit Liste der Konflikte; abgewiesen ohne Datenverlust).
3. B-26: „Merkmale gibt es nur an Positionen“ beim Bearbeiten eines Titels: richtiger Text bzw. Merkmal-Aktionen an Titeln
   ausgegraut.
4. **124 §3:** Hinweis „KG außerhalb der Gliederung“ an der Zelle: die LV-Seite lädt die Kostenermittlungen und reicht den
   Befund in `LvZeile.befunde`.
5. Projektdatei einlesen, wenn das Projekt schon da ist (B-25), liegt in 150; hier nur der Text in `lv/texte.ts`, falls dort.

## Acceptance criteria

- [ ] E2E für 1–4
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

# 150: App: Projektangaben, LV-Stände, Einstellungen, Kopie-Import

Status: ready-for-agent
Type: task
Welle: 7 · Strang: E8, E10, E15 · Paket/Ordner: `apps/web/src/projekt/`, `historie/`, `sicherung/`, `ausgabe/` (Druckprofile), `kosten/bezeichnungen.ts` (nur Speicherweg)
Blocked by: 137, 139, 147
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q5, A8, U7; D-73
Herkunft: umfang §3 E8, E10, E15, B-16, B-20, B-25, B-29

## What to build

1. **„Projektangaben“** statt „Stammdaten ändern“ (Name nach 133, D-133.x; Befehl `ProjektangabenSetzen` nach D-127.5): Name, Bauherr, Nummer, Ort, Anschrift der Baustelle.
2. **Büro (Absender)** einmal für alle Projekte (Einstellungen, D-73), erreichbar über die Projektliste/Hilfe-Leiste.
3. **LV-Stand umbenennen und löschen** (Bestätigung, Undo).
4. **Einstellungen im Speicher:** Druckprofile und KG-Bezeichnungen aus `localStorage` einmalig übernehmen (wenn der Speicher
   leer ist; alte Schlüssel bleiben), danach nur noch über die Einstellungen lesen/schreiben.
5. **Projektdatei einlesen, wenn das Projekt schon da ist:** Wahl „als Kopie einlesen“ oder Abbrechen; der Dialog nennt, welche
   Einstellungen übernommen und welche belassen wurden.

## Acceptance criteria

- [ ] E2E für 1–5, inklusive Sicherung → Projekt löschen → Einlesen → gleiche Einstellungen
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

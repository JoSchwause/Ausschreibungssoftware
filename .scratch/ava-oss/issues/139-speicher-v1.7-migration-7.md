# 139: Speicher v1.7: Migration 7, Projektdatei Schema 7, Einstellungen, Einlesen als Kopie

Status: ready-for-agent
Type: task
Welle: 7 · Strang: S · Paket/Ordner: `packages/speicher`
Blocked by: 127, 135
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A8, A6, Q4, Q5, U7; D-73, D-74
Herkunft: umfang §3 E8 (Projektdatei als Kopie, Zuschlag zurücknehmen), E15, E10

## What to build

1. **Migration 7** (SQLite) und **Projektdatei Schema 7** für alle Felder aus 127 (und später 128: Felder optional,
   Schema 7 reicht für beide, wenn 128 vor dem Ende gemergt ist; sonst vermerken).
2. **Einstellungen** (D-73): eigenes Repository und Tabelle, außerhalb der Projekt-Undo-Historie; Projektdatei trägt sie als
   optionalen Block; Einlesen füllt nur Fehlendes je Schlüssel und gibt zurück, was übernommen und was belassen wurde.
3. **Projektdatei einlesen, wenn das Projekt schon da ist:** Funktion „als Kopie einlesen“ (neue IDs für alle Entitäten,
   Verweise konsistent umgeschrieben, Modelldateien mit), Name mit Zusatz „(Kopie)“.
4. Speicherung der neuen Befehle aus 137/138 (falls generisch über ChangeSets schon abgedeckt, nur Tests); Zuschlag zurücknehmen
   über den bestehenden `konflikt`-Weg bei Mangelverweisen (v1.6).
6. **Befund aus 134:** nach einem Neuladen meldet die App einmal `createSyncAccessHandle … another open Access Handle`, weil der alte Speicher-Worker die OPFS-Datei noch hält. Ursache prüfen (Worker beim `pagehide` schließen oder Wiederholung mit Wartezeit), Test.
5. Ältere Projektdateien (Schema 1–6) öffnen weiter (A8): Tests mit den vorhandenen Projektdatei-Fixtures.

## Acceptance criteria

- [ ] Migrationstest 6 → 7, Projektdatei 1–6 → 7, Kopie-Import mit Verweisprüfung; Budgets grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

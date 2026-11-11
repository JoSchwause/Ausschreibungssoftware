# 90: O3+C5 in der App: Druckprofile, Muster-LV, Textquelle

Status: ready-for-agent
Type: task
Welle: 5 · Strang: O3, C5 · Ordner: `apps/web/src/ausgabe/`, `apps/web/src/vorlage/` (neu); Einhängestellen in
`lv/LvSeite.tsx`, `lv/PositionsDialog.tsx`, `lv/KopfdatenDialog.tsx`, `auftrag/AuftragAusgeben.tsx` (markiert `// Ticket 90`,
D-20)
Blocked by: 71, 77, 79
Regeln: A5, G-17, U3, U5, U7, U8, Q2, D-20, D-23, D-36, D-40
Herkunft: `plan.md` §2 O3, C5

## What to build

1. **Druckprofile** (Ticket 77): im Druckdialog des LV (und des Auftrags-LV) ein Profil wählen (Standardprofile plus eigene),
   eigenes Profil anlegen/ändern/löschen, als JSON-Datei exportieren/importieren; abgelegt als Einstellung des Nutzers
   (wie die Preisspiegel-Einstellungen, D-36 (7)), nicht im Projekt.
2. **Muster-LV** (C5): im Kopfdaten-Dialog „Als Muster-LV (Vorlage) kennzeichnen“ (`VorlageSetzen`); auf der Projektseite
   Kennzeichen „Vorlage“; im LV „Aus Vorlage übernehmen…“: Dialog mit allen Vorlage-LVs aller Projekte, Positionen/
   Gliederungen auswählen, Einfügeort wählen, Übernahme mit neuen Kennungen über die vorhandenen Kopierbefehle (K9,
   `kopieBauen`/`KnotenEinfuegen`), ein Undo-Schritt. Textquelle der übernommenen Positionen: Name der Vorlage, wenn leer.
3. **Textquelle** (G-17): Feld im Positionsdialog (`TextquelleSetzen`), frei, z. B. „Muster-LV Hochbau 2026“.
4. **E2E** `apps/web/e2e/vorlage.spec.ts` (Vorlage kennzeichnen, in anderes LV übernehmen, Textquelle sichtbar, Undo) und ein
   Test für das Druckprofil (Profil wählen → PDF-Text enthält/enthält nicht die Preise; wie `ausgabe.spec.ts`).

## Grenzen

- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Logik, beide E2E grün; `ausgabe.spec.ts` bleibt grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

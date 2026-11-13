# 149: App: Vergabe (Angebote, Bieter, Zuschlag zurücknehmen, Preisspiegel-Ausgaben)

Status: ready-for-agent
Type: task
Welle: 7 · Strang: V, E8, E10, E11 · Paket/Ordner: `apps/web/src/vergabe/`, `apps/web/src/gaeb/Angebote.tsx` und Verwandte
Blocked by: 137, 138, 139, 141, 142, 146
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q5, U3, U5, N4; D-73, D-74, D-05
Herkunft: umfang §3 E8, E10, E11, E15 (Preisspiegel-Einstellungen am LV), B-15, B-16

## What to build

1. **Angebot löschen** (Bestätigung, Undo), **einzelne Angebotspreise erfassen und berichtigen** (Grid oder Dialog),
   **Nachlass des Angebots setzen und entfernen**.
2. **Bieter umbenennen, löschen** (nur ohne Angebot; Sperrtext), **Bieter-Stammdaten** (Anschrift, Ansprechperson, E-Mail,
   Telefon) bearbeiten; aus X84 gefüllte Anschrift sichtbar.
6. **Aus dem Review (D-82, S7):** Ein vorhandener Bieter wird beim Einlesen eines X84 nicht überschrieben; trägt die Datei andere Angaben, bietet die App `BieterangabenSetzen` an. Die schmalen Funktionen aus `vergabe` (S9) verlangen die Verweise; die App zählt sie.
3. **Zuschlag zurücknehmen** (D-74): Bestätigungsdialog nennt Vorgänge im Bauzeitenplan und die entfallenden Werte der
   Kostenkontrolle; Sperre nennt Nachträge, Aufmaßblätter, Rechnungen, Mängel und wie man sie löst. Danach ist das Projekt
   wieder löschbar (Q5).
4. **Preisspiegel-Einstellungen** am LV speichern (statt nur Sitzung, B-29).
5. **Ausgaben:** Preisspiegel als PDF (quer) und Excel, Vergabevorschlag als PDF mit Begründungstext; Vorschau im Dialog vor dem
   Herunterladen (wie beim LV-PDF, gemeinsamer Baustein, wenn vorhanden).

## Acceptance criteria

- [ ] E2E für 1–5 (PDF erzeugt, Seitentext enthält Summen)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

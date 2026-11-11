# 90: O3+C5 in der App: Druckprofile, Muster-LV, Textquelle

Status: resolved
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

- [x] Unit-Tests der Logik, beide E2E grün; `ausgabe.spec.ts` bleibt grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### D-90.1 Ablage der eigenen Druckprofile
Question: Wo liegen die eigenen Profile („Einstellung des Nutzers“, D-36 (7))? Die Preisspiegel-Einstellungen leben nur in der Sitzung.
Decision: In `localStorage` des Browsers (Schlüssel `tethys-druckprofile`, Liste als JSON; zuletzt gewähltes Profil `tethys-druckprofil-gewaehlt`), gelesen mit `druckprofilAusJson` je Eintrag; Unlesbares, doppelte und Standardnamen fallen weg. Nicht im Projekt, nicht in der Projektdatei. Reason: Es gibt keine Nutzer-Einstellungs-Ablage in `speicher`; `tethys-modus` geht denselben Weg. Grenze: Sicherung/Ordner-Export enthält die Profile nicht, sie wandern per Datei-Export. Reversible: yes.

### D-90.2 Druckdialog
Decision: Der Dialog „LV als PDF ausgeben“ wählt ein Profil; die Felder (Inhalt, Langtext, Zeilen, Seitenrand, Titelsummen, Schlussblock, Kopfblock, Kopf-/Fußzeile) bearbeiten eine Arbeitskopie, die für den Druck gilt, auch ungespeichert. Standardprofile ändern sich nie; „Als neues Profil speichern“ legt eine Kopie an, ein vergebener Name wird abgewiesen, ein Import mit vergebenem Namen heißt „… (2)“ (nichts überschreibt still, Q5). Vorbelegung: zuletzt gewähltes, sonst „Auftrags-LV mit Preisen“ (= Druck wie bisher, `ausgabe.spec.ts` bleibt grün). Das Paket `ausgabe` wird beim Öffnen nachgeladen (Hauptbündel bleibt ohne pdfmake). Dasselbe `PdfAusgabe` hängt (markiert `// Ticket 90`) in `auftrag/AuftragAusgeben.tsx` für das Auftrags-LV.

### D-90.3 Muster-LV übernehmen
Decision: `vorlage/logik.ts` (rein): Vorlagenliste aus `projekte.auflisten` + `leistungsverzeichnisse.auflisten` (nur `LvUebersicht.vorlage`, D-43; das offene LV fehlt), Baum der Vorlage, Auswahl (eine Gliederung zieht alles darunter), `uebernahmeBauen` = `kopieBauen` (neue Kennungen) in **einem** `KnotenEinfuegen` (ein Undo-Schritt). Einfügeort wie Strg+V: hinter der aktiven Zeile, sonst Ende. Textquelle der Kopien: Name der Vorlage, wenn leer; eine vorhandene bleibt. Bezüge aus der Auswahl hinaus (Zuschlagsbezug, Grundposition einer Wahlposition) zeigen auf Positionen eines anderen LV und werden entfernt, die Zahl steht im Toast (Q5). Reversible: yes.

### D-90.4 Textquelle im Positionsdialog
Decision: ein Feld im Positionsdialog; Übernehmen hängt `TextquelleSetzen` an die Befehle des Dialogs (ein Undo-Schritt), leer/Leerraum = `null`, unverändert = kein Befehl. Das Feld ist nicht Teil von `Positionsentwurf` (kein Eingriff in `lv/positionsentwurf.ts`).

### D-90.5 GAEB-Export (Zusatzpunkt D-84.4)
Decision: `lvInhalt` (`lv/inhalt.ts`, `// Ticket 90`) reicht `vorlage` und `nachtrag` an `schreibeGaeb` weiter (nur wenn gesetzt); der Export zeigt die Warnung `export-verworfen` („Kennzeichen Muster-LV“, „Nachtragsangaben des LV“) im Befunddialog. Test in `lv/inhalt.test.ts` und E2E.

## Answer

Merged: fd4a72f in integration/welle-5 (Konflikt an der Einhängestelle der Projektseite vom Orchestrator gelöst; danach App-Unit-Tests 249/249, E2E vorlage, druckprofil, projekt, nachtrag, kosten, gaeb 16/16)


Alle drei Teile in der App.
1. Druckprofile: im Dialog „Als PDF“ (LV und, über `PdfAusgabe` in `auftrag/AuftragAusgeben.tsx`, Auftrags-LV) Profil wählen, Felder ändern, als eigenes Profil speichern/ändern/löschen, JSON exportieren/importieren (Befunde sichtbar); Ablage als Einstellung des Nutzers (D-90.1). `ausgabe/profile.ts` (+ Test), `ausgabe/DruckProfilFeld.tsx`.
2. Muster-LV: Kontrollkästchen in „LV-Angaben“ (`VorlageSetzen`), Kennzeichen „Vorlage“ in der LV-Liste der Projektseite, Dialog „Aus Vorlage übernehmen…“ auf der LV-Seite. `src/vorlage/` (Logik, Test, Dialog, Texte).
3. Textquelle: Feld im Positionsdialog (`TextquelleSetzen`).
Einhängestellen (markiert `// Ticket 90`): `lv/LvSeite.tsx`, `lv/PositionsDialog.tsx`, `lv/KopfdatenDialog.tsx`, `lv/inhalt.ts`, `projekt/ProjektSeite.tsx` (+ `projekt.css`), `auftrag/AuftragAusgeben.tsx`, `ausgabe/LvDrucken.tsx`.
Tests: `pnpm lint`, `pnpm typecheck` grün; `pnpm test` 2479 grün (3 übersprungen wie zuvor); E2E `vorlage.spec.ts` (3), `druckprofil.spec.ts` (2), `ausgabe.spec.ts`, `gaeb.spec.ts`, dazu `dialog`, `projekt`, `m3` grün.
Nicht getan: Profile sind nicht in der Sicherung enthalten (Datei-Export genügt); keine eigene Vorschau der Druckprofile.

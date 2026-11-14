# 149: App: Vergabe (Angebote, Bieter, Zuschlag zurücknehmen, Preisspiegel-Ausgaben)

Status: claimed
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
7. **Aus 138 (D-138.1, D-138.7):** `projektBefehlAusfuehren` und `auftragsLvBefehlAusfuehren` aus `@tethys/vergabe` statt aus `@tethys/kern` nutzen; für Bieter löschen und Zuschlag zurücknehmen `bieterLoeschen` bzw. `zuschlagZuruecknehmen` mit den aus dem Speicher gezählten Verweisen aufrufen.
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

Umsetzung (Agent, Demo-Modus, Branch `welle-7/149-vergabe`). Seams (ohne Mensch festgelegt): `vergabe/schreiben.ts`
(`angebotAendern`, `angebotMitBieterangabenAnlegen`, `bieterLoeschenSchreiben`, `angeboteJeBieter`, `ruecknahmelage`,
`zuschlagZuruecknehmenSchreiben`, `preisspiegelEinstellungenSetzen`; echter Kern, `vergabe` und Speicher im Speicher),
`vergabe/bieter.ts` und `gaeb/angebotEntwurf.ts` (rein: Formular bzw. Entwurf → Befehle), E2E `e2e/vergabe.spec.ts` (5 Fälle).

- **D-149.1 Ausreißer-Schwelle höchstens 100 %.** Frage: Die App ließ die Ausreißer-Schwelle nach oben offen (Sitzung), der
  Kern prüft bei `PreisspiegelEinstellungenSetzen` jeden Satz auf 0 bis 100 (Vertrag v1.7a). Entscheidung: Das Feld meldet
  über 100 wie bei ABC; `preisspiegel.spec.ts` prüft „keine Ausreißer“ mit 100 statt 200 (eine Zeile, die Fixture hat keinen
  Preis mehr als 100 % über dem Mittel). Grund: Der Vertrag ist entschieden; ein Sitzungswert neben dem gespeicherten wäre
  zweierlei Wahrheit (B-29). Wer 200 braucht, braucht eine Vertragsänderung (Frage an den Orchestrator, nicht dringend).
- **D-149.2 Ort der Bedienung.** Angebot bearbeiten und löschen in der Angebotsliste der LV-Seite (eine Dialogansicht wie der
  Papierkorb, keine verschachtelten Dialoge; Undo eines Angebots führt ohnehin auf die LV-Seite). „Bieter verwalten …“ in der
  Gruppe „Angebote“ und in der Leiste des Preisspiegels. „Zuschlag zurücknehmen …“ im Preisspiegel neben dem Hinweis auf den
  erteilten Zuschlag (die Seite des Auftrags-LV gehört 151). Ausgaben in einer Gruppe „Ausgabe“ des Preisspiegels.
- **D-149.3 Angebotspreise.** Tabelle aller Positionen mit Textfeld (EP; an einer Zuschlagsposition der Satz in %, der EP
  bleibt Platzhalter) und „nicht angeboten“; „Änderungen speichern“ schickt nur Geändertes als einen Undo-Schritt. Ein neuer
  EP setzt `epa: null` (die Anteile der Datei passen nicht mehr). Ein leeres Feld an einer angebotenen Position ist eine
  Meldung, keine Löschung (D-138.6). Nicht virtualisiert: bei 5.000 Positionen spürbar langsam; für ein Grid wäre `ui-grid`
  zuständig (Folgearbeit, nicht im Budget von Q4, das nur das LV-Grid misst).
- **D-149.4 Bieterangaben aus der X84 (D-82 S7).** Weichen die Angaben eines vorhandenen Bieters gleichen Namens von denen
  der Datei ab (Vergleich in Normalform), zeigt der Dialog das und einen Schalter „Angaben der Datei … übernehmen“ (aus).
  Angehakt laufen `BieterangabenSetzen` und `AngebotAnlegen` als **ein** Undo-Schritt (`angebotMitBieterangabenAnlegen`, eigener
  Weg in `vergabe/`, weil `historie` keine Schritte zusammenlegt). Sind sie gleich, bleibt der bisherige Hinweis.
- **D-149.5 Verweise zählen.** In der Kette frisch aus dem Speicher: Angebote des Bieters über alle LVs des Projekts (auch
  Nachtrags-LVs); am Auftrags-LV Nachtrags-LVs (`LvUebersicht.nachtrag.auftragsLvId`), Aufmaßblätter, Rechnungen, Mängel
  (`auftragsLvId`). Nicht sperrend und im Dialog genannt: Vorgänge mit `bezug` auf das Auftrags-LV und der Auftragswert (Netto
  nach Nachlass des Auftrags-LV), der in der Kostenkontrolle entfällt. Die Sperre nennt je Art Anzahl und Lösung (Texte der
  App, L4/L5; die `meldung` des Fehlers bleibt Entwicklertext).
- **D-149.6 Punkt 7.** `lv/befehlsweg.ts` nimmt `projektBefehlAusfuehren` aus `vergabe` (eine Importzeile in `lv/`, nötig,
  damit `BieterUmbenennen`/`BieterangabenSetzen` über die Projektsitzung laufen). Löschen und Zurücknehmen rufen die schmalen
  Funktionen mit gezählten Verweisen. `auftragsLvBefehlAusfuehren` aus dem Kern bleibt in `auftrag/`, `kosten/`, `nachtrag/`,
  `hilfe/` (fremde Ordner, dort kein `ZuschlagZuruecknehmen`): Umstellung für 151/154/150 oder 159.
- **D-149.7 Ausgaben.** Eigener Druck-Worker in `vergabe/` (der der App liegt in `ausgabe/`, Ordner von 150). Vorschau: das
  PDF als `iframe` (Blob-URL) im Dialog, „Herunterladen“ speichert genau diese Bytes; jede geänderte Eingabe verwirft die
  Vorschau. Einen gemeinsamen Baustein gab es nicht; `PdfMitVorschau` in `vergabe/Ausgaben.tsx` ist der Kandidat für LV-PDF
  und 152 (verschieben nach `ui/`, Folgearbeit). Spalten wie am Bildschirm (Schätzpreis, virtuelle Bieter); Büro aus
  `speicher.einstellungen`, Projekt mit Projektangaben (D-141.6). Kein Druckprofil für die Berichte (Standard; Auswahl wie beim
  LV ist offen, `DruckProfilFeld` liegt in `ausgabe/`). Vergabevorschlag: Vorschlag vorbelegt mit Rang 1, „noch keiner“
  wählbar, Begründung frei. Excel ohne Vorschau, die Datei entsteht beim Öffnen.
- **D-149.8 Einstellungen.** Schwellen A, B und Bezug am LV (Undo); die Spaltenwahl bleibt Sitzung. A über B meldet die App am
  Feld und sendet nichts. „Standardwerte herstellen“ sendet `null`.

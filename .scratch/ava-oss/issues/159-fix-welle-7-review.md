# 159: Behebung des Wellen-Reviews Welle 7

Status: done-by-agent (159b; 159a getrennt)
Type: task
Welle: 7 · Strang: – · Paket/Ordner: 159a: Pakete (`gaeb`, `ui-grid`, `bauzeit`, `ausgabe`, `abrechnung`-Paket, `vergabe`, `vertrag` nur Kommentare, `fixtures/`, `GLOSSARY.md`) und App-Ordner `gaeb/` für SB3; 159b: App-Ordner `kosten/`, `vergabe/`, `honorar/`, `bauzeit/`, `bauleitung/`, `nachtrag/`, `hilfe/`, `auftrag/`, `lv/` (nur Spec), `ui/`, `e2e/`, `e2e-basispfad/`, `README.md`. Gesperrt bis zu ihrem Merge: `apps/web/src/abrechnung/`, `rechnung/` (152), `kern`, `speicher`, `projekt/`, `historie/` (161), `apps/web/src/ausgabe/` (162)
Blocked by: alle Merges außer 152, 161, 162
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: wie je Befund; D-104
Herkunft: `../review-welle-7.md`, D-104

## What to build

Umfang und Zuordnung stehen in **D-104** (`../entscheidungen-auto.md`), die Befunde mit Datei und Zeile in
`../review-welle-7.md`. Zwei Umsetzer: **159a** (Pakete, Glossar, Fixtures, Angebotspreise im gemeinsamen Grid) und **159b**
(App-Ordner, README). Jeder Befund wird mit Test behoben oder unter `## Comments` begründet zurückgestellt. Keine Änderung in
gesperrten Ordnern; was dort nötig ist, an den Orchestrator melden.

## Acceptance criteria

- [x] Jeder Pflichtpunkt aus D-104 erledigt oder begründet (159b; PB2 und `gaeb.ts:60` liegen in `gaeb/`, siehe D-159b.6)
- [x] Volle Web-E2E einmal gelaufen: 126 grün, 1 unter Last rot (`nachtrag.spec`, Escape schloss den Positionsdialog nicht in 5 s), einzeln wiederholt grün (Budget-Ausfälle unter Last werden gemeldet, nie gelockert)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün bis auf zwei Leistungsbudgets unter Last (`speicher/v16-leistung`, `abrechnung/leistung`), einzeln grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

### 159b (App, README)

- **D-159b.1 SB1/PB3** Frage: Wo entsteht der deutsche Satz? Entscheidung: Der gemeinsame Worker-Start lehnt mit `PdfFehler` ab
  (technischer Text nur als `einzelheiten`); jeder Dialog zeigt seinen Satz plus den nächsten Schritt aus `fehler/texte.ts`
  (`pdf`, wie Ticket 132): Preisspiegel/Vergabevorschlag/Abrechnung (`ui/PdfMitVorschau`), Kosten (PDF, Excel, Vorschau mit
  eigenem Satz `kosten/texte.ts` `vorschauFehler`), Honorar (Toast jetzt mit nächstem Schritt), Bauzeit, Bauleitung, LV-Druck;
  die Excel-Dialoge von Vergabe (hing bisher still) und Abrechnung ebenso. „Das PDF konnte nicht erzeugt werden.“ einheitlich.
  Tests: `ui/pdf-lauf.test.ts`, `ui/PdfMitVorschau.test.tsx` (kein Rohtext). Für `KostenAusgabe` kein eigener Komponententest
  (braucht Speicher und Einstellungen); gleicher Weg, E2E `kosten.spec` deckt den Druck.
- **D-159b.2 SB6+SB7** Ein Schriftlader und eine Antwortschleife (`ui/pdf-worker-basis.ts`), ein Worker-Start
  (`ui/pdf-lauf.ts`) für alle sechs PDF-Worker (LV-Druck, Vergabe mit den drei Berichten aus 152, Kosten neu im Worker, Honorar,
  Bauzeit, Bauleitung). `new Worker(new URL(…))` bleibt beim Aufrufer, weil der Bündler die Worker-Datei nur an dieser Form
  erkennt. Die Schritte „schriften“/„setzen“ meldet die gemeinsame Schleife für alle; nur der LV-Druck zeigt sie.
- **D-159b.3 `PdfMitVorschau` nach `ui/`** mit `heute` und `drucken`; `vergabe/Ausgaben.tsx` behält den Wrapper mit
  Druck-Worker und Büro (die Abrechnung importiert ihn, 152). **Zurückgestellt:** LV-PDF (`ausgabe/LvDrucken.tsx`) über
  `PdfMitVorschau`: Sein Dialog trägt Druckprofil (162), Fortschritt und Abbrechen für 10.000 Zeilen; eine Vorschau als iframe
  eines PDF dieser Größe ist eine Bedienungsänderung, kein Review-Rest. Der LV-Druck nutzt jetzt Schriftlader und Worker-Start.
- **D-159b.4 SB2/PB4** `bezeichnungenMerken` liefert einen Ausgang (`gemerkt`, `leer`, `abgewiesen`, `ohneEinstellungen`) statt
  `true`; eine Abweisung erscheint als Meldung, eine CSV ohne lesbare Zeile schreibt nichts (gelöscht wird nur mit
  „Bezeichnungen entfernen“, das ein Schritt im Rückgängig der Einstellungen ist). Test `kosten/bezeichnungen.test.ts`.
- **D-159b.5 PB1** Dialog „Angebot des Auftragnehmers“: `BefundeBeimEinlesen`, alle GAEB-Endungen plus `.xlsx`; E2E in
  `nachtrag.spec` (Endungen, Abweisungssatz, keine Zeilenangabe).
- **D-159b.6 PB2 nicht erledigt:** Der Text steht in `apps/web/src/gaeb/texte.ts` (`angebot.keinX84`), Ordner von 159a. An den
  Orchestrator gemeldet, Vorschlag: „Erwartet wird eine Angebotsabgabe (X84) als GAEB DA XML 3.1, 3.2 oder 3.3, GAEB 90 oder
  GAEB 2000; …“. Ebenso `gaeb.ts:60` (Kommentar, D-95).
- **D-159b.7 PB5** Seite „Annahmen“: Ausreißer vergleichen den EP (bei Zuschlagspositionen die Beträge), ABC-Bezug auf den
  Schätzpreis umschaltbar, Vertragsstrafe kumuliert einzutragen und aus der vorigen Rechnung vorgeschlagen, mit der Folge bei
  falscher Eingabe; Glied der Kette „Vertragsstrafe“ sagt „kumuliert“. Tests in `hilfe/annahmen.test.ts`.
- **D-159b.8 PB6** README: Einlesen DA XML 3.1–3.3, GAEB 90, GAEB 2000; Ausgabe 3.3/3.2; drei Wege der Startseite.
- **D-159b.9 PB7** `bauStandText` zieht nach `hilfe/stand.ts` (deutsches Datum, Wörter aus `hilfe/texte.ts`); `version.ts`
  (Wurzel von `src`, kein anderer Schreiber) liefert nur noch die Daten. Test `hilfe/stand.test.ts`.
- **D-159b.10 SB13** `ui/pfade.ts` erkennt Projekt, LV, LV-Stand und Auftrags-LV; `App.tsx` hat kein eigenes Muster mehr,
  `auftrag/ziel.ts`, `lv/StaendeDialog.tsx` und `projekt/LvAbschnitt.tsx` (nach dem Merge von 161 frei) bauen ihre Adressen
  über `ui/pfade.ts`.
- **D-159b.11 `ExcelBefunde`** (D-92) über `BefundeBeimEinlesen` (Zahl, Gruppen, Einzelheiten, keine Codes); für die Anzeige
  wird `ExcelBefund` in die Form `Pruefbefund` gebracht (Quelle „Excel“ gibt es nicht; gewählt ist eine Nicht-GAEB-Quelle, die
  nur die Zeilenangabe steuert). Ungenutzte Texte entfernt. E2E in `ausgabe.spec`.
- **D-159b.12 Reste** unbenutzte Starttexte (`projektname`, `angelegt`, `zumProjekt`, dazu `knopf`) entfernt;
  `auftragsLvBefehlAusfuehren` aus `@tethys/vergabe` in `auftrag/`, `kosten/`, `nachtrag/`, `hilfe/` und `rechnung/testpfad.ts`;
  `AuftragsLvSeite` mit `alleZeilen` und Kürzelhilfe (E2E in `lv-suchen.spec`); `lv-bedienung.spec` legt die Kalkulation über
  den Dialog an; E2E GAEB 2000 (`.p83`) in `gaeb.spec`; Ausnahme `createSyncAccessHandle` in der Basis-Pfad-Probe entfällt.
- **D-159b.13 Zweiter Durchgang (152/161/162), R1–R7:**
  R1 `abrechnung/Ausgabe.tsx`: Der Excel-Dialog zeigt „Die Datei konnte nicht erzeugt werden.“ mit dem nächsten Schritt aus
  `fehler/texte.ts`, nie den Ausnahmetext (wie D-159b.1; PDF über den gemeinsamen Dialog). R2 `rechnung/pruefung.ts`
  `zahlungsfreigabe(…, heute)`: „Skonto (noch nicht verwirklicht)“, solange `heute` ≤ Fristende (Fristtag eingeschlossen),
  danach „nicht verwirklicht“; `heute` aus der Uhr der App. Test in `zahlungsfreigabe.test.ts`; die E2E erwartet je nach
  Tagesdatum. Für den Druck (PA2, 159a) gilt dieselbe Regel mit dem Druckdatum als „heute“; `zahlungsfreigabe.spec.ts:341`
  erwartet im PDF noch „Skonto (nicht verwirklicht)“ und muss mit PA2 nachziehen. R3 Nach „Zahlung löschen“ geht der Fokus auf
  „Ändern …“ der nächsten Zahlung, sonst auf „Zahlung erfassen …“; die Beschriftungen nennen Datum und Betrag (E2E). R4 Text
  des Hinweises zur Vertragsstrafe. R5 Spalte „Offen“ zeigt „–“ bis zur Freigabe (E2E). R7 `historie/texte.ts` `konflikt`
  nennt den Fall und den nächsten Schritt.
- **D-159b.14 Basis-Pfad-Probe** war seit der Navigation der Welle 7 rot (Fenstertitel „Projekte – Tethys AVA“, kein Verweis
  „LV“ in der Hauptnavigation); sie geht jetzt über „Hilfe“ und läuft ohne Konsolen-Ausnahme grün.

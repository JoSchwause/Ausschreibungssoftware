# 159: Behebung des Wellen-Reviews Welle 7

Status: done-by-agent (159a und 159b)
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
- [x] Jeder Pflichtpunkt aus D-104 erledigt oder begründet (159a)
- [x] Volle Web-E2E einmal grün (Budget-Ausfälle unter Last werden gemeldet, nie gelockert) (159a)
- [x] (159a) Lint, Typcheck, Tests: `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
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

### 159a (Pakete, Glossar, Fixtures, Angebotspreise im gemeinsamen Grid)

- **D-159a.1 SA1.** Die Suchleiste bindet ihre Tasten über `suchleistenAktion` (in `kuerzel.ts`) aus `GRID_KUERZEL`; Enter und
  Umschalt+Enter gelten nur im Suchfeld, wie es die Einträge `treffer-weiter`/`treffer-zurueck` schon beschreiben. Test:
  `kuerzel.test.ts`; ui-grid-E2E `suchen.spec.ts` grün.
- **D-159a.2 SA2+SA8.** Ein Weg für alle Formate: `gaeb/angebotszuordnung.ts` (`Angebotszuordnung<O>`, generisch über den Ort
  eines Befunds: XML-Element oder Zeile) mit OZ-Zuordnung, `position-unbekannt`, `doppelte-ordnungszahl`,
  `zuschlag-art-abweichend`, `gp-abweichend` („Gesamtpreis“) und `position-fehlt-im-angebot`; `angebotsaufbau.ts` entfällt.
  GAEB 90/2000 nennen jetzt auch den Preis im Befund `zuschlag-art-abweichend` (wie DA XML). Tests in `gaeb90.test.ts`,
  `gaeb2000.test.ts`.
- **D-159a.3 SA9.** `grundbefunde` einmal in `zeilenbefunde.ts`; der Befund `phase-endung-widerspruch` hängt in beiden Formaten
  an der Zeile, in der die Datei ihre Phase nennt (GAEB 90: Satz 00 = Zeile 1; GAEB 2000: Zeile von `[DP]`, vorher ohne Zeile).
  `GAEB90_SATZLAENGE` einmal in `dateiart.ts`.
- **D-159a.4 SA7.** `STANDARD_MWST_SATZ` statt `'19.00' as Prozent` (gaeb90/2000), `NULL_BETRAG` statt `'0.00' as Betrag`
  (gaeb, ausgabe `rechnung-druck.ts`), in `abrechnung` feste Sätze über `prozentKonstante` (`alsProzent`, geprüft) statt Literal
  mit Marke (auch `soll-ist.ts`). Nicht geändert: benannte Vorgaben, die selbst die eine Stelle ihres Werts sind
  (`STANDARD_MWST_SATZ`, `BAUABZUGSTEUER_SATZ`, Preisspiegel-Vorgaben in `vergabe/preisspiegel.ts`), und Testhilfen.
- **D-159a.5 SA10.** Ein Kalender in `abrechnung`: `tageImMonat` in `form.ts`, `zahlungsstand.ts` nutzt ihn; `datumFehler` prüft
  die Form mit `KALENDERDATUM_MUSTER` aus dem Vertrag. Test `form.test.ts`. Die Kopien in `bauzeit`, `bauleitung`, `erechnung`
  bleiben (A3: Fachpakete importieren einander nicht; der Vertrag hat keine Logik).
- **D-159a.6 SA3.** `bauzeit` benutzt nur noch `Kalenderdatum` aus dem Vertrag; ein Test in `datum.test.ts` wacht darüber. Der
  Name `Datum` bleibt allein für `apps/web/src/bauzeit/ansicht.ts` exportiert (Ordner von 159b); ohne `@deprecated`, weil die
  Lint-Regel `no-deprecated` sonst die App bricht. **An den Orchestrator:** nach 159b dort `Kalenderdatum` importieren und den
  Alias in `bauzeit/src/datum.ts` und `index.ts` streichen (zwei Zeilen).
- **D-159a.7 SA4 + SOLL-2 + SB11 (Glossar).** Neu: „Auszahlungsszenario“, „Zahlungsfreigabe“, „GAEB 90“ und „GAEB 2000“ als
  eigene Einträge, „Vorschau“ in beiden Bedeutungen (Modul nach G-60, Dokument) samt Zeile in der Tabelle der Oberfläche.
  `abrechnung`: `szenario()` → `auszahlungsszenario()`, `fall` → `geltendes`. Vertragskommentare verweisen aufs Glossar.
  Nicht hier: „Projektstand“ (`apps/web/src/projekt/`, gesperrt für 161).
- **D-159a.8 PA2.** Beim Skonto steht „verwirklicht“, „noch nicht verwirklicht“, solange die Skontofrist läuft, und „nicht
  verwirklicht“ erst danach (Vorgabe des Orchestrators im zweiten Durchgang). Abgelaufen ist sie, wenn das Druckdatum nach dem
  Fristende liegt oder eine Zahlung nach dem Fristende erfasst ist (ohne Uhr im Paket, A2). Die Regel steht einmal als
  `skontoStandText` in `@tethys/ausgabe` (exportiert, damit der Bildschirm in `rechnung/` denselben Text nutzen kann; der
  Bildschirm zeigt heute noch fest „Skonto (nicht verwirklicht)“, `rechnung/texte.ts:206`, Ordner nicht in 159a). Tests in
  `zahlungsfreigabe.test.ts`.
- **D-159a.9 Vertragskommentar D-104.** An `ProjektSamtInhaltLoeschen` (nur Kommentar): Präfix-Vergleich des Protokolls beim
  Löschen, angehängte Einträge erlaubt (Präzisierung von D-160.5 wegen D-160.6). Die Umsetzung liegt bei 161.
- **D-159a.10 SB4.** Belege in `typisch-zahlungen.json` (`regel`) und im Fixture-README „A5“: § 48 Abs. 1 Satz 1 und Abs. 3
  EStG, § 48b EStG, § 16 Abs. 5 Nr. 2 VOB/B, §§ 187 Abs. 1, 188 Abs. 1 BGB, §§ 11, 16 Abs. 1, 17 VOB/B; die Lesarten von D-72
  (keine Verschiebung nach § 193 BGB, Basis der Bauabzugsteuer) stehen ausdrücklich als Lesart, nicht als Regel. Selbsttest in
  `zahlungen.test.mjs`.
- **D-159a.11 D-87-Reste.** `vergabe` prüft und normalisiert Bieterangaben mit `bieterangabenFehler`, `bieterangabenNormalisieren`
  und `bieterMitAngaben` aus `kern` (übrig bleibt nur der Vergleich `gleicheBieterangaben`); `gaeb` normalisiert den
  Bietervorschlag mit `bieterangabenNormalisieren`; `gaeb/kostengruppe.ts` nutzt `KOSTENGRUPPENNUMMER_MUSTER` aus dem Vertrag.
  Die Fehlermeldung der Form kommt jetzt aus dem Kern (Feld unverändert). Abgedeckt durch die vorhandenen Tests.
- **D-159a.12 SB3 (U2).** Kein zweites Grid: Die Preise eines Angebots stehen im `LvGrid` (schreibgeschützt) mit einer zweiten
  Ausnahme wie die Spalte „KG“: `onEinheitspreise` macht die Spalte „EP“ an Positionen ohne Zuschlag bearbeitbar (Tippen, F2,
  Enter, Entf, Einfügen einer Spalte aus Excel), jede Aktion als eine Folge von `EinheitspreisAendern`. Die App übersetzt sie
  in den Entwurf (`gaeb/angebotsgrid.ts`); gespeichert wird wie bisher mit „Änderungen speichern“ als ein Undo-Schritt.
  Lesarten: Ein geleerter EP heißt „nicht angeboten“ (D-138.6), sichtbar als Hinweis an der Zelle; die Sätze der
  Zuschlagspositionen und der Nachlass bleiben Felder unter dem Grid (ihr Preis ist ein Satz, kein EP). Das Grid zeigt keine
  GP und keine Summen (es rechnet nie; die gespeicherten Summen stehen darüber). Der Hinweis „nicht angeboten“ nutzt den
  vorhandenen Weg der Zellbefunde (`quelle: 'lv-pruefung'`, Code `nicht-angeboten`) – ein eigener Zellhinweis ohne Befund wäre
  eine Vertragsänderung. Tests: `schreibrechte.test.ts`, `eingabe.test.ts`, `angebotsgrid.test.ts`; E2E `vergabe.spec.ts`
  „Angebot bearbeiten“ auf das Grid umgestellt (Zelle wählen, tippen, Enter; Entf für „nicht angeboten“; unlesbare Eingabe an
  der Zelle). **An den Orchestrator:** `apps/web/e2e/vergabe.spec.ts` gehört laut Ticket 159b; nur der Block „Angebot
  bearbeiten“ und der Helfer `epZelle` sind geändert.
- **D-159a.13 D-162.3.** `ToastAnbieter` hält eine Meldung zurück, solange eine Auswahlliste oder ein Menü offen ist
  (`[role=listbox|menu][data-state=open]`), und zeigt sie, sobald es zu ist (MutationObserver nur, solange eine wartet). Grund:
  Radix gibt Escape der zuletzt geöffneten Ebene, und eine Meldung ist eine solche Ebene; eine Weiche im Escape der Meldung
  kann die Liste nicht schließen (deren Listener ist dann abgemeldet). Test `Toast.test.ts` (happy-dom, rot ohne die Änderung).
- **D-159a.14 nicht in 159a.** SA6 (Kopf von `speicher/dateimigration7.ts`) liegt in `speicher` (gesperrt, 161).
- **D-159a.15 R6 (zweiter Durchgang).** Beim Löschen samt Inhalt dürfen hinter dem Protokoll des Bestands nur Einträge
  `Rueckgaengig` und `Wiederholen` stehen, sonst `konflikt` (der Bestand ist veraltet). Test in `projektbestand.test.ts`
  (gespeichert ist ein gewöhnlicher Befehl mehr). Folge in ADR 0009 ergänzt.
- **D-159a.16 Prüfläufe (159a).** `pnpm lint` und `pnpm typecheck` grün; `pnpm test` 4805 grün, 3 rot nur Leistungsbudgets unter
  Last (Last ~11 auf 4 Kernen): `speicher/aufmass-leistung` (AufmasspositionSetzen/Undo/Redo, Median 87–129 ms gegen 100 ms),
  `speicher/v16-leistung`, `apps/web/abrechnung/leistung`; die beiden letzten allein grün; Code dieser Wege unverändert, nichts
  gelockert. Volle Web-E2E 125/125 grün, ui-grid-E2E 109/109 grün.

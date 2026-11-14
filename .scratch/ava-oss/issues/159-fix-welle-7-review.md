# 159: Behebung des Wellen-Reviews Welle 7

Status: claimed (159a)
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

- [ ] Jeder Pflichtpunkt aus D-104 erledigt oder begründet
- [ ] Volle Web-E2E einmal grün (Budget-Ausfälle unter Last werden gemeldet, nie gelockert)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

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

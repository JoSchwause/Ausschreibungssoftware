# 118: X2 in der App: Bauzeitenplan, Tor X2

Status: resolved
Type: task
Welle: 6 · Strang: X2 · Ordner: `apps/web/src/bauzeit/` (neu); Einhängestellen in `App.tsx`, `projekt/ProjektSeite.tsx`,
`historie/arten.ts` (markiert `// Ticket 118`, D-20); E2E `apps/web/e2e/x2.spec.ts`, Kettentest `apps/web/src/x2-kette.test.ts`
Blocked by: 96, 106, 109, 112, 113
Modell: opus
Regeln: A5, U2–U5, U7, Q2, Q5, D-57, D-58
Herkunft: `plan.md` §2 X2; Tor X2 (`plan.md` §4)

## What to build

1. **Bauzeitenpläne des Projekts** (`/projekt/<id>/bauzeit`): Liste, anlegen (Name, Projektbeginn, Arbeitskalender: Wochentage,
   Bundesland, freie Tage), umbenennen, löschen mit Bestätigung.
2. **Planseite:** `VergleichsGrid` mit Spalten Nr., Vorgang, Dauer (AT), Beginn, Ende, Gesamtpuffer und der **Balkenspalte**
   (Ticket 96; Zeitachse und Tagesindizes aus `bauzeit`, Texte de-DE in der App, N4); Sammelvorgänge als Baum; kritische
   Vorgänge gekennzeichnet; Projektende und kritischer Weg in der Kopfzeile. Vorgang anlegen/bearbeiten in einem Formular
   (Bezeichnung, Nummer, Eltern, Dauer, Terminvorgabe, Anordnungsbeziehungen mit Art und Abstand, Bezug auf LV-Knoten,
   Ist-Termine und Fortschritt) → `BauzeitenplanBefehl`; Befunde der Terminrechnung (Zyklus, Beziehung an Sammelvorgang,
   unbekannter Vorgänger) im Prüfpanel mit Sprunglink (U5). Undo/Redo (Tabelle `historie/arten.ts`), automatisch speichern.
3. **PDF** des Plans über `ausgabe` (Ticket 113), Dialog wie die übrigen Drucke.
4. **Tor X2** (D-58): `x2.spec.ts` legt den Plan aus `fixtures/bauzeit.json` (Ticket 112) über die Oberfläche an → kritischer Weg
   und Endtermin = Soll → Neuladen → PDF erzeugt (Seitentext enthält Projektende); `x2-kette.test.ts` rechnet denselben Plan ohne
   Oberfläche gegen alle Sollwerte. Dreimal grün; sonst Kettentest plus verkürzte E2E (D-58).

Hinweis aus Ticket 96 (D-96.x): Ein langer Monat verliert beim waagerechten Scrollen seine Beschriftung unter den fixierten
Spalten (KW bleiben lesbar). Ist das in der App störend, als kleines Folgeticket für `ui-grid` melden, nicht selbst ändern.

Aus Ticket 97 (D-64): Ein unbekannter Vorgänger ist ein Fehler des Ausführers (das Formular lässt ihn nicht zu), kein Befund;
das Ergebnis heißt `Bauzeitenplanergebnis`.

## Grenzen

- Terminrechnung steht in `bauzeit`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Unit-Tests der App-Logik, `x2.spec.ts` und `x2-kette.test.ts` grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-118.1 Prüfnähte.** (1) `bauzeit/pfad.ts` (Route, Ziel nach Undo/Redo), (2) `bauzeit/befehle.ts` (Formularfelder in de-DE →
  `BauzeitenplanAnlegen`/`…kopfSetzen`/`VorgangSetzen`, Feldfehler, Lage, Rückfrage beim Entfernen), (3) `bauzeit/ansicht.ts`
  (Plan + `Bauzeitenplanergebnis` → Spalten, Zeilen, Balken, Kopfzeile, Befunde; gegen `fixtures/bauzeit.json`), (4) Kettentest
  `x2-kette.test.ts` (echter Speicher, Wege der App), (5) E2E `x2.spec.ts`. Grund: das sind die Stellen mit Logik; die React-Seiten
  deckt die E2E ab. Im autonomen Lauf ohne Rückfrage festgelegt. Reversible: yes.
- **D-118.2 Vorgänger nur wählbar.** Anordnungsbeziehungen sind Zeilen aus Auswahl (Vorgänger aus dem Plan), Auswahl (Art) und
  Abstand; ein unbekannter oder fehlender Vorgänger ist ein Feldfehler und kommt nie in einen Befehl (D-64). Ein Zyklus bleibt
  erlaubt und erscheint als Befund (U5). Leerer Abstand = 0.
- **D-118.3 Lage beim Setzen.** Neuer Vorgang: hinter dem letzten Geschwister unter dem gewählten Sammelvorgang. Bearbeiten ohne
  Wechsel des Elternteils behält den Platz; mit Wechsel hinten an. Verschieben innerhalb einer Ebene bietet die App in v1 nicht
  (Folgeticket, falls gewünscht).
- **D-118.4 Rückfrage (Q5).** „Vorgang entfernen“ fragt nur, wenn Untervorgänge oder Anordnungsbeziehungen anderer Vorgänge
  mitgehen (Lesart an `VorgangEntfernen`); „Bauzeitenplan löschen“ fragt immer. Beides per Undo umkehrbar.
- **D-118.5 Ansicht.** Achse ab dem gerechneten Projektbeginn (sonst 7 Tage vor dem ersten Termin) bis 7 Tage nach dem letzten
  Termin/Ist-Termin, 18 px je Tag; Monate oben, KW unten, freie Tage aus `zeitachseBerechnen`, Markierung „Projektende“ am Schluss
  des letzten Tags. Kritisch: Kennzeichen „K“ (Beschreibung „kritisch“) an der Vorgangszelle plus Balken `kritisch`. Meilenstein:
  Dauer „Meilenstein“ mit Tooltip `BAUZEIT_ANNAHMEN.meilenstein` (D-63). Ohne Termine (Zyklus) Striche. Kritischer Weg in der
  Kopfzeile über Nummern (sonst Bezeichnung), mehrere Wege durch „;“ getrennt. Befunde in einem eigenen Panel der Seite (das
  LV-Prüfpanel trägt LV-Texte), je Schwere; der Sprunglink klappt Sammelvorgänge über dem Ziel auf und fokussiert die Zeile.
- **D-118.6 Dateiname des PDF.** `Bauzeitenplan <Name>.pdf`, bereinigt mit `dateinameSauber`. Headless-Chromium dieser
  Testumgebung meldet Blob-Downloads mit Umlaut im Namen als „download“ (Minimaltest: „Grün.pdf“ → „download“, „Gruen.pdf“
  bleibt); die E2E prüft den Namen im Dialog und lässt beim Download beide Formen zu. Kein Fehler der App.
- **D-118.7 Fortschrittsvorschlag (D-109.7) nicht umgesetzt.** Das Formular nimmt Ist-Termine und Fortschritt von Hand; der
  Vorschlag aus dem Leistungsstand (`fortschrittVorschlagen`) braucht Auftrags-LV, Aufmaßblätter und eine Rechnungsart für
  `leistungsstandBerechnen` und ist ein kleines Folgeticket. Bezug wählbar: ganzes LV oder Auftrags-LV; ein Bezug auf einzelne
  Knoten bleibt beim Bearbeiten erhalten (Anzeige „ausgewählte Knoten“), wird hier aber nicht neu gewählt.
- **D-118.8 Sitzung je Seite.** Die Planseite hält eine `Sitzung` und liest sie mit `useSyncExternalStore`; Undo/Redo lädt neu und
  schreibt den Stand in dieselbe Sitzung, damit kein Befehl auf einem alten Stand läuft. Neue Abhängigkeit `@tethys/bauzeit` in
  `apps/web/package.json` (Paketgrenze erlaubt, Ticket 102).

### Ergebnis (Branch `welle-6/118-web-bauzeit`)

Neu in `apps/web/src/bauzeit/`: `pfad.ts`, `texte.ts`, `befehle.ts`, `ansicht.ts`, `schreiben.ts`, `KopfFelder.tsx`,
`BauzeitListeSeite.tsx`, `BauzeitenplanSeite.tsx` (Grid mit Balkenspalte, Kopfzeile, Befundpanel, Kopfformular, Bestätigungen),
`VorgangDialog.tsx`, `PlanDrucken.tsx` + `pdf-worker.ts` (`erzeugeBauzeitenplanPdf` im Worker), `bauzeit.css`. Tests: `pfad.test.ts`
(3), `befehle.test.ts` (12), `ansicht.test.ts` (8), `apps/web/src/x2-kette.test.ts` (1), `apps/web/e2e/x2.spec.ts` (2).
Einhängestellen `// Ticket 118` in `App.tsx`, `projekt/ProjektSeite.tsx` (Knopf „Bauzeitenpläne“) und `historie/arten.ts`
(Umkehrung aus `bauzeit`, Ziel `bauzeitZiel`).

### Tor X2 (D-58)

- `x2-kette.test.ts` grün: Plan aus de-DE-Feldern über die Befehle der App und den echten Speicher → neu geladen → Projektbeginn
  02.11.2026, Projektende 24.11.2026, alle 8 Vorgänge (Art, Beginn, Ende, späte Lage, beide Puffer, kritisch), kritischer Weg
  1.1 → 1.2 → 1.3 → 2 → 3 und keine Befunde = Soll; dazu Kopfzeile, PDF-Modell (Projektende), Undo/Redo und die Gegenprobe ohne
  Land (23.11.2026). Per Mutation geprüft (Bundesland weg → rot).
- `x2.spec.ts` dreimal hintereinander grün (je 2/2; Tor-Test 11,7 s / 8,8 s / 9,3 s), nicht wackelig: Anlegen über die Oberfläche →
  Projektende, kritischer Weg und je Vorgang Beginn/Ende/Gesamtpuffer = Soll → Neuladen = Soll → PDF erzeugt, der Seitentext
  enthält „Projektende 24.11.2026“. Zweiter Test: Zyklus als Befund, Sprunglink, Rückgängig/Wiederholen, Entfernen mit Rückfrage,
  Plan löschen mit Bestätigung und Undo.
- **Urteil Tor X2: bestanden** mit der vollen E2E; die Kürzung nach D-58 war nicht nötig.
- Nachbar-E2E nach dem Merge: `projekt.spec`, `undo.spec` und `kosten.spec` grün (10/10).

### Prüfung (nach `git merge integration/welle-6`, Stand `f332ed7`)

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`: grün. `pnpm typecheck`: grün.
- `pnpm test`: Vitest 294 Dateien grün, 1 übersprungen; 3.789 Tests grün, 3 übersprungen. **2 Tests rot, beide CPU-Budgets
  fremder Dateien** unter Last ≈ 14 (8 Agenten auf 4 Kernen): `packages/speicher/src/aufmass-leistung.test.ts` und
  `apps/web/src/abrechnung/leistung.test.ts`. Allein wiederholt (`--no-file-parallelism`) sind beide grün. Kein Budget angefasst.
  `node --test "fixtures/*.test.mjs"`: 53/53 grün.
- Hinweis aus Ticket 96 (Monatsbeschriftung unter fixierten Spalten): Bei 18 px/Tag und kurzen Plänen stört das nicht; kein
  Folgeticket gemeldet.

## Answer

Gemergt mit `e4060cb` (Branch `welle-6/118-web-bauzeit`, `52391fa`). **Tor X2 erreicht:** `x2.spec.ts` dreimal grün, `x2-kette.test.ts` = alle Sollwerte (Projektende 24.11.2026, kritischer Weg 1.1 → 1.2 → 1.3 → 2 → 3); im Integrationslauf erneut grün. Offen: Fortschritt aus dem Leistungsstand nicht in der Oberfläche (D-118.7), Verschieben eines Vorgangs (D-118.3).

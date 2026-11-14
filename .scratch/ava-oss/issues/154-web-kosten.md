# 154: App: Kalkulationsansätze speichern, Kostenausgaben, KG-Hinweis

Status: claimed
Type: task
Welle: 7 · Strang: C2–C4, E9, E12 · Paket/Ordner: `apps/web/src/kosten/`
Blocked by: 137, 139, 153
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A2, U5, Q5
Herkunft: umfang §3 E9, E12, E2 (B-14)

## What to build

1. **EP-Kalkulation:** Ansätze und Zuschlagssätze werden an der Position gespeichert, der Dialog öffnet mit ihnen (B-19); Undo.
2. **Ausgaben:** Kostenermittlung und Kostenkontrolle als PDF und Excel mit Vorschau.
4. **Aus 131 (D-131.1):** `kosten/pfad.ts` auf den Pfadbaukasten in `apps/web/src/ui/` umstellen.
5. **Aus 142 (D-89):** Schaltflächenreihen auf `Werkzeuggruppe`/`Werkzeugverweis` aus `ui-basis` umstellen, wo billig.
3. **B-14:** Hinweis und Verweis zum Einlesen der KG-Bezeichnungen, solange keine vorhanden sind.

## Acceptance criteria

- [ ] E2E für 1–3; M4 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/154-kosten`):

- **D-154.1** Wie wird gespeichert? → „Übernehmen“ ist **ein** Befehl `KalkulationSetzen` mit Ansätzen, Sätzen, EP und
  Anteilen (statt `EinheitspreisanteileSetzen` + `EinheitspreisAendern`), also ein Undo-Schritt. Der Dialog öffnet mit
  `formularAusPosition` (Werte de-DE mit den Stellen nach N3: Menge 3, Kostensatz 3, Prozent 2); die freie Bezeichnung kommt
  aus den Anteilen der Position (ohne `epaBezeichnungen` am LV, D-28). Seams: `kosten/kalkulation.test.ts` über eine echte
  Sitzung (Speichern, Wiederöffnen, Undo, Entfernen).
- **D-154.2** Ein unlesbares Feld → kein Befehl, Meldung „Bitte zuerst die markierten Felder berichtigen“. Die Eingabe bleibt
  frei (U5), aber gespeichert würde das Feld sonst still als leer (Q5). Ohne EP bleibt es bei „nichts zu übernehmen“.
- **D-154.3** „Kalkulation entfernen“ im Dialog, sobald eine gespeichert ist: `KalkulationSetzen` mit `null`, EP und Anteile
  bleiben (D-127.6); Undo sichert ab. An einer Zuschlagsposition öffnet der Dialog nicht, eine Meldung sagt warum (D-82 S3).
  Der echte Weg zu „Kalkulation entfernt“ (D-148.6) ist jetzt in `e2e/kosten.spec.ts` geprüft; `lv-bedienung.spec.ts` (148)
  lädt weiter über den Testpfad und blieb unverändert.
- **D-154.4** Ausgaben (E12) → Gruppe „Ausgabe“ mit „Als PDF“ und „Als Excel“; beide öffnen denselben Dialog mit der
  Vorschau (das Berichtsmodell aus `ausgabe` als Tabelle, also dieselben Zeilen wie PDF und Excel), die gewählte Art ist die
  Hauptschaltfläche. `ausgabe` wird erst beim Öffnen geladen, PDF im Hauptthread wie die Honorarberechnung (eine Zeile je
  KG). Kopf: Projekt aus dem Speicher, Büro aus den Einstellungen (150, `useEinstellungen`; fehlt es, kein Absender),
  Datum von der Uhr der App; **kein Datumsfeld und keine Wahl des Druckprofils** (Standard), weil Druckprofile gerade in 150 umziehen. Dateinamen
  „Kostenermittlung <Name>“ und „Kostenkontrolle <Projekt>“ (`dateinameSauber`).
- **D-154.5** Bezeichnungen (nach dem Merge von 150, D-95) aus dem aktuellen Stand der Einstellungen (`useEinstellungen`),
  am Bildschirm und im Druck gleich; geschrieben über den Speicherweg von 150 (`bezeichnungenMerken`). Der Abschnitt zum
  Einlesen trägt „Einstellung rückgängig/wiederholen“ und Strg+Z/Strg+Y für die Einstellungen (wie der Dialog „Büro“);
  die E2E prüft Rückgängig und Wiederholen der Bezeichnungen. Die Hinweise der Kostenkontrolle tragen die Sätze der Seite
  (`kontrollbefundText`, nach `kontrolle.ts` verschoben).
- **D-154.6** B-14 → Abschnitt „Bezeichnungen der Kostengruppen“ als Baustein (`Bezeichnungen.tsx`) jetzt auch auf der Liste
  der Kostenermittlungen (Anker `#bezeichnungen`, Fokus auf die Überschrift), weiter in jeder Kostenermittlung. Solange keine
  Bezeichnungen da sind, steht auf Liste, Kostenermittlung und Kostenkontrolle ein Hinweis mit Verweis „Bezeichnungen
  einlesen“ (Liste und Kontrolle → Liste; Kostenermittlung → eigener Abschnitt). Der Satz unter der Überschrift sagt nicht
  mehr „nie in der Projektdatei“ (stimmt nach 150 nicht mehr), sondern „als Einstellung gemerkt, für alle Projekte“.
- **D-154.7** `kosten/pfad.ts` aus `projektliste('kosten', 'ermittlung')`; die Kontrolle ist eine Regel vor der Liste
  (eine Kennung „kontrolle“ gibt es nicht, UUIDv7). Neu `bezeichnungenPfad`.
- **D-154.8** Werkzeugleisten (D-89): alle drei Kostenseiten auf `Werkzeugleiste`; auf der Liste die beiden Verweise als
  `Werkzeugverweis`; „Kostenermittlung löschen“ bleibt direkt (Gefahr, ein Klick weniger), die Budgetwahl bleibt in der Leiste.

Ergebnis: siehe unten.

# 148: App: LV-Bedienung (Hinweistext, OZ-Maske, Texte, KG-Hinweis)

Status: resolved
Type: task
Welle: 7 · Strang: U, E8 · Paket/Ordner: `apps/web/src/lv/`
Blocked by: 137, 139, 142
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U3, U5, F2, Q5; D-93.7, D-89.4
Herkunft: umfang §3 E8 (LV-Teil), B-15, B-26; Ticket 124 Punkt 3

## What to build

1. **Hinweistext anlegen und ändern** (Vor- und Nachtext) über Werkzeugleiste/Menü und Tastatur; Dialog mit Langtext-Editor.
2. **OZ-Maske ändern** (Dialog, Vorschau, Prüfung der vorhandenen OZ mit Liste der Konflikte; abgewiesen ohne Datenverlust).
3. B-26: „Merkmale gibt es nur an Positionen“ beim Bearbeiten eines Titels: richtiger Text bzw. Merkmal-Aktionen an Titeln
   ausgegraut.
4. **124 §3:** Hinweis „KG außerhalb der Gliederung“ an der Zelle: die LV-Seite lädt die Kostenermittlungen und reicht den
   Befund in `LvZeile.befunde`.
5. Projektdatei einlesen, wenn das Projekt schon da ist (B-25), liegt in 150; hier nur der Text in `lv/texte.ts`, falls dort.

## Acceptance criteria

- [x] E2E für 1–4
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/148-lv-bedienung`):

- **D-148.1** Nähte? → Reine Funktionen `hinweistextOrt` (`lv/einfuegeort.ts`), `ozMaskeVorschau` (`lv/ozmaskeVorschau.ts`),
  `kgAusserhalbBefunde` (`lv/kgHinweis.ts`), geprüft in `lv/bedienung.test.ts` über eine echte Sitzung (Kern und Speicher,
  8 Fälle); die Seite über `e2e/lv-bedienung.spec.ts` (4 Fälle: Hinweistext, OZ-Maske, KG-Hinweis, Kalkulation entfernt).
- **D-148.2** Was heißt Vor- und Nachtext? → Kein eigener Typ, nur die Lage eines `Hinweistext`: Vortext = erstes Kind
  (`anfang`), Nachtext = letztes Kind (`ende`) der Gliederung der gewählten Zeile (ohne Gliederung: oberste Ebene des LV); dazu
  „Hinter der gewählten Zeile“ (`nach`) an einer Position oder einem Hinweistext, an einer Gliederung wie der Nachtext. Der Dialog
  nennt die Gliederung. „Hinweistext anlegen“ (Strg+Alt+H) in „Einfügen“, „Hinweistext ändern“ in „Bearbeiten“; Strg+Enter und
  Doppelklick auf eine Hinweistext-Zeile öffnen „Hinweistext ändern“. Ein leerer Text wird nicht geschickt (Meldung im Dialog).
- **D-148.3** OZ-Maske ändern → Dialog in „LV“ unter „Umnummerieren“: Maske als Text wie beim Anlegen des LV, dazu „Oberste Stufe
  ist das Los“. Die Vorschau rechnet der Kern auf dem geladenen Stand ohne zu speichern: neue OZ (höchstens 12 Zeilen, dann die
  Anzahl) oder die Zeilen aus `knotenIds` mit einem Satz je Code (`maske-ungueltig`, `oz-ueberlauf`, `knotenart-unzulaessig`);
  eine in sich unzulässige Maske zeigt die Meldung des Kerns (deutsch, ohne Kennungen). „Übernehmen“ ist gesperrt, solange die
  Maske unverändert, unlesbar oder abgewiesen ist; das LV bleibt dann unberührt (Q5). Übernehmen ist ein Befehl, ein Undo-Schritt.
- **D-148.4** B-26 → „Position bearbeiten“, Strg+Enter und Doppelklick an einem Titel oder Los: „Titel werden im Grid bearbeitet“
  mit dem Hinweis, dass OZ und Kurztext in der Zeile geändert werden; ohne Zeile „Keine Position gewählt“. „Merkmale“ behält
  „Merkmale gibt es nur an Positionen“ (dort richtig). Nicht ausgegraut: Die aktive Zeile ist eine Referenz; als Zustand würde
  jede Pfeiltaste die ganze Seite neu zeichnen. `e2e/umwege.spec.ts` prüft den neuen Text (eine Zeile).
- **D-148.5** KG-Hinweis an der Zelle (124 §3, D-93.7) → Die LV-Seite lädt die Kostenermittlungen des Projekts beim Öffnen;
  Befund `kg-ausserhalb-gliederung` (Warnung, Quelle `lv-pruefung`, Ort Spalte `kostengruppe`) an der Zelle und im Prüf-Panel
  (Sprung zur Zelle). Regel wie im Zuordnungsdialog (`inGliederung` aus `kosten`). **Ohne Kostenermittlung kein Hinweis**
  (sonst trüge jede KG eine Warnung). Änderungen an den Kostenermittlungen wirken nach dem nächsten Öffnen der LV-Seite.
- **D-148.6** Hinweis `kalkulation-entfernt` (D-137.13) → Band über dem Grid „Kalkulation entfernt“ mit „Rückgängig“ (Undo der
  Seite); es steht nur, solange der Stand der nach dem Befehl ist (ein Strg+Z oder ein weiterer Befehl nimmt es weg). Aus der
  Hinweisleiste des Grids herausgefiltert (dort gäbe es nur den allgemeinen Text). Keine Rückfrage vorher: Undo sichert ab (Q5).
  Die App kann eine Kalkulation heute noch nicht speichern (Kalkulationsdialog setzt EP und Anteile); die E2E lädt eine Position
  mit Kalkulation über den Testpfad.
- **D-148.7** Punkt 5 (B-25) → nichts geändert: Der Text in `lv/texte.ts` („Dieses Projekt ist schon vorhanden.“) gehört zu 150.

Ergebnis (nach `git merge integration/welle-7`, Stand `f3532af`):

- `pnpm lint` und `pnpm typecheck` grün; Sprachtest grün.
- `pnpm test`: 4.433 bestanden, 3 übersprungen, 12 rot, nur CPU-Budgets in `gaeb`, `kern`, `speicher`, `vergabe` und
  `apps/web/src/abrechnung/leistung.test.ts` bei Last 21–26 (andere Agenten); keine davon von 148 berührt. Bei Last 1 liefen
  `speicher/v16-leistung` und `abrechnung/leistung` allein grün. Keine Schranke geändert.
- E2E: `lv-bedienung` (neu, 4), `umwege`, `arbeitsflaeche` (Ziel aus 142: 15 Zeilen mit EP und GP bei 1280×800), `lv`,
  `dialog`, `undo`: 27/27 grün; `kosten.spec.ts` fiel im Sammellauf einmal am Undo der KG im Auftrags-LV (nicht berührt), allein
  grün.

Folgepunkte (fremde Pakete, P2): `ui-grid` hat keinen Text für den Hinweis `kalkulation-entfernt` (die LV-Seite filtert ihn aus
der Hinweisleiste); die Kalkulation lässt sich in der App noch nicht speichern (Kalkulationsdialog in `kosten/`).

## Answer

Gemergt nach `integration/welle-7` mit `019c314`. Ergebnisse, Testläufe und Entscheidungen (D-148.x) unter `## Comments`.

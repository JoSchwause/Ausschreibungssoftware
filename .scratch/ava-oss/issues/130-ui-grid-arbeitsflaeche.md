# 130: `ui-grid`: Spaltenbreiten, OZ-Breite, Höhe, Kürzeltabelle

Status: claimed
Type: task
Welle: 7 · Strang: U · Paket/Ordner: `packages/ui-grid`
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U1–U3, Q4, U6; D-93
Herkunft: umfang §3 E3 (Grid-Teil), B-07, B-09 (Kürzeltabelle), Ticket 123 Punkt 6

## What to build

1. **OZ-Spalte** so breit wie die längste OZ der Maske samt Index (Eingabe: Maske oder längste OZ; Messung über Zeichenzahl
   und Schriftmaß, kein DOM-Messen je Zeile). `001.001.00101` und `001.001.0010A` sind unterscheidbar.
2. **Spaltenbreiten** per Maus (Ziehgriff im Kopf) und Tastatur (z. B. Alt+Umschalt+Pfeil links/rechts auf der Kopfzelle oder
   der aktiven Spalte; im Ticket festhalten) änderbar; je Grid gemerkt über einen Schlüssel, den der Aufrufer gibt (Speicherung
   über eine Rückruf-Schnittstelle, Standard `localStorage` mit try/catch). Ersetzt die feste `SPALTENBREITE` (`tabelle.ts:17`).
3. **Zahlen nie abgeschnitten:** Mindestbreite der Zahlenspalten aus dem längsten formatierten Wert (z. B. `12.345.678,012`);
   bei zu wenig Platz Ellipse nur in Textspalten.
4. **Grid füllt die restliche Höhe** des Elternelements (Flex/`height:100%`), virtualisiert wie bisher; Summenfuß bleibt sichtbar.
5. **Kürzeltabelle:** eine exportierte Tabelle (Taste, Beschreibung de-DE, Bereich), aus der `navigation.ts`/`LvGrid` die Kürzel
   bindet; die App erzeugt daraus die Hilfeseite (147). Kein zweites Verzeichnis.
6. **123 Punkt 6:** die KG-Ausnahme an einer Stelle statt in fünf Dateien; `Einfuegeplan`/`Kostengruppenplan` teilen ihren Kern.
7. Bildschirm-/E2E-Tests der `ui-grid`-Prüfstände anpassen; Leistungsbudgets (5.000/10.000 Zeilen) unverändert grün.

## Acceptance criteria

- [ ] Unit- und Prüfstand-E2E für 1–5 (`pnpm --filter @tethys/ui-grid e2e`)
- [ ] App-Verbraucher (LV, Auftrags-LV, Preisspiegel, Aufmaß, Kosten, BIM-Baum) bauen und ihre E2E bleiben grün; App-Anpassung
  nur, wo die Schnittstelle es erzwingt (Ordnerbesitz bleibt bei 142)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-130.1** Nähte? **Reine Funktionen per Vitest: `spaltenbreiten.ts` (`mindestbreiten`, `wirksameBreiten`,
  `geaenderteBreite`, `gemerkteBreitenLesen`), `kuerzel.ts` (`kuerzelAktion`, `GRID_KUERZEL`, `NAVIGATIONSTASTEN`),
  `klappAbsicht`; das `LvGrid` über den Prüfstand (`e2e/arbeitsflaeche.spec.ts`, 11 Fälle; neue Parameter `breit`, `maske`,
  `merken`, `ohnehuelle`).** Mutation: ohne Mindestbreiten aus dem Inhalt fallen 3 der 4 Inhaltsfälle. Reversible: yes.
- **D-130.2** Wie wird gemessen, ohne das DOM je Zeile? **Schriftmaß je Zeichenklasse in em (Ziffer 0,64, Satzzeichen 0,36,
  Großbuchstabe 0,8, M/W 1,0; 13 px) plus 23 px Zellrand; die OZ aus der Maske als breitestes Muster (Ziffer „0“, sonst „W“,
  Index ohne Trenner dahinter), mindestens die längste OZ der Zeilen; je Zahlenspalte wird nur der längste gespeicherte Wert
  formatiert (feste Nachkommastellen, N3). Platz für Warnzeichen (16 px) bzw. Σ (27 px) nur, wenn eine Zeile ihn braucht.**
  Grund: ein Durchlauf ohne Layout; im Zweifel etwas zu breit. Reversible: yes.
- **D-130.3** Breite der OZ-Spalte ohne gezogene Breite? **So breit wie ihr Inhalt (nicht mehr 112 px); der Kopf zeigt „OZ“,
  Name und Tooltip bleiben „Ordnungszahl“ (`SPALTENKOPF`).** Grund: Bei kurzer Maske würde „Ordnungszahl“ sonst gekürzt.
  Reversible: yes.
- **D-130.4** Tastatur für die Breite? **Alt+Umschalt+Pfeil rechts/links in einer beliebigen Zelle der Spalte (Schritt 16 px),
  Alt+Umschalt+Pos1 zurück zur Standardbreite; Ansage „Spalte Menge: 140 Pixel breit.“. Der Ziehgriff ist nur für die Maus
  (`aria-hidden`, Doppelklick = Standardbreite), damit der Name der Kopfzelle bleibt.** Alt+Umschalt+Pfeil klappt im LV-Grid
  nicht mehr (Alt+Pfeil weiter), im Vergleichsgrid unverändert. Reversible: yes.
- **D-130.5** Grenzen? **OZ und Zahlen nie unter der Breite ihres Inhalts, sonst mindestens 40 px, höchstens 800 px. Gemerkt
  werden nur Spalten, die der Nutzer geändert hat**, damit neue Inhalte (längere Zahl) weiter wirken. Reversible: yes.
- **D-130.6** Merken? **`spaltenbreitenSchluessel` (ohne Standard: ohne Schlüssel gilt die Breite, solange das Grid steht) und
  `spaltenbreitenSpeicher` (`{ lesen, schreiben }`); Standard `localStorage` unter `tethys.grid.spaltenbreiten.<Schlüssel>`, alle
  Zugriffe in try/catch, gelesene Werte geprüft.** Die App gibt noch keinen Schlüssel und keine `ozMaske` (Ordner von 142, keine
  erzwungene Änderung): **Folgepunkt für 142**: `spaltenbreitenSchluessel` je Seite (z. B. `lv`, `auftrags-lv`, `lv-stand`) und
  `ozMaske={lv.ozMaske}` setzen. Reversible: yes.
- **D-130.7** Höhe? **`.tx-grid` mit `flex: 1 1 auto`, `height: 100%` und jetzt `box-sizing: border-box` (vorher ragte das
  Grid um seinen Rahmen, 2 px, aus der Hülle); Hinweise, Status und Summen `flex: none`.** Getestet in einer Hülle mit fester
  Höhe und als direktes Flex-Element, bei 1280×800 (≥ 15 Zeilen) und 1280×420 (Summen ganz im Fenster). Reversible: yes.
- **D-130.8** Kürzeltabelle? **`GRID_KUERZEL` (exportiert): je Eintrag `aktion`, `taste` und `beschreibung` in Worten, `bereich`
  (Überschrift der Hilfe: Navigation, Auswahl, Bearbeiten, Zeilen, Zwischenablage, Gliederung, Spalten), `gilt` (`alle` oder
  `lv`) und die Tastenmuster; der erste passende Eintrag gilt. `LvGrid` schaltet nur über `kuerzelAktion`; `klappAbsicht` und
  `NAVIGATIONSTASTEN` kommen aus der Tabelle; das Vergleichsgrid bindet Strg+C, Strg+A, Klappen und Navigation daraus. Strg+V
  steht drin (gebunden über das Einfügen-Ereignis). Die Tastentabellen der README sind durch einen Verweis ersetzt.** Grund:
  kein zweites Verzeichnis (147 erzeugt die Hilfeseite, 156 ergänzt Kürzel). Reversible: yes.
- **D-130.9** KG-Ausnahme an einer Stelle? **`schreibrechte.ts`: bearbeitbare Spalten, Ausgänge `eingabe`/`folge` (ersetzen die
  zwei `aenderung ? … : kgAusnahme?.()`), Ansage im Schreibschutz und `eingabeart` je Spalte (Tastatur, Hinweis zur Form);
  `nimmtEingabe` in `eingabe.ts` ist die eine Bedingung „KG nur mit Lesefunktion“ (auch für `planeEinfuegen`). `Editor` und
  `Zeile` verzweigen nicht mehr auf „KG“. `Einfuegeplan` und `Kostengruppenplan` sind `Plan<B>` mit gemeinsamem Sammler.**
  Übrig bleibt Spaltensemantik (Lesen in `befehlAusEingabe`, Einfügen einer Spalte in „KG“). Reversible: yes.
- **D-130.10** Neuzeichnen beim Ziehen? **Raster und Mindestbreite der Zeilen kommen aus CSS-Variablen am Scrollbereich
  (`--tx-grid-vorlage`, `--tx-grid-breite`), nicht mehr als Eigenschaft je Zeile**: Eine Breitenänderung zeichnet die
  memoisierten Zeilen nicht neu. Reversible: yes.
- **D-130.11** Vergleichsgrid? **Keine ziehbaren Breiten** (B-07 betrifft das LV-Grid; dort setzt die App die Breiten). Reversible: yes.

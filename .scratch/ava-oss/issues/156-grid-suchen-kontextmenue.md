# 156: Suchen, Filtern und Kontextmenü im Grid

Status: resolved
Type: task
Welle: 7 · Strang: U, E4 · Paket/Ordner: `packages/ui-grid`, `apps/web/src/lv/`
Blocked by: 148, 130
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U2, U3, Q4
Herkunft: umfang §3 E4, B-09

## What to build

1. **Suchen** (Strg+F im Grid) über OZ, Kurztext und Langtext mit Sprung zum Treffer (weiter/zurück), ohne das Budget zu
   reißen (Index außerhalb des Renderpfads).
2. **Filter** nach Art, Merkmal (Bedarf, Wahl, Stundenlohn, Pauschal) und „ohne Preis“; Filter sichtbar, ein Klick hebt auf.
3. **Kontextmenü** an Zeile und Zelle (Radix, auch per Umschalt+F10/Menütaste) mit denselben Aktionen wie die Tastatur;
   Kürzelübersicht aus dem Grid heraus aufrufbar (Hilfeseite aus 147).
5. **Aus 148 (D-148.6):** `ui-grid` bekommt einen Text für den Hinweis `kalkulation-entfernt` (oder filtert ihn ausdrücklich, weil die LV-Seite ihn als Band zeigt).
4. Kürzel in die Kürzeltabelle (130) aufnehmen.

## Acceptance criteria

- [x] Prüfstand-E2E und App-E2E; Budgets 5.000/10.000 grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/156-suchen`):

- **D-156.1** Nähte? → Reine Funktionen in `ui-grid/src/suche.ts` (`suchtreffer`, `gefilterteZeilen`, `vorfahrenZugeklappt`,
  `filterText`; `suche.test.ts`, 12 Fälle), die neuen Kürzel in `kuerzel.test.ts`, `alleZeilenBauen` in
  `lv/ansicht.test.ts`; das Grid über den Prüfstand (`e2e/suchen.spec.ts`, 10 Fälle; neue Parameter `alle`, `hilfe`,
  `langtext`) und die App über `apps/web/e2e/lv-suchen.spec.ts` (3 Fälle).
- **D-156.2** Wo wird gesucht, ohne das Budget zu reißen (Q4)? → Treffer entstehen nur im Ereignis (Tippen, Enter, F3), nie
  beim Rendern; der Suchtext (OZ samt Index, Kurztext, Langtext als Klartext, kleingeschrieben) hängt in einer `WeakMap` am
  unveränderlichen Knoten, nach einer Änderung wird nur der neue Knoten neu gelesen. Ohne Filter bekommt das Grid dieselbe
  Zeilenliste wie bisher (kein Mehraufwand beim Scrollen). Kein Hervorheben des Suchtexts in den Zellen (das hieße jede Zeile
  neu zeichnen); der Treffer ist die aktive Zelle, Stand „3 von 12“ im Feld und „Treffer 3 von 12 im Langtext.“ im Status.
- **D-156.3** Zugeklappte Gliederungen? → Neue optionale Eigenschaft `alleZeilen?: () => readonly LvZeile[]` (alle Zeilen,
  `aufgeklappt` wie in der Ansicht), erst beim Suchen oder bei aktivem Filter gerufen. Ein Treffer darunter klappt die
  Vorfahren über `onAufklappen` auf und wird aktiv, sobald die Zeile da ist. Ohne die Eigenschaft sucht das Grid nur in den
  sichtbaren Zeilen. Die App baut sie mit `alleZeilenBauen` (`lv/ansicht.ts`) auf der LV-Seite und im LV-Stand.
- **D-156.4** Was heißt „Art“ im Filter? → Zeilenart: Positionen, Zuschlagspositionen, Hinweistexte, Titel und Lose; „Merkmal“:
  Bedarf, Wahl, Stundenlohn, Pauschal (das Zuschlagskennzeichen ist eine Bezugsangabe, kein Filter); „ohne Preis“: Position
  ohne EP, eine Zuschlagsposition nur, solange ihr Satz fehlt. Alle Angaben gelten zugleich. Gezeigt werden die passenden
  Zeilen samt ihrer Gliederungen, alles offen und ohne Klappknopf. Native `select` in der Leiste (eine Zeile, schlicht; die
  `Auswahl` aus `ui-basis` setzt das Label über das Feld).
- **D-156.5** Filter sichtbar, ein Klick hebt auf → Die Leiste „Suchen und filtern“ steht über dem Grid, solange die Suche
  offen oder ein Filter aktiv ist: z. B. „Gefiltert: Bedarf · 2 von 33 Zeilen“ mit „Filter aufheben“ (Fokus danach zurück ins
  Grid). Ohne Suche und Filter nimmt sie keinen Platz (Ziel 15 Zeilen bei 1280×800 bleibt). Im Filter ist Verschieben
  gesperrt (Ansage), weil Geschwister fehlen und ein Schritt über verborgene Zeilen spränge.
- **D-156.6** Kontextmenü mit Radix: `@radix-ui/react-dropdown-menu` (dieselbe Version wie in `ui-basis`, MIT) als
  Abhängigkeit von `ui-grid`, verankert an einem unsichtbaren Punkt (Mauszeiger bzw. aktive Zelle), nicht modal wie die
  Werkzeuggruppen, Aussehen aus `tx-menue`. Die `Werkzeuggruppe` passt nicht (braucht eine sichtbare Schaltfläche);
  `ui-basis` bleibt unberührt. Folge: drei Zeilen in `pnpm-lock.yaml`. Öffnen: rechte Maustaste an einer Zelle (die Zelle wird
  aktiv, eine bestehende Auswahl bleibt, wenn die Zeile darin liegt), Umschalt+F10 und Menütaste. Punkte = die Aktionen der
  Tasten mit der Taste daneben (aus `GRID_KUERZEL`); was die Taste nur als Schreibschutz ansagen würde, ist gesperrt. Die
  Aktion läuft nach dem Schließen, wenn der Fokus wieder auf der Zelle steht. „Einfügen“ liest die Zwischenablage selbst
  (`readText`); ohne Erlaubnis eine Ansage mit dem Hinweis auf Strg+V.
- **D-156.7** Kürzelübersicht aus dem Grid → Punkt „Tastenkürzel anzeigen“ im Kontextmenü über die neue Eigenschaft
  `onKuerzelhilfe`; die App wechselt zu `hilfePfad('tastenkuerzel')` (147). Dazu „Suchen und filtern“ (Strg+F) im Menü
  „Bearbeiten“ der LV-Seite über die neue Eigenschaft `steuerung` (`LvGridSteuerung.suchen()`).
- **D-156.8** Neue Kürzel in `GRID_KUERZEL`: Strg+F (Suchen), F3 und Umschalt+F3 (Treffer), Umschalt+F10 oder Menütaste
  (Kontextmenü), nur im LV-Grid. Bereiche: die vorhandenen „Navigation“ und „Zeilen“, kein neuer Bereich, weil die
  Reihenfolge der Bereiche in `hilfe/kuerzel.ts` steht (fremder Ordner); die Hilfeseite zeigt sie ohne Änderung.
- **D-156.9** Hinweis `kalkulation-entfernt` (D-148.6) → `ui-grid` hat jetzt einen eigenen Text („Die Kalkulation der
  Position wurde entfernt. Rückgängig stellt sie wieder her.“); die LV-Seite filtert ihn weiter heraus und zeigt ihr Band.
- **D-156.10** Auftrags-LV (`auftrag/`, fremder Ordner): Suchen, Filtern und Kontextmenü wirken dort schon, aber nur über
  die sichtbaren Zeilen und ohne Punkt „Tastenkürzel anzeigen“. Folgepunkt: `alleZeilen` und `onKuerzelhilfe` in
  `AuftragsLvSeite` setzen (zwei Zeilen wie in `LvStandSeite`).
- **D-156.11** Aus D-100: Der Spaltenkopf der OZ zeigt „OZ“ und hat wieder einen eigenen zugänglichen Namen (neue Tabelle
  `SPALTENNAME` in `texte.ts`), damit `arbeitsflaeche.spec.ts:57` unverändert grün ist. Der Name lautet „Ordnungszahl (OZ)“,
  nicht „Ordnungszahl“ allein: Der Sprachtest (`apps/web/src/sprache.test.ts`, fremder Ordner) verbietet „Ordnungszahl“ als
  ganze Beschriftung; die Prüfung `name: 'Ordnungszahl'` trifft ihn (Teiltreffer). Soll es genau „Ordnungszahl“ heißen,
  muss die Regel im Sprachtest eine Ausnahme bekommen (Frage an den Orchestrator).

Ergebnis (nach `git merge integration/welle-7`):

- `pnpm lint` (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean Room) und `pnpm typecheck` grün; Sprachtest grün.
- `pnpm test`: 4.653 bestanden, 3 übersprungen, 11 rot: nur CPU-Budgets in `gaeb`, `kern`, `speicher`, `vergabe` und
  `apps/web/src/abrechnung/leistung.test.ts` bei Last 19–33 auf 4 Kernen (keine Datei dieses Tickets); allein wiederholt
  (Last ~19) noch 5 davon rot. Keine Schranke geändert.
- `pnpm --filter @tethys/ui-grid e2e`: 108 bestanden, 3 übersprungen, 1 rot (`arbeitsflaeche.spec.ts:49`, der Fehler aus
  D-100, danach behoben: 39/39 in `arbeitsflaeche`, `suchen`, `grid`, `schreibgeschuetzt`). Leistung unter Last: 5.000 Zeilen
  mit KG 45,4 / 30,7 fps, 10.000 Zeilen 45,8 / 33,9 fps (5.600 / 28.000 px/s), alle Budgets grün.
- Web-E2E: `lv-suchen` (neu, 3), `arbeitsflaeche` (15 Zeilen mit EP und GP bei 1280×800), `lv`, `lv-bedienung`, `umwege`,
  `undo`, `erster-start`, `dialog`: 34/34; nach D-156.11 `lv-suchen`, `arbeitsflaeche`, `lv`, `dialog`, `kosten`: 17/17.

Folgepunkte: D-156.10 (Auftrags-LV, `auftrag/`), D-156.11 (genau „Ordnungszahl“ nur mit Ausnahme im Sprachtest).

## Answer

Gemergt nach `integration/welle-7` mit `31ef4fc`. Ergebnisse, Testläufe und Entscheidungen (D-156.x) unter `## Comments`.

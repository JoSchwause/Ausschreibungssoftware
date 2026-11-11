# 89: C2+C3+C4 in der App: Kostenermittlung, Kostengruppen zuordnen, Kostenkontrolle, EP-Kalkulation

Status: done-by-agent
Type: task
Welle: 5 · Strang: C2, C3, C4 · Ordner: `apps/web/src/kosten/` (neu); Einhängestellen in `App.tsx`,
`projekt/ProjektSeite.tsx`, `lv/LvSeite.tsx` (Spalte/Feld KG, Aktion „Kalkulieren“), `auftrag/AuftragsLvSeite.tsx`,
`lv/befehlsweg.ts` (markiert `// Ticket 89`, D-20)
Blocked by: 71, 79, 82 (und 78 für C4)
Regeln: A5, G-16, N4, U2, U3, U5, U7, Q2, D-20, D-24, D-36, D-37, D-39
Herkunft: `plan.md` §2 C2–C4

## What to build

1. **Kostenermittlungen** des Projekts (`/projekt/<id>/kosten`): Liste (Name, Stufe), anlegen, Einträge (KG-Nummer,
   Betrag, Bemerkung) in `ui-grid` bearbeiten, Bezeichnungen aus einer CSV des Nutzers zur Anzeige (G-16, `bezeichnungenLesen`;
   als Einstellung des Nutzers abgelegt, nicht im Vertrag), Summen je Gruppe und gesamt (`kostenermittlungBerechnen`).
2. **Kostengruppe zuordnen** (C2): im LV-Grid eine Spalte „KG“ (Eingabe dreistellig, Befund statt Sperre, U5) und dasselbe im
   Auftrags-LV (Befehl `KostengruppeSetzen` am Auftrags-LV); Mehrfachauswahl setzt dieselbe KG für mehrere Positionen in
   einem Undo-Schritt.
3. **Kostenkontrolle** (`kostenkontrolleBerechnen`, D-37): Seite mit Zeilen je KG (Baum), „ohne Kostengruppe“, „Nachlass“,
   Gesamt; Spalten Budget (gewählte Kostenermittlung), Vergabe, Abrechnung (Leistungsstand der jeweils letzten Rechnung je
   Auftrags-LV, `abrechnung`), Abweichung.
4. **EP-Kalkulation** (C4, Ticket 78): an einer Position „Kalkulieren“ öffnet einen Dialog mit Ansatzzeilen und
   Zuschlagssätzen je Kostenart; Ergebnis (EP, EPA) wird mit `EinheitspreisanteileSetzen` + `EinheitspreisAendern` als ein
   Undo-Schritt geschrieben (D-36 (5): Ansätze werden nicht gespeichert; der Dialog sagt das).
5. **E2E** `apps/web/e2e/kosten.spec.ts`: Kostenberechnung anlegen → KG an LV-Positionen → Zuschlag → Kostenkontrolle zeigt
   Budget und Vergabe → (mit Rechnung aus Ticket 88, falls gemergt, sonst im M4-Ticket) Abrechnung; EP kalkulieren.

## Grenzen

- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Logik, E2E `kosten.spec.ts` grün; LV-Grid-Leistungsbudgets bleiben grün (`leistung.spec.ts`)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Die App muss `kostenermittlung`-ChangeSets umkehren (wie 87; `kostenermittlungChangeSetUmkehren` aus `kosten`);
  Einhängestellen markiert `// Ticket 89`.
- Eine formwidrige KG-Nummer ist ein Zellfehler wie eine unlesbare Menge (die Marke lässt sie nicht in den Befehl); der
  Befund nach U5 betrifft eine KG außerhalb der Budget-Gliederung (Ticket 82 Punkt 3).
- Bis Ticket 84 gemergt ist, verliert der GAEB-Export gesetzte Kostengruppen; 84 ist Pflicht vor Wellenende (sonst warnt
  der Writer).

## Comments
- **D-89.1** „Spalte KG“ im LV-Grid? Das Grid (`ui-grid`, `LvSpalte` in `vertrag`) hat keinen Spaltenmechanismus und gehört nicht zu diesem Ticket (P2). Entscheidung: Schaltfläche „Kostengruppen“ (Strg+Alt+G) öffnet einen Dialog mit Positionsliste, Filter, Mehrfachauswahl (Vorauswahl = Grid-Auswahl) und KG-Eingabe; im Auftrags-LV derselbe Dialog (`KostengruppenAmAuftrag`). Mehrfachsetzen = `Sitzung.folge` = ein Undo-Schritt. Folgeticket für eine echte Spalte (ui-grid + vertrag).
- **D-89.2** Bearbeiten der Einträge „in ui-grid“? Es gibt kein editierbares flaches Grid (nur `LvGrid`, schreibgeschütztes `VergleichsGrid`). Entscheidung: Anzeige im `VergleichsGrid` (Baum, Summen), Bearbeiten über ein Formular (Nummer, Betrag, Bemerkung; setzen/entfernen); formwidrige Nummer oder unlesbarer Betrag = Feldfehler, kein Befehl.
- **D-89.3** Routen: `/projekt/<id>/kosten` (Liste, anlegen), `/projekt/<id>/kosten/<kid>` (Editor), `/projekt/<id>/kosten/kontrolle`. Undo/Redo von `kostenermittlung`-ChangeSets über `kostenermittlungChangeSetUmkehren` in `befehlsweg.ts` und Ziel in `HistorieAnbieter`.
- **D-89.4** Hinweis (U5) zur KG außerhalb der Gliederung: im Zuordnungsdialog, wenn die Nummer in keiner Kostenermittlung des Projekts liegt (Eintrag, Vorfahr oder Nachfahr); in der Kostenkontrolle zeigen die Befunde aus `kostenkontrolleBerechnen`.
- **D-89.5** Budget der Kostenkontrolle: erste Kostenermittlung (Name), Auswahl in der Sitzung, „Kein Budget“ möglich; nicht gespeichert. Abrechnung: `leistungsstandBerechnen` (Ticket 81) der Rechnung mit der höchsten Nummer je Auftrags-LV über deren `aufmassIds` und `art`; ohne Rechnung bleibt die Spalte „–“. Bezeichnungen-CSV: als Text im Browserspeicher (try/catch), nicht in der Projektdatei.
- **D-89.6** EP-Kalkulation: Dialog „Kalkulieren“ (Strg+Alt+K) an der aktiven Position; Ansätze nur im Dialog (Hinweistext), „Übernehmen“ = `EinheitspreisanteileSetzen` + `EinheitspreisAendern` in einer Aktion (ein Undo-Schritt); mit `epaBezeichnungen` am LV keine freie Bezeichnung (D-28).

## Answer

Branch `welle-5/89-kosten`. Neuer Ordner `apps/web/src/kosten/` (Seiten, Dialoge, Logik mit Unit-Tests), Einhängestellen `// Ticket 89` in `App.tsx`, `ProjektSeite.tsx`, `LvSeite.tsx`, `AuftragsLvSeite.tsx`, `lv/befehlsweg.ts` (Umkehrung `kostenermittlung`, `eintrag`/`speichern`/`Lauf` exportiert), `historie/*`; Abhängigkeiten `@tethys/kosten`, `@tethys/abrechnung` in `apps/web`. E2E `e2e/kosten.spec.ts` grün, mit `lv.spec.ts` und `leistung.spec.ts` (Mengenänderung Median 51 ms, Undo 34 ms). Suite: Lint, Typecheck grün; Vitest nur CPU-Budgets anderer Pakete (`vergabe/leistung`, `kern/k9-leistung`) wechselnd rot unter Last, einzeln grün. Offen: echte KG-Spalte im Grid (D-89.1), Abrechnung in der E2E erst mit der Rechnung aus Ticket 88 (M4-Ticket 91); GAEB-Export verliert KG bis Ticket 84 gemergt ist.

# Wellen-Review Welle 6

Stand 2026-11-12/13, Skill `code-review`, Fixpunkt `79e6680` (Basis der Welle 6, D-49), Kopf `integration/welle-6` @ `6ab5796`
(aller Produktcode der Welle: Tickets 93–116, 118–121; Ticket 117 lief parallel, nur Tests, D-68). Zwei getrennte Achsen,
Befunde nicht zusammengelegt. Wegen der Größe (413 Commits, rund 70.000 Zeilen Code) lief jede Achse in drei Pfadscheiben
(Opus je Scheibe): **A** `packages/vertrag, kern, speicher, ifc, bim, ui-modell`; **B** `packages/bauzeit, honorar, bauleitung,
ausgabe, ui-grid, erechnung, vergabe, abrechnung, gaeb`, `fixtures/`, `tools/`, `docs/`, `GLOSSARY.md`; **C** `apps/`.
Die Berichte stehen wörtlich (englisch, wie geliefert). Befundnummern zum Verweisen: Scheibe + Nummer, z. B. **SA1** =
Standards A Punkt 1, **PB6** = Spec B Punkt 6, **PC-a1** / **PC-c1** = Spec C Teil (a)/(c) Punkt 1; Ermessenspunkte ohne Nummer
werden über ihre Fundstelle genannt.

## Standards

### Standards A (packages vertrag, kern, speicher, ifc, bim, ui-modell)

**Hard violations of documented standards**
1. **N4** – `bim/src/kennwerte.ts:75`. `formatiereDe(…)` builds the German-format text "BGF 245,300 m² × 1.250,00 €/m²", stored as `Kostenermittlungseintrag.bemerkung` (`:93`). N4 and `dezimal/src/de.ts:2` allow de-DE formatting only at the edges; `bim` is the only domain package that does it. Ticket 108 prescribed this wording → escalate, don't patch quietly.
2. **L1/L2 glossary drift** – `GLOSSARY.md:215` names the reader `ifcLesen`; public API is `bauwerksmodellLesen` (`ifc/src/index.ts:8`), `ifcLesen` only used by tests. `ifc/src/typen.ts:14,21,46,62,98,127` redeclares six vertrag type names with different shapes (e.g. `IfcGlobalId = string`); the repo treated "zwei Typen eines Namens" as a gap and fixed it by renaming in Ticket 82.

**Judgement calls**
3. Befund location reading – for `modell-pruefung`, vertrag `gaeb.ts` says `feld` is `bauteile` or `mengenart` ("was eine Quelle nicht nennt, fehlt"); `din277.ts:59,65` sets `'BGF'`/`'GrossFloorArea'`, `kennwerte.ts:87,104` other values.
4. Duplicated Code – `kern/src/bauteile.ts:30-57` repeats `kostengruppe.ts:32-62`; `positionMitBauteilen` (`positionsfelder.ts:92`) re-implements `mitFeld` (`struktur.ts:36`).
5. Duplicated Code / Shotgun Surgery – Kostengruppe regex 3× (`kern/positionsfelder.ts:17`, `bim/bauwerksmodell-befehle.ts:32`, `ifc/klassifikation.ts:13`); hash regex 2× (`bim:30`, `speicher/dekoder.ts:992`); quantity-kind/structure-kind/schema lists in `bim:33-42` (untyped `ReadonlySet<string>`) and `dekoder.ts:1028,1050,1119`. D-66 precedent (`IFC_GLOBALID_MUSTER`) argues for constants in vertrag.
6. Repeated Switches – `speicher/kern.ts:116` (`aggregatDes`) and `:600` (`anwenden`) both switch over the same 12 `ChangeSet['art']` values; new aggregate kinds also needed edits at `schreiben.ts:255`, `projektdatei.ts`, protocol CHECK constraint.
7. Data Clumps / positional coupling – `schreiben.ts:1372,1398,1429` `[...w.slice(2), id]`/`w.slice(3)` tie UPDATE columns to INSERT tuples in `zeilen.ts:562-611`.
8. Duplicated Code – "aggregate belongs to this project" query inlined at `bezuege.ts:219,233,274` although `auftragsLvImProjekt` (`:28`) exists; `kern.ts:436` doesn't use `#eines`.
9. Message Chains – ~30 `l.daten.id/name/klasse(…)` across 9 ifc files (e.g. `bauwerksmodell.ts:40`).
10. Speculative Generality – `ifcLesen`, `umfang: 'vollstaendig'` (`lesen.ts:127,157`), exported `eigenschaftenLesen` (`eigenschaftsindex.ts:114`) only reached from tests.
11. Primitive Obsession – GlobalIds in `ui-modell/src/typen.ts:15,63,72,77` plain `string` though vertrag's `IfcGlobalId` is importable.
12. File-boundary robustness – `speicher/projektdatei.ts:137` decompresses imported model bytes with no output cap; gaeb/erechnung/ifc readers cap input (`STANDARD_MAX_BYTES`). Could cap at `datei.groesse`.

Clean: no float arithmetic on amounts, no ChangeSet bypass, migration 6 rejects v5 files with v6 fields (Q5); vertrag changes in own tickets (A4/P9); 105's edit in `abrechnung` is a named P2 exception. Tests only sampled.

### Standards B (packages bauzeit, honorar, bauleitung, ausgabe, ui-grid, erechnung, vergabe, abrechnung, gaeb; fixtures, tools, docs, GLOSSARY)

**Hard violations (documented standard)**
1. `GLOSSARY.md:467` and `:478`: the "Im Code" names `Honorarbefund` and `Bauzeitbefund` no longer exist; code uses `Pruefbefund` plus `…befundcode`. Of 210 identifiers the diff adds to the glossary, these two are the only ones missing from the code. Breaks L1/L2.
2. `bauzeit/src/fortschritt.ts:83`: `dividiere(…, sollSumme, 2)` hard-codes the scale; N3 requires `NACHKOMMASTELLEN.prozent` (as `honorarspanne.ts:24` does).
3. `ausgabe/src/honorar-druck.ts:39-40` and `bauzeit-druck.ts:133` print `Pruefbefund.meldung` into the PDF unchanged. Engine messages contain raw decimals, field keys and UUIDs (e.g. `honorar-berechnen.ts:126/305/335` "Umbauzuschlag 40.00 % über 33.00 %"; `bauzeitenplan.ts:363` "Vorgang <UUID>"). Breaks N4/L1 at the PDF and the contract in `bericht.ts:2-4` ("fertig formatierte de-DE-Texte"). Screen maps codes to texts (`apps/web/src/honorar/ansicht.ts:124`), PDF doesn't. Test helper `testhilfe/x2x4.ts:215` uses a hand-formatted message the engine never emits, so tests don't catch it.
4. `bauleitung/src/mangel-befehle.ts:29` defines its own GlobalId regex; `vertrag/src/bim.ts:11-17` calls `IFC_GLOBALID_MUSTER` "die eine Stelle für die Form" (D-66 SOLL 6). Arguable: D-66 named only 105–108 as follow-ups.

**Judgement calls (baseline smells)**
- Duplicated Code: `bericht-pdf.ts:115-118`, `:157-167` repeat `pdf.ts:265-268`, `:372-382` (creation date, access policy, fonts); `befundText` in `honorar-druck.ts:39` repeats `bauzeit-druck.ts:133`; `HUNDERT_PROZENT` twice in bauzeit (`bauzeitenplan.ts:207`, `fortschritt.ts:32`), `fortschritt.ts:31` recreates `NULL_PROZENT` (dezimal exports it); ui-grid `texte.ts:161ff` copies `:140-155`; "offen" predicate in `fristpruefung.ts:29` and `maengelauswertung.ts:63`.
- Duplicated Code + Primitive Obsession: `bauleitung/datum.ts:6-22` copies `bauzeit/datum.ts:34,43` but returns bare `string`; shared version would need vertrag/dezimal (A3/A4, own ticket).
- Mysterious Name: `istFehler` = "check actual dates" in `bauzeitenplan-befehle.ts:170` vs "is this an error?" in `befehlshilfen.ts:17`; `LEISTUNGSBILDER` Set (`honorarberechnung-befehle.ts:35`) shadows the Record (`leistungsbilder.ts:172`); three unrelated `Lage` types (`bauzeitenplan.ts:591`, `feiertage.ts:45`, `zeitleiste.ts:36`); `balkenlage` in days (`zeitachse.ts:108`) vs `balkenLage` in pixels (`zeitleiste.ts:80`).
- Repeated Switches / Shotgun Surgery: KG-column exception branches on `'kostengruppe'` in five ui-grid files (`LvGrid.tsx:126-131`, `459-469`, `Zeile.tsx:181`, `Editor.tsx:57`, `einfuegen.ts:101/184`, `eingabe.ts:201`); `aenderung ? … : kgAusnahme?.()` twice (`LvGrid.tsx:281`, `432`).
- Data Clumps: `{befehle, ungueltig, uebersprungen}` in `Einfuegeplan` and `Kostengruppenplan` (`einfuegen.ts`).
- Middle Man / Speculative Generality: `x2x4-pdf.ts` five one-line wrappers; `bauzeit/index.ts` re-exports nine vertrag types "für bestehende Importe" though the package is new; `bauzeit-druck.ts:57-58` re-derives Vorgangsart.

Checked, no problems: HOAI § 13 interpolation multiplies before dividing, rounds once (half-up); § 33 chain only dezimal; no float on amounts; calendar on whole day numbers (no `Date`, no time zones); every command returns a ChangeSet with whole aggregate before/after; X1–X4 goldens derived by hand, fixtures import no product code.

### Standards C (apps)

No breach of D-20 (every hunk in a shared file is marked `// Ticket NN`); all project writes go through commands; every delete asks for confirmation.

**Hard violations (documented rules)**
1. **U3** (every grid action reachable by keyboard): `bim/ModellSeite.tsx:324-329` – multi-select in the model tree only with Ctrl/Cmd + mouse, `onKeyDownCapture` resets it; keyboard users cannot build the selection that „Zuordnen …“ and „Aufmaßblatt aus Auswahl …“ act on. D-115.1 cannot override a rule. Fix needs a selection API in `ui-grid` (own ticket, P2).
2. **A2** (domain calculation lives in a package): `bauleitung/bautagebuch.ts:124-125` (`koepfe`) and inline copy `BautagebuchSeite.tsx:277` sum the headcount per day; `bautagebuchAuswerten().jeTag` already computes it, and the file's header (`:3-4`) says the package does the sums.

**Judgement calls**
- Q5 second clause: `ausgabe/DruckProfilFeld.tsx:149` removes stored print-profile entries for good (confirmation + backup file, but no Undo).
- Duplicated page scaffolding: same `Laden` union, `aktiv` effect, `beiHistorie` reload, loading/not-found views in 9 new pages (e.g. `bauzeit/BauzeitListeSeite.tsx:24-90` ≈ `honorar/HonorarListeSeite.tsx:28-98` ≈ `bim/ModellListeSeite.tsx:31-97`); routes copied (`bauzeit/pfad.ts:22-45` ≡ `honorar/pfad.ts:22-45` ≡ `kosten/pfad.ts:28-52`); Repeated Switches on `art === 'liste'` at `App.tsx:146,178,201`.
- Duplicated Code: `bim/einlesen.ts:47-51` copies `ausgabe/logik.ts:21` (`datumAusUhr`); font loader 3× (`bauzeit/pdf-worker.ts:22`, `bauleitung/pdf-worker.ts:28`, `honorar/pdf.ts:11`), only honorar runs pdfmake on the main thread (`HonorarSeite.tsx:202`); run → log entry → save 5× (`bim/schreiben.ts:18`, `bauzeit/schreiben.ts:20`, `honorar/schreiben.ts:31`, `bauleitung/schreiben.ts:31,47`); `if (!pruefe(a)) ok = false` loop in `MengenAusModell.tsx:114`, `useBezug.ts:131`, `MaengelSeite.tsx:285`, `KostengruppenAmAuftrag.tsx:35`.
- Duplicated and drifting apart: `bim/kennwerte.ts:80-85` own KG regex + `as Kostengruppennummer` cast instead of `kgLesen`, error text differs from `kosten/kostengruppe.ts:33`; `modellvergleich/folgen.ts:95-126` repeats `bim/uebernahme.ts:40-69` (OZ includes index in `folgen.ts:50` but not `uebernahme.ts:47`); `ModellvergleichSeite.tsx:397` re-implements `bim/darstellung.ts:7`.
- Data Clumps: `{positionId, oz, kurztext, einheit}` in 4 row types; `Feldfehler` defined 4× with 3 shapes (`bauzeit/befehle.ts:32`, `honorar/formular.ts:70`, `bauleitung/maengel.ts:213`, `bauleitung/bautagebuch.ts:30`).
- Primitive Obsession: `bim/useBezug.ts:100` parses `'lv:<id>'` back into a union; `bim/texte.ts:85,94` literal `'Stueck'` instead of `MENGENART_STUECK`; `honorar/schreiben.ts:94` re-declares `STANDARD_MWST`.
- Mysterious Name: `honorar/formular.ts:93` `Math.min(2, …)` default zone; `bim/ZuordnungBereich.tsx:189` `arten.at(-1)` relies on "Stück" last; "Bezug" = reference LV in `useBezug.ts` but Bezugsgröße in `kennwerte.ts:59` (L2).
- Middle Man: `honorar/schreiben.ts:80`, `bim/befunde.ts:9`.
- N4/L1: `bim/MengenAusModell.tsx:145` ISO date vs `ModellListeSeite.tsx:241` `datumDe`; UI text outside `texte.ts` at `bim/kennwerte.ts:81,83`, `BauzeitenplanSeite.tsx:396`.
- Tests: new e2e specs (bim*, modellvergleich, x2–x4) never press a key; nothing tests U3.

## Spec

### Spec A (vertrag, kern, speicher, ifc, bim, ui-modell; tickets 95, 97, 98, 100, 105–108)

Tickets 95, 97, 98, 105, 106, 107, 108 match their specs and D-49..D-68 (checked in code: konflikt rules; bytes released only when the store is opened; mass command logged as head + checksum; migration 5→6; rings and quantities without value in the IFC mapping; rules for quantity takeover, DIN 277, key figures, model comparison). `typisch-bim.json` goldens asserted unchanged (`bim/src/haus.test.ts`). Renames ratified (D-62, D-64, D-97.12).

**(a) Missing or partial**
1. 3D budget never measured with the D-54 model. D-54: "Synthetisches IFC-4-Modell mit 10.000 Bauteilen (etwa 25 MB) … 3D … Laden ≤ 20 s". `ui-modell/e2e/leistung.spec.ts:11-15,45` uses its own 4.8 MB `grossesModell`; `erzeugen.mjs` only in a comment. Ticket 100 §6 asks for a test with "`fixtures/ifc/haus-v1.ifc` … sobald es … liegt"; harness wires the URL (`e2e/harness/main.tsx:7-8`), no test uses it. Ticket 99 merged, yet 100 `resolved` with criteria ticked and both items under "Offen".
2. `BauteileZuordnen` measured only in kern. D-54: "`BauteileZuordnen` … 5.000 Zuordnungen samt Undo ≤ 100 ms". Only `kern/src/bauteile-leistung.test.ts:92`. Speicher path (full command into the protocol, Undo through `anwenden`) not measured; 97 "Offene Typfrage" 5 says "Messung in 105/106", `speicher/src/v16-leistung.test.ts` has none.
3. Ticket 108 bookkeeping: criteria unchecked (`108-bim-fachlogik.md:58-59`), two "## Answer" blocks, first cites `a693c35` ("Resolve ticket 113").

**(b) Not asked for**
4. Test methods ship in the production component. 100 §5: "Prüfschnittstelle nur im Prüfstand (`e2e/harness`, nie ausgeliefert)". D-100.3 puts `darstellung()`, `bildschirmpunkt()`, `gezeichnet()` on the public `ModellansichtRef` (`ui-modell/src/typen.ts:58-65`, `Modellansicht.tsx:131-133`, exported `index.ts:7-8`) – contradicts the ticket. App's `window` hook limited to test builds, methods are not.
5. Minor, harmless: `kostenkennwerteBerechnen` adds `jeNrf` (`bim/src/kennwerte.ts:62,150`; 108 §5 asks "Summe / BGF bzw. / BRI"); model command rejects empty `dateiname` (`bim/src/bauwerksmodell-befehle.ts:165`), not in vertrag's check list for `BauwerksmodellAnlegen`.

**(c) Implemented, questionable**
6. Duplicate GlobalIds. 107:31: "Bei doppelten GlobalIds gilt jeder Verweis dem ersten Objekt in Dateireihenfolge". D-107.6 drops any reference whose target is a later duplicate (finding `verweis-mehrdeutig`, `ifc/src/bauwerksmodell.ts:115-143`) → a wall in the duplicate storey gets `strukturGlobalId: null`, falls out of `bauteileImStrukturknoten`, „Aufmaßblatt aus Auswahl“ misses it. Defensible (model invents nothing) but departs from the wording; ratify.

Nothing else contradicts a ticket, a D-entry or the goldens.

### Spec B (bauzeit, honorar, bauleitung, ausgabe, ui-grid, erechnung, …; tickets 93, 94, 96, 99, 101–104, 109–113)

Most of the slice matches. Recomputed by hand and holding: HOAI tables (zone continuity, phase rates sum to 100); ticket 101 goldens (cases 1, 2, half-cent case); X3 fixture gross 267.595,90; X2 fixture project end 24.11.2026 and critical path; holiday rules per federal state; defect status table; ADR 0013 with G-57; erechnung change to `Pruefbefund`. Official HOAI tables not in the repo → internal consistency only. Hunks in vergabe, abrechnung, gaeb come from 97 and 105.

**(c) Looks implemented but wrong**
1. PDFs print raw package messages. Ticket 113 / ADR 0012: the model "trägt fertig formatierte de-DE-Texte". `ausgabe/src/honorar-druck.ts:39,194`, `bauzeit-druck.ts:132` print `b.meldung` unchanged; messages contain canonical decimals and UUIDs (`honorar/src/honorar-berechnen.ts:252,335` "Umbauzuschlag 40.00 % über 33.00 %", "24999.99"; `bauzeit/src/bauzeitenplan.ts:389-391,412` "Anordnungsbeziehung 019b… → 019b…"). Screen maps codes to own texts (`apps/web/src/honorar/ansicht.ts:124`) → screen and PDF differ. Tests hide it with hand-written German messages (`ausgabe/src/testhilfe/x2x4.ts:215,306`).
2. Defect evaluation grouped per contract LV, not per contractor. Ticket 111: "Mängel je Auftragnehmer (über das Auftrags-LV …)". `bauleitung/src/maengelauswertung.ts:78-112` groups by Auftrags-LV → two contracts with one firm give two rows; field still `jeAuftragnehmer` (:42). D-111.8 overrides the ticket.
3. Second print model. Ticket 113: "Vier Ausgaben über das bestehende `Ausgabemodell`". D-113.1 adds `Berichtsmodell` and a second pdfmake renderer (`ausgabe/src/bericht.ts`, `bericht-pdf.ts`). ADR 0012 makes `Ausgabemodell` the single seam ("der Renderer liest nur dieses Modell").

**(a) Missing or partial**
4. Ticket 112: "in der Form der Vertragstypen (v1.6)". `fixtures/bauzeit.json:114` target values use `id`, not `vorgangId`; 109 listed it open; tests map around it.
5. L2: `GLOSSARY.md:467` still names `Honorarbefund` (gone after D-110.6); `:442` still says "bis Ticket 110 heißt sie dort noch …".
6. Ticket 111: "offen → angezeigt (mit Frist)". `bauleitung/src/mangel-befehle.ts:80-83,173-178` accept `angezeigt` with no deadline on entry or defect; no error, no finding → such a defect can never become overdue.
7. Tickets resolved with unticked acceptance boxes: 103, 104, 109 (all), 111 (suite). 109 and 111 report red suites from performance budgets in other packages under load.

**(b) Scope creep (minor)**
8. Ticket 96 asked "gleiche Messart, neue Zeile im Test"; D-96.9 changes shared `messeScrollen` to scroll back and forth for every case (`ui-grid/e2e/leistung.spec.ts:37-45`).
9. `DIN276_HINWEIS` (`honorar-druck.ts:25-27`) adds "Die Kostenermittlung muss nach dieser Fassung gegliedert sein" – beyond D-56/D-66 (only: § 4 Abs. 1 points to DIN 276:2008-12).

### Spec C (apps; tickets 114–116, 118–121 and app parts of 93, 94, 96)

Checked in code and matching: D-62, D-63 tooltip, D-66 MUST 1 and 2, D-120.3, app parts of 93, 94, 121, golden numbers in E2E and chain tests; X2–X4 flows and the 116 comparison.

**(a) Missing or partial**
1. 115 §1: "Befunde … hängende Zuordnungen, Einheit passt nicht, mehrdeutige Menge – im Prüfpanel bzw. in der Vorschau mit Sprunglink". A hanging assignment (`bauteil-fehlt`) has no jump anywhere: model page hides it (`bim/ZuordnungBereich.tsx:134-137`, `bim/BefundListe.tsx:31` `imModell`); LV Prüfpanel gets no assignment findings (`lv/pruefung.ts`); LV-page preview passes no `onSprung` (`bim/MengenAusModell.tsx:186`). D-115.4 dropped it although `ort.knotenId` would allow a jump to the position.
2. 118 §2: "Bezug auf LV-Knoten". Only a whole LV/Auftrags-LV can be chosen (`bauzeit/VorgangDialog.tsx:44,54` `knotenIds: null`). Part of D-118.7 not covered by the known item.
3. 114 §2: "Befunddialog (… Bauteile ohne Geometrie aus `ui-modell`)". Import dialog shows only reader findings (`bim/ModellListeSeite.tsx:316-318`); geometry findings on the model page instead (D-114.7, `bim/ModellSeite.tsx:194-198,409`). Reason holds, but contradicts the ticket.
4. D-54: "Baum mit 10k Zeilen über die bestehenden Grid-Budgets"; D-66 SHOULD 11 "messen 106/114". No app test; 114 lists it as open. VergleichsGrid budget only to 5,000 rows (`packages/ui-grid/e2e/leistung.spec.ts:172`).
5. 115 hook list: "`kosten/` (nur Verweis)". No link added (D-115.9).
6. 116 §1: "`…/vergleich/<alt>`; Standard: der Vorgänger". No UI to pick another stand; only link to predecessor (`bim/ModellSeite.tsx:231-233`).

**(b) Scope creep**: nothing material (NRF column in Kostenkennwerte, "unverändert" count, "Im LV" column, calendar editing on the plan page).

**(c) Looks implemented but wrong**
1. U3 (via 115's rules U2–U5): "Jede Grid-Aktion ist per Tastatur erreichbar". D-115.1 makes multi-select in the model tree pointer-only (`bim/ModellSeite.tsx:324-329`): any key resets to replace; `VergleichsGrid` has no selection API. The X1-Kern step (3 of 17 EG parts to 03.0010) cannot be done by keyboard.
2. Model page's "LV für Zuordnung" list includes Muster-LVs and may preselect one (`bim/useBezug.ts:70-86`, `liste[0]`). 116 excludes them (D-116.6, `modellvergleich/ModellvergleichSeite.tsx:95`); assignments on a Muster-LV are dropped on every use (D-66 MUST 2) → pointless target.
3. 115 §3: "BGF, BRI, NRF aus dem Modell (mit Quelle …)". A size the model lacks shows "fehlt im Modell (aus dem Modell)" because `bim` returns `quelle: 'modell'` for a null value (`bim/KennwerteBereich.tsx:88-90`).

Summe: **Standards** 8 harte Verstöße (A 2, B 4, C 2) und rund 45 Ermessenspunkte; schwerster: **SC1** U3, die Mehrfachauswahl
im Modellbaum geht nur mit der Maus (Kernschritt von X1 nicht per Tastatur). **Spec** 24 Punkte (A 6, B 9, C 9); schwerster:
**PB1** die PDFs zu X2–X4 drucken die rohen Paketmeldungen (Dezimalpunkt, UUIDs), Bildschirm und PDF weichen ab.

## Behebung

Siehe D-69 in `entscheidungen-auto.md` (Umfang, bestätigte Abweichungen, Folgetickets) und Ticket `issues/122-fix-welle-6-review.md`.

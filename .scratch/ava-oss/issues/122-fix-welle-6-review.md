# 122: Behebung des Wellen-Reviews Welle 6

Status: in-progress
Type: task
Welle: 6 · Strang: – · Pakete: wie je Befund genannt (benannte Ausnahme von P2: in dieser Phase schreibt außer Ticket 117
nur dieses Ticket; 117 schreibt `apps/web/e2e/x1-kern.spec.ts`, `apps/web/e2e/x1-erweitert.spec.ts`,
`apps/web/src/x1-kette.test.ts` – diese nicht anfassen)
Blocked by: –
Modell: opus
Regeln: siehe je Befund; D-54, D-66, D-69
Herkunft: `../review-welle-6.md` (Befundnummern wie dort: SA1 = Standards Scheibe A Punkt 1, PC-a1 = Spec Scheibe C Teil a Punkt 1)

## What to build

In dieser Reihenfolge, je Befund ein Commit (Befundnummer in der Nachricht). Erst die Pflichtpunkte, dann die Sollpunkte.
Sollwerte in `fixtures/` ändern sich nicht (Ausnahme Punkt 12: nur ein Schlüsselname). Kein Budget wird gelockert, kein Test
übersprungen. Wo ein Befund nach dem Lesen des Codes nicht zutrifft: nicht ändern, unter Comments begründen.

**Pflicht**
1. **SB3/PB1 PDFs mit de-DE-Texten (N4, L1, ADR 0012 „fertig formatierte de-DE-Texte“).** `ausgabe/src/honorar-druck.ts:39,194`
   und `bauzeit-druck.ts:132` drucken `Pruefbefund.meldung` roh (Dezimalpunkt, Feldschlüssel, UUIDs, z. B.
   `honorar-berechnen.ts:252,335`, `bauzeitenplan.ts:389-391,412`). Lösung: Die Befundtexte des PDFs sind **dieselben** wie am
   Bildschirm (`apps/web/src/honorar/ansicht.ts:124` u. a.); z. B. reicht die App die fertigen Texte in die Druckeingabe (wie
   D-113.2 die Namen), oder eine gemeinsame Abbildung Code → Text, die beide nutzen – Weg wählen und begründen. Auch Mängel und
   Bautagebuch prüfen. Testhilfen (`ausgabe/src/testhilfe/x2x4.ts:215,306`) nehmen Meldungen, wie die Pakete sie wirklich
   liefern; ein Test beweist, dass im PDF-Text kein UUID und keine Zahl mit Dezimalpunkt steht. `befundText` nicht doppelt
   (honorar-druck/bauzeit-druck).
2. **SC1/PC-c1 U3 Mehrfachauswahl per Tastatur.** `apps/web/src/bim/ModellSeite.tsx:324-329`: Strg/Cmd+Klick ergänzt die
   Auswahl, jede Taste setzt zurück; per Tastatur lässt sich keine Auswahl aus mehreren Baumzeilen bauen, auf die „Zuordnen …“
   und „Aufmaßblatt aus Auswahl …“ wirken. Einen Tastaturweg schaffen (z. B. Strg+Leertaste nimmt die aktive Baumzeile in die
   Auswahl auf bzw. heraus; im Hilfetext/Tooltip genannt), mit E2E, die **nur Tasten** drückt (3 EG-Wände wählen, zuordnen).
   Braucht es dafür eine kleine Schnittstelle in `packages/ui-grid` (z. B. aktive Zeile abfragen), dort mit Test ergänzen.
3. **SC2 A2 Köpfe je Tag.** `apps/web/src/bauleitung/bautagebuch.ts:124-125` (`koepfe`) und `BautagebuchSeite.tsx:277` summieren
   selbst; nehmen `bautagebuchAuswerten().jeTag` aus `packages/bauleitung`.
4. **SA1 N4 im Kennwert-Vermerk.** `packages/bim/src/kennwerte.ts:75,93` formatiert de-DE in den
   `Kostenermittlungseintrag.bemerkung`. `bim` formatiert nicht mehr; die App (Rand) setzt den sichtbar gleichen Text, z. B.
   indem sie den Vermerk oder eine Formatierfunktion übergibt. Sollwerte aus `typisch-bim.json` gleich.
5. **SA2, SB1, PB5 Glossar und Namen (L1, L2).** `GLOSSARY.md`: `Honorarbefund`/`Bauzeitbefund` (:467, :478) durch die echten
   Namen (`Pruefbefund` + `…befundcode`) ersetzen, die überholte Zeile :442 („bis Ticket 110 …“) streichen, `ifcLesen` (:215) →
   `bauwerksmodellLesen`. `packages/ifc/src/typen.ts:14,21,46,62,98,127` deklariert sechs Namen des Vertrags mit anderer Form
   neu (z. B. `IfcGlobalId = string`): umbenennen (z. B. Präfix für die Roh-/STEP-Ebene), damit kein Name zwei Typen meint.
6. **SB2 N3 Skala.** `packages/bauzeit/src/fortschritt.ts:83` `dividiere(…, 2)` → `NACHKOMMASTELLEN.prozent`. Sollwerte gleich.
7. **SB4** `packages/bauleitung/src/mangel-befehle.ts:29` nutzt `IFC_GLOBALID_MUSTER` aus `vertrag` statt eigener Regel.
8. **PB6 angezeigt ohne Frist.** Ticket 111: „offen → angezeigt (mit Frist)“. `mangel-befehle.ts:80-83,173-178` nimmt
   `angezeigt` ohne Frist an; ein solcher Mangel wird nie überfällig. Entweder Fehler am Befehl oder Befund in der
   Fristprüfung – nach U5 und den vorhandenen Fehler-/Befundcodes des Vertrags wählen (keinen neuen Code in `vertrag`
   erfinden), begründen, testen; die App zeigt es.
9. **PB9 DIN-276-Hinweis.** `ausgabe/src/honorar-druck.ts:25-27` hängt „Die Kostenermittlung muss nach dieser Fassung
   gegliedert sein“ an. Text genau nach D-66 MUST 1 / D-56 (HOAI § 4 Abs. 1 verweist auf DIN 276:2008-12), in App und PDF gleich.
10. **PC-a1 Sprung bei hängender Zuordnung.** Befund `bauteil-fehlt` hat nirgends einen Sprung (`bim/ZuordnungBereich.tsx:134-137`,
    `bim/BefundListe.tsx:31`, `bim/MengenAusModell.tsx:186` ohne `onSprung`). Sprung zur Position (`ort.knotenId`) in der Vorschau
    und auf der Modellseite (Ticket 115 §1 „mit Sprunglink“).
11. **PC-c2, PC-c3, PC-a6 Modellseite und Vergleich.** „LV für Zuordnung“ ohne Muster-LVs und ohne Muster-LV als Vorwahl
    (`bim/useBezug.ts:70-86`, wie D-116.6). Kennwerte: fehlt eine Größe im Modell, steht „fehlt im Modell“ ohne „(aus dem
    Modell)“ (`bim/KennwerteBereich.tsx:88-90`). Vergleichsseite: Auswahl des alten Stands (alle früheren Stände, Vorgabe der
    Vorgänger) für `…/vergleich/<alt>` (Ticket 116 §1).
12. **PB4 Fixture-Form.** `fixtures/bauzeit.json:114`: Sollwerte mit `vorgangId` statt `id` (Vertragsform v1.6, Ticket 112);
    Werte unverändert, die Umbenennung in Tests (Ticket 109) entfällt.
13. **D-66 SOLL 12 GAEB-Export und Bauteile.** Der Export verwirft `Positionsdaten.bauteile`; das meldet er als F6-Warnung (wie
    andere nicht exportierbare Daten), mit Test.
14. **SA12 Entpackgrenze.** `packages/speicher/src/projektdatei.ts:137` entpackt Modellbytes beim Einlesen ohne Obergrenze;
    begrenzen (z. B. auf `datei.groesse` bzw. eine feste Höchstgröße wie bei den Lesern, `STANDARD_MAX_BYTES`), mit Test.
15. **PA1, PA2, PC-a4 Budgets messen (D-54).** (a) `packages/ui-modell/e2e`: Prüfstand mit `fixtures/ifc/haus-v1.ifc` (Ticket 100
    §6) und das synthetische Modell aus D-54 (10.000 Bauteile, etwa 25 MB, Erzeuger aus Ticket 99) – Laden ≤ 20 s; (b)
    `packages/speicher`: `BauteileZuordnen` mit 5.000 Zuordnungen samt Undo über den Speicherweg ≤ 100 ms; (c) Baum mit 10.000
    Zeilen im Grid über die bestehenden Grid-Budgets (`ui-grid` Leistungstest oder App). Rot wird im Ticket gemeldet (Zahl,
    Maschine, allein wiederholt), nie gelockert.

**Soll** (so weit die Zeit reicht; nicht Erledigtes als Stichpunkt unter Comments für Ticket 123/124)
16. **PC-a2** Vorgangsdialog: Bezug auf LV-Knoten wählbar (Ticket 118 §2), nicht nur ganzes LV (`bauzeit/VorgangDialog.tsx:44,54`).
17. **PC-a5** Verweis von `kosten/` auf die Kennwerte der Modellseite (Ticket 115, Einhängestelle „nur Verweis“, D-20).
18. **PB8** D-96.9 prüfen: misst das geänderte `messeScrollen` (`ui-grid/e2e/leistung.spec.ts:37-45`) für die alten Fälle
    mindestens dieselbe Arbeit? Wenn nicht, für sie die alte Messart wiederherstellen.
19. App, billige Ermessenspunkte (SC): `bim/kennwerte.ts:80-85` → `kgLesen` statt eigener Regel und Cast; `modellvergleich/folgen.ts:95-126`
    nutzt `bim/uebernahme.ts:40-69` (OZ-Abweichung :50 gegen :47 klären – welche ist richtig?); `ModellvergleichSeite.tsx:397` →
    `bim/darstellung.ts:7`; `bim/einlesen.ts:47-51` → `ausgabe/logik.ts:21`; `bim/texte.ts:85,94` → `MENGENART_STUECK`;
    `honorar/schreiben.ts:94` → vorhandenes `STANDARD_MWST`; `bim/ZuordnungBereich.tsx:189` `arten.at(-1)` ausdrücklich;
    `honorar/formular.ts:93` `Math.min(2, …)` als benannte Vorgabe; `bim/MengenAusModell.tsx:145` → `datumDe`; Texte aus
    `bim/kennwerte.ts:81,83`, `BauzeitenplanSeite.tsx:396` nach `texte.ts`; `useBezug` umbenennen (L2: „Bezug“ ist in
    `kennwerte.ts:59` die Bezugsgröße).
20. Pakete, billige Ermessenspunkte (SA, SB): `kern/src/bauteile.ts:30-57` gegen `kostengruppe.ts:32-62` und `positionMitBauteilen`
    (`positionsfelder.ts:92`) gegen `mitFeld` (`struktur.ts:36`) zusammenführen; `speicher/src/bezuege.ts:219,233,274` →
    `auftragsLvImProjekt`, `kern.ts:436` → `#eines`; `ui-modell/src/typen.ts:15,63,72,77` GlobalIds als `IfcGlobalId`;
    nur von Tests erreichte Exporte in `ifc` (`ifcLesen`, `umfang: 'vollstaendig'`, `eigenschaftenLesen`) entfernen oder
    intern machen – **nur** wenn kein Code außerhalb von `packages/ifc` sie nutzt (117 schreibt gerade Tests!); `bauzeit`
    `HUNDERT_PROZENT` doppelt (`bauzeitenplan.ts:207`, `fortschritt.ts:32`) und `NULL_PROZENT` aus `dezimal`; `istFehler`
    (`bauzeitenplan-befehle.ts:170`) eindeutig benennen; `balkenlage` (Tage, `zeitachse.ts:108`) gegen `balkenLage` (Pixel,
    `zeitleiste.ts:80`) unterscheidbar benennen; `bauzeit/index.ts` Re-Exporte von Vertragstypen „für bestehende Importe“
    entfernen, wenn niemand sie nutzt; `bauzeit-druck.ts:57-58` nimmt die Vorgangsart aus dem Ergebnis; `honorar`
    `LEISTUNGSBILDER`-Set (`honorarberechnung-befehle.ts:35`) aus dem Record (`leistungsbilder.ts:172`) ableiten; `bauleitung`
    „offen“-Prädikat einmal (`fristpruefung.ts:29`, `maengelauswertung.ts:63`); `ui-grid/src/texte.ts:161ff` gegen `:140-155`.

## Grenzen

- Nicht in diesem Ticket (Folgetickets 123/124, D-69): Konstanten in `vertrag`, Umbau der Switches in `speicher`, Seitengerüst
  der App-Ordner, gemeinsamer `Datum`-Typ, KG-Ausnahme in `ui-grid`, D-118.3, D-118.7, D-93.7.
- `vertrag` wird nicht geändert. Bestätigte Abweichungen (D-69: D-107.6, D-100.3, D-111.8, D-113.1, D-114.7, D-121.2) bleiben.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Pflichtpunkte 1–15 erledigt oder unter Comments begründet; Budgets aus 15 mit Messwert (grün/rot) im Ticket
- [ ] E2E: die geänderten Specs und `bim`, `bim-mengen`, `modellvergleich`, `x2`, `x3`, `x4`, `gaeb` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-122.1 Befundtexte im PDF (Punkt 1).** Frage: Gemeinsame Abbildung Code → Text oder Texte der App in der Druckeingabe?
  Entscheidung: **Die App reicht die fertigen Texte in die Druckeingabe** (`HonorarEingabe.befundtexte`,
  `BauzeitenplanEingabe.befundtexte` vom Typ `Befundtext { schwere, ort, text }`, wie D-113.2 die Namen); die Druckmodelle lesen
  `ergebnis.befunde` nicht mehr (Eingabetyp `Omit<…, 'befunde'>`). Die App bildet je Code einen eigenen de-DE-Text für Seite und
  PDF (`honorar/ansicht.ts` `befundAnsicht`, `bauzeit/ansicht.ts` `befundEintraege`/`befundtexteFuerDruck`), Werte am Rand
  formatiert, Vorgänge über Nummer und Bezeichnung. Grund: `ausgabe` darf `honorar`/`bauzeit` nicht importieren (A3), die Texte
  brauchen deren Daten (Grenzen, Tafeln, Vorgänge); `vertrag` bleibt; eine Abbildung in der App hält Seite und PDF gleich. Ein
  Befund zu einer Liste (Leistungsphasen) oder zu mehreren Beträgen nennt nur das Feld, weil der Befundort laut Vertrag kein
  Element trägt; das Element steht im Formular daneben. Auch die Seiten zeigten vorher die rohen Meldungen (Feldschlüssel,
  Kennungen) – sie zeigen jetzt dieselben Texte wie das PDF. Mängel und Bautagebuch geprüft: Ihr Druck gibt keine Meldung aus
  (Status als Wort wie am Bildschirm, „überfällig“ als Kennzeichen, ganze Zahlen) – keine Änderung nötig.
- **D-122.2 Mehrfachauswahl per Tastatur (Punkt 2).** Frage: Strg+Leertaste allein reicht nicht: Folgt die Auswahl dem Fokus,
  ersetzt jeder Pfeil und jedes Tab über eine Zeilengrenze die Auswahl, und der Baum lässt sich nicht verlassen, um „Zuordnen …“
  zu erreichen. Entscheidung: **Tasten bewegen im Baum nur den Fokus (die Eigenschaften folgen); die Leertaste wählt die aktive
  Zeile wie ein Klick, Strg/Cmd+Leertaste nimmt sie auf oder heraus wie Strg+Klick.** Klicks unverändert (D-114.4, D-115.1).
  Hinweis über dem Baum. Kein Eingriff in `ui-grid` nötig (die aktive Zeile meldet `onZeileAktiv` schon). Grund: U3 und E-18
  („Leertaste wählt die Zeile“); so bleibt die Auswahl beim Verlassen des Baums per Tastatur (Strg+Ende, Tab) erhalten.
  E2E `apps/web/e2e/bim-tastatur.spec.ts` drückt ab dem Baum nur Tasten.
- **D-122.3 Kennwert-Vermerk (Punkt 4).** `Kostenschaetzungsangaben.herleitung: (groesse, kennwert) => string` setzt der
  Aufrufer; `bim` formatiert nicht mehr. Die App (`bim/kennwerte.ts` `herleitungstext`) baut denselben Text wie vorher, darum
  bleiben `x1-kette.test.ts` und alle Sollwerte unverändert (keine Änderung an 117s Test nötig).
- **D-122.4 Namen in `ifc` (Punkt 5).** Die Typen der STEP-Ebene heißen `StepGlobalId`, `StepBauteilmenge`,
  `StepStrukturknoten`, `StepBauteil`, `StepBauwerksmodell`; `IfcSchema` (gleiche Form) kommt aus `vertrag`. Kein Präfix „Roh“,
  weil „Rohbauteil“ als Rohbau-Teil gelesen würde.
- **D-122.5 Angezeigt ohne Frist (Punkt 8).** Entscheidung: **Befund statt Fehler** (U5): `fristPruefen` meldet einen
  angezeigten Mangel ohne `Mangel.frist` (die geltende Frist laut Vertrag) als Warnung `mangel-angezeigt-ohne-frist` (Quelle
  `fristpruefung`, Ort Mangel und `feld: 'frist'`); der Code steht in der eigenen Liste von `bauleitung` (`Fristbefundcode`),
  `vertrag` bleibt. „Überfällig“ heißt nur `mangel-frist-ueberschritten` (Kennzeichen in der Liste, PDF). Grund: Der Dialog
  „Mangel anzeigen“ verlangt eine Frist schon, aber das Bearbeiten kann sie leeren, und Daten aus Dateien sollen nicht
  unbearbeitbar werden. Für 123: Der Vertragstext zur Quelle `fristpruefung` („ein überfälliger Mangel“) nennt den zweiten Code
  noch nicht.

- **D-122.6 Sprung aus einem Dialog (Punkt 10).** Frage: Der gemeinsame `Dialog` (`ui-basis`) gab beim Schließen den Fokus an
  seinen Auslöser zurück und nahm damit jedem Sprung aus dem Dialog („Zur Position“, auch „Im Baum zeigen“ im Zuordnen-Dialog)
  den Fokus. Entscheidung: **Der Dialog gibt den Fokus nur zurück, wenn nichts anderes ihn hat** (WAI-ARIA: „unless the workflow
  moves focus“), mit Test in `ui-basis`. Grund: ohne das kein Sprung aus einer Vorschau; eine kleine, allgemeine Regel statt
  Zeitgebern in der App. `ui-basis` ist im Ticket nicht genannt; außer diesem Ticket schreibt dort in dieser Phase niemand.
- **D-122.7 Sprungziel einer hängenden Zuordnung (Punkt 10).** Auf der Modellseite fokussiert „Zur Position“ den Eintrag der
  Position in der Liste „Zuordnungen“ (dort lässt sich das hängende Paar entfernen); in der Vorschau „Mengen aus Modell …“
  schließt es den Dialog und springt im LV zur Menge der Position (Vorfahren aufgeklappt, über den vorhandenen Sprung der
  LV-Seite). Grund: Die LV-Seite hat keinen Sprung über die Adresse; die Liste der Zuordnungen ist der Ort, an dem man die
  hängende Zuordnung behebt.
- **D-122.8 Frühere Stände (Punkt 11, PC-a6).** „Alle früheren Stände“ ist die Kette der Vorgänger (`vorgaengerId`), der nächste
  zuerst und vorgewählt; andere Modelle des Projekts gehören nicht dazu. Ein Stand außerhalb der Kette (Adresse von Hand) bleibt
  wählbar. Der Vorgänger behält die kurze Adresse ohne `<alt>`.
- **D-122.9 Prüfstand mit dem D-54-Modell (Punkt 15a).** Der Test erzeugt das Modell in Node (`fixtures/ifc/erzeugen.mjs`, in
  Specs erlaubt) und reicht es der Testseite über `page.route` unter `modelle/d54.ifc`; die Vite-Konfiguration darf `fixtures/`
  nicht importieren (A3). Picken misst weiter das eigene große Modell des Prüfstands (bekannte GlobalIds).

### Budgets aus Punkt 15 (D-54), gemessen 2026-11-13 auf 4 Kernen, Last etwa 1 (allein, keine anderen Läufe)

| Budget | Messung | Grenze | Ergebnis |
|---|---|---|---|
| (a) 3D laden, D-54-Modell (`erzeugen.mjs`, 10.000 Bauteile, 21 MB), Headless-Chromium mit SwiftShader | Median 3.061 ms (3.161, 2.851, 3.061) | 20 s | grün |
| (a) 3D laden und picken, eigenes 10.000-Bauteile-Modell des Prüfstands (zum Vergleich) | Laden Median 1.426 ms, Picken Median 63 ms | 20 s / 200 ms | grün |
| (a) `haus-v1.ifc` im Prüfstand (Ticket 100 §6) | 30 Bauteile mit Geometrie, Laden 765 ms, Klick wählt | – | grün |
| (b) `BauteileZuordnen` 5.000 Zuordnungen samt Undo über den Speicherweg (Kern ausführen + `SpeicherKern.anwenden`, Umkehren + anwenden), LV `gross` | Median 39,6 ms (min 33,8, max 56,8; zuordnen 16,6, Rückgängig 22,7) | 100 ms | grün |
| (c) Modellbaum 10.000 Zeilen im `VergleichsGrid` (Scrolltest wie die übrigen Grids) | 60 fps im Mittel bei 5.600 und 28.000 px/s, schlechtestes Bild 16,8 ms, kein Bild > 33 ms | wie die Grid-Budgets | grün |

### Stand

- Punkt 1 erledigt (`52cb8fe`), Punkt 2 erledigt (`da0fa55`), Punkt 3 erledigt (`df536b4`), Punkt 4 erledigt (`b9402ce`),
  Punkt 5 erledigt (`b50d65d`), Punkt 6 erledigt (`b4e7e17`), Punkt 7 erledigt (`7b36e4d`), Punkt 8 erledigt (`1334c09`).
- Punkt 9 erledigt (`6d8cdc6`), Punkt 10 erledigt (`327436b`), Punkt 11 erledigt (PC-c2 `74c9530`, PC-c3 `03bcbb1`,
  PC-a6 `b627e5b`), Punkt 12 erledigt (`0e2682b`), Punkt 13 erledigt (`012f29a`), Punkt 14 erledigt (`80d8317`), Punkt 15
  erledigt (PA1 `cf8e922`, PA2 `c34ffd1`, PC-a4 `c97843c`).
- `integration/welle-6` mit Ticket 117 gemergt (`e2923a9`).


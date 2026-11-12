# 122: Behebung des Wellen-Reviews Welle 6

Status: ready-for-agent
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

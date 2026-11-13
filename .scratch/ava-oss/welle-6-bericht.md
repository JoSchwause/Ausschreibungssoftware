# Bericht: Lauf „Welle 6“ (Demo-Modus)

Stand 2026-11-13. Orchestrator: `/implement-welle 6`. Branch `integration/welle-6` ab `79e6680` (Merge von PR #10, Welle 4 und 5
auf `main`, D-49). Diff gegen `79e6680` ohne `.scratch/` und Lockfile: 474 Dateien, rund 74.600 Zeilen neu, 460 Commits.
Schnitt: `schnitt-welle-6.md`, Übersicht `issues/README.md`. Nichts gepusht, kein Pull Request.

## Was der Lauf umfasste

Welle 6 laut `plan.md` §3 und G-05 (Nachtrag 2026-11-12): zuerst die Folgetickets 93–95 aus Welle 5, danach die Erweiterungen
X1–X5, Schwerpunkt X1 BIM in mehreren Strängen (X1a–X1f). Die Tickets 96–122 hat der Orchestrator geschnitten. 30 Tickets, alle
`resolved`; dazu die Folgetickets 123 und 124 für die nächste Welle.

| Tickets | Inhalt |
|---|---|
| 93, 94, 96 | `ui-grid`: editierbare KG-Spalte, Balkenspalte für den Bauzeitenplan; Undo am Aufmaßblatt mit 5.000 Zeilen < 100 ms |
| 95, 97 | `vertrag` v1.5 (Kleinpunkte aus Welle 5) und v1.6 (Bauwerksmodell, Modelldateiablage, Bauteilzuordnung an der Position, Bauzeitenplan, Honorarberechnung, Mangel, Bautagebucheintrag, neue Befundquellen); Opus-Review statt Nutzer (P9, D-66) |
| 98, 99, 107 | Neues Paket `ifc`: eigener STEP-Leser für IFC 2x3 und IFC 4, Abbildung auf das `Bauwerksmodell`; Fixtures `haus-v1.ifc`, `haus-v1-ifc2x3.ifc`, `haus-v2.ifc` mit Erzeuger und hergeleiteten Sollwerten (`typisch-bim.json`) |
| 100 | Neues Paket `ui-modell`: 3D-Ansicht mit web-ifc 0.0.78 (MPL-2.0) und three.js 0.186.1, Auswahl, Sichtbarkeit, Isolieren |
| 105, 106 | Kern v1.5/v1.6 (Befehle der neuen Aggregate, Zuordnungen, OZ-Vorschlag); Speicher: Repositories, Ablage der IFC-Bytes, Migration 6, Projektdatei Schema 6 |
| 108 | Neues Paket `bim`: Mengenübernahme, Aufmaßblatt aus Auswahl, DIN-277-Größen, Kostenschätzung über Kennwerte, Kostenkennwerte, Modellvergleich mit Folgen |
| 101, 110 | Neues Paket `honorar`: HOAI 2021 (§§ 35, 52, 56, 40, 44, 48), Interpolation, Zuschläge, Nebenkosten, Befehle |
| 102, 109 | Neues Paket `bauzeit`: Kalender mit Feiertagen je Land, Terminrechnung (CPM, vier Beziehungsarten), Befehle |
| 111 | Neues Paket `bauleitung`: Mängel mit Statusverlauf und Fristprüfung, Bautagebuch, Auswertungen |
| 112, 113 | Fixtures X2–X4 mit Herleitung; PDFs für Bauzeitenplan, Honorar, Mängelliste, Bautagebuch |
| 104 | `erechnung`: Befunde als gemeinsamer `Pruefbefund` |
| 103 | X5: ADR 0013 (Sync-Server nach v1, Vorschlag) und G-57, kein Code (D-55) |
| 114–116 | App BIM: Modelle, Baum und 3D; Zuordnen, Mengen übernehmen, Kennwerte, Aufmaß aus Auswahl; Modellvergleich mit „Mengen aktualisieren“ |
| 118–121 | App: Bauzeitenplan (Tor X2), Honorar (Tor X3), Mängel und Bautagebuch (Tor X4), Folgearbeit v1.5 |
| 117 | **Tor X1** (Kern und Erweitert): Kettentest und zwei E2E |
| 122 | Behebung des Wellen-Reviews |

## Was jetzt läuft

- **App** (zusätzlich zu Welle 5): Auf der Projektseite **Modelle**: IFC-Datei einlesen (IFC 2x3 oder 4, Befunde des Lesers im
  Dialog), Modellbaum (Geschosse, Bauteile) und 3D-Ansicht mit Auswahl in beide Richtungen, Eigenschaften (Psets und Mengen);
  **Zuordnung zu Positionen** (LV oder Auftrags-LV, Mengenart je Zuordnung, Befunde vor dem Zuordnen, 3D färbt „zugeordnet/ohne
  Zuordnung“), Mehrfachauswahl per Strg+Klick oder Strg+Leertaste; auf der LV-Seite **„Mengen aus Modell …“** mit Vorschau, ein
  Rückgängig-Schritt; **Aufmaßblatt aus Auswahl** am Auftrags-LV; **Kennwerte** (BGF, BRI, NRF nach DIN 277 mit Quelle,
  Kostenschätzung über Kennwerte, Kostenkennwerte je KG); **Modellvergleich** zweier Stände (hinzugefügt, entfernt, geändert,
  3D-Färbung, betroffene Positionen mit Mengendifferenz, „Mengen aktualisieren“). **Bauzeitenplan** mit Balkenspalte,
  Kalender (Feiertage je Land), kritischem Weg, Endtermin, Befunden mit Sprung, PDF. **Honorar** nach HOAI 2021 aus einer
  Kostenberechnung (§ 33, KG 400 über 25 %), Honorarzone und -satz, Leistungsphasen, Umbauzuschlag, Nebenkosten, PDF.
  **Mängel** (Statusverlauf, Frist, „überfällig“ zum Stichtag) und **Bautagebuch**, beide als PDF. Projektseite zeigt
  „Netto nach Nachlass“; zurückgehaltene Druckprofile lassen sich sichern oder entfernen; KG-Spalte direkt im LV-Grid.
- **Abschlusslauf** auf dem Branch-Ende (Code-Stand `0e979bd`, danach nur Doku; ruhige Maschine, Last 1–2,5): `pnpm lint`
  grün, `pnpm typecheck` grün, `pnpm test` 3.976 bestanden / 3 übersprungen (322 Dateien, 1 übersprungen) und 53/53 (Fixtures).
  E2E: `ui-grid` 88 bestanden / 3 übersprungen (Bildschirmfotos), `ui-modell` 15/15, `speicher` 18/18, `web` 90/90.
  XSD-Gegenprüfung 58/58. Kein Leistungsbudget rot, keines gelockert.
- **Tore (D-58, `plan.md` §4): alle erreicht.** Die Tor-E2E liefen auf dem Endstand dreimal hintereinander grün (18/18).
  - **X1-Kern:** `apps/web/e2e/x1-kern.spec.ts`: `haus-v1.ifc` einlesen → Baum und 3D → Auswahl Baum ↔ 3D (Testhaken) → Pset →
    EG-Wände der Position 03.0010 zuordnen → Mengen übernehmen: Vordersatz **33,023 m²**, LV-Netto gleich Soll → Neuladen behält
    alles samt 3D. IFC 2x3 liefert dieselben Mengen (Unit-Test). Kettentest `apps/web/src/x1-kette.test.ts` (`ifc` → `bim` →
    Kern → `vergabe` → `abrechnung` → Vergleich → DIN 277), jede Zahl gegen `fixtures/typisch-bim.json`.
  - **X1-Erweitert:** `x1-erweitert.spec.ts`: BGF/BRI/NRF **197,596 / 617,485 / 166,252**, Kostenschätzung **274.302,77** →
    Zuschlag → Aufmaßblatt aus Auswahl (EG) = Sollmengen → `haus-v2.ifc` → Vergleich (1 hinzugefügt, 1 entfernt, 5 geändert)
    und betroffene Positionen (03.0010 −4,125, 03.0020 +1,399) → „Mengen aktualisieren“: LV-Netto **35.894,85** (vorher 36.068,86).
  - **X2:** `x2.spec.ts` + `x2-kette.test.ts`: Projektende **24.11.2026**, kritischer Weg 1.1 → 1.2 → 1.3 → 2 → 3, Neuladen, PDF.
  - **X3:** `x3.spec.ts` + `x3-kette.test.ts`: anrechenbare Kosten **1.373.618,34**, Honorar **172.149,65**, brutto
    **267.595,90**, Neuladen, PDF; außerhalb der Tafel = Befund (Unit-Test).
  - **X4:** `x4.spec.ts` + `x4-kette.test.ts`: ein Mangel überfällig zum Stichtag (feste Uhr) = Befund, Bautagebuch 3 Tage,
    beide PDFs, Neuladen.
  - **X5:** ADR 0013 `proposed`, G-57 offen mit Annahme-Zeile, `plan.md` §2 verweist auf beide; kein Code.
- **Budgets D-54** (alle gemessen und grün, allein auf 4 Kernen): IFC mit 10.000 Bauteilen lesen 1,5 s CPU (≤ 5 s); Vergleich
  zweier 10k-Modelle 13,5 ms (≤ 500 ms); Modell speichern 980 ms (≤ 3 s); Projektdatei aus/ein 666/856 ms (≤ 10 s);
  Einzeländerung 3,8 ms (Speicher), 2,2 ms (Kern); `BauteileZuordnen` 5.000 samt Undo 5,3 ms im Kern, 39,6 ms über den
  Speicherweg (≤ 100 ms); 3D laden mit dem D-54-Modell (10.000 Bauteile, 21 MB) Median 3,1 s (≤ 20 s), Picken 63 ms;
  Modellbaum mit 10.000 Zeilen im Grid 60 fps, schlechtestes Bild 16,8 ms.

## Was entschieden wurde

- Log: `entscheidungen-auto.md`, Orchestrator/Berater **D-49 bis D-70**, dazu die Umsetzer-Entscheidungen in den Tickets
  (D-93.x bis D-122.x). Annahmen zu offenen Fragen: G-57 in `grilling.md` (ADR 0013 als Vorschlag), die Tore in `plan.md` §4.
- **Berater: 2 Aufrufe von höchstens 6** (vor dem Schnitt, gebündelt): X1-Bibliotheken und Paketschnitt (D-50), Ablage der
  IFC-Datei (D-51), Zuordnung am Positionsfeld (D-52), Modellstände und Mengenübernahme (D-53), Budgets (D-54), X5 nur als ADR
  (D-55), HOAI-Tafeln und Rundung (D-56), Formen für X2/X4 (D-57), Tore je Modul (D-58).
- Die wichtigsten Entscheidungen, die der Mensch prüfen sollte:
  - **D-50** eigener STEP-Leser in `ifc` (Mengen und Struktur ohne WASM), web-ifc (MPL-2.0) nur für die 3D-Geometrie in
    `ui-modell`; Paket `bim` für die Fachlogik.
  - **D-51/D-52/D-53** IFC-Bytes inhaltsadressiert in einer eigenen Tabelle außerhalb von Aggregat und Undo, in der
    Projektdatei (Schema 6) als deflate + Base64; das `Bauwerksmodell` trägt Hash, Größe und die gelesenen Daten. Zuordnung als
    `Positionsdaten.bauteile` (GlobalId + Mengenart); Modellstände mit Vorgänger; die Mengenübernahme schreibt nie 0 (Q5).
  - **D-56** HOAI-2021-Tafeln als Daten im Repo, Interpolation nach § 13, einmal kaufmännisch gerundet. **Die Tafelwerte sind
    gegen die amtliche Fassung nicht von Hand geprüft** (nur innere Stimmigkeit und unabhängig hergeleitete Fixtures).
  - **D-58** Definition der Tore X1–X5; **D-70** das X1-Tor liest `typisch` als X86 (eine X83 hat keine Preise).
  - **D-64/D-66** `vertrag` v1.5 und v1.6, vom Opus-Reviewer statt des Nutzers geprüft („ja mit Korrekturen“, behoben).
  - **D-62** Projektseite zeigt „Netto nach Nachlass“; **D-63** Meilenstein liegt am Beginn seines Tages.
  - **D-69** Umfang der Review-Behebung und sieben bestätigte Abweichungen von Tickettexten (u. a. D-107.6 doppelte GlobalIds,
    D-100.3 Prüfmethoden am Ref, D-113.1 `Berichtsmodell` neben dem `Ausgabemodell` im Sinn von ADR 0012).
  - **D-122.2** Tastatur im Modellbaum: Pfeile bewegen nur den Fokus, Leertaste wählt, Strg+Leertaste ergänzt (U3).
- **Wellen-Review** (`code-review`, Fixpunkt `79e6680`, je Achse drei Pfadscheiben): Standards 8 hart (u. a. U3 Mehrfachauswahl
  nur mit der Maus, A2 Summe in der App, N4/ADR 0012 Rohmeldungen im PDF, Glossar) und rund 45 Ermessenspunkte; Spec 24 (kein
  falscher Geldbetrag; schwerster: PDFs druckten Rohmeldungen). Behebung in Ticket 122 (D-69): alle 15 Pflichtpunkte erledigt,
  Rest als Folgeticket 123/124. Bericht: `review-welle-6.md`.

## Was fehlt oder dünn ist

- **Folgetickets** (`ready-for-agent`, Welle 7): **123** Aufräumen (Konstanten für KG-Form, Hash und Artenlisten in `vertrag`,
  weil `bim`/`ifc` den Kern nicht importieren dürfen; Switches über `ChangeSet['art']` in `speicher`; ein Seitengerüst für die
  neun neuen App-Seiten; Honorar-PDF im Worker; gemeinsamer Datumstyp; restliche Namen); **124** Fachliches (Vorgang verschieben,
  Fortschritt aus dem Leistungsstand, Bezug auf einzelne LV-Knoten im Vorgangsdialog, Hinweis „KG außerhalb der Gliederung“ an
  der Zelle, Neumessung Preisspiegel-Budget auf ruhiger Maschine).
- **Nicht von Hand geprüft:** HOAI-Tafeln gegen die amtliche Fassung; IFC-Dateien aus echten Autorenwerkzeugen (Revit,
  ArchiCAD, Allplan) – getestet sind die eigenen Haus-Fixtures und das synthetische 10k-Modell; die PDFs zu X2–X4 außerhalb des
  Seitentext-Tests; Feiertage einzelner Länder über die Fixture hinaus.
- **Budgets je Baustein gemessen, nicht am Stück:** das D-54-Modell (21 MB) wurde im 3D-Prüfstand geladen und sein Baum im Grid
  gemessen, aber nicht in der App von „IFC einlesen“ bis 3D in einem dauerhaften OPFS-Speicher eines echten Browsers.
- **Bewusst begrenzt:** Honorar außerhalb der Tafel ist nur ein Befund; eine IFC-Datei über etwa 200 MB ist ein Befund, keine
  Sperre (D-51); Eigenschaften (Psets) werden nicht gespeichert, die App liest sie bei Bedarf aus den Bytes; kein Bieterportal
  (G-14); Sync-Server offen (G-57, kein Code).
- **Unter Parallellast** (bis 8 Agenten auf 4 Kernen) fielen wieder CPU-Budgets anderer Pakete (u. a. `vergabe` Preisspiegel);
  allein jeweils grün, nichts gelockert. Der Abschlusslauf auf ruhiger Maschine war vollständig grün.
- **Nutzungslimit dreimal** (D-61, D-65, D-67): Alle Agenten standen jeweils bis zum Ende des Fensters und liefen danach aus
  ihrem gespeicherten Stand weiter. Verloren ging nichts, gekürzt wurde nichts (die Kürzungsreihenfolge aus dem Schnitt griff nie).

## So probiert man es aus

```bash
git checkout integration/welle-6
```

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm dev
```

```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test
```

```bash
CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm e2e -- --trace off
```

```bash
CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test e2e/x1-kern.spec.ts e2e/x1-erweitert.spec.ts e2e/x2.spec.ts e2e/x3.spec.ts e2e/x4.spec.ts --trace off
```

```bash
pnpm --filter @tethys/gaeb run xsd-gegenpruefung
```

In der App (Weg von X1): Projekt anlegen → ein LV mit Positionen (anlegen oder per GAEB einlesen) → auf der Projektseite
„Modelle“ → `fixtures/ifc/haus-v1.ifc` einlesen → im Baum ein Geschoss öffnen, Wände wählen (Strg+Klick oder Strg+Leertaste),
im 3D prüfen → „Zuordnung zu Positionen“: LV wählen, „Zuordnen …“ → auf der LV-Seite „Mengen aus Modell …“ → Vorschau →
übernehmen → „Kennwerte“ ansehen → `fixtures/ifc/haus-v2.ifc` als neuen Stand einlesen → „Mit Vorgänger vergleichen“ →
„Mengen aktualisieren“. Die genauen Zahlen des Tors entstehen mit `typisch` (die E2E schreibt es als X86, `x1-aufbau.ts`).
Dazu auf der Projektseite „Bauzeitenpläne“, „Honorar“, „Mängel“ und „Bautagebuch“ (Werte wie in `fixtures/bauzeit.json`,
`honorar.json`, `bauleitung.json`), jeweils mit PDF.

## Eintritt Welle 7

`plan.md` §3 nennt keine Welle 7. Vorher:

1. **Mensch:** `entscheidungen-auto.md` D-49 bis D-70 durchsehen (vor allem D-50 bis D-58 vom Berater, D-64/D-66 `vertrag`
   v1.5/v1.6, D-69, D-70); `vertrag` v1.5/v1.6 annehmen oder ändern; die HOAI-Tafeln (`packages/honorar`) gegen die amtliche
   Fassung prüfen; ADR 0012 (`Berichtsmodell` neben dem `Ausgabemodell`) und ADR 0013 annehmen oder verwerfen; G-57 entscheiden.
2. **Merge:** `integration/welle-6` nach `main` (ein Pull Request, P7).
3. **Folgetickets 123 und 124** vor neuen Strängen (123 beginnt mit einem Vertragsticket, A4/P9).
4. **Umfang von Welle 7 festlegen** (`plan.md` §3): etwa X6 KI-Assistent (nach M4 vorgesehen, nicht in Welle 6), das
   Nutzerinterview mit dem Büro (G-02) auf Grundlage von M4 und X1–X4, oder echte IFC-Dateien aus dem Büro als Prüfstein für X1.

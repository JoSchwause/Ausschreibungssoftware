# 146: App: Einlesen-Dialoge in Nutzersprache

Status: claimed
Type: task
Welle: 7 · Strang: E7 · Paket/Ordner: `apps/web/src/gaeb/`; in `abrechnung/` (X31), `rechnung/` (XRechnung), `bim/` (IFC) nur die Befundanzeige der Einlese-Dialoge
Blocked by: 136, 131, 137, 139 (D-82, S7: Bieterangaben werden erst mit Kern und Speicher gehalten)
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U5, N4, L4, L5
Herkunft: umfang §3 E7 (App-Teil), B-10 bis B-12

## What to build

1. Ein gemeinsamer Baustein „Befunde beim Einlesen“: zusammengefasst („Nicht übernommen: Währung, Projektbezeichnung, …“),
   Einzelheiten aufklappbar, Zahlen de-DE (N4), keine Kennungen als Lesetext, kein „Vertrag“, Zeilenangabe nur, wenn sie hilft;
   Kopfdaten nicht als 14 Einzelzeilen. Texte aus den Codes und Werten (136).
2. Eingesetzt in den Dialogen GAEB einlesen, Angebot (X84) einlesen, X31, XRechnung, IFC.
3. Dateidialog bietet alle GAEB-Endungen an (`.x8*`, `.d8*`, `.p8*`, Groß/Klein); abgewiesene Dateien zeigen den Satz aus 136.
5. **Aus 129:** veraltete Texte `apps/web/src/gaeb/gaeb.ts:58` und `keinX84` in `gaeb/texte.ts` („X84 in GAEB 3.3 oder 3.2“) auf den Stand nach 3.1 bringen.
4. GAEB einlesen ohne offenes Projekt legt das Projekt an (Weg für 147 „GAEB-Datei einlesen“): Funktion bereitstellen.

## Acceptance criteria

- [ ] E2E: BVBS-X83 einlesen zeigt zusammengefasste Befunde; X85 wird mit Satz abgewiesen
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Umsetzung (Agent, Demo-Modus). Seams (ohne Mensch festgelegt): `befundeZusammenfassen` (`apps/web/src/gaeb/befunde.ts`, rein),
`angebotAnlegenPlan` (Bieterangaben), `projektVorschlag` und `projektAusGaebAnlegen` (`apps/web/src/gaeb/einlesen.ts`, mit echtem
Kern und Speicher im Speicher), dazu E2E. Tests: `gaeb/befunde.test.ts`, `gaeb/einlesen.test.ts`, `gaeb/gaeb.test.ts` (+2),
`gaeb/datei.test.ts` (+1), `e2e/gaeb.spec.ts` (+2 neu, 3 angepasst), `e2e/aufmass.spec.ts` (eine Zeile: Kurztext statt Code).

**Für 147 („GAEB-Datei einlesen“ beim ersten Start):** `<GaebEinlesen projekt={null} onAngelegt={(ziel) => …} />` aus
`apps/web/src/gaeb/GaebEinlesen.tsx`: Knopf „GAEB-Datei einlesen“, im Dialog „Name des Projekts“ und „Bauherr“ (vorgeschlagen,
änderbar), „Übernehmen“ legt Projekt und LV als einen Undo-Schritt an; `onAngelegt` bekommt `{ projektId, lvId }` (z. B. zur
Projektseite gehen). Ohne Oberfläche: `projektAusGaebAnlegen(umgebung, { name, bauherr }, inhalt)` und
`projektVorschlag(vorschau, dateiname)` aus `apps/web/src/gaeb/einlesen.ts`. Das E2E für diesen Weg gehört zu 147 (erst dort hat
eine Seite den Knopf ohne Projekt).

- **D-146.1** Wie sieht „zusammengefasst“ aus? Entscheidung: vorn der Satz einer Abweisung (Meldung des Lesers bei
  `dateiart-unbekannt`, `format-`, `phase-`, `version-nicht-unterstuetzt`, `wurzel-unerwartet`), dann „n Fehler, m Warnungen“,
  „Nicht übernommen: …“ (Bezeichnungen aus 136, jede einmal), die übrigen Befunde je Code eine Zeile mit Kurztext, gesammelten OZ
  oder „n Vorkommen“ und – nur bei einem Befund – seinen Zahlen deutsch („Steuersatz ergänzt: 19,00 %“; mehrere Zahlen mit Namen:
  „Datei 450.000,00 €, gerechnet 1.234,50 €“); Fehler zuerst. Die Einzelheiten (aufklappbar, `<details>`) zeigen je Befund
  Kurztext, die ausführliche Meldung des Lesers (enthält nach D-136.4 den Pfad in der Datei), OZ und die Zeile nur nach
  `zeileHilft`. Grund: B-12 (14 Kopfzeilen, Codes, „(Zeile 3)“ an jeder Zeile); die Meldung bleibt für die, die es genau wissen
  wollen (Q5).
- **D-146.2** Befunde anderer Leser (XRechnung, IFC) tragen keine Werte und keine Gruppe. Entscheidung: derselbe Baustein mit einer
  Kurztextliste je Dialog (`rechnung/texte.ts` `xrechnung.kurztexte`, `bim/texte.ts` `einlesen.kurztexte`, je `satisfies` über die
  Codeliste des Pakets); ohne Kurztext steht die Meldung als Titel. Zeile bei diesen nur ohne Knoten. Die übrigen Befundlisten im
  Modell (`bim/BefundListe`, Sprung in den Baum) bleiben, nur der Einlese-Dialog wechselt.
- **D-146.3** Dateidialog: HTML kennt keine Muster wie `.x8*`. Entscheidung: `GAEB_ENDUNGEN` (`gaeb/datei.ts`) zählt `.x80`–`.x89`,
  `.d80`–`.d89`, `.p80`–`.p89`, `.x31` und `.xml` je klein und groß auf; gilt für „GAEB einlesen“ und „Angebot einlesen“ (falsche
  Dateien bekommen so den Satz aus 136 statt gar nicht wählbar zu sein). Der X31-Dialog behält seine Endungen (Ordner `abrechnung`
  nur Befundanzeige).
- **D-146.4** Bieterangaben aus der X84: Ein neuer Bieter bringt sie mit (`BieterAnlegen` mit `angaben`), auch wenn der Name im
  Dialog geändert wurde (es bleibt der Bieter der Datei). Ein vorhandener Bieter gleichen Namens wird nicht überschrieben; der Dialog
  zeigt die Angaben der Datei und dann den Satz, dass sie nicht übernommen werden (149 bietet `BieterangabenSetzen` an).
  `Angebotsvorschau.bieterAngaben` ist optional, damit `ausgabe/logik.ts` (Excel-Vorschau, fremder Ordner) unverändert bleibt.
- **D-146.5** Projekt aus GAEB: Name aus dem LV (sonst Dateiname ohne Endung), Bauherr vorgeschlagen aus dem Namen des
  Auftraggebers am LV (sonst leer); beides im Dialog änderbar. Grund: Das Glossar setzt Auftraggeber und Bauherr nicht gleich; ein
  sichtbarer, änderbarer Vorschlag tut das auch nicht, und der Auftraggeber bleibt am LV. Projekt und LV sind ein Undo-Schritt (wie
  Bieter und Angebot); weist der Kern das LV ab, bleibt das Projekt einzeln rückgängig zu machen.
- **D-146.6** `Befundliste` (nur noch in den Ausgabe-Dialogen GAEB, Auftrags-LV, X31) zeigt den Code nicht mehr als Text (L5).
  `ausgabe/ExcelBefunde.tsx` zeigt ihn noch (fremder Ordner, nicht angefasst; für 159 oder den Schreiber von `ausgabe`).
- **D-146.7** Aus 129: `keinX84` nennt jetzt „Angebotsabgabe (X84) im Format GAEB DA XML 3.1, 3.2 oder 3.3“ und erscheint nur noch,
  wenn der Leser keinen eigenen Satz liefert; der Kommentar an `Lesevorschau.uebernehmbar` (`gaeb.ts`) und die Doku von `lvLesen`
  und `angebotLesen` nennen 3.1.

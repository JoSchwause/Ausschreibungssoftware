# Bericht: Lauf „Welle 5“ (Demo-Modus)

Stand 2026-11-12. Orchestrator: `/implement-welle 5`. Branch `integration/welle-5` ab dem Ende von Welle 4 (`97bd414`,
`integration/welle-4`; Welle 4 liegt nicht auf `main`, D-31). Diff gegen `97bd414`: 375 Dateien, rund 48.600 Zeilen neu, 308 Commits. Schnitt: `schnitt-welle-5.md`,
Übersicht `issues/README.md`.

## Was der Lauf umfasste

Welle 5 laut `plan.md` §3: A1–A4 · M3 · C2–C5 · O3, dazu die Folgetickets 70–75 aus Welle 4. Die Tickets 76–92 hat der
Orchestrator geschnitten; 70 und 71 sind gegenüber Welle 4 erweitert (v1.4). 23 Tickets, alle `resolved`.

| Tickets | Inhalt |
|---|---|
| 70 | `vertrag` v1.4: Repository Auftrags-LV, Befehle am Auftrags-LV (`NachtragUebernehmen`, `KostengruppeSetzen`), Nachtragsangaben, Kostengruppe, Vorlage/Textquelle, Aggregate Aufmaßblatt, Rechnung, Kostenermittlung, `Leistungsstand`; Opus-Review statt Nutzer (D-42) |
| 71, 79 | Kern v1.4 (Umkehrung Auftrags-LV, neue Befehle); Speicher Migration 5, Projektdatei v5, Repositories, Löschregeln, Freigabe-Reihenfolge |
| 80, 81 | Neues Paket `abrechnung`: Nachtrag übernehmen, Aufmaß-Befehle, Soll/Ist (VOB/B § 2 Abs. 3), Leistungsstand, Rechnungsprüfung (Abzugskette D-34) |
| 78, 82 | `kosten`: EP-Kalkulation (C4), Kostenermittlung als Aggregat, Kostenkontrolle (D-37) |
| 76 | Neues Paket `erechnung`: XRechnung lesen (UBL und CII), KoSIT-Testdateien (Apache-2.0) |
| 73, 83, 84 | `gaeb`: Wahlgruppe im X83-Rundweg, X31 lesen/schreiben (M3), Kostengruppe als DIN-276-Katalogzuordnung |
| 77 | `ausgabe`: Druckprofile, Spike getaggtes PDF (pdfkit kann Tags; pdfmake bleibt für v1) |
| 72, 74, 75 | Restpunkte: `summen.vorher` im Angebot (plus zweiter Undo-Fehler), Grid-Restpunkte (Vergleichsgrid schneller), Fixtures nach D-05 |
| 85 | Fixture `typisch-abrechnung.json` mit hergeleiteten Sollwerten für M4 |
| 86–90 | App: Nachträge, Aufmaßblätter + Soll/Ist + X31, Rechnungen prüfen/freigeben + XRechnung, Kosten (Ermittlung, KG, Kontrolle, Kalkulation), Druckprofile + Muster-LV + Textquelle |
| 91 | **Tor M4**: Kettentest und E2E über die Oberfläche; M3 jetzt per X83 |
| 92 | Behebung des Wellen-Reviews |

## Was jetzt läuft

- **App:** zusätzlich zu Welle 4: **Nachträge** (auf der Auftrags-LV-Seite „Nachtrag anlegen“ → Nachtrags-LV mit Kopfband und
  Status, Angebot des Auftragnehmers per X84/Excel/Erfassung, „Beauftragen“ mit Vorschau hängt die Positionen als Gliederung
  „Nachtrag N01“ ins Auftrags-LV); **Aufmaßblätter** je Auftrags-LV mit Mengenansatz (Formel 91) über das Panel, **Soll/Ist**
  mit Befund über 110 %, **X31** einlesen und je Blatt ausgeben; **Rechnungen** (Abschlag/Schluss, Umlagen, Sicherheits- bzw.
  Gewährleistungseinbehalt) mit Prüfansicht der Abzugskette, gefordert gegen geprüft, Freigeben (Zahlbetrag eingefroren),
  **XRechnung einlesen** (UBL und CII); **Kosten**: Kostenermittlungen (Stufe nach DIN 276, Bezeichnungen aus eigener CSV),
  Kostengruppen zuordnen (LV und Auftrags-LV, Dialog mit Mehrfachauswahl), **Kostenkontrolle** (Budget, Vergabe, Abrechnung,
  Abweichung je Kostengruppe), **EP-Kalkulation** je Position; **Druckprofile** im PDF-Dialog; **Muster-LV** kennzeichnen und
  „Aus Vorlage übernehmen…“; Textquelle je Position; Kostengruppen im GAEB-Export (DIN-276-Katalog).
- **Suite auf dem Branch-Ende** (Code-Stand `b281a1f`, danach nur Doku; ruhige Maschine, Last 1,0–2,0): `pnpm lint` grün, `pnpm typecheck` grün,
  `pnpm test` 2606 bestanden / 3 übersprungen (205 Dateien) und 29/29 (Fixtures). E2E: `ui-grid` 63 bestanden / 3 übersprungen
  (Bildschirmfotos), `speicher` 17/17, `web` 76/76. XSD-Gegenprüfung 58/58 (amtliches XSD inkl. X31, lokal geladen, nie im Repo).
  Kein Leistungsbudget rot.
- **Tor M4** („durchgehende Kette LPH 6–8“, D-38): **erreicht.** `apps/web/e2e/m4.spec.ts` dreimal hintereinander grün, ganz über
  die Oberfläche: LV `typisch` per X83, zwei X84, Zuschlag an Bieter B (3 % Nachlass), Nachtrag N01 beauftragt, Kostenberechnung
  und Kostengruppen, Aufmaßblatt 1 und 2 über die Mengenermittlung, Soll/Ist mit genau einem Befund (02.0040, 112,50 %),
  Abschlagsrechnung 1 = **8.874,40** (freigegeben), Abschlagsrechnung 2 = **10.100,84**, nach Korrektur an Blatt 1 **10.070,67**
  bei unverändert eingefrorenen 8.874,40, Kostenkontrolle je Zeile gleich den Sollwerten (Gesamt: Budget 60.900,00, Vergabe
  58.009,66, Abrechnung 16.846,81), Neuladen behält alles. Dazu der Kettentest ohne Oberfläche `apps/web/src/m4-kette.test.ts`
  (`vergabe` → Kern → `abrechnung` → `mengen` → `kosten`), jede Zahl gegen `fixtures/typisch-abrechnung.json`, deren Sollwerte
  unabhängig hergeleitet sind (N2, N5, D-34, VOB/B § 2 Abs. 3; C4). `m3.spec.ts` liest das LV jetzt per X83 (D-64.1 zurückgenommen).

## Was entschieden wurde

- Log: `entscheidungen-auto.md`, Orchestrator/Berater **D-31 bis D-48**, dazu die Umsetzer-Entscheidungen in den Tickets
  (D-70.x bis D-92.x). Annahmen zu offenen Fragen stehen in `grilling.md` (G-17, G-27, „VOB 80“) und `plan.md` §4 (M4).
- **Berater: 2 Aufrufe von höchstens 6.** Aufruf 1 (gebündelt): G-27 Abzugskette (D-34), Nachtragsmodell und „VOB 80“
  (D-35), Umfang `vertrag` v1.4 (D-36), Kostenkontrolle (D-37), Tor M4 (D-38). Aufruf 2: `LvUebersicht` (D-43) und
  `gefordert` (D-44) nach dem Review von v1.4.
- Die wichtigsten Entscheidungen, die der Mensch prüfen sollte:
  - **D-34** (G-27) Rechnungsprüfung: kumulierte Abschlags- und Schlussrechnung; Leistung → Nachlass (Prozent; absolut
    anteilig in Abschlag) → MwSt → Umlagen (nach der MwSt, auf Brutto) → Sicherheits-/Gewährleistungseinbehalt → frühere
    Zahlbeträge **eingefroren** (`RechnungFreigeben`). Skonto, Bauabzugsteuer, Vertragsstrafe später.
  - **D-35** Ein Nachtrag ist ein Ausschreibungs-LV mit Nachtragsangaben; Beauftragen hängt seine Positionen als Gliederung
    „Nachtrag Nnn“ ins Auftrags-LV (PositionIds bleiben). „VOB 80“ = vermutlich § 650c Abs. 3 BGB, nicht in v1. Soll/Ist-Schwellen
    110 %/90 % (VOB/B § 2 Abs. 3), < 90 % nur nach der Schlussrechnung.
  - **D-36/D-42** `vertrag` v1.4, geprüft von einem Opus-Reviewer statt des Nutzers (P9); Leck `vorlage`/`nachtrag` im Zuschlag
    geschlossen.
  - **D-37** Kostenkontrolle ohne Verteilung des Nachlasses (eigene Zeilen „ohne Kostengruppe“ und „Nachlass“), netto.
  - **D-38** Definition des Tors M4 (in `plan.md` §4 eingetragen).
  - **D-32** XRechnung in eigenem Paket `erechnung` statt in `abrechnung`; **D-33** M3 nur X31, DA11 später.
  - **D-48** Maske eines Nachtrags-LV ohne oberste Stufe (Review-Befund P6).
- **Wellen-Review** (`code-review`, Fixpunkt `97bd414`): Standards 12 (2 hart: Glossar-Doppelbedeutungen), Spec 7 (kein
  falscher Geldbetrag; schwerster P6: Nachtrags-OZ eine Stufe zu tief). Behebung in Ticket 92 (D-47), alle 8 Pflicht- und 9 Sollbefunde behoben (u. a. P6 Maske des Nachtrags-LV, D-48; Glossar-Doppelbedeutungen; eine Tabelle für Undo und Sprungziel je Aggregatart; gemeinsame `Verweis`-Komponente; KG-Formregel und Baumhilfe aus dem Kern); P1 und P4 als Folgetickets 93 und 94.

## Was fehlt oder dünn ist

- **Folgetickets 93–95** (`ready-for-agent`, Welle 6): editierbare KG-Spalte im Grid (93; heute ein Dialog, D-89.1); Undo am
  Aufmaßblatt mit 5.000 Zeilen dauert 82–144 ms statt < 100 ms (94, D-45); `vertrag` v1.5 Kleinpunkte (95: einheitlicher
  Fehlercode, Befundquelle E-Rechnung, OZ-Vorschlag am Auftrags-LV, offene Typfragen aus Ticket 70).
- **Nicht in v1 (bewusst):** ZUGFeRD und XRechnung erzeugen (G-15), Schematron-Prüfung der XRechnung, Skonto/Bauabzugsteuer/
  Vertragsstrafe/Stundenlohnzettel in der Rechnungsprüfung (D-34), § 650c Abs. 3 BGB (D-35), DA11/GAEB 90 (D-33), andere
  REB-Formeln als 91 (bleiben Text mit Befund, D-83.2), getaggtes PDF (Spike in ADR 0012: pdfkit möglich, eigener Renderer nötig).
- **Druckprofile** liegen im `localStorage` des Browsers, nicht in der Sicherung (D-90.1; Weitergabe per JSON-Datei).
- **Nicht von Hand geprüft:** XRechnung aus echten Rechnungsprogrammen; X31 mit einer realen Aufmaßsoftware (die BVBS-X31 passt
  zu keiner Position von `typisch`, D-87); PDF/Excel außerhalb von LibreOffice; Sicherungsordner über einen Neustart.
- **Unter Parallellast** (Last bis ~17 auf 4 Kernen) fielen wiederholt CPU-Budgets in `vergabe` (Preisspiegel `gross`), `kern`
  (`k9-leistung`, `lvPruefen gross`) und `gaeb` (2-MB-Datei); allein jeweils grün, kein Budget gelockert.
- **Nutzungslimit:** Gegen 19:30 traf der Lauf das 5-Stunden-Limit; alle Agenten standen bis 21:10 und wurden danach aus
  ihrem gespeicherten Stand fortgesetzt (D-46). Verloren ging nichts.
- Ein zusätzlicher übersprungener Test (3 statt 2) gegenüber Welle 4: der neue X31-Fall in `packages/gaeb/src/xsd-ausgabe.test.ts` läuft nur innerhalb der XSD-Gegenprüfung (dort bestanden).

## So probiert man es aus

```bash
git checkout integration/welle-5
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
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm e2e
```

```bash
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test e2e/m4.spec.ts
```

```bash
pnpm --filter @tethys/gaeb run xsd-gegenpruefung
```

In der App (Weg von M4): Projekt anlegen → LV per GAEB (X83) einlesen → zwei X84 aus `fixtures/angebote/` → „Preisspiegel“ →
„Zuschlag erteilen“ → auf der Auftrags-LV-Seite „Nachtrag anlegen“, Positionen erfassen, Angebot des Auftragnehmers, „Beauftragen“
→ „Kostengruppen“ zuordnen, auf der Projektseite „Kosten“ eine Kostenberechnung anlegen → „Aufmaß“: Blatt anlegen, Mengen über
das Panel (Formel 91) → „Soll/Ist“ → „Rechnungen“: Abschlagsrechnung anlegen (Umlage, Sicherheitseinbehalt), prüfen, freigeben
→ zweites Blatt, zweite Rechnung → „Kostenkontrolle“. Dazu: „XRechnung einlesen“ (Testdateien in `fixtures/extern/xrechnung/`),
„Als X31 ausgeben“ je Blatt, Druckprofile im PDF-Dialog, „Aus Vorlage übernehmen…“ nach dem Kennzeichnen eines Muster-LV.

## Eintritt Welle 6

Welle 6 (`plan.md` §3): die in G-05 gewählten X-Stränge – keine gewählt. Vorher:

1. **Mensch:** `entscheidungen-auto.md` D-31 bis D-48 durchsehen (vor allem D-34, D-35, D-36/D-42, D-37, D-38, D-48);
   `vertrag` v1.4 annehmen oder ändern; G-27 und „VOB 80“ in `grilling.md` bestätigen oder neu entscheiden; ADR 0012 (Spike-
   Ergebnis) annehmen.
2. **Merge:** `integration/welle-4` und `integration/welle-5` nach `main` (Welle 5 enthält Welle 4; ein Pull Request genügt,
   P7). Das Tor M4 ist die Grundlage für das Interview mit dem Büro (G-02).
3. **Folgetickets 93–95** vor neuen Strängen.
4. **G-05** neu fragen: welche X-Stränge (BIM, Bauzeitenplan, HOAI, Bauleitung, Bieterportal, KI-Assistent nach M4) in Welle 6.

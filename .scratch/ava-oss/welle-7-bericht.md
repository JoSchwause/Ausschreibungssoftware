# Bericht: Lauf „Welle 7“ (Demo-Modus)

Stand 2026-11-14. Orchestrator: `/implement-welle 7`. Branch `integration/welle-7` (lokal) ab `4eefd7d` (= `origin/main`, D-76).
Diff gegen `4eefd7d` ohne `.scratch/` und Lockfile: 660 Dateien, rund 63.200 Zeilen neu und 5.200 entfernt, 511 Commits.
Schnitt: `schnitt-welle-7.md`, Übersicht `issues/README.md`. Auf Wunsch des Nutzers nach dem Abschluss als PR #13
(Branch `ccr-6ba19f0a-sxnytm`) nach `main`, Merge nach grüner CI (D-112).

## Was der Lauf umfasste

Welle 7 „Einführungsreife“ laut `umfang-welle-7.md` (E1–E17, A5, M4, Tor E) und G-58 bis G-64: die letzte Welle vor Demo und
Probebetrieb im Büro. Geschnitten wurden die Tickets 127–159 (D-76); im Lauf kamen 160–163 dazu (D-96, D-100, D-110). Die
Tickets 123 und 124 aus Welle 6 gingen darin auf. **36 von 37 Tickets `resolved`**, Ticket 157 (M4) nach §4 gekürzt (D-108).

| Tickets | Inhalt |
|---|---|
| 127, 128, 160 | `vertrag` v1.7a (Bedienung, Stammdaten, Einstellungen, Konstanten), v1.7b (Vertragsstrafe, Skonto, Bauabzugsteuer, Zahlungen; A5), v1.7c (Projekt samt Inhalt löschen); Opus-Review statt Nutzer (D-82, Wellen-Review) |
| 129, 136, 144, 145 | `gaeb`: GAEB DA XML 3.1 lesen; Dateiart erkennen und Meldungen; **GAEB 90** und **GAEB 2000** lesen (.d8x/.p8x) mit Formatvergleich |
| 130, 156 | `ui-grid`: Spaltenbreiten, OZ-Breite, Höhe, Kürzeltabelle; Suchen, Filtern, Kontextmenü |
| 135, 137, 138, 139, 140 | `speicher` eine Tabelle je ChangeSet-Art, Migration 7 und Projektdatei Schema 7; Kern v1.7a; Vergabe (Bieter umbenennen/löschen, Zuschlag zurücknehmen); Fachpakete aufgeräumt |
| 141, 153 | `ausgabe`: Preisspiegel, Vergabevorschlag, Aufmaßblatt, Soll/Ist, Kostenermittlung, Kostenkontrolle, Zahlungsfreigabe mit A5 |
| 143 | `abrechnung`: Vertragsstrafe, Skonto, Bauabzugsteuer (§ 48 EStG), Zahlungen; Fixture `typisch-zahlungen.json` und Kettentest |
| 131, 132, 133, 134 | App: Seitengerüst und Navigation, Fehlergrenze und Browserprüfung, einheitliche Sprache mit Sprachtest, Bereitstellung (Pages-Workflow, Version 0.7.0, Dokumente) |
| 142, 146–152, 154, 155 | App: Arbeitsfläche, Einlesen-Dialoge, erster Start mit Beispielprojekt und Hilfe, LV-Bedienung, Vergabe, Projektangaben/LV-Stände/Einstellungen, Auftrags-LV und geführter Nachtrag, Aufmaß/Rechnung/Zahlungen, Kosten, Vorschau-Module |
| 161, 162 | Projekt samt Inhalt löschen (Kern, Speicher, Dialog, Undo/Wiederholen); Fokus nach Löschen eines Druckprofils |
| 158 | **Tor E** (`umsteiger.spec.ts`, `ueberlauf.spec.ts`) |
| 159, 163 | Behebung beider Review-Durchgänge; Reste (gemeinsame Skonto-Regel, Escape-Wackler an der Ursache) |

## Was jetzt läuft

- **App** (zusätzlich zu Welle 6): Kopfzeile mit Projekt- und Seitennavigation, Brotkrumen, „Weitere Aktionen“; **erster
  Start** mit Beispielprojekt, Hilfe mit Tastenkürzeln, Seite „Annahmen“ und Stand der Version; Speicherstatus in der
  Statuszeile; Fehlergrenze mit deutschem Text und nächstem Schritt; Browserprüfung nach Fähigkeiten (D-77).
  **Einlesen** von GAEB DA XML 3.1/3.2/3.3, **GAEB 90** und **GAEB 2000** (X81, X83, X84, X86), Dialoge in Nutzersprache mit
  Befunden; Projekt aus X83 anlegen. **LV**: Suchen/Filtern, Kontextmenü, OZ-Maske, KG-Hinweis, Langtexte. **Vergabe**: Bieter
  umbenennen/löschen, Angebotspreise im gemeinsamen Grid (EP-Spalte), Zuschlag zurücknehmen (mit Sperren nach D-74),
  Preisspiegel und Vergabevorschlag als PDF mit Vorschau. **Projekt**: Stammdaten, LV-Stände, Einstellungen (Büro,
  Druckprofile, KG-Bezeichnungen) als globales Aggregat, Projektdatei Schema 7, Einlesen als Kopie, **Projekt samt Inhalt
  löschen** mit Sicherung, Undo und Wiederholen. **Auftrag/Nachtrag**: Auftrags-LV mit Langtext und Excel, geführter Nachtrag.
  **Abrechnung**: Aufmaßblatt, Soll/Ist und Rechnungsprüfung als PDF und Excel; Rechnung mit **Vertragsstrafe, Skonto (Satz
  und Frist), Bauabzugsteuer**, Freigabe, **Zahlungen** erst nach Freigabe, Spalte „Offen“, **Zahlungsfreigabe als PDF**.
  **Kosten**: Kalkulationsansätze, Kostenermittlung und -kontrolle als PDF (im Worker) und Excel. Vorschau-Module (BIM,
  Bauzeit, Honorar, Bauleitung) im gemeinsamen Seitengerüst, als „Vorschau“ gekennzeichnet (G-60).
- **Abschlusslauf** auf dem Endstand (Code `103e4e9`, danach nur `.scratch/`; ruhige Maschine, Last unter 3 auf 4 Kernen):
  `pnpm lint` grün, `pnpm typecheck` grün, `pnpm test` **4.826 bestanden / 3 übersprungen** (406 Dateien, 1 übersprungen), alle
  Leistungsbudgets grün, keines gelockert. E2E: `ui-grid` 109 bestanden / 3 übersprungen
  (Bildschirmfotos), `ui-modell` 15/15, `speicher` 19/19, `web` **129/129**. XSD-Gegenprüfung 72/72, Pfadprobe mit Basis-Pfad
  1/1, `reuse lint` konform.
- **Tor E „Einführungsreife“ (`plan.md` §4): erreicht.** Die beiden Tor-E2E liefen auf dem Endstand dreimal
  hintereinander grün (`--repeat-each 3`, zusammen mit `bim-tastatur.spec.ts`: 9/9), vorher dreimal in Ticket 158.
  1. `apps/web/e2e/umsteiger.spec.ts` (1280×800, nur Knöpfe, Links, Dateiauswahl und Tastatur, keine Testhaken, keine getippten
     Adressen): Beispielprojekt → neues Projekt aus der amtlichen BVBS-X83 (≥ 15 Zeilen mit EP und GP) → zwei X84 (die zweite
     ist die amtliche mit verdoppelten EP, D-158.1) → Preisspiegel-PDF → Zuschlag → Nachtrag geführt anlegen und beauftragen →
     Aufmaßblatt → Rechnung 1 mit 3,00 % Skonto und 14 Tagen Frist („Bei Zahlung bis 13.11.2026: Auszahlung 13.274,45 €, danach:
     13.685,00 €“), Freigabe, Zahlung 13.274,45 → „Skonto (verwirklicht)“, Offen 0,00, Zahlungsfreigabe-PDF → Kostenkontrolle-PDF
     → Projektdatei sichern → **Projekt samt Inhalt löschen**, Strg+Z, Strg+Y → Sicherung einlesen → dieselben Werte.
  2. `ueberlauf.spec.ts`: 36 Adressen und alle Hilfe-Reiter bei 1280 px ohne waagerechten Überlauf; eine neue Route ohne Besuch
     lässt den Test fehlschlagen.
  3. `formatvergleich.test.ts`: dasselbe LV als XML 3.3, XML 3.1, GAEB 90 und GAEB 2000 ergibt dasselbe Modell.
  4. `sprache.test.ts` und `Fehlergrenze.test.tsx` grün.
  5. Frühere Tore M1, M3, M4, X1-Kern, X1-Erweitert, X2, X3, X4 grün (in der vollen E2E); kein Budget gelockert.

## Was entschieden wurde

- Log: `entscheidungen-auto.md`, Orchestrator/Berater **D-71 bis D-111**, dazu die Umsetzer-Entscheidungen in den Tickets
  (D-127.x bis D-163.x). Annahme zu G-27 (Erweiterung um A5) in `grilling.md` unter G-27 (D-72).
- **Berater: 2 Aufrufe von höchstens 6**: vor dem Schnitt gebündelt (D-71 Ticket 125 ohne Lieferung, D-72 Lage von
  Vertragsstrafe/Skonto/Bauabzugsteuer in der Abzugskette, D-73 Einstellungen als globales Aggregat, D-74 Zuschlag
  zurücknehmen, D-75 M4 zuletzt und Formelauswahl) und im Lauf D-96 („Projekt samt Inhalt löschen“ als eigener Befehl für
  den Tor-Schritt „Projekt löschen“).
- Die wichtigsten Entscheidungen, die der Mensch prüfen sollte:
  - **D-72** Abzugskette mit A5: … → Vertragsstrafe (Bruttobetrag, ohne MwSt-Wirkung, kumuliert) → Einbehalt → frühere
    Zahlbeträge → Zahlbetrag (eingefroren) → Skonto (Frist ab Eingang, Eingangstag zählt nicht) → Bauabzugsteuer 15 %.
  - **D-73/D-84** Einstellungen global, außerhalb der Projekt-Undo-Historie; Übernahme aus einer Projektdatei ist ein
    protokollierter Befehl und füllt nur Fehlendes.
  - **D-74** Zuschlag zurücknehmen sperrt bei Nachträgen, Aufmaßblättern, Rechnungen und Mängeln.
  - **D-96/D-102/D-104/D-109** Projekt samt Inhalt löschen: eigener Befehl mit Bestand; Undo stellt das Projekt samt Protokoll
    wieder her (byte-gleich bis auf den angehängten `Rueckgaengig`-Eintrag); nach Löschen → Undo → Wiederholen → Undo fehlt der
    erste `Rueckgaengig`-Eintrag (Protokoll ist Nebenbuch, ADR 0009 hat die Folge nachgetragen).
  - **D-71/D-80** GAEB 90 und 2000 nach frei zugänglicher Formatbeschreibung, eigene Testdateien; Inhalte ohne Platz im
    Vertrag bleiben Befunde, keine Umdeutung.
  - **D-82, D-93, D-102** `vertrag` v1.7a/b/c vom Opus-Reviewer statt des Nutzers geprüft („ja mit Korrekturen“, behoben).
  - **D-78** Version 0.7.0; **D-90** Beispielprojekt aus den Fixtures über ein Vite-Plugin; **D-77** Firefox/Safari ungeprüft.
  - **D-108** M4 (weitere REB-Formeln) gekürzt.
- **Wellen-Review** (`code-review`, Fixpunkt `4eefd7d`, je Achse zwei Pfadscheiben, parallel zu den letzten drei Tickets,
  D-103): Standards SA1–SA13, SB1–SB14; Spec MUST-1 (Wiederholen nach Undo von „Projekt samt Inhalt löschen“ schlug fehl),
  SOLL-1 bis -3, PA1–PA5, PB1–PB7. **Zweiter Durchgang** über 152/161/162: R1–R11 (zwei MUST: Excel-Fehlertext ohne nächsten
  Schritt, „Skonto (nicht verwirklicht)“ schon während der Frist). Behebung in 159a/159b und 163 (D-104, D-109, D-110): alle
  Pflichtpunkte erledigt. Bericht: `review-welle-7.md`.

## Was fehlt oder dünn ist

- **Gekürzt** (`umfang-welle-7.md` §4): **M4** weitere REB-Formeln (Ticket 157 bleibt `ready-for-agent`, D-108; die
  Annahmen-Seite nennt nur Formel 91); Kann-Teile von E16 (Ticket 155 Punkt 6: „Mangel aus Bauteil“, „KG im Modell weicht ab“,
  D-99). Sonst wurde nichts gekürzt; E4, E10, E12 und GAEB 90/2000 sind geliefert.
- **Nicht gegen echte Dateien geprüft:** GAEB 90 und GAEB 2000 nur gegen eigene, aus der Formatbeschreibung abgeleitete
  Fixtures (Ticket 125 wurde nicht geliefert, D-71); je Format stehen die unsicheren Punkte in den Tickets 144/145, einige
  Kennzeichen werden nur als Befund gemeldet, nicht gelesen. Jeder Import in diesen Formaten zeigt einen festen Hinweis.
- **Nicht gemessen:** Firefox und Safari (D-77, Ticket 126); die PDFs außerhalb des Seitentext-Tests.
- **Bewusst begrenzt:** GAEB-Inhalte ohne Platz im Vertrag (u. a. Nachlässe je Abschnitt in 3.1, PA4) bleiben Befunde
  (D-80); der Hinweis „schon auf einem anderen Aufmaßblatt gemessen“ gilt je Position, nicht je Bauteil (bräuchte eine
  GlobalId an der Ansatzzeile, also `vertrag`, D-99); „nicht angeboten“ im Angebotsgrid nutzt den Zellbefund-Pfad (eigene
  Markierung bräuchte eine Vertragsänderung); die LV-PDF hat keinen Vorschau-Dialog (D-159b.3).
- **Für die nächste Welle** (aus den Reviews): SA12/SA13 (große Dateien teilen), SB9, SB10, SB12, SOLL-3, Druckprofil- und
  Datumswahl der neuen Berichte; R8 (Filter `NICHT_IM_BESTAND` doppelt), R9 (`projektinhaltLesen` exportiert zum Zählen die
  ganze Projektdatei samt Modellbytes), R10, R11; ein Unterpfad-Export von `@tethys/ausgabe` ohne pdfmake, damit Bildschirm
  und PDF eine Skonto-Funktion teilen (heute zwei Funktionen mit Gleichheitstest, D-111).
- **Nebenwirkung D-163.3:** Escape in einem Dialog schließt keine Meldung mehr; Escape einer offenen Auswahlliste wird nicht
  mehr von einer Meldung abgefangen.
- **In dieser Umgebung:** Downloads mit Umlaut im Namen kommen als „download“ an (Locale); die E2E prüfen den Namen im Dialog.
- **Unter Parallellast** (bis 8 Agenten auf 4 Kernen) fielen CPU-Budgets (`kern`, `speicher` v16/aufmass, `vergabe`,
  `abrechnung/leistung`, `ausgabe` „druckt gross“); allein bzw. im Abschlusslauf auf ruhiger Maschine grün, nichts gelockert.
  Der Wackler `bim-tastatur.spec.ts:135` (D-94, D-99) lief im Abschlusslauf und dreimal danach grün; eine
  Ursache wurde nicht gefunden. Der Wackler `nachtrag.spec.ts:164` ist an der Ursache behoben (D-111).
- **Nutzungslimit viermal** (D-81, D-85, D-91, D-105): Alle Agenten standen bis zum Ende des Fensters und liefen danach aus
  ihrem gespeicherten Stand weiter. Verloren ging nichts; der Überlauf führte zur Kürzung von M4 (D-108).
- **Buchhaltung:** Der Merge-Commit `5fa34fd` ist der Merge von 158, trägt aber durch ein Versehen die Nachricht des
  159a-Merges (D-110, Nachtrag); nicht umgeschrieben.

## So probiert man es aus

```bash
git checkout integration/welle-7
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
CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test e2e/umsteiger.spec.ts e2e/ueberlauf.spec.ts --trace off
```

```bash
pnpm --filter @tethys/gaeb run xsd-gegenpruefung
```

In der App (Weg von Tor E): beim ersten Start „Beispielprojekt laden“ und ansehen → zurück zur Projektliste → ein Projekt
mit einer GAEB-Datei beginnen (amtliche BVBS-X83 aus `fixtures/extern/bvbs/`) → LV ansehen (Suchen mit Strg+F, Kontextmenü) →
„Vergabe“: zwei X84 einlesen (auch `.d84`/`.p84` aus `fixtures/gaeb-formate/`) → Preisspiegel als PDF → Zuschlag → auf der
Seite des Auftrags-LV einen Nachtrag anlegen, sein Angebot einlesen und beauftragen → Aufmaßblatt → Rechnung mit Skonto anlegen, prüfen, freigeben, Zahlung erfassen,
„Rechnungsprüfung als PDF …“ in „Aktionen der Rechnung“ → Kostenkontrolle → auf der Projektseite „Projektdatei sichern“ →
„Weitere Aktionen“ → „Projekt löschen“ → „Projekt samt Inhalt löschen …“ → Strg+Z stellt es wieder her. Die Werte zu Skonto,
Vertragsstrafe und Bauabzugsteuer stehen in `fixtures/typisch-zahlungen.json`. Hilfe → „Annahmen“ nennt die Annahmen für v1.

## Eintritt nach Welle 7

Welle 7 ist laut G-59 die letzte Welle vor Demo und Probebetrieb. Vorher:

1. **Mensch:** `entscheidungen-auto.md` D-71 bis D-111 durchsehen (vor allem D-71 bis D-75 und D-96 vom Berater, D-82/D-93/
   D-102 `vertrag` v1.7a–c, D-104/D-109 Review-Umfang, D-108 Kürzung M4); `vertrag` v1.7 annehmen oder ändern; die Annahme zu
   G-27 (A5) bestätigen.
2. **Merge:** PR #13 nach `main` (vom Nutzer nach dem Lauf verlangt, D-112); danach baut der Pages-Workflow.
3. **Ticket 126:** GitHub Pages einschalten, Handprüfungen (Firefox, Safari, PDFs, HOAI-Tafeln), Sitzung mit dem Büro anhand
   der Seite „Annahmen“ (zugleich das Interview G-02). **Ticket 125:** echte GAEB-90/2000- und Umsteiger-Dateien, damit die
   Leser gegen echte Dateien geprüft werden.
4. **Nächste Welle** (nach der Sitzung): Ticket 157 (M4), die Punkte unter „Für die nächste Welle“ oben, Kann-Teile von E16,
   §6 von `umfang-welle-7.md` nach dem, was das Büro braucht; offen bleibt G-57.

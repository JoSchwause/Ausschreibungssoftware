# Arbeitsplan: Open-Source-AVA (angelehnt an NOVA AVA)

Stand: 2026-11-09, nach der Grilling-Sitzung. Ersetzt `.scratch/ava-mvp/map.md`. Die Tickets
`.scratch/ava-mvp/issues/01`–`17` bleiben gültig und sind unten den Strängen zugeordnet (Nummer in
Klammern).

- Regeln: `docs/regeln.md` (verbindlich, zuerst lesen).
- Entscheidungen: `.scratch/ava-oss/grilling.md` (alle G-Fragen beantwortet, außer G-27, vertagt bis vor Welle 5; im Lauf
  „Welle 5“ als Annahme D-34 entschieden, Mensch bestätigt später).
- Verhalten der Referenzsoftware: `okf/research/` ist lokal und nicht im Repo (G-44). Umsetzende
  Agenten arbeiten mit den Tickets, die das Verhalten in eigenen Worten enthalten (Regel C3).
- **Welle 7:** Umfang, Befunde, Kürzungsreihenfolge und Tor stehen in `.scratch/ava-oss/umfang-welle-7.md` (verbindlich für
  den Schnitt). Entscheidungen des Nutzers dazu: `grilling.md`, Stufe 5 (G-58 bis G-64). Offen ist nur G-57 (vertagt).

## 1. Zielstruktur (pnpm-Monorepo)

| Paket | Inhalt | Strang |
|---|---|---|
| `packages/vertrag` | Domänentypen, Befehle, ChangeSet, Repository-Schnittstellen | F |
| `packages/dezimal` | Dezimalwert, Rundung, de-DE-Parsen/-Formatieren | K |
| `packages/kern` | LV-Baum, OZ, Positionsarten, Summen, EPA, Prüfregeln | K |
| `packages/speicher` | SQLite-WASM/OPFS, Migrationen, Projektdatei, LV-Stände, Undo, Befehlsprotokoll | S |
| `packages/gaeb` | DA-XML-Modell, Parser, Writer, Phasenprofile, eigene Prüfung (XSD nur CI, ADR 0010) | G |
| `packages/vergabe` | Bieter, Angebot, Preisspiegel-Rechnung, Zuschlag | V |
| `packages/mengen` | REB-23.003-Formelparser, Aufmaßblätter, X31 | M |
| `packages/abrechnung` | Auftrag, Nachträge, Soll/Ist, Rechnungsprüfung | A |
| `packages/erechnung` | XRechnung lesen (D-32), später ZUGFeRD/Erzeugen | A |
| `packages/kosten` | DIN-276-Gliederung (nur Nummern), Kostenermittlung, Kostenkontrolle, EP-Kalkulation | C |
| `packages/ausgabe` | PDF, Excel | O |
| `packages/ifc` | IFC lesen (eigener STEP-Leser, IFC 2x3/4), Abbildung auf `Bauwerksmodell` (D-50) | X1 |
| `packages/bim` | Mengenübernahme, Aufmaß aus Auswahl, DIN-277-Größen und Kennwerte, Modellvergleich (D-50) | X1 |
| `packages/ui-modell` | 3D-Leinwand (web-ifc, three.js), nur Anzeige (D-50) | X1 |
| `packages/bauzeit` | Bauzeitenplan: Arbeitskalender, Terminrechnung, kritischer Weg (D-57) | X2 |
| `packages/honorar` | HOAI-Honorarberechnung (D-56) | X3 |
| `packages/bauleitung` | Mängel, Bautagebuch (D-57) | X4 |
| `packages/ui-grid`, `packages/ui-basis` | gemeinsames Grid, Tokens, Dialoge, Rich-Text | U |
| `apps/web` | PWA-Hülle, Routing, Fachansichten (ein Ordner `src/<strang>/` je Strang) | U + je Strang |
| `fixtures/` | selbst verfasste LVs und GAEB-Dateien mit Sollwerten, anonymisierte echte LVs (G-52) | F |

Ein Paket hat zu jedem Zeitpunkt genau einen schreibenden Agenten (Regel P2).

## 2. Stränge

Entscheidungen sind in Klammern vermerkt. Alle genannten G-Fragen sind beantwortet.

**F — Fundament** (seriell, blockiert alles)
- F1 Repo-Gerüst, CI, Lizenz-, Paketgrenzen- und Clean-Room-Prüfung (03). AGPL-3.0-or-later (ADR 0008),
  Arbeitsname Tethys AVA (G-07).
- F2 `vertrag` v1: Domänentypen, Befehle, ChangeSet (02). Getrennte Aggregate und Projektebene
  (ADR 0011), Befehlsprotokoll (ADR 0009).
- F3 Fixtures v1: drei selbst verfasste LVs (winzig, typisch, 5.000 Zeilen), im Repo (G-52)

**K — Kern** (`dezimal`, `kern`; intern seriell, ein Agent)
- K1 Dezimal und Rundung (04). EP 3, Menge 3, Prozent 2, Betrag 2 (G-21)
- K2 Hierarchie (05) · K3 OZ-Maske und Umnummerierung (06). Maske je LV frei (G-25)
- K4 Summen, Nachlass, MwSt mit ChangeSet (07). Nachlass ein je LV (G-23), MwSt ein Satz je LV (G-28)
- K5 Positionsarten 1 (08)
- K6 Grund-/Wahl- und Zuschlagspositionen (09). Begriff „Zuschlagsposition“ (G-22)
- K7 EPA (17)
- K8 Prüfregeln (16, Logikteil) · K9 Kopieren/Verschieben/Papierkorb als Befehle (15, Logikteil)

**S — Speicher**
- S1 Schema, Migrationen, Repositories (10) · S2 Projektliste und Projektdatei (11)
- S3 Undo/Redo, LV-Stände (14) und Befehlsprotokoll (ADR 0009)
- S4 PWA-Installation, Offline, Datensicherung. Export-Erinnerung und Sicherungsordner (G-03)

**U — Oberfläche**
- U1 Tokens, App-Hülle, Dialog- und Formularbausteine. Desktop ab 1280 px (G-30), Radix (G-31)
- U2 `ui-grid`: Baum-Grid auf Fixture-Daten · U3 LV-Grid an Befehle angebunden (12)
- U4 Positionsdialog mit TipTap-Schema (13). GAEB-abbildbare Teilmenge (G-32)
- U5 Zwischenablage, Verschieben, Papierkorb (15) · U6 Prüf-Panel mit Sprunglinks (16)

**G — GAEB** (entschieden: G-10, G-11, G-12/ADR 0010, G-13)
- G1 XML-Modell und Parser X81/X83 · G2 Writer X81/X83/X86 mit eigener Prüfung und XSD-Gegenprüfung
  in der CI (ADR 0010) · G3 Import X84 → Angebot · G4 weitere Versionen und Phasen (GAEB 90/2000)
- G4 in Welle 7 (G-61): DA XML 3.1 lesen (E5), GAEB 90 und GAEB 2000 lesen (E6), Dateiart erkennen und verständliche
  Meldungen (E7). Geschrieben werden weiter nur 3.2 und 3.3 (G-10).

**V — Vergabe** (entschieden: G-14, G-26)
- V1 Bieter, Angebot, Bietersummen · V2 Preisspiegel-Rechnung (virtuelle Bieter Min/Mittel/Max,
  Ausreißer ±20 %, ABC 80 %, Nachlass umkehrbar, nicht in EP). Verrechnung mehrerer Nachlässe offen
  (Annahme, G-26)
- V3 Preisspiegel-Ansicht · V4 Zuschlag → Auftrags-LV · V5 Excel-Rundlauf für Bieter (mit O2)

**M — Mengen**
- M1 REB-Formelparser (Formel 91 zuerst) · M2 Mengenermittlungs-Panel · M3 X31/DA11
- M4 weitere nummerierte REB-Formeln (Welle 7, G-61; wird bei Überlauf zuerst gestrichen)

**A — Auftrag und Abrechnung** (entschieden: G-15; A3 vertagt, G-27)
- A1 Nachträge (VOB-80-Regel: Bedeutung klären, siehe grilling.md) · A2 Aufmaßblätter und Soll/Ist
- A3 Rechnungsprüfung (Abzugskette) — vertagt, Grilling-Runde vor Welle 5; Annahme für Demo D-34 (Welle 5)
- A4 XRechnung lesen, danach ZUGFeRD/Erzeugen (G-15)
- A5 Skonto, Bauabzugsteuer, Vertragsstrafe und Zahlungen in der Rechnungsprüfung (Welle 7, G-61; ergänzt D-34)

**C — Kosten** (entschieden: G-16, G-17)
- C1 Kostengliederung (nur Nummern, Bezeichnungen importiert) und Kostenermittlung
- C2 Zuordnung LV ↔ Kostengruppe · C3 Kostenkontrolle · C4 EP-Kalkulation
- C5 Muster-LV und Textbausteine. STLB-Bau ignoriert, Feld für Textquelle (G-17)

**O — Ausgabe**
- O1 PDF-Druck des LV · O2 Excel-Export/-Import · O3 Druckprofile

**X — Erweiterungen** (G-05: alle später, Auktion nie; Nachtrag 2026-11-12: X1–X5 in Welle 6, Schwerpunkt X1)
- X1 BIM/IFC · X2 Bauzeitenplan · X3 HOAI · X4 Bauleitung (Mängel, Bautagebuch)
- X5 Bieterportal / Sync-Server · X6 KI-Assistent (nach M4, nicht in Welle 6)
- **X1 BIM, Schwerpunkt der Welle 6** (mehrere parallele Stränge, Vorschlag zum Schnitt):
  X1a IFC lesen (Modellbaum, Bauteile mit Eigenschaften und Mengen, IFC 2x3/4) · X1b 3D-Ansicht im Browser (Auswahl,
  Sichtbarkeit, Isolieren) · X1c Verknüpfung Bauteil (IFC-GlobalId) ↔ LV-Position und Kostengruppe (`vertrag`-Ticket) ·
  X1d Mengen aus dem Modell (QTO) in Vordersätze und Aufmaßblätter · X1e Kosten aus dem Modell (Kostengruppen,
  Kennwerte nach DIN 277) · X1f Modellstand und Änderungsvergleich (zwei IFC-Stände).
  Vor dem Schnitt zu klären: Bibliothek für IFC und 3D-Ansicht samt Lizenz (C5, AGPL-verträglich), Ablage großer IFC-Dateien
  (OPFS, nicht in der JSON-Projektdatei?), Leistungsbudgets für große Modelle (Q4).
- X2–X5 je ein Strang. X5 (Bieterportal/Sync-Server) widerspricht ADR 0001 (lokal, ohne Server) sowie G-01 und G-14: vorher
  eine ADR und eine Grilling-Frage (ADR 0013 als Vorschlag, G-57 offen; kein Code in Welle 6).

**E — Einführungsreife** (Welle 7; entschieden: G-58 bis G-64; Einzelheiten und Belege in `umfang-welle-7.md`)
- Ziel: Ein Büro bekommt die Software gezeigt und probiert sie aus (G-59). Maßstab ist eine Planerin, die von einem anderen
  AVA-Programm umsteigt. Keine neuen Module; die Module aus Welle 6 bleiben sichtbar als „Vorschau“ (G-60).
- E1 Navigation (Seitenleiste folgt dem Projekt, Brotkrumen, Projektseite als Übersicht, Kennzeichen „Vorschau“)
- E2 Erster Start und Hilfe (Beispielprojekt, „Erste Schritte“, Tastenkürzel, Seite „Annahmen“ nach G-62, „Über“)
- E3 Arbeitsfläche (Werkzeugleiste in Gruppen, Grid füllt die Höhe, Spaltenbreiten; Ziel bei 1280×800: 15 Zeilen, EP und GP sichtbar)
- E4 Suchen, Filtern, Kontextmenü im Grid
- E5 DA XML 3.1 lesen · E6 GAEB 90 und GAEB 2000 lesen · E7 Meldungen beim Einlesen in Nutzersprache (Strang G, G4)
- E8 Fehlende Bedienung (Hinweistext, Angebot löschen und berichtigen, OZ-Maske; LV-Stand, Bieter, Zuschlag zurücknehmen)
- E9 Abläufe (Auftrags-LV-Seite, Nachtrag geführt, Kalkulationsansätze speichern)
- E10 Stammdaten für Projekt, Bieter und Büro (G-61)
- E11 Ausgaben der Kernkette (Preisspiegel, Vergabevorschlag, Aufmaßblatt, Soll/Ist, Rechnungsprüfung mit Zahlungsfreigabe;
  Bilder im LV-PDF, Vorschau) · E12 Ausgaben der Kosten
- E13 Fehlerfestigkeit (Fehlergrenze, Browserprüfung, Speicherstatus)
- E14 Einheitliche Sprache (Anrede nach L4, ein Begriff je Sache, Sprachtest)
- E15 Einstellungen in Projektdatei und Sicherung (Migration 7, Schema 7)
- E16 Vorschau-Module anbinden (Tickets 123 und 124, Auswahl statt Handeingabe)
- E17 Bereitstellung (GitHub Pages, G-53) und Dokumente
- Dazu aus anderen Strängen: A5 (Abzüge und Zahlungen), M4 (weitere REB-Formeln).
- `vertrag` v1.7 zuerst und seriell (P9): Teil a für E8, E9, E10, E15 und Ticket 123, Teil b für A5.

## 3. Wellen

| Welle | Parallel laufende Agenten | Tor zur nächsten Welle |
|---|---|---|
| 0 | F1 ‖ F3 (Grilling abgeschlossen) | F2 gemergt |
| 1 | K1→K4 · S1 · U1+U2 · G1 | `vertrag` stabil; Grid zeigt Fixture |
| 2 | K5→K7 · S2 · U3 · G2 · O1 (Spike) | **M1: LV anlegen, rechnen, speichern** |
| 3 | K8+K9 · S3 · U4–U6 · G3 · V1+V2 · M1 | **M2: GAEB rein und raus, XSD-valide** |
| 4 | V3+V4 · O1+O2 · M2 · S4 · C1 | **M3 = MVP: Ausschreibung → Angebote → Zuschlag** |
| 5 | A1–A4 · M3 · C2–C5 · O3 | **M4: durchgehende Kette LPH 6–8** |
| 6 | Folgetickets 93–95, danach X1 BIM (Schwerpunkt, mehrere Stränge X1a–X1f) ‖ X2 ‖ X3 ‖ X4 ‖ X5 (nach ADR) | je Modul (G-05, Nachtrag 2026-11-12) |
| 7 | `vertrag` v1.7 und Tickets 123/124, dann E1–E17 ‖ G4 (E5–E7) ‖ A5 ‖ M4 (Umfang und Kürzungsreihenfolge: `umfang-welle-7.md`) | **Tor E: Einführungsreife** (danach Demo und Probebetrieb im Büro, G-59) |

U hängt nur über `vertrag` an K. Deshalb baut U2 gegen Fixtures, bevor K fertig ist.

**Welle-1-Tor:** `vertrag` (Ticket 02) ist gemergt und vom Menschen geprüft. Die Tickets für Welle 0 und 1
sind geschnitten, G-06 ist beantwortet. Der Prototyp für das Nutzerinterview (G-02) ist kein Tor; er läuft getrennt
(Ticket `.scratch/ava-oss/issues/18-prototyp-interview.md`, siehe `spec.md`, Abschnitt 8).

## 4. Verifikation

- Je Ticket: `pnpm lint && pnpm test && pnpm e2e` grün, Akzeptanzkriterien des Tickets erfüllt.
- **M1:** E2E legt ein LV an (2 Ebenen, 5 Positionen, jede Positionsart), lädt neu, Summen stimmen
  mit den Fixtures.
- **M2:** Jede Fixture exportiert nach X81/X83/X86, wird durch die eigene Prüfung geprüft und in der CI
  gegen das XSD validiert (ADR 0010). Beim Re-Import ergibt sich ein identisches Modell. Zusätzlich
  von Hand: Export in einem freien GAEB-Betrachter öffnen.
- **M3:** E2E importiert zwei X84-Angebote, Preisspiegel-Summen stimmen mit den Sollwerten, der
  Zuschlag erzeugt das Auftrags-LV.
- **M4** (D-38, Annahme für Demo): E2E auf dem Weg von M3: Nachtrag N01 (Nachtrags-LV, Angebot des AN, beauftragen) →
  Aufmaßblatt 1 (Formel 91) → Soll/Ist mit Befund > 110 % → Abschlagsrechnung 1 (Prozent-Nachlass, Umlage,
  Sicherheitseinbehalt) gleich dem Sollwert, freigeben → Aufmaßblatt 2 und Abschlagsrechnung 2 (kumuliert minus
  eingefrorener Zahlbetrag) → Kostenkontrolle je Kostengruppe gleich den Sollwerten → Neuladen behält alles. Sollwerte
  hergeleitet in einer Fixture (C4), dazu ein reiner Kettentest ohne Oberfläche mit derselben Fixture.
- **Tore der Welle 6 je Modul** (D-58, Annahme für Demo): je Modul eine Playwright-E2E und ein reiner Kettentest auf derselben
  Fixture; ist die E2E wackelig, gelten Kettentest plus verkürzte E2E (wie D-38). Sollwerte in `fixtures/` mit Herleitung (C4).
  - **X1-Kern:** IFC 4 (`fixtures/ifc/haus-v1.ifc`) einlesen → Baum zeigt Geschosse und Bauteile, die 3D-Ansicht zeichnet; Auswahl
    im Baum hebt im 3D hervor, ein Klick im 3D wählt im Baum (geprüft über Testhaken bzw. Auswahlzustand, nie über Pixel);
    Eigenschaften (Pset) sichtbar → Wände des EG einer Position von `typisch` zuordnen → Mengen übernehmen: Vordersatz und
    LV-Netto = Sollwerte → Neuladen behält alles samt 3D. IFC 2x3 liefert dieselben Mengen (Unit-Test); Budgets D-54.
  - **X1-Erweitert:** DIN-277-Größen (BGF, BRI, NRF) und Kostenschätzung über Kennwerte = Soll → Zuschlag → „Aufmaßblatt aus
    Auswahl“ (EG) = Sollmengen → Stand 2 (`haus-v2.ifc`) einlesen → Vergleich (hinzugefügt, entfernt, geändert) und betroffene
    Positionen mit Mengendifferenz = Soll → „Mengen aktualisieren“ = neue Vordersätze laut Soll.
  - **X2:** Bauzeitenplan mit 6–8 Vorgängen, allen vier Beziehungsarten, einem Abstand 0 oder negativ, einem Meilenstein, einem
    Feiertag und einem Wochenende auf dem kritischen Weg → kritischer Weg und Endtermin = Soll → Neuladen → PDF.
  - **X3:** Gebäude, Honorarzone III, Honorarsatz 50 % (so benannt), anrechenbare Kosten aus einer Kostenberechnung nach § 33 mit
    KG 400 über 25 % (beide Zweige), streng zwischen zwei Tafelzeilen, LPH 1–9, Umbauzuschlag, Nebenkosten, USt = Soll →
    Neuladen → PDF; außerhalb der Tafel = Befund als Unit-Test.
  - **X4:** Mängel mit Frist und Statusverlauf, einer überfällig zum Stichtag (von der App übergeben, in Playwright feste Uhr) =
    Befund → Bautagebuch für 3 Tage → Mängelliste und Bautagebuch als PDF → Neuladen.
  - **X5:** ADR 0013 `proposed`, G-57 offen mit Annahme-Zeile, `plan.md` §2 X5 verweist auf beide; kein Code (D-55).
- **Tor E „Einführungsreife“** (Welle 7, vom Nutzer bestätigt mit G-59 bis G-61; Wortlaut in `umfang-welle-7.md` §4):
  1. `apps/web/e2e/umsteiger.spec.ts` bei 1280×800, ohne Testhaken und ohne getippte Adressen nach dem Start: erster Start →
     Beispielprojekt laden → neues Projekt aus der amtlichen BVBS-X83 → LV-Seite zeigt mindestens 15 Zeilen samt EP und GP →
     zwei X84 → Preisspiegel mit PDF → Zuschlag → Nachtrag anlegen und beauftragen → Aufmaßblatt → Rechnung mit Skonto prüfen
     und freigeben, Zahlungsfreigabe als PDF → Kostenkontrolle → Projektdatei sichern → Projekt löschen → Sicherung einlesen →
     dieselben Werte.
  2. Kein waagerechter Überlauf bei 1280 px auf allen Routen.
  3. Dasselbe LV als XML 3.3, XML 3.1, GAEB 90 und GAEB 2000 ergibt dasselbe Modell (ohne die gekürzten Formate).
  4. Sprachtest (E14) grün; die Fehlergrenze (E13) hat einen Test.
  5. Alle früheren Tore (M1–M4, X1–X4) bleiben grün, kein Leistungsbudget gelockert.
- Dauerhaft in der CI: Paketgrenzen, Lizenzprüfung (AGPL-3.0-or-later), Clean-Room-Prüfung,
  Leistungsbudgets (5.000 und 10.000 Positionen), `okf/research/` darf nicht versioniert sein.

## 5. Rückschreib-Protokoll (Grilling → Plan)

Stand 2026-11-09:

1. ✅ Antworten in `grilling.md` eingetragen.
2. ✅ Neue ADRs 0008 (Lizenz), 0009 (Befehlsprotokoll), 0010 (GAEB-Validierung), 0011 (Projekt und
   Aggregate). ADR 0006 und 0007 haben Statusvermerke. Begriffe im `GLOSSARY.md`.
3. ✅ Plan angepasst: „braucht G-xx“ entfernt, Entscheidungen eingetragen.
4. ✅ `docs/regeln.md` aktualisiert. Entschiedene Regeln sind markiert.
5. ✅ Tickets für **Welle 0 und 1** geschnitten (`.scratch/ava-oss/issues/`, Übersicht in `README.md`;
   03–10 wiederverwendet, 18–23 neu). ⏳ **Offen:** Tickets für Welle 2, sobald `vertrag` stabil ist.
6. ✅ G-54 erledigt (`.scratch/ava-mvp/spec.md` geschrieben, ADRs geprüft) und G-06 beantwortet
   (Lücken schließen). OKF aktualisiert (siehe `okf/index.md`).
7. ✅ **Welle 0 und 1 umgesetzt (2026-11-10)** auf Branch `claude/wave-0-1-orchestration-nkdqfx`: Tickets 02–07, 10,
   19–22 gemergt, 23 teilweise. ⏳ **Offen:** Prüfung von `vertrag` durch den Nutzer und die Grilling-Runde vor
   Welle 2, siehe `.scratch/ava-oss/next-decisions.md` (E-01 bis E-20). Tickets für Welle 2 werden danach geschnitten.
8. ✅ **Grilling-Runde vor Welle 2 beantwortet (2026-11-10)**: E-01 bis E-20 in `next-decisions.md`, `grilling.md`
   (Stufe 3), `docs/regeln.md` (F1–F6, P8, P9, N2, N5), `GLOSSARY.md` und ADR 0009 zurückgeschrieben. Wave-2-Schnitt:
   `vertrag` v1.1a → v1.1b (seriell, Nutzer prüft) ‖ Aufräumen nach Welle 1 ‖ Interview-Prototyp (Ticket 18);
   dann Kern-Feldbefehle und Anpassung von `speicher`/`gaeb`/`ui-grid`; dann K5–K7, S2, U3, G2, O1-Spike.
   ⏳ **Offen:** Tickets für Welle 2 einzeln schneiden (je ein Pull Request, beginnend mit v1.1a).
9. ✅ **Welle 2 gestartet (2026-11-10)**: Tickets 24–28 geschnitten (`issues/README.md`, Abschnitt „Tickets Welle 2“),
   Ticket 18 um E-20 ergänzt. ⏳ **Offen:** Prüfung von v1.1a (24) und v1.1b (26) durch den Nutzer; die Folgetickets
   werden geschnitten, sobald ihre Blocker gemergt sind.
10. ✅ **Welle 2, Stufe 1 (2026-11-10)**: Tickets 25, 27, 28 gemergt (PR #3, #5, #6), Prototyp (18) auf Branch
    `proto/interview`. ⏳ **Offen:** Prüfung von v1.1a (PR #4) und v1.1b (PR #7) durch den Nutzer; Entscheidungen
    W-01 bis W-06 in `.scratch/ava-oss/next-decisions-welle-2.md`. Danach Stufe 2 und 3 (Schnitt dort, Abschnitt C).
11. ✅ **Lauf „Welle 3“ im Demo-Modus (2026-11-10/11)** auf dem lokalen Branch `integration/welle-3`: Rest von Welle 2
    (Anpassungen an v1.1a/v1.1b, K5–K7, S2, U3, G2) und Welle 3 (K8, K9, S3, U4–U6, G3, V1+V2, M1), Tickets 29–50,
    `vertrag` v1.2. Tor M1 erreicht, M2 erfüllt mit gelisteten Unterschieden. Entscheidungen D-01 bis D-19 in
    `entscheidungen-auto.md`. ⏳ **Offen:** Prüfung durch den Nutzer (Entscheidungslog, `vertrag` v1.2, Merge nach `main`),
    Folgetickets 51–54. Bericht: `.scratch/ava-oss/welle-3-bericht.md`.
12. ✅ **Lauf „Welle 4“ im Demo-Modus (2026-11-11)** auf dem lokalen Branch `integration/welle-4`: V3+V4, O1+O2, M2, S4, C1 und
    die Folgetickets 51–54, Tickets 51–69, `vertrag` v1.3. **Tor M3 erreicht** (`apps/web/e2e/m3.spec.ts`). Entscheidungen D-20
    bis D-30 in `entscheidungen-auto.md`, ADR 0012 als Vorschlag. ⏳ **Offen:** Prüfung durch den Nutzer (Entscheidungslog,
    `vertrag` v1.3, ADR 0012, Merge nach `main`), Folgetickets 70–75, G-27 vor Welle 5. Bericht: `.scratch/ava-oss/welle-4-bericht.md`.
13. ✅ **Lauf „Welle 5“ im Demo-Modus (2026-11-11/12)** auf dem lokalen Branch `integration/welle-5` (ab dem Ende von Welle 4, D-31):
    A1–A4, M3, C2–C5, O3 und die Folgetickets 70–75, Tickets 70–92, `vertrag` v1.4, neue Pakete `abrechnung` und `erechnung`.
    **Tor M4 erreicht** (Definition in §4, D-38). Entscheidungen D-31 bis D-48 in `entscheidungen-auto.md`; G-27 und „VOB 80“
    als Annahme (D-34, D-35). ⏳ **Offen:** Prüfung durch den Nutzer (Entscheidungslog, `vertrag` v1.4, ADR 0012, Merge von Welle 4
    und 5 nach `main`), Folgetickets 93–95, G-05 für Welle 6. Bericht: `.scratch/ava-oss/welle-5-bericht.md`.
14. ✅ **Lauf „Welle 6“ im Demo-Modus (2026-11-12/13)** auf dem lokalen Branch `integration/welle-6` (ab `79e6680`, D-49): die
    Folgetickets 93–95, danach X1 BIM (X1a–X1f) ‖ X2 ‖ X3 ‖ X4 ‖ X5 (G-05, Nachtrag 2026-11-12), Tickets 93–122, `vertrag` v1.5
    und v1.6, neue Pakete `ifc`, `bim`, `ui-modell`, `bauzeit`, `honorar`, `bauleitung`, Projektdatei Schema 6. **Tore X1-Kern,
    X1-Erweitert, X2, X3, X4 und X5 erreicht** (Definition in §4, D-58). Entscheidungen D-49 bis D-70 in `entscheidungen-auto.md`;
    G-57 offen mit Annahme (ADR 0013 als Vorschlag). Bericht: `.scratch/ava-oss/welle-6-bericht.md`. **Erledigt am
    2026-11-13:** Merge nach `main` (PR #11), Entscheidungslog und `vertrag` v1.5/v1.6 angenommen (G-58, G-62). ⏳ **Offen:**
    HOAI-Tafeln gegen die amtliche Fassung (Ticket 126), Folgetickets 123/124 (Welle 7), G-57.
15. ✅ **Welle 6 auf `main` und Runde vor Welle 7 (2026-11-13):** PR #11 (Welle 6) ist vom Nutzer gemergt (`6bb709e`); damit
    liegen Welle 0 bis 6 auf `main`. Der Stand wurde aus Sicht einer Umsteigerin durchgesehen (drei Lesedurchgänge und eine
    Begehung der laufenden App); Befunde B-01 bis B-37 und der Umfang der Welle 7 stehen in
    `.scratch/ava-oss/umfang-welle-7.md`. Der Nutzer hat G-58 bis G-64 entschieden (`grilling.md`, Stufe 5): Die Annahmen
    D-01 bis D-70 und `vertrag` v1.2 bis v1.6 gelten für v1; Welle 7 ist die letzte Welle vor Demo und Probebetrieb im Büro;
    die Module aus Welle 6 bleiben als „Vorschau“ sichtbar; dazu vier größere Lücken (GAEB 90/2000, Abzüge und Zahlungen,
    Stammdaten, REB-Formeln). Zurückgeschrieben: Strang E, A5, M4, G4 in §2, Welle 7 in §3, Tor E in §4, Regel L4 und P5 in
    `docs/regeln.md`, `welle-status.md`, `AGENTS.md`. ⏳ **Offen:** Ticket 125 (Testdateien vom Nutzer, vor Welle 7), danach
    `/implement-welle 7`; Ticket 126 (GitHub Pages einschalten, Handprüfungen, Sitzung mit dem Büro); G-57.

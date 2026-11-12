# Tickets Welle 0 und 1

Stand: 2026-11-09. Nummern 02–10 sind aus `.scratch/ava-mvp/issues/` wiederverwendet und neu geschrieben (Entscheidungen
G-01 bis G-56 eingearbeitet); 18 und höher sind neu. Die alten Tickets in `.scratch/ava-mvp/issues/` gelten nur noch
als Herkunft. Regeln: `docs/regeln.md`. Spec: `.scratch/ava-mvp/spec.md`.

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Welle |
|---|---|---|---|---|---|
| 03 | F1 | Repo-Gerüst, Tooling, CI | Wurzel, `.github/` | – | 0 |
| 19 | F3 | Fixtures v1: drei LVs mit Sollwerten | `fixtures/` | – | 0 |
| 02 | F2 | `vertrag` v1 (**Mensch prüft vor Merge**) | `packages/vertrag` | 03 | 0 |
| 23 | F3b | Amtliche und fremde Testdateien einbinden | `fixtures/extern/` | 03 | 0/1 |
| 04 | K1 | Dezimal, Rundung, de-DE | `packages/dezimal` | 02 | 1 |
| 05 | K2 | LV-Hierarchie | `packages/kern` | 02, 04 | 1 |
| 06 | K3 | OZ-Maske, Umnummerierung | `packages/kern` | 05 | 1 |
| 07 | K4 | Summen, Nachlass, MwSt, ChangeSet | `packages/kern` | 05 | 1 |
| 10 | S1 | SQLite-WASM/OPFS, Migrationen, Protokoll | `packages/speicher` | 02 | 1 |
| 20 | U1 | Tokens, Hülle, Bausteine | `packages/ui-basis` | 03 | 1 |
| 21 | U2 | Baum-Grid auf Fixtures | `packages/ui-grid` | 02, 03, 19, 20 | 1 |
| 22 | G1 | GAEB-Modell und Parser X81/X83 (3.3) | `packages/gaeb` | 02, 03, 23 | 1 |
| 18 | – | Prototyp für das Nutzerinterview (Wegwerf, eigener Branch) | `proto/interview` | – | läuft getrennt |

## Reihenfolge

1. **03** und **19** parallel (Wurzel und `fixtures/` sind verschiedene Orte).
2. **02** nach 03; **23** nach 03. Danach ist `vertrag` das Tor: Welle 1 startet erst, wenn 02 gemergt und geprüft ist.
3. Welle 1 parallel, ein Schreiber je Paket: **04 → 05 → 06/07** (ein Agent für `dezimal` und `kern`), **10**, **20 → 21**, **22**.
   06 und 07 teilen `kern`; sie laufen nacheinander, nicht gleichzeitig (P2).
4. Höchstens etwa 8 Agenten gleichzeitig (P4); jeder in eigenem Worktree und Branch (P3).

## Nicht in diesen Tickets

Welle 2 (K5–K7, S2, U3, G2, O1-Spike) und später. Sie werden nach Welle 1 geschnitten, wenn `vertrag` stabil ist und das
Grid die Fixture zeigt. Bis dahin steht ihr Umfang in `plan.md` §2.

## Offene Hinweise

- Ticket 04 klärt die Rundung negativer Werte; lässt sie sich nicht belegen, geht es auf `needs-info` (P5).
- Ticket 23 nimmt amtliche Dateien ohne Lizenzangabe auf (G-55, Risiko vermerkt). Es blockiert Ticket 22 nur für die Golden-Dateien, nicht für die Fehlerdateien.
- Cloud-Agenten lesen nur Tickets (C3). Die Tickets nennen deshalb Quellen und Regeln selbst und verweisen nicht auf `okf/research/`.

# Tickets Welle 2

Stand: 2026-11-10. Schnitt nach E-20. Ab Welle 2: ein Pull Request je Ticket, Review-Agent, Merge-Commit (P7);
`vertrag`-Tickets prüft der Nutzer (P9). Tickets werden einzeln geschnitten; „offen“ heißt: wird geschnitten, sobald
die genannten Blocker gemergt sind (die Typnamen aus v1.1a/v1.1b stehen erst dann fest).

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Stufe |
|---|---|---|---|---|---|
| 24 | F | `vertrag` v1.1a „Lücken“ (**Mensch prüft**) | `packages/vertrag` | – | 1 |
| 25 | – | Aufräumen nach Welle 1 | `fixtures/`, `tools/`, je eine Stelle in `kern`, `gaeb` | – | 1 |
| 18 | – | Prototyp für das Nutzerinterview | `proto/interview` (eigener Branch) | – | 1 |
| 28 | O1 | PDF-Spike | `packages/ausgabe` | – | 1 |
| 26 | F | `vertrag` v1.1b „Inhaltsmodell“ (**Mensch prüft**) | `packages/vertrag` | 24 | 1 |
| 27 | K | Kern: Feldbefehle | `packages/kern` | 25 | 2 |
| offen | K | Anpassung `kern` an v1.1a (mit Maskenbefund am Befehl, Rest von E-19 Nr. 3) | `packages/kern` | 24, 27 | 2 |
| offen | S | Anpassung `speicher` an v1.1a | `packages/speicher` | 24 | 2 |
| offen | G | Anpassung `gaeb` an v1.1a | `packages/gaeb` | 24, 25 | 2 |
| offen | U | Anpassung `ui-grid` an v1.1a | `packages/ui-grid` | 24 | 2 |
| offen | K5–K7 | Positionsmerkmale, Wahl-/Zuschlagspositionen, EPA | `packages/kern` | 26, Anpassung `kern` | 3 |
| offen | S2 | Projektliste und Projektdatei | `packages/speicher`, `apps/web` | 26 (Protokolleintrag, E-13), Anpassung `speicher` | 3 |
| offen | U3 | LV-Grid an Befehle angebunden | `apps/web` | 27, Anpassung `ui-grid` | 3 |
| offen | G2 | Writer X81/X83/X86, XSD in der CI | `packages/gaeb` | 26, Anpassung `gaeb` | 3 |

**Ausnahme von P2 in 24 und 26:** Ein Vertragsticket darf andere Pakete rein mechanisch nachziehen, damit sein Pull
Request für sich grün ist. Weil 25 und 27 zur selben Zeit in `kern` und `gaeb` schreiben, gilt die Reihenfolge beim
Mergen: 25 und 27 zuerst; der Branch von 24 (und später 26) nimmt danach `main` auf, Konflikte löst der Orchestrator.

Tor der Welle: **M1 „LV anlegen, rechnen, speichern“** (`plan.md` §4).

# Tickets Welle 3 (Lauf, 2026-11-10/11)

Schnitt und Reihenfolge: [`../schnitt-welle-3.md`](../schnitt-welle-3.md). Alle Tickets 29–50 sind auf `integration/welle-3` gemergt und `resolved` (Merge-Commit je Ticket im Abschnitt „Answer“); 51–54 sind Folgetickets für Welle 4.

| Nr | Strang | Titel | Paket | Status |
|---|---|---|---|---|
| 29 | F | `vertrag` v1.2: Ergänzungen für Welle 3 | `packages/vertrag` | resolved |
| 30 | K | Anpassung `kern` an v1.1a | `packages/kern` | resolved |
| 31 | S | Anpassung `speicher` an v1.1a/v1.1b | `packages/speicher` | resolved |
| 32 | G | Anpassung `gaeb` an v1.1a/v1.1b | `packages/gaeb` | resolved |
| 33 | U | Anpassung `ui-grid` an v1.1a | `packages/ui-grid` | resolved |
| 34 | U4a | Langtext-Editor (TipTap) | `packages/ui-basis` | resolved |
| 35 | M1 | REB-23.003-Formelparser (Formel 91) | `packages/mengen` (neu) | resolved |
| 36 | V1+V2 | Bieter, Angebot, Bietersummen, Preisspiegel-Rechnung | `packages/vergabe` (neu) | resolved |
| 37 | K5–K7 | Positionsmerkmale, Wahl-/Zuschlagspositionen, EPA | `packages/kern` | resolved |
| 38 | S2 | Projektliste und Projektdatei, Schema 2 | `packages/speicher` | resolved |
| 39 | U3 | LV-Grid an Befehle angebunden, E2E M1 | `apps/web` | resolved |
| 40 | G2 | Writer X81/X83/X86, Prüfung, XSD in der CI (Tor M2) | `packages/gaeb`, CI | resolved |
| 41 | K8 | Prüfregeln, Kopfdaten-Befehle | `packages/kern` | resolved |
| 42 | K9 | Kopieren, Verschieben, Papierkorb, OZ-Vorschlag | `packages/kern` | resolved |
| 43 | S3 | Undo/Redo, LV-Stände, Papierkorb, Protokoll | `packages/speicher` | resolved |
| 44 | V | Zuschlagspositionen im Angebot und Preisspiegel | `packages/vergabe` | resolved |
| 45 | G3 | Import X84 → Angebot | `packages/gaeb` | resolved |
| 46 | U5a | Grid: Zeilen kopieren, verschieben, löschen | `packages/ui-grid` | resolved |
| 47 | U4+U6 | Positionsdialog, Prüf-Panel | `apps/web` | resolved |
| 48 | U5 | Zwischenablage, Papierkorb, Undo/Redo, LV-Stände | `apps/web` | resolved |
| 49 | G | GAEB-Import/-Export in der App | `apps/web` | resolved |
| 50 | K | Kern nimmt den vollen Langtext an | `packages/kern` | resolved |
| 51 | F | Fixtures `typisch`, `gross`, `typisch-angebote` auf GAEB-Zuschlagsform | `fixtures/` | ready-for-agent (Welle 4) |
| 52 | S | Einzeländerung bei 5.000 Positionen < 100 ms | `packages/speicher` | ready-for-agent (Welle 4) |
| 53 | F | `vertrag` v1.3 (**Mensch prüft**) | `packages/vertrag` | ready-for-agent (Welle 4) |
| 54 | U | `ui-grid`/`ui-basis`: Lücken aus Welle 3 | `packages/ui-grid`, `packages/ui-basis` | ready-for-agent (Welle 4) |

# Tickets Welle 4 (Lauf, 2026-11-11)

Schnitt und Reihenfolge: [`../schnitt-welle-4.md`](../schnitt-welle-4.md). Tickets 51–69 sind auf `integration/welle-4`
gemergt (Merge-Commit je Ticket im Abschnitt „Answer“); 70–75 sind Folgetickets für Welle 5.

| Nr | Strang | Titel | Paket | Status |
|---|---|---|---|---|
| 51 | F | Fixtures auf GAEB-Zuschlagsform | `fixtures/` | resolved |
| 52 | S | Einzeländerung bei 5.000 Positionen < 100 ms | `packages/speicher` | resolved |
| 53 | F | `vertrag` v1.3 | `packages/vertrag` | resolved |
| 54 | U | `ui-grid`/`ui-basis`: Lücken aus Welle 3 | `packages/ui-grid`, `packages/ui-basis` | resolved |
| 55 | C1 | Kostengliederung und Kostenermittlung | `packages/kosten` (neu) | resolved |
| 56 | K | Kern v1.3 | `packages/kern` | resolved |
| 57 | S | Speicher v1.3, Migration 4 | `packages/speicher` | resolved |
| 58 | O1 | LV-Druck als PDF (ADR 0012) | `packages/ausgabe` | resolved |
| 59 | V4 | Zuschlag → Auftrags-LV | `packages/vergabe` | resolved |
| 60 | U2 | Vergleichsgrid | `packages/ui-grid` | resolved |
| 61 | O2 | Excel-Export und -Rücklauf | `packages/ausgabe` | resolved |
| 62 | S4 | PWA und Datensicherung | `apps/web` | resolved |
| 63 | V3 | Preisspiegel-Ansicht | `apps/web` | resolved |
| 64 | V4 | Zuschlag und Auftrags-LV in der App, E2E M3 | `apps/web` | resolved |
| 65 | M2 | Mengenermittlungs-Panel | `apps/web` | resolved |
| 66 | O1/O2 | Drucken und Excel in der App | `apps/web` | resolved |
| 67 | U | Umwege aus Welle 3 zurückbauen | `apps/web` | resolved |
| 68 | G | `gaeb` v1.3 | `packages/gaeb` | resolved |
| 69 | F | X84-Dateien und Preisspiegel-Sollwerte | `fixtures/` | resolved |
| 70 | F | `vertrag` v1.4: Repository Auftrags-LV (**Mensch prüft**) | `packages/vertrag` | resolved (Welle 5) |
| 71 | K | Umkehrung für Auftrags-LV | `packages/kern` | resolved (Welle 5) |
| 72 | V | `summen.vorher` bei neuer LV-Position | `packages/vergabe` | resolved (Welle 5) |
| 73 | G | Wahlgruppe verliert Grundposition im X83-Rundweg | `packages/gaeb` | resolved (Welle 5) |
| 74 | U | `ui-grid`: Restpunkte | `packages/ui-grid` | resolved (Welle 5) |
| 75 | F | Fixtures: Restpunkte | `fixtures/` | resolved (Welle 5) |

# Tickets Welle 5 (Lauf, 2026-11-11)

Schnitt und Reihenfolge: [`../schnitt-welle-5.md`](../schnitt-welle-5.md). Entscheidungen D-31 bis D-40 in
`../entscheidungen-auto.md`. 70 und 71 sind gegenüber Welle 4 erweitert (v1.4).

| Nr | Strang | Titel | Paket | Status |
|---|---|---|---|---|
| 70 | F | `vertrag` v1.4 | `packages/vertrag` | resolved |
| 71 | K | Kern v1.4 | `packages/kern` | resolved |
| 72 | V | `summen.vorher` bei neuer LV-Position | `packages/vergabe` | resolved |
| 73 | G | Wahlgruppe im X83-Rundweg | `packages/gaeb` | resolved |
| 74 | U | `ui-grid`: Restpunkte | `packages/ui-grid` | resolved |
| 75 | F | Fixtures: Restpunkte | `fixtures/` | resolved |
| 76 | A4 | XRechnung lesen | `packages/erechnung` (neu) | resolved |
| 77 | O3 | Druckprofile, Spike getaggtes PDF | `packages/ausgabe` | resolved |
| 78 | C4 | EP-Kalkulation | `packages/kosten` | resolved |
| 79 | S | Speicher v1.4, Migration 5 | `packages/speicher` | resolved |
| 80 | A1+A2 | Nachtrag übernehmen, Aufmaß-Befehle | `packages/abrechnung` (neu) | resolved |
| 81 | A2+A3 | Soll/Ist, Leistungsstand, Rechnungsprüfung | `packages/abrechnung` | resolved |
| 82 | C2+C3 | Kostenermittlung, Kostenkontrolle | `packages/kosten` | resolved |
| 83 | M3 | GAEB X31 | `packages/gaeb` | resolved |
| 84 | G | `gaeb` v1.4: Kostengruppe | `packages/gaeb` | resolved |
| 85 | F | Fixture M4 | `fixtures/` | resolved |
| 86 | A1 | Nachträge in der App | `apps/web/src/auftrag/`, `src/nachtrag/` | resolved |
| 87 | A2+M3 | Aufmaß, Soll/Ist, X31 in der App | `apps/web/src/abrechnung/` | resolved |
| 88 | A3+A4 | Rechnungsprüfung, XRechnung in der App | `apps/web/src/rechnung/` | resolved |
| 89 | C2–C4 | Kosten in der App | `apps/web/src/kosten/` | resolved |
| 90 | O3+C5 | Druckprofile, Muster-LV in der App | `apps/web/src/ausgabe/`, `src/vorlage/` | resolved |
| 91 | – | Tor M4 | `apps/web/e2e/` | resolved |
| 92 | – | Behebung des Wellen-Reviews | mehrere (D-47) | resolved |
| 93 | U/C2 | `ui-grid`: editierbare KG-Spalte | `packages/ui-grid` | resolved (Welle 6) |
| 94 | S/A2 | Aufmaßblatt 5.000 Zeilen: Undo < 100 ms | `packages/speicher` | resolved (Welle 6) |
| 95 | F | `vertrag` v1.5: Kleinpunkte | `packages/vertrag` | resolved (Welle 6) |

# Tickets Welle 6 (Lauf, 2026-11-12)

Schnitt und Reihenfolge: [`../schnitt-welle-6.md`](../schnitt-welle-6.md). Entscheidungen D-49 bis D-68 in
`../entscheidungen-auto.md`; Tore je Modul in `../plan.md` §4 (D-58). Zuerst die Folgetickets 93–95 (G-05), danach X1–X5,
Schwerpunkt X1 BIM.

| Nr | Strang | Titel | Paket | Status |
|---|---|---|---|---|
| 93 | U/C2 | `ui-grid`: editierbare KG-Spalte | `packages/ui-grid`, `apps/web/src/kosten/` | resolved |
| 94 | S/A2 | Aufmaßblatt 5.000 Zeilen: Undo < 100 ms | `packages/speicher` | resolved |
| 95 | F | `vertrag` v1.5: Kleinpunkte | `packages/vertrag` | resolved |
| 96 | U/X2 | `ui-grid`: Balkenspalte | `packages/ui-grid` | resolved |
| 97 | F | `vertrag` v1.6: Typen für X1–X4 | `packages/vertrag` | resolved |
| 98 | X1a | IFC lesen | `packages/ifc` (neu) | resolved |
| 99 | F/X1 | Fixtures IFC-Haus, Erzeuger, Sollwerte X1 | `fixtures/` | resolved |
| 100 | X1b | 3D-Leinwand | `packages/ui-modell` (neu) | resolved |
| 101 | X3 | HOAI-Rechenkern | `packages/honorar` (neu) | resolved |
| 102 | X2 | Terminrechnung | `packages/bauzeit` (neu) | resolved |
| 103 | X5 | ADR 0013, G-57 | `docs/adr/`, `grilling.md` | resolved |
| 104 | A4 | `erechnung`: gemeinsame Befundliste | `packages/erechnung` | resolved |
| 105 | K | Kern v1.5/v1.6 | `packages/kern` | resolved |
| 106 | S | Speicher v1.5/v1.6, Migration 6 | `packages/speicher` | resolved |
| 107 | X1a | `ifc` → `Bauwerksmodell` | `packages/ifc` | resolved |
| 108 | X1c–f | `bim` | `packages/bim` (neu) | resolved |
| 109 | X2 | `bauzeit`: Befehle | `packages/bauzeit` | resolved |
| 110 | X3 | `honorar`: Befehle | `packages/honorar` | resolved |
| 111 | X4 | `bauleitung` | `packages/bauleitung` (neu) | resolved |
| 112 | F | Fixtures X2–X4 | `fixtures/` | resolved |
| 113 | O | `ausgabe`: PDF X2–X4 | `packages/ausgabe` | resolved |
| 114 | X1 | App: Modelle, Baum, 3D | `apps/web/src/bim/` | resolved |
| 115 | X1 | App: Zuordnen, Mengen, Kennwerte, Aufmaß | `apps/web/src/bim/` | resolved |
| 116 | X1f | App: Modellvergleich | `apps/web/src/modellvergleich/` | resolved |
| 117 | X1 | Tor X1 | `apps/web/e2e/` | ready-for-agent |
| 118 | X2 | App: Bauzeitenplan, Tor X2 | `apps/web/src/bauzeit/` | resolved |
| 119 | X3 | App: Honorar, Tor X3 | `apps/web/src/honorar/` | resolved |
| 120 | X4 | App: Mängel, Bautagebuch, Tor X4 | `apps/web/src/bauleitung/` | resolved |
| 121 | – | App: Folgearbeit v1.5 | `apps/web/src/projekt/`, `auftrag/`, `ausgabe/` | resolved |

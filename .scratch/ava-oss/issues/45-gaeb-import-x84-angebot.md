# 45: GAEB: Import X84 → Angebot (G3)

Status: resolved
Type: task
Welle: 3 (Phase B) · Strang: G (G3) · Paket: `packages/gaeb` (benannte Ausnahme: `fixtures/extern/`, nur falls Punkt 6 eine Datei aufnimmt)
Blocked by: 40, 29
Regeln: A2, A3, A5, A7, N1, N4, Q1, Q3, Q5, U5, C1, C3, C4, G-11, G-14, G-26, G-32, G-55, E-13, E-15, D-04
Herkunft: `plan.md` §2 G3, D-04 (Zuschlagssatz des Bieters), E-15 (Prüfung der Testdateien freier Projekte bei G3), Ticket 22 (Leser, Befundcodes), Ticket 23 (Comments: freie Projekte nicht erreichbar), Ticket 40 (Leser für X86 und 3.2)

## What to build

Der Leser nimmt eine Angebotsdatei X84 (GAEB DA XML 3.3 und, wenn Ticket 40 3.2 liest, 3.2) und macht daraus **einen**
Befehl `AngebotAnlegen` (Massenbefehl, E-13) zum Ausschreibungs-LV, gegen das der Bieter angeboten hat. Tolerant lesen:
Was nicht passt, wird Befund, nichts geht still verloren (Q5). Vorgehen: TDD mit dem Skill `tdd`; am Ende
`pnpm lint && pnpm typecheck && pnpm test` grün. `okf/research/` wird nicht gelesen (C3).

1. **API** (Vorschlag): `leseAngebot(bytesOderText, { lv: Leistungsverzeichnis, angebotId, bieterId, maxBytes? })
   → { befehl: AngebotAnlegen | null; bieter: { name: string } | null; phase; version; befunde }`. Kennungen bringt der
   Aufrufer (A2); `bieter` ist der Namensvorschlag aus `CTR/Address` (`Name1` bis `Name4`, mit Leerzeichen verbunden), mit
   dem die App vorher `BieterAnlegen` ausführt, falls der Bieter fehlt (Ticket 49). Phase muss X84 sein, sonst Fehler
   `phase-nicht-unterstuetzt` (andere Phasen liest `leseGaeb`).
2. **Zuordnung über die Ordnungszahl.** Jede `Item`/`MarkupItem` der Datei wird über ihre OZ (Kette der `RNoPart` samt
   `RNoIndex`, mit dem Trennzeichen der Maske des LV) einer Position des LV zugeordnet; die GAEB-`ID` ist kein Schlüssel
   (A7). Befunde: OZ der Datei nicht im LV → Fehler `position-unbekannt` (die Zeile wird nicht übernommen); Position des LV
   ohne Zeile in der Datei → Angebotsposition „nicht angeboten“ und Warnung `position-fehlt-im-angebot`; Maske der Datei
   (`BoQBkdn`) weicht von der des LV ab → Warnung `maske-abweichend`, Zuordnung trotzdem über die Teile.
3. **Werte je Zeile** (Vorschlag, protokollieren als `D-xx`):
   - `UP` vorhanden → `status: 'angeboten'`, `einheitspreis` (3 Stellen, Rundung als Befund wie beim Leser); `UP` fehlt →
     `nicht-angeboten`. `0.000` ist angeboten (≠ nicht angeboten).
   - `UPComp1…n` mit `NoUPComps`/`LblUPComp<n> Type="…"` im `BoQInfo` → `epa`: Zuordnung über `Type` (`Wages` → `lohn`,
     `Materials` → `stoffe`, `Plant` → `geraete`, `Miscellaneous` → `sonstiges`; ein weiterer oder unbekannter Typ →
     `frei` mit `freiBezeichnung` = Beschriftung; mehr als ein solcher → Befund). In der BVBS-Datei trägt `Miscellaneous`
     die Beschriftung „Nachunternehmer“: Warnung `epa-beschriftung-abweichend`, Wert bleibt in `sonstiges`.
   - `MarkupItem` mit `Markup` → `status: 'angeboten'` mit `zuschlagssatz` (Ticket 29, Punkt 1, D-04) an der
     Angebotsposition der Zuschlagsposition; `einheitspreis` ist dort laut Ticket 29 ein Platzhalter (`UP` der Datei, falls
     vorhanden, sonst `0.000`) und wird nie gerechnet. `MarkupItem` ohne `Markup` → `nicht-angeboten`. `ITMarkup` und `IT`
     nur zur Prüfung (Punkt 4). Steht ein `MarkupItem` an einer Position, die im LV keine
     Zuschlagsposition ist (oder umgekehrt) → Fehler `zuschlag-art-abweichend`.
   - `DiscountPcnt`/`DiscountAmt` an einer Position oder in den `Totals` einer Gliederung → Fehler
     `nachlass-nicht-abgebildet` (G-23, G-26: genau ein Nachlass je Angebot); der Preis bleibt ohne Nachlass. Ein Nachlass
     in den `Totals` des LV (`BoQ`) → `Angebot.nachlass`.
   - Textergänzungen des Bieters (`TextComplement Kind="Bidder"` mit Inhalt) → Warnung
     `bieterergaenzung-nicht-abgebildet` (je Datei zusammengefasst): das Angebot hat dafür kein Feld; Lücke für ein
     Vertragsticket in den Comments (G-32).
4. **Prüfung gegen die Beträge der Datei** (nur Befunde, `dezimal` darf `gaeb` rechnen, `kern` nicht): je Position
   gerundet(Menge des LV × `UP`, 2) gegen `IT` → Warnung `gp-abweichend` mit beiden Werten. Die Zuschlagsbeträge und
   Summen rechnet `vergabe`; hier nur der Vergleich `IT` einer Position.
5. **Goldens** (Golden-Datei je Eingabe wie in Ticket 22, erste Zeile Zusammenfassung, dann ein Befund je Zeile):
   - `fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84` gegen das LV aus der zugehörigen `.X81`
     (beide haben dieselben 74 OZ, in der Ticketsitzung geprüft): 68 Positionen angeboten, 6 Zuschlagspositionen mit
     `zuschlagssatz` 10,00 (1.30.10.40, 1.30.20.40/50/70, 1.30.30.30/40); Stichproben EP 1.30.20.30 = 30,000,
     1.10.30.20 = 27,910 mit Anteilen 2,230/23,120/2,560/0,000; `gp-abweichend` genau an 1.30.10.30 (900,00 gegen 855,00)
     und 1.10.10.60 (Positionsnachlass 10 %); `nachlass-nicht-abgebildet` an 1.30.10.30, 1.10.10.60 und für die
     Gliederungen 1.10.10 (10 %), 1.10.15 (10 %), 1.10.20 (−5 %), 1.10 (Betrag 10.000,00).
   - `fixtures/extern/bvbs/3.3-bauausfuehrung/BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84` gegen das LV aus
     `Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83` (dieselben 28 OZ, geprüft): 002.001.0030 mit Satz 10,00, EP
     002.001.0010 = 1,000 und 0020 = 2,000.
   - Eine selbst verfasste kleine X84 mit Fehlern (unbekannte OZ, fehlende Position, `UP` fehlt, `UP` 0.000, Satz an einer
     Normalposition) unter `packages/gaeb/testdaten/x84/`.
   - Die Musterdatei 3.1 (`…2008-001.X84`) bleibt `version-nicht-unterstuetzt` (G4); Test, dass kein Befehl entsteht.
6. **E-15: Testdateien freier Projekte.** Einmal prüfen, ob freie Projekte (z. B. die in Ticket 23 genannten) X84-
   Testdateien unter einer zu AGPL-3.0-or-later passenden Lizenz anbieten und ob sie aus der Sitzung erreichbar sind. Nur
   wenn beides zutrifft: höchstens zwei Dateien unverändert unter `fixtures/extern/` aufnehmen, mit Zeile in
   `HERKUNFT.md`, REUSE-Eintrag und Lizenztext (C4, G-55), und als weiteres Golden. Sonst nichts aufnehmen und das Ergebnis
   (Projekt, Lizenz, erreichbar ja/nein) in die Comments. Zugriffssperren nicht umgehen.

## Grenzen

- **Paket `packages/gaeb`**; `fixtures/extern/` nur für Punkt 6 (benannte Ausnahme). `gaeb` importiert nur `vertrag` und
  `dezimal` (A3); keine Summenrechnung über den GP einer Position hinaus.
- Keine Änderung an `vertrag` (P9); fehlt ein Feld (Bieterergänzungen, Positionsnachlass), Lücke in die Comments.
- Sicherheit wie beim Leser (keine Entitäten, Größen- und Tiefengrenzen).
- **Zu groß?** Zuerst streichen: Punkt 6 (nur die Prüfung in den Comments), dann die EPA-Abbildung (dann Befund
  `epa-nicht-abgebildet`), dann 3.2.

## Acceptance criteria

- [x] `leseAngebot` liefert für beide BVBS-X84 einen `AngebotAnlegen`, dessen Positionen über die OZ zugeordnet sind; Golden-Dateien wie in Punkt 5
- [x] `zuschlagssatz` 10,00 an allen Zuschlagspositionen der beiden Dateien
- [x] Jeder Befund aus Punkt 2 bis 4 hat einen Code und einen Test (eigene Fehlerdatei)
- [x] „Nicht angeboten“ und „angeboten 0,000“ sind verschieden (Test)
- [x] Bietername aus `CTR` als Vorschlag
- [x] 3.1-Datei: kein Befehl, Befund `version-nicht-unterstuetzt`
- [x] E-15 geprüft, Ergebnis in den Comments (und ggf. Datei mit Herkunft und REUSE)
- [x] X84 mit 5.000 Positionen (selbst erzeugt im Test) in unter 1 s gelesen (Messwert im Ticket)
- [x] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Bietersummen, Zuschlagsbeträge und Preisspiegel (44), Oberfläche des Imports (49), X85 Nebenangebot, Excel-Rundlauf
(V5), Lesen von 3.1 (G4), Schreiben von X84.

## Answer

- Gebaut: `gaeb` G3 (`packages/gaeb/src/angebot.ts`): `leseAngebot` für X84 gegen das LV (AVA 74 von 74, Bauausführung 28 von 28 Positionen), gemeinsamer `vorlauf` in `lesen.ts`, Goldens `angebot-*.golden.jsonl`; D-45.1; E-15 geprüft, keine Datei übernommen.
- Merge: `476193f` (integration/welle-3).
- Offen: Offen: EPA-Bezeichnungen hält `LvInhalt` nicht, deshalb bleiben die EPA-Anteile der BVBS-X84 `null` (Befund `epa-nicht-abgebildet`) → Ticket 53; kein Positionsnachlass und keine Bieterergänzungen in `Angebotsposition` (→ 53).

## Comments

### Umsetzung (Branch `ticket/45-gaeb-x84`)

Nichts gestrichen (EPA, 3.2 und Punkt 6 geprüft). Seam (Demo-Modus): `leseAngebot` (`src/angebot.ts`, exportiert aus
`index.ts`). Der Vorlauf des Lesers (Größe, Kodierung, XML ohne Entitäten, Tiefe, Erkennung, 3.1-Abweisung) ist jetzt
eine gemeinsame Funktion `vorlauf` in `lesen.ts`; `leseGaeb` nutzt sie unverändert (alle bisherigen Goldens gleich).
`Leser.ort` trägt `knotenId` jetzt auch ohne XML-Element (bisher kein Aufrufer betroffen). Testdaten:
`testdaten/x84/lv.x83`, `fehler.x84`, `maske-abweichend-3.2.x84`; Goldens `testdaten/golden/angebot-*.golden.jsonl`
(ohne Textauszüge der amtlichen Dateien, daher kein eigener REUSE-Eintrag).

Ergebnisse der amtlichen Dateien: AVA-X84 gegen AVA-X81: 74 von 74 Positionen zugeordnet, 68 mit EP, 6 mit Satz 10,00
(Platzhalter-EP 0,000); `gp-abweichend` genau an 1.10.10.60 (720,00 gegen 800,00) und 1.30.10.30 (855,00 gegen 900,00);
`nachlass-nicht-abgebildet` (Fehler) an 1.10.10.60, 1.30.10.30 und den Gliederungen 1.10.10 (10 %), 1.10.15 (10 %),
1.10.20 (−5 %), 1.10 (10.000,00 €); `Angebot.nachlass` `null`. Bauausführung-X84 gegen X83: 28 von 28, 002.001.0030 Satz
10,00, EP 0010 = 1,000, 0020 = 2,000, vier Bieterergänzungen mit Inhalt (ein Befund). Bieter: „Maler + Lackierer Pinsel
und Co KG“ bzw. „BVBS“. Musterdatei 3.1: kein Befehl, `version-nicht-unterstuetzt`.

**Messung:** X84 mit 5.000 Positionen (im Test erzeugt): 101 ms (Test-Grenze 1 s).

**Suite (nach Merge von `integration/welle-3`):** `pnpm lint` grün, `pnpm typecheck` grün, `pnpm test`: Vitest 1303
bestanden, 2 übersprungen; `node --test` 16/16.

### Entscheidungen (Frage – Entscheidung – Grund), zusammengefasst als D-45.1

- EPA-Zuordnung – wie der X86-Leser (D-40.1): Bezeichnung vor `Type`, dann `Type` (Wages/Materials/Plant/Miscellaneous),
  sonst frei mit Bezeichnung; `Miscellaneous` + „Nachunternehmer“ → `nachunternehmer` ohne Befund; Bezeichnung und Typ
  widersprechen sich sonst → Warnung `epa-beschriftung-abweichend`, Bezeichnung gilt; zweiter Anteil derselben Art →
  `epa-nicht-abgebildet` – Abweichung vom Vorschlag des Tickets (Typ zuerst, Wert in `sonstiges`): Der eigene X83-Export
  schreibt genau „Nachunternehmer“/`Miscellaneous`; ein X84, das diese Beschriftung zurückgibt, muss beim selben Anteil
  landen wie im X86-Leser.
- **EPA der beiden BVBS-X84** – keine der beiden Dateien trägt `NoUPComps`/`LblUPComp` (auch die AVA-X81 nicht; nur die
  AVA-X86). Ohne Beschriftung ist die Art eines `UPComp` unbekannt; die Anteile bleiben `null`, ein Befund
  `epa-nicht-abgebildet` je Datei (AVA: 20 Werte). Die Stichprobe „Anteile 2,230/23,120/2,560/0,000“ an 1.10.30.20 ist
  damit nicht abbildbar, ohne eine Reihenfolge zu erfinden (C4); der EP 27,910 stimmt. **Lücke:** Die Beschriftungen
  definiert das LV (X83); `LvInhalt` hält sie nicht, deshalb kann der Leser sie auch nicht aus dem LV nehmen
  (Vertragsticket nötig, falls gewünscht).
- `IT` 0.00 an Alternative oder Bedarf ohne Gesamtbetrag – kein `gp-abweichend` – BVBS Bauausführung 001.002.0050
  (Alternative) trägt `IT` 0.00; das ist „nicht in der Summe“, kein abweichender Preis.
- Zeile mit falscher Art (`zuschlag-art-abweichend`, Fehler) – Zeile nicht übernommen, Angebotsposition „nicht
  angeboten“, Wert in der Meldung, keine zusätzliche Warnung `position-fehlt-im-angebot` – kein stilles Verlieren (Q5),
  der Platzhalter-EP ist kein Preis (D-12 Nr. 7).
- Doppelte OZ in der Datei – Fehler `doppelte-ordnungszahl`, erste Zeile gilt – Q5, eindeutige Angebotspositionen (D-36.2).
- Nicht lesbarer `UP`/`Markup` – Befund des Dezimallesers, Position „nicht angeboten“ – nichts erfinden.
- Bieterergänzung „mit Inhalt“ – `Kind="Bidder"`, nicht `Empty="Yes"`, Text nicht leer – die AVA-X84 trägt `''` mit
  `Empty="Yes"` (leer), die Bauausführung trägt echte Werte (`55` …).
- Übrige Bieterangaben in `CTR` (Adresse, Kontakt, `DPNo`, `AwardNo` mit Inhalt) – `nicht-abgebildet` je Element – der
  Bieter hat nur einen Namen (Q5); leere Elemente ohne Befund.
- Nachlass im LV mit Prozent und Betrag zugleich – Prozent gilt, Betrag als `nachlass-nicht-abgebildet` – G-26.
- `ITMarkup`, `IT` der Zuschlagszeile, `Total`/`TotAfterDisc` – nur gelesen, nicht geprüft – Zuschlagsbeträge und
  Summen rechnet `vergabe` (Grenze des Tickets).
- Text der Position in der X84 außer Bieterergänzungen, `Remark`, `PerfDescr`, `SubDescr` mit nur `SubDNo` – ohne Befund –
  das ist Struktur des LV, keine Angabe des Bieters; maßgeblich bleibt der Text des LV. `SubDescr` mit mehr als `SubDNo`
  ist `nicht-abgebildet`.
- Positionsnachlass, Bieterergänzungen – Lücken für ein Vertragsticket (G-32, G-26): `Angebotsposition` hat kein Feld
  für einen Nachlass je Position/Gliederung und keines für Bieterergänzungen.

### E-15: Testdateien freier Projekte (geprüft 2026-11-11)

- `frameiq/pygaeb` – Lizenz MIT (PyPI und `LICENSE` im sdist, AGPL-kompatibel); erreichbar über das PyPI-sdist 1.21.0
  (GitHub-API: 403). Der sdist enthält nur `tests/fixtures/gaebxml.x83` und `synthetic_33.X86`, **keine X84** → nichts
  übernommen.
- `bambamboole/gaeb-php` – GitHub-API 403 (Sitzung ohne Zugriff), Lizenz nicht geprüft, nicht umgangen → nichts übernommen.
- `openbimrs/gaeb`, `meindonut/gaeb-parser` – nur über GitHub erreichbar (gleiche Sperre wie Ticket 23) → nicht geprüft,
  nichts übernommen.

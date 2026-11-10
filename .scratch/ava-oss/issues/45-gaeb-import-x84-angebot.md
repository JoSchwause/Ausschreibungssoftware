# 45: GAEB: Import X84 → Angebot (G3)

Status: ready-for-agent
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

- [ ] `leseAngebot` liefert für beide BVBS-X84 einen `AngebotAnlegen`, dessen Positionen über die OZ zugeordnet sind; Golden-Dateien wie in Punkt 5
- [ ] `zuschlagssatz` 10,00 an allen Zuschlagspositionen der beiden Dateien
- [ ] Jeder Befund aus Punkt 2 bis 4 hat einen Code und einen Test (eigene Fehlerdatei)
- [ ] „Nicht angeboten“ und „angeboten 0,000“ sind verschieden (Test)
- [ ] Bietername aus `CTR` als Vorschlag
- [ ] 3.1-Datei: kein Befehl, Befund `version-nicht-unterstuetzt`
- [ ] E-15 geprüft, Ergebnis in den Comments (und ggf. Datei mit Herkunft und REUSE)
- [ ] X84 mit 5.000 Positionen (selbst erzeugt im Test) in unter 1 s gelesen (Messwert im Ticket)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Bietersummen, Zuschlagsbeträge und Preisspiegel (44), Oberfläche des Imports (49), X85 Nebenangebot, Excel-Rundlauf
(V5), Lesen von 3.1 (G4), Schreiben von X84.

## Comments

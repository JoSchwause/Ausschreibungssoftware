# Bericht: Lauf „Welle 4“ (Demo-Modus)

Stand 2026-11-11. Orchestrator: `/implement-welle 4`. Branch `integration/welle-4` ab `main` bei `491389c` (Welle 3, PR #9).
Diff gegen `main`: 331 Dateien, rund 35.500 Zeilen neu, 202 Commits. Schnitt: `schnitt-welle-4.md`, Übersicht
`issues/README.md`.

## Was der Lauf umfasste

Welle 4 laut `plan.md` §3: V3+V4, O1+O2, M2, S4, C1, dazu die Folgetickets 51–54 aus Welle 3. Die Tickets 55–69 hat der
Orchestrator geschnitten; 19 Tickets, alle `resolved`.

| Tickets | Inhalt |
|---|---|
| 51, 69 | Fixtures `typisch`/`gross`/`typisch-angebote` in GAEB-Zuschlagsform; drei X84-Angebote zu `typisch` mit unabhängigen Preisspiegel-Sollwerten |
| 52 | Einzeländerung bei 5.000 Positionen: Speicher im WAL, Baumprüfung in einer Abfrage, nur geänderte Spalten; Datenverlust beim Neuladen behoben |
| 53, 56, 57, 68 | `vertrag` v1.3 (LV-Übersicht, EPA-Bezeichnungen, Auftragnehmer, `Einfuegeort` hinter Gliederung, Mengenansatz) und Nachzug in `kern`, `speicher` (Migration 4), `gaeb` |
| 54, 67 | Lücken in `ui-grid`/`ui-basis` (aktive Zeile, Zeile öffnen, schreibgeschützt, Löschzahl, Tabelle einfügen, Anfangsfokus); Umwege in der App zurückgebaut |
| 55 | C1: neues reines Paket `kosten` (Kostengruppen nur aus Ziffern, Bezeichnungen aus CSV, Kostenermittlung) |
| 58, 61, 66 | O1: LV-Druck als PDF (ADR 0012, Vorschlag); O2: Excel für Bieter und Rücklauf als Angebot; beides in der App |
| 59, 60, 63, 64 | V3: Vergleichsgrid und Preisspiegel-Seite; V4: Zuschlag → Auftrags-LV, Auftrags-LV-Seite, **E2E Tor M3** |
| 62 | S4: PWA (offline), Export-Erinnerung, Sicherungsordner (Chromium) |
| 65 | M2: Mengenermittlungs-Panel (REB Formel 91) |

## Was jetzt läuft

- **App:** zusätzlich zu Welle 3: Preisspiegel je LV (EP/GP je Bieter, Min/Mittel/Max, Schätzpreis, Ausreißer, Nullpreis,
  nicht angeboten, ABC, Rang, Bedarfs- und Wahlsumme, einstellbare Schwellen); Zuschlag erteilen mit Wahl der Alternativen,
  Auftrags-LV-Seite (schreibgeschützt) mit X86-Export und Auftragnehmer; LV als PDF (mit/ohne Preise, im Worker); Excel für
  Bieter und Excel-Rücklauf; Mengenermittlung je Position; Installation als PWA, offline startbar, Erinnerung an die
  Sicherung, Sicherungsordner.
- **Suite auf dem Branch-Ende** (`2f27e96`, ruhige Maschine, Last ~1,4): `pnpm lint` grün, `pnpm typecheck` grün, `pnpm test`
  2026 bestanden / 2 übersprungen (145 Dateien) und 20/20 (Fixtures). E2E: `ui-grid` 58 bestanden / 3 übersprungen
  (Bildschirmfotos), `speicher` 16/16, `web` 64/64. XSD-Gegenprüfung 48/48 (amtliches XSD, lokal geladen, nie im Repo).
  Alle Leistungsbudgets grün.
- **Tor M3** („Ausschreibung → Angebote → Zuschlag“): **erreicht.** `apps/web/e2e/m3.spec.ts`, dreimal hintereinander grün:
  neues Projekt, LV `typisch` (Testweg, D-64.1), zwei X84-Angebote (Bieter A und B) über die Oberfläche eingelesen,
  Preisspiegel: Netto, Netto nach Nachlass, Brutto und Rang gleich den unabhängig berechneten Sollwerten aus
  `fixtures/typisch-angebote.json`; Zuschlag an Bieter A mit gewählter Alternative 02.0070 A; Auftrags-LV mit Netto 56.100,75 /
  Brutto 66.759,89 (aus den Fixture-GP hergeleitet), auch nach Neuladen; Undo/Redo; zweiter Zuschlag nicht möglich.
- **Q4:** Mengenänderung bei `gross` bis zur Summenzeile im dauerhaften Profil Median 36–61 ms (vorher 78–133 ms), hart
  geprüft (D-29). Im flüchtigen Playwright-Kontext 67–109 ms unter Last, dort nur gemessen.

## Was entschieden wurde

- Log: `entscheidungen-auto.md`, Orchestrator/Berater D-20 bis D-30, dazu die Umsetzer-Entscheidungen in den Tickets
  (D-51.x bis D-69.x). Annahmen zu offenen Fragen sind in `grilling.md` (E-04, G-16) und `next-decisions-welle-2.md` (W-04)
  vermerkt.
- **Berater:** 2 Aufrufe von höchstens 6. Aufruf 1 (gebündelt): Zuschlag → Auftrags-LV (D-21), Umfang `vertrag` v1.3 (D-22),
  getaggtes PDF (D-23), Umfang C1 (D-24). Aufruf 2: Form der EPA-Bezeichnungen (D-28).
- Die wichtigsten Entscheidungen, die der Mensch prüfen sollte:
  - **D-21** Auftrags-LV enthält nur das Beauftragte: gewählte Alternative wird normale Position, Grundposition und nicht
    gewählte Alternativen entfallen (E-04, Annahme).
  - **D-22/D-27/D-28** `vertrag` v1.3, geprüft von einem Opus-Reviewer statt des Nutzers (P9); EPA-Bezeichnungen mit
    ausdrücklicher Platznummer.
  - **D-23** PDF mit pdfmake, ungetaggt; ADR 0012 `proposed` (W-04).
  - **D-24** C1 als reines Paket; DIN-276-Hierarchie allein aus den Ziffern (G-16, Annahme).
  - **D-20** `apps/web`: ein Schreiber je Ordner statt je Paket.
  - **D-29** Q4-Schranke im dauerhaften Browserprofil.
- **Wellen-Review** (`code-review`, Fixpunkt `main`): Standards 11, Spec 6 Befunde, dazu 5 bekannte Punkte
  (`review-welle-4.md`). Behoben in `fix/welle-4-review`: der stille Verlust von EPA-Bezeichnungen und Auftragnehmer beim
  GAEB-Export der App (auch „Stand als neues LV“), S1–S11 (S6 teilweise), P1, P5 und die Laufzeit-Hülle der Sicherung.

## Was fehlt oder dünn ist

- **Folgetickets 70–75** (`ready-for-agent`): Repository für Auftrags-LVs im Vertrag (70; heute liest die App ein Auftrags-LV
  aus dem ganzen Projektdatei-Export) und Kern-Umkehrung (71); `summen.vorher` bei neuer LV-Position im Angebot (72);
  **Wahlgruppe verliert die Grundposition im X83-Rundweg** (73; deshalb legt die M3-E2E das LV über den Testweg an, nicht per
  X83); `ui-grid` (74: neutrales Kennzeichen für Mengenansatz, Löschdialog-Fokus, Vergleichsgrid beim schnellen Wischen nur
  15–23 Bilder/s); Fixtures (75: veraltete Ausreißerliste, unabhängige Bedarfs-/Wahlsummen für den Drucktest).
- **C1** ist nur das Rechenpaket: keine Speicherung, keine Oberfläche (D-24). Zuordnung LV ↔ Kostengruppe ist C2.
- **Nicht von Hand geprüft:** PDF und Excel in anderen Programmen als LibreOffice (kein Microsoft Excel, kein Acrobat), PDF
  in Firefox/Safari; der Sicherungsordner über einen Neustart (das headless Chromium stürzt beim Lesen eines Ordner-Handles
  aus IndexedDB ab, D-62.3); GAEB-Exporte in einem freien Betrachter (wie schon in Welle 3).
- Positionsnachlass und Bieterergänzungen aus X84 bleiben Befund (D-22 (ii), G-26).
- `ausgabe` steckt zweimal im Bündel (Worker und nachgeladener Teil, je ~0,8 MB); das Hauptbündel enthält kein pdfmake.
- **Unter Parallellast** (bis Last 23 bei 8 Agenten auf 4 Kernen) fielen wiederholt die CPU-Budgets in `kern`, `gaeb` und
  `vergabe`; auf ruhiger Maschine sind alle grün. Kein Budget wurde gelockert.
- **Nutzungslimit:** Gegen Ende traf der Lauf das 5-Stunden-Limit; der Umsetzer von Ticket 64 wurde gestoppt und danach aus
  seinem gespeicherten Stand fortgesetzt. Verloren ging nichts.
- `pnpm lint` braucht im Container weiter `NODE_OPTIONS=--max-old-space-size=8192`.

## So probiert man es aus

```bash
git checkout integration/welle-4
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
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test e2e/m3.spec.ts
```

```bash
pnpm --filter @tethys/gaeb run xsd-gegenpruefung
```

In der App: Projekt anlegen → LV anlegen oder GAEB einlesen → auf der LV-Seite „Angebote“ → X84 aus
`fixtures/angebote/` einlesen → „Preisspiegel“ → „Zuschlag erteilen“. Die PWA mit Offline-Start gibt es nur im Build
(`pnpm build && pnpm --filter @tethys/web preview`).

## Eintritt Welle 5

Welle 5 (`plan.md` §3): A1–A4 · M3 · C2–C5 · O3. Tor **M4**: durchgehende Kette LPH 6–8.

1. **Mensch:** `entscheidungen-auto.md` D-20 bis D-30 durchsehen (vor allem D-21, D-22/D-28, D-23, D-24), `vertrag` v1.3 und
   ADR 0012 annehmen oder ändern, `integration/welle-4` als Pull Request nach `main` (P7).
2. **G-27** (Tiefe der Rechnungsprüfung, A3) in einer Grilling-Runde klären; offen ist auch die zweite Bedeutung von
   „VOB 80“ (vor A1).
3. **Ticket 70** (`vertrag` v1.4) vor A1/A2: Auftrags-LV braucht ein Repository und eigene Befehle, bevor Nachträge und
   Aufmaß daran hängen; danach 71.
4. Ticket 73 vor allem, was ein per X83 eingelesenes LV vergibt.
5. Tickets für Welle 5 schneiden (A1 Nachträge, A2 Aufmaß/Soll-Ist, A4 XRechnung lesen, M3 X31, C2–C5, O3 mit Tagging-Spike).

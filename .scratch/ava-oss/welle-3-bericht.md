# Bericht: Lauf „Welle 3“ (Demo-Modus)

Stand 2026-11-11. Orchestrator: `/implement-welle 3`. Branch `integration/welle-3`, **nur lokal**: kein Push, kein
Pull Request, nichts auf `main`. Basis: `main` bei `634247f`. Diff gegen `main`: 355 Dateien, rund 53.800 Zeilen neu,
etwa 260 Commits.

## Was der Lauf umfasste

Welle 2 war beim Start nur bis Stufe 1 fertig: `vertrag` v1.1a/v1.1b waren gemergt, ihre Folgearbeiten fehlten. Welle 3
hängt daran. Deshalb lief der Rest von Welle 2 als **Phase A** im selben Lauf (D-01, Berater). **Phase B** war Welle 3.
Es gab 22 Tickets (29–50), alle `resolved`. Den Schnitt zeigt `schnitt-welle-3.md`, die Übersicht `issues/README.md`.

| Phase | Tickets | Inhalt |
|---|---|---|
| A | 29 | `vertrag` v1.2: Zuschlagssatz im Angebot, Papierkorb, LV-Stände, Rückgängig/Wiederholen, Kopfdaten-Befehle |
| A | 30–33 | `kern`, `speicher`, `gaeb`, `ui-grid` an v1.1a/v1.1b angepasst |
| A | 34 | Langtext-Editor (TipTap, eingeschränktes Schema, verlustfreie Abbildung) in `ui-basis` |
| A | 35 | neues Paket `mengen`: REB-Formelparser (freier Rechenansatz, Formel 91), `dividiere` in `dezimal` |
| A | 36 | neues Paket `vergabe`: Angebotsbefehle, Bietersummen, Preisspiegel (Min/Mittel/Max, Ausreißer, ABC, Rang) |
| A | 37 | K5–K7: Positionsmerkmale, Wahl- und Zuschlagspositionen (GAEB-Regel aus den amtlichen Dateien), EPA |
| A | 38 | S2: Projektliste, Schema 2, Migration v1→v2, Kurzprotokoll für Massenbefehle |
| A | 39 | U3: LV-Grid in der App an Befehle und Speicher angebunden, **E2E für Tor M1** |
| A | 40 | G2: GAEB-Writer X81/X83/X86 in 3.3 und 3.2, eigene Prüfung, XSD-Gegenprüfung in der CI, Roundtrip |
| B | 41, 42, 50 | K8 formale LV-Prüfung (26 Regeln), K9 Kopieren/Verschieben/Papierkorb, voller Langtext im Kern |
| B | 43 | S3: Undo/Redo, LV-Stände, Papierkorb-Tabellen, Migration 3 |
| B | 44, 45 | Zuschlagspositionen im Angebot und Preisspiegel; Import X84 → Angebot |
| B | 46, 47, 48, 49 | Grid-Zeilenaktionen; Positionsdialog und Prüf-Panel; Zwischenablage, Undo, LV-Stände, Papierkorb in der App; GAEB-Import/-Export in der App |

## Was jetzt läuft

- **App** (`apps/web`): Projekt und LV anlegen; Gliederung und Positionen per Tastatur; Merkmale, Zuschlagspositionen mit
  drei Bezugsformen, EPA, Langtext mit Absätzen, Listen und Tabellen; Nachlass und MwSt in der Summenzeile;
  Prüf-Panel mit Sprunglinks (F8); Kopieren, Ausschneiden, Einfügen (auch aus Excel), Verschieben, Papierkorb;
  Undo/Redo (Strg+Z/Strg+Y); LV-Stände; GAEB X81/X83/X86 importieren und exportieren (Entwurf bei Prüffehlern); X84-Angebote
  einlesen. Automatisches Speichern im OPFS, Projektdatei-Export und -Import.
- **Suite auf dem Branch-Ende:** `pnpm lint` grün, `pnpm typecheck` grün (auch `proto/interview`), `pnpm test`
  1625 bestanden / 2 übersprungen (Vitest, 102 Dateien) und 16/16 (Fixtures). E2E: `web` 40/40, `speicher` 13/13,
  `ui-grid` 32 bestanden / 3 übersprungen (Bildschirmfotos, nur mit `GRID_SCREENSHOT_DIR`).
- **Tor M1** („LV anlegen, rechnen, speichern“): **erreicht.** `apps/web/e2e/m1.spec.ts` legt per Tastatur ein LV mit
  2 Ebenen und den fünf Positionen aus `fixtures/typisch.json` an, setzt jedes Merkmal (Pauschal, Bedarf mit/ohne
  Gesamtbetrag, Stundenlohn, Wahl) und eine Zuschlagsposition, lädt neu und prüft OZ, GP, Titelsummen, Nachlass, MwSt,
  Brutto, Bedarfs- und Wahlsumme gegen die Fixture-Werte.
- **Tor M2** („GAEB rein und raus, XSD-valide“): **erfüllt mit gelisteten Unterschieden** (D-18). Alle vier Fixtures
  (`winzig`, `typisch`, `gross`, `zuschlag`), ein reiches Hand-LV und die Inhalte der amtlichen BVBS-Dateien werden
  nach X81/X83/X86 in 3.3 und 3.2 exportiert. Alle Exporte bestehen die eigene Prüfung, und 42 von 42 Dateien validieren
  gegen das amtliche XSD (lokal am 2026-11-11 geprüft, XSD nur in einem temporären Ordner, nie im Repo).
  Beim Re-Import entsteht das gleiche Modell bis auf eine ausdrückliche Liste je Fixture und Position
  (`packages/gaeb/testdaten/roundtrip-unterschiede.json`). Jeder ungelistete Unterschied lässt den Test scheitern.
  Die Liste enthält vor allem die Altform der Zuschlagsposition in `typisch`/`gross` (Folgeticket 51) und künstlich
  vergebene Wahlgruppen (D-16). **Nicht gemacht:** die Prüfung von Hand in einem freien GAEB-Betrachter. Kein
  Betrachter und kein Bildschirm im Container; die Schritte stehen in Ticket 49.

## Was entschieden wurde

- Log: `.scratch/ava-oss/entscheidungen-auto.md`. 18 Einträge des Orchestrators bzw. Beraters (D-01 bis D-19; D-11
  wurde in D-29.1 umbenannt) und 20 Einträge der Umsetzer (D-xx.y). Jede Annahme zu einer G-/E-Frage ist in `grilling.md`
  vermerkt (G-26, E-03, E-04).
- **Berater:** 2 Aufrufe von höchstens 6. Aufruf 1: Umfang, K6 ohne Fachdokumentation, Vertrag v1.2, Ausreißer bei 0,00.
  Aufruf 2: Befunde des Wellen-Reviews zu Geld und GAEB.
- Die wichtigsten Entscheidungen, die der Mensch prüfen sollte:
  - **D-01** Welle-2-Rest im selben Lauf.
  - **D-02** Merge von PR #4/#7 gilt als Prüfung von v1.1a/v1.1b.
  - **D-03/D-10/D-37.2** Zuschlagsrechnung aus den amtlichen Prüfdateien statt aus dem Zitat der Fachdokumentation
    (F3/E-03). Die Sollwerte 95,50 / 140,00 / 279,10 und die Titelsummen 1.450,50 / 1.790,00 / 819,10 / 4.059,60
    werden exakt erreicht.
  - **D-04/D-12/D-13** `vertrag` v1.2, statt vom Nutzer (P9) von einem Opus-Reviewer geprüft; neun Befunde behoben.
  - **D-05** Ausreißer: Mittel nur über Preise > 0.
  - **D-16** Künstliche Wahlgruppen im GAEB-Export.
  - **D-17** Summen nach der Migration neu rechnen.
  - **D-18** M2 mit gelisteten Unterschieden.
  - **D-19** Paketgrenzen `speicher → kern`, `gaeb → kern`.
- **Wellen-Review** (`code-review`, Fixpunkt `main`): Standards 9, Spec 8 Befunde (`review-welle-3.md`). Behoben: S1–S8,
  P1, C1, C2 (Branch `fix/welle-3-review`). Offen: S9 (freiwillig) und P2–P4 (siehe unten).

## Was fehlt oder dünn ist

- **Leistungsbudget (Q4, Ticket 39):** Eine Mengenänderung bei 5.000 Positionen braucht bis zur Summenzeile im Median
  78–94 ms, unter Last aber 101–133 ms. Davon entfallen 68–111 ms auf `speicher.anwenden`. Das Ziel < 100 ms ist **nicht
  sicher erreicht**: Folgeticket 52.
- **X84-Einheitspreisanteile** haben keine Bezeichnungen im `LvInhalt` und werden als Befund gemeldet. Ebenso
  Positionsnachlässe des Bieters (G-26: einer je Angebot) und Bieterergänzungen. Ticket 53 (`vertrag` v1.3).
- **Fixtures** `typisch`/`gross`/`typisch-angebote` stehen noch in der Altform der Zuschlagsposition: Ticket 51
  (blockiert M3).
- **Lücken im Vertrag** (`auflisten` nur mit Kennungen, `Einfuegeort` „nach Gliederung“, `Summenaenderung.vorher` noch
  optional, kein Auftragnehmer im GAEB-Modell): Ticket 53. Lücken in Grid und Editor (aktive Zeile melden,
  schreibgeschützter Modus, Werkzeug „Tabelle einfügen“): Ticket 54.
- Nach dem Rückgängigmachen einer Projektlöschung fehlt das alte Protokoll (D-31.1).
- `pnpm lint` braucht in diesem Container `NODE_OPTIONS=--max-old-space-size=8192`. Sonst bricht eslint mit
  Speichermangel ab. Die CI auf GitHub ist damit nicht geprüft.
- **Unter Parallellast wackelig:** `vergabe/src/leistung.test.ts` (Budget 1 s) und einmal
  `kern/src/summen-eigenschaften.test.ts`. Einzeln und in ruhigen Läufen sind beide grün; die Ursache ist nicht
  untersucht.
- **Nutzungslimit:** In der Nacht vom 10. auf den 11.11. erreichte der Lauf das 5-Stunden-Limit. Drei Agenten (39, 41
  und der Merge von 43) wurden mitten in der Arbeit gestoppt und danach aus ihrem gespeicherten Stand fortgesetzt;
  verloren ging nichts.
- Die CI auf GitHub ist für diesen Branch nie gelaufen, weil nichts gepusht wurde. Das gilt auch für den neuen XSD-Job.

## So probiert man es aus

```bash
git checkout integration/welle-3
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
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web e2e
```

```bash
pnpm --filter @tethys/gaeb run xsd-gegenpruefung
```

`PW_CHROMIUM_PATH` ist nur in dieser Cloud-Umgebung nötig. Die XSD-Gegenprüfung lädt die amtlichen ZIPs von gaeb.de in
einen temporären Ordner. Ist `CI` gesetzt und das XSD nicht erreichbar, schlägt sie fehl; ohne `CI` überspringt sie mit
einer sichtbaren Meldung.

## Eintritt Welle 4

Welle 4 (`plan.md` §3): V3+V4, O1+O2, M2 (Mengenermittlungs-Panel), S4, C1. Tor M3: „Ausschreibung → Angebote →
Zuschlag“.

1. **Mensch:** `entscheidungen-auto.md` durchsehen, vor allem D-01, D-03, D-05, D-12/D-13, D-16 bis D-19. `vertrag`
   v1.2 annehmen (P9). Den Branch `integration/welle-3` als Pull Request nach `main` bringen (P7: Review, Merge-Commit).
2. **Ticket 51** (Fixtures in GAEB-Zuschlagsform) vor V3/V4, da es M3 blockiert.
3. **Ticket 53** (`vertrag` v1.3) vor V4: Auftrags-LV, Auftragnehmer, EPA-Bezeichnungen. Danach die Preisspiegel-Typen,
   falls `ausgabe` sie für O1/O2 braucht (D-04).
4. **Offen aus Welle 2:** W-04 (getaggtes PDF, vor O1) und W-06 (Interview mit dem Büro, Ausreißer-Regel; D-05 ist bis
   dahin eine Annahme).
5. Tickets für Welle 4 schneiden (V3, V4, O1, O2, Mengen-Panel, S4, C1).

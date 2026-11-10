# 18: Klickbarer Prototyp für das Nutzerinterview

Status: ready-for-agent
Type: prototype
Blocked by: -
Regeln: `docs/regeln.md` C1, C4, L1, L3, U3, U4, U5 (Architekturregeln A/P gelten nicht, siehe Grenzen)
Herkunft: G-02 (Nachtrag 2026-11-09), `.scratch/ava-mvp/spec.md` Abschnitt 8

## Frage, die der Prototyp beantwortet

Das Architekturbüro, das erster Nutzer wird, soll an etwas Anfassbarem sagen können, **was stimmt und was
nicht**, bevor Vertrag, Kern und Grid gebaut werden. Der Prototyp beantwortet vier Teilfragen:

1. **LV-Grid und Tastatur.** Fühlt sich das Bearbeiten eines LV (Titel, Positionen, Summen) schneller und
   direkter an als in der heutigen Software? Reicht Excel-artige Navigation?
2. **Preisspiegel.** Erkennt man auf einen Blick, wer günstig ist, wo Preise auffallen (Ausreißer) und wie die
   Rangfolge aussieht?
3. **Gliederung Projekt / LV / Angebot.** Passt das Modell „ein Projekt, mehrere LVs, Angebote und
   Auftrags-LV als getrennte Objekte“ zur Denkweise im Büro?
4. **GAEB-Weg.** Ist der Ablauf „X83 laden, X84 einlesen, Export mit Prüfwarnung als Entwurf“ verständlich?

## Form

Eine klickbare Web-Oberfläche mit **mehreren, deutlich verschiedenen Varianten je Ansicht**, umschaltbar per
URL-Parameter und schwebender Leiste (Skill `prototype`, Zweig UI). Ein Befehl startet sie. Alle Texte deutsch.

Mindestens diese Ansichten, je mit zwei bis drei Varianten:

| Ansicht | Teilfrage | Varianten (Vorschlag) |
|---|---|---|
| LV-Grid | 1 | dichte Tabelle mit Baum · Tabelle mit Seitenpanel für Position · Karten je Titel |
| Preisspiegel | 2 | Matrix mit Farbskala · Matrix mit Rangzahl · Balken je Position |
| Projektübersicht | 3 | Baum Projekt → LV → Angebot · Registerkarten je LV · Vorgangsliste (Ausschreiben, Vergabe, Auftrag) |
| GAEB-Dialog | 4 | Assistent in Schritten · eine Seite mit Prüfliste |

## Was echt ist und was nur gespielt

- **Echt:** Rechnung von GP, Summen, Nachlass und MwSt nach Regel N2 (Dezimalarithmetik, kein `number` für
  Beträge), Bieter-Summen, virtuelle Bieter Min/Mittel/Max, Ausreißer ±20 %, Rangfolge, Tastaturnavigation
  im Grid (Pfeile, Enter, Tab, F2).
- **Gespielt:** GAEB. „X83 laden“ und „X84 einlesen“ lesen **vorbereitete JSON-Dateien** aus dem
  Prototyp-Ordner und tun so, als wären es GAEB-Dateien. Kein XML-Parser, kein XSD. Der Dialog zeigt eine
  **erfundene** Prüfliste mit zwei Warnungen und das Kennzeichen „Entwurf“.
- **Nicht vorhanden:** Speicherung (alles im Speicher, Neuladen setzt zurück), Undo, Positionsarten außer
  Normal, Bedarf, Wahl, Pauschal, Zuschlagsposition, Konten, Mehrbenutzer.

## Daten

Selbst verfasst (Regel C4): ein erfundenes Beispielprojekt, **ein LV mit 3 Titeln und etwa 25 Positionen**,
dazu **drei Angebote** mit verschiedenen Preisen, darunter ein Ausreißer, ein Nachlass und eine nicht
angebotene Position (nicht angeboten ≠ 0,00). Summen vorher von Hand nachrechnen und im README des
Prototyps festhalten. Keine echten Firmen-, Projekt- oder Personennamen.

## Grenzen

- **Wegwerfcode.** Eigener Branch `proto/interview`, **nicht in `main`**, Ordner `proto/interview/`. Keine Tests,
  keine Abstraktionen. Ein README sagt, wie man startet und was gespielt ist.
- **Nachtrag E-20 (2026-11-10):** Der Prototyp wird auf `packages/ui-grid`, `packages/ui-basis`, `packages/dezimal`
  und den Fixtures gebaut (`fixtures/typisch.json`, `fixtures/typisch-angebote.json` dürfen die selbst verfassten
  Daten unten ersetzen, wenn Ausreißer, Nachlass und „nicht angeboten“ darin vorkommen oder ergänzt werden). Die
  Pakete werden nur benutzt, nicht geändert. Die Variante „dichte Tabelle mit Baum“ ist das echte Grid; an ihr
  werden die Fragen aus E-18 gestellt (Enter startet das Bearbeiten, Leertaste wählt die Zeile, Einfügen legt neue
  Positionen an).
- **Clean Room (C1, L3, U4).** Kein Layout, Icon, Name oder Feldname der Referenzsoftware. Wer das Vorbild
  kennt, soll im Prototyp nichts wiedererkennen. Eigenes Erscheinungsbild.
- **Kein Recherchebestand lesen** (C3). Alle Angaben stehen in diesem Ticket, `GLOSSARY.md`, `spec.md` und
  `docs/regeln.md`.
- **Validierung blockiert nie die Eingabe (U5).** Fehler stehen in der Prüfliste, nicht in Sperrdialogen.
- Kein Anspruch auf Vollständigkeit. Wo etwas fehlt, steht ein Platzhalter „noch nicht im Prototyp“.

## Acceptance criteria

- [x] Ein Befehl startet den Prototyp, alle vier Ansichten sind per Leiste mit allen Varianten erreichbar
- [x] Im LV-Grid sind Zellen per Tastatur bearbeitbar; Summen, Titelsummen, Nachlass und MwSt ändern sich sofort
- [x] Die Summen der drei Angebote und des Preisspiegels stimmen mit den im README von Hand nachgerechneten Werten
- [x] Preisspiegel zeigt Min, Mittel, Max, Ausreißer und Rangfolge; „nicht angeboten“ ist von 0,00 unterscheidbar
- [x] Der GAEB-Dialog zeigt Warnungen und „Entwurf“, ohne die Eingabe zu sperren
- [x] README nennt: Startbefehl, was gespielt ist, die vier Teilfragen und je Variante eine Zeile, worauf das Büro achten soll
- [x] Eine Seite „Notizen“ im README (leer) nimmt die Antworten des Büros je Variante auf

## Danach (nicht Teil dieses Tickets)

Interview durchführen, Antworten unter `## Answer` eintragen, Status `resolved`. Bestätigte Entscheidungen fließen
in `vertrag` (F2), Grid (U2/U3) und Preisspiegel (V3) und, wenn sie eine G-Frage berühren, in `grilling.md`.
Prototyp als primäre Quelle auf dem Branch lassen und im Ticket verlinken.

## Comments


**Umsetzung (Branch `worktree-agent-a367640c82460b5ef`, Basis `4396721`)**

Alles in `proto/interview/` (Vite + React, Arbeitsbereich `@proto/interview`), dazu `proto/*` in `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `proto/**` in `eslint.config.js` (ignores) und `proto` in `.prettierignore`. `packages/`, `apps/`, `fixtures/` sind unverändert; `fixtures/typisch*.json` wurden nur gelesen und per `daten/erzeugen.mjs` nach `src/daten/` kopiert (alle Positionen als Normalposition, siehe README).

- Start: `pnpm --filter @proto/interview start` (http://127.0.0.1:5180); Ansicht und Variante per URL (`?ansicht=lv|spiegel|projekt|gaeb&variante=...`) und schwebende Leiste. Elf Varianten wie im Vorschlag der Tabelle (3 + 3 + 3 + 2).
- Echt: GP, Titelsummen, Nachlass, MwSt (N2, `@tethys/dezimal`), Bieter-Summen, Min/Mittel/Max, Ausreißer ±20 %, Rangfolge. Variante „dichte Tabelle mit Baum“ ist das echte `@tethys/ui-grid`. Gespielt: GAEB (vorbereitete JSON-Dateien, erfundene Prüfliste mit zwei Warnungen, „Entwurf“), zweites LV, Auftrags-LV.
- Prüfung: `node pruefung/pruefen.mjs` gegen die unabhängige Handrechnung `daten/handrechnung.mjs` (BigInt, schreibt `daten/erwartet.json`, Werte stehen im README). Ergebnis: 1.184 Werte und Verhaltensweisen geprüft, keine Abweichung. Umgebung: headless Chromium (`/opt/pw-browsers/chromium`, Playwright), Viewport 1440×900, Vite-Entwicklungsserver, Linux-Container. Gemessen: LV-Summen und Titelsummen in allen drei LV-Varianten; GP aller 25 Positionen im Grid; in allen drei Preisspiegel-Varianten Summen je Bieter (Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto), Titelsummen, virtuelle Bieter, alle 75 Bieterzellen (Preis oder „nicht angeboten“), Min/Mittel/Max, Ausreißer, Rangfolge; Leiste und URL für alle elf Varianten.
- Zahlen (EUR): LV Netto 61.930,21, Nachlass 2 % 1.238,60, MwSt 11.531,41, Brutto 72.223,02. Angebote Netto nach Nachlass: A 61.867,49 (Rang 1), C 62.427,54 (Rang 2), B 63.283,22 (Rang 3; Netto 65.240,43, Nachlass 3 % = 1.957,21, Position 03.0070 nicht angeboten). Virtuelle Bieter Netto nach Nachlass: Min 61.867,49, Mittel 62.526,08, Max 63.283,22. Ausreißer: 02.0050 C, 03.0030 C und (Folge der 0,00) 03.0080 A, B, C.
- Bilder aller Ansichten und Varianten bei 1440×900: `proto/interview/screenshots/` (`node pruefung/screenshots.mjs`).

**Tastatur im echten Grid (Messung durch `pruefen.mjs`)**

Geht: Pfeile (Zeile und Spalte), Pos1/Ende, Strg+Pos1, Bild runter; Enter und F2 beginnen das Bearbeiten, Enter im Feld bestätigt und geht eine Zeile nach unten, Tab im Feld bestätigt und geht nach rechts, Escape verwirft, Zeichentippen beginnt die Eingabe, Entf leert eine Zelle, ungültige Eingabe bleibt markiert und sperrt nichts (U5), Leertaste schaltet die Zeilenauswahl um (ein Mausklick wählt die Zeile bereits; wer klickt und dann Leertaste drückt, hebt die Auswahl wieder auf), Alt+Pfeil links/rechts klappt Titel zu/auf, Strg+V aus Excel legt neue Positionen an. Jede Änderung ändert GP, Titelsumme, Netto, Nachlass, MwSt und Brutto sofort; die Folgewerte wurden unabhängig nachgerechnet (Menge 01.0010 auf 2, EP 01.0020 auf 8,5, Entf auf EP 01.0040, Nachlass 3,5 %, MwSt 7 %, zwei eingefügte Zeilen).

Geht nicht (Lücken, nicht im Prototyp umgangen): Eine Position lässt sich nicht ohne Zwischenablage neu anlegen (kein Befehl „neue Zeile darunter“); keine Zeile löschen oder verschieben (das Grid gibt weder `KnotenLoeschen` noch `KnotenVerschieben` aus); kein Rückgängig (Strg+Z); eingefügte Positionen haben keine Ordnungszahl (Vergabe ist Sache von `kern`); Nachlass und MwSt sind in der Summenzeile nur lesbar, der Prototyp bietet sie deshalb als eigene Felder über dem Grid an.

**Lücken in gesperrten Paketen (nur vermerkt, nichts geändert)**

- `ui-basis` `Dialog`: keine Größen- oder Klassenangabe; der Prototyp überschreibt die Breite per CSS (`.tx-dialog { width: ... !important }`). Der Dialog ist modal und setzt `pointer-events: none` auf die übrige Seite; eine Leiste außerhalb braucht `pointer-events: auto`.
- `ui-grid`: `GridZahlen` und `GridIdQuelle` liegen im Paket statt in `vertrag` (schon in Ticket 21 vermerkt); `wurzelId` braucht im Prototyp einen Cast auf `ElternId`, weil `LvAnsicht` die Wurzel nicht kennt. Die Spalte „Art“ ist über `spalten` ausblendbar (im Prototyp genutzt).
- `dezimal`: keine Division. Der Mittelwert des Preisspiegels braucht eine Rundungsregel; der Prototyp rundet das arithmetische Mittel der GP kaufmännisch auf 2 Stellen und vergleicht die Ausreißergrenze exakt per Ganzzahl.

**Vorläufige Annahmen (Entscheidung offen)**

Ausreißer nach A7 der Fixtures (Bezug: GP, Mittel einschließlich des geprüften Bieters, mindestens drei Werte, strikt größer als 20 %); Angebote tragen die Mengen der Ausschreibung (eingefroren); Rangfolge nach Netto nach Nachlass, eine fehlende Position wird nicht ergänzt, nur gewarnt; die Schätzpreis-Spalte im Preisspiegel zeigt den aktuellen LV-Stand und fließt nicht in Min/Mittel/Max ein.

**Lint und Typen:** `pnpm lint`, `pnpm typecheck` (einschließlich `proto/interview`) und `pnpm test` (713 Tests, 1 übersprungen) sind grün, `reuse lint` konform. `proto/` steht in den Ignore-Listen von ESLint und Prettier, weil die Architekturregeln des Monorepos für Wegwerfcode nicht gelten (Ticket: „Grenzen“). `pnpm e2e` nicht gelaufen (der Prototyp hat keine Tests).

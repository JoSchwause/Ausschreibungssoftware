# 19: Fixtures v1: drei selbst verfasste LVs mit Sollwerten (F3)

Status: ready-for-agent
Type: task
Welle: 0 · Strang: F · Paket: `fixtures/`
Blocked by: -  (die Ordner dürfen vor 03 als lose Dateien entstehen; Einbindung ins Monorepo nach 03)
Regeln: C1, C4, G-41, L1, L3, N2

## What to build

Drei **erfundene** Leistungsverzeichnisse als Daten im Repo, jede mit **Sollwerten, die aus der Regel herleitbar sind**
(GP = round(Menge × EP, 2), Summen aus gerundeten GPs, MwSt auf Nettosumme nach Nachlass; N2). Format: ein
neutrales JSON, das **nur Fixture-Zweck** hat und in `vertrag` (Ticket 02) abgebildet wird. GAEB-Dateien kommen in Ticket 23
und 22. Erzeugung per Skript, das im Repo liegt und Sollwerte aus den Eingaben berechnet (Vorbild: Erzeugungsskript
einer freien Konformitätssuite, nur als Methode, nicht kopieren).

| Fixture | Umfang | Zweck |
|---|---|---|
| `winzig` | 1 Titel, 3 Positionen | Handrechnung, erste Tests von `dezimal` und `kern` |
| `typisch` | 3 Titel, ca. 25 Positionen, Indexpositionen (`RNoIndex`), eine Bedarfs-, eine Wahl- und eine Zuschlagsposition, Nachlass, MwSt 19 % | Grid-Entwicklung (U2), Summenregeln |
| `gross` | 5.000 Positionen, 5 Gliederungsebenen, erzeugt per Skript mit Seed | Leistungsbudgets (Q4); wird nicht von Hand gepflegt |

Zusätzlich je ein **Angebot** zu `typisch`: drei Bieter mit verschiedenen Preisen, ein Ausreißer, ein Nachlass,
eine nicht angebotene Position (≠ 0,00). Dient V1/V2 und dem Prototyp.

## Acceptance criteria

- [x] Jede Fixture trägt `sollwerte` (GP je Position, Titelsummen, Netto, Nachlass, MwSt, Brutto), vom Skript berechnet und im README von Hand für `winzig` nachgerechnet
- [x] Hand-Beispiele enthalten: 1,235 × 10,00 = 12,35 · 3,333 × 4,56 = 15,20 (15,19848) · 27,55 netto, MwSt 19 % = 5,23 (5,2345), brutto 32,78
- [x] `gross` ist reproduzierbar (gleicher Seed, gleiche Datei) und bleibt unter 5 MB
- [x] Keine echten Namen (Firmen, Projekte, Orte, Personen); Texte erfunden, keine STLB-Texte (C1)
- [x] `fixtures/README.md` listet Herkunft je Datei (selbst verfasst) und die Berechnungsregel je Sollwert
- [ ] Skript und Dateien liegen unter AGPL-3.0-or-later mit REUSE-Eintrag

## Nicht-Ziele

GAEB-XML, amtliche Dateien (Ticket 23), echte Preise.

## Comments

Umsetzung 2026-11-09 (Branch `worktree-agent-ac60d064ff50868ed`). Details und Regeln: `fixtures/README.md`.

**Verifiziert (Befehle gelaufen):**
- `node fixtures/erzeugen.mjs` zweimal ausgeführt; SHA-256 aller JSON-Dateien beide Male gleich.
- `node --test` und `node --test "fixtures/*.test.mjs"`: 10 Tests, 10 grün. Der Test erzeugt neu und vergleicht byte-genau mit den eingecheckten Dateien, prüft Handbeispiele (12,35 / 15,20 / 27,55 -> 5,23 -> 32,78; 402,73 - 3 % -> 464,87), eindeutige UUIDv7-IDs, genau einen Elternknoten je Knoten, `gross` = 5.000 Positionen und 5 Titelebenen, Dateigröße < 5 MB (`gross.json` 2,5 MB), keine JSON-Zahlen.
- Nicht verifiziert: Der Aufruf `node --test fixtures/` aus der Aufgabenstellung läuft unter Node 22.23 nicht (Verzeichnis wird als Modul gelesen); nutzbar ist `node --test` oder die Glob-Form. Das Root-Skript in Ticket 03 sollte die Glob-Form nutzen.
- Nicht erfüllt: Kriterium "REUSE-Eintrag" (kommt mit dem Repo-weiten Glob aus Ticket 03; SPDX-Köpfe in Skript- und Markdown-Dateien stehen; JSON-Dateien tragen keinen Kopf). Daher nicht abgehakt.

**JSON-Form (kurz):** flaches `knoten[]` in Dokumentreihenfolge mit `id`, `parentId` (LV oder Titel), `art` = titel|position|hinweis; Positionen mit `positionsart` (normal|bedarf|wahl|zuschlag), `ordnungszahl`, optional `ozIndex`, `menge`/`einheitspreis` als Strings (3 Stellen), `bedarfMitGesamtbetrag`, `bezugspositionId`, `grundpositionId`. `sollwerte` = `positionen{id:{gp,inSumme}}`, `titel{id:{summe}}`, `summen{netto,nachlass,nettoNachNachlass,mwst,brutto}`. Angebotsset: je Angebot `positionen[{positionId,status,einheitspreis?}]` und eigene `sollwerte`.

**Hinweis für Ticket 02:** Die Fixtures nutzen `nachlass: {art, wert}` und `mwstSatz` am LV, Positionsart als Feld plus Flag `bedarfMitGesamtbetrag`, Verweise `bezugspositionId`/`grundpositionId`, `ozIndex` als eigenes Feld. Stundenlohn, Pauschal (nur als Einheit `psch`), Los, EPA kommen nicht vor.

**Abweichung:** `winzig` hat Netto 2.565,00 (drei Positionen, Spec-Beispiel 487,35 / 3.052,35). Die Kette 27,55 -> 32,78 steht in `handbeispiele.json`, weil `winzig` mit genau drei Positionen nicht 27,55 ergeben kann.

**Offene Fragen (needs-info für die Tickets, die die Fixtures verbrauchen, nicht geraten; Annahmen A1 bis A12 im README):**
1. Bedarf ohne Gesamtbetrag: nur ausgewiesen, nicht summiert; gibt es eine separate Summe? (K5)
2. Wahlposition: GP ausgewiesen, nicht summiert, kein Ersetzen der Grundposition; Zustand "gewählt"? (K5/K6)
3. Zuschlagsposition: eigene Menge x EP, summiert wie Normalposition; oder Prozentsatz auf die Bezugsposition? (K6)
4. Nicht angebotene Position: `status: "nicht-angeboten"`, GP null, nicht summiert; Behandlung im Preisspiegel (Ergänzen/Ausschluss) offen. (V1/V2)
5. Nachlass: Betrag runden, dann abziehen (A6) vs. Ergebnis runden (Ticket 07); gleich bis auf Rundungsgleichstand. Hat ein Angebot-Nachlass Vorrang oder erbt er den des LV? (04/07)
6. Ausreißer: Bezug (GP je Position, Mittel inkl. geprüftem Bieter, mind. 3 Werte, strikt > 20 %) ist nur Annahme A7; 0,000-Preise verzerren das Mittel. (V2)
7. Bedeutung von `ozIndex` (RNoIndex) jenseits der Anzeige. (06)

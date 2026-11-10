# 27: Kern: Feldbefehle

Status: ready-for-agent
Type: task
Welle: 2 · Strang: K · Paket: `packages/kern`
Blocked by: 25
Regeln: A2, A5, A6, N1, U5, Q1
Herkunft: E-12 (`next-decisions.md`)

## What to build

Handler für die Befehle, für die der Vertrag Typen hat, der Kern aber „nicht zuständig“ antwortet:
`KurztextAendern`, `LangtextAendern`, `HinweistextAendern`, `EinheitAendern`, `LeistungsverzeichnisUmbenennen`.
Jeder liefert ein minimales `LvChangeSet` (A6): genau der geänderte Knoten bzw. `kopf`, keine Summen (diese Felder
ändern keine Summe). Derselbe Wert noch einmal ergibt ein leeres ChangeSet. Jeder Befehl ist über
`changeSetUmkehren` umkehrbar. Fehler sind Werte (`knoten-unbekannt`, `knotenart-unzulaessig`, `ungueltige-eingabe`).

`EinheitspreisanteileSetzen` gehört **nicht** hierher (K7). Angebots-Befehle kommen mit V1.

Regeln, die nicht entschieden sind, nicht raten: Längengrenzen für Kurztext oder LV-Namen, erlaubte Zeichen,
Liste zulässiger Einheiten. Es gibt keine; die Eingabe wird unverändert übernommen (U5: Validierung blockiert nie,
Prüfung ist K8). Einzige Ausnahme, falls nötig, an einer benannten Stelle als „vorläufige Annahme, Entscheidung
offen“.

## Acceptance criteria

- [x] Die fünf Befehle sind zuständig und getestet (je: Wirkung, minimales ChangeSet, gleicher Wert → leer, Fehlerfälle)
- [x] `KurztextAendern` wirkt auf Los, Titel und Position; auf einen Hinweistext → `knotenart-unzulaessig`
- [x] Property-Test: Befehl anwenden und umkehren ergibt den Ausgangszustand
- [x] Property-Test: nach jedem dieser Befehle ist `summen` unverändert und gleich `summenBerechnen`
- [x] `ZUSTAENDIGES_TICKET` (oder was es heute ist) verliert die fünf Schlüssel
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

EPA (K7), Positionsmerkmale (K5), Prüfregeln (K8), Änderungen an `vertrag`.

## Comments

### Umsetzung (Agent, 2026-11-10)

**Geliefert:** `packages/kern/src/feld-befehle.ts` (Handler, `langtextGleich`, `FELD_ANNAHMEN`), Eintrag in `BEFEHLS_HANDLER` (`ausfuehren.ts`), Export über `index.ts`. Die fünf Schlüssel sind aus
`ZUSTAENDIGES_TICKET` entfernt; übrig bleiben `EinheitspreisanteileSetzen` (K7) und `PositionsartAendern` (K5). Tests: `feld-befehle.test.ts` (Einzelfälle je Befehl, Property-Test); in `baum.test.ts` sind die
fünf Befehle aus der Liste der „nicht zuständigen“ Befehle gestrichen.

**Verhalten:** Jeder Befehl liefert genau ein `geaendert`-Paar (Knoten) bzw. `kopf` (Umbenennen), `summen` ist leer (`positionen: []`, `gliederungen: []`, `gesamt: null`). Gleicher Wert: leeres ChangeSet.
Fehler als Werte: `knoten-unbekannt` (mit `knotenId`), `knotenart-unzulaessig` (Kurztext auf Hinweistext; Langtext und Einheit auf Nicht-Position; Hinweistext-Text auf Nicht-Hinweis),
`ungueltige-eingabe` nur bei falscher Form (kein String, kein Array von Bausteinen, unbekannte Bausteinart), mit `feld` (`kurztext`, `langtext`, `text`, `einheit`, `name`). Text wird unverändert übernommen
(kein Trimmen, keine Grenzen, keine Zeichen- oder Einheitenregel, U5). Reihenfolge der Prüfung: Knoten finden, Knotenart, Form.

**Vergleich Langtext:** `langtextGleich`, strukturell: gleiche Länge, je Stelle gleiche Bausteinart; Text Zeichen für Zeichen; Bild nach `id`, `medientyp`, `daten`. Reihenfolge zählt, keine Normalisierung
(zwei Textbausteine `a`,`b` sind nicht gleich einem Baustein `ab`).

**Einheit leer:** Das Grid sendet beim Leeren `null` (`eingabe.ts`: `t === '' ? null : t`). Der Kern nimmt `''` trotzdem unverändert als Wert; `''` und `null` sind verschiedene Werte (Wechsel `null` → `''`
ist eine Änderung). Das Grid erreicht `''` nie.

**Vorläufige Annahme, Entscheidung offen** (`FELD_ANNAHMEN` in `feld-befehle.ts`): leerer Kurztext und leerer LV-Name sind erlaubt (nichts verbietet sie, U5). Ob K8 sie beanstandet, ist offen. Nicht
geprüft und offen: Längengrenzen, erlaubte Zeichen, Einheitenliste.

**Property-Tests (200 Läufe, Folgen bis 40 Befehle auf Los/Titel/Position/Hinweis, auch unzulässige Ziele):** `summen` nach jedem Befehl gleich vorher und gleich `summenBerechnen`; `changeSetUmkehren`
stellt den Zustand exakt her, die Umkehrung der Umkehrung ist das ChangeSet; Wiederholen liefert ein leeres ChangeSet.

**Lücken im Vertrag:** keine neue gefunden. `Einheit` ist `string`; der Vertrag unterscheidet `''` und `null` nicht ausdrücklich (siehe oben).

**Prüfungen:** `pnpm lint`, `pnpm typecheck`, `pnpm test` grün (36 Testdateien, 747 Tests bestanden, 1 übersprungen, Node 22, Linux). Rote Phase: die Tests wurden vor dem Handler geschrieben, aber nicht
einzeln als rot gelaufen.

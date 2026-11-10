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

- [ ] Die fünf Befehle sind zuständig und getestet (je: Wirkung, minimales ChangeSet, gleicher Wert → leer, Fehlerfälle)
- [ ] `KurztextAendern` wirkt auf Los, Titel und Position; auf einen Hinweistext → `knotenart-unzulaessig`
- [ ] Property-Test: Befehl anwenden und umkehren ergibt den Ausgangszustand
- [ ] Property-Test: nach jedem dieser Befehle ist `summen` unverändert und gleich `summenBerechnen`
- [ ] `ZUSTAENDIGES_TICKET` (oder was es heute ist) verliert die fünf Schlüssel
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

EPA (K7), Positionsmerkmale (K5), Prüfregeln (K8), Änderungen an `vertrag`.

## Comments

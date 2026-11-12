# 108: X1c–f: `bim`: Modellbefehle, Mengenübernahme, Aufmaß aus Auswahl, DIN 277, Kennwerte, Vergleich

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X1c, X1d, X1e, X1f · Paket: `packages/bim` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: 97
Modell: opus
Regeln: A2, A3, A5, N1–N3, Q1, Q4, U5, C1, C4, D-50, D-52, D-53, D-54, D-22
Herkunft: `plan.md` §2 X1c–X1f, Berater D-52, D-53, D-54

## What to build

Ein reines TS-Paket (A2) für die Fachlogik rund um das Bauwerksmodell. Es importiert nur `vertrag` und `dezimal`
(`'packages/bim': ['packages/vertrag', 'packages/dezimal']`, `apps/web` darf es importieren). Es baut **Befehle bzw.
Ansatzzeilen als Daten**; die Mengen der Ansätze rechnet die App mit `mengen` (D-22, D-53), weil Fachpakete einander nicht
importieren (A3).

1. **Modellbefehle** (`BauwerksmodellBefehl`, v1.6): Anlegen (Prüfungen der Form; doppelte GlobalIds und ein unbekannter
   Vorgänger als Befund bzw. Fehler nach v1.6), Umbenennen, Löschen; `…ChangeSetAnwenden`, `…ChangeSetUmkehren`.
2. **Mengenübernahme (X1d, D-53).** Zu einer Position mit `bauteile` und einem gewählten Modell die Ansatzzeilen: je Zuordnung,
   deren Bauteil im Modell steht, eine Zeile (Formel 91, Wert der Menge mit dem Namen `mengenart` bzw. 1 bei `Stueck`,
   kaufmännisch auf 3 Stellen) in der Reihenfolge von `bauteile`. **Befunde statt Zeile, nie 0** (U5, Q5): Bauteil fehlt im
   Modell; Menge fehlt; Name in zwei Mengensätzen desselben Bauteils (mehrdeutig); Art der Menge passt nicht zur Einheit der
   Position (m ↔ Länge, m² ↔ Fläche, m³ ↔ Volumen, St ↔ Anzahl/Stueck, kg/t ↔ Gewicht; andere Einheit: Befund). Für ein ganzes
   LV: die Liste der betroffenen Positionen mit alten und neuen Ansätzen (Vorschau) – die App baut daraus `MengenansatzSetzen`
   mit der Menge aus `mengen`. `MengenansatzSetzen` gibt es nur im Ausschreibungs-LV (D-53).
3. **Aufmaßblatt aus Auswahl (X1d, D-53).** Zu einem Auftrags-LV, einem Modell und einer Auswahl von GlobalIds je zugeordneter
   Position die Ansatzzeilen der ausgewählten Bauteile (gleiche Regeln wie 2); die App rechnet die Mengen und legt mit
   `AufmassAnlegen` ein Blatt an. Hinweis im Ergebnis: Dasselbe Bauteil auf zwei Blättern ist nicht erkennbar (Offene
   Typfrage D-53).
4. **DIN 277 (X1e).** Bezugsgrößen aus dem Modell: **BGF** = Σ `GrossFloorArea` der Geschosse, **BRI** = Σ `GrossVolume` der
   Geschosse, **NRF** = Σ `NetFloorArea` der Räume (je 3 Stellen); fehlen Geschossmengen, Befund (kein Ersatz aus Räumen ohne
   Befund); jede Größe mit Quelle (`modell` oder `eingabe`), damit die App eine Eingabe des Nutzers zeigen kann.
5. **Kosten aus dem Modell (X1e, D-52).** Kostenschätzung über Kennwerte: zu Bezugsgrößen und Kennwerten je Kostengruppe
   (`{ kostengruppe, bezug: 'BGF' | 'BRI' | 'NRF', kennwert }` in €/Einheit, vom Nutzer, nie aus einem Katalog, C1) die Einträge
   einer Kostenermittlung: Betrag = round(Größe × Kennwert, 2) (N2), `bemerkung` mit der Herleitung („BGF 245,300 m² ×
   1.250,00 €/m²“); daraus der Befehl `KostenermittlungAnlegen` (Stufe `kostenschaetzung`). Dazu **Kostenkennwerte** einer
   bestehenden Kostenermittlung: je KG Summe / BGF bzw. / BRI auf 2 Stellen (nur Anzeige).
6. **Modellvergleich (X1f, D-53).** Zwei Modelle über die GlobalId: hinzugefügt, entfernt, geändert (Felder: Klasse, Name,
   Strukturknoten, Mengen mit alt/neu); Befunde: doppelte GlobalIds, geringe Überdeckung (z. B. unter 50 % gemeinsamer
   GlobalIds: Hinweis, dass das Autorenwerkzeug die GlobalIds neu vergeben haben könnte). **Folgen für ein LV:** je Position mit
   Zuordnungen die Menge laut altem und neuem Modell und die Differenz, dazu die Ansatzzeilen für „Mengen aktualisieren“.
7. **Prüfung der Zuordnungen:** hängende Zuordnungen (GlobalId nicht im gewählten Modell), Bauteile ohne Zuordnung (Zählung),
   Einheiten wie in 2.
8. **Tests (Q1, C4):** Golden-Tests mit `fixtures/typisch-bim.json` (Ticket 99) für 2–6; Property-Tests (Reihenfolge der
   Bauteile im Modell ändert die Summen nicht; Vergleich eines Modells mit sich selbst ist leer); **Leistung (Q4, D-54):**
   Vergleich zweier 10k-Modelle ≤ 500 ms.

Begriffe aus v1.6 und dem Glossar; neue (z. B. „Mengenübernahme“, „Bezugsgröße“) zuerst ins `GLOSSARY.md` (L2).

## Grenzen

- Nur `packages/bim` (und die genannten Wurzeldateien). Kein Lesen von IFC (das ist `ifc`), kein `mengen`, kein `kern`.
  `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Golden-, Property- und Leistungstests wie oben; Paketgrenzen-Prüfung kennt `bim`
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

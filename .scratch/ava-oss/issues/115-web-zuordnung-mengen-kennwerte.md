# 115: X1c–e in der App: Bauteile zuordnen, Mengen übernehmen, DIN 277 und Kennwerte, Aufmaß aus Auswahl

Status: claimed
Type: task
Welle: 6 · Strang: X1c, X1d, X1e · Ordner: `apps/web/src/bim/` (nach 114); Einhängestellen in `lv/LvSeite.tsx`,
`auftrag/AuftragsLvSeite.tsx`, `kosten/` (nur Verweis), `lv/befehlsweg.ts` (markiert `// Ticket 115`, D-20)
Blocked by: 105, 108, 114
Modell: opus
Regeln: A5, U2–U5, Q4, Q5, D-22, D-52, D-53, D-54
Herkunft: `plan.md` §2 X1c–X1e; Tore X1-Kern und X1-Erweitert (`plan.md` §4, D-58)

## What to build

1. **Zuordnen (X1c, D-52).** Auf der Modellseite mit einer Auswahl (Baum oder 3D): „Zuordnen…“ → LV wählen (Ausschreibungs-LV
   oder Auftrags-LV), Position suchen (OZ, Kurztext), Mengenart wählen (die Mengennamen der Auswahl samt Einheit, dazu
   „Stück“) → `BauteileZuordnen` mit der bisherigen Liste plus den neuen Paaren (doppelte werden nicht doppelt gesetzt) als
   **ein** Undo-Schritt; Zuordnungen einer Position ansehen und entfernen. 3D färbt „zugeordnet“/„ohne Zuordnung“ (bezogen auf
   das gewählte LV). Befunde (D-52, D-53): hängende Zuordnungen, Einheit passt nicht, mehrdeutige Menge – im Prüfpanel bzw. in
   der Vorschau mit Sprunglink.
2. **Mengen übernehmen (X1d, D-53).** Auf der LV-Seite (Ausschreibungs-LV) „Mengen aus Modell…“ → Modell(stand) wählen →
   Vorschau je betroffener Position (alter und neuer Vordersatz, Ansatzzeilen, Befunde) → Übernehmen: je Position
   `MengenansatzSetzen` mit den Ansatzzeilen aus `bim` und der Menge, die die App mit `mengen` rechnet (D-22), alles **ein**
   Undo-Schritt (`Sitzung.folge`). Im Auftrags-LV gibt es diesen Weg nicht (D-53); dort steht stattdessen 4.
3. **DIN 277 und Kennwerte (X1e, D-52).** Auf der Modellseite eine Leiste „Kennwerte“: BGF, BRI, NRF aus dem Modell (mit Quelle;
   fehlt eine Größe, Eingabe durch den Nutzer, als solche gekennzeichnet) und „Kostenschätzung über Kennwerte…“: je Zeile
   Kostengruppe, Bezug (BGF/BRI/NRF), Kennwert in €/Einheit (Eingabe, nie aus einem Katalog) → Vorschau → neue
   Kostenermittlung (Stufe Kostenschätzung) über `KostenermittlungAnlegen`, Herleitung in `bemerkung`; dazu für eine
   bestehende Kostenermittlung die Kostenkennwerte (€/m² BGF, €/m³ BRI) je KG.
4. **Aufmaßblatt aus Auswahl (X1d, D-53).** Auf der Modellseite mit einer Auswahl und einem gewählten Auftrags-LV: „Aufmaßblatt
   aus Auswahl…“ → Vorschau je Position → `AufmassAnlegen` (Mengen über `mengen`); danach Sprung zum neuen Blatt. Hinweis aus
   `bim` (gleiches Bauteil auf zwei Blättern nicht erkennbar) sichtbar.
5. **E2E** `apps/web/e2e/bim-mengen.spec.ts` mit `fixtures/typisch-bim.json` (Ticket 99): EG-Wände einer Position von `typisch`
   zuordnen → Mengen übernehmen → Vordersatz und LV-Netto = Sollwerte → Undo/Redo → Kennwerte BGF/BRI = Soll →
   Kostenschätzung = Soll → (nach Zuschlag) Aufmaßblatt aus Auswahl „EG“ = Sollmengen.

## Grenzen

- Den Vergleich zweier Stände und „Mengen aktualisieren“ macht Ticket 116. Rechenregeln stehen in `bim`, nicht in der App.
  `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der App-Logik (Befehlsbildung, Zusammenführen der Zuordnungen, Vorschau), E2E `bim-mengen.spec.ts` grün;
      `leistung.spec.ts` bleibt grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

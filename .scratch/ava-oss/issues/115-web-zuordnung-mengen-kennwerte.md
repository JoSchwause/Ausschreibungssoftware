# 115: X1c–e in der App: Bauteile zuordnen, Mengen übernehmen, DIN 277 und Kennwerte, Aufmaß aus Auswahl

Status: done-by-agent
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

- [x] Unit-Tests der App-Logik (Befehlsbildung, Zusammenführen der Zuordnungen, Vorschau), E2E `bim-mengen.spec.ts` grün;
      `leistung.spec.ts` bleibt grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Ergebnis (Branch `welle-6/115-web-bim-mengen`, Basis `integration/welle-6`, zuletzt gemergt mit 116, `7e431f8`)

Ordner `apps/web/src/bim/` (neu: `zuordnung.ts`, `uebernahme.ts`, `aufmassblatt.ts`, `kennwerte.ts`, `darstellung.ts`,
`useBezug.ts`, `ZuordnungBereich.tsx`, `AufmassAusAuswahlDialog.tsx`, `KennwerteBereich.tsx`, `MengenAusModell.tsx`; geändert:
`ModellSeite.tsx`, `auswahl.ts`, `testhaken.ts`, `texte.ts`, `bim.css`). Einhängestellen `// Ticket 115` in `lv/LvSeite.tsx`
(Knopf „Mengen aus Modell …“) und `auftrag/AuftragsLvSeite.tsx` (Verweis „Aufmaß aus Modell“ zur Modellliste, D-53).
`lv/befehlsweg.ts` und `kosten/` blieben unberührt (D-115.9). E2E `apps/web/e2e/bim-mengen.spec.ts`.

1. **Zuordnen (X1c).** Region „Zuordnung zu Positionen“ auf der Modellseite: Auswahl „LV für Zuordnung“ (alle LVs und
   Auftrags-LVs des Projekts), „Zuordnen …“ (Dialog: Position suchen nach OZ/Kurztext, Mengenart mit Einheit und Zahl der
   Bauteile, dazu „Stück“; Befunde der Position nach dem Zuordnen vorab) → **ein** `BauteileZuordnen` mit bisheriger Liste plus
   neuen Paaren, Doppelte nicht doppelt. Liste „Zuordnungen“ je Position mit „Entfernen“ je Paar; Zählung „n Bauteile
   zugeordnet, m ohne Zuordnung“; „Befunde der Zuordnung“ (`zuordnungenPruefen`) mit „Im Baum zeigen“. 3D färbt jedes Bauteil
   „zugeordnet“/„ohne Zuordnung“ bezogen auf das gewählte LV. Im Baum ergänzt Strg/Cmd+Klick die Auswahl (D-115.1).
2. **Mengen übernehmen (X1d).** LV-Seite „Mengen aus Modell …“ → Modell wählen (bei einem Modell vorgewählt) → Tabelle
   „Vorschau der Mengenübernahme“ (OZ, Kurztext, Vordersatz bisher/neu, Ansatzzeilen, Befunde) → „n Positionen übernehmen“: je
   geänderter Position `MengenansatzSetzen` (Zeilen aus `bim`, Menge aus `mengen.mengenansatzBerechnen`), alles `folge` = ein
   Undo-Schritt.
3. **DIN 277 und Kennwerte (X1e).** Region „Kennwerte“: BGF, BRI, NRF mit Quelle; fehlt eine Größe im Modell, ein Eingabefeld
   („Eingabe“ gekennzeichnet). „Kostenschätzung über Kennwerte …“: Zeilen KG / Bezug / Kennwert, Vorschau mit Herleitung und
   Gesamt → `KostenermittlungAnlegen` (Stufe Kostenschätzung) → Sprung zur neuen Kostenermittlung. „Kostenkennwerte“: für eine
   gewählte Kostenermittlung je KG Summe, €/m² BGF, €/m³ BRI, €/m² NRF.
4. **Aufmaßblatt aus Auswahl.** Bei gewähltem Auftrags-LV und Auswahl: Dialog mit Bezeichnung, Datum (heute), Vorschau je
   Position, festem Hinweis aus `bim` → `AufmassAnlegen` (nächste Nummer, Mengen aus `mengen`) → Sprung zum Blatt.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-115.0 Prüfnähte.** Reine Module mit Unit-Tests an ihrer öffentlichen Fläche: `zuordnung` (Befehlsbildung, Zusammenführen,
  Entfernen, Mengenarten, Suche, Färbung, Modellreihenfolge), `uebernahme` (Vorschau, Befehle), `aufmassblatt`, `kennwerte`,
  `auswahl` (Strg+Klick). Die Mengenübernahme läuft dazu durch Kern und echten Speicher (In-Memory-SQLite) samt Undo/Redo als
  ein Schritt, mit den Sollwerten aus `typisch-bim.json`. Oberfläche und 3D über die E2E. Grund: wie D-114.0, autonom bestätigt.
- **D-115.1 Mehrfachauswahl im Baum.** Strg/Cmd+Klick auf eine Baumzeile ergänzt die Auswahl um deren Bauteile
  (`beiZeileAktiv(…, hinzufuegen)`, Modifikator aus `pointerdown` am Baum). Grund: Bisher ersetzte jede Zeile die Auswahl; drei
  Innenwände ließen sich nur im 3D wählen, wo sie verdeckt sein können. Wie Strg+Klick im 3D (D-114.4).
- **D-115.2 Reihenfolge der neuen Paare.** Neue Zuordnungen stehen hinter den bisherigen in der **Reihenfolge des Modells**,
  nicht der Klickfolge (`bauteileInModellreihenfolge`). Grund: Die Reihenfolge bestimmt die Ansatzzeilen (D-53, D-105.4); so
  ergibt dieselbe Auswahl immer denselben Vordersatz, und alle sieben Zuordnungen der Fixture stehen in Modellreihenfolge.
- **D-115.3 Bezugs-LV.** Eine Auswahl für alle LVs (auch Nachtrags-LVs) und Auftrags-LVs, vorgewählt das erste; Färbung,
  Liste, Befunde und Zählung beziehen sich darauf. Nach Rückgängig/Wiederholen lädt der Bezug neu. Grund: Ticket („LV wählen
  … bezogen auf das gewählte LV“); `zuordnungenPruefen` nimmt die Knoten eines LV.
- **D-115.4 Befunde.** Im Zuordnen-Dialog die Befunde, die die Mengenübernahme für die Position nach dem Zuordnen fände
  (Einheit passt nicht, Menge fehlt, mehrdeutig), mit Sprung in den Baum; auf der Seite „Befunde der Zuordnung“ (hängend u. a.)
  mit Sprung. Nichts sperrt (U5): ein Zuordnen mit Befund ist möglich, die Übernahme schreibt für ein solches Bauteil keine Zeile
  (nie 0, Q5). In der Vorschau auf der LV-Seite stehen die Befunde je Position als Text und als Liste, ohne Sprung (die LV-Seite
  zeigt kein Modell).
- **D-115.5 Kein leerer Undo-Schritt.** Ändert ein Zuordnen nichts (alle Paare schon da), gibt es keinen Befehl (der Knopf ist
  aus, mit Hinweis); „Übernehmen“ ist aus, wenn keine Position geändert würde.
- **D-115.6 Kennwerte.** Eingabe nur für Größen, die das Modell nicht hergibt (das Modell geht vor, `bim` könnte auch
  überschreiben); Kennwerte als Betrag (2 Stellen), KG dreistellig; Eingabefehler stehen am Feld und sperren nur das Anlegen.
  Name vorgeschlagen „Kostenschätzung aus <Modell>“. Kostenkennwerte über alle KG-Ebenen von `kostenermittlungBerechnen`.
- **D-115.7 Aufmaßblatt.** Bezeichnung „Aus Modell <Name>“ und Datum heute (Uhr der Umgebung), beide änderbar; nur
  Vorschläge mit Zeilen werden Aufmaßpositionen (D-108.6); der Hinweis „nicht erkennbar“ steht immer (`role="note"`).
- **D-115.8 Testhaken.** `window.tethysModell.faerbung()` liefert die Färbung, die die App der Leinwand gibt (wie `auswahl()`
  Zustand statt Pixel, D-58).
- **D-115.9 Keine Änderung an `lv/befehlsweg.ts`.** Geschrieben wird über die vorhandenen Sitzungen (`lv`, `auftragsLvSitzung`,
  `aufmassSitzung`, `kostenermittlungSitzung`); die Modellseite meldet ihre LV-Sitzung nicht an, sondern lädt nach
  Rückgängig/Wiederholen neu. Der markierte Haken war daher nicht nötig.

### Prüfung (Zahlen gegen `fixtures/typisch-bim.json` und `typisch.json`)

| Schritt | App | Soll (Fixture) |
| --- | --- | --- |
| Färbung vor/nach dem Zuordnen (LV `typisch`) | 30 ohne Zuordnung → 3 zugeordnet, 27 ohne | D-99.2, 30 Bauteile in v1 |
| 03.0010 Vordersatz (IW-EG-1…3, NetSideArea) | 18,874 + 8,649 + 5,500 = 33,023 m² | `kern.vordersaetze` 33.023 |
| LV nach der Übernahme (E2E, Unit) | Netto 46.720,96; Nachlass 934,42; nach Nachlass 45.786,54; MwSt 8.699,44; Brutto 54.485,98 | `kern.torweg.sollwerte.summen` |
| Rückgängig / Wiederholen (ein Schritt) | 212,400 m², Netto 55.465,59 / wieder 33,023, 46.720,96 | `typisch.json` `sollwerte.summen` |
| Alle sieben Zuordnungen (Unit, Speicher) | sieben Vordersätze, Netto 36.068,86 | `kern.vordersaetze`, `kern.sollwerte` |
| BGF / BRI / NRF | 197,596 m² / 617,485 m³ / 166,252 m² (aus dem Modell) | `erweitert.din277.summen` |
| Kostenschätzung, 6 KG je m² BGF | 29.303,49; 79.562,03; 25.973,99; 37.385,16; 19.334,77; 82.743,33; Gesamt 274.302,77 | `erweitert.kostenschaetzung` |
| Kostenkennwert KG 320 der neuen Ermittlung | 148,30 €/m² BGF (47,46 €/m³ BRI, Unit) | Kennwert 148,30 |
| Aufmaßblatt aus Auswahl „EG“ (E2E, nach Zuschlag an Bieter A) | Blatt 1, 03.0010 = 33,023 m² | `erweitert.aufmassAusAuswahl` 33.023 |
| Aufmaßblatt aus Auswahl „EG“ mit allen sieben (Unit) | 98,798; 18,720; 98,638; 39,000; 33,023; 99,938; 1,000 | dieselbe Stelle |

Kein Sollwert angepasst.

- Unit (`apps/web/src/bim`, 11 Dateien, 61 Tests; neu `zuordnung`, `uebernahme`, `kennwerte`, `aufmassblatt`, ein Fall in
  `auswahl`): grün.
- E2E nach dem Merge von `integration/welle-6` (mit 116, `7e431f8`), `CI=1 PW_WEB_PORT=4651`: `bim-mengen.spec.ts` 1/1,
  `bim.spec.ts` 3/3, `modellvergleich.spec.ts` 1/1, `leistung.spec.ts` 3/3 (Median 37 / 27 / App 18 ms) – 8/8 grün.
- Suite nach dem Merge: `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` 0 (ESLint, Prettier, Paketgrenzen, Lizenzen,
  Clean Room), `pnpm typecheck` 0, `pnpm test`: Vitest 319 Dateien grün, 1 übersprungen wie zuvor, 3.921 Tests bestanden,
  3 übersprungen; `node --test fixtures` 53/53. Last etwa 2 auf 4 Kernen, kein Budget rot. Kein Budget gelockert, kein Test
  übersprungen.

### Offen / Hinweise

- Rückgängig eines Zuordnens am **Ausschreibungs-LV** auf der Modellseite springt nach der bestehenden Regel `lvZiel`
  (`historie/arten.ts`, nicht mein Ordner) auf die LV-Seite; am Auftrags-LV bleibt die Seite. Ein Ziel „Modellseite bleibt,
  wenn nur `bauteile` geändert sind“ wäre eine Zeile in `arten.ts` (Review der Welle).

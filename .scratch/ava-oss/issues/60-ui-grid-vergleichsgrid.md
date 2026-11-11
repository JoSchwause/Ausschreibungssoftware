# 60: `ui-grid`: Vergleichsgrid (schreibgeschützt, freie Spalten) für den Preisspiegel

Status: claimed
Type: task
Welle: 4 · Strang: U2/V3 · Paket: `packages/ui-grid`
Blocked by: 54 (Punkte 1–4, gleiches Paket)
Regeln: U1, U2, U3, U4, N1, A5, Q4, U6, U8
Herkunft: `plan.md` §2 V3 (Preisspiegel-Ansicht), U2 („genau eine gemeinsame Grid-Komponente für LV, Preisspiegel, …“)

## What to build

U2 verbietet eine zweite Grid-Implementierung. Der Preisspiegel braucht aber freie Spaltengruppen (je Bieter EP und GP,
dazu virtuelle Bieter Min/Mittel/Max und Schätzpreis), Kennzeichen je Zelle und mehrere Summenzeilen. Deshalb exportiert
`ui-grid` eine zweite, schreibgeschützte Komponente auf **derselben** Virtualisierung, Baumdarstellung und Tastatur-
navigation wie `LvGrid` (gemeinsamen Code herausziehen, nicht kopieren):

- `VergleichsGrid` mit eigenen, generischen Typen im Paket (nicht in `vertrag`): Zeilen als Baum (Gliederung/Position,
  Einzug, auf-/zuklappen gesteuert), Spalten mit Kennung, Kopf, optionaler Gruppenkopf (zweizeiliger Kopf: Bietername über
  EP/GP), Ausrichtung, Breite, fixierte linke Spalten (OZ, Kurztext) beim waagerechten Scrollen.
- Zellen kommen als **fertige Texte** mit optionalem Kennzeichen (`hoch`, `niedrig`, `min`, `max`, `nicht-angeboten`,
  `nullpreis`, `hinweis` u. ä. als offene String-Union im Paket) und optionalem Tooltip; das Grid rechnet und formatiert nie (N1, A5).
- Summenzeilen am Ende (mehrere, z. B. Netto, Nachlass, Netto nach Nachlass, Brutto, Rang).
- Tastatur wie im LV-Grid (Pfeile, Pos1/Ende, Bild auf/ab, Strg+Pfeil), Zellauswahl, Kopieren der Auswahl als TSV
  (Strg+C), Rückruf `onZeileAktiv`/`onZelleAktiv` (für Details in der App), Sprungziel wie `LvGrid`.
- Kennzeichen über Design-Tokens (U4), in hell und dunkel mit ausreichendem Kontrast; zusätzlich ein Textmerkmal
  (Symbol oder `aria-label`), nicht nur Farbe (U8).

## Grenzen

- Nur `packages/ui-grid`. Kein `kern`/`vergabe`-Import. `LvGrid` und seine Tests bleiben unverändert grün.
- Leistung: 5.000 Zeilen × 5 Bieter (≈ 15 Spalten) scrollt flüssig (Messung wie die vorhandene Grid-Leistungsprüfung).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Testseite in der E2E-Harness mit einem erfundenen Preisspiegel (3 Bieter + Min/Mittel/Max), Playwright-Tests für
      Navigation, fixierte Spalten, Kennzeichen (Text + `aria`), Kopieren als TSV, Summenzeilen
- [ ] Leistungstest 5.000 Zeilen
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und
      `pnpm --filter @tethys/ui-grid e2e` grün

## Nicht-Ziele

Bearbeiten im Vergleichsgrid, Anbindung an `vergabe` (Ticket 63).

## Comments

### Umsetzung (Branch `welle-4/60-vergleichsgrid`)

Nur `packages/ui-grid`. Neu exportiert: `VergleichsGrid` und die Typen `VergleichsGridProps`, `VergleichsSpalte`,
`VergleichsSpaltengruppe`, `VergleichsZeile`, `VergleichsSummenzeile`, `VergleichsZelle`, `VergleichsZellort`,
`VergleichsSprungziel`, `Kennzeichen`, `KennzeichenText` (`src/vergleichTypen.ts`). Ausführliche Beschreibung der
Eigenschaften, Kennzeichen und Tasten: Paket-README, Abschnitt „VergleichsGrid (Ticket 60)“.

Gemeinsamer Kern statt Kopie (U2): `src/gridKern.ts` (`useGridKern`: aktive Zelle über Kennungen, Virtualisierung mit
festgehaltener aktiver Zeile, Fokus, Scrollen; `useSprung`; `klappAbsicht`; `NAVIGATIONSTASTEN`), `src/Baumeinzug.tsx`
(Einzug und Auf-/Zuklappknopf), `src/navigation.ts`. `LvGrid` steht jetzt auf diesem Kern; alle seine Unit- und
E2E-Tests sind unverändert grün.

Tests: `src/vergleich.test.ts` (Bereich, TSV, fixierte Versätze, Kennzeichentexte), `src/kennzeichen.test.ts`
(Kontrast jeder Kennzeichen-Marke in hell und dunkel aus `grid.css` und den Tokens), `src/gridKern.test.ts`
(`klappAbsicht`), `src/navigation.test.ts` (Strg+Pfeil), `e2e/vergleich.spec.ts` (Testseite `vergleich.html`,
erfundener Preisspiegel mit 3 Bietern und Min/Mittel/Max: Kopf, Baum, Kennzeichen mit Text und `aria`, Summenzeilen,
Navigation, Aufklappen, Meldungen, Sprung, Nur-Lesen, Auswahl, TSV, fixierte Spalten, 5.000 Zeilen),
`e2e/leistung.spec.ts` (neuer Fall „Vergleich 5.000 Zeilen x 5 Bieter“, 20 Spalten).

Für Ticket 63: Kennungen von `zeilen` und `summen` müssen zusammen eindeutig sein. `spalten`, `zeilen`, `summen` und
`kennzeichenTexte` stabil halten (`useMemo`), sonst rendert jede Zeile beim Scrollen neu. Die Spaltenbreite muss Text
und Marken fassen (EP mit zwei Marken: etwa 136 px). Detailleiste über `onZelleAktiv` (`{ zeilenId, spalte }`); die
App kennt aus ihren eigenen Kennungen Bieter und Position. ABC-Klasse und „Zuschlagssatz fehlt“ als eigene Kennzeichen
mit `kennzeichenTexte` (z. B. `{ 'abc-a': { symbol: 'A', beschreibung: 'ABC-Klasse A' } }`) oder als `hinweis` mit
`tooltip`; eine Farbe gibt es nur für die eingebauten Kennzeichen.

Entscheidungen (Frage → Entscheidung → Grund):

- **D-60.1** Was wird geteilt? → Aktive Zelle, Virtualisierung, Fokus/Scrollen, Sprung, Klapp-Tasten, Navigation und
  Baumdarstellung im Kern; Auswahlmodell (LV: Zeilen, Vergleich: Zellrechteck), Zellen und Befehle bleiben je Grid →
  Das ist das, was beide gleich tun müssen; die Unterschiede sind fachlich. Reversible: yes.
- **D-60.2** Strg+Pfeil? → Springt an den Rand des Grids in dieser Richtung (wie Excel in einer lückenlosen Tabelle),
  in der gemeinsamen `zielZelle`; damit auch im `LvGrid` (dort bewegte Strg+Pfeil bisher wie Pfeil, ohne Test) → Das
  Ticket verlangt Strg+Pfeil „wie im LV-Grid“; eine Navigation für beide (U2, U3). README-Tastenhilfe ergänzt.
  Reversible: yes.
- **D-60.3** Zellauswahl und Kopieren → Rechteck zwischen Anker und aktiver Zelle (Umschalt+Pfeil, Umschalt+Klick,
  Strg+A, Escape hebt auf), über Kennungen gehalten. Strg+C kopiert nur die Anzeigetexte als TSV (wie Excel: kein Kopf,
  keine Kennzeichen), ohne Auswahl die aktive Zelle → Excel-nah, verlustfrei für Zahlen in de-DE. Reversible: yes.
- **D-60.4** Summenzeilen → Feste Zeilen unter dem Körper (klebender Fuß im Scrollbereich, scrollen waagerecht mit),
  Teil von Navigation, Auswahl und Kopieren; `onZeileAktiv`/`onZelleAktiv` melden auch sie; die Beschriftung ist eine
  Zelle (z. B. Kurztext) → immer sichtbar, Rang und Brutto per Tastatur erreichbar, keine Sonderform im Typ.
  Reversible: yes.
- **D-60.5** Fixierte Spalten → Anzahl `fixierteSpalten` (die ersten n Spalten) mit CSS `sticky`, Fläche je Zeilenart
  ausdrücklich gesetzt (nicht `inherit`, das kostete beim Scrollen etwa die Hälfte der Bildrate); eine fokussierte
  Zelle hinter den fixierten Spalten holt der Kern waagerecht in den Sichtbereich (auch im `LvGrid`, dort bei den
  üblichen Breiten ohne Wirkung) → einfacher als Flags je Spalte, die nur als Präfix Sinn ergeben. Reversible: yes.
- **D-60.6** Kennzeichen → Offene String-Vereinigung; eingebaute mit Symbol und Beschreibung (`hoch` ▲, `niedrig` ▼,
  `min`, `max`, `nicht-angeboten` –, `nullpreis` 0, `hinweis` !); Marke = Symbol auf eigener Token-Fläche (Kontrast
  getestet), Beschreibung in Worten als `title` und `aria-describedby`; `kennzeichenTexte` ergänzt oder ersetzt Texte;
  CSS-Klasse nur für `[a-z0-9-]` → nicht nur Farbe (U8), keine neuen Tokens nötig (U4, `ui-basis` unverändert).
  Reversible: yes.
- **D-60.7** Zweizeiliger Kopf → TanStack-Gruppenspalten aus aufeinanderfolgenden Spalten mit derselben `gruppe.id`;
  Spalten ohne Gruppe reichen über beide Kopfzeilen (`aria-rowspan`), Gruppen tragen `aria-colspan` → TanStack liefert
  `colSpan`/`rowSpan` (U1), die App beschreibt nur Spalten. Reversible: yes.
- **D-60.8** Verhalten beim Nur-Lesen → Enter/Umschalt+Enter bewegen eine Zeile; Tippen, F2, Entf, Rück, Strg+X/V
  ändern nichts und werden angesagt (wie `LvGrid` schreibgeschützt). Kein `onZeileOeffnen` (nicht verlangt; lässt sich
  wie in Ticket 54 nachrüsten). Reversible: yes.
- **D-60.9** Testseite → zweiter Vite-Einstieg `e2e/harness/vergleich.html` (Mehrseiten-Build) statt eines Modus in
  `main.tsx` → die LV-Testseite bleibt unverändert. Reversible: yes.
- **D-60.10** Leistung → Fall „Vergleich 5.000 Zeilen x 5 Bieter“ (20 Spalten) in der vorhandenen Messung, ohne neue
  Schwelle (wie dort nur mit `GRID_MIN_FPS`). Zusätzlich waagerechte Virtualisierung der Spalten (`useSichtbareSpalten`
  im Kern: fixierte und aktive Spalte immer im DOM, sonst Sichtbereich plus zwei Spalten) und feste Flächen der
  fixierten Zellen statt `inherit`. Gemessen auf der stark belasteten 4-Kern-Maschine (Headless, ohne GPU, Last 13–17):
  zügiges Lesen (5.600 px/s) etwa 40–50 fps (LV-Grid 43–56); schneller Wisch (28.000 px/s) etwa 15–23 fps (vorher
  10–15; LV-Grid 45–60). Der Rest wächst mit den Elementen je Zeile (Zelle, Text, Marken, Beschreibung); weitere
  Schritte wären weniger Elemente je Zelle. Reversible: yes.

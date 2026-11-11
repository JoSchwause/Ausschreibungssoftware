# 60: `ui-grid`: Vergleichsgrid (schreibgeschützt, freie Spalten) für den Preisspiegel

Status: ready-for-agent
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

# 109: X2: `bauzeit`: Befehle und Vertragstypen

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X2 · Paket: `packages/bauzeit`
Blocked by: 97, 102 (gleiches Paket)
Modell: opus
Regeln: A5, A6, Q4, U5, D-57
Herkunft: Ticket 102 (Rechenkern mit eigenen Typen), Ticket 97 (Vertragstypen)

## What to build

1. **Umstellung auf die Vertragstypen** (`Bauzeitenplan`, `Vorgang`, `Anordnungsbeziehung`, `Arbeitskalender`,
   `Vorgangstermine`, `Terminplan` aus v1.6); die eigenen Typen aus Ticket 102 entfallen oder werden Aliase mit Kommentar.
   Golden- und Property-Tests bleiben unverändert grün.
2. **Befehle** (`BauzeitenplanBefehl`, v1.6) mit `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`: Prüfungen der
   Form (Kennungen eindeutig, Eltern vorhanden und ohne Ring, Dauer und Abstand ganzzahlig, Dauer ≥ 0, Daten gültig) als
   Fehler; fachliche Probleme (Zyklus über Anordnungsbeziehungen, unbekannter Vorgänger) bleiben Befunde der Terminrechnung
   (U5). Lesart von „Vorgang entfernen“ wie in v1.6 festgelegt.
3. **Fortschritt aus dem Leistungsstand** (wenn Zeit bleibt): zu einem Vorgang mit Bezug auf Knoten eines Auftrags-LV der Anteil
   Σ GP des `Leistungsstand`s / Σ GP der bezogenen Positionen in Prozent (2 Stellen) als Vorschlag für `ist.fortschritt`.
4. **Leistung (Q4):** Befehl und Umkehrung an einem Plan mit 1.000 Vorgängen messen und im Ticket nennen (Speicherseite misst
   Ticket 106).

## Grenzen

- Nur `packages/bauzeit`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Befehle, Umkehrung und Fehler getestet; bestehende Tests des Pakets grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

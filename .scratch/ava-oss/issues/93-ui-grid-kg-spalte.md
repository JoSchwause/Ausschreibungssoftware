# 93: `ui-grid`: editierbare Spalte für die Kostengruppe im LV-Grid

Status: ready-for-agent
Type: task
Welle: 6 · Strang: U, C2 · Paket: `packages/ui-grid`, danach `apps/web/src/kosten/` und die Einhängestellen in
`apps/web/src/lv/LvSeite.tsx`, `apps/web/src/auftrag/AuftragsLvSeite.tsx` (markiert `// Ticket 93`, D-20)
Blocked by: 95 (`LvSpalte` `'kostengruppe'`), 96 (gleiches Paket, ein Schreiber)
Modell: opus
Regeln: U2, U3, U5, Q4, D-89.1, D-47
Herkunft: Wellen-Review 5, P1 (Ticket 89 verlangte eine Spalte „KG“; umgesetzt als Dialog mit Mehrfachauswahl, D-89.1)

## What to build

Eine Spalte „KG“ im LV-Grid und im Auftrags-LV, direkt editierbar wie Menge/EP (Tastatur zuerst, U3), formwidrige Eingabe als
Zellfehler (die Marke `Kostengruppennummer` lässt sie nicht in den Befehl), Einfügen aus Excel setzt mehrere KG in einem
Undo-Schritt. Leistungsbudgets des Grids bleiben grün (Q4). Der Dialog aus 89 bleibt für die Mehrfachauswahl.

1. **`ui-grid`.** `LvSpalte` kennt seit v1.5 `'kostengruppe'` (Ticket 95). Das `LvGrid` zeichnet die Spalte (nur an Positionen
   bearbeitbar; an Gliederung und Hinweistext leer), bearbeitet sie wie Menge und EP (Enter/F2 startet, Escape bricht ab,
   Tab/Enter übernimmt) und sendet `KostengruppeSetzen` (leere Eingabe = `null`). Die Prüfung der Form gehört nicht dem
   Grid: Die App reicht eine Lesefunktion herein (eigene Eigenschaft des `LvGrid`, z. B. `kostengruppeLesen(text) →
   Ergebnis<Kostengruppennummer, string>`; die App nutzt `kgLesen` aus `kosten`); ein Fehler steht als Zellfehler an der
   Zelle wie bei einer unlesbaren Menge. Einfügen aus der Zwischenablage (TSV) setzt die Spalte mit, je Zeile ein Befehl;
   ein Fehler in einer Zeile verwirft nur diese Zelle (mit Hinweis). Befunde mit `ort.feld` `'kostengruppe'` erscheinen an
   der Zelle (U5). Die Spalte ist nicht in den Standardspalten, außer die App nennt sie.
2. **E2E im Prüfstand des Pakets**: Eingabe, Zellfehler, Escape, Einfügen von drei Zeilen, Tastaturnavigation über die
   Spalte; `e2e/leistung.spec.ts` des Pakets bleibt im Budget mit der zusätzlichen Spalte.
3. **App.** LV-Seite und Auftrags-LV-Seite zeigen die Spalte „KG“ (nach der Einheit oder am Ende, Begründung im Ticket), mit
   `kgLesen`; mehrere `KostengruppeSetzen` aus einem Einfügen sind **ein** Undo-Schritt (wie das Einfügen anderer Werte,
   `Sitzung.folge`); im Auftrags-LV gehen die Befehle als AuftragsLvBefehl. Der Dialog aus Ticket 89 bleibt (Mehrfachauswahl).
   `apps/web/e2e/kosten.spec.ts` um die Spalte ergänzen; `apps/web/e2e/leistung.spec.ts` bleibt grün.

## Grenzen

- Kein `vertrag` (die Spalte gibt es seit v1.5). In `ui-grid` nur das `LvGrid` und seine Hilfen; das Vergleichsgrid gehört Ticket
  96 (gemergt). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Spalte in `ui-grid` getestet (Unit + E2E des Pakets); App stellt um; `leistung.spec.ts` (Paket und App) grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün, dazu
      `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/ui-grid e2e` und die genannten App-E2E

## Comments

# 65: M2: Mengenermittlungs-Panel

Status: ready-for-agent
Type: task
Welle: 4 · Strang: M2 · Paket: `apps/web` (Ordner `src/mengen/`; Einhängestelle im Positionsdialog bzw. `lv/LvSeite.tsx`, D-20)
Blocked by: 56 (Kern: `MengenansatzSetzen`), 57 (Speicher: Mengenansatz)
Regeln: A3, A5, N1, N4, U3, U5, U7, Q5, D-22, D-35a
Herkunft: `plan.md` §2 M2, Ticket 35 (Formelparser, freier Rechenansatz Formel 91)

## What to build

Ein Panel zur Mengenermittlung einer Position (aufrufbar per Tastatur aus dem Grid, z. B. Strg+M, und im Positionsdialog):

1. Tabelle der Ansatzzeilen: Zeilennummer, Formel (zunächst nur 91, als Auswahl), Ausdruck, Variable; Zeilen per Tastatur
   anlegen, löschen, verschieben. Jede Zeile zeigt ihr Ergebnis bzw. den Fehler mit Spalte (aus `mengenansatzBerechnen` in
   `mengen`; die App rechnet selbst nichts, N1). Summe unten; Einheit der Position daneben.
2. „Übernehmen“ schickt **einen** Befehl `MengenansatzSetzen` mit Ansatz und Summe (bei Fehler `menge: null`, D-22 (b)).
   Ein Undo-Schritt. Wiederöffnen zeigt den gespeicherten Ansatz.
3. Hat eine Position einen Ansatz und der Nutzer ändert die Menge direkt im Grid, fragt die App vorher („Mengenansatz wird
   entfernt“, D-22 (a)); Abbrechen lässt alles unverändert. Positionen mit Ansatz tragen im Grid ein Kennzeichen (über die
   vorhandene Hinweis-/Merkmalsdarstellung; braucht das eine Grid-Änderung, melden statt ändern).
4. Formeln und Zwischenstellen aus `MENGEN_ANNAHMEN`; Texte deutsch (L1).

## Grenzen

- Nur `apps/web/src/mengen/` plus markierte Einhängestellen. `apps/web` bekommt die Abhängigkeit `@tethys/mengen`.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] E2E: Ansatz mit drei Zeilen (eine mit Variable, eine fehlerhaft, dann korrigiert) → Menge und GP in der Zeile, Summen
      stimmen; Neuladen → Ansatz noch da; Undo stellt die alte Menge her; direkte Mengenänderung fragt nach
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Weitere REB-Formeln, Aufmaßblätter (A2), X31.

## Comments

### Aus Ticket 53 (Review, D-27)
- Die Rückfrage nach Lesart (a) braucht es auch im Positionsdialog (`apps/web/src/lv/positionsentwurf.ts`), nicht nur bei der Grid-Eingabe (die Grid-Eingabe läuft über `ui-grid/src/eingabe.ts`; braucht das Grid dafür eine Eigenschaft, melden).

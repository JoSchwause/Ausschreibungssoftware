# 121: App: Folgearbeit v1.5 (Netto der LV-Liste, OZ-Vorschlag am Auftrags-LV, Druckprofile sichern)

Status: ready-for-agent
Type: task
Welle: 6 · Strang: – · Ordner: `apps/web/src/projekt/`, `apps/web/src/auftrag/`, `apps/web/src/nachtrag/` (nur falls der
OZ-Vorschlag dort gebraucht wird), `apps/web/src/ausgabe/`
Blocked by: 105, 106
Modell: sonnet
Regeln: Q5, U5, D-92.4, D-92.6
Herkunft: Ticket 95 (Punkte 3, 5 und Folgearbeit D-92.6)

## What to build

1. **Netto der LV-Liste (D-92.4, D-62).** Die Projektseite zeigt `LvUebersicht.nettoNachNachlass` (v1.5, Name nach D-95.5,
   gefüllt von `speicher`, Ticket 106) statt jedes LV nachzuladen; das Nachladen (`LvNetto`) entfällt; fehlt der Wert, „–“.
   Weil das ein anderer Wert ist als das bisher gezeigte Netto vor Nachlass, heißt die Spalte „Netto nach Nachlass“ (D-62).
2. **OZ-Vorschlag am Auftrags-LV.** Wo die App eine Ordnungszahl im Auftrags-LV vorschlägt, nutzt sie die Kernfunktion aus
   Ticket 105 statt einer umgedeuteten Kennung.
3. **Druckprofile (D-92.6, Q5).** Zurückgehaltene, nicht verwendbare Einträge der Ablage sind sichtbar („n Einträge konnten nicht
   gelesen werden“) und lassen sich **als Datei sichern** oder nach Bestätigung **entfernen**.
4. E2E: bestehende `projekt.spec.ts`, `druckprofil.spec.ts` ergänzen; `nachtrag.spec.ts` grün.

Aus dem Review (D-66, Befund 2): „LV-Stand als neues LV übernehmen“ (`lv/stand.ts`) ruft die Kopierhilfe des Kerns mit
„Zuordnungen behalten“ (Ticket 105), sonst gingen die Bauteilzuordnungen des Stands still verloren (Q5). Eine markierte Zeile.

## Grenzen

- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit- und E2E-Tests wie oben grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

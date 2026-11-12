# 116: X1f in der App: Modellstände vergleichen, Mengen aktualisieren

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X1f · Ordner: `apps/web/src/modellvergleich/` (neu); Einhängestellen in `App.tsx` und `bim/` (nur ein Link auf
der Modellseite, markiert `// Ticket 116`, D-20)
Blocked by: 108, 114
Modell: opus
Regeln: A5, U2, U5, Q5, D-53, D-54
Herkunft: `plan.md` §2 X1f („Modellstand und Änderungsvergleich, zwei IFC-Stände“); Tor X1-Erweitert (D-58)

## What to build

1. **Vergleichsseite** (`/projekt/<id>/modelle/<neu>/vergleich/<alt>`; Standard: der Vorgänger): Zusammenfassung (hinzugefügt,
   entfernt, geändert) und eine Liste im `VergleichsGrid` mit Art der Änderung, Klasse, Name, Geschoss und den geänderten Mengen
   (alt → neu); Befunde aus `bim` (geringe Überdeckung, doppelte GlobalIds) oben sichtbar.
2. **3D:** das neue Modell mit Färbung `hinzugefuegt` / `geaendert` (über `ui-modell`); entfernte Bauteile nur in der Liste
   (Kürzungsstufe laut Schnitt: Färbung darf entfallen, dann im Ticket vermerken).
3. **Folgen für ein LV:** LV wählen → je Position mit Zuordnungen die Menge laut altem und neuem Stand und die Differenz →
   „Mengen aktualisieren“: Vorschau, dann `MengenansatzSetzen` je betroffener Position (Menge über `mengen`) als **ein**
   Undo-Schritt (wie Ticket 115, Punkt 2; nur Ausschreibungs-LV, D-53).
4. **E2E** `apps/web/e2e/modellvergleich.spec.ts`: v1 und v2 (`fixtures/ifc/haus-v2.ifc`) → Vergleich = Soll aus
   `fixtures/typisch-bim.json` → betroffene Positionen mit Mengendifferenz = Soll → „Mengen aktualisieren“ = neue Vordersätze
   laut Soll → Undo.

## Grenzen

- Vergleichslogik steht in `bim`. Kein Schreiben in `src/bim/` außer dem markierten Link. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Ansicht, E2E `modellvergleich.spec.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

# 63: V3: Preisspiegel-Ansicht in der App

Status: claimed
Type: task
Welle: 4 · Strang: V3 · Paket: `apps/web` (Ordner `src/vergabe/`; Einhängestellen in `App.tsx`/`lv/LvSeite.tsx`, D-20)
Blocked by: 60 (`VergleichsGrid`), 51 (Fixtures)
Regeln: U1–U8, N1, N4, A5, G-26, D-05, D-36.1, D-44.1, Q2
Herkunft: `plan.md` §2 V3, Tor M3

## What to build

Eine Seite „Preisspiegel“ zu einem LV (Route z. B. `/projekt/<id>/lv/<id>/preisspiegel`, erreichbar von der LV-Seite und aus
der Angebotsliste aus Ticket 49):

1. Daten: LV-Zustand, alle Angebote des LV, Projekt (Bieternamen); Rechnung nur über `preisspiegelBerechnen` aus `vergabe`
   (die App rechnet nichts selbst, A5). Darstellung im `VergleichsGrid` aus `ui-grid` (U2): je Bieter EP und GP, virtuelle
   Bieter Min/Mittel/Max, optional Schätzpreis des LV; Kennzeichen Ausreißer hoch/niedrig, nicht angeboten, Nullpreis,
   Zuschlagssatz fehlt, ABC-Klasse; Gliederungssummen je Bieter; Summenzeilen Netto, Nachlass, Netto nach Nachlass, MwSt,
   Brutto, Bedarfs- und Wahlsumme (F4), **Rang**.
2. Einstellungen (G-26: einstellbar): Ausreißer-Schwelle in % (Standard 20), ABC-Schwelle A (Standard 80 %), Bezug der
   ABC-Klasse; Spalten ein/aus (EP, GP, virtuelle Bieter). Nicht gespeichert (Sitzungszustand genügt; vermerken).
3. Zellen-Details: aktive Zelle zeigt in einer Leiste Bieter, Position, Kennzeichen-Erklärung in Worten.
4. Zahlen de-DE über `dezimal` (N4).

## Grenzen

- Nur `apps/web/src/vergabe/` plus je eine markierte Einhängestelle. Keine Änderung an Paketen; fehlt etwas in `vergabe`
  oder `ui-grid`, melden.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] E2E: Projekt mit `typisch` und den drei Angeboten aus `typisch-angebote` (über den vorhandenen Testweg oder X84 aus
      Ticket 69, falls schon gemergt) → Preisspiegel zeigt je Bieter Netto, Netto nach Nachlass, Brutto und Rang gleich den
      Sollwerten der Fixture; ein Ausreißer und ein „nicht angeboten“ sind sichtbar und per Tastatur erreichbar
- [ ] Schwelle ändern ändert die Kennzeichen (E2E)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Zuschlag erteilen (Ticket 64), Drucken/Excel des Preisspiegels, Speichern der Einstellungen.

## Comments

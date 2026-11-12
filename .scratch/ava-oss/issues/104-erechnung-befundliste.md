# 104: `erechnung` nutzt die gemeinsame Befundliste

Status: ready-for-agent
Type: task
Welle: 6 · Strang: A4 · Paket: `packages/erechnung` (Ausnahme von P2: die markierten Verwendungen der Befunde in
`apps/web/src/rechnung/` mechanisch nachziehen; dort schreibt in Stufe 1b niemand)
Blocked by: 95
Modell: sonnet
Regeln: A3, A4, U5, L2, Q5
Herkunft: Ticket 76 (eigener Typ `XRechnungBefund`), Ticket 95 Punkt 2 (Befundquelle für E-Rechnungen in `vertrag` v1.5)

## What to build

`erechnung` meldet seine Befunde heute in einem eigenen Typ `XRechnungBefund`. Seit `vertrag` v1.5 (Ticket 95, Punkt 2) gibt es
eine Befundquelle für das Lesen einer XRechnung in der gemeinsamen Befundliste (`Pruefbefund`). Stelle `erechnung` darauf um:

1. Jeder Befund des Lesers ist ein `Pruefbefund` mit der neuen Quelle und dem Ort, wie v1.5 ihn festlegt (Business Term bzw.
   Pfad). Codes und Texte bleiben gleich (oder werden mit Grund umbenannt, Glossar beachten, L2).
2. `XRechnungBefund` entfällt; gibt es einen guten Grund für einen Übergangsnamen, als Alias mit Kommentar.
3. Die App (`apps/web/src/rechnung/`, XRechnung einlesen) zeigt die Befunde wie bisher; nur die nötigen Zeilen nachziehen,
   markiert `// Ticket 104`.

## Grenzen

- Kein Fachverhalten ändern (gleiche Befunde, gleiche Zahlen). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Bestehende Golden-Tests von `erechnung` grün mit dem neuen Typ; App-Tests und `apps/web/e2e/rechnung.spec.ts` grün
      (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test e2e/rechnung.spec.ts`)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

# 104: `erechnung` nutzt die gemeinsame Befundliste

Status: claimed
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

1. Jeder Befund des Lesers ist ein `Pruefbefund` mit der Quelle `'erechnung-lesen'` und dem Ort nach D-95.2 (`feld` =
   Business Term, `pfad` = Element aus lokalen Namen mit `[n]` ab 1, `zeile`/`spalte` nur bei unlesbarem XML; eine Summenregel
   nur mit `feld`, ein Befund zur Datei als Ganzes nur mit `pfad`). Codes und Texte bleiben gleich (oder werden mit Grund umbenannt, Glossar beachten, L2).
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

### Entscheidungen

- **D-104.1** Was geschieht mit `XRechnungBefund`? **Entfällt ohne Alias; `XRechnungLesung.befunde` ist `readonly Pruefbefund[]`, jeder Befund trägt `quelle: 'erechnung-lesen'`.** Grund: Der Typ hatte keinen Verbraucher außerhalb des Pakets (`apps/web` übersetzt unverändert), ein Übergangsname brächte nur eine zweite Schreibweise.
- **D-104.2** Bleibt `XRechnungBefundcode`? **Ja, als Menge der Codes, die `erechnung` meldet, nur noch intern zum Erzeugen der Befunde und weiter exportiert; `Pruefbefund.code` ist ein `string`.** Grund: Der Compiler hält so Schreibfehler an den Meldestellen fern; Codes und Texte bleiben unverändert (L2, kein Glossarbezug).
- **D-104.3** Zeilen in `apps/web/src/rechnung/`? **Keine nötig, nichts mit `// Ticket 104` markiert.** Grund: Die App liest `befunde` strukturell (`code`, `schwere`, `meldung`, `ort`), alle Felder sind geblieben; `pnpm typecheck` ist ohne Änderung grün.
- **D-104.4** Tests: neuer Abschnitt „gemeinsame Befundliste“ in `lesen.test.ts` (Quelle bei jedem Befund, Typ, Ort nach D-95.2: Summenregel nur `feld`, Datei als Ganzes nur `pfad`, kaputtes XML mit `zeile`). Die Golden-Tests blieben unverändert grün.

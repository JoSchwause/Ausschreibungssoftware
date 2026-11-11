# 69: X84-Dateien der Angebote zu `typisch` und Preisspiegel-Sollwerte

Status: ready-for-agent
Type: task
Welle: 4 · Strang: F · Paket: `fixtures/`
Blocked by: 51 (Fixtures in GAEB-Form)
Regeln: C4, Q3, N2, N5, G-26, G-41, D-05, D-36.1
Herkunft: `plan.md` §4 Tor M3 („E2E importiert zwei X84-Angebote, Preisspiegel-Summen stimmen mit den Sollwerten“)

## What to build

Für das Tor M3 braucht die E2E echte X84-Dateien und unabhängig berechnete Sollwerte.

1. Der Generator (`fixtures/erzeugen.mjs`) schreibt aus `typisch-angebote.json` je Bieter eine Datei
   `fixtures/angebote/typisch-<Bieter>.x84` (GAEB DA XML 3.3, Phase 84) – **unabhängig** vom Writer in `packages/gaeb`
   (eigener, kleiner XML-Baustein im Generator; Form nach dem, was der vorhandene X84-Leser (Ticket 45) und die amtlichen
   X84 unter `fixtures/extern/` zeigen). Inhalt: Kopf mit Bietername, Positionen mit OZ und `UP` (bzw. `Markup` an
   Zuschlagspositionen), „nicht angeboten“ wie in den amtlichen Dateien, Nachlass des Angebots, wenn vorhanden. Kein
   echter Firmenname (C4).
2. Sollwerte des Preisspiegels in `typisch-angebote.json` (additiv): je Bieter Netto, Nachlass, Netto nach Nachlass, MwSt,
   Brutto (gibt es schon: prüfen), Titelsummen, **Rang** (nach Netto nach Nachlass, Gleichstand 1, 1, 3 wie D-36.1), Min/
   Mittel/Max-Netto der virtuellen Bieter nach D-05/D-36.1 (Mittel und Min nur über Preise > 0, Mittel auf 2 Stellen je
   Position). Alles mit BigInt in `rechnen.mjs`, nie aus `kern`/`vergabe`.
3. Selbsttest (`fixtures.test.mjs`): Dateien wohlgeformt, Sollwerte reproduzierbar (Generator zweimal → byte-gleich).
4. `fixtures/README.md` und REUSE-Abdeckung nachziehen.

## Grenzen

- Nur `fixtures/`. Der Import-Test in `gaeb` ist Ticket 68; die E2E Ticket 63/64.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Drei `.x84`-Dateien (mindestens zwei, M3 verlangt zwei), deterministisch erzeugt
- [ ] Sollwerte für Rang und virtuelle Bieter, unabhängig berechnet, mit kurzer Herleitung im README
- [ ] Ein Rauchtest im Ticket (Comments): `leseAngebot` aus `@tethys/gaeb` liest jede Datei ohne Fehlerbefund (nur
      ausführen, nicht als Test in `gaeb` committen)
- [ ] `node --test "fixtures/*.test.mjs"` und `pnpm test` grün

## Nicht-Ziele

Änderungen an `typisch.json` (Ticket 51), Writer in `gaeb`.

## Comments

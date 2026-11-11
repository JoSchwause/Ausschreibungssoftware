# 84: `gaeb` v1.4: Kostengruppe als Katalogzuordnung, neue Felder beim Export

Status: ready-for-agent
Type: task
Welle: 5 · Strang: G, C2 · Paket: `packages/gaeb`
Blocked by: 70, 83
Regeln: Q3, Q5, U5, E-11, ADR 0010, D-36
Herkunft: `vertrag` v1.4 (Ticket 70, Comments „Folgearbeit GAEB“)

## What to build

1. **Kostengruppe** (`Positionsdaten.kostengruppe`) in X81/X83/X84/X86 schreiben und lesen als Katalogzuordnung der Position
   (GAEB `CtlgAssign` mit einem Katalog für die DIN-276-Kostengliederung im `BoQInfo`; nur die Nummer, keine Bezeichnung,
   G-16). Form aus dem XSD herleiten; XSD-Gegenprüfung grün. Eine Datei mit anderer Katalogart: Befund, nichts erfunden.
2. **Neue Felder ohne GAEB-Gegenstück** (`textquelle`, `vorlage`, `nachtrag`): beim Export mit Warnung verworfen (E-11, Q5:
   kein stiller Verlust); im Rundweg-Test als bekannte Ausnahme gelistet.
3. Rundweg (Q3) mit Kostengruppen an `typisch`.

## Grenzen

- Nur `packages/gaeb`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Rundweg mit Kostengruppen, XSD-Gegenprüfung grün, Warnungen getestet
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

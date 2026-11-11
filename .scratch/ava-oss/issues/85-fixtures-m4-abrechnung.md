# 85: Fixture M4: Nachtrag, Aufmaß, Rechnungen, Kostenkontrolle mit hergeleiteten Sollwerten

Status: ready-for-agent
Type: task
Welle: 5 · Strang: F · Paket: `fixtures/`
Blocked by: 70, 75
Regeln: C4, N2, N3, N5, E-06, E-07, F4, D-21, D-34, D-35, D-37, D-38
Herkunft: D-38 (Tor M4)

## What to build

Eine Fixture `fixtures/typisch-abrechnung.json` (Form wie `typisch-angebote.json`, Feldnamen wie die Typen aus `vertrag`
v1.4, wo es geht) mit **unabhängig hergeleiteten** Sollwerten für den M4-Weg (D-38). Die Rechnung dafür steht im
Selbsttest der Fixtures (`fixtures/rechnen.mjs` bzw. `fixtures.test.mjs`), ruft nie `kern`, `vergabe`, `abrechnung` oder
`kosten` auf, und jede Zahl hat ihren Rechenweg als Kommentar mit Regel (N2, N5, D-34, VOB/B § 2 Abs. 3).

Inhalt (Kennungen fest, UUIDv7-Form wie die übrigen Fixtures):

1. **Zuschlag:** an einen Bieter aus `typisch-angebote.json` mit **Prozent-Nachlass** (D-38): Bieter B (3,00 %) – dessen nicht
   angebotene Position wird nicht aufgemessen –, oder ein anderer Weg, begründet. Auftrags-LV-Summen als Sollwert (nach D-21).
2. **Nachtrag N01:** Nachtrags-LV mit 2 Positionen (Menge, Einheit, Kurztext erfunden), Angebot des Auftragnehmers mit EP;
   erwartete Knoten nach Übernahme (Gliederung „Nachtrag N01“, OZ nach D-35) und Summen des Auftrags-LV danach.
3. **Kostengruppen:** Zuordnung für die meisten Positionen (mindestens zwei KG der Ebene 3 unter verschiedenen Ebene-2-Gruppen,
   eine Position auf Ebene 2), mindestens eine Position ohne KG; eine **Kostenberechnung** als Budget (Einträge erfunden).
4. **Aufmaßblatt 1** (Formel-91-Ausdrücke mit erwarteten Zeilenergebnissen, 3 Stellen) mit einer Nachtragsposition und einer
   Position > 110 % der Auftragsmenge; **Aufmaßblatt 2**; eine **Korrektur** an Blatt 1 nach Freigabe von AR 1.
5. **Abschlagsrechnung 1** (Blatt 1; eine Umlage, z. B. 0,50 %; Sicherheitseinbehalt, z. B. 5,00 %) mit allen Zwischenwerten
   der Kette (D-34) und Zahlbetrag; **Abschlagsrechnung 2** (Blätter 1+2 kumuliert) vor und nach der Korrektur, jeweils mit
   eingefrorenem Zahlbetrag von AR 1.
6. **Soll/Ist:** erwartete Befunde (genau ein `ueber-schwelle`, kein `unter-schwelle`).
7. **Kostenkontrolle:** erwartete Zeilen je KG (Budget, Vergabe, Abrechnung, Abweichung), „ohne Kostengruppe“, „Nachlass“,
   Gesamt (D-37), für den Stand nach AR 2.

## Grenzen

- Nur `fixtures/` (nicht `fixtures/extern/`). `okf/research/` wird nicht gelesen (C3). Werte erfunden, keine echten Namen.

## Acceptance criteria

- [ ] Selbsttest rechnet jeden Sollwert unabhängig nach; README der Fixtures ergänzt
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

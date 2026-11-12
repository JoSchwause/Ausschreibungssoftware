# 112: Fixtures: Sollwerte für die Tore X2, X3, X4

Status: ready-for-agent
Type: task
Welle: 6 · Strang: F · Paket: `fixtures/`
Blocked by: 99 (gleicher Ordner); 97 nur für Punkt 3 (Formen der Mängel und des Bautagebuchs)
Modell: opus
Regeln: C4, N1–N3, D-56, D-57, D-58
Herkunft: `plan.md` §4 (Tore X2, X3, X4; D-58)

## What to build

Drei Fixture-Dateien in der Form der Vertragstypen (v1.6; für Bauzeitenplan und Honorar gelten bis zum Merge von 97 die Typen der
gemergten Pakete `bauzeit` und `honorar`, die 97 übernimmt; Punkt 3 erst nach dem Merge von 97), je mit **unabhängig von Hand hergeleiteten** Sollwerten und
Herleitung (C4), dazu eine eigene Nachrechnung in `fixtures.test.mjs` (wie `rechnen.mjs`, ohne die Pakete).

1. **`fixtures/bauzeit.json`:** ein Plan mit 6–8 Vorgängen, allen vier Anordnungsarten, einem Abstand 0 und einem negativen,
   einem Meilenstein, einem Sammelvorgang, einem Feiertag und einem Wochenende auf dem kritischen Weg (Bundesland und Jahr
   nennen); Sollwerte: Beginn/Ende je Vorgang, Puffer, kritischer Weg, Projektende. Lesarten wie Ticket 102 (`BAUZEIT_ANNAHMEN`
   im Paket, falls gemergt; sonst die Lesarten aus Ticket 102 und D-57).
2. **`fixtures/honorar.json`:** Gebäude, Honorarzone III, Honorarsatz 50 % (so benannt), anrechenbare Kosten aus einer
   Kostenberechnung mit KG 300 und KG 400, wobei KG 400 über 25 % der sonstigen anrechenbaren Kosten liegt (beide Zweige von
   § 33 Abs. 2) und die anrechenbaren Kosten streng zwischen zwei Tafelzeilen liegen; LPH 1–9; Umbauzuschlag; Nebenkosten in
   Prozent; USt 19 %. Die Tafelzeilen und Phasenanteile **selbst** aus `https://www.gesetze-im-internet.de/hoai_2013/` abschreiben
   (§ 35, § 34; unabhängig vom Paket `honorar`), Rundungskette D-56; Sollwerte je Schritt.
3. **`fixtures/bauleitung.json`:** fünf Mängel an zwei Auftragnehmern mit Fristen und Verläufen, ein Stichtag, an dem genau
   einer überfällig ist (und einer mit Frist genau am Stichtag, nicht überfällig); drei Bautagebucheinträge mit Arbeitskräften;
   Sollwerte der Auswertungen.
4. `fixtures/README.md` ergänzen.

## Grenzen

- Nur `fixtures/`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Drei Dateien mit Herleitung; `node --test "fixtures/*.test.mjs"` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

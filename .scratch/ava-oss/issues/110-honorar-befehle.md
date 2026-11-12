# 110: X3: `honorar`: Befehle, anrechenbare Kosten aus einer Kostenermittlung

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X3 · Paket: `packages/honorar`
Blocked by: 97, 101 (gleiches Paket)
Modell: opus
Regeln: A3, A5, N1–N3, U5, D-56
Herkunft: Ticket 101 (Rechenkern mit eigenen Typen), Ticket 97 (Vertragstypen)

## What to build

1. **Umstellung auf die Vertragstypen** (`Honorarberechnung`, `Honorarobjekt`, `AnrechenbareKosten`, `Honorarergebnis` aus
   v1.6); Golden- und Property-Tests von Ticket 101 bleiben unverändert grün.
2. **Befehle** (`HonorarberechnungBefehl`, v1.6) mit `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`; Prüfungen
   der Form als Fehler (Phase 1–9 je höchstens einmal, Honorarzone im Bereich des Leistungsbilds, Sätze 0–100), alles
   Fachliche als Befund (U5).
3. **Anrechenbare Kosten aus einer Kostenermittlung** (`KostenermittlungZustand` aus `vertrag`, A3: nicht über `kosten`): KG
   300 = Summe der Einträge mit Nummer 300–399, KG 400 entsprechend (eigener Betrag plus Kinder, D-24; ein Eintrag neben
   Kinderbeträgen ist schon ein Befund der Kostenermittlung), dann § 33 wie in Ticket 101. **§ 6 Abs. 1 Nr. 2:** Grundlage ist
   die Kostenberechnung, ohne sie die Kostenschätzung; eine andere Stufe oder eine Kostenschätzung, obwohl eine
   Kostenberechnung im Projekt existiert, ist ein Befund (die App übergibt die Stufen der Kostenermittlungen des Projekts).
   Hinweis im Ergebnis, dass § 4 Abs. 1 auf DIN 276 in der Fassung 2008-12 verweist (D-56).
4. **Tests:** Golden-Fall aus Ticket 101 über eine Kostenermittlung (KG 300 und 400 über 25 %); Befund bei falscher Stufe;
   Umkehrung.

Aus Ticket 97 und dem Review (D-64, D-66): Von der HOAI nicht vorgesehene Werte (Sätze, Zonen) sind Befunde, keine Fehler; der
Hinweis zu DIN 276:2008-12 (§ 4 Abs. 1) ist kein Befund und nicht Teil des `Honorarergebnis` (App und PDF drucken ihn als festen
Text); die Eingabe von `honorar` hat einen eigenen Namen neben `AnrechenbareKostenangabe` (L2).

## Grenzen

- Nur `packages/honorar`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Befehle, Umkehrung, anrechenbare Kosten aus Kostenermittlung und Stufenprüfung getestet; bestehende Tests grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

# 78: C4: EP-Kalkulation (Zuschlagskalkulation je Kostenart)

Status: done-by-agent
Type: task
Welle: 5 · Strang: C4 · Paket: `packages/kosten`
Blocked by: –
Regeln: A2, A3, N1, N2, N3, U5, Q1, D-24, D-36, D-39
Herkunft: `plan.md` §2 C4 („EP-Kalkulation“), GLOSSARY „Einzelpreiskalkulation“, „Herstellkosten & Zuschlagskalkulation“,
„Einheitspreisanteile (EPA)“

## What to build

Reine Rechnung im Paket `kosten` (nur `vertrag` und `dezimal`, A3): aus Kalkulationsansätzen einer Position und
Zuschlagssätzen je Kostenart entstehen Einheitspreisanteile und Einheitspreis. Der Planer nutzt sie für Schätzpreise im
Ausschreibungs-LV; die App schreibt das Ergebnis später mit den vorhandenen Befehlen `EinheitspreisanteileSetzen` und
`EinheitspreisAendern` (keine eigene Speicherung in v1.4, D-36 (5)).

1. **Kalkulationsansatz.** Eine Zeile: Kostenart (`EpaArt` aus `vertrag`: lohn, stoffe, geraete, nachunternehmer,
   sonstiges, frei), Bezeichnung (frei), Ansatzmenge je Einheit der Position (z. B. 0,450 h/m², 3 Stellen) und Kostensatz je
   Einheit des Ansatzes (z. B. 48,500 €/h, 3 Stellen). Einzelkosten der Zeile = Ansatzmenge × Kostensatz, ungerundet.
2. **Zuschläge je Kostenart** (Prozent, 2 Stellen; Zuschlagskalkulation mit vorberechneten Zuschlägen für Gemeinkosten der
   Baustelle, Allgemeine Geschäftskosten, Wagnis und Gewinn, als ein Satz je Kostenart). Anteil der Kostenart = (Σ
   Einzelkosten der Art) × (1 + Satz/100), **kaufmännisch auf 3 Stellen gerundet** (EP 3, N3); EP = Σ der gerundeten Anteile
   (so stimmt die Prüfung „Summe der Anteile = EP“ des Kerns immer; D-39). Leere Kostenart: Anteil `null`.
3. **Ergebnis:** `Einheitspreisanteile` (mit `freiBezeichnung`), `Einheitspreis`, je Kostenart Einzelkosten und Zuschlag
   als Nachweis, Befunde: negative Werte, Satz unter −100 %, Zeile ohne Menge oder Satz, Überlauf über die Grenzen des Kerns
   (Vorkommastellen aus `PRUEF_GRENZEN` sind Kern; hier nur ein eigener, im Code begründeter Grenzwert oder keiner).
4. **Kalkulation über ein LV (Übersicht):** Funktion, die für eine Liste von (Position, Menge, Ansätze) die Summe der
   Einzelkosten je Kostenart, die Summe der Anteile × Menge (GP je Position kaufmännisch auf 2 Stellen, N2) und den
   Mittellohn-Nachweis (Σ Lohnstunden) liefert. Nur rechnen, kein Baum.

Begriffe zuerst ins `GLOSSARY.md` (L2): „Kalkulationsansatz“, „Kostensatz“, „Zuschlagssatz der Kalkulation“ (nicht
verwechseln mit dem Zuschlagssatz einer Zuschlagsposition, GAEB `MarkupItem`; der Glossar-Eintrag sagt das ausdrücklich).

## Grenzen

- Keine Vertragstypen, keine Speicherung, keine Oberfläche; kein Import von `kern` (A3: `kosten` darf nur `vertrag` und
  `dezimal`).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Golden-Tests mit Hand-Beispielen und hergeleiteten Werten (Rechenweg im Test als Kommentar), Property-Tests
      (Summe der Anteile = EP; Reihenfolge der Zeilen ändert nichts; Satz 0 % → Anteil = gerundete Einzelkosten)
- [x] Begriffe im Glossar
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

- **D-78.1** Welche Nähte werden getestet? → Nur die beiden öffentlichen Funktionen aus `index`:
  `einzelpreiskalkulationBerechnen` (Golden-Tests in `kalkulation.test.ts`) und `kalkulationsuebersichtBerechnen`
  (`kalkulationsuebersicht.test.ts`); Property-Tests für beide in `kalkulation-eigenschaften.test.ts` mit einem
  `bigint`-Orakel, das Rundung und Summen selbst rechnet. Zwei eigene Module, bestehende Module unverändert (außer `index`).
  Grund: Ticket 82 baut im selben Paket weiter; die Tests überleben jeden Umbau im Innern.
- **D-78.2** Form der Eingabe? → `Kalkulationsansatz { art: EpaArt; bezeichnung; ansatzmenge: Menge | null; kostensatz:
  Einheitspreis | null }`, getypte Werte (die App parst am Rand mit `parseMengeDe`/`parseEinheitspreisDe`, N4; kein
  ungeprüfter Text wie in S11). Zuschlagssätze als `Partial<Record<EpaArt, Prozent>>`; eine Kostenart ohne Satz hat 0 %.
  `freiBezeichnung` ist ein Parameter und geht unverändert in die Einheitspreisanteile (bei `epaBezeichnungen` am LV
  übergibt die App `null`, D-28). Eine Zeile mit fehlendem Wert zählt nicht (Befund `wert-fehlt` je fehlendem Feld);
  Ansatzmenge oder Kostensatz 0 zählt ohne Befund; eine Kostenart nur aus nicht zählenden Zeilen ist leer (Anteil `null`).
  Grund: „Zeile ohne Menge oder Satz“ aus dem Ticket; was fehlt, kann nicht gerechnet werden, 0 ist ein Wert.
- **D-78.3** Welche Befunde, wo? → Alle zählen mit (U5). `wert-negativ` an Ansatzmenge und Kostensatz (je Zeile), am
  Anteil (je Kostenart) und am EP; `kalkulationszuschlagssatz-unter-minus-100` nur an einer Kostenart mit Anteil (ein Satz
  ohne Zeilen wirkt auf nichts); genau −100 % ist kein Befund (Anteil 0,000). Reihenfolge: Zeilenbefunde in
  Eingabereihenfolge, dann je Kostenart in der Reihenfolge der Einheitspreisanteile, dann EP. Die Übersicht hat keine
  eigene Befundliste; jede Position trägt die Befunde ihrer Kalkulation, eine negative Menge meldet die LV-Prüfung.
  Grund: Befund am Wert, der betroffen ist; keine Dopplung mit dem Kern.
- **D-78.4** Überlauf? → Kein eigener Grenzwert, kein Befund (im Modulkopf von `kalkulation.ts` begründet): `dezimal`
  rechnet auf BigInt ohne Überlauf; die Grenze des GAEB-Zahlformats ist `PRUEF_GRENZEN` des Kerns, dessen LV-Prüfung
  `zahl-zu-gross` meldet, sobald die App schreibt. Grund: A3 verbietet den Import aus `kern`; eine Kopie der Zahl wäre eine
  zweite Quelle (Geist von N3).
- **D-78.5** Benennung neben der Zuschlagsposition? → Das Glossar sagt: ein bloßes `zuschlag`/`zuschlagssatz` meint die
  Zuschlagsposition. Darum tragen alle Bezeichner das Wort „Kalkulation“: `Kalkulationszuschlagssaetze`,
  `kalkulationszuschlagssatz`, `kalkulationszuschlag`, Befundcode `kalkulationszuschlagssatz-unter-minus-100`. Neue
  Glossarbegriffe: Kalkulationsansatz (mit Ansatzmenge, Einzelkosten), Kostensatz, Zuschlagssatz der Kalkulation (mit
  Kalkulationszuschlag), Kalkulationsübersicht, Mittellohn (mit Lohnstunden); Einzelpreiskalkulation und Herstellkosten
  um die Code-Namen ergänzt, „Zuschlagssatz“ um den Hinweis auf die Verwechslung. Grund: L2, S8 aus Welle 4.
- **D-78.6** Nachweis gerundet oder exakt? → `einzelkosten` und `kalkulationszuschlag` sind ungerundete `Dezimal`
  (Zwischenwerte, nie gespeichert); Einzelkosten + Kalkulationszuschlag ist genau der Anteil vor der Rundung. Die
  Oberfläche rundet nur für die Anzeige. Grund: D-39 (Einzelkosten ungerundet); ein gerundeter Zuschlag ergäbe zwei
  Rundungen und einen Nachweis, der nicht aufgeht.
- **D-78.7** Rechenregeln der Übersicht? → GP je Position = `gesamtpreis(Menge, EP)` (N2), Gesamtsumme = Σ GP. Je
  Kostenart `einzelkosten` = Σ kaufmännisch(Menge × Einzelkosten, 2) und `anteilsumme` = Σ kaufmännisch(Menge × Anteil, 2)
  (wie `epaSummen` im Kern); Σ `anteilsumme` darf durch die Rundung je Kostenart von der Gesamtsumme abweichen.
  Herstellkosten = Σ `einzelkosten`. Die Ansatzmenge einer Lohnzeile zählt als Stunden; die Einzelpreiskalkulation
  liefert dazu `lohnstundenJeEinheit`. Lohnstunden = kaufmännisch(Σ Menge × Lohnstunden je Einheit, 3); Mittellohn =
  kaufmännisch(Σ Menge × Einzelkosten Lohn / Σ Menge × Lohnstunden je Einheit, 3) über `dividiere` (D-08), beides exakt
  vor der einen Rundung; ohne Lohnzeile oder bei Σ Lohnstunden = 0 kein Mittellohn (`null`). Zuschlagssätze und
  `freiBezeichnung` gelten für alle Positionen der Übersicht. Grund: Mit einer Rundung ist der Mittellohn eines
  einheitlichen Lohnsatzes genau dieser Satz (Property-Test); Rundung je Position verzerrt kleine Positionen.

## Answer

Branch `welle-5/78-ep-kalkulation` (auf `integration/welle-5` gemergt). Paket `packages/kosten`, neue Module
`kalkulation.ts` und `kalkulationsuebersicht.ts`, Glossar ergänzt. Öffentliche API (`@tethys/kosten`):

- `einzelpreiskalkulationBerechnen(ansaetze: Kalkulationsansatz[], saetze: Kalkulationszuschlagssaetze,
  freiBezeichnung?: string | null): Einzelpreiskalkulation` →
  `{ anteile: Einheitspreisanteile, einheitspreis: Einheitspreis | null, kostenarten: Kostenartnachweis[]
  (art, einzelkosten, kalkulationszuschlagssatz, kalkulationszuschlag, anteil), lohnstundenJeEinheit: Menge,
  befunde: Kalkulationsbefund[] }`; `anteile` und `einheitspreis` gehen direkt in `EinheitspreisanteileSetzen` und
  `EinheitspreisAendern`.
- `kalkulationsuebersichtBerechnen(positionen: Kalkulationsposition[] ({ positionId, menge, ansaetze }), saetze,
  freiBezeichnung?): Kalkulationsuebersicht` → `{ positionen: KalkuliertePosition[] ({ positionId, menge, kalkulation,
  gesamtpreis }), kostenarten: Kostenartsumme[] ({ art, einzelkosten, anteilsumme }), herstellkosten, gesamtsumme,
  lohnstunden, mittellohn }`.

Tests: Golden (Mauerwerk, Rundung halb aufwärts, negative Werte, Satz unter −100 %, fehlende Werte, freie Bezeichnung;
Übersicht mit zwei Positionen, Mittellohn 49,047, Lohnstunden 0) und 9 Property-Tests mit `bigint`-Orakel. Volle Suite
grün: Lint, Typecheck, Vitest 2046 bestanden (2 übersprungen, wie zuvor), Fixtures 20/20.

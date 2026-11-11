# 78: C4: EP-Kalkulation (Zuschlagskalkulation je Kostenart)

Status: claimed
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

- [ ] Golden-Tests mit Hand-Beispielen und hergeleiteten Werten (Rechenweg im Test als Kommentar), Property-Tests
      (Summe der Anteile = EP; Reihenfolge der Zeilen ändert nichts; Satz 0 % → Anteil = gerundete Einzelkosten)
- [ ] Begriffe im Glossar
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

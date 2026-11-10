# 36: Bieter, Angebot (Angebotsbefehle ausführen), Bietersummen, Preisspiegel-Rechnung

Status: merged (integration/welle-3)
Type: task
Welle: 3 (Phase A) · Strang: V1+V2 · Paket: `packages/vergabe` (neu)
Blocked by: - (der Mittelwert braucht `dividiere` aus Ticket 35, Punkt 1; bis dieser Commit im Integrationsbranch ist, zuerst Punkt 1–4)
Regeln: A2, A3, A5, A6, A7, N1, N2, N3, N5, U5, L1, L2, C3, C4, Q1, Q4, ADR 0011
Herkunft: Strang V1, V2 (`plan.md` §2); G-14, G-26 (`grilling.md`); D-04, D-05 (`entscheidungen-auto.md`); W-06 (`next-decisions-welle-2.md`); Glossar „Preisspiegel“, „Virtueller Bieter“, „Ausreißer“, „Nachlass“, „Nicht angeboten“, „Angebot“, „Bieter“; `fixtures/README.md` Annahmen A5–A7

## What to build

Ein reines Paket `packages/vergabe` (A2, A3: importiert nur `vertrag`, `dezimal`, `kern`). Es führt die
Angebotsbefehle des Vertrags aus, berechnet Bietersummen mit der Summenrechnung des Kerns und rechnet den
Preisspiegel. Keine Oberfläche (V3), kein Speichern, kein Zuschlag (V4).

1. **Paketgerüst.** `packages/vergabe/package.json` wie `packages/kern` (`@tethys/vergabe`, `exports: ./src/index.ts`,
   Skript `typecheck`, Abhängigkeiten `@tethys/vertrag`, `@tethys/dezimal`, `@tethys/kern`, Dev `fast-check`),
   `tsconfig.json` wie `kern`. In `tools/boundaries.mjs` ist `packages/vergabe` schon eingetragen; nichts zu ändern.
2. **Bietersummen.** `angebotSummenBerechnen(lv: LvZustand, angebot: Angebot): Summenstand`. Weg: ein gedachtes LV
   aus den Knoten des Ausschreibungs-LV, in dem jede Position den EP des Angebots trägt (`nicht-angeboten` oder kein
   Eintrag: `null`), mit dem Nachlass **des Angebots** und dem MwSt-Satz **des LV**; darauf `summenBerechnen` aus
   `@tethys/kern`. So gelten GP-Rundung (N2), Nachlass (N5: Betrag auf 2 Stellen, dann abziehen), MwSt einmal auf die
   Summe und die Regeln, welche Positionen eingehen (Bedarf, Wahl; Ticket 37), ohne eigene Kopie. Zuschlagspositionen
   rechnen, wie der Kern sie rechnet; der eigene Satz des Bieters (`zuschlagssatz`, Vertrag v1.2) ist Ticket 44.
   „Nicht angeboten“ ist kein Preis 0,00 (Glossar): kein GP, geht nicht ein.
3. **Angebotsbefehle ausführen.** `angebotBefehlAusfuehrer(projekt: Projekt, lv: LvZustand): AngebotBefehlAusfuehren`
   (die Vertragssignatur kennt das LV nicht; die Fabrik schließt es ein, der Vertrag bleibt unverändert). Für
   `AngebotAnlegen`, `AngebotspositionSetzen`, `AngebotsNachlassSetzen`, `AngebotsNachlassEntfernen`, `AngebotLoeschen`:
   - Prüfungen als Fehlerwerte: Anlegen mit Zustand bzw. andere ohne → `befehl-nicht-zustaendig`;
     `leistungsverzeichnisId`/`projektId` passen nicht zum LV → `ungueltige-eingabe` mit `feld`; Bieter nicht im
     Projekt → `ungueltige-eingabe`, `feld: 'bieterId'`; Position nicht im LV oder keine Position → `knoten-unbekannt`
     bzw. `knotenart-unzulaessig`; dieselbe Position zweimal im Angebot → `ungueltige-eingabe`; EP nicht kanonisch
     (3 Stellen) → `ungueltige-eingabe`, `feld: 'einheitspreis'`; Nachlass prüft `nachlassFehler` aus `@tethys/kern`
     (genau ein Nachlass je Angebot, G-26; er erbt den des LV nicht). Ein negativer EP ist erlaubt (U5).
   - `AngebotChangeSet` minimal (A6): geänderte/neue/entfernte Angebotspositionen, nur geänderte Summen, `summen.vorher`
     gefüllt wie im Kern seit Ticket 30 (umkehrbar ohne Vorzustand). Gleicher Wert → leeres ChangeSet.
     `AngebotLoeschen`: `kopf.nachher: null`, alle Positionen in `positionen.entfernt`, alle Summen in `vorher.entfernt`.
   - `angebotChangeSetAnwenden(zustand | null, cs): AngebotZustand | null` und `angebotChangeSetUmkehren(cs)`.
   - Bieter selbst legt `BieterAnlegen` an, ein Projektbefehl, den der Kern ausführt (Ticket 30, Punkt 11); hier wird
     nur gelesen, ob es den Bieter gibt.
4. **Glossar (L2).** Vor dem Code: „Bietersumme“ (Gesamtsummen eines Angebots), „Rang“ (Reihenfolge der Bieter nach
   Netto nach Nachlass), „ABC-Klasse“, „Nullpreis“ (angebotener EP 0,00, eigenes Kennzeichen, D-05); „Ausreißer“
   ergänzen um D-05.
5. **Preisspiegel-Rechnung** `preisspiegelBerechnen(lv: LvZustand, angebote: readonly AngebotZustand[], einstellungen?)`.
   Ergebnistypen liegen in `vergabe` (D-04). Einstellungen (einstellbar, G-26) mit Standard:
   `ausreisserSchwelle` 20,00 %, `abcSchwelleA` 80,00 %, `abcSchwelleB` 95,00 % (vorläufige Annahme, nur A ist durch
   G-26 belegt), `abcBezug` `'mittel'` oder `'schaetzpreis'` (Standard `'mittel'`, Annahme).
   - **Zeilen:** jede Position des LV-Baums in Dokumentreihenfolge (Gliederungen und Hinweistexte nicht; Positionen
     im Papierkorb nicht). Je Zeile: Menge, ob die Position laut LV in die Summe eingeht, der **Schätzpreis** (EP und
     GP aus dem LV, virtueller Bieter), je Angebot Kennzeichen, EP, GP und Ausreißer, dazu die virtuellen Bieter
     **Min**, **Mittel**, **Max** (EP, GP, beteiligte Angebote) und die ABC-Klasse.
   - **Kennzeichen (D-05):** EP > 0 `angeboten`; EP = 0,00 `nullpreis`; `nicht-angeboten` oder kein Eintrag
     `nicht-angeboten` (Annahme: kein Eintrag gilt als nicht angeboten). Ein negativer EP bleibt `angeboten`, zählt
     aber wie 0,00 nicht für Min, Mittel, Max und ist nie Ausreißer (Annahme).
   - **Min, Mittel, Max** nur über EP > 0 (D-05; Max ebenso, Annahme). Mittel-EP = Σ EP / n, kaufmännisch auf 3 Stellen
     (`dividiere`, N3). GP eines virtuellen Bieters = `gesamtpreis(Menge, EP)` (N2), `null` ohne Menge. Ohne EP > 0:
     alle drei `null`.
   - **Ausreißer (G-26, D-05):** nur bei n ≥ 2 Bietern mit EP > 0 und Σ > 0. Ein Bieter mit EP > 0 ist Ausreißer
     `hoch`, wenn (n · EP − Σ) · 100 > Schwelle · Σ, `niedrig`, wenn (Σ − n · EP) · 100 > Schwelle · Σ. Genau per
     Multiplikation, ohne den gerundeten Mittelwert (strikt größer: „um mehr als“, Glossar). Verglichen wird der EP
     (vorläufige Annahme: unabhängig von der Menge; vom GP-Vergleich der Fixture-Annahme A7 und des Prototyps weicht
     das nur durch Rundung ab). Nullpreis und nicht angeboten sind nie Ausreißer.
   - **Bietersummen und Rang:** je Angebot die Gesamtsummen aus Punkt 2 (Netto, Nachlass, Netto nach Nachlass, MwSt,
     Brutto) und die Zahl der nicht angebotenen Positionen, die laut LV eingehen. Rang aufsteigend nach Netto nach
     Nachlass; gleiche Werte gleicher Rang (1, 1, 3; Annahme). Der Nachlass bleibt ein eigener Wert neben den EP, wird
     nie in die EP umgelegt und lässt sich entfernen, ohne dass sich ein EP ändert (G-26, N5).
   - **Gliederungen:** je Los/Titel die Summe je Angebot (aus dem Summenstand des Angebots).
   - **Virtuelle Summen:** Netto der virtuellen Bieter Min, Mittel, Max und Schätzpreis = Summe ihrer GP über die
     Positionen, die laut LV eingehen (ohne Nachlass; Annahme).
   - **ABC-Klasse:** Bezug ist der GP des gewählten virtuellen Bieters. Nur Positionen, die eingehen und einen GP > 0
     haben; absteigend nach GP, bei Gleichstand Dokumentreihenfolge. Mit „davor“ = Summe der GP aller vorher
     einsortierten Positionen und „gesamt“ = Summe aller: Klasse A, wenn davor · 100 < A · gesamt; sonst B, wenn
     davor · 100 < B · gesamt; sonst C (Annahme: die Position, die die Schwelle überschreitet, gehört noch zur
     höheren Klasse). Andere Positionen: `null`.

## Golden-Beispiel (C4: aus Regeln hergeleitet, steht mit Herleitung im Test)

LV, MwSt 19,00 %, eine Gliederung, drei Normalpositionen: P1 Menge 10,000, P2 Menge 5,000, P3 Menge 2,000.
Angebote: A mit Nachlass 5,00 %, B ohne, C mit Nachlass 40,00 (Betrag).

| | A | B | C |
|---|---|---|---|
| P1 EP | 10,000 | 12,000 | 15,000 |
| P2 EP | 0,000 | 8,000 | 10,000 |
| P3 EP | 50,000 | nicht angeboten | 70,000 |

- GP (N2): A 100,00 / 0,00 / 100,00; B 120,00 / 40,00 / –; C 150,00 / 50,00 / 140,00.
- Netto: A 200,00; B 160,00; C 340,00. Nachlass (N5): A 200,00 × 5 % = 10,00; C 40,00. Netto nach Nachlass:
  A 190,00; B 160,00; C 300,00. MwSt 19 %: A 36,10; B 30,40; C 57,00. Brutto: A 226,10; B 190,40; C 357,00.
  Rang: B 1, A 2, C 3. B hat eine nicht angebotene Position.
- P1: n = 3, Σ = 37; Mittel 37 / 3 = 12,333… → **12,333**, GP 10 × 12,333 = 123,33. C: (3 · 15 − 37) · 100 = 800 >
  20 · 37 = 740 → **Ausreißer hoch** (21,6 %). A: (37 − 30) · 100 = 700 ≤ 740 → kein Ausreißer (18,9 %).
  Min 10,000 (A), GP 100,00; Max 15,000 (C), GP 150,00.
- P2: A hat Nullpreis (eigenes Kennzeichen, nie Ausreißer, nicht im Mittel). n = 2, Σ = 18, Mittel **9,000**, GP 45,00;
  B: |2 · 8 − 18| · 100 = 200 ≤ 360, C ebenso → keine Ausreißer. Min 8,000 (B), Max 10,000 (C).
- P3: B nicht angeboten. n = 2, Σ = 120, Mittel **60,000**, GP 120,00; A: (120 − 100) · 100 = 2.000 ≤ 2.400 → kein
  Ausreißer. Min 50,000 (A), Max 70,000 (C).
- Virtuelle Netto: Mittel 123,33 + 45,00 + 120,00 = 288,33; Min 100,00 + 40,00 + 100,00 = 240,00; Max 150,00 + 50,00 +
  140,00 = 340,00.
- ABC (Bezug Mittel, gesamt 288,33): P1 123,33 (davor 0) → **A**; P3 120,00 (davor 123,33; 12.333 < 23.066,4) → **A**;
  P2 45,00 (davor 243,33; 24.333 ≥ 23.066,4, aber < 95 · 288,33 = 27.391,35) → **B**.
- Ausreißer-Schwelle 25,00 % statt 20 %: P1/C ist dann kein Ausreißer (800 ≤ 925).

## Grenzen

- Nur `packages/vergabe` (P2). Keine Änderung an `vertrag` oder `kern`; fehlt dort etwas, in die Comments.
- Zuschlagspositionen im Angebot und im Preisspiegel sind Ticket 44; Wählen einer Wahlposition und Zuschlag sind
  Welle 4. X84-Import ist Ticket 45.
- Fixtures: `fixtures/typisch.json` und `fixtures/typisch-angebote.json` dürfen Tests lesen (eigene kleine Abbildung
  Fixture → Vertrag in `src/testhilfen.ts`, wie in `packages/ausgabe`). Ihre Bietersummen sind nach N2/N5 hergeleitet
  und gelten als Sollwert; die Ausreißerliste `ausreisserAnnahmeA7` ist **kein** Sollwert (README, A7). Die
  Zuschlagsposition von `typisch` rechnet die Datei nach Annahme A4 (Menge × EP); ändert Ticket 37 diese Rechnung,
  weichen GP und Summen ab. Dann entfernt der Test die Zuschlagsposition aus LV und Angeboten und vergleicht die
  übrigen Positions-GP mit der Datei, die Summen mit einer eigenen Herleitung nach N2/N5 (Vermerk im Test); die Datei
  zieht Ticket 44 nach.
- **Größer als 4 h.** Wird es eng, zuerst abgeben: ABC-Klasse, dann Gliederungen im Preisspiegel, dann den
  Leistungstest. Punkt 1–3, Min/Mittel/Max, Ausreißer und Bietersummen bleiben.
- `okf/research/` wird nicht gelesen (C3). Offene Punkte entscheidet der Umsetzer und protokolliert sie in
  `.scratch/ava-oss/entscheidungen-auto.md` (Demo-Modus); jede Annahme oben steht zusätzlich als benannte Konstante
  (`PREISSPIEGEL_ANNAHMEN`) an einer Stelle im Code.
- TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün.

## Acceptance criteria

- [x] `packages/vergabe` baut, ist von den Paketgrenzen erfasst und in `pnpm typecheck` enthalten
- [x] Bietersummen von `typisch-angebote.json` gleich den Sollwerten der Datei (GP, Titel, Netto bis Brutto, nicht angebotene Positionen)
- [x] Je Angebotsbefehl Wirkung, minimales ChangeSet, gleicher Wert → leer, Fehlerfälle aus Punkt 3 getestet
- [x] Property-Test: zufällige Folgen von Angebotsbefehlen; nach jedem Befehl ist der Summenstand gleich `angebotSummenBerechnen`; `angebotChangeSetUmkehren` stellt den Vorzustand ohne dessen Kenntnis her; doppelte Umkehrung = ChangeSet
- [x] Golden-Test: das Beispiel oben vollständig (Kennzeichen, EP/GP, Min/Mittel/Max, Ausreißer, Summen, Rang, virtuelle Netto, ABC), mit der Herleitung als Kommentar
- [x] Test: Schwelle 25 % ändert die Ausreißer wie oben; nur ein Bieter mit EP > 0 → keine Ausreißer; alle 0,00 → Min/Mittel/Max `null`
- [x] Test: Nachlass entfernen ändert keinen EP und keinen Positions-GP, nur die Bietersumme
- [x] Leistung: `AngebotspositionSetzen` auf einem Angebot zu `gross` (5.000 Positionen) < 16 ms (Q4, wie im Kern); `preisspiegelBerechnen` für `gross` mit 5 erzeugten Angeboten mit festgehaltenem Budget (Vorschlag < 1 s)
- [x] `GLOSSARY.md` enthält „Bietersumme“, „Rang“, „ABC-Klasse“, „Nullpreis“; „Ausreißer“ nennt D-05
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

Preisspiegel-Ansicht (V3). Zuschlag → Auftrags-LV (V4, Welle 4). Zuschlagspositionen (Ticket 44). Excel-Rundlauf (V5).
Mehrere Nachlässe je Angebot (G-26: genau einer). Preisspiegel-Typen in `vertrag` (D-04: erst, wenn ein anderes Paket
sie braucht).

## Comments

- Umsetzung (Branch `ticket/36-vergabe`): `packages/vergabe` mit `angebotSummenBerechnen`, `angebotBefehlAusfuehrer`,
  `angebotChangeSetAnwenden`/`angebotChangeSetUmkehren`, `preisspiegelBerechnen`, `PREISSPIEGEL_ANNAHMEN`. Mittel über
  `dividiere` aus Ticket 35 (D-08). Messwerte: `AngebotspositionSetzen` auf `gross` Median etwa 1,6 ms (< 16 ms);
  `preisspiegelBerechnen` `gross` mit 5 Angeboten etwa 0,4–0,6 s (Budget < 1 s festgehalten).
- Entscheidungen: D-36.1 (Annahmen der Preisspiegel-Rechnung; dazu: Bieter- und Gliederungssummen werden aus dem
  übergebenen LV neu gerechnet) und D-36.2 (Form der ChangeSets: neue Angebotspositionen hinten, `summen.vorher` immer
  gesetzt, doppelte Position → `feld: 'positionen'`, keine EPA-Prüfung, kein Befehlshinweis am Angebot) in
  `entscheidungen-auto.md`.
- Für Ticket 37/44: `AngebotspositionSetzen` rechnet inkrementell (GP der einen Position über `positionsSumme` des Kerns,
  Differenz die Elternkette hinauf, `gesamtsummen` des Kerns). Das gilt, solange der GP einer Position nur von ihrem
  eigenen EP abhängt. Rechnet Ticket 37 Zuschlagspositionen nach GAEB (Satz auf die Bezugspositionen) oder befüllt der
  Kern `summeBedarfOhneGesamtbetrag`/`summeWahl`, muss Ticket 44 den inkrementellen Weg erweitern (oder bei LVs mit
  Zuschlagsposition auf `angebotSummenBerechnen` zurückfallen); der Property-Test vergleicht mit der Neuberechnung und
  zeigt die Abweichung, sobald sein LV eine Zuschlagsposition bekommt.
- `pnpm typecheck` scheitert weiter nur an `proto/interview` (vor diesem Lauf, nicht von hier); alle anderen Pakete
  einschließlich `vergabe` sind grün.

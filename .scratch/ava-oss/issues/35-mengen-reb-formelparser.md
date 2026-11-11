# 35: REB-23.003-Formelparser (Formel 91 zuerst)

Status: resolved
Type: task
Welle: 3 (Phase A) · Strang: M1 · Paket: `packages/mengen` (neu); dazu additiv `packages/dezimal` (Punkt 1; in diesem Lauf hat `dezimal` keinen anderen Schreiber)
Blocked by: -
Regeln: A2, A3, N1, N2, N3, N4, L1, L2, C1, C3, C4, Q1, P2
Herkunft: Strang M1 (`plan.md` §2), G-16 (`grilling.md`), E-07 (Rundung negativer Werte), Glossar „Aufmaß & Mengenermittlung (REB 23.003)“

## What to build

Ein reines Paket `packages/mengen`, das einen Mengenansatz nach der Art der REB-Verfahrensbeschreibung 23.003 liest
und rechnet: Text einer Ansatzzeile → Ausdruck → Dezimalwert, und eine Folge von Ansatzzeilen → Zeilenergebnisse und
Summe. Zuerst nur der freie Rechenansatz („Formel 91“); weitere nummerierte Formeln folgen in eigenen Tickets.

**Clean Room und G-16.** Im Repo stehen nur Formel**nummern** und selbst geschriebene Arithmetik. Keine Formeltexte,
Bezeichnungen oder Skizzen aus dem REB-Katalog; Bezeichnungen importiert später der Nutzer (wie DIN 276). Dieses
Ticket beschreibt die Sprache in eigenen Worten; was unsicher ist, steht als **vorläufige Annahme, Entscheidung offen**
da, an genau einer benannten Stelle im Code (`MENGEN_ANNAHMEN`), damit sie sich später ohne Datenmigration ändern lässt.

1. **`dezimal`: Division (additiv).** `dividiere(a: Dezimal, b: Dezimal, stellen: number): Ergebnis<Dezimal, Dezimalfehler>`:
   exakter Quotient, kaufmännisch auf `stellen` gerundet mit derselben Regel wie `rundeAufStellen` (Betrag runden,
   Vorzeichen davor, E-07; nie `-0…`). Division durch null ist ein Fehlerwert (neuer `Dezimalfehlercode`
   `division-durch-null`), keine Ausnahme. Property-Tests: `dividiere(multipliziere(a, b), b, s)` = `rundeAufStellen(a, s)`
   für `b ≠ 0`; Vorzeichenregel. **Als erster eigener Commit**, damit der Orchestrator ihn vorab in den
   Integrationsbranch nehmen kann: Ticket 36 braucht `dividiere` für den Mittelwert.
2. **Paketgerüst.** `packages/mengen/package.json` wie `packages/kern` (`@tethys/mengen`, `type: module`,
   `exports: ./src/index.ts`, Skript `typecheck`, Abhängigkeiten `@tethys/vertrag`, `@tethys/dezimal`, Dev `fast-check`),
   `tsconfig.json` wie `kern`, `src/index.ts`. In `tools/boundaries.mjs` ist `packages/mengen` schon eingetragen
   (darf `vertrag`, `dezimal`, `kern`); nichts zu ändern. Vitest findet `packages/*/src/**/*.test.ts` von selbst.
   SPDX-Kopfzeile in jeder Datei wie im Rest des Repos.
3. **Ausdruckssprache des freien Rechenansatzes** (vorläufige Annahmen in `MENGEN_ANNAHMEN`):
   - Zahlen mit **Dezimalkomma** (`2,5`, `0,125`); ohne Tausendertrennzeichen; ein Punkt in einer Zahl ist ein Fehler
     `punkt-statt-komma` (Annahme: kein Raten, ob Tausender- oder Dezimalpunkt gemeint ist). Ganze Zahlen ohne Komma
     sind erlaubt; `,5` ohne führende Ziffer ist ein Fehler.
   - Grundrechenarten `+`, `-`, `*`, `/`; zusätzlich `×` für `*`, `÷` und `:` für `/`, `−` (Minuszeichen U+2212) für
     `-` (Annahme). Übliche Rangfolge (Punkt vor Strich, links-assoziativ), einstelliges Plus und Minus, runde
     Klammern beliebig tief bis zur Grenze. Leerraum zählt nicht. Kein Potenzoperator, keine Funktionen (Annahme;
     kommen mit den nummerierten Formeln, falls nötig).
   - **Zeilenbezug:** `Z` gefolgt von der Zeilennummer (`Z3`) steht für das Ergebnis einer **früheren** Ansatzzeile
     (das auf 3 Stellen gerundete Zeilenergebnis, Annahme). Bezug auf die eigene oder eine spätere Zeile:
     `bezug-vorwaerts`; auf eine unbekannte Zeile: `bezug-unbekannt`; auf eine Zeile mit Fehler: `bezug-fehlerhaft`.
   - **Variable:** Eine Ansatzzeile kann einen Namen tragen (`variable`); spätere Zeilen nutzen ihn wie einen
     Zeilenbezug. Name: Buchstabe, dann Buchstaben, Ziffern oder `_`; Groß/Klein zählt; `Z` mit Ziffern ist kein
     zulässiger Name; doppelte Namen: `variable-doppelt`.
   - Grammatik (eigene Fassung): `ausdruck = summand { ("+"|"-") summand }`, `summand = faktor { ("*"|"/") faktor }`,
     `faktor = [ "+" | "-" ] faktor | primaer`, `primaer = zahl | bezug | name | "(" ausdruck ")"`.
4. **Rechnen.** Addition, Subtraktion, Multiplikation exakt (`dezimal`); Division mit `ZWISCHENSTELLEN` = 10
   Nachkommastellen (Annahme, eine Konstante). Das **Zeilenergebnis** ist der Wert des Ausdrucks, kaufmännisch auf
   3 Stellen gerundet (`Menge`, N3; negative Werte nach E-07, z. B. für Abzüge). Die **Summe** des Mengenansatzes ist
   die Summe der gerundeten Zeilenergebnisse (Annahme, analog N2). Zeilen mit Fehler zählen nicht und machen die
   Summe ungültig (`summe: null`), es wird nie still eine Zeile übergangen.
5. **Formeln.** Eine Ansatzzeile nennt ihre Formelnummer. Nur **91** ist in diesem Ticket umgesetzt; als
   vorläufige Annahme steht 91 für den freien Rechenansatz (Punkt 3). Eine Tabelle `FORMELN` (Nummer → Anzahl der
   Parameter, reine Rechenfunktion) ist so angelegt, dass weitere Nummern ohne Umbau dazukommen; jede andere Nummer
   liefert `formel-unbekannt`. Keine Nummer wird einer geometrischen Form zugeordnet, solange das nicht an der
   REB-Beschreibung belegt ist (dann eigenes Ticket, mit Herkunftsvermerk).
6. **Schnittstelle** (Typen bleiben in `mengen`, bis ein anderes Paket sie braucht, wie D-04 für den Preisspiegel):
   - `ausdruckLesen(text): Ergebnis<Ausdruck, Formelfehler>` (Syntaxbaum), `ausdruckFormatieren(ausdruck): string`
     (kanonischer Text: Dezimalkomma, `*` und `/`, Leerzeichen um `+`/`-`, nur nötige Klammern).
   - `mengenansatzBerechnen(zeilen: readonly Ansatzzeile[]): Mengenansatzergebnis` mit
     `Ansatzzeile { zeile: number; formel: number; ausdruck: string; variable: string | null }` und je Zeile
     `{ zeile, menge: Menge | null, fehler: Formelfehler | null }` plus `summe: Menge | null`.
   - `Formelfehler { code; meldung; spalte: number | null }` (Spalte ab 0 im Ausdruckstext, für die Markierung in der
     Oberfläche); stabile Codes mindestens: `zeichen-unerwartet`, `zahl-ungueltig`, `punkt-statt-komma`,
     `klammer-fehlt`, `klammer-zu-viel`, `ausdruck-leer`, `ausdruck-zu-lang`, `zu-tief`, `division-durch-null`,
     `bezug-vorwaerts`, `bezug-unbekannt`, `bezug-fehlerhaft`, `variable-doppelt`, `formel-unbekannt`.
   - Grenzen gegen Missbrauch: Ausdruck höchstens 1.000 Zeichen, Schachtelung höchstens 50, nie ein Stapelüberlauf.
   - Rein (A2): keine Uhr, kein Zufall, kein I/O, kein `number` für Werte (N1; `number` nur für Zeilennummer, Spalte,
     Formelnummer).
7. **Glossar (L2).** Neue Einträge vor dem Code: „Mengenansatz“ (Folge von Ansatzzeilen, deren Summe eine Menge
   ergibt), „Ansatzzeile“, „REB-Formel“ (über ihre Nummer bezeichnet; nur Nummern im Repo, G-16).

## Grenzen

- Ein Schreiber je Paket: `mengen` neu, `dezimal` nur Punkt 1 (additiv, kein bestehender Export ändert sich).
- `mengen` importiert nur `vertrag` und `dezimal` (A3). Keine Oberfläche, kein Speichern, kein X31 (M2, M3).
- C4: Goldene Zahlen nur, wenn sie aus Arithmetik und kaufmännischer Rundung (N2, E-07) herleitbar sind; die Herleitung
  steht im Test neben dem Wert.
- `okf/research/` wird nicht gelesen (C3). Offene Punkte entscheidet der Umsetzer und protokolliert sie in
  `.scratch/ava-oss/entscheidungen-auto.md` (Demo-Modus); jede neue Annahme zusätzlich in `MENGEN_ANNAHMEN`.
- TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün. Umfang: 3–4 h; wird es eng,
  zuerst Variablen (Punkt 3) abgeben, Zeilenbezüge bleiben.

## Acceptance criteria

- [x] `dividiere` in `dezimal` mit Tests (Rundung, Vorzeichen, `division-durch-null`, Property-Test wie in Punkt 1); kein bestehender Test von `dezimal` geändert
- [x] `packages/mengen` baut, ist von den Paketgrenzen erfasst und in `pnpm typecheck` enthalten
- [x] Golden-Tests mit Herleitung: `2,5*4+3` → `13.000`; `(1,25+0,75)*3/4` → 2 × 3 / 4 = `1.500`; `10/3` → 3,3333333333 → `3.333`; `2/3` → 0,6666666667 → `0.667`; `10/3*3` → 9,9999999999 → `10.000`; `-2,5*1,2` → `-3.000`; `0,0005` → `0.001`, `-0,0005` → `-0.001` (E-07); `1/0` → `division-durch-null`
- [x] Golden-Test Mengenansatz: Zeile 1 `3,5*2` = `7.000`, Zeile 2 `Z1*0,5` = `3.500`, Summe `10.500`; Zeile 2 mit `Z3` → `bezug-vorwaerts`, Summe `null`
- [x] Fehler mit Spalte: `2*(3+` → `klammer-fehlt`; `1.5` → `punkt-statt-komma` an Spalte 1; `2 # 3` → `zeichen-unerwartet` an Spalte 2
- [x] Property-Test: für zufällige Syntaxbäume gilt `ausdruckLesen(ausdruckFormatieren(a))` = `a` (bis auf überflüssige Klammern)
- [x] Property-Test: für zufällige Ausdrücke aus ganzen Zahlen mit `+`, `-`, `*` stimmt das Ergebnis mit einer unabhängigen Rechnung über `bigint` überein
- [x] Property-Test: beliebiger Text bis 1.000 Zeichen wirft nie, sondern liefert Wert oder Fehlerwert; 50-fach geschachtelte Klammern gehen, 51-fach ergibt `zu-tief`
- [x] `MENGEN_ANNAHMEN` nennt jede vorläufige Annahme dieses Tickets; `FORMELN` enthält nur 91
- [x] `GLOSSARY.md` enthält „Mengenansatz“, „Ansatzzeile“, „REB-Formel“
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

Weitere nummerierte Formeln (eigene Tickets, sobald Nummer und Parameter belegt sind). Mengenermittlungs-Panel (M2).
X31/DA11 (M3). Aufmaßblätter und Soll/Ist (A2). Vordersatz einer Position aus dem Mengenansatz setzen (Befehl und
Vertragstyp fehlen; späteres Vertragsticket).

## Answer

- Gebaut: Neues Paket `packages/mengen`: REB-23.003-Formelparser, Formel 91 zuerst, mit Fehlern samt Spalte; dazu additiv `packages/dezimal` (Punkt 1).
- Merge: `b43a569` (integration/welle-3).
- Offen: Nichts offen im Ticket; weitere REB-Formeln bleiben spätere Tickets (Strang M1).

## Comments

- Frühere Zeile: Position in der Folge oder Zeilennummer? → Position in der Folge; die Folge ist das, was der Nutzer sieht (D-35a).
- Fehlercodes über die Mindestliste hinaus? → `ausdruck-unvollstaendig`, `variable-ungueltig`, `zeile-doppelt`; sonst hätte „2+“, ein ungültiger Name oder eine doppelte Nummer keinen ehrlichen Code.
- Spalte bei `klammer-fehlt`? → die offene Klammer ohne Partner; dort muss der Nutzer hinsehen.
- Zahlen im Syntaxbaum? → normalisiert (`2,50` = `2,5`, `007` = `7`), damit Lesen ∘ Formatieren stabil ist; sehr lange Zahlen (über `dezimal`-Grenze) sind `zahl-ungueltig`.
- Leerer Variablenname? → `variable-ungueltig`; „kein Name“ ist `null`.
- Zwischenrundung bei Division: `dividiere` auf `ZWISCHENSTELLEN` = 10, wie im Ticket; Bezüge nutzen das auf 3 Stellen gerundete Zeilenergebnis.

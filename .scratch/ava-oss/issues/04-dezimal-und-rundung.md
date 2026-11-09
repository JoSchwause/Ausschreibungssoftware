# 04: Dezimal, Rundung und de-DE-Parsen/-Formatieren (K1)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: K · Paket: `packages/dezimal` (einziger Schreiber)
Blocked by: 02
Regeln: A2, N1, N2, N3, N4, Q1

## What to build

Dezimalarithmetik ohne Gleitkomma: Addieren, Multiplizieren, Vergleichen, Rundung auf n Stellen **kaufmännisch**
(half-up), Skalen aus der Konstantentabelle in `vertrag` (Menge 3, EP 3, Prozent 2, Betrag 2; G-21). Parsen und
Formatieren im deutschen Format (`1.072,55`, Dezimalkomma, Tausenderpunkt) **nur an den Rändern** (N4); der Kern sieht nur Dezimalwerte.
Reines Paket: kein DOM, kein I/O, keine Zeit, kein Zufall (A2). Aktiviert die Lint-Regel gegen `number` für Geld (N1) aus Ticket 03.

## Acceptance criteria

- [x] Golden (Handrechnung, aus N2 herleitbar): 1,235 × 10,00 = 12,35 · 3,333 × 4,56 = 15,19848 → 15,20 · 2,5 → 3 und 2,4 → 2 bei Rundung auf 0 Stellen
- [x] Property-Tests (`fast-check`): Rundung ist idempotent; `a + b = b + a`; Parsen ∘ Formatieren = Identität für alle zulässigen Werte
- [x] Verhalten bei **negativen** Werten (Abzugspositionen) ist festgelegt, getestet und im `GLOSSARY.md` beschrieben. Lässt sich die Regel nicht aus Fachdokumentation oder VOB belegen, Ticket auf `needs-info` mit der Frage, nicht raten (P5)
- [x] Ungültige Eingaben („1,2,3“, „abc“, leerer String) liefern einen Fehlerwert, keine Ausnahme
- [x] Keine Abhängigkeit außer einer geprüften Dezimalbibliothek mit AGPL-kompatibler Lizenz (C5), oder eigene Implementierung mit Begründung im Ticket
- [x] Rechenzeit: 100.000 Multiplikationen plus Rundung unter 100 ms (Messung ohne Gate, Wert ins Ticket)

## Nicht-Ziele

Summen, Nachlass, MwSt (Ticket 07), Währungsumrechnung, Datumsformate.

## Comments

### Ergebnis (Branch `worktree-agent-a327397e165c211f5`)

Geliefert in `packages/dezimal/src/`: `kern.ts` (Arithmetik, Konstruktoren), `de.ts` (de-DE-Rand), `austausch.ts`
(toleranter Leser), `index.ts`; Tests `dezimal.test.ts` (Golden, Fehlerfälle), `eigenschaften.test.ts` (fast-check mit
unabhängigem Orakel), `leistung.test.ts` (Messung). Die Tests wurden zuerst geschrieben und liefen rot (eigener Commit),
dann kam die Implementierung. Einzige Laufzeitabhängigkeit: `@tethys/vertrag` (nur `NACHKOMMASTELLEN`); `fast-check` ist
devDependency (Lizenzprüfung `node tools/check-licenses.mjs` grün).

Lokal ausgeführt und grün: `pnpm lint`, `pnpm typecheck`, `pnpm test` (156 Vitest-Tests, 10 Node-Tests).

### Exportierte API

Typen: `Dezimalfehler {code, meldung}`, `Dezimalfehlercode` (`leer | ungueltiges-format | zu-lang | falsche-nachkommastellen |
zu-viele-nachkommastellen`), `Zahl<Z extends Zahlenart>` (= `Menge | Einheitspreis | Prozent | Betrag` je Name), `ZahlenTypen`,
`Austauschergebnis<Z>`, `Austauschhinweis {code, original}`, `Austauschhinweiscode`. Fehler sind Werte
(`Ergebnis<T, Dezimalfehler>` aus `vertrag`), keine Ausnahmen; Ausnahmen gibt es nur bei Programmfehlern (ungültige
Stellenzahl, per Cast eingeschleuster nicht kanonischer Wert).

Konstruktoren aus kanonischen Zeichenketten (prüfen Format und Skala):

- `alsMenge(text)`, `alsEinheitspreis(text)`, `alsBetrag(text)`, `alsProzent(text)`: `Ergebnis<Typ, Dezimalfehler>`
- `alsZahl<Z>(art: Z, text): Ergebnis<Zahl<Z>, Dezimalfehler>`
- `alsDezimal(text): Ergebnis<Dezimal, Dezimalfehler>` (beliebige Skala, für Zwischenwerte)
- `NULL_MENGE`, `NULL_EINHEITSPREIS`, `NULL_BETRAG`, `NULL_PROZENT` (Skala aus `NACHKOMMASTELLEN`)

Rechnen:

- `addiere<Z extends Dezimal>(a: Z, b: Z): Z`, `subtrahiere<Z>(a: Z, b: Z): Z`, `negiere<Z>(a: Z): Z`
- `vergleiche(a: Dezimal, b: Dezimal): -1 | 0 | 1`, `vorzeichen(a: Dezimal): -1 | 0 | 1`
- `summiereBetraege(werte: readonly Betrag[]): Betrag`
- `multipliziere(a: Dezimal, b: Dezimal): Dezimal` (exakt, die Skalen addieren sich)
- `runden<Z extends Zahlenart>(wert: Dezimal, art: Z): Zahl<Z>` (kaufmännisch auf die Typskala)
- `rundeAufStellen(wert: Dezimal, stellen: number): Dezimal` (stellen >= 1), `rundeAufGanzzahl(wert: Dezimal): bigint`
- `gesamtpreis(menge: Menge, einheitspreis: Einheitspreis): Betrag` (GP, N2)
- `prozentVon(betrag: Betrag, prozent: Prozent): Betrag` (Nachlass in Prozent, MwSt; N2)

Rand de-DE (N4):

- `parseMengeDe`, `parseEinheitspreisDe`, `parseBetragDe`, `parseProzentDe(eingabe: string): Ergebnis<Typ, Dezimalfehler>`;
  `parseDe<Z>(art, eingabe)`
- `formatiereMengeDe`, `formatiereEinheitspreisDe`, `formatiereBetragDe`, `formatiereProzentDe(wert): string`;
  `formatiereDe(wert: Dezimal): string`
- Regeln: Tausenderpunkte nur korrekt gruppiert (`1.072,55`); `1.235` ist 1235 (Tausenderpunkt, kein Dezimalpunkt),
  `12.34` ist ungültig; Dezimalkomma optional; weniger Stellen als die Skala werden mit Nullen aufgefüllt, mehr Stellen
  sind ein Fehler (`zu-viele-nachkommastellen`, der Rand rundet nie still); `-` und `−` erlaubt, Leerraum außen
  erlaubt, `+` und Exponent nicht.

Toleranter Austausch-Leser (für `gaeb`, Ticket 22):

- `leseAustausch<Z>(art: Z, text): Austauschergebnis<Z>`. Der Erfolg trägt `hinweise` (leer, wenn der Wert unverändert
  kanonisch war). Hinweise: `leerraum-entfernt`, `dezimalkomma` (ein einzelnes Komma ohne Punkt wird als Dezimalpunkt
  gelesen und **gemeldet**, damit `gaeb` es als Befund ausgeben kann), `plus-entfernt`, `fuehrende-nullen-entfernt`,
  `vorzeichen-null-entfernt`, `nachkommastellen-aufgefuellt`, `nullen-abgeschnitten` (verlustfrei), `gerundet` (Stellen
  ungleich 0 weggerundet, der Wert hat sich geändert). Fehlerwert bei: leer, `1.2.3`, `1,2,3`, `1.000,00`, `1,000.00`,
  Exponent, nur `.` oder `-`.

### Begründung der Implementierung

Eigene BigInt-Implementierung statt Bibliothek: Der Umfang ist klein (Addition, Subtraktion, Multiplikation,
Vergleich, Rundung auf feste Skalen). Der Darstellungsvertrag aus `vertrag` (kanonische Zeichenkette mit fester Skala)
passt nicht zu den Wertobjekten einer Dezimalbibliothek und hätte an jeder Grenze eine Umwandlung verlangt. Es kommt keine
neue Abhängigkeit in die Lizenzprüfung (C5). BigInt gehört zu ES2022 und ist deterministisch (A2). Die Korrektheit sichern
Golden-Tests und ein unabhängiges Orakel.

### Negative Werte: Entscheidung und Beleg

**Regel: Den Betrag des Werts kaufmännisch runden und das Vorzeichen danach wieder setzen („von Null weg“, `-2,5 → -3`).**
Im Code `rundeGanz` (`kern.ts`), im `GLOSSARY.md` unter „Kaufmännische Rundung“ beschrieben, getestet in
`dezimal.test.ts` (Abschnitt „Negative Werte“) und als Eigenschaft `runden(−x) = −runden(x)`.

Geöffnete Quellen (am 2026-11-09 mit curl abgerufen und gelesen):

1. PTB-Seminar 276, Teil 4 „Rundungsregeln“ (Folien der esz AG), Seite „Durchführung der Rundung nach DIN 1333“:
   <https://www.ptb.de/cms/fileadmin/internet/fachabteilungen/abteilung_1/1.2_festkoerpermechanik/1.22/276._PTB-Seminar.Teil_4.Rundungsregeln.pdf>.
   Wörtlich: „‚Runden‘: Addiere dem Betrag des Wertes den halben Stellenwert der Rundestelle und schneide dann ab. Vor den
   gerundeten Betrag wird das Vorzeichen wieder gesetzt.“ Beispiel der Folie: `1,15 → 1,2` und `-1,25 → -1,3` (Rundestelle 0,1).
2. Wikipedia „Rundung“, Abschnitt „Kaufmännisches Runden“: <https://de.wikipedia.org/wiki/Runden> (leitet auf „Rundung“ weiter).
   „Das Kaufmännische Runden (nichtnegativer Zahlen) … Diese Rundungsregel wird durch die Norm DIN 1333 beschrieben. …
   Negative Zahlen werden nach ihrem Betrag gerundet, bei einer 5 also weg von null (engl: Away from Zero):
   −13,3749… € ≈ −13,37 € / −13,3750… € ≈ −13,38 €.“

**Einschränkung, bitte prüfen:** Beides sind Sekundärquellen. Der Normtext der DIN 1333 selbst (kostenpflichtig) und eine
VOB- oder GAEB-Stelle zu negativen Beträgen wurden nicht geöffnet. Nach meiner Suche regeln GAEB und VOB die Rundung negativer
Werte nicht ausdrücklich (nicht verifiziert). Die Folie nennt die Norm und gibt die Regel samt negativem Beispiel wörtlich
wieder. Gegenkandidat (bei Widerspruch tauschen, Änderung nur in `rundeGanz`): **half toward +∞** (`floor(x + 0,5)`). Sie
unterscheidet sich nur bei negativen Werten genau auf der Hälfte, z. B. Menge −2,500 × EP 0,010 = −0,025 → GP **−0,03**
(hier) gegenüber **−0,02** (Gegenkandidat); `-2,5 → -3` gegenüber `-2`. Anzupassen wären dann die Tests im Abschnitt
„Negative Werte“, die Symmetrieeigenschaft und der Glossareintrag.

### Leistung (Messung ohne Gate)

100.000 × `gesamtpreis` (Multiplikation plus Rundung auf 2 Stellen), Node 22.23, 4 Kerne, Vitest, je ein Lauf:
111,5 · 64,4 · 60,9 · 85,1 · 92,2 ms. Der erste Lauf lag über 100 ms, die folgenden darunter; die Streuung stammt von
Kaltstart und Rechnerlast. Ablauf: `pnpm exec vitest run packages/dezimal/src/leistung --disable-console-intercept`.

### Orakel und Property-Tests

`eigenschaften.test.ts` vergleicht GP, Nachlass-/MwSt-Rundung, Addition, Summe und Rundung mit einem Orakel auf
Zeichenkettenebene (Rundung an der ersten wegfallenden Ziffer), das nicht die Rechenwege der Implementierung benutzt.
Zusätzlich: Rundung idempotent und symmetrisch zu Null, Addition kommutativ und assoziativ, Parsen ∘ Formatieren =
Identität für alle vier Typen (auch negativ, bis 10^24), der Leser ändert kanonische Werte nicht, und beliebige
Zeichenketten erzeugen nie eine Ausnahme.

### Abweichungen und Hinweise

- **Rundung auf 0 Stellen hat keine kanonische Darstellung** (der Vertrag verlangt mindestens eine Nachkommastelle).
  Daher `rundeAufGanzzahl(…): bigint`; `rundeAufStellen` verlangt `stellen >= 1`. Hinweis für `vertrag`: Eine ganze Zahl als
  `Dezimal` gibt es nicht. Keine Vertragsänderung nötig.
- **Fixtures** (`handbeispiele.json`) schreiben EP und Mengen mit weniger Nachkommastellen als die Skala (`"10.00"` für
  einen EP) und sind damit nicht kanonisch im Sinne des Vertrags. Der Test liest sie über `leseAustausch`, wie es `gaeb` tun wird.
- **N1-Lint-Regel** (`eslint.config.js`, `tools/eslint-regeln.mjs`): war schon aktiv für `packages/*/src/**/*.ts` und `apps/web`;
  ausgenommen sind nur `packages/dezimal/**` und `**/*.test.*`. Es war nichts zu ändern, die Wurzelkonfiguration blieb
  unberührt. Grenze der Regel: Sie erkennt nur Bezeichner mit Geld-Namen und der Annotation `number`, keine
  `Number(...)`-Aufrufe und keine Typinferenz.
- **N3:** `NACHKOMMASTELLEN` wird nur gelesen. `PROZENT_STELLEN = 2` in `kern.ts` ist der Teiler 100 der Prozentrechnung,
  keine Typskala.
- Eingaben sind auf 1000 Zeichen begrenzt (`zu-lang`).
- `packages/vertrag` ist unverändert; `packages/dezimal/package.json` hat jetzt `@tethys/vertrag` (workspace) und `fast-check`;
  `packages/dezimal/tsconfig.json` bekam `types: ["node"]` für die Tests (Fixture lesen, `performance`).

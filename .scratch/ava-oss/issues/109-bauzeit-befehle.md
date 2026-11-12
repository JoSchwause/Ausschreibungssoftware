# 109: X2: `bauzeit`: Befehle und Vertragstypen

Status: done-by-agent
Type: task
Welle: 6 · Strang: X2 · Paket: `packages/bauzeit`
Blocked by: 97, 102 (gleiches Paket)
Modell: opus
Regeln: A5, A6, Q4, U5, D-57
Herkunft: Ticket 102 (Rechenkern mit eigenen Typen), Ticket 97 (Vertragstypen)

## What to build

1. **Umstellung auf die Vertragstypen** (`Bauzeitenplan`, `Vorgang`, `Anordnungsbeziehung`, `Arbeitskalender`,
   `Vorgangstermine`, `Terminplan` aus v1.6); die eigenen Typen aus Ticket 102 entfallen oder werden Aliase mit Kommentar.
   Golden- und Property-Tests bleiben unverändert grün.
2. **Befehle** (`BauzeitenplanBefehl`, v1.6) mit `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`: Prüfungen der
   Form (Kennungen eindeutig, Eltern vorhanden und ohne Ring, Dauer und Abstand ganzzahlig, Dauer ≥ 0, Daten gültig) als
   Fehler; fachliche Probleme (Zyklus über Anordnungsbeziehungen, unbekannter Vorgänger) bleiben Befunde der Terminrechnung
   (U5). Lesart von „Vorgang entfernen“ wie in v1.6 festgelegt.
3. **Fortschritt aus dem Leistungsstand** (wenn Zeit bleibt): zu einem Vorgang mit Bezug auf Knoten eines Auftrags-LV der Anteil
   Σ GP des `Leistungsstand`s / Σ GP der bezogenen Positionen in Prozent (2 Stellen) als Vorschlag für `ist.fortschritt`.
4. **Leistung (Q4):** Befehl und Umkehrung an einem Plan mit 1.000 Vorgängen messen und im Ticket nennen (Speicherseite misst
   Ticket 106).

Aus Ticket 97 und dem Review (D-64, D-66): Das Ergebnis heißt `Bauzeitenplanergebnis` (nicht „Terminplan“), je Vorgang
`vorgangId`; ein unbekannter Vorgänger ist ein Fehler des Ausführers, kein Befund; „Vorgang entfernen“ nimmt Teilbaum und
Beziehungen auf ihn mit; ein Befund zu einer Beziehung trägt `pfad: '/vorgaenge[n]/vorgaenger[m]'`.

## Grenzen

- Nur `packages/bauzeit`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Befehle, Umkehrung und Fehler getestet; bestehende Tests des Pakets grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Ergebnis (Branch `welle-6/109-bauzeit-befehle`, Basis `integration/welle-6`)

Alles in `packages/bauzeit/src/`. Neu: `bauzeitenplan-befehle.ts` (Ausführer, Anwenden, Umkehren), `fortschritt.ts`
(`fortschrittVorschlagen`), Tests `bauzeitenplan-vertrag.test.ts`, `bauzeitenplan-befehle.test.ts`,
`bauzeitenplan-befehle-eigenschaften.test.ts`, `bauzeitenplan-befehle-leistung.test.ts`, `fortschritt.test.ts`. Geändert:
`bauzeitenplan.ts` (Vertragstypen, `Pruefbefund`, `vorgangId`, `BAUZEITBEFUNDE`, Pfad an Beziehungsbefunden), `kalender.ts`,
`feiertage.ts`, `datum.ts`, `zeitachse.ts` (Typen aus `vertrag`), `annahmen.ts` (Lesart `fortschritt`), `index.ts`. Die
bestehenden Tests sind nur mechanisch angepasst (Kennungen als `VorgangId`, `nummer`/`bezug: null`, `vorgangId` statt `id`,
Befundort statt `vorgaengerId`/`beteiligte`); kein Sollwert der Golden- und Property-Tests geändert. 129 → 223 Tests in 14
Dateien.

1. **Vertragstypen.** `bauzeitenplanBerechnen` nimmt den gespeicherten `Bauzeitenplan` (`Bauzeitenplaneingabe` = `Pick` davon)
   und liefert das `Bauzeitenplanergebnis` des Vertrags (je Vorgang `vorgangId`). Geprüft gegen das Vertragsbeispiel
   (`beispielBauzeitenplanergebnis`, gleich) und gegen `fixtures/bauzeit.json` (Sollwerte samt Gegenprobe ohne Land, gleich; die
   Fixture nennt den Vorgang noch `id`, der Test bildet auf `vorgangId` ab). Befunde sind `Pruefbefund` mit Quelle
   `terminrechnung`; der Typ `Bauzeitbefund` entfällt, die Codeliste `Bauzeitbefundcode` bleibt (D-97.11).
2. **Befehle.** `bauzeitenplanBefehlAusfuehren`, `bauzeitenplanChangeSetAnwenden`, `bauzeitenplanChangeSetUmkehren` nach den
   Signaturen von v1.6; die Vertragsbeispiele (`beispielVorgangSetzen`, `beispielChangeSetVorgangEntfernen`, Anlegen, Kopf,
   Löschen) kommen genau heraus. Lage nach D-97.9 (Dokumentreihenfolge, `nach`, Teilbaum zieht mit), Entfernen mit Teilbaum und
   allen Beziehungen darauf, unbekannter Vorgänger = `ungueltige-eingabe` (D-64). Property (300 Folgen bis 30 Befehle, per
   Mutation geprüft): jedes ChangeSet umkehrbar, Undo der ganzen Folge ergibt den Anfang, jeder Stand geht als ganzer Plan durch
   `BauzeitenplanAnlegen`, die Terminrechnung findet keinen Befund, den der Ausführer hätte abweisen müssen.
3. **Fortschritt** (`fortschrittVorschlagen(bezug, auftragsLv, leistungsstand)`), siehe D-109.7.
4. **Leistung (Q4)**, Plan mit 1.000 Vorgängen (20 Sammelvorgänge × 49), 2.000 Beziehungen, Median CPU von fünf warmen Läufen,
   Budget 16 ms je Befehl (Ausführen + Anwenden) und je Umkehrung (Umkehren + Anwenden), D-109.8. Gemessen allein (Last ≈ 32 auf
   4 Kernen): `BauzeitenplanAnlegen` (ganzer Plan, alle Prüfungen) 4,6 ms; `VorgangSetzen` an der Stelle 0,17 ms;
   `VorgangSetzen` Sammelvorgang mit 49 Kindern verschieben 0,11 ms; `VorgangEntfernen` Sammelvorgang mit 49 Kindern 0,24 ms;
   Umkehrung je ≤ 0,003 ms (Tausch, kein Kopieren). Terminrechnung desselben Umfangs (Ticket 102): 19,6 ms (Budget 100 ms).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-109.1** Nähte der Tests? **(1) `bauzeitenplanBerechnen`** an den Vertragstypen (Vertragsbeispiel, Fixture 112, Befundform;
  dazu die bestehenden Golden-, Property- und Befundtests), **(2) `bauzeitenplanBefehlAusfuehren`/`…Anwenden`/`…Umkehren`**
  (Vertragsbeispiele, Lage, Fehler je Feld, Property über Befehlsfolgen), **(3) `fortschrittVorschlagen`**, **(4) Leistung.**
  Grund: Das ist die öffentliche Fläche, die 106, 113 und 118 benutzen; Teilbaum- und Gliederungshilfen nur durch diese Nähte.
- **D-109.2** Daten im Ergebnis: **`Datum` bleibt.** `Bauzeitenplanergebnis`, `Vorgangsergebnis` und `Vorgangstermine` in
  `bauzeit` erweitern die Vertragstypen und verengen die Daten auf `Datum` (D-102.5); sie sind dem Vertragstyp zuweisbar
  (Typtest). Grund: Die App gibt Beginn und Ende ohne erneute Prüfung an `balkenlage`/`tagesindex`. Alternative: genau der
  Vertragstyp (dann `datumPruefen` in der App).
- **D-109.3** Schwere je Code (`BAUZEITBEFUNDE`): **`fehler`**, wo eine Eingabe die Form verletzt (der Ausführer ließe sie nicht
  zu; kommt nur aus einer Datei oder einem älteren Stand) oder ein Vorgang ohne Termine bleibt (`zyklus`,
  `termin-ausserhalb-kalender`); **`warnung`** für `terminvorgabe-an-sammelvorgang`, `beziehung-an-sammelvorgang` (v1 rechnet sie
  bewusst nicht), `vorgaenger-ohne-termine` (Folge, die Ursache ist schon gemeldet), `ist-ungueltig` (nur Angezeigtes) und
  `kritische-wege-gekuerzt`.
- **D-109.4** Ort je Befund (Lesart an `Befundort`, D-97.11, D-66): Plan und Kalender nur `feld` (`projektbeginn`, `kalender`);
  je Vorgang `vorgangId` und `feld` (`id` bei `id-doppelt`, `elternId`, `dauer`, `fruehesterBeginn`, `ist`); `zyklus` und
  `eltern-zyklus` je Beteiligtem ein Befund (`vorgaenger` bzw. `elternId`), die Meldung nennt den ganzen Kreis; ein Befund zu
  genau einer Beziehung (`vorgaenger-unbekannt`, `anordnungsart-unbekannt`, `abstand-ungueltig`, `beziehung-an-sammelvorgang`,
  `vorgaenger-ohne-termine`) trägt den Nachfolger, `feld: 'vorgaenger'` und `pfad: '/vorgaenge[n]/vorgaenger[m]'` (ab 1, D-66;
  die Lesart steht im Nachtrag von 97, der beim Merge von 109 noch nicht in `integration/welle-6` war);
  `termin-ausserhalb-kalender` am Vorgang, aus einer Terminvorgabe mit `feld: 'fruehesterBeginn'`, ohne Arbeitstag ab dem
  Projektbeginn mit `feld: 'projektbeginn'`; `kritische-wege-gekuerzt` ohne Ort. Der Vorgänger steht sonst nur in der Meldung.
- **D-109.5** Eigene Typen aus 102: **entfallen**; `index.ts` reicht die Vertragstypen `Anordnungsart`, `Anordnungsbeziehung`,
  `Arbeitskalender`, `Bundesland`, `Isttermine`, `Vorgang`, `VorgangId`, `Vorgangsart`, `Wochentag` als Aliase weiter (Kommentar
  dort), `Bauzeitenplaneingabe` bleibt als `Pick<Bauzeitenplan, …>` (D-102.12: Eingabe nicht umbenannt).
- **D-109.6** Formprüfungen des Ausführers (alle `ungueltige-eingabe` mit `feld`, außer wo genannt):
  - Kopf (`BauzeitenplankopfSetzen`, Anlegen): `name` nicht leer (nur Leerraum gilt als leer), `projektbeginn` ein Datum,
    `kalender`: mindestens ein Arbeitstag, nur 1–7, keiner doppelt; Land eines der 16 oder `null`; freie Tage gültige Daten,
    keiner doppelt. Beide Listen werden geordnet gespeichert (Lesart an `Arbeitskalender`).
  - Vorgang: `id` nicht leer; `nummer` `null` oder nicht leer; `bezeichnung` nicht leer; `dauer` ganz, 0 bis
    `HOECHSTWERT_ARBEITSTAGE`; `fruehesterBeginn` ein Datum; je Beziehung (`vorgaenger`) Vorgänger nicht leer und nicht er
    selbst, bekannte Art, Abstand ganz und höchstens `HOECHSTWERT_ARBEITSTAGE` im Betrag, das Paar (Vorgänger, Art) höchstens
    einmal; `bezug` mit bekannter Art, Kennung, `knotenIds` `null` oder nicht leer und ohne Doppelte; `ist` nicht drei `null`,
    Daten gültig, Fortschritt Prozent mit 2 Stellen von 0,00 bis 100,00. Ist-Ende vor oder ohne Ist-Beginn bleibt Befund.
  - Anlegen: dazu `id`, `projektId` nicht leer; Kennungen eindeutig (`id`); `eltern-unbekannt` (`elternId`); Ring in der
    Gliederung `zyklus` (`elternId`); Dokumentreihenfolge (`vorgaenge`); jeder Vorgänger im Plan (`vorgaenger`; er darf weiter
    hinten stehen).
  - `VorgangSetzen`: Elternteil im Plan ohne den eigenen Teilbaum, sonst `zyklus` (im eigenen Teilbaum) oder `eltern-unbekannt`
    (`elternId`); `nach` ein anderes Geschwister mit derselben `elternId` (`nach`); Vorgänger stehen nach dem Befehl im Plan.
  - `VorgangEntfernen` ohne Vorgang: `knoten-unbekannt` mit `feld: 'vorgangId'` (`Befehlsfehler.knotenId` ist eine Kennung des
    LV und passt nicht). Zustand passt nicht zum Befehl: `befehl-nicht-zustaendig` (wie Kern und `kosten`).
  - Unveränderte Vorgänge bleiben dieselben Objekte im neuen Plan (für einen späteren Vergleich in `speicher`).
- **D-109.7** Fortschritt: **`fortschrittVorschlagen(bezug, auftragsLv: AuftragsLvZustand, leistungsstand): Prozent | null`**,
  kein Befehl (die App bietet den Wert an und setzt ihn per `VorgangSetzen`). Bezogen sind bei `knotenIds: null` alle Positionen,
  sonst die genannten und alle unter genannten Gliederungen (unbekannte Knoten zählen nicht, schwacher Verweis). Beide Summen
  über dieselben Positionen: die bezogenen mit `gehtInSummeEin` und GP; Bedarf ohne Gesamtbetrag und Wahl zählen nicht (F4); eine
  Position ohne Zeile im Leistungsstand zählt 0,00. Anteil = Σ `gp` × 100 / Σ GP, kaufmännisch auf 2 Stellen (`dividiere`),
  begrenzt auf 0,00 bis 100,00 (Mehrleistung, die Formprüfung von `ist.fortschritt`). `null` ohne Bezug, bei Bezug auf ein
  Ausschreibungs-LV oder ein anderes Auftrags-LV, bei Soll-Summe ≤ 0. Lesart als Text in `BAUZEIT_ANNAHMEN.fortschritt`.
- **D-109.8** Budget der Befehle: **16 ms CPU** je Befehl samt Anwenden und je Umkehrung samt Anwenden bei 1.000 Vorgängen (Q4:
  Einzeländerung unter 16 ms; die Terminrechnung danach hat ihr eigenes Budget aus 102). Der Test misst auch das Anlegen eines
  ganzen Plans mit allen Prüfungen.

### Offene Fragen

- Die Fixture `fixtures/bauzeit.json` (Ticket 112) nennt in `sollwerte.vorgaenge` noch `id` statt `vorgangId`; der Test bildet ab.
  Angleichen wäre eine Zeile im Fixture-Ticket (nicht dieses Paket).
- Schwere der Befunde (D-109.3) und Ort (D-109.4) sind Vorschläge; `ausgabe` (113) und App (118) lesen sie.

### Prüfung (nach `git merge integration/welle-6`, Merge `97d4885`, Stand `064aa25`)

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`: grün (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean Room).
- `pnpm typecheck`: grün.
- `pnpm test`: Vitest 246 Dateien grün, 1 übersprungen; 3.315 Tests grün, 3 übersprungen, **9 rot, alle Leistungsbudgets
  fremder Pakete** unter Volllast der parallelen Agenten (Last ≈ 33 auf 4 Kernen): `gaeb` angebot/lesen/schreiben, `kern`
  k9-leistung, lv-pruefung-fixtures, summen-leistung, `speicher` aufmass-leistung, `vergabe` leistung, `apps/web`
  abrechnung/leistung. Je Datei allein wiederholt (Last weiter ≈ 32): 6 grün; weiter knapp rot: `kern` k9 (Median 17,6 ms bei
  16 ms), `vergabe` Preisspiegel (1.074 ms bei 1.000 ms), `apps/web` Undo Aufmaßblatt (Median 131,7 ms bei 100 ms). Keines
  dieser Pakete importiert `bauzeit`; kein Budget angefasst. Alle `bauzeit`-Tests grün (223), auch die Budgets.
- `node --test "fixtures/*.test.mjs"` einzeln: 53 von 53 grün.

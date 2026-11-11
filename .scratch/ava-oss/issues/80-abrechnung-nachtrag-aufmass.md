# 80: A1+A2: Paket `abrechnung`: Nachtrag übernehmen, Aufmaß-Befehle

Status: resolved
Type: task
Welle: 5 · Strang: A1, A2 · Paket: `packages/abrechnung` (neu; Workspace-Dateien; `tools/boundaries.mjs` kennt es schon)
Blocked by: 70
Regeln: A2, A3, A5, A6, A7, F1, F4, N1–N3, U5, Q1, Q5, D-21, D-22, D-35, D-36
Herkunft: `plan.md` §2 A1, A2; `vertrag` v1.4 (Ticket 70, Comments „Folgearbeit Abrechnung“)

## What to build

Neues reines Paket `packages/abrechnung` (A2; darf `vertrag`, `dezimal`, `kern` importieren, A3). Zwei Teile:

1. **Nachtrag übernehmen (D-35).** `nachtragUebernehmen(auftragsLv: AuftragsLvZustand, nachtragsLv: LvZustand, angebot:
   Angebot, neueIds)` → `{ befehl: NachtragUebernehmen; warnungen }` oder Fehler. Regeln wörtlich aus D-35: eine neue
   Gliederung „Nachtrag <nummer>“ auf oberster Ebene (Los, wenn dort Lose stehen, sonst Titel; F1) mit der nächsten freien OZ
   der obersten Stufe (Maske des Auftrags-LV; kern-Hilfen für OZ nutzen), darunter der Baum des Nachtrags-LV mit
   unveränderten PositionIds; EP und EPA aus dem Angebot; nicht angeboten → EP `null` mit Warnung; Wahl-Alternativen
   entfallen mit Warnung (Grundposition bleibt); Nachlass des Angebots wird mit Warnung ignoriert; Zuschlagspositionen mit
   dem Zuschlagssatz des Angebots (wie D-21). Fehler: mehr als 5 Ebenen, MwSt-Satz des Nachtrags-LV ≠ Auftrags-LV,
   PositionId schon im Auftrags-LV, Nachtragsangaben fehlen oder gehören zu einem anderen Auftrags-LV, Angebot gehört nicht
   zum Nachtrags-LV oder nicht zum Bieter des Auftrags. Dazu `nachtragsbefunde(auftragsLv, nachtragsLvs)`: „beauftragt,
   aber Positionen fehlen im Auftrags-LV“ und „Positionen übernommen, Status nicht beauftragt“ (D-35).
2. **Aufmaß (D-36 (1)).** `aufmassBefehlAusfuehren`, `aufmassChangeSetAnwenden`, `aufmassChangeSetUmkehren` nach den
   Signaturen aus v1.4: Formprüfungen (Nummer ≥ 1, eine Zeile je Position, Menge kanonisch mit 3 Stellen, ein Ansatz mit
   Fehler kommt mit `menge: null`, Lesarten wie `MengenansatzSetzen`, D-22), ChangeSet als ganzes Aggregat. Dazu
   `aufmassPruefen(aufmass, auftragsLv)` → Befunde (Position unbekannt, Kennung ist keine Position, Position ohne EP).
   Die Nummer des nächsten Blatts: `naechsteAufmassnummer(aufmasse)`.

Soll/Ist, Leistungsstand und Rechnungsprüfung folgen in Ticket 81 (gleiches Paket, danach).

Neue Begriffe zuerst ins `GLOSSARY.md` (L2), soweit Ticket 70 sie nicht schon eingetragen hat.

## Grenzen

- Nur `packages/abrechnung` und Workspace-Dateien. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Golden-Tests `nachtragUebernehmen` an `typisch` (Auftrags-LV aus Bieter-Angebot) mit einem kleinen Nachtrags-LV (2
      Positionen, eine nicht angeboten): Knoten, OZ, EP, Warnungen; jeder Fehlerfall ein Test
- [x] Property-Test: anwenden ∘ umkehren = Identität für jeden Aufmaß-Befehl; Ergebnis von `nachtragUebernehmen` wird vom
      Kern (`auftragsLvBefehlAusfuehren`, Ticket 71) angenommen, sobald 71 gemergt ist (bis dahin Test über die Baumregeln
      des Kerns: `baumfehler`)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- `nachtragUebernehmen` braucht den Bieter des Auftrags: zusätzlicher Parameter `auftragsangebot: AngebotKopf` (oder
  `bieterId`), sonst ist der Fehler „Angebot nicht vom Bieter des Auftrags“ nicht prüfbar.
- Nachtrags-LV mit Losen (F1: ein Los steht nur auf oberster Stufe): entscheiden – Fehler, oder Los wird Titel mit gleicher
  Kennung – und als `D-80.<n>` begründen.

## Comments

### Ergebnis (Branch `welle-5/80-abrechnung`, Basis `integration/welle-5`)

Neues Paket `packages/abrechnung` (`package.json`, `tsconfig.json`, Lockfile-Eintrag; `tools/boundaries.mjs` unverändert:
`vertrag`, `dezimal`, `kern`), dazu `GLOSSARY.md` (Aufmaßbefund; „Nachtrag übernehmen“ mit Nachtragswarnung und
Nachtragsbefund). Keine Zeile außerhalb von Paket, Lockfile und Glossar; kein Vertragswunsch.

Dateien: `nachtrag-uebernehmen.ts`, `nachtragsbefunde.ts`, `aufmass-befehle.ts`, `aufmass-changeset.ts`,
`aufmass-pruefen.ts`, `form.ts` (Formprüfungen, auch für die Rechnungs-Ausführer in Ticket 81: `nein`, `nummerFehler`,
`datumFehler`, `kennungFehler`, `ansatzFehler`), `testhilfen.ts` (Auftrags-LV des Tors M4 nach D-21 aus `typisch` und Bieter
B, Nachtrag N01, Blätter aus `typisch-abrechnung.json`; für Ticket 81 weiter nutzbar), `index.ts`.

Seams (öffentliche Schnittstelle, an der getestet wird): `nachtragUebernehmen`, `nachtragsbefunde`, `aufmassBefehlAusfuehren`,
`aufmassChangeSetAnwenden`/`…Umkehren`, `aufmassPruefen`, `naechsteAufmassnummer`; für die Annahme durch den Kern
`baumfehler`, `summenBerechnen` und `auftragsLvBefehlAusfuehren` aus `kern`.

Tests (57, Vitest): Golden `nachtragUebernehmen` an `typisch` mit Nachtrag N01 gegen `uebernahme.knoten` und die Summen der
M4-Fixture (Netto 59.803,77, Brutto 69.031,50; Titelsummen), nicht angebotene Position (EP `null`, Warnung, Netto 59.281,02),
Nachlass des Angebots, jeder Fehlerfall einzeln (8 Fälle, die `IdQuelle` wird dabei nie gerufen), kleine Bäume von Hand
(Alternativen, Zuschlagsposition mit Satz des Angebots, Bezüge, Hinweistext, Lose, OZ außerhalb der Maske, keine freie
OZ); Property-Test über zufällige Auftrags- und Nachtrags-LVs (Baumregeln des Kerns, F1, jede Kennung genau einmal);
`nachtragsbefunde` (6); Aufmaß: Golden an Blatt 1 und der Korrektur der M4-Fixture, Formprüfungen, Property-Test
anwenden ∘ umkehren = Identität für jeden Befehl (500 Läufe), `aufmassPruefen` (die M4-Blätter ohne Befund; jeder
Befundcode), `naechsteAufmassnummer`.

**Ticket 71:** Bis zum Merge von 71 rief eine Hilfe `auftragsLvBefehlAusfuehren` und nahm die Abweisung „zuständig: Ticket
71“ (mechanische Zeile aus Ticket 70) hin, geprüft wurden dann nur Baumregeln und Summen; eine Probe mit
`welle-5/71-kern-v1.4` (`e984e9a`, nur zur Probe gemergt und verworfen) war grün. 71 ist inzwischen in `integration/welle-5`
(`c17de09`); nach dem Merge führen die Tests den Befehl im Kern aus und wenden ihn an (`imKernUebernehmen` in
`testhilfen.ts`, jede Abweisung lässt den Test scheitern): Golden (Summen des ChangeSets und des Zustands danach = Fixture),
zweite Übernahme, Property-Test (Summen des Kerns danach = volle Neuberechnung), die Auftrags-LVs „nach der Übernahme“ in
den Tests von `aufmassPruefen` und `nachtragsbefunde`. Kein `skip`, kein `todo`.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-80.1** OZ der übernommenen Knoten? **Die neue Gliederung bekommt den OZ-Vorschlag des Kerns für einen neuen Knoten am
  Ende der Wurzel (`ozVorschlag`, D-42.3: Vorgänger + 1); jeder Knoten des Nachtrags behält seine OZ mit dieser OZ und dem
  Trennzeichen der Maske des Auftrags-LV davor (`01` → `04.01`, `01.0010` → `04.01.0010`).** Eine OZ, die fehlt oder nicht
  zur Maske passt (`ozFehler` des Kerns), kommt trotzdem so (U5) und steht in einer Warnung `oz-unpassend`; gibt es keine
  freie OZ der obersten Stufe, bleibt der ganze Teilbaum ohne OZ (Warnung). Grund: D-85.2 und `beispielNachtragUebernehmen`
  lesen es so (Hinweis des Orchestrators); die Nummern des Nachtragsangebots und eines X31 des Auftragnehmers bleiben
  wiedererkennbar; das Auftrags-LV hat keinen Befehl zum Umnummerieren, also sind die OZ endgültig. `ozVorschlag` nimmt
  einen `LvZustand`: `nachtragUebernehmen` reicht ihm eine Leseansicht des Auftrags-LV mit derselben Kennung (eine Umdeutung
  der Marke nur zum Lesen, nie in Befehl oder ChangeSet). Sauberer wäre ein OZ-Vorschlag des Kerns für das Auftrags-LV
  (Vorschlag für eine spätere Kern-Arbeit, nicht nötig für 80).
- **D-80.2** Nachtrags-LV mit Losen? **Ein Los wird Titel mit derselben Kennung, OZ und Kurztext, mit Warnung
  `los-wird-titel`; kein Fehler.** Grund: Unter der neuen Gliederung darf kein Los stehen (F1, `LOS_ANNAHME`); die Stufenzahl
  ändert sich nicht (ein Los zählt als Stufe wie ein Titel); Kennungen der Gliederungen bleiben (D-70.6); ein Fehler zwänge den
  Nutzer, ein beauftragtes LV umzubauen (U5). Die neue Gliederung selbst ist ein Los, wenn oben ein Los steht oder die Maske
  eine Los-Stufe hat (F1), sonst ein Titel.
- **D-80.3** Signatur? **`nachtragUebernehmen(auftragsLv, nachtragsLv, angebot, auftragsangebot, neueIds)` mit
  `auftragsangebot: Pick<AngebotKopf, 'id' | 'bieterId'>` (Review D-42) und `neueIds: Pick<IdQuelle, 'los' | 'titel'>` (wie
  `KopieIdQuelle`).** `auftragsangebot.id` muss `auftragsLv.angebotId` sein (sonst wäre der Bieter beliebig). Die `IdQuelle`
  wird genau einmal und erst nach allen Prüfungen gerufen. Fehler (`Befehlsfehler`, Prüfreihenfolge): keine
  Nachtragsangaben, anderes Auftrags-LV, anderes Projekt (zusätzlich; billig und sonst unentdeckt), Auftragsangebot nicht das
  beauftragte, Angebot nicht zum Nachtrags-LV, anderer Bieter, anderer MwSt-Satz (`ungueltige-eingabe` mit `feld`), dann je
  Knoten in Dokumentreihenfolge Kennung schon im Auftrags-LV (`id-vergeben`, sperrt die zweite Übernahme) und mehr als 5
  Ebenen samt neuer Gliederung (`ebene-ueberschritten`) – dieselben Codes, die der Kern meldet.
- **D-80.4** Was prüft der Aufmaß-Ausführer an der Form? **Kennungen nicht leer, Nummer ganze Zahl ≥ 1, Bezeichnung Text,
  Datum `null` oder `JJJJ-MM-TT` mit einem Tag des Kalenders, Zeilen als Liste, eine Zeile je Position, Menge kanonisch mit 3
  Stellen (negativ erlaubt), Mengenansatz in der Form des Kerns** (alles `ungueltige-eingabe` mit `feld`, bei Zeilen mit
  `knotenId`). Grund: Befehle kommen auch aus Protokoll und Datei; das Datum nennt der Vertrag als `JJJJ-MM-TT`. Die Form des
  Ansatzes ist die des Kerns (`mengenansatzFehler`), dort nicht ausgeführt, darum hier nachgebaut (`form.ts`).
- **D-80.5** Form des Blatts im ChangeSet? **Kanonisch: genau die Vertragsfelder in Vertragsreihenfolge, Ansatzzeilen kopiert,
  `[]` → `null`.** Ein Befehl ohne Wirkung (gleicher Kopf) liefert ein ChangeSet mit gleichem `vorher` und `nachher` (bei
  ganzen Aggregaten gibt es kein leeres ChangeSet). `aufmassChangeSetAnwenden` prüft Anlegen/Ändern/Löschen gegen den
  Zustand und die Kennung (wirft bei Programmfehlern wie `angebotChangeSetAnwenden`), vergleicht aber `vorher` nicht inhaltlich
  mit dem Zustand (Kosten je Undo-Schritt, D-45).
- **D-80.6** Befunde von `aufmassPruefen`? **`position-unbekannt`, `keine-position`, `zuschlagsposition` (Folgearbeit aus
  Ticket 70: zählt nicht), `ohne-einheitspreis`, `menge-fehlt` je Zeile, dazu `auftrags-lv-abweichend` vorweg; eigener Typ
  `Aufmassbefund`, nicht `Pruefbefund`** (dessen `quelle` ist eine geschlossene Liste im Vertrag). Ticket 81 kann daraus
  ableiten, welche Zeilen zählen: die ohne einen der ersten drei Befunde und mit Menge.
- **D-80.7** `nachtragsbefunde` erkennt „übernommen“ an den PositionIds (die Gliederung trägt keine Herkunft, Offene Typfrage
  13 aus Ticket 70); Wahl-Alternativen zählen nie als fehlend. Eingabe: alle LVs des Projekts als `LvZustand` (nur die mit
  Nachtragsangaben zu diesem Auftrags-LV zählen). Für die Liste ohne ganze LVs (D-43) reicht das nicht; die App ruft es nur
  für die Nachtragsliste des Auftrags-LV.
- **D-80.8** Zuschlagsposition im Nachtrag: **wie D-21**: Satz des Angebots; angeboten ohne Satz → Satz `null`, EP und EPA des
  Angebots (Altform), Warnung `zuschlagssatz-fehlt`; Listenbezüge auf Positionen, die nicht mitkommen (Alternativen,
  Papierkorb), werden mit `bezug-entfernt` entfernt, ebenso `wahl.grundpositionId`. Die Bezugsformen Gliederung und
  Kennzeichnung bleiben: Ihr Bereich (Geschwister davor, R3/R4) ändert sich durch das Umhängen unter die neue Gliederung
  nicht.

### Prüfung

Nach dem letzten Merge von `integration/welle-5` (`b9c610c`, mit Ticket 71): `NODE_OPTIONS=--max-old-space-size=8192 pnpm
lint && pnpm typecheck && pnpm test` grün: Vitest 169 Dateien, 2305 Tests bestanden, 2 übersprungen wie zuvor; Fixtures
29/29. Davor (Merge `938ea1d`, ohne 71) scheiterte ein erster voller Lauf (Last 17 auf 4 Kernen) nur am Leistungsbudget
`packages/vergabe/src/leistung.test.ts` „preisspiegelBerechnen für gross mit 5 Angeboten unter 1000 ms“ (3.738 ms); die
Datei allein grün (1.390 ms gemeldet), der zweite volle Lauf grün. Kein Budget gelockert.

## Answer

Merged: c40ca38 in integration/welle-5


Paket `@tethys/abrechnung` (Branch `welle-5/80-abrechnung`), öffentliche API:

- `nachtragUebernehmen(auftragsLv, nachtragsLv, angebot, auftragsangebot, neueIds)` →
  `Ergebnis<{ befehl: NachtragUebernehmen; warnungen: Nachtragswarnung[] }, Befehlsfehler>` (D-35, D-80.1–D-80.3, D-80.8);
  `istAlternative(knoten)`; `nachtragsbefunde(auftragsLv, nachtragsLvs)` → `Nachtragsbefund[]` (D-80.7).
- `aufmassBefehlAusfuehren`, `aufmassChangeSetAnwenden`, `aufmassChangeSetUmkehren` (Signaturen aus `vertrag` v1.4;
  Formprüfungen D-80.4, kanonisches Blatt D-80.5).
- `aufmassPruefen(aufmass, auftragsLv)` → `Aufmassbefund[]` (D-80.6); `naechsteAufmassnummer(aufmasse)` → höchste + 1.
- Für Ticket 81: `form.ts` (Formprüfungen) und `testhilfen.ts` (Auftrags-LV, Nachtrag und Blätter des Tors M4).

# 83: M3: GAEB X31 (Mengenermittlung) lesen und schreiben

Status: resolved
Type: task
Welle: 5 · Strang: M3 · Paket: `packages/gaeb` (dazu `werkzeuge/xsd-gegenpruefung.mjs` im Paket)
Blocked by: 70, 73
Regeln: A2, A3, N1, N4, Q3, Q5, U5, G-10, G-11, G-16, ADR 0010, D-22, D-33, D-36
Herkunft: `plan.md` §2 M3; D-33 (nur X31, DA11 später)

## What to build

1. **X31 lesen** (3.3 und 3.2, G-10): `x31Lesen(text, auftragsLv: AuftragsLvZustand)` → `Aufmass`-Inhalt (Positionen mit
   `mengenansatz` als `Ansatzzeile`n und `menge: null` – die Menge rechnet die App mit `mengen`, D-22/D-36) plus Befunde.
   Zuordnung der `Item`s über die OZ des Auftrags-LV (wie der X84-Leser über das LV). Die Zeilen in `QTakeoff Row="…"` haben
   das feste Spaltenformat der REB-Verfahrensbeschreibung 23.003 (Text-, Rechen- und Ergebniszeilen, Formelnummer,
   Zeilennummer und Zeilenkennung am Ende). Das Format aus der öffentlich zugänglichen Beschreibung bzw. der BVBS-Prüfdatei
   `fixtures/extern/bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x31` herleiten und im Code in
   eigenen Worten dokumentieren (keine Texte der Norm übernehmen, C1). Formel 91 (freier Rechenansatz, auch über mehrere
   Zeilen fortgesetzt) wird zur Ansatzzeile; andere Formelnummern bleiben als Text mit Befund `formel-nicht-unterstuetzt`
   (Menge dieser Position `null`, nie geraten, Q5). Textzeilen (`*`) als Bemerkung oder Befund, entscheiden.
2. **X31 schreiben:** `aufmassAlsX31(aufmass, auftragsLv, version)` für Ansatzzeilen der Formel 91; eigene Prüfung wie bei
   den anderen Phasen (ADR 0010); XSD-Gegenprüfung in der CI um das amtliche X31-Schema erweitern (Schema zur Laufzeit von
   gaeb.de laden, SHA-256 prüfen, nie committen; URL und Prüfsumme im Skript).
3. **Rundweg** (Q3): eigenes Aufmaß → X31 → Aufmaß gleich; BVBS-X31 → Aufmaß → X31 → Aufmaß gleich, soweit Formel 91.

## Grenzen

- Nur `packages/gaeb`. Keine Rechnung der Ausdrücke in `gaeb` (das ist `mengen`, A3).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] BVBS-X31 gelesen: alle Items zugeordnet oder mit Befund; Golden-Test der Ansatzzeilen einer Position mit mehrzeiliger
      Formel 91
- [x] Rundweg-Tests (Q3), XSD-Gegenprüfung grün (`pnpm --filter @tethys/gaeb run xsd-gegenpruefung`)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Rückgabe von `x31Lesen`: `Omit<Aufmass, 'id' | 'projektId' | 'auftragsLvId' | 'nummer'>` (plus Befunde); die App ergänzt
  den Kopf und baut `AufmassAnlegen`.
- Mehrere `Item`s zu derselben OZ zu einer Aufmaßposition zusammenführen (sonst weist der Ausführer mit `ungueltige-eingabe` ab).

## Comments

### Umsetzung (Branch `welle-5/83-x31`)

Seams (Demo-Modus, statt Abstimmung mit dem Nutzer): `x31Lesen` und `aufmassAlsX31` (öffentliche API von `@tethys/gaeb`).
Zeilenformat in eigenen Worten in `packages/gaeb/src/reb.ts`, hergeleitet aus dem Zeilenmuster des amtlichen XSD (80 Zeichen,
die ersten 11 leer) und den Zeilen der BVBS-Prüfdatei: 13 Kennung (` ` Rechen-, `*` Textzeile), 14–22 Text, 23–29 Vorzeichen
und Faktor, 30–31 Formel, 32–69 Werte bzw. Ausdruck (`=` am Ende schließt ab, sonst Fortsetzung), 70–75 Zeilennummer
(`0004F0`), Rest leer.

- **D-83.1** Zeilennummern der Ansatzzeilen? → Eigene Nummern 1, 2, … je Aufmaßposition in Dateireihenfolge (Vertrag:
  „eigene Zeilennummern je Aufmaßposition“); ein Verweis auf die Zeilennummer der Datei (`0004F0`) wird zum Bezug `Z<n>`,
  wenn er auf das Ende eines früheren, genau abgebildeten Ausdrucks derselben Position zeigt. Grund: Die Nummern der Datei
  sind über alle Positionen eindeutig, die des Modells nur je Position; `mengen` kennt nur `Z<n>`. Reversible: yes.
- **D-83.2** Was ist „als Text“ (Ticket: andere Formeln mit `formel-nicht-unterstuetzt`, Menge nie geraten)? → **Textform:**
  `formel` = Formelnummer der Datei, `ausdruck` = `*` + Spalten 13–69 der Zeile (rechts ohne Leerraum), eine Ansatzzeile je
  Dateizeile. `mengen` weist einen Ausdruck mit führendem `*` immer ab (Operator ohne Operanden; andere Formeln kennt es
  ohnehin nicht), die Summe der Position wird also `null`, und die Zeile bleibt lesbar erhalten (Q5). Dieselbe Form gilt für
  Zeilen der Formel 91, die der freie Rechenansatz nicht genau abbildet: Kennung wie `H` (Hilfswert, zählt nicht zur Menge)
  oder `Z` (Zwischensumme), Vorzeichen oder Faktor, Verweis außerhalb der Position oder auf eine Zeile in der Textform,
  Buchstaben im Ausdruck. Befund `zeile-nicht-abbildbar`. Grund: `mengen` summiert jede Zeile; einen Hilfswert als normale
  Zeile zu übernehmen, ergäbe still eine falsche Menge. Reversible: yes.
- **D-83.3** Textzeilen (`*`) und die Texte der Rechenzeilen (Spalten 14–22)? → **Befund** `bemerkung-nicht-abgebildet`
  (Warnung) je Position mit den Texten im Wortlaut; das Aufmaßblatt hat kein Feld (Offene Typfrage 10, Ticket 70). In der
  Textform bleibt der Text im Ausdruck. Reversible: yes.
- **D-83.4** Ausdruck der Formel 91 ohne `=`? → Er endet an der nächsten Zeile, die nicht Formel 91 ist (Textzeile, andere
  Formel, Ende des Items), Warnung `formel-ohne-abschluss`, übernommen wird, was dasteht. Fortsetzungen werden ohne
  Trennzeichen aneinandergehängt (je Zeile rechts ohne Leerraum). Reversible: yes.
- **D-83.5** `Qty` (Menge der Datei)? → Ohne Zeilen ist sie eine Menge von Hand (`mengenansatz: null`, `menge` = Qty); neben
  Zeilen wird sie nicht übernommen (die App rechnet, Warnung `menge-nicht-uebernommen`); zwei Mengen ohne Zeilen zu einer
  Position: Fehler `menge-mehrfach`, keine Aufmaßposition (in `gaeb` wird nicht addiert). Ein Item ohne Zeilen und ohne
  Menge ergibt keine Aufmaßposition (die Prüfdatei listet alle Positionen des LV). Reversible: yes.
- **D-83.6** Kopf des Blatts? → `x31Lesen` liefert `bezeichnung: ''` und `datum: null`. X31 hat für Bezeichnung und Datum
  eines Aufmaßblatts kein Feld: `OrdDescr`/`ProjDescr` beschreiben Auftrag und Projekt, `ServiceProvisionStart/EndDate` den
  Leistungszeitraum. Diese und `OWN`, `CTR`, `PrjInfo` sind Befund `nicht-abgebildet` („Angabe zum Auftrag; maßgeblich ist das
  Auftrags-LV“). Die App fragt Bezeichnung und Datum beim Anlegen ab. Reversible: yes.
- **D-83.7** Befundschwere? → `position-unbekannt`, `formel-nicht-unterstuetzt`, `zeile-nicht-abbildbar`, `menge-mehrfach`,
  `zeile-ohne-formel` sind Fehler (die Menge einer Position fehlt), die übrigen Warnungen; nichts sperrt (U5).
- **D-83.8** Signatur des Writers? → `aufmassAlsX31(aufmass, auftragsLv, version, { erstellt, programm })`: das vierte
  Argument wie bei `schreibeGaeb`, weil `GAEBInfo/Date` Pflicht ist und das Paket keine Uhr hat (A2). Ergebnis
  `GaebExport` mit `phase: 'X31'`. Reversible: yes.
- **D-83.9** Zeilennummern der Datei? → Fortlaufend über die ganze Datei in der Reihenfolge des Auftrags-LV: Blatt 0001,
  Buchstaben B bis Z, Ziffer 0 (wie die Prüfdatei), dann Blatt 0002 usw. (höchstens 249.975, sonst Fehler
  `zeilen-zu-viele`). `Z<n>` und Variablennamen werden zur Nummer der letzten Zeile ihres Ausdrucks; der Name selbst
  entfällt mit Warnung (`export-verworfen`). Ein langer Ausdruck wird bevorzugt vor einem Leerzeichen geteilt, nie hinter
  einem, sodass der Leser genau den Ausdruck zurückerhält. Grund: Verweise in X31 sind Zeilennummern, eindeutig je Datei.
  Reversible: yes.
- **D-83.10** Was X31 nicht trägt? → Eine Aufmaßposition mit einer Zeile, die X31 nicht abbildet (andere Formel als 91,
  Textform, Bezug oder Name ohne frühere Zeile, „=“ oder Zeilenumbruch im Ausdruck), **entfällt ganz** mit Warnung
  `export-verworfen`: Eine Teilmenge wäre beim Empfänger still eine falsche Menge (Q5). Die Textform wird nicht
  zurückgeschrieben, weil ihre Verweise auf Zeilennummern nach dem Neunummerieren ins Leere oder auf andere Zeilen zeigten.
  Bezeichnung und Datum des Blatts sowie eine Aufmaßzeile ohne Menge und Ansatz: Warnung. `Qty` nur für eine Menge von Hand
  (ohne Ansatz); neben einem Ansatz rechnet der Empfänger. Positionen stehen in der Reihenfolge des Auftrags-LV, nur
  Gliederungen mit aufgemessenen Positionen. Kein `OWN`/`OrdDescr` (der Leser übernähme sie nicht, D-83.6). Reversible: yes.
- **D-83.11** Rundweg (Q3)? → Eigenes Blatt → X31 → Blatt gleich bis auf die Menge neben einem Ansatz (die rechnet die App),
  zweiter Export byte-gleich. BVBS-X31 → Blatt → X31 → Blatt gleich für die sieben Positionen, die nur Formel 91 ohne
  Kennung, Faktor oder fremden Verweis tragen; die sieben übrigen entfallen mit einer Warnung (D-83.10). Gelistet im Test,
  nicht verschwiegen.
- **D-83.12** XSD? → Amtliche Pakete `2021-05_Mengenermittlung.zip` (3.3) und `Mengenermittlung_3.2_2013-10.zip` (3.2) von
  gaeb.de mit SHA-256 im Skript, zur Laufzeit geladen, nie committet; geprüft werden das gelesene BVBS-Blatt und ein eigenes
  Blatt × 3.3/3.2. Das XSD schreibt für `Row` genau 80 Zeichen mit 11 führenden Leerzeichen vor. (Ein Paket
  `2023-01_Mengenermittlung.zip` gibt es auch; gewählt ist 2021-05 wie bei den LV-Schemas.)
- Prüfung nach Merge von `integration/welle-5` (ecc98ac, Merge a537073): `pnpm lint`, `pnpm typecheck` grün; `pnpm test`
  grün (Vitest 160 Dateien, 2240 Tests bestanden, 3 übersprungen; Fixtures 29/29); XSD-Gegenprüfung 52 von 52 (davon 4 X31).
- Für Folgetickets: Ticket 87 (App) zeigt Ansatzzeilen in der Textform (`ausdruck` beginnt mit `*`) als Text an, nicht als
  bearbeitbaren Ausdruck; `mengen` weist sie ab, die Menge der Position bleibt leer. Bezeichnung und Datum des Blatts fragt
  die App ab (D-83.6). Der Begriff „Textform (einer Ansatzzeile)“ fehlt im `GLOSSARY.md` (außerhalb von `packages/gaeb`,
  P2): Vorschlag für den Orchestrator.
- Nachtrag (Orchestrator): `integration/welle-5` mit Kern 71 gemergt (f189ef3); Glossar um „Textform (einer
  Ansatzzeile)“ ergänzt (L2, vom Orchestrator freigegeben). Danach `pnpm lint`, `pnpm typecheck`, `pnpm test` grün (Vitest 163
  Dateien, 2274 Tests bestanden, 3 übersprungen; Fixtures 29/29), XSD-Gegenprüfung 52 von 52.

## Answer

Merged: 05f8f0c in integration/welle-5


Umgesetzt in `packages/gaeb` (Branch `welle-5/83-x31`, letzter Commit vor dem Merge e93c7ba, Merge a537073). Öffentliche API
(`@tethys/gaeb`):

- `x31Lesen(eingabe: Uint8Array | string, auftragsLv: AuftragsLvZustand, opt?: VorlaufOptionen): X31Lesung` mit
  `X31Lesung { aufmass: X31Aufmass | null; phase; version; befunde }` und
  `X31Aufmass = Omit<Aufmass, 'id' | 'projektId' | 'auftragsLvId' | 'nummer'>` (D-42). Formel 91 → Ansatzzeilen (`Z<n>` für
  Verweise in der Position), Menge `null`; alles andere in der Textform (D-83.2) mit Befund; Textzeilen sind Befund.
  Befundcodes: `position-unbekannt`, `formel-nicht-unterstuetzt`, `zeile-nicht-abbildbar`, `zeile-ohne-formel`,
  `menge-mehrfach` (Fehler); `bemerkung-nicht-abgebildet`, `formel-ohne-abschluss`, `menge-nicht-uebernommen`,
  `zeile-laenge`, `verfahren-abweichend`, `maske-abweichend`, `nicht-abgebildet` (Warnungen).
- `aufmassAlsX31(aufmass: Aufmass, auftragsLv: AuftragsLvZustand, version: '3.3' | '3.2', opt: X31SchreibOptionen):
  GaebExport` mit `X31SchreibOptionen { erstellt: { datum; zeit }; programm }` (D-83.8); Befundquelle `gaeb-pruefung`,
  Fehler → Entwurf.
- Zeilenformat in eigenen Worten: `packages/gaeb/src/reb.ts`. Tests: `packages/gaeb/src/x31.test.ts` (26 Tests: BVBS-Datei
  mit Golden der mehrzeiligen Formel 91 an 002.001.0020, Regeln, beide Rundwege). XSD: `werkzeuge/xsd-gegenpruefung.mjs`
  lädt die amtlichen X31-Schemas 3.3/3.2 mit SHA-256.
- Entscheidungen D-83.1 bis D-83.12 unter Comments. Offen: Glossarbegriff „Textform“ (außerhalb des Pakets).

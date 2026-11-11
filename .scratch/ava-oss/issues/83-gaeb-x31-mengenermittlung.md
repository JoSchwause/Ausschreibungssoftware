# 83: M3: GAEB X31 (Mengenermittlung) lesen und schreiben

Status: claimed
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

- [ ] BVBS-X31 gelesen: alle Items zugeordnet oder mit Befund; Golden-Test der Ansatzzeilen einer Position mit mehrzeiliger
      Formel 91
- [ ] Rundweg-Tests (Q3), XSD-Gegenprüfung grün (`pnpm --filter @tethys/gaeb run xsd-gegenpruefung`)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

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

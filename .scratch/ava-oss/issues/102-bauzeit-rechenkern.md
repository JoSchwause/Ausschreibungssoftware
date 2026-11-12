# 102: X2: Terminrechnung des Bauzeitenplans (`bauzeit`)

Status: claimed
Type: task
Welle: 6 · Strang: X2 · Paket: `packages/bauzeit` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: –
Modell: opus
Regeln: A2, A3, Q1, Q4, U5, C4, D-57
Herkunft: `plan.md` §2 X2, Berater D-57

## What to build

Ein reines TS-Paket (A2: keine Uhr, kein Zufall, kein DOM), das einen Bauzeitenplan terminiert: Arbeitskalender, Vorgänge mit
Dauer in Arbeitstagen, Anordnungsbeziehungen, Vorwärts- und Rückwärtsrechnung (Netzplan, Methode des kritischen Wegs), Puffer,
kritischer Weg. Es importiert nur `vertrag` und `dezimal` (`'packages/bauzeit': ['packages/vertrag', 'packages/dezimal']`,
`apps/web` darf es importieren). In diesem Ticket mit **eigenen Eingabetypen**; die Vertragstypen (`Bauzeitenplan`, `Vorgang`,
`Vorgangstermine`) bringt Ticket 97, die Umstellung und die Befehle Ticket 109. Halte die eigenen Typen nahe an der Form unten.

1. **Datum.** Kalendertage als Text `JJJJ-MM-TT`; gerechnet über eine ganze Tageszahl (proleptischer gregorianischer
   Kalender), nicht über Zeitzonen. Ungültiges Datum: Fehler.
2. **Arbeitskalender** `{ arbeitstage: Wochentage (ISO, 1 = Montag; Standard Mo–Fr), bundesland: Kürzel nach ISO 3166-2:DE
   oder null, freieTage: Daten }`. **Feiertage rein aus Regeln** (D-57): bundesweit Neujahr, Karfreitag, Ostermontag, 1. Mai,
   Christi Himmelfahrt, Pfingstmontag, 3. Oktober, 25./26. Dezember (Ostersonntag nach der gregorianischen Osterformel); dazu
   die landesweiten Feiertage je Land nach den Feiertagsgesetzen der Länder (z. B. 6. Januar, 8. März, Fronleichnam,
   15. August, 20. September, 31. Oktober, 1. November, Buß- und Bettag – welches Land welchen hat, aus der Quelle, mit
   Gültigkeitsjahr, z. B. 8. März in Berlin ab 2019). Nur regional geltende Feiertage und einmalige Feiertage gehen über
   `freieTage`. Tests je Feiertag mit festen Jahren (z. B. Ostersonntag 2026 = 05.04.2026, 2027 = 28.03.2027).
3. **Vorgang** `{ id, nummer?, bezeichnung, elternId: Kennung | null (Sammelvorgang = hat Kinder), dauer: ganze Arbeitstage ≥ 0
   (0 = Meilenstein; am Sammelvorgang ohne Bedeutung), vorgaenger: Anordnungsbeziehung[], fruehesterBeginn: Datum | null
   (Terminvorgabe „Beginn frühestens“), ist: { beginn, ende, fortschritt } | null }`. **Anordnungsbeziehung** `{ vorgaengerId,
   art: 'ende-anfang' | 'anfang-anfang' | 'ende-ende' | 'anfang-ende', abstand: ganze Arbeitstage, auch 0 oder negativ }`.
4. **Rechnung.** Lege die Lesarten fest und schreibe sie an den Code (`BAUZEIT_ANNAHMEN` oder ähnlich): Ende ist der letzte
   Arbeitstag des Vorgangs (einschließlich); Ende-Anfang mit Abstand 0 heißt Beginn am nächsten Arbeitstag nach dem Ende;
   Meilenstein hat Beginn = Ende; ein Vorgang beginnt nie vor dem Projektbeginn und nie an einem freien Tag. Vorwärtsrechnung
   (frühester Beginn/frühestes Ende), Rückwärtsrechnung vom Projektende (spätester Beginn/spätestes Ende), Gesamtpuffer und
   freier Puffer in Arbeitstagen, kritisch = Gesamtpuffer ≤ 0, kritischer Weg als Folge von Vorgängen. Sammelvorgang: Beginn =
   frühester Beginn, Ende = spätestes Ende seiner Kinder; eine Anordnungsbeziehung an einem Sammelvorgang ist in v1 ein Befund
   `beziehung-an-sammelvorgang` und wird nicht gerechnet. Zyklus: Befund `zyklus` mit den beteiligten Vorgängen, diese
   bleiben ohne Termine; unbekannter Vorgänger: Befund. Ist-Termine werden angezeigt, verschieben aber nichts (v1).
5. **Zeitachse für die Anzeige** (rein, ohne DOM): aus Projektbeginn und -ende den Tagesindex je Datum, die Abschnitte der
   Kopfzeilen (Monate, Kalenderwochen nach ISO 8601) und die Indizes der freien Tage – passend zur Balkenspalte des
   Vergleichsgrids (Ticket 96: `Zeitleiste`, `Zeitabschnitt`, `Balken` mit Tagesindex). Die Texte formatiert die App (N4).
6. **Tests (Q1, C4):** Golden-Tests von Hand hergeleitet (Herleitung im Test): ein Plan mit 6–8 Vorgängen, allen vier
   Beziehungsarten, einem Abstand 0 und einem negativen, einem Meilenstein, einem Feiertag und einem Wochenende auf dem
   kritischen Weg; Property-Tests (Puffer ≥ 0 bei konsistenter Eingabe; jeder kritische Weg ist zusammenhängend;
   Verschieben des Projektbeginns um eine Arbeitswoche verschiebt alle Termine um eine Arbeitswoche, wenn keine Feiertage
   im Weg liegen). **Leistung (Q4):** 1.000 Vorgänge mit 2.000 Beziehungen ≤ 100 ms CPU.

Begriffe zuerst ins `GLOSSARY.md` (L2), Abschnitt „Planerhonorar (HOAI) & Projektsteuerung“ beim Bauzeitenplan:
**Vorgang**, **Sammelvorgang**, **Meilenstein**, **Anordnungsbeziehung** (vier Arten, Abstand), **Arbeitskalender**,
**Gesamtpuffer**, **freier Puffer**, **kritischer Weg**, **Terminvorgabe**.

## Grenzen

- Nur `packages/bauzeit` (und die genannten Wurzeldateien). Keine Befehle, kein Speicher (Ticket 109). `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [ ] Golden-, Property- und Leistungstests wie oben; Feiertage je Land mit Quelle
- [ ] Paketgrenzen-Prüfung kennt `bauzeit`
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

- **D-102.1 Nähte der Tests.** Frage: An welchen Nähten wird getestet (Skill `tdd`, ohne Nutzer)? Entscheidung: (1)
  `bauzeitenplanBerechnen` (Golden, Befunde, Eigenschaften, Budget), (2) `feiertage`/`ostersonntag` (je Feiertag mit festen
  Jahren), (3) `istArbeitstag`, (4) `zeitachseBerechnen`/`tagesindex`/`balkenlage`, (5) `datumPruefen`. Arbeitstagefolge,
  Zyklensuche und Tageskalender nur durch diese Nähte. Grund: Das sind die Stellen, die die Tickets 109, 112, 113 und 118
  brauchen. Reversible: yes.
- **D-102.2 Zeitpunkte und Meilenstein.** Frage: Wo liegt ein Meilenstein, und wie verträgt er sich mit „Ende-Anfang 0 =
  nächster Arbeitstag nach dem Ende“? Entscheidung: Gerechnet wird mit Zeitpunkten in Arbeitstagen: Anfang = Anfang des ersten
  Tages, Ende = Schluss des letzten; der Schluss eines Arbeitstags fällt mit dem Anfang des nächsten zusammen. Ein Meilenstein
  ist der Zeitpunkt am Anfang seines Tages, Beginn = Ende = dieser Tag. Folgen: Nach einem Vorgang mit Ende-Anfang 0 liegt der
  Meilenstein am nächsten Arbeitstag nach dessen Ende; ein Nachfolger des Meilensteins mit Ende-Anfang 0 beginnt am selben Tag.
  Grund: So kostet ein Meilenstein keine Zeit (eine Kette mit eingeschobenem Meilenstein hat dieselben Termine), und er liegt
  nie vor dem Projektbeginn oder an einem freien Tag, wie das Ticket verlangt. Die Alternative „Schluss seines Tages“ legte
  einen Meilenstein am Projektbeginn vor den Projektbeginn. Folge für Nutzer von Werkzeugen mit Uhrzeit: Ein
  Fertigstellungsmeilenstein erscheint am nächsten Arbeitstag (Freitag fertig, Meilenstein Montag). Später denkbar: eine eigene
  Art „Endmeilenstein“. Reversible: yes (eine Lesart in `BAUZEIT_ANNAHMEN.meilenstein`).
- **D-102.3 Bundesland.** Entscheidung: die 16 Kürzel nach ISO 3166-2:DE ohne das Präfix `DE-` (`BY`). Grund: so im Glossar und
  in Ticket 97; das Präfix ist für alle gleich. Reversible: yes.
- **D-102.4 Feiertage, Quellen, Gültigkeit.** Entscheidung: bundesweit die neun (in allen Feiertagsgesetzen, der 3. Oktober
  zudem nach Art. 2 Abs. 2 Einigungsvertrag); landesweit nach dem Feiertagsgesetz des Landes (Gesetz je Land in
  `LANDESFEIERTAGE`). Gültigkeitsjahre: Frauentag Berlin ab 2019 (Beschluss 24.01.2019), Frauentag Mecklenburg-Vorpommern ab
  2023 (Landtag Juni 2022, Drs. 8/793), Weltkindertag Thüringen ab 2019 (Landtag 28.02.2019), Reformationstag Bremen, Hamburg,
  Niedersachsen, Schleswig-Holstein ab 2018. Ältere Änderungen (Buß- und Bettag bundesweit bis 1994) bildet das Paket nicht ab:
  Jahre vor 1995 rechnen mit dem Stand von 1995. Nur benannte Feiertage: Hessen zählt alle Sonntage zu den Feiertagen (§ 1
  Abs. 1 HFeiertagsG), Sonntage regeln hier die Arbeitstage; Brandenburg nennt Oster- und Pfingstsonntag ausdrücklich (§ 2
  Abs. 1 FTG), sie stehen in der Liste (wirken nur mit Sonntag als Arbeitstag). Regional (Fronleichnam in Gemeinden Sachsens und
  Thüringens, Mariä Himmelfahrt in Gemeinden Bayerns, Augsburger Friedensfest) und einmalig (Reformationstag 2017; Berlin
  08.05.2020, 08.05.2025, 17.06.2028) über `freieTage`. Geprüft: Brandenburg und Hessen im Gesetzestext, alle Länderlisten 2026
  gegen die DGB-Übersicht 2026, Einführungsjahre gegen Landtags- und Presseangaben; keine dauerhafte Änderung 2024 bis 2026
  gefunden. Reversible: yes.
- **D-102.5 Datum.** Entscheidung: `Datum` ist eine Marke (`string & Marke<'Datum'>`) für geprüfte Daten, erzeugt nur von
  `datumPruefen` und der Rechnung; Eingaben tragen Daten als ungeprüften `string`, die Rechnung meldet Ungültiges als Befund.
  Jahr 0001 bis 9999, intern eine ganze Tageszahl, nie `Date`. Reversible: yes.
- **D-102.6 Fortschritt.** Entscheidung: `ist.fortschritt: Prozent | null` (N1), geprüft auf zwei Stellen und 0.00 bis 100.00
  mit `dezimal`; `null` = nicht erfasst. Ist-Ende ohne Ist-Beginn oder vor ihm ist ein Befund `ist-ungueltig`. Reversible: yes.
- **D-102.7 Wertebereiche.** Entscheidung: Dauer ganzzahlig 0 bis 1.000.000, Abstand ganzzahlig −1.000.000 bis 1.000.000
  (`HOECHSTWERT_ARBEITSTAGE`), sonst Befund (Vorgang ohne Termine bzw. Beziehung entfällt). Ein Termin nach 9999-12-31 lässt den
  Vorgang ohne Termine, Befund `termin-ausserhalb-kalender`, auch wenn nur seine späte Lage hinausfällt. Grund: Alle Summen
  bleiben exakte ganze Zahlen; die Rechnung endet für jede Eingabe. Reversible: yes.
- **D-102.8 Kritische Wege.** Entscheidung: alle längsten Folgen über kritische Beziehungen (beide Vorgänge kritisch, Spielraum
  0), aufgezählt in Eingabereihenfolge, höchstens `KRITISCHE_WEGE_HOECHSTENS` = 20, darüber Befund `kritische-wege-gekuerzt`.
  Jeder Weg beginnt am Projektbeginn oder an einer Terminvorgabe und endet am Projektende; jeder kritische Vorgang liegt auf
  einem Weg (Property-Test). Grund: Gleich lange Wege kommen vor („jeder kritische Weg“ im Ticket), ihre Zahl kann exponentiell
  wachsen. Reversible: yes.
- **D-102.9 Sammelvorgang.** Entscheidung: frühe und späte Lage je als Hülle der Kinder (frühester Beginn, spätestes Ende),
  Puffer = kleinster Puffer der Kinder, kritisch, wenn ein Kind kritisch ist; nie auf einem kritischen Weg. Eine Terminvorgabe
  am Sammelvorgang ist wie eine Beziehung dort ein Befund (`terminvorgabe-an-sammelvorgang`) und wird nicht gerechnet. Ein
  Kreis in `elternId` ist ein Befund `eltern-zyklus`; die Beteiligten stehen dann auf der obersten Ebene. Reversible: yes.
- **D-102.10 Zyklen und Folgen.** Entscheidung: Beteiligte eines Zyklus (starke Zusammenhangskomponente oder Selbstbezug)
  bleiben ohne Termine, ein Befund `zyklus` je Zyklus mit den Beteiligten in Eingabereihenfolge. Nachfolger werden ohne diese
  Beziehung gerechnet, Befund `vorgaenger-ohne-termine` (ebenso nach ungültiger Dauer oder einer Terminvorgabe ohne
  Arbeitstag bis 9999). Grund: Das Ticket nennt nur die Beteiligten ohne Termine; der übrige Plan bleibt lesbar (U5).
  Reversible: yes.
- **D-102.11 Rückwärtsrechnung und freier Puffer.** Entscheidung: Kein Vorgang endet in der späten Lage nach dem Projektende,
  auch nicht einer, der nur über Anfang-Anfang an Nachfolgern hängt; freier Puffer = kleinster Spielraum zu Nachfolgern,
  höchstens Projektende − Ende. Folge: Gesamtpuffer ≥ 0 und freier Puffer ≤ Gesamtpuffer bei jeder stimmigen Eingabe (als
  Property geprüft, per Mutation gegen beide Schranken abgesichert). Reversible: yes.
- **D-102.12 Formen gegenüber Ticket 97.** Eingabe: so gewählt, dass die geplanten v1.6-Typen `Bauzeitenplan` und `Vorgang`
  zuweisbar sind (`Anordnungsart` übernommen, `nummer?: string | null`, `fortschritt: Prozent | null`). Ergebnis:
  `Bauzeitenplanergebnis { projektbeginn, projektende, vorgaenge: { id, art, termine | null }[], kritischeWege, befunde }`.
  Vorschlag für 97/109 gegenüber dem geplanten `Terminplan { termine; projektende; kritischerWeg; befunde }`: je Vorgang `art`
  (die App braucht sie für `Balkenart`; „Sammelvorgang = hat Kinder“ rechnete sonst die App nach) und `termine: null` statt
  Weglassen, `kritischeWege` in der Mehrzahl (D-102.8), `projektbeginn` als erster Arbeitstag. Befunde: eigener Typ
  `Bauzeitbefund { code; vorgangId; vorgaengerId; beteiligte; meldung }`, bis v1.6 eine Befundquelle „Terminrechnung“ bringt.
  Reversible: yes.

### API (`@tethys/bauzeit`)

- `bauzeitenplanBerechnen(eingabe: Bauzeitenplaneingabe): Bauzeitenplanergebnis`. Eingabe `{ projektbeginn; kalender:
  Arbeitskalender; vorgaenge: Vorgang[] }`, `Vorgang { id; nummer?; bezeichnung; elternId; dauer; vorgaenger:
  Anordnungsbeziehung[]; fruehesterBeginn; ist: Isttermine | null }`, `Anordnungsbeziehung { vorgaengerId; art: Anordnungsart;
  abstand }`. Ergebnis je Vorgang in Eingabereihenfolge `{ id; art: Vorgangsart; termine: Vorgangstermine | null }` mit
  `Vorgangstermine { beginn; ende; spaetesterBeginn; spaetestesEnde; gesamtpuffer; freierPuffer; kritisch }` (Daten als `Datum`,
  Puffer in Arbeitstagen), dazu `projektbeginn`, `projektende`, `kritischeWege`, `befunde`. 20 Befundcodes in
  `Bauzeitbefundcode` (je mit Folge im Kommentar), in der Reihenfolge der Rechnung (Plan und Kalender, Gliederung, je Vorgang,
  Zyklen, Folgen, Kalendergrenze, kritische Wege).
- `Arbeitskalender { arbeitstage: Wochentag[]; bundesland: Bundesland | null; freieTage: string[] }`, `STANDARD_ARBEITSTAGE`,
  `istArbeitstag(kalender, datum)`.
- `feiertage(jahr, bundesland | null): Feiertag[]` (`{ datum; kennung; name }`, nach Datum), `ostersonntag(jahr)`,
  `BUNDESWEITE_FEIERTAGE`, `LANDESFEIERTAGE` (je Land Gesetz und Feiertage mit `ab`), `BUNDESLAENDER`.
- `zeitachseBerechnen(von, bis, kalender): Ergebnis<Zeitachse, Zeitachsenfehler>` mit `{ von; bis; tage; monate: { jahr; monat;
  vonTag; bisTag }[]; kalenderwochen: { jahr; woche; vonTag; bisTag }[]; freieTage: number[] }` (`bisTag` exklusiv, am Rand
  geschnitten, ISO-Wochenjahr); `tagesindex(achse, datum)`; `balkenlage(achse, beginn, ende, art)` → `{ vonTag; bisTag }` (Ende
  + 1, beim Meilenstein `bisTag = vonTag`). Passt zu `Zeitleiste`, `Zeitabschnitt`, `Balken` aus `ui-grid` (Ticket 96, inzwischen
  gemergt; `Vorgangsart` hat dieselben Glieder wie `Balkenart`); die Texte setzt die App (N4).
- `datumPruefen(text): Ergebnis<Datum, Datumsfehler>`; `BAUZEIT_ANNAHMEN` (alle Lesarten als Text, für App, PDF und Fixtures),
  `KRITISCHE_WEGE_HOECHSTENS`, `HOECHSTWERT_ARBEITSTAGE`.

### Golden-Plan (Herleitung in `bauzeitenplan-golden.test.ts`)

Bayern, Montag bis Freitag, Projektbeginn Mo 03.05.2027 (Ostern 28.03.2027: Christi Himmelfahrt Do 06.05., Pfingstmontag
Mo 17.05., Fronleichnam Do 27.05.).

| Vorgang | Dauer | Beziehung | Beginn | Ende | spätester Beginn | spätestes Ende | GP | FP |
|---|---|---|---|---|---|---|---|---|
| A Baustelleneinrichtung | 3 | – | 03.05. | 05.05. | 03.05. | 05.05. | 0 | 0 |
| B Erdarbeiten | 4 | Ende-Anfang A +0 | 07.05. | 12.05. | 07.05. | 12.05. | 0 | 0 |
| C Fundamente | 5 | Anfang-Anfang B +2 | 11.05. | 18.05. | 11.05. | 18.05. | 0 | 0 |
| D Bodenplatte | 3 | Ende-Ende C +1 | 14.05. | 19.05. | 14.05. | 19.05. | 0 | 0 |
| E Mauerwerk | 6 | Ende-Anfang D −1 | 19.05. | 26.05. | 19.05. | 26.05. | 0 | 0 |
| M Rohbau fertig | 0 | Ende-Anfang E +0 | 28.05. | 28.05. | 28.05. | 28.05. | 0 | 0 |
| G Dachstuhl | 4 | Ende-Anfang M +0 | 28.05. | 02.06. | 28.05. | 02.06. | 0 | 0 |
| W Witterungsschutz | 3 | Anfang-Ende G +0 | 24.05. | 26.05. | 31.05. | 02.06. | 4 | 4 |

Projektende Mi 02.06.2027; kritischer Weg A → B → C → D → E → M → G (Feiertage 06.05., 17.05., 27.05. und Wochenenden auf dem
Weg). Gegenprobe Berlin (ohne Fronleichnam): M und G einen Arbeitstag früher, Projektende 01.06.2027. Ticket 112 braucht für
das Tor zusätzlich einen Sammelvorgang; der Golden-Plan hier kommt ohne aus (Sammelvorgänge prüfen eigene Tests und die
Properties).

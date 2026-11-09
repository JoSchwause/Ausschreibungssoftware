# 22: GAEB: XML-Modell und Parser X81/X83, Version 3.3 (G1)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: G · Paket: `packages/gaeb` (einziger Schreiber)
Blocked by: 02, 03, 23
Regeln: A2, A3, N1, N4, Q1, Q3, G-10, G-11, G-12, G-13, ADR 0010

## What to build

Leser für **GAEB DA XML 3.3** der Phasen **X81 und X83**, nach `vertrag`-Typen (LV mit OZ-Maske, Gliederung,
Positionen, Texte, Mengen, Einheiten). Eigene Implementierung, **kein fremder Code** (C1): freie Bibliotheken
dienen nur als Vergleich. Prinzip **tolerant lesen, streng schreiben**: kaputte Dateien werden nicht abgelehnt,
sondern mit **Prüfbefunden** (Warnung/Fehler mit Quelle und Position) gelesen. Sicherheit: kein XXE, keine externen
Entitäten, Größen- und Tiefengrenzen. Zahlen nur als Dezimalwerte, de-DE nie im XML (N1, N4). Versions- und
Phasenerkennung aus Namensraum, `GAEBInfo/Version`, `Award/DP` und zuletzt der Endung.
Eigene Validierung in der App (ADR 0010); das XSD kommt nicht in dieses Ticket (nur CI, Ticket G2).
Lesen von 3.2 und weitere Phasen sind Ticket G4.

## Acceptance criteria

- [x] Liest alle X81/X83-Dateien aus `fixtures/extern/` (Ticket 23), die Version 3.3 sind, ohne Absturz; Befunde je Datei als Golden-Datei
- [x] Liest die zehn Fehlerdateien (ungeschlossenes Tag, Dezimalkomma, ungültiges Enum, doppelte ID, Latin-1 trotz UTF-8, OZ-Überlauf …) mit je der erwarteten Warnung oder dem Fehler und liefert die übrigen Positionen
- [ ] Ergebnis `Leistungsverzeichnis` stimmt bei der BVBS-Prüfdatei Bauausführung 3.3 (X83) in Positionszahl, Gliederung und OZ-Maske mit den Angaben der BVBS-Prüfkriterien überein; Zahl und Quelle im Ticket
- [x] Indexpositionen (`RNoIndex`), Bedarfs-, Wahl- und Zuschlagspositionen (`MarkupItem`) werden erkannt und dem richtigen Typ zugeordnet
- [x] Eingebettete Bilder im Langtext gehen nicht verloren und gelangen nicht in die Metadaten
- [x] Sicherheitstests: Billion-Laughs-Datei und Datei mit externer Entität werden abgewiesen
- [x] `gaeb` importiert nur `vertrag` und `dezimal` (A3, CI-geprüft)
- [x] Datei über 2 MB wird in unter 1 s gelesen (Messwert im Ticket)

## Nicht-Ziele

Schreiben X81/X83/X86 und XSD-Gegenprüfung (G2), X84-Import (G3), Version 3.2 und GAEB 90/2000 (G4), Oberfläche.

## Comments

### 2026-11-10 — Umsetzung (Paket `packages/gaeb`, Branch `worktree-agent-af73d593246d4392f`)

Alles unten ist in diesem Branch gelaufen und grün: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest 15 Dateien / 318 Tests,
davon `packages/gaeb` 3 Dateien / 97 Tests; `node --test fixtures/*.test.mjs` 10/10), `reuse lint` (308/308 Dateien).

#### API

```ts
import { leseGaeb } from '@tethys/gaeb';
const l = leseGaeb(bytesOderText, { ids, standardMwstSatz, dateiname?, maxBytes?, maxTiefe?, trennzeichen? });
// l: GaebLesungErgebnis = GaebLesung (phase, version, inhalt: LvInhalt | null, befunde) + wurzelId
```

- Eingabe `Uint8Array` (mit BOM-/Deklarationserkennung, UTF-8 streng, Rückfall Windows-1252 mit Befund) oder `string`.
- `ids: IdQuelle` liefert alle Kennungen (A2: das Paket erzeugt keine). Reihenfolge der Aufrufe ist die Dokumentreihenfolge, damit
  eine zählende Test-`IdQuelle` deterministische Goldens ergibt. `ids.leistungsverzeichnis()` wird zuerst gerufen und ist
  `wurzelId`: die `elternId` aller Knoten der obersten Ebene. `LvInhalt` hat kein Feld für die Wurzelkennung (Vertragslücke 7).
- `standardMwstSatz` ist Pflicht: X81/X83 tragen keinen Steuersatz (kein `VAT`/`Tax` in den amtlichen X81/X83), `LvInhalt.mwstSatz`
  ist Pflicht. Der Satz wird eingesetzt, Befund `mwst-ersatzwert` bei jeder gelesenen Datei.
- `trennzeichen` (Vorgabe `.`) ist das Trennzeichen der Anzeige-Ordnungszahl und steht in `OzMaske.trennzeichen`. GAEB überträgt keins
  (RNoPart-Fragmente); `001.002.0030` ist wie in den BVBS-Prüfkriterien. `null` ergibt `0010020030`.
- Grenzen: `maxBytes` (100 MiB; `datei-zu-gross`), `maxTiefe` (100; `xml-tiefe-ueberschritten`).
- Der Leser wirft bei Dateiinhalt nie. `inhalt` ist `null`, wenn die Datei zurückgewiesen wurde (DOCTYPE mit Entitäten), zu groß ist,
  keine Wurzel `GAEB` hat, keinen `Award/BoQ` hat, Version 3.1/3.2 ist (siehe unten) oder die Phase nicht X81/X83 ist.

#### Parserwahl: eigener Tokenizer, keine Abhängigkeit

Warum: Gebraucht wird Wiederherstellung nach ungeschlossenen Tags (auch das Fehlen von `</QU>` vor dem nächsten Element), Zeile/Spalte
je Element, ein hartes Sicherheitsmodell ohne Konfigurationsrisiko und Betrieb im Browser. Eine Bibliothek lieferte das nicht oder nur
mit Optionen, die man richtig setzen müsste. Kein fremder Code (C1), `package.json` bekommt nur die Workspace-Abhängigkeiten
`@tethys/vertrag` und `@tethys/dezimal`; die Lizenzprüfung (`node tools/check-licenses.mjs`) ist grün.
`packages/gaeb/src/xml.ts` ist rein: String rein, Baum raus, kein DOM, kein I/O.

Sicherheitsmaßnahmen (`xml.ts`, getestet in `xml.test.ts` und `lesen.test.ts`):

- Ein DOCTYPE, der `<!ENTITY` enthält (intern, extern, Parameter-Entität), lässt die Datei zurückweisen: Fehler
  `xml-doctype-entitaeten`, `inhalt: null`. Nichts wird aufgelöst, nichts geladen. Ein unabgeschlossener DOCTYPE wird ebenso
  zurückgewiesen (`xml-doctype-ungueltig`). Ein DOCTYPE ohne Entitäten wird mit Warnung `xml-doctype-ignoriert` überlesen.
- Aufgelöst werden nur die fünf vordefinierten Entitäten und gültige Zeichenreferenzen; alles andere bleibt Text und ist ein Befund
  (`xml-entitaet-unbekannt`, `xml-zeichenreferenz-ungueltig`). Es gibt keine Expansion, also kein Billion Laughs.
- Größe: `maxBytes` vor dem Dekodieren. Tiefe: `maxTiefe`, danach Abbruch mit Fehler, der bis dahin gelesene Baum bleibt.
- Zahl der Befunde je Phase auf 10.000 begrenzt (`befunde-begrenzt`), damit eine Datei voller Fehler keinen Speicher frisst.
- Getestete Dateien: `packages/gaeb/testdaten/sicherheit/billion-laughs.x83` (Entitätskette 10^9) wird in unter 1 s abgewiesen;
  `externe-entitaet.x83` (`SYSTEM "file:///etc/passwd"`) wird abgewiesen, der Dateiinhalt taucht nirgends auf.
  Beide Dateien sind selbst verfasst.

#### Abbildung GAEB → `vertrag`

Belegt aus: `Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf`, <https://www.gaeb.de/wp-content/uploads/2021/07/Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf>
(im Folgenden „FD 3.3“; Abschnittsnummern wie im Dokument; nur gelesen, nichts davon im Repo) und aus den amtlichen Dateien. Die
Elementnamen der Positionsmerkmale stehen nicht in der FD 3.3 (sie kommen aus dem XSD, das hier nicht geladen wird, ADR 0010); sie
sind aus den amtlichen Dateien abgelesen, deren Positionstexte die Bedeutung nennen („Bedarfsposition mit GB“, „Pauschalposition mit
Grafik“, „Meister“, „Geselle“).

| GAEB | `vertrag` | Beleg und Hinweise |
| --- | --- | --- |
| `BoQInfo/BoQBkdn` (`Type` Lot/BoQLevel/Item/Index, `Length`, `Num` Yes/No) | `OzMaske`: `gliederung` = Lot + BoQLevel in Reihenfolge, `position` = Item, `index` = Index, `Num=Yes` numerisch sonst alphanumerisch | FD 3.3 11.2.3 BoQInfo 1–8 |
| `BoQCtgy` der Ebene i, Bkdn `Lot` | `Los` (nur oberste Ebene) | FD 3.3 4.2.1 |
| `BoQCtgy` sonst | `Titel`; `LblTx` → `kurztext` | |
| `RNoPart` der Kette | `ordnungszahl` = Teile mit `trennzeichen` verbunden; ohne Indexbuchstaben | FD 3.3 4.2.1, 4.3 |
| `RNoIndex` | `ozIndex` | |
| `Remark` (BoQBody oder Itemlist) | `Hinweistext`; `DetailTxt` → `text`, bei leerem `DetailTxt` der `OutlineText` | |
| `Item` | `Position` | |
| `Qty` (3 NK) / `UP` | `menge` / `einheitspreis` über `leseAustausch`; fehlt → `null` | Rundung/Hinweise → Befunde |
| `QtyTBD`, `LumpSumItem` ohne `Qty` | `menge` `null`, kein Befund; sonst `menge-fehlt` | FD 11.2.3 Item 2 |
| `QU` | `einheit`; fehlt → `null`, Befund `einheit-fehlt` | FD 11.2.3 Item 7 |
| `Description/…/OutlTxt/TextOutlTxt` | `kurztext` (Zeilenumbrüche → Leerzeichen) | |
| `Description/…/DetailTxt` | `langtext` (Text, `image` → `Bild` an seiner Stelle) | FD 4.6.8 |
| `LumpSumItem=Yes` | `pauschal = true` | FD 4.5.1 (Merkmal „Pauschalposition“); Elementname aus Datei |
| `HourIt=Yes` | `positionsart = 'stundenlohn'` | nur aus den Dateien belegt (siehe Offene Fragen 2) |
| `Provis` WithTotal/WithoutTotal | `positionsart = 'bedarf'`, `bedarfMitGesamtbetrag` | FD 4.5.3 („mit GB“/„ohne GB“) |
| `ALNGroupNo`/`ALNSerNo` > 0 | `positionsart = 'wahl'`, `grundpositionId` = erste Position der Gruppe mit `ALNSerNo` 0 davor im selben `Itemlist` | FD 4.5.2 (Zuordnungszahl, laufende Nummer 0 = Grundausführung, 1–9 Varianten, nur innerhalb desselben LV-Bereichs) |
| `MarkupItem` | `Position` mit `positionsart = 'zuschlag'`, `menge`/`einheitspreis` `null` | FD 4.5.4, 4.6.14 |
| `MarkupType=ListInSubQty` mit `MarkupSubQty/RefItem` | `bezugspositionId` = erste referenzierte Position; Rest → Befund | FD 11.2.3 MarkupItem 3–4 |
| `MarkupType=AllInCat` / `IdentAsMark` | `bezugspositionId = null`, Befund `zuschlag-bezug-nicht-abbildbar` | FD 11.2.3 MarkupItem 1–2: Bezug sind „alle davorstehenden“ bzw. „markierte“ Positionen, kein einzelner Verweis |
| `ID`-Attribute | nur Prüfung (Doppelte, unbekannte `IDRef`); Modell-Kennungen kommen aus `IdQuelle` | |

Positionsart bei mehreren Merkmalen: Reihenfolge `wahl` > `bedarf` > `stundenlohn` > `normal`; jedes verlorene Merkmal ist ein
Befund `positionsart-kombination` (FD 4.5.3: „Das Merkmal Bedarf kann mit allen Positionsarten kombiniert werden“). Das ist eine
Notlösung, keine Entscheidung (Offene Fragen 1).

#### Entscheidungen zu den Fragen im Auftrag

1. **Pauschal und Stundenlohn.** Pauschal ist in GAEB ein Merkmal `LumpSumItem` (FD 4.5.1: „Merkmal Pauschalposition“; Menge kann
   entfallen oder ist 1; „Freie Menge“ nicht kombinierbar) → `pauschal` passt. Stundenlohn ist in den Dateien ein Merkmal `HourIt`
   neben anderen Merkmalen (in der AVA-X81 sogar zusammen mit `Provis` und `NotAppl`), nicht eine Art → `positionsart: 'stundenlohn'`
   kann es nur ersetzen, nicht ergänzen. In der FD 3.3 steht `HourIt` nicht; die Bedeutung stützt sich auf die Positionstexte der
   AVA-X81 („Meister“, „Geselle“, „Lehrling“, Einheit `Std`).
2. **Los und Ebenen.** BoQBkdn kennt den Typ `Lot` (FD 11.2.3 BoQInfo 3: „muss an erster Stelle stehen“; 4: „nur ein Objekt“; 6: höchstens
   fünf `BoQLevel` oder ein `Lot` und höchstens vier `BoQLevel`). FD 4.2.1: „Das Los ist Bestandteil der OZ und belegt … die oberste
   Hierarchiestufe … Insgesamt werden 5 Hierarchiestufen (einschließlich Los) zugelassen.“ **Das bestätigt die vorläufige Annahme der
   Baum-Umsetzung: Los direkt unter der Wurzel, zählt als eine der 5 Stufen, belegt eine Stelle von `OzMaske.gliederung`.** Der Leser
   setzt das so um. In **keiner** der amtlichen Dateien kommt `Lot` vor (X81/X83: nur `BoQLevel`: Bauausführung 2, AVA 3, Texterstellung 2
   Ebenen); die Umsetzung ist deshalb nur mit synthetischen Eingaben getestet (`grenzen.test.ts`). `LotGrp` (Losgruppen) hat der Vertrag
   nicht → Befund `nicht-abgebildet`. FD 4.3.4: Stufen dürfen unbelegt bleiben, Positionen hängen dann an einer höheren Stufe (die AVA-X81
   hat Positionen direkt unter Ebene 1, OZ `3.10`); die OZ enthält dann einfach weniger Teile.
3. **Textformatierung im Langtext.** Die amtlichen Dateien enthalten: `style` an `p`/`span`/`td` (Schriftfamilie, -größe, Farbe, fett,
   Ausrichtung, Ränder), Tabellen (`table`/`tr`/`td`, `colspan`, `width`), Listen (`ul`/`ol`/`li`), `page` (Seitenumbruch), `image`
   mit `align`/`width`, Textergänzungen (`TextComplement` mit `Kind`/`MarkLbl`, `ComplCaption`/`ComplBody`/`ComplTail`), außerdem
   `ComplBodyDec` (nur AVA-X81). FD 11.3.2 beschreibt die erlaubten `style`-Eigenschaften. Der `Langtext` des Vertrags hält nur Text
   und Bild. Verloren gehen: alle `style`-Angaben, Tabellenstruktur (Zellen werden mit Tabulator, Zeilen mit Zeilenumbruch
   geschrieben), Listenstruktur (Zeilen mit `- ` bzw. `1. `), Seitenumbruch, Bildgröße/-ausrichtung, die Art und Nummer der
   Textergänzung (Bieter/Ausschreibender). Erhalten bleiben Absätze und `br` (als Zeilenumbruch), Text und Bilder samt Reihenfolge; der Text
   einer Textergänzung steht inline (Caption + Body + Tail). **Nichts davon geht still verloren:** je Datei ein Befund
   `formatierung-verworfen` mit Zahl der betroffenen Texte, den Arten und dem ersten Ort.
4. **MwSt-Satz.** siehe API (`standardMwstSatz`, Befund `mwst-ersatzwert`).
5. **Höchstlänge der OZ (für Ticket 06).** Dokumentiert: „Die OZ umfasst höchstens 14 Stellen und besteht aus ggf. den Stellen der
   Hierarchiestufen, den Stellen der Positionsnummer und ggf. des einstelligen Positionsindex“ (FD 3.3 **4.2.1 Ordnungszahl**);
   „Die Summe der Länge aller Teilschlüssel in den Objekten BoQBkdn darf nicht größer als 14 sein“ (FD 3.3 **11.2.3, Objekt BoQInfo, Regel 2**);
   „Die gesamte OZ darf maximal 14 Stellen lang sein. Unter Verwendung eines Index kann somit der Positionszähler 13 Stellen und ohne Index
   14 Stellen lang sein“ (FD 3.3 4.3.3). Der Index ist „immer einstellig und alphanumerisch“ (4.2.1; BoQBkdn Regel 2: Länge 1).
   Zeichen der OZ: Leerzeichen, `0-9`, `A-Z`, `_`, `a-z`, Sortierreihenfolge in dieser Reihenfolge; keine Umlaute/ß (4.2.1). Der Leser
   exportiert `OZ_MAX_LAENGE = 14` und `MAX_STUFEN = 5` aus `@tethys/gaeb`.

#### Befundcodes (`quelle: 'gaeb-lesen'`)

Fehler: `datei-zu-gross`, `xml-doctype-entitaeten`, `xml-doctype-ungueltig`, `xml-tag-nicht-geschlossen`, `xml-tiefe-ueberschritten`,
`xml-abschnitt-offen`, `xml-keine-wurzel`, `wurzel-unerwartet`, `version-nicht-unterstuetzt`, `phase-nicht-unterstuetzt`, `lv-fehlt`,
`oz-maske-ueberlauf`, `oz-maske-ohne-position`, `oz-maske-ungueltig`, `gliederung-zu-tief`, `gliederung-ueberzaehlig`,
`oz-teil-ueberlauf`, `oz-ueberlauf`, `doppelte-id`, `dezimal-ungueltig`, `gerundet`.

Warnung: `kodierung-ungueltig`, `kodierung-unbekannt`, `xml-doctype-ignoriert`, `xml-schliessendes-tag-unerwartet`,
`xml-entitaet-unbekannt`, `xml-zeichenreferenz-ungueltig`, `xml-zeichen-unerwartet`, `xml-attribut-fehlerhaft`, `xml-text-ausserhalb`,
`xml-mehrere-wurzeln`, `befunde-begrenzt`, `namespace-fehlt`, `namespace-unbekannt`, `version-widerspruch`, `version-unbekannt`,
`phase-widerspruch`, `phase-endung-widerspruch`, `phase-ungueltig`, `phase-unbekannt`, `oz-maske-reihenfolge`, `oz-index-laenge`,
`oz-index-ohne-maske`, `oz-teil-fehlt`, `oz-teil-zeichen`, `doppelte-ordnungszahl`, `verweis-unbekannt`, `enum-ungueltig`,
`dezimalkomma`, `leerraum-entfernt`, `plus-entfernt`, `fuehrende-nullen-entfernt`, `vorzeichen-null-entfernt`, `nullen-abgeschnitten`
(Codes der Dezimalhinweise aus `dezimal` unverändert; „mehr Stellen als zulässig, Wert unverändert“ sind Warnungen, `gerundet` ist ein
Fehler, weil sich der Wert ändert; weniger Stellen sind zulässig und kein Befund), `einheit-fehlt`, `menge-fehlt`, `beschreibung-fehlt`,
`positionsart-kombination`, `wahl-angabe-unvollstaendig`, `wahl-ohne-grundposition`, `wahl-variante-nicht-abgebildet`,
`zuschlag-bezug-nicht-abbildbar`, `formatierung-verworfen`, `bild-ungueltig`, `bild-medientyp-fehlt`, `bild-in-kurztext-verworfen`,
`mwst-ersatzwert`, `lv-leer`, `nicht-abgebildet`.

`nicht-abgebildet` und `formatierung-verworfen` sind **je Datei zusammengefasst** (Zahl der Vorkommen, Ort des ersten), damit eine Datei
nicht Tausende gleichartige Befunde hat; alle anderen Befunde sind einzeln mit `ort.pfad`, `ort.zeile`, `ort.spalte` und, wo es einen Knoten
gibt, `ort.knotenId`/`ort.feld`. `nicht-abgebildet` nennt jedes gelesene, aber nicht übernommene Element (z. B. `Item/PredQty`,
`Item/CtlgAssign`, `Item/QtySplit`, `Item/QtyTBD`, `Item/MarkupIt`, `Item/NotAppl`, `Item/SubDescr`, `Item/RefDescr`, `Itemlist/PerfDescr`,
`BoQCtgy/ALNBGroupNo` (Alternativbereiche), `Award/AddText` mit darin eingebetteten Bildern, `Award/AwardInfo`, `Award/OWN`, `PrjInfo/*`,
`BoQInfo/*` außer Name und Gliederung). `GAEBInfo` (Angaben zum erzeugenden Programm) wird still ignoriert.

#### Ergebnisse je Datei

Amtliche 3.3-Dateien (Golden: `packages/gaeb/testdaten/golden/<name>.golden.jsonl`, erste Zeile Zusammenfassung, dann ein Befund je Zeile):

| Datei | Phase/Version | Gliederungen | Positionen | Hinweistexte | OZ-Maske (Gliederung · Position · Index) | Art der Positionen | Befunde |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BVBS Bauausführung X83 (`…V-04-04-2024.x83`) | X83 / 3.3 | 12 (2 Ebenen) | 28 (27 `Item` + 1 `MarkupItem`) | 4 | 3+3 num · 4 num · 1 alphanum | 24 normal, 2 bedarf, 1 wahl, 1 zuschlag | 23 Warnungen, 0 Fehler |
| BVBS AVA X81 (`…V-11-06-2021.X81`) | X81 / 3.3 | 22 (3 Ebenen) | 74 (68 + 6) | 14 | 1+2+2 num · 4 num · 1 alphanum | 51 normal, 8 wahl, 5 bedarf, 4 stundenlohn, 6 zuschlag; 3 pauschal | 35 Warnungen, 0 Fehler |
| BVBS Texterstellung X81 | X81 / 3.3 | 10 (2 Ebenen) | 18 | 6 | 2+2 num · 4 num · kein Index | 18 normal | 17 Warnungen, 0 Fehler |

Alle Zahlen sind **eigene Zählung, nicht amtlich bestätigt.** Der amtliche Datei-Inhalt wurde mit den Zahlen gegengeprüft, die ein
unabhängiges Python-`ElementTree`-Skript aus denselben Dateien zählt (Bauausführung 27 `Item` + 1 `MarkupItem`, 12 `BoQCtgy`, 4 `Remark`;
AVA 68 + 6, 22, 14), nicht an einer amtlichen Angabe.

Bauausführung: Die Positionsnummern aus den BVBS-Prüfkriterien, die Ticket 23 notiert hat (nur gelesen, die PDF liegt nicht im Repo),
ergeben sich aus der Zusammensetzung der OZ genau so: `001.001.0010` mit Index `1` und `A` (Bedarf mit Gesamtbetrag), `001.002.0030` mit
Menge `12345678.012`, `001.002.0040` Grundposition und `001.002.0050` Alternativposition (`wahl`, Verweis auf die Grundposition),
`002.000.0000` vorhanden, `002.001.0030` Zuschlagsposition (Test `stimmt mit den Positionsnummern überein …`). Das ist ein Plausibilitäts-
abgleich einzelner Positionen. **Eine Positionszahl, Gliederungszahl oder OZ-Maske der BVBS-Prüfkriterien gibt es öffentlich nicht**
(Ticket 23); deshalb bleibt das Akzeptanzkriterium „stimmt mit den Angaben der BVBS-Prüfkriterien überein“ **nicht abgehakt**. Ob die
Prüfkriterien intern Zahlen nennen, ist offen.

Version 3.1 (`fixtures/extern/gaeb/3.1-musterdateien`, alle 8 Dateien, Test je Datei): Kein Absturz. Verhalten: Fehlerbefund
`version-nicht-unterstuetzt` („GAEB DA XML 3.1 wird nicht gelesen; gelesen wird nur 3.3 (3.2 folgt mit Ticket G4)“),
`GaebLesung.version = null` (3.1 ist im Vertragstyp `GaebVersion` nicht darstellbar), `phase` wird trotzdem aus `Award/DP` erkannt (X83/X81 usw.),
**`inhalt: null`, kein Best-Effort-Inhalt.** Begründung: Ticket-Grenze G4, und ein halb gelesener 3.1-Inhalt würde Prüfungen vortäuschen.
3.2 verhält sich gleich, mit `version = '3.2'`. Eine unbekannte Version (z. B. 3.4, 9.9) wird dagegen als Warnung `version-unbekannt`
gemeldet und tolerant wie 3.3 gelesen (`version = null`).
Andere Phasen (z. B. X84): Fehler `phase-nicht-unterstuetzt`, `inhalt: null`, Phase/Version bleiben erkannt.

Fehlerdateien: Die zehn Fehlerdateien aus freien Projekten gab es nicht (Ticket 23, Zugriff verweigert). **Abweichung:** Sie sind hier selbst
verfasst, kleine synthetische X83 (erfundener Inhalt, keine Namen, Eigenwerk unter AGPL), unter `packages/gaeb/testdaten/fehler/`
(12 Dateien, je ein Fehler, `.gitattributes` mit `-text`, damit die Bytes bleiben). Jede hat ein Golden mit den Befunden:

| Datei | Fehler | erwarteter Befund | übrige Positionen |
| --- | --- | --- | --- |
| `01-tag-nicht-geschlossen.x83` | `</QU>` fehlt | `xml-tag-nicht-geschlossen` (Fehler), Einheit `m3` bleibt | 4 |
| `02-dezimalkomma.x83` | `<Qty>12,500` | `dezimalkomma` (Warnung), Menge `12.500` | 4 |
| `03-enum-ungueltig.x83` | `<Provis>Vielleicht` | `enum-ungueltig` (Warnung), Art `normal` | 4 |
| `04-doppelte-id.x83` | zwei Elemente `ID="I1"` | `doppelte-id` (Fehler) | 4 |
| `05-latin1-als-utf8.x83` | Latin-1-Bytes, UTF-8 deklariert | `kodierung-ungueltig` (Warnung), Umlaute korrekt | 4 |
| `06-oz-ueberlauf.x83` | Teilschlüssel zusammen 15 Stellen | `oz-maske-ueberlauf` (Fehler) | 4 |
| `07-namespace-fehlt.x83` | kein `xmlns` | `namespace-fehlt` (Warnung), Phase/Version aus den Elementen | 4 |
| `08-version-unbekannt.x83` | Version 9.9 | `version-unbekannt` (Warnung), `version = null`, tolerant gelesen | 4 |
| `09-menge-ohne-einheit.x83` | Menge ohne `QU` | `einheit-fehlt` (Warnung) | 4 |
| `10-phase-endung-widerspruch.x81` | Inhalt X83, Endung `.x81` | `phase-endung-widerspruch` (Warnung), Phase X83 | 4 |
| `11-oz-teil-ueberlauf.x83` | `RNoPart` länger als `Length` | `oz-teil-ueberlauf` (Fehler) | 4 |
| `12-datei-abgeschnitten.x83` | Datei endet mitten in `<Qty>` | neun Fehler `xml-tag-nicht-geschlossen` | 2 (bis dahin gelesen) |

#### Leistung

Messung (Test `Datei über 2 MB …`, synthetische X83 mit 4.200 Positionen und Langtexten, 2,09 MB, nach einem Warmlauf, Node 22.23 auf der
Sitzungsmaschine): **99, 102 und 119 ms** für das Lesen von Bytes zu `LvInhalt` einschließlich Dekodieren, Parsen, Prüfen. Der Test erzwingt
unter 1 s; die Zeit kann auf langsameren Maschinen schwanken.

#### Goldens aktualisieren

`GOLDEN_UPDATE=1 pnpm vitest run packages/gaeb`, danach `git diff packages/gaeb/testdaten/golden` ansehen. Die Goldens sind deterministisch
(zählende `IdQuelle` in `testhilfen.ts`).

#### Offene Fragen (nicht geraten, P5) und Lücken im Vertrag

Alle ändern den Vertrag und brauchen je ein eigenes Vertragsticket (A4). Nichts davon wurde im Vertrag geändert.

1. **Mehrere Positionsmerkmale gleichzeitig.** GAEB erlaubt Bedarf zusammen mit jeder anderen Art (FD 4.5.3) und `Provis`/`HourIt`/
   `ALNSerNo` kommen in den Dateien kombiniert vor; `Positionsart` ist eine einzelne Aufzählung. Der Leser nimmt `wahl` > `bedarf` >
   `stundenlohn` und meldet den Verlust. Zu klären: Merkmale als Flags (wie `pauschal`) oder Mengenwert.
2. **`stundenlohn`** stützt sich nur auf `HourIt` in den Dateien; steht nicht in der FD 3.3 (nur im XSD). Zu klären mit der Domäne, ob `HourIt`
   dasselbe ist wie die Stundenlohnposition im Glossar.
3. **Zuschlagsbezug.** `bezugspositionId` ist ein einzelner Verweis; GAEB kennt `AllInCat` (alle davorstehenden Positionen des Bereichs),
   `IdentAsMark` (alle mit `MarkupIt` markierten davor) und `ListInSubQty` (mehrere, mit Teilmenge). Nur ein einzelner Verweis ist abbildbar; die
   Positionen, die `MarkupIt` tragen, und `SubQty` gehen verloren.
4. **Wahlposition.** `grundpositionId` kann eine Grundposition halten; GAEB hat Gruppennummer und Variantennummer (1–9) und eine
   Grundausführung aus mehreren Positionen; Alternativbereiche (`ALNBGroupNo`) gibt es auf Gliederungsebene. Verloren gehen Gruppen- und
   Variantennummer.
5. **Langtext-Auszeichnung** (Ticket 02, Frage 7): `Langtext` hält keine Auszeichnung, keine Tabellen, keine Listen, keine Textergänzungen;
   die Textergänzung (TA/TB, Nummer) ist fachlich relevant für X84. Die AVA-X81 enthält alles davon.
6. **Weitere Vertragslücken**, die der Leser als `nicht-abgebildet` meldet: Ausführungsbeschreibung (`PerfDescr`/`RefPerfNo`), Leit-/
   Unterbeschreibung (`SumDescr`/`SubDescr`), Bezugs-/Wiederholungsbeschreibung (`RefDescr`/`RefRNo`), Mengensplit (`QtySplit`), freie Menge
   (`QtyTBD`), Katalogzuordnungen (`CtlgAssign`), `PredQty`, `NotAppl`, Vor- und Nachbemerkung des LV (`AddText`, mit Bildern),
   Bauherr/Auftraggeber (`OWN`), Auftragsdaten (`AwardInfo`), Losgruppen (`LotGrp`).
7. **Wurzelkennung.** `LvInhalt` hat keine Kennung; die Knoten der obersten Ebene tragen die `ids.leistungsverzeichnis()`-Kennung als
   `elternId`. Der Leser gibt sie als `wurzelId` zusätzlich zurück. Die App muss beim Übernehmen die Wurzel umhängen.
8. **`GaebVersion`** kennt 3.1 nicht; für 3.1 ist `version` `null`, der Befund nennt 3.1.
9. **OZ bei unbelegten Stufen.** Eine Position direkt unter Ebene 1 bekommt `3.10` statt einer Darstellung mit Platzhaltern (FD 4.3.4: `_`);
   Ticket 06 muss die Darstellung festlegen. Der Leser setzt nie `ordnungszahl`-Teile auf.
10. **Fehlende Gliederung.** Ohne `Item`-BoQBkdn nimmt der Leser 4 numerische Stellen an (und meldet `oz-maske-ohne-position`); das ist eine
    Notannahme.
11. **Ticket 23 offen:** echte Fehlerdateien freier Projekte, 3.2-Dateien (für G4) und eine amtliche Positionszahl fehlen weiter.

#### Quellen

- FD 3.3: <https://www.gaeb.de/wp-content/uploads/2021/07/Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf>, Abschnitte 4.2.1, 4.2.2, 4.3.3,
  4.3.4, 4.5.1–4.5.4, 4.6.8, 4.6.14, 4.6.16, 11.2.3 (Objekte BoQBkdn, BoQInfo, Item, MarkupItem), 11.3.1, 11.3.2, Glossar 11.5. Der
  Inhalt ist nicht ins Repo kopiert.
- Quellenseite der Downloads: <https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/> (kein XSD geladen oder committet).
- Amtliche Dateien: `fixtures/extern/bvbs/3.3-*` und `fixtures/extern/gaeb/3.1-musterdateien` (nur gelesen, ADR 0010/C4).

#### Abweichungen vom Ticket

- Die Fehlerdateien sind selbst verfasst statt aus freien Projekten (Ticket 23 hat sie nicht erhalten); zwölf statt zehn.
- Akzeptanzkriterium „stimmt mit den Angaben der BVBS-Prüfkriterien überein“ nicht abgehakt (keine öffentliche Zahl).
- Es gibt keine eigene `Leistungsverzeichnis`-Rückgabe (das ist ein Aggregat mit Kennung und Projekt), sondern `LvInhalt` wie in `GaebLesung`.

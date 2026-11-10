# 40: GAEB: Writer X81/X83/X86, eigene Prüfung, XSD-Gegenprüfung in der CI, Roundtrip (G2, Tor M2)

Status: claimed
Type: task
Welle: 3 (Phase A) · Strang: G (G2) · Paket: `packages/gaeb` (benannte Ausnahme: `.github/workflows/ci.yml`, nur der neue XSD-Schritt)
Blocked by: 32
Regeln: A2, A3, N1, N4, F2, F6, Q1, Q3, U5, C1, C3, C4, C5, G-10, G-11, G-12, G-13, E-11, ADR 0010
Herkunft: `plan.md` §2 G2 und §4 (M2), ADR 0010, E-11 (`grilling.md`), Ticket 22 (Abbildung GAEB → `vertrag`, Befundcodes), Ticket 26 (Abbildung Langtext → GAEB, Punkt 5)

## What to build

„Tolerant lesen, streng schreiben“: Ein Writer erzeugt aus einem `LvInhalt` GAEB DA XML der Phasen **X81, X83, X86** in
den Versionen **3.3 und 3.2** (G-10, G-11). Jeder Export geht durch die eigene Prüfung der App; die CI prüft zusätzlich
jede Fixture-Ausgabe gegen das amtliche XSD, das sie zur Laufzeit lädt und nie committet (ADR 0010, Q3). Vorgehen: TDD
mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün. `okf/research/` wird nicht gelesen (C3).

1. **API** (Vorschlag): `schreibeGaeb(inhalt: LvInhalt, optionen) → GaebExport` mit `optionen = { phase: 'X81' | 'X83'
   | 'X86', version: '3.3' | '3.2', erstellt: { datum: 'JJJJ-MM-TT', zeit: 'HH:MM:SS' }, programm: string }`. Datum und
   Uhrzeit für `GAEBInfo` kommen vom Aufrufer (A2: keine Uhr im Paket). Rückgabe ist der Vertragstyp `GaebExport`
   (`xml`, `befunde`, `entwurf`).
2. **Inhalt je Phase.** Wurzel `GAEB` mit Namensraum `http://www.gaeb.de/GAEB_DA_XML/DA<nn>/<version>`; `GAEBInfo`
   (`Version`, `VersDate` = `2021-05` für 3.3, `2013-10` für 3.2, `Date`, `Time`, `ProgSystem`); `Award/DP`; Kopfdaten
   (`OWN`, `AwardInfo`) aus `Auftraggeber`/`Vergabeinformationen`; `BoQ` mit `BoQInfo` (`Name`, `BoQBkdn` aus `OzMaske`:
   Lot/BoQLevel/Item/Index, `Length`, `Num`) und `BoQBody` (`BoQCtgy` mit `RNoPart`, `LblTx`; `Itemlist` mit `Item`,
   `MarkupItem`, `Remark`). Die Abbildung ist die Umkehrung der Lesetabelle aus Ticket 22 (Comments, „Abbildung GAEB →
   `vertrag`“) und der GAEB-Sätze aus Ticket 26 (Punkt 5): Merkmale → `Provis` (`WithTotal`/`WithoutTotal`), `HourIt`,
   `LumpSumItem`, `ALNGroupNo`/`ALNSerNo`, `MarkupIt`; Zuschlag → `MarkupItem` mit `MarkupType` (`ListInSubQty` mit
   `MarkupSubQty/RefItem IDRef`, `AllInCat`, `IdentAsMark`); Leitbeschreibung → `SumDescr`/`SubDescr`; Langtext →
   `DetailTxt` mit `p`, `span` (Auszeichnung im `style`), `br`, `ul`/`ol`/`li`, `table`/`tr`/`td` (`colspan`), `image`,
   `TextComplement` (`Kind`, `MarkLbl`, `Empty`, drei Teile); Kurztext → `OutlineText`.
   - **X81, X83:** ohne Preise (`UP`, `IT`, `Markup`, `ITMarkup`, `Totals` fehlen). X83 verlangt je `Item` eine Menge
     (oder `QtyTBD`) und eine Einheit.
   - **X86:** mit Preisen: `UP`, Anteile `UPComp1…n` samt `NoUPComps`/`LblUPComp<n>` im `BoQInfo` (aus
     `Einheitspreisanteile`), `IT`, bei Zuschlägen `Markup` (Satz) und `ITMarkup` (Basis) und `IT` (Betrag), `Totals` je
     Gliederung und LV (`Total`, `VAT`, `TotalGross`; Nachlass des LV als `DiscountPcnt` bzw. `DiscountAmt` mit
     `TotAfterDisc`). Die Werte nimmt der Writer aus dem Summenstand, den der Aufrufer mitgibt (der Writer rechnet nicht;
     `gaeb` darf `kern` nicht importieren, A3). Vorschlag: `optionen.summen?: Summenstand`, Pflicht für X86.
   - **GAEB-Kennungen** (`ID`, `IDRef`): deterministisch aus den Modell-Kennungen abgeleitet (gültiger XML-Name, z. B.
     Präfix plus Kennung ohne Bindestriche), damit die Ausgaben Golden-Dateien sein können.
   - Zahlen in Punktnotation mit fester Skala (Menge 3, EP 3, Betrag 2, Satz 2), nie de-DE (N4).
3. **Eigene Prüfung** (`quelle: 'gaeb-pruefung'`), läuft bei jedem Export; Fehler setzen `entwurf: true` und der Export
   bekommt am Anfang einen XML-Kommentar „Entwurf: …“ (G-13). Der Export wird nie gesperrt (U5). Mindestens, je mit Code
   und Test (Grenzen aus dem XSD 3.3, in der Ticketsitzung gelesen, nicht im Repo):
   - OZ höchstens 14 Stellen, passt zur Maske, Index ein Zeichen (F2); doppelte OZ (Fehler).
   - Einheit höchstens 4 Zeichen, einzeilig (Fehler); Einheit fehlt in X83 (Fehler).
   - Menge höchstens 8 Vorkommastellen (11 Stellen, davon 3 nach dem Komma), EP höchstens 10 Vorkommastellen
     (13/3), Beträge höchstens 11 Vorkommastellen (13/2), Zuschlagssatz höchstens 3 Vorkommastellen (Fehler).
   - LV-Name für `BoQInfo/Name` höchstens 20 Zeichen: länger → gekürzt geschrieben, voller Name in `LblBoQ`, Warnung.
   - Kennungen eindeutig, jedes `IDRef` zeigt auf ein geschriebenes Element (Fehler).
   - Pflichtelemente je Phase vorhanden (Fehler).
4. **Verwerfen mit Warnung (E-11).** Was das Modell trägt, die Zielphase oder -version aber nicht abbilden kann, wird
   nicht geschrieben und als Warnung gemeldet (Code z. B. `export-verworfen`, je Datei zusammengefasst wie
   `nicht-abgebildet` beim Lesen): z. B. Preise und Anteile in X81/X83, Wahlposition ohne Gruppe/Variante (Vorschlag:
   ohne `ALNGroupNo`/`ALNSerNo` schreiben und warnen), Teilmenge einer Bezugsposition, wenn 3.2 sie nicht trägt, die
   Altform einer Zuschlagsposition (Menge × EP ohne Satz, Ticket 37 R8: als `MarkupItem` ohne Menge und EP schreiben und
   warnen). Was schon der Import nicht übernommen hat, kennt das Modell nicht mehr; das meldet der Import (Ticket 22).
5. **Lesen für den Roundtrip.** Der Leser nimmt zusätzlich **X86** (Preise, Satz, Anteile, `Totals` nur als Prüfung
   gegen die eigene Summe) und **Version 3.2** der Phasen X81/X83/X86 an (gleiche Elemente, anderer Namensraum und
   `VersDate`; Abweichungen, die die XSD-Gegenprüfung zeigt, als Befund). X84 bleibt Ticket 45.
6. **Roundtrip (Q3).** Für jede Fixture (`winzig`, `typisch`, `gross`, `zuschlag` falls Ticket 37 sie angelegt hat) und
   die Inhalte, die der Leser aus den amtlichen 3.3-Dateien X81/X83 liest: Export → Import → Modell gleich dem
   Ausgangsmodell, bis auf die Kennungen (über die zählende `IdQuelle` der Tests in Dokumentreihenfolge vergleichbar) und
   bis auf eine je Phase festgeschriebene, kurze Liste erwarteter Unterschiede (X81/X83: keine Preise; Altform, siehe 4).
   Zweiter Export des wieder gelesenen Modells ist byte-gleich dem ersten.
7. **XSD-Gegenprüfung in der CI** (benannte Ausnahme von P2: nur `.github/workflows/ci.yml`, ein neuer Job oder Schritt):
   - Ein Skript des Pakets (Vorschlag `pnpm --filter @tethys/gaeb run xsd-gegenpruefung`) schreibt alle Fixture-Exporte
     (jede Fixture × X81/X83/X86 × 3.3/3.2) in ein Verzeichnis außerhalb des Repos (`$RUNNER_TEMP` bzw. das Temp-
     Verzeichnis des Systems).
   - Es lädt die amtlichen Schemadateien zur Laufzeit in ein Temp-Verzeichnis: 3.3 aus
     `https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Leistungsverzeichnis.zip` (Dateien
     `GAEB_DA_XML_8x_3.3_2021-05.xsd` und `GAEB_DA_XML_Lib_3.3_2021-05.xsd`), 3.2 aus
     `https://www.gaeb.de/wp-content/uploads/2019/04/Leistungsverzeichnis.zip` (Ordner `Leistungsverzeichnis/`,
     `GAEB_DA_XML_8x_3.2_2013-10.xsd`). Die SHA-256 der beiden ZIP-Dateien steht im Skript; weicht sie ab, schlägt die CI
     mit klarer Meldung fehl (das Schema hat sich geändert).
   - Prüfung je Datei mit `xmllint --noout --schema <xsd> <datei>` (in der CI vorher `sudo apt-get install -y
     libxml2-utils`, falls nicht vorhanden). Jeder Schemafehler lässt den Schritt scheitern und nennt Datei und Zeile.
   - Der Schritt prüft zuerst, dass kein `*.xsd` versioniert ist (`git ls-files '*.xsd' '*.XSD'` leer), sonst Fehler.
   - **Lokal:** In der Ticketsitzung (2026-11-10) war `www.gaeb.de` aus dem Container erreichbar, `xmllint` vorhanden,
     und die amtlichen Dateien BVBS AVA X81/X84/X86 sowie Bauausführung X83 bestanden die Prüfung gegen das 3.3-XSD. Das
     Skript läuft deshalb auch lokal. Ist das Netz oder `xmllint` nicht da, gibt es lokal eine sichtbare Meldung
     „XSD-Gegenprüfung übersprungen: <Grund>“ und Exit 0; in der CI (`CI=true`) ist das ein Fehler. Die geladenen Dateien
     werden nach dem Lauf gelöscht und landen nie im Repo.
   - Die Ausgabe der Gegenprüfung ist kein `Pruefbefund` zur Laufzeit; der Befundquelle-Wert `xsd-gegenpruefung` bleibt
     für einen späteren Bericht frei.

## Grenzen

- **Paket `packages/gaeb`**, Ausnahme `.github/workflows/ci.yml` nur für den XSD-Schritt (P2, hier benannt). Keine neue
  Laufzeitabhängigkeit; `xmllint` ist ein Werkzeug der CI, kein Paket (C5). Kein fremder Code (C1).
- `gaeb` importiert nur `vertrag` und `dezimal` (A3). Summen kommen vom Aufrufer.
- Das XSD und Auszüge daraus kommen nie ins Repo (ADR 0010); in Tests und Kommentaren nur Element- und Typnamen.
- Golden-Dateien der Exporte (`packages/gaeb/testdaten/golden/export/`) sind selbst erzeugt und AGPL (REUSE wie die
  übrigen Goldens).
- **Zu groß (sicher mehr als 4 h)?** Zuerst streichen, in dieser Reihenfolge, und als Folgeticket in die Comments:
  (1) Version 3.2 (Schreiben und Lesen; die CI prüft dann nur 3.3), (2) X86 samt Lesen von X86, (3) Listen und Tabellen
  im Langtext (dann als Absätze schreiben und warnen), (4) Kopfdaten. X81 und X83 in 3.3 mit eigener Prüfung, Roundtrip
  und XSD-Schritt bleiben in jedem Fall.

## Acceptance criteria

- [x] `schreibeGaeb` erzeugt X81, X83 und X86 in 3.3 und 3.2; Golden-Datei je Fixture und Phase (deterministisch)
- [x] Eigene Prüfung: jede Regel aus Punkt 3 mit Code und Test; ein Export mit Fehler hat `entwurf: true` und den Entwurf-Kommentar, ein Export ohne Fehler nicht
- [x] Verwerfen mit Warnung: je Fall aus Punkt 4 ein Test, der die Warnung erwartet
- [x] Roundtrip Export → Import → Modell gleich für jede Fixture und Phase, auch für die aus den amtlichen X81/X83 gelesenen Inhalte; zweiter Export byte-gleich
- [x] Der Leser nimmt X86 und 3.2 an; X84 weiter `phase-nicht-unterstuetzt` (bis 45)
- [x] CI-Schritt: lädt das XSD zur Laufzeit, prüft die SHA-256, validiert jede Fixture-Ausgabe mit `xmllint`, schlägt bei einem Schemafehler oder einem versionierten `*.xsd` fehl; lokal sichtbarer Hinweis beim Überspringen
- [x] Lokaler Lauf der Gegenprüfung in der Sitzung: Ergebnis (bestanden/Fehler je Datei) im Ticket
- [x] Export von `gross` (5.000 Positionen) als X86 unter 1 s (Messwert im Ticket)
- [x] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

X84-Import (45), X82/X85/X89, GAEB 90/2000 und Lesen von 3.1 (G4), Oberfläche für Export (49), Prüfung der Fachinhalte
eines LV (K8, Ticket 41), Rechnen im Writer.

## Comments

### Umsetzung (Branch `ticket/40-gaeb-writer`)

Nichts gestrichen: X81/X83/X86 in 3.3 und 3.2, Listen/Tabellen im Langtext und Kopfdaten sind drin. Seams (Demo-Modus,
aus dem Ticket): `schreibeGaeb` und `leseGaeb`, dazu der Rundweg durch beide. Neue Dateien: `src/schreiben.ts`
(Writer und eigene Prüfung), `src/text-schreiben.ts` (Langtext → GAEB), `src/ausgabe.ts` (XML-Ausgabe),
`werkzeuge/xsd-gegenpruefung.mjs`, `src/xsd-ausgabe.test.ts` (schreibt die Exporte nur für das Skript),
`packages/gaeb/.gitignore` (`*.xsd`), Goldens unter `testdaten/golden/export/` (winzig, typisch je X81/X83/X86 3.3;
`gross` nur SHA-256, 6 MB je Datei). CI: ein Schritt „GAEB XSD-Gegenprüfung“ in `.github/workflows/ci.yml`.

**Tor M2 (Stand 2026-11-10, lokal, `www.gaeb.de` erreichbar, xmllint 2.9):**

| Inhalt | Phasen × Versionen | Export | eigene Prüfung | XSD | Rundweg (Modell gleich, 2. Export byte-gleich) |
|---|---|---|---|---|---|
| `winzig`, `typisch`, `gross` | X81, X83, X86 × 3.3, 3.2 | 18 | 18 ohne Fehler | 18 bestanden | 18 (Unterschiede siehe unten) |
| `reichesLv` (Testhilfe: Los, alle Merkmale, Wahl mit Nummern, 3 Zuschlagsformen mit Satz und Teilmenge, Leitbeschreibung, EPA, Langtext mit Liste/Tabelle/colspan/Bildern/Textergänzung, Kopfdaten, Nachlass) | X81, X83, X86 × 3.3, 3.2 | 6 | 6 ohne Fehler | 6 bestanden | X86 3.3/3.2 verlustfrei; X81/X83 3.3 bis auf Preise |
| gelesene amtliche BVBS AVA-X81, Bauausführung-X83, Texterstellung-X81 | X81, X83 × 3.3, 3.2 | 12 | 12 ohne Fehler | 12 bestanden | 6 (3.3) |

`pnpm --filter @tethys/gaeb run xsd-gegenpruefung`: **36 von 36 Dateien bestanden** (Ausgabe je Datei
„bestanden“). Gegenprobe: eine Einheit `meter` lässt xmllint mit Zeile und `maxLength` scheitern; `XMLLINT=/nicht/da`
ohne `CI` → „XSD-Gegenprüfung übersprungen: xmllint ist nicht installiert“, Exit 0; mit `CI=true` Exit 1.
SHA-256: 3.3-ZIP `d4f19a79…e203`, 3.2-ZIP `b655e955…fe76` (voll im Skript). X86 in der Gegenprüfung nur für Fixtures
und `reichesLv` (die amtlichen Inhalte hätten keinen Summenstand; der kommt vom Kern).

**Erwartete Unterschiede im Rundweg** (vollständige Liste, `roundtrip.test.ts`, `erwartet`): X81/X83 ohne EP, EPA,
Zuschlagssatz, Nachlass; Altform einer Zuschlagsposition verliert in X81/X83 Menge, Einheit, EP, in X86 den
Zuschlagsbezug; Wahl ohne Gruppe/Variante verliert die Wahl; X86 ohne Auftraggeber liest einen leeren Auftraggeber.

**Messung:** `gross` als X86 (5.000 Positionen, 6,9 Mio. Zeichen): 272 ms (Test-Grenze 1 s).

**Suite:** `pnpm lint` grün; `pnpm typecheck` grün; `pnpm test`: Vitest 1125 bestanden, 2 übersprungen (eins davon
`xsd-ausgabe.test.ts` ohne `GAEB_EXPORT_VERZEICHNIS`), `node --test` 14/14.

### Entscheidungen (Frage – Entscheidung – Grund)

- API – `schreibeGaeb(inhalt, { phase, version, erstellt, programm, summen?, zuschlagsbasen?, auftragnehmer? })` →
  `GaebExport` – wie vorgeschlagen; `zuschlagsbasen` (Basis je Zuschlagsposition, vom Kern `zuschlagsbasen`, Ticket
  37) und `auftragnehmer` (Name für `CTR`) sind zusätzlich, weil X86 `ITMarkup` und `CTR` verlangt und der Writer
  nicht rechnet (A3).
- X86 ohne Auftraggeber/Auftragnehmer – `OWN`/`CTR` mit leerer Adresse (Schema erlaubt leere Felder), Warnung
  `angabe-leer`, kein Fehler – das Modell kennt keinen Auftragnehmer; ein Fehler machte jede Fixture-X86 zum Entwurf.
- Altform der Zuschlagsposition in X86 – als `Item` mit Menge, EP, IT, Bezug verworfen (Warnung) – `MarkupItem`
  verlangt in X86 `Markup`; einen Satz zu erfinden verbietet C4. X81/X83 wie im Ticket (MarkupItem ohne Menge/EP).
- X83 ohne Menge – `QtyTBD` mit Warnung `menge-offen` – das Ticket lässt „Menge oder QtyTBD“ zu; `null` heißt „nicht
  gesetzt“. Der Leser übernimmt `QtyTBD` ohne Menge jetzt still (Golden ava-x81: Zeile entfällt), mit Menge bleibt
  es Befund.
- Pflichtwerte X86 – fehlender Summenstand, Bereichssumme, Zuschlagssatz oder -basis sind Fehler
  `pflichtelement-fehlt` (Entwurf); das Element fehlt dann, die Datei ist schemawidrig – Entwurf ist gekennzeichnet (U5).
- Gliederung und Positionen unter einem Knoten – Fehler `gliederung-gemischt`, beides wird geschrieben (Positionen
  in einem `Itemlist` hinter den Bereichen) – `BoQBody` erlaubt nur eines; nichts geht verloren, der Entwurf ist markiert.
- Weitere Prüfcodes über die Ticketliste hinaus (je Fehler): `oz-fehlt`, `maske-ungueltig`, `gliederung-zu-tief`,
  `wahl-nummer-ungueltig` (0–999/0–9), `unterbeschreibung-nummer-ungueltig` (1–99), `ergaenzung-kennung-ungueltig`
  (MarkLbl ist im Schema eine ganze Zahl), `wert-zu-lang`/`wert-ungueltig` (Kopfdaten, Erstellungsdatum) – alles
  Schemagrenzen, die xmllint sonst erst in der CI fände.
- Langtext an Stellen, die das Schema nicht erlaubt – Tabelle im Listenpunkt: Zellinhalt ohne Tabellenform (Warnung);
  loses Bild in `li`/`td`: in eigenem `p` (kein Verlust, ohne Warnung); leere Liste/Tabelle und Bild außer PNG/JPEG/GIF:
  verworfen (Warnung) – Text bleibt immer. Bild auf Textebene heißt im Schema `Image`, in `p` `image`; der Leser
  nimmt jetzt beide.
- EPA – `NoUPComps` 6, feste Bezeichnungen Lohn/Stoffe/Geräte/Nachunternehmer/Sonstiges, der sechste `Unknown` mit
  der `freiBezeichnung` (eine je LV; abweichende werden mit Warnung verworfen). Der Leser ordnet nach Bezeichnung,
  sonst nach `Type` – passt zur amtlichen AVA-X86 (Material/Lohn/Geräte/Nachunternehmer).
- LV-Name – `Name` gekürzt (20, ohne Leerraum am Ende), `LblBoQ` voll (bis 60). Der Leser nimmt `LblBoQ`, wenn
  `Name` dessen Anfang ist, sonst wie bisher `Name` – Rundweg; Golden texterstellung-x81: Name jetzt „GAEB
  Zertifizierung 3.3 Textersteller“ statt „GAEB Zer“, AVA und Bauausführung unverändert.
- Leser X86 – übernimmt `UP`, `UPComp`, `Markup`, `Totals/VAT` (statt Ersatz-MwSt) und den LV-Nachlass; `IT`,
  `ITMarkup`, Bereichs- und LV-Beträge sind abgeleitet und werden nicht übernommen; ein `IT` ≠ gerundet(Menge × EP) ist
  Warnung `gesamtpreis-abweichend` (amtliche X86: Positionsnachlass, G-23). Totals der Bereiche gegen eigene Summen
  zu prüfen bräuchte den Kern; das bleibt der App. `CTR` bleibt `nicht-abgebildet`.
- Leser 3.2 – wie 3.3 (Schemata für unsere Elemente gleich bis auf Namensraum, Version, VersDate); 3.1 weiter
  `version-nicht-unterstuetzt`. `OutlCompl` gilt als behandelt (Golden: drei Zeilen entfallen).
- Teilmenge (`SubQty`) – geschrieben und gelesen (3.2 trägt sie wie 3.3, nichts zu verwerfen); vorher war sie Befund.
- XSD-Skript – lädt per `curl`, entpackt mit `node:zlib` (kein `unzip` nötig), schreibt die Exporte über einen
  Vitest-Lauf (TS ohne Build), Temp-Verzeichnis unter `$RUNNER_TEMP`/`os.tmpdir()`, danach gelöscht; `XMLLINT`
  überschreibt das Programm (zum Prüfen des Überspringens).

### Offen / Hinweise

- Fixture `zuschlag` (Ticket 37) gibt es auf `integration/welle-3` noch nicht; `FIXTURES` in `testhilfen.ts` ist die
  eine Stelle, an der sie dazukommt (Zuschläge mit Satz deckt bis dahin `reichesLv` ab).
- Ticket 49 (Oberfläche): der Aufrufer muss für X86 `summen` und `zuschlagsbasen` vom Kern mitgeben, `erstellt` aus
  der Uhr der App.


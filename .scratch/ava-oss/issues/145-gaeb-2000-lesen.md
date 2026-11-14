# 145: GAEB 2000 lesen (.p81/.p83/.p84/.p86)

Status: resolved
Type: task
Welle: 7 · Strang: G4, E6 · Paket/Ordner: `packages/gaeb`, `fixtures/gaeb-formate/`
Blocked by: 144
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: C1, C4, U5, Q5; D-71
Herkunft: umfang §3 E6

## What to build

Wie 144, für GAEB 2000 (Schlüsselwort-Format). **Nur, wenn eine frei zugängliche Formatbeschreibung erreichbar ist (D-71);
sonst sofort abbrechen**, im Ticket begründen und `Status: wontfix (gekürzt nach §4)` setzen – die klare Abweisung aus 136 bleibt.
Testdateien .p83/.p86 desselben LV in `fixtures/gaeb-formate/`, Formatvergleich (Tor E Punkt 3) um GAEB 2000 erweitert.

## Acceptance criteria

- [x] Leser mit Tests oder begründete Kürzung; Formatvergleich grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

### Quellen (D-71: frei zugänglich, nur gelesen, eigene Worte; keine Normtexte, kein fremder Parser, kein `okf/research/`)

- **Q1** „Das Freie GAEB Buch“, MWM, V 4.0 (`mwm.de/download/ftp/docs/Das_freie_GAEB_Buch.pdf`, gleichlautend bei BVBS):
  1.5 (Objektstruktur statt 80er-Zeilen, OZ bis 14 Stellen, Index genau 1 Stelle, Beispielausschnitt), 1.5.1 (Phasen, „verbindlich
  ist die Information in der Datei“), 1.5.2 (bis 5 Stufen), 2.1.1 (Endung `.Pxx`), 3.2.1/3.2.2 (Beispiele DA83 und DA84: `GAEBInfo`
  mit Version/Datum/ProgSystem/Zeichensatz `ANSI`, `Vergabe` mit `[DP]`, `VergabeInfo` mit `Wae`/`WaeBez`, `AG`, `AN`, `LV`,
  `LVInfo` mit `Name`/`Bez`/`Datum`/`KurzLang`, `LVGlied` mit `Typ` LVStufe/Position/Index, `Bez`, `Laenge`; `LVBereich` mit `OZ`
  und `Bez`; `Position` mit `OZ`, `Menge`, `ME`, `EP`, `GB` (Dezimalkomma, `93,000`/`125,040`/`11628,73`), `Beschreibung` mit
  `Kurztext`/`Langtext` als RTF; `Hinweis`), 4.2 (Versionen 1.0 1999, 1.1 2000, 1.2 2001, „GAEB 2000 XML“ 2.0/2.1).
- **Q2** T&T Datentechnik, Handbuch GAEB-Konverter 10 (`download.gaeb-tools.de/gaeb-konverter-v10-handbuch.pdf`): 2.7.2
  (Objekte `#begin[…]`/`#end[…]`, Elemente `[Name] Wert [end]` auch über mehrere Zeilen, Datei beginnt mit `#begin[GAEB]`, Nummer
  hinter dem Objekt erlaubt, oft „Gesamtanzahl aller Objekte und Elemente“ als `#end[GAEB]98|306`, Zeichensatz ANSI, ASCII oder
  Unicode; Beispiel mit `PrjInfo` Name/Bez/Beschreib/Wae, `VergabeInfo` Art/Beschreibung, `GAEBInfo` Zertifikat); 9.2 (ab 1.1 ist
  RTF vorgeschrieben, 1.0 auch unformatiert; drei Versionen mit geringen Unterschieden).
- **Q3** Dangl IT, „The GAEB Data Formats in Detail“ und die Beispieldatei `GAEB2000_DE.D86` im öffentlichen Gist
  `GeorgDangl/29c8069c6fffac955f07d2c012249819` (nur angesehen): `AG/Adresse/Name1`, `Email`; `LVInfo` `BezZeit`, `Summe`, `USt`,
  `SummeBrutto`; `LVBereich` mit `BezTx` und Summen; Zahlen mit Dezimalpunkt; `{\rtf1Text}` ohne Kopf; eigener Block `_Dangl`;
  Zählung `#end[GAEB]29|88`.
- **Q4** Thomas Seidel (B-SIK), „Arbeitsunterlagen GAEB & LV“, 2015: Beispiel P83 (`[OZ]101010 [end]` mit Leerzeichen, Kurztext
  ohne RTF, `#end[GAEB]94|286`).
- **Q5** Doepke, Ausschreibungstexte als `.p81` (`doepke.de/uploads/…/gaeb/2000/…`), Ausgabe einer fremden Software, nur angesehen
  und nicht ins Repo: Kurz- und Langtext ohne schließende `}` und ohne `[end]`, dreistufige `LVBereich`; zeigt, dass Werte ohne
  `[end]` in der Praxis vorkommen.
- **Q6** Mohr, Hilfe GaebWriter „Zuschlagsposition“: Zuschlagsarten A/P „nur GAEB2000“, Bedarf E/M, Grund-/Alternativposition –
  ohne Schlüsselwörter (nicht verwendet).

Nicht erreichbar: die offizielle GAEB-2000-Regelung (nicht frei). Probe gegen Q3 und Q5 (nicht im Repo): beide lesen mit
Inhalt; Q3 meldet eine Bereichs-OZ, die nicht zur Tiefe passt, Q5 zwei Werte ohne `[end]`.

### Entscheidungen

- **D-145.1** Tor D-71: Eine frei zugängliche Formatbeschreibung ist erreichbar (Q1 Aufbau und Beispiele, Q2 Syntax) → gebaut,
  keine Kürzung. Versionen 1.0 bis 1.2; eine andere `[Version]` ist Befund `version-unbekannt`, gelesen wird trotzdem.
- **D-145.2** Einbau wie D-144.2: Der Schalter des Vorlaufs heißt jetzt `aeltereLesen` und gibt GAEB 2000 als `schluesseldatei`
  zurück; `leseGaeb` (X81/X83/X86) und `leseAngebot` (X84) lesen in `gaeb2000.ts`, `x31Lesen` weist GAEB 2000 wie bisher mit Satz
  ab. Die Zuordnung der Angebotspreise steckt jetzt für beide Formate in `angebotsaufbau.ts` (aus `gaeb90.ts` herausgezogen,
  gleiches Verhalten). Der Satz „Eingelesen werden …“ nennt GAEB 2000 (`.p81/.p83/.p86`, Angebot `.p84`).
- **D-145.3** Fester Hinweis `format-ungeprueft` mit Format „GAEB 2000“ bei jedem Import (LV und Angebot, D-71). Zeichensatz: Die
  Datei nennt ihn (`[Zeichensatz]`); `ANSI` wird als Windows-1252 gelesen. Ist der Inhalt trotz `ANSI` gültiges UTF-8 (so Q3),
  wird UTF-8 gelesen; fehlt die Angabe, wird geschätzt; sieht ein `ANSI`-Inhalt nach DOS-Zeichensatz aus, gilt die Angabe. In allen
  drei Fällen Befund `zeichensatz-erkannt`. `\'hh` im RTF ist Windows-1252 (`\ansi`).
- **D-145.4** Bedarf, Wahl, Stundenlohn, Pauschal, Zuschlagsposition und Zuschlagskennzeichen: In keiner freien Quelle steht ein
  Schlüsselwort (Q6 nennt die Arten ohne Schreibweise) → nicht gelesen (Merkmale `false`/`null`). Ein unbekanntes Schlüsselwort an
  der Position ist ein Befund `schluesselwort-unbekannt`, so fällt eine echte Datei mit solchen Angaben auf. In den Testdateien
  stehen diese Positionen als normale Positionen, die Zuschlagsposition fehlt (Liste `FORMATUNTERSCHIEDE_2000`).
- **D-145.5** Texte: eigener RTF-Leser (`rtf.ts`) für Absatz (`\par`), Umbruch (`\line`), fett, kursiv, unterstrichen, `\'hh`,
  `\uN`; Kopf, Schrift- und Farbtabelle still; andere Formatierung (Größe, Farbe, Einzug, Tabelle) Befund `formatierung-verworfen`,
  Bilder „nicht übernommen“. Listen erkennt der Leser nicht (keine Quelle für ihre RTF-Form). Kurztext und Bezeichnung des Bereichs
  werden eine Zeile (Absätze und Umbrüche → Leerzeichen; Auszeichnung dort ist Befund). Version 1.0 ohne RTF: Zeilen wie GAEB 90
  (D-144.7). Hinweis: Langtext, ohne Langtext der Kurztext (wie D-144.7); `Hinweis` steht da, wo er in der Datei steht.
- **D-145.6** Zeilenwechsel und Einrückung in Werten sind Gestaltung der Datei (Q1, Q5 rücken Folgezeilen ein): Im RTF zählt ein
  Zeilenwechsel nicht (wie in RTF), die Einrückung danach fällt weg; im einfachen Text wird jede Zeile beschnitten. Ein Wert ohne
  `[end]` endet vor der nächsten Zeile, die mit einem Schlüsselwort beginnt (Befund `xml-tag-nicht-geschlossen`, Q5).
- **D-145.7** Zahlen: Dezimalkomma (Q1, Q4). Ein Dezimalpunkt (nur Q3) wird gelesen, ist aber ein zusammengefasster Befund
  `dezimalpunkt`; Punkt und Komma zusammen (`1.234,5`) ist `dezimal-ungueltig` (Wert fehlt).
- **D-145.8** Kopf: Name des LV wie beim DA-XML-Leser (`Name`, oder `Bez`, wenn `Name` ihr Anfang ist; sonst `Bez` „nicht
  übernommen“), Ersatz `PrjInfo/Name`; `AG/Adresse/Name1` Auftraggeber, `AN/Adresse/Name1` in X86 Auftragnehmer, in X84 Bieter.
  **Kein Steuersatz** aus `[USt]` (nur Q3, mitten zwischen Summen) → `mwst-standardsatz`/`-ersatzwert` wie D-144.8. Summen (`Summe`,
  `SummeNachNL`, `SummeBrutto`, `USt`) still wie `Totals`; Datum, Währung, Zeiteinheit, E-Mail, Projektbezeichnung,
  Bezeichnung einer Gliederungsstufe, Art und Beschreibung der Vergabe „nicht übernommen“; `GAEBInfo` außer Version still.
- **D-145.9** OZ: vollständig ohne Trennzeichen (Q1, Q3, Q5), zerlegt nach den Längen der `LVGlied`; ein Bereich der Tiefe n trägt
  die Stellen der Stufen 1 bis n; der Index ist eine Stelle mehr. Passt die Länge nicht, bleibt die OZ leer (`oz-teil-fehlt`). Ob die
  OZ einer Position mit der ihres Bereichs beginnt, prüft der Leser nicht. Fehlende oder unlesbare Maske: Fehler, die ganze OZ ist
  die Positionsnummer (wie GAEB 90).
- **D-145.10** Befunde zum Aufbau verwenden die Codes des XML-Lesers mit denselben Kurztexten (`xml-abschnitt-offen`,
  `xml-schliessendes-tag-unerwartet`, `xml-tag-nicht-geschlossen`, `xml-text-ausserhalb`, `xml-keine-wurzel`, `wurzel-unerwartet`);
  neu in `BEFUNDTEXTE`: `schluesselwort-unbekannt`, `dezimalpunkt`. Nummern hinter `#begin`/`#end` und die Zählung `n|m` hinter
  `#end[GAEB]` werden angenommen, aber nicht geprüft.

### Unsicher (für den Bericht)

1. Es gibt keine frei zugängliche vollständige Liste der Schlüsselwörter; alles ist aus Beispielen (Q1–Q5) erschlossen. Ungeprüft
   an Dateien aus anderer Software außer der Probe mit Q3 und Q5 (D-71).
2. Schlüsselwörter für Bedarf, Wahl (Gruppe/Variante), Stundenlohn, Pauschal, Zuschlagsposition, Nachlass, Unterbeschreibung,
   Einheitspreisanteile, Textergänzungen – unbekannt, nicht gelesen (D-145.4).
3. `Name` gegen `Bez` im `LVInfo` (Q1 zeigt `Name` kurz, `Bez` lang) – wie DA XML `Name`/`LblBoQ` gedeutet.
4. `[USt]` als Steuersatz – nur in Q3, nicht gelesen. `KurzLang` (in allen Beispielen `1`) – Bedeutung offen, still übergangen.
5. `Bez` gegen `BezTx` am Bereich (Q1/Q5 `Bez`, Q3 `BezTx`) – beide als Bezeichnung gelesen, `Bez` geht vor.
6. Unbelegte Gliederungsstufen (Q1 nennt sie für GAEB allgemein) – Schreibweise in GAEB 2000 unbekannt; solche OZ bleiben leer.
7. Ob ein Zeilenwechsel im RTF-Wert ein Leerzeichen meint: gelesen wie RTF (kein Zeichen); ein Wort, das am Zeilenende ohne
   Leerzeichen umbricht, würde zusammengezogen. Listen im RTF (`\pntext`, Aufzählungszeichen) – nicht als Liste erkannt.
8. Bedeutung der Zählung `n|m` hinter `#end[GAEB]` (Q2: Objekte und Elemente; in Q3 passt das nur ohne den eigenen Block) – nicht
   geprüft. „GAEB 2000 XML“ 2.0/2.1 (Q1 4.2) – Aufbau unbekannt, nicht gesondert behandelt.
9. Zeichensatz „Unicode“ (Q2): als UTF-16 mit BOM oder UTF-8 angenommen; UTF-16 ohne BOM wird nicht erkannt.

### Offen für den Orchestrator

- `GLOSSARY.md` hat einen Eintrag GAEB 90 (D-92), aber keinen zu GAEB 2000 (Schlüsselwortformat, Endung `.p8x`); liegt außerhalb
  dieses Tickets.
- `apps/web/src/gaeb/gaeb.ts:60` sagt im Kommentar noch, GAEB 90 und GAEB 2000 ergäben keinen Inhalt (Rest für 159). Der
  Dateidialog bietet `.p8x` schon an; die neuen Befundcodes haben Kurztexte in `BEFUNDTEXTE`, die App braucht nichts Eigenes.
- Ein E2E-Ablauf „GAEB 2000 einlesen“ fehlt (App-Ordner, nicht Teil dieses Tickets).

### Ergebnis

- `pnpm lint` grün, `pnpm typecheck` grün, `node --test fixtures/*.test.mjs` 53/53 grün.
- `pnpm test` (Vitest): 4.531 grün, 10 rot – alles Leistungsbudgets unter Last (Lastmittel 25 bis 39 auf 4 Kernen): `gaeb/lesen`
  „2 MB unter 1 s“ (allein grün; XML-Weg unverändert), `kern` (3), `speicher` (3), `vergabe` (2), `apps/web/abrechnung`. Pakete
  außer `gaeb` nicht berührt; kein Budget gelockert.
- GAEB-Tests: `gaeb2000.test.ts` 26 (je Schlüsselwort, Texte, Aufbau, Zeichensatz, `.p84`), `formatvergleich.test.ts` 11 (Kettentest
  mit `.p83`/`.p86` und `.p84`), `abweisung.test.ts` angepasst, `gaeb90.test.ts` 30 unverändert grün.
- E2E `e2e/gaeb.spec.ts` 8/8 grün.

## Answer

Gemergt nach `integration/welle-7` mit `99919bb`. Ergebnisse, Testläufe und Entscheidungen (D-145.x) unter `## Comments`. **Nicht gegen echte Dateien geprüft:** GAEB 2000 wie GAEB 90 nur gegen eigene Fixtures (Ticket 125 fehlt); unsichere Punkte in den Comments.

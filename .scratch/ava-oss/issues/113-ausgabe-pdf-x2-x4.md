# 113: O: PDF für Mängelliste, Bautagebuch, Honorarberechnung, Bauzeitenplan

Status: resolved
Type: task
Welle: 6 · Strang: O, X2–X4 · Paket: `packages/ausgabe`
Blocked by: 97
Modell: sonnet
Regeln: ADR 0012, A2, N4, Q5, D-56, D-57, D-58
Herkunft: Tore X2–X4 verlangen je ein PDF (`plan.md` §4, D-58)

## What to build

Vier Ausgaben über das bestehende `Ausgabemodell` (ADR 0012: das Modell rechnet nichts und trägt fertig formatierte de-DE-Texte;
pdfmake bleibt der Renderer; das Erzeugungsdatum kommt aus der Eingabe), je mit Test über den Seitentext wie die LV-Ausgabe:

1. **Mängelliste** (alle oder gefiltert, z. B. je Auftragnehmer): Nummer, Titel, Ort, Auftragnehmer, festgestellt, Frist,
   Status mit Datum, Kennzeichen „überfällig“ (die Befunde gibt der Aufrufer mit); dazu die **Mängelanzeige** für einen
   Auftragnehmer (die angezeigten Mängel mit Frist). Eingabe: `Mangel`-Liste, Kopfdaten, Befunde.
2. **Bautagebuch** für einen Zeitraum: je Tag Wetter, Arbeitskräfte je Firma, Geräte, Leistungen, Behinderungen,
   Vorkommnisse. Eingabe: `Bautagebucheintrag`-Liste.
3. **Honorarberechnung**: je Objekt anrechenbare Kosten mit Herleitung, Tafelwerte, Honorar, Phasen, Umbauzuschlag; gesamt
   Nebenkosten, Netto, USt, Brutto; Befunde und Hinweise (D-56). Eingabe: `Honorarberechnung` und `Honorarergebnis`.
4. **Bauzeitenplan** als Tabelle (Nummer, Vorgang, Dauer, Beginn, Ende, Puffer, kritisch) mit Projektende und kritischem Weg;
   Balken nicht nötig. Eingabe: `Bauzeitenplan` und `Terminplan`. (Kürzbar laut Schnitt, dann im Ticket vermerken.)

Was nicht ins Modell passt, verschwindet nicht still (Q5): Marke im Text wie „[Abbildung]“ im LV-Druck.

Aus Ticket 97 und dem Review (D-64, D-66): Eingabe des Bauzeitenplans ist `Bauzeitenplanergebnis` (nicht „Terminplan“); der
Hinweis zu DIN 276:2008-12 steht im Honorar-PDF als fester Text; die Mängelanzeige nimmt die Frist aus dem Verlaufseintrag
`angezeigt` (`frist?`).

## Grenzen

- Nur `packages/ausgabe`. Keine Rechnung im Paket (A2/ADR 0012). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Je Ausgabe ein Test über Modell und Seitentext; das PDF ist bei gleicher Eingabe gleich
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-113.1** Reicht das `Ausgabemodell` für Tabellenberichte? **Nein, es ist LV-spezifisch (OZ, Positionen, Summenblock). Daneben steht ein
  zweites, allgemeines `Berichtsmodell` (Abschnitte aus Absatz, Tabelle, Felder, Angaben, Liste) mit eigenem pdfmake-Renderer
  `erzeugeBerichtPdf`.** Grund: gleiche Regeln wie ADR 0012 (fertig formatierte de-DE-Texte, nichts gerechnet, Datum aus der Eingabe,
  Renderer tauschbar), aber keine Verbiegung des LV-Modells; der LV-Druck bleibt unverändert.
- **D-113.2** Auftragnehmer eines Mangels? **Die Eingabe der Mängelliste trägt `auftragnehmer: Record<AuftragsLvId, Name>`.** Grund: `Mangel`
  kennt nur `auftragsLvId`; ohne Auftrags-LV oder ohne Namen steht „–“. Filtern (z. B. je Auftragnehmer) macht der Aufrufer; `filter` ist nur
  der Text im Kopf.
- **D-113.3** „überfällig“? **Nur wenn ein Befund der Quelle `fristpruefung` mit `ort.mangelId` des Mangels mitgegeben wird** (Text unter dem Status).
  Das Paket vergleicht keine Daten (A2, D-57).
- **D-113.4** Frist der Mängelanzeige? **Die Frist des letzten Verlaufseintrags `angezeigt` (D-66), mit dessen Datum als „Angezeigt“; fehlt sie
  (Eintrag vor v1.6), die Frist am Mangel; sonst „–“.** Ein später wieder geöffneter Mangel behält so die Frist seiner Anzeige. Die Anzeige
  druckt, was übergeben wird; die Auswahl der angezeigten Mängel trifft der Aufrufer.
- **D-113.5** Leere Angaben? **Ein Strich „–“ statt einer leeren Zelle; Beschreibung des Mangels steht unter dem Titel** (Q5: nichts fällt
  still weg). Ein Bild gibt es hier nicht.
- **D-113.6** Bautagebuch ohne Summe der Arbeitskräfte (nicht gerechnet, A2); Temperaturen mit echtem Minuszeichen; Zeitraum `von`/`bis`
  einschließlich, Sortierung nach Datum, Filter im Druck (Eingabe ist die ganze Liste).
- **D-113.7** Honorar: Eingabe `Honorarberechnung` plus `Honorarergebnis` (Objekte nach Index zugeordnet). Gedruckt: Leistungsbild, Zone,
  Honorarsatz, Herleitung der anrechenbaren Kosten (§ 33), Tafelwerte der Zone (unten, oben, interpolierte Spanne), Honorar, Phasen,
  Grundhonorar, Umbauzuschlag, Summen, Befunde als Liste, dazu der feste Hinweis `DIN276_HINWEIS` (DIN 276:2008-12, § 4 Abs. 1; kein Befund,
  D-56, D-66). Ein Objekt ohne Ergebnis druckt „nicht berechnet (siehe Befunde)“, nie eine erfundene Zahl.
- **D-113.8** Bauzeitenplan: Eingabe `Bauzeitenplan` plus `Bauzeitenplanergebnis` (D-64). Tabelle in Planreihenfolge, Kinder eingerückt;
  Sammelvorgang fett ohne Dauer, Meilenstein „Meilenstein“; Dauer und Puffer in Arbeitstagen (AT); ohne Ergebnis Striche. Ist-Termine und
  Fortschritt stehen nicht in der Tabelle; dafür die Marke „[Ist-Termine]“ (Q5). Nicht gekürzt, keine Balken.
- **D-113.9** Druckdatum? **`datum?: string` als `JJJJ-MM-TT` in jeder Eingabe, wie `ModellOptionen.datum`;** ohne Angabe fest `1970-01-01` in den
  PDF-Metadaten und kein „Stand“ im Fuß. Gleiche Eingabe gibt gleiche Bytes (je Ausgabe getestet).

### Ergebnis (Branch `welle-6/113-ausgabe-x2-x4`)

Neu in `packages/ausgabe/src`: `bericht.ts` (Berichtsmodell), `bericht-pdf.ts` (pdfmake-Renderer), `maengel-druck.ts`, `bautagebuch-druck.ts`,
`honorar-druck.ts`, `bauzeit-druck.ts`, `x2x4-pdf.ts`, Test `x2x4-druck.test.ts` (21 Tests: Modell, Seitentext, gleiche Bytes), Testdaten
`testhilfe/x2x4.ts`. Der LV-Druck ist unverändert. Alle vier Ausgaben sind umgesetzt (Bauzeitenplan nicht gekürzt).

Öffentliche API (alle aus `@tethys/ausgabe`; `datum?` überall `JJJJ-MM-TT`; `Schriften` wie beim LV-Druck, die App reicht ihre Schriftbytes durch):

| Ausgabe | Eingabe | Modell | PDF |
|---|---|---|---|
| Mängelliste | `MaengellisteEingabe { projekt, maengel: Mangel[], befunde: Pruefbefund[], auftragnehmer: Record<AuftragsLvId, Name>, filter?, datum? }` | `baueMaengellisteModell` | `erzeugeMaengellistePdf(e, schriften)` |
| Mängelanzeige | `MaengelanzeigeEingabe { projekt, auftragnehmer: string, maengel: Mangel[], datum? }` | `baueMaengelanzeigeModell` | `erzeugeMaengelanzeigePdf` |
| Bautagebuch | `BautagebuchEingabe { projekt, eintraege: Bautagebucheintrag[], von?, bis?, datum? }` | `baueBautagebuchModell` | `erzeugeBautagebuchPdf` |
| Honorar | `HonorarEingabe { berechnung: Honorarberechnung, ergebnis: Honorarergebnis, projekt?, datum? }` | `baueHonorarModell` | `erzeugeHonorarPdf` |
| Bauzeitenplan | `BauzeitenplanEingabe { plan: Bauzeitenplan, ergebnis: Bauzeitenplanergebnis, projekt?, datum? }` | `baueBauzeitenplanModell` | `erzeugeBauzeitenplanPdf` |

Alle PDFs liefern `Promise<Uint8Array>`; `erzeugeBerichtPdf(modell, schriften)` rendert ein beliebiges `Berichtsmodell`. Fester Text: `DIN276_HINWEIS`,
`MAENGELANZEIGE_TEXT`. Die App (118–120) rechnet vorher `honorarBerechnen`, `bauzeitenplanBerechnen` und die Fristprüfung und reicht Ergebnis bzw. Befunde durch.

Suite: `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` grün, `pnpm typecheck` grün, `pnpm test` bei 8 Agenten auf 4 Kernen 4 Fehlschläge nur in CPU-Budgets
fremder Pakete (`kern/k9-leistung`, `speicher/aufmass-leistung`, `vergabe/leistung`, `apps/web/abrechnung/leistung`; in einem früheren Lauf 6); allein
wiederholt (`--no-file-parallelism`) alle vier grün. Kein Budget geändert.

## Answer

Gemergt mit `12284c6` (Branch `welle-6/113-ausgabe-x2-x4`, `ebf9b62`). Fünf PDFs über ein neues `Berichtsmodell` mit eigenem Renderer
(Mängelliste, Mängelanzeige, Bautagebuch, Honorarberechnung mit festem DIN-276-Hinweis, Bauzeitenplan als Tabelle); 21 Tests.

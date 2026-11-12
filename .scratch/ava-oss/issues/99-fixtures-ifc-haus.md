# 99: Fixtures: IFC-Haus in zwei Ständen, großes Modell, Sollwerte für das Tor X1

Status: done-by-agent
Type: task
Welle: 6 · Strang: F, X1 · Paket: `fixtures/` (neuer Ordner `fixtures/ifc/`, dazu `fixtures/README.md`, `fixtures.test.mjs`,
`REUSE.toml` falls nötig)
Blocked by: –
Modell: opus
Regeln: C4, N2, N3, N5, Q4, D-50 bis D-54, D-58
Herkunft: `plan.md` §4 (Tor X1, D-58), Berater D-54 (großes Modell aus einem Erzeuger, nicht als Datei im Repo)

## What to build

Selbst verfasste IFC-Dateien mit Geometrie und ausdrücklichen Mengen, ein Erzeuger für ein großes Modell und eine
Sollwert-Datei mit Herleitung (C4), auf die die Tore X1-Kern und X1-Erweitert prüfen (D-58). Alles erfunden, keine fremden
Dateien.

1. **`fixtures/ifc/haus-v1.ifc` (IFC 4, Einheit m).** Ein kleines Haus mit `IfcProject` → `IfcSite` → `IfcBuilding` → zwei
   Geschossen (EG, OG) mit je zwei bis drei Räumen (`IfcSpace`). Bauteile mit einfacher, gültiger Geometrie
   (`IfcExtrudedAreaSolid` mit `IfcRectangleProfileDef`, `IfcLocalPlacement`): Außen- und Innenwände (mindestens eine Wand mit
   Fenster- oder Türöffnung über `IfcOpeningElement`/`IfcRelVoidsElement`), Bodenplatte, Decke, Fenster, Türen. Je Bauteil
   ein Mengensatz (`Qto_WallBaseQuantities` mit `Length`, `Height`, `Width`, `GrossVolume`, `NetVolume`, `NetSideArea`;
   `Qto_SlabBaseQuantities`; Fenster/Türen mit `Area`), je Geschoss `Qto_BuildingStoreyBaseQuantities` (`GrossFloorArea`,
   `GrossVolume`) und je Raum `Qto_SpaceBaseQuantities` (`NetFloorArea`, `GrossFloorArea`). Die Mengen passen zur Geometrie
   (Netto = Brutto minus Öffnung) und sind in der Herleitung nachgerechnet. Ein `Pset_WallCommon` mit `IsExternal` und
   `LoadBearing` an den Wänden; eine `IfcClassificationReference` „DIN 276“ mit KG an mindestens einem Bauteil. GlobalIds fest
   und gültig (22 Zeichen, IFC-Base64).
2. **`fixtures/ifc/haus-v1-ifc2x3.ifc`** derselbe Inhalt in IFC 2x3, Länge in **mm** (prüft Schema und Umrechnung: gleiche
   Mengen in m nach dem Lesen).
3. **`fixtures/ifc/haus-v2.ifc` (IFC 4).** Zweiter Stand desselben Hauses: eine Wand entfernt, eine Wand neu, eine Wand länger
   (andere Mengen), ein Fenster in ein anderes Geschoss, ein Bauteil umbenannt, alle übrigen GlobalIds gleich.
4. **`fixtures/ifc/erzeugen.mjs`.** Deterministischer Erzeuger eines großen IFC-4-Modells (Parameter: Zahl der Bauteile,
   Standard 10.000, etwa 10 Geschosse) mit Geometrie und Mengensätzen wie im Haus, gültigen, festen GlobalIds (aus einem Zähler,
   kein Zufall) – als Funktion, die den Text liefert, und als Kommandozeile. Keine 25-MB-Datei im Repo (D-54). Ein Test prüft
   Determinismus (gleicher Text, gleicher SHA-256) und die Zahl der Bauteile.
5. **`fixtures/typisch-bim.json` (Sollwerte, C4).** Zuordnung von Bauteilen des Hauses (v1) zu Positionen der Fixture
   `typisch` (über deren Positions-IDs), je mit Mengenart (Name der Menge, z. B. `NetSideArea`, `NetVolume`, oder `Stueck`),
   passend zur Einheit der Position (m², m³, St, m). Dazu, je mit Herleitung im Stil von `typisch-abrechnung.json`:
   - **X1-Kern:** je zugeordneter Position die Ansatzzeilen (eine je Bauteil in der Reihenfolge der Zuordnung, Formel 91, Wert
     auf 3 Stellen) und die Menge (Summe der gerundeten Zeilen); die Gesamtpreise (N2) und Netto, Nachlass, Netto nach
     Nachlass, MwSt, Brutto des LV `typisch` nach der Übernahme (N2, N5).
   - **X1-Erweitert:** BGF, BRI, NRF des Modells (Summen der Geschoss- bzw. Raummengen, 3 Stellen) und eine Kostenschätzung über
     Kennwerte (je KG ein erfundener Kennwert in €/m² BGF; Betrag = round(BGF × Kennwert, 2)); ein „Aufmaßblatt aus Auswahl“
     für die Auswahl „Geschoss EG“ (je zugeordneter Position die Summe der Mengen der ausgewählten Bauteile); der Vergleich
     v1 → v2 (hinzugefügt, entfernt, geändert mit Feldern) und je betroffener Position die Mengendifferenz; die neuen
     Vordersätze nach „Mengen aktualisieren“ mit v2.
   Die Lesart der Mengenübernahme ist D-53 (Berater): Bauteil fehlt im gewählten Modell → keine Zeile, mit Befund; fehlende
   Menge oder Einheit passt nicht zur Position → Befund, nie 0.
6. **Test in `fixtures.test.mjs`** (eigene Rechnung wie `rechnen.mjs`, unabhängig von den Paketen): die Mengen der
   Sollwert-Datei stimmen mit den Mengensätzen im IFC-Text überein (einfacher Abgleich über die GlobalId), die Summen der
   Sollwert-Datei folgen aus N2/N5.

`fixtures/README.md` nennt die Dateien, die Herkunft („selbst verfasst“) und die Herleitung.

## Grenzen

- Nur `fixtures/` (und `REUSE.toml`, falls die neue Endung einen Eintrag braucht). `okf/research/` wird nicht gelesen (C3).
- Keine fremde IFC-Datei in diesem Ticket.

## Acceptance criteria

- [x] Die drei IFC-Dateien sind gültiges STEP (ein Test liest sie zeilenweise und prüft Kopf, Schema, eindeutige `#n`, alle
      Verweise auflösbar), der Erzeuger ist deterministisch
- [x] `typisch-bim.json` mit Herleitung; `node --test "fixtures/*.test.mjs"` grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-99.1 Prüfnähte.** Getestet wird an den Artefakten, die andere Tickets nutzen: (1) `erzeugeModell` und die
  Kommandozeile (Determinismus mit SHA-256, Zahl der Bauteile, Verweise; ein kleines Modell mit 37 Bauteilen streng
  gelesen); (2) die drei IFC-Dateien, gelesen mit einem eigenen strengen STEP-Leser im Selbsttest (Kopf, Schema, eindeutige
  `#n`, Attributzahl je Klasse nach IFC 4 ADD2 TC1 bzw. IFC 2x3 TC1, GlobalIds gültig und eindeutig, jeder Verweis
  auflösbar), jede Menge gegen die Geometrie derselben Datei, IFC 2x3 gleich IFC 4 nach Umrechnung, v1 ↔ v2 über die
  GlobalId; (3) `typisch-bim.json`, jede Zahl aus den IFC-Texten (Abgleich über die GlobalId) und aus `typisch.json` mit
  den Grundfunktionen N2/N5 nachgerechnet, dazu Literale von Hand (vorab unabhängig mit Python `Decimal` gerechnet); (4)
  Byte-Gleichheit aller erzeugten Dateien über `erzeugeAlle()` (Test (a)). Grund: Im autonomen Lauf bestätigt niemand die
  Nähte vorab (Skill `tdd`); das sind die Wege, auf denen 98, 100, 107, 108 und 117 die Fixtures lesen. Reversible: yes.
- **D-99.2 Torweg des Tors X1-Kern.** „Wände des EG einer Position von typisch zuordnen“ heißt hier: die gemauerten
  Innenwände des EG (IW-EG-1 bis -3) an 03.0010 „Innenwände mauern“, Mengenart `NetSideArea`. `kern.torweg` trägt die
  LV-Summen nur mit dieser Zuordnung (Netto 46.720,96), `kern.sollwerte` die mit allen sieben (Netto 36.068,86, für den
  Kettentest). Grund: `typisch` hat keine Position für Außenwände; die Wände des OG sind Trockenbau, für die `typisch` keine
  Position hat. Reversible: yes.
- **D-99.3 Großes Modell.** Dieselben Bausteine wie das Haus samt Eigenschaftssätzen mit 3 bis 7 Werten (Namen der
  IFC-Spezifikation, Werte erfunden), Wandachse (`Axis`, `Curve2D`) und Öffnungsmengen; Felder zu je sechs Bauteilen
  (Außenwand + Fenster, Innenwand + Tür, Innenwand, Deckenfeld), 20 Felder je Reihe; je Geschoss ⌊n / g⌋, der Rest je eins
  an die unteren Geschosse; ein angeschnittenes Feld bleibt gültig (Öffnung ohne Füllung); keine Räume. 10.000 Bauteile
  ergeben etwa 21 MB (D-54 schätzte etwa 25 MB) in etwa einer Sekunde; kein künstliches Auffüllen. Wer 25 MB braucht, nimmt
  `--bauteile 12000`. Der Test prüft 18 bis 30 MB. Alle Platzierungen sind reine Verschiebungen (achsparallele Quader).
  Reversible: yes.
- **D-99.4 IFC 2x3.** Gleiche Klassen wie in IFC 4, wo es sie in beiden gibt (`IfcWall`, nicht `IfcWallStandardCase`);
  Mengensatznamen `Qto_…` aus IFC 4 auch in der 2x3-Datei (2x3 kennt keine festen Namen; so ist der Inhalt gleich); Längen
  in mm, Flächen und Volumen in m² und m³ (prüft, dass jede Menge ihre eigene Einheit nutzt); Umlaute als `\X\hh` (2x3) und
  `\X2\…\X0\` (IFC 4), damit der Leser beide Formen sieht; `IfcOwnerHistory` in beiden Dateien. Reversible: yes.
- **D-99.5 Ansatzzeile aus dem Modell.** Ausdruck = Wert der Menge in SI-Einheit, kaufmännisch auf 3 Stellen, de-DE mit
  Komma, immer 3 Nachkommastellen, ohne Tausenderpunkt (`18,874`; `Stueck` als `1,000`); `zeile` und `formel` als Text
  (D-85.4), `variable` `null`; Reihenfolge der Zuordnung (D-53). Ein Bauteil, das im gewählten Modell fehlt, gibt keine Zeile,
  sondern den Befund `{ art: 'bauteil-fehlt', globalId, kennung }` (Name der Fixture; `bim` darf einen eigenen Code wählen).
  Reversible: yes.
- **D-99.6 Raum- und Geschossmengen.** Raum: `GrossFloorArea` = Lichtmaß, `NetFloorArea` = Lichtmaß minus Grundfläche der
  Bauteile im Raum (der Raumteiler im Wohnen, 0,23 m²), wie die IFC-Definitionen. Geschoss: `GrossFloorArea` aus dem
  Außenmaß (BGF), `GrossVolume` = BGF × Bruttohöhe (EG von der Unterkante der Bodenplatte −0,25 bis Oberkante Geschossdecke
  3,00; OG bis Oberkante Dachdecke 6,00), Fundamente nicht im BRI. Die Bodenplatte hat eine Aussparung 0,40 × 0,40, damit
  `GrossArea` (02.0040) und `NetArea` (02.0070) verschieden sind. Reversible: yes.
- **D-99.7 DIN-277-Größen.** BGF und BRI = Summe der Geschossmengen, NRF = Summe der `NetFloorArea` aller Räume (alle Räume
  zählen zur NRF; keine Teilung in NUF, TF, VF); jede gelesene Menge vor dem Summieren auf 3 Stellen (wie die Ausgabe des
  Lesers). Reversible: yes.
- **D-99.8 Vergleich und betroffene Positionen.** Vergleich über die GlobalId mit den Feldern `klasse`, `name`,
  `strukturknoten` (Name des Geschosses) und `mengen` (gelesen, auf 3 Stellen; Änderungen unter 0,0005 verschwinden);
  `entfernt` und `geaendert` in der Reihenfolge von v1, `hinzugefuegt` in der von v2; Öffnungen und Räume sind keine Bauteile
  (Ticket 98) und nicht im Vergleich. Betroffen ist eine Position, deren Vordersatz mit v2 andere Zeilen hat als mit v1
  (auch durch ein fehlendes Bauteil); Differenz = nachher − vorher mit Vorzeichen. Eine Position, deren Bauteile nur Name
  oder Geschoss ändern (PL-EG umbenannt), ist nicht betroffen. Reversible: yes.
- **D-99.9 Aufmaßblatt aus Auswahl.** Auswahl „Geschoss EG“ = alle Bauteile, die im EG stehen (17 in v1); je zugeordneter
  Position mit mindestens einem ausgewählten Bauteil eine Aufmaßposition (Zeilen wie beim Vordersatz, nur die ausgewählten,
  Menge); `bauteile` nennt die ausgewählten GlobalIds. Gerechnet auf v1; der Bieter des Zuschlags ändert keine Menge.
  Reversible: yes.
- **D-99.10 Kostenschätzung.** Sechs Kostengruppen (320, 330, 340, 350, 360, 400) mit erfundenen Kennwerten in € je m²
  BGF, 2 Nachkommastellen; Betrag = round(BGF × Kennwert, 2) (D-52); Einträge in der Form von `Kostenermittlungseintrag`,
  Herleitung in `bemerkung` (ein Vorschlag; Tore vergleichen `betrag`); Stufe `kostenschaetzung`, `gesamt` = Summe.
  Reversible: yes.
- **D-99.11 GlobalIds und Kennung.** Haus: die ersten 128 Bit des SHA-256 von `tethys-ava/fixtures/ifc/haus/<Kennung>`,
  als IFC-Base64 (erstes Zeichen 0 bis 3), gleich in allen drei Dateien und beiden Ständen; großes Modell: feste Basis plus
  Zähler. `Tag` = Kennung (`AW-EG-S` …), damit Menschen und Tests Bauteile wiederfinden. Feste Zeit in Kopf und
  `IfcOwnerHistory` (2026-11-12). Reversible: yes.
- **D-99.12 Mengen aktualisieren.** Im LV (nicht im Auftrags-LV: `MengenansatzSetzen` ist kein AuftragsLvBefehl, D-53),
  ausgehend vom LV nach der Übernahme mit v1; die Zuordnungen bleiben (ein fehlendes Bauteil bleibt zugeordnet, Befund);
  das neue Bauteil IW-EG-4 wird nicht von selbst zugeordnet. Reversible: yes.
- **D-99.13 Ohne Zuordnung.** Fenster (`typisch` hat keine Fensterposition), Trockenbauwände und Außenwände des OG,
  Geschoss- und Dachdecke, Haustür (Türzargen nur für Innentüren). Sie bleiben Bauteile ohne Zuordnung, wie im Alltag.
  Reversible: yes.
- **D-99.14 Bytes und Typen.** `fixtures/ifc/.gitattributes` mit `*.ifc -text` (der SHA-256 der Dateien ist Sollwert,
  D-51); `fixtures/ifc/erzeugen.d.mts` deklariert `erzeugeModell` für TypeScript-Tests (100, 107), geprüft mit `tsc --strict`
  an einer Probedatei. Reversible: yes.

### Ergebnis (2026-11-12, Branch `welle-6/99-fixtures-ifc`)

**Dateien** (alle unter `fixtures/`, nur dort, P2): `ifc/haus-v1.ifc` (IFC 4, m, 66.723 Bytes), `ifc/haus-v1-ifc2x3.ifc`
(IFC 2x3, mm), `ifc/haus-v2.ifc` (IFC 4, zweiter Stand), `typisch-bim.json` (Sollwerte), `ifc/erzeugen.mjs` +
`ifc/erzeugen.d.mts` (großes Modell, Funktion `erzeugeModell` und Kommandozeile), `ifc/schreiben.mjs` (STEP-Schreiber,
Mengen aus der Geometrie), `ifc/haus.mjs` (Haus v1/v2), `ifc/sollwerte.mjs` (Sollwerte), `ifc/.gitattributes`; dazu
`erzeugen.mjs` (`erzeugeAlle` schreibt die Hausdateien und `typisch-bim.json`), `fixtures.test.mjs` (13 neue Tests, eigener
STEP-Leser), `README.md` (Abschnitt „BIM: Haus und Tor X1“, Dateien, JSON-Form). `REUSE.toml` braucht keinen Eintrag
(`**` deckt `.ifc`).

**Haus:** 11,99 × 8,24 m, EG und OG, 6 Räume, 30 Bauteile (4 Streifenfundamente, 3 Platten, 13 Wände, 6 Fenster,
4 Türen), 11 Öffnungen; Kennung = `Tag` (README-Tabelle). v2: IW-EG-3 entfernt, IW-EG-4 neu, IW-EG-2 +0,50 m, F-EG-W ins OG,
PL-EG umbenannt.

**Zuordnung zu `typisch`** (Positions-IDs in `typisch-bim.json`, Form `{ globalId, mengenart }`, D-52):

| OZ | Position | Bauteile | Mengenart | Menge v1 | GP |
|---|---|---|---|---|---|
| 02.0040 | Sauberkeitsschicht (m²) | PL-EG | GrossArea | 98,798 | 1.134,20 |
| 02.0050 | Fundamente betonieren (m³), Zuschlag 02.0050 A | FU-S, FU-N, FU-W, FU-O | NetVolume | 18,720 | 3.161,81 (+ 268,75) |
| 02.0070 | Bodenplatte herstellen (m²) | PL-EG | NetArea | 98,638 | 5.198,22 |
| 02.0080 | Sockel abdichten (m) | AW-EG-S, -N, -W, -O | Length | 39,000 | 731,64 |
| 03.0010 | Innenwände mauern (m²), Torweg | IW-EG-1, -2, -3 | NetSideArea | 33,023 | 1.609,87 |
| 03.0020 | Innenputz (m²) | AW-EG-S, -N, -W, -O | NetSideArea | 99,938 | 1.934,80 |
| 03.0050 | Türzargen einbauen (St) | T-EG-1, T-OG-1, T-OG-2 | Stueck | 3,000 | 403,50 |

**Wichtige Sollwerte:** LV nach der Übernahme Netto 36.068,86, Nachlass 721,38, Netto n. N. 35.347,48, MwSt 6.716,02,
Brutto 42.063,50; Torweg (nur 03.0010) Netto 46.720,96, Brutto 54.485,98. BGF 197,596, BRI 617,485, NRF 166,252;
Kostenschätzung gesamt 274.302,77 (6 KG, KG 400 82.743,325 → 82.743,33). Aufmaßblatt aus Auswahl EG: wie die Vordersätze,
03.0050 nur 1,000. Vergleich v1 → v2: entfernt IW-EG-3, neu IW-EG-4, geändert PL-EG (Name), AW-EG-W und AW-OG-W (Mengen),
F-EG-W (Geschoss), IW-EG-2 (Mengen); betroffen 03.0010 −4,125 und 03.0020 +1,399; nach „Mengen aktualisieren“ Netto
35.894,85, Brutto 41.860,57, Befund `bauteil-fehlt` für IW-EG-3 an 03.0010. SHA-256 der drei Dateien in `modelle`.

**Großes Modell:** `node fixtures/ifc/erzeugen.mjs [--bauteile N] [--geschosse G] [--aus datei]`; 10.000 Bauteile auf
10 Geschossen = 21.048.563 Bytes, etwa 0,8 s, immer derselbe SHA-256 (D-99.3).

**Gegenprobe mit web-ifc 0.0.78** (Ticket 100; aus dessen Worktree nur gelesen, Skript im Scratchpad, nichts im Repo): alle
drei Hausdateien und ein erzeugtes Modell mit 600 Bauteilen laden; jedes Bauteil hat Geometrie, Wände mit Öffnungen werden
ausgeschnitten (bis 52 Dreiecke statt 12), die Aussparung der Bodenplatte ebenso; Räume liefert `StreamAllMeshes` wie
üblich nicht.

**Suite** nach `git merge integration/welle-6` (Stand `c04946e`, mit 100 und 102): `NODE_OPTIONS=--max-old-space-size=8192
pnpm lint` grün, `pnpm typecheck` grün, `pnpm test` grün (Vitest 235 Dateien, 3.035 Tests bestanden, 3 übersprungen;
`node --test "fixtures/*.test.mjs"` 42/42, etwa 2,4 s). Bei Last 16–22 auf 4 Kernen fielen zwei volle Läufe nur in
Leistungsbudgets fremder Pakete, die keine Datei dieses Tickets lesen: D-45 in `apps/web/src/abrechnung/leistung.test.ts`
(Rückgängig Median 109,4 ms bzw. Wiederholen 119,6 ms > 100 ms; die Datei allein: Rückgängig 28,7 bzw. 41,6 ms, Befehl
30,1 ms, Wiederholen 27,0 ms) und `packages/vergabe/src/leistung.test.ts` (Preisspiegel `gross` 2.592 ms > 1.000 ms; allein
383 ms). Der jeweils nächste volle Lauf (vor und nach dem zweiten Merge) war ganz grün. Kein Budget gelockert, kein Test
übersprungen.

**Offen / Hinweise:** keine G-Frage berührt. Für 107/108/117: Die Lesarten D-99.2, D-99.5 bis D-99.10 und D-99.12 sind
Annahmen dieser Fixture; wählt `bim` andere Befundcodes oder Ausdrucksformen, gelten die Mengen und Beträge trotzdem.

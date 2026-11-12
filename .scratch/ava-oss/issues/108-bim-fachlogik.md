# 108: X1c–f: `bim`: Modellbefehle, Mengenübernahme, Aufmaß aus Auswahl, DIN 277, Kennwerte, Vergleich

Status: resolved
Type: task
Welle: 6 · Strang: X1c, X1d, X1e, X1f · Paket: `packages/bim` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: 97
Modell: opus
Regeln: A2, A3, A5, N1–N3, Q1, Q4, U5, C1, C4, D-50, D-52, D-53, D-54, D-22
Herkunft: `plan.md` §2 X1c–X1f, Berater D-52, D-53, D-54

## What to build

Ein reines TS-Paket (A2) für die Fachlogik rund um das Bauwerksmodell. Es importiert nur `vertrag` und `dezimal`
(`'packages/bim': ['packages/vertrag', 'packages/dezimal']`, `apps/web` darf es importieren). Es baut **Befehle bzw.
Ansatzzeilen als Daten**; die Mengen der Ansätze rechnet die App mit `mengen` (D-22, D-53), weil Fachpakete einander nicht
importieren (A3).

1. **Modellbefehle** (`BauwerksmodellBefehl`, v1.6): Anlegen (Prüfungen der Form; doppelte GlobalIds und ein unbekannter
   Vorgänger als Befund bzw. Fehler nach v1.6), Umbenennen, Löschen; `…ChangeSetAnwenden`, `…ChangeSetUmkehren`.
2. **Mengenübernahme (X1d, D-53).** Zu einer Position mit `bauteile` und einem gewählten Modell die Ansatzzeilen: je Zuordnung,
   deren Bauteil im Modell steht, eine Zeile (Formel 91, Wert der Menge mit dem Namen `mengenart` bzw. 1 bei `Stueck`,
   kaufmännisch auf 3 Stellen) in der Reihenfolge von `bauteile`. **Befunde statt Zeile, nie 0** (U5, Q5): Bauteil fehlt im
   Modell; Menge fehlt; Name in zwei Mengensätzen desselben Bauteils (mehrdeutig); Art der Menge passt nicht zur Einheit der
   Position (m ↔ Länge, m² ↔ Fläche, m³ ↔ Volumen, St ↔ Anzahl/Stueck, kg/t ↔ Gewicht; andere Einheit: Befund). Für ein ganzes
   LV: die Liste der betroffenen Positionen mit alten und neuen Ansätzen (Vorschau) – die App baut daraus `MengenansatzSetzen`
   mit der Menge aus `mengen`. `MengenansatzSetzen` gibt es nur im Ausschreibungs-LV (D-53).
3. **Aufmaßblatt aus Auswahl (X1d, D-53).** Zu einem Auftrags-LV, einem Modell und einer Auswahl von GlobalIds je zugeordneter
   Position die Ansatzzeilen der ausgewählten Bauteile (gleiche Regeln wie 2); die App rechnet die Mengen und legt mit
   `AufmassAnlegen` ein Blatt an. Hinweis im Ergebnis: Dasselbe Bauteil auf zwei Blättern ist nicht erkennbar (Offene
   Typfrage D-53).
4. **DIN 277 (X1e).** Bezugsgrößen aus dem Modell: **BGF** = Σ `GrossFloorArea` der Geschosse, **BRI** = Σ `GrossVolume` der
   Geschosse, **NRF** = Σ `NetFloorArea` der Räume (je 3 Stellen); fehlen Geschossmengen, Befund (kein Ersatz aus Räumen ohne
   Befund); jede Größe mit Quelle (`modell` oder `eingabe`), damit die App eine Eingabe des Nutzers zeigen kann.
5. **Kosten aus dem Modell (X1e, D-52).** Kostenschätzung über Kennwerte: zu Bezugsgrößen und Kennwerten je Kostengruppe
   (`{ kostengruppe, bezug: 'BGF' | 'BRI' | 'NRF', kennwert }` in €/Einheit, vom Nutzer, nie aus einem Katalog, C1) die Einträge
   einer Kostenermittlung: Betrag = round(Größe × Kennwert, 2) (N2), `bemerkung` mit der Herleitung („BGF 245,300 m² ×
   1.250,00 €/m²“); daraus der Befehl `KostenermittlungAnlegen` (Stufe `kostenschaetzung`). Dazu **Kostenkennwerte** einer
   bestehenden Kostenermittlung: je KG Summe / BGF bzw. / BRI auf 2 Stellen (nur Anzeige).
6. **Modellvergleich (X1f, D-53).** Zwei Modelle über die GlobalId: hinzugefügt, entfernt, geändert (Felder: Klasse, Name,
   Strukturknoten, Mengen mit alt/neu); Befunde: doppelte GlobalIds, geringe Überdeckung (z. B. unter 50 % gemeinsamer
   GlobalIds: Hinweis, dass das Autorenwerkzeug die GlobalIds neu vergeben haben könnte). **Folgen für ein LV:** je Position mit
   Zuordnungen die Menge laut altem und neuem Modell und die Differenz, dazu die Ansatzzeilen für „Mengen aktualisieren“.
7. **Prüfung der Zuordnungen:** hängende Zuordnungen (GlobalId nicht im gewählten Modell), Bauteile ohne Zuordnung (Zählung),
   Einheiten wie in 2.
8. **Tests (Q1, C4):** Golden-Tests mit `fixtures/typisch-bim.json` (Ticket 99) für 2–6; Property-Tests (Reihenfolge der
   Bauteile im Modell ändert die Summen nicht; Vergleich eines Modells mit sich selbst ist leer); **Leistung (Q4, D-54):**
   Vergleich zweier 10k-Modelle ≤ 500 ms.

Begriffe aus v1.6 und dem Glossar; neue (z. B. „Mengenübernahme“, „Bezugsgröße“) zuerst ins `GLOSSARY.md` (L2).

## Grenzen

- Nur `packages/bim` (und die genannten Wurzeldateien). Kein Lesen von IFC (das ist `ifc`), kein `mengen`, kein `kern`.
  `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Golden-, Property- und Leistungstests wie oben; Paketgrenzen-Prüfung kennt `bim`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-108.0 Prüfnähte.** Getestet wird nur an der öffentlichen Fläche von `@tethys/bim` (`src/index.ts`) und an den
  Signaturen aus `vertrag` (`BauwerksmodellBefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`): Unit-Tests mit
  Werten von Hand, Golden-Tests mit `fixtures/typisch-bim.json`, Property-Tests, ein Leistungstest. Grund: wie D-98.1, im
  autonomen Lauf bestätigt niemand die Nähte; so überleben die Tests jeden Umbau.
- **D-108.1 Woher das Golden-Modell kommt.** `bim` darf `ifc` auch im Test nicht importieren (die Paketgrenzen gelten für
  Testdateien). Die Testhilfe `testhilfe/haus.ts` baut v1 und v2 aus den Sollwerten der Fixture (Bauteile mit Klasse, Name,
  Geschoss und allen Mengen; Geschosse und Räume aus `din277`), die `ifc` Zeile für Zeile gegen die IFC-Dateien prüft (98,
  `haus.test.ts`). Mengensatz wie `MENGENSATZ` in `fixtures/ifc/schreiben.mjs`. Ein Wegwerftest (nicht im Branch) zeigte:
  `ifcLesen` liefert die Bauteile von `haus-v1.ifc` und `haus-v2.ifc` in genau der Reihenfolge der Fixture, also gilt die
  Reihenfolge von D-99.8 auch für das gelesene Modell. Den Weg Datei → Modell → `bim` prüft der Kettentest von 117. Das große
  Modell des Leistungstests entsteht im Test in der Form von D-99.3 (aus demselben Grund).
- **D-108.2 Menge laut Modell.** `bim` summiert die Zeilen selbst (`menge` in `Positionsuebernahme`, `Aufmassvorschlag`,
  `Vergleichsfolge`), nur zur Anzeige und für die Differenz der Folgen. Eine Zeile mit Formel 91 ist eine Zahl mit 3 Stellen,
  ihre Summe ist genau die Summe, die `mengen` aus diesen Zeilen rechnet (Summe der gerundeten Zeilenergebnisse). Die Menge im
  Befehl (`MengenansatzSetzen`, `AufmassAnlegen`) rechnet weiter die App mit `mengen` (D-22); sie kann beide vergleichen.
- **D-108.3 Befundcodes und Schwere** (`Modellbefundcode`, Quelle `modell-pruefung`): `bauteil-fehlt` (hängende Zuordnung,
  **Warnung**: das Modell enthält das Bauteil nicht, etwa weil es in v2 entfernt wurde; Name aus D-99.5), `globalid-doppelt`
  (Warnung), `menge-fehlt`, `mengenart-mehrdeutig`, `einheit-passt-nicht` (**Fehler**: die Menge der Position wäre
  unvollständig), `geschosse-fehlen`, `raeume-fehlen`, `bezugsgroesse-fehlt` (Fehler), `kostengruppe-doppelt`,
  `ueberdeckung-gering`, `bauteil-ohne-geometrie` (Warnung). Ort nach der Lesart an `Befundort`: Zuordnung mit `knotenId`,
  `globalId`, `feld` (`bauteile` bei fehlendem oder doppeltem Bauteil, `mengenart` bei Menge und Einheit); Geschoss/Raum mit
  `globalId` und dem Mengennamen als `feld`; Kennwertzeilen nur mit `feld` (`BGF`/`BRI`/`NRF` bzw. `kostengruppe`), die KG in
  der Meldung; Überdeckung ohne Ort. Grund: U5 (nie Sperre), D-98.12 (Fehler, wenn etwas verloren geht).
- **D-108.4 Einheit ↔ Art** (`EINHEITSREGELN`): `m` ↔ Länge; `m²`, `m2` ↔ Fläche; `m³`, `m3` ↔ Volumen; `St`, `Stk`, `Stck`,
  `Stück` ↔ Anzahl und `Stueck`; `kg` ↔ Gewicht, `t` ↔ Gewicht × 0,001 (exakt, dann auf 3 Stellen). Leerraum am Rand zählt
  nicht, Groß/Klein schon; jede andere Einheit (`psch`, `h`, `cm`, keine) und die Art Zeit passen zu nichts (Befund). Grund:
  Ticket-Text; die Schreibweisen `m2`, `m3`, `Stk`, `Stck` stehen in den GAEB-Testdateien unter `fixtures/extern`.
- **D-108.5 Ansatzzeile.** Ausdruck = Wert mit Dezimalkomma, 3 Stellen, ohne Tausenderpunkt (`18,874`, `1,000`; D-99.5),
  Formel 91, `variable: null`; Zeilennummern 1 bis n ohne Lücke über die entstandenen Zeilen (eine Zuordnung mit Befund
  bekommt keine Nummer), Reihenfolge der Zuordnungen.
- **D-108.6 Wann geschrieben wird.** `Positionsuebernahme.geaendert` ist wahr, wenn es Zeilen gibt und sie vom gespeicherten
  Ansatz abweichen; nur dann baut die App `MengenansatzSetzen`. Ergibt keine Zuordnung eine Zeile, bleibt die Position, wie sie
  ist (kein leerer Ansatz, nie 0; Q5). Ebenso legt die App für einen `Aufmassvorschlag` ohne Zeile keine Aufmaßposition an.
- **D-108.7 Doppelte GlobalIds (D-66).** Ein Verweis meint das erste Objekt, `struktur` vor `bauteile`: Ein Bauteil, dessen
  GlobalId zuerst ein Strukturknoten trägt, zählt für Zuordnung, Mengen und Vergleich nicht. Mengenübernahme: Warnung
  `globalid-doppelt` an der Zuordnung, Zeile aus dem ersten Bauteil. Vergleich: verglichen werden die ersten Objekte, je Stand und
  GlobalId ein Befund. Modellprüfung: je doppelte GlobalId ein Befund. Anlegen: Doppelte sind kein Fehler, Verweise und
  Ringprüfung laufen über die ersten Objekte.
- **D-108.8 Formprüfung beim Anlegen.** Zusätzlich zur Liste am Typ: `dateiname` nicht leer, Art jeder Menge und jedes Knotens
  aus der Liste, IFC-Klasse nicht leer, Kostengruppe dreistellig (100–999), kein Ring der Teile; ein Name nur aus Leerraum gilt
  als leer. Ein Ring ist `ungueltige-eingabe` (nicht `zyklus`), wie der Kommentar an `BauwerksmodellAnlegen` sagt. `feld`
  relativ zum Aggregat wie in `kosten` (`datei.hash`, `datei.groesse`, `datei.dateiname`, `schema`, `eingelesen`, `name`,
  `vorgaengerId`, `struktur`, `bauteile`), die Stelle (`bauteile[3] (GlobalId …)`) in der Meldung. Anwenden wirft bei einem
  ChangeSet, das die Regel Kopf/Inhalt verletzt (D-66); Umbenennen behält dieselben Listen (keine Kopie von 10.000 Bauteilen).
- **D-108.9 DIN 277.** Fehlt die Menge an einem Geschoss (oder ist sie mehrdeutig oder von falscher Art), gibt es **keinen
  Wert** und je Geschoss einen Befund, auch keine Teilsumme (eine halbe BGF würde die Kostenschätzung still verfälschen). Eine
  Eingabe des Nutzers geht dem Modell vor; Befunde nur zu Größen aus dem Modell. NRF ohne Räume: `raeume-fehlen`. Knoten mit
  doppelter GlobalId zählen einmal.
- **D-108.10 Kennwerte.** `kennwert: Betrag` (2 Stellen, € je Einheit; D-99.10). Doppelte Kostengruppe: Beträge (je Zeile
  gerundet) addiert, Bemerkungen mit „; “ verbunden, Befund, weil `KostenermittlungAnlegen` doppelte Nummern abweist (wie
  `kosten`, D-55.4); Zeile ohne Bezugsgröße: kein Eintrag, Befund. Bemerkung wie im Ticket: `BGF 245,300 m² × 1.250,00 €/m²`,
  bei einer Eingabe `… m² (Eingabe) × …`. Kostenkennwerte nehmen die KG-Summen von `kosten` (die App übergibt
  `kostenermittlungBerechnen(...).gruppen`, A3) und teilen durch BGF, BRI und NRF (NRF nach dem Glossar); `null` ohne Größe
  oder bei 0.
- **D-108.11 Vergleich.** Felder Klasse, Name, Strukturknoten (`strukturGlobalId`; den Namen sucht die App in `struktur`),
  Mengen; eine Menge ist gleich nach Satz, Name und Vorkommen; eine andere Art ist eine Änderung, eine andere Reihenfolge der
  Mengen nicht. `entfernt` und `geaendert` in der Reihenfolge des alten, `hinzugefuegt` in der des neuen Stands (D-99.8).
  **Überdeckung** = gemeinsame GlobalIds / GlobalIds des kleineren Stands, Befund unter 50 %, keiner, wenn ein Stand leer ist.
  Grund: Ein Modell, das stark wächst (10 → 100 Bauteile, alle 10 bleiben), ist keine Neuvergabe; mit der Vereinigung als
  Nenner wäre es ein Fehlalarm.
- **D-108.12 Folgen und „Mengen aktualisieren“.** `vergleichsfolgenBerechnen` liefert jede Position mit Zuordnungen;
  `betroffen`, wenn sich die Ansatzzeilen ändern (auch durch ein fehlendes Bauteil; Name oder Geschoss allein nicht, D-99.8);
  `differenz` = nachher − vorher nur mit beiden Mengen; `zeilen` und `befunde` des neuen Stands für „Mengen aktualisieren“
  (dasselbe liefert `mengenuebernahmeBerechnen(lv, neu)`, D-99.12).
- **D-108.13 Aufmaßblatt aus Auswahl.** Auswahl als Liste von GlobalIds; je Position mit mindestens einem zugeordneten,
  ausgewählten Bauteil ein `Aufmassvorschlag` (Zeilen je Position ab 1). Der Hinweis „dasselbe Bauteil auf zwei Blättern nicht
  erkennbar“ ist ein fester Code im Ergebnis (`hinweise`), kein Befund. `bauteileImStrukturknoten` = Bauteile im Knoten und
  allen Knoten darunter (EG in v1: 17, D-99.9).
- **D-108.14 Bauteil ohne Geometrie (D-66).** `bauteileOhneGeometrie(modell, bericht.mitGeometrie)` aus dem `Ladebericht` von
  `ui-modell`: je Bauteil des Modells, das nicht gezeichnet ist, eine Warnung; ein Ganzes mit Teilen nicht (seine Geometrie
  sind die Teile), fremde GlobalIds nicht.
- **D-108.15 Kein Widerspruch zur Fixture.** Alle Sollwerte aus `typisch-bim.json` (Vordersätze v1, „Mengen aktualisieren“
  samt Befund, Aufmaß EG, BGF/BRI/NRF, Kostenschätzung, Vergleich, betroffene Positionen, D-99.13) kommen ohne Anpassung heraus;
  kein Goldwert geändert. Einzig meine eigene Vermutung über Namen und Reihenfolge der 15 Bauteile ohne Zuordnung war falsch
  (Fenster heißen `F-OG-F` usw.); der Test prüft jetzt die Menge nach D-99.13 und die Reihenfolge des Modells.

### Ergebnis (Branch `welle-6/108-bim`, Basis `integration/welle-6`)

Neues reines Paket `packages/bim` (`@tethys/bim`, importiert nur `vertrag` und `dezimal`), eingetragen in `tools/boundaries.mjs`
(`apps/web` darf es importieren; `apps/web/package.json` ergänzen die App-Tickets) und im Lockfile. Glossar vorweg: Mengenübernahme,
Aufmaßblatt aus Auswahl, Bezugsgröße (DIN 277), Kostenschätzung über Kennwerte, Modellvergleich, Modellprüfung. Nach dem Merge
von D-66 nutzt das Paket `IFC_GLOBALID_MUSTER` und die Lesart „erstes Objekt, Struktur vor Bauteilen“.

**Öffentliche Schnittstelle für 114–117** (alle Funktionen rein; Befunde sind `Pruefbefund` mit Quelle `modell-pruefung`):

- **Befehle (114):** `bauwerksmodellBefehlAusfuehren`, `bauwerksmodellChangeSetAnwenden`, `bauwerksmodellChangeSetUmkehren`
  (Signaturen aus `vertrag`; Formprüfung D-108.8; Umbenennen ohne Kopie der Listen; ungültige ChangeSet-Form wirft).
- **Mengenübernahme (115, 116):** `mengenuebernahmeBerechnen(knoten, modell): Mengenuebernahme { positionen, befunde }` und
  `positionUebernehmen(position, modell): Positionsuebernahme { positionId, zeilen, menge, vorher { mengenansatz, menge },
  geaendert, befunde }`. Die App baut je Position mit `geaendert` `MengenansatzSetzen { positionId, mengenansatz: zeilen, menge:
  mengenansatzBerechnen(zeilen).summe }` (nur Ausschreibungs-LV, ein Undo-Schritt). Dazu `EINHEITSREGELN`, `FORMEL_FREIER_ANSATZ`,
  `MENGENART_STUECK`.
- **Aufmaß aus Auswahl (115):** `bauteileImStrukturknoten(modell, strukturGlobalId)` (Auswahl „Geschoss“) und
  `aufmassAusAuswahl(knoten, modell, auswahl): AufmassAusAuswahl { positionen: Aufmassvorschlag[] { positionId, bauteile, zeilen,
  menge, befunde }, befunde, hinweise }`; die App legt je Vorschlag mit Zeilen eine `Aufmassposition` an (`AufmassAnlegen`) und
  zeigt `hinweise` (`bauteil-auf-mehreren-blaettern-nicht-erkennbar`).
- **DIN 277 und Kennwerte (115):** `din277Berechnen(modell, eingaben?): Din277Groessen { bgf, bri, nrf: Bezugsgroesse { art, wert,
  quelle }, befunde }`; `kostenschaetzungBerechnen({ id, projektId, name, groessen, kennwerte: Kennwertansatz[] }):
  Kostenschaetzung { befehl: KostenermittlungAnlegen, gesamt, befunde }`; `kostenkennwerteBerechnen(gruppen, groessen):
  Kostenkennwertzeile[] { nummer, summe, jeBgf, jeBri, jeNrf }` (`gruppen` aus `kostenermittlungBerechnen(...).gruppen`).
- **Vergleich (116):** `modellVergleichen(alt, neu): Modellvergleich { hinzugefuegt, entfernt, geaendert: Bauteilaenderung[]
  { globalId, felder, vorher, nachher, mengen: Mengenaenderung[] }, anzahlUnveraendert, befunde }` und
  `vergleichsfolgenBerechnen(knoten, alt, neu): Vergleichsfolgen { positionen: Vergleichsfolge[] { positionId, vorher, nachher,
  differenz, betroffen, zeilen, befunde } }`.
- **Prüfung (115, 114):** `zuordnungenPruefen(knoten, modell): Zuordnungspruefung { befunde, ohneZuordnung }` (3D-Färbung
  „ohne Zuordnung“) und `bauteileOhneGeometrie(modell, ladebericht.mitGeometrie)`; Codes in `Modellbefundcode` (D-108.3).

**Tests** (10 Dateien, 110 Tests): Befehle (Form, Anwenden, Umkehren, D-66), Mengenübernahme, Aufmaß, DIN 277, Kennwerte,
Vergleich, Prüfung mit Werten von Hand; Golden `haus.test.ts` mit `typisch-bim.json` für Vordersätze v1, „Mengen aktualisieren“
mit v2 samt Befund, Aufmaß EG, BGF/BRI/NRF, Kostenschätzung, Vergleich v1 → v2, betroffene Positionen, D-99.13; Property-Tests
(`eigenschaften.test.ts`: Reihenfolge der Bauteile und Knoten, eine Zeile oder ein Befund je Zuordnung, Vergleich mit sich selbst
leer, Gegenrichtung gespiegelt); Leistung (`leistung.test.ts`): Vergleich zweier 10k-Modelle, Median 33 ms bei Last 19 (Budget
500 ms, D-54).

**Suite** nach `git merge integration/welle-6` (D-66, 105, 110 u. a.): `pnpm lint` 0, `pnpm typecheck` 0; `pnpm test` (Vitest):
3.338 bestanden, 3 übersprungen, 6 Leistungsbudgets fremder Pakete rot bei Last 25–32 auf 4 Kernen (gaeb `lesen` 2 MB, kern K9,
speicher Aufmaß 5.000 Zeilen, vergabe Preisspiegel, ausgabe PDF gross, apps/web D-45); jede dieser Dateien allein grün; `node
--test fixtures` 53/53. Kein Budget gelockert, kein Test übersprungen. `bim` selbst immer grün.

## Answer

Gemergt mit `f2c8dd0` (Branch `welle-6/108-bim`, `f7b2d50`). Paket `bim`: Modellbefehle, Mengenübernahme, Aufmaßblatt aus Auswahl, DIN 277,
Kostenschätzung über Kennwerte, Kostenkennwerte, Modellvergleich mit Folgen, Zuordnungsprüfung; alle Sollwerte aus `typisch-bim.json`
unverändert; Vergleich zweier 10k-Modelle 33 ms (Budget 500 ms).

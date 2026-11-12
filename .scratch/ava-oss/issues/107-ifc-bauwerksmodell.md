# 107: X1a: `ifc` bildet auf `Bauwerksmodell` ab, Eigenschaften bei Bedarf, Budgets

Status: done-by-agent
Type: task
Welle: 6 · Strang: X1a · Paket: `packages/ifc`
Blocked by: 97, 98 (gleiches Paket), 99 (Fixtures)
Modell: opus
Regeln: A2, A3, N1, N3, Q4, Q5, U5, D-50, D-51, D-53, D-54
Herkunft: Ticket 98 (Leser), Ticket 97 (Vertragstypen), Berater D-50, D-54

## What to build

1. **Abbildung.** Aus dem Leseergebnis von Ticket 98 ein `Bauwerksmodell` (v1.6): Kennung, Projekt, Name, `Modelldatei`
   (Hash, Dateiname, Größe kommen vom Aufrufer, der die Bytes ablegt), Schema, `vorgaengerId`, `eingelesen` (Datum vom
   Aufrufer, A2), Struktur, Bauteile mit Mengen (SI, 3 Stellen), `kostengruppe`-Vorschlag. GlobalIds als Marke `IfcGlobalId`
   (die Erzeugungsfunktion der Marke liegt hier). Befunde des Lesers als `Pruefbefund` mit der Quelle aus v1.6.
2. **Eigenschaften bei Bedarf (D-51).** Eine Funktion, die zu einer GlobalId die Eigenschaftssätze (Psets) aus den Bytes liest,
   für die Eigenschaftsanzeige der App; für viele Abfragen hintereinander mit einem einmal gebauten Index (die App hält ihn im
   Worker).
3. **Golden-Tests mit den Fixtures (Ticket 99):** `haus-v1.ifc` und `haus-v1-ifc2x3.ifc` ergeben dieselben Bauteile und Mengen
   (bis auf das Schema), passend zu `fixtures/typisch-bim.json`; `haus-v2.ifc` mit den erwarteten Änderungen.
4. **Leistung (Q4, D-54):** Das 10.000-Bauteile-Modell aus `fixtures/ifc/erzeugen.mjs` lesen und abbilden ≤ 5 s CPU in Node
   (Median mehrerer Läufe; unter Parallellast einzeln wiederholen und beide Werte nennen).

Hinweis aus Ticket 98: Das Leseergebnis kennt Mengen ohne Wert (`wert: Menge | null`), `Bauteilmenge.wert` in v1.6 nicht.
Entscheidung des Orchestrators: Eine Menge ohne Wert entfällt bei der Abbildung mit einem Befund (Bauteil, Mengensatz, Name), nie 0;
kein Vertragsfeld dafür.

Aus dem Review von v1.6 (D-66, Befund 4): Ringe in `elternGlobalId` (Struktur) und `teilVonGlobalId` (Teile) bricht die
Abbildung mit einem Befund auf, damit `BauwerksmodellAnlegen` eine fehlerhafte Datei nicht ganz abweist (U5). Bei doppelten
GlobalIds gilt jeder Verweis dem ersten Objekt in Dateireihenfolge (Befund 5).

## Grenzen

- Nur `packages/ifc`. Kein `vertrag`. Mengenübernahme, Vergleich und DIN 277 gehören `bim` (Ticket 108). `okf/research/` wird
  nicht gelesen (C3).

## Acceptance criteria

- [x] Abbildung und Eigenschaften getestet, Fixture-Goldens grün, Budget grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Ergebnis (2026-11-12, Branch `welle-6/107-ifc-modell`)

**Öffentliche Schnittstelle für die App** (`@tethys/ifc`, rein nach A2, importiert nur `vertrag` und `dezimal`; alle Typen der
Abbildung sind die des Vertrags v1.6):

- `bauwerksmodellLesen(bytes: Uint8Array, kopf: Omit<BauwerksmodellKopf, 'schema'>, optionen?: IfcOptionen):
  BauwerksmodellLesung` mit `{ bauwerksmodell: Bauwerksmodell | null; befunde: readonly Pruefbefund[] }`. Den Kopf ohne
  Schema gibt die App (Kennung aus `IdQuelle.bauwerksmodell()`, Projekt, Name, `datei` mit dem Hash aus
  `modelldateien.ablegen`, Dateiname und `bytes.length`, Vorgänger, `eingelesen` von ihrer Uhr); er wird unverändert
  übernommen, das Schema kommt aus der Datei. `bauwerksmodell` ist nur `null` bei `eingabe-zu-gross`, `keine-ifc-datei`,
  `schema-nicht-unterstuetzt` (dann genau ein Befund). Das Ergebnis geht so in `BauwerksmodellAnlegen { bauwerksmodell }`.
- `eigenschaftsindexBauen(bytes, optionen?): Ergebnis<Eigenschaftsindex, Pruefbefund>`; `index.eigenschaften(globalId):
  Objekteigenschaften | null` mit `{ eigenschaften: Eigenschaft[]; klassifikationen: Klassifikation[]; materialien:
  string[]; befunde: Pruefbefund[] }` für jeden Strukturknoten und jedes Bauteil des Modells (`null` für jede andere
  GlobalId). Für eine einzelne Abfrage `eigenschaftenLesen(bytes, globalId, optionen?)`. Die App hält den Index im Worker.
- `globalIdLesen(text): Ergebnis<IfcGlobalId, GlobalIdFehler>`: einzige Erzeugung der Marke (etwa für GlobalIds aus der
  3D-Ansicht), Form über `IFC_GLOBALID_MUSTER` des Vertrags.
- Typen `Eigenschaft { satz; name; werte: { typ; text }[] }`, `Klassifikation { system; kennung; name }`, `IfcBefundcode`
  (31 Codes), `IfcOptionen { maxBytes?; maxTiefe? }`; Konstanten `STANDARD_MAX_BYTES` (500 MiB), `STANDARD_MAX_TIEFE` (64).
- Nicht mehr öffentlich: `ifcLesen` und die Lesertypen aus Ticket 98 (`IfcLesung`, das eigene `Bauwerksmodell` …); siehe
  D-107.2. Ihre 120 Tests laufen unverändert gegen das Modul `lesen.ts`.

**Neue Befundcodes der Abbildung** (Quelle `ifc-lesen`): `menge-ohne-wert` (fehler), `bauteil-ohne-ganzes` (warnung),
`verweis-mehrdeutig` (warnung), `strukturknoten-ring` und `bauteil-ring` (fehler); dazu `strukturknoten-ohne-eltern` und
`bauteil-ohne-strukturknoten` für Verweise auf Objekte, die nicht im Modell stehen.

**Tests:** 19 Testdateien, 154 Tests im Paket (34 neu): Golden der Abbildung (`bauwerksmodell.test.ts`: Kopf, Struktur,
Bauteile, optionale Felder, Befunde mit GlobalId, Abweisung, Menge ohne Wert, Objekte ohne GlobalId, doppelte GlobalIds,
Ringe), Property-Tests (`bauwerksmodell-eigenschaften.test.ts`: beliebige Geflechte aus Knoten und Bauteilen mit doppelten
und kaputten GlobalIds, Ringen, Mengen ohne Wert, dazu verstümmelte Dateien; geprüft gegen die Lesarten von
`BauwerksmodellAnlegen` samt D-66, deterministisch; Index kennt genau die GlobalIds des Modells und antwortet unabhängig von
der Reihenfolge; mit zwei Mutationen gegengeprüft: ohne Aufbrechen der Ringe bzw. ohne die Regel „erstes Objekt“ fällt der
Test), Fixtures (`haus-modell.test.ts`), Eigenschaften (`eigenschaftsindex.test.ts`, mit der Außenwand Süd aus `haus-v1`),
Marke (`globalid-marke.test.ts`), Budget (`leistung.test.ts`).

**Fixtures (Punkt 3):** `haus-v1.ifc` ohne Befund, 30 Bauteile in Klasse, Name, Geschoss und Mengen gleich
`typisch-bim.json`, je mit `kostengruppe` (gegen ein Text-Orakel aus den `IfcRelAssociatesClassification` der Datei) und ohne
`teilVonGlobalId`; Geschoss- und Raummengen gleich den DIN-277-Sollwerten; `haus-v1-ifc2x3.ifc` ergibt dasselbe
Bauwerksmodell bis auf das Schema (Name und `datei` kommen vom Aufrufer); `haus-v2.ifc` gleich den Sollwerten von v2, und
hinzugefügt, entfernt und geändert (Felder, Mengen vorher/nachher) gleich `erweitert.vergleich`.

**Messungen** (CPU-Zeit des Prozesses, `process.cpuUsage`, 4 Kerne geteilt):

| Was | Werte | Budget |
|---|---|---|
| `bauwerksmodellLesen`, 10.000 Bauteile auf 10 Geschossen (21,0 MB), Datei allein, 5 Läufe, Last 18 | 1.801 / 1.703 / 1.781 / 1.637 / 1.873 ms, Median 1.781 ms | ≤ 5.000 ms (D-54), grün |
| dasselbe im Test (Median aus 3), volle Suite bei Last 32–36 und allein | grün in beiden | |
| `eigenschaftsindexBauen`, dasselbe Modell, 3 Läufe, Last 32 | 1.277 / 1.540 / 1.652 ms | kein Budget |
| alle 10.000 Abfragen `eigenschaften(globalId)` hintereinander | 497 ms gesamt, 0,05 ms je Abfrage | kein Budget |

**Ganze Suite** nach `git merge integration/welle-6` (Stand `aca2dcb`, mit dem Nachtrag D-66 zu v1.6):
`NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` grün (Paketgrenzen, Lizenzen, Clean Room), `pnpm typecheck` grün,
`node --test "fixtures/*.test.mjs"` 53/53. `pnpm test` mit Standardparallelität bei Last 32–36 auf 4 Kernen: 250 Dateien grün,
6 Zeitbudgets fremder Pakete rot (Wanduhr), keines in `ifc`; jede Datei allein wiederholt grün, und `vitest run
--maxWorkers=1` war ganz grün (256 Dateien, 3.268 Tests, 3 übersprungen wie vorher). Kein Budget gelockert, kein Test
übersprungen.

| Budget (fremdes Paket) | volle Suite | Datei allein |
|---|---|---|
| `gaeb` Lesen > 2 MB, < 1.000 ms | 1.999,8 ms | grün |
| `gaeb` X86 `gross` schreiben, < 1.000 ms | 1.056,7 ms | grün |
| `kern` `lvPruefen(gross)`, < 50 ms | 57,2 ms | grün |
| `speicher` Aufmaß 5.000 Zeilen, < 100 ms | 102,4 ms | grün |
| `vergabe` Preisspiegel `gross`, < 1.000 ms | 1.521,3 ms | grün |
| `apps/web` D-45 Undo Aufmaßblatt, < 100 ms | 131,5 ms | grün |

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-107.1 Prüfnähte (TDD).** Frage: An welchen Schnittstellen wird getestet? Entscheidung: an der öffentlichen Schnittstelle
  (`bauwerksmodellLesen`, `eigenschaftsindexBauen`/`eigenschaftenLesen`, `globalIdLesen`), dazu ein Property-Test gegen die
  Lesarten des Vertrags, die `bim` beim Anlegen prüft, unabhängig von der Abbildung geschrieben. Die Golden-Tests des Lesers
  (Ticket 98) bleiben am inneren `ifcLesen`. Grund: Die App und `bim` sehen nur das Vertragsmodell; der Property-Test fängt
  ab, dass eine kaputte Datei `BauwerksmodellAnlegen` als Ganzes scheitern lässt (U5). Reversible: yes.
- **D-107.2 Öffentliche Fläche.** Frage: Lesertypen umbenennen oder ersetzen (Hinweis 1 in Ticket 98)? Entscheidung: Nach außen
  nur die Vertragstypen und, was der Vertrag nicht hat (`Eigenschaft`, `Klassifikation`, `IfcBefundcode`, `IfcOptionen`);
  `ifcLesen` und die Lesertypen sind innen (`lesen.ts`, `typen.ts`). Grund: keine zwei Typen gleichen Namens (L2), und die App
  kann Eigenschaften, Klassifikationen und Materialien nicht versehentlich speichern (D-51). Reversible: yes.
- **D-107.3 Kopf vom Aufrufer.** Frage: Welche Form haben die Angaben der App, und prüft `ifc` sie? Entscheidung:
  `Omit<BauwerksmodellKopf, 'schema'>` (kein neuer Typname), unverändert übernommen, Feld für Feld gebaut (keine fremden
  Felder); keine Prüfung von Hash und Größe. Grund: A2 (kein SHA-256 hier); `speicher` und `bim` prüfen Hash, Größe und
  Datum ohnehin (Lesarten an `BauwerksmodellAnlegen`). Reversible: yes.
- **D-107.4 Menge ohne Wert.** Frage: Ort und Schwere des Befunds der Orchestrator-Entscheidung? Entscheidung: Code
  `menge-ohne-wert`, Schwere `fehler` (etwas fällt weg, wie D-98.12), je Objekt, Mengensatz und Name; `pfad`/`zeile` der
  Menge in der Datei, `globalId` des Objekts (die Ursache meldet der Leser schon an der Menge oder Einheit). Dasselbe für
  einen Wert, der keine gültige `Menge` ist (länger als die Grenze von `dezimal`, sonst wiese `bim` das ganze Modell ab); ein
  Mengenname nur aus Leerraum gilt im Leser als fehlender Name (`menge-ungueltig`), weil der Vertrag nicht leere Namen
  zusagt. Grund: Q5, U5, D-53 (nie 0). Reversible: yes.
- **D-107.5 Objekte ohne GlobalId in Form.** Frage: Was wird aus Verweisen auf ein Objekt, das wegfällt (D-97.4)?
  Entscheidung: Das Objekt fehlt; der Befund `globalid-ungueltig` sagt das dazu. Ein Verweis darauf entfällt mit Befund:
  Eltern `strukturknoten-ohne-eltern`, Strukturknoten `bauteil-ohne-strukturknoten` (beide wie im Leser, Warnung), Ganzes
  `bauteil-ohne-ganzes` (neu, Warnung; das Teil bleibt ein Bauteil). Grund: Jedes `null` im Modell hat einen Befund (Lesarten
  an `Strukturknoten` und `Bauteil`). Reversible: yes.
- **D-107.6 Doppelte GlobalIds (D-66).** Frage: Ein Verweis auf ein späteres Objekt derselben GlobalId würde im Modell das
  erste meinen. Umlenken oder weglassen? Entscheidung: weglassen mit `verweis-mehrdeutig` (Warnung), das erste Objekt nach
  D-66 (`struktur` vor `bauteile`); so fällt auch ein Ganzes weg, dessen GlobalId zuerst ein Strukturknoten trägt (falsche
  Art). Grund: Das Modell sagt nichts, was die Datei nicht sagt (nichts erfinden, Ticket 98); `bim` findet nur Verweise auf
  die richtige Art. Alternative: auf das erste Objekt umlenken (dann stünde z. B. eine Wand im falschen Geschoss).
  Reversible: yes.
- **D-107.7 Ringe (D-66).** Frage: Wo wird ein Ring aufgebrochen? Entscheidung: am ersten Objekt des Rings in der Reihenfolge
  der Datei, das seinen Verweis verliert; Befund `strukturknoten-ring` bzw. `bauteil-ring` (Fehler) mit der Kette
  (`Ring #16 → #17 → #16`); ein Objekt, das an sich selbst hängt, ist ein Ring aus einem. Jedes Objekt wird einmal besucht
  (10.000 Teile in einer Kette kosten nichts Quadratisches). Grund: deterministisch, und meist steht das Ganze vor seinen
  Teilen in der Datei. Reversible: yes.
- **D-107.8 Ort der Befunde.** Frage: Wann trägt ein Befund `globalId`? Entscheidung: wenn er ein Objekt des Modells
  betrifft: die Instanz seines `pfad`, oder das beim Melden genannte Objekt (`bauteil-mehrfach-enthalten`: das Element der
  Beziehung; `menge-ohne-wert`: das Objekt, während `pfad` die Menge nennt). Befunde zu Mengen, Einheiten oder Beziehungen
  allein haben keine. Grund: Lesart `ifc-lesen` an `Befundort`; Sprungziel im Befunddialog (U5). Reversible: yes.
- **D-107.9 Umfang beim Anlegen.** Frage: Liest `bauwerksmodellLesen` Eigenschaften und Materialien mit? Entscheidung: nein
  (Klassifikationen nur für den Kostengruppen-Vorschlag); `eigenschaft-nicht-gelesen` erscheint deshalb erst in der Abfrage.
  Grund: D-51, Leistung, und der Befunddialog des Einlesens nennt nur, was das Modell betrifft. Reversible: yes.
- **D-107.10 Eigenschaftsindex.** Frage: Was liefert eine Abfrage, für welche Objekte, mit welchen Befunden? Entscheidung:
  Eigenschaften, Klassifikationen und Materialien (die Lesart an `Bauteil` nennt alle drei „bei Bedarf“) für genau die
  Objekte des Modells; bei doppelter GlobalId das erste (D-66) mit `globalid-doppelt` (Warnung). Der Index sammelt die
  Beziehungen einmal; jede Abfrage liest mit eigenem Leser und meldet alles, was sie betrifft, gleich in jeder Reihenfolge
  (dafür meldet jetzt der Leser die Befunde beim Zerlegen einer Instanz, einmal je Leser, statt der STEP-Schicht einmal je
  Datei; die Reihenfolge der Befunde von `ifcLesen` bleibt). Beim Bauen zählt nur, ob die Datei gelesen wird. Grund: Die
  Anzeige soll sagen, dass etwas fehlt (Q5), egal welches Bauteil man zuerst anklickt. Reversible: yes.
- **D-107.11 Messung des Budgets.** Frage: Wie wird „Median mehrerer Läufe“ gemessen? Entscheidung: CPU-Zeit des Prozesses
  (`process.cpuUsage`, wie `ausgabe` Ticket 58), Median aus 3 Läufen ohne Aufwärmlauf, Erzeugen der Datei außerhalb der
  Messung. Grund: Wanduhrzeit schwankt neben anderen Workern um ein Mehrfaches. Reversible: yes.

### Hinweise für Folgetickets

- **108 (`bim`):** Das Modell aus `bauwerksmodellLesen` erfüllt die Form von `BauwerksmodellAnlegen` (GlobalIds in Form,
  Verweise auf das erste Objekt der richtigen Art, kein Ring in Struktur und Teilen, Mengen kanonisch mit nicht leerem Namen,
  optionale Felder fehlen statt `null`); doppelte GlobalIds kommen vor (Befund `globalid-doppelt` beim Lesen).
- **114 (App):** Im Worker `bauwerksmodellLesen` mit dem Kopf der App, danach `eigenschaftsindexBauen` aus denselben Bytes für
  die Eigenschaftsleiste (Bauen etwa so teuer wie das Lesen, Abfragen 0,05 ms); GlobalIds aus `ui-modell` mit
  `globalIdLesen` zur Marke machen. Die Befunde haben `quelle: 'ifc-lesen'` und, wo ein Objekt gemeint ist, `ort.globalId`.

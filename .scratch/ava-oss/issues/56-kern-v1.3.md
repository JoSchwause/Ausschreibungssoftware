# 56: Kern v1.3: Mengenansatz, Einfügen hinter einer Gliederung, leere Langtext-Strukturen

Status: resolved
Type: task
Welle: 4 · Strang: K · Paket: `packages/kern`
Blocked by: 53 (`vertrag` v1.3), 51 (Fixture-Testcode im Kern)
Regeln: A2, A3, A5, A6, U5, Q1, Q5, F6, D-22
Herkunft: Ticket 53 (Punkte 5, 8, 9), D-22

## What to build

`vertrag` v1.3 (Ticket 53) hat neue Glieder geschlossener Listen eingeführt, die der Kern bisher markiert abweist
(`// v1.3: mechanisch angepasst, Folgeticket`). Dieses Ticket gibt ihnen Logik:

1. **`MengenansatzSetzen`** (Punkt 9): setzt `mengenansatz` und `menge` der Position in einem ChangeSet, rechnet GP und
   Summen wie `MengeAendern` (A6). Der Kern wertet den Ansatz nicht aus (kein `kern → mengen`, A3); er prüft nur die Form
   (Zeilennummern ganzzahlig, Formelnummer ganzzahlig, Ausdruck ein String, Variablenname String oder `null`) und dass
   `menge` kanonisch mit 3 Stellen ist oder `null`. `null` als Ansatz entfernt das Feld. Umkehrbar aus dem ChangeSet.
   Lesart (a) aus Ticket 53: **jeder** andere Befehl, der die Menge einer Position mit Ansatz ändert (`MengeAendern`,
   Feldbefehle, Einfügen aus der Zwischenablage, falls es Mengen setzt), entfernt den Ansatz im selben ChangeSet. Test: ein
   Property-Test über alle mengenändernden Befehle.
2. **Einfügeort „hinter einer Gliederung als Geschwister“** (Punkt 5): `PositionAnlegen`, `GliederungAnlegen`,
   `KnotenEinfuegen`, `KnotenVerschieben`, `PapierkorbeintragWiederherstellen` u. a. nehmen die neue Form an; Lage wie
   „nach“ einer Position, F1-Prüfungen wie bisher, OZ-Vorschlag nach D-42.3. Die bisherige Form („nach Gliederung = erstes
   Kind“) bleibt unverändert gültig.
3. **Leere Langtext-Strukturen** (Punkt 8, D-22 (iii)): Die formale LV-Prüfung (K8, `lv-pruefung.ts`) meldet eine leere
   Liste, eine Tabelle ohne Zeilen und eine Zeile ohne Zellen als Befund (Warnung, mit Sprungziel), sperrt nie (U5).
   `PRUEF_ANNAHMEN` ergänzen.

## Grenzen

- Nur `packages/kern`. Braucht ein anderes Paket eine Änderung, melden (P2).
- Kern bleibt rein (A2). Fixtures und Sollwerte unverändert.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Je Punkt Unit-Tests; Umkehrbarkeit (ChangeSet anwenden ∘ umkehren = Identität) für Punkt 1 und 2 als Property-Test
- [x] Die markierten Abweisungen aus Ticket 53 sind entfernt
- [x] Leistung: `MengenansatzSetzen` bei `gross` < 16 ms (Q4)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Auswertung des Ansatzes im Kern, Oberfläche, Speicherung.

## Comments

### Aus Ticket 53 (Review, D-27)
- `KnotenEinfuegen` (Kopie) behält den Mengenansatz; `[]` als Ansatz gilt wie `null`; `PositionAnlegen` mit `mengenansatz` wird bis hier markiert abgewiesen – entscheiden, ob es ihn tragen darf.
- `MengenansatzSetzen` hat dieselben Vorbedingungen wie `MengeAendern` (Zuschlagsposition, Pauschal).
- Nullbewegung bei `hinter-gliederung` auf sich selbst abfangen (`knoten-befehle.ts` prüft heute nur `nach`).
- Formprüfung für `auftragnehmer` und `epaBezeichnungen` (D-28: `nummer` und `anteil` eindeutig, sortiert) in `inhaltKopfFehler`; der Vertragskommentar sagt „prüft der Kern“.

### Ergebnis (Branch `welle-4/56-kern-v1.3`, Basis `integration/welle-4`)

Nur `packages/kern`; `vertrag` unverändert, keine Fixture, kein Golden geändert; kein Import von `mengen` (A3).

1. **Mengenansatz.** `mengenansatz-befehle.ts`: Handler `MengenansatzSetzen` (Formprüfung `mengenansatzFehler` in
   `pruefung.ts`, Menge kanonisch oder `null`, `null`/`[]` entfernen das Feld, gleicher Stand → leeres ChangeSet; Summen
   über `positionAendern` wie `MengeAendern`). `mengenansatz.ts`: `mitMengenansatz`, `positionNormal` (Einheit `''` → `null`
   und `[]` → kein Feld) für `PositionAnlegen`, `LeistungsverzeichnisAnlegen`, `KnotenEinfuegen` und das Auftrags-LV.
   Lesart (a) in `mengeAendern`. `ZUSTAENDIGES_TICKET` ist wieder leer. Tests: `mengenansatz.test.ts`,
   Property-Test `mengenansatz-eigenschaften.test.ts` (alle Befehle an Positionen; Lesart (a), nie `[]`, Summen,
   Umkehrbarkeit; mit Mutationsprobe geprüft), Budget `mengenansatz-leistung.test.ts` (Median 2,7 ms bei `gross`).
2. **`hinter-gliederung`.** `platzieren.ts`: `gliederungFuerHinter` (Ziel muss Gliederung sein) und `hinterKnoten` (dieselbe
   Lage wie `nach` einer Position, auch mit mitbewegtem Ziel); `zielAufloesen` in `knoten-befehle.ts` nutzt beides;
   `KnotenVerschieben` einer Gliederung hinter sich selbst ist eine Nullbewegung. OZ-Vorschlag ohne eigenen Code (er folgt
   aus den neuen Listen, D-42.3). `hinterGliederungOffen` und alle Marker der Abweisung sind gelöscht. Tests:
   `hinter-gliederung.test.ts`; die Property-Tests `eigenschaften.test.ts` (Orakel des Baums) und
   `k9-eigenschaften.test.ts` (Einfügen, Verschieben, Wiederherstellen, Umkehrbarkeit) erzeugen die Form jetzt.
3. **Leere Langtext-Strukturen.** K8-Regel `langtext-struktur-leer` in `pruefregeln.ts`, Eintrag `leereStruktur` in
   `PRUEF_ANNAHMEN`. Test in `lv-pruefung.test.ts`.
4. **Kopf v1.3 (aus Ticket 53).** `inhaltKopfFehler` prüft `auftragnehmer` und `epaBezeichnungen` (für LV und
   Auftrags-LV). Test `lv-kopf-v13.test.ts`.

Noch markiert außerhalb von `kern` (nicht dieses Paket, P2): Testmodell `ui-grid/e2e/harness/befehle-anwenden.ts` und
`proto/interview/src/store.tsx` werfen weiter bei `hinter-gliederung`; `apps/web/src/lv/LvSeite.tsx` (Ticket 67);
`speicher` weist `mengenansatz` bis Ticket 57 mit `unbekannt` ab. Die übrigen Marker in `kern` (`Summenaenderung.vorher`
Pflicht) haben kein Folgeticket und bleiben.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-56.1** Darf `PositionAnlegen` einen Mengenansatz tragen? Ja: Form geprüft wie bei jeder Position
  (`positionsdatenFehler`, Feld `mengenansatz`), `[]` fällt weg. Grund: Der Vertragskommentar an
  `Positionsdaten.mengenansatz` sagt „Kopien und Anlegebefehle bringen ihn mit, der Kern prüft die Form“; Abweisen hieße,
  das Anlegen einer Kopie über `PositionAnlegen` verlöre ihn; gleich wie `KnotenEinfuegen` (D-27).
- **D-56.2** Entfernt `MengeAendern` mit derselben Menge den Ansatz? Nein: gleicher Wert → leeres ChangeSet wie bisher, der
  Ansatz bleibt. Grund: Wortlaut „ein Befehl, der die Menge … ändert“; die Oberfläche fragt vorher (D-22), ein Befehl
  ohne Wirkung bleibt ohne Wirkung.
- **D-56.3** Welche Befehle außer `MengeAendern` ändern eine Menge? Keiner: Feldbefehle (Kurz-/Langtext, Einheit, EP,
  EPA, Merkmale, OZ) ändern sie nie; `KnotenEinfuegen`, `PapierkorbeintragWiederherstellen` und die Anlegebefehle bringen
  neue Knoten mit eigener Menge und eigenem Ansatz (die Kopie behält ihn, D-27). Der Property-Test fährt alle diese Befehle
  und prüft die Lesart (a) als Eigenschaft, so dass ein künftiger Mengenbefehl ohne Entfernen auffällt.
- **D-56.4** Fehler bei `hinter-gliederung`: unbekanntes Ziel `knoten-unbekannt`; Ziel Position oder Hinweistext
  `knotenart-unzulaessig` (nicht still als `nach` gedeutet; eine Schreibweise je Ort, Typkommentar). Hinter sich selbst:
  Nullbewegung bei `KnotenVerschieben`, bei `KnotenlisteVerschieben` mit mitbewegtem Ziel an dessen Stelle (wie `nach`,
  D-42.1). Grund: engste Lesart des Typkommentars, Zyklus- und Ebenenprüfungen bleiben unverändert.
- **D-56.5** Form des K8-Befunds? Code `langtext-struktur-leer`, Warnung, ein Befund je Text (Feld `langtext`, `text` am
  Hinweistext, `leitbeschreibung` für die Unterbeschreibungen), die Meldung nennt die gefundenen Arten; auch verschachtelt;
  leere Zelle und leerer Listenpunkt sind keiner. Grund: Sprungziel je Text genügt (U5), keine Befundflut; der Editor kann
  leere Zellen darstellen.
- **D-56.6** `epaBezeichnungen: []` und Form des Auftragnehmers? `[]` wird mit `ungueltige-eingabe` abgewiesen (nicht
  normalisiert): Der Vertrag sagt „nie `[]`, ein Erzeuger ohne Zuordnung lässt das Feld weg“, anders als beim
  Mengenansatz, für den er die Normalisierung ausdrücklich nennt. Auftragnehmer: Objekt, `name`, `strasse`, `plz`, `ort` je
  Zeichenkette oder `null`. Nur Form, nie Inhalt (D-41.1).
- **D-56.7** Vorbedingungen von `MengenansatzSetzen`: genau die von `MengeAendern` (Position vorhanden, Menge kanonisch);
  Zuschlags- und Pauschalposition werden nicht abgewiesen, K8 meldet wie bei `MengeAendern` (`zuschlag-satz-und-menge`,
  `pauschal-menge`). Grund: D-27 („dieselben Vorbedingungen“), U5.
- **D-56.8** Seams der Tests (Demo-Modus, keine Rückfrage möglich): `lvBefehlAusfuehren`, `auftragsLvBefehlAusfuehren`,
  `lvChangeSetAnwenden`/`changeSetUmkehren`, `lvPruefen`; keine Tests gegen interne Funktionen.

## Answer

Gemergt auf `integration/welle-4` mit Merge-Commit 78d4229; Review-Befunde behoben in `fix/welle-4-review` (847aa43, siehe `../review-welle-4.md`).

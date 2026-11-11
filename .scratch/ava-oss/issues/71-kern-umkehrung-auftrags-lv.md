# 71: Kern v1.4: Befehle am Auftrags-LV, Umkehrung, neue LV-Befehle

Status: resolved
Type: task
Welle: 5 · Strang: K · Paket: `packages/kern`
Blocked by: 70
Regeln: A2, A5, A6, F1, N2, U5, Q1, ADR 0011, D-35, D-36, D-40
Herkunft: D-64.4 (die App kehrt Auftrags-LV-ChangeSets mit der LV-Umkehrung um, über `as string as LeistungsverzeichnisId`);
`vertrag` v1.4 (Ticket 70, Comments „Folgearbeit Kern“)

## What to build

Die Handler für alles, was `vertrag` v1.4 dem Kern zuweist; bis dahin weist der Kern es mit `befehl-nicht-zustaendig` ab
(markierte mechanische Zeilen aus Ticket 70 ersetzen).

1. **Auftrags-LV:** `auftragsLvChangeSetAnwenden` und `auftragsLvChangeSetUmkehren` (Signaturen aus v1.4), eigene
   Implementierung oder geteilte Hilfsfunktion mit der LV-Umkehrung, aber ohne Kennungs-Umdeutung (D-64.4).
2. **`NachtragUebernehmen`** (D-35): hängt den Teilbaum an die Wurzel des Auftrags-LV; prüft Baumregeln (F1, höchstens 5
   Ebenen, Eltern vor Kindern, eindeutige Kennungen auch gegen den vorhandenen Baum – eine zweite Übernahme desselben
   Nachtrags ist damit ein Fehler), Form der Positionen wie beim Anlegen; rechnet die Summen des Auftrags-LV neu (A6: nur
   der betroffene Teilbaum und die Gesamtsumme), ChangeSet mit `knoten.hinzugefuegt` und `summen.vorher`.
3. **`KostengruppeSetzen`** im LV und im Auftrags-LV: nur an Positionen; Form der Nummer prüfen (dreistellig `100`–`999`
   wie im Glossar „Kostengruppe“; der Kern darf `kosten` nicht importieren, A3 – eigene kleine Formprüfung mit Verweis auf
   den Glossar, oder dem Typ vertrauen; entscheiden und begründen). Keine Summenänderung.
4. **`NachtragsangabenSetzen`, `VorlageSetzen`, `TextquelleSetzen`** (D-35, D-40) als Kopf- bzw. Feldbefehle wie die
   vorhandenen (`kopfdaten-befehle.ts`, `feld-befehle.ts`). `Nachtragsangaben.nummer` nicht leer; Status aus der Liste.
5. Kopieren (`kopieBauen`, K9) und GAEB-unabhängige Prüfungen nehmen die neuen Positionsfelder mit (Kostengruppe und
   Textquelle bleiben bei Kopie erhalten; ein Muster-LV ist eine Quelle für Kopien, C5).

## Grenzen

- Nur `packages/kern`. Die App stellt in Ticket 86 auf die neue Umkehrung um (Umweg aus D-64.4 entfernen).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Property-Test anwenden ∘ umkehren = Identität für jeden neuen Befehl (LV und Auftrags-LV)
- [x] Golden-Test `NachtragUebernehmen` an `typisch` als Auftrags-LV: Summen danach = Summen vorher + Summe des Nachtrags
- [x] Fehlerfälle: zweite Übernahme, sechste Ebene, Los neben Titel (F1), Kostengruppe an Gliederung
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Form von `kostengruppe` prüfen (die Marke und `KostengruppeSetzen` legen das fest; Fehler `ungueltige-eingabe`) und
  `textquelle: ''` entfernen bzw. abweisen – auch an mitgebrachten Knoten (`LeistungsverzeichnisAnlegen`,
  `AuftragsLeistungsverzeichnisAnlegen`, `KnotenEinfuegen`, `NachtragUebernehmen`; über `positionsdatenFehler` bzw.
  `positionNormal`), damit „nie `''` im Zustand“ gilt. Punkt 3 oben ist damit entschieden.
- D-42 (Kern-Teil): `AuftragsLeistungsverzeichnisAnlegen` legt im ChangeSet-Kopf nur Felder von `AuftragsLvKopf` ab (heute
  `ohneKnoten(a)` trägt zur Laufzeit `nachtrag`/`vorlage` eines LV mit); Test.

## Comments

(Alt: „Kern: Umkehrung für ChangeSets des Auftrags-LV“, Punkt 1 oben; der App-Teil liegt jetzt in Ticket 86.)

### Ergebnis (Branch `welle-5/71-kern-v1.4`, Basis `integration/welle-5`)

Nur `packages/kern`. Alle Marker `// v1.4: mechanisch angepasst, Folgeticket` in `kern` sind ersetzt (`grep` findet keinen
mehr), `ZUSTAENDIGES_TICKET` ist wieder leer.

| Punkt | Datei | Was |
|---|---|---|
| 1 | `changeset.ts` | `auftragsLvChangeSetAnwenden`, `auftragsLvChangeSetUmkehren` (Vertragssignaturen); Knoten- und Summenlogik mit dem LV geteilt (`knotenAnwenden`, `summenAnwenden`, `summenUmkehren` arbeiten nur auf `knoten`/`summen`), keine Umdeutung der Kennung (D-64.4) |
| 2 | `auftrags-lv.ts` | Dispatcher für die drei AuftragsLvBefehle; `NachtragUebernehmen` (Prüfung über das verallgemeinerte `listeFehler` aus `einfuegen-befehle.ts`, dazu Wurzel, F1, Ebenen; Summen über `summenAenderung`, deren Zustandstyp jetzt strukturell `SummenZustand` ist) |
| 3 | `kostengruppe.ts`, `positionsfelder.ts` | `KostengruppeSetzen` im LV und (über `kostengruppeWechsel`) im Auftrags-LV; Form `^[1-9][0-9]{2}$` (`KOSTENGRUPPE_FORM`, `kostengruppeFehler`, exportiert) |
| 4 | `kopfdaten-befehle.ts`, `feld-befehle.ts` | `NachtragsangabenSetzen`, `VorlageSetzen` (Kopf), `TextquelleSetzen` (Feldbefehl) |
| 5 | `pruefung.ts`, `mengenansatz.ts`, `knoten-befehle.ts` | `positionsdatenFehler` prüft `kostengruppe` und `textquelle`; `positionNormal` lässt `textquelle: ''` weg; `PositionAnlegen` übernimmt beide Felder; `kopieBauen` trägt sie unverändert mit (Test) |
| D-42 | `auftrags-lv.ts` | Kopf des Auftrags-LV nur mit den Feldern von `AuftragsLvKopf` (Feldliste, die der Typprüfer vollständig verlangt) |

Tests: `auftrags-lv-v14.test.ts` (Anwenden/Umkehren, D-42, Golden `NachtragUebernehmen` an `typisch`, Fehlerfälle,
`KostengruppeSetzen`), `lv-v14.test.ts` (die vier LV-Befehle, mitgebrachte Felder, Kopie), `v14-eigenschaften.test.ts`
(Property-Tests LV und Auftrags-LV: anwenden ∘ umkehren = Identität, Umkehrung der Umkehrung, Summen = Neuberechnung,
Invarianten, Normalform). Die mechanischen Tests in `baum.test.ts` und `auftrags-lv.test.ts` sind ersetzt.

Golden (hergeleitet, N2/N5): `typisch` netto 55.465,59 + Nachtrag (12,500 × 48,200 = 602,50; 3,000 × 215,750 = 647,25;
Summe 1.249,75) = 56.715,34; Nachlass 2 % = 1.134,31; Netto n. N. 55.581,03; MwSt 19 % = 10.560,40; Brutto 66.141,43.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-71.1** Welche Schnittstellen testen (Demo-Modus, keine Rückfrage)? **Nur die öffentlichen:** `lvBefehlAusfuehren`,
  `auftragsLvBefehlAusfuehren`, `auftragsLvChangeSetAnwenden`/`…Umkehren`, `changeSetUmkehren`, `kopieBauen`,
  `pruefeLvInvarianten`. Grund: Verhalten an der Naht, wie die vorhandenen Tests.
- **D-71.2** Kostengruppe: eigene Formprüfung oder dem Typ vertrauen? **Eigene Formprüfung** `^[1-9][0-9]{2}$` in
  `positionsfelder.ts` (Verweis auf Glossar „Kostengruppe“, kein Import aus `kosten`, A3), angewandt in `KostengruppeSetzen`
  und in `positionsdatenFehler` (also an allen mitgebrachten Knoten und in `pruefeLvInvarianten`). Grund: Befehle kommen
  auch aus Protokoll und Datei (Vertrag am Typ; Nachtrag D-42).
- **D-71.3** `KostengruppeSetzen` an einer Gliederung oder einem Hinweistext: welcher Code? **`knoten-unbekannt`** (Wortlaut
  des Vertrags an `KostengruppeSetzen`: „Nur an einer Position …; sonst `knoten-unbekannt`“), im LV und im Auftrags-LV.
  `TextquelleSetzen` folgt dagegen den Feldbefehlen (`knotenart-unzulaessig`, Vertrag: „ein Feldbefehl wie
  `KurztextAendern`“). Die Uneinheitlichkeit ist im Vertrag angelegt; Vorschlag für die nächste Vertragsfassung: beide
  `knotenart-unzulaessig`.
- **D-71.4** `textquelle: ''` an mitgebrachten Knoten: abweisen oder entfernen? **Entfernen** (`positionNormal`), wie `''`
  als Einheit und `[]` als Mengenansatz. Grund: U5 (ein Import wird nicht gesperrt), eine Regel für alle Wege; ein Wert, der
  kein Text ist, wird abgewiesen (`ungueltige-eingabe`, `feld: 'textquelle'`). Leerzeichen bleiben Text (kein Trimmen).
- **D-71.5** `NachtragsangabenSetzen`: was landet im Kopf? **Genau `auftragsLvId`, `nummer`, `status`** (weitere Felder fallen
  weg, wie D-42 am Kopf des Auftrags-LV). Form: `auftragsLvId` ein Text (nicht geprüft, anderes Aggregat), `nummer` mit
  mindestens einem Zeichen außer Leerraum (`trim`), `status` aus der Liste; Fehlerfeld `nachtrag.<feld>`.
- **D-71.6** `NachtragUebernehmen`: Codes für die Form des Teilbaums. **Mehr als eine Wurzel, Wurzel nicht am Ende der
  obersten Ebene (`reihenfolge`), Wurzel unter einem vorhandenen Knoten, Eltern hinter Kind, Lücken: `ungueltige-eingabe`;
  Wurzel unter unbekanntem Elternknoten: `eltern-unbekannt`; Wurzel keine Gliederung, F1 (Los neben Titeln, Titel unter
  Los-Stufe): `knotenart-unzulaessig`; zu tief: `ebene-ueberschritten`; Kennung im Auftrags-LV schon vorhanden:
  `id-vergeben`.** Grund: Lesart am Vertragstyp; dieselbe Prüfung wie `KnotenEinfuegen` (`listeFehler`, verallgemeinert).
  Die OZ wird nicht gegen die Maske geprüft (U5); ein negatives Netto kommt als Hinweis mit (wie beim LV).
- **D-71.7** Anwenden/Umkehren des Auftrags-LV: eigene Funktion oder geteilte Hilfsfunktion? **Geteilt** über
  `BaumChangeSet = Pick<LvChangeSet, 'knoten' | 'summen'>`; `summenAenderung` liest strukturell `SummenZustand` (Summen,
  Knoten, Nachlass, MwSt), das Auftrags-LV gibt sein Aggregat ohne Kennungsumdeutung hinein. Die Signatur von
  `pruefeLvInvarianten` bleibt (eine Lockerung auf `id: string` machte eine Zusicherung in `speicher` überflüssig und damit
  den Lint dort rot; `speicher` ist nicht mein Paket). Das Auftrags-LV prüfen die Tests mit `baumfehler(wurzelId, knoten)`
  (exportiert, nimmt jede Wurzelkennung).

### Prüfung

Nach `git merge integration/welle-5` (Stand `ecc98ac`): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck
&& pnpm test` grün (Vitest 162 Dateien bestanden, 1 übersprungen; 2248 Tests bestanden, 2 übersprungen; Fixtures 29/29).
Ein erster Lauf fiel nur im Lint von `speicher` (`summenmigration.ts`: Zusicherung überflüssig, weil ich
`pruefeLvInvarianten` gelockert hatte) – zurückgenommen, siehe D-71.7. Unter Parallellast (Last 11,8 auf 4 Kernen) fielen in
einem Lauf nur des Pakets `kern` einmal `eigenschaften.test.ts` (Zeitlimit, 5.443 ms) und das Budget in `k9-leistung.test.ts`;
beide allein und in der vollen Suite danach grün, kein Budget gelockert.

## Answer

Merged: c17de09 in integration/welle-5


Branch `welle-5/71-kern-v1.4` (enthält `integration/welle-5` bis `ecc98ac`). Öffentliche API von `@tethys/kern`:

- `auftragsLvBefehlAusfuehren` führt jetzt alle drei AuftragsLvBefehle aus (Anlegen nur mit `AuftragsLvKopf`-Feldern im Kopf,
  `NachtragUebernehmen`, `KostengruppeSetzen`); `auftragsLvChangeSetAnwenden`, `auftragsLvChangeSetUmkehren` (neu, ersetzen
  den Umweg D-64.4 in der App, Ticket 86).
- `lvBefehlAusfuehren` kennt `KostengruppeSetzen`, `TextquelleSetzen`, `NachtragsangabenSetzen`, `VorlageSetzen`;
  `ZUSTAENDIGES_TICKET` ist leer. Anlege-, Einfüge- und Kopierwege tragen `kostengruppe`/`textquelle` (Form geprüft, `''` weg).
- Neu exportiert: `KOSTENGRUPPE_FORM`, `kostengruppeFehler` (Form `100`–`999`, ohne Import aus `kosten`); das Auftrags-LV
  prüft `baumfehler(wurzelId, knoten)`.

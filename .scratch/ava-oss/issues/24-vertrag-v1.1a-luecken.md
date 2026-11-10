# 24: `vertrag` v1.1a „Lücken“ (**Mensch prüft vor Merge**)

Status: ready-for-agent
Type: task
Welle: 2 · Strang: F · Paket: `packages/vertrag`
Blocked by: -
Regeln: A2, A4, A5, A6, A7, L1, L2, N1, N3, P2, P9
Herkunft: E-02 (neun Lücken), E-06, E-09 (`next-decisions.md`)

## What to build

Der Vertrag bekommt die neun Lücken geschlossen, die Welle 1 gemeldet hat, dazu zwei Fehlercodes. **Nur Typen,
Konstanten und Kommentare**; keine Logik. Das Inhaltsmodell (Zuschlagsposition, Merkmale, Langtext, Kopfdaten)
ist **nicht** Teil dieses Tickets, sondern von Ticket 26 (v1.1b).

Vor dem Entwurf lesen: „Offene Typfragen“ in Ticket 02 und die `## Comments` der Tickets 05, 06, 07, 10, 21, 22
(dort steht je Lücke, was das meldende Paket braucht und wie es sich heute behilft).

1. **Summen umkehrbar.** `Summenaenderung` trägt alte und neue Werte und nennt die Summen entfernter Knoten, so dass
   sich ein `LvChangeSet` ohne Vorzustand umkehren lässt (heute `changeSetUmkehren(cs, zustandVorher)` im Kern).
2. **LV-Anlegen umkehrbar.** `LvChangeSetAnwenden` kann `null` liefern (das Aggregat verschwindet).
3. **Speicher.** `Speicherfehlercode` bekommt `konflikt` und `existiert-bereits`; `Speicher` bekommt `schliessen()`.
4. **Löschen.** Ein Weg, Projekt, LV und Angebot zu löschen: Befehle und die Darstellung im ChangeSet. Löschen ist
   unumkehrbar im Sinne von Q5; der Vertrag muss tragen, was Undo oder LV-Stand zum Wiederherstellen brauchen.
5. **Auftrags-LV.** Befehl(e) und ChangeSet für das Auftrags-LV, nur soweit, dass es als Aggregat angelegt und
   gespeichert werden kann (`AggregatBezug` kennt es schon). Der Zuschlag selbst ist Welle 4.
6. **Wurzel-ID.** `LvInhalt` und `LvAnsicht` kennen die Wurzel-ID; `gaeb` und `ui-grid` reichen sie heute getrennt durch.
7. **Grid-Ränder.** Die Zahlen-Randfunktionen des Grids (heute `GridZahlen` in `ui-grid`) und die ID-Quelle für das
   Einfügen stehen als Schnittstellen im Vertrag (`gaeb` nennt schon eine `IdQuelle`; es gibt danach genau eine).
8. **Codes.** `GaebVersion` kennt `3.1`. `Befehlsfehlercode` kennt „OZ doppelt“ und „Überlauf der Ordnungszahl“.
9. **OZ.** `OzMaske` hat ein Feld für die Los-Stufe (F1: das Los ist die oberste Stufe und zählt zu den 5).
   `GliederungAnlegen` hat ein OZ-Feld.
10. **Hinweise und Befunde aus Befehlen.** Ein angenommener Befehl kann Hinweise mitliefern (F2: bei Überlauf weicht
    die Vergabe auf Schritt 5, 2, 1 aus „und zeigt einen Hinweis“; N5: negatives Netto nach Nachlass ist „ein Befund,
    keine Sperre“). Der Vertrag braucht dafür einen Ort im Ergebnis eines Befehls und einen stabilen Code für
    „Netto nach Nachlass negativ“. Kein Fehlercode, der den Befehl abweist.

## Grenzen

- **Additiv, wo es geht.** Der ganze Baum bleibt grün (`pnpm lint`, `pnpm typecheck`, `pnpm test`). Wo eine Änderung
  ein anderes Paket am Übersetzen hindert (neues Pflichtfeld, erschöpfende `switch`), ist in diesem Ticket
  **ausnahmsweise** die kleinste rein mechanische Anpassung in diesem Paket erlaubt: kein neues Verhalten, keine
  neue Regel, jede Stelle mit `// v1.1a: mechanisch angepasst, Folgeticket` markiert und unter `## Comments`
  aufgelistet. Alles darüber hinaus gehört in die Folgetickets (Anpassung `kern`, `speicher`, `gaeb`, `ui-grid`).
- Neue Fachbegriffe zuerst ins `GLOSSARY.md` (L2). Bezeichner ASCII-transliteriert wie bisher.
- Keine Preisspiegel-Typen (E-20: erst nach M1).
- Was sich aus den Tickets nicht entscheiden lässt, wird nicht geraten: als „Offene Typfrage“ in die Comments, mit
  der engen, leicht umkehrbaren Lesart im Typ.

## Acceptance criteria

- [x] Jede der zehn Nummern oben ist im Vertrag abgebildet; die Comments nennen je Nummer Datei und Typ
- [x] `beispiele.ts` und `vertrag.test.ts` zeigen je Nummer ein Beispiel (Typtest oder Beispielwert); `fixtures-abbildung.test.ts` bleibt grün
- [x] Ein Typtest belegt: Aus einem `LvChangeSet` allein (ohne Zustand) sind alle Angaben für die Umkehrung ablesbar, auch für Summen und entfernte Knoten
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün auf dem ganzen Baum
- [x] Liste aller mechanischen Anpassungen außerhalb von `vertrag` in den Comments (Datei, Zeile, was)
- [x] Je Folgepaket (`kern`, `speicher`, `gaeb`, `ui-grid`) eine kurze Liste in den Comments: was dort jetzt anzupassen ist
- [x] `GLOSSARY.md` enthält jeden neuen Fachbegriff

## Nicht-Ziele

Inhaltsmodell (Ticket 26), Logik in `kern`/`speicher`/`gaeb`/`ui-grid`, Preisspiegel-Typen, Undo-Umsetzung (S3).

## Comments

### Ergebnis (Branch `worktree-agent-ab417bf3261e59f89`, Basis `4396721` + Fast-Forward auf `claude/lucid-archimedes-b1uwhj`)

Nur Typen, Konstanten und Kommentare in `packages/vertrag/src/`; keine Logik. `pnpm lint`, `pnpm typecheck`, `pnpm test` grün auf dem ganzen Baum (32 Testdateien, 731 Tests bestanden, 1 übersprungen). `pnpm e2e` nicht gelaufen (nicht verlangt). Leitlinie der Formen: **neue Pflichtfelder nur dort, wo der Punkt selbst das Feld verlangt** (`LvInhalt.wurzelId`, `LvAnsicht.wurzelId`); sonst **optional mit natürlicher Leerbedeutung** (fehlt = keine), damit `kern`, `speicher`, `gaeb`, `ui-grid` und ihre Tests ohne Änderung übersetzen und kein Paket ein ChangeSet mit erfundenen leeren Werten erzeugen muss.

### Prüfleitfaden je Punkt (Datei, Typ, warum diese Form)

1. **Summen umkehrbar.** `summen.ts`: `Summenvorher` (neu) und `Summenaenderung.vorher?`. Eine Struktur statt vier Einzelfelder, damit „alles oder nichts“ gilt: `positionen`/`gliederungen` (alte Werte der genannten Einträge; ohne Gegenstück = neu), `gesamt` (alter Wert; auch beim Löschen des Aggregats gesetzt), `entfernt` (volle Summen entfernter Knoten). Optional, weil kern/speicher sonst nicht übersetzen und alle `toEqual({positionen: [], …})` des Kerns brächen.
2. **LV-Anlegen umkehrbar.** `changeset.ts`: `LvChangeSetAnwenden` liefert `LvZustand | null`; `null` genau dann, wenn `kopf.nachher` `null` ist. Anlegen (`kopf.vorher: null`) und Löschen (`kopf.nachher: null`) sind Gegenstücke.
3. **Speicher.** `speicher.ts`: `Speicherfehlercode` + `'konflikt' | 'existiert-bereits'`; `Speicher.schliessen(): Promise<Ergebnis<void, Speicherfehler>>` (gleiche Signatur wie `GeoeffneterSpeicher` in `speicher`, daher ohne Änderung dort).
4. **Löschen.** `befehle.ts`: `ProjektLoeschen`, `LeistungsverzeichnisLoeschen`, `AngebotLoeschen` (ohne Felder, wie `NachlassEntfernen`; das Aggregat ergibt sich aus dem Zustand). `changeset.ts`: Darstellung als `nachher: null` (`Aenderung`), der volle Stand steht in `vorher`, `knoten.entfernt`/`positionen.entfernt` und `summen.vorher.entfernt`. Löschen ist **ein Aggregat je Befehl**; abhängige Aggregate hängen nicht im selben ChangeSet, `speicher` weist mit `konflikt` ab, solange sie bestehen. Wiederherstellung (Undo oder LV-Stand) ist S3; der Vertrag trägt nur die Daten (der Typtest `umkehren` in `vertrag.test.ts` liest aus dem ChangeSet allein das Anlegen zurück).
5. **Auftrags-LV.** `befehle.ts`: `AuftragsLeistungsverzeichnisAnlegen { auftragsLeistungsverzeichnis }` (ganzes Aggregat wie `AngebotAnlegen`), `AuftragsLvBefehl`, `Befehl` erweitert. `changeset.ts`: `AuftragsLvChangeSet` (gleich gebaut wie `LvChangeSet`, `art: 'auftrags-leistungsverzeichnis'`, passend zu `AggregatBezug`), `ChangeSet` erweitert, `AuftragsLvBefehlAusfuehren`; `AuftragsLvZustand` von `speicher.ts` nach `changeset.ts` verschoben (gleicher Name, weiter über `index.ts` exportiert).
6. **Wurzel-ID.** `marken.ts`: `WurzelId = LeistungsverzeichnisId | AuftragsLeistungsverzeichnisId`, `ElternId = WurzelId | GliederungId` (derselbe Typ wie vorher). `modell.ts`: `LvInhalt.wurzelId` (Pflicht). `ansicht.ts`: `LvAnsicht.wurzelId` (Pflicht). `LeistungsverzeichnisAnlegen.id` und `inhalt.wurzelId` sind dieselbe Kennung; die Prüfung liegt beim Kern.
7. **Grid-Ränder.** `ansicht.ts`: `GridZahlen` (Name und Form wie in `ui-grid`, daher dort ohne Änderung kompatibel) und `GridIdQuelle = Pick<IdQuelle, 'position'>`. Die eine `IdQuelle` bleibt in `marken.ts` (`gaeb` importiert sie schon von dort); es gibt keine zweite.
8. **Codes.** `gaeb.ts`: `GaebVersion` + `'3.1'` (nur erkennbar, kein Export-Ziel). `changeset.ts`: `Befehlsfehlercode` + `'oz-doppelt'`, `'oz-ueberlauf'`. **`oz-ueberlauf` gilt nur, wenn auch Schritt 1 überläuft;** das Ausweichen auf Schritt 5, 2, 1 ist ein Hinweis (Punkt 10), kein Fehler; im Typkommentar festgehalten.
9. **OZ.** `modell.ts`: `OzMaske.losStufe?: boolean` (`true`: `gliederung[0]` ist die Los-Stufe und zählt zu den 5; fehlt = `false`). `befehle.ts`: `GliederungAnlegen.ordnungszahl?: Ordnungszahl | null`.
10. **Hinweise.** `changeset.ts`: `Befehlshinweiscode` (`'oz-schritt-ausgewichen' | 'netto-nach-nachlass-negativ'`), `Befehlshinweis { code, meldung, knotenId?, feld? }`, `hinweise?: readonly Befehlshinweis[]` an `ProjektChangeSet`, `LvChangeSet`, `AngebotChangeSet`, `AuftragsLvChangeSet`. **Abweichung vom Wortlaut von E-02:** E-02 spricht von einem „Befehlsfehlercode für negatives Netto nach Nachlass“. Ich habe bewusst einen Hinweis-/Befundcode gewählt, weil E-06 und N5 es als „Befund, keine Sperre“ festlegen und ein Fehlercode den Befehl abwiese. Derselbe Code ist als `Pruefbefund.code` der LV-Prüfung (K8) vorgesehen.
11. **Fixture-Maske (nachträglich ergänzt).** `fixtures-abbildung.test.ts`: Die 15-stellige Maske (`NN.NN.NN.NN.NN.NNNN[I]`) ist ersetzt durch `fixtureMaske(fx)`, aus den Ordnungszahlen der Fixture abgeleitet (je Stufe 2 Ziffern, Position 4 Ziffern, Index nur, wenn die Fixture einen verwendet). Gewählt: `gross` 5 × 2 + 4 = **14 Stellen ohne Index** (kein Index in `gross`); `typisch` 1 × 2 + 4 + Index 1 = 7; `winzig` 1 × 2 + 4 = 6. Alle vorhandenen OZ-Werte passen hinein; ein neuer Test prüft höchstens 14 Stellen und dass jede OZ passt. Die Maskentexte in `fixtures/*.json` und `fixtures/README.md` habe ich nicht angefasst (außerhalb des Schreibbereichs, E-19).

### Offene Typfragen (die enge Lesart steht im Typ; die Alternative ist hier festgehalten)

- **A. `Summenaenderung.vorher` optional.** Alternative: Pflichtfeld; dann müssten alle ChangeSet-Erzeuger (kern, Tests in kern/speicher, rund 35 Stellen) im selben Ticket mit. Vorschlag: Pflicht in einem späteren Vertragsstand, sobald der Kern es füllt.
- **B. Hinweise am ChangeSet statt Antworthülle.** Alternative: `Befehlsergebnis<C> = { changeSet, hinweise }` als Rückgabe aller `*BefehlAusfuehren`; sauberer (ein Hinweis ist keine Änderung), bricht aber jede Signatur und jeden Handler im Kern. `hinweise` ist optional.
- **C. Löschen ohne Kaskade.** Alternative: ein Projekt-ChangeSet mit allen abhängigen Aggregaten, atomares Undo des ganzen Projekts. Gewählt ist die Kette einzelner Löschbefehle, jede einzeln umkehrbar.
- **D. Kein `AuftragsLeistungsverzeichnisLoeschen`, kein Lesezugriff.** Ein LV mit Auftrags-LV lässt sich damit bis Welle 4 nicht löschen (`konflikt`). Das Auftrags-LV hat kein `AuftragsLvRepository` in `Speicher` (das hätte `speicher` zu neuem Verhalten gezwungen); Lesen bleibt über die Projektdatei.
- **E. `AuftragsLeistungsverzeichnisAnlegen` trägt das ganze Aggregat** (wie `AngebotAnlegen`). Alternative: Ids + `LvInhalt` wie `LeistungsverzeichnisAnlegen`. Die Frage der Massenbefehle im Protokoll (E-13) gehört in Ticket 26.
- **F. Los-Stufe als `losStufe?: boolean`.** Alternative: eigene Stelle `los: OzStelle | null` vor `gliederung` (verschiebt die Zählung der Stufen). Gewählt, weil `gliederung[0]` im Kern und in `gaeb` schon so gelesen wird.
- **G. `GliederungAnlegen.ordnungszahl` optional mit `| null`** (zwei Arten von „keine“). Alternative: Pflichtfeld.
- **H. `LvInhalt.wurzelId` neben `LeistungsverzeichnisAnlegen.id`:** dieselbe Kennung zweimal. Alternative: `id` aus dem Befehl streichen; hier nicht, weil es den Befehl bricht.
- **I. `GaebExport.version` darf nun `3.1` sein**, obwohl 3.1 kein Export-Ziel ist; nur im Kommentar festgehalten. Alternative: `GaebExportVersion = Exclude<GaebVersion, '3.1'>`.

### Mechanische Anpassungen außerhalb von `vertrag` (jede mit `// v1.1a: mechanisch angepasst, Folgeticket` markiert)

| Datei | Was |
|---|---|
| `packages/speicher/src/dekoder.ts` (Tabelle `BEFEHLSARTEN`) | vier neue Befehlsnamen eingetragen (der Typ erzwingt Vollständigkeit) |
| `packages/speicher/src/kern.ts` (`pruefeBezug`, `anwenden`) | Zweig für `auftrags-leistungsverzeichnis`; `anwenden` weist es mit `unbekannt` ab, wie vorher (nie still verworfen, Q5) |
| `packages/speicher/src/testhilfe/fixtures.ts` | `wurzelId: kopf.id` im `LvInhalt` |
| `packages/kern/src/changeset.ts` (`lvChangeSetAnwenden`) | `satisfies LvChangeSetAnwenden` statt Annotation, damit kein Aufrufer `null` behandeln muss; Verhalten unverändert |
| `packages/kern/src/ausfuehren.ts` (`ZUSTAENDIGES_TICKET`) | Eintrag für `LeistungsverzeichnisLoeschen` |
| `packages/kern/src/testhilfen.ts` (2 Stellen), `packages/kern/src/summen-eigenschaften.test.ts` (1) | `wurzelId` im `LvInhalt` |
| `packages/gaeb/src/lesen.ts` (Rückgabe des Inhalts) | `wurzelId` im `inhalt`; Prettier hat die Zeile umbrochen (Konfliktgefahr mit der MwSt-Änderung im selben Ausdruck, leicht aufzulösen) |
| `packages/ui-grid/e2e/harness/fixture-ansicht.ts` | `wurzelId` in der gebauten `LvAnsicht`, Import `WurzelId` |

### Folgetickets: was je Paket anzupassen ist

- **kern:** `changeSetUmkehren` ohne `zustandVorher` (aus `summen.vorher`); alle ChangeSets mit `summen.vorher` füllen; `lvChangeSetAnwenden` liefert `null` bei `kopf.nachher: null`, Annotation wiederherstellen; Handler für `LeistungsverzeichnisLoeschen`, Auftrags-LV, `GliederungAnlegen.ordnungszahl`; `oz-doppelt`/`oz-ueberlauf` statt `oz-ungueltig`/`maske-ungueltig`; Ausweichen auf Schritt 5, 2, 1 mit `oz-schritt-ausgewichen`; `netto-nach-nachlass-negativ` als Hinweis und in K8; `losStufe` auswerten; `id === inhalt.wurzelId` prüfen.
- **speicher:** `konflikt`/`existiert-bereits` statt `unbekannt` mit Meldung; Löschen (`nachher: null`) und Auftrags-LV-ChangeSets schreiben; Löschen mit abhängigen Aggregaten abweisen (`konflikt`); Lesezugriff Auftrags-LV (Typfrage D).
- **gaeb:** `wurzelId` nur noch aus `LvInhalt`, `GaebLesungErgebnis.wurzelId` entfällt; 3.1 über `GaebVersion` melden; `losStufe` in der Maske; Überlauf-Codes.
- **ui-grid:** `GridZahlen` und `GridIdQuelle` aus dem Vertrag importieren, eigene Typen löschen; `wurzelId` aus `LvAnsicht` statt Eigenschaft `wurzelId`; Hinweise anzeigen.
- **Protokoll (Ticket 26, S3):** Massenbefehle im Protokoll; Löschen bestätigen und per Undo/LV-Stand zurückholen.

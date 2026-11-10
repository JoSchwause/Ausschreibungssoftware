# 31: Anpassung `speicher` an v1.1a/v1.1b (`konflikt`, Löschen, Auftrags-LV, `schliessen`, Langtext-Sperre aufheben)

Status: claimed
Type: task
Welle: 3 (Phase A) · Strang: S · Paket: `packages/speicher`
Blocked by: -
Regeln: A5, A8, Q5, U7, C4, ADR 0002, ADR 0009, ADR 0011
Herkunft: Ticket 24, Comments „Folgetickets: speicher“; Ticket 26, Comments „Folgetickets: speicher“ und „Nicht rein mechanisch“ Nr. 2 sowie „Nachtrag Review“ (speicher, Q5 (b)); Abschnitt C (`next-decisions-welle-2.md`)

## What to build

`speicher` setzt um, was v1.1a verlangt, und hebt die Langtext-Sperre aus v1.1b auf. **Keine neue Schemaversion**:
Die Migration auf Schema 2 (Merkmale, Zuschlag, Leitbeschreibung, Kopfdaten, Summenfelder) ist Ticket 38. Alles hier
geht mit den Tabellen von Schema 1 (`migrationen.ts`; `auftrags_lv` und `knoten` mit `aggregat_id` gibt es schon).

1. **Fehlercodes (v1.1a, Punkt 3).** `konflikt` statt `unbekannt`, wo ein ChangeSet nicht zum gespeicherten Stand
   passt (`konflikt` in `schreiben.ts`) und wo abhängige Aggregate ein Löschen verhindern (Punkt 2).
   `existiert-bereits` statt `unbekannt` beim Import einer Projektdatei, deren Projekt schon da ist
   (`projektdateiImportieren` in `kern.ts`). Programmfehler (Protokolleintrag und ChangeSet betreffen verschiedene
   Aggregate, Kennungen weichen ab) bleiben `unbekannt`. Die Comments listen jede Stelle mit altem und neuem Code.
2. **Löschen (v1.1a, Punkt 4).** `anwenden` nimmt ChangeSets mit `nachher: null` an (`wendeProjektAn`, `wendeLvAn`,
   `wendeAngebotAn`; heute „im Vertrag nicht vorgesehen“):
   - `vorher` muss dem gespeicherten Stand entsprechen, sonst `konflikt`.
   - Abhängige Aggregate verhindern das Löschen mit `konflikt` (kein Kaskadieren, Offene Typfrage C in Ticket 24):
     am LV Angebote und Auftrags-LV; am Angebot ein Auftrags-LV, das darauf verweist; am Projekt LVs, Angebote,
     Auftrags-LV. Bieter gehören zum Projekt und gehen mit ihm.
   - Gelöscht werden alle Zeilen des Aggregats (Kopf, `knoten`, `angebotsposition`, Summentabellen) in derselben
     Transaktion wie der Protokolleintrag.
   - **Projekt und Protokoll.** `protokoll.projekt_id` verweist auf `projekt`. Vorschlag (vorläufige Annahme, im Lauf
     entscheiden und protokollieren): Beim Löschen des Projekts gehen sein Protokoll und seine Bieter mit; der
     Eintrag des Löschbefehls selbst wird nicht geschrieben, weil es kein Projekt mehr gibt, dem er gehört. Das ist
     die einzige Ausnahme von „ein Eintrag je Befehl“ und steht im Kommentar an `wendeProjektAn`. Alternative: Schema 2
     (Ticket 38) löst den Fremdschlüssel, dann bleibt das Protokoll.
3. **Auftrags-LV schreiben (v1.1a, Punkt 5).** `anwenden` schreibt `AuftragsLvChangeSet` (Anlegen mit Knoten und
   Summen, Änderungen wie beim LV). Gleicher Weg wie `wendeLvAn`, Aggregat `auftrags_lv`; geprüft wird, dass
   `leistungsverzeichnisId` und `angebotId` existieren und zum Projekt gehören. Löschen eines Auftrags-LV gibt es im
   Vertrag nicht (Offene Typfrage D): `nachher: null` → `unbekannt`. Die Marker in `kern.ts` (`pruefeBezug`, `anwenden`)
   und `dekoder.ts` (Löschen und Auftrags-LV) entfallen.
4. **`schliessen` (v1.1a, Punkt 3).** `GeoeffneterSpeicher` (`client.ts`) deklariert `schliessen` doppelt: weg, der
   Vertrag hat es. Jeder Aufruf nach `schliessen` liefert einen Fehlerwert (Vorschlag `gesperrt`), nie eine Ausnahme;
   ein zweites `schliessen` ebenso. Test über `direktTransport` und den Worker-Weg, soweit ohne Browser testbar.
5. **Langtext-Sperre aufheben (v1.1b, Nachtrag Review Q5 (b)).** `pruefeLangtext` in `zeilen.ts` entfällt: Position und
   Hinweistext nehmen jeden `Langtext` des Vertrags an (Auszeichnung, Zeilenumbruch, Absatz, Liste, Tabelle,
   Textergänzung; Bild wie bisher). Die Datenbank legt ihn schon als JSON ab. Der Projektdatei-Dekoder (`dekoder.ts`)
   liest dieselben Bausteine **streng**: unbekannte `art`, fehlende oder fremde Felder, `fett: false` statt
   fehlend, `spalten` < 1, Textergänzung in Absatz/Listenpunkt/Zelle → `datei-ungueltig` mit Pfad. Der Export schreibt
   sie kanonisch (byte-stabil). Die eingefrorene Datei der Version 1 und ihr Byte-Vergleich bleiben unverändert.
   Hinweis für die Comments: Eine Datei der Schemaversion 1 kann ab jetzt Langtext-Bausteine enthalten, die ein
   älterer Stand der App nicht liest (rückwärts lesen bleibt garantiert, vorwärts nicht, A8).
6. **Testhelfer und Marker.** In `testhilfe/fixtures.ts`: `fixtureMerkmale` ist eine dauerhafte Abbildung des
   Fixture-Formats (die Fixtures behalten `positionsart`): Kommentar neu formulieren, Marker weg; `eintrag(…)` und
   `wurzelId`: Marker weg. In `dekoder.ts`: `PositionsmerkmaleSetzen` in `BEFEHLSARTEN` ist dauerhaft: Marker weg.

**Bleibt für Ticket 38 (S2, Schema 2), nicht anfassen:** `projektdateiInAlterForm` (`projektdatei.ts`, Aufruf in
`kern.ts`), `altSpalten`/`neuAusAltSpalten` (`zeilen.ts`), `pruefeKopfdaten`, `pruefeSummenfelder` (`zeilen.ts`,
Aufrufe in `schreiben.ts`), die Alt-Leseseite der Positionen in `dekoder.ts` (Marker bei Zeile ~205 und ~268),
Spalten oder JSON für Merkmale, Zuschlag, Leitbeschreibung, Kopfdaten, Summenfelder und `zuschlagssatz` (v1.2),
`Befehlskurzfassung` im Protokoll (Dekoder, Prüfsumme über `crypto.subtle`, Massenbefehle verkürzt schreiben).
**Bleibt für Ticket 43 (S3):** `papierkorb` und `lvStand` (v1.2), Undo/Redo, LV-Stände.

## Grenzen

- Ein Schreiber: nur `packages/speicher`. Ticket 29 fügt dort wenige markierte Zeilen ein (`dekoder.ts`, `schreiben.ts`);
  beim Zusammenführen übernehmen, nicht entfernen.
- Kein stiller Datenverlust (Q5): Was nicht abgelegt werden kann, wird mit einem Fehlerwert abgewiesen.
- Keine Migration, keine neue Schemaversion (das ist Ticket 38).
- `okf/research/` wird nicht gelesen (C3). Offene Punkte entscheidet der Umsetzer und protokolliert sie in
  `.scratch/ava-oss/entscheidungen-auto.md` (Demo-Modus).
- TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün, dazu
  `pnpm --filter @tethys/speicher e2e`, wenn die Umgebung einen Browser hat (Browserpfad: Ticket 26, Comments).
  Umfang: 3–4 h; wird es eng, zuerst Punkt 3 (Auftrags-LV) abgeben.

## Acceptance criteria

- [ ] Je ein Test für `konflikt` (abweichendes `vorher`; Löschen mit abhängigem Aggregat) und `existiert-bereits` (doppelter Import)
- [ ] LV löschen: danach `laden` → `nicht-gefunden`, keine Zeile des LV in `knoten` und den Summentabellen; Protokolleintrag geschrieben; Umkehr-ChangeSet (Anlegen) stellt es wieder her: `leistungsverzeichnisse.laden` liefert denselben `LvZustand` wie vor dem Löschen
- [ ] Angebot löschen und Projekt löschen ebenso getestet; Projekt mit LV → `konflikt`
- [ ] Auftrags-LV anlegen, lesen über die Projektdatei, Export → Import → Export byte-gleich
- [ ] Nach `schliessen` liefert jeder Aufruf einen Fehlerwert, keine Ausnahme
- [ ] Position und Hinweistext mit Langtext aus Absatz mit Auszeichnung, Liste, Tabelle (mit `spalten: 2`) und Textergänzung: speichern, laden, Export, Import ergeben denselben Wert
- [ ] Dekoder weist einen veränderten Langtext (unbekannte Art; `fett: false`; Textergänzung in einer Zelle) mit `datei-ungueltig` und Pfad ab
- [ ] Eingefrorene Projektdatei Version 1: Byte-Vergleich unverändert grün
- [ ] Kein `// v1.1a: mechanisch angepasst`-Marker mehr in `packages/speicher`; die verbleibenden `v1.1b`-Marker sind genau die oben Ticket 38 zugewiesenen
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

Schema 2 und alles, was oben Ticket 38 zugewiesen ist (auch die Protokoll-Kurzfassung). Undo, LV-Stände, Papierkorb (Ticket 43).
Lesezugriff auf Auftrags-LV über ein eigenes Repository (Vertrag hat keins, Offene Typfrage D). Projektliste (Ticket 38).

## Comments

# 94: Aufmaßblatt mit 5.000 Zeilen: Einzeländerung und Undo unter 100 ms

Status: done-by-agent
Type: task
Welle: 6 · Strang: S, A2 · Paket: `packages/speicher` (Ausnahme von P2: die Messung in `apps/web/src/abrechnung/leistung.test.ts`
darf nachgezogen werden, dort schreibt in Stufe 1 niemand)
Blocked by: –
Modell: opus
Regeln: Q4, A6, D-29, D-36 (8), D-45, D-47
Herkunft: Wellen-Review 5, P4; Messung in Ticket 87 (D-45): Undo 82–144 ms je Schritt, ein Befehl 84–93 ms, fast alles im
Speicherkern (ganzes Blatt ≈ 1 MiB JSON lesen, mit `vorher` vergleichen, neu schreiben)

## What to build

Zuerst die kleine Lösung: `speicher` vergleicht `vorher` über den gespeicherten kanonischen Text (Hash) statt über das
geparste Blatt und schreibt nur bei Änderung. Reicht das nicht für < 100 ms im dauerhaften Profil (D-29), dann `vertrag` v1.5:
`AufmassChangeSet` mit `Aenderungen<Aufmassposition>` statt ganzem Blatt (eigenes Vertragsticket, Mensch prüft, P9).

Vorgehen:

1. **Messen, bevor du änderst.** Lies `issues/87-web-aufmass-sollist.md` (Abschnitt „Messung D-45“) und
   `apps/web/src/abrechnung/leistung.test.ts`. Baue in `speicher` einen eigenen Budgettest (Node, In-Memory-SQLite wie die
   übrigen Tests des Pakets) für ein Aufmaßblatt mit 5.000 Zeilen am Auftrags-LV aus `fixtures/gross.json`: ein
   `AufmasspositionSetzen` anwenden, dann dessen Umkehrung (Undo) und erneut (Redo); Median über mindestens 5 Läufe. Halte
   die Ausgangswerte im Ticket fest.
2. **Kleine Lösung.** Wo heute `vorher` des ChangeSets gegen das gespeicherte Blatt geparst und verglichen wird, den
   gespeicherten kanonischen Text (oder einen Hash davon, mitgespeichert) gegen die kanonische Form von `vorher` vergleichen;
   geschrieben wird nur, was sich ändert. Prüfe, wo sonst noch das ganze Blatt gelesen, geparst oder serialisiert wird
   (Konfliktprüfungen der Rechnung, Protokolleintrag, Worker-Grenze) und ob das nötig ist. Die Konfliktregeln aus
   `vertrag` (`Speicher.anwenden`: Freigabe-Invariante, Blatt in einer Rechnung, Nummern) bleiben unverändert und getestet.
3. **Bewerten.** Budget: Einzeländerung und Undo je < 100 ms (Median) im Speicherkern unter Node bei 5.000 Zeilen, und die
   App-Messung (`leistung.test.ts`) nachziehen. Reicht es: fertig. Reicht es nicht: **nicht** selbst `vertrag` ändern,
   sondern mit Messwerten an den Orchestrator melden (Stufe 3), der dann über `Aenderungen<Aufmassposition>` in v1.5
   entscheidet.

## Grenzen

- Keine Änderung an `vertrag`, `kern`, `abrechnung` oder anderen Ordnern der App außer der Messdatei oben.
- Kein Budget lockern, kein Test überspringen. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Messung vor/nach im Ticket; Budgettest für 5.000 Zeilen in `speicher` (Q4), Konfliktregeln unverändert grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

- **D-94.1 Messort und Naht.** Frage: Wo und woran misst der Budgettest? Entscheidung:
  `packages/speicher/src/aufmass-leistung.test.ts` an der öffentlichen Naht `SpeicherKern.anwenden` (In-Memory-SQLite unter
  Node wie die übrigen Tests des Pakets). Die ChangeSets baut der Test so, wie der Ausführer in `abrechnung` sie liefert
  (ganzes Blatt vorher und nachher, ungeänderte Zeilen als dieselben Objekte), Undo als Tausch (`testhilfe/umkehrung`), mit
  echten Protokolleinträgen `Rueckgaengig`/`Wiederholen`. Weil das Auftrags-LV per Fremdschlüssel auf ein Angebot verweist
  und `gross` keines hat, bekommt das Projekt einen Bieter und ein leeres Angebot. Grund: `speicher` darf `abrechnung` nicht
  importieren (A3); gemessen wird genau der Speicherkern. Reversible: yes.

### Messung vorher (Stand `a5491d1`, 4 Kerne, Last 0,2–0,7)

| | Budgettest `speicher` (3 Läufe, je 9 warm) | App `leistung.test.ts` (1 Lauf) |
|---|---|---|
| `AufmasspositionSetzen` (Median) | 63 / 65 / 70 ms | 67,8 ms, davon Speicher 67,4 ms |
| Rückgängig (Median) | 64 / 67 / 68 ms | 67,7 ms, davon Speicher 67,1 ms |
| Wiederholen (Median) | 65 / 65 / 69 ms | 63,4 ms |
| Anlegen (`AufmassAnlegen`) | 62–78 ms | 59 ms |

Phasen (Profil an 5.000 Zeilen, Blatt 1.060 KiB): die kanonische Form der Zeilen (`kanonischKompakt`) kostet 17–25 ms je
Aufruf, und `anwenden` bildet sie dreimal (gespeichertes Blatt nach `JSON.parse`, `vorher`, `nachher`). Text lesen 1 ms,
`JSON.parse` 3 ms, `UPDATE` 2 ms, Textvergleich 0,2 ms. Ein eigener Schreiber (Schlüsselreihenfolge je Objektform gemerkt) ist
kaum schneller (15 statt 17 ms): Es zählt die Zahl der Objekte (rund 15.000), nicht der Code.

- **D-94.2 Vergleich über den gespeicherten Text, ohne Hash-Spalte.** Frage: Text oder mitgespeicherter Hash? Entscheidung:
  `speicher` liest die Zeilen als gespeicherten kanonischen Text (`leseAufmassText`, nicht geparst) und vergleicht ihn mit der
  kanonischen Form der Zeilen von `vorher`; der Kopf wird wie bisher kanonisch verglichen. Kein Hash: Er müsste über dieselbe
  kanonische Form von `vorher` gebildet werden und spart nichts (Text lesen 1 ms, Vergleich 0,2 ms), und eine neue Spalte
  hieße Migration 6, die Ticket 106 gehört. Grund: kleinste Änderung, kein Schema. Reversible: yes.
- **D-94.3 Merkliste je Aufruf nach Objektidentität.** Frage: Wie vermeidet `nachher` die zweite Sortierung? Entscheidung:
  `kanonischeListe` (in `kanonisch.ts`) schreibt eine Liste Element für Element und merkt sich je Objekt seinen Text in einer
  `WeakMap`, die nur einen Aufruf von `wendeAufmassAn` lebt; die Zeilen, die `nachher` mit `vorher` teilt (so baut sie der
  Ausführer, und so lässt sie `postMessage` über die Worker-Grenze), werden nicht noch einmal sortiert. Keine Merkliste über
  Aufrufe hinweg: Im Browser bringt jede Nachricht neue Objekte, der Node-Test wäre sonst schneller als der Browser. Ist nichts
  geteilt (etwa ein ChangeSet aus JSON), ist das Ergebnis dasselbe, nur langsamer. Reversible: yes.
- **D-94.4 Gleichheit und Fehlercodes bleiben.** Frage: Ändert der Textvergleich, was als gleich gilt oder welcher Fehler kommt?
  Entscheidung: Nein. Kopf und Zeilen von `vorher` werden ganz in kanonische Form gebracht, bevor verglichen wird (ein Wert,
  der kein JSON ist, bleibt `unbekannt`); `vorher` ohne Zeilen ist `konflikt` wie bisher. Gleichheit von Kopf und Zeilentext ist
  dieselbe wie `gleich` über das ganze Blatt, weil der gespeicherte Text kanonisch ist (alle Schreibwege gehen über
  `kanonischKompakt`, auch der Import). Geschrieben wird nur, was sich ändert: Kopf (`bezeichnung`, `datum`) und Zeilen je
  eigenes `UPDATE`, beide nur bei Unterschied. Rechnung und Kostenermittlung prüfen unverändert über `gleich`
  (`GespeicherterStand`, `alsStand`). Abgesichert durch vier neue Fälle in `aufmass.test.ts` (Schlüsselreihenfolge und
  `undefined`, Zeilen wechseln die Stelle samt Undo/Redo, tiefe Abweichung und Kopf, Wert ohne JSON in `vorher`/`nachher`,
  nur Kopf/nur Zeilen/nichts), vor der Änderung grün und danach; dazu `kanonisch.test.ts`: `kanonischeListe` schreibt genau
  wie `kanonischKompakt`, auch mit einer Merkliste über zwei Listen, deren Elemente die Stelle wechseln (per Mutation
  geprüft: eine falsch geschriebene Lücke fällt auf). Reversible: yes.
- **D-94.5 Budgettest an der Worker-Grenze.** Frage: Misst der Test das, was der Worker bekommt? Entscheidung: Eintrag und
  ChangeSet werden vor jedem `anwenden` mit `structuredClone` geklont (außerhalb der Messung), und der Test prüft, dass die
  geteilten Zeilen danach geteilt sind. Grund: Die Merkliste lebt davon; ginge die Identität verloren, zeigte es der Test.
  Reversible: yes.
- **D-94.6 App-Messung als Budget.** Frage: Was heißt „nachziehen“ für `apps/web/src/abrechnung/leistung.test.ts`?
  Entscheidung: Die grobe Schranke (1 s, nur Rückgängig und Wiederholen) wird das Budget einer Einzeländerung: Median von
  Befehl, Rückgängig und Wiederholen je unter 100 ms am Befehlsweg (gesamt, mit Ausführer). Verschärft, nicht gelockert;
  Titel und Messausgabe bleiben (kleiner Diff). Reversible: yes.

### Wo sonst das ganze Blatt gelesen, geparst oder geschrieben wird

- **Konfliktprüfungen der Rechnung:** `pruefeRechnungsaufmasse` fragt nur Kopfspalten ab (`SELECT 1 … WHERE id = ? AND
  auftrags_lv_id = ?`), `pruefeAufmassLoeschen` und die Freigabe-Invariante lesen nur `rechnung.angaben`. Nötig und billig.
- **Auftrags-LV:** `pruefeEntfernteAufmasspositionen` liest alle Zeilen der Blätter per `json_each`, aber nur, wenn ein
  Auftrags-LV-ChangeSet Positionen entfernt (Q5), nie bei einem Befehl am Blatt.
- **Protokoll:** `AufmasspositionSetzen`, `AufmasspositionEntfernen`, `AufmasskopfSetzen`, `Rueckgaengig` und `Wiederholen`
  tragen kein Blatt; `pruefeHistorienbezug` liest nur den kleinen Eintrag des ursprünglichen Befehls. Nur `AufmassAnlegen`
  (Massenbefehl, E-13) bildet Kopf und SHA-256 über das ganze Blatt: nötig, Anlegen 59–81 ms.
- **Worker-Grenze:** Das ChangeSet trägt das Blatt zweimal (D-36 (8)); `postMessage` klont geteilte Zeilen nur einmal. Unter
  Node kostet `structuredClone` eines solchen ChangeSets etwa 9 ms (im Browser Hinweg, nicht im Budget von `speicher`). Die
  Antwort ist klein; die App lädt das Blatt nach einem Befehl nicht neu, sie wendet das ChangeSet selbst an.
- **Lesen:** `aufmassLaden` und der Export der Projektdatei parsen das Blatt (nötig).
- **Offen (nicht gemessen):** Im OPFS ist das Blatt eine Zeile mit rund 1 MiB Text; jede Änderung der Zeilen schreibt sie neu
  (rund 260 Seiten ins WAL; gleich große Sätze überschreibt SQLite nur seitenweise, wo sich Bytes ändern). Im dauerhaften
  Profil (D-29) gibt es dafür noch keine Messung; zählt es dort, wäre eine Tabelle je Zeile der nächste Schritt (Migration,
  zusammen mit v1.5 `Aenderungen<Aufmassposition>`).

### Messung nachher

| | Budgettest `speicher` (je 9 warm) | App `leistung.test.ts` |
|---|---|---|
| `AufmasspositionSetzen` (Median) | 24,7 / 26,6 / 27,4 ms (Last 1,5–2); 29,8 ms mit 3 rechnenden Prozessen | 26,5 / 27,8 / 28,9 ms, davon Speicher 26,1 / 27,4 / 28,6 ms |
| Rückgängig (Median) | 24,9 / 25,9 / 27,0 ms; 38,9 ms mit 3 rechnenden Prozessen | 27,0 / 30,2 / 26,9 ms, davon Speicher 26,4 / 30,0 / 26,7 ms |
| Wiederholen (Median) | 24,7 / 28,0 / 31,4 ms; 33,3 ms mit 3 rechnenden Prozessen | 27,3 / 27,1 / 25,9 ms |
| Anlegen (`AufmassAnlegen`) | 59–81 ms (unverändert) | 64–69 ms |
| Arbeitsspeicher je Undo-Schritt | – | 39–42 KiB (unverändert) |

Unter Last 6,8–7,3 (andere Agenten, beide Dateien zugleich, nach der vollen Suite): `speicher` 32,1 / 42,1 / 37,3 ms
(Setzen / Rückgängig / Wiederholen), App 26,5 / 31,5 / 26,9 ms. In der vollen Suite (Last bis 7,6) sind beide Budgettests grün.

Bleibender Anteil je Schritt: die kanonische Form der 5.000 Zeilen von `vorher` (rund 20 ms); `nachher` aus der Merkliste rund
1 ms, Text lesen 1 ms, `UPDATE` 2 ms. Nicht Teil dieses Tickets und unverändert: „Seite nachführen“ in der App (kumuliert
Soll/Ist 41–47 ms, Grid-Zeilen 9–10 ms je Schritt).

**Bewertung:** Budget gehalten, mit Abstand (Faktor 3–4 im Leerlauf, mehr als 2,5 unter Last): Einzeländerung, Undo und Redo je
unter 100 ms im Speicherkern und am Befehlsweg der App. Nach Schritt 3 ist damit kein `vertrag` v1.5
`Aenderungen<Aufmassposition>` nötig; die Entscheidung liegt beim Orchestrator (D-45). Hinweis für Ticket 106: Das Undo eines
`Bauzeitenplan`-ChangeSets (ganzes Aggregat, D-57) kann denselben Weg nehmen (`GespeicherterStand`, `kanonischeListe`).

### Prüfung

Nach dem Merge von `integration/welle-6` bei `1859972` (nur neue Tickets): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint
&& pnpm typecheck && pnpm test` grün (Vitest 208 Dateien: 207 bestanden, 1 übersprungen; 2.617 Tests bestanden, 3
übersprungen; `node --test` 29/29), Last bis 7,6.

## Answer

Umgesetzt auf `welle-6/94-aufmass-undo`, nur die kleine Lösung, kein Vertrag: `speicher` vergleicht `vorher` eines
Aufmaß-ChangeSets mit dem gespeicherten kanonischen Text statt mit dem geparsten Blatt, bringt jede Zeile höchstens einmal in
kanonische Form (Merkliste für die Zeilen, die `nachher` mit `vorher` teilt, auch über `postMessage`) und schreibt nur, was sich
ändert. 5.000 Zeilen: Einzeländerung, Undo und Redo je etwa 25–31 ms statt 63–71 ms (Leerlauf), unter Last 32–42 ms. Neuer
Budgettest `speicher/src/aufmass-leistung.test.ts` (100 ms, Median); die App-Messung D-45 prüft jetzt dasselbe Budget statt 1 s.
Entscheidungen D-94.1 bis D-94.6. Offen: Schreibkosten des 1-MiB-Satzes im OPFS des dauerhaften Profils (nicht gemessen).

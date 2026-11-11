# 72: `vergabe`: `summen.vorher` für eine nach dem Angebot hinzugekommene LV-Position

Status: done-by-agent
Type: bug
Welle: 5 · Strang: V · Paket: `packages/vergabe`
Blocked by: –
Regeln: A6, Q5
Herkunft: D-57.2 (Ticket 57, Comments)

## What to build

`positionSetzen` schickt für eine LV-Position, die nach dem Anlegen des Angebots hinzukam, eine alte Summe mit, die nie
gespeichert war. `speicher` nimmt es an (nichts geht verloren), aber Rückgängig schreibt eine Summenzeile zu viel. `vorher`
muss den gespeicherten Stand (keine Zeile) wiedergeben.

## Acceptance criteria

- [x] Test: Position im LV ergänzen, im Angebot bepreisen, Rückgängig → Summenstand gleich vorher (auch in `speicher`)

## Comments

### Umsetzer (Branch `welle-5/72-summenvorher`)

Nur `packages/vergabe`; `speicher` und `vertrag` unverändert.

- `befehle.ts` (`positionSetzen`): Der alte Wert einer Positionssumme ist der gespeicherte; ohne gespeicherte Summe nennt
  `vorher` nichts, und die Position zählt in den gespeicherten Gliederungs- und Gesamtsummen mit 0,00.
- `changeset.ts`: `angebotChangeSetAnwenden` hängt eine Summe ohne alten Wert hinten an und lässt die Summen aus
  `vorher.entfernt` wegfallen (bisher warf es „p4 fehlt“: der reine Zustand konnte das Bepreisen gar nicht anwenden).
- `testhilfen.ts`: `speicherAnwenden` bildet nach, wie `speicher` ein Angebots-ChangeSet anwendet (`wendeAngebotAn`,
  `pruefeSummenvorher` mit D-57.2). Mit dem alten Code zeigt es den Befund aus D-57.2: nach Rückgängig Zeilen
  `['p1', 'p4']` statt `['p1']`.
- Tests in `neue-lv-position.test.ts`: das Beispiel aus dem Ticket (rein und im Zeilenmodell, mit Wiederholen), der
  Altstand aus D-72.3 und eine Eigenschaft (300 Läufe): Angebot auf dem alten LV, Befehle auf dem gewachsenen LV (neue
  Position im Bereich einer Zuschlagsposition, neuer Titel mit Bedarfsposition, neue Zuschlagsposition mit Liste, Position
  direkt unter dem LV). Geprüft je Befehl: `vorher` nennt nur Gespeichertes, Rückgängig stellt den reinen Zustand und die
  Zeilen von `speicher` her, doppelte Umkehrung = ChangeSet, jede gespeicherte Summe gleicht der Neuberechnung auf dem
  gewachsenen LV, jede Angebotsposition hat eine Summe.

**Leistungsbudget** (`leistung.test.ts`, Preisspiegel `gross` mit 5 Angeboten, Budget 1000 ms, von diesem Ticket nicht
berührt): fällt nur unter Parallellast (Lastmittel 13–16 auf 4 Kernen): volle Suite 1438 ms, Paketlauf 2348, 1030 und
1480 ms; die Datei allein 456 ms und 469 ms. `AngebotspositionSetzen` auf `gross` allein: Median 1,4 bis 1,6 ms (Budget 16).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-72.1** Wie wird „auch in `speicher`“ geprüft, ohne `speicher` zu importieren? Mit einem Zeilenmodell in
  `testhilfen.ts`, das die dokumentierte Anwendung nachbildet (Vorherstände prüfen; Angebotsposition samt Summe löschen;
  Summen einfügen oder ersetzen, nie löschen; Gesamtsummen ersetzen). Grund: A3 (Fachpakete importieren einander nie);
  das ChangeSet ist die Grenze zwischen beiden Paketen.
- **D-72.2** Was schreibt das ChangeSet für eine Summe ohne gespeicherten Stand? Keinen `vorher`-Eintrag. Geschrieben wird
  sie nur zusammen mit ihrer neuen Angebotsposition; eine andere Summe ohne gespeicherten Stand bleibt ungeschrieben, ihre
  Differenz geht in Gliederungen und Gesamt (ohne Angebotsposition ändert sie sich nie, etwa eine neue Zuschlagsposition
  ohne Satz des Bieters; mit Angebotsposition gibt es sie nur im Altstand, D-72.3). Summen
  mit altem Wert stehen vor denen ohne. Grund: Vertrag (`Summenvorher.positionen`: ohne Gegenstück neu, fällt bei der
  Umkehrung weg); `speicher` löscht eine Angebotssumme nur mit ihrer Angebotsposition, jede andere bliebe nach Rückgängig
  stehen; die Reihenfolge hält „doppelte Umkehrung = ChangeSet“.
- **D-72.3** Was gilt für eine neue Angebotsposition, deren Summe sich nicht ändert (z. B. „nicht angeboten“, GP bleibt
  leer)? Das ChangeSet führt die gespeicherte Summe unverändert mit (`nachher` = `vorher`). Grund: Fund der Eigenschaft,
  auch ohne neue LV-Position: `speicher` löscht beim Rückgängig mit der Angebotsposition ihre Summenzeile, und ohne den
  Eintrag schrieb nichts sie zurück (danach eine Zeile zu wenig, Q5). Angepasst: die Minimalitätsprüfung in
  `eigenschaften.test.ts` und der Test „nicht angeboten statt kein Eintrag“ in `befehle.test.ts`. Ein Altstand mit
  Angebotsposition ohne Summe (nur vor diesem Ticket möglich) bekommt keine Summenzeile; Gliederungen und Gesamt bekommen
  die Differenz, Rückgängig ist exakt. Eine Änderung in `speicher` (Angebotssummen nach `vorher.entfernt` statt nach
  entfernten Angebotspositionen löschen) wäre die Alternative; sie ist nicht nötig und nicht gemacht.
- **D-72.4** Die Marker „v1.3: mechanisch angepasst, Folgeticket (Summenaenderung.vorher Pflicht)“ in `vergabe`
  (`changeset.ts`, `befehle.test.ts`, `eigenschaften.test.ts`) sind entfernt. Grund: Dieses Ticket ist die Folgefrage aus
  D-57.2 an `vergabe`.

## Answer

Behoben auf `welle-5/72-summenvorher` (58d0d8c, 078d604, 4ec59cf; Merge von `integration/welle-5`). `vorher` nennt nur
gespeicherte Summen; Rückgängig stellt den Summenstand rein und im Zeilenmodell von `speicher` exakt her. Suite: `pnpm lint`,
`pnpm typecheck` grün; `pnpm test` 2029 bestanden, 2 übersprungen, 1 Leistungsbudget nur unter Parallellast (siehe oben);
`node --test` 20 bestanden. `speicher` braucht keine Änderung.

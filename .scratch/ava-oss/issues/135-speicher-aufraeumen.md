# 135: `speicher`: eine Tabelle je ChangeSet-Art

Status: done-by-agent
Type: task
Welle: 7 · Strang: S · Paket/Ordner: `packages/speicher`
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A6, A8, Q4; D-69
Herkunft: Ticket 123 Punkt 2 (SA6, SA7) und `dekoder.ts`-Teil von Punkt 1 (nach 127)

## What to build

- Eine Tabelle je `ChangeSet['art']` statt zweier Switches (`kern.ts:116` `aggregatDes`, `:600` `anwenden`) samt
  `schreiben.ts:255` und `projektdatei.ts` (SA6).
- UPDATE-Spalten nicht positionsgekoppelt an die INSERT-Tupel (`schreiben.ts:1372,1398,1429` ↔ `zeilen.ts:562-611`, SA7).
- Keine Verhaltensänderung, keine Schemaänderung. Budgets (Einzeländerung, Undo 5.000 Zeilen < 100 ms) unverändert grün.
- Die Konstanten aus 127 (KG-Form, Hash, Artenlisten) in `dekoder.ts:992,1028,1050,1119` nutzen, sobald 127 gemergt ist
  (Integrationsspitze mergen); sonst als offener Rest für 139 im Ticket vermerken.

## Acceptance criteria

- [x] Alle `speicher`-Tests und die `speicher`-E2E grün; keine Golden-Änderung
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
- D-135.1 Wo steht die Tabelle? `packages/speicher/src/aggregatarten.ts`, `AGGREGATARTEN: { [A in ChangeSet['art']]: … }` mit
  `tabelle`, `bezeichnung`, `kennung`, `anwenden`, `ausDatei`. Ersetzt `aggregatDes` und den Switch in `anwenden` (kern.ts),
  die handgeschriebene UNION der abhängigen Aggregate beim Löschen des Projekts (schreiben.ts, jetzt aus der Tabelle) und die
  zwölf Importblöcke in `schreibeProjektdatei`; der Dekoder nimmt die erlaubten Arten im Protokoll aus `AGGREGATART_NAMEN`.
  Grund: Eine neue Art ist ein Eintrag; der Mapped Type erzwingt ihn (der alte Switch in `anwenden` hätte eine fehlende Art
  still übergangen). Die Datei importiert `schreiben.ts`, nicht umgekehrt (kein Importzyklus); `wendeProjektAn` bekommt die
  abhängigen Tabellen deshalb als Parameter.
- D-135.2 Reihenfolge der Einträge = Reihenfolge der Abhängigkeiten beim Import (wie bisher: Projekt, LV samt Ständen, Angebot,
  Auftrags-LV, Aufmaß, Rechnung nach Nummer, Kostenermittlung, Modell mit Vorgänger zuerst, Plan, Honorar, Mangel, Tagebuch);
  ein Test hält sie fest. Gleiche Reihenfolge wie die alte Liste im Dekoder, also unveränderte Meldungen.
- D-135.3 Der Export (`baueProjektdatei`) bleibt ausgeschrieben: Er bildet das Dateiformat (Pflicht- und optionale Listen,
  Schlüsselnamen der Datei), nicht die Art; ein generisches Zusammensetzen bräuchte Umwandlungen ohne Typprüfung. Die
  CHECK-Bedingung der Protokolltabelle ist Schema (A8) und ändert sich nur mit einer Migration (139).
- D-135.4 SA7: Zeilenbauer in `zeilen.ts` liefern Objekte Spalte → Wert (`aufmassZeile`, `rechnungZeile`, … statt `…Werte`
  als Tupel); `schreiben.ts` schreibt sie mit `einfuegen` (Spalten aus den Schlüsseln) und `aendern` (UPDATE nennt die Spalten,
  typgeprüft gegen die Zeile). Angebotspositionen über `ANGEBOTSPOSITION_SPALTEN` (Stapel, eine vorbereitete Anweisung wie
  bisher). Die Helfer stehen in `schreiben.ts`, weil der A5-Test schreibendes SQL nur dort zulässt. Knoten/LV-Kopf blieben,
  wie sie waren (schon aus Spaltenkonstanten abgeleitet).
- D-135.5 Punkt 4 (Konstanten aus 127 an den Dekoder-Stellen aus SA5, heute `dekoder.ts:993,1029,1051,1120`): 127 ist bei Abschluss nicht in
  `integration/welle-7` gemergt. **Offener Rest für 139:** KG-Form, Hash-Form, Mengen-/Struktur-/Schemaarten im Dekoder auf die
  Konstanten aus `vertrag` umstellen.
- D-135.6 Prüfung: Lint, Typecheck grün; `pnpm test` 3973 grün, 10 Leistungsbudgets rot (gaeb, kern, vergabe, web, speicher)
  unter Last (Load 23–36 auf 4 Kernen, bis zu 8 Agenten). Gegenprobe mit den Quellen von `integration/welle-7` unter derselben
  Last: dieselben `speicher`-Budgets rot (Aufmaß Median 151 ms, BauteileZuordnen samt Undo 141 ms); kein Budget gelockert.
  `speicher`-E2E 18/18 grün. Keine Nutzertexte geändert.

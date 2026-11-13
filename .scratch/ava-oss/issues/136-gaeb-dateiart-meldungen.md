# 136: `gaeb`: Dateiart erkennen, Meldungen, Bieteranschrift

Status: claimed
Type: task
Welle: 7 · Strang: G4, E7, E10 · Paket/Ordner: `packages/gaeb`
Blocked by: 129, 127
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U5, Q5, N4, L5, F6; D-10, D-22, D-71
Herkunft: umfang §3 E7 (Paketteil), E10 (Anschrift aus X84/X86), B-10, B-11, B-12

## What to build

1. **Dateiart am Inhalt erkennen:** DA XML (Version, Phase), GAEB 90 (feste Satzlänge, Satzarten), GAEB 2000 (Schlüsselwörter),
   unbekannt. Eine Funktion, die Art, Version, Phase und Kodierung liefert; die Endung ist nur Hinweis.
2. **Jede abgewiesene Version und Phase** (auch X80, X82, X85, X87, X88, X89, GAEB 90/2000 vor 144/145) bekommt einen Satz, was
   die Datei ist und was stattdessen geht. X80/X87/X88 werden nicht mehr „wie ein LV“ gelesen, sondern abgewiesen (oder, wo es
   ein LV ist, ausdrücklich mit Befund) – im Ticket festhalten.
3. **Befunde strukturiert für Nutzersprache:** Code, Schwere, Ort (Element, OZ, Zeile nur, wenn sie hilft) und Werte als Daten
   (Dezimal, nicht als „450000.00“ im Text); eine Gruppierung „nicht übernommen: Währung, Projektbezeichnung, …“. Der Text
   entsteht am Rand (App, 146) aus Code und Werten; das Paket liefert dafür eine Liste der Codes mit deutschem Kurztext ohne
   „Vertrag“ und ohne Kennungen. Bestehende Befundtexte im Paket entsprechend.
4. **E10:** X84 und X86 lesen die Anschrift des Bieters (Name, Straße, PLZ, Ort, Telefon, E-Mail, Ansprechperson), wo die Datei
   sie trägt, in die Felder aus 127.
6. **Aus dem Review (D-82, S7):** X84-Angaben des Bieters in `AngebotLesung.bieter.angaben?: Bieterangaben` (eigener Typ in `gaeb`), daraus `BieterAnlegen`. X86 füllt nur `LvInhaltKopf.auftragnehmer` (Name, Straße, PLZ, Ort); Telefon, E-Mail und Ansprechperson aus X86 bleiben ein Befund.
5. Gleiche Behandlung für X31 (`x31.ts`): Befunde strukturiert.

## Acceptance criteria

- [ ] Erkennung mit Tests je Art (inkl. kurzer selbst geschriebener GAEB-90/2000-Köpfe); jede Phase X80–X89 hat einen Test
- [ ] Bieteranschrift aus X84 (Fixture in `fixtures/angebote` oder BVBS-Datei, die sie trägt) mit Test
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Umsetzung (Agent, Demo-Modus). Seams (ohne Mensch festgelegt): `erkenneGaebDatei`, die drei Leser `leseGaeb`, `leseAngebot`,
`x31Lesen` und die Hilfen `BEFUNDTEXTE`, `nichtUebernommeneAngaben`, `zeileHilft`. Tests: `dateiart.test.ts` (Erkennung je
Art, jede Phase X80–X89 am Namensraum und an `Award/DP`), `abweisung.test.ts` (Satz je abgewiesener Phase, Version und
Dateiart in allen drei Lesern), `befunde.test.ts` (Kurztexte, Gruppe „Nicht übernommen“, OZ, Zeile), `bieteranschrift.test.ts`
(X84 mit Anschrift, X86 ohne Bieter); Goldens neu geschrieben und durchgesehen.

- **D-136.1** Wie kommen Werte, OZ und Gruppe an den Befund, ohne `vertrag` zu ändern? Entscheidung: `GaebBefund extends
  Pruefbefund` im Paket (`befunde.ts`, additiv): `quelle: 'gaeb-lesen'`, `code: GaebBefundcode`, `werte?` (je Name `{ art,
  wert }`: `text`, `anzahl` oder Dezimalwert der Zahlenart in gespeicherter Form), `oz?` (Anzeige-OZ des Knotens, mit Index),
  `nichtUebernommen?` (Bezeichnung für die Gruppe). `GaebLesungErgebnis`, `AngebotLesung`, `X31Lesung` tragen `GaebBefund[]`.
  `BEFUNDTEXTE` (Code → Kurztext) ist zugleich die Liste aller Codes: `melde` nimmt nur `GaebBefundcode`, ein neuer Code ohne
  Kurztext bricht den Typcheck. Grund: Punkt 3 ohne Vertragsänderung (P2, P9); wer nur `Pruefbefund` kennt, liest unverändert.
- **D-136.2** Woran werden GAEB 90 und GAEB 2000 erkannt (ohne Quelle, D-71)? Entscheidung, eigene Worte und **unsicher** (für
  den Bericht; 144/145 prüfen es an ihren Quellen): GAEB 90 = jede Zeile beginnt mit zwei Ziffern (Satzart), erste Satzart
  `00`, keine Zeile länger als 80 Zeichen, mindestens 80 % genau 80; die Phase liest die Erkennung **nicht** aus dem Inhalt,
  sondern aus der Endung (`.d83` → X83, `phasenquelle: 'endung'`). GAEB 2000 = erste Zeile `#begin[…]`, Phase aus `[DP]nn`,
  sonst Endung. Kodierung beider am Inhalt geschätzt: `ascii`, `utf-8`, `cp850` (Umlaute 0x81–0x9A, 0xE1) oder `iso-8859-1`.
  DA XML: Version und Phase mit denselben Regeln wie der Leser (`erkenneKopf`), aus dem Anfang der Datei ohne Parser.
- **D-136.3** Satz je Abweisung (`abweisung.ts`): was die Datei ist (Phasenname nach Glossar), was stattdessen geht (je Leser:
  LV ins Projekt, Angebot zum LV, Mengenermittlung zur Abrechnung; X89 → XRechnung; X85 wird nicht eingelesen) und was der
  Leser liest. **X80, X87, X88 werden abgewiesen**, nicht mehr wie ein LV gelesen (auch nicht „mit Befund“): Das Glossar nennt
  ihre Bedeutung nicht, der Satz nennt nur die Phase („gehört zur Austauschphase X87“), statt GAEB-Semantik zu raten. Neue
  Codes (Fehler): `format-nicht-unterstuetzt` (GAEB 90/2000, mit Hinweis auf die Ausgabe als DA XML) und `dateiart-unbekannt`
  (statt „xml-keine-wurzel“ für Text ohne `<`); `wurzel-unerwartet` nennt das oberste Element, `version-nicht-unterstuetzt`
  die gelesenen Versionen und was stattdessen geht. Werte: `phase`, `version`, `format`, `element`.
- **D-136.4** Lesetexte im Paket: kein „Vertrag“, keine Entscheidungs- oder Ticketnummern („G-26“, „D-16“), kein
  „leseGaeb“/„Aufrufer“; Zahlen deutsch (`10.000,00 €`, `19,00 %`; N4, GAEB ist ein Rand), dieselben Werte als Daten. Der Pfad
  in der Datei bleibt in der Meldung und als Wert `element` (Ort „Element“ aus Punkt 3); Werte der Datei, die als Text zitiert
  werden (z. B. ein Dezimalkomma), bleiben wörtlich.
- **D-136.5** Gruppe „Nicht übernommen“: Jeder `nicht-abgebildet` trägt eine Bezeichnung in eigenen Worten (`angabeZu`, Tabelle
  in `befunde.ts`; ohne Eintrag der Pfad), dazu die Textformatierung, Textergänzungen des Bieters und der Rand einer
  Aufmaßzeile. `CTR` heißt im LV „des Auftragnehmers“, im Angebot „des Bieters“. Befunde, die Summen oder Preise ändern
  (Nachlass, Pauschalsumme, Steuersatz, Menge des Bieters, Wahl einer Gliederung), bleiben einzeln am Knoten.
- **D-136.6** „Zeile nur, wenn sie hilft“: `ort` bleibt vollständig (Daten, Goldens); `zeileHilft(b)` ist wahr nur ohne OZ,
  ohne Knoten und außerhalb der Gruppe (Aufbaufehler der Datei, Kopfdaten, Zahlen ohne Position). Die OZ ergänzt der Leser am
  Ende an jedem Befund eines Knotens mit OZ (LV, Angebot und Mengenermittlung über die Knoten des LV).
- **D-136.7** Bieter aus X84 (D-82 S7): `AngebotLesung.bieter: Bietervorschlag | null` mit `name` und `angaben?:
  Bieterangaben` (Street/PCode/City → `anschrift`, Contact → `ansprechperson`, Phone → `telefon`, Email → `email`).
  Normalisierung wie D-127.4 als lokale Zeilen (der Export aus `kern` kommt mit 137; Umstellung wie in `vergabe`, D-83, in
  159). Angaben ohne Namen: `name: ''` mit Befund `bieter-name-fehlt`. Werte wie „k.A.“ werden wörtlich übernommen. Land,
  Fax und Nummern bleiben Befund. X86 unverändert: nur `auftragnehmer`, Kontaktangaben bleiben Befund, kein Bieter.
- **D-136.8** `format` an allen drei Ergebnissen (`GaebLesung.format` aus v1.7a, `AngebotLesung.format?`, `X31Lesung.format?`);
  fehlt nur, wenn die Datei keine GAEB-Datei ist (wie der Vertragskommentar). Die Phase einer X31 kommt jetzt auch aus
  `QtyDeterm/DP` (3.1 ohne eigenen Namensraum).
- **D-136.9** Leistungsbudget: Die Messung „Datei über 2 MB in unter 1 s“ war im Gesamtlauf des Pakets einmal rot (Last 15–17
  auf 4 Kernen), einzeln 350–450 ms; der Stand vor dem Ticket brauchte unter derselben Last 490–560 ms. Nicht gelockert.

Für den Rand (146, 149): Texte aus `code` + `werte` + `BEFUNDTEXTE`, Gruppe aus `nichtUebernommeneAngaben`, Zeile nach
`zeileHilft`; `AngebotLesung.bieter.angaben` in `BieterAnlegen`. Offen (nicht geraten): die Bedeutung der Phasen X80, X87, X88
fürs Glossar.

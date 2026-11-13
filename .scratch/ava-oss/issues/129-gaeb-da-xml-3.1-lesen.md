# 129: GAEB DA XML 3.1 lesen (X81, X83, X84, X86)

Status: claimed
Type: task
Welle: 7 · Strang: G4 · Paket/Ordner: `packages/gaeb`
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q3, U5, F6, G-10, C4
Herkunft: umfang §3 E5, B-10

## What to build

- X81, X83, X84, X86 in DA XML 3.1 lesen, in dasselbe Modell wie 3.2/3.3. Unterschiede der Version als eigene, kleine Weichen;
  was 3.1 nicht abbildet oder anders kennt, ist ein Befund (U5), nie stilles Verwerfen.
- Prüfsteine: die amtlichen Musterdateien in `fixtures/extern/gaeb/3.1-musterdateien/` (alle acht Dateien lesen ohne Fehler;
  Mengen, EP, GP und Summen stimmen mit den Werten in der Datei; Zählung wie `zaehlung-bvbs.test.ts`).
- Geschrieben wird weiter nur 3.2 und 3.3 (G-10). Ein 3.1-Import exportiert als 3.3 und liest sich wieder gleich (Roundtrip
  über das Modell).
- Die Meldung `version-nicht-unterstuetzt` (`lesen.ts` ~1526) nennt kein Ticket mehr (L5); die volle Überarbeitung der
  Meldungen folgt in 136.

## Acceptance criteria

- [ ] Alle acht 3.1-Musterdateien lesen; Golden-Tests für Summen; Roundtrip 3.1 → Modell → 3.3 → Modell gleich
- [ ] XSD-Gegenprüfung (`pnpm --filter @tethys/gaeb run xsd-gegenpruefung`) unverändert grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Umsetzung (Agent, Demo-Modus). Tests: `packages/gaeb/src/version-31.test.ts` (Zählung, Mengen/EP, Summen-Golden X86 und X84),
`roundtrip.test.ts` (3.1 → Modell → 3.3 → Modell, zweiter Export byte-gleich), `lesen.test.ts` (Befunde an der Gliederung,
Version älter als 3.1). Die XSD-Gegenprüfung schreibt zusätzlich die gelesenen 3.1-Dateien als 3.3 und 3.2 (72 von 72 bestanden).

- **D-129.1** Welche Weichen braucht 3.1? Entscheidung: nur die Versionserkennung (gemeinsamer Namensraum
  `…/GAEB_DA_XML/200407`, Tabelle `GELESEN` in `erkennung.ts`). Grund: Alle acht Musterdateien nutzen denselben Aufbau wie 3.2/3.3
  (Elemente, Texte, Zuschlagsformen, Summen); ein Abgleich aller Elementnamen der Dateien mit dem Leser ergab keine 3.1-eigene
  Form. Älter als 3.1 bleibt `version-nicht-unterstuetzt`, Meldung ohne Ticket: „GAEB DA XML x wird nicht gelesen; gelesen werden
  die Versionen 3.1, 3.2 und 3.3.“
- **D-129.2** Wie prüft das Golden „Summen stimmen mit der Datei“, wenn die Datei Dinge trägt, die der Vertrag nicht hält?
  Entscheidung: Sollwerte nur aus der Datei (`Qty`, `UP`, `IT`, `Totals`, eigener Durchlauf, nicht der Leser); Summen vom Kern. An
  jeder Gliederung und am LV gilt eigene Summe − Datei = Σ der Abweichungen darunter, und jede Abweichung ist ein Befund an ihrem
  Knoten; die Liste je Datei steht ausdrücklich im Test. Abweichungen: Positionsnachlass, entfallende Position (`NotAppl`),
  Zuschlag auf eine rabattierte Position, Nachlass/Pauschalsumme/eigener Steuersatz einer Gliederung, Gliederung als Wahl, Menge
  des Bieters (X84). 002.X86 stimmt exakt bis Brutto.
- **D-129.3** Bisher still verworfen (auch in 3.3): `Totals` einer Gliederung in X86 und `TotalLSUM` im LV. Entscheidung: Befunde
  (Warnung) an der Gliederung: `nachlass-nicht-abgebildet`, `pauschalsumme-nicht-abgebildet`, `mwst-satz-abweichend` (nur wenn
  vom Satz des LV verschieden), dazu `gliederungswahl-nicht-abgebildet` für `ALNBGroupNo`/`ALNBSerNo` (ersetzt den
  Sammelbefund `nicht-abgebildet` ohne Knoten; Golden `ava-x81` angepasst). Im Angebotsleser: `bietermenge-nicht-abgebildet` je
  Position (vorher Sammelbefund `Item/Qty`) und `pauschalsumme-nicht-abgebildet` (Golden `angebot-ava-x84` +1 Zeile). Grund: U5,
  Q5; ohne Knoten fehlt der Sprunglink, und die Summen weichen genau um diese Angaben ab. Schwere wie die Nachbarn im LV-Leser
  (Warnung); der Angebotsleser behält für Nachlässe seine Fehler-Schwere (D-10).
- **D-129.4** Texte nennen „Gliederung“ (Glossar), nicht „Bereich“. Die Werte stehen noch im Text; die strukturierte Form folgt
  in 136.
- **D-129.5** Roundtrip-Phasenform (`roundtrip.test.ts`): X86 trägt Eröffnungstermin und Abgabeort nicht; der Writer verwirft sie
  mit Warnung. Das ist Form der Phase, kein Unterschied des Modells (zuerst an den 3.1-X86 sichtbar, die 3.3-Rundwege prüften X86
  nur mit Fixtures ohne diese Felder).

Offen (nicht geraten, für den Orchestrator): Positionsnachlass, entfallende Position, Gliederung als Wahl, Nachlass/Pauschalsumme
einer Gliederung und mehrere Steuersätze sind GAEB-Semantik, die der Vertrag nicht hält; die App rechnet dann andere Summen als
die Datei (mit Befund). Ob z. B. die Positionen einer Wahl-Gliederung als Wahlpositionen gelesen werden sollen, ist eine Frage an
`vertrag`/Fachregeln, nicht an diesen Leser. Veraltete Kommentare außerhalb des Pakets: `packages/vertrag/src/gaeb.ts`
(`GaebVersion`: „3.1 ist nur erkennbar“), `apps/web/src/gaeb/gaeb.ts:58` („z. B. GAEB 3.1“) und der Text `keinX84` in
`apps/web/src/gaeb/texte.ts` („X84 in GAEB 3.3 oder 3.2“).

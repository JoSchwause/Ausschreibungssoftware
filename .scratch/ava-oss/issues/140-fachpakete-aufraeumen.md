# 140: Fachpakete aufräumen (Ticket 123, Rest)

Status: resolved
Type: task
Welle: 7 · Strang: – · Paket/Ordner: `packages/ifc`, `bim`, `bauzeit`, `bauleitung`, `ui-modell`
Blocked by: 127
Modell: sonnet
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A3, L2; D-69
Herkunft: Ticket 123 Punkte 1 (Verbraucher), 3, 5 (Verbraucher), 7 (`bauzeit`), 8 (Paketteile)

## What to build

- `ifc`: Nachrichtenketten `l.daten.id/name/klasse(…)` hinter einer Methode (SA9); Test-Exporte bereinigen.
- `ifc`, `bim`: Konstanten aus `vertrag` v1.7a (KG-Form, Hash, Artenlisten, `MENGENART_STUECK`) statt eigener Kopien.
- `bauzeit`, `bauleitung`: gemeinsamer Datumstyp aus `vertrag` (`bauleitung/datum.ts:6-22` entfällt), drei `Lage`-Typen in
  `bauzeit` zusammenführen, Prozentkonstanten und Namen, „offen“-Prädikat.
- `ui-modell`: GlobalIds-Punkt aus 122/20.
- Die App-Teile von 123 machen 131 und 155, nicht dieses Ticket.

## Acceptance criteria

- [x] Keine Verhaltensänderung; alle Goldens, X1–X4-Kettentests und Paket-E2E grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

- **D-140.1 Drei `Lage`-Typen (bauzeit).** Frage: zusammenführen? Entscheidung: nicht zu einem Typ (es sind drei verschiedene Dinge: Feiertagsregel, Termin-Lage in Tagesindizes, Balken auf der Achse), sondern eindeutig benannt: `Feiertagslage` (`feiertage.ts`), `Vorgangslage` (`bauzeitenplan.ts`), `Balkenlage` (`zeitachse.ts`, Rückgabetyp von `balkenlage`). Grund: L2 (keine Synonyme für Verschiedenes). Die Funktion `balkenlage` behält ihren Namen, weil `apps/web/src/bauzeit/ansicht.ts` sie importiert (App-Ordner gehört anderen Tickets).
- **D-140.2 Datum.** `bauzeit.Datum` ist Alias von `Kalenderdatum`; `bauleitung.istKalendertag` ist Typwächter auf `Kalenderdatum` und nutzt `KALENDERDATUM_MUSTER`. `bauleitung/datum.ts` bleibt mit der Kalenderprüfung (Existenz des Tages), weil der Vertrag keine Logik hat und Fachpakete einander nicht importieren (A3); nur Typ und Form-Regex sind entfallen. `bim` nutzt dasselbe Muster.
- **D-140.3 `MENGENART_STUECK`.** Liegt im Vertrag; `bim` führt die Konstante nicht mehr selbst, reicht sie aber aus `index.ts` weiter, weil `apps/web/src/bim/zuordnung.ts` und `ZuordnungBereich.tsx` sie von `@tethys/bim` importieren (App: Ticket 155 stellt um, dann kann die Weiterreichung entfallen).
- **D-140.4 `ifc`.** `Modellleser` bekommt `nummer(i)`, `klasseVon(i)`, `instanzen(klasse)` statt der Ketten `l.daten.id/name/klasse(…)`; `zeichenketteEntschluesseln` ist nicht mehr exportiert (nur in der Datei benutzt). Die Typen `StepBauteilmenge.art` und `StepStrukturknoten.art` leiten sich aus `Bauteilmengenart`/`STRUKTURKNOTENARTEN` ab.
- **D-140.5 „offen“-Prädikat.** `istOffenerStatus(status)` in `bauleitung/mangelstatus.ts`, genutzt von `istUeberfaellig` und der Mängelauswertung.
- **D-140.6 Prozentkonstanten (bauzeit).** `HUNDERT_PROZENT` einmal in `bauzeit/prozent.ts`, `NULL_PROZENT` aus `dezimal`; `istFehler` heißt `isttermineFehler`.
- **D-140.7 `ui-modell` GlobalIds: nicht umgesetzt.** Frage: `IfcGlobalId` statt `string` in `typen.ts` (Eingaben `auswahl`, `faerbung`, `bildschirmpunkt`)? Entscheidung: zurückgestellt. Die Eingaben sind in `apps/web` (`ModellSeite.tsx`, `ModellvergleichSeite.tsx`, `bim/zuordnung.ts`) durchgehend `string`; die Verengung bräche den Typcheck der App, die hier nicht angefasst wird, und brauchte eine neue Abhängigkeit `ui-modell → vertrag` samt Lockfile. Vorschlag: zusammen mit der App-Umstellung in 155 (Typen in `typen.ts`, `darstellung.ts`, `zuordnung.ts`, `geometrie-lesen.ts`, `leinwand.ts`, Tests und `e2e/harness`; Quelle der Marke ist `geometrie-lesen.ts`).
- **D-140.8 Nicht umgesetzt (offen für 155/Folge):** Re-Exporte der Vertragstypen in `bauzeit/index.ts` („für bestehende Importe“): die Pakettests importieren sie über `./index`; Entfernen verlangt Anpassung von rund 12 Testdateien und ist kein Gewinn. Test-Exporte in `ifc`: nur `zeichenketteEntschluesseln` war ungenutzt exportiert; `ifcLesen`/`eigenschaftenLesen` aus 122/20 werden außerhalb des Pakets genutzt oder sind bereits intern.
- Lauf: lint, typecheck grün; `pnpm test` 4110 grün, nur Leistungstests unter Last rot (`kern/k9-leistung`, `speicher/aufmass-leistung`, `speicher/v16-leistung`, `vergabe/leistung`, `apps/web/abrechnung/leistung`: Pakete, die dieses Ticket nicht berührt; nicht gelockert). X1–X4-Kettentests 27/27 grün, `ui-modell` E2E 15/15 grün.

## Answer

Gemergt nach `integration/welle-7` mit `c3e9255`. Ergebnisse, Testläufe und Entscheidungen (D-140.x) unter `## Comments`.

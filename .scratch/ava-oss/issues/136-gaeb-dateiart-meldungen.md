# 136: `gaeb`: Dateiart erkennen, Meldungen, Bieteranschrift

Status: ready-for-agent
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

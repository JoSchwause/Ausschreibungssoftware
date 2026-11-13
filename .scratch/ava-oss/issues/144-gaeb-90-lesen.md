# 144: GAEB 90 lesen (.d81/.d83/.d84/.d86) und Formatvergleich

Status: ready-for-agent
Type: task
Welle: 7 · Strang: G4, E6 · Paket/Ordner: `packages/gaeb`, neu `fixtures/gaeb-formate/` (+ `fixtures/extern/HERKUNFT.md`, `REUSE.toml` für die neuen Dateien)
Blocked by: 136
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: C1, C4, U5, Q5; D-71
Herkunft: umfang §3 E6, B-11, G-61, G-64

## What to build

Nach **D-71**: Formatregeln nur aus frei zugänglichen Beschreibungen (WebFetch/WebSearch erlaubt: gaeb.de, BVBS,
Herstellerhilfen), nur gelesen; eigener Code, keine Normtexte oder fremden Parser im Repo. Quellen im Ticket nennen.

1. **Leser** für GAEB 90 (feste Satzlänge, Satzarten) in dasselbe Modell wie DA XML: Kopf, Gliederung, Positionen (Menge,
   Einheit, EP, Merkmale Bedarf/Wahl/Stundenlohn/Pauschal, Zuschlagsposition), Kurz- und Langtext, Vor- und Nachtexte,
   Angebotspreise (.d84), Preise (.d86). Unbekannte Satzarten sind Befunde; Zeichensatz (CP437/850 oder ISO-8859-1) am Inhalt
   erkennen und als Befund melden. Nichts schreiben.
2. **Testdateien von Hand** in `fixtures/gaeb-formate/`: dasselbe kleine LV (zwei Titel, rund zehn Positionen mit Bedarf,
   Wahl, Stundenlohn, Zuschlag, Vortext, Langtext mit Fett und Liste, Nachkommastellen) als X83/X86 3.3, X83/X86 3.1 und
   .d83/.d86 (später .p83/.p86 in 145). Herkunft „von Hand nach Formatbeschreibung, nicht aus AVA-Software“, REUSE.
3. **Kettentest „dasselbe Modell“** (Tor E Punkt 3): alle Formate ergeben dasselbe Modell bis auf dokumentierte
   Unterschiede der Formate (Liste im Test mit Begründung).
4. Der Befund/Hinweis „nicht an Dateien aus anderer Software geprüft, Summen vergleichen“ bei jedem GAEB-90-Import (D-71).
5. Was die Quelle nicht hergibt: im Ticket als unsicher vermerken (für den Bericht).

## Acceptance criteria

- [ ] Leser mit Tests je Satzart; Formatvergleich grün; Quellen und Unsicherheiten im Ticket
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

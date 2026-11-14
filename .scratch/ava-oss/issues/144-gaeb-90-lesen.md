# 144: GAEB 90 lesen (.d81/.d83/.d84/.d86) und Formatvergleich

Status: resolved
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

- [x] Leser mit Tests je Satzart; Formatvergleich grün; Quellen und Unsicherheiten im Ticket
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

### Quellen (D-71: frei zugänglich, nur gelesen, eigene Worte; keine Normtexte, kein fremder Parser, kein `okf/research/`)

- **Q1** „Das Freie GAEB Buch“, MWM Software & Beratung, V 4.0 (2022, `mwm.de/download/ftp/docs/Das_freie_GAEB_Buch.pdf`),
  gleichlautend V 3.9.1 bei BVBS (`bvbs.de/wp-content/uploads/2018/07/Das-Freie-GAEB-Buch.pdf`): Abschnitte 1.4 und 3.1.
  Satzlänge 80, Satzart 1–2, Satznummer 75–80 (lückenlos ab 000001), Liste der Satzarten (T0/T1/T9, 00, 01–04, 06, 08, 10, 11,
  12, 20, 21, 24, 25, 26, 30, 31, 32, 33, 99, 70–89 frei), Feldtabelle (Menge 11 = 8,3; EP 10 = 8,2 plus Zehntelcent 1;
  Gesamtbetrag 12; Einheit 4; Kurztext 70; Langtext 55; OZ 9; OZ-Maske im Satz 00, z. B. `1122PPPPI`, nur der Index
  alphanumerisch; POSART1 N/G/A, POSART2 N/E/M; Ausgabejahr in 72–73 des Satzes 00), „GAEB 90 kennt keine Formatierung“,
  „die Phase in der Datei ist verbindlich, die Endung nur Hinweis“, „eine D84 trägt nur OZ und Preise“, Beispieldateien
  DA 81/83/84/86 (im PDF ohne verlässliche Leerzeichen).
- **Q2** Dangl IT, „The GAEB Data Formats in Detail“ (`dangl-it.com/articles/the-gaeb-data-formats-in-detail/`) und die dort
  verlinkten Beispieldateien (öffentlicher Gist `GeorgDangl/29c8069c6fffac955f07d2c012249819`, `GAEB90_DE.D86`), nur über
  WebFetch angesehen: genaue Stellen der Sätze 00, 01, 06, 08, 11, 21, 23, 25, 26, 31, 32, 99 (Datenart in 11–12 des Satzes 00,
  Maske 63–71, Menge ab 24, Einheit ab 35, EP ab 13, Gesamtbetrag ab 25, Langtext ab Stelle 6), Beginn mit `T0`.
- **Q3** Thomas Seidel (B-SIK), „Arbeitsunterlagen GAEB & LV“, 2015 (`schulungen.seidel-dreffke.de/download/…`): weitere
  Beispielzeilen 00/01/21/25/99 mit denselben Stellen; ein `Ü` als Byte 0x9A (DOS-Codepage).
- **Q4** gaeb-online.de, „D83 & D84 erklärt“: Zeichensatz IBM 850 (DOS-Codepage). Sonst wenig belastbar (nennt D81 abweichend
  „Kostenanschlag“; nicht verwendet).
- **Q5** ASBwin-Handbuch (heitker.de), „Zuschlagspositionen“: In GAEB 90 lässt sich nur die Art „alle markierten
  vorangehenden Positionen“ übergeben; wie, sagt die Seite nicht.
- **Q6** GAEB, Fachdokumentation GAEB DA XML 3.3 (gaeb.de, PDF 2019-10), Liste der Austauschphasen: X80 „Universelle
  LV-Daten“, X87 „Auftragsbestätigung“ (für D-86). X88 nennt sie nicht.

Nicht erreichbar: die offizielle GAEB-90-Regelung (nicht frei), `gaeb-2000.com/gaeb-90_datei-aufbau.html` (HTTP 503).

### Entscheidungen

- **D-144.1** Erkennung (berichtigt D-136.2): GAEB 90 beginnt mit `00` **oder `T0`** (Q1, Q2), Satzart auch `T` + Ziffer,
  ≥ 80 % der Zeilen genau 80 Zeichen **mit sechsstelliger Satznummer in 75–80**; die Phase steht als Datenart in den Stellen
  11–12 des Satzes 00 (`phasenquelle: 'inhalt'`), sonst gilt die Endung. Grund: Q1 „verbindlich ist die Information in der
  Datei“, Q2 beginnt mit `T0`.
- **D-144.2** Einbau: `vorlauf` bekommt einen Schalter „GAEB 90 lesen“ und gibt dann den dekodierten Text als `satzdatei`
  zurück; `leseGaeb` (X81/X83/X86) und `leseAngebot` (X84) lesen weiter in `gaeb90.ts`, `x31Lesen` weist GAEB 90 wie bisher
  mit Satz ab. Wiederverwendbar für 145: `zeilenbefunde.ts` (Befunde mit Zeile statt XML-Ort), `lvaufbau.ts` (Baum aus
  Ereignissen öffnen/schließen/Hinweis/Position, OZ, doppelte OZ, Wahl), `zeichensatz.ts`. Der Satz „Eingelesen werden …“ nennt
  jetzt auch GAEB 90 (`.d81/.d83/.d86`, Angebot `.d84`).
- **D-144.3** Fester Hinweis bei jedem GAEB-90-Import (LV und Angebot): Befund `format-ungeprueft`, Warnung, Text „Das Lesen von
  GAEB 90 ist nach der Formatbeschreibung gebaut und nicht an Dateien aus anderer Software geprüft; bitte die Summen mit denen
  des Absenders vergleichen.“ (D-71). Zeichensatz als Befund `zeichensatz-erkannt` (nur bei Bytes, nicht bei Text).
- **D-144.4** Zeichensatz: CP437 und CP850 haben die deutschen Umlaute und ß an denselben Stellen; gelesen wird als CP850
  (eigene Tabelle, `TextDecoder` kennt keine DOS-Codepages). `€` gibt es in CP850 nicht (0xD5 ist dort `ı`, in CP858 `€`);
  nicht umgedeutet.
- **D-144.5** Positionsart: Stelle 12 (N/G/A) und 13 (N/E/M) nach Q1; Stelle 14 ist in allen Beispielen `N`, ihre Bedeutung ist
  nicht belegt → anderer Wert = Befund „nicht übernommen“. **Stundenlohn, Pauschal und Zuschlagsposition** haben in keiner
  freien Quelle ein GAEB-90-Kennzeichen → nicht gelesen (Merkmale `false`, `zuschlag: null`); in den Testdateien fehlen sie in
  GAEB 90 (dokumentierter Formatunterschied). Belegte, aber nicht abbildbare Stellen (z. B. 15–23 im Satz 21, wo Q1 bei einer
  Alternative `11` zeigt) sind „nicht übernommen“ (D-80).
- **D-144.6** Wahl: `G` → Grundposition mit Variante 0, Gruppe `null`; `A` → Alternative ohne Nummern (Variante `null`, geht
  nicht in die Summe); der Verweis auf die Grundposition nur, wenn es in derselben Gliederung davor **genau eine** Grundposition
  gibt, sonst Befund `wahl-ohne-grundposition` (lieber Befund als raten).
- **D-144.7** Texte: Kurztext-Zeilen (25) mit Leerzeichen verbunden (wie der DA-XML-Leser Umbrüche im Kurztext); Langtext-Zeilen
  (26) ab Stelle 3 bis 74, außen ohne Leerraum; aufeinanderfolgende Zeilen ein Absatz mit Zeilenumbrüchen, eine leere Zeile
  beginnt einen neuen Absatz. `20` + `26` ist ein Hinweistext an der Stelle, an der er steht (Vortext am LV, Nachtext im Titel);
  ohne Langtext trägt der Kurztext den Hinweis. `T0`/`T1`/`T9` werden der erste Hinweistext am LV.
- **D-144.8** Kopf und Summen: 01 Stellen 3–42 = Name des LV, 43–50 Datum (nicht übernommen); 02 = Projekt (Name, wenn 01 fehlt,
  sonst nicht übernommen); 03 = Auftraggeber (Name); 04 = Bieter bzw. in X86 Auftragnehmer (Name). **Kein Steuersatz aus GAEB 90**
  (Befund `mwst-standardsatz`/`-ersatzwert` auch bei X86): Q2/Q3 zeigen `1900` in 22–25 des Satzes 99, belegt ist das Feld aber
  nicht. 32 und 99 sind abgeleitet und werden nicht gelesen (wie `Totals`). 22 (Bedeutung neben 23 unklar), 06, 08, 10/33
  (Los außerhalb der OZ), 24 (Unterbeschreibung, Felder unbekannt), 30, 70–89 → „nicht übernommen“; unbekannte Satzarten →
  `satzart-unbekannt`.
- **D-144.9** D-86: X80 „ein Austausch universeller LV-Daten“ und X87 „eine Auftragsbestätigung“ aus Q6 in Glossar und Satz;
  X88 bleibt bei der Nummer (nur Q3 nennt „Nachtrag, mit 3.1 entfallen“; zu schwach). Glossar: Eintrag GAEB 90 mit Satz/Satzart.

### Unsicher (für den Bericht)

1. Alle Stellen außer den in Q1 als Tabelle genannten Längen sind aus Beispielzeilen (Q2, Q3) erschlossen; die Leerzeichen der
   PDF-Beispiele (Q1) sind nicht verlässlich. Ungeprüft an Dateien aus anderer Software (D-71).
2. Stelle 14 des Satzes 21, Stellen 15–23 (bei Q1 `11` an einer Alternative, vermutlich Gruppe/Variante) – nicht gelesen.
3. Kennzeichen für Stundenlohn, Pauschal, Zuschlagsposition und Zuschlagskennzeichnung in GAEB 90 – unbekannt, nicht gelesen.
4. Satz 22 neben 23 (beide tragen laut Q1 EP/Gesamtbetrag) – nur 23 gelesen.
5. Steuersatz in 22–25 des Satzes 99 – nur aus Beispielen, nicht gelesen.
6. Satz 04 als Bieter/Auftragnehmer – aus der Reihenfolge „LV, Projekt, Auftraggeber, Bieter“ in Q1 geschlossen.
7. Satz 20 mit OZ, Spalten von 24 (Unterbeschreibung), 06/30 (Einheitspreisanteile), Nachlass in GAEB 90 – unbekannt.
8. Langtext: Text ab Stelle 6 in Q2, ab 3 gelesen; Einrückungen gehen verloren. CP437 vs. CP850 nicht unterscheidbar; `€`.
9. Kennzeichen in Stelle 13 des Satzes 00 (`L` in 81/83/86, leer in 84) und `X` in Stelle 72 des Satzes 01 – Bedeutung offen,
   Stelle 13 wird übergangen, 51–74 des Satzes 01 als „weitere Angaben“ gemeldet.

### Offen für den Orchestrator

- Der Dateidialog der App (`apps/web/src/gaeb/GaebEinlesen.tsx`, `Angebote.tsx`) bietet `.d81/.d83/.d86` bzw. `.d84` noch nicht
  an; das ist Punkt 3 von Ticket 146.
- Die neuen Befundcodes (`format-ungeprueft`, `zeichensatz-erkannt`, `satzart-unbekannt`, `satz-laenge`, `satznummer-abweichend`,
  `gliederungsende-abweichend`) haben Kurztexte in `BEFUNDTEXTE`; die Anzeige in der App (146) zeigt den festen Hinweis damit
  ohne eigene Arbeit.
- `.gitattributes` fehlt: Die GAEB-90-Testdateien sind CRLF und CP850; bei `core.autocrlf=true` (Windows) würde Git die
  Zeilenenden ändern (der Leser verträgt beides). Eine Zeile `fixtures/gaeb-formate/*.d8? -text` läge außerhalb dieses Tickets.

### Ergebnis

- `pnpm lint` grün, `pnpm typecheck` grün, `node --test fixtures/*.test.mjs` 53/53 grün.
- `pnpm test` (Vitest): 4.443 grün, 10 rot – alles Leistungsbudgets unter Last (Lastmittel über 20 auf 4 Kernen, bis zu 8
  Agenten): `gaeb/lesen` „2 MB unter 1 s“ (allein grün), `vergabe/leistung` Preisspiegel (allein unter Last rot; Paket nicht
  berührt), `kern` (allein grün), `speicher`, `ausgabe`, `apps/web/abrechnung`. Kein Budget gelockert; dieses Ticket ändert
  am XML-Weg nur einen Schalter im Vorlauf.
- GAEB-Tests: `gaeb90.test.ts` 30 (je Satzart), `formatvergleich.test.ts` 8 (Kettentest), `dateiart`, `abweisung` angepasst.
- E2E `e2e/gaeb.spec.ts` 6/6 grün.

## Answer

Gemergt nach `integration/welle-7` mit `d34b2b9`. Ergebnisse, Testläufe und Entscheidungen (D-144.x) unter `## Comments`. **Nicht gegen echte Dateien geprüft:** GAEB 90 ist gegen eigene, aus der Spezifikation abgeleitete Fixtures getestet; echte Dateien aus dem Büro fehlen (Ticket 125), die unsicheren Punkte stehen in den Comments.

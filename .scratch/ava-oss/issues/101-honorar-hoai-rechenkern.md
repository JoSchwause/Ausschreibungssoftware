# 101: X3: HOAI-Rechenkern (`honorar`)

Status: done-by-agent
Type: task
Welle: 6 · Strang: X3 · Paket: `packages/honorar` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: –
Modell: opus
Regeln: A2, A3, N1–N3, Q1, C1, C4, U5, D-56
Herkunft: `plan.md` §2 X3, Berater D-56 (HOAI-Tafeln als Daten im Repo, Rundungskette als Projektkonvention)

## What to build

Ein reines TS-Paket (A2), das Honorare nach der **HOAI 2021** rechnet (Verordnung über die Honorare für Architekten- und
Ingenieurleistungen, Fassung der Änderungsverordnung BGBl. I 2020 S. 2636; amtliches Werk nach § 5 Abs. 1 UrhG, deshalb dürfen
Tafelwerte ins Repo, D-56). Es importiert nur `vertrag` und `dezimal` (`'packages/honorar': ['packages/vertrag',
'packages/dezimal']`, `apps/web` darf es importieren). In diesem Ticket mit **eigenen Eingabetypen**; die Vertragstypen
(`Honorarberechnung`, `Honorarergebnis`) bringt Ticket 97, die Umstellung und die Befehle Ticket 110. Halte die eigenen Typen
nahe an der Form unten.

**Quelle.** Lies die Paragraphen selbst auf `https://www.gesetze-im-internet.de/hoai_2013/` (§§ 4, 6, 7, 13, 14, 16, 33, 34,
35, 36, 51, 52, 55, 56; dazu 39, 40, 43, 44, 47, 48, wenn die Zeit reicht). Im Repo stehen nur Tafelwerte, Namen der
Leistungsphasen und Prozentsätze, je mit § und Absatz und Abrufdatum als Kommentar – **keine** Texte der Grundleistungen aus
den Anlagen (C1).

1. **Honorartafeln als Daten** (Pflicht: § 35 Abs. 1 Gebäude und Innenräume, § 52 Abs. 1 Tragwerksplanung, § 56 Abs. 1
   Technische Ausrüstung; wenn Zeit bleibt: § 40 Freianlagen, § 44 Ingenieurbauwerke, § 48 Verkehrsanlagen). Je Zeile die
   anrechenbaren Kosten und je Honorarzone „von“ und „bis“ in Euro (Honorarspannen, Orientierungswerte nach § 35 Abs. 1). Die
   Zahl der Honorarzonen je Leistungsbild aus der Quelle (z. B. § 56: I–III). **Datentests:** Zeilen streng steigend; wo die
   Tafel es zeigt, „bis“ der Zone n = „von“ der Zone n+1; erste und letzte Zeile jeder Tafel gegen die Quelle (Abschrift im
   Test, mit §).
2. **Leistungsphasen** je Leistungsbild mit Prozentsätzen aus der Quelle (Gebäude § 34 Abs. 3, Innenräume abweichend;
   Tragwerksplanung § 51; Technische Ausrüstung § 55). Die Sätze LPH 6–9 nicht aus dem Gedächtnis, nur aus der Quelle.
3. **Rechnung (N1, Rundungskette D-56):**
   - § 13: lineare Interpolation zwischen den Tafelzeilen, „von“ und „bis“ je für sich:
     `von(aK) = von_u + (aK − aK_u) × (von_o − von_u) / (aK_o − aK_u)`, erst multiplizieren, dann teilen, Ergebnis
     kaufmännisch auf 2 Stellen. Anrechenbare Kosten genau auf einer Tafelzeile: deren Werte.
   - Honorar = round(von + (bis − von) × Honorarsatz / 100, 2); **Honorarsatz in Prozent der Spanne**, 0 = Basishonorarsatz
     (Standard nach § 7 Abs. 1, wenn nichts vereinbart ist), 100 = oberer Honorarsatz. „Mittelsatz“ (50) ist nur eine
     Bezeichnung der Praxis, kein Begriff der HOAI.
   - je beauftragter Leistungsphase round(Honorar × Anteil / 100, 2); Grundhonorar = Summe der Phasen.
   - Umbauzuschlag (§ 6 Abs. 2, § 36) = round(Grundhonorar × Satz / 100, 2); über 33 % (Gebäude) bzw. 50 % (Innenräume): Hinweis,
     kein Fehler. Ohne Satz kein Zuschlag (die App bietet 20 % als Vorschlag an, wenn der Nutzer „Umbau“ wählt).
   - Nebenkosten (§ 14): als Prozent = round((Grundhonorar + Umbauzuschlag) × Satz / 100, 2) oder als Betrag.
   - Umsatzsteuer (§ 16 Abs. 1) = round((Grundhonorar + Umbauzuschlag + Nebenkosten) × Satz / 100, 2); Brutto.
   - Mehrere Objekte: je Objekt für sich, dann summiert; § 11 (Wiederholungen, mehrere Objekte) nicht in v1, Hinweis.
   - Anrechenbare Kosten außerhalb der Tafel (unter der ersten, über der letzten Zeile): Befund `ausserhalb-honorartafel`,
     kein Honorar für dieses Objekt (keine Extrapolation; RifT später). Leistungsbild ohne Tafel: Befund.
4. **Anrechenbare Kosten aus Kosten nach DIN 276** (Gebäude und Innenräume, § 33; netto nach § 4 Abs. 1): KG 300 voll
   (Abs. 1); KG 400, wenn der Auftragnehmer die Technischen Anlagen nicht selbst plant oder überwacht (Abs. 2): voll bis 25 %
   der sonstigen anrechenbaren Kosten, zur Hälfte für den Teil darüber; „sonstige“ = KG 300 plus ein von Hand eingegebener
   Betrag nach Abs. 3 (Herrichten, nichtöffentliche Erschließung, Ausstattung, Kunstwerke, nur wenn geplant oder überwacht);
   mitzuverarbeitende Bausubstanz (§ 4 Abs. 3) von Hand dazu. Jeder Teilbetrag auf 2 Stellen. Andere Leistungsbilder:
   anrechenbare Kosten von Hand. Die Prüfung der Kostenermittlungsstufe (§ 6 Abs. 1 Nr. 2: Kostenberechnung, sonst
   Kostenschätzung) kommt mit Ticket 110.
5. **Ergebnis** je Objekt (anrechenbare Kosten mit Herleitung, Tafelzeilen unten/oben, von, bis, Honorar, Phasenbeträge,
   Umbauzuschlag) und gesamt (Grundhonorar, Umbauzuschläge, Nebenkosten, Netto, USt, Brutto) mit Befunden (U5).
6. **Tests (Q1, C4):** Golden-Tests von Hand aus der Tafel hergeleitet (Herleitung im Test): mindestens ein Fall Gebäude
   Zone III mit aK streng zwischen zwei Zeilen und KG 400 über 25 % (beide Zweige von § 33 Abs. 2), Honorarsatz 50, LPH 1–9,
   Umbauzuschlag, Nebenkosten in Prozent, USt; ein Fall genau auf einer Tafelzeile; je ein Fall Tragwerksplanung und
   Technische Ausrüstung; ein Fall außerhalb der Tafel = Befund. Property-Tests: innerhalb einer Zone monoton in aK;
   Honorarsatz 0 → von, 100 → bis; Summe der Phasen bei 100 % Anteil = Honorar bis auf Rundungsreste (≤ 1 Cent je Phase).

Begriffe zuerst ins `GLOSSARY.md` (L2), Abschnitt „Planerhonorar (HOAI)“: **Honorartafel**, **Honorarspanne** (von/bis),
**Basishonorarsatz**, **oberer Honorarsatz**, **Honorarsatz** (Lage in der Spanne in Prozent; den bestehenden Eintrag
„Honorarzone & Honorarsatz“ an HOAI 2021 anpassen: Basishonorarsatz statt Mindestsatz), **Grundhonorar**, **Nebenkosten**,
**Honorarobjekt**.

## Grenzen

- Nur `packages/honorar` (und die genannten Wurzeldateien). Keine Befehle, kein Speicher (Ticket 110). `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [x] Datentests der Tafeln, Golden- und Property-Tests wie oben; jede Tafel mit Quelle (§, Absatz, URL, Abrufdatum)
- [x] Paketgrenzen-Prüfung kennt `honorar`; Lint-Regel N1 gilt für das Paket
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (bis auf ein Leistungsbudget in
  `vergabe` unter Last, siehe Ergebnis)

## Comments

- **D-101.1 Nähte der Tests.** Frage: An welchen Nähten wird getestet (Skill `tdd`, ohne Nutzer)? Entscheidung: (1) die Daten
  `LEISTUNGSBILDER` (Tafeln, Leistungsphasen, Grenzen), (2) `honorarspanneBerechnen` und `honorarInSpanne` (§ 13, Honorarsatz),
  (3) `anrechenbareKostenHerleiten` (§ 33), (4) `honorarBerechnen` (ganze Kette, Golden-Fälle, Befunde). Grund: Das sind die
  Schritte, die Ticket 110 und 119 einzeln brauchen; alles andere ist intern. Reversible: yes.
- **D-101.2 Tafeln als Abschrift.** Frage: In welcher Form stehen die Tafeln im Repo? Entscheidung: je Tafel ein Textblock,
  Zeile für Zeile wie in der Quelle (ganze Euro, Leerzeichen als Tausendertrenner, Spalten mit `|`), beim Laden streng gelesen
  (falsche Spaltenzahl oder unlesbarer Wert wirft: Datenfehler). Vorschrift, Adresse und Abrufdatum stehen als Kommentar und als
  Datenfeld `quelle` an jeder Tafel und an den Leistungsphasen. Geprüft habe ich jede Zelle zweimal maschinell gegen die
  Quellseiten (einmal die Textblöcke, einmal die geladenen Daten samt Namen und Sätzen der Leistungsphasen, mit einem zweiten,
  unabhängigen Leser der HTML-Seiten); beide Prüfungen: alle 1.240 Tafelzellen und alle Phasen gleich. Grund: Die Abschrift
  lässt sich mit dem Gesetzestext Zeile für Zeile vergleichen; Prettier ändert sie nicht. Reversible: yes.
- **D-101.3 Honorarsatz außerhalb von 0 bis 100.** Entscheidung: wird nach derselben Formel gerechnet, Befund
  `honorarsatz-ausserhalb-spanne` (Warnung). Grund: Seit der HOAI 2021 ist das Honorar frei vereinbar (§ 7 Abs. 1); die Tafel
  ist Orientierung (U5: keine Sperre). Reversible: yes.
- **D-101.4 Anteil je Leistungsphase.** Entscheidung: `BeauftragteLeistungsphase { nummer; anteil? }`; ohne `anteil` gilt der
  Satz der HOAI, ein abweichender Anteil (§ 8 Abs. 2, § 51 Abs. 2–4, § 55 Abs. 2, § 43 Abs. 2/3, § 12 Abs. 2) ersetzt ihn und
  ist ein Befund `anteil-abweichend` (Warnung). Eine Phase, die das Leistungsbild nicht hat (Tragwerksplanung: nur 1–6), zählt
  nicht (`leistungsphase-unbekannt`, Fehler); doppelt beauftragt zählt einmal (`leistungsphase-doppelt`, Fehler). Phasen im
  Ergebnis nach Nummer. Grund: deckt die Sonderfälle der HOAI ohne eigene Regeln je Paragraph ab. Reversible: yes.
- **D-101.5 Lesart § 33.** Entscheidung: `technischeAnlagenAnteilig: true`, wenn der Auftragnehmer die Technischen Anlagen
  nicht selbst fachlich plant oder ihre Ausführung nicht fachlich überwacht (Wortlaut Abs. 2); dann Grenze = round(25 % ×
  sonstige, 2), voll = min(KG 400, Grenze), Hälfte = round((KG 400 − Grenze) / 2, 2); `false`: KG 400 zählt nicht. „Sonstige
  anrechenbare Kosten“ = KG 300 + `weitereKosten` (Abs. 3, von Hand); die mitzuverarbeitende Bausubstanz kommt danach dazu
  (D-56). § 33 nur für Gebäude und Innenräume; sonst Befund `herleitung-nicht-anwendbar` (Fehler) und kein Honorar. Negative
  Eingaben: Befund `wert-negativ` (Warnung), gerechnet wie eingegeben. Reversible: yes.
- **D-101.6 MwSt statt USt.** Entscheidung: `mwstSatz`, `mwst`, `netto`, `brutto` wie im übrigen Projekt; das Glossar sagt, dass
  die MwSt hier die Umsatzsteuer nach § 16 Abs. 1 ist. Grund: L2, kein Synonym. Reversible: yes.
- **D-101.7 Befunde.** Entscheidung: eigener Typ `Honorarbefund { code; schwere: Befundschwere; objekt: Index | null; meldung }`
  (`Befundschwere` aus `vertrag`). `fehler`: ein Teil der Eingabe geht nicht in die Rechnung ein; `warnung`: gerechnet, aber
  auffällig. Folge: je Objekt in Eingabereihenfolge und in der Folge der Rechnung (anrechenbare Kosten, Tafel, Honorarsatz,
  Leistungsphasen, Umbauzuschlag), auch wenn das Objekt kein Honorar hat; danach die übrigen (`mehrere-objekte`, negative
  Nebenkosten oder MwSt). Ein Leistungsbild ohne Tafel (`keine-honorartafel`) gibt es nur bei ungeprüfter Eingabe, weil alle
  sieben Leistungsbilder eine Tafel haben. Reversible: yes.
- **D-101.8 Eine Rundung je Wert.** Entscheidung: Jeder gerundete Wert entsteht als ein exakter Bruch und wird einmal gerundet
  (Interpolation: (w_u × d + (aK − aK_u) × (w_o − w_u)) / d; Honorar: (von × 100 + (bis − von) × Satz) / 100); Phasen,
  Umbauzuschlag, Nebenkosten und MwSt über `prozentVon`. Grund: D-56 wörtlich; per Mutation geprüft, dass die Property-Tests
  eine doppelte Rundung und eine Rundung nur des Zuwachses erkennen. Reversible: yes.
- **D-101.9 § 40, § 44, § 48 mit.** Entscheidung: Die optionalen Tafeln und Phasen (§ 39 Abs. 3, § 43 Abs. 1, § 47 Abs. 1) sind
  enthalten, Umbauzuschlag bis 33 % (§ 40 Abs. 6 über § 36 Abs. 1, § 44 Abs. 6, § 48 Abs. 6). Grund: Die geprüfte Abschrift
  machte sie billig; das Glossar nennt die Leistungsbilder. Reversible: yes.
- **D-101.10 Namen gegenüber dem Plan in Ticket 97.** Übernommen: `art: 'betrag'` (Kosten von Hand) und
  `technischeAnlagenAnteilig`; gleich waren schon `objekte`, `honorarsatz`, `nebenkosten`, `mwstSatz`. Bewusst anders, bitte in
  97 übernehmen oder in 110 abbilden: `Honorarzone` `'I'`–`'V'` (Schreibweise der HOAI und Schlüssel der Tafeldaten; 97 plant
  1–5); `weitereKosten` statt `sonstige` (in § 33 Abs. 2 heißen KG 300 plus diese Kosten „sonstige anrechenbare Kosten“, im
  Ergebnis `sonstigeAnrechenbareKosten`); `mitzuverarbeitendeBausubstanz` statt `bausubstanz` (Glossar); Eingabe
  `umbauzuschlagssatz` (Prozent) neben dem Ergebnis `umbauzuschlag` (Betrag) statt einer Eingabe `umbauzuschlag`; Phasen als
  Liste der beauftragten `{ nummer, anteil? }` statt `{ phase, anteil, beauftragt }`. Die Variante `din-276` trägt die Beträge
  (Eingabe der Rechnung); die gespeicherte Variante `kostenermittlung` aus 97 bildet Ticket 110 darauf ab.
- **D-101.11 Glossar.** „Mitverarbeitete Bausubstanz“ heißt jetzt wie in der HOAI 2021 „Mitzuverarbeitende Bausubstanz“
  (§ 2 Abs. 7, § 4 Abs. 3); „Umbau-/Instandsetzungszuschlag (§ 12)“ ist „Umbauzuschlag (§ 6 Abs. 2, § 36)“, weil § 12 Abs. 2
  der HOAI 2021 die Bewertung der Objektüberwachung erhöht und kein Zuschlag ist (über den Anteil abbildbar). Der Grenztest
  für `honorar` steht in `tools/boundaries.test.mjs` (gehört zur Eintragung in `tools/boundaries.mjs`).
- **Nicht in diesem Ticket:** § 56 Abs. 4 (Anlagen einer Gruppe in mehreren Zonen, Einzelhonorare nach Kostenanteil; v1: je
  Zone ein eigenes Objekt), § 11 Abs. 2–4 (nur Befund `mehrere-objekte`), die Prüfung der Kostenermittlungsstufe nach § 6 Abs. 1
  Nr. 2 (Ticket 110), RifT.

### API (`@tethys/honorar`)

- Daten: `LEISTUNGSBILDER: Record<Leistungsbild, Leistungsbilddaten>` mit `bezeichnung`, `honorartafel` (`quelle`,
  `honorarzonen`, `zeilen: Tafelzeile[]` mit `anrechenbareKosten` und `spannen[zone] = { von, bis }`), `leistungsphasen`
  (`nummer`, `name`, `anteil`), `quelleLeistungsphasen`, `umbauzuschlagBis`, `quelleUmbauzuschlag`, `kostenNachDin276`.
- `honorarspanneBerechnen(tafel, honorarzone, anrechenbareKosten)` → `Ergebnis<Tafelinterpolation { zeileUnten, zeileOben,
  spanne }, 'ausserhalb-honorartafel' | 'honorarzone-unbekannt'>`; `honorarInSpanne(spanne, honorarsatz)` → `Betrag`.
- `anrechenbareKostenHerleiten(KostenNachDin276)` → `AnrechenbareKostenHerleitung` (KG 300, weitere Kosten, sonstige, KG 400,
  Grenze, voll, Hälfte, Bausubstanz, anrechenbare Kosten).
- `honorarBerechnen(Honorarberechnung { objekte: Honorarobjekt[]; nebenkosten; mwstSatz })` → `Honorarergebnis { objekte:
  Objektergebnis[]; grundhonorar; umbauzuschlaege; nebenkosten; netto; mwst; brutto; befunde }`; je Objekt
  `anrechenbareKosten`, `herleitung`, `tafel`, `honorar`, `phasen: Phasenbetrag[]`, `grundhonorar`, `umbauzuschlag`.

### Tafeln (abgerufen am 2026-11-12, https://www.gesetze-im-internet.de/hoai_2013/)

§ 35 Abs. 1 Gebäude und Innenräume (20 Zeilen, 25.000–25.000.000 €, Zonen I–V), § 52 Abs. 1 Tragwerksplanung (20, 10.000–
15.000.000 €, I–V), § 56 Abs. 1 Technische Ausrüstung (20, 5.000–4.000.000 €, I–III), § 40 Abs. 1 Freianlagen (20, 20.000–
1.500.000 €), § 44 Abs. 1 Ingenieurbauwerke (20, 25.000–25.000.000 €), § 48 Abs. 1 Verkehrsanlagen (20, 25.000–25.000.000 €).
Leistungsphasen: § 34 Abs. 3 (Gebäude, Innenräume), § 39 Abs. 3, § 43 Abs. 1, § 47 Abs. 1, § 51 Abs. 1 (nur 1–6), § 55 Abs. 1.
Datentests je Tafel: Quelle, Zonen, Zeilenzahl, erste und letzte Zeile als zweite Abschrift, Zeilen streng steigend, „bis“
der Zone n = „von“ der Zone n+1, von < bis, Spalten steigend; je Leistungsbild Namen, Sätze (Summe 100) und Grenze des
Umbauzuschlags mit Quelle.

### Golden-Fälle (von Hand hergeleitet, Herleitung im Test)

1. Gebäude, Zone III: KG 300 612.345,67 + Abs. 3 18.000,00 = 630.345,67; Grenze 25 % 157.586,42; KG 400 201.234,56 → voll
   157.586,42, Hälfte 21.824,07; Bausubstanz 10.000,00 → aK 819.756,16 (zwischen 750.000 und 1.000.000); von 97.111,33, bis
   121.116,04; Honorarsatz 50 → 109.113,69; LPH 1–9 → Grundhonorar 109.113,68; Umbau 20 % 21.822,74; Nebenkosten 5 % 6.546,82;
   Netto 137.483,24; MwSt 19 % 26.121,82; Brutto 163.605,06.
2. Innenräume, Zone IV, genau auf 500.000: 78.449 / 88.343, Honorarsatz 25 → 80.922,50; Grundhonorar 80.922,52; Nebenkosten
   1.000,00 (Betrag); Netto 81.922,52; MwSt 15.565,28; Brutto 97.487,80.
3. Tragwerksplanung, Zone II, aK 1.111.111,11, Honorarsatz 37,50: von 65.707,78, bis 83.542,22 → 72.395,70 = Grundhonorar
   (LPH 1–6); MwSt 13.755,18; Brutto 86.150,88.
4. Technische Ausrüstung, Zone II, aK 312.345,67, Honorarsatz 50: 65.869,89 / 77.326,02 → 71.597,96; Grundhonorar 71.597,97;
   Umbau 50 % 35.798,99; Nebenkosten 3 % 3.221,91; Netto 110.618,87; MwSt 21.017,59; Brutto 131.636,46.
5. Außerhalb der Tafel: 24.999,99 und 25.000.000,01 → Befund `ausserhalb-honorartafel`, kein Honorar, alle Summen 0,00.
6. Ingenieurbauwerke, Zone III, genau auf 1.000.000, Basishonorarsatz → 81.924,00.
   Dazu: Fälle 3 und 4 zusammen (Grundhonorar 143.993,67, Nebenkosten 3 % 5.393,78, Brutto 220.371,86, Befund
   `mehrere-objekte`); Interpolation mit halbem Cent (aK 750.312,50 → von 89.959,185 → 89.959,19); jede Befundart.

Property-Tests (Orakel in ganzen Cent): Interpolation, innerhalb einer Zone monoton in aK (von, bis und Honorar bei Honorarsatz
0–100), Tafelzeilen genau, außerhalb kein Wert; Honorarsatz 0 → von, 100 → bis, Honorar in der Spanne; § 33; Summe der
Phasen bei 100 % Anteil = Honorar bis auf höchstens 1 Cent je Phase; Phasenbeträge, Umbauzuschlag und Summen der Kette;
deterministisch. Paket: 9 Testdateien, 133 Tests.

### Ergebnis der Suite (Branch `welle-6/101-honorar` nach Merge von `integration/welle-6` @ `74158a2`)

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`: grün (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean-Room).
- `pnpm typecheck`: grün.
- `pnpm test` (Lauf 1, Last ~16 auf 4 Kernen): 215 Dateien grün, 1 rot: `packages/vergabe/src/leistung.test.ts`
  „preisspiegelBerechnen für gross mit 5 Angeboten unter 1000 ms“ maß 1.098,7 ms. Die Datei allein: grün, 413,7 ms. Nicht vom
  Paket `honorar` berührt; Budget nicht gelockert. 2.767 Tests grün, 3 übersprungen; `node --test fixtures/*.test.mjs` 29/29.
- `pnpm test` (Lauf 2, Last ~10–16): 214 Dateien grün, 2 rot, beide Leistungsbudgets außerhalb von `honorar`: wieder
  `vergabe` (1.094,6 ms) und `packages/speicher/src/aufmass-leistung.test.ts` (Ticket 94; Median `AufmasspositionSetzen`
  105,4 ms, Rückgängig 72,9 ms, Wiederholen 64,6 ms). Die Datei allein: grün (34,6 / 38,2 / 32,6 ms). 2.766 Tests grün.
- Alle 133 Tests von `honorar` in beiden Läufen grün.

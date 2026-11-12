# 110: X3: `honorar`: Befehle, anrechenbare Kosten aus einer Kostenermittlung

Status: resolved
Type: task
Welle: 6 · Strang: X3 · Paket: `packages/honorar`
Blocked by: 97, 101 (gleiches Paket)
Modell: opus
Regeln: A3, A5, N1–N3, U5, D-56
Herkunft: Ticket 101 (Rechenkern mit eigenen Typen), Ticket 97 (Vertragstypen)

## What to build

1. **Umstellung auf die Vertragstypen** (`Honorarberechnung`, `Honorarobjekt`, `AnrechenbareKosten`, `Honorarergebnis` aus
   v1.6); Golden- und Property-Tests von Ticket 101 bleiben unverändert grün.
2. **Befehle** (`HonorarberechnungBefehl`, v1.6) mit `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`; Prüfungen
   der Form als Fehler (Phase 1–9 je höchstens einmal, Honorarzone im Bereich des Leistungsbilds, Sätze 0–100), alles
   Fachliche als Befund (U5).
3. **Anrechenbare Kosten aus einer Kostenermittlung** (`KostenermittlungZustand` aus `vertrag`, A3: nicht über `kosten`): KG
   300 = Summe der Einträge mit Nummer 300–399, KG 400 entsprechend (eigener Betrag plus Kinder, D-24; ein Eintrag neben
   Kinderbeträgen ist schon ein Befund der Kostenermittlung), dann § 33 wie in Ticket 101. **§ 6 Abs. 1 Nr. 2:** Grundlage ist
   die Kostenberechnung, ohne sie die Kostenschätzung; eine andere Stufe oder eine Kostenschätzung, obwohl eine
   Kostenberechnung im Projekt existiert, ist ein Befund (die App übergibt die Stufen der Kostenermittlungen des Projekts).
   Hinweis im Ergebnis, dass § 4 Abs. 1 auf DIN 276 in der Fassung 2008-12 verweist (D-56).
4. **Tests:** Golden-Fall aus Ticket 101 über eine Kostenermittlung (KG 300 und 400 über 25 %); Befund bei falscher Stufe;
   Umkehrung.

Aus Ticket 97 und dem Review (D-64, D-66): Von der HOAI nicht vorgesehene Werte (Sätze, Zonen) sind Befunde, keine Fehler; der
Hinweis zu DIN 276:2008-12 (§ 4 Abs. 1) ist kein Befund und nicht Teil des `Honorarergebnis` (App und PDF drucken ihn als festen
Text); die Eingabe von `honorar` hat einen eigenen Namen neben `AnrechenbareKostenangabe` (L2).

## Grenzen

- Nur `packages/honorar`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Befehle, Umkehrung, anrechenbare Kosten aus Kostenermittlung und Stufenprüfung getestet; bestehende Tests grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (bis auf vier Leistungsbudgets
  außerhalb von `honorar` unter Last, alle allein grün; siehe Ergebnis)

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-110.0 Nähte der Tests.** Frage: Wo wird getestet (Skill `tdd`, ohne Nutzer)? Entscheidung: zu den Nähten aus D-101.1
  (`LEISTUNGSBILDER`, `honorarspanneBerechnen`/`honorarInSpanne`, `anrechenbareKostenHerleiten`, `honorarBerechnen`) die drei
  Ausführer (`honorarberechnungBefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`); die Auflösung des Verweises und
  die Stufenprüfung nur über `honorarBerechnen`. Grund: Das sind die Aufrufe von App (119) und `ausgabe` (113); Summieren der
  Kostengruppen und Stufe sind intern. Reversible: yes.
- **D-110.1 Eingabe der Rechnung.** Frage: Wie nimmt `honorarBerechnen` gespeicherte Form und Beträge nach DIN 276 an (97:
  eigener Name nötig; D-66)? Entscheidung: `AnrechenbareKosteneingabe = AnrechenbareKostenangabe | KostenNachDin276`,
  `Honorarobjekteingabe` (= `Honorarobjekt` mit dieser Eingabe) und `Honorarberechnungseingabe { objekte, nebenkosten,
  mwstSatz }` in `honorar`; eine gespeicherte `Honorarberechnung` passt ohne Umbau. Alle übrigen Typen (`Honorarzone`,
  `Leistungsbild`, `Tafelzeile`, `Honorarspanne`, `Tafelinterpolation`, `AnrechenbareKostenHerleitung`, `Honorarergebnis` …)
  kommen aus `vertrag`; `honorar` exportiert sie nicht noch einmal. Grund: L2 (kein zweiter Typ gleichen Namens), Muster
  `Bauzeitenplaneingabe`/`Kostenermittlungseingabe`; die Tests aus 101 bleiben mit den Beträgen nach DIN 276 unverändert in
  den Zahlen. Reversible: yes.
- **D-110.2 Kostenermittlungen als zweites Argument.** Frage: Wie kommen Einträge und Stufen der Kostenermittlungen in die reine
  Rechnung (A2)? Entscheidung: `honorarBerechnen(berechnung, kostenermittlungen: readonly Kostenermittlung[] = [])` mit den
  Kostenermittlungen des Projekts (ganz, mit Einträgen); der Verweis sucht nach Kennung, die Stufenprüfung schaut in dieselbe
  Liste. Fehlt die genannte Kostenermittlung: Befund `kostenermittlung-unbekannt` (`fehler`, kein Honorar für das Objekt), kein
  Wurf (U5; `speicher` hält den Verweis mit `konflikt`). Grund: eine Liste statt Stufen und Einträgen getrennt ist der
  einfachste Aufruf; Kostenermittlungen sind klein (wenige je Projekt). Alternative: Übersichten (`KostenermittlungUebersicht`)
  für die Stufen und nur die genannten ganz. Reversible: yes.
- **D-110.3 KG 300 und KG 400.** Entscheidung: Summe aller Einträge, deren Nummer mit 3 bzw. 4 beginnt (300–399, 400–499);
  bei einer Kostenermittlung mit eigenem Betrag und Kindern ist das dieselbe Zahl wie „eigener Betrag plus Kinder“ (D-24), der
  Befund dazu gehört `kosten`. Danach rechnet der Verweis genau wie `KostenNachDin276` (gleiche Befunde, z. B. `wert-negativ`
  mit `kg400`); Property-Test gegen ein Orakel in ganzen Cent. Reversible: yes.
- **D-110.4 Stufe nach § 6 Abs. 1 Nr. 2.** Entscheidung: zwei Befunde (`warnung`, gerechnet wird trotzdem, Ort
  `/objekte[n]`, `feld: 'anrechenbareKosten'`): `kostenberechnung-vorhanden` (Kostenschätzung, obwohl die Liste eine
  Kostenberechnung hat) und `kostenermittlungsstufe-abweichend` (Kostenrahmen, -anschlag, -feststellung). Kein Befund bei einem
  Leistungsbild ohne § 33 (dort gilt `herleitung-nicht-anwendbar`). Grund: zwei Codes, damit die App verschiedene Texte zeigen
  kann. Reversible: yes.
- **D-110.5 Hinweis DIN 276:2008-12.** Entscheidung: kein Befund, kein Feld, keine Konstante in `honorar` (D-66 MUST 1; die
  Zeile „Hinweis im Ergebnis“ des Tickets entfällt); App und PDF drucken den festen Text. `fixtures/honorar.json` behält
  `befunde: []`.
- **D-110.6 Ort der Befunde.** Entscheidung: `Pruefbefund` mit `quelle: 'honorarberechnung'`, Ort `pfad: '/objekte[n]'` (ab 1)
  und `feld` = Feld des Objekts (`leistungsbild`, `honorarzone`, `honorarsatz`, `anrechenbareKosten`, `leistungsphasen`,
  `umbauzuschlagssatz`); zur ganzen Berechnung nur `feld` (`nebenkosten`, `mwstSatz`), `mehrere-objekte` ohne Ort. Die Meldung
  nennt Teilwerte weiter beim Namen (`kg400 ist negativ …`). `Honorarbefundcode` bleibt als Liste der Codes. Reversible: yes.
- **D-110.7 Form im Ausführer.** Entscheidung: `ungueltige-eingabe` für: Kennung oder Projekt leer (Anlegen), Name oder
  Bezeichnung leer bzw. nur Leerraum, Leistungsbild oder Zone nicht in der Liste des Vertrags, nicht kanonische Sätze und
  Beträge (`alsProzent`/`alsBetrag`, kein Umrechnen), Leistungsphasen keine Liste, Nummer nicht 1–9, nicht streng aufsteigend
  (damit auch doppelt), anrechenbare Kosten weder `betrag` noch `kostenermittlung` (auch `din-276`: keine gespeicherte Form),
  Kennung der Kostenermittlung leer, `technischeAnlagenAnteilig` kein Wahrheitswert, Nebenkosten keiner der drei Fälle.
  `feld` nennt das Objekt: `objekte[n].honorarsatz` (ab 1, wie der Pfad der Befunde), bei den Kosten
  `objekte[n].anrechenbareKosten`. Angenommen (Befund der Rechnung, D-97.12): Satz außerhalb 0–100, Zone oder Phase, die das
  Leistungsbild nicht hat, Umbauzuschlag über der Grenze, negative Werte, abweichender Anteil, keine Phase. Gespeichert wird
  die kanonische Form (genau die Felder des Vertrags in seiner Reihenfolge, fremde Felder fallen weg, ein fehlender Anteil
  bleibt ohne Schlüssel), wie bei der Rechnung (Ticket 81). Nicht aufsteigende Phasen werden abgewiesen, nicht sortiert (enge
  Lesart des Vertragstexts). Reversible: yes.
- **D-110.8 Gespeicherte Form der Fixture.** Frage: `fixtures/honorar.json` trägt Beträge nach DIN 276 (D-64: 110/119 bilden
  ab). Entscheidung: Abbildung im Test (`honorar-fixture.test.ts`, Funktion `gespeichert`): `{ art: 'kostenermittlung',
  kostenermittlungId: <id der Kostenermittlung der Datei>, technischeAnlagenAnteilig, weitereKosten,
  mitzuverarbeitendeBausubstanz }`; mit der Kostenberechnung der Datei ergibt sie genau die Sollwerte (Brutto 267.595,90, keine
  Befunde), auch über `HonorarberechnungAnlegen` und das angewandte ChangeSet. Die Fixture selbst bleibt unverändert (P2);
  braucht 119 die gespeicherte Form in der Datei, ergänzt sie ein Fixture-Ticket.

### Ergebnis (Branch `welle-6/110-honorar-befehle`, Basis `integration/welle-6` @ `064aa25`)

Dateien in `packages/honorar/src/`: umgestellt `honorartafeln.ts`, `leistungsbilder.ts`, `honorarspanne.ts`,
`anrechenbare-kosten.ts`, `honorar-berechnen.ts`, `index.ts`; neu `honorarberechnung-befehle.ts`. Tests neu:
`honorar-kostenermittlung.test.ts` (Golden-Fall 1 aus 101 über eine Kostenberechnung mit Einträgen auf zweiter und dritter
Ebene, Stufen, Verweis ohne Kostenermittlung, Leistungsbild ohne § 33, negative Summe),
`honorar-kostenermittlung-eigenschaften.test.ts`, `honorarberechnung-befehle.test.ts` (Anlegen, Setzen gegen das
Vertragsbeispiel, Löschen, Zuständigkeit, 26 Formfehler und die Stelle des Objekts im Feld, 12 angenommene HOAI-fremde Werte,
kanonische Form, Anwenden, Umkehrung je Befehl), `honorar-fixture.test.ts` (Tor X3 auf beiden Wegen und über den Befehl;
Vertragsbeispiel `beispielHonorarberechnung` → `beispielHonorarergebnis`). Bestehende Tests aus 101: nur Typnamen und die Form
der Befunde angepasst (`x.objekt` → `x.ort.pfad`), alle Zahlen gleich. Paket: 13 Dateien, 203 Tests.

Prüfung nach `git merge integration/welle-6` (`da0f820`): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` grün (ESLint,
Prettier, Paketgrenzen, Lizenzen, Clean-Room); `pnpm typecheck` grün; `pnpm test`: 250 Dateien grün, 1 übersprungen, 4 rot,
alle Leistungsbudgets außerhalb von `honorar` bei Last 20–23 auf 4 Kernen: `kern/k9-leistung` 16,25 ms (< 16),
`speicher/aufmass-leistung` 109,2 ms (< 100), `vergabe/leistung` 1.324 ms (< 1.000), `apps/web/src/abrechnung/leistung`
107,6 ms (< 100); 3.296 Tests grün, 3 übersprungen. Jede Datei allein (nacheinander, Last weiter ~23): `kern` und `speicher`
grün im ersten Lauf, `vergabe` (1.125,6 ms) und `apps/web` (102,1 ms) im ersten Lauf rot, im zweiten und dritten Lauf grün.
Kein Budget gelockert. `node --test fixtures/*.test.mjs` 53/53 (eigens gestartet, weil `pnpm test` nach Vitest abbricht).

Zweiter Lauf nach erneutem `git merge integration/welle-6` @ `aca2dcb` (Nachtrag 97 zu D-66, Glossar nennt
`AnrechenbareKosteneingabe` wie hier): Lint grün, Typecheck grün; `pnpm test` 247 Dateien grün, 1 übersprungen, 7 rot, alle
Leistungsbudgets außerhalb von `honorar` bei Last ~30: `gaeb/lesen` 1.621 ms (< 1.000), `kern/k9-leistung` 21,1 ms (< 16),
`kern/lv-pruefung-fixtures` 205,6 ms (< 50), `kern/mengenansatz-leistung` 21,9 ms (< 16), `speicher/aufmass-leistung` 138,9 ms
(< 100), `vergabe/leistung` 2.286 ms (< 1.000), `apps/web/src/abrechnung/leistung` 276,4 ms (< 100); 3.297 Tests grün. Jede Datei
allein nacheinander: alle sieben grün im ersten Lauf. `node --test fixtures/*.test.mjs` 53/53. Kein Budget gelockert.

### Folgearbeit und offene Fragen

- **Glossar (nicht in diesem Ticket, P2):** Eintrag „Honorarberechnung“ nennt im Code noch `Honorarbefund`; jetzt `Pruefbefund`
  mit Quelle `honorarberechnung`, `Honorarbefundcode`. Neu im Code: `AnrechenbareKosteneingabe`, `Honorarobjekteingabe`,
  `Honorarberechnungseingabe` (D-66 SHOULD 7 plant den Glossarnamen der Eingabe im Nachtrag zu 97).
- **119 (App):** `honorarBerechnen(zustand.honorarberechnung, kostenermittlungen)` mit allen Kostenermittlungen des Projekts
  (ganz); Texte für `kostenermittlung-unbekannt`, `kostenberechnung-vorhanden`, `kostenermittlungsstufe-abweichend`; Formfehler
  kommen mit `feld: 'objekte[n].<feld>'`.
- **113 (`ausgabe`):** liest `Honorarergebnis.befunde` als `Pruefbefund`.

## Answer

Gemergt mit `9d40c2f` (Branch `welle-6/110-honorar-befehle`, `93cc7f8`). `honorar` auf v1.6-Typen, Befehle, `honorarBerechnen(berechnung,
kostenermittlungen)` mit § 6-Stufenprüfung (Warnung); `fixtures/honorar.json` über eine Kostenberechnung Brutto 267.595,90 ohne Befund.
Für die Review-Behebung: Glossareintrag „Honorarberechnung“ nennt noch `Honorarbefund`.

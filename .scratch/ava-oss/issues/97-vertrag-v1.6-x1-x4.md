# 97: `vertrag` v1.6: Typen für X1 BIM, X2 Bauzeitenplan, X3 HOAI, X4 Bauleitung

Status: resolved
Type: task
Welle: 6 · Strang: F · Paket: `packages/vertrag` (dazu nur mechanische, markierte Zeilen in den Paketen, die die Typen nutzen)
Blocked by: 95
Modell: opus
Regeln: A4–A9, N1–N3, U5, Q5, ADR 0009, ADR 0011, P9 (ersetzt durch Opus-Review, D-59), L2
Herkunft: `plan.md` §2 X1–X4; Entscheidungen D-50 bis D-59 (Berater, Welle 6)

## What to build

Eine Fassung v1.6 im Stil von Ticket 29, 53, 70 und 95: enge, umkehrbare Lesart im Typ, jede Lesart als Kommentar am Typ,
Alternativen als „Offene Typfragen“ unter Comments, Nicht-Additives (Pflichtfelder, neue Glieder geschlossener Listen) nur mit
der mechanischen Anpassung im selben Ticket (markiert `// v1.6: mechanisch angepasst, Folgeticket`). Keine Logik außerhalb
von `vertrag`: Die Handler kommen in den Tickets 105–111; bis dahin weisen Kern und Speicher Neues mit
`befehl-nicht-zustaendig` bzw. `unbekannt` ab, wie bei v1.3/v1.4.

Grundlage sind **D-50 bis D-57**; lies sie ganz. Lies auch die Tickets 98, 101 und 102 und, falls schon auf
`integration/welle-6` gemergt, deren Typen in `packages/ifc`, `packages/honorar`, `packages/bauzeit`: Die Rechenkerne laufen in
Stufe 1 mit eigenen Typen in der Form unten und stellen in Stufe 2 auf deine Typen um. Gleiche Wörter verwenden (L2); weichst du
ab, begründe es und nenne die Umbenennung für die Folgetickets.

1. **Bauwerksmodell (X1, D-50, D-51, D-53).** Marken `BauwerksmodellId` (UUIDv7, `IdQuelle.bauwerksmodell()`) und
   `IfcGlobalId` (22 Zeichen, IFC-Base64-Alphabet `0-9A-Za-z_$`; erzeugt im Paket `ifc`, wie `Kostengruppennummer` in `kosten`).
   `IfcSchema = 'IFC2X3' | 'IFC4'`. `Modelldatei { hash (SHA-256 der unkomprimierten Bytes, 64 Hexziffern klein);
   dateiname; groesse (Bytes) }`. `Bauteilmenge { satz: string | null; name: string; art: 'laenge' | 'flaeche' | 'volumen' |
   'anzahl' | 'gewicht' | 'zeit'; wert: Menge }` (Wert in SI-Grundeinheit m, m², m³, Stück, kg, s; 3 Stellen).
   `Strukturknoten { globalId; art: 'projekt' | 'grundstueck' | 'gebaeude' | 'geschoss' | 'raum'; name: string | null;
   elternGlobalId: IfcGlobalId | null; mengen: readonly Bauteilmenge[] }`. `Bauteil { globalId; ifcKlasse: string; name:
   string | null; typ: string | null; strukturGlobalId: IfcGlobalId | null; teilVonGlobalId?: IfcGlobalId; kostengruppe?:
   Kostengruppennummer (nur Vorschlag aus einer DIN-276-Klassifikation der Datei); mengen: readonly Bauteilmenge[] }`.
   `Bauwerksmodell { id; projektId; name; datei: Modelldatei; schema; vorgaengerId: BauwerksmodellId | null; eingelesen:
   string (JJJJ-MM-TT, von der App); struktur: readonly Strukturknoten[]; bauteile: readonly Bauteil[] }`,
   `BauwerksmodellZustand`. Nach dem Anlegen unveränderlich bis auf den Namen. Eigenschaften (Psets) stehen **nicht** im Typ
   (D-51). Befehle (`BauwerksmodellBefehl`, Ausführer `bim`, Ticket 108): `BauwerksmodellAnlegen { modell }` (**Massenbefehl**,
   in `MASSENBEFEHLSARTEN`), `BauwerksmodellUmbenennen { id; name }`, `BauwerksmodellLoeschen { id }`. ChangeSet so, dass
   Umbenennen und sein Undo nicht 10.000 Bauteile kopieren (z. B. Kopf-ChangeSet fürs Umbenennen, ganzes Aggregat nur für
   Anlegen und Löschen; D-45); die Bytes stehen nie im ChangeSet (D-51).
2. **Modelldateien (D-51).** Kein Befehl: eine inhaltsadressierte Ablage am `Speicher`, z. B. `modelldateien: {
   ablegen(bytes: Uint8Array) → Ergebnis<Modelldatei['hash'], Speicherfehler>; laden(hash) → Ergebnis<Uint8Array, …>;
   vorhanden(hash) → Ergebnis<boolean, …> }`. Lesarten am Typ: Ablegen ist idempotent; `BauwerksmodellAnlegen` mit einem Hash,
   der nicht abgelegt ist, ist `konflikt`; Bytes bleiben, solange ein Modell sie nennt; die Freigabe ungenutzter Bytes und ihr
   Zeitpunkt (die Undo-Historie lebt nur in der Sitzung, ADR 0006) stehen am Typ. `Projektdatei` bekommt optional
   `bauwerksmodelle?` und `modelldateien?: readonly { hash; inhalt: string /* deflate-raw, Base64 */ }[]` (fehlt = keine);
   Prüfsummen vergleichen den SHA-256 der unkomprimierten Bytes, nie den komprimierten Text.
3. **Zuordnung Bauteil ↔ Position (X1c, D-52).** `Bauteilzuordnung { globalId: IfcGlobalId; mengenart: string }`
   (`mengenart` = Name einer `Bauteilmenge` oder fest `'Stueck'`, dann zählt jedes Bauteil 1), `Positionsdaten.bauteile?:
   readonly Bauteilzuordnung[]` (fehlt = keine; nie leer gespeichert), Befehl `BauteileZuordnen { positionId; bauteile:
   readonly Bauteilzuordnung[] | null }` (ganze Liste) als **ein** Typ in `LvBefehl` und `AuftragsLvBefehl` (wie
   `KostengruppeSetzen`). Lesarten am Typ: nur an Positionen (sonst `knotenart-unzulaessig`, v1.5); dasselbe Paar zweimal →
   `ungueltige-eingabe`; der Kern prüft keine GlobalId gegen ein Modell (A3), hängende Zuordnungen sind ein Befund der App;
   Kopieren einer Position verwirft ihre Zuordnungen, Verschieben behält sie; ein LV-Stand trägt sie; der Zuschlag übernimmt
   sie ins Auftrags-LV (prüfe `zuschlagErteilen` in `vergabe`; verliert es das Feld, als Folgearbeit für Ticket 105 nennen);
   der GAEB-Export schreibt sie nicht. Offene Typfrage (D-53): `Ansatzzeile` hat kein Feld für die GlobalId.
4. **Bauzeitenplan (X2, D-57).** Marken `BauzeitenplanId`, `VorgangId` (+ `IdQuelle`). `Wochentag` (1–7, ISO, 1 = Montag),
   `Bundesland` (die 16 Kürzel nach ISO 3166-2:DE), `Arbeitskalender { arbeitstage; bundesland: Bundesland | null; freieTage:
   readonly string[] }`, `Anordnungsart = 'ende-anfang' | 'anfang-anfang' | 'ende-ende' | 'anfang-ende'`,
   `Anordnungsbeziehung { vorgaengerId; art; abstand: number (ganze Arbeitstage, auch ≤ 0) }`, `Vorgang { id; nummer: string |
   null; bezeichnung; elternId: VorgangId | null; dauer: number (ganze Arbeitstage ≥ 0; 0 = Meilenstein); vorgaenger: readonly
   Anordnungsbeziehung[]; fruehesterBeginn: string | null; bezug: Vorgangsbezug | null; ist: { beginn: string | null; ende:
   string | null; fortschritt: Prozent | null } | null }` (Bezug auf Knoten eines LV oder Auftrags-LV; Form entscheiden),
   `Bauzeitenplan { id; projektId; name; projektbeginn (JJJJ-MM-TT); kalender; vorgaenge }`, `BauzeitenplanZustand`. Nur
   Eingaben werden gespeichert. Gerechnet und nie gespeichert (von `bauzeit` erzeugt, von App und `ausgabe` gelesen, deshalb
   im Vertrag): `Vorgangstermine { vorgangId; beginn; ende; spaetesterBeginn; spaetestesEnde; gesamtpuffer; freierPuffer;
   kritisch }`, `Terminplan { termine; projektende; kritischerWeg; befunde }`. Befehle (`BauzeitenplanBefehl`, Ausführer
   `bauzeit`, Ticket 109): Anlegen, Kopf setzen (Name, Projektbeginn, Kalender), Vorgang setzen (anlegen oder ersetzen, mit
   Lage), Vorgang entfernen (Lesart für Kinder und Beziehungen auf ihn festlegen), Löschen. ChangeSet als ganzes Aggregat
   (Messung bei 1.000 Vorgängen in Ticket 106; über dem Budget folgt `Aenderungen<Vorgang>`, D-57).
5. **Honorarberechnung (X3, D-56).** Marke `HonorarberechnungId`. `Leistungsbild = 'gebaeude' | 'innenraeume' |
   'freianlagen' | 'ingenieurbauwerke' | 'verkehrsanlagen' | 'tragwerksplanung' | 'technische-ausruestung'`, `Honorarzone` (1–5;
   welche ein Leistungsbild kennt, prüft `honorar`), `AnrechenbareKosten = { art: 'betrag'; betrag } | { art:
   'kostenermittlung'; kostenermittlungId; technischeAnlagenAnteilig: boolean; sonstige: Betrag | null; bausubstanz: Betrag |
   null }`, `Honorarobjekt { bezeichnung; leistungsbild; honorarzone; honorarsatz: Prozent (0 = Basishonorarsatz);
   anrechenbareKosten; leistungsphasen: readonly { phase (1–9); anteil: Prozent; beauftragt: boolean }[]; umbauzuschlag:
   Prozent | null }`, `Honorarberechnung { id; projektId; name; objekte; nebenkosten: { art: 'prozent'; satz } | { art:
   'betrag'; betrag } | null; mwstSatz: Prozent }`, `HonorarberechnungZustand`. Gerechnet, nie gespeichert:
   `Honorarergebnis` (je Objekt und gesamt, mit Befunden; Form nach Ticket 101). Befehle (`HonorarberechnungBefehl`,
   Ausführer `honorar`, Ticket 110): Anlegen, Setzen (ganzer Inhalt), Löschen; ChangeSet als ganzes Aggregat. Eine
   Kostenermittlung, auf die eine Honorarberechnung verweist, lässt sich nicht löschen (`konflikt`, Q5).
6. **Mängel und Bautagebuch (X4, D-57).** Marken `MangelId`, `BautagebucheintragId`. `Mangelstatus = 'offen' | 'angezeigt' |
   'beseitigt' | 'abgenommen'` (weitere Zustände nur mit Grund; beseitigt → offen ist erlaubt), `Mangelverlaufseintrag {
   status; datum; bemerkung: string | null }`, `Mangel { id; projektId; nummer (≥ 1, je Projekt eindeutig); titel;
   beschreibung: string | null; ort: string | null; auftragsLvId: AuftragsLeistungsverzeichnisId | null; positionId: PositionId |
   null; bauteil: { bauwerksmodellId: BauwerksmodellId | null; globalId: IfcGlobalId } | null; festgestellt (JJJJ-MM-TT);
   frist: string | null; verlauf: readonly Mangelverlaufseintrag[] (≥ 1; der Status ist der letzte Eintrag) }`.
   `Bautagebucheintrag { id; projektId; datum (je Projekt eindeutig); wetter: { beschreibung: string | null; temperaturMin:
   number | null; temperaturMax: number | null }; arbeitskraefte: readonly { firma: string; anzahl: number }[]; geraete:
   string | null; leistungen: string | null; behinderungen: string | null; vorkommnisse: string | null }` (ganze Zahlen für
   Grad und Köpfe; N1 betrifft sie nicht). Befehle (`MangelBefehl`, `BautagebuchBefehl`, Ausführer `bauleitung`, Ticket 111):
   Mangel anlegen, setzen (Felder ohne Verlauf), Status setzen (hängt einen Verlaufseintrag an), löschen; Bautagebucheintrag
   setzen (anlegen oder ersetzen), löschen. Kleine ChangeSets je Aggregat. Keine Fotos in v1.6.
7. **Befundquelle** für IFC-Lesen, Modellprüfung, Terminrechnung, Honorarrechnung und Bauleitung, soweit die gemeinsame
   Befundliste sie braucht (wie in v1.5 für die E-Rechnung).
8. **Rand.** `AggregatBezug` um die neuen Aggregate; `Befehl` und `ChangeSet` erweitert; Signaturen
   `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren` je neuem Aggregat (wie Aufmaß, Rechnung,
   Kostenermittlung); Repositories am `Speicher`: `bauwerksmodelle` (`auflisten(projektId)` mit einer Übersicht **ohne**
   Struktur und Bauteile, `laden(id)`), `bauzeitenplaene`, `honorarberechnungen` (je `auflisten(projektId)`, `laden(id)`),
   `maengel` (`auflisten(projektId)` ganz, nach Nummer), `bautagebuch` (`auflisten(projektId)` ganz, nach Datum),
   `modelldateien` (Punkt 2); `Projektdatei` mit optionalen Listen (fehlt = keine, wie `aufmasse`); Löschregeln (`konflikt`):
   Projekt mit diesen Aggregaten, Kostenermittlung in einer Honorarberechnung, Auftrags-LV oder Modell, auf das ein Mangel
   verweist (oder Lesart „Verweis bleibt, Befund“ – entscheiden), Modell mit Nachfolger (`vorgaengerId`) – entscheiden.
9. **Beispiele und Typtests** in `beispiele.ts`/`vertrag.test.ts` für jeden neuen Typ (wie bisher).

Begriffe zuerst ins `GLOSSARY.md` (L2), abgeglichen mit den Einträgen aus 98, 101, 102 (falls gemergt): Bauwerksmodell,
Modelldatei, Strukturknoten, Bauteil, Bauteilmenge, Mengenart, Bauteilzuordnung, GlobalId, NRF (DIN 277; das Glossar kennt nur
NF); Bauzeitenplan-Begriffe; Honorarberechnung, Honorarobjekt, Honorarergebnis, Leistungsbild; Mangel, Mangelstatus,
Mängelverlauf, Bautagebucheintrag.

## Grenzen

- Nur `packages/vertrag`, dazu markierte mechanische Zeilen in den Verbrauchern (Kern und Speicher weisen Neues ab). Keine
  Logik. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Typen mit Kommentar im Stil von `vertrag`; Lesarten D-50 bis D-57 am Typ; Offene Typfragen unter Comments
- [x] Jede mechanische Anpassung markiert, Liste in den Comments; Folgearbeit je Paket als Stichpunkt für die Tickets 105–121
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Ergebnis (Branch `welle-6/97-vertrag-v1.6`, Basis `integration/welle-6`)

Typen, Lesarten, Beispiele und Typtests in `packages/vertrag/src/`: neu `bim.ts` (X1), `bauzeit.ts` (X2), `honorar.ts` (X3),
`bauleitung.ts` (X4); erweitert `marken.ts`, `modell.ts`, `befehle.ts`, `changeset.ts`, `speicher.ts`, `gaeb.ts`, `index.ts`,
`beispiele.ts`, `vertrag.test.ts`, `inhaltsmodell.test.ts`; `GLOSSARY.md`; dazu die markierten mechanischen Zeilen (Liste unten).
Die Modelltypen der vier Module stehen in eigenen Dateien, weil `modell.ts` schon rund 1.000 Zeilen hat; Befehle, ChangeSets,
Signaturen und Repositories bleiben, wo sie seit v1.1 stehen. Je Punkt ein Commit (1–9), das Glossar vorweg; zwischendurch
dreimal `integration/welle-6` gemergt (Tickets 96, 98–102, 112 gemergt). Kein Rechenwert, keine Fixture, kein Golden geändert.

### Je Punkt: Datei und Typ

1. **Bauwerksmodell** (`4144dd8`). `marken.ts`: `BauwerksmodellId`, `IfcGlobalId` (Formzusage, D-97.4). `bim.ts`: `IfcSchema`,
   `Modelldatei { hash, dateiname, groesse }`, `Bauteilmenge { satz, name, art, wert: Menge }`, `Strukturknoten`, `Bauteil`
   (`teilVonGlobalId?`, `kostengruppe?`; keine Eigenschaften, Klassifikationen, Materialien, D-51), `BauwerksmodellKopf`,
   `Bauwerksmodell`, `BauwerksmodellInhalt`. `befehle.ts`: `BauwerksmodellAnlegen { bauwerksmodell }` (Massenbefehl),
   `BauwerksmodellUmbenennen { name }`, `BauwerksmodellLoeschen`, `BauwerksmodellBefehl` (D-97.2). `changeset.ts`:
   `BauwerksmodellZustand`, `BauwerksmodellChangeSet { kopf; inhalt? }` (D-97.3). `speicher.ts`: `Massenbefehlskopf` mit dem Kopf.
2. **Modelldateien** (`489306e`). `speicher.ts`: `Modelldateiablage { ablegen, laden, vorhanden }` an `Speicher.modelldateien`
   mit den Lesarten (idempotent, `konflikt` beim Anlegen ohne Bytes, Freigabe beim Öffnen, D-97.5); `Projektdatei.bauwerksmodelle?`,
   `.modelldateien?` (deflate-raw, Base64, vollständig, Hash der entpackten Bytes); `Speicherfehlercode` + `datei-zu-gross`.
3. **Zuordnung Bauteil ↔ Position** (`26672c1`). `bim.ts`: `Bauteilzuordnung { globalId, mengenart }`; `modell.ts`:
   `Positionsdaten.bauteile?`; `befehle.ts`: `BauteileZuordnen { positionId, bauteile | null }` als ein Typ in `LvBefehl` und
   `AuftragsLvBefehl` (D-97.7). `zuschlagErteilen` (vergabe) und `nachtragUebernehmen` (abrechnung) übernehmen das Feld schon
   (`{ ...k }`); geprüft, keine Folgearbeit in `vergabe`.
4. **Bauzeitenplan** (`ec025b1`). `marken.ts`: `BauzeitenplanId`, `VorgangId`. `bauzeit.ts`: `Wochentag`, `Bundesland`,
   `Arbeitskalender`, `Anordnungsart`, `Anordnungsbeziehung`, `Isttermine`, `Vorgangsbezug` (D-97.8), `Vorgang`,
   `BauzeitenplanKopf`, `Bauzeitenplan`; gerechnet `Vorgangsart`, `Vorgangstermine`, `Vorgangsergebnis`,
   `Bauzeitenplanergebnis` (D-97.10). `befehle.ts`: `BauzeitenplanAnlegen`, `BauzeitenplankopfSetzen`, `VorgangSetzen { vorgang,
   nach }`, `VorgangEntfernen`, `BauzeitenplanLoeschen` (D-97.9). `changeset.ts`: `BauzeitenplanZustand`,
   `BauzeitenplanChangeSet` (ganzes Aggregat). Das Beispielergebnis ist beim Schreiben gegen `bauzeitenplanBerechnen` geprüft.
5. **Honorarberechnung** (`f81934b`). `marken.ts`: `HonorarberechnungId`. `honorar.ts`: `Leistungsbild`, `Honorarzone`
   (`'I'`–`'V'`), `Leistungsphasennummer`, `BeauftragteLeistungsphase`, `AnrechenbareKostenangabe` (`betrag` oder
   `kostenermittlung`), `Honorarobjekt`, `Nebenkostenangabe`, `Honorarberechnung`; gerechnet `Honorarspanne`, `Tafelzeile`,
   `Tafelinterpolation`, `AnrechenbareKostenHerleitung`, `Phasenbetrag`, `Objektergebnis`, `Honorarergebnis` (D-97.12).
   `befehle.ts`: `HonorarberechnungAnlegen`, `HonorarberechnungSetzen`, `HonorarberechnungLoeschen`; Lesart `konflikt` an
   `KostenermittlungLoeschen`. `changeset.ts`: Zustand, ChangeSet. Das Beispielergebnis ist der Golden-Fall 1 aus Ticket 101,
   mit `honorarBerechnen` gerechnet.
6. **Mängel und Bautagebuch** (`f5f385f`). `marken.ts`: `MangelId`, `BautagebucheintragId`. `bauleitung.ts`: `Mangelstatus`,
   `Mangelverlaufseintrag`, `Mangel`, `Bautagebucheintrag`. `befehle.ts`: `MangelAnlegen`, `MangelangabenSetzen`,
   `MangelstatusSetzen { eintrag }`, `MangelLoeschen`, `BautagebucheintragSetzen`, `BautagebucheintragLoeschen`, `MangelBefehl`,
   `BautagebucheintragBefehl` (D-97.13). `changeset.ts`: Zustände, ChangeSets; `Befehlsfehlercode` + `statuswechsel-unzulaessig`.
7. **Befundquellen** (`aadf8ab`). `gaeb.ts`: `Befundquelle` + `ifc-lesen`, `modell-pruefung`, `terminrechnung`,
   `honorarberechnung`, `fristpruefung`; `Befundort` + `globalId?`, `vorgangId?`, `mangelId?` und je Quelle eine Lesart (D-97.11).
8. **Rand** (`4a7da46`). `AggregatBezug` und `ChangeSet` um die fünf Aggregate; `Befehl` (je Punkt erweitert); Signaturen
   `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren` je Aggregat (Mangel und Bautagebucheintrag mit Bestand, D-57);
   `BauwerksmodellUebersicht` (Kopf + `anzahlBauteile`), `BauwerksmodellRepository`, `BauzeitenplanUebersicht`,
   `BauzeitenplanRepository`, `HonorarberechnungUebersicht`, `HonorarberechnungRepository`, `MangelRepository` (ganz, nach
   Nummer), `BautagebuchRepository` (ganz, nach Datum), alle Pflicht am `Speicher`; `Projektdatei.bauzeitenplaene?`,
   `.honorarberechnungen?`, `.maengel?`, `.bautagebuch?`; `konflikt`-Lesarten an `Speicher` und `ProjektLoeschen` (D-97.6);
   `IdQuelle` + `bauwerksmodell()`, `bauzeitenplan()`, `vorgang()`, `honorarberechnung()`, `mangel()`, `bautagebucheintrag()`.
9. **Beispiele und Typtests** (`f508219` und je Punkt): Abschnitte „v1.6 Punkt 1“ bis „Punkt 9“ in `vertrag.test.ts`; jeder neue
   Befehl und jedes neue ChangeSet hat ein Beispiel; `NurDaten` über `Befehl`, `ChangeSet`, `Protokolleintrag`, `Projektdatei`;
   JSON-Rundweg; Werte vor v1.6 bleiben gültig. Die Tests aus v1.4/v1.5, die geschlossene Listen ganz nennen (`AggregatBezug`,
   `ChangeSet`, `AuftragsLvBefehl`, `Befehlsfehlercode`, `Befundquelle`, `MASSENBEFEHLSARTEN`), prüfen jetzt den alten Teil
   (`Exclude<…>`) mit einem Verweis auf v1.6.

**Glossar** (`0ed603e`, `5c0087e`, `f162bef`, `75a5139`, `6f85996`): die Einträge aus 98 und 102 wortgleich übernommen (D-97.1);
neu Modellstand, Modelldatei, Modellansicht (für Ticket 100), Bauteilzuordnung, Mengenart, Vorgangsbezug, Mangel, Mangelstatus,
Mängelverlauf, Fristprüfung, Bautagebucheintrag; NRF beim Kostenkennwert; die neuen Quellen beim Prüfbefund; gespeicherte Form
bei „Anrechenbare Kosten“ und „Honorarberechnung“.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-97.0** Welche Nähte werden getestet? **Die öffentliche Typfläche von `@tethys/vertrag`** (`expectTypeOf`, geprüft von
  `pnpm typecheck`) und die Stimmigkeit der Beispiele zur Laufzeit; für die mechanischen Zeilen je eine Testdatei
  `vertrag-v16.test.ts` in `kern` und `speicher` (Abweisen statt still verwerfen). Grund: wie D-95.0; `vertrag` hat keine Logik.
  Die Beispielergebnisse von X2 und X3 habe ich beim Schreiben mit `bauzeit` und `honorar` nachgerechnet (Wegwerftest, nicht
  im Branch), damit die Vertragsbeispiele keine zweite Lesart der Rechnung erfinden.
- **D-97.1** Glossar vor dem Merge von 98/102? **Ihre Einträge wortgleich übernommen** (Cherry-Pick der Glossar-Commits
  `d3a5d84`, `ea4fb6b`, Glossarteil von `2f4f902`), meine Einträge daneben. Grund: L2 verlangt die Begriffe vor dem Code; gleiche
  Zeilen mergen später ohne Konflikt (beim Merge von 98 trat nur am Rand meines Blocks einer auf, aufgelöst).
- **D-97.2** Befehle am Bauwerksmodell: **Feld `bauwerksmodell` statt `modell`** (wie `AufmassAnlegen.aufmass`,
  `RechnungAnlegen.rechnung`), **Umbenennen und Löschen ohne `id`** (der Zustand und `Protokolleintrag.aggregat` nennen das
  Aggregat, wie bei jedem Befehl seit v1.1). Grund: L2, eine Schreibweise; Abweichung vom Arbeitsnamen im Ticket.
- **D-97.3** ChangeSet des Bauwerksmodells: **`kopf: Aenderung<BauwerksmodellKopf>` immer, `inhalt?: Aenderung<Struktur und
  Bauteile>` nur beim Anlegen und Löschen**, Umkehrung durch Tausch in beiden. Grund: Umbenennen und Undo kopieren keine
  10.000 Bauteile (D-45, D-54); die Form gleicht `LvChangeSet` (Kopf + Inhalt); `speicher` vergleicht beim Umbenennen und Löschen
  nur den Kopf, weil der Inhalt unveränderlich ist.
- **D-97.4** X1-Formen: **`IfcGlobalId` sagt die Form zu**; ein Objekt der Datei ohne GlobalId in Form kommt nicht ins Modell
  (Befund, Bytes bleiben). **`Bauteilmenge.wert: Menge`** ohne `null` (vom Orchestrator bestätigt: 107 lässt Mengen ohne Wert
  mit Befund weg, nie 0). `teilVonGlobalId?` und `kostengruppe?` optional wie im Ticket (in `ifc` `| null`, 107 bildet ab).
  Doppelte GlobalIds bleiben (D-50). Verweise innerhalb des Modells nennen ein Objekt desselben Modells. Die Liste trägt
  `anzahlBauteile` (Ticket 114 zeigt sie), sonst nur den Kopf.
- **D-97.5** Modelldateien: **Ablage am `Speicher`, kein Befehl, idempotent; Freigabe ungenutzter Bytes nur beim Öffnen**
  (eine Sitzung je Datenbank, E-14), weil Undo nur in der Sitzung lebt (ADR 0006); `konflikt` für ein Anlegen, dessen Hash
  nicht (in dieser Größe) abgelegt ist; Projektdatei vollständig (jeder genannte Hash genau einmal, sonst `datei-ungueltig`);
  eigener Code **`datei-zu-gross`** für den Export über der Grenze für Zeichenketten (106 verlangt „eigener Fehler“).
- **D-97.6** Löschregeln, stark oder schwach: **stark (`konflikt`)**: Mangel → Auftrags-LV und → Bauwerksmodell, Modell →
  Vorgänger (also kein Löschen eines Stands mit Nachfolger), Honorarberechnung → Kostenermittlung, Projekt mit den neuen
  Aggregaten; **schwach (Befund der App)**: `Vorgangsbezug`, `Mangel.positionId`, Bauteilzuordnung gegen ein Modell. Grund:
  stark ist die enge, umkehrbare Lesart (später lockern braucht keine Migration) und schützt rechtlich wichtige Bezüge
  (Auftragnehmer eines Mangels, Grundlage des Honorars, Q5); schwach, wo ein starker Verweis die Arbeit am LV sperren würde
  (Bauzeitenplan) oder der Kern ihn nicht kennen darf (A3).
- **D-97.7** Bauteilzuordnung: **ohne Modell und ohne Mengensatz**, `[]` wie `null`, der Kern prüft die Form (GlobalId, Mengenart
  nicht leer, kein Paar doppelt); **Kopieren verwirft** über die Kopierhilfe des Kerns, Anlegebefehle übernehmen, was sie
  bringen; kein Massenbefehl (D-54 misst in 105). Bis 105/106 weisen Kern und `speicher` Zuordnungen laut ab.
- **D-97.8** `Vorgangsbezug`: **Union nach Aggregatart (`leistungsverzeichnis` | `auftrags-leistungsverzeichnis`) mit Kennung und
  `knotenIds: (GliederungId | PositionId)[] | null`**, `null` = das ganze LV (auch spätere Nachträge), nie leer; ein Bezug je
  Vorgang. Grund: Ein Gewerk ist oft ein ganzes Auftrags-LV; die Art wählt das Repository; Hinweistexte sind kein Bezug.
- **D-97.9** Bauzeitenplan: **Dokumentreihenfolge** (Sammelvorgang vor seinem zusammenhängenden Teilbaum), `VorgangSetzen
  { vorgang, nach }` (Geschwister, hinter dem er steht; `null` = erster), `VorgangEntfernen` entfernt Teilbaum **und** die
  Beziehungen darauf (nie ein hängender Verweis), ein unbekannter Vorgänger ist ein **Fehler** des Ausführers (kein
  Befund), Zyklus und Beziehung an einem Sammelvorgang bleiben Befunde (U5); Codes `eltern-unbekannt`, `zyklus`,
  `knoten-unbekannt` wiederverwendet; Kalenderlisten geordnet; kein Massenbefehl.
- **D-97.10** Ergebnis der Terminrechnung: **`Bauzeitenplanergebnis` statt `Terminplan`** (Form D-102.12: `projektbeginn`,
  `projektende`, `vorgaenge: Vorgangsergebnis[]`, `kritischeWege`, `befunde`). Grund: „Terminplan“ ist im Bauwesen ein Synonym
  für Bauzeitenplan (L2), das Glossar (aus 102) und `bauzeit` nennen es so, parallel zu `Honorarergebnis`. **Je Vorgang
  `vorgangId`** (in `bauzeit` `id`) wie jede Ergebniszeile des Vertrags (`Positionssumme.positionId`). Daten als `string`.
- **D-97.11** Befunde der neuen Module: **in der gemeinsamen Befundliste (`Pruefbefund`)** mit fünf neuen Quellen statt eigener
  Befundtypen im Vertrag (wie `erechnung` seit v1.5/104); `Befundort` additiv um `globalId`, `vorgangId`, `mangelId`; das
  Honorarobjekt (ohne Kennung) über `pfad: '/objekte[n]'` in der Schreibweise der E-Rechnung. Ein Zyklus ergibt je Vorgang
  einen Befund. Codes bleiben Text; die Pakete führen ihre Listen (`Honorarbefundcode`, `Bauzeitbefundcode`) weiter.
- **D-97.12** Honorar: **Namen und Formen von `honorar` (D-101.10)**: `Honorarzone` `'I'`–`'V'`, `weitereKosten`,
  `mitzuverarbeitendeBausubstanz`, `technischeAnlagenAnteilig`, `umbauzuschlagssatz`, Phasen als `{ nummer, anteil? }`,
  `art: 'betrag'`. Gespeichert wird statt der `din-276`-Beträge der **Verweis** `{ art: 'kostenermittlung', kostenermittlungId,
  … }` (110 löst ihn auf). Der Ausführer prüft nur die Form; Honorarsatz außerhalb 0–100, Zone oder Phase, die das
  Leistungsbild nicht hat, negative Beträge und zu hoher Umbauzuschlag sind **Befunde** (U5, D-101.3 bis D-101.5), abweichend
  vom Text von 110 („Sätze 0–100“, „Honorarzone im Bereich“ als Fehler).
- **D-97.13** Bauleitung: Die Ausführer bekommen den **Bestand** (`Pick<Mangel, 'id' | 'nummer'>[]` bzw. `Pick<…, 'id' |
  'datum'>[]`, D-57); doppelte Nummer bzw. Datum: `ungueltige-eingabe` mit `feld`; ein unzulässiger Statuswechsel: **neuer Code
  `statuswechsel-unzulaessig`** (Ticket 111 nennt ihn; zustandsabhängig wie `rechnung-freigegeben`). Namen
  `MangelangabenSetzen` (wie `RechnungsangabenSetzen`), `MangelstatusSetzen { eintrag }`, `BautagebucheintragBefehl` (nach dem
  Aggregat, nicht `BautagebuchBefehl`). Zulässige Wechsel genau nach D-57; Nummer fest nach dem Anlegen.
- **D-97.14** Pflicht oder optional am Rand: **`IdQuelle`-Methoden und Repositories Pflicht** (wie D-70.11), mit Platzhaltern in
  `speicher` (`unbekannt`) und der App; die Undo-Tabelle der App (`historie/arten.ts`) wirft für die neuen Arten bis 114/118–120
  einen Fehler, statt still nichts zu tun (Q5).

### Offene Typfragen (enge Lesart im Typ; Alternative hier)

1. **`IfcGlobalId` mit Formzusage** (D-97.4): Objekte mit abweichender GlobalId fallen aus dem Modell. Alternative: Marke ohne
   Formzusage (Wert wie in der Datei, nicht leer), dann bleiben solche Bauteile zuordenbar.
2. **`Bauteilmenge.wert` ohne `null`.** Alternative: `Menge | null` wie im Leser (sichtbar „Menge ohne Einheit“ im Modellbaum).
3. **Bauteilzuordnung ohne Mengensatz** (mehrdeutig = Befund). Alternative: `satz?: string` in der Zuordnung.
4. **`Ansatzzeile` ohne GlobalId** (D-53): Zeilen folgen der Reihenfolge von `bauteile`; dasselbe Bauteil auf zwei Aufmaßblättern
   ist nicht erkennbar. Alternative: `Ansatzzeile.globalId?` (dann auch in `mengen`, X31 und `speicher` zu bedenken).
5. **`BauteileZuordnen` kein Massenbefehl**: Bei 5.000 Zuordnungen steht jede Änderung ganz im Protokoll. Alternative:
   Massenbefehl oder ein Befehl, der nur hinzufügt/entfernt (Messung in 105/106).
6. **Umbenennen eines Modells braucht den geladenen Zustand** (10.000 Bauteile). Alternative: Ausführer mit dem Kopf als Zustand.
7. **Modell mit Nachfolger nicht löschbar** (D-97.6). Alternative: löschen erlaubt, `vorgaengerId` hängt (Befund), dann lassen
   sich alte Stände entfernen, ohne die neuen zu löschen.
8. **Ein Bezug je Vorgang** (D-97.8). Alternative: `bezuege: Vorgangsbezug[]` (ein Vorgang über mehrere Auftrags-LVs).
9. **Unbekannter Vorgänger als Fehler** (D-97.9, gegen den Text von 109). Alternative: annehmen und als Befund rechnen.
10. **Honorarobjekte ohne Kennung**, Befunde über `/objekte[n]` (D-97.11). Alternative: `Honorarobjekt.id` (Marke, IdQuelle)
    oder `Befundort.objekt?: number`.
11. **Keine Befundschwere „Hinweis“**: Der Hinweis auf DIN 276 in der Fassung 2008-12 (D-56) ist ein fester Text der App bzw.
    eine `warnung`. Alternative: `Befundschwere` + `'hinweis'` (geschlossene Liste, mechanische Zeilen in `ausgabe` und App).
12. **Mangelstatus streng nach D-57**: kein direkter Wechsel offen → beseitigt, kein angezeigt → offen. Alternative: weitere
    Wechsel mit Grund (die Tabelle steht in `bauleitung`, der Vertrag nennt sie nur).
13. **Gespeicherte Honorarberechnung nur mit Betrag oder Verweis**: keine Variante mit KG-300/400-Beträgen von Hand.
    Alternative: dritte Variante `din-276` wie die Eingabe der Rechnung (Fixture 112 nutzt diese Form, siehe unten).

### Mechanische Anpassungen außerhalb von `vertrag` (markiert `// v1.6: mechanisch angepasst, Folgeticket …`)

`grep -rn "v1.6: mechanisch angepasst"` findet alle (Zeilen nach dem Stand dieses Branches).

| Datei | Zeile | Was | Folgeticket |
|---|---|---|---|
| `packages/kern/src/ausfuehren.ts` | 123 | `ZUSTAENDIGES_TICKET.BauteileZuordnen: 'Ticket 105'` (der Typ verlangt den Eintrag) | 105 |
| `packages/kern/src/knoten-befehle.ts` | 226–232 | `positionAnlegen` mit `daten.bauteile` → `befehl-nicht-zustaendig` (sonst still verworfen, Q5) | 105 |
| `packages/kern/src/auftrags-lv.ts` | 202–203 | `BauteileZuordnen` am Auftrags-LV → `befehl-nicht-zustaendig` | 105 |
| `packages/kern/src/baum.test.ts` | 689–692 | `ZUSTAENDIGES_TICKET` nennt nur `BauteileZuordnen` | 105 |
| `packages/kern/src/vertrag-v16.test.ts` | neu | die drei Abweisungen | 105 |
| `packages/speicher/src/vertrag-v16.ts` | neu | `pruefeV16` (Zusicherung): ChangeSets der neuen Aggregate und Positionen mit `bauteile` → `unbekannt` | 106 |
| `packages/speicher/src/vertrag-v16.test.ts` | neu | Abweisungen, Ablage und Repositories `unbekannt`, kein Protokolleintrag | 106 |
| `packages/speicher/src/kern.ts` | 39, 77 | Import und Aufruf von `pruefeV16` in `pruefeBezug` | 106 |
| `packages/speicher/src/client.ts` | 93–96, 132–144 | `erstV16`; `modelldateien` und fünf Repositories antworten `unbekannt` (nach `schliessen` `gesperrt`) | 106 |
| `packages/speicher/src/client.test.ts` | 304–313 | erwartete Schlüssel des Speichers | 106 |
| `packages/speicher/src/dekoder.ts` | 1020–1041, 1070–1071 | `BEFEHLSARTEN` um die 21 neuen Befehle; `LANGE_LISTE.BauwerksmodellAnlegen` (prüft nur `bauteile`) | 106 |
| `packages/speicher/src/kurzfassung.ts` | 45–46 | `massenbefehlskopf` für `BauwerksmodellAnlegen` (ohne Struktur und Bauteile) | 106 |
| `packages/speicher/src/testhilfe/umkehrung.ts` | 109–110, 116–118 | `umkehren` wirft für die neuen Arten; `mitLeeremVorher` lässt Aggregate ohne Summen | 106 |
| `packages/speicher/src/testhilfe/v14.ts` | 158–168 | `aggregatVon` für die neuen Arten | 106 |
| `packages/gaeb/src/testhilfen.ts` | 80–86 | Test-`IdQuelle`: sechs neue Kennungen | – |
| `apps/web/src/lv/ids.ts` | 79–85 | `appIdQuelle`: sechs neue Kennungen (UUIDv7) | 114, 118–120 |
| `apps/web/src/lv/texte.ts` | 189–190, 202–203 | Texte für `statuswechsel-unzulaessig` und `datei-zu-gross` | 120, 106 |
| `apps/web/src/historie/arten.ts` | 85–97, 106–111 | `erstMitTicket`: Undo der neuen Arten wirft, Ziel `null` | 114, 118, 119, 120 |

Sonst brauchte nichts eine Zeile: `vergabe`, `abrechnung`, `kosten`, `mengen`, `ausgabe`, `erechnung`, `ui-grid`, `ui-modell`,
`ifc`, `bauzeit`, `honorar` und `proto` übersetzen unverändert (nichts ist erschöpfend über `Befundquelle` oder `Befundort`;
`zuschlagErteilen` und `nachtragUebernehmen` reichen `bauteile` per `{ ...k }` weiter).

### Folgetickets: was sie liefern müssen

- **105 (`kern`):** Handler `BauteileZuordnen` (LV und Auftrags-LV, Lesarten am Typ: Knotenart, Form der GlobalId, Mengenart
  nicht leer, kein Paar doppelt, `[]` wie `null`); `positionAnlegen` und Kopie: Anlegebefehle übernehmen `bauteile`, die
  **Kopierhilfe** (`kopie.ts`, Zeile 70 `{ ...k }`) lässt das Feld weg; alle Marker in `kern` entfernen, `ZUSTAENDIGES_TICKET`
  wieder leer, `vertrag-v16.test.ts` ersetzen. Zuschlag und Nachtragsübernahme reichen das Feld schon weiter (Test genügt).
- **106 (`speicher`):** Migration 6 nach den Typen (Kopf des Modells getrennt, `anzahlBauteile` beim Anlegen), Ablage nach
  `Modelldateiablage` (Freigabe beim Öffnen), Projektdatei nach den Lesarten an `Projektdatei.modelldateien`, alle
  `konflikt`-Regeln aus dem Kommentar an `Speicher` (D-97.6), Code `datei-zu-gross`; `LANGE_LISTE` für zwei Listen
  (`struktur`, `bauteile`); alle Marker in `speicher` sowie `vertrag-v16.ts` samt Test löschen; der Dekoder des Protokolls
  braucht die fünf neuen `aggregat.art`.
- **107 (`ifc`):** Abbildung auf `Bauwerksmodell`: `teilVonGlobalId`/`kostengruppe` `null` → Feld weglassen; Mengen ohne Wert
  weglassen (Befund); Objekte ohne GlobalId in Form weglassen (Befund, Verweise darauf `null`); Klassifikationen, Materialien
  und Eigenschaften nicht übernehmen; `IfcBefund` → `Pruefbefund` mit `quelle: 'ifc-lesen'`, Ort wie heute, dazu `globalId`.
- **108 (`bim`):** Ausführer nach den Lesarten an `BauwerksmodellAnlegen` (Form, interne Verweise, kein Ring, Doppelte erlaubt),
  `…ChangeSetAnwenden` mit Kopf und Inhalt; Befunde mit `quelle: 'modell-pruefung'` und dem Ort aus `Befundort`.
- **109 (`bauzeit`):** Umstellung: `Vorgangsergebnis.id` → `vorgangId`; `Bauzeitbefund` → `Pruefbefund` (`terminrechnung`,
  `vorgangId`, `feld`, je Zyklusmitglied ein Befund); `Vorgang.bezug` kommt dazu (nur durchreichen); Ausführer nach D-97.9
  (Dokumentreihenfolge, `nach`, Entfernen mit Teilbaum und Beziehungen, unbekannter Vorgänger = `ungueltige-eingabe`); die
  geplanten Namen `Terminplan`/`kritischerWeg` heißen `Bauzeitenplanergebnis`/`kritischeWege` (wie das Paket schon).
- **110 (`honorar`):** Umstellung auf die Vertragstypen; die gespeicherte Variante `kostenermittlung` auflösen (KG-Summen aus der
  Kostenermittlung, D-24) und auf die Eingabe `din-276` abbilden (der Name `AnrechenbareKostenangabe` ist im Vertrag die
  gespeicherte Form; die Rechnungseingabe in `honorar` braucht einen anderen Namen oder `Extract<…> | KostenNachDin276`);
  `Honorarbefund` → `Pruefbefund` (`honorarberechnung`, `pfad: '/objekte[n]'` ab 1, `feld`); Formprüfung nach D-97.12 (Werte
  außerhalb der HOAI sind Befunde, nicht Fehler); Stufenprüfung als Befund.
- **111 (`bauleitung`):** Ausführer mit Bestand nach den Signaturen; Statustabelle genau nach `Mangelstatus`; Code
  `statuswechsel-unzulaessig`; Fristprüfung als `Pruefbefund` (`fristpruefung`, `mangelId`, `feld: 'frist'`); Befehle heißen
  `MangelangabenSetzen`, `MangelstatusSetzen { eintrag }`, `BautagebucheintragBefehl`.
- **112 (Fixtures):** `bauleitung.json` und `bauzeit.json` passen schon zu den Typen. `honorar.json` trägt die
  `honorarberechnung` mit `art: 'din-276'` (Rechnungseingabe); gespeichert heißt sie `{ art: 'kostenermittlung',
  kostenermittlungId: <id der Kostenermittlung der Datei>, technischeAnlagenAnteilig, weitereKosten,
  mitzuverarbeitendeBausubstanz }` (Ticket 110/119 bilden ab oder die Fixture ergänzt die gespeicherte Form).
- **113 (`ausgabe`):** liest `Bauzeitenplanergebnis` (nicht `Terminplan`), `Honorarergebnis`, `Mangel`, `Bautagebucheintrag` und
  `Pruefbefund`; der Status eines Mangels ist der letzte Verlaufseintrag.
- **114–120 (App):** je Modul die Zeile in `historie/arten.ts` durch Umkehrung und Ziel ersetzen; Repositories und Ablage nutzen,
  sobald 106 gemergt ist; Mängel setzen `bauteil.bauwerksmodellId` nur, wenn ein bestimmter Stand gemeint ist (D-97.6: sonst
  blockiert er das Löschen alter Stände); Texte für `statuswechsel-unzulaessig` und `datei-zu-gross` prüfen; Hinweis zur
  DIN-276-Fassung als fester Text (Offene Typfrage 11).
- **Ohne Ticket in Welle 6:** `gaeb` sollte `bauteile` beim Export mit Warnung verwerfen wie `textquelle` (F6); heute fällt das
  Feld still weg, weil der Writer es nicht kennt.

### Prüfung

Nach dem letzten `git merge integration/welle-6` (Merge `9582ba7`, Stand `9b1dd3c`: Tickets 96, 98–103, 112 gemergt):
`NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (Lint samt Paketgrenzen, Lizenzen und
Clean Room; Vitest 250 Dateien bestanden, 1 übersprungen; 3230 Tests bestanden, 3 übersprungen wie zuvor; Fixtures 53/53). Kein
Budget fiel, keines gelockert. E2E verlangt das Ticket nicht; die App zeichnet nichts Neues.

### Nachtrag Review (D-66)

Opus-Review „yes-with-fixes“ nach dem Merge `e27225a`. Nur Lesarten, additive Felder und Glossar; kein Typ der Verbraucher
(105–111) ändert sich. Branch `welle-6/97-vertrag-v1.6` nach `git merge integration/welle-6` (Stand `ffe5b1f`), Commit `d37a2d1`.

- **MUSS 1** (`honorar.ts`, `Honorarergebnis.befunde`): Der Hinweis auf § 4 Abs. 1 (DIN 276 in der Fassung 2008-12, D-56) ist
  nie ein Befund und kein Teil des Honorarergebnisses; App (119) und PDF (113) drucken ihn als festen Text; `befunde: []` in
  `fixtures/honorar.json` bleibt gültig. Offene Typfrage 11 ist damit entschieden (keine Schwere „Hinweis“).
- **MUSS 2** (`modell.ts`, `Positionsdaten.bauteile`): je Weg benannt. Kopieren und Einfügen im LV (auch Zwischenablage) und
  Textbausteine aus einem Muster-LV verwerfen `bauteile`; ein LV-Stand als neues LV übernommen behält sie (eigenes LV, nichts
  zählt doppelt). Folgearbeit: **105** gibt der Kopierhilfe eine Wahl (Standard: weglassen), **121** übergibt im Weg aus dem
  LV-Stand „behalten“.
- **SOLL 3** (`changeset.ts`, `BauwerksmodellChangeSet`): Lesart statt Union: Anlegen oder Löschen ohne `inhalt`, Umbenennen mit
  `inhalt` oder `inhalt` mit `null` auf der anderen Seite als `kopf` weist `speicher` mit `unbekannt` ab (Folgearbeit **106**).
  Die Union nach Fall bliebe eine Option (neue Offene Typfrage 14), sie hätte aber Verbraucher in Arbeit (106, 108, 114) gebrochen.
- **SOLL 5** (`bim.ts`): Bei doppelten GlobalIds meint jeder Verweis das erste Objekt in der Reihenfolge der Datei (`struktur` vor
  `bauteile`); die späteren zählen für Zuordnung, Mengen und Vergleich nicht (Befund). Folgearbeit **107**, **108**.
- **SOLL 6** (`bim.ts`, `index.ts`): Konstante `IFC_GLOBALID_MUSTER = /^[0-9A-Za-z_$]{22}$/` (ohne `g`), exportiert wie
  `NACHKOMMASTELLEN`. Folgearbeit **105–108**: damit nachprüfen statt eigener Muster.
- **SOLL 7** (`gaeb.ts`, Lesart `terminrechnung`): Ein Befund zu genau einer Anordnungsbeziehung trägt `pfad:
  '/vorgaenge[n]/vorgaenger[m]'` (ab 1) neben `vorgangId` und `feld: 'vorgaenger'`. Folgearbeit **109**.
- **SOLL 8** (Glossar „Anrechenbare Kosten“, `honorar.ts`): `AnrechenbareKostenangabe` meint nur die gespeicherte Form im Vertrag;
  die Eingabe der Rechnung in `honorar` heißt `AnrechenbareKosteneingabe`. Folgearbeit **110**: umbenennen.
- **SOLL 9** (`gaeb.ts`, Quelle `modell-pruefung`): dazu „Bauteil ohne Geometrie“ (die Modellansicht meldet die GlobalId, die App
  legt den Befund an). Folgearbeit **114**.
- **SOLL 10** (`bauleitung.ts`, additiv): `Mangelverlaufseintrag.frist?: string`, nur bei `angezeigt` (sonst
  `ungueltige-eingabe`); die geltende Frist bleibt `Mangel.frist`. Glossar „Mängelverlauf“ ergänzt; Beispiele und Typtest
  angepasst. Folgearbeit **111** (Prüfung), **120** (App setzt beide im selben Undo-Schritt), **112** (Fixture darf die Frist
  am Eintrag `angezeigt` ergänzen, muss aber nicht).
- **SOLL 11** (`befehle.ts`, `BauwerksmodellUmbenennen`): Offene Typfrage 6 bleibt; **106** und **114** messen
  `bauwerksmodelle.laden` bei 10.000 Bauteilen.

Neue Offene Typfrage **14**: `BauwerksmodellChangeSet` als Union nach Fall (Anlegen, Umbenennen, Löschen), damit der Typprüfer
die Regel aus SOLL 3 erzwingt.

Neue Typtests im Abschnitt „v1.6 Nachtrag Review (D-66)“ in `vertrag.test.ts`.

Prüfung: `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` nach dem Merge:
Lint (samt Paketgrenzen, Lizenzen, Clean Room) und Typecheck grün; Vitest 247 Dateien bestanden, 1 übersprungen,
  3 rot, alle Leistungsbudgets außerhalb von `vertrag` unter Last (Last 19 auf 4 Kernen, Stufe 2 läuft parallel):
  `kern/lv-pruefung-fixtures` (`lvPruefen(gross)` über 50 ms), `vergabe/leistung` (`preisspiegelBerechnen` 1.441,8 ms gegen
  1.000 ms), `apps/web/abrechnung/leistung` (Undo am Aufmaßblatt, Median 156,1 ms gegen 100 ms). Je Datei allein wiederholt:
  alle grün (`lvPruefen(gross)` Median 25,60 ms; `preisspiegelBerechnen` 719,9 ms; Aufmaßblatt Setzen 83,2 ms, Rückgängig
  65,0 ms, Wiederholen 43,5 ms). 3231 Tests bestanden, 3 übersprungen wie zuvor; Fixtures 53/53 (`node --test` einzeln). Kein
  Budget gelockert.

## Answer

Gemergt in `integration/welle-6` mit `e27225a` (Branch `welle-6/97-vertrag-v1.6`, `4232b09`). `vertrag` v1.6: Bauwerksmodell und
Modelldateiablage, `BauteileZuordnen`, Bauzeitenplan (`Bauzeitenplanergebnis`), Honorarberechnung (`Honorarergebnis`), Mangel und
Bautagebucheintrag, fünf neue Befundquellen. Abweichungen vom Tickettext angenommen (D-64); Opus-Review läuft parallel zu Stufe 2.

Nachtrag Review (D-66): Lesarten, additive Felder und Glossar nachgezogen, Commit `d37a2d1` auf `welle-6/97-vertrag-v1.6` (nach
Merge von `integration/welle-6` @ `ffe5b1f`); siehe Abschnitt „Nachtrag Review (D-66)“. Kein Typ der Verbraucher ändert sich.

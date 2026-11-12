# 97: `vertrag` v1.6: Typen für X1 BIM, X2 Bauzeitenplan, X3 HOAI, X4 Bauleitung

Status: ready-for-agent
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

- [ ] Typen mit Kommentar im Stil von `vertrag`; Lesarten D-50 bis D-57 am Typ; Offene Typfragen unter Comments
- [ ] Jede mechanische Anpassung markiert, Liste in den Comments; Folgearbeit je Paket als Stichpunkt für die Tickets 105–121
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

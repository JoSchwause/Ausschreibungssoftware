# 53: `vertrag` v1.3 (Vertrag plus Anpassung)

Status: resolved
Type: task
Welle: 4 · Strang: F · Paket: `packages/vertrag` (dazu nur mechanische, markierte Zeilen in den Paketen, die den Typ nutzen)
Blocked by: –
Welle-4-Lauf: siehe `../schnitt-welle-4.md`; Zusatzpunkt 9 und Entscheidungen D-22
Regeln: A4, F3, W-03 (b), D-06, P9 (der Nutzer prüft), G-26, G-32
Herkunft: Comments der Tickets 30, 34, 38, 39, 40, 43, 45, 46, 47, 48 und 49 (Lücken, siehe Liste)

## What to build

Die Umsetzer der Welle 3 haben Lücken im Vertrag gemeldet, die sie nicht geändert haben (A4). Dieses Ticket sammelt sie zu
einer Fassung v1.3 im Stil von Ticket 29: enge, umkehrbare Lesart im Typ, Alternativen als Offene Typfragen, Nicht-Additives
(Pflichtfelder, neue Glieder geschlossener Listen) nur mit der mechanischen Anpassung im selben Ticket (W-03 (b)).

1. **`LvUebersicht { id, name }` für `LvRepository.auflisten`** (Tickets 38, 39). Heute nur Kennungen; die Projektseite lädt
   jedes LV ganz (bei `gross` 5.000 Positionen). Wie `Projektuebersicht`, nach Name sortiert (`speicher` sortiert mit `Intl.Collator('de-DE')`).
2. **EPA-Bezeichnungen am LV** (Ticket 45). `LvInhalt` hält die Beschriftungen der EPA-Anteile (`LblUPComp`) nicht; deshalb
   bleiben die Anteile der BVBS-X84 `null`. Typ ergänzen, Leser und Writer (`gaeb`) später anschließen (Folgeticket).
3. **`Summenaenderung.vorher` Pflicht** (Ticket 30). Seit Ticket 30 füllt der Kern es immer; Pflichtfeld macht die Prüfung
   in `speicher` überall möglich (heute nur beim Löschen eines Aggregats).
4. **`Speicher.lvStaende` Pflicht** (Tickets 29 Offene Typfrage 3, 43). `speicher` liefert es immer; Test-Doubles und
   `Projektdatei.lvStaende` mitziehen.
5. **`Einfuegeort` „nach einer Gliederung“** (Tickets 39, 46, 42). Heute heißt `nach` einer Gliederung „als erstes Kind“; ein
   Geschwister direkt hinter einem nicht letzten Titel ist in einem Befehl nicht ausdrückbar. Neue Form für „hinter der
   Gliederung als Geschwister“ (neues Glied geschlossener Liste: mechanische Anpassung in `kern`, `speicher`, `ui-grid`, `apps/web`).
6. **Auftragnehmer im GAEB-Modell** (Tickets 40, 49). X86 schreibt `CTR` mit leerer Adresse und Warnung `angabe-leer`, weil
   `LvInhalt` keinen Auftragnehmer kennt. Typ am LV (oder am Auftrags-LV) ergänzen, Leser und Writer später anschließen.
7. **Angebotsposition: Positionsnachlass und Bieterergänzungen** (Ticket 45; G-26, G-32). `Angebotsposition` hat kein Feld
   für einen Nachlass je Position oder Gliederung und keines für Bieterergänzungen (`Kind="Bidder"`); beides geht beim
   X84-Import als Befund verloren (`nachlass-nicht-abgebildet`, 1.30.10 = 1.500,00 statt 1.450,50). Nur als Typfrage mit
   Alternativen aufnehmen; der Nutzer entscheidet (G-26).
8. **Leere Liste, Tabelle ohne Zeilen, Zeile ohne Zellen im `Langtext`** (Ticket 34). Der Editor kann sie nicht darstellen;
   Typfrage, ob der Vertrag sie verbietet (G2 prüft, ob GAEB sie zulässt).

9. **Mengenansatz an der Position** (Welle 4, M2; D-22). `Ansatzzeile` (heute `packages/mengen/src/mengenansatz.ts`) wandert
   nach `vertrag`; `mengen` importiert den Typ von dort (mechanisch). `Positionsdaten.mengenansatz?: readonly Ansatzzeile[]`
   (optional wie `leitbeschreibung`, fehlt = kein Ansatz). Neuer `LvBefehl` `MengenansatzSetzen { positionId, mengenansatz:
   readonly Ansatzzeile[] | null, menge: Menge | null }`: die App rechnet die Menge mit `mengen`, der Kern speichert beides
   unausgewertet (A3: kein `kern → mengen`). Lesarten im Typkommentar: (a) ein reiner Mengenbefehl (`MengeAendern` u. a.)
   an einer Position mit Ansatz entfernt den Ansatz im selben ChangeSet; (b) ein Ansatz mit Fehler kommt mit `menge: null`.
   Neues Glied der geschlossenen Befehlsliste: Kern-Handler, Speicher und Panel sind Folgetickets (56, 57, 65); hier nur so
   viel Mechanik, dass alles grün bleibt (z. B. der Kern weist den Befehl vorläufig mit `befehl-nicht-zustaendig` ab, markiert).

**Entscheidungen für diesen Lauf (D-22):** Punkt 7 bekommt **keinen** Typ (Offene Typfrage mit Alternativen in den Comments,
G-26). Punkt 8: Typ bleibt weit; K8-Befund und Writer-Warnung kommen in Folgetickets (56, 68). Punkte 2 und 6: Typ als
optionale Felder (additiv), Leser/Writer in Ticket 68, Speicherung in Ticket 57. Punkt 5: Typ und mechanische Anpassung hier,
die Kern-Logik für die neue Form in Ticket 56 (bis dahin weist der Kern sie markiert ab). Prüfung durch einen Opus-Reviewer
statt des Nutzers (P9, D-22); der Merge wartet auf diesen Review.

Aus Ticket 47 und 48 kommen keine Vertragslücken; ihre Lücken stehen in Ticket 54 (`ui-grid`, `ui-basis`) und für `speicher`
in Ticket 43 (D-31.1, Fremdschlüssel `protokoll.projekt_id`, kein Vertragsthema).

## Grenzen

- Nur `packages/vertrag` und die markierten mechanischen Zeilen (`// v1.3: mechanisch angepasst, Folgeticket`); keine Logik.
- Punkte 2, 6 und 7 nur als Typ; Leser, Writer und Oberfläche sind Folgetickets.
- Der Nutzer prüft den Pull Request (P9); offene Alternativen stehen als Typfragen im Ticket, nicht geraten (P5, außer im Demo-Modus mit Protokoll).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Typen für die Punkte 1 bis 9 (Punkte 2, 6, 7, 8 wie unter „Entscheidungen für diesen Lauf“) mit Kommentar im Stil von `vertrag`
- [x] Jede mechanische Anpassung markiert; ihre Liste in den Comments
- [x] Offene Typfragen mit Alternativen in den Comments
- [x] `GLOSSARY.md` nachgezogen (L2), falls neue Begriffe entstehen (z. B. „Auftragnehmer“, „Bieterergänzung“)
- [x] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Leser/Writer/Oberfläche für die neuen Felder, Änderung der Rechenregeln.

## Comments

### Ergebnis (Branch `welle-4/53-vertrag-v1.3`, Basis `integration/welle-4`)

Typen, Kommentare, Beispiele und Typtests in `packages/vertrag/src/`; dazu die markierten mechanischen Zeilen in
`kern`, `mengen`, `speicher`, `vergabe`, `ui-grid` (E2E-Harness), `apps/web`, `proto/interview` und `GLOSSARY.md`.
Leitlinie wie in Ticket 24/26/29: enge, umkehrbare Lesart im Typ, neue Felder optional mit natürlicher Leerbedeutung,
Alternativen unten als Offene Typfragen. Kein Rechenwert, keine Fixture, kein Golden geändert.

### Je Punkt: Datei und Typ

1. **LV-Übersicht.** `speicher.ts`: `LvUebersicht { id, name }`; `LvRepository.auflisten` → `readonly LvUebersicht[]`,
   nach Name (`Intl.Collator('de-DE')`), gleiche Namen nach Kennung (wie `listeProjekte`). Keine Summen (Typfrage 1).
2. **EPA-Bezeichnungen.** `modell.ts`: `EpaArt = Exclude<keyof Einheitspreisanteile, 'freiBezeichnung'>`,
   `EpaNummer = 1 | … | 6`, `EpaBezeichnung { nummer, anteil, bezeichnung: string | null }`,
   `LvInhaltKopf.epaBezeichnungen?: readonly EpaBezeichnung[]` nach `nummer` sortiert, `nummer` und `anteil` je
   eindeutig; nie `[]` (nach Review: D-53.6). Leser/Writer Ticket 68, Speicherung Ticket 57.
3. **`Summenaenderung.vorher` Pflicht** (`summen.ts`). Kern (seit Ticket 30) und `vergabe` setzten es schon; neu gesetzt
   werden musste es nur in `speicher` (Import der Projektdatei) und in Testliteralen. Die Rückfallwege für ein fehlendes
   `vorher` in `kern`, `vergabe` und `speicher` entfallen (Lint: unnötige Bedingung).
4. **`Speicher.lvStaende` Pflicht** (`speicher.ts`). `Projektdatei.lvStaende` bleibt optional (Typfrage 2).
5. **Einfügen hinter einer Gliederung.** `befehle.ts`: neues Glied `Einfuegeort { art: 'hinter-gliederung';
   gliederungId: GliederungId }`; `nach` behält seine Bedeutung (Typfrage 3). Der Kern weist die Form bis Ticket 56 mit
   `befehl-nicht-zustaendig` ab (in `zielAufloesen` und `ortAufloesen`, damit für jeden Befehl mit Ort).
6. **Auftragnehmer.** `modell.ts`: `Auftragnehmer { name, strasse, plz, ort }` (alle nullbar, GAEB `CTR/Address`),
   `LvInhaltKopf.auftragnehmer?` (also auch am `AuftragsLvKopf`; Typfrage 4).
7. **Positionsnachlass, Bieterergänzungen:** kein Typ (D-22); Alternativen in Typfrage 5. Glossar: „Bieterergänzung“
   als Satz unter „Textergänzung“.
8. **Leere Langtext-Strukturen:** Typ bleibt weit (D-22); Kommentar an `Liste` und `Tabelle` (K8-Befund Ticket 56,
   Writer-Warnung Ticket 68). Typtest: leere Liste, Tabelle ohne Zeilen, Zeile ohne Zellen sind gültige `Langtext`.
9. **Mengenansatz.** `modell.ts`: `Ansatzzeile` (aus `mengen`, unverändert), `Positionsdaten.mengenansatz?: readonly
   Ansatzzeile[]` (nie `[]`). `befehle.ts`: `MengenansatzSetzen { positionId, mengenansatz: readonly Ansatzzeile[] |
   null, menge: Menge | null }` in `LvBefehl`; Lesarten (a) und (b) aus D-22 im Typkommentar, (a) auch an
   `MengeAendern`. Kein Massenbefehl. Kern-Handler 56, Speicher 57, Panel 65.

Beispiele (`beispiele.ts`, Abschnitt v1.3): `beispielLvKopfV13` (Auftragnehmer, EPA-Bezeichnungen),
`beispielVerschiebenHinterGliederung`, `beispielMengenansatzSetzen`, `beispielMengenansatzMitFehler` (Lesart b),
`beispielChangeSetMengenansatz`, `beispielMengeAendernMitAnsatz` mit `beispielChangeSetMengeOhneAnsatz` (Lesart a).
Typtests: `vertrag.test.ts`, Abschnitte „v1.3 Punkt …“ und „v1.3: reine Daten und Werte vor v1.3“.

### Mechanische Anpassungen außerhalb von `vertrag` (markiert `// v1.3: mechanisch angepasst, Folgeticket`)

Zeilen nach dem Stand dieses Branches; `grep -rn "v1.3: mechanisch angepasst"` findet alle.

| Datei | Zeile | Was | Folgeticket |
|---|---|---|---|
| `packages/kern/src/ausfuehren.ts` | 109 | `ZUSTAENDIGES_TICKET`: `MengenansatzSetzen` → `'M2 (Ticket 56)'` | 56 |
| `packages/kern/src/fehler.ts` | 29–36 | `hinterGliederungOffen`: Fehlerwert `befehl-nicht-zustaendig` für die neue Ortsform | 56 |
| `packages/kern/src/knoten-befehle.ts` | 224 | `positionAnlegen` mit `daten.mengenansatz` → `befehl-nicht-zustaendig` (sonst still verworfen; nach Review) | 56 |
| `packages/kern/src/knoten-befehle.ts` | 36, 87 | `zielAufloesen`: `hinter-gliederung` → `hinterGliederungOffen` (Anlegen, `KnotenVerschieben`) | 56 |
| `packages/kern/src/platzieren.ts` | 11, 66 | `ortAufloesen`: ebenso (`KnotenEinfuegen`, `KnotenlisteVerschieben`, Wiederherstellen; `ozVorschlag` → `null`) | 56 |
| `packages/kern/src/summen.ts` | 332–337 | `summenAenderung` liefert `Omit<Summenaenderung, 'vorher'>` (nur der Typ; `baueChangeSet` setzt `vorher`) | – |
| `packages/kern/src/changeset.ts` | 126, 260 | `ChangeSetTeile.summen` ohne `vorher`; `summenUmkehren` ohne Prüfung auf `undefined` | – |
| `packages/kern/src/testhilfen.ts` | 182 | `ohneReihenfolge`: `vorher` ohne Fallunterscheidung | – |
| `packages/kern/src/baum.test.ts` | 690, 694 | `ZUSTAENDIGES_TICKET` nennt `MengenansatzSetzen`; neuer Test: beide v1.3-Formen werden abgewiesen | 56 |
| `packages/kern/src/eigenschaften.test.ts` | 196 | Modell des Baums: `hinter-gliederung` wirft (der Generator erzeugt sie nicht) | 56 |
| `packages/kern/src/summen.test.ts` | 962, 977 | `vorher?.` → `vorher.`; Test „ohne `vorher`“ mit `@ts-expect-error` | – |
| `packages/kern/src/lv-aggregat.test.ts`, `merkmale.test.ts` | 66; 360 | `vorher?.` → `vorher.` (Lint) | – |
| `packages/mengen/src/mengenansatz.ts` | 15 | `Ansatzzeile` aus `vertrag`, unverändert weiter exportiert | – |
| `packages/vergabe/src/changeset.ts` | 124, 131 | `angebotChangeSetUmkehren` ohne Rückfall auf ein leeres `vorher`; Konstante entfällt | – |
| `packages/vergabe/src/befehle.test.ts`, `eigenschaften.test.ts` | 270; 119 | `vorher?.` → `vorher.` (Lint) | – |
| `packages/speicher/src/dekoder.ts` | 713 | `BEFEHLSARTEN`: `MengenansatzSetzen` | 57 |
| `packages/speicher/src/lesen.ts` | 84–91 | `listeLvs`: `LvUebersicht`, sortiert wie `listeProjekte` | 57 |
| `packages/speicher/src/kern.ts` | 173 | `lvAuflisten` → `LvUebersicht[]` | 57 |
| `packages/speicher/src/kern.ts` | 50, 257 | `pruefeV13(changeSet)` vor jedem Schreiben | 57 |
| `packages/speicher/src/vertrag-v13.ts` | neu | `LEERES_SUMMENVORHER`; `pruefeV13`: Auftragnehmer, EPA-Bezeichnungen oder Mengenansatz im LV-/Auftrags-LV-ChangeSet → `unbekannt` (Q5: laut, nicht still verworfen) | 57 |
| `packages/speicher/src/schreiben.ts` | 104, 299 | `pruefeLoeschSummen` prüft `vorher` immer; `wendeSummenAn` nimmt Summen ohne `vorher` (`ersetzeSummen`) | 57 |
| `packages/speicher/src/projektdatei.ts` | 36, 141, 159, 173 | Import: Anlege-ChangeSets mit `vorher: LEERES_SUMMENVORHER` | – |
| `packages/speicher/src/testhilfe/fixtures.ts`, `testhilfe/umkehrung.ts`, `harness/main.ts`, `e2e/speicher.spec.ts`, `src/*.test.ts` (client, historie, kern, kurzfassung, langtext, loeschen, projektliste) | siehe Marker | `vorher: LEERES_SUMMENVORHER` in Testliteralen; keine Prüfung mehr auf fehlendes `lvStaende`/`vorher`; `lvAuflisten` erwartet `{ id, name }`; neuer Test zur Sortierung der LV-Übersicht | 57 |
| `packages/speicher/src/vertrag-v13.test.ts` | neu | die `unbekannt`-Fälle aus `pruefeV13` | 57 |
| `packages/ui-grid/e2e/harness/befehle-anwenden.ts` | 43, 107 | Testmodell: `hinter-gliederung` wirft (`erst Ticket 56`) | 56 |
| `apps/web/src/projekt/ProjektSeite.tsx` | 7, 102 | Kennungen aus `LvUebersicht`; lädt weiter jedes LV (Netto, Löschen) | App |
| `apps/web/src/lv/LvSeite.tsx` | 272 | `anlegen`: bei `hinter-gliederung` nichts aufklappen | 67 |
| `apps/web/src/lv/LvStandSeite.tsx`, `StaendeDialog.tsx`, `historie/historie.test.ts`, `historie/texte.ts` | 43; 42, 73; 196 | `lvStaende` ohne `?.`/`undefined`-Zweig; Text `nichtVerfuegbar` entfällt | 67 |
| `proto/interview/src/store.tsx` | 40 | Prototyp: `hinter-gliederung` wirft (`erst Ticket 56`) | – |

`gaeb`, `ausgabe`, `ui-basis`, `ui-grid/src` brauchten nichts. Der GAEB-Writer ignoriert die neuen Felder bis Ticket 68
(er hat schon die Option `auftragnehmer`); der Projektdatei-Dekoder weist sie als unbekannte Felder ab (`datei-ungueltig`).

### Folgetickets: was anzupassen ist

- **56 (Kern v1.3):** Handler `MengenansatzSetzen` (Knotenänderung mit `mengenansatz` und `menge`, `[]` wie `null`,
  Lesart b: `menge: null` annehmen), Lesart a in `MengeAendern` (Ansatz im selben ChangeSet entfernen); Ortsform
  `hinter-gliederung` in `zielAufloesen`/`ortAufloesen` (Ziel muss eine Gliederung sein), `hinterGliederungOffen` und
  die Marker löschen, `ZUSTAENDIGES_TICKET` wieder leer; K8-Befund für leere Liste/Tabelle/Zeile; `KnotenEinfuegen`
  übernimmt den `mengenansatz` der Kopie.
- **57 (Speicher v1.3):** Migration 4: Spalten/JSON für `mengenansatz`, `auftragnehmer`, `epaBezeichnungen`; Dekoder
  der Projektdatei; `pruefeV13` samt Aufruf und Test löschen (`LEERES_SUMMENVORHER` darf bleiben); `vorher` überall
  prüfen, nicht nur beim Löschen; die LV-Übersicht ist schon da.
- **59 (Zuschlag):** `AuftragsLeistungsverzeichnisAnlegen` mit `auftragnehmer: { name: bieter.name, … null }`, sobald
  57 es speichert.
- **65 (Panel):** `MengenansatzSetzen` aus `mengenansatzBerechnen`; vor `MengeAendern` an einer Position mit Ansatz
  fragen (Lesart a).
- **67 (App-Rückbau):** markierte Zeilen in `apps/web/src/lv/` aufräumen (die stehen gebliebene Klammer in
  `StaendeDialog`).
- **68 (gaeb v1.3):** `CTR` ↔ `auftragnehmer` (X86), `LblUPComp` ↔ `epaBezeichnungen` (X83/X84/X86), Warnung bei
  leerer Liste/Tabelle.
- **App (Projektseite, ohne Ticket):** Liste aus `LvUebersicht` ohne `laden` je LV, sobald das Netto anders kommt
  (Typfrage 1).

### Offene Typfragen (enge Lesart im Typ; Alternative hier)

1. **`LvUebersicht` ohne Summen.** Die Projektseite zeigt das Netto und lädt dafür weiter jedes LV. Alternative:
   `LvUebersicht.netto: Betrag` (oder `gesamt: Gesamtsummen`) aus `summe_gesamt`, ohne die Knoten zu laden.
2. **`Projektdatei.lvStaende` bleibt optional.** Pflicht hieße `lvStaende: []` in jeder Datei, also eine neue
   Schemaversion und eine neue eingefrorene Datei (A8). Alternative: Pflicht mit Migration 4 (Ticket 57).
3. **`hinter-gliederung` nur für Gliederungen.** Alternative A: eine allgemeine Form `{ art: 'hinter'; knotenId }` für
   jeden Knoten (dann zwei Schreibweisen für „hinter einer Position“). Alternative B: `nach` vereinheitlichen
   („Geschwister“) und `{ art: 'erstes-kind'; gliederungId }` neu; nicht additiv, ändert die Bedeutung protokollierter
   Befehle.
4. **`auftragnehmer` am gemeinsamen Kopf.** Alternative: nur am `AuftragsLvKopf` (sauberer, aber der X86-Leser liefert
   `LvInhalt` und der Writer nimmt `LvInhalt`; beide bräuchten einen eigenen Weg). Zweite Frage: ob der Auftragnehmer
   auf den `Bieter` verweisen soll (`bieterId`), statt Name und Anschrift zu kopieren.
5. **Positionsnachlass und Bieterergänzung im Angebot (Punkt 7; G-26, G-32): kein Typ.** Alternativen:
   (a) `Angebotsposition.nachlass?: Nachlass` an der Variante `angeboten` und `AngebotKopf.gliederungsnachlaesse?:
   readonly { gliederungId; nachlass: Nachlass }[]`; widerspricht N5/G-26 („Nachlass nur auf LV-Ebene, genau einer“)
   und bräuchte eine Entscheidung zur Rechnung (vor oder nach der GP-Rundung). (b) Nur ablegen, nie rechnen:
   `AngebotKopf.nichtGerechneteNachlaesse?` als Daten für einen Hinweis im Preisspiegel. (c) Bieterergänzungen:
   `Angebotsposition.ergaenzungen?: readonly { kennung: string; inhalt: Textfluss }[]` (Bezug über
   `Textergaenzung.kennung` im LV). Heute: Befund `nachlass-nicht-abgebildet` bzw. `nicht-abgebildet` beim Import.
6. ~~`epaBezeichnungen` als geordnete Liste, höchstens ein Eintrag je Art.~~ **Beantwortet (D-53.6, Berater nach
   Review):** Einträge mit ausdrücklicher `nummer`; Lücke = Platz nicht zugeordnet; `bezeichnung: null` = Art aus
   GAEB `Type`, Beschriftung leer; Feld fehlt = feste Belegung des Writers; ist das Feld gesetzt, ist es die einzige
   Quelle der Beschriftungen (auch für `frei`; `Einheitspreisanteile.freiBezeichnung` wird dann nicht gelesen).
7. **`MengenansatzSetzen` setzt die Menge auch beim Entfernen (`mengenansatz: null`).** Alternative: `menge` nur bei
   gesetztem Ansatz; beim Entfernen bleibt die Menge stehen (dann `menge?`).
8. **Leere Langtext-Strukturen erlaubt (Punkt 8, D-22).** Alternative: `punkte`, `zeilen`, `zellen` als nicht leere
   Tupel (`readonly [T, ...T[]]`); nicht additiv für Leser und Fixtures.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-53.1** Name der neuen Ortsform? `'hinter-gliederung'` mit `gliederungId: GliederungId`. Grund: Wortlaut des
  Tickets („hinter der Gliederung“), lesbar verschieden von `nach`; die Marke schließt eine Position als Ziel aus.
- **D-53.2** Wo weist der Kern die neue Ortsform ab? In den zwei Ortsauflösern (`zielAufloesen`, `ortAufloesen`), mit
  `befehl-nicht-zustaendig` und Nennung von Ticket 56. Grund: deckt jeden Befehl mit Ort ab; derselbe Code wie für
  nicht umgesetzte Befehle.
- **D-53.3** Speicher und neue Felder? Lauter Abbruch `unbekannt` vor jedem Schreiben (`pruefeV13`), wie die
  v1.2-Wächter. Grund: `speicher` legt Kopf und Knoten spaltenweise ab und verlöre die Felder still (Q5).
- **D-53.4** `summenAenderung` im Kern liefert `Omit<Summenaenderung, 'vorher'>`, statt einen Platzhalter zu setzen.
  Grund: nur ein Typ ändert sich; `baueChangeSet` setzt `vorher` wie bisher.
- **D-53.5** `LvUebersicht` sortiert wie die Projektliste (Name de-DE, dann Kennung). Grund: Wortlaut des Tickets und
  dieselbe Regel wie `Projektuebersicht`.
- **D-53.6** (= D-28 im Entscheidungsprotokoll; Berater, nach dem Opus-Review) Form der EPA-Bezeichnungen? `EpaBezeichnung { nummer: 1|…|6; anteil:
  EpaArt; bezeichnung: string | null }`, Liste nach `nummer` sortiert, `nummer` und `anteil` je eindeutig, Feld
  optional. Fehlende `nummer` = Platz nicht zugeordnet (keine Beschriftung oder zweiter Anteil derselben Art);
  `bezeichnung: null` = Art aus GAEB `Type` bekannt, Beschriftung leer; Feld fehlt = heutige feste Belegung des
  Writers (1 Lohn, 2 Stoffe, 3 Geräte, 4 Nachunternehmer, 5 Sonstiges, 6 frei); Writer nummerieren nie um. Bei
  gesetztem Feld ist es die einzige Quelle der Beschriftungen, `Einheitspreisanteile.freiBezeichnung` an der Position
  gilt nur ohne das Feld. `EpaArt` ist aus `Einheitspreisanteile` abgeleitet. Grund: Die Position eines Eintrags in der
  Liste trug die Nummer nur implizit; Lücken und doppelte Arten der Datei waren nicht darstellbar.

### Review-Korrekturen (Opus-Reviewer, „yes-with-fixes“)

Alle sechs umgesetzt: (1) `positionAnlegen` weist `daten.mengenansatz` markiert ab statt ihn still zu verwerfen
(Test in `baum.test.ts`); (2) Kommentar an `Positionsdaten.mengenansatz` („Geändert nur über `MengenansatzSetzen` …“);
(3) EPA-Bezeichnungen mit `nummer` (D-53.6), Beispiel mit Lücke und `bezeichnung: null`, Typtests; (4) Testmodell in
`ui-grid` und Prototyp werfen bei `hinter-gliederung`; (5) Glossar „Auftragnehmer“: steht am LV-Kopf, gesetzt beim
Auftrags-LV (Zuschlag) oder aus X86; (6) `EpaArt` abgeleitet. `pruefeV13` brauchte keine Änderung.

## Answer

Gemergt auf `integration/welle-4` mit Merge-Commit f69eff9; Review-Befunde behoben in `fix/welle-4-review` (847aa43, siehe `../review-welle-4.md`). Geprüft durch Opus-Reviewer statt Nutzer (D-27, P9); EPA-Bezeichnungen nach D-28. Offene Typfragen in den Comments.

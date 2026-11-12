# 70: `vertrag` v1.4: Auftrags-LV, Nachtrag, Aufmaß, Rechnung, Kostenermittlung

Status: resolved
Type: task
Welle: 5 · Strang: F · Paket: `packages/vertrag` (dazu nur mechanische, markierte Zeilen in den Paketen, die die Typen nutzen)
Blocked by: –
Regeln: A4, A5, A6, A7, A9, N1–N5, F1, U5, Q5, ADR 0009, ADR 0011, P9 (ersetzt durch Opus-Review, D-36), W-03 (b)
Herkunft: Ticket 64 (D-64.2, D-64.4), Wellen-Review 4; Entscheidungen D-34 bis D-38 (Berater, Welle 5)

## What to build

Eine Fassung v1.4 im Stil von Ticket 29 und 53: enge, umkehrbare Lesart im Typ, jede Lesart als Kommentar am Typ,
Alternativen als „Offene Typfragen“ unter Comments, Nicht-Additives (Pflichtfelder, neue Glieder geschlossener Listen) nur
mit der mechanischen Anpassung im selben Ticket (markiert `// v1.4: mechanisch angepasst, Folgeticket`). Keine Logik
außerhalb von `vertrag` (die Handler kommen in Folgetickets, bis dahin weisen Kern und Speicher Neues mit
`befehl-nicht-zustaendig` bzw. `unbekannt` ab, wie bei v1.3). Begriffe zuerst ins `GLOSSARY.md` (L2): Nachtrag (Lesart
D-35), Nachtragsangaben, Nachtragsstatus, Aufmaßblatt/Aufmaß, Aufmaßposition, Rechnung, Rechnungsart, Umlage,
Sicherheitseinbehalt, Gewährleistungseinbehalt, Freigabe, Zahlbetrag, Leistungsstand, Kostenermittlungsstufe, Muster-LV
(Vorlage), Textquelle.

Grundlage sind D-34 (Rechnungsprüfung), D-35 (Nachtrag), D-36 (Umfang), D-37 (Kostenkontrolle), D-38 (Tor M4). Lies sie ganz.

1. **Auftrags-LV lesen (alt 70).** `Speicher.auftragsLeistungsverzeichnisse: AuftragsLvRepository` mit
   `auflisten(projektId)` → `AuftragsLvUebersicht { id, name, leistungsverzeichnisId, angebotId }` (sortiert wie die
   LV-Liste) und `laden(id)` → `AuftragsLvZustand`. Heute liest die App ein Auftrags-LV aus dem ganzen Projektdatei-Export
   (D-64.2).
2. **Befehle am Auftrags-LV (D-36 (4)).** `AuftragsLvBefehl` = `AuftragsLeistungsverzeichnisAnlegen` | `NachtragUebernehmen
   { nachtragLvId: LeistungsverzeichnisId; knoten: readonly Knoten[] }` | `KostengruppeSetzen`. Lesart `NachtragUebernehmen`
   (D-35): `knoten` ist genau eine neue Gliederung auf oberster Ebene samt Teilbaum, Eltern vor Kindern, PositionIds wie im
   Nachtrags-LV; der Kern prüft Baumregeln (F1, höchstens 5 Ebenen) und eindeutige Kennungen. Signaturen für Anwenden und
   Umkehren des `AuftragsLvChangeSet` (wie `LvChangeSetAnwenden`), damit Ticket 71 sie liefert und die App den Umweg
   über die LV-Umkehrung (D-64.4) entfernt.
3. **Nachtrag (D-35).** `Nachtragsstatus = 'angemeldet' | 'angeboten' | 'beauftragt' | 'abgelehnt'`,
   `Nachtragsangaben { auftragsLvId; nummer: string; status }` als optionales Feld am Kopf des Ausschreibungs-LV (enge
   Lesart: `LvKopf.nachtrag?`; braucht `LeistungsverzeichnisAnlegen` es, dann `LvInhaltKopf`, Grund im Ticket), LvBefehl
   `NachtragsangabenSetzen { nachtrag: Nachtragsangaben | null }`. Das Nachtragsangebot ist ein gewöhnliches `Angebot`.
4. **Kostengruppe (C2, D-36 (4)).** Marke `Kostengruppennummer` wandert von `kosten` nach `vertrag` (`kosten` importiert sie
   von dort, mechanisch; Erzeugung bleibt `kgLesen` in `kosten`). `Positionsdaten.kostengruppe?: Kostengruppennummer`
   (fehlt = keine). Befehl `KostengruppeSetzen { positionId; kostengruppe: Kostengruppennummer | null }` gilt im LV und im
   Auftrags-LV (derselbe Typ in beiden Unions, oder zwei Namen; im Ticket begründen; Protokoll unterscheidet über
   `AggregatBezug`).
5. **Muster-LV und Textquelle (C5, G-17, D-36 (6)).** `LvKopf.vorlage?: boolean` und `Positionsdaten.textquelle?: string`,
   dazu LvBefehle `VorlageSetzen { vorlage: boolean }` und `TextquelleSetzen { positionId; textquelle: string | null }`
   (D-40). Kein Typ für Textbausteine.
6. **Aufmaß (A2, D-36 (1)).** Marke `AufmassId`. `AufmassKopf { id, projektId, auftragsLvId, nummer: number (≥ 1, je
   Auftrags-LV eindeutig), bezeichnung: string, datum: string | null (JJJJ-MM-TT, vom Nutzer) }`, `Aufmassposition {
   positionId; mengenansatz: readonly Ansatzzeile[] | null; menge: Menge | null }` (eine Zeile je Position und Blatt; Menge
   rechnet die App mit `mengen`, Lesarten wie `MengenansatzSetzen`, D-22), `Aufmass extends AufmassKopf { positionen }`,
   `AufmassZustand`. Befehle (`AufmassBefehl`, ausgeführt von `abrechnung`): Anlegen (mit Positionen; X31-Import), Kopf
   setzen, Position setzen (ersetzt), Position entfernen, Löschen. ChangeSet `AufmassChangeSet` als ganzes Aggregat
   `{ vorher, nachher }` (D-36 (8)), umkehrbar durch Tausch.
7. **Rechnung (A3, D-34, D-36 (2)).** Marke `RechnungId`. `Rechnungsart = 'abschlag' | 'schluss'`, `Umlage { bezeichnung;
   satz: Prozent }`, `Rechnung { id, projektId, auftragsLvId, nummer: number (≥ 1, je Auftrags-LV eindeutig), art,
   eingang: string | null, rechnungsnummerAuftragnehmer: string | null, gefordert: { netto: Betrag; brutto: Betrag } | null,
   aufmassIds: readonly AufmassId[] (vollständige kumulierte Menge), umlagen, sicherheitSatz: Prozent | null,
   gewaehrleistungSatz: Prozent | null, freigabe: { zahlbetrag: Betrag } | null }`. Befehle (`RechnungBefehl`, ausgeführt von
   `abrechnung`): Anlegen, Angaben setzen, Aufmaße setzen, Abzüge setzen, `RechnungFreigeben { zahlbetrag }` (die App rechnet
   den Zahlbetrag mit `abrechnung` und gibt ihn mit, Lesart wie `MengenansatzSetzen`), Freigabe aufheben (nur als Umkehrung
   oder ausdrücklich, im Ticket entscheiden), Löschen. Eine freigegebene Rechnung ändert nur „Freigabe aufheben“ (enge
   Lesart, Q5). ChangeSet als ganzes Aggregat.
8. **Leistungsstand (D-36, D-37).** `Leistungsstand { positionen: readonly { positionId; menge: Menge | null; gp: Betrag
   }[]; leistung: Betrag; nachlass: Betrag; nettoNachNachlass: Betrag }` — `abrechnung` erzeugt, `kosten` verbraucht;
   nie gespeichert.
9. **Kostenermittlung (C3, D-36 (3)).** Marke `KostenermittlungId`. `Kostenermittlungsstufe = 'kostenrahmen' |
   'kostenschaetzung' | 'kostenberechnung' | 'kostenanschlag' | 'kostenfeststellung'`, `Kostenermittlungseintrag {
   nummer: Kostengruppennummer; betrag: Betrag; bemerkung?: string }` (gespeichert kanonisch; der ungeprüfte Text der
   Eingabe bleibt eine Funktion in `kosten`), `Kostenermittlung { id, projektId, stufe, name, eintraege }` (Nummern im
   gespeicherten Stand eindeutig, enge Lesart), `KostenermittlungZustand`. Befehle (`KostenermittlungBefehl`, ausgeführt von
   `kosten`): Anlegen, Kopf setzen (Name, Stufe), Eintrag setzen (ersetzt den Eintrag der Nummer), Eintrag entfernen,
   Löschen. ChangeSet als ganzes Aggregat.
10. **Rand.** `AggregatBezug` um `aufmass`, `rechnung`, `kostenermittlung`; `Befehl` und `ChangeSet` erweitert;
    Signaturen `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren` je neuem Aggregat; Repositories
    `aufmasse` (`auflisten(auftragsLvId)`, nach `nummer`), `rechnungen` (dito), `kostenermittlungen` (`auflisten(projektId)`)
    am `Speicher`; `Projektdatei` bekommt die drei Listen (enge Lesart: optional, fehlt = leer, wie `lvStaende`);
    Massenbefehle: `AufmassAnlegen` (X31) und `KostenermittlungAnlegen` (CSV) ja/nein im Ticket entscheiden (mit
    `Massenbefehlskopf`); Löschregeln (`konflikt`): Auftrags-LV mit Aufmaß/Rechnung, Aufmaß in einer Rechnung, Rechnung mit
    späterer freigegebener Rechnung.
11. **Beispiele und Typtests** in `beispiele.ts`/`vertrag.test.ts` für jeden neuen Typ (wie bisher).

## Grenzen

- Nur `packages/vertrag`, `GLOSSARY.md` und die markierten mechanischen Zeilen (in `kern`, `speicher`, `kosten`, `mengen`,
  `vergabe`, `gaeb`, `ausgabe`, `ui-grid`, `apps/web`, `proto` – was der Typprüfer verlangt, sonst nichts). Andere Umsetzer
  arbeiten gleichzeitig in `vergabe` (72), `gaeb` (73), `ui-grid` (74), `fixtures` (75), `erechnung` (76), `ausgabe` (77),
  `kosten` (78): halte die mechanischen Zeilen dort minimal, damit der Merge einfach bleibt.
- Keine Logik, keine Migration (Folgetickets: 71 Kern, 79 Speicher, 80/81 Abrechnung, 82 Kosten, 84 GAEB, App-Tickets).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Typen mit Kommentar im Stil von `vertrag`; Lesarten D-34/D-35/D-36 am Typ; Offene Typfragen unter Comments
- [ ] Jede mechanische Anpassung markiert, Liste in den Comments; Folgearbeit je Paket als Stichpunkt für die Tickets 71,
      79–84 unter Comments
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

(Alt: Ticket 70 „Repository und Befehle für das Auftrags-LV“, Punkt 1 und 2 oben. Erweitert zu v1.4 durch D-36.)

### Ergebnis (Branch `welle-5/70-vertrag-v1.4`, Basis `integration/welle-5`)

Typen, Kommentare, Beispiele und Typtests in `packages/vertrag/src/` (`marken.ts`, `modell.ts`, `befehle.ts`,
`changeset.ts`, `summen.ts`, `speicher.ts`, `beispiele.ts`, `vertrag.test.ts`, `inhaltsmodell.test.ts`), `GLOSSARY.md`,
dazu die markierten mechanischen Zeilen (Liste unten). Leitlinie wie in Ticket 29/53: enge Lesart im Typ, neue Felder
optional mit natürlicher Leerbedeutung, Alternativen als Offene Typfragen. Kein Rechenwert, keine Fixture, kein Golden
geändert. Je Punkt ein Commit (1–11), dazu Glossar und eine Angleichung an die Tickets 80/81 (D-70.3).

### Je Punkt: Datei und Typ

1. `speicher.ts`: `AuftragsLvUebersicht { id, name, leistungsverzeichnisId, angebotId }`, `AuftragsLvRepository`
   (`auflisten(projektId)` sortiert wie die LV-Liste, `laden(id)` → `AuftragsLvZustand`),
   `Speicher.auftragsLeistungsverzeichnisse` (Pflicht).
2. `befehle.ts`: `NachtragUebernehmen { nachtragLvId, knoten }` (Lesart D-35 am Typ, D-70.6); `AuftragsLvBefehl` = Anlegen |
   `NachtragUebernehmen` | `KostengruppeSetzen`. `changeset.ts`: `AuftragsLvChangeSetAnwenden`, `AuftragsLvChangeSetUmkehren`.
3. `modell.ts`: `Nachtragsstatus`, `Nachtragsangaben { auftragsLvId, nummer, status }`, `LvKopf.nachtrag?` (nicht am
   `LvInhaltKopf`, D-70.2); `befehle.ts`: LvBefehl `NachtragsangabenSetzen { nachtrag | null }`.
4. `marken.ts`: Marke `Kostengruppennummer` (aus `kosten`); `Positionsdaten.kostengruppe?`; `KostengruppeSetzen { positionId,
   kostengruppe | null }` als **ein** Typ in `LvBefehl` und `AuftragsLvBefehl` (D-70.1).
5. `LvKopf.vorlage?: true` (D-70.2), `Positionsdaten.textquelle?: string`; LvBefehle `VorlageSetzen { vorlage: boolean }`,
   `TextquelleSetzen { positionId, textquelle | null }` (D-40).
6. `AufmassId`; `AufmassKopf`, `Aufmassposition { positionId, mengenansatz | null, menge | null }`, `Aufmass`,
   `AufmassZustand`; `AufmassBefehl` = `AufmassAnlegen` | `AufmasskopfSetzen` | `AufmasspositionSetzen` |
   `AufmasspositionEntfernen` | `AufmassLoeschen`; `AufmassChangeSet { art: 'aufmass', aufmassId, aufmass: Aenderung<Aufmass> }`.
7. `RechnungId`; `Rechnungsart`, `Umlage`, `Rechnung` (Felder wie im Ticket), `RechnungZustand`; `RechnungBefehl` =
   `RechnungAnlegen` | `RechnungsangabenSetzen` | `RechnungsaufmasseSetzen` | `RechnungsabzuegeSetzen` | `RechnungFreigeben` |
   `RechnungsfreigabeAufheben` | `RechnungLoeschen`; `RechnungChangeSet`; neuer `Befehlsfehlercode` `rechnung-freigegeben`.
8. `summen.ts`: `Leistungsstand { positionen: { positionId, menge, gp }[], leistung, nachlass, nettoNachNachlass }` (D-70.7).
9. `KostenermittlungId`; `Kostenermittlungsstufe`, `Kostenermittlungseintrag { nummer, betrag: Betrag, bemerkung? }`,
   `Kostenermittlung`, `KostenermittlungZustand`; `KostenermittlungBefehl` (Anlegen, `KostenermittlungskopfSetzen`,
   `KostenermittlungseintragSetzen`, `KostenermittlungseintragEntfernen`, `KostenermittlungLoeschen`);
   `KostenermittlungChangeSet`.
10. `AggregatBezug` um `aufmass`, `rechnung`, `kostenermittlung` (gleich `ChangeSet.art`); `Befehl` und `ChangeSet`
    erweitert; je Aggregat `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`; `AufmassRepository`
    (`auflisten(auftragsLvId)` → `AufmassKopf[]` nach `nummer`), `RechnungRepository` (`auflisten(auftragsLvId)` → ganze
    `Rechnung[]` nach `nummer`), `KostenermittlungRepository` (`auflisten(projektId)` → `KostenermittlungUebersicht[]`);
    `Speicher.aufmasse`, `.rechnungen`, `.kostenermittlungen` (Pflicht); `Projektdatei.aufmasse?`, `.rechnungen?`,
    `.kostenermittlungen?` (optional, fehlt = leer); `MASSENBEFEHLSARTEN` + `AufmassAnlegen`, `Massenbefehlskopf` mit
    `aufmass: AufmassKopf` (D-70.5); `IdQuelle.aufmass()`, `.rechnung()`, `.kostenermittlung()`; Löschregeln am
    `Speicher`, an `AuftragsLvChangeSet`, `RechnungChangeSet`, `AufmassLoeschen`, `RechnungLoeschen`, `ProjektLoeschen`.
11. Beispiele (`beispiele.ts`, Abschnitt v1.4) für jeden neuen Befehl und Typ, mit hergeleiteten Zahlen (Nachtrag N01,
    Blatt 1/2, AR 1 mit eingefrorenem Zahlbetrag 53,42, AR 2, Leistungsstand 49,85, Kostenberechnung, Projektdatei);
    Typtests `vertrag.test.ts`, Abschnitte „v1.4 Punkt 1…11“ und „v1.4: reine Daten und Werte vor v1.4“.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-70.1** `KostengruppeSetzen` im LV und im Auftrags-LV: ein Typ oder zwei Namen? **Ein Typ in beiden Unions.** Grund: eine
  Handlung, ein Name (L2); das Protokoll unterscheidet über `AggregatBezug`, der Ausführer über den Zustand. `Befehl` enthält
  ihn einmal; jeder andere Befehlsname gehört zu genau einem Aggregat (Typtest).
- **D-70.2** Wo stehen `nachtrag` und `vorlage`? **Am `LvKopf`, nicht am `LvInhaltKopf`; `vorlage?: true`.** Grund: Das
  Auftrags-LV trägt beides nie, GAEB-Leser und `LeistungsverzeichnisAnlegen` brauchen es nicht (die App setzt es im selben
  Undo-Schritt nach dem Anlegen); `true`/fehlt ist eine Schreibweise für „nein“ (wie `Auszeichnung`, kanonische Datei).
- **D-70.3** Was prüfen die Ausführer der neuen Aggregate? **Nur die Form ihres Aggregats** (Signaturen ohne Kontext);
  Regeln über mehrere Aggregate prüfen reine Funktionen als Befund (`aufmassPruefen`, `rechnungPruefen`) bzw. die App vorher
  (`freigabeMoeglich`), was nie verletzt sein darf `speicher` (`konflikt`). Grund: U5, Q5 und die Zuschnitte der Tickets
  80/81 (während der Arbeit gelesen; eine erste Fassung hatte Ausführer mit Kontext und einen zweiten Fehlercode
  `freigabe-reihenfolge`, den ein Ausführer ohne Kontext nie erzeugen kann: verworfen).
- **D-70.4** Freigabe aufheben nur als Umkehrung oder ausdrücklich? **Ausdrücklich** (`RechnungsfreigabeAufheben`), nur ohne
  spätere freigegebene Rechnung; an einer freigegebenen Rechnung gilt nur dieser Befehl (neuer Code `rechnung-freigegeben`).
  Grund: Die Undo-Historie endet mit der Sitzung (ADR 0006); ohne Befehl bliebe eine falsche Freigabe für immer. Q5: Die
  Oberfläche fragt ausdrücklich, `speicher` hält die Reihenfolge.
- **D-70.5** Massenbefehle? **`AufmassAnlegen` ja** (X31: eine Zeile je Position samt Ansatzzeilen, wächst mit dem LV wie
  `AngebotAnlegen`); `KostenermittlungAnlegen` **nein** (höchstens ein Eintrag je Nummer, höchstens 900 kurze Einträge);
  `RechnungAnlegen` und `NachtragUebernehmen` nein (kurz).
- **D-70.6** `NachtragUebernehmen`: Wer vergibt Lage und OZ? **`nachtragUebernehmen` (Ticket 80)**; der Kern übernimmt die
  Knoten wie mitgebracht (wie `AuftragsLeistungsverzeichnisAnlegen`, nicht wie `KnotenEinfuegen`) und prüft Baumregeln und
  Kennungen; Gliederungen und Hinweistexte des Nachtrags behalten ihre Kennung. Grund: ein Ort für die Regel (D-35); der
  Befehl im Protokoll ist das Ergebnis.
- **D-70.7** `Leistungsstand.positionen`: welche Positionen? **Genau eine Zeile je Position des Auftrags-LV** in
  Dokumentreihenfolge, auch ohne Aufmaß (`menge: null`, `gp: 0.00`); `nachlass` ≥ 0 wie `Gesamtsummen.nachlass`. Grund:
  vollständig und eindeutig für die Kostenkontrolle (D-37), Σ `gp` = `leistung`.
- **D-70.8** Neue Felder in `kern` und `speicher` vor 71/79? **Laut abweisen statt still verwerfen** (Q5, wie D-53.3): Der Kern
  weist `PositionAnlegen` mit `kostengruppe`/`textquelle` und alle neuen Befehle mit `befehl-nicht-zustaendig` ab;
  `speicher` (`pruefeV14`) weist ChangeSets mit `nachtrag`, `vorlage`, `kostengruppe`, `textquelle` und die neuen
  ChangeSet-Arten mit `unbekannt` ab; die neuen Repositories antworten `unbekannt`.
- **D-70.9** Blatt- und Rechnungsnummer änderbar? **Nein, fest nach dem Anlegen** (Kopf- und Angabenbefehle tragen sie
  nicht). Grund: Rechnungen ordnen danach („frühere Rechnungen“, D-34 (7)); eine Korrektur geht über Löschen und Neuanlegen.
- **D-70.10** `RechnungRepository.auflisten` liefert ganze Rechnungen statt einer Übersicht. Grund: Rechnungen sind klein,
  die Prüfung einer Rechnung braucht alle früheren (D-34 (7)).
- **D-70.11** `IdQuelle` um `aufmass()`, `rechnung()`, `kostenermittlung()` (Pflicht). Grund: Kennungen kommen von außen
  (A2), es gibt genau eine `IdQuelle`; mechanisch in der App und in der Test-`IdQuelle` von `gaeb`.

### Offene Typfragen (enge Lesart im Typ; Alternative hier)

v1.5 (Ticket 95, D-95.4): alle gesichtet. 8 entschieden (Netto und Brutto kumuliert, ohne Typänderung), 12 erledigt
(Ticket 82), 4, 6, 10 und 15 vertagt mit Grund, die übrigen bleiben in der engen Lesart. Einzelheiten dort.

1. **`nachtrag` und `vorlage` nur am `LvKopf`** (D-70.2). Alternative: am `LvInhaltKopf`, damit `LeistungsverzeichnisAnlegen`
   sie mitbringt (dann auch am Auftrags-LV möglich und im GAEB-Leser zu bedenken).
2. **`vorlage?: true`.** Alternative: `vorlage?: boolean` (Wortlaut des Tickets; zwei Schreibweisen für „kein Muster-LV“).
3. ~~`LvUebersicht` ohne `nachtrag`/`vorlage`.~~ **Beantwortet (D-43, Review):** additiv `LvUebersicht.nachtrag?` und
   `.vorlage?: true` in der Schreibweise des Kopfs; die projektübergreifende Vorlagenliste baut die App aus den Listen.
4. **Textquelle nur an Positionen.** Ein Textbaustein kann auch ein Hinweistext sein (D-36 (6)). Alternative:
   `Hinweistext.textquelle?` mit `TextquelleSetzen { knotenId: PositionId | HinweistextId }`.
5. **Kostengruppe nur an Positionen** (D-36 (4)). Alternative: an Gliederungen, an Positionen vererbt (bequemer bei großen
   LVs, aber zwei Quellen für denselben Wert).
6. **Ganze Aggregate im ChangeSet** (D-36 (8)), auch für eine einzelne Aufmaßzeile. Alternative für große X31-Blätter:
   `Aenderungen<Aufmassposition>` wie bei `AngebotChangeSet.positionen`. Vorerst entschieden (D-45): bleibt; Ticket 87 misst.
7. **Blatt- und Rechnungsnummer fest** (D-70.9). Alternative: Nummer in `AufmasskopfSetzen`/`RechnungsangabenSetzen`
   (Eindeutigkeit dann nur in `speicher`).
8. ~~`Rechnung.gefordert` nur Netto und Brutto, beide Pflicht.~~ **Beantwortet (D-44, Review):** `{ netto | null; brutto |
   null; zahlbetrag | null } | null`, äußeres `null` als einzige Schreibweise für „nichts erfasst“. Offen bleibt nur, ob
   Netto und Brutto kumuliert sind (Alternative: Kennzeichen `kumuliert` oder getrennte Felder).
9. **`sicherheitSatz` und `gewaehrleistungSatz` als zwei Felder an jeder Rechnung**, je Art wird nur eines gelesen.
   Alternative: Union nach `art` (`{ art: 'abschlag'; sicherheitSatz } | { art: 'schluss'; gewaehrleistungSatz }`).
10. **`Aufmassposition` ohne Bemerkung.** Ticket 83 soll für Textzeilen (`*`) einer X31 zwischen „Bemerkung“ und „Befund“
    entscheiden; der Vertrag hat kein Feld dafür, also bis auf Weiteres Befund. Alternative: `Ansatzzeile.bemerkung?` oder
    `Aufmassposition.bemerkung?`.
11. **Kostenermittlung: Nummern im gespeicherten Stand eindeutig.** Alternative: Duplikate speichern (wie die ungeprüfte
    Eingabe, Befund `nummer-doppelt`, D-55.4).
12. **Zwei Typen namens `Kostenermittlungseintrag`** (Vertrag: `betrag: Betrag`; `kosten`: ungeprüfter Text
    `betrag: string`). Der Vertragstyp ist dem von `kosten` zuweisbar. Vorschlag für Ticket 82: den Eingabetyp in `kosten`
    umbenennen (z. B. `Kostenermittlungseingabe`).
13. **Keine Herkunft am übernommenen Nachtragsknoten.** Welche Gliederung des Auftrags-LV zu welchem Nachtrags-LV gehört,
    steht nur im Protokoll (`NachtragUebernehmen.nachtragLvId`) und folgt aus den PositionIds. Alternative:
    `Titel.nachtragLvId?` bzw. `Los.nachtragLvId?` an der Gliederung „Nachtrag <nummer>“.
14. **`Leistungsstand` ohne Kennung der Rechnung oder des Auftrags-LV.** Ticket 82 trägt sie daneben
    (`{ auftragsLvId; leistungsstand }`). Alternative: `Leistungsstand.auftragsLvId`, `.rechnungId`.
15. **Kein Rechnungsdatum an der `Rechnung`**, nur `eingang` (Eingangsdatum beim Auftraggeber). Die XRechnung nennt das
    Rechnungsdatum (BT-2); Ticket 88 übernimmt laut Text das „Eingangsdatum“. Alternative: `Rechnung.rechnungsdatum:
    string | null` neben `eingang` (Zahlungsfristen nach VOB/B § 16 laufen ab Zugang, darum ist `eingang` das Datum, das
    der Vertrag führt).

### Mechanische Anpassungen außerhalb von `vertrag` (markiert `// v1.4: mechanisch angepasst, Folgeticket`)

Zeilen nach dem Stand dieses Branches; `grep -rn "v1.4: mechanisch angepasst"` findet alle.

| Datei | Zeile | Was | Folgeticket |
|---|---|---|---|
| `packages/kern/src/ausfuehren.ts` | 111–116 | `ZUSTAENDIGES_TICKET`: `NachtragsangabenSetzen`, `KostengruppeSetzen`, `VorlageSetzen`, `TextquelleSetzen` → „(Ticket 71)“ | 71 |
| `packages/kern/src/auftrags-lv.ts` | 20–26 | `auftragsLvBefehlAusfuehren`: jeder Befehl außer Anlegen → `befehl-nicht-zustaendig` | 71 |
| `packages/kern/src/knoten-befehle.ts` | 232–239 | `positionAnlegen` mit `kostengruppe`/`textquelle` → `befehl-nicht-zustaendig` (sonst still verworfen, Q5) | 71 |
| `packages/kern/src/baum.test.ts` | 690–726 | `ZUSTAENDIGES_TICKET` nennt die vier v1.4-Befehle; Test: alle v1.4-LV-Befehle und `PositionAnlegen` mit neuen Feldern werden abgewiesen | 71 |
| `packages/kern/src/auftrags-lv.test.ts` | 99–111 | Test: `NachtragUebernehmen` wird abgewiesen | 71 |
| `packages/speicher/src/client.ts` | 88–90, 109–122 | `erstV14`; Repositories `auftragsLeistungsverzeichnisse`, `aufmasse`, `rechnungen`, `kostenermittlungen` antworten `unbekannt` | 79 |
| `packages/speicher/src/kern.ts` | 50, 61–64, 259 | Import und Aufruf `pruefeV14`; `pruefeBezug`: neue ChangeSet-Arten → `unbekannt` | 79 |
| `packages/speicher/src/vertrag-v14.ts` | neu | `pruefeV14`: Kopf mit `nachtrag`/`vorlage`, Positionen mit `kostengruppe`/`textquelle` (Baum und Papierkorb), neue ChangeSet-Arten → `unbekannt` | 79 |
| `packages/speicher/src/vertrag-v14.test.ts` | neu | die `unbekannt`-Fälle und die Repositories | 79 |
| `packages/speicher/src/dekoder.ts` | 774–796, 827 | `BEFEHLSARTEN` um die 22 neuen Befehle; `LANGE_LISTE.AufmassAnlegen` | 79 |
| `packages/speicher/src/kurzfassung.ts` | 43–44 | `massenbefehlskopf` für `AufmassAnlegen` (Blatt ohne `positionen`) | 79 |
| `packages/speicher/src/testhilfe/umkehrung.ts` | 92–96, 102–104 | `umkehren`: neue Arten werfen; `mitLeeremVorher`: Aggregate ohne Summen bleiben unverändert | 79 |
| `packages/speicher/src/client.test.ts` | 291–306 | erwartete Schlüssel des Speichers um die vier Repositories | 79 |
| `packages/kosten/src/kostengruppe.ts` | 5–9 | `Kostengruppennummer` aus `vertrag` importiert und weiter exportiert | 82 |
| `packages/gaeb/src/testhilfen.ts` | 71–74 | Test-`IdQuelle`: `aufmass`, `rechnung`, `kostenermittlung` | 83 |
| `apps/web/src/lv/ids.ts` | 75–78 | `appIdQuelle`: `aufmass`, `rechnung`, `kostenermittlung` (UUIDv7 wie die übrigen) | App |
| `apps/web/src/lv/texte.ts` | 187–188 | Text für `rechnung-freigegeben` | 88 |
| `packages/vergabe/src/zuschlag-erteilen.ts` | 68–76, 187–193 | Review, D-42 (markiert `// v1.4: D-42`): Nachtrags-LV → `ungueltige-eingabe` (`feld: 'leistungsverzeichnis.nachtrag'`); `vorlage`/`nachtrag` nicht in den Kopf des Auftrags-LV (`ohneLvKennzeichen`) | 71, 86 |
| `packages/vergabe/src/zuschlag-erteilen.test.ts` | 156–162, 223–236 | je ein Test zu D-42 | – |

`mengen`, `ausgabe`, `ui-grid`, `ui-basis`, `erechnung` und `proto` brauchten nichts; `vergabe` nur die Review-Zeilen (D-42). Die App braucht keinen
Umkehr-Zweig: `Teil.changeSet` in `historie/historie.ts` nennt nur die vier bisherigen ChangeSet-Arten.

### Folgetickets: was sie liefern müssen

- **71 (Kern):** Handler `NachtragUebernehmen` (Lesart D-35/D-70.6 am Typ: genau eine Wurzel auf oberster Ebene mit
  `elternId` = Auftrags-LV und `reihenfolge` = Zahl der Knoten dort; F1, höchstens 5 Ebenen, Eltern vor Kindern, dichte
  Reihenfolge, Kennungen frei, sonst `id-vergeben`; Knoten wie mitgebracht, `''`-Einheit → `null`; Summen);
  `KostengruppeSetzen` im LV **und** im Auftrags-LV (nur Position, Form `^[1-9][0-9]{2}$` nachprüfen, kein Import aus
  `kosten`); `NachtragsangabenSetzen` (`nummer` nicht leer, Status); `VorlageSetzen` (`false` → Feld weg);
  `TextquelleSetzen` (`''` wie `null`); `positionAnlegen`, `KnotenEinfuegen` und Kopie übernehmen `kostengruppe` und
  `textquelle`; `auftragsLvChangeSetAnwenden`/`…Umkehren` nach den neuen Signaturen; alle Marker in `kern` entfernen,
  `ZUSTAENDIGES_TICKET` wieder leer.
- **79 (Speicher):** Migration 5 (Spalten `kostengruppe`, `textquelle`, `nachtrag`, `vorlage`; Tabellen `aufmass`,
  `rechnung`, `kostenermittlung`; `protokoll.aggregat_art` mit drei neuen Arten); die vier Repositories (Sortierungen am
  Typ); `anwenden` für die drei ganzen Aggregate und für Auftrags-LV-Änderungen; alle `konflikt`-Regeln aus dem Kommentar an
  `Speicher` (Auftrags-LV mit Aufmaß, Rechnung oder Nachtragsangaben; Position mit Aufmaßzeile; Blatt in einer Rechnung;
  Reihenfolge der Freigaben; fremde Kennungen; doppelte Nummern; Projekt mit Kostenermittlung); Projektdatei mit drei
  optionalen Listen (leer = weggelassen); Kurzfassung für `AufmassAnlegen`; Dekoder für die neuen Befehle und
  Aggregatarten; alle Marker in `speicher` sowie `vertrag-v14.ts` samt Test löschen.
- **80 (Abrechnung, Nachtrag und Aufmaß):** `nachtragUebernehmen` liefert die Knoten genau in der Lesart von
  `NachtragUebernehmen` (Lage, OZ, Kennungen; MwSt-, Angebots- und Bieterprüfung vor dem Befehl);
  `aufmassBefehlAusfuehren` (Form: Nummer ≥ 1, eine Zeile je Position, Menge kanonisch, `[]` → `null`; Zeile an ihrer Stelle
  ersetzen, neue ans Ende; Entfernen einer fehlenden Zeile → `ungueltige-eingabe`), `…Anwenden`/`…Umkehren` (Tausch);
  `aufmassPruefen` auch für Zuschlagspositionen (zählen nicht).
- **81 (Abrechnung, Soll/Ist und Rechnung):** `leistungsstandBerechnen` nach D-70.7 (eine Zeile je Position);
  Rechnungs-Ausführer nur mit Form und `rechnung-freigegeben` (D-70.3, D-70.4: Anlegen mit `freigabe` → `ungueltige-eingabe`,
  Aufheben einer nicht freigegebenen → `ungueltige-eingabe`, doppelte `aufmassIds` → `ungueltige-eingabe`);
  `freigabeMoeglich` deckt die Reihenfolge ab; Befunde „Schlussrechnung nicht die letzte“ und fehlende frühere Blätter.
- **82 (Kosten):** Ausführer und `…Anwenden`/`…Umkehren` für `Kostenermittlung` (Einträge nach Nummer geordnet und
  eindeutig, `bemerkung: ''` → weg); den Eingabetyp `Kostenermittlungseintrag` in `kosten` umbenennen (Offene Typfrage 12);
  `kostenkontrolleBerechnen` liest `Positionsdaten.kostengruppe` und `Leistungsstand`; die Marke kommt schon aus `vertrag`.
- **83 (GAEB X31):** `x31Lesen` liefert `Aufmass` mit Zeilen ohne Menge (die App rechnet); Textzeilen sind Befund, solange es
  kein Bemerkungsfeld gibt (Offene Typfrage 10); `testIds` hat die neuen Kennungen schon.
- **84 (GAEB v1.4):** `kostengruppe` als `CtlgAssign`; `textquelle` (Position) und `vorlage`/`nachtrag` (nur am `LvKopf`,
  nicht in `LvInhalt`: der Writer bekommt sie nur, wenn die App sie weiterreicht) beim Export mit Warnung verwerfen.
- **Vergabe:** erledigt im Review (D-42, siehe unten); der Kern legt am Auftrags-LV nur `AuftragsLvKopf`-Felder ab (71), die
  App bietet den Zuschlag an einem Nachtrags-LV nicht an (86).
- **App (86–90):** 86: `speicher.auftragsLeistungsverzeichnisse` statt Projektdatei-Export, `auftragsLvChangeSetUmkehren` aus
  dem Kern, Umweg in `auftrag/auftrag.ts` entfernen; `Teil.changeSet` und die Umkehrung in `lv/befehlsweg.ts` um die drei
  neuen Arten erweitern, sobald 87–89 sie schreiben (Tausch). 88: Text für `rechnung-freigegeben` prüfen,
  `freigabeMoeglich` vor `RechnungFreigeben`. 89: `KostengruppeSetzen` mit dem richtigen Aggregat im Protokolleintrag
  (`leistungsverzeichnis` bzw. `auftrags-leistungsverzeichnis`). 90: `VorlageSetzen`, `TextquelleSetzen`; Liste der Vorlagen
  (Offene Typfrage 3).

### Review-Fixes (Opus-Reviewer „yes-with-fixes“, D-42 bis D-45; Befund → Commit)

1. Freigabe-Reihenfolge (major): Invariante „Die freigegebenen Rechnungen eines Auftrags-LV sind stets die mit den kleinsten
   Nummern“ an `Rechnung`, `RechnungChangeSet`, `Speicher` und `RechnungAnlegen`; `konflikt` auch für das Anlegen einer
   Rechnung unterhalb einer freigegebenen Nummer (sonst Doppelzahlung) → `edf6974`. Umsetzung 79, Befund 81.
2. `LvUebersicht.nachtrag?`, `.vorlage?: true` additiv (D-43), Beispiel und Typtest → `7a5cfbb`. Offene Typfrage 3 erledigt.
3. Leck im Zuschlag (major, D-42, benannte Ausnahme von P2): `zuschlagErteilen` weist ein Nachtrags-LV ab und lässt
   `vorlage` weg; je ein Test in `vergabe`; Hinweis am `LvKopf.nachtrag` → `8b20f1e`.
4. Prozentsätze als „× Satz / 100“ in `Umlage`, `Rechnung.sicherheitSatz`, `Leistungsstand`; Zuschlagsposition ohne Satz:
   `gp` 0.00 mit Befund → `d42374c`.
5. `Rechnung.gefordert` mit nullbaren `netto`, `brutto`, `zahlbetrag` (BT-115), Lesart „äußeres `null` = nichts erfasst,
   Objekt mit drei `null` → `ungueltige-eingabe`“ (D-44); Beispiele und Typtests → `4801204`. Offene Typfrage 8 erledigt
   (bis auf „kumuliert“).
6. Glossar „Aufmaßblatt“ ohne Synonym („Aufmaß“ ist die Tätigkeit), Kommentare und Testtitel durchgehend „Aufmaßblatt/
   Aufmaßblätter“ → `23f6369`.

Danach `integration/welle-5` gemergt (`6f99294`, mit D-42 bis D-45 und den Nachträgen an 71, 79–89).

## Answer

Merged: 1a55037 in integration/welle-5 (Tor: D-42, Review „yes-with-fixes“, Fixes im Branch)


`vertrag` v1.4 auf Branch `welle-5/70-vertrag-v1.4` (enthält `integration/welle-5` bis `de01bde`, mit den Review-Fixes
D-42 bis D-45, siehe Comments). Neue Typen:

- **Auftrags-LV:** `AuftragsLvUebersicht`, `AuftragsLvRepository` (`Speicher.auftragsLeistungsverzeichnisse`);
  `AuftragsLvBefehl` = Anlegen | `NachtragUebernehmen` | `KostengruppeSetzen`; `AuftragsLvChangeSetAnwenden`/`…Umkehren`.
- **Nachtrag (D-35):** `Nachtragsstatus`, `Nachtragsangaben`, `LvKopf.nachtrag?`, LvBefehl `NachtragsangabenSetzen`.
- **Kostengruppe (C2):** Marke `Kostengruppennummer` (aus `kosten`), `Positionsdaten.kostengruppe?`, `KostengruppeSetzen`
  (derselbe Typ im LV und im Auftrags-LV).
- **Muster-LV, Textquelle (C5, D-40):** `LvKopf.vorlage?: true`, `Positionsdaten.textquelle?`, `VorlageSetzen`,
  `TextquelleSetzen`.
- **Aufmaß (A2):** `AufmassId`, `AufmassKopf`, `Aufmassposition`, `Aufmass`, `AufmassZustand`, `AufmassBefehl` (5 Befehle,
  `AufmassAnlegen` ist Massenbefehl), `AufmassChangeSet` (ganzes Aggregat), `AufmassRepository`.
- **Rechnung (A3, D-34):** `RechnungId`, `Rechnungsart`, `Umlage`, `Rechnung` (eingefrorener `freigabe.zahlbetrag`),
  `gefordert` mit Netto, Brutto, Zahlbetrag (D-44), `RechnungZustand`, `RechnungBefehl` (7 Befehle samt
  `RechnungsfreigabeAufheben`), `RechnungChangeSet`,
  `RechnungRepository`, Fehlercode `rechnung-freigegeben`.
- **Leistungsstand (D-37):** `Leistungsstand` (`abrechnung` erzeugt, `kosten` liest, nie gespeichert).
- **Kostenermittlung (C3):** `KostenermittlungId`, `Kostenermittlungsstufe`, `Kostenermittlungseintrag`, `Kostenermittlung`,
  `KostenermittlungZustand`, `KostenermittlungBefehl` (5), `KostenermittlungChangeSet`, `KostenermittlungUebersicht`,
  `KostenermittlungRepository`.
- **Rand:** `AggregatBezug`, `Befehl`, `ChangeSet` erweitert; je neuem Aggregat `…BefehlAusfuehren`, `…ChangeSetAnwenden`,
  `…ChangeSetUmkehren`; `Projektdatei.aufmasse?`/`.rechnungen?`/`.kostenermittlungen?`; `IdQuelle.aufmass()`,
  `.rechnung()`, `.kostenermittlung()`; `MASSENBEFEHLSARTEN` + `AufmassAnlegen`.

Lesarten stehen am Typ; Entscheidungen D-70.1 bis D-70.11, 15 Offene Typfragen, die Liste der mechanischen Anpassungen und
die Folgearbeit je Ticket (71, 79–84, Vergabe, App) unter Comments; Glossar ergänzt. Prüfung nach dem Merge:
`NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (Vitest 154 Dateien, 2175 Tests
bestanden, 2 übersprungen wie zuvor; Fixtures 22/22), zuletzt nach den Review-Fixes und dem Merge `6f99294`. Opus-Review:
„yes-with-fixes“, Fixes umgesetzt (Tor D-42).

# 70: `vertrag` v1.4: Auftrags-LV, Nachtrag, Aufmaß, Rechnung, Kostenermittlung

Status: ready-for-agent
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

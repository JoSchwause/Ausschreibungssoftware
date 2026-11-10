# 29: `vertrag` v1.2: Ergänzungen für Welle 3 (Vertrag plus Anpassung)

Status: claimed
Type: task
Welle: 3 (Phase A) · Strang: F · Paket: `packages/vertrag` (dazu nur die unten gelisteten mechanischen Zeilen in `kern`, `speicher`, `gaeb`, W-03 (b))
Blocked by: -
Regeln: A2, A4, A5, A7, L1, L2, N1, N3, P2, P9, Q5, ADR 0006, ADR 0009, ADR 0011
Herkunft: D-04, D-06 (`entscheidungen-auto.md`); W-02 Frage 3, W-03, W-05 Nr. 3 (`next-decisions-welle-2.md`); Offene Typfrage 4 (d) in Ticket 26; `maskePruefen` in `packages/kern/src/ozregeln.ts` („ab v1.1a liefert der Befehl diese Befunde mit“); Stränge K9 und S3 (`plan.md` §2)

## What to build

Ein Vertragsstand v1.2, der K9 (Ticket 42), S3 (Ticket 43), Zuschlagspositionen im Angebot (Ticket 44) und den
X84-Import (Ticket 45) trägt. **Nur Typen, Konstanten, Kommentare**; keine Logik. Additiv, wo es geht. Die Prüfung
durch den Nutzer (P9) ersetzt im Demo-Modus ein Opus-Reviewer (D-04); sein Befund kommt in die Comments.

Vor dem Entwurf lesen: `packages/vertrag/src/` ganz, die Comments von Ticket 24 und 26 (Leitlinie „enge,
umkehrbare Lesart im Typ, Alternative als Offene Typfrage“, die hier weiter gilt).

1. **Zuschlagssatz des Bieters (D-04).** Die Variante `status: 'angeboten'` von `Angebotsposition` bekommt
   `zuschlagssatz?: Prozent`. Bedeutung: Nur an einer Position, die im LV eine Zuschlagsposition ist
   (`Positionsdaten.zuschlag !== null`), der Prozentsatz, den der Bieter anbietet (GAEB `Markup` in X84). Fehlt das
   Feld: kein Satz angeboten. Die Rechnung (Ticket 44) liest bei gesetztem Satz nur den Satz. `einheitspreis` bleibt
   Pflicht, weil die Variante ihn verlangt. **Vorläufige Annahme, Entscheidung offen** (im Typkommentar): Der
   Erzeuger setzt dort den EP aus der Datei, wenn sie einen nennt, sonst `0.000`; dieser Wert wird bei gesetztem
   Satz nie gerechnet. Alternative als Offene Typfrage: eigene Variante `status: 'zuschlag-angeboten'` ohne EP
   (sauberer, aber nicht additiv: `speicher/src/zeilen.ts` schreibt heute jede Zeile, die nicht `angeboten` ist,
   als `nicht-angeboten`, das wäre stiller Datenverlust).
2. **Leere Einheit (D-06, W-05 Nr. 3).** Kommentar an `Einheit`, `Positionsdaten.einheit`, `EinheitAendern.einheit`
   und `Unterbeschreibung.einheit`: Eine leere Zeichenkette ist keine Einheit. Ein Befehl darf `''` tragen (Rand,
   Import); der Kern legt dafür `null` ab (Normalisierung beim Befehl: **Ticket 30**, für `KnotenEinfuegen`
   Ticket 42). Im Zustand steht nie `''`. Kein neuer Typ, nur die Regel.
3. **Maskenbefund am Befehl.** `Befehlshinweiscode` bekommt `'oz-maske-ungueltig'`: `LeistungsverzeichnisAnlegen`
   (GAEB-Import) nimmt eine Maske an, die der Kern beanstandet (U5), und meldet das als Hinweis. Ticket 30 liefert ihn.
4. **Befehle für K9 (Kopieren, Verschieben, Papierkorb).** Heute gibt es `KnotenVerschieben` (ein Knoten) und
   `KnotenLoeschen` (endgültig, rekursiv). Neu in `LvBefehl`:
   - `KnotenEinfuegen { ort: Einfuegeort; knoten: readonly Knoten[] }`: fügt einen oder mehrere Teilbäume ein
     (Kopieren im LV, Einfügen aus einem anderen LV oder aus der Zwischenablage). Alle Kennungen bringt der Aufrufer
     neu mit (A2, A7). Flach, Eltern vor Kindern. Knoten, deren `elternId` nicht in der Liste vorkommt, sind die
     Wurzeln der Teilbäume: Sie landen in Listenreihenfolge am `ort`, ihre `elternId` und `reihenfolge` setzt der
     Kern. Ob Ordnungszahlen übernommen oder neu vergeben werden, entscheidet K9 (Ticket 42). Die Kopie samt
     umgebogener Bezüge innerhalb der kopierten Menge (Zuschlagsbezug, `wahl.grundpositionId`) baut eine reine
     Hilfsfunktion des Kerns aus Quellknoten und neuen Kennungen (Ticket 42); der Befehl trägt das Ergebnis. Die
     Tickets 42 und 43 nennen einen anderen Vorschlag (`KnotenKopieren` mit `neueIds`, `KnotenLoeschen` in den
     Papierkorb); sie folgen ausdrücklich diesem Ticket. Weicht der Entwurf hier davon ab, steht der Grund in den Comments.
   - `KnotenlisteVerschieben { knotenIds: readonly KnotenId[]; ziel: Einfuegeort }`: eine Mehrfachauswahl als
     **ein** Befehl (ein Undo-Schritt), in Listenreihenfolge hintereinander am Ziel. `KnotenVerschieben` bleibt.
   - `KnotenInPapierkorbLegen { eintragId: PapierkorbeintragId; knotenIds: readonly KnotenId[] }`: nimmt die Knoten
     samt Unterbäumen aus dem Baum und legt sie als **einen** Papierkorbeintrag ab.
   - `PapierkorbeintragWiederherstellen { eintragId; ort: Einfuegeort | null }`: `null` heißt an die alte Stelle.
     Die Kennungen bleiben (Positionsidentität, ADR 0011: Angebote finden ihre Positionen wieder).
   - `PapierkorbeintragEntfernen { eintragId }` und `PapierkorbLeeren {}`: endgültig; unumkehrbar im Sinne von Q5
     (Bestätigung in der Oberfläche, abgesichert durch Undo und LV-Stand).
   - Zustand: `Papierkorbeintrag { id: PapierkorbeintragId; knoten: readonly Knoten[] }`; die Knoten tragen ihre alte
     Lage (`elternId`, `reihenfolge`). `Leistungsverzeichnis.papierkorb?: readonly Papierkorbeintrag[]` (fehlt =
     leer), in der Reihenfolge des Hineinlegens. Positionen im Papierkorb gehen in keine Summe ein und haben keine
     `Positionssumme`.
   - ChangeSet: `LvChangeSet.papierkorb?: Aenderungen<Papierkorbeintrag>` (fehlt = keine Änderung). Hineinlegen =
     `knoten.entfernt` + `papierkorb.hinzugefuegt`; Wiederherstellen = `knoten.hinzugefuegt` + `papierkorb.entfernt`;
     Entfernen = nur `papierkorb.entfernt`. Umkehrbar ohne Vorzustand wie seit v1.1a.
   - `KnotenLoeschen` bleibt endgültig (Umkehrung des Einfügens, Undo). Die Oberfläche löscht über den Papierkorb (U5).
5. **Typen für S3 (Undo/Redo, LV-Stände, Befehlsprotokoll).**
   - **Rückgängig/Wiederholen:** `Rueckgaengig { protokollId: ProtokollId }` und `Wiederholen { protokollId }`, als
     `HistorienBefehl` in `Befehl` (nicht in `LvBefehl`). `protokollId` nennt den Eintrag des ursprünglichen Befehls.
     Kein Kern führt sie aus: ihr ChangeSet ist die Umkehrung (bzw. das Original) des ChangeSets aus dem Undo-Stapel
     der Sitzung (ADR 0006). `speicher` schreibt sie wie jeden Befehl, ein Eintrag je Befehl (A5).
   - **LV-Stand:** Marke `LvStandId`; `LvStandKopf { id; leistungsverzeichnisId; name: string }`;
     `LvStand extends LvStandKopf { angelegt: Zeitstempel; zustand: LvZustand }` (unveränderlich, ADR 0006);
     `LvStandUebersicht = Omit<LvStand, 'zustand'>`. Befehl `LvStandAnlegen { id: LvStandId; name: string }` in
     `LvBefehl`. ChangeSet: `LvChangeSet.lvStand?: Aenderung<LvStandKopf>`. `vorher: null`: `speicher` friert den
     gespeicherten Stand des LV in derselben Transaktion ein, `angelegt` ist `Protokolleintrag.wann`. `nachher: null`
     kommt nur als Umkehrung vor: der Stand entfällt. Kein Umbenennen, kein Zurückschreiben eines Stands in das
     bestehende LV (Offene Typfrage); ein LV aus einem Stand zurückholen geht über `LeistungsverzeichnisAnlegen` mit
     dem Inhalt des Stands.
   - `LvStandRepository { auflisten(leistungsverzeichnisId): …LvStandUebersicht[]; laden(id): …LvStand }`;
     `Speicher.lvStaende?: LvStandRepository` (optional, damit `speicher` übersetzt; Pflicht, sobald Ticket 43 es
     liefert, Offene Typfrage); `Projektdatei.lvStaende?: readonly LvStand[]`.
   - Befehlsprotokoll: kein neuer Typ nötig; `Protokolleintrag.befehl` deckt die neuen Befehle über `Befehl` ab.
     `KnotenEinfuegen` ist **kein** Massenbefehl (Offene Typfrage: lange Kopien verkürzt protokollieren).
6. **Kennungen.** `PapierkorbeintragId`, `LvStandId` in `marken.ts`; `IdQuelle` bekommt `papierkorbeintrag()` und
   `lvStand()` (es gibt genau eine `IdQuelle`, v1.1a Punkt 7).
8. **Kopfdaten bearbeiten (D-02, D-07).** Befehle in `LvBefehl` zum Setzen von Auftraggeber, Vergabeinformationen
   (am LV) und Leitbeschreibung (an der Position), je ein Befehl mit dem ganzen neuen Wert (`null` = entfernen), Formen
   wie die vorhandenen Feldbefehle (`KurztextAendern`). Felder genau wie die v1.1b-Typen dieser Kopfdaten. Der
   Kern-Handler kommt mit Ticket 41 (`ZUSTAENDIGES_TICKET`: `'K8 (Ticket 41)'`), die Oberfläche mit Ticket 47.
7. **Glossar (L2).** Neue Einträge: „Papierkorb“ / „Papierkorbeintrag“, „LV-Stand“, „Rückgängig / Wiederholen
   (Undo/Redo)“, „Zuschlagssatz (des Bieters)“. Ergänzen: „Einheit“ (leer = `null`), „Befehlshinweis“ (dritter Code).

## Grenzen

- **Vertrag plus Anpassung (W-03 (b), D-06).** Nicht additiv sind nur die neuen Glieder geschlossener Listen. Im
  selben Ticket ausschließlich diese Zeilen, jede mit `// v1.2: mechanisch angepasst, Folgeticket` markiert:
  - `packages/kern/src/ausfuehren.ts`, `ZUSTAENDIGES_TICKET`: Schlüssel der neuen `LvBefehl`-Arten mit
    `'K9 (Ticket 42)'` (auch `LvStandAnlegen`: der Handler gehört zu Ticket 42).
  - `packages/speicher/src/dekoder.ts`, `BEFEHLSARTEN`: die neuen Befehlsnamen.
  - `packages/speicher/src/schreiben.ts` (`wendeLvAn`, `wendeAngebotAn`): ein ChangeSet mit `papierkorb` oder `lvStand`
    und eine Angebotsposition mit `zuschlagssatz` werden mit `unbekannt` abgewiesen, nicht still verworfen (Q5;
    Folgetickets 43 und 38).
  - `packages/gaeb/src/testhilfen.ts`, `testIds()`: die zwei neuen Methoden.
  Mehr nicht. Tickets 30, 31 und 32 schreiben parallel in diese Pakete: 29 ist klein und wird zuerst gemergt, die
  anderen nehmen die markierten Zeilen beim Zusammenführen mit.
- Preisspiegel-Ergebnistypen bleiben in `vergabe` (D-04); REB-Ergebnistypen bleiben in `mengen`.
- Bezeichner ASCII-transliteriert; Befehlsnamen = Typnamen (wie bisher).
- `okf/research/` wird nicht gelesen (C3). Was sich hier nicht entscheiden lässt: enge Lesart im Typ, Alternative
  als Offene Typfrage in die Comments; Entscheidungen im Demo-Modus zusätzlich in `.scratch/ava-oss/entscheidungen-auto.md`.
- TDD mit dem Skill `tdd` (Typtests in `vertrag.test.ts`, Beispielwerte in `beispiele.ts`); am Ende
  `pnpm lint && pnpm typecheck && pnpm test` grün auf dem ganzen Baum. Umfang: 2–3 h.

## Acceptance criteria

- [x] Jede der Nummern 1–8 ist abgebildet; die Comments nennen je Nummer Datei und Typ
- [x] `beispiele.ts`: Angebotsposition mit Zuschlagssatz; `KnotenEinfuegen` mit einem Titel und zwei Positionen; ChangeSet-Paar Hineinlegen/Wiederherstellen; ChangeSet von `LvStandAnlegen`; Protokolleintrag mit `Rueckgaengig`
- [x] Typtest: Hineinlegen und Wiederherstellen sind Umkehrungen voneinander und allein aus dem ChangeSet ablesbar (wie die Tests zu v1.1a Punkt 1)
- [x] Typtest: Werte vor v1.2 bleiben gültig (Angebotsposition ohne `zuschlagssatz`, LV ohne `papierkorb`, ChangeSet ohne `papierkorb`/`lvStand`)
- [x] `NurDaten` (Typtest) deckt die neuen Befehle, ChangeSets und `LvStand` ab
- [x] `GLOSSARY.md` enthält die Einträge aus Nummer 7
- [x] Comments: Liste der mechanischen Anpassungen außerhalb von `vertrag` (Datei, Zeile, was), je Folgeticket (30, 38, 42, 43, 44, 45) eine kurze Liste, was dort anzupassen ist, und die Offenen Typfragen
- [x] Ein Opus-Reviewer hat den Vertrag geprüft (D-04 statt P9); Befund und Antwort in den Comments
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün auf dem ganzen Baum

## Nicht-Ziele

Logik in `kern`, `speicher`, `vergabe`, `gaeb` (Tickets 30, 37, 38, 42–45). `Summenaenderung.vorher` als Pflichtfeld
(erst wenn Ticket 30 es überall füllt; eigenes Vertragsticket). Preisspiegel-Typen. Ein
Stand, der das bestehende LV überschreibt.

## Comments

### Ergebnis (Branch `ticket/29-vertrag-v1.2`, Basis `integration/welle-3`)

Nur Typen und Kommentare in `packages/vertrag/src/` (keine neue Konstante, keine Logik), dazu die markierten Zeilen
in `kern`, `speicher`, `gaeb` und `GLOSSARY.md`. Leitlinie wie in Ticket 24/26: enge, umkehrbare Lesart im Typ, neue
Felder optional mit natürlicher Leerbedeutung, Alternativen unten als Offene Typfragen. Kein Rechenwert, keine
Fixture, kein Golden geändert.

### Je Nummer: Datei und Typ

1. **Zuschlagssatz des Bieters.** `modell.ts`: `Angebotsposition` (Variante `status: 'angeboten'`) bekommt
   `zuschlagssatz?: Prozent`; Kommentar an `zuschlagssatz` und an `einheitspreis` (vorläufige Annahme: EP aus der
   Datei, sonst `0.000`; bei gesetztem Satz nie gerechnet). Beispiel `beispielAngebotspositionMitZuschlagssatz`.
2. **Leere Einheit.** Nur Kommentare: `modell.ts` `Einheit`, `Positionsdaten.einheit`, `Unterbeschreibung.einheit`;
   `befehle.ts` `EinheitAendern.einheit`, dazu Vermerk an `LeistungsverzeichnisAnlegen` und `KnotenEinfuegen`.
3. **Maskenbefund.** `changeset.ts`: `Befehlshinweiscode` + `'oz-maske-ungueltig'`; Vermerk an
   `LeistungsverzeichnisAnlegen` (`befehle.ts`).
4. **K9.** `befehle.ts`: `KnotenEinfuegen { ort; knoten }`, `KnotenlisteVerschieben { knotenIds; ziel }`,
   `KnotenInPapierkorbLegen { eintragId; knotenIds }`, `PapierkorbeintragWiederherstellen { eintragId; ort: Einfuegeort | null }`,
   `PapierkorbeintragEntfernen { eintragId }`, `PapierkorbLeeren {}`, alle in `LvBefehl`; Vermerk an `KnotenLoeschen`
   (endgültig, UI löscht über den Papierkorb) und `LeistungsverzeichnisLoeschen` (Papierkorb unter `papierkorb.entfernt`).
   `modell.ts`: `Papierkorbeintrag { id; nummer; knoten }` (Kommentar: Bezüge auf den Papierkorb, D-12).
   `changeset.ts`: `LvZustand.papierkorb?` (nach Review am Zustand statt am LV, D-12),
   `LvChangeSet.papierkorb?: Aenderungen<Papierkorbeintrag>`. Abweichung von 42/43 wie vom Ticket
   verlangt (kein `KnotenKopieren`, `KnotenLoeschen` bleibt endgültig); sonst keine Abweichung vom Ticket.
5. **S3.** `befehle.ts`: `Rueckgaengig { protokollId }`, `Wiederholen { protokollId }`, `HistorienBefehl` in `Befehl`
   (nicht in `LvBefehl`); `LvStandAnlegen { id; name }` in `LvBefehl`. `changeset.ts`: `LvStandKopf`, `LvStand`,
   `LvStandUebersicht`, `LvChangeSet.lvStand?: Aenderung<LvStandKopf>` (dort, weil `LvStand` `LvZustand` braucht).
   `speicher.ts`: `LvStandRepository { auflisten; laden }`, `Speicher.lvStaende?`, `Projektdatei.lvStaende?`; Vermerk an
   `Protokolleintrag` (Historienbefehle mit dem Aggregat des ursprünglichen Befehls).
6. **Kennungen.** `marken.ts`: `PapierkorbeintragId`, `LvStandId`; `IdQuelle.papierkorbeintrag()`, `IdQuelle.lvStand()`.
   Dazu D-10 (4): `ansicht.ts` `GridIdQuelle = Pick<IdQuelle, 'position' | 'papierkorbeintrag'>`.
7. **Glossar.** `GLOSSARY.md`: neu „Papierkorb, Papierkorbeintrag“, „LV-Stand“, „Rückgängig / Wiederholen
   (Undo/Redo)“, „Zuschlagssatz“ (nach Review ein Eintrag für LV und Angebot, D-12); ergänzt „Einheit“ (leer =
   `null`) und „Befehlshinweis“ (dritter Fall).
8. **Kopfdaten.** `befehle.ts`: `AuftraggeberSetzen { auftraggeber: Auftraggeber | null }`,
   `VergabeinformationenSetzen { vergabeinformationen: Vergabeinformationen | null }`,
   `LeitbeschreibungSetzen { positionId; leitbeschreibung: Leitbeschreibung | null }`, alle in `LvBefehl`; `null`
   entfernt (das optionale Feld fehlt danach).

Tests: `vertrag.test.ts`, Abschnitt „v1.2“ (Umkehrung inkl. Papierkorb/LV-Stand über `umkehrenV12`, Werte vor v1.2,
`NurDaten` für `HistorienBefehl`, `KnotenEinfuegen`, `Befehl`, `LvChangeSet`, `Papierkorbeintrag`, `LvStand`,
`Projektdatei`). Beispiele in `beispiele.ts`: `beispielAngebotspositionMitZuschlagssatz`, `beispielKnotenEinfuegen`,
`beispielChangeSetHineinlegen`/`beispielChangeSetWiederherstellen`, `beispielChangeSetPapierkorbeintragEntfernen`
(mit hängendem Bezug, D-12), `beispielLvStandChangeSet`, `beispielProtokollRueckgaengig`.

### Mechanische Anpassungen außerhalb von `vertrag` (markiert `// v1.2: mechanisch angepasst, Folgeticket`)

| Datei | Zeile | Was |
|---|---|---|
| `packages/kern/src/ausfuehren.ts` | 83–92 | `ZUSTAENDIGES_TICKET`: sieben K9-Arten (auch `LvStandAnlegen`) → `'K9 (Ticket 42)'`, drei Kopfdaten-Befehle → `'K8 (Ticket 41)'` |
| `packages/speicher/src/dekoder.ts` | 522–534 | `BEFEHLSARTEN`: die zwölf neuen Befehlsnamen (auch `Rueckgaengig`, `Wiederholen`) |
| `packages/speicher/src/schreiben.ts` | 200–203 | `wendeLvAn`: ChangeSet mit `papierkorb` oder `lvStand` → `unbekannt` (laut, vor jedem Schreiben) |
| `packages/speicher/src/schreiben.ts` | 273–277 | `wendeAngebotAn`: neue/geänderte Angebotsposition mit `zuschlagssatz` → `unbekannt` |
| `packages/gaeb/src/testhilfen.ts` | 44–46 | `testIds()`: `papierkorbeintrag()`, `lvStand()` |
| `packages/ui-grid/e2e/harness/attrappen.ts` | 62–64 | `idQuelleAttrappe()`: `papierkorbeintrag()` (seit Ticket 33 nutzt `ui-grid` den `GridIdQuelle` des Vertrags; D-10 (4)) |

Ebenso `proto/interview/src/store.tsx` (Zeilen 128–130): Seit `27c84e6` übersetzt der Prototyp wieder; ohne die eine
markierte Methode `papierkorbeintrag()` hätte die Erweiterung von `GridIdQuelle` ihn wieder rot gemacht. Der Projektdatei-Dekoder in
`speicher` weist `zuschlagssatz`, `papierkorb` und `lvStaende` schon heute laut ab (strikte Feldliste, `datei-ungueltig`).

### Folgetickets: was anzupassen ist

- **30 (kern v1.1a):** `''` → `null` bei `EinheitAendern`, `PositionAnlegen`, `LeistungsverzeichnisAnlegen`
  (Knoten und Unterbeschreibungen); `LeistungsverzeichnisAnlegen` mit beanstandeter Maske annehmen und Hinweis
  `oz-maske-ungueltig` liefern (`maskePruefen`); markierte Zeilen in `ausfuehren.ts` beim Merge übernehmen.
- **38 (speicher Angebot):** Spalte/JSON für `zuschlagssatz` (Migration, A8), Dekoder der Projektdatei, Guard in
  `wendeAngebotAn` löschen.
- **41 (K8):** Handler `AuftraggeberSetzen`, `VergabeinformationenSetzen`, `LeitbeschreibungSetzen` (`null` = Feld
  entfernen, Kopf-ChangeSet mit `vorher`/`nachher`); Schlüssel aus `ZUSTAENDIGES_TICKET` löschen.
- **42 (K9):** Handler `KnotenEinfuegen` (Wurzeln der Teilbäume am `ort`, `''` → `null`, OZ-Regel), Hilfsfunktion
  „Kopie mit neuen Kennungen und umgebogenen Bezügen“, `KnotenlisteVerschieben` (ein ChangeSet), Papierkorb-Befehle
  (ChangeSet-Formen wie in `LvChangeSet.papierkorb`), `LvStandAnlegen` (nur `lvStand`), `LvChangeSetAnwenden` für
  `papierkorb`, Umkehrung (`changeSetUmkehren`) für `papierkorb` und `lvStand`; Positionen im Papierkorb ohne Summe;
  `nummer` = Höchstwert + 1; Bezüge auf den Papierkorb bleiben stehen und zählen nichts, Entfernen/Leeren entfernt sie
  über `knoten.geaendert` (D-12).
- **43 (S3):** Tabellen für Papierkorb und LV-Stände (Migration), Guard in `wendeLvAn` löschen, `LvStand` in derselben
  Transaktion einfrieren (`angelegt` = `wann`), `Speicher.lvStaende` liefern (dann Pflichtfeld, Vertragsticket),
  `Projektdatei.lvStaende` lesen/schreiben, `Rueckgaengig`/`Wiederholen` protokollieren; `konflikt` für
  `LeistungsverzeichnisLoeschen` mit Ständen und für Entfernen/Leeren eines Eintrags, auf dessen Position ein Angebot
  verweist (D-12).
- **44 (Angebot rechnen):** bei gesetztem `zuschlagssatz` nur den Satz rechnen, `einheitspreis` ignorieren; Satz an
  einer Nicht-Zuschlagsposition als Befund oder Fehler festlegen.
- **45 (X84-Import):** `Markup` → `zuschlagssatz`; EP aus der Datei oder `0.000` (vorläufige Annahme).

### Offene Typfragen (enge Lesart im Typ; Alternative hier)

1. **EP bei angebotenem Zuschlagssatz.** Pflicht-EP mit Platzhalter `0.000`. Alternative: Variante
   `status: 'zuschlag-angeboten'` ohne EP (sauberer, aber nicht additiv: `speicher/src/zeilen.ts` würde sie heute
   als `nicht-angeboten` schreiben).
2. **`KnotenEinfuegen` kein Massenbefehl.** Lange Kopien stehen voll im Protokoll. Alternative: in
   `MASSENBEFEHLSARTEN` aufnehmen (dann Kopf ohne `knoten` in `Massenbefehlskopf`).
3. **`Speicher.lvStaende` optional.** Pflicht, sobald Ticket 43 es liefert (eigenes Vertragsticket).
4. **LV-Stand nur anlegen.** Kein Umbenennen, kein Löschen eines Stands, kein Zurückschreiben in das bestehende LV;
   `LeistungsverzeichnisLoeschen` scheitert an vorhandenen Ständen mit `konflikt` (D-12). Alternative: Stände mit dem
   LV löschen und dafür `LvChangeSet.lvStaende?: Aenderungen<LvStand>` (voller Stand im ChangeSet, umkehrbar).
5. **`KnotenEinfuegen`: Lage der Wurzeln.** Die mitgebrachte `elternId`/`reihenfolge` der Wurzeln zählt nicht (der
   Kern setzt sie). Alternative: Wurzeln mit `elternId` = Ziel-Eltern verlangen (prüfbar, aber doppelt zu `ort`).
6. **Papierkorb nicht in `LvInhalt`.** Ein LV aus einem LV-Stand zurückgeholt (über `LeistungsverzeichnisAnlegen`)
   verliert den Papierkorb des Stands. Alternative: `LvInhalt.papierkorb?`.
7. **`Rueckgaengig.protokollId`** nennt den ursprünglichen Befehl, auch bei `Wiederholen`. Alternative: `Wiederholen`
   nennt den `Rueckgaengig`-Eintrag (Kette statt Bezug auf das Original).
8. **Kopfdaten-Befehle setzen den ganzen Wert**, kein Feld einzeln. Alternative: ein Befehl je Feld (feinere
   Undo-Schritte, mehr Befehle).

### Entscheidungen (Frage, Entscheidung, Grund)

- `LvStand`-Typen in `changeset.ts` statt `modell.ts`: dort liegt `LvZustand`; kein Importzyklus.
- Namen der Kopfdaten-Befehle `AuftraggeberSetzen`, `VergabeinformationenSetzen`, `LeitbeschreibungSetzen`: Form der
  vorhandenen `…Setzen`-Befehle mit ganzem Wert (`NachlassSetzen`, `PositionsmerkmaleSetzen`).
- Guards in `schreiben.ts` vor jedem Schreiben statt nach dem Kopf: nichts halb geschrieben, auch ohne Rollback.
- Keine Speicher-Tests für die Guards: das Ticket erlaubt außerhalb von `vertrag` nur die gelisteten Zeilen; die
  Tests kommen mit 38/43.

### Review (D-04 statt P9)

Befund des Opus-Reviewers: „ja mit Korrekturen“, neun Punkte, vom Orchestrator als D-12 entschieden. Antwort, alle
umgesetzt: (1) Papierkorb an `LvZustand.papierkorb?` statt am LV (Kopf-ChangeSets tragen ihn nie); (2) Bezüge auf
Positionen im Papierkorb bleiben stehen und zählen nichts, Entfernen/Leeren entfernt sie über `knoten.geaendert`
(Kommentar `LvChangeSet.papierkorb`, `Papierkorbeintrag`, Beispiel und Typtest); (3) `Papierkorbeintrag.nummer`;
(4) `LeistungsverzeichnisLoeschen` mit Ständen → `konflikt`, Wiederholen von `LvStandAnlegen` friert neu ein,
`lvStaende?: Aenderungen<LvStand>` als Offene Typfrage 4; (5) Schreibweise `Papierkorbeintrag…` in einem Wort, auch
`IdQuelle.papierkorbeintrag()`, `GridIdQuelle` und die mechanischen Zeilen; (6) ein Glossareintrag „Zuschlagssatz“;
(7) Kommentar zum Platzhalter-EP; (8) `konflikt` bei Entfernen/Leeren, solange ein Angebot auf eine Position im
Eintrag verweist (Kommentar an den Befehlen; Prüfung in `speicher`, Ticket 43); (9) Kommentar an `Rueckgaengig` zu
Befehlsfolgen. Ticket-Texte 42, 43, 46, 48, 49 nachgezogen (49 hängt zusätzlich an 44). Mein Eintrag im
Entscheidungsprotokoll heißt jetzt D-29.1 (vorher D-11), weil die fortlaufenden Nummern dem Orchestrator gehören.

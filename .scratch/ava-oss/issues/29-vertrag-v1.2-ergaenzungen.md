# 29: `vertrag` v1.2: Ergänzungen für Welle 3 (Vertrag plus Anpassung)

Status: ready-for-agent
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
   - `KnotenInPapierkorbLegen { eintragId: PapierkorbEintragId; knotenIds: readonly KnotenId[] }`: nimmt die Knoten
     samt Unterbäumen aus dem Baum und legt sie als **einen** Papierkorbeintrag ab.
   - `PapierkorbEintragWiederherstellen { eintragId; ort: Einfuegeort | null }`: `null` heißt an die alte Stelle.
     Die Kennungen bleiben (Positionsidentität, ADR 0011: Angebote finden ihre Positionen wieder).
   - `PapierkorbEintragEntfernen { eintragId }` und `PapierkorbLeeren {}`: endgültig; unumkehrbar im Sinne von Q5
     (Bestätigung in der Oberfläche, abgesichert durch Undo und LV-Stand).
   - Zustand: `PapierkorbEintrag { id: PapierkorbEintragId; knoten: readonly Knoten[] }`; die Knoten tragen ihre alte
     Lage (`elternId`, `reihenfolge`). `Leistungsverzeichnis.papierkorb?: readonly PapierkorbEintrag[]` (fehlt =
     leer), in der Reihenfolge des Hineinlegens. Positionen im Papierkorb gehen in keine Summe ein und haben keine
     `Positionssumme`.
   - ChangeSet: `LvChangeSet.papierkorb?: Aenderungen<PapierkorbEintrag>` (fehlt = keine Änderung). Hineinlegen =
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
6. **Kennungen.** `PapierkorbEintragId`, `LvStandId` in `marken.ts`; `IdQuelle` bekommt `papierkorbEintrag()` und
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

- [ ] Jede der Nummern 1–8 ist abgebildet; die Comments nennen je Nummer Datei und Typ
- [ ] `beispiele.ts`: Angebotsposition mit Zuschlagssatz; `KnotenEinfuegen` mit einem Titel und zwei Positionen; ChangeSet-Paar Hineinlegen/Wiederherstellen; ChangeSet von `LvStandAnlegen`; Protokolleintrag mit `Rueckgaengig`
- [ ] Typtest: Hineinlegen und Wiederherstellen sind Umkehrungen voneinander und allein aus dem ChangeSet ablesbar (wie die Tests zu v1.1a Punkt 1)
- [ ] Typtest: Werte vor v1.2 bleiben gültig (Angebotsposition ohne `zuschlagssatz`, LV ohne `papierkorb`, ChangeSet ohne `papierkorb`/`lvStand`)
- [ ] `NurDaten` (Typtest) deckt die neuen Befehle, ChangeSets und `LvStand` ab
- [ ] `GLOSSARY.md` enthält die Einträge aus Nummer 7
- [ ] Comments: Liste der mechanischen Anpassungen außerhalb von `vertrag` (Datei, Zeile, was), je Folgeticket (30, 38, 42, 43, 44, 45) eine kurze Liste, was dort anzupassen ist, und die Offenen Typfragen
- [ ] Ein Opus-Reviewer hat den Vertrag geprüft (D-04 statt P9); Befund und Antwort in den Comments
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün auf dem ganzen Baum

## Nicht-Ziele

Logik in `kern`, `speicher`, `vergabe`, `gaeb` (Tickets 30, 37, 38, 42–45). `Summenaenderung.vorher` als Pflichtfeld
(erst wenn Ticket 30 es überall füllt; eigenes Vertragsticket). Preisspiegel-Typen. Ein
Stand, der das bestehende LV überschreibt.

## Comments

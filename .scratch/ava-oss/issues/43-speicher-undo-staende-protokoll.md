# 43: Speicher: Undo/Redo, LV-Stände, Papierkorb und Befehlsprotokoll (S3)

Status: claimed
Type: task
Welle: 3 (Phase B) · Strang: S (S3) · Paket: `packages/speicher`
Blocked by: 38, 29
Regeln: A3, A5, A8, Q1, Q2, Q5, U7, C3, ADR 0006, ADR 0009 (mit E-13), G-24, G-56
Herkunft: `plan.md` §2 S3, altes Ticket `.scratch/ava-mvp/issues/14`, ADR 0006 (Undo je Sitzung, benannte unveränderliche LV-Stände), ADR 0009, Ticket 24 (Folgeliste „Protokoll“: Löschen per Undo/LV-Stand zurückholen), Ticket 29 (Punkte 4–6: Papierkorb, `Rueckgaengig`/`Wiederholen`, LV-Stand, `LvStandRepository`)

## What to build

`speicher` trägt alles, was Undo/Redo, LV-Stände und der Papierkorb an Persistenz brauchen, und protokolliert diese
Vorgänge (ADR 0009: genau ein Eintrag je Befehl). Vorgehen: TDD mit dem Skill `tdd`; am Ende
`pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün. `okf/research/` wird nicht gelesen (C3).

**Wer was tut.** `speicher` darf nur `vertrag` importieren (A3, `tools/boundaries.mjs`); die Umkehrung eines ChangeSets
(`changeSetUmkehren`) liegt im Kern. Den Undo-Stapel je Sitzung führt deshalb die App (Ticket 48: Kern kehrt um,
`speicher.anwenden` schreibt). Dieses Ticket sorgt dafür, dass `speicher` jede Umkehrung annimmt, prüft und protokolliert.

**Typen aus Ticket 29** (der Umsetzer liest zuerst `packages/vertrag/src/` und die Comments von 29): `Rueckgaengig {
protokollId }` und `Wiederholen { protokollId }` als `HistorienBefehl` in `Befehl`; `LvStandAnlegen { id, name }` mit
`LvChangeSet.lvStand?: Aenderung<LvStandKopf>`; `LvStand`, `LvStandUebersicht`, `LvStandRepository`,
`Speicher.lvStaende?`, `Projektdatei.lvStaende?`; `LvZustand.papierkorb?` (nicht am LV oder Kopf; `LvStand` und
`Projektdatei` tragen ihn über `LvZustand`), `Papierkorbeintrag { id; nummer; knoten }` und `LvChangeSet.papierkorb?`
(D-12). Die
Abweisungen mit `unbekannt`, die Ticket 29 in `schreiben.ts` als Platzhalter gesetzt hat (`papierkorb`, `lvStand`),
entfallen hier.

1. **Umkehrungen annehmen.** Jede Art ChangeSet, die Kern und Vergabe erzeugen, lässt sich als Umkehrung anwenden:
   geänderte Knoten zurück, entfernte Knoten samt Summen wieder anlegen (`summen.vorher.entfernt`), gelöschtes Aggregat
   (LV, Angebot, Projekt, Auftrags-LV) samt Kindern wieder anlegen, angelegtes Aggregat wieder löschen, Papierkorb-
   Einträge zurück. `anwenden` prüft wie heute, dass `vorher` zum gespeicherten Stand passt, sonst `konflikt` (kein
   Überschreiben). Test je Art: anwenden, Umkehrung anwenden → Export der Projektdatei byte-gleich dem Stand davor. Die
   Umkehrung erzeugt der Test aus den Daten des ChangeSets selbst (kleine Testhilfe in `speicher`, kein Kern-Import), wie
   die Typtests in `packages/vertrag/src/vertrag.test.ts`.
2. **Protokoll für Undo/Redo.** Die App schreibt eine Umkehrung mit dem Befehl `Rueckgaengig` (bzw. `Wiederholen`), der
   auf den Eintrag des ursprünglichen Befehls verweist; `speicher` protokolliert ihn wie jeden Befehl und prüft, dass der
   Verweis auf einen Eintrag desselben Projekts zeigt (sonst `datei-ungueltig` bzw. `konflikt`, Vorschlag). Das Protokoll
   bleibt Nebenbuch und wird von Undo nicht gelesen (ADR 0009). Der Dekoder kennt die beiden Befehle. Eine Befehlsfolge
   wird mit je einem `Rueckgaengig` je Befehl in umgekehrter Reihenfolge zurückgenommen (D-12).
3. **LV-Stände** (ADR 0006): Migration 3 (A8) mit einer Tabelle für Stände (Kennung, LV, Name, `angelegt` =
   `Protokolleintrag.wann`, eingefrorener `LvZustand` als kanonisches JSON). Ein ChangeSet mit `lvStand.vorher: null`
   friert in **derselben Transaktion** den gespeicherten Stand des LV ein; `lvStand.nachher: null` (nur als Umkehrung)
   entfernt den Stand; ein `Wiederholen` friert neu ein (neues `angelegt`). Sonst gibt es keinen Weg, einen Stand zu
   ändern. `LeistungsverzeichnisLoeschen` wird mit `konflikt` abgewiesen, solange Stände des LV bestehen (wie bei
   Angeboten; D-12). `Speicher.lvStaende` liefert `LvStandRepository` (`auflisten` ohne Zustand, `laden` mit).
   Die Projektdatei (Version 3) trägt `lvStaende`; `datei`-Migration von 2 auf 3; eingefrorene `projektdatei-v3.json`.
4. **Papierkorb** in derselben Migration 3: Einträge je LV mit `nummer` (Reihenfolge des Hineinlegens), Knoten mit
   alter Lage (Vorschlag: eigene Tabelle `papierkorb_eintrag` plus Knoten mit Eintragskennung in `knoten`, oder JSON je
   Eintrag; protokollieren). Rundlauf Speichern, Laden, Export, Import; `lvLaden` liefert `LvZustand.papierkorb`.
   `PapierkorbeintragEntfernen`/`PapierkorbLeeren` (ChangeSet mit `papierkorb.entfernt`) werden mit `konflikt`
   abgewiesen, solange eine Angebotsposition auf eine Position im Eintrag verweist (Q5, D-12).
5. **Protokoll prüfen (ADR 0009).** Test über eine Folge gemischter Befehle (Massenbefehl, Feldänderungen, Papierkorb,
   Stand, Undo, Redo): genau ein Eintrag je Befehl, in Reihenfolge, `wer` und `wann` wie übergeben, Massenbefehle als
   Kurzfassung (Ticket 38). Größe der Projektdatei mit `gross` nach 1.000 Einzeländerungen, 100 Undo und einem Stand im
   Ticket festhalten (der Stand verdoppelt das LV in der Datei; Zahl nennen).

## Grenzen

- **Paket `packages/speicher`.** Kein Import von `kern` (A3). Keine Änderung an `vertrag` (P9); fehlt etwas, Lücke in die
  Comments.
- Undo-Stapel, Tastenkürzel und Bedienung sind Ticket 48; Undo gilt je Sitzung (ADR 0006), gespeichert wird davon nur
  das Protokoll.
- Migrationen: nummeriert, getestet, nie nachträglich geändert; Version 1 und 2 öffnen weiter (A8).
- **Zu groß?** Zuerst streichen: die Messung in Punkt 5, dann Punkt 4 (Papierkorb; dann bleibt die Abweisung aus
  Ticket 29 für `papierkorb` stehen, Folgeticket in den Comments). Umkehrungen, Protokoll und Stände bleiben.

## Acceptance criteria

- [ ] Für jede ChangeSet-Art (Feld ändern, Knoten anlegen/löschen/einfügen/verschieben, Papierkorb hinein/zurück/entfernen, Nachlass, MwSt, LV anlegen/löschen, Angebot anlegen/löschen, Projekt anlegen/löschen) gilt: anwenden, Umkehrung anwenden → Export byte-gleich dem Stand davor
- [ ] Eine Umkehrung, deren `vorher` nicht zum gespeicherten Stand passt, wird mit `konflikt` abgewiesen und ändert nichts
- [ ] `Rueckgaengig` und `Wiederholen` erzeugen je genau einen Protokolleintrag mit Verweis; der Dekoder liest sie
- [ ] LV-Stand: Anlegen friert den gespeicherten Stand ein; spätere Befehle am LV ändern ihn nicht; `auflisten` und `laden` über `Speicher.lvStaende`; Umkehrung entfernt ihn
- [ ] Migration 3 mit `hoch` und `datei`; `projektdatei-v1.json` und `-v2.json` öffnen, `-v3.json` (mit Stand und Papierkorb) ist Export-Golden
- [ ] Papierkorb: Speichern, Laden, Export, Import; Wiederherstellen per ChangeSet; Entfernen eines Eintrags mit einer Position, auf die ein Angebot verweist, ergibt `konflikt`
- [ ] `LeistungsverzeichnisLoeschen` mit bestehendem LV-Stand ergibt `konflikt`
- [ ] Playwright im Harness: Stand anlegen, Seite neu laden, Stand laden
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Undo-Stapel und Bedienung (48), Kern-Logik von Papierkorb und Stand (42), sichtbares Protokoll (ADR 0009: keine Ansicht
in v1), Stand als neues LV übernehmen (48, falls Zeit), Datensicherung (S4).

## Comments

# 42: Kern: Kopieren, Verschieben, Papierkorb, LV-Stand als Befehle; OZ-Vorschlag (K9, Logikteil)

Status: ready-for-agent
Type: task
Welle: 3 (Phase B) · Strang: K (K9) · Paket: `packages/kern`
Blocked by: 41, 29
Regeln: A2, A5, A6, A7, F1, F2, Q1, Q4, Q5, U5, C3, ADR 0006, ADR 0011
Herkunft: `plan.md` §2 K9, altes Ticket `.scratch/ava-mvp/issues/15` (Logikteil), G-06/Q5 (Lücken schließen, kein stiller Datenverlust), W-06 (OZ für eingefügte Positionen fehlt), Ticket 29 (Punkte 2, 4, 5: Befehlstypen, Papierkorb, `LvStandAnlegen`, dessen Handler hierher gehört)

## What to build

Kopieren, Verschieben und Löschen in den Papierkorb sind Befehle mit minimalem, umkehrbarem ChangeSet (A5, A6). Dazu
liefert der Kern eine reine Hilfsfunktion, die Kopien samt umgebogener Bezüge baut, und einen Vorschlag für die
Ordnungszahl eines neuen Knotens, damit die App eingefügte Positionen nummerieren kann (W-06). Vorgehen: TDD mit dem
Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün. `okf/research/` wird nicht gelesen (C3).

**Typen aus Ticket 29.** Der Umsetzer liest zuerst `packages/vertrag/src/befehle.ts`, `modell.ts`, `changeset.ts` und
die Comments von Ticket 29 und folgt dem, was dort steht. Laut Ticket 29: `KnotenEinfuegen { ort; knoten }`,
`KnotenlisteVerschieben { knotenIds; ziel }`, `KnotenInPapierkorbLegen { eintragId; knotenIds }`,
`PapierkorbEintragWiederherstellen { eintragId; ort | null }`, `PapierkorbEintragEntfernen { eintragId }`,
`PapierkorbLeeren {}`, `LvStandAnlegen { id; name }`; Zustand `Leistungsverzeichnis.papierkorb?`, ChangeSet-Felder
`LvChangeSet.papierkorb?` und `LvChangeSet.lvStand?`. `KnotenLoeschen` bleibt endgültig. Fehlt im Vertrag etwas, was dieses
Ticket braucht: nicht ändern (P9), Teil auslassen, Lücke in die Comments.

1. **Kopie bauen** (reine Hilfsfunktion, Vorschlag `kopieBauen(zustand, knotenIds, ids: Pick<IdQuelle, …>) → Knoten[]`):
   die Knoten samt Unterbäumen, flach, Eltern vor Kindern, mit neuen Kennungen aus der übergebenen ID-Quelle (A2: der
   Kern erzeugt keine Kennung, er ruft nur die übergebene Quelle). Bezüge innerhalb der kopierten Menge zeigen auf die
   Kopien (Zuschlags-Bezugsliste, `wahl.grundpositionId`), Bezüge nach außen bleiben. Das Ergebnis ist der Inhalt von
   `KnotenEinfuegen.knoten`; die App (48) ruft die Funktion und schickt den Befehl.
2. **`KnotenEinfuegen`**: Handler nach Ticket 29 (Wurzeln der Teilbäume in Listenreihenfolge am `ort`, `elternId` und
   `reihenfolge` setzt der Kern). Prüfungen wie beim Anlegen: Knotenart, Ebenenregel (höchstens 5, F1), Kennung schon
   vergeben → `id-vergeben`, Bezug auf unbekannte Position → `bezug-unbekannt`, Formprüfungen aus Ticket 37; `''` als
   Einheit wird `null` (Ticket 29, Punkt 2). Summen: neue Positions- und Gliederungssummen, Ausweise, betroffene
   Zuschlagspositionen am Zielort (Ticket 37). Gilt auch für Einfügen aus der Zwischenablage oder einem anderen LV.
3. **`KnotenlisteVerschieben`**: mehrere Knoten als **ein** Befehl, in Listenreihenfolge hintereinander am Ziel; Fehler
   wie `KnotenVerschieben` (`zyklus`, `ebene-ueberschritten`, `knotenart-unzulaessig`). Summen in Quelle und Ziel,
   Zuschlagspositionen beider Elternknoten (Ticket 37, R3/R4).
4. **Ordnungszahl** (Vorschlag, protokollieren als `D-xx`):
   - Reine Funktion `ozVorschlag(zustand, ort: Einfuegeort, art: 'position' | 'titel' | 'los') → { ordnungszahl,
     ozIndex, hinweis? } | null`: die nächste freie OZ hinter dem Vorgänger mit dem Schritt der Umnummerierung
     (Gliederung +1, Position +10); passt sie nicht vor den Nachfolger, ausweichen auf 5, 2, 1 (F2) mit Hinweis
     `oz-schritt-ausgewichen`; reicht auch 1 nicht: `null` (die App lässt die OZ leer, K8 meldet `oz-fehlt`). Die App ruft
     sie vor `PositionAnlegen`/`GliederungAnlegen` und gibt die OZ im Befehl mit (Befehle bleiben reine Daten).
   - `KnotenEinfuegen` und `KnotenlisteVerschieben` in einen **anderen** Elternknoten: die Wurzeln der Teilbäume bekommen
     eine OZ nach derselben Regel, ihr Unterbaum wird darunter neu nummeriert (wie `Umnummerieren`, nur für diese
     Teilbäume), im selben ChangeSet. Verschieben innerhalb desselben Elternknotens behält die OZ (Anzeigedatum, A7).
5. **Papierkorb** (Ticket 29, Punkt 4): Hineinlegen nimmt die Knoten samt Unterbäumen aus dem Baum (ihre Summen fallen
   weg, Zuschlagsbasen ändern sich) und legt sie als **einen** Eintrag ab; Bezüge anderer Zuschlagspositionen auf
   hineingelegte Positionen entfallen im selben ChangeSet wie beim Löschen (Ticket 37) und kehren beim Wiederherstellen
   zurück. Wiederherstellen mit `ort: null` an die alte Stelle, wenn der alte Elternknoten besteht, sonst ans Ende der
   Wurzel (Vorschlag, protokollieren); Kennungen bleiben (Positionsidentität, ADR 0011), OZ bleibt (Doppelte meldet K8).
   Entfernen eines Eintrags und Leeren sind endgültig; das ChangeSet trägt den vollen Stand (`papierkorb.entfernt`), so
   dass Undo ihn zurückholt.
6. **`LvStandAnlegen`** (Ticket 29, Punkt 5; Handler gehört laut 29 hierher): ChangeSet mit `lvStand: { vorher: null,
   nachher: { id, leistungsverzeichnisId, name } }`, sonst leer; den Zustand friert `speicher` ein (Ticket 43). Prüfung: Name
   nicht leer → sonst `ungueltige-eingabe` (Vorschlag), Kennung frei.
7. **Umkehrbarkeit.** Jedes ChangeSet dieser Befehle ist mit `changeSetUmkehren` allein umkehrbar; `lvChangeSetAnwenden`
   wendet `papierkorb` an (ein Stand verändert den LV-Zustand nicht).

## Grenzen

- **Paket `packages/kern`.** Keine Änderung an `vertrag`; die Typen kommen aus Ticket 29.
- Keine Uhr, kein Zufall (A2): Kennungen über die übergebene ID-Quelle bzw. im Befehl, Zeitpunkte nur im Protokolleintrag.
- Speicherung von Papierkorb und Stand ist Ticket 43, die Bedienung Tickets 46 und 48.
- Glossar: „Papierkorb“ und „LV-Stand“ trägt Ticket 29 ein; fehlen sie, dieses Ticket (L2). „OZ-Vorschlag“ nur, wenn
  der Begriff in der Oberfläche erscheint.
- **Zu groß?** Zuerst streichen: Umnummerieren der Teilbäume beim Einfügen in einen anderen Elternknoten (dann OZ der
  Kopien leer, K8 meldet `oz-fehlt`), danach `PapierkorbEintragEntfernen` (Leeren bleibt).

## Acceptance criteria

- [ ] `KnotenEinfuegen`, `KnotenlisteVerschieben`, `KnotenInPapierkorbLegen`, `PapierkorbEintragWiederherstellen`, `PapierkorbEintragEntfernen`, `PapierkorbLeeren`, `LvStandAnlegen` sind zuständig (aus `ZUSTAENDIGES_TICKET` entfernt); je Wirkung, minimales ChangeSet, Fehlerfälle getestet
- [ ] `kopieBauen`: Kopie mit internen Bezügen (Zuschlag auf kopierte Position, Wahl auf kopierte Grundposition) zeigt auf die Kopien; Bezug nach außen bleibt; ruft die ID-Quelle in Präorder
- [ ] Summen nach Verschieben in Quelle und Ziel korrekt (Test gegen `summenBerechnen`), Zuschläge beider Elternknoten aktualisiert
- [ ] `ozVorschlag`: Schritt 10 bzw. 1 im Normalfall, Ausweichen auf 5, 2, 1 mit Hinweis, `null` bei Überlauf; Tests mit `typisch` und einer Maske nahe dem Überlauf
- [ ] Papierkorb: Hineinlegen und Wiederherstellen sind Umkehrungen voneinander; Wiederherstellen an die alte Stelle bzw. ans Ende, wenn der Elternknoten fehlt; Bezüge kehren zurück; Positionen im Papierkorb gehen in keine Summe ein
- [ ] Property-Test: beliebige Folgen aus Einfügen, Verschieben, Papierkorb, Wiederherstellen, Leeren; Summenstand gleich `summenBerechnen`, `pruefeLvInvarianten` hält, `changeSetUmkehren` stellt jeden Zustand her
- [ ] Leistung: Verschieben eines Titels mit rund 300 Positionen in `gross` < 16 ms (Messwert im Ticket)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Zwischenablage und Tastatur (46), Bedienung in der App (48), Speicherung (43), Undo-Stapel (48), Stand in ein bestehendes
LV zurückschreiben (Ticket 29: nicht vorgesehen), Änderungen an `vertrag`.

## Comments

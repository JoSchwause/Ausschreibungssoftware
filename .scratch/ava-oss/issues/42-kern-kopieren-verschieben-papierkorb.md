# 42: Kern: Kopieren, Verschieben, Papierkorb, LV-Stand als Befehle; OZ-Vorschlag (K9, Logikteil)

Status: merged (integration/welle-3)
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
`PapierkorbeintragWiederherstellen { eintragId; ort | null }`, `PapierkorbeintragEntfernen { eintragId }`,
`PapierkorbLeeren {}`, `LvStandAnlegen { id; name }`; Zustand `LvZustand.papierkorb?` (nicht am LV oder Kopf, D-12),
Eintrag `Papierkorbeintrag { id; nummer; knoten }`, ChangeSet-Felder `LvChangeSet.papierkorb?` und `LvChangeSet.lvStand?`. `KnotenLoeschen` bleibt endgültig. Fehlt im Vertrag etwas, was dieses
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
   weg, Zuschlagsbasen ändern sich) und legt sie als **einen** Eintrag ab; die `nummer` des Eintrags ist der Höchstwert
   der vorhandenen + 1 (1 im leeren Papierkorb, keine Uhr; D-12). Bezüge anderer Knoten (Zuschlags-`Bezugsposition`,
   `wahl.grundpositionId`) auf hineingelegte Positionen **bleiben stehen** und zählen nichts, solange das Ziel im
   Papierkorb liegt (D-12); nach dem Wiederherstellen gelten sie wieder. Wiederherstellen mit `ort: null` an die alte
   Stelle, wenn der alte Elternknoten besteht, sonst ans Ende der Wurzel (Vorschlag, protokollieren); Kennungen bleiben
   (Positionsidentität, ADR 0011), OZ bleibt (Doppelte meldet K8). Entfernen eines Eintrags und Leeren sind endgültig;
   das ChangeSet trägt den vollen Stand (`papierkorb.entfernt`, mit `nummer`) und entfernt die dann hängenden Bezüge
   über `knoten.geaendert`, so dass Undo beides zurückholt. Ob eine Angebotsposition auf eine Position im Eintrag
   verweist, prüft `speicher` (`konflikt`, Ticket 43), nicht der Kern.
6. **`LvStandAnlegen`** (Ticket 29, Punkt 5; Handler gehört laut 29 hierher): ChangeSet mit `lvStand: { vorher: null,
   nachher: { id, leistungsverzeichnisId, name } }`, sonst leer; den Zustand friert `speicher` ein (Ticket 43). Prüfung: Name
   nicht leer → sonst `ungueltige-eingabe` (Vorschlag), Kennung frei. Ein `Wiederholen` friert neu ein (neues
   `angelegt`, D-12).
7. **Umkehrbarkeit.** Jedes ChangeSet dieser Befehle ist mit `changeSetUmkehren` allein umkehrbar; `lvChangeSetAnwenden`
   wendet `papierkorb` an (ein Stand verändert den LV-Zustand nicht).

## Grenzen

- **Paket `packages/kern`.** Keine Änderung an `vertrag`; die Typen kommen aus Ticket 29.
- Keine Uhr, kein Zufall (A2): Kennungen über die übergebene ID-Quelle bzw. im Befehl, Zeitpunkte nur im Protokolleintrag.
- Speicherung von Papierkorb und Stand ist Ticket 43, die Bedienung Tickets 46 und 48.
- Glossar: „Papierkorb“ und „LV-Stand“ trägt Ticket 29 ein; fehlen sie, dieses Ticket (L2). „OZ-Vorschlag“ nur, wenn
  der Begriff in der Oberfläche erscheint.
- **Zu groß?** Zuerst streichen: Umnummerieren der Teilbäume beim Einfügen in einen anderen Elternknoten (dann OZ der
  Kopien leer, K8 meldet `oz-fehlt`), danach `PapierkorbeintragEntfernen` (Leeren bleibt).

## Acceptance criteria

- [x] `KnotenEinfuegen`, `KnotenlisteVerschieben`, `KnotenInPapierkorbLegen`, `PapierkorbeintragWiederherstellen`, `PapierkorbeintragEntfernen`, `PapierkorbLeeren`, `LvStandAnlegen` sind zuständig (aus `ZUSTAENDIGES_TICKET` entfernt); je Wirkung, minimales ChangeSet, Fehlerfälle getestet
- [x] `kopieBauen`: Kopie mit internen Bezügen (Zuschlag auf kopierte Position, Wahl auf kopierte Grundposition) zeigt auf die Kopien; Bezug nach außen bleibt; ruft die ID-Quelle in Präorder
- [x] Summen nach Verschieben in Quelle und Ziel korrekt (Test gegen `summenBerechnen`), Zuschläge beider Elternknoten aktualisiert
- [x] `ozVorschlag`: Schritt 10 bzw. 1 im Normalfall, Ausweichen auf 5, 2, 1 mit Hinweis, `null` bei Überlauf; Tests mit `typisch` und einer Maske nahe dem Überlauf
- [x] Papierkorb: Hineinlegen und Wiederherstellen sind Umkehrungen voneinander; Wiederherstellen an die alte Stelle bzw. ans Ende, wenn der Elternknoten fehlt; Bezüge auf Positionen im Papierkorb bleiben stehen und zählen nichts, Entfernen/Leeren entfernt sie in `knoten.geaendert`; `nummer` = Höchstwert + 1; Positionen im Papierkorb gehen in keine Summe ein
- [x] Property-Test: beliebige Folgen aus Einfügen, Verschieben, Papierkorb, Wiederherstellen, Leeren; Summenstand gleich `summenBerechnen`, `pruefeLvInvarianten` hält, `changeSetUmkehren` stellt jeden Zustand her
- [x] Leistung: Verschieben eines Titels mit rund 300 Positionen in `gross` < 16 ms (Messwert im Ticket: Median 7,5 ms bei 351 Positionen)
- [x] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Zwischenablage und Tastatur (46), Bedienung in der App (48), Speicherung (43), Undo-Stapel (48), Stand in ein bestehendes
LV zurückschreiben (Ticket 29: nicht vorgesehen), Änderungen an `vertrag`.

## Comments

- Seams (Demo-Modus, ohne Rückfrage festgelegt): `lvBefehlAusfuehren` + `lvChangeSetAnwenden` + `changeSetUmkehren` für die sieben Befehle, die reinen Funktionen `kopieBauen` und `ozVorschlag`, `pruefeLvInvarianten(lv, papierkorb?)`.
- Messwert: `KnotenlisteVerschieben` eines Titels mit 351 Positionen in `gross` in einen anderen Elternknoten (mit OZ-Neuvergabe des Unterbaums), ausführen + anwenden, warm, Median 7,5 ms (schlechtester Lauf etwa 20 ms; Budget 16 ms für den Median), `k9-leistung.test.ts`.
- Frage: Nachfahren eines genannten Knotens und Doppelte in `knotenIds`? Entscheidung: zählen nicht eigens, gehen mit dem Vorfahren (Kopie, Verschieben, Papierkorb gleich). Grund: Mehrfachauswahl im Grid enthält oft Titel samt Kindern (D-42.1).
- Frage: `nach X`, wenn X selbst mitbewegt wird? Entscheidung: die Liste landet an der Stelle von X. Grund: keine Abweisung für eine sinnvolle Auswahl (D-42.1).
- Frage: Leere Liste? Entscheidung: `ungueltige-eingabe` (`feld: 'knoten'` bzw. `'knotenIds'`). Grund: ein leerer Befehl hat keine Bedeutung.
- Frage: Unbekannter Papierkorbeintrag (kein passender Fehlercode)? Entscheidung: `ungueltige-eingabe`, `feld: 'eintragId'`; vergebene Eintragskennung `id-vergeben`, `feld: 'eintragId'`. Grund: Codes sind eine geschlossene Liste (A4).
- Frage: Reihenfolge im Eintrag? Entscheidung: Dokumentreihenfolge (Eltern vor Kindern), nicht Auswahlreihenfolge. Grund: Wiederherstellen an die alte Stelle legt die Wurzeln je Elternknoten in aufsteigender alter Reihenfolge zurück und kehrt das Hineinlegen damit exakt um.
- Frage: Wiederherstellen mit `ort: null`? Entscheidung: wie vorgeschlagen (alte Stelle, `reihenfolge` höchstens ans Ende; fehlt der Elternknoten, ans Ende der Wurzel); Prüfungen am Ziel wie beim Einfügen (Los, Ebenen, F1); eine Kennung des Eintrags, die inzwischen im Baum steht: `id-vergeben` (D-42.1).
- Frage: Bezüge aus anderen Papierkorbeinträgen auf einen entfernten Eintrag? Entscheidung: Entfernen/Leeren lösen sie mit, über `papierkorb.geaendert`. Grund: sonst brächte ein späteres Wiederherstellen hängende Bezüge in den Baum (D-42.1).
- Frage: Bezüge in den Papierkorb in anderen Befehlen? Entscheidung: gültig auch bei `PositionAnlegen`, `PositionsmerkmaleSetzen`, `KnotenEinfuegen` (zählen nichts); Kennungen im Papierkorb gelten beim Anlegen und Einfügen als vergeben. `pruefeLvInvarianten` nimmt den Papierkorb optional mit und prüft ihn (Kennungen, Nummern, kein Knoten doppelt). Grund: D-12; sonst würde ein `PositionsmerkmaleSetzen` an einer Wahl, deren Grundposition im Papierkorb liegt, abgewiesen.
- Frage: OZ beim Einfügen (Ticket: „in einen anderen Elternknoten“)? Entscheidung: `KnotenEinfuegen` vergibt den Wurzeln immer eine neue OZ, der Unterbaum wird darunter neu nummeriert; `kopieBauen` lässt die OZ stehen. Grund: Nach dem Vertrag zählt die mitgebrachte Lage der Wurzeln nicht, ein „gleicher Elternknoten“ ist also nicht erkennbar; eine Kopie ist ein neuer Knoten (W-06). `ozIndex` bleibt unverändert (D-42.2).
- Frage: Regel des OZ-Vorschlags im Einzelnen? Entscheidung: neuer Teil = Teil des Vorgängers + 10 (Position) bzw. + 1 (Gliederung); Vorgänger/Nachfolger ist das nächste Geschwister derselben Art mit rein numerischem Teil (ohne einen: 0 bzw. kein Nachfolger); Ausweichen auf 5, 2, 1 (nur kleiner als der Standard, Gliederung also nie), wenn der Teil nicht vor den Nachfolger, nicht in die Stellen passt oder unter den Geschwistern belegt ist; `null` auch bei ungültigem Ort, ungültiger Maske, Elternknoten ohne lesbare OZ oder Stufe außerhalb der Maske (D-42.3).
- Frage: Teilbaum passt beim Umnummerieren nicht in die Maske, oder die Wurzel bekommt keinen Vorschlag? Entscheidung: die OZ dieser Knoten wird leer (`null`, K8 meldet `oz-fehlt`), der Befehl wird nicht abgewiesen. Grund: U5; dieselbe Folge wie `ozVorschlag` → `null` (D-42.3).
- Frage: `LvStandAnlegen` „Kennung frei“? Entscheidung: der Kern prüft nur gegen LV- und Knotenkennungen (`id-vergeben`, `feld: 'id'`), bestehende Stände kennt nur `speicher` (`konflikt`). Name nur aus Leerraum zählt als leer (`ungueltige-eingabe`, `feld: 'name'`).
- `ZUSTAENDIGES_TICKET` ist leer; der Typ verlangt weiter einen Eintrag für jeden künftigen LV-Befehl ohne Handler. `baum.test.ts` „Befehle anderer Tickets“ prüft jetzt, dass die Liste leer ist (mechanisch).
- Glossar: „Papierkorb“ und „LV-Stand“ stehen schon (Ticket 29); „OZ-Vorschlag“ nicht eingetragen (kein Begriff der Oberfläche).

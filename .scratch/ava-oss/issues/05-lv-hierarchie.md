# 05: LV-Hierarchie im Kern (K2)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: K · Paket: `packages/kern` (einziger Schreiber)
Blocked by: 02, 04
Regeln: A2, A3, A5, A6, A7, L1, L2, Q1

## What to build

Reine Domänenlogik für den LV-Baum als **Befehle** `(Zustand, Befehl) → ChangeSet` (A5): Los (nur gliedernd; G-29),
bis zu 5 Gliederungsebenen, Positionen, Hinweistexte. Einfügen nach einem Knoten bestimmt den Elternknoten
automatisch; Löschen ist rekursiv; Verschieben innerhalb des Baums. Hinweistexte tragen keine Menge, keinen Preis.
IDs werden **von außen** übergeben (kein Zufall im Kern; A2).

Befehle (Namen nach `GLOSSARY.md`): `GliederungAnlegen`, `PositionAnlegen`, `HinweistextAnlegen`, `KnotenLöschen`,
`KnotenVerschieben`. Das ChangeSet enthält geänderte Knoten; Summen kommen mit Ticket 07.

## Acceptance criteria

- [x] Einfügen/Löschen/Verschieben je mit Beispiel- und Property-Test: der Baum bleibt zyklenfrei, jede Position hat genau einen Elternknoten
- [x] Eltern-Bestimmung beim „Einfügen nach X“: nach einer Position → gleicher Elternknoten; nach einem Titel → erster Unterknoten (festgelegt und im Test dokumentiert)
- [x] Mehr als 5 Ebenen und Hinweistext mit Menge/Preis werden abgewiesen mit Fehlerwert
- [x] Auf `fixtures/typisch` aufgebaut ergibt sich derselbe Baum wie in der Fixture (Strukturgleichheit)
- [x] Der Kern importiert nur `vertrag` und `dezimal` (A3, per CI geprüft)
- [x] Offene Fachfrage → `needs-info` im Ticket, nicht raten (P5): zwei Fragen zum Los sind mit einer restriktiven, umkehrbaren Annahme umgesetzt und unten als offen geführt; keine Frage blockiert das Ticket

## Nicht-Ziele

OZ-Vergabe (Ticket 06), Summen (07), Positionsarten außer Normal (K5), Kopieren/Papierkorb (K9), Speicher.

## Comments

### Ergebnis (Branch `worktree-agent-a68bda9ef82ab9c38`)

Geliefert in `packages/kern/src/`. `pnpm lint`, `pnpm typecheck`, `pnpm test` laufen grün. Vor dem Code geschrieben: `baum.test.ts` (Beispiele), `eigenschaften.test.ts` (fast-check), `fixtures.test.ts` (Strukturgleichheit, Messung).

**Modulaufbau (wo 06 und 07 andocken)**

| Datei | Inhalt |
|---|---|
| `ausfuehren.ts` | `lvBefehlAusfuehren` (Typ `LvBefehlAusfuehren`). **Eine** Tabelle `BEFEHLS_HANDLER` (Schlüssel = `befehl.art`); alles ohne Handler liefert `befehl-nicht-zustaendig` mit Ticketname aus `ZUSTAENDIGES_TICKET`. 06/07/K5 tragen ihren Handler in `BEFEHLS_HANDLER` ein und löschen denselben Schlüssel aus `ZUSTAENDIGES_TICKET` (der Typ erzwingt das). |
| `knoten-befehle.ts` | `gliederungAnlegen`, `positionAnlegen`, `hinweistextAnlegen`, `knotenLoeschen`, `knotenVerschieben` |
| `lv-anlegen.ts` | `leistungsverzeichnisAnlegen` (leer oder mit `LvInhalt`, prüft den ganzen Baum) |
| `changeset.ts` | `lvChangeSetAnwenden` (Typ `LvChangeSetAnwenden`), `changeSetUmkehren`, `LEERE_SUMMENAENDERUNG`, `LEERER_SUMMENSTAND` |
| `struktur.ts` | Baumindex (lazy, `WeakMap` auf dem `knoten`-Array), kanonische Ordnung, Unterbaum, Ebenenzählung |
| `pruefung.ts` | `baumfehler` (alle Verstöße mit Befehlsfehlercode), `pruefeLvInvarianten` (Texte; für Property-Tests von 06/07), Positionsform |
| `regeln.ts` | `MAX_GLIEDERUNGSEBENEN`, `LOS_ANNAHME`, `losErlaubtUnter`, `ebenenbeitrag` (die Los-Annahme steht **nur hier**) |
| `testhilfen.ts` | nur für Tests (Fixture per Dateizugriff lesen, `wende`, `neuesLv`, `kinderIds`) |

Exportiert über `index.ts`: `lvBefehlAusfuehren`, `BEFEHLS_HANDLER`, `ZUSTAENDIGES_TICKET`, `lvChangeSetAnwenden`, `changeSetUmkehren`, `LEERE_SUMMENAENDERUNG`, `LEERER_SUMMENSTAND`, `LOS_ANNAHME`, `MAX_GLIEDERUNGSEBENEN`, `ebenenbeitrag`, `losErlaubtUnter`, `baumfehler`, `pruefeLvInvarianten`.

Für 06 (Umnummerieren) und 07 (Summen): `indexVon`, `unterbaum`, `ebenenBis` in `struktur.ts` liefern Knoten per ID und Kinder je Elternknoten ohne Neuaufbau (noch nicht in `index.ts` exportiert; im Paket direkt importieren). `lvChangeSetAnwenden` ersetzt und ergänzt `summen`-Einträge schon jetzt, sobald 07 ein ChangeSet mit Summen liefert.

**Zustandsdarstellung und Leistung.** Der Zustand bleibt das flache `readonly Knoten[]` des Vertrags. Der Kern baut daraus einmal je Array einen `Baumindex` (`byId`, `kinder` je Elternknoten, nach `reihenfolge` sortiert) und merkt ihn in einer `WeakMap`, Schlüssel ist das Array. Der Index wird nie verändert, der Cache ist also unsichtbar (A2). `lvChangeSetAnwenden` bringt das Ergebnis in kanonische Reihenfolge (Vorordnung, Eltern vor Kindern, Geschwister nach `reihenfolge`) und trägt den Index für das neue Array gleich ein. Damit ist „ChangeSet anwenden, Umkehrung anwenden“ auch im Array die Identität. Befehlsausführung kostet O(Geschwister + Unterbaum), Anwenden O(n).

Gemessen (`fixtures/gross`, 5.610 Knoten, im Vitest-Lauf, drei Läufe, Richtwerte, kein Gate):

- `LeistungsverzeichnisAnlegen` + Anwenden (Aufbau): 43 bis 72 ms
- ein `PositionAnlegen` mitten im Baum (Geschwister dahinter rücken auf), kalt (Index noch nicht gebaut): ausführen 3,7 bis 8,2 ms, anwenden 5,2 bis 8,8 ms
- derselbe Befehl warm (Zustand aus vorherigem Anwenden): ausführen 0,04 bis 0,05 ms, ausführen + anwenden 2,5 bis 3,7 ms (Median von 20); fast alles davon ist das Anwenden (Array neu aufbauen, O(n)).

Ticket 07 muss die Neuberechnung nur im Teilbaum (A6) in diese Zeit einpassen. Wird `lvChangeSetAnwenden` auf dem 16-ms-Pfad zu teuer, wäre inkrementelles Anwenden (Index und Array fortschreiben statt neu aufbauen) der nächste Schritt, ohne Vertragsänderung.

**Summen (Stand dieses Tickets).** Das ChangeSet trägt immer `LEERE_SUMMENAENDERUNG`; kein GP wird berechnet. `LvZustand.summen` läuft durch `lvChangeSetAnwenden` unverändert durch (dasselbe Objekt), nur Einträge entfernter Knoten fallen weg. Ein neues LV bekommt `LEERER_SUMMENSTAND` (leere Listen, alle Gesamtsummen `0.00`), **auch wenn es Positionen mit Mengen und Preisen enthält**: Platzhalter, bis 07 die Summen berechnet.

**Verhalten im Einzelnen**

- Einfügen „nach X“: Position oder Hinweistext → gleicher Elternknoten, direkt dahinter; Gliederung (Los oder Titel) → erster Unterknoten dieser Gliederung (`baum.test.ts`, „Einfügen: Elternknoten und Reihenfolge“). Beim Verschieben zählt „nach X“ nach dem Herausnehmen des bewegten Knotens. Eine Position oder ein Hinweistext „nach sich selbst“ ist eine Nullbewegung (ChangeSet ohne Änderungen); eine Gliederung „nach sich selbst“ ist ein `zyklus`.
- ChangeSet: `geaendert` listet genau die Knoten, deren `elternId` oder `reihenfolge` sich ändert (Property-Test gegen die Differenz der Zustände). `hinzugefuegt` und `entfernt` stehen mit Eltern vor Kindern. `entfernt` trägt den vollen alten Stand.
- Fehlercodes: `id-vergeben` (auch die LV-ID), `knoten-unbekannt` (auch die Wurzel als Knoten), `eltern-unbekannt`, `knotenart-unzulaessig` (Kinder unter Position oder Hinweistext, Los am falschen Ort), `ebene-ueberschritten`, `zyklus`, `ungueltige-eingabe` (Hinweistext oder Gliederung mit fremdem Feld wie `menge`; Menge oder EP nicht in kanonischer Skala laut `dezimal`; Merkmale passen nicht zur Art; nicht dichte `reihenfolge`; falsche Form von MwSt-Satz oder Nachlass in `LvInhalt`), `bezug-unbekannt`, `befehl-nicht-zustaendig`.
- `LeistungsverzeichnisAnlegen` braucht Zustand `null`, jeder andere Befehl einen Zustand; sonst `befehl-nicht-zustaendig`.
- `lvChangeSetAnwenden` wirft bei einem nicht anwendbaren ChangeSet (kein Zustand und kein neuer Kopf; ein ChangeSet, das das LV entfernt): Programmfehler, kein erwartbarer Fehler. Der Kern erzeugt solche ChangeSets nicht.
- Positionsarten: `PositionAnlegen` nimmt alle fünf Arten als Daten an (die Fixtures brauchen sie); ihre Wirkung (K5/K6) ist nicht Teil dieses Tickets.

**Offene Fragen (Entscheidung offen; hier nicht geraten, P5)**

1. **Zählt ein Los zu den 5 Ebenen?** Vorläufige Annahme, Entscheidung offen: ja. Gebündelt in `LOS_ANNAHME.zaehltAlsEbene` und `ebenenbeitrag` (`regeln.ts`), im Test als „VORLÄUFIGE ANNAHME“ gekennzeichnet. Betrifft Ticket 02 Frage 6 und Ticket 06 (eigene Stelle in `OzMaske.gliederung`?).
2. **Wo darf ein Los stehen?** Vorläufige Annahme, Entscheidung offen: nur direkt unter der LV-Wurzel, nie unter Los oder Titel (`LOS_ANNAHME.nurUnterWurzel`, `losErlaubtUnter`). Beide Annahmen sind restriktiv; Lockern macht gültige LVs nicht ungültig.
3. **Positionen und Hinweistexte direkt unter der LV-Wurzel** (ohne Titel): erlaubt. Das ist die *weite* Lesart, nicht die restriktive; ich folge dem Vertrag (`elternId` ist LV-ID oder Los/Titel), die Fixtures haben es nicht. Ein Verbot wäre eine Bedingung in `baumfehler` und `zielAufloesen`. Nicht entschieden.
4. **Lose und Titel nebeneinander auf der obersten Ebene:** erlaubt (die Fixtures haben nur Titel, keine Lose). Nicht entschieden.
5. **Merkmale zur Positionsart:** `bedarfMitGesamtbetrag` nur bei `bedarf`, `bezugspositionId` nur bei `zuschlag`, `grundpositionId` nur bei `wahl` (so steht es in den Typkommentaren), Bezüge müssen auf eine andere vorhandene Position zeigen. Restriktiv; K5/K6 dürfen lockern (`positionsdatenFehler` in `pruefung.ts`).

**Lücken im Vertrag (nicht geändert, nicht umgangen)**

- `LvChangeSetAnwenden` liefert `LvZustand`, nie `null`: die Umkehrung eines LV-Anlegens (`kopf.nachher: null`) lässt sich nicht anwenden (die Funktion wirft). Für Undo des Anlegens bräuchte der Typ `LvZustand | null`.
- `Summenaenderung` trägt nur neue Werte, keine Vorwerte: `changeSetUmkehren` kann Summen nicht zurücksetzen und liefert leere `summen`. Solange `summen` leer ist (dieses Ticket), ist das verlustfrei; 07 muss Vorwerte mitführen oder die Summen nach dem Undo neu berechnen.
- `GliederungAnlegen` hat kein Feld für die Ordnungszahl; neue Gliederungen haben `ordnungszahl: null` (Ticket 06 vergibt sie). Positionen übernehmen `ordnungszahl` aus `daten`.
- `GliederungAnlegen.id` ist `GliederungId`; der Kern stempelt sie je nach `gliederungsart` per Cast zu `LosId` oder `TitelId`.
- `fixtures/gross.json` steht nicht in Vorordnung (Hinweistexte stehen an anderer Stelle im Array als in der Baumordnung). Unschädlich, weil die Lage in `elternId` und `reihenfolge` steht; der Kern ordnet kanonisch. Das Fixture-README nennt „Dokumentreihenfolge“, bei `gross` stimmt das nicht ganz.
- Der Kommentar zu `LeistungsverzeichnisAnlegen` im Vertrag sagt „Der Kern berechnet die Summen und liefert sie im ChangeSet“; das leistet erst Ticket 07 (siehe oben).

**Abweichungen vom Auftrag:** keine. Der Aufbau Knoten für Knoten mit den Baumbefehlen wird für `winzig` und `typisch` geprüft. Für `gross` (5.610 Befehle mit je O(n) Anwenden, also quadratisch; nicht gemessen) bewusst nicht; dort deckt `LeistungsverzeichnisAnlegen` die Strukturgleichheit ab. Die Ordnungszahlen der Titel fehlen beim Befehls-Aufbau (siehe Lücke oben) und sind im Vergleich ausgenommen.

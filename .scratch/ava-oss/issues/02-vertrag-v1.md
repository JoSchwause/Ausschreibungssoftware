# 02: `vertrag` v1: Domänentypen, Befehle, ChangeSet (F2)

Status: resolved (gemergt 2026-11-10; vom Nutzer geprüft, E-01; seitdem erweitert bis v1.6, Prüfung nach G-58 erledigt)
Type: task
Welle: 0 · Strang: F · Paket: `packages/vertrag` (einziger Schreiber, P2)
Blocked by: 03
Regeln: A2, A3, A4, A5, A6, A7, A8, N1, N3, L1, L2
Gate: **Mensch prüft vor dem Merge** (G-50). Danach ist `vertrag` für Welle 1 stabil.

## What to build

Nur **Typen und Schnittstellen**, keine Logik. Ableitung aus ADR 0009, 0011, `GLOSSARY.md` und `spec.md` §5.

1. **Aggregate (ADR 0011):** `Projekt` (Name, Bauherr-Felder), `Leistungsverzeichnis` (Ausschreibung), `Angebot`, `AuftragsLeistungsverzeichnis`; getrennte Aggregate mit gemeinsamer Positions-ID (UUIDv7, A7).
2. **LV-Baum:** `Los` (nur gliedernd), `Titel` bis 5 Ebenen, `Position`, `Hinweistext`. `Ordnungszahl` ist Anzeigedatum, nie Schlüssel; `OzMaske` je LV frei definierbar.
3. **Positionsarten:** Normal, Bedarf mit und ohne Gesamtbetrag, Wahl, Zuschlagsposition (GAEB `MarkupItem`, nicht „Zulage“), Stundenlohn, Pauschal, Hinweis; Flags als Felder, nicht als Untertypen, wo GAEB sie so führt. Einheitspreisanteile (EPA).
4. **Zahlen:** Branded Types `Menge`, `Einheitspreis`, `Betrag`, `Prozent` über einem opaken `Dezimal`; Nachkommastellen als **eine** Konstantentabelle (Menge 3, EP 3, Prozent 2, Betrag 2; G-21). Kein `number` (N1).
5. **Nachlass** (ein Nachlass je LV und je Angebot, prozentual oder absolut; G-23, G-26), **MwSt** (ein Satz je LV; G-28).
6. **Befehle und ChangeSet:** `Befehl`-Union (`(Zustand, Befehl) → ChangeSet`, A5), `ChangeSet` = geänderte Knoten + betroffene Summen (A6), `Protokolleintrag` (wer, was, wann; ADR 0009).
7. **Repository-Schnittstellen** für `speicher` (S1) und die Projektdatei als **JSON** mit Schemaversion (G-56, A8).
8. **GAEB-neutrale Austauschtypen** nur, soweit `gaeb` (G1) sie braucht: Phase, Version, Prüfbefund (Warnung, Fehler, Quelle), Entwurfskennzeichen (G-13).

Begriffe kommen **zuerst** ins `GLOSSARY.md` (L2); dort ist die EP-Angabe „2, optional 3“ an G-21 anzupassen.

## Acceptance criteria

- [x] `pnpm lint` und `tsc` grün; Paket hat keine Laufzeitabhängigkeit außer Typen (A2)
- [x] Typtests (`expectTypeOf`): `number` ist für Menge, EP, Betrag, Prozent nicht zuweisbar
- [x] Jede Entität hat eine UUIDv7-ID; Positionen tragen eine ID, die Ordnungszahl ist kein Schlüssel
- [x] Die Konstantentabelle der Nachkommastellen steht an genau einer Stelle (N3)
- [x] Beispielbefehl und Beispiel-ChangeSet als Typen kompilierbar, mit Kommentar in einem Satz
- [x] Typen der Fixtures (Ticket 19) lassen sich vollständig auf `vertrag` abbilden; Abweichungen stehen im Ticket
- [x] Offene Typfragen stehen als Kommentar im Ticket mit `needs-info`, nicht geraten (P5)

## Nicht-Ziele

Berechnung (K), Speicherimplementierung (S), GAEB-Elemente (G), Oberfläche.

## Comments

### Ergebnis (Branch `worktree-agent-a741eeb8202cbce39`)

Geliefert: `packages/vertrag/src/` mit `marken.ts`, `zahlen.ts`, `modell.ts`, `summen.ts`, `befehle.ts`, `changeset.ts`, `speicher.ts`, `gaeb.ts`, `ansicht.ts`, `index.ts`; Tests `vertrag.test.ts` (Typtests mit `expectTypeOf`) und `fixtures-abbildung.test.ts`; kompilierbare Beispiele in `beispiele.ts` (nicht exportiert). `GLOSSARY.md`: neue Begriffe zuerst (L2), EP-Zeile nach G-21 auf „3 Nachkommastellen gespeichert“ korrigiert, Menge auf 3.

Verifiziert: `pnpm lint`, `pnpm typecheck`, `pnpm test` grün. Keine Laufzeitabhängigkeit (`package.json` ohne `dependencies`); einziger Laufzeitwert ist `NACHKOMMASTELLEN`. Haken „UUIDv7“: Der Typ markiert Kennungen je Entität; das UUIDv7-Format lässt sich im Typsystem nicht prüfen und gehört in die App, die Kennungen erzeugt.

### Konventionen

- **Schreibweise:** Bezeichner, Befehlsnamen und das Feld `art` sind ASCII-transliteriert (ä=ae, ö=oe, ü=ue, ß=ss), z. B. `KnotenLoeschen`, `Ausreisser`. Gründe: stabil in gespeicherten Protokolleinträgen (keine NFC/NFD-Fehler), gleiche Form in Typ, Befehl und JSON. **Abweichung vom Ticketwortlaut:** Ticket 05 schreibt `KnotenLöschen`; gemeint ist `KnotenLoeschen`. Im GLOSSARY unter „Schreibweise im Code“ festgehalten.
- **Dezimal:** opak, zur Laufzeit eine kanonische Dezimalzeichenkette in Punktnotation mit der festen Skala des Typs (`"10.000"`, `"12.35"`), wie in den Fixtures. Vollständiger Darstellungsvertrag am Typ `Dezimal` in `zahlen.ts`. `dezimal` erzeugt und verrechnet, `speicher` schreibt den Text unverändert in SQLite und JSON, `gaeb` liest und schreibt über `dezimal`. `vertrag` hat keinen Konstruktor.
- **Kennungen:** Branded Strings je Entität; `PositionId` und `GliederungId` sind Untertypen von `KnotenId`. Die Positionsidentität ist im LV, in jedem Angebot und im Auftrags-LV dieselbe; eindeutig je Aggregat, Schlüssel in `speicher` also (Aggregat, KnotenId). `IdQuelle` ist die Schnittstelle, über die Kern und Parser neue Kennungen von außen bekommen.
- **Befehle** sind reine Daten (Typtest `NurDaten<Befehl>`); Zeit und Nutzer stehen im `Protokolleintrag`, nicht im Befehl. Drei Familien: `ProjektBefehl`, `LvBefehl`, `AngebotBefehl`; `Befehl` ist die Vereinigung. Das Aggregat ergibt sich aus dem übergebenen Zustand; das Protokoll hält es in `Protokolleintrag.aggregat`.
- **ChangeSet** ist je Aggregat getaggt (`ProjektChangeSet | LvChangeSet | AngebotChangeSet`). `geaendert` trägt alten und neuen Stand, `entfernt` den vollen Stand: Jedes ChangeSet ist ohne den Kern umkehrbar (Undo, S3; Q5). Summen im ChangeSet nur als neue Werte.
- **Fehlerwert:** `Ergebnis<T, F>` (`ok`/`wert`/`fehler`) für Befehle, Parser und Speicher; `Befehlsfehler` mit geschlossener Liste `Befehlsfehlercode`. `dezimal` kann `Ergebnis` mit eigenem Fehlertyp wiederverwenden.
- **Knoten flach:** `elternId` und `reihenfolge` (dichter Index je Elternknoten). Die Wurzel ist die LV-Kennung (wie in den Fixtures).
- **Flags statt Untertypen:** Eine flache `Position` mit `positionsart` und den Merkmalen `pauschal`, `bedarfMitGesamtbetrag`, `bezugspositionId`, `grundpositionId`. Welche Merkmale zu welcher Art gehören, prüft der Kern.
- **Zusätzlich zum Ticketwortlaut** (nötig, damit die Konsumenten ohne Vertragsänderung auskommen): `LeistungsverzeichnisAnlegen` (leer oder mit vollem Inhalt, deckt GAEB-Import und Fixture-Laden; A5), Angebots- und Projektbefehle (Ticket 10 persistiert Angebote und Projekt über Befehle), `IdQuelle`, Zeilen und Spalten für das Grid (`LvZeile`, `LvAnsicht`, `LvSpalte`, `BefehlsEmpfaenger`), Signaturen `LvBefehlAusfuehren` und `LvChangeSetAnwenden`. `packages/vertrag/tsconfig.json` bekommt `types: ["node"]`, weil der Fixture-Test Dateien liest (nur Test; `vertrag` importiert die Fixtures nicht, die Paketgrenze A3 bleibt eingehalten).

### Abbildung: Konsumenten-Ticket → Typen in `vertrag`

| Ticket | Braucht | Typen |
|---|---|---|
| 04 `dezimal` | Skalen, Dezimaltypen, Fehlerwert beim Parsen | `NACHKOMMASTELLEN`, `Zahlenart`, `Dezimal`, `Menge`, `Einheitspreis`, `Betrag`, `Prozent`, `Ergebnis`; Darstellungsvertrag an `Dezimal`; negative Werte darstellbar, Rundung negativer Beträge bleibt Ticket 04 |
| 05 Hierarchie | `GliederungAnlegen`, `PositionAnlegen`, `HinweistextAnlegen`, `KnotenLoeschen`, `KnotenVerschieben`; Einfügen „nach X“; Ablehnung (Ebenen, Hinweis mit Menge/Preis, Zyklus) als Fehlerwert; IDs von außen; Strukturgleichheit zur Fixture | `GliederungAnlegen`, `PositionAnlegen`, `HinweistextAnlegen`, `KnotenLoeschen`, `KnotenVerschieben`, `Einfuegeort` (`nach`/`anfang`/`ende`), `Los`, `Titel`, `Position`, `Hinweistext`, `Knoten`, `Knotenlage`, `LvChangeSet`, `Befehlsfehler`/`Befehlsfehlercode` (`ebene-ueberschritten`, `knotenart-unzulaessig`, `zyklus`, `ungueltige-eingabe` …), `LvBefehlAusfuehren`, `LvZustand` |
| 06 OZ | OZ-Maske je LV, Vergabe, Umnummerieren als Befehl, Maskenänderung mit allen Knoten, IDs bleiben | `OzMaske`, `OzStelle`, `OzZeichenart`, `Ordnungszahl`, `Positionsdaten.ozIndex`, `OzMaskeSetzen`, `OrdnungszahlSetzen`, `Umnummerieren`, Codes `oz-ungueltig`, `maske-ungueltig` |
| 07 Summen | GP je Position, Titel- und LV-Summen, Nachlass setzen/entfernen, MwSt-Satz, ChangeSet nur mit betroffenen Summen | `Positionssumme`, `Gliederungssumme`, `Gesamtsummen`, `Summenstand`, `Summenaenderung`, `Nachlass`, `LvInhaltKopf.mwstSatz`, `NachlassSetzen`, `NachlassEntfernen`, `MwstSatzSetzen`, `MengeAendern`, `EinheitspreisAendern`, `PositionsartAendern` (Bedarf/Wahl/Zuschlag/Pauschal als Daten) |
| 10 `speicher` | Repositories, ChangeSet persistieren, ein Protokolleintrag je Befehl, JSON-Projektdatei mit Schemaversion, Fehlerwert bei voller Quote oder gesperrtem OPFS, `persist()`-Status | `Speicher` (mit `anwenden(eintrag, changeSet)`), `ProjektRepository`, `LvRepository`, `AngebotRepository`, `Protokolleintrag`, `AggregatBezug`, `Projektdatei`, `Schemaversion`, `Speicherfehler`/`Speicherfehlercode`, `Persistenzstatus`, `Projekt`, `Bieter`, `Angebot`, `AuftragsLeistungsverzeichnis`, `AuftragsLvZustand` |
| 21 `ui-grid` | Zeilen/Spalten, Bearbeiten von Kurztext/Menge/Einheit/EP als Befehl, Summenzeile von außen, Prüfhinweise je Zelle, Einfügen = ein Befehl je Zeile | `LvZeile`, `LvAnsicht`, `LvSpalte`, `BefehlsEmpfaenger`, `KurztextAendern`, `MengeAendern`, `EinheitAendern`, `EinheitspreisAendern`, `Pruefbefund` mit `Befundort.feld`, `Gesamtsummen` |
| 22 `gaeb` | LV nach `vertrag`-Typen, Phase/Version, Befunde mit Quelle und Position, Indexpositionen, Bedarf/Wahl/Zuschlag, Bilder im Langtext, Entwurfskennzeichen, Kennungen ohne Zufall im Parser | `GaebLesung`, `GaebPhase`, `GaebVersion`, `Pruefbefund`, `Befundschwere`, `Befundquelle`, `Befundort`, `GaebExport` (`entwurf`), `LvInhalt`, `Positionsdaten.ozIndex`, `Positionsart`, `bezugspositionId`, `grundpositionId`, `Langtext`/`Bild`, `IdQuelle` |

### Fixtures → `vertrag` (Abweichungen)

Getestet in `fixtures-abbildung.test.ts` für `winzig`, `typisch`, `gross` und `typisch-angebote`: JSON → `vertrag` → JSON ergibt dasselbe JSON, jede Kennung ist eindeutig, Eltern stehen vor Kindern, Bezüge zeigen auf vorhandene Positionen. Abweichungen der Form (keine fehlenden Felder):

- `parentId` heißt `elternId`; die Geschwisterreihenfolge (Arrayposition) steht explizit in `reihenfolge`.
- `ozMaske` ist in den Fixtures ein Freitext; in `vertrag` ein strukturierter `OzMaske` (der Test setzt ihn fest ein).
- `langtext` und Hinweis-`text` sind Zeichenketten; in `vertrag` ein `Langtext` (Liste aus Bausteinen); die Fixtures nutzen nur Textbausteine.
- Fehlende optionale Felder (`ozIndex`, `bedarfMitGesamtbetrag`, `bezugspositionId`, `grundpositionId`) sind in `vertrag` explizit `null` oder `false`; `pauschal` und `epa` kommen in den Fixtures nicht vor.
- `sollwerte` sind Maps nach ID; in `vertrag` Listen (`Summenstand`). `nichtAngeboten` ist abgeleitet aus `status`.
- `bieter` stehen im Angebotsset; in `vertrag` gehören sie zum `Projekt`.

### Offene Typfragen (`needs-info`, nicht geraten; P5)

Keine davon blockiert nach meiner Prüfung die Tickets 04, 05, 06, 07, 10, 21, 22; jede Änderung am Vertrag ist ein eigenes Ticket (A4). Die Fragen 1 bis 4 lassen sich mit den Typen darstellen, ohne eine Rechenregel zu kodieren.

1. `needs-info` **Bedarf/Wahl/Zuschlag in den Summen (Fixture A1–A4):** Der Typ hält nur das Ergebnis (`Positionssumme.gehtInSummeEin`), nicht die Regel. Nicht darstellbar: eine **separat ausgewiesene** Summe der Bedarfs- oder Wahlpositionen (Glossar: „oder separat ausgewiesen“). Falls K5/K6 sie wollen, fehlt ein Feld in `Gesamtsummen`.
2. `needs-info` **„Nicht angeboten“ (A5):** Als `status: 'nicht-angeboten'` ohne Preis dargestellt, getrennt von Preis 0.000. Ob der Preisspiegel weitere Zustände braucht (z. B. ergänzt, ausgeschlossen), ist offen.
3. `needs-info` **Rundungsreihenfolge des Nachlasses (A6):** Die Typen tragen nur `Nachlass` und `Gesamtsummen.nachlass`, keine Regel. Offen, ob erst der Nachlassbetrag oder das Ergebnis gerundet wird.
4. `needs-info` **Ausreißer und Preisspiegel (A7):** Typen für Preisspiegel, virtuelle Bieter, Ausreißerschwelle und ABC-Klassen fehlen bewusst (nicht Teil von Ticket 02, in 04 bis 22 nicht benötigt). Für V1/V2 braucht es ein eigenes Vertragsticket.
5. `needs-info` **Pauschal und Stundenlohn:** Das Ticket nennt beides als Positionsart; ich führe Pauschal als Flag (`pauschal`) und Stundenlohn als Art, weil GAEB Merkmale als Flags führt. Ich konnte das ohne Fachdokumentation nicht belegen; Ticket 22 muss prüfen, ob beides so abbildbar ist.
6. `needs-info` **Los und OZ-Maske:** Belegt ein Los eine Stufe in `OzMaske.gliederung`? Zählt es zu den 5 Ebenen? Ob die GAEB-Beispielmaske `1122PPPPI` (Ticket 06) mit `OzMaske` darstellbar ist, ist nicht belegt; die Obergrenze von 14 Zeichen steht bewusst nicht im Vertrag (Ticket 06 soll sie zitieren).
7. `needs-info` **Langtext-Auszeichnung:** `Langtext` kennt Text und Bild, keine Formatierung (fett, Listen). Das eingeschränkte TipTap-Schema (U1) braucht sie womöglich.
8. `needs-info` **MwSt-Satz beim GAEB-Import:** `LvInhaltKopf.mwstSatz` ist Pflicht. Trägt eine GAEB-Datei keinen Satz, muss `gaeb` einen vom Aufrufer gelieferten Satz einsetzen; ob `null` (unbekannt) zulässig sein soll, ist offen.
9. `needs-info` **Bauherr-Felder:** ADR 0011 nennt nur „Name und Bauherr-Felder“; `Bauherr` hat vorläufig `name` und `anschrift`.
10. `needs-info` **Wer wendet ein ChangeSet auf den Zustand an?** Kein Ticket nennt `LvChangeSetAnwenden`. Das Grid hält keinen Zustand (21), `speicher` schreibt in die Datenbank (10); die App braucht aber eine reine Funktion. Vorschlag: `kern`, eigenes Ticket vor Welle 2.
11. `needs-info` **Zuschlag und Auftrags-LV:** Typen sind vorhanden (`AuftragsLeistungsverzeichnis`, in `Projektdatei`), aber kein Befehl und kein ChangeSet dazu; der Schreibweg fehlt bis zum Vergabe-Ticket.
12. `needs-info` **Reihenfolge für Synchronisation (G-01):** `reihenfolge` ist ein dichter Index; ein Einfügen an den Anfang listet alle Geschwister als geändert. Für spätere Mehrbenutzer-Synchronisation wäre ein Bruchindex nötig.
13. `needs-info` **X84-Import und X86-Export:** `GaebLesung` liefert nur ein LV (`LvInhalt`), keinen Angebotsinhalt; Typen für Bieterrückgaben folgen mit G3.
14. Geschlossene Listen (`Befehlsfehlercode`, `Speicherfehlercode`, `Positionsart`, `GaebPhase`) brauchen für jeden neuen Wert ein Vertragsticket; `Pruefbefund.code` ist dagegen ein freier String.
15. `Einheit` ist ein freier String (kein Katalog); `null` heißt „nicht gesetzt“, nicht 0 (gilt auch für Menge und EP). Was daraus für den GP folgt, entscheidet der Kern.

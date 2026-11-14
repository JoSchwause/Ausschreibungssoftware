# Entscheidungen im Demo-Modus (`/implement-welle`)

Jede Entscheidung, die Agenten im Demo-Modus selbst getroffen haben (Stufe 2: Orchestrator, Stufe 3: Berater).
Der Mensch liest diese Liste später und nimmt an oder kehrt um.

## D-01 Umfang des Laufs „Welle 3“
Welle 3 · Ticket – · decided by: advisor
Question: Welle 2 ist nur bis Stufe 1 fertig (v1.1a/v1.1b gemergt, Stufen 2 und 3 fehlen). Welle 3 hängt daran. Was läuft?
Decision: Phase A = Rest von Welle 2 (Anpassungen an v1.1a, K5–K7, S2, U3, G2), danach Prüfung von M1; Phase B = Welle 3. Neue Pakete ohne Blocker (`mengen`, `vergabe`, Langtext-Editor in `ui-basis`) starten sofort.
Reason: K8, S3, U4–U6, G3 setzen auf K5/K6, S2, U3, G2 auf; ohne G2 ist das Tor M2 unerreichbar.
Reversible: yes  Touches: Plan des Laufs, Tickets 29–49

## D-02 Prüfung von `vertrag` v1.1a/v1.1b gilt als erfolgt
Welle 3 · Ticket 24, 26 · decided by: orchestrator
Question: W-01 und W-02 (Frage 1) sind in `next-decisions-welle-2.md` unbeantwortet, PR #4 und #7 aber vom Nutzer gemergt.
Decision: Der Merge gilt als „ja“ zu W-01 und W-02 (1). W-02 (2) Gruppe/Variante bleiben `null`-fähig; W-02 (4) Befehle für Kopfdaten kommen mit U4.
Reason: Der Nutzer hat gemergt; die Empfehlungen in der Datei waren genau das.
Reversible: yes  Touches: –

## D-03 Zuschlagsposition (K6) ohne wörtliches Zitat der Fachdokumentation
Welle 3 · Ticket 37 · decided by: advisor
Question: F3/E-03 verlangt vor K6 das wörtliche Zitat der Fachdokumentation; `okf/research/` ist in diesem Container nicht vorhanden.
Decision: Rechenregel aus den amtlichen Prüfdateien belegen (BVBS 3.3 AVA X84/X86 Kategorie 30, Musterdatei 3.1 X84). Betrag = Basis × Satz / 100, auf 2 Stellen; Basis = GP der Bezugspositionen nach Positionsnachlass; Zuschlagspositionen sind nie Basis einer anderen; der Betrag geht in die Gliederungssumme ein; `IdentAsMark` summiert die markierten Positionen; „alle Positionen der Gliederung“ heißt nach den Daten „die Positionen vor der Zuschlagsposition bis zur vorigen Zuschlagsposition bzw. bis zum Anfang des Blocks“. Die Dateizeilen werden im Ticket statt des Zitats angeführt. `ListInSubQty` (Teilmengen) reproduziert der Umsetzer aus den Daten oder vermerkt es als Lücke.
Reason: Die Dateien belegen die Arithmetik (955,00 × 10 % = 95,50 usw.); das erfüllt C4 (aus GAEB-Daten belegt).
Reversible: yes  Touches: packages/kern, fixtures/typisch, GLOSSARY.md („Zuschlagsposition“, Bezugsform „Gliederung“)
Annahme für Demo, Mensch bestätigt später (F3/E-03).

## D-04 Vertragsergänzung v1.2 vor G3 und K9
Welle 3 · Ticket 29 · decided by: advisor
Question: Der Zuschlagssatz des Bieters aus X84 hat in `Angebotsposition` keinen Platz (W-02 Frage 3); Preisspiegel-Typen „erst nach M1“ (E-20).
Decision: Ein additives Vertragsticket (29): optionales `zuschlagssatz` an `Angebotsposition`, Regel `''` → `null` für die Einheit (W-05 Nr. 3), plus was K9/S3 an Befehlstypen fehlt. Preisspiegel-Ergebnistypen bleiben in `vergabe`, bis ein anderes Paket sie braucht. Ein Opus-Reviewer ersetzt die Prüfung durch den Nutzer (P9).
Reason: Ohne den Satz ist eine Zuschlagsposition im Angebot nicht berechenbar; additive Änderung bricht keine Verbraucher.
Reversible: yes  Touches: packages/vertrag

## D-05 Ausreißer im Preisspiegel bei Preis 0,00
Welle 3 · Ticket 36 · decided by: advisor
Question: Ein Preis 0,00 zieht das Mittel so weit herunter, dass alle Bieter Ausreißer werden (W-06).
Decision: Mittel (auch der virtuelle Bieter „Mittel“) und Min über Bieter mit Preis > 0. 0,00 und „nicht angeboten“ bekommen je ein eigenes Kennzeichen und sind nie Ausreißer. Unter zwei bepreisten Bietern oder bei Mittel 0 wird nichts markiert. Schwelle 20 % einstellbar.
Reason: G-26 und GLOSSARY nennen das Mittel; Median widerspräche dem.
Reversible: yes  Touches: packages/vergabe
Annahme für Demo, Mensch bestätigt später (G-26, W-06).

## D-06 W-03 und W-05 für diesen Lauf
Welle 3 · Ticket – · decided by: advisor
Question: Gilt W-03 (b) „Vertrag plus Anpassung als ein Ticket“, gelten die Annahmen W-05 Nr. 1–6?
Decision: W-03 (b) ja (Liste nicht mechanischer Änderungen im Ticket). W-05 Nr. 1–6 als Annahmen für die Demo bestätigt; Nr. 3 geht in Ticket 29.
Reason: Entspricht den Empfehlungen in `next-decisions-welle-2.md`.
Reversible: yes  Touches: docs/regeln.md (P2, nur Vermerk), Ticket 29

## D-07 Befehle für Kopfdaten in Ticket 29, Kern-Handler in Ticket 41
Welle 3 · Ticket 29, 41, 47 · decided by: orchestrator
Question: Befehle zum Bearbeiten von Auftraggeber, Vergabeinformationen, Leitbeschreibung (W-02 Frage 4, „mit U4“) hatten kein Ticket.
Decision: Typen in Ticket 29 (Punkt 8), Kern-Handler in Ticket 41, Oberfläche in Ticket 47.
Reason: U4 (47) braucht sie; 29 ist ohnehin der Vertragsstand dieses Laufs; 41 ist der kleinste Kern-Schritt vor 47.
Reversible: yes  Touches: packages/vertrag, packages/kern

## D-08 Division in `dezimal` kommt mit Ticket 35
Welle 3 · Ticket 35, 36 · decided by: orchestrator
Question: `dezimal` hat keine Division; `mengen` (REB) und `vergabe` (Mittelwert) brauchen sie. `dezimal` hat in diesem Lauf keinen anderen Schreiber.
Decision: Ticket 35 fügt `dividiere` als ersten Commit hinzu (benannte Ausnahme von P2); der Orchestrator übernimmt den Commit früh in den Integrationsbranch; Ticket 36 baut zuerst V1 und holt sich die Division danach.
Reason: Ein Schreiber für `dezimal`, kein Warten der ganzen Phase.
Reversible: yes  Touches: packages/dezimal

## D-09 Reihenfolge: 29 vor 30, 31, 32
Welle 3 · Ticket 29–32 · decided by: orchestrator
Question: Ticket 29 (Vertrag plus Anpassung) zieht Zeilen in `kern`, `speicher`, `gaeb` nach; 30–32 schreiben dort ebenfalls.
Decision: 29 läuft zuerst (parallel nur mit 33–36, die diese Pakete nicht berühren); 30–32 starten nach dem Merge von 29.
Reason: P2 (ein Schreiber je Paket) und der Rat des Beraters zu W-03 (b).
Reversible: yes  Touches: Reihenfolge

## D-10 Schnittdetails der Tickets 37–49
Welle 3 · Ticket 37, 38, 39, 44, 46 · decided by: orchestrator
Question: Offene Punkte der Ticket-Schreiber.
Decision: (1) Ticket 37 behält für Zuschlagspositionen ohne Satz die alte Rechnung Menge × EP („Altform“); die Umstellung der Fixtures `typisch`, `gross`, `typisch-angebote` (E-03) geht mit Ticket 44. (2) `AllInCat`: unmittelbar aufeinanderfolgende Zuschlagspositionen teilen eine Basis; Teilmengen (`ListInSubQty`) sind Annahme. (3) Nachlässe des Bieters je Position/Titel aus X84 sind nicht abbildbar (G-26: einer je Angebot) und werden in 44/45 als Befund gemeldet. (4) `GridIdQuelle` wird in Ticket 29 um `papierkorbEintrag` erweitert; Kopieren im Grid über einen Rückruf, den Befehl baut die App. (5) 38 hängt zusätzlich an 29 (`zuschlagssatz`-Spalte). (6) Kommt 39 vor 37, wandert der Merkmal-Teil des M1-E2E nach 47.
Reason: Hält die Fixture-Helfer in fünf Paketen grün; P2 (ui-grid importiert kern nicht).
Reversible: yes  Touches: packages/kern, packages/vergabe, packages/ui-grid, fixtures/
Annahme für Demo, Mensch bestätigt später (E-03: Teilmengen, `AllInCat`).

## D-29.1 Enge Lesarten im Vertrag v1.2
Welle 3 · Ticket 29 · decided by: implementer
Question: Wo lässt Ticket 29 die Typform offen?
Decision: Angebotsposition mit `zuschlagssatz` behält einen Pflicht-EP (Platzhalter `0.000`, nie gerechnet); `KnotenEinfuegen` ist kein Massenbefehl; `Speicher.lvStaende` optional; LV-Stand nur anlegen (kein Umbenennen, Löschen, Zurückschreiben); die Lage der Wurzeln in `KnotenEinfuegen` setzt der Kern; der Papierkorb steht nicht in `LvInhalt`; `Rueckgaengig`/`Wiederholen` nennen den ursprünglichen Befehl; Kopfdaten-Befehle setzen den ganzen Wert. Alternativen als Offene Typfragen 1–8 in Ticket 29.
Reason: Additiv, umkehrbar, kein stiller Datenverlust in `speicher` (Leitlinie aus Ticket 24/26).
Reversible: yes  Touches: packages/vertrag
Annahme für Demo, Mensch bestätigt später (P9 durch Opus-Review ersetzt, D-04).

## D-35a Sprachdetails des freien Rechenansatzes (Formel 91)
Welle 3 · Ticket 35 · decided by: implementer
Question: Was die Ticketbeschreibung der Ausdruckssprache offen lässt.
Decision: (1) „Frühere Zeile“ heißt weiter vorn in der Folge, nicht kleinere Nummer. (2) Zusätzliche Fehlercodes `ausdruck-unvollstaendig` („2+“, Spalte hinter dem Text), `variable-ungueltig` (auch leerer Name; kein Name ist `null`) und `zeile-doppelt` (doppelte Zeilennummer, die spätere Zeile ist fehlerhaft). (3) Klammern werden vor dem Abstieg gezählt: `klammer-fehlt` an der Spalte der offenen Klammer, `klammer-zu-viel` an der überzähligen, `zu-tief` an der 51. Klammer. (4) Führende Nullen sind erlaubt; Zahlen stehen normalisiert im Syntaxbaum (`2,50` → `2,5`); eine Zahl, die `dezimal` nicht fasst (≈ 1.000 Ziffern), ist `zahl-ungueltig`. (5) Variablennamen: Unicode-Buchstabe, dann Buchstaben, ASCII-Ziffern, `_`. (6) `FORMELN`: Nummer → `{ parameter, rechne(werte) }`; wie ein Ausdruck mehrere Parameter trennt, entscheidet das erste Ticket mit einer solchen Formel.
Reason: Paketlokal und umkehrbar; gespeichert wird nur der Ausdruckstext. Alles steht zusätzlich in `MENGEN_ANNAHMEN`.
Reversible: yes  Touches: packages/mengen

## D-36.1 Annahmen der Preisspiegel-Rechnung
Welle 3 · Ticket 36 · decided by: implementer
Question: Die im Ticket als Annahme markierten Punkte der Preisspiegel-Rechnung (V2) und was das Ticket offen lässt.
Decision: Wie im Ticket: kein Eintrag = nicht angeboten; negativer EP ist `angeboten`, zählt nicht für Min/Mittel/Max, nie Ausreißer; Max nur über EP > 0; Ausreißer vergleicht den EP; Rang 1, 1, 3; virtuelle Netto ohne Nachlass über die laut LV eingehenden Positionen; ABC-Schwelle B 95 %, Bezug Mittel, die überschreitende Position gehört noch zur höheren Klasse. Zusätzlich: Bieter- und Gliederungssummen rechnet der Preisspiegel aus dem übergebenen LV neu (`angebotSummenBerechnen`), nicht aus dem gespeicherten Summenstand des Angebots. Alles steht in `PREISSPIEGEL_ANNAHMEN` (`packages/vergabe/src/preisspiegel.ts`).
Reason: Ticket-Vorgaben; Neuberechnung hält den Preisspiegel konsistent mit dem LV, auch wenn ein Angebotszustand veraltet ist (Budget: gross mit 5 Angeboten etwa 0,4–0,6 s < 1 s).
Reversible: yes  Touches: packages/vergabe
Annahme für Demo, Mensch bestätigt später (G-26, D-05).

## D-36.2 Form der Angebots-ChangeSets
Welle 3 · Ticket 36 · decided by: implementer
Question: Reihenfolge der Angebotspositionen, `summen.vorher` bei leeren ChangeSets, Feld bei doppelter Position, EPA-Prüfung.
Decision: Neue Angebotspositionen werden hinten angehängt, geänderte bleiben am Platz (Umkehrung exakt). `summen.vorher` ist immer gesetzt, auch beim leeren ChangeSet (leere Listen). Doppelte Position beim Anlegen: `ungueltige-eingabe` mit `knotenId` und `feld: 'positionen'`. EPA werden nicht geprüft (nicht im Ticket). Kein Befehlshinweis `netto-nach-nachlass-negativ` am Angebot (nicht im Ticket).
Reason: kleinste umkehrbare Form; entspricht dem Kern seit v1.1a.
Reversible: yes  Touches: packages/vergabe

## D-12 Review-Korrekturen am Vertrag v1.2
Welle 3 · Ticket 29 (Folge: 42, 43, 46, 48, 49) · decided by: orchestrator
Question: Der Opus-Review von Ticket 29 (D-04 statt P9) ergab „ja mit Korrekturen“.
Decision: (1) Der Papierkorb liegt am Zustand (`LvZustand.papierkorb?`), nicht am LV oder LV-Kopf; `LvStand` und `Projektdatei` tragen ihn über `LvZustand`. (2) Bezüge (Zuschlags-`Bezugsposition`, `wahl.grundpositionId`) auf Positionen im Papierkorb bleiben stehen und zählen nichts, solange das Ziel im Papierkorb liegt; `PapierkorbeintragEntfernen`/`PapierkorbLeeren` entfernen die dann hängenden Bezüge über `knoten.geaendert` im selben ChangeSet. (3) `Papierkorbeintrag.nummer: number` (der Kern vergibt Höchstwert + 1, keine Uhr; Reihenfolge des Hineinlegens), damit die Umkehrung des Entfernens den Platz aus dem ChangeSet allein kennt. (4) `LeistungsverzeichnisLoeschen` wird mit `konflikt` abgewiesen, solange LV-Stände bestehen; ein Wiederholen von `LvStandAnlegen` friert neu ein (neues `angelegt`). (5) Schreibweise nach Glossar in einem Wort: `Papierkorbeintrag`, `PapierkorbeintragId`, `PapierkorbeintragWiederherstellen`, `PapierkorbeintragEntfernen`, `IdQuelle.papierkorbeintrag()`. (6) Glossar: ein Eintrag „Zuschlagssatz“ für LV (`Zuschlag.prozentsatz`) und Angebot (`Angebotsposition.zuschlagssatz`). (7) Platzhalter-EP: wer `zuschlagssatz` nicht auswertet, darf die Position nicht rechnen. (8) `PapierkorbeintragEntfernen`/`PapierkorbLeeren` geben `konflikt`, solange eine Angebotsposition auf eine Position im Eintrag verweist (Q5). (9) Eine Befehlsfolge wird mit je einem `Rueckgaengig` je Befehl in umgekehrter Reihenfolge zurückgenommen.
Reason: Kopf-ChangeSets bleiben frei vom Papierkorb; kein stiller Datenverlust (Q5); Umkehrbarkeit allein aus dem ChangeSet; L1/L2.
Reversible: yes  Touches: packages/vertrag, packages/kern, packages/speicher, packages/gaeb, packages/ui-grid (eine Zeile), GLOSSARY.md, Tickets 42, 43, 46, 48, 49

## D-T34 Langtext-Editor: Tabellen-Plugins aus, leere Listen/Tabellen offen
Welle 3 · Ticket 34 · decided by: implementer
Question: prosemirror-tables füllt beim Bearbeiten ungleich lange Zeilen auf (`fixTables`); leere Listen/Tabellen sind im Typ erlaubt, im Schema nicht.
Decision: Tabellen-Plugins abgeschaltet (Tab wechselt nur die Zelle). Leere Liste/Tabelle/Zeile wird nicht erzeugt und als offene Typfrage für `vertrag`/G2 gemeldet, nicht geändert. Übrige Kleinentscheidungen in Ticket 34, Comments.
Reason: Kein stilles Ändern des Langtexts (Q5); `vertrag` ändert nur ein eigenes Ticket (A4).
Reversible: yes  Touches: packages/ui-basis

## D-13 Tor für `vertrag` v1.2
Welle 3 · Ticket 29 · decided by: orchestrator
Question: Ist v1.2 stabil genug, damit 30–32 und Phase B darauf bauen (statt Prüfung durch den Nutzer, P9)?
Decision: Ja. Opus-Reviewer: „yes-with-fixes“, vier Pflichtpunkte und fünf weitere; alle neun umgesetzt (D-12), Suite grün (938 Tests). Den Berater nicht gefragt, weil der Review keine offene Abwägung übrig ließ.
Reason: Alle Befunde waren eindeutig lösbar; die Lösungen sind enge, umkehrbare Lesarten.
Reversible: yes  Touches: packages/vertrag

## D-31.1 Projekt löschen nimmt Protokoll und Bieter mit
Welle 3 · Ticket 31 · decided by: implementer
Question: `protokoll.projekt_id` verweist in Schema 1 auf `projekt`. Was geschieht beim Löschen des Projekts mit seinem Protokoll und dem Eintrag des Löschbefehls?
Decision: Vorschlag des Tickets: Bieter und Protokoll des Projekts gehen mit, der Eintrag des Löschbefehls wird nicht geschrieben (einzige Ausnahme von „ein Eintrag je Befehl“, Kommentar an `wendeProjektAn` und `anwenden`). LVs, Angebote, Auftrags-LV verhindern das Löschen (`konflikt`).
Reason: Keine Migration in Ticket 31; das ChangeSet bleibt allein umkehrbar (`vorher` trägt Projekt und Bieter). Alternative (Fremdschlüssel lösen, Protokoll bleibt) gehört zu Schema 2, Ticket 38.
Reversible: yes  Touches: packages/speicher

## D-31.2 Löschen verlangt den vollen gespeicherten Stand im ChangeSet
Welle 3 · Ticket 31 · decided by: implementer
Question: Wie streng prüft `speicher` ein Lösch-ChangeSet (LV, Angebot), das `kern` noch nicht erzeugt?
Decision: Kopf in `vorher` gleich dem gespeicherten, alle Knoten bzw. Angebotspositionen in `entfernt` (fehlt einer: `konflikt`), `summen.vorher` falls gesetzt gleich den gespeicherten Summen (sonst `konflikt`); neue Summen, hinzugefügte oder geänderte Knoten im Lösch-ChangeSet sind ein Programmfehler (`unbekannt`).
Reason: Q5 und Umkehrbarkeit ohne Vorzustand (v1.1a): Nur so stellt die Umkehrung (Anlegen) dasselbe Aggregat wieder her. Ticket 30 muss sein Lösch-ChangeSet in dieser Form liefern (wie im Vertrag beschrieben).
Reversible: yes  Touches: packages/speicher, Ticket 30 (Form des Lösch-ChangeSets)

## D-32.1 GAEB-Leser auf v1.1a/v1.1b: offene Lesarten
Welle 3 · Ticket 32 · decided by: implementer
Question: Was Ticket 32 offen lässt (Überlauf-Codes, Grundausführung, Zuschlagsformen, Langtext-Kanon, Reste, Kopfdaten-Formate).
Decision: Überlauf-Codes des Lesers bleiben (andere Lage als der Befehlsfehler `oz-ueberlauf`). Variante 0 trägt `wahl` mit `grundpositionId: null`. Zuschlag: alle drei Bezugsformen, `teilmenge` immer `null` (keine Datei zeigt sie), `Markup` → Satz. Langtext: lose `span`/`br` bleiben lose, leere `p` bleiben leere Absätze, Läufe gleicher Auszeichnung verschmelzen, Zeilenwechsel im Dateitext → Leerzeichen; `formatierung-verworfen` meldet zusätzlich Durchgestrichen, Hoch-/Tiefstellung, Rahmen, Einzug, Listenstil. Neue Befunde `ergaenzung-nicht-oben`, `ergaenzung-ungueltig`, `wert-ungueltig`, `leitbeschreibung-ohne-kennzeichen`, `unterbeschreibung-ohne-nummer`. Einzelheiten: Ticket 32, Comments.
Reason: Kein stiller Verlust (Q5), nichts erfunden (C4), Form passend zum Editor-Kanon (Ticket 34) für den Rundweg G2.
Reversible: yes  Touches: packages/gaeb

## D-46.1 Tastenbelegung und Lesarten der Zeilenaktionen im Grid
Welle 3 · Ticket 46 · decided by: implementer
Question: Tastenbelegung (Vorschlag im Ticket) und was das Ticket bei Einfügen, Verschieben und Löschen offen lässt.
Decision: Strg+C/X/V, Strg+Minus/Strg+Entf (Rückfrage), Alt+Pfeil hoch/runter, Strg+Plus (`key '+'`), Escape bricht Ausschneiden ab (die Zeilen bleiben als kopiert gemerkt). Eigener Text ohne `onKopieEinfuegen` wird spaltengenau ab der ersten Spalte eingefügt. „Hinter einer Gliederung“ ist im Vertrag „als erstes Kind“: Strg+Plus auf einer Gliederung legt das erste Kind an; Verschieben neben einer Gliederung verschiebt den Nachbarn oder legt eine Teilfolge neu, stets ein Befehl. Die Rückfrage zählt sichtbare Positionen und sagt „mindestens“ bei zugeklappten Knoten. Einzelheiten in Ticket 46, Comments.
Reason: Excel-nah (U3), keine bestehende Taste geändert außer Alt+Pfeil hoch/runter (vom Ticket verlangt); `Einfuegeort` bleibt unverändert (A4).
Reversible: yes  Touches: packages/ui-grid

## D-30.1 Kern v1.1a: Lesarten bei Umkehrung, Hinweisen und F1
Welle 3 · Ticket 30 · decided by: implementer
Question: Was Ticket 30 offen lässt (Hinweise in der Umkehrung, ChangeSet ohne `vorher`, Reichweite der F1-Prüfung, Projekt-ChangeSet ohne Änderung, `wurzelId` im Kopf).
Decision: Die Umkehrung trägt keine Hinweise; ein ChangeSet ohne `summen.vorher` umzukehren wirft. `netto-nach-nachlass-negativ` bei jedem ChangeSet mit negativem neuem Netto nach Nachlass (Annahme des Tickets). F1 (Lose und Titel nicht nebeneinander, Los-Stufe) wird nur geprüft, wenn ein Knoten neu auf die oberste Ebene kommt; der Import (`LeistungsverzeichnisAnlegen`) bleibt offen (U5). Projekt-ChangeSet ohne Änderung: `vorher` gleich `nachher`. Der LV-Kopf trägt kein `wurzelId` mehr. Einzelheiten: Ticket 30, Comments.
Reason: Hinweise sind flüchtig (Vertrag); kein stilles Falsch (Q5); Validierung blockiert den Import nie (U5); Kopf gleich `LvKopf`, damit `speicher` ihn exakt vergleicht (D-31.2).
Reversible: yes  Touches: packages/kern (mechanisch: Testhilfen in vergabe und ausgabe)


## D-40.1 GAEB-Writer: was das Ticket offen lässt
Welle 3 · Ticket 40 · decided by: implementer
Question: Pflichtteile von X86 ohne Gegenstück im Modell (Auftragnehmer, Satz der Altform), Form des X83 ohne Menge, Schemastellen ohne Platz für einen Langtext-Baustein, Lesen von `LblBoQ`.
Decision: `CTR`/`OWN` in X86 mit leerer Adresse und Warnung; Altform-Zuschlag in X86 als Position ohne Bezug (Warnung), in X81/X83 wie im Ticket; X83 ohne Menge schreibt `QtyTBD`; zusätzliche Optionen `zuschlagsbasen` und `auftragnehmer`; Leser nimmt `LblBoQ`, wenn `Name` dessen Anfang ist. Einzelheiten und M2-Tabelle: Ticket 40, Comments.
Reason: Nichts erfinden (C4), nichts still verlieren (Q5), Exporte der Fixtures bleiben schemagültig und ohne Entwurf.
Reversible: yes  Touches: packages/gaeb

## D-14 Ticket 37 darf `vergabe` mitziehen
Welle 3 · Ticket 37, 44 · decided by: orchestrator
Question: K5–K7 füllt `summeBedarfOhneGesamtbetrag` und `summeWahl` immer; die inkrementellen Angebotssummen in `vergabe` stimmten danach nicht mehr (7 Tests rot). Ticket 37 hat das in `vergabe` mitgezogen (Commit 32837be), obwohl das Ticket nur `kern` nennt.
Decision: Behalten, als benannte Ausnahme von P2. `vergabe` hatte zu der Zeit keinen Schreiber; Ticket 44 baut darauf auf.
Reason: Hält den Integrationsbranch grün, ohne Arbeit doppelt zu machen.
Reversible: yes  Touches: packages/vergabe

## D-37.1 Betragsziel, Ausweise, Pauschal und Formprüfungen (K5)
Welle 3 · Ticket 37 · decided by: implementer
Question: Welche Vorschläge des Tickets zu Merkmalen gelten, und was lässt das Ticket offen?
Decision: Wie vorgeschlagen: Wahl vor Bedarf; Variante 0 ist Grundausführung und zählt wie eine Normalposition (mit Bedarf ohne Gesamtbetrag also in die Bedarfssumme); eine Wahlzuordnung mit Variante `null` (Daten vor v1.1b) ist Alternative; Pauschal ohne Menge rechnet mit Menge 1; Ausweise an jeder Gliederung und im Gesamt, `0.00` ohne solche Positionen (Orchestrator-Hinweis zu Variante 0: die Daten der Prüfdateien widersprechen nicht). Zusätzlich: `wahl.gruppe`/`variante` müssen ganzzahlig sein (Prüfung 4); eine Position, die eine Bezugsliste nennt, kann nicht per `PositionsmerkmaleSetzen` zur Zuschlagsposition werden (`ungueltige-eingabe`, `feld: 'zuschlag'`), sonst verletzte das LV Prüfung 3. Die Summen leitet der Kern jetzt für jeden Befehl aus dessen Knotenänderungen ab (`summenAenderung(z, idx, { knoten })`), nicht mehr aus Beiträgen je Befehl.
Reason: E-04/E-05 und F4; Prüfung 3 muss als Invariante halten (`pruefeLvInvarianten`); eine Ableitung statt fünf Handrechnungen hält Zuschläge in jedem Befehl richtig (Property-Test mit unabhängigem Orakel).
Reversible: yes  Touches: packages/kern, packages/vergabe (mechanisch, eigener Commit: Ausweise im inkrementellen Angebotsstand), GLOSSARY.md
Annahme für Demo, Mensch bestätigt später (E-04, E-05).

## D-37.2 Zuschlagsposition: Lesarten der Rechenregel (K6)
Welle 3 · Ticket 37 · decided by: implementer
Question: Die mit „Vorschlag“ markierten Regeln R2, R3, R5, R7, R8 und was das Ticket offen lässt.
Decision: R2 nur Bezugspositionen, deren Betrag ins Netto geht. R3 Hinweistexte und Untergliederungen werden übersprungen (beenden weder Block noch Bereich). R5 Teilmenge → gerundet(Teilmenge × EP, 2) (Lücke, nicht aus Daten belegt). R7 keine eigene Schnittstelle „Preisquelle“: `summenBerechnen` rechnet jedes gedachte LV, `zuschlagsbasen(lv)` liefert `{ basis, betrag, bezugOhnePreis }`; „Bezug ohne Preis“ heißt: eine Position, die zur Basis gehören würde, hat keinen GP. R8 Altform wie vorgeschlagen. Eine leere Liste oder ein leerer Bereich ergibt Basis 0,00 und Betrag 0,00 (Befund für K8). Die Fixture `zuschlag.json` trägt additiv auch `epa` (Ticket: „mit ihren Anteilen“) und in den Sollwerten `zuschlaege` und `epa`.
Reason: D-03/D-10 und die Golden-Zahlen der X86/X84; eine gemeinsame Rechenstelle für LV und Angebot (Ticket 44).
Reversible: yes  Touches: packages/kern, fixtures/ (nur neue Datei und Generator, andere Dateien byte-gleich)
Annahme für Demo, Mensch bestätigt später (F3/E-03: Teilmengen, Untergliederungen im Bereich).

## D-37.3 Einheitspreisanteile (K7)
Welle 3 · Ticket 37 · decided by: implementer
Question: Wie folgen EP und Anteile einander, und was zählt in den Anteilsummen?
Decision: Wie vorgeschlagen: gesetzte Anteile (mindestens einer nicht `null`) setzen den EP im selben ChangeSet auf ihre Summe; `epa: null` entfernt nur die Anteile; `EinheitspreisAendern` lässt Anteile stehen. Zusätzlich: Anteile ganz ohne Wert lassen den EP stehen; die Altform einer Zuschlagsposition darf Anteile tragen, eine mit Satz nicht (`knotenart-unzulaessig`). `epaSummen` zählt Positionen mit GP, deren Betrag ins Netto geht (Pauschal ohne Menge mit Menge 1), und nennt jede Gliederung (0,00 ohne Anteile).
Reason: Beleg X86 1.10.30.10/20 (UP = Summe der UPComp); kein EP aus dem Nichts.
Reversible: yes  Touches: packages/kern

## D-41.1 Formale LV-Prüfung (K8): offene Schwellen und Lesarten
Welle 3 · Ticket 41 · decided by: implementer
Question: Was Ticket 41 offen lässt (Schwere von `menge-null`, was „leer“ heißt, Maske ungültig, Quelle der Summen, Reihenfolge, Form der Kopfdaten-Befehle).
Decision: `menge-null` ist Warnung und gilt nur für Positionen ohne Zuschlag. „Leer“ heißt nur Leerraum (Name, Kurztext, Einheit); ein Langtext ist leer ohne sichtbaren Text, Bild oder Textergänzung. Zeichen zählen als Unicode-Codepunkte; Steuerzeichen U+0000–001F, U+007F–009F, U+2028/2029. Bei ungültiger OZ-Maske meldet die Prüfung `oz-maske-ungueltig` (aus `maskePruefen`, Warnung) und prüft die OZ nicht gegen die Maske. `zuschlag-ohne-bezug`: keine Position im Bezug, die Basis sein kann (R2); Papierkorb zählt nicht. GP und Summen aus `LvZustand.summen` (keine Neuberechnung). Reihenfolge: LV-weite Befunde zuerst, dann Knoten in Dokumentreihenfolge, je Ort nach Code und Feld. Kopfdaten-Befehle prüfen nur die Form (Typ jedes Felds, Menge der Unterbeschreibung in der Skala), nie Inhalte. Alles in `PRUEF_ANNAHMEN` (`packages/kern/src/pruefregeln.ts`).
Reason: Engste Lesart des Tickets, paketlokal und umkehrbar; U5 (Validierung blockiert nie).
Reversible: yes  Touches: packages/kern, GLOSSARY.md

## D-45.1 X84-Import: Lesarten des Angebotslesers
Welle 3 · Ticket 45 · decided by: implementer
Question: Was Ticket 45 als Vorschlag offen lässt (EPA-Zuordnung, EPA ohne Beschriftung, IT 0,00 an Alternativen, Zeilen falscher Art, Bieterergänzung „mit Inhalt“).
Decision: EPA wie der X86-Leser (D-40.1): Bezeichnung vor `Type`, `Miscellaneous` + „Nachunternehmer“ → `nachunternehmer` (statt Typ zuerst/`sonstiges` aus dem Ticket); Widerspruch Bezeichnung/Typ → `epa-beschriftung-abweichend`. Ohne `LblUPComp` in der X84 (beide BVBS-X84) bleiben die Anteile `null` mit `epa-nicht-abgebildet` (die Beschriftungen definiert das LV, `LvInhalt` hält sie nicht: Vertragslücke). `IT` 0,00 an Alternative/Bedarf ohne GB ist kein `gp-abweichend`. Zeile mit falscher Art (`zuschlag-art-abweichend`) wird „nicht angeboten“. Bieterergänzung zählt nur mit `Kind="Bidder"`, ohne `Empty="Yes"` und mit Text. Nachlässe je Position/Gliederung: Fehler `nachlass-nicht-abgebildet` (D-10 Nr. 3). Einzelheiten: Ticket 45, Comments.
Reason: Gleiche Beschriftung landet im X84 und X86 beim selben Anteil (Rundweg mit dem eigenen X83-Export); nichts erfinden (C4), nichts still verlieren (Q5).
Reversible: yes  Touches: packages/gaeb

## D-44.1 Zuschlagspositionen im Angebot und im Preisspiegel: Lesarten
Welle 3 · Ticket 44 · decided by: implementer
Question: Was Ticket 44 bei Lücken des Bieters, beim Satz an falscher Stelle und im Preisspiegel offen lässt.
Decision: Wie vorgeschlagen: Satz fehlt → kein Betrag, Kennzeichen `zuschlagssatz-fehlt`; nicht angebotene Bezugsposition trägt nichts bei, Kennzeichen `basis-unvollstaendig` (aus `zuschlagsbasen`, „Bezug ohne Preis“); Satz 0,00 → Betrag 0,00, Kennzeichen `nullpreis`. Zusätzlich: (1) `zuschlagssatz-fehlt` nur bei einer angebotenen Position ohne Satz und ohne Betrag aus der Altform; kein Eintrag oder `nicht-angeboten` bleibt `nicht-angeboten`; beide zählen in `Bietersumme.nichtAngeboten`. (2) Im gedachten LV steht an jeder Zuschlagsposition der Satz des Bieters oder `null`, nie der Satz des LV; ohne Satz trägt sie den EP des Bieters, den nur die Altform (R8) rechnet. (3) Satz an einer Position ohne Zuschlag oder nicht kanonisch (2 Stellen) → `ungueltige-eingabe`, `feld: 'zuschlagssatz'`; ein negativer Satz ist erlaubt (U5) und zählt wie ein negativer EP nicht für Min/Mittel/Max. (4) Preisspiegel: Eine Zeile mit `zuschlag` im LV (auch Altform) vergleicht Beträge; Mittel = Σ / n auf 2 Stellen; EP der Bieterspalte nur bei einem Betrag aus der Altform, EP der virtuellen Bieter `null`; Schätzpreis mit Satz, Basis und Betrag des LV (Altform: Menge × EP). (5) `AngebotspositionSetzen` rechnet die betroffenen Zuschlagspositionen inkrementell mit `summenBerechnen` des Kerns auf einem Teil-LV (Wurzel = Elternknoten der Zuschlagsposition, dessen Kinder und die Positionen, die eine Liste darunter nennt); keine eigene Zuschlagsregel in `vergabe`.
Reason: „wie nicht angeboten“ (Ticket) ohne die Unterscheidung „nicht angeboten“ zu verlieren; kein Satz des LV im Angebot (G-26: Angebot ist eigenständig); Fehler statt Befund, weil der Satz an einer normalen Position keine Bedeutung hat (Vertrag v1.2 überlässt das der Rechnung); A6 und Q4 (gross < 16 ms).
Reversible: yes  Touches: packages/vergabe
Annahme für Demo, Mensch bestätigt später (G-26, D-05).

## D-44.2 Punkt 5 von Ticket 44 (Fixtures in GAEB-Form) als Folgeticket
Welle 3 · Ticket 44 · decided by: implementer
Question: Ticket 44 erlaubt, Punkt 5 abzuspalten, wenn es zu groß wird. Wird es abgespalten?
Decision: Ja. `typisch`, `gross` und `typisch-angebote` bleiben in der Altform; Vermerk in `fixtures/README.md` und in Ticket 44, Comments (Liste der Verbraucher).
Reason: Punkt 5 berührt die Fixture-Testhelfer und Sollwert-Tests in `kern` (in dieser Phase schreibt Ticket 41 dort), dazu die GAEB-Export-Goldens aus `typisch`/`gross` in `gaeb` (nicht im Ticket genannt; Ticket 45 schreibt dort) und `speicher`, `ausgabe`, `ui-grid`, `apps/web`; das sprengt P1 und kollidiert mit P2.
Reversible: yes  Touches: fixtures/README.md, Folgeticket

## D-42.1 K9: Lesarten bei Auswahl, Papierkorb und Bezügen
Welle 3 · Ticket 42 · decided by: implementer
Question: Was Ticket 42 bei Mehrfachauswahl, unbekanntem Eintrag, Wiederherstellen und Bezügen in den Papierkorb offen lässt.
Decision: Nachfahren genannter Knoten und Doppelte zählen nicht eigens (Kopie, Verschieben, Papierkorb); `nach X` mit mitbewegtem X landet an dessen Stelle; leere Liste und unbekannter Eintrag `ungueltige-eingabe` (`feld` `knoten`/`knotenIds`/`eintragId`); ein Eintrag hält seine Knoten in Dokumentreihenfolge; Wiederherstellen mit `ort: null` an die alte Stelle (sonst Ende der Wurzel) mit den Prüfungen des Einfügens; Entfernen/Leeren lösen Bezüge auch in verbleibenden Einträgen (`papierkorb.geaendert`); Bezüge in den Papierkorb sind auch bei `PositionAnlegen`, `PositionsmerkmaleSetzen`, `KnotenEinfuegen` gültig, Kennungen im Papierkorb gelten als vergeben; `pruefeLvInvarianten(lv, papierkorb?)`. Einzelheiten: Ticket 42, Comments.
Reason: D-12 (Bezüge bleiben stehen), Q5 (kein hängender Bezug nach dem Wiederherstellen), Umkehrbarkeit allein aus dem ChangeSet.
Reversible: yes  Touches: packages/kern

## D-42.2 KnotenEinfuegen vergibt den Wurzeln immer eine neue OZ
Welle 3 · Ticket 42 · decided by: implementer
Question: Das Ticket nennt die OZ-Neuvergabe „in einen anderen Elternknoten“; beim Einfügen zählt die mitgebrachte Lage der Wurzeln nach dem Vertrag nicht.
Decision: Eingefügte Wurzeln bekommen immer einen OZ-Vorschlag, ihr Unterbaum wird darunter neu nummeriert; `kopieBauen` lässt die OZ stehen; `ozIndex` bleibt. Verschieben innerhalb desselben Elternknotens behält die OZ.
Reason: Ein „gleicher Elternknoten“ ist beim Einfügen nicht erkennbar; eine Kopie ist ein neuer Knoten und braucht eine Nummer (W-06).
Reversible: yes  Touches: packages/kern

## D-42.3 Regel des OZ-Vorschlags
Welle 3 · Ticket 42 · decided by: implementer
Question: Was „nächste freie OZ hinter dem Vorgänger“ im Einzelnen heißt.
Decision: Teil des Vorgängers + 10 (Position) bzw. + 1 (Gliederung); Vorgänger/Nachfolger = nächstes Geschwister derselben Art mit rein numerischem Teil; Ausweichen auf 5, 2, 1 mit `oz-schritt-ausgewichen`, wenn der Teil nicht vor den Nachfolger oder in die Stellen passt oder belegt ist; sonst `null`. Scheitert die Nummerierung eines eingefügten oder verschobenen Unterbaums, bleibt dessen OZ leer (K8 `oz-fehlt`), der Befehl wird nicht abgewiesen (U5).
Reason: F2/E-09 und der Schritt der Umnummerierung (Ticket 06); Validierung blockiert die Eingabe nicht (U5).
Reversible: yes  Touches: packages/kern


## D-15 Langtext-Lücke im Kern als eigenes Ticket 50
Welle 3 · Ticket 47, 48, 50 · decided by: orchestrator
Question: Der Kern weist Absätze, Listen, Tabellen und Textergänzungen in `LangtextAendern` ab; Ticket 47 konnte deshalb einen Akzeptanztest nur als `test.fixme` schreiben.
Decision: 47 mit dem markierten `test.fixme` mergen (Lücke liegt außerhalb von `apps/web`); neues Kern-Ticket 50 schließt die Lücke; Ticket 48 entfernt das `fixme`, sobald 50 gemergt ist.
Reason: P2 (ein Schreiber je Paket); kein dauerhaft übersprungener Test.
Reversible: yes  Touches: packages/kern, apps/web/e2e

## D-16 Wahl ohne Gruppe/Variante im GAEB-Export
Welle 3 · Review C2, S4 · decided by: advisor
Question: Aus v1 migrierte Wahlpositionen (Gruppe/Variante `null`) schreibt der Writer als normale `Item`; beim Re-Import zählen sie ins Netto. `gaeb` hat eine eigene, abweichende Kopie der Kern-Regel `betragsziel`.
Decision: Der Writer vergibt deterministisch eine künstliche Wahlgruppe (eine Gruppe je `grundpositionId`, Varianten 1..n in LV-Reihenfolge, Gruppennummern oberhalb der höchsten belegten; Wahl ohne Grundposition eigene Gruppe), mit Warnung (U5). Über 9 Varianten oder 999 Gruppen: vorhandener Fehler `wahl-nummer-ungueltig`, kein Rückfall auf `Item`. `gaeb` nutzt die Kern-Regel `betragsziel` (Abhängigkeit `gaeb → kern`, A3 erlaubt) statt einer Kopie. Die Migration erfindet keine Fachdaten.
Reason: D-37.1 („Variante `null` = Wahl“) bindet; ein normales `Item` verschiebt still Geld ins Netto.
Reversible: yes  Touches: packages/gaeb
Annahme für Demo, Mensch bestätigt später (E-04: Gruppe und Variante aus GAEB).

## D-17 Summen nach der Migration v1 → v2 neu rechnen
Welle 3 · Review C1 · decided by: advisor
Question: Migration 2 lässt Bedarfs-/Wahlsumme `NULL`; Pauschal-GP (D-37.1) macht gespeicherte Summen veraltet.
Decision: Nach dem Schemaschritt rechnet `speicher` in derselben Transaktion alle gespeicherten Summen mit `summenBerechnen` aus dem Kern neu, für Datei- und Datenbankweg (Abhängigkeit `speicher → kern`, A3 erlaubt). Weist der Kern Altdaten ab: Daten behalten, Befund melden, Migration nicht abbrechen.
Reason: Gespeicherte Summen müssen im Ruhezustand stimmen; kein dauerhafter Altlast-Zweig im Kern.
Reversible: yes  Touches: packages/speicher

## D-18 Tor M2 „erfüllt mit gelisteten Unterschieden“
Welle 3 · Review P1, P2 · decided by: advisor
Question: Roundtrip ergibt ein identisches Modell nur bis auf eine Liste erwarteter Unterschiede; Fixture `zuschlag` fehlt in Export und XSD-Prüfung.
Decision: `zuschlag` jetzt in die Export-/XSD-/Roundtrip-Liste; die Unterschiedsliste ist je Fixture und Position ausdrücklich, der Test schlägt bei jedem ungelisteten Unterschied fehl. M2 gilt als „erfüllt mit gelisteten Unterschieden“. Fixture-Umstellung auf die GAEB-Form als Folgeticket 51 (`ready-for-agent`, blockiert M3).
Reason: D-44.2 hat die Umstellung aus P1/P2-Gründen abgespalten; sie jetzt zu machen öffnet fünf Pakete beim Wellenabschluss.
Reversible: yes  Touches: packages/gaeb, Ticket 51

## D-19 Paketgrenzen: `speicher → kern` und `gaeb → kern` freigegeben
Welle 3 · Review C1, S4, S6 · decided by: orchestrator
Question: Die Behebung von C1 (D-17) und S4/S6 (D-16) braucht Kern-Funktionen in `speicher` und `gaeb`; `tools/boundaries.mjs` erlaubte beides nicht.
Decision: Beide Kanten in `tools/boundaries.mjs` freigegeben, mit Grund im Kommentar. Kein Aufweichen der Prüfung: A3 sieht `vertrag ← kern ← Fachpakete` vor; Fachpakete untereinander bleiben verboten.
Reason: Die Liste war enger als Regel A3; die Alternative wären doppelte Fachregeln (genau der Review-Befund).
Reversible: yes  Touches: tools/boundaries.mjs

## D-20 `apps/web`: ein Schreiber je Ordner statt je Paket
Welle 4 · Ticket 62–67 · decided by: orchestrator
Question: Welle 4 hat sechs App-Tickets (S4, V3, V4, M2, O1/O2, Rückbau). Streng nach P2 liefen sie alle nacheinander.
Decision: In `apps/web` gilt „ein Schreiber je Ordner `src/<strang>/`“ (wie `plan.md` §1 die Ordner vorsieht). Gemeinsame Dateien (`App.tsx`, `main.tsx`, `ui/Huelle.tsx`, `lv/LvSeite.tsx`, `projekt/ProjektSeite.tsx`, `playwright.config.ts`) fasst ein Ticket nur an einer markierten Einhängestelle an; Konflikte dort löst der Merger.
Reason: Hält die Welle parallel, ohne dass zwei Agenten dieselbe Fachlogik schreiben; die Einhängestellen sind kurz.
Reversible: yes  Touches: apps/web, docs/regeln.md P2 (nur Lesart, kein Text geändert)

## D-21 Zuschlag → Auftrags-LV: nur das Beauftragte
Welle 4 · Ticket 59, 64 · decided by: advisor
Question: Wie bildet das Auftrags-LV den Zuschlag ab, insbesondere das „Wählen“ von Wahlpositionen (E-04)?
Decision: Reine Funktion in `vergabe` (`zuschlagErteilen(lv, angebot, gewaehlt, neueId)`), Ergebnis ist der vorhandene Befehl `AuftragsLeistungsverzeichnisAnlegen` plus Warnungen; kein neuer Vertragsbefehl. Grundlage ist das gedachte LV des Angebots (EP, Zuschlagssatz und Nachlass des Bieters, MwSt des LV). Eine gewählte Wahlposition wird normal (`wahl: null`); Grundposition (Variante 0) und nicht gewählte Alternativen ihrer Gruppe entfallen. Gruppen ohne Wahl behalten die Grundposition, alle Alternativen entfallen. Bedarf bleibt Bedarf. `reihenfolge` dicht neu je Elternknoten, OZ bleibt (Lücken erlaubt), geleerte Titel bleiben. Listenbezüge von Zuschlagspositionen und `grundpositionId` auf entfallene Positionen werden entfernt (je Warnung), nicht umgelenkt. Mehr als eine Wahl je Gruppe oder eine gewählte Kennung, die keine Alternative ist: Fehler. Nicht angebotene Positionen (auch gewählte): EP `null` mit Warnung, der Zuschlag geht durch (U5). Die App zeigt vor dem Bestätigen die Zahl der entfallenden und unbepreisten Positionen und lehnt einen zweiten Zuschlag zum selben LV ab (Q5).
Reason: Glossar: Wählen ersetzt die Grundposition; F4 („ersetzt nie“) gilt für das Ausschreibungs-LV, das unverändert bleibt. Gruppe/Variante bleiben über die gemeinsame Positions-ID erhalten (ADR 0011).
Reversible: yes (Auftrags-LV ist aus LV + Angebot ableitbar)  Touches: packages/vergabe, apps/web
Annahme für Demo, Mensch bestätigt später (E-04).

## D-22 `vertrag` v1.3: Umfang und Lesarten
Welle 4 · Ticket 53 · decided by: advisor
Question: Mengenansatz für M2, Punkte 7 und 8 von Ticket 53, Prüfung statt Nutzer (P9).
Decision: (i) Neuer Punkt 9: `Ansatzzeile` wandert nach `vertrag` (`mengen` importiert den Typ, mechanisch); `Positionsdaten.mengenansatz?` optional; neuer LvBefehl `MengenansatzSetzen { positionId, mengenansatz | null, menge }`, die App rechnet die Menge mit `mengen`, der Kern speichert beides unausgewertet (kein `kern → mengen`, A3). Lesarten im Typkommentar: ein reiner Mengenbefehl an einer Position mit Ansatz entfernt den Ansatz im selben ChangeSet (die Oberfläche fragt vorher); ein Ansatz mit Fehler kommt mit `menge: null`. Kern-Handler, Speicher und Panel sind Folgetickets (56, 57, 65). (ii) Punkt 7: kein Typ, Offene Typfrage in den Comments, Befund `nachlass-nicht-abgebildet` bleibt (G-26). (iii) Punkt 8: Typ bleibt weit, K8 meldet einen Befund, der GAEB-Writer verwirft mit Warnung. (iv) P9: Opus-Reviewer prüft v1.3 (besonders die nicht additiven Punkte 3, 4, 5 gegen alle Verbraucher), Torvermerk wie D-13 vor den Folgetickets.
Reason: Nur gespeicherte Menge plus unausgewerteter Ansatz respektiert A3; die zwei Lesarten verhindern Auseinanderlaufen. G-26 ist entschieden.
Reversible: yes  Touches: packages/vertrag, packages/mengen (mechanisch), Tickets 56, 57, 65
Annahme für Demo, Mensch bestätigt später (P9).

## D-23 O1: pdfmake ungetaggt, ADR 0012 als Vorschlag
Welle 4 · Ticket 58 · decided by: advisor
Question: W-04 (getaggtes PDF in v1?) ist unbeantwortet und blockiert O1.
Decision: pdfmake, ungetaggt, für v1; ADR 0012 mit `Status: proposed` („für die Demo umgesetzt, Mensch bestätigt später (W-04)“). pdfmake bleibt hinter dem eigenen `Ausgabemodell`, damit der Renderer tauschbar ist; Weg B des Spikes (Browserdruck) entfällt. O1 druckt Bedarfs- und Wahlsummen getrennt (F4). Vor O3 ein Spike mit einer Bibliothek, die Struktur-Tags schreibt.
Reason: U8 nennt das PDF nicht; der Browserdruck liefert der App keine Bytes.
Reversible: yes  Touches: packages/ausgabe, docs/adr/0012
Annahme für Demo, Mensch bestätigt später (W-04).

## D-24 C1 als reines Paket `kosten`
Welle 4 · Ticket 55 · decided by: advisor
Question: Wie weit geht C1 in Welle 4?
Decision: Neues reines Paket `packages/kosten` (importiert nur `vertrag`, `dezimal`), keine Vertragstypen, keine Speicherung, keine Oberfläche. Keine eingetippte DIN-276-Nummernliste: Ebene und Elternteil aus den Ziffern (X00 → XY0 → XYZ), nur die Form wird geprüft. Bezeichnungen aus einer CSV des Nutzers (reine Funktion Text → Zuordnung). Beträge 2 Stellen; Summe einer Gruppe = eigener Betrag + Summen der Kinder; eigener Betrag und Kinderbeträge zugleich ergibt einen Befund, nie eine Sperre (U5). Speicherung und Zuordnung LV ↔ KG mit C2 (Welle 5).
Reason: Kein zweites Paket braucht die Typen vor C2 (A4); M3 braucht keine Kosten.
Reversible: yes  Touches: packages/kosten, tools/boundaries.mjs
Annahme für Demo, Mensch bestätigt später (G-16: Hierarchie aus den Ziffern, Regel „eigener Betrag + Kinder“).

## D-25 O2: Excel über `fflate` und eigene SpreadsheetML-Schicht
Welle 4 · Ticket 61 · decided by: orchestrator
Question: Welche Bibliothek schreibt und liest `.xlsx` für den Bieter-Rundlauf?
Decision: `fflate` (MIT) für ZIP, eigene kleine Schicht für SpreadsheetML (Schreiben mit festen Stilen, Lesen von Zellwerten inkl. Shared Strings und Inline-Strings). Keine große Excel-Bibliothek. Fällt die Lizenzprüfung für `fflate` durch, darf der Umsetzer eine andere MIT/Apache-Bibliothek wählen und begründen.
Reason: deterministische Bytes für Golden-Tests, kleines Bündel, keine Node-Polyfills im Browser; der Bedarf (eine Tabelle mit festen Spalten) ist schmal.
Reversible: yes  Touches: packages/ausgabe

## D-26 Ticket 67 darf `Button` in `ui-basis` einen `ref` geben
Welle 4 · Ticket 67 (Folge von 54) · decided by: orchestrator
Question: Der Löschdialog des Grids und App-Dialoge können den neuen Anfangsfokus (54, Punkt 6) nicht auf einen Knopf setzen, weil `Button` keinen `ref` annimmt.
Decision: Ticket 67 ergänzt `Button` um die Weitergabe des `ref` (benannte Ausnahme von P2, `ui-basis` hat in dieser Phase keinen Schreiber); der Löschdialog in `ui-grid` bleibt bis zu einem späteren Grid-Ticket bei seinem Tastenhandler.
Reason: Eine Zeile, additiv, kein anderer Schreiber in `ui-basis`.
Reversible: yes  Touches: packages/ui-basis, apps/web

## D-27 Tor für `vertrag` v1.3
Welle 4 · Ticket 53 · decided by: orchestrator
Question: Ist v1.3 stabil genug, damit 56, 57, 59, 65, 68 darauf bauen (statt Prüfung durch den Nutzer, P9, D-22 (iv))?
Decision: Ja, nach Behebung der Review-Befunde. Opus-Reviewer: „yes-with-fixes“; nicht additive Punkte 3, 4, 5, 9 gegen alle Verbraucher geprüft, kein Verlust außer `PositionAnlegen` mit `mengenansatz` (wird abgewiesen). Befunde 1, 2, 5, 6, 8 behebt Ticket 53, Befund 3 per D-28, Befund 4 als Nachträge „Aus Ticket 53“ in 56, 57, 59, 65, 68; Befund 7 geht an Ticket 68.
Reason: Alle Befunde eindeutig lösbar; die eine Abwägung (Befund 3) hat der Berater entschieden.
Reversible: yes  Touches: packages/vertrag, Tickets 56, 57, 59, 65, 68
Annahme für Demo, Mensch bestätigt später (P9).

## D-28 EPA-Bezeichnungen mit ausdrücklicher Nummer
Welle 4 · Ticket 53, 57, 68 · decided by: advisor
Question: `epaBezeichnungen` als dichte Liste (Eintrag i = `UPComp<i+1>`) kann keine Lücken zeigen; der GAEB-Leser erzeugt aber Lücken.
Decision: `EpaBezeichnung { nummer: 1..6; anteil: EpaArt; bezeichnung: string | null }`, nach `nummer` sortiert, `nummer` und `anteil` je eindeutig, Feld optional. Fehlende Nummer = Platz nicht belegt; `bezeichnung: null` = Art aus `Type` bekannt, Beschriftung leer; Feld fehlt = heutige feste Belegung des Writers. Writer nummerieren nie um; ob das XSD Lücken in `LblUPComp` zulässt, prüft Ticket 68 (sonst Platzhalter-Beschriftung, keine Umnummerierung).
Reason: Die Platznummer ist der einzige Schlüssel, der `UPComp<n>` eines Bieters (X84 ohne `LblUPComp`) einer Art zuordnet; eine dichte Liste verschöbe Preise still in eine falsche Art (Q5).
Reversible: yes (noch nicht gespeichert)  Touches: packages/vertrag, Tickets 57, 68

## D-53.1 Enge Lesarten im Vertrag v1.3
Welle 4 · Ticket 53 · decided by: implementer
Question: Wo lässt Ticket 53 (mit D-22) die Typform offen?
Decision: `LvUebersicht` nur `{ id, name }`, sortiert wie die Projektliste; `Projektdatei.lvStaende` bleibt optional (nur `Speicher.lvStaende` wird Pflicht); neue Ortsform `{ art: 'hinter-gliederung'; gliederungId }` nur für Gliederungen, `nach` unverändert, der Kern weist sie bis Ticket 56 mit `befehl-nicht-zustaendig` ab; `auftragnehmer?` und `epaBezeichnungen?` (geordnet nach `UPComp<n>`) am gemeinsamen `LvInhaltKopf`; `MengenansatzSetzen` setzt die Menge auch beim Entfernen des Ansatzes, `[]` gilt wie `null`; `speicher` weist die neuen Felder bis Ticket 57 mit `unbekannt` ab (Q5). Alternativen als Offene Typfragen 1–8 in Ticket 53.
Reason: Additiv, wo möglich; nicht Additives (Punkte 3, 4, 5, 9 und die Rückgabe von `auflisten`) nur mit markierter mechanischer Anpassung (W-03 (b)); kein stiller Datenverlust.
Reversible: yes  Touches: packages/vertrag, mechanische Zeilen in kern, mengen, speicher, vergabe, ui-grid (E2E), apps/web, proto
Annahme für Demo, Mensch bestätigt später (P9 durch Opus-Review ersetzt, D-22).

## D-29 Q4-Schranke der Einzeländerung im dauerhaften Profil
Welle 4 · Ticket 52 · decided by: orchestrator
Question: Ticket 52 prüft „< 100 ms Median bis zur Summenzeile“ hart nur im dauerhaften Browserprofil; im flüchtigen Playwright-Kontext (OPFS über Prozessgrenzen, 1–2 ms je Schreibzugriff) bleibt die alte grobe Schranke. Annehmen?
Decision: Ja. Das dauerhafte Profil ist der Betrieb des Nutzers (installierte PWA); dort 36–61 ms unter Last 15–22. Der flüchtige Kontext wird weiter gemessen und im Ticket genannt, die harte Schranke dort wäre ein Test der Testumgebung.
Reason: Q4 meint die Erfahrung des Nutzers; keine Prüfung geschwächt, nur der Messort festgelegt.
Reversible: yes  Touches: apps/web/e2e/leistung.spec.ts

## D-30 Umfang der Review-Behebung Welle 4
Welle 4 · Review · decided by: orchestrator
Question: Welche Befunde des Wellen-Reviews (`review-welle-4.md`) werden in dieser Welle behoben?
Decision: Behoben in `fix/welle-4-review`: Exportverlust `lvAusgeben` (über einen gemeinsamen Kopfbau, S5), S1, S2 (Zahlformate aus `NACHKOMMASTELLEN`; Exponent-Lesen nach `dezimal`, falls klein, sonst begründet), S3, S4, S6 (soweit Paketgrenzen es erlauben), S7, S8 (Glossar „Zuschlag (Vergabe)“, eindeutige Codes), S9, S10, S11, P1 (Sollwerte Bedarf/Wahl in der Fixture, Test), P5, D-62.2 (Haken am Befehlsweg statt Laufzeit-Hülle, falls ohne Paketänderung möglich). Als Folgetickets: D-57.2 (`vergabe`), D-64.2 (`vertrag`-Repository Auftrags-LV), D-64.4 (Kern-Umkehrung Auftrags-LV), P2, P6. P3/P4 erledigt der Orchestrator beim Abschluss.
Reason: Alles Behobene liegt in den Paketen der Welle und ändert keinen Vertrag; Vertragsänderungen bleiben eigene Tickets (A4, P9).
Reversible: yes  Touches: apps/web, packages/ausgabe, packages/gaeb, packages/kosten, packages/dezimal, fixtures, GLOSSARY.md

## D-31 Welle 5 setzt auf dem Ende von Welle 4 auf, nicht auf `main`
Welle 5 · Ticket – · decided by: orchestrator
Question: Der Skill verlangt `integration/welle-5` ab `main`; Welle 4 (Tor M3, Tickets 51–69) liegt aber nur auf `claude/relaxed-noether-jy8ohv` (lokal `integration/welle-4`), nicht auf `main`.
Decision: `integration/welle-5` ab `97bd414` (Ende von Welle 4). `main` wird nicht verändert; der Mensch merged Welle 4 und 5 später nacheinander (oder Welle 5 allein, die Welle 4 enthält).
Reason: Welle 5 baut auf Auftrags-LV, Preisspiegel und `vertrag` v1.3 aus Welle 4 auf; ab `main` wäre sie nicht lauffähig.
Reversible: yes  Touches: Branches

## D-32 XRechnung in einem eigenen Paket `erechnung`
Welle 5 · Ticket 76 · decided by: orchestrator
Question: `plan.md` §1 legt E-Rechnung in `abrechnung`; dort laufen in dieser Welle schon Aufmaß, Soll/Ist und Rechnungsprüfung nacheinander (ein Schreiber, P2).
Decision: Neues reines Paket `packages/erechnung` (importiert `vertrag`, `dezimal`), nur Lesen (G-15). `apps/web` darf es importieren. Es ist ein Format-Rand wie `gaeb` (N4), keine Fachrechnung.
Reason: Hält die Welle parallel; ein Lesepaket ohne Fachregel lässt sich später ohne Verlust in `abrechnung` verschieben.
Reversible: yes  Touches: packages/erechnung, tools/boundaries.mjs, plan.md §1 (Zeile ergänzt)

## D-33 M3 nur X31 (DA XML), DA11 später
Welle 5 · Strang M3 · decided by: orchestrator
Question: `plan.md` nennt „M3 X31/DA11“. DA11 ist das REB-Zeilenformat aus GAEB 90.
Decision: In Welle 5 nur GAEB DA XML X31 (3.3 und 3.2, G-10) lesen und schreiben. Die REB-Zeilen in `QTakeoff` (gleiches Spaltenformat wie DA11) liest `gaeb` in `Ansatzzeile`n; nur Formel 91 wird gerechnet, andere Formeln bleiben als Text mit Befund. Eine reine DA11-Datei (GAEB 90) folgt mit G4.
Reason: G-10 stellt GAEB 90/2000 auf „später“; die BVBS-Prüfdatei X31 liegt schon im Repo.
Reversible: yes  Touches: packages/gaeb

## D-34 G-27: Tiefe der Rechnungsprüfung (Abzugskette)
Welle 5 · Ticket 81 · decided by: advisor
Question: G-27 ist vertagt; A3 braucht eine Abzugskette.
Decision: Kumulierte Abschlagsrechnungen und Schlussrechnung. Jeder Schritt auf 2 Stellen gerundet, dann addiert/abgezogen (N2, N5, E-07): (1) Leistung = Σ round(kumulierte Aufmaßmenge × Vertrags-EP, 2); EP `null` zählt 0 mit Befund; Bedarf zählt, sobald aufgemessen; Zuschlagsposition = round(Satz × Σ geprüfte GP der Bezugspositionen, 2). (2) Nachlass: Prozent = round(Leistung × %, 2) über das ganze Auftrags-LV inkl. Nachtragspositionen; Absolut in Abschlag = min(round(abs × Leistung / Auftrags-LV netto vor Nachlass, 2), abs), Basis 0 → 0 mit Befund; Absolut in Schluss = voller Betrag. (3) Netto nach Nachlass. (4) MwSt = round(Netto n. N. × Satz, 2); Brutto kumuliert. (5) Umlagen je round(Brutto kumuliert × %, 2), alle auf derselben Basis, nicht kaskadiert (nach der MwSt: Gegenforderung des AG, mindert die Steuerbasis nicht). (6) Einbehalt: Abschlag round(Brutto kum. × Sicherheit %, 2), Schluss stattdessen Gewährleistung %. (7) Zahlbetrag = Brutto kum. − Σ Umlagen − Einbehalt − Σ frühere Zahlbeträge; negativ = Befund (Überzahlung). Frühere Zahlbeträge sind **eingefroren** (Befehl `RechnungFreigeben` speichert den geprüften Zahlbetrag); freigeben nur, wenn alle früheren freigegeben sind. Später: tatsächliche Zahlungen, Skonto, Bauabzugsteuer, Vertragsstrafe, Stundenlohnzettel.
Reason: kleinste Kette, in der eine Schlussrechnung aufgeht; jede Zahl folgt aus N2/N5. Das Einfrieren verhindert, dass eine spätere Aufmaßkorrektur bezahlte Rechnungen still umschreibt.
Reversible: yes (Parameter, Typen bleiben)  Touches: packages/vertrag, packages/abrechnung, apps/web
Annahme für Demo, Mensch bestätigt später (G-27).

## D-35 A1: Nachtrag ist ein Ausschreibungs-LV; VOB 80; Soll/Ist-Schwellen
Welle 5 · Ticket 70, 71, 80, 86 · decided by: advisor
Question: Wie bildet v1 Nachträge ab, was heißt „VOB 80“, welche Schwellen hat Soll/Ist?
Decision: Ein Nachtrag ist ein gewöhnliches Ausschreibungs-LV mit `Nachtragsangaben { auftragsLvId, nummer, status: angemeldet | angeboten | beauftragt | abgelehnt }` am Kopf (LvBefehl `NachtragsangabenSetzen`); das Nachtragsangebot ist ein gewöhnliches Angebot mit der `bieterId` des beauftragten Angebots. Reine Funktion `nachtragUebernehmen(auftragsLv, nachtragsLv, angebot, neueIds)` in `abrechnung` liefert den AuftragsLvBefehl `NachtragUebernehmen { nachtragLvId, knoten }` plus Warnungen; `kern` führt ihn aus: eine neue Gliederung „Nachtrag <nummer>“ auf oberster Ebene (Los, wenn dort Lose stehen, sonst Titel; F1) mit nächster freier OZ, darunter der Baum des Nachtrags mit unveränderten PositionIds und EP/EPA des Angebots; nicht angeboten → EP `null` mit Warnung (wie D-21); Wahl-Alternativen entfallen mit Warnung; Fehler: mehr als 5 Ebenen, anderer MwSt-Satz, PositionId schon vorhanden (sperrt auch eine zweite Übernahme); Nachlass des Nachtragsangebots wird mit Warnung ignoriert. Die App führt erst `NachtragUebernehmen`, dann Status `beauftragt` aus. **VOB 80:** die zweite Bedeutung ist vermutlich § 650c Abs. 3 BGB (80 % der angebotenen Mehrvergütung in Abschlagsrechnungen); nicht in v1, ein nicht beauftragter Nachtrag geht nie in eine Rechnung (nur Infozeile). **Soll/Ist (VOB/B § 2 Abs. 3):** Befund bei Ist > 110 % der LV-Menge; bei Ist < 90 % nur mit `abgeschlossen: true` (Schlussrechnung vorhanden); streng verglichen, beide Schwellen einstellbar; kein Befund bei Menge 0/`null` oder Pauschal.
Reason: nutzt Grid, GAEB und Angebot fast ohne Mehrkosten; 110/90 ist das einzige Paar, das aus der Regel herleitbar ist (C4); die „80“ der Recherche ist unbelegt.
Reversible: yes (PositionIds bleiben; ein eigenes Aggregat ließe sich später migrieren)  Touches: packages/vertrag, kern, abrechnung, apps/web
Annahme für Demo, Mensch bestätigt später (Widerspruch „VOB 80“ in grilling.md).

## D-36 Umfang `vertrag` v1.4
Welle 5 · Ticket 70 · decided by: advisor
Question: Was aus Welle 5 wird Vertragstyp?
Decision: (1) Aggregat `Aufmass` (ein Aufmaßblatt je Auftrags-LV; je Position eine Zeile mit Mengenansatz und Menge; Menge rechnet die App mit `mengen`, wie D-22); X31 liest in dieses Aggregat. (2) Aggregat `Rechnung` (Kopf mit Art, Eingang, geforderten Beträgen, `aufmassIds` als vollständige kumulierte Menge, `umlagen`, `sicherheitSatz`, `gewaehrleistungSatz`, `freigabe: { zahlbetrag } | null`); das Prüfergebnis wird gerechnet, nie gespeichert. (3) Aggregat `Kostenermittlung` je Projekt (Typ wandert von `kosten` nach `vertrag`). (4) `Positionsdaten.kostengruppe?` (eine KG je Position), `KostengruppeSetzen` als LvBefehl und als AuftragsLvBefehl. AuftragsLvBefehl ist genau: Anlegen, `NachtragUebernehmen`, `KostengruppeSetzen`. (5) EP-Kalkulation wird nicht gespeichert. (6) `vorlage?` (Muster-LV) und `textquelle?` (G-17); kein Typ für Textbausteine (ein Textbaustein ist ein Hinweistext oder eine Position eines Muster-LV). (7) Druckprofile nicht im Vertrag (Einstellung der App). (8) `AuftragsLvRepository` (Ticket 70) und Repositories für (1)–(3); deren ChangeSets sind ganze Aggregate `{ vorher, nachher }` ohne Summendeltas; ein Migrationsticket in `speicher` (A8). Neu: `Leistungsstand { positionen: { positionId, menge, gp }[], nachlass, nettoNachNachlass }` als Vertragstyp (`abrechnung` erzeugt, `kosten` verbraucht; A3). Kürzungsreihenfolge bei Überlauf: O3 auf zwei feste Profile → M3 nur lesen → A4 nur Kopfsummen → C4 schlicht. A1–A3, C2, C3 werden nie gekürzt (M4). Opus-Review von v1.4 gegen alle Verbraucher vor den Folgetickets (wie D-22 iv).
Reason: In den Vertrag kommt nur, was zwei Pakete teilen (A4); Einfrieren und Leistungsstand fehlten in der ersten Liste.
Reversible: yes  Touches: packages/vertrag und mechanische Zeilen in allen Verbrauchern
Annahme für Demo, Mensch bestätigt später (P9).

## D-37 C3: Kostenkontrolle ohne Verteilung des Nachlasses
Welle 5 · Ticket 82 · decided by: advisor
Question: Wie gehen Nachlass und Positionen ohne Kostengruppe in die Kostenkontrolle ein?
Decision: Zeilen: Kostengruppen (Baumsummen nach D-24), „ohne Kostengruppe“, „Nachlass“ (negativ, ohne Budget), Gesamt. Vergabe = Σ Positionssummen des Kerns (gerundete GP, nur zählende Positionen nach F4) je KG; Gesamt = Auftrags-LV netto nach Nachlass. Abrechnung = Σ `Leistungsstand.gp` je KG aus der Rechnung mit der höchsten Nummer (freigegeben oder nicht); Nachlasszeile = `Leistungsstand.nachlass`; Gesamt = deren `nettoNachNachlass`. Umlagen, Einbehalt und MwSt gehören nicht dazu. Abweichung = Vergabe − Budget je KG und gesamt. Netto durchgehend. Property-Test: Zeilensumme = Gesamt, auf den Cent.
Reason: Eine anteilige Verteilung erzeugt Rundungsreste und Zahlen, die kein Beleg zeigt; getrennte Zeilen gehen auf den Cent auf.
Reversible: yes (verteilte Ansicht später als Anzeigeoption)  Touches: packages/kosten, apps/web

## D-38 Tor M4
Welle 5 · Ticket 85, 91 · decided by: advisor
Question: `plan.md` §4 definiert M4 nicht.
Decision: Eine Playwright-E2E auf dem Weg von M3: LV `typisch` → zwei X84 → Zuschlag → Nachtrag N01 (Nachtrags-LV mit 2 Positionen, Angebot des AN, beauftragen) → Aufmaßblatt 1 (Formel 91, mit einer Nachtragsposition und einer Position > 110 %) → Soll/Ist zeigt den Befund, keinen < 90 % → Abschlagsrechnung 1 mit einer Umlage und Sicherheitseinbehalt, **Prozent**-Nachlass, Zahlbetrag = Sollwert, freigeben → Aufmaßblatt 2 + Abschlagsrechnung 2: Zahlbetrag = kumuliert − eingefrorener Zahlbetrag AR 1; Aufmaßblatt 1 danach ändern ändert AR 2, nicht den eingefrorenen Wert von AR 1 → Kostenkontrolle mit KG-Zuordnung und Kostenberechnung als Budget: Werte je KG, „ohne Kostengruppe“, Nachlass und Gesamt = Sollwerte → Neuladen behält alles. Sollwerte in einer Fixture mit Herleitung (N2, N5, VOB/B § 2 Abs. 3; C4). Dazu ein reiner Kettentest ohne Oberfläche (`vergabe` → `abrechnung` → `kosten`) mit derselben Fixture; ist die E2E wackelig, gelten Kettentest plus verkürzte E2E als Tor. A4, M3, C4, C5, O3 haben eigene Tests, nicht im M4-Weg. Absoluter Nachlass und Schlussrechnung: Golden-Tests in `abrechnung`.
Reason: Das Tor muss LPH 6–8 mit hergeleiteten Zahlen zeigen; das Einfrieren ist das Verhalten, das ein reiner Summentest übersieht.
Reversible: yes  Touches: plan.md §4, fixtures, apps/web/e2e

## D-39 C4: Rundung der EP-Kalkulation
Welle 5 · Ticket 78 · decided by: orchestrator
Question: Wo wird bei der Zuschlagskalkulation gerundet?
Decision: Einzelkosten ungerundet; Anteil je Kostenart = Einzelkosten × (1 + Satz/100) kaufmännisch auf 3 Stellen (EP 3, N3); EP = Σ der gerundeten Anteile. Nicht im M4-Weg.
Reason: So gilt „Summe der Anteile = EP“ (Kernprüfung der EPA) immer; entspricht N2 (Summen aus gerundeten Werten).
Reversible: yes  Touches: packages/kosten

## D-40 Befehle für Vorlage und Textquelle
Welle 5 · Ticket 70, 71 · decided by: orchestrator
Question: D-36 (6) nimmt `vorlage?` und `textquelle?` „nur als Typ“; ohne Befehl kann der Nutzer sie nie setzen (A5).
Decision: Zwei kleine LvBefehle `VorlageSetzen { vorlage }` und `TextquelleSetzen { positionId, textquelle | null }` in v1.4, Handler im Kern (Ticket 71). Kein Typ für Textbausteine (D-36 bleibt).
Reason: Ein Feld ohne Befehl wäre nur über Import erreichbar; die Handler sind Feldbefehle wie `KurztextAendern`.
Reversible: yes  Touches: packages/vertrag, packages/kern

## D-41 D-73.3 angenommen: Alternative ohne Nummern tritt der Gruppe ihrer Grundposition bei
Welle 5 · Ticket 73 · decided by: orchestrator
Question: Der Umsetzer von 73 lässt eine Alternative ohne Gruppe/Variante, deren Grundposition schon Variante 0 einer Gruppe ist, dieser Gruppe beitreten, statt eine neue Gruppe ohne Grundposition zu eröffnen; das geht über D-16 hinaus.
Decision: Angenommen. Die Grundposition wird beim Export als Variante 0 geschrieben (D-73.1, mit Warnung), die Alternative folgt ihr.
Reason: Betrifft nur die Vergabe künstlicher Nummern im Writer; der Bezug `grundpositionId` bleibt erhalten, Summen ändern sich nicht; umkehrbar und auf `gaeb` begrenzt.
Reversible: yes  Touches: packages/gaeb

## D-42 Tor für `vertrag` v1.4
Welle 5 · Ticket 70 · decided by: orchestrator
Question: Ist v1.4 stabil genug, damit 71 und 79–91 darauf bauen (statt Prüfung durch den Nutzer, P9, D-36)?
Decision: Ja, nach den Review-Fixes. Opus-Reviewer: „yes-with-fixes“, keine Änderung an Bestandsdaten, Projektdateien oder Protokollen; nicht-additive Stellen markiert und laut abweisend. Fixes in Ticket 70: Freigabe-Invariante (Anlegen einer Rechnung unter einer freigegebenen Nummer → `konflikt`), `LvUebersicht` additiv (D-43), `gefordert` mit Zahlbetrag (D-44), „× Satz / 100“ und Zuschlagsposition ohne Satz in den Lesarten, Glossar „Aufmaßblatt“. Leck `zuschlagErteilen` (`nachtrag`/`vorlage` landen im Kopf des Auftrags-LV): Fehler bei Nachtrags-LV, `vorlage` weglassen – als benannte Ausnahme von P2 im Ticket 70, weil `vergabe` in Welle 5 keinen Schreiber mehr hat (zwei Zeilen und Tests); Kern-Teil in 71, Oberfläche in 86. Übrige Befunde gehen als Nachträge in 71, 80, 82, 83, 86–89.
Reason: Alle Befunde eindeutig lösbar; zwei Formfragen hat der Berater entschieden (D-43, D-44).
Reversible: yes  Touches: packages/vertrag, packages/vergabe (D-42-Zeilen), Tickets 71, 79–89
Annahme für Demo, Mensch bestätigt später (P9).

## D-43 `LvUebersicht` mit Nachtragsangaben und Vorlage
Welle 5 · Ticket 70, 79, 86, 90 · decided by: advisor
Question: Die App müsste für das Kennzeichen „Nachtrag N01“, die Nachtragsliste und die Vorlagen jedes LV ganz laden (bis 5.000 Positionen).
Decision: Additiv `LvUebersicht.nachtrag?: Nachtragsangaben` und `vorlage?: true`, von `speicher` aus dem Kopf gefüllt (fehlt = nein, nie `false`/`null`); kein neuer Repository-Weg; die projektübergreifende Vorlagenliste baut die App aus `projekte.auflisten` + `leistungsverzeichnisse.auflisten`. Test in `speicher`: Übersicht = Kopf nach Setzen und nach Undo.
Reason: Nur Kopffelder nötig; additiv, wie `AuftragsLvUebersicht`.
Reversible: yes  Touches: packages/vertrag, packages/speicher, apps/web

## D-44 `Rechnung.gefordert` mit nullbaren Beträgen und Zahlbetrag
Welle 5 · Ticket 70, 81, 88 · decided by: advisor
Question: `gefordert: { netto; brutto }` verlangt beide Beträge; die XRechnung liefert BT-109, BT-112, BT-115 je wahlweise.
Decision: `gefordert: { netto: Betrag | null; brutto: Betrag | null; zahlbetrag: Betrag | null } | null` (`zahlbetrag` = BT-115); äußeres `null` ist die einzige Schreibweise für „nichts erfasst“, ein Objekt mit drei `null` weist der Ausführer ab. Nur Vergleich, nie Grundlage der Prüfung; Ticket 81 meldet keinen Befund für fehlende Forderungen; Ticket 88 zeigt „–“ ohne Differenz und vergleicht bevorzugt den Zahlbetrag.
Reason: 1:1 zu `erechnung`; der Zahlbetrag ist das Gegenstück zum eingefrorenen `freigabe.zahlbetrag` (D-34 (7)).
Reversible: yes (noch kein Verbraucher)  Touches: packages/vertrag, abrechnung, apps/web

## D-45 Aufmaßblatt bleibt ganzes Aggregat im ChangeSet
Welle 5 · Ticket 70, 87 · decided by: orchestrator
Question: Jede Zeilenänderung trägt das ganze Aufmaßblatt zweimal in die Undo-Historie (Offene Typfrage 6).
Decision: Bei D-36 (8) bleiben; Ticket 87 misst Zeit und Speicher je Undo-Schritt an einem Blatt mit 5.000 Zeilen (Q4). Nur bei überschrittenem Budget folgt in v1.5 `Aenderungen<Aufmassposition>`.
Reason: Hält v1.4 klein; ein großes Blatt ist selten, die Messung entscheidet.
Reversible: yes  Touches: apps/web (Messung)

## D-46 Nach dem Nutzungslimit: Vorrang für den M4-Weg
Welle 5 · Tickets 84, 87–90 · decided by: orchestrator
Question: Gegen 19:30 traf der Lauf das 5-Stunden-Limit; alle Agenten standen bis zur Rückstellung um 21:10. Wie weiter, damit das Tor M4 vor einem zweiten Limit erreichbar bleibt?
Decision: Unterbrochene Agenten aus ihrem gespeicherten Stand fortsetzen (nichts verloren). Zuerst der M4-Weg (71, 79, 80 → 81 → 86, 87, 88, 89 → 91); Ticket 90 (Muster-LV, Kürzungsreihenfolge D-36) erst danach; Ticket 89 auf Sonnet statt Opus (Oberfläche und Anbindung, die Rechnung liegt in `kosten`). Gemergte Branches, die den Integrationsstand schon enthalten, merged der Orchestrator selbst (der Baum ist dann der getestete); zusammengeführte Stände aus getrennten Paketen prüft eine volle Suite im Hintergrund.
Reason: Gesamtaufwand bleibt gleich; die Reihenfolge entscheidet, was bei einem zweiten Limit fertig ist.
Reversible: yes  Touches: Ablauf, Modellwahl

## D-47 Umfang der Review-Behebung Welle 5
Welle 5 · Review · decided by: orchestrator
Question: Welche Befunde des Wellen-Reviews (`review-welle-5.md`, Standards 12, Spec 7) werden in dieser Welle behoben?
Decision: Ein Fix-Ticket 92 (Opus): Pflicht P6, S1, S2, S11, P2, P3, P5, P7, S12; Soll S7, S8, S6, S5, S3, S9, S4 (ohne Kalenderlogik), S10, D-86.7. Folgetickets statt Behebung: P1 (echte KG-Spalte im Grid: `ui-grid` braucht eine editierbare Spalte), P4 (Undo am Aufmaßblatt mit 5.000 Zeilen über 100 ms: v1.5 `Aenderungen<Aufmassposition>` oder Vergleich über den gespeicherten Text in `speicher`).
Reason: Pflichtpunkte sind fachlich falsch, Glossarverstöße (L2) oder Q5; die Sollpunkte sind Aufräumen in Dateien, die jetzt nur noch ein Schreiber hat. P1 und P4 brauchen Vertrags- oder Grid-Arbeit.
Reversible: yes  Touches: apps/web, packages/abrechnung, kern, gaeb, speicher

## D-48 Maske des Nachtrags-LV ohne oberste Stufe
Welle 5 · Ticket 92 (Review P6) · decided by: orchestrator
Question: Ein Nachtrags-LV mit der vollen Maske des Auftrags-LV landet nach der Übernahme eine Stufe zu tief (`04.01.01.0010` gegen `NN.NN.NNNN`), weil die Gliederung „Nachtrag <nummer>“ eine Stufe davorsetzt (D-35, D-80.1).
Decision: Das Nachtrags-LV bekommt beim Anlegen die Maske des Auftrags-LV ohne deren oberste Gliederungsstufe; `nachtragUebernehmen` warnt, wenn die Tiefe dennoch nicht passt. Hat die Maske keine Gliederungsstufe, bleibt sie gleich, und die Übernahme ergibt einen Maskenbefund (U5). Kein Umnummerieren bei der Übernahme (OZ des Nachtrags bleiben, wie sie mit dem AN vereinbart sind).
Reason: Die OZ des Nachtrags passen dann mit dem Präfix genau in die Maske; das Nachtragsangebot (X84) referenziert die OZ des Nachtrags-LV, die erhalten bleiben.
Reversible: yes  Touches: apps/web/src/nachtrag, packages/abrechnung

## D-49 Integrationsbranch ab dem Merge von PR #10
Welle 6 · Ticket – · decided by: orchestrator
Question: Der Skill verlangt `integration/welle-6` ab `main`; der lokale Ref `main` steht auf `f04bc7e` (Welle 0/1), der Sitzungsbranch auf `79e6680` (Merge von PR #10 „Welle 4 und 5“).
Decision: `integration/welle-6` ab `79e6680`, also dem Stand von `main` nach PR #10. Der veraltete lokale Ref bleibt unberührt, keine Remote-Operation.
Reason: Welle 6 baut auf Welle 5 (Tor M4) auf; `79e6680` ist der gemergte `main`.
Reversible: yes  Touches: Branches

## D-50 X1: IFC-Leser, 3D-Ansicht und Paketschnitt
Welle 6 · Ticket 98, 100, 107, 108, 114 · decided by: advisor (Paket `bim`: orchestrator)
Question: Welche Bibliotheken für IFC und 3D (C5), und wie wird X1 auf Pakete geschnitten?
Decision: Eigener reiner TS-Leser für IFC-SPF (IFC 2x3 und 4) in `packages/ifc` (nur Inhalt: Struktur, Bauteile, Eigenschaften, Mengen, Einheiten; importiert nur `vertrag`, `dezimal`). Geometrie nur in `packages/ui-modell` (neu) mit web-ifc 0.0.78 (MPL-2.0, WASM, Single-Thread im Worker, gebündelt, kein CDN) und three.js 0.186.1 (MIT), genau gepinnt; `ui-modell` hält nur die Leinwand und importiert `vertrag`, `ui-basis`. Der Modellbaum bleibt in der App auf `ui-grid` (U2). Beide Leser gleichen über die GlobalId ab; Bauteile ohne Geometrie sind ein Befund. Die Fachlogik (Mengenübernahme, Aufmaß aus Auswahl, Kennwerte, Vergleichsfolgen) liegt in einem eigenen reinen Paket `packages/bim` (`vertrag`, `dezimal`), damit `ifc` und `bim` in Stufe 2 parallel laufen (Teil des Orchestrators).
Reason: Deterministische, in Node testbare Datenlese (A2, Q1); WASM nur am UI-Rand; @thatopen bringt einen schweren Abhängigkeitsbaum, xeokit nähme Baum und Picken aus der Hand (U1, U2).
Reversible: yes  Touches: packages/ifc, packages/ui-modell, packages/bim, tools/boundaries.mjs, plan.md §1

## D-51 X1: Ablage der IFC-Datei
Welle 6 · Ticket 97, 106 · decided by: advisor
Question: Wo liegen die Bytes einer IFC-Datei und die gelesenen Modelldaten (Q5, A8, G-56, ADR 0002)?
Decision: Die Bytes liegen inhaltsadressiert in einer eigenen Tabelle (SHA-256 der unkomprimierten Bytes → BLOB), außerhalb von Aggregat, ChangeSet und Undo-Historie; in der JSON-Projektdatei (Schema 6) als deflate + Base64, damit eine Sicherung eine Datei bleibt. Das unveränderliche Aggregat `Bauwerksmodell` trägt nur Hash, Größe, Dateiname und die gelesenen Daten (Struktur, Bauteile mit Mengen); Eigenschaften liest die App bei Bedarf aus den Bytes, sie werden nicht gespeichert. Eine Datei über etwa 200 MB ist ein Befund, keine Sperre; nähert sich der Export der Grenze für Zeichenketten (etwa 512 MB Text), schlägt er laut fehl und kürzt nie. Tests der kanonischen Datei vergleichen den SHA-256 der unkomprimierten Bytes (deflate ist nicht byte-stabil zwischen Implementierungen). Ein Modell löschen braucht eine Bestätigung (Q5); seine Bytes bleiben, bis kein Modell sie mehr nennt.
Reason: ZIP überginge G-56 und ADR 0002; eine getrennte .ifc neben der JSON-Datei ist Datenverlust, den der Nutzer zu spät bemerkt (Q5).
Reversible: yes  Touches: packages/vertrag, packages/speicher, apps/web

## D-52 X1c: Zuordnung Bauteil ↔ Position am Positionsfeld
Welle 6 · Ticket 97, 105, 108, 115 · decided by: advisor
Question: Wo steht die Verknüpfung Bauteil ↔ LV-Position und Kostengruppe?
Decision: `Positionsdaten.bauteile?: readonly { globalId; mengenart }[]`, gesetzt mit `BauteileZuordnen { positionId; bauteile | null }` (ganze Liste, wie `MengenansatzSetzen`) als LvBefehl und als AuftragsLvBefehl (Vorbild `KostengruppeSetzen`, D-36 (4)); mit dem Zuschlag über die gemeinsame Positions-ID im Auftrags-LV. Der Kern prüft keine GlobalIds (A3); hängende Zuordnungen meldet die App als Befund. Ein Bauteil darf mehreren Positionen zugeordnet sein; dasselbe Paar (GlobalId, Mengenart) zweimal an einer Position wird abgewiesen. Kopieren einer Position verwirft ihre Zuordnungen, Verschieben behält sie. `mengenart` ist der Name der Menge, wie er im Modell steht, dazu fest `Stueck`. Die Kostengruppe eines Bauteils ist die seiner Position. Kosten aus dem Modell ohne neuen Typ: Betrag = round(Bezugsgröße × Kennwert, 2) je KG, geschrieben mit `KostenermittlungAnlegen`, Herleitung in `bemerkung`; Bezugsgrößen aus den Mengensätzen des Modells oder vom Nutzer, Quelle sichtbar; keine lizenzierten Kennwerte im Repo (C1).
Reason: Kein neues Aggregat; das ChangeSet bleibt je Knoten (A6) und fährt mit LV-Stand, Kopie und Zuschlag mit.
Reversible: yes  Touches: packages/vertrag, packages/kern, packages/bim, apps/web

## D-53 X1d/X1f: Modellstände und Mengenübernahme
Welle 6 · Ticket 97, 107, 108, 115, 116 · decided by: advisor
Question: Wie werden Modellstände verglichen und Mengen ins LV übernommen?
Decision: Jeder Import ist ein neues, unveränderliches `Bauwerksmodell` mit `vorgaengerId`; Vergleich über die GlobalId (hinzugefügt, entfernt, geändert: Klasse, Name, Strukturknoten, Mengen). Vordersatz aus dem Modell: je zugeordnetem Bauteil, das im gewählten Modell steht, eine Ansatzzeile (Formel 91, Wert kaufmännisch auf 3 Stellen) in der Reihenfolge von `bauteile`, geschrieben mit `MengenansatzSetzen` (nachvollziehbar, ein Undo-Schritt); die Menge rechnet die App mit `mengen` (D-22). `MengenansatzSetzen` ist kein AuftragsLvBefehl: nach dem Zuschlag führt der Weg nur über das Aufmaßblatt („Aufmaßblatt aus Auswahl“: je zugeordneter Position die Summe der ausgewählten Bauteile, `AufmassAnlegen`); das wird nicht nebenbei erweitert. Einheiten werden exakt in Dezimal umgerechnet. Fehlende Menge oder eine Einheit, die nicht zur Position passt: Befund, nie 0. Doppelte GlobalIds und geringe Überdeckung zweier Stände: Befund. Offene Typfragen: `Ansatzzeile` hat kein Feld für die GlobalId (Zeilen folgen der Reihenfolge von `bauteile`); dasselbe Bauteil auf zwei Aufmaßblättern ist deshalb nicht erkennbar.
Reason: Ein Ansatz ist nachvollziehbar und ein Undo-Schritt und passt zur Teilung von D-22.
Reversible: yes  Touches: packages/vertrag, packages/ifc, packages/bim, apps/web

## D-54 X1: Leistungsbudgets
Welle 6 · Ticket 99, 100, 105, 106, 107, 108 · decided by: advisor
Question: Welche Budgets (Q4) gelten für große Modelle?
Decision: Synthetisches IFC-4-Modell mit 10.000 Bauteilen (etwa 25 MB) aus einem deterministischen Erzeuger in `fixtures/ifc/` (keine Datei im Repo): Lesen und Abbilden ≤ 5 s CPU in Node; Vergleich zweier 10k-Modelle ≤ 500 ms; Speichern eines Modells (ein Massenbefehl) ≤ 3 s; Projektdatei-Export und -Import mit einem 25-MB-Modell je ≤ 10 s; eine einzelne LV-Änderung in einem Projekt mit 10k-Modell bleibt in den bestehenden Budgets; `BauteileZuordnen` an einer Position mit 5.000 Zuordnungen samt Undo ≤ 100 ms; Baum mit 10k Zeilen über die bestehenden Grid-Budgets; 3D in Headless-Chromium: Laden ≤ 20 s, Picken bis Hervorhebung ≤ 200 ms, je Median mehrerer Läufe, CPU-Raycast, keine Bildraten-Schranke.
Reason: Die Kosten aus Welle 5 kamen vom Neuschreiben großer Aggregate (D-45); die Liste prüft auch, dass ein Modell im Projekt andere Befehle nicht bremst.
Reversible: yes  Touches: Tests in ifc, ui-modell, kern, speicher, bim, apps/web

## D-55 X5 in Welle 6: nur ADR 0013 und G-57
Welle 6 · Ticket 103 · decided by: advisor
Question: Was von X5 (Bieterportal/Sync-Server) läuft in Welle 6, wo ADR 0001, G-01 und G-14 entschieden sind?
Decision: Nur ADR 0013 mit Status `proposed` (optionaler, selbst betriebener Sync-Server nach v1; die PWA bleibt lokal voll nutzbar), darin die heutigen Hindernisse ausdrücklich als Hindernisse (Protokoll wegen E-13 nicht nachspielbar, ganze Aggregate in ChangeSets, ein Tab je Datenbank nach E-14); G-14 bleibt bindend, also kein Bieterportal; die neue Grilling-Frage G-57 fragt nur „Sync-Server nach v1, ja oder nein, in welcher Form“. Kein Produktcode.
Reason: Ein Server überginge ADR 0001 und G-01; ein Datei-Abgleich wäre Mehrbenutzer durch die Hintertür und bräuchte Zusammenführungsregeln, die E-13 und ganze Aggregate noch nicht tragen.
Reversible: yes  Touches: docs/adr/0013, grilling.md, plan.md §2

## D-56 X3: HOAI-Tafeln im Repo und Rundungskette
Welle 6 · Ticket 101, 110, 112, 119 · decided by: advisor
Question: Woher kommen Honorartafeln und Rechenregeln (C1, C4), und wie wird gerundet?
Decision: Die Honorartafeln der HOAI 2021 (amtliches Werk, § 5 Abs. 1 UrhG) stehen als Daten im Repo: zuerst § 35 (Gebäude und Innenräume), § 52 (Tragwerksplanung), § 56 (Technische Ausrüstung), § 40/44/48 nur bei Zeit; nur Tafelwerte sowie Namen und Sätze der Leistungsphasen mit § und Absatz, keine Grundleistungstexte. Datentest: Zeilen streng steigend, „bis“ der Zone n = „von“ der Zone n+1, erste und letzte Zeile gegen die Quelle. § 13 lineare Interpolation (erst multiplizieren, dann teilen). **Projektkonvention, weil die HOAI keine Rundung regelt:** von und bis je auf 2 Stellen; Honorar = round(von + (bis − von) × Honorarsatz/100, 2); je Phase round(Honorar × Anteil/100, 2); Umbauzuschlag round(Σ Phasen × %, 2); Nebenkosten round((Σ + Zuschlag) × %, 2) oder Betrag; USt round(Netto × Satz, 2) auf Honorar plus Nebenkosten (§ 16 Abs. 1). Honorarsatz in Prozent der Spanne, Standard 0 = Basishonorarsatz (§ 7 Abs. 1); „Mittelsatz“ ist keine HOAI-Bezeichnung. Anrechenbare Kosten für Gebäude und Innenräume nach § 33 (KG 300 voll; KG 400, wenn der Auftragnehmer sie nicht plant oder überwacht: voll bis 25 % der sonstigen anrechenbaren Kosten, darüber zur Hälfte; „sonstige“ = KG 300 plus ein Betrag nach Abs. 3 von Hand; mitzuverarbeitende Bausubstanz nach § 4 Abs. 3 von Hand). Grundlage nach § 6 Abs. 1 Nr. 2 ist die Kostenberechnung, ohne sie die Kostenschätzung, jede andere Stufe ein Befund; Hinweis, dass § 4 Abs. 1 auf DIN 276 in der Fassung 2008-12 verweist. Außerhalb der Tafel ein Befund (keine Extrapolation, RifT später). Umbauzuschlag über 33 % (Gebäude) bzw. 50 % (Innenräume): Hinweis. Nebenkosten als Prozent oder Betrag (§ 14).
Reason: Tafeln vom Nutzer machten Sollwerte und Tor X3 von Nutzerdaten abhängig; die Tafel ist öffentliches Recht und klein.
Reversible: yes  Touches: packages/honorar, packages/vertrag, fixtures, apps/web

## D-57 X2/X4: Formen im Vertrag
Welle 6 · Ticket 97, 102, 106, 109, 111 · decided by: advisor
Question: Welche Aggregate tragen Bauzeitenplan, Mängel und Bautagebuch?
Decision: X2: ein Aggregat `Bauzeitenplan` je Plan (mehrere je Projekt); gespeichert werden nur die Eingaben (Vorgänge mit Dauer in Arbeitstagen, 0 = Meilenstein; Anordnungsbeziehungen Ende-Anfang, Anfang-Anfang, Ende-Ende, Anfang-Ende mit Abstand in Arbeitstagen; Sammelvorgang über `elternId`; Terminvorgabe „frühestens“; Bezug auf LV-Knoten; Ist-Termine und Fortschritt von Hand; Arbeitskalender mit Wochentagen, Bundesland und freien Tagen); Termine, Puffer und kritischer Weg werden gerechnet, nie gespeichert; Feiertage rein aus Regeln (Osterformel, Land), regionale über freie Tage. ChangeSet als ganzes Aggregat nur mit Messung bei 1.000 Vorgängen je Undo-Schritt (D-45); über dem Budget `Aenderungen<Vorgang>`. X4: Einzelaggregate `Mangel` (je Projekt nummeriert; Ort, wahlweise Auftrags-LV, Position, GlobalId; festgestellt, Frist; der Verlauf ist die Quelle, der Status sein letzter Eintrag; offen → angezeigt → beseitigt → abgenommen, beseitigt → offen erlaubt) und `Bautagebucheintrag` (einer je Projekt und Datum); kleine ChangeSets; keine Fotos in Welle 6; überfällig ist ein Befund zu einem Stichtag, den die App übergibt (A2). Der Ausführer prüft eindeutige Nummer bzw. eindeutiges Datum gegen den Bestand. Eine nummerierte Migration samt Schemaversion (A8).
Reason: Einzelaggregate vermeiden die Undo-Kosten aus D-45 bei Listen ohne Obergrenze; ein Plan ist eine Recheneinheit und bleibt ein Aggregat.
Reversible: yes  Touches: packages/vertrag, packages/bauzeit, packages/bauleitung, packages/speicher

## D-58 Tore der Welle 6 je Modul
Welle 6 · Tickets 99, 112, 117–120 · decided by: advisor
Question: `plan.md` §3 nennt für Welle 6 als Tor „je Modul“, §4 definiert aber keines.
Decision: Je Modul eine E2E und ein reiner Kettentest auf derselben Fixture; ist die E2E wackelig, gelten Kettentest plus verkürzte E2E (wie D-38). X1 geteilt in **X1-Kern** und **X1-Erweitert**; Einzelheiten aller Tore in `plan.md` §4. Sollwerte in `fixtures/` mit Herleitung (C4). X5: Stimmigkeit von ADR 0013, G-57 und `plan.md`.
Reason: Die Tore zeigen hergeleitete Zahlen auf den Wegen, die ein Summentest übersieht; die Teilung von X1 verhindert, dass ein wackeliger Schritt das ganze Tor blockiert.
Reversible: yes  Touches: plan.md §4, fixtures, apps/web/e2e

## D-59 Schnitt der Welle 6: zwei serielle Vertragstickets in der Reihenfolge von G-05
Welle 6 · Ticket 95, 97 · decided by: orchestrator
Question: Wie kommen die Kleinpunkte (95) und die Typen für X1–X4 in den Vertrag (A4, P9), und in welcher Reihenfolge?
Decision: Zwei serielle Vertragstickets: zuerst 95 (`vertrag` v1.5: Kleinpunkte samt `LvSpalte` `'kostengruppe'` für 93; klein, schneller Merge), danach 97 (`vertrag` v1.6: X1–X4 in einem Ticket). Beide prüft ein Opus-Reviewer statt des Nutzers (D-42-Muster), 97 vor Stufe 2. Reihenfolge nach G-05 („zuerst 93–95, danach X1–X5“) und nach Bedingung 1 des Beraters (X1-Typen in eigenem Ticket nach 95). X2–X4 gehen mit X1 in Ticket 97 statt in ein drittes Vertragsticket, weil jedes weitere serielle Vertragsticket die Stufe 2 aller X-Stränge verzögert (Präzedenz D-36). Rechenkerne ohne Vertrag (IFC-Leser, 3D-Leinwand, HOAI, Terminrechnung, Fixtures) laufen sofort in Stufe 1 mit eigenen Typen und stellen in Stufe 2 auf die Vertragstypen um.
Reason: G-05 legt die Reihenfolge fest; Parallelität bleibt dort, wo der Vertrag nicht gebraucht wird.
Reversible: yes  Touches: Tickets 93–122, schnitt-welle-6.md

## D-60 Triviale Merges macht der Orchestrator
Welle 6 · alle Tickets · decided by: orchestrator
Question: Der Skill sieht für jeden Merge einen Sonnet-Merger mit voller Suite vor. Enthält ein Branch schon den aktuellen Stand von `integration/welle-6` und hat der Umsetzer darauf die volle Suite grün gemeldet, ist der Baum nach dem Merge genau der getestete.
Decision: Dann merged der Orchestrator selbst (`--no-ff`, Vermerk im Merge-Commit) ohne zweite Suite (wie D-46). Ist der Integrationsstand seit dem letzten Merge des Umsetzers weitergezogen, merged ein Sonnet-Merger und lässt die volle Suite laufen; ist sie rot, nimmt er den Merge zurück, und ein Opus-Umsetzer behebt den Fehler.
Reason: Spart eine volle Suite je Ticket auf 4 Kernen mit bis zu 8 Agenten, ohne je einen ungetesteten Baum zu mergen.
Reversible: yes  Touches: Ablauf

## D-61 Nach dem ersten Nutzungslimit: alle Agenten aus ihrem Stand fortsetzen
Welle 6 · Tickets 95, 96, 98–103 · decided by: orchestrator
Question: Kurz vor 13:10 traf der Lauf das 5-Stunden-Limit; alle acht laufenden Agenten (95, 96, 98, 99, 100, 101, 102, 103) standen, nur 94 war fertig und gemergt. Wie weiter?
Decision: Um 13:10 alle acht aus ihrem gespeicherten Stand fortgesetzt (nichts verloren, unkommittierte Arbeit lag im Worktree), mit der Bitte, ab jetzt klein und oft zu committen; 95 zuerst, weil 97 und damit die ganze Stufe 2 an ihm hängt. Trifft der Lauf das Limit erneut, gilt dasselbe, mit Vorrang für den Weg 95 → 97 → Stufe 2 und X1-Kern (Kürzungsreihenfolge in `schnitt-welle-6.md`).
Reason: Gesamtaufwand bleibt gleich; die Reihenfolge entscheidet, was bei einem weiteren Limit fertig ist (wie D-46).
Reversible: yes  Touches: Ablauf

## D-62 Projektseite zeigt das Netto nach Nachlass
Welle 6 · Ticket 95, 106, 121 · decided by: orchestrator
Question: Ticket 95 nennt das neue Feld `LvUebersicht.nettoNachNachlass` statt `netto` (D-95.5: `Gesamtsummen.netto` ist das Netto vor Nachlass, L2). Die Projektseite zeigt bisher unter „Netto“ das Netto vor Nachlass; mit dem neuen Feld änderte sich die Zahl bei LVs mit Nachlass.
Decision: Name `nettoNachNachlass` angenommen; die Spalte der Projektseite zeigt dieses Feld und heißt „Netto nach Nachlass“ (Ticket 121). Kein zweites Feld `netto` im Vertrag.
Reason: Das Netto nach Nachlass ist die Zahl, die für ein LV in der Übersicht zählt; ein zweites Feld wäre eine weitere Vertragsänderung ohne Nutzen. Umbenennen der Spalte macht die geänderte Zahl ehrlich.
Reversible: yes  Touches: apps/web/src/projekt, Tickets 106, 121

## D-63 Meilenstein am Beginn seines Tages
Welle 6 · Ticket 102, 109, 112, 118 · decided by: orchestrator
Question: Ticket 102 (D-102.2) legt einen Meilenstein an den Beginn seines Tages; ein Fertigstellungs-Meilenstein nach einem Vorgang, der am Freitag endet, steht deshalb am Montag. Annehmen?
Decision: Ja für v1, einheitlich mit „Ende-Anfang mit Abstand 0 = nächster Arbeitstag“; die Lesart steht in `BAUZEIT_ANNAHMEN` und wird in der Oberfläche (Ticket 118) als Tooltip erklärt. Eine eigene Art „Ende-Meilenstein“ (am Ende des Vortags) ist ein späteres Ticket, falls das Büro es so erwartet.
Reason: Eine Regel ohne Sonderfall; Fixtures (112) und Tor X2 hängen an genau einer Lesart; umkehrbar ohne Datenänderung (gespeichert werden nur Eingaben).
Reversible: yes  Touches: packages/bauzeit, fixtures, apps/web/src/bauzeit

## D-64 Tor für `vertrag` v1.6: Merge sofort, Review parallel zu Stufe 2
Welle 6 · Ticket 97 (Folge: 105–113) · decided by: orchestrator
Question: v1.6 ist fertig und grün. Review vor Stufe 2 (D-42-Muster, etwa eine Stunde Leerlauf für acht Stränge) oder parallel? Dazu die Abweichungen von 97 vom Tickettext und die offene Typfrage 7 (D-97.6).
Decision: Merge sofort (`e27225a`); ein Opus-Reviewer prüft v1.5 und v1.6 gegen alle Verbraucher, während die Stufe 2 läuft; Pflichtbefunde behebt der Umsetzer von 97 in einem Nachtrag, betroffene Stufe-2-Umsetzer bekommen eine Nachricht. Angenommen: Ergebnis X2 heißt `Bauzeitenplanergebnis` (nicht „Terminplan“, L2), je Vorgang `vorgangId`; unbekannter Vorgänger ist ein Fehler des Ausführers, „Vorgang entfernen“ nimmt Teilbaum und Beziehungen auf ihn mit; von der HOAI nicht vorgesehene Werte sind Befunde, keine Fehler (U5); alle Ergebnisse tragen `Pruefbefund` mit den Quellen `ifc-lesen`, `modell-pruefung`, `terminrechnung`, `honorarberechnung`, `fristpruefung`; Modellbefehle mit dem Feld `bauwerksmodell`, ohne `id` bei Umbenennen und Löschen; neue Fehlercodes `statuswechsel-unzulaessig`, `datei-zu-gross`. **D-97.6 bestätigt:** Ein Modell lässt sich nicht löschen, solange ein späterer Stand es als Vorgänger nennt oder ein Mangel darauf zeigt (`konflikt`, Q5). Die Eingabeform von `fixtures/honorar.json` (Beträge nach DIN 276) bildet 110/119 auf die gespeicherte Form (Verweis auf eine Kostenermittlung) ab.
Reason: Die Befunde früherer Vertragsreviews waren eng und additiv (D-12, D-42); acht Stränge eine Stunde warten zu lassen, kostet mehr als ein Nachtrag. Die Abweichungen folgen Regeln (L2, U5, Q5) und sind umkehrbar.
Reversible: yes  Touches: packages/vertrag, Tickets 105–121

## D-65 Zweites Nutzungslimit (etwa 14:50–18:10)
Welle 6 · Tickets 105–111, Review v1.6 · decided by: orchestrator
Question: Kurz nach dem Start der Stufe 2 traf der Lauf erneut das 5-Stunden-Limit; der Reviewer von v1.6 und die Umsetzer 105–111 standen bis 18:10.
Decision: Um 18:13 alle acht aus ihrem gespeicherten Stand fortgesetzt (wie D-61). Trifft der Lauf das Limit ein drittes Mal, gilt die Kürzungsreihenfolge aus `schnitt-welle-6.md`; der Weg X1-Kern (105, 106, 107, 108 Mengenübernahme, 114, 115, 117) hat Vorrang vor X2–X4-Oberflächen, und der Bericht nennt, was offen bleibt.
Reason: Gesamtaufwand bleibt gleich; die Reihenfolge entscheidet, was bei einem weiteren Limit fertig ist.
Reversible: yes  Touches: Ablauf

## D-66 Review von `vertrag` v1.5/v1.6: „ja mit Korrekturen“
Welle 6 · Ticket 97 (Folge: 105–121) · decided by: orchestrator
Question: Der Opus-Reviewer (statt des Nutzers, P9) urteilt „yes-with-fixes“: 2 MUST, 11 SHOULD, keine Typänderung nötig. Was wird wo behoben?
Decision: Nachtrag zu Ticket 97 (derselbe Umsetzer, nur Lesarten, additive Felder, Glossar): MUST 1 – der Hinweis „HOAI § 4 Abs. 1 verweist auf DIN 276:2008-12“ ist nie ein Befund und nicht Teil des `Honorarergebnis`, App und PDF drucken ihn als festen Text; MUST 2 – „Kopieren verwirft Zuordnungen“ gilt für Kopieren/Einfügen im LV und die Übernahme aus einem Muster-LV, „LV-Stand als neues LV“ behält sie (Kern 105 bekommt eine Option, App 121 eine Zeile); dazu die SHOULD 3, 5–10 (Lesart Anlegen ohne Inhalt, erster Treffer bei doppelten GlobalIds, `IFC_GLOBALID_MUSTER`, Pfad für Beziehungsbefunde, eigener Glossarname der Honorar-Eingabe, Befund „Bauteil ohne Geometrie“, `Mangelverlaufseintrag.frist?`). SHOULD 4 (Ringe in Struktur und Teilen mit Befund aufbrechen) geht an 107; SHOULD 11 (Laden eines 10k-Modells) messen 106/114; SHOULD 12 (GAEB-Export verwirft `bauteile` ohne F6-Warnung) geht in die Review-Behebung der Welle; SHOULD 13 (alte Namen in Tickettexten) erledigt durch Hinweise in 107, 109–111, 113, 118–121.
Reason: Alle Befunde sind eng und additiv; die Stufe-2-Umsetzer bekommen die zwei MUST sofort als Nachricht.
Reversible: yes  Touches: packages/vertrag, GLOSSARY.md, Tickets 105–121

## D-67 Drittes Nutzungslimit (bis 23:10)
Welle 6 · Tickets 115, 116 · decided by: orchestrator
Question: Nach dem Merge von 114, 118–121 traf der Lauf das 5-Stunden-Limit ein drittes Mal; 115 (Zuordnung) und 116 (Modellvergleich) standen.
Decision: Beide aus ihrem gespeicherten Stand fortgesetzt (wie D-61/D-65). Nichts gekürzt: X2–X5 sind schon erreicht, offen ist nur der Weg X1 (115, 116, 117).
Reason: Der restliche Umfang passt ohne Kürzung; die Kürzungsreihenfolge greift erst, wenn X1-Kern gefährdet ist.
Reversible: yes  Touches: Ablauf

## D-68 Wellen-Review parallel zum Tor X1
Welle 6 · Tickets 117, 122 · decided by: orchestrator
Question: Das Wellen-Review (Schritt 6) läuft auf dem Integrationszweig nach allen Merges; 117 fügt nur Tests hinzu. Warten oder parallel?
Decision: Review jetzt auf `integration/welle-6` @ `6ab5796` (aller Produktcode der Welle, Fixpunkt `79e6680`), parallel zu 117. Die drei Testdateien aus 117 prüft der Orchestrator beim Merge; meldet 117 einen Produktfehler, geht er in das Fix-Ticket 122.
Reason: Spart eine volle Review-Runde Wartezeit; der Review-Gegenstand ändert sich durch reine Tests nicht.
Reversible: yes  Touches: Ablauf

## D-69 Umfang der Review-Behebung Welle 6
Welle 6 · Review · decided by: orchestrator
Question: Welche Befunde des Wellen-Reviews (`review-welle-6.md`: Standards 8 hart + rund 45 Ermessen, Spec 24) werden in dieser Welle behoben, welche bestätigt, welche werden Folgetickets?
Decision: Ein Fix-Ticket 122 (Opus). **Pflicht:** alle harten Standards-Befunde (SA1 N4 im `bim`-Vermerk → Formatierung an den Rand; SA2 und SB1/PB5 Glossar und doppelte Typnamen in `ifc`; SB2 Skala `prozent`; SB3/PB1 PDFs drucken de-DE-Texte statt Rohmeldungen, gleich wie am Bildschirm; SB4 `IFC_GLOBALID_MUSTER`; SC1/PC-c1 U3 Mehrfachauswahl per Tastatur; SC2 A2 Köpfe je Tag aus `bautagebuchAuswerten`), dazu PA1/PA2/PC-a4 (Budgets D-54 messen, rot wird gemeldet, nie gelockert), PB4, PB6, PB9, PC-a1, PC-a6, PC-c2, PC-c3, SA12 (Entpackgrenze beim Einlesen) und der offene Punkt aus D-66 (SOLL 12: GAEB-Export meldet verworfene `bauteile` als F6-Warnung). **Soll:** PC-a2 (Bezug auf LV-Knoten im Vorgangsdialog), PC-a5, PB8 prüfen, die billigen Ermessenspunkte (Liste im Ticket). **Bestätigt, keine Änderung:** D-107.6 (PA6: Verweis auf ein späteres Duplikat entfällt mit Befund; das ist die Lesart des Vertrags „erster Treffer“, ohne etwas zu erfinden, Q5 durch den Befund), D-100.3 (PA4: lesende Prüfmethoden am Ref; die App gibt sie nur in Testbuilds frei, und so wird die ausgelieferte Komponente geprüft), PA5 (`jeNrf`, leerer Dateiname abgewiesen), D-111.8 (PB2: Zeile je Auftrags-LV; die unabhängig geschriebene Fixture hat dieselbe Form), D-113.1 (PB3: `Berichtsmodell` neben dem `Ausgabemodell`; ADR 0012 regelt den LV-Druck, ihre Naht-Regel – der Renderer liest nur ein druckfertiges Modell – gilt auch hier; der Mensch bestätigt mit W-04), D-114.7 (PC-a3: Geometriebefunde erst nach dem Zeichnen, daher auf der Modellseite), D-121.2 (Entfernen zurückgehaltener Druckprofile nur nach Rückfrage und mit Sicherungsdatei, Q5), Rückgängig einer Zuordnung führt auf die LV-Seite (die Daten liegen im LV, wie D-116.3). PA3 und PB7 (Haken und Antworten in Tickets) erledigt der Orchestrator. **Folgetickets:** 123 (Aufräumen: Konstanten für KG-Form, Hash, Mengen-/Struktur-/Schemaarten in `vertrag`, weil `bim`/`ifc` den Kern nicht importieren dürfen; Repeated Switches über `ChangeSet['art']` in `speicher`; Positionskopplung in `schreiben.ts`; Seitengerüst, Pfade, Schreibweg, `Feldfehler` und Schriftlader der neuen App-Ordner, Honorar-PDF im Worker; gemeinsamer `Datum`-Typ; KG-Ausnahme in `ui-grid`; restliche Namen) und 124 (Fachliches: D-118.3 Vorgang verschieben, D-118.7 Fortschritt aus dem Leistungsstand, D-93.7 Hinweis an der Zelle, Neumessung Preisspiegel-Budget auf ruhiger Maschine).
Reason: Wie D-47: Pflicht ist, was eine Regel, ein ADR, den Vertrag oder das Ticket verletzt oder Zahlen falsch zeigt; die Bestätigungen haben tragfähige Gründe in ihren Tickets und widersprechen keiner Regel. Was `vertrag` braucht (A4/P9) oder viele Dateien umbaut, wird ein eigenes Ticket statt eines Nebenbei-Umbaus kurz vor Wellenende.
Reversible: yes  Touches: packages/bim, ifc, ui-modell, speicher, kern, bauzeit, honorar, bauleitung, ausgabe, gaeb, ui-grid, fixtures, apps/web, GLOSSARY.md

## D-70 Tor X1: LV `typisch` per X86 statt X83
Welle 6 · Ticket 117 · decided by: orchestrator
Question: Ticket 117 verlangte „LV `typisch` per X83 wie M3/M4“; der Umsetzer liest X86 (D-117.1). Bestätigen?
Decision: Ja. Der Tickettext war falsch: Eine X83 trägt keine Einheitspreise und keinen Nachlass, das LV-Netto wäre 0,00 und „Vordersatz und LV-Netto = Soll“ (`plan.md` §4, D-58) unerfüllbar. X86 ergibt genau die Summen von `typisch.json`; `plan.md` §4 nennt für X1 kein Format und bleibt. Auch D-117.3 (Zuschlag an A ohne Wahl, sonst fiele 02.0070 aus dem Aufmaßblatt) und D-117.5 (Fenster 1440 × 2000 wie M4) bestätigt.
Reason: Die Tor-Definition (Zahlen gleich den Sollwerten) geht vor dem Weg im Tickettext; M3/M4 prüfen die Vergabe, X1 die Mengen am bepreisten LV.
Reversible: yes  Touches: apps/web/e2e/x1-*.spec.ts

## D-71 Ticket 125 ohne Lieferung: eigene Testdateien
Welle 7 · Tickets 125, 144, 145 · decided by: advisor
Question: Ticket 125 (echte Testdateien) ist `ready-for-human` geblieben, der Sitzung hängt nichts an. Was tun mit E6 (GAEB 90/2000)?
Decision: E6 wird gebaut, GAEB 90 fest, GAEB 2000 nur, wenn eine frei zugängliche Formatbeschreibung erreichbar ist (gaeb.de, BVBS, Herstellerhilfen; nur gelesen, eigener Code, keine Normtexte oder fremden Parser, C1); sonst sofort gekürzt (steht ohnehin vor GAEB 90 in §4) und nur die klare Abweisung aus E7. Testdateien von Hand nach Formatbeschreibung, Herkunftsvermerk „nicht aus AVA-Software“, REUSE. Unbekannte Satzarten/Schlüsselwörter sind Befunde; der Zeichensatz von GAEB 90 wird am Inhalt erkannt und als Befund gemeldet. Jeder Import in diesen Formaten zeigt einen festen Hinweis „nicht an Dateien aus anderer Software geprüft, Summen vergleichen“. 125 bleibt `ready-for-human` mit Kommentar; der Bericht nennt beide Formate als ungeprüft.
Reason: G-61 verlangt beide Formate; ohne echte Dateien prüft der Test nur das eigene Verständnis, daher Hinweis statt Abbruch.
Reversible: yes  Touches: packages/gaeb, fixtures/gaeb-formate, apps/web/src/gaeb

## D-72 A5: Lage von Vertragsstrafe, Skonto und Bauabzugsteuer in der Abzugskette
Welle 7 · Tickets 128, 143, 152, 153 · decided by: advisor
Question: Wo sitzen Skonto, Bauabzugsteuer (§ 48 EStG) und Vertragsstrafe in der Kette D-34, auf welcher Basis, wann ist Skonto verwirklicht?
Decision: Leistung → Nachlass → MwSt → Brutto kum. → Umlagen → **Vertragsstrafe** (fester Bruttobetrag mit Grund, ohne MwSt-Wirkung, kumuliert geführt, Vorschlag aus der Vorrechnung wie der Einbehalt) → Einbehalt (Basis bleibt Brutto kum.) → frühere eingefrorene Zahlbeträge → **Zahlbetrag** (eingefroren, unverändert D-34) → **Skonto** (möglich = round(Zahlbetrag × Satz, 2), 0 bei Zahlbetrag ≤ 0; Satz und Frist in Kalendertagen an der Rechnung; Frist ab `eingang`, Eingangstag zählt nicht, keine Wochenendverschiebung; ohne `eingang` kein Skonto, Befund) → **Bauabzugsteuer** (Schalter an der Rechnung, Standard aus; Satz 15 als Konstante; round((Zahlbetrag − verwirklichtes Skonto) × 15 %, 2), Ausweis „an das Finanzamt“, mindert nur die Auszahlung) → Auszahlung an AN → Zahlungen → offen. Skonto ist verwirklicht, wenn Σ Zahlungen bis Fristende ≥ Auszahlung im Skontofall; beide Szenarien werden gerechnet und angezeigt („bei Zahlung bis …: …, danach: …“). Offen = Zahlbetrag − verwirklichtes Skonto − Bauabzugsteuer − Σ Zahlungen. Zahlungen nur auf freigegebene Rechnungen; Freigabe aufheben gesperrt, solange Zahlungen bestehen (Q5). Neue Felder per Migration `null`, alte Ergebnisse unverändert (A8).
Reason: Der eingefrorene Zahlbetrag bleibt die einzige Größe, die Folgerechnungen lesen; Skonto und Steuer sind Erfüllung, keine Kürzung der Forderung.
Reversible: yes (Risiko: § 48 EStG zählt Aufrechnungen zur Gegenleistung; v1 lässt Umlagen und Vertragsstrafe aus der Basis – auf die Seite „Annahmen“ und als unsicher in den Bericht)  Touches: packages/vertrag, abrechnung, ausgabe, fixtures, apps/web/src/rechnung

## D-73 Einstellungen als globales Aggregat, in der Projektdatei als optionaler Block
Welle 7 · Tickets 127, 137, 139, 150 · decided by: advisor
Question: Wo liegen Büroangaben, Druckprofile und KG-Bezeichnungen (bisher `localStorage`) und wie kommen sie in die Sicherung?
Decision: Ein globales Aggregat `Einstellungen` mit eigenem Repository, außerhalb der Projekt-Undo-Historie. Projektdatei Schema 7 trägt es als optionalen Block; das Einlesen füllt nur Fehlendes je Schlüssel (Büro nur, wenn lokal leer; Druckprofil nur bei fehlender Kennung; KG-Bezeichnung nur bei fehlender Nummer) und der Dialog nennt, was übernommen und was belassen wurde (Q5). `localStorage` wird einmalig übernommen, wenn der Speicher leer ist; die alten Schlüssel bleiben. Preisspiegel-Einstellungen als optionales Feld am LV mit LV-Befehl (Undo, wandert mit dem LV-Stand); fehlend = Standardwerte nach D-05. **Ändert D-36 (7)** („Druckprofile nicht im Vertrag“), gedeckt durch E15.
Reason: ADR 0001 (ein Nutzer, ein Gerät) und „einmal für alle Projekte“ (E10); getrennte Datei würde die Sicherung zu zwei Dateien machen.
Reversible: yes  Touches: packages/vertrag, kern, speicher, apps/web

## D-74 Zuschlag zurücknehmen: was sperrt
Welle 7 · Tickets 127, 138, 149 · decided by: advisor
Question: Sperren Verweise der Vorschau-Module das Zurücknehmen des Zuschlags?
Decision: Sperre bei Nachträgen, Aufmaßblättern, Rechnungen **und Mängeln** (v1.6: `speicher` weist das Entfernen eines Auftrags-LV mit Mangelverweis mit `konflikt` ab); die Sperre nennt Art und Anzahl und sagt, wie man sie löst. Bauzeitenplan (schwacher Verweis, v1.6) sperrt nicht und wird nicht aufgeräumt: der Vorgang behält den Bezug, der vorhandene Befund erscheint, Undo stellt alles her; der Bestätigungsdialog nennt die Vorgänge. Kostenkontrolle wird gerechnet, sperrt nicht; der Dialog sagt, dass die Auftragswerte dort entfallen.
Reason: Ein Mangel heißt, dass gebaut wird; ihn im selben Befehl zu ändern wäre Datenverlust (Q5) und bräche v1.6.
Reversible: yes  Touches: packages/vertrag, vergabe, speicher, apps/web/src/vergabe

## D-75 M4 streng zuletzt; Formelauswahl
Welle 7 · Ticket 157 · decided by: advisor
Question: M4 vorab streichen? Welche Formeln?
Decision: Nicht vorab streichen (G-61), aber erst starten, wenn alle P- und S-Tickets gemergt sind und das Tor grün ist. Quelle: die amtliche BVBS-Prüfdatei `fixtures/extern/bvbs/3.3-mengenermittlung/*.x31` (Nummer, Name, Parameterlage); Formeln sind Elementargeometrie, Sollwerte selbst hergeleitet (C4), kein REB-Text. Stufe 1: 04, 05, 01, 31; Stufe 2: 02, 03, 07, 13, 30. Nicht: 22/23/25, 08–12, 14, 15, 20, 21, 32, 00. Nur Belegtes umsetzen, sonst Befund „Formel nicht umgesetzt“ mit erhaltener Nummer.
Reason: Kürzungsreihenfolge (§4) nennt M4 zuerst; eine falsch gelesene Parameterreihenfolge ergäbe still falsche Mengen.
Reversible: yes  Touches: packages/mengen, gaeb, apps/web/src/mengen

## D-76 Schnitt der Welle 7
Welle 7 · alle · decided by: orchestrator
Question: Wie wird `umfang-welle-7.md` §3 in Tickets geschnitten?
Decision: Tickets 127–159 nach `schnitt-welle-7.md`. App-Tickets werden je Ordner gebündelt (ein Schreiber je Ordner, D-20), nicht je E-Punkt; Ticket 123 und 124 gehen in 127 (Vertragsteil), 131 (Seitengerüst), 135 (`speicher`), 140 (Fachpakete), 155 (Vorschau-Module, samt 124) auf. Integrationsbranch `integration/welle-7` ab `4eefd7d` (= `origin/main`; der lokale Ref `main` ist veraltet, wie D-49).
Reason: Weniger Übergaben und Konflikte in `apps/web`; die Reihenfolge in §4 (vertrag zuerst, gaeb E5→E7→E6, ausgabe E11→E12, ui-grid E3→E4, E1/E3 vor den Seiten-Tickets) bleibt.
Reversible: yes  Touches: Ablauf, issues/

## D-77 Browserprüfung ohne Firefox und Safari
Welle 7 · Ticket 132 · decided by: orchestrator
Question: E13 verlangt, Firefox und Safari vorher zu messen. In der Sitzung gibt es nur Chromium; `playwright install` ist hier untersagt.
Decision: Die Startprüfung erkennt Fähigkeiten (OPFS, Worker, Module-Worker, `crypto.subtle`, File-API u. a.), nicht Browsernamen. Die Meldung nennt „geprüft: aktuelle Chromium-Browser (Chrome, Edge)“ und Firefox/Safari als „nicht geprüft“. Die Messung in Firefox und Safari wird Teil der Handprüfungen (Ticket 126) und steht im Bericht als offen.
Reason: „Nicht raten“ (E13) heißt hier: nur Gemessenes behaupten.
Reversible: yes  Touches: apps/web/src/fehler, Ticket 126

## D-78 Versionsnummer 0.7.0
Welle 7 · Ticket 134 · decided by: orchestrator
Question: `apps/web/package.json` trägt `0.0.0`; die Seite „Über“ braucht eine Version.
Decision: `0.7.0` für den Stand nach Welle 7 (0.x bis zur Veröffentlichung, G-59), Build-Stand = kurzer Commit-Hash und Datum über `define` in Vite, ohne `Date.now()` im Fachcode.
Reason: Lesbar für die Demo, keine Versprechen einer 1.0.
Reversible: yes  Touches: package.json, apps/web/package.json, apps/web/vite.config

## D-79 Pages-Workflow ohne Warten auf die CI
Welle 7 · Ticket 134 · decided by: orchestrator
Question: Soll `pages.yml` erst nach grüner `ci.yml` (`workflow_run`) veröffentlichen?
Decision: Nein, Veröffentlichung bei jedem Push auf `main` wie gebaut. Nach Q2/P7 kommt nur grün Geprüftes nach `main`; ein zweiter Auslöser verdoppelt die Fehlerquellen. Der Befund „zweiter OPFS-Zugriffsgriff nach Neuladen“ aus der Pfadprobe geht als Punkt 6 an Ticket 139.
Reason: Einfach und ausreichend für eine Demo; umkehrbar mit einer Zeile.
Reversible: yes  Touches: .github/workflows/pages.yml, Ticket 139

## D-80 GAEB-Inhalte ohne Platz im Vertrag bleiben Befunde
Welle 7 · Ticket 129 (Folge 136, 144, 145) · decided by: orchestrator
Question: 3.1-Dateien (und 3.3) tragen Nachlass je Position oder Gliederung, Pauschalen an Gliederung/LV, „entfällt“ (`NotAppl`), Wahl-Gliederungen und abweichende MwSt-Sätze, die `vertrag` nicht hält. Bedeutung ändern (z. B. Positionen einer Wahl-Gliederung als Wahlpositionen lesen)?
Decision: Nein. Jede solche Angabe wird ein Befund am Knoten (D-129.3), die Summen des Modells weichen dann von der Datei ab, und der Befund sagt das. Keine Umdeutung in Welle 7; die Liste geht als Ergänzung zu §6 „Nach Welle 7“ in den Bericht (zu B-13, G-23, G-28).
Reason: G-23 (ein Nachlass je LV) und G-28 (ein MwSt-Satz) sind entschieden; eine Umdeutung wäre GAEB-Semantik ohne Beleg. F6/U5 verlangen Befund statt stillem Verwerfen, das ist erfüllt.
Reversible: yes  Touches: packages/gaeb

## D-81 Nutzungslimit während Stufe 2
Welle 7 · Tickets 132, 136–139, 141, 142, Review v1.7a · decided by: orchestrator
Question: Kurz nach dem Start der Stufe 2 brachen alle acht laufenden Agenten mit „weekly limit“ ab (gegen 18:35 UTC); die Arbeit lag in ihren Worktrees.
Decision: Um 18:46 UTC alle acht aus ihrem gespeicherten Stand fortgesetzt (wie D-61, D-65, D-67), nachdem die Sitzung wieder „allowed“ meldete und der Nutzer „continue“ schrieb. Kein Ticket gilt als fehlgeschlagen; der Circuit Breaker zählt nur Fehler der Umsetzung. Trifft der Lauf das Limit erneut, gilt die Kürzungsreihenfolge aus `schnitt-welle-7.md`, und P-Tickets haben Vorrang.
Reason: Kein Verlust, gleicher Gesamtaufwand; die Reihenfolge entscheidet, was bei einem weiteren Limit fertig ist.
Reversible: yes  Touches: Ablauf

## D-82 Review von `vertrag` v1.7a: „ja mit Korrekturen“
Welle 7 · Ticket 127 (Folge: 136–139, 146, 149, 150) · decided by: orchestrator
Question: Der Opus-Reviewer (statt des Nutzers, P9) urteilt „yes-with-fixes“: 2 MUST, 10 SHOULD, alle additiv oder nur Lesart. Was wird wo behoben?
Decision: **Nachtrag zu 127** (derselbe Umsetzer, vor dem Merge von 137 und 139): **M1** `Einstellungen` bekommen ein eigenes Protokoll (`EinstellungenProtokolleintrag`, `EinstellungenRepository.anwenden(eintrag, changeSet)` in einer Transaktion, `protokoll()`); die App führt für Einstellungen ein eigenes Sitzungs-Undo (Umkehrung = getauschtes ChangeSet, protokolliert als `Rueckgaengig`). D-73 nimmt die Einstellungen nur aus der Undo-Historie des Projekts, nicht aus dem Protokoll; ADR 0009 und A5 gelten ohne Ausnahme (eine Änderung der ADR wäre Sache des Menschen). **M2** Lesart: ein Stand-ChangeSet mit `lvStand.vorher: null` friert nur bei `LvStandAnlegen` (oder `Wiederholen` davon) das aktuelle LV ein, sonst `unbekannt`; `changeSetUmkehren` tauscht `lvStandInhalt`. Dazu **S1** (Undo legt den Stand an seinen Platz, Ordnung `angelegt, seq`), **S3** (`KalkulationSetzen` an einer Zuschlagsposition → `knotenart-unzulaessig`; Merkmale mit Zuschlag entfernen die Kalkulation im selben ChangeSet), **S4** Hinweiscode `kalkulation-entfernt`, **S5** Umbenennung `PreisspiegeleinstellungenSetzen` → `PreisspiegelEinstellungenSetzen` (bevor ein Protokoll den Namen trägt) und „Projektstammdaten“ → „Projektangaben“ im Glossar, **S6** Glossar: ein LV aus einem Stand übernimmt die Preisspiegel-Einstellungen über einen eigenen Befehl der App (150), **S7** Kommentar `modell.ts:646`, **S8** Lesart: `localStorage` wird nur übernommen, solange das Einstellungsprotokoll leer ist, **S10** Lesart: beim Einlesen als Kopie werden auch die Kennungen in eingefrorenen Ständen umgeschrieben. **Verbraucher:** 137 (M2-Umkehrung mit Eigenschaftstest, S3, S4, Umkehrung der Einstellungs-ChangeSets, Normalisierer der Bieterangaben exportieren), 138 (S9: schmale Funktionen mit Pflicht-`verweise`, Normalisierer aus `kern`), 139 (M1-Tabelle in Migration 7, M2-Prüfung, S1-Sortierung, S2 Umbenennen und Wiederherstellen eines Stands mit Tests, S10), 136 (S7: X84-Angaben in `AngebotLesung.bieter.angaben`, X86 füllt nur `auftragnehmer`, Kontaktangaben bleiben Befund), 146 zusätzlich blockiert durch 137 und 139, 149 (S7: vorhandener Bieter wird nicht überschrieben, die App bietet `BieterangabenSetzen` an), 150 (S6, S8).
Reason: Wie D-66: alle Befunde eng und additiv; M1 folgt aus ADR 0009 (Stufe 1 der Leiter), der Rest ist Lesart. Die laufenden Umsetzer bekommen ihre Punkte sofort als Nachricht.
Reversible: yes  Touches: packages/vertrag, GLOSSARY.md, kern, vergabe, speicher, gaeb, Tickets 136–139, 146, 149, 150

## D-83 Zuschlag übernimmt die Bieteranschrift als Auftragnehmer
Welle 7 · Ticket 138 (D-138.5) · decided by: orchestrator
Question: Der Zuschlag schreibt jetzt die Angaben des Bieters (Anschrift) in `LvInhaltKopf.auftragnehmer` des Auftrags-LV und lässt die Kalkulation an den Positionen fallen (D-127.6). Bestätigen?
Decision: Ja. Der Auftragnehmer ist der bezuschlagte Bieter; das X86 trägt so Name und Anschrift, wie es E10 verlangt. Die Kalkulation gehört zur Ausschreibung (D-127.6). Der Glossareintrag „Auftragnehmer“ („hat nur einen Namen“) wird im Vertragsnachtrag zu 127 berichtigt. Der Normalisierer der Bieterangaben liegt vorerst als lokale Kopie in `vergabe` (`bieterangaben.ts`); die Umstellung auf den Export aus `kern` (137) ist eine Zeile und geht in die Review-Behebung (159).
Reason: Keine Wirkung auf Beträge; schließt B-20 für das Auftrags-LV.
Reversible: yes  Touches: packages/vergabe, GLOSSARY.md, Ticket 159

## D-84 Übernahme der Einstellungen aus einer Projektdatei ist ein protokollierter Befehl
Welle 7 · Ticket 127 (Nachtrag, D-127.18) · decided by: orchestrator
Question: Der Vertragsnachtrag führt `EinstellungenUebernehmen { einstellungen }` ein: Das Einlesen einer Projektdatei ändert die Einstellungen und wird deshalb protokolliert (ADR 0009); `projektdateiEinlesen` schreibt den Eintrag nur mit dem Kopf aus der Option `einstellungsuebernahme`, `projektdateiImportieren` übernimmt keine Einstellungen mehr. Bestätigen?
Decision: Ja. Folgt aus M1 (D-82): Auch die Übernahme ist eine Änderung der Einstellungen und braucht einen Protokolleintrag; sie füllt nur Fehlendes (D-73). Ausführung in `kern` (137), Schreiben in `speicher` (139), Aufruf in der App (150). Der Vertragsnachtrag ist gemergt; `vertrag` v1.7a gilt damit als geprüft (Opus-Review statt Nutzer, P9), der Nutzer prüft nach der Welle.
Reason: ADR 0009 ohne Ausnahme; keine Wirkung auf Beträge.
Reversible: yes  Touches: packages/vertrag, kern, speicher, apps/web/src/projekt

## D-85 Zweites Nutzungslimit (5 Stunden, bis 22:20 UTC)
Welle 7 · Tickets 128, 132, 136, 137, 139, 141, 142 · decided by: orchestrator
Question: Gegen 21:30 UTC brachen sieben laufende Agenten am 5-Stunden-Limit ab; 140 war fertig.
Decision: 140 gemergt; um 22:20 UTC alle sieben aus ihrem gespeicherten Stand fortgesetzt (wie D-81), nachdem der Nutzer „continue“ schrieb. Der freie Platz geht an 147 (P, Weg zum Tor E: Beispielprojekt); 155 (S) folgt beim nächsten freien Platz. Offene Punkte aus 140 (D-140.3, D-140.7: GlobalId-Typ in `ui-modell`, Durchreichung von `MENGENART_STUECK` aus `bim`) gehen an 155, weil sie die App mitändern.
Reason: Kein Verlust; P-Tickets zuerst, falls das Limit erneut greift.
Reversible: yes  Touches: Ablauf, Ticket 155

## D-86 Phasen X80, X87, X88 ohne Bedeutung im Glossar
Welle 7 · Ticket 136 (D-136.3) · decided by: orchestrator
Question: X80, X87 und X88 werden jetzt abgewiesen; der Satz nennt nur die Phasennummer, weil das Glossar ihre Bedeutung nicht kennt. Bedeutung eintragen?
Decision: Nicht aus dem Gedächtnis. Ticket 144 darf die Bedeutung aus einer frei zugänglichen Beschreibung (gaeb.de, D-71) übernehmen und dann Glossar und Satz ergänzen; sonst bleibt es bei der Nummer. Die Erkennung von GAEB 90/2000 (D-136.2) prüfen 144/145 gegen die Formatbeschreibung.
Reason: C1 und D-71: keine Behauptung ohne Quelle; die Abweisung selbst ist richtig.
Reversible: yes  Touches: packages/gaeb, GLOSSARY.md, Ticket 144

## D-87 Rückfragen aus 137 und 139
Welle 7 · Tickets 137, 139 (Folge 128, 159) · decided by: orchestrator
Question: (1) Leerer Name beim Umbenennen eines LV-Stands: Vertragstext sagt „wie bei `LvStandAnlegen`“, Kern weist leere Namen ab (D-137.1). (2) D-127.14 nennt `oz-ungueltig`, der Kern behält die vorhandenen Codes von `OzMaskeSetzen` (D-137.10). (3) Reste außerhalb der Pakete.
Decision: (1) Abweisen wie `LvStandAnlegen`; (2) vorhandene Codes behalten (Tests und Oberfläche bauen darauf). Beide Vertragstexte berichtigt der laufende Vertragsschreiber 128 nebenbei (nur Kommentar). (3) Gesammelt für die Review-Behebung 159: `vergabe` und `gaeb` nutzen `bieterangabenNormalisieren` aus `kern`; `speicher` nutzt den Ausführer `EinstellungenUebernehmen` aus `kern` statt eigener Kopie (`uebernimmEinstellungenDerDatei`); `speicher` und `gaeb` importieren `KOSTENGRUPPENNUMMER_MUSTER` aus `vertrag` statt des Kern-Alias `KOSTENGRUPPE_FORM`; die Ausnahme für `createSyncAccessHandle` in `apps/web/e2e-basispfad/basispfad.spec.ts:14` entfällt (D-139.9).
Reason: Beides sind Lesarten ohne Wirkung auf Beträge; die Reste sind Einzeiler in fremden Paketen (P2), gebündelt statt verstreut.
Reversible: yes  Touches: packages/vertrag (Kommentare), Ticket 159

## D-88 Rückfragen aus 141 (Ausgaben der Kernkette)
Welle 7 · Ticket 141 (Folge 128, 153) · decided by: orchestrator
Question: (1) ADR 0012 sagt noch „Berichte nur PDF“ und „LV-PDF ohne Bilder“; E11/E12 verlangen Excel für Berichte und Bilder im LV-PDF. (2) „Vergabevorschlag“ fehlt im Glossar (L2). (3) Die Excel-Golden-Datei des LV hat zwei gesperrte Zahlformate mehr (D-141.13).
Decision: (1) Kein Widerspruch zur Entscheidung der ADR (pdfmake, ungetaggt in v1, Renderer liest nur ein druckfertiges Modell); die Folgen-Abschnitte bekommen einen datierten Nachtrag „Welle 7: Excel für Berichte aus dem `Berichtsmodell`, Bilder aus dem Langtext im LV-PDF (G-61, E11/E12)“. Das schreibt 153 als nächster Schreiber in `ausgabe`. (2) Der Vertragsschreiber 128 trägt „Vergabevorschlag“ ins Glossar ein. (3) Angenommen; die Werte der Zellen bleiben gleich.
Reason: Der Umfang aus G-61 ist vom Nutzer entschieden; die ADR wird nachgeführt, nicht umgestoßen.
Reversible: yes  Touches: docs/adr/0012-*, GLOSSARY.md, Tickets 128, 153

## D-89 Prüf-Panel beim Laden zu, auch mit Befunden
Welle 7 · Ticket 142 (D-142.4) · decided by: orchestrator
Question: E3 sagt „Prüf-Panel einklappbar, ohne Befunde zu“. Mit offenem Panel passen EP und GP bei 1280 px nicht (`typisch` hat 26 Warnungen, die BVBS-X83 2 Fehler); das Ziel „15 Zeilen samt EP und GP“ wäre nicht erreichbar. Der Umsetzer lässt das Panel beim Laden immer zu, die Schaltfläche „Prüfung“ zeigt die Anzahl, F8 öffnet.
Decision: Bestätigt. Das messbare Ziel aus E3 geht vor dem Nebensatz; die Anzahl auf der Schaltfläche hält U5 (Probleme sichtbar, Sprung möglich). Die übrigen Seiten mit Schaltflächenreihen (Honorar, Rechnung, Abrechnung, Bauzeit, BIM, Bauleitung, Kosten, Modellvergleich) stellen in ihren Ordner-Tickets auf die `Werkzeuggruppe` um, soweit billig; `abrechnung/Verweis.tsx` ist unbenutzt und entfällt in 152.
Reason: Tor E Punkt 1 verlangt die Sicht bei 1280×800.
Reversible: yes  Touches: apps/web/src/lv, Tickets 152, 154, 155

## D-90 Beispielprojekt aus den Fixtures über ein Vite-Plugin
Welle 7 · Ticket 147 (D-147.2, D-147.4, D-147.8) · decided by: orchestrator
Question: (1) Die Beispieldaten kommen über ein kleines Plugin in `apps/web/vite.config.ts` in den Build; Produktcode importiert keine Fixture-Datei, die Grenzprüfung `fixtures-nur-in-tests` bleibt unverändert. (2) Der Weg „GAEB-Datei einlesen“ legt vorläufig ein leeres „Neues Projekt“ an. (3) Die Seite „Annahmen“ beschreibt A5 und die Formeln nach dem geplanten Umfang.
Decision: (1) Bestätigt: Die Regel schützt den Produktcode vor Testdaten-Abhängigkeiten; die Beispieldaten sind bewusst ausgelieferte, selbst verfasste Daten (C4) und kommen über den Build, nicht über einen Import. (2) 146 ersetzt `GaebWeg` in `hilfe/Willkommen.tsx` durch „Einlesen ohne offenes Projekt“ (Projekt erst beim Übernehmen, Name aus der Datei, nichts bleibt beim Abbrechen). (3) Wird A5 oder M4 gekürzt, berichtigt das Tor-Ticket 158 die Seite; der Bericht nennt es.
Reason: Weg zum Tor E; keine Regel verletzt.
Reversible: yes  Touches: apps/web/vite.config.ts, apps/web/src/hilfe, Tickets 146, 158

## D-91 Drittes Nutzungslimit (5 Stunden, bis 03:20 UTC)
Welle 7 · Tickets 128, 132, 144, 146, 148, 150, 151, 155 · decided by: orchestrator
Question: Gegen 23:30 UTC brachen alle acht laufenden Agenten am 5-Stunden-Limit ab.
Decision: Um 07:32 UTC alle acht aus ihrem gespeicherten Stand fortgesetzt (wie D-81, D-85), nachdem der Nutzer „Continue“ schrieb. Nichts gekürzt. 153 wartet weiter auf 128 (Teil A5); 154 bekommt den nächsten freien Platz.
Reason: Kein Verlust; die Kürzungsreihenfolge greift erst, wenn Pflichtteile des Tors gefährdet sind.
Reversible: yes  Touches: Ablauf

## D-92 GAEB 90 gelesen; Reste aus 144 und 146 für 159
Welle 7 · Tickets 144, 146 (Folge 145, 159) · decided by: orchestrator
Question: 144 liest GAEB 90 aus frei zugänglichen Quellen (6 Quellen, 9 unsichere Punkte im Ticket); Stundenlohn, Pauschal und Zuschlag werden nicht gelesen (keine freie Quelle, D-144.5), kein MwSt-Satz (D-144.8); „X80 Universelle LV-Daten“ und „X87 Auftragsbestätigung“ mit Quelle ins Glossar (D-86). 146 meldet Reste außerhalb seiner Ordner.
Decision: 144 bestätigt; die unsicheren Punkte und die nicht gelesenen Merkmale nennt der Bericht (zu D-71). Für die Review-Behebung 159 gesammelt: `ausgabe/ExcelBefunde.tsx` zeigt Befundcodes als Text; unbenutzte Texte `start.gaeb.projektname`, `angelegt`, `zumProjekt` in `hilfe/texte.ts`. Der Orchestrator hat `.gitattributes` für die GAEB-90/2000-Fixtures ergänzt (`-text`).
Reason: Konservativ (Befund statt Raten) nach D-71; Reste sind Einzeiler.
Reversible: yes  Touches: packages/gaeb, GLOSSARY.md, .gitattributes, Ticket 159

## D-93 `vertrag` v1.7b (A5) gemergt; Speicherteil geht an 143
Welle 7 · Ticket 128 (Folge 143, 152, 153) · decided by: orchestrator
Question: (1) D-128.5: Bauabzugsteuer 0,00, wenn ihre Basis ≤ 0 ist (D-72 sagt das nur für Skonto). (2) Der Rechnungsdekoder in `speicher` (139) kennt nur die Schlüssel bis v1.7a und weist Rechnungen mit den neuen Feldern ab; 143 nennt `speicher` nicht. (3) `Speicher.einstellungen` bleibt optional.
Decision: (1) Bestätigt: keine negative Steuer, keine Erstattung durch das Finanzamt in v1; steht auf der Seite „Annahmen“ mit D-72. (2) 143 übernimmt `speicher` als zweites Paket (derzeit kein anderer Schreiber dort, P2 bleibt gewahrt): Dekoder für `vertragsstrafe`, `skonto`, `bauabzugsteuer`, `zahlungen`, Prüfung in der Dateimigration (Schema 7 trägt die Felder optional, kein neues Schema), `konflikt` für „Zahlung nur an freigegebener Rechnung“. (3) Bleibt optional bis zur nächsten Vertragsversion (nach der Welle). Der Opus-Review von v1.7b läuft im Wellen-Review mit (die Formen folgen D-72 wörtlich, alles optional).
Reason: Ein Schreiber, ein Ticket, kein zusätzlicher Agentenplatz; der Tor-Weg (Rechnung mit Skonto) braucht den Speicher.
Reversible: yes  Touches: packages/abrechnung, speicher, fixtures, Ticket 143

## D-94 Fehlerfestigkeit gemergt; wackeliger Test `bim-tastatur.spec.ts:135` an 155
Welle 7 · Ticket 132 (Folge 155, 158) · decided by: orchestrator
Question: 132 ist fertig bis auf „volle Web-E2E zweimal hintereinander grün“: seit dem Merge von 131/133 fällt zeitweise `bim-tastatur.spec.ts:135` (Fokus einer Option im Auswahlfeld), auch ohne die Änderungen aus 132 (2 von 4 mit `--repeat-each 4`). Rohe Fehlertexte beim PDF stehen noch in `bauzeit/PlanDrucken.tsx:79` und `bauleitung/PdfDialog.tsx:50`.
Decision: 132 gemergt. Den wackeligen Test und die zwei PDF-Fehlertexte übernimmt 155 (Besitzer von `bim/`, `bauzeit/`, `bauleitung/`): Ursache finden, nicht den Test abschwächen. Das Kriterium „zweimal grün“ prüft das Tor-Ticket 158 auf dem Endstand. `nachtrag.spec.ts:170` prüft einen festen Hinweis, keine Meldung, und bleibt.
Reason: Der Fehler liegt nicht in 132; ein Schreiber je Ordner.
Reversible: yes  Touches: apps/web/src/fehler, Ticket 155, 158

## D-95 151, 150, 145 gemergt; Folgen
Welle 7 · Tickets 145, 150, 151 (Folge 149, 152, 154, 158, 159) · decided by: orchestrator
Question: Was folgt aus den Berichten von 151 (geführter Nachtrag), 150 (Projektangaben, Einstellungen mit eigenem Undo, Kopie-Import) und 145 (GAEB 2000 gebaut, Quellen in D-145.x)?
Decision: Alle drei bestätigt. 145: Bedarf, Wahl, Stundenlohn, Pauschal und Zuschlag werden aus GAEB 2000 nicht gelesen (keine freie Quelle, D-145.4), kein MwSt-Satz (D-145.8) – der Bericht nennt das samt den 9 unsicheren Punkten. Merge-Konflikte (132/148 in `umwege.spec.ts`, 132/150 in `projekt.spec.ts` und `ausgabe/LvDrucken.tsx`) hat der Orchestrator gelöst, die betroffenen E2E liefen grün. **An laufende/kommende Tickets:** 149, 152, 154 geben `Einstellungen.buero` und das `Projekt` in ihre PDF-Eingaben (D-141, D-150); 158 schließt im Torweg den Dialog „Projektdatei eingelesen“. **Für 159 gesammelt:** Glossareintrag „GAEB 2000“ (und „GAEB 90“, falls fehlend); Kommentar `apps/web/src/gaeb/gaeb.ts:60`; eine E2E, die eine GAEB-2000-Datei in der App einliest; `kosten/`-Seiten ohne Einstellungs-Undo-Knöpfe (D-150). **Bewusst später (Bericht):** gemeinsamer Positionsdialog mit Lesemodus für `lv/` und `auftrag/`; Auftragnehmer in den Dialogen „X84 einlesen“/„Excel einlesen“ vorbelegen (151).
Reason: Keine Regel verletzt; Reste sind klein und gebündelt.
Reversible: yes  Touches: Tickets 149, 152, 154, 158, 159

## D-96 „Projekt samt Inhalt löschen“ als eigener Befehl
Welle 7 · Tor E (158), E8 · decided by: advisor
Question: `ProjektLoeschen` wird abgewiesen, solange LVs, Angebote oder ein Auftrags-LV bestehen; der Torweg „sichern → Projekt löschen → einlesen“ wäre nur über 10+ Schritte von Hand möglich. E8 verlangt „jedes Projekt wieder löschbar (Q5)“.
Decision: Neuer additiver Befehl `ProjektSamtInhaltLoeschen { art }` in `ProjektBefehl` (Vertragsnachtrag v1.7c, eigenes Ticket, Opus-Review); `ProjektLoeschen` und seine `konflikt`-Regel bleiben. Eine neue ChangeSet-Art `projektbestand` (`projekt: Aenderung<Projekt>`, `bestand: Aenderung<Projektbestand>`), wobei `Projektbestand` die Struktur der Projektdatei wiederverwendet (prüfen, dass LV-Stände, Protokoll und Modellverweise enthalten sind; sonst ergänzen). `speicher` löscht in einer Transaktion und stellt beim Undo über den Schreibweg von `projektdateiEinlesen` wieder her (gleiche IDs); Modell-Bytes werden erst freigegeben, wenn kein Undo-Schritt sie mehr nennt (wie beim Undo des Modell-Löschens). Der Ausführer bekommt den Bestand als Pflichtparameter (sonst `ungueltige-eingabe`); der Bestätigungsdialog nennt die Anzahl je Art und verweist zuerst auf „Projektdatei sichern“. Protokoll als Massenbefehl (Kopf und Prüfsumme, E-13). Pflichttest: Beispielprojekt → löschen → Undo → byte-gleiche Projektdatei. D-74 ist nicht berührt: dort ging es um stilles Ändern von Mängeln als Nebenwirkung; hier löscht der Nutzer ausdrücklich alles. Reihenfolge: 160 (`vertrag`) → 161 (`kern`, `speicher`, App-Dialog in `projekt/`). Ist die Kette nicht gemergt, wenn die übrigen P-Tickets fertig sind, geht das Tor den Weg von Hand und der Bericht sagt es; das Tor wird nie gekürzt.
Reason: Tor E und E8 erwarten ein löschbares Projekt; Q5 ist durch Bestätigung, Undo und Sicherungshinweis erfüllt; kein Settled-Text verbietet es.
Reversible: yes (Risiko: unvollständiges Undo über ~12 Aggregatarten wäre stiller Verlust – deshalb der Byte-Vergleichstest)  Touches: packages/vertrag, kern, speicher, apps/web/src/projekt, apps/web/e2e/umsteiger.spec.ts

## D-97 A5 in `abrechnung` gemergt; Rückfragen aus 143
Welle 7 · Ticket 143 (Folge 152, 153, 147) · decided by: orchestrator
Question: (1) Der Typcheck erzwang zwei Fälle und zwei Texte in `apps/web/src/rechnung/` (D-143.10). (2) `dateimigration7.ts` („wird nach dem Merge nicht mehr geändert“) bekam die Prüfung aus D-93 vor dem ersten Merge in eine Veröffentlichung. (3) Basis der Bauabzugsteuer ohne Umlagen und Vertragsstrafe (§ 48 EStG unsicher).
Decision: (1) Bestätigt als mechanische Folgezeilen; 152 prüft den Wortlaut. (2) Bestätigt: Migration 7 ist noch nicht auf `main`, die Datei gilt erst ab dem Merge der Welle als eingefroren. (3) Steht schon in D-72 als Risiko; die Seite „Annahmen“ (147) nennt es, sonst ergänzt 159 den Satz. Für 153: die Kette trägt jetzt eine Zeile `vertragsstrafe` zwischen Umlagen und Einbehalt (D-143.6). Für 152: `vertragsstrafeVorschlag` füllt neue Rechnungen (D-143.5).
Reason: Keine Regel verletzt; Sollwerte unabhängig hergeleitet (C4), M4-Goldens unverändert.
Reversible: yes  Touches: packages/abrechnung, speicher, fixtures, apps/web/src/rechnung

## D-98 Vergabe- und Kostenseiten gemergt; Reste
Welle 7 · Tickets 149, 154 (Folge 152, 159) · decided by: orchestrator
Question: 149 begrenzt die Ausreißer-Schwelle auf 100 % (der Kern weist mehr ab, v1.7a; eine Zeile in `preisspiegel.spec.ts` von 200 auf 100), baut eine eigene PDF-Vorschau `PdfMitVorschau`; 154 speichert die Kalkulation, Kostenberichte mit Vorschau.
Decision: Beides bestätigt. 100 % als Obergrenze ist eine Lesart von G-26 (Ausreißer ±%), keine Lockerung eines Tests; eine höhere Schwelle bräuchte eine Vertragsänderung und kommt nur auf Anfrage des Büros. **An 152:** `PdfMitVorschau` aus `vergabe/Ausgaben.tsx` wiederverwenden (Import genügt; Umzug nach `ui/` in 159). **Für 159:** `auftragsLvBefehlAusfuehren` in `auftrag/`, `kosten/`, `nachtrag/`, `hilfe/` aus `@tethys/vergabe` statt `@tethys/kern`; `PdfMitVorschau` nach `ui/` und im LV-PDF nutzen; Druckprofil- und Datumswahl für Preisspiegel-, Vergabevorschlags- und Kostenberichte; `lv-bedienung.spec.ts` lädt die Kalkulation über den echten Dialog statt den Testhaken. **Bericht:** Die Tabelle der Angebotspreise ist nicht virtualisiert (langsam bei 5.000 Positionen).
Reason: Keine Regel verletzt; Reste sind klein.
Reversible: yes  Touches: apps/web/src/vergabe, kosten, Tickets 152, 159

## D-99 Vorschau-Module gemergt; Doppelmessung je Position; Kann-Teile gekürzt
Welle 7 · Ticket 155 (Folge 158, 159, Bericht) · decided by: orchestrator
Question: 155 hat Punkte 1–5 und 7 erledigt, Punkt 6 (K-Teile: „Mangel aus Bauteil“, „KG im Modell weicht ab“) nach der Kürzungsreihenfolge gestrichen; den Hinweis „schon auf einem anderen Aufmaßblatt gemessen“ gibt es je Position, nicht je Bauteil (dafür bräuchte `Ansatzzeile` eine GlobalId, also `vertrag`); Einzeiler in fremden Ordnern (`kosten/KostenermittlungSeite`, `auftrag/AuftragsLvSeite`, `hilfe/beispielprojekt`, D-155.2); `bim-tastatur.spec.ts:135` bleibt wackelig ohne gefundene Ursache in der App (Radix verschiebt den Fokus in einem `setTimeout`, der unter Last über eine Sekunde nicht lief).
Decision: Alles bestätigt. Die Einzeiler sind Einhängestellen, keine Fachänderung. Die Kürzung von Punkt 6 und die Doppelmessung je Bauteil (Vertragsänderung) stehen im Bericht unter „nach Welle 7“. Der wackelige Test wird im Abschlusslauf auf ruhiger Maschine geprüft; fällt er dort weiter, untersucht 159 das Auswahlfeld in `ui-basis`. Die Messung des Preisspiegel-Budgets auf ruhiger Maschine gehört in den Abschlusslauf.
Reason: Kürzungsreihenfolge §4; ohne Last gibt es keinen Befund, der eine Änderung rechtfertigt.
Reversible: yes  Touches: apps/web/src/{bauzeit,bauleitung,honorar,bim,modellvergleich}, packages/bim, ui-modell, Bericht

## D-100 Prüflauf der Integration: zwei echte Fehler
Welle 7 · Prüflauf auf `1dbfdca` (Folge 156, 162) · decided by: orchestrator
Question: Der Prüflauf (Lint, Typen, Unit, Web-E2E, `ui-grid`- und `speicher`-E2E, Last 20–33) fand neben Budget-Messungen unter Last zwei echte Fehler: (1) `packages/ui-grid/e2e/arbeitsflaeche.spec.ts:57` erwartet die zugängliche Bezeichnung „Ordnungszahl“ am Spaltenkopf mit sichtbarem Text „OZ“ (130), 133 machte daraus auch die Bezeichnung „OZ“; (2) `apps/web/e2e/druckprofil.spec.ts:127`: nach dem Löschen eines Profils hält keine Option den Fokus.
Decision: (1) Sichtbar „OZ“, zugängliche Bezeichnung „Ordnungszahl“ (wie D-130 und im Sinn von D-133: Ordnungszahl ist der Fließtext-Begriff, ein Bildschirmleser liest ihn vor; U8). Behebt 156 als derzeitiger Schreiber in `ui-grid`. (2) Kleines Fix-Ticket 162 (Opus) für `apps/web/src/ausgabe/`, Ursache finden statt Test abschwächen. Budgets: zweite Messung im Abschlusslauf auf ruhiger Maschine; `bim-tastatur.spec.ts:58` wackelte einmal (wie :135, D-99).
Reason: Q2 verlangt grüne E2E vor dem Tor; beide Fehler kommen aus dem Zusammenspiel zweier gemergter Tickets.
Reversible: yes  Touches: packages/ui-grid, apps/web/src/ausgabe, Ticket 162

## D-101 Suchen, Filtern, Kontextmenü gemergt; Spaltenkopf „Ordnungszahl (OZ)“
Welle 7 · Ticket 156 (Folge 159) · decided by: orchestrator
Question: 156 löst D-100 (1) mit der zugänglichen Bezeichnung „Ordnungszahl (OZ)“ statt nur „Ordnungszahl“ (der Sprachtest aus 133 verbietet „Ordnungszahl“ allein als Beschriftung); `ui-grid` bekommt `@radix-ui/react-dropdown-menu` (gleiche Version wie `ui-basis`) für das Kontextmenü.
Decision: Beides bestätigt. „Ordnungszahl (OZ)“ nennt Begriff und Kürzel und hält D-130 (Bildschirmleser), D-133 (Sprachregel) und den Test. **Für 159:** `auftrag/AuftragsLvSeite` reicht `alleZeilen` und `onKuerzelhilfe` an das Grid (zwei Zeilen wie `LvStandSeite`), sonst sucht die Auftrags-LV-Seite nur in sichtbaren Zeilen.
Reason: Keine Regel verletzt; Budgets der 5.000/10.000-Zeilen-Prüfstände blieben unter Last eingehalten.
Reversible: yes  Touches: packages/ui-grid, apps/web/src/lv, Ticket 159

## D-102 `vertrag` v1.7c gemergt; Byte-Vergleich ohne den Undo-Eintrag
Welle 7 · Ticket 160 (Folge 161, Wellen-Review) · decided by: orchestrator
Question: (1) D-160.9: Nach Löschen und Undo ist die Projektdatei byte-gleich bis auf einen `Rueckgaengig`-Eintrag am Ende des Protokolls (A5 verlangt, dass das Undo selbst protokolliert wird). (2) D-160.5: Der Protokolleintrag des Löschens wird nicht gespeichert, wie bei `ProjektLoeschen` (D-31.1). (3) Opus-Review von v1.7c (D-96).
Decision: (1) Bestätigt; der Pflichttest in 161 vergleicht byte-genau nach Entfernen genau dieses letzten Eintrags und prüft ihn ausdrücklich. (2) Bestätigt: Das Protokoll gehört zum Projekt (ADR 0009) und geht mit ihm; Präzedenz D-31.1. (3) Der Review von v1.7c (und v1.7b, D-93) läuft als eigener Punkt im Wellen-Review gegen alle Verbraucher.
Reason: Keine Regel verletzt; die Formen sind additiv und folgen D-96.
Reversible: yes  Touches: packages/vertrag, Ticket 161, Wellen-Review

## D-103 Wellen-Review parallel zu den letzten drei Tickets
Welle 7 · Wellen-Review · decided by: orchestrator
Question: Das Wellen-Review (Schritt 6) gehört nach alle Merges; offen sind noch 152 (Aufmaß/Rechnung in der App), 161 (Projekt samt Inhalt löschen) und 162 (Fokus Druckprofil). Warten oder parallel?
Decision: Review jetzt auf `integration/welle-7` @ `1f00ead` (Fixpunkt `4eefd7d`), einschließlich der Vertragsversionen v1.7b und v1.7c gegen alle Verbraucher (D-93, D-102). 152, 161 und 162 bekommen nach ihrem Merge einen kurzen zweiten Review-Durchgang über ihren Diff. Die Befunde beider Durchgänge gehen in Ticket 159.
Reason: Wie D-68: spart eine volle Review-Runde Wartezeit; der Großteil des Codes der Welle ist gemergt.
Reversible: yes  Touches: Ablauf

## D-104 Umfang der Review-Behebung Welle 7
Welle 7 · Wellen-Review (`review-welle-7.md`) · decided by: orchestrator
Question: Welche Befunde werden in dieser Welle behoben, welche bestätigt, welche gehen in den Bericht?
Decision: **Sofort an laufende Tickets:** MUST-1/PA1 an 161 (Präfix-Vergleich des Protokolls beim Löschen: das gespeicherte Protokoll muss mit `bestand.vorher.protokoll` beginnen, angehängte Einträge sind erlaubt; Test löschen → Undo → Wiederholen; dazu die Umstellung von `uebernimmEinstellungenDerDatei` auf den Kern-Ausführer); PA3 an 152. **Ticket 159, zwei Umsetzer parallel, ohne die Ordner der laufenden Tickets 152 (`abrechnung/`, `rechnung/`), 161 (`kern`, `speicher`, `projekt/`, `historie/`), 162 (`apps/web/src/ausgabe/`):** 159a Pakete – SA1, SA2+SA8 (ein Weg für die Angebotsbefunde, „Gesamtpreis“), SA3, SA4 + SOLL-2 (Glossar „Auszahlungsszenario“, „Zahlungsfreigabe“, „GAEB 90“, „GAEB 2000“, „Vorschau“ in beiden Bedeutungen (SB11)), SA7, SA9, SA10 (`form.ts` mit `KALENDERDATUM_MUSTER`, Kalender einmal in `abrechnung`), PA2, SB3 (Angebotspreise im gemeinsamen Grid aus `ui-grid`, App-Teil in `gaeb/`), SB4 (Belege § 48 EStG, § 16 VOB/B in Fixture und README), Vertragskommentar zu D-104 (D-160.5/.6), die Reste aus D-87 (`vergabe`/`gaeb` nutzen `bieterangabenNormalisieren`, `KOSTENGRUPPENNUMMER_MUSTER` statt `KOSTENGRUPPE_FORM`); 159b App – SB1/PB3 (deutsche Fehlertexte mit nächstem Schritt in allen PDF-Dialogen und Workern, Texte in `texte.ts`), SB2/PB4 (Fehler sichtbar, leere CSV löscht nichts ohne Rückfrage), SB6+SB7 (Kosten-PDF im Worker, ein Schriftlader und ein Worker-Start für alle PDF-Worker außerhalb der gesperrten Ordner), PB1, PB2, PB5 (Annahmen: Vertragsstrafe kumuliert und vorgeschlagen, ABC-Bezug umschaltbar, Ausreißer über EP), PB6, PB7, SB13 (Pfade aus `ui/pfade.ts`), und die gesammelten Reste aus D-92, D-95, D-98, D-101 (`ExcelBefunde` ohne Codes in `ausgabe/`-App → erst nach 162; unbenutzte Hilfe-Texte; `gaeb.ts:60`; E2E GAEB 2000; `auftragsLvBefehlAusfuehren` aus `@tethys/vergabe`; `PdfMitVorschau` nach `ui/`; `lv-bedienung.spec` über den echten Dialog; `AuftragsLvSeite` mit `alleZeilen`; Ausnahme in `e2e-basispfad/basispfad.spec.ts:14` entfällt). **Bestätigt, keine Änderung:** SB5 (ADR 0012 `accepted` hat der Nutzer mit G-62 verlangt, der Nachtrag folgt G-61), SB14 (D-90), SA5 (die Folgezeilen in fremden Paketen waren vom Typcheck erzwungen und in den Commits markiert, wie in jeder Vertragswelle), SA6 (Schema 7 ist unveröffentlicht; der Dateikopf wird präzisiert: „ab dem Merge nach `main`“), SOLL-1 (bleibt, schadet nicht; das Glossar „Massenbefehl“ nennt den Fall). **Bericht/später:** SA12, SA13 (große Dateien teilen), SB9, SB10, SB12, PA4, SOLL-3, Druckprofil- und Datumswahl der neuen Berichte.
Reason: Wie D-47/D-69: Pflicht ist, was eine Regel, eine ADR, den Vertrag oder das Ticket verletzt oder Nutzer falsch informiert; Gerüche nur, wo sie schon zu Abweichungen geführt haben (SA2/SA8, SA9) oder billig sind.
Reversible: yes  Touches: viele Pakete und Ordner, Tickets 152, 159, 161

## D-105 Vierter Halt am Nutzungslimit
Welle 7 · Ticket 152, 158, 159a, 159b, 161, 162 · decided by: orchestrator
Question: Alle sechs laufenden Agenten hielten am 5-Stunden-Limit (Rücksetzung 13:40 UTC). Zählt das für den Circuit Breaker, und wie geht es weiter?
Decision: Kein Fehlschlag der Umsetzung (wie D-81, D-85, D-91). Nach der Rücksetzung wurden alle sechs aus ihrem gespeicherten Stand fortgesetzt; kein neuer Agent, höchstens acht zugleich.
Reason: Die Agenten haben früh committet; der Stand in den Worktrees ist vollständig.
Reversible: ja
Touches: Ablauf der Welle

## D-106 Merge 152 und 162
Welle 7 · Ticket 152, 162 · decided by: orchestrator
Question: 152 (Aufmaß, Rechnung, Zahlungen, Zahlungsfreigabe-PDF) und 162 (Fokus nach Löschen eines Druckprofils) sind done-by-agent. Mergen, und was folgt?
Decision: Beide gemergt (`7be550f`, `e63b4db`), ohne Konflikt; Lint und Typcheck grün. 158 nimmt die fixme-Schritte für 152 heraus. 159b bekommt `ausgabe/`, `abrechnung/`, `rechnung/` frei und zieht `PdfMitVorschau` samt der drei neuen Druckarten aus 152 nach `ui/`. Der Befund D-162.3 (eine Meldung fängt Escape einer offenen Auswahlliste) geht als kleiner Punkt an 159a (`ui-basis/Toast.tsx`), sonst in den Bericht. Die Budgettests, die unter Last rot waren (`kern`, `speicher`, `vergabe`, `abrechnung/leistung`), werden am Ende auf ruhiger Maschine gemessen; nicht gelockert.
Reason: Wie D-79 ff.: grün und im Umfang; der zweite Review-Durchgang über 152/161/162 folgt nach dem Merge von 161 (D-103).
Reversible: yes  Touches: abrechnung/, rechnung/, ausgabe/, Tickets 158, 159

## D-107 Merge 161
Welle 7 · Ticket 161 · decided by: orchestrator
Question: 161 (Projekt samt Inhalt löschen in `kern`/`speicher`/App, MUST-1 aus dem Review, Einstellungen der Datei über den Kern-Ausführer) ist done-by-agent. Mergen?
Decision: Gemergt (`d5e0680`), ohne Konflikt; Lint und Typcheck grün. 158 nimmt den letzten fixme-Schritt (Löschen samt Inhalt, Undo, Wiederholen) heraus und fährt das Tor dreimal. Die offene Frage aus D-161.2 (nach Löschen → Undo → Wiederholen → Undo fehlt der erste `Rueckgaengig`-Eintrag, weil er zum gelöschten Protokoll gehörte) geht an den zweiten Review-Durchgang (D-103) und wird dort bestätigt oder als Befund behandelt.
Reason: Grün und im Umfang; der Tor-Schritt „Projekt löschen“ hängt an diesem Ticket (D-96).
Reversible: yes  Touches: kern, speicher, projekt/, historie/, Ticket 158

## D-108 M4 (Ticket 157) wird gekürzt
Welle 7 · Ticket 157 · decided by: orchestrator
Question: 157 (weitere REB-Formeln, Priorität K) darf erst nach allen P-/S-Tickets und grünem Tor starten (D-75). Jetzt starten oder nach §4 kürzen?
Decision: Gekürzt, als erster Punkt der Kürzungsreihenfolge (`umfang-welle-7.md` §4: „M4 → …“). Das Ticket bleibt `ready-for-agent` mit Vermerk und geht in die nächste Welle; die vorhandene Formelauswahl und der X31-Rundweg (Nummer bleibt erhalten, Befund „Formel nicht umgesetzt“) bleiben unverändert.
Reason: Die Welle ist übergelaufen: vier Halte am Nutzungslimit (D-81, D-85, D-91, D-105), das Tor ist noch nicht dreimal grün, die Leistungsbudgets müssen noch auf ruhiger Maschine gemessen werden, und 157 würde `packages/gaeb` zugleich mit 159a schreiben (P2). Das verbleibende Budget gehört dem Tor, der Review-Behebung und dem Abschluss. Kein P- oder S-Teil wird gekürzt.
Reversible: yes (Ticket unverändert startbereit)  Touches: Ticket 157, Bericht

## D-109 Befunde des zweiten Review-Durchgangs
Welle 7 · Ticket 152, 161, 162, 159 · decided by: orchestrator
Question: Der zweite Durchgang (`review-welle-7.md`, Abschnitt „Zweiter Durchgang“) fand R1–R11. Was wird behoben, und bestätigt er D-161.2?
Decision: D-161.2 bestätigt (Protokoll ist Nebenbuch nach ADR 0009). An 159b: R1, R2 (Bildschirm), R3, R4, R5, R7. An 159a: R6 samt Folge in ADR 0009, und dieselbe Wortwahl für PA2 im PDF („Skonto (noch nicht verwirklicht)“ während der Frist, „nicht verwirklicht“ danach), damit Bildschirm und PDF gleich sprechen. In den Bericht: R8 (Doppelung, nur Drift-Risiko, durch Tests gedeckt), R9 (Leistung bei großen Modellen, nur beim Öffnen des Dialogs), R10, R11.
Reason: Wie D-104: Pflicht ist, was Nutzer falsch informiert oder eine Regel verletzt (R1 E13/L5, R2 falsche Angabe); billige Soll-Punkte nimmt der zuständige Schreiber mit.
Reversible: yes  Touches: abrechnung/, rechnung/, historie/, speicher, ADR 0009, Ticket 159

## D-110 Merge 159a, 159b, 158; Reste in Ticket 163
Welle 7 · Ticket 158, 159, 163 · decided by: orchestrator
Question: 159a, 159b und 158 (Tor E) sind done-by-agent. Mergen, und wohin mit ihren offenen Punkten?
Decision: Alle drei gemergt (`fa2a690`, `bd50386`, `5af993b`); einziger Konflikt war die Ticketdatei 159 (beide Teile zusammengeführt). Lint und Typcheck grün. Tor E: `umsteiger.spec.ts` und `ueberlauf.spec.ts` dreimal in Folge grün, ohne fixme. Offene Punkte gehen in **Ticket 163** (ein Opus-Umsetzer): eine gemeinsame Regel für den Skonto-Stand auf Bildschirm und PDF (159a und 159b haben sie je für sich umgesetzt), PB2-Text und Kommentar in `gaeb/`, Alias `Datum` in `bauzeit`, SA6-Dateikopf, Wackler `nachtrag.spec.ts:164` (Escape schließt den Positionsdialog manchmal nicht; Ursache beheben, nicht im Test verstecken). Bestätigt ohne Änderung: D-159a.(SB3) „nicht angeboten“ über den Zellbefund-Pfad (eigene Markierung bräuchte eine Vertragsänderung → Bericht), D-159b.3 (LV-PDF ohne Vorschau, eigener Dialog mit Profil und Abbruch), `vergabe.spec.ts` von 159a mitgeändert (wegen SB3 nötig), `version.ts` von 159b.
Reason: Pflicht nach D-104/D-109 (gleiche Aussage auf Bildschirm und PDF, Texte nach L5); ein Wackler im Tor-Umfeld darf nicht offen bleiben.
Reversible: yes  Touches: rechnung/, gaeb/, bauzeit, speicher (Kommentar), e2e, Ticket 163

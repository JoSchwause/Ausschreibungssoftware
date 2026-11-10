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

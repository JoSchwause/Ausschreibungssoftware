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

## D-T34 Langtext-Editor: Tabellen-Plugins aus, leere Listen/Tabellen offen
Welle 3 · Ticket 34 · decided by: implementer
Question: prosemirror-tables füllt beim Bearbeiten ungleich lange Zeilen auf (`fixTables`); leere Listen/Tabellen sind im Typ erlaubt, im Schema nicht.
Decision: Tabellen-Plugins abgeschaltet (Tab wechselt nur die Zelle). Leere Liste/Tabelle/Zeile wird nicht erzeugt und als offene Typfrage für `vertrag`/G2 gemeldet, nicht geändert. Übrige Kleinentscheidungen in Ticket 34, Comments.
Reason: Kein stilles Ändern des Langtexts (Q5); `vertrag` ändert nur ein eigenes Ticket (A4).
Reversible: yes  Touches: packages/ui-basis


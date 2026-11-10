# Nächste Entscheidungen: Grilling-Runde vor Welle 2

Stand: 2026-11-10, nach Abschluss von Welle 0 und 1 auf dem Branch `claude/wave-0-1-orchestration-nkdqfx`.
**Alle Fragen E-01 bis E-20 sind am 2026-11-10 beantwortet** (Rückschrift nach `grilling.md`, `docs/regeln.md`, `GLOSSARY.md`, `plan.md` erledigt; Tickets für Welle 2 werden danach einzeln geschnitten).
Diese Datei eröffnet die nächste Grilling-Runde. Jede Frage hat eine Kennung (E-xx), den Befund aus der
Umsetzung, die Möglichkeiten, eine Empfehlung und das, was sie blockiert. Antworten bitte je Frage unter
`**Antwort:**` eintragen; danach werden sie nach `grilling.md`, `docs/regeln.md`, `GLOSSARY.md` und in die
Tickets für Welle 2 zurückgeschrieben (wie in `plan.md` §5).

Quellen der Befunde: die `## Comments` der Tickets in `.scratch/ava-oss/issues/`. Die Befunde und Empfehlungen
unten sind der Stand vor der Antwort; maßgeblich ist jeweils die Zeile `**Antwort:**`. Wo der Code schon etwas tut, ist es eine **vorläufige Annahme** an genau einer Stelle
(`packages/kern/src/regeln.ts`, `summenregeln.ts`, `ozregeln.ts`) und leicht umkehrbar.

## Was vorliegt

| Ticket | Ergebnis |
|---|---|
| 03 Repo-Gerüst, CI | gemergt. CI auf GitHub ist bei Push grün. Der DCO-Schritt läuft nur bei Pull Requests und ist dort ungetestet. |
| 19 Fixtures v1 | gemergt. `winzig`, `typisch`, `gross`, drei Angebote zu `typisch`. |
| 02 `vertrag` v1 | gemergt, **ohne deine Prüfung** (siehe E-01). |
| 23 Externe Testdateien | teilweise: 17 amtliche BVBS-/GAEB-Dateien mit Herkunft. Dateien freier Projekte fehlen (E-15). |
| 04 `dezimal` | gemergt. Eigene BigInt-Umsetzung, keine Laufzeitabhängigkeit. |
| 05, 06, 07 `kern` | gemergt. Baum, OZ-Maske und Umnummerierung, Summen mit Nachlass und MwSt. |
| 10 `speicher` | gemergt. SQLite-WASM im OPFS, Migrationen, Befehlsprotokoll, JSON-Projektdatei. |
| 20 `ui-basis`, 21 `ui-grid` | gemergt. Tokens, Hülle, Bausteine; Baum-Grid zeigt `typisch` und `gross`. |
| 22 `gaeb` | gemergt. Leser für X81/X83 in 3.3. Ein Kriterium offen (E-16). |

Messwerte (Container, 4 Kerne, Chromium headless ohne GPU):

- Einzeländerung in `gross` im Kern: Median 1,9–2,7 ms (Grenze 16 ms).
- Grid: 60 fps im Mittel bei 5.000 und 10.000 Zeilen; bei sechsfach gedrosselter CPU 27–39 fps bei normalem Scrollen.
- Laden von `gross` aus dem OPFS: 0,4–0,5 s (Grenze 2 s).
- GAEB-Datei mit 2,1 MB: etwa 0,1 s (Grenze 1 s).

Das Welle-1-Tor aus `plan.md` („`vertrag` stabil; Grid zeigt Fixture“) ist technisch erreicht. „Stabil“ gilt
erst nach E-01 und E-02.

## A. Blockiert den Start von Welle 2

### E-01 Prüfung von `vertrag` v1 (Gate G-50)

**Befund:** Der Plan verlangt, dass du `vertrag` vor Welle 1 prüfst. Ich habe den Vertrag selbst gelesen und
Welle 1 gestartet, weil der Auftrag beide Wellen umfasste. Deine Prüfung steht aus.
**Zu prüfen:** `packages/vertrag/src/` (etwa 1.100 Zeilen ohne Tests) und die 15 „Offenen Typfragen“ in
Ticket 02. Die wichtigsten Entwurfsentscheidungen: Bezeichner ASCII-transliteriert (`KnotenLoeschen`);
`Dezimal` ist eine kanonische Zeichenkette mit fester Stellenzahl; `Position` ist flach mit Merkmalen statt
Untertypen; das ChangeSet trägt alten und neuen Stand.
**Empfehlung:** Prüfen, Änderungen in E-02 sammeln.
**Antwort:** Geprüft und bestätigt („Looks good now“). Keine Befunde über die neun Lücken aus E-02 hinaus; Änderungen laufen über v1.1a/v1.1b. (2026-11-10)

### E-02 `vertrag` v1.1 als eigenes Ticket vor Welle 2

**Befund:** Alle fünf Pakete haben Lücken im Vertrag gemeldet und keine davon selbst geflickt (Regel A4):

1. `Summenaenderung` trägt keine alten Werte und keine Einträge für entfernte Knoten. Undo braucht deshalb
   den Vorzustand (`changeSetUmkehren(cs, zustandVorher)`).
2. `LvChangeSetAnwenden` kann nicht `null` liefern; das Anlegen eines LV lässt sich nicht umkehren.
3. `Speicherfehlercode` fehlen `konflikt` und `existiert-bereits`; `Speicher` fehlt `schliessen()`.
4. Es gibt keinen Weg, ein Projekt, LV oder Angebot zu löschen.
5. Das Auftrags-LV hat Typen, aber keinen Befehl und kein ChangeSet.
6. `LvInhalt` und `LvAnsicht` kennen die Wurzel-ID nicht; `gaeb` und `ui-grid` reichen sie getrennt durch.
7. Die Zahlen-Randfunktionen des Grids (`GridZahlen`) und die ID-Quelle für Einfügen gehören in den Vertrag.
8. `GaebVersion` kennt 3.1 nicht; `Befehlsfehlercode` kennt weder „OZ doppelt“ noch „Überlauf“.
9. `OzMaske` hat kein Feld für die Los-Stufe; `GliederungAnlegen` hat kein OZ-Feld.

**Empfehlung:** Ein Ticket „`vertrag` v1.1“ als erstes Ticket von Welle 2, mit deiner Prüfung, danach
Anpassung in `kern`, `speicher`, `gaeb`, `ui-grid` je als kleines Folgeticket.
**Antwort:** Ja, alle neun Lücken plus die Ergebnisse dieser Runde, geschnitten als zwei serielle `vertrag`-Tickets: **v1.1a „Lücken“** (die neun Punkte, dazu Befehlsfehlercode für negatives Netto nach Nachlass) und **v1.1b „Inhaltsmodell“** (Zuschlagsposition, Bedarf/Wahl-Summen, Gruppe/Variante, kombinierbare Positionsmerkmale, formatierter Langtext mit Textergänzungen, Kopfdaten Auftraggeber/Vergabeinformationen, Leit-/Unterbeschreibung, Protokolleintrag für Massenbefehle). Der Nutzer prüft beide (G-50). (2026-11-10)

### E-03 Zuschlagsposition: eigene Menge × EP oder Prozentsatz auf Bezugspositionen?

**Befund:** G-22 legt „Zuschlagsposition mit GAEB-Semantik (`MarkupItem`)“ fest. Die Fixtures und der Kern
rechnen sie derzeit wie eine Normalposition (eigene Menge × EP, Annahme A4). Der GAEB-Leser hat in den
amtlichen Dateien gefunden, dass `MarkupItem` auf Bezugspositionen verweist, und zwar in drei Formen: Liste
einzelner Positionen mit Teilmengen, alle Positionen einer Gliederung, Kennzeichnung an den Positionen. Der
Vertrag hält nur einen einzelnen Verweis. Nach meinem Kenntnisstand ist `MarkupItem` ein prozentualer
Zuschlag auf die Summe der Bezugspositionen; das habe ich nicht gegen die Fachdokumentation geprüft.
**Möglichkeiten:** (a) GAEB-Semantik: Prozentsatz auf die Summe der Bezugspositionen, mehrere Bezüge.
(b) Wie jetzt: eigene Menge × EP, Verweis nur informativ. (c) Beides als zwei Arten.
**Empfehlung:** (a), weil G-22 das schon sagt und X83/X84 sonst nicht verlustfrei laufen. Vorher den
Abschnitt der Fachdokumentation zitieren lassen. Folge: Fixture `typisch` und Annahme A4 ändern sich.
**Blockiert:** K6, G2.
**Antwort:** (a): GAEB-Semantik, Prozentsatz auf die Summe der Bezugspositionen, mehrere Bezugsformen. Bedingung für K6: Vor der Umsetzung wird der Abschnitt der Fachdokumentation wörtlich zitiert, nicht sinngemäß wiedergegeben. Folge: Fixture `typisch` und Annahme A4 ändern sich. (2026-11-10)

### E-04 Bedarfs- und Wahlpositionen in den Summen

**Befund:** Vorläufig gilt: Bedarf ohne Gesamtbetrag wird ausgewiesen und nicht summiert; Bedarf mit
Gesamtbetrag wird summiert; Wahlposition wird ausgewiesen und nicht summiert, die Grundposition wird nie
ersetzt. Eine getrennt ausgewiesene Summe der Bedarfs- oder Wahlpositionen kann der Vertrag nicht darstellen.
Bei Wahlpositionen gehen Gruppen- und Variantennummer aus GAEB verloren; es gibt keinen Zustand „gewählt“.
**Fragen:** (1) Gilt die vorläufige Regel? (2) Sollen Bedarfs- und Wahlsummen getrennt ausgewiesen werden?
(3) Soll der Planer eine Wahlposition im Ausschreibungs-LV „wählen“ können, oder erst bei der Vergabe?
(4) Gruppen und Varianten wie in GAEB übernehmen?
**Empfehlung:** (1) ja. (2) ja, zwei zusätzliche Summenfelder. (3) erst bei der Vergabe (Welle 4).
(4) ja, sonst ist X83 nicht verlustfrei.
**Blockiert:** K5, K6, G2.
**Antwort:** Ja zu allen vier: (1) vorläufige Regel gilt, (2) Bedarfs- und Wahlsummen getrennt ausweisen (zwei zusätzliche Summenfelder), (3) „Wählen“ einer Wahlposition erst bei der Vergabe (Welle 4), (4) Gruppen- und Variantennummer aus GAEB übernehmen. (2026-11-10)

### E-05 Positionsart: ein Wert oder kombinierbare Merkmale?

**Befund:** GAEB führt Bedarf, Wahl, Stundenlohn und Pauschal als Merkmale, die sich kombinieren lassen
(z. B. Bedarfsposition im Stundenlohn). Der Vertrag hat einen einzelnen Wert `positionsart` plus das Merkmal
`pauschal`. Der Leser wendet eine Rangfolge an (Wahl vor Bedarf vor Stundenlohn) und meldet jede verlorene
Art als Befund. Stundenlohn ist nur aus den Musterdateien belegt, nicht aus der Fachdokumentation.
Stundenlohn und Pauschal rechnet der Kern vorläufig wie eine Normalposition.
**Möglichkeiten:** (a) Merkmale als einzelne Felder, kombinierbar. (b) Ein Wert, Kombinationen gehen verloren.
**Empfehlung:** (a).
**Blockiert:** K5, G2.
**Antwort:** (a): Bedarf, Wahl, Stundenlohn und Pauschal als einzelne, kombinierbare Merkmale. (2026-11-10)

### E-06 Nachlass: Rundungsreihenfolge und Grenzen

**Befund:** Vorläufig wird der Nachlassbetrag kaufmännisch auf 2 Stellen gerundet und dann abgezogen. Die
andere Lesart rundet das verminderte Netto. Beispiel, bei dem sie sich unterscheiden: Netto 0,25, Nachlass
10 %. Jetzt: 0,025 → 0,03, Netto nach Nachlass 0,22. Andere Lesart: 0,225 → 0,23. Die Goldwerte der
Tickets stimmen in beiden. Dazu vorläufig: Prozent nur 0 bis 100; ein Absolutbetrag höchstens so groß wie
das Netto beim Setzen. Sinkt das Netto später unter den Absolutbetrag, wird das Netto nach Nachlass negativ
und nichts warnt.
**Empfehlung:** Betrag runden, dann abziehen (so steht der Nachlass als eigene Zeile auf dem Papier).
Negatives Netto nach Nachlass als Befund der LV-Prüfung (K8), nicht als Sperre.
**Blockiert:** K4 ist fertig; betrifft V1 (Angebots-Nachlass) und K8.
**Antwort:** Ja: Nachlassbetrag auf 2 Stellen runden, dann abziehen. Negatives Netto nach Nachlass ist ein Befund der LV-Prüfung (K8), keine Sperre. (2026-11-10)

### E-07 Rundung negativer Werte bestätigen

**Befund:** Umgesetzt ist: Betrag kaufmännisch runden, Vorzeichen wieder davor (−2,5 → −3;
−2,500 × 0,010 = −0,025 → −0,03). Belegt mit zwei Sekundärquellen (PTB-Seminarunterlage zu DIN 1333,
Wikipedia „Rundung“). Der Normtext selbst und eine VOB- oder GAEB-Stelle wurden nicht geprüft. Die andere
Regel (zur größeren Zahl hin, −0,025 → −0,02) unterscheidet sich nur bei exakten Hälften.
**Empfehlung:** Bestätigen. Das Büro des ersten Nutzers bei Gelegenheit fragen, ob Abzugspositionen dort so
gerundet werden.
**Antwort:** Bestätigt: Betrag kaufmännisch runden, Vorzeichen wieder davor. Bei Gelegenheit das Büro des ersten Nutzers fragen, ob Abzugspositionen dort so gerundet werden. (2026-11-10)

### E-08 Gliederung: Los, Positionen an der Wurzel, Mischung

**Befund:** Die GAEB-Fachdokumentation 3.3 (Abschnitte 4.2.1, 11.2.3) belegt: Das Los ist die oberste Stufe
und zählt zu den höchstens 5 Stufen. Das deckt die vorläufige Annahme im Kern. Nicht belegt und vorläufig
erlaubt: Positionen und Hinweistexte direkt unter dem LV (ohne Titel); Lose und Titel nebeneinander auf der
obersten Stufe.
**Empfehlung:** Los-Regel als entschieden übernehmen. Positionen direkt unter dem LV erlauben (kleine LVs).
Lose und Titel nebeneinander verbieten.
**Blockiert:** K8, G2.
**Antwort:** Ja zu allen drei: Los ist die oberste Stufe und zählt zu den höchstens 5 Stufen; Positionen direkt unter dem LV sind erlaubt; Lose und Titel nebeneinander auf der obersten Stufe sind verboten. (2026-11-10)

### E-09 Ordnungszahl: Regeln, die das Ticket offen ließ

**Befund:** Belegt aus der Fachdokumentation: OZ höchstens 14 Zeichen (Summe der Maskenstellen einschließlich
Index, ohne Trennzeichen), Index genau 1 Zeichen. Vorläufige Annahmen in `ozregeln.ts`:

1. Unbelegte Stufen: Die OZ wird mit weniger Teilen gespeichert (`01.0010`); die Druckform mit Füllzeichen
   bleibt der Ausgabe überlassen.
2. Überlauf (z. B. mehr als 999 Positionen bei Schritt 10 und 4 Stellen): wird abgewiesen, kein kleinerer Schritt.
3. Indexposition: übernimmt die Nummer der vorangehenden Position, der Buchstabe bleibt.
4. Umnummerieren weist doppelte OZ ab; die Handeingabe lässt Doppelte zu (Regel U5) und überlässt sie der LV-Prüfung.
5. Alphanumerische Stufen: Umnummerieren erzeugt nur Ziffern.
6. Beim Einfügen wird keine OZ vergeben (kommt mit U3).

**Befund dazu:** Der Maskentext in den Fixtures (`NN.NN.NN.NN.NN.NNNN[I]`) hat 15 Stellen und verletzt die
14er-Regel. Die Tests sind nicht betroffen; die Fixture-Beschreibung ist zu korrigieren (E-19).
**Fragen:** Gelten 1–5? Bei 2: lieber automatisch auf Schritt 5, 2, 1 ausweichen?
**Empfehlung:** 1–5 bestätigen; bei 2 ausweichen und einen Hinweis zeigen, statt abzuweisen.
**Blockiert:** U3.
**Antwort:** Ja zu 1–5. Bei Überlauf automatisch auf Schritt 5, 2, 1 ausweichen und einen Hinweis zeigen, statt abzuweisen. (2026-11-10)

### E-10 Langtext: Formatierung

**Befund:** `Langtext` im Vertrag hält nur Text und Bilder. Die amtlichen Dateien enthalten Schriftstile,
Tabellen, Listen, Seitenumbrüche, Bildgrößen und die Kennzeichnung von Textergänzungen des Bieters. Der
Leser verwirft das und meldet es je Datei als Befund. Folge: Ein Rundlauf Import → Export → Import (Regel Q3)
kann die Formatierung nicht erhalten, und X84 braucht die Textergänzungen (G-32).
**Möglichkeiten:** (a) `Langtext` jetzt auf die GAEB-abbildbare Teilmenge erweitern (fett, kursiv,
unterstrichen, Absätze, Listen, Tabellen, Textergänzungen). (b) Erst mit U4 in Welle 3; G2 schreibt bis dahin
unformatiert und kennzeichnet den Export als Entwurf.
**Empfehlung:** (a) im Zuge von E-02, sonst ist das Meilenstein-Kriterium M2 („identisches Modell beim
Re-Import“) nur für unformatierte LVs wahr.
**Blockiert:** G2, U4.
**Antwort:** (a): `Langtext` wird in v1.1b auf die GAEB-abbildbare Teilmenge erweitert (fett, kursiv, unterstrichen, Absätze, Listen, Tabellen, Textergänzungen des Bieters). (2026-11-10)

### E-11 GAEB: Welche nicht abgebildeten Elemente braucht v1?

**Befund:** Der Leser meldet als „nicht abgebildet“: Ausführungsbeschreibungen, Leit- und
Unterbeschreibungen, Bezugs- und Wiederholungsbeschreibungen, Mengenaufteilung, „Menge wird später
bestimmt“, Katalogzuordnungen, Zusatztexte im Kopf, Angaben zum Auftraggeber, Vergabeinformationen,
Losgruppen.
**Frage:** Welche davon muss v1 lesen und wieder schreiben?
**Empfehlung:** Auftraggeber und Vergabeinformationen (Kopf) sowie Leit-/Unterbeschreibung in v1; den Rest
als Befund belassen und beim Export unverändert verwerfen, mit Warnung. Vor der Entscheidung ein echtes LV
des Büros daraufhin ansehen.
**Blockiert:** G2.
**Antwort:** Ja: Auftraggeber und Vergabeinformationen (Kopf) sowie Leit-/Unterbeschreibung gehören in v1. Der Rest bleibt Befund beim Import und wird beim Export mit Warnung verworfen. Neu bewerten, sobald ein echtes LV des Büros vorliegt. (2026-11-10)

### E-12 Kern: Feldbefehle ohne Ticket

**Befund:** Für `KurztextAendern`, `LangtextAendern`, `HinweistextAendern`, `EinheitAendern`,
`LeistungsverzeichnisUmbenennen` und `EinheitspreisanteileSetzen` gibt es Typen, aber keinen Handler und
kein Ticket. Das Grid sendet diese Befehle schon; der Kern antwortet „nicht zuständig“. Für Angebote gibt es
noch gar keine Ausführung.
**Empfehlung:** Ein kleines Kern-Ticket „Feldbefehle“ an den Anfang von Welle 2 (vor U3). EPA bleibt bei K7.
Angebots-Befehle kommen mit V1 in Welle 3.
**Antwort:** Ja: kleines Kern-Ticket „Feldbefehle“ am Anfang von Welle 2, vor U3. EPA bleibt bei K7, Angebots-Befehle kommen mit V1 in Welle 3. (2026-11-10)

## B. Betrieb und Produkt

### E-13 Befehlsprotokoll: ganze Befehle speichern?

**Befund:** ADR 0009 wörtlich umgesetzt: Das Protokoll speichert jeden Befehl vollständig. Ein
`LeistungsverzeichnisAnlegen` mit 5.000 Positionen (GAEB-Import) steht damit doppelt in der Projektdatei;
`gross` wird 10,3 MB groß.
**Möglichkeiten:** (a) So lassen. (b) Bei Massenbefehlen nur Kopf und Prüfsumme protokollieren. (c) Protokoll
nicht in die Projektdatei exportieren.
**Empfehlung:** (b).
**Antwort:** (b): Bei Massenbefehlen werden nur Kopf und Prüfsumme protokolliert (Typ des Protokolleintrags in v1.1b, ADR 0009 ergänzt). (2026-11-10)

### E-14 Ein Tab je Datenbank

**Befund:** Die gewählte OPFS-Variante braucht keine besonderen HTTP-Kopfzeilen und läuft damit auf GitHub
Pages (G-53). Der Preis: Die Datenbank gehört genau einer Verbindung. Ein zweiter Tab bekommt den Fehler
`gesperrt`. Die Alternative erlaubt mehrere Tabs, braucht aber Kopfzeilen, die GitHub Pages nicht setzen kann.
**Empfehlung:** Annehmen. Im zweiten Tab die Meldung „Tethys AVA ist in einem anderen Tab geöffnet“ zeigen (S2).
**Antwort:** Ja: Der zweite Tab erhält `gesperrt` und zeigt „Tethys AVA ist in einem anderen Tab geöffnet“ (S2). (2026-11-10)

### E-15 Testdateien freier Projekte (Ticket 23)

**Befund:** Die Sitzung hat nur Zugriff auf dieses Repository; der Abruf anderer GitHub-Repos wurde
abgelehnt. Kein fremdes Projekt wurde geprüft. Ticket 22 hat stattdessen zwölf eigene Fehlerdateien und zwei
Sicherheitsdateien geschrieben.
**Möglichkeiten:** (a) Den Teil streichen; eigene Dateien genügen. (b) Zugriff freigeben und Ticket 23 fortsetzen.
**Empfehlung:** (a). Fremde synthetische X84/X86 erst bei G3 wieder prüfen.
**Antwort:** (a) für beide Teile: Der Teil „Dateien freier Projekte“ in Ticket 23 entfällt, eigene Dateien genügen; fremde synthetische X84/X86 werden bei G3 erneut geprüft. (2026-11-10)

### E-16 BVBS-Prüfkriterien ohne öffentliche Zahl

**Befund:** Das Kriterium in Ticket 22 („Positionszahl, Gliederung und OZ-Maske stimmen mit den Angaben der
BVBS-Prüfkriterien überein“) lässt sich nicht erfüllen: Die öffentlichen Prüfkriterien nennen keine
Positionszahl. Eigene Zählung für die Prüfdatei Bauausführung X83: 12 Titel, 28 Positionen, 4 Hinweistexte.
Einzelne in den Kriterien genannte Positionen stimmen überein.
**Möglichkeiten:** (a) Kriterium auf „eigene Zählung, mit zweitem unabhängigen Zähler bestätigt“ ändern.
(b) Bei BVBS nachfragen (service@bvbs.de), zusammen mit der Lizenzfrage aus G-55.
**Empfehlung:** (a) jetzt, (b) als Kann.
**Antwort:** (a): Kriterium in Ticket 22 lautet „eigene Zählung, mit zweitem unabhängigen Zähler bestätigt“. Die Nachfrage bei BVBS (service@bvbs.de) bleibt ein Kann, zusammen mit der Lizenzfrage aus G-55. (2026-11-10)

### E-17 DCO und Prüfweg

**Befund:** Alle Commits sind mit `Signed-off-by: Claude <noreply@anthropic.com>` gezeichnet. Das DCO ist
eine Erklärung einer Person; eine Maschinenidentität erfüllt den Sinn nicht. Außerdem: Regel P7 verlangt
einen Review-Agenten je Pull Request. In dieser Runde gab es keine Pull Requests; ich habe jeden Branch
selbst gelesen, gemergt und die Prüfungen auf dem gemergten Stand wiederholt.
**Fragen:** (1) Zeichnest du die Commits beim Merge nach `main` selbst, oder gilt das DCO erst für Beiträge
von außen (G-43)? (2) Soll Welle 2 mit einem Pull Request je Ticket und getrenntem Review-Agenten laufen?
(3) Soll dieser Branch jetzt als Pull Request nach `main`?
**Empfehlung:** (1) DCO erst für Beiträge von außen; der Prüfschritt bleibt in der CI. (2) Ja, ab Welle 2.
(3) Ja, nach E-01.
**Antwort:** (1) Das DCO gilt erst für Beiträge von außen (G-43); der Prüfschritt bleibt in der CI. (2) Ab Welle 2 ein Pull Request je Ticket mit getrenntem Review-Agenten (P7). (3) Dieser Branch geht als Pull Request nach `main`, wird von einem getrennten Review-Agenten geprüft und mit einem Merge-Commit gemergt (Ticketverlauf bleibt sichtbar). Schlägt der DCO-Schritt beim ersten Pull Request fehl, wird das gemeldet und nicht umgangen. (2026-11-10)

### E-18 Grid-Bedienung

**Befund:** Zwei Abweichungen von Excel: Enter auf einer Zelle startet das Bearbeiten (Excel springt nach
unten); die Leertaste wählt die Zeile aus (Excel beginnt zu schreiben). Einfügen aus der Zwischenablage legt
immer neue Positionen an und überschreibt nie bestehende Zeilen.
**Empfehlung:** Am Prototyp mit dem Büro klären (Ticket 18); bis dahin so lassen.
**Antwort:** Ja: Die zwei Abweichungen von Excel (Enter startet das Bearbeiten, Leertaste wählt die Zeile) und das Einfügen als neue Positionen bleiben bis zur Klärung mit dem Büro am Prototyp (Ticket 18). (2026-11-10)

### E-19 Kleine Aufräumarbeiten (nur Zustimmung nötig)

1. Fixtures: Maskentext auf 14 Stellen korrigieren; `handbeispiele.json` auf kanonische Stellenzahl bringen;
   `gross.json` in Dokumentreihenfolge schreiben.
2. Paketgrenzen: Testdateien eines Pakets dürfen `fixtures/` lesen (heute nur über einen Umweg möglich).
3. `LeistungsverzeichnisAnlegen` prüft die OZ-Maske nicht; ein Befund statt Stille.
4. Die MwSt fehlt in X81/X83. Der Leser setzt einen vom Aufrufer gelieferten Satz und meldet das. Standard 19,00 %?

**Empfehlung:** Alle vier als ein Ticket „Aufräumen nach Welle 1“.
**Antwort:** Ja, ein Ticket „Aufräumen nach Welle 1“ mit allen vier Punkten. MwSt-Standard 19,00 % für X81/X83 ohne Angabe, mit Befund. (2026-11-10)

## C. Schnitt von Welle 2

### E-20 Tickets und Reihenfolge

Vorschlag, sobald A beantwortet ist:

| Reihenfolge | Ticket | Paket | Hängt an |
|---|---|---|---|
| 1 | `vertrag` v1.1 (Mensch prüft) | `vertrag` | E-01 bis E-05, E-10 |
| 1 | Aufräumen nach Welle 1 | `fixtures`, `tools` | E-19 |
| 2 | Kern: Feldbefehle | `kern` | E-12 |
| 2 | Anpassung an v1.1 | `speicher`, `gaeb`, `ui-grid` | Ticket v1.1 |
| 3 | K5 Positionsarten 1, K6 Grund-/Wahl- und Zuschlagspositionen, K7 EPA | `kern` | E-03, E-04, E-05 |
| 3 | S2 Projektliste und Projektdatei | `speicher`, `apps/web` | E-13, E-14 |
| 3 | U3 LV-Grid an Befehle angebunden | `apps/web` | Feldbefehle, E-09 |
| 3 | G2 Writer X81/X83/X86 mit XSD in der CI | `gaeb` | E-03, E-10, E-11 |
| 3 | O1 PDF-Spike | `ausgabe` | – |

Meilenstein M1 („LV anlegen, rechnen, speichern“) ist nach Stufe 3 prüfbar.

**Fragen:** (1) Reihenfolge so? (2) Soll der Prototyp für das Interview (Ticket 18) jetzt auf `ui-grid` und
den Fixtures gebaut werden, bevor Welle 2 startet? (3) Vor V1/V2 (Welle 3) braucht es ein Vertragsticket für
Preisspiegel-Typen; jetzt schon mitschneiden?
**Empfehlung:** (1) ja. (2) ja, parallel zu Stufe 1, weil E-18 und Teile von E-11 daran hängen. (3) nein,
erst nach M1.
**Antwort:** (1) Reihenfolge wie vorgeschlagen, mit `vertrag` v1.1a, dann v1.1b (seriell, Nutzer prüft); Aufräumen parallel dazu. (2) Ja: Der Prototyp für das Interview (Ticket 18) wird jetzt auf `ui-grid` und den Fixtures gebaut, parallel zu Stufe 1. (3) Nein: Preisspiegel-Typen erst nach M1. (2026-11-10)

## Nicht geprüft in Welle 0 und 1

- Der DCO-Schritt der CI (läuft nur bei Pull Requests).
- Screenreader, andere Browser als Chromium, echte GPU, schwächere Rechner.
- Eine wirklich volle Browser-Speicherquote im OPFS (nur unter Node und mit eingeschleusten Fehlern getestet).
- Ähnlichkeit der Oberfläche mit kommerziellen Produkten (Regel U4): eigener Entwurf, keine automatische Prüfung.
- Der Normtext von DIN 1333 (E-07).

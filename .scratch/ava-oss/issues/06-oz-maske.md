# 06: OZ-Maske, OZ-Vergabe und Umnummerierung (K3)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: K · Paket: `packages/kern`
Blocked by: 05
Regeln: A2, A5, A6, A7, G-25, Q1

## What to build

OZ-Maske **je LV frei definierbar** (G-25): Stellen je Gliederungsstufe, numerisch oder alphanumerisch, Index-Stelle;
ein GAEB-Import übernimmt eine abweichende Maske (nur Typ hier, Import später). Vergabe: Gliederung +1, Positionen
+10, führende Nullen. Umnummerierung eines Teilbaums als Befehl mit ChangeSet. Die OZ ist **Anzeigedatum**, nie Schlüssel (A7):
Umnummerieren ändert keine ID. Obergrenze der OZ-Länge richtet sich nach der GAEB-Regel (max. 14 Zeichen; in Fachdokumentation 3.3 belegen und zitieren).

## Acceptance criteria

- [x] Standardmaske `NN.NN.NNNN[.A]` und eine abweichende Maske (z. B. `1122PPPPI` aus der GAEB-Dokumentation) sind getestet
- [x] Umnummerierung liefert für alle Knoten des Teilbaums neue OZ; IDs bleiben gleich (Property-Test)
- [x] Ungültige Eingaben (zu lange OZ, unzulässige Zeichen, Maske mit 0 Stellen) werden abgewiesen
- [x] Eine Maskenänderung erzeugt ein ChangeSet mit allen betroffenen Knoten, nie einen stillen Teilstand
- [x] Zitat der GAEB-Fachdokumentation für die Längenregel im Ticket (Seite oder Abschnitt)

## Nicht-Ziele

Maske aus GAEB lesen (G1), Einfügen mit Autonummer in der Oberfläche (U3).

## Comments

### Ergebnis (Branch `worktree-agent-ac81a98c8088464c8`)

Geliefert in `packages/kern/src/`. `pnpm lint`, `pnpm typecheck`, `pnpm test` laufen grün (Vitest 31 Dateien, 664 Tests, 1 übersprungen aus Ticket 05;
Node-Tests der Fixtures 10/10). Test-first: erst `oz.test.ts`, `oz-eigenschaften.test.ts`, `oz-fixtures.test.ts` (eigener Commit), dann der Code.
`vertrag`, `dezimal`, `gaeb`, `fixtures` unverändert.

**Wo die Regeln stehen**

| Datei             | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ozregeln.ts`     | ALLE Regeln zu Maske und OZ: `OZ_MAX_LAENGE` (14), `OZ_INDEX_LAENGE` (1), `GLIEDERUNG_SCHRITT` (1), `POSITION_SCHRITT` (10), `maskeFehler` (exportiert als `ozMaskeFehler`), `stellenFuer`, `ozZusammensetzen`, `ozZerlegen`, `teilFehler`, `indexFehler`, `ozFehler`, `nummerAls`, `gliederungsTeil`, `positionsTeil`, `doppelteOrdnungszahlen` (reine Hilfe für die formale Prüfung), `OZ_ANNAHMEN` |
| `oz-befehle.ts`   | Handler `OzMaskeSetzen`, `OrdnungszahlSetzen`, `Umnummerieren` (nur Ablauf, keine Regel)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `ausfuehren.ts`   | drei Handler eingetragen, drei Schlüssel aus `ZUSTAENDIGES_TICKET` gelöscht                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `index.ts`        | neu exportiert: `ozMaskeFehler`, `ozFehler`, `doppelteOrdnungszahlen`, `DoppelteOrdnungszahl`, `OZ_MAX_LAENGE`, `OZ_INDEX_LAENGE`, `GLIEDERUNG_SCHRITT`, `POSITION_SCHRITT`, `OZ_ANNAHMEN`                                                                                                                                                                                                                                                                                                                 |

`baum.test.ts` (Ticket 05) wurde angepasst: die drei OZ-Befehle sind dort nicht mehr „nicht zuständig“.

**Zitat der GAEB-Fachdokumentation (selbst geprüft)**

Quelle: `Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf` (GAEB DA XML 3.3, Ausgabe 2021-05,
<https://www.gaeb.de/wp-content/uploads/2021/07/Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf>). Ich habe das PDF abgerufen, mit `pdftotext` ausgelesen und die Stellen
im Text gefunden (Seitenzahlen sind PDF-Seiten):

- **Abschnitt 4.2.1 „Ordnungszahl (OZ)“, S. 23:** Die OZ hat höchstens 14 Stellen und besteht aus den Stellen der Hierarchiestufen, der Positionsnummer und (falls vorhanden)
  einem einstelligen Index; sie muss im LV eindeutig und aufsteigend sein. Erlaubte Zeichen: Leerzeichen, Ziffern, Groß- und Kleinbuchstaben, Unterstrich (keine Umlaute, kein ß);
  0, Leerzeichen und Unterstrich nur zusammen mit anderen zugelassenen Zeichen. Der Index ist einstellig und alphanumerisch. Das Los belegt die oberste Stufe; insgesamt höchstens
  5 Stufen einschließlich Los.
- **Abschnitt 4.3.3, S. 25:** Die gesamte OZ darf höchstens 14 Stellen lang sein; mit Index bleiben für den Positionszähler 13 Stellen, ohne Index 14.
- **Abschnitt 4.3.4, S. 26:** Niedrigere Stufen dürfen unbelegt bleiben; im Druckbild muss die OZ dann unverwechselbar lesbar sein (Beispiel: „\_“ für die ausgelassene Stufe).
- **Abschnitt 11.2.3, Objekt BoQInfo Regeln 2, 5, 6 und BoQBkdn Regel 2, S. 77:** Die Summe der Längen aller Teilschlüssel (Stufen, Position, Index) ist höchstens 14; die Position
  kommt genau einmal vor; vor der Position höchstens fünf Stufen (oder Los plus vier Stufen); der Index hat Länge 1.
- **Abschnitt 11.4, S. 85:** das Muster `11.22.33.44.5.PPPP.I` (2+2+2+2+1+4+1 = 14 Stellen). Daraus die Testmaske „FD-Muster“.

Die Längenregel zählt damit die Stellen der **Maske** (ohne Trennzeichen) einschließlich Index; eine Maske mit mehr als 14 Stellen ist `maske-ungueltig`. Die Befunde aus Ticket 22
sind damit selbst bestätigt, nicht nur übernommen.

**Verhalten**

- `Umnummerieren(teilbaumId)`: das LV oder eine Gliederung. Die Nachfahren bekommen neue OZ (Gliederung je Geschwister +1, Positionen +10, führende Nullen, Zähler je Elternknoten,
  Stufe `i` der Maske für die Gliederung der Stufe `i`); Hinweistexte tragen keine OZ und zählen nicht mit. Das ChangeSet nennt genau die Knoten, deren OZ sich ändert (Vorordnung),
  `summen` leer, `kopf` `null`. Ein schon kanonischer Baum ergibt ein leeres ChangeSet (`lvChangeSetAnwenden` gibt dasselbe Objekt zurück).
- `OzMaskeSetzen`: ein ChangeSet mit `kopf` (alte und neue Maske) und allen Knoten, deren OZ sich ändert. Alles oder nichts: ungültige Maske oder ein Knoten, der unter der neuen Maske
  keine OZ bekommen kann, ergibt einen Fehlerwert (`maske-ungueltig`, nennt den Knoten) und keine Änderung. Dieselbe Maske noch einmal: leeres ChangeSet.
- `OrdnungszahlSetzen`: prüft Gesamtlänge, Teilzahl (richtet sich nach der Stufe des Knotens im Baum), Länge und Zeichen je Teil, Index. Fehler `oz-ungueltig` mit Knoten und Feld.
  `null` löscht die OZ. Kein `ozIndex` ohne OZ, kein Index an einer Gliederung, kein Index bei einer Maske ohne Indexstelle. **Eindeutigkeit wird nicht erzwungen** (U5: Validierung
  blockiert nie die Eingabe); `doppelteOrdnungszahlen(knoten)` listet doppelte OZ (mit Index) für die formale LV-Prüfung.
- Fehlercodes: `maske-ungueltig` (Maske, Überlauf, zu tiefer Knoten, Index passt beim Umnummerieren nicht zur Maske), `oz-ungueltig` (Handeingabe, Teilbaumwurzel ohne gültige OZ, neu
  vergebene OZ würde doppelt), `knoten-unbekannt`, `knotenart-unzulaessig`, `befehl-nicht-zustaendig` (ohne Zustand).
- **Neue Knoten:** `PositionAnlegen` und `GliederungAnlegen` lassen `ordnungszahl` wie geliefert beziehungsweise `null`. Automatische Nummer beim Einfügen ist Nicht-Ziel (U3) und nicht
  umgesetzt (ein Test hält es fest).
- Keiner der Befehle ändert eine ID, die Struktur oder Summen (Property-Tests).

**Vorläufige Annahmen, Entscheidung offen (P5; je eine benannte Funktion oder Konstante in `ozregeln.ts`, Text in `OZ_ANNAHMEN`)**

a. **Volle OZ** (`ozZusammensetzen`): Teile aller Gliederungs-Vorfahren und der eigene Teil, mit dem Trennzeichen verbunden (`01.01.0010`), Index nicht enthalten. Folgt den Fixtures und
dem GAEB-Leser (Ticket 22).
b. **Unbelegte Stufen** (`stellenFuer`): FD 3.3, 4.3.4 erlaubt sie ausdrücklich und fordert nur eine unverwechselbare **Druck**darstellung. Der Kern speichert die OZ mit weniger Teilen
(`01.0010`, wie Fixture `typisch` und Leser); die Darstellung mit „\_“ ist Sache der Ausgabe. Die Maske zerlegt eine OZ über Teilzahl (mit Trennzeichen) oder Gesamtlänge (ohne),
das ist eindeutig, weil jede Stelle mindestens 1 lang ist. Knoten **tiefer** als die Maske Stufen hat werden nicht nummeriert: `maske-ungueltig` mit Knoten (Umnummerieren,
OzMaskeSetzen) bzw. `oz-ungueltig` (OrdnungszahlSetzen).
c. **Überlauf** (`nummerAls`): passt `Geschwisterzahl × Schritt` nicht in die Stellen, wird abgewiesen (`maske-ungueltig`, nennt den Knoten). Beispiel bei 4 Stellen: die 999. Position
bekommt 9990, die 1000. wäre 10000 und wird abgewiesen. Kein Rückfall auf kleinere Schritte, nie abgeschnitten oder doppelt.
d. **`ozIndex`** bleibt beim Umnummerieren unverändert. Weil `fixtures/typisch` es so zeigt (`02.0050` und `02.0050` mit Index A; `02.0070` ebenso), teilt eine Position mit `ozIndex`
den Grundteil der nächsten vorhergehenden Position unter demselben Elternknoten und verbraucht keinen Zähler (Hinweistexte dazwischen zählen nicht). Ohne vorhergehende Position
bekommt sie einen eigenen Grundteil. Passt der Index nicht zur Maske (keine Indexstelle, falsche Länge oder Zeichen) oder träfen zwei gleiche Buchstaben auf denselben Grundteil, wird
abgewiesen. Ob ein Index „Wahl- oder Zuschlagsposition der Bezugsposition“ bedeutet (Fixture-Annahme A10), ist offen und dem Kern gleich.
e. **Hinweistexte** tragen keine OZ und zählen nicht.
f. **Alphanumerische Stufen:** Umnummerieren erzeugt nur Ziffern; `OrdnungszahlSetzen` darf in alphanumerischen Stellen `[0-9A-Za-z_]` setzen. Das Leerzeichen, das FD 3.3 zulässt, ist
nicht zugelassen (restriktiv).
g. **Nur-Füllzeichen-Teile** (`teilNurFuellzeichen`): Ein Teil nur aus „0“, Leerzeichen und „\_“ wird abgewiesen. Das ist meine Lesart des Satzes in FD 3.3, 4.2.1 („nur in Verbindung
mit anderen zugelassenen Zeichen“), der sich auch anders lesen lässt. Restriktiv, ohne Datenmigration lockerbar. Folge: der erste Zähler ist 1, nie 0.
h. **Trennzeichen** (`maskeFehler`): `null` oder genau ein Zeichen, das in keinem Teil vorkommen darf (kein `[0-9A-Za-z_]`, kein Leerzeichen). GAEB überträgt keins.
i. **Teilbaumwurzel:** `Umnummerieren(teilbaumId)` ändert die OZ der Wurzel nicht; sie muss gültig sein (liefert die Vorsilben), sonst `oz-ungueltig`. Beim LV selbst sind es alle Knoten.
j. **Eindeutigkeit beim Umnummerieren:** abgewiesen, wenn eine neu vergebene OZ (mit Index) auf eine bestehende außerhalb des Teilbaums träfe oder innerhalb doppelt entstünde. Strenger
als `OrdnungszahlSetzen` (dort nur die Hilfe `doppelteOrdnungszahlen`).
k. **Los:** Das Los belegt die oberste Stufe und eine Stelle von `OzMaske.gliederung` (FD 3.3, 4.2.1 und 11.2.3 stützen das; `LOS_ANNAHME` aus Ticket 05 bleibt formal „vorläufig“).
Der Kern liest sie nur über `ebenenbeitrag`; kippt sie (Los zählt nicht), muss `oz-befehle.ts` für ein Los ohne Stufe angepasst werden (heute `maske-ungueltig`).
l. **Maske eines bestehenden LV:** `LeistungsverzeichnisAnlegen` prüft die Maske nicht (Import blockiert nie, U5; Ticket 05 unverändert). Eine unzulässige Maske fällt erst bei
`OzMaskeSetzen` oder `Umnummerieren` auf. Das gehört eher in die formale LV-Prüfung.

Kein Punkt war ohne restriktive, umkehrbare Lesart; kein `needs-info` nötig.

**Fixtures (`oz-fixtures.test.ts`)**

- `winzig`, `typisch` mit der Maske `NN.NN.NNNN[.A]` (zwei Stufen, zulässig; beide Fixtures haben nur eine Titelstufe, also eine unbelegte Stufe 2): Umnummerieren des Baums mit seiner
  OZ liefert ein leeres ChangeSet; mit gelöschter OZ entsteht für jeden Knoten **exakt** die OZ der Fixture, einschließlich der beiden Indexpositionen in `typisch`.
- `gross` (5.610 Knoten, fünf Stufen): fünf Stufen zu je zwei Ziffern, Position vier Ziffern, **ohne Index** (14 Stellen): ebenso, 5.605 Knoten mit OZ, exakt gleich der Fixture.
- **Befund zu den Fixtures:** Der Maskentext der Fixtures (`NN.NN.NN.NN.NN.NNNN[I]`: fünf Stufen, Position, Index) hat 15 Stellen und verletzt die GAEB-Regel (höchstens 14, FD 3.3,
  11.2.3 BoQInfo Regel 2). Der Kern weist diese Maske ab (`OzMaskeSetzen` ergibt `maske-ungueltig`, Test). `gross` braucht den Index nicht, `typisch` nutzt nur eine Stufe. Die Fixtures
  sind eingefroren; das Fixture-README und `fixtures-abbildung.test.ts` in `vertrag` könnten die Maske auf 14 Stellen anpassen. Ebenso hat `standardMaske` in `testhilfen.ts` 15 Stellen
  (nur Tests von Ticket 05 und 07; `LeistungsverzeichnisAnlegen` prüft die Maske nicht).

**Messung** (`oz-fixtures.test.ts`, Richtwert, kein Gate; vier Läufe): alle 5.610 Knoten von `gross` umnummerieren, Befehl ausführen + `lvChangeSetAnwenden` (5.605 geänderte OZ):
Median **8,0 / 7,9 / 8,5 / 10,0 ms** (Spanne 5,9 bis 11,9 ms), davon der Befehl allein 4,1 bis 6,6 ms. `OzMaskeSetzen` (Maske ohne Trennzeichen, ganzer Baum): Median 8,0 bis 10,5 ms.

**Property-Tests** (`oz-eigenschaften.test.ts`, fast-check, 150 bis 300 Läufe je Test): zufällige Bäume aus Baumbefehlen (Titel bis Stufe 5, Indexpositionen, Hinweistexte, Verschieben,
Löschen) unter zwei Fünf-Stufen-Masken (mit und ohne Trennzeichen, eine alphanumerische Stufe). IDs, Struktur und Array-Reihenfolge bleiben; `summen` dasselbe Objekt;
`Summenaenderung` leer; OZ gleich einem unabhängigen Orakel; alle OZ (mit Index) eindeutig und der Baumordnung folgend; das ChangeSet nennt genau die geänderten Knoten; Anwenden plus
Umkehrung stellt den Vorzustand exakt her; Umnummerieren eines kanonischen Baums ist leer; ein Teilbaum ändert nur Nachfahren; Maskenwechsel hin und zurück ergibt den Ausgangszustand;
eine zu flache Maske ergibt `maske-ungueltig` mit Knoten und keinen Teilstand.

**Lücken im Vertrag (nicht geändert, nicht umgangen)**

- `OzMaske` hat kein Feld für die Los-Stufe; das Los belegt eine Stelle von `gliederung` (Annahme k). Der Typkommentar nennt die Frage weiter „offen“.
- `Befehlsfehlercode` hat keinen eigenen Code für „würde doppelte OZ erzeugen“ oder „Überlauf“; beides läuft über `oz-ungueltig` beziehungsweise `maske-ungueltig` mit Meldung und Knoten.
- `OrdnungszahlSetzen.knotenId` ist `GliederungId | PositionId`; ein Hinweistext oder die LV-Wurzel kann zur Laufzeit trotzdem ankommen und wird mit `knotenart-unzulaessig`
  beziehungsweise `knoten-unbekannt` abgewiesen.
- `GliederungAnlegen` hat weiter kein Feld für die OZ (Ticket 05); Gliederungen entstehen mit `null` und bekommen ihre OZ durch `Umnummerieren` oder `OrdnungszahlSetzen`.

**Abweichungen vom Auftrag:** keine.

# Nächste Entscheidungen: Zwischenstand Welle 2

Stand: 2026-11-10, nach Stufe 1 von Welle 2. Die Welle ist **nicht** abgeschlossen: Sie wartet auf die Prüfung der
beiden Vertragstickets (P9). Diese Datei sammelt, was bis dahin entschieden werden kann. Jede Frage hat eine Kennung
(W-xx), den Befund, die Möglichkeiten, eine Empfehlung und das, was sie blockiert. Antworten bitte unter
`**Antwort:**` eintragen. Die Runde vor Welle 2 (E-01 bis E-20) steht unverändert in `next-decisions.md`.

## Was vorliegt

| Ticket | Ergebnis |
|---|---|
| 25 Aufräumen nach Welle 1 | gemergt (PR #3). Fixtures mit Masken bis 14 Stellen, `gross` in Dokumentreihenfolge, Testdateien dürfen Fixtures lesen, Maskenprüfung im Kern, MwSt-Standard 19,00 % im GAEB-Leser, zweiter BVBS-Zähler bestätigt 12/28/4. |
| 27 Kern: Feldbefehle | gemergt (PR #5). Fünf Befehle, minimale ChangeSets, umkehrbar. |
| 28 O1-Spike PDF | gemergt (PR #6). Paket `ausgabe` mit pdfmake (Weg A) und Druck-HTML (Weg B). Keine ADR. |
| 18 Prototyp Interview | gebaut, Branch `proto/interview` (nicht in `main`). Interview steht aus. |
| 24 `vertrag` v1.1a | PR #4, Review-Agent durch, CI grün. **Wartet auf die Prüfung des Nutzers.** |
| 26 `vertrag` v1.1b | PR #7, gestapelt auf #4, Review-Agent durch. **Wartet auf die Prüfung des Nutzers.** |

Messwerte PDF (Container, 4 Kerne, Chromium headless ohne GPU, Median aus 7 Läufen, Maschine unter Last von
anderen Agenten, Werte daher eher zu hoch): `gross` mit 5.000 Positionen über pdfmake im Browser 2,9 s und 1,42 MB,
270 Seiten; über den Druckweg des Browsers ohne Tags 3,8 s und 1,53 MB, mit Tags 9,8 s und 15,0 MB.

Tore, die ohne den Nutzer passiert wurden: keine. Die nicht vertraglichen Pull Requests (#2, #3, #5, #6) hat der
Orchestrator nach Review-Agent und grüner CI gemergt, wie am 2026-11-10 freigegeben.

## A. Blockiert den Rest von Welle 2

### W-01 Prüfung von `vertrag` v1.1a (PR #4)

**Befund:** Elf Punkte, Prüfleitfaden im Ticket 24. Offene Typfragen A bis I dort. Die wichtigsten:
(A) `Summenaenderung.vorher` ist optional; bis der Kern es füllt, ist ein ChangeSet weiter nur mit dem Vorzustand
umkehrbar. (B) Hinweise stehen am ChangeSet, nicht in einer Antworthülle. (C) Löschen ohne Kaskade. (D) Kein
Löschbefehl für das Auftrags-LV. (H) Die LV-Kennung steht in `LeistungsverzeichnisAnlegen.id`, `inhalt.wurzelId`
und in den `elternId` der obersten Knoten; vorläufig gewinnt `id`, eine Abweichung wird abgewiesen. Dazu: „Netto
nach Nachlass negativ“ ist ein Hinweiscode, kein Fehlercode (Abweichung vom Wortlaut von E-02, wegen E-06 und N5).
**Empfehlung:** So annehmen; (A) im Folgeticket `kern` füllen und danach zur Pflicht machen.
**Blockiert:** Anpassung `kern`, `speicher`, `gaeb`, `ui-grid`; S2; U3.
**Antwort:**

### W-02 Prüfung von `vertrag` v1.1b (PR #7)

**Befund:** Sieben Punkte, Prüfleitfaden im Ticket 26. Nicht rein mechanisch waren zwei Eingriffe außerhalb von
`vertrag`: Im Kern entfällt die Prüfung „Merkmal nur bei passender Art“ (der Kern nimmt bis K5/K6 jede Kombination
an; Formprüfungen bleiben). In `speicher` schreibt der Export Positionen über eine Übergangsfunktion
(`projektdateiInAlterForm`) in der Form von Schema 1; Daten, die die alten Spalten nicht halten, werden abgewiesen,
nicht verworfen. Eine Textergänzung ist nur auf der obersten Ebene eines Langtexts erlaubt (so in der amtlichen
BVBS-Datei gesehen).
**Fragen:** (1) Vertrag so annehmen? (2) Gruppe und Variante der Wahlposition `null`-fähig lassen? (3) Wohin mit dem
Zuschlagssatz des Bieters aus X84 (hat in `Angebotsposition` keinen Platz)? (4) Befehle zum Bearbeiten von
Auftraggeber, Vergabeinformationen und Leitbeschreibung jetzt oder mit U4?
**Empfehlung:** (1) ja. (2) ja. (3) mit G3 (Welle 3), eigenes kleines Vertragsticket. (4) mit U4.
**Blockiert:** K5–K7, G2, S2 (Protokolleintrag für Massenbefehle).
**Antwort:**

### W-03 Ausnahme von P2 für Vertragstickets

**Befund:** Ein Vertrags-Pull-Request kann für sich nur grün sein, wenn er andere Pakete nachzieht. Tickets 24 und
26 durften das „rein mechanisch“. Bei v1.1a blieb es klein (zehn Stellen). Bei v1.1b wurden es rund 600 Zeilen in
fünf Paketen, darunter die zwei Eingriffe aus W-02.
**Möglichkeiten:** (a) So beibehalten, mit Liste „nicht rein mechanisch“ im Ticket. (b) Vertragsänderungen, die
Verbraucher brechen, künftig als ein Ticket „Vertrag plus Anpassung“ schneiden und so nennen. (c) Vertrag nur
additiv ändern und alte Felder eine Welle lang stehen lassen.
**Empfehlung:** (b), weil es ehrlicher benennt, was geschieht; Regel P2 entsprechend ergänzen.
**Blockiert:** den Schnitt künftiger Vertragstickets (Preisspiegel-Typen nach M1).
**Antwort:**

## B. Produkt und Betrieb

### W-04 PDF: getaggtes (barrierefreies) PDF in v1?

**Befund:** pdfmake setzt bei `tagged` nur die Kennzeichen, schreibt aber keinen Strukturbaum. Der Druckweg des
Browsers schreibt echte Tags, bei zehnfacher Dateigröße und 2,6-facher Dauer, und liefert der App keine PDF-Bytes
(Speichern nur über den Druckdialog). Andere Bibliotheken wurden nicht geprüft. U8 nennt Tastatur und Kontrast,
nicht das PDF.
**Möglichkeiten:** (a) pdfmake, ungetaggt, in v1. (b) Druckweg des Browsers mit Tags. (c) Vor der ADR eine zweite
Bibliothek mit Strukturbaum prüfen lassen (kleiner Spike).
**Empfehlung:** (a) für v1, als ADR 0012 festhalten; (c) vor O3 nachholen, falls ein Auftraggeber Tags verlangt.
**Blockiert:** O1 (Welle 4), nicht M1.
**Antwort:**

### W-05 Vorläufige Annahmen aus Stufe 1 bestätigen

1. Maskentext der Fixtures: `winzig` und `typisch` `NN.NN.NNNN[I]`, `gross` `NN.NN.NN.NN.NN.NNNN` ohne Index.
2. Ein leerer Kurztext und ein leerer LV-Name sind erlaubt; Längen, Zeichen und Einheiten prüft erst K8.
3. Die Einheit `''` ist ein anderer Wert als `null` (das Grid sendet nur `null`).
4. Der GAEB-Leser meldet `mwst-standardsatz` ohne gelieferten Satz und weiter `mwst-ersatzwert` mit Satz.
5. Ein `harness/`-Ordner eines Pakets zählt bei den Paketgrenzen als Testdatei.
6. Ausdruck: Positionen, die nicht in die Summe eingehen, zeigen den GP in Klammern; Bedarfs- und Wahlsummen
   fehlen im Ausdruck noch (F4, kommt mit O1).

**Empfehlung:** alle bestätigen; zu 3 im Vertrag festlegen, dass `''` beim Befehl zu `null` wird.
**Antwort:**

### W-06 Interview mit dem Büro (Ticket 18)

**Befund:** Der Prototyp läuft (`pnpm --filter @proto/interview start` auf dem Branch `proto/interview`), elf
Varianten, Werte gegen eine unabhängige Rechnung geprüft. Dem Grid fehlen: Position anlegen ohne Zwischenablage,
Zeile löschen und verschieben, Undo, OZ für eingefügte Positionen, Nachlass und MwSt in der Summenzeile bearbeiten.
Im Preisspiegel gilt vorläufig: Ausreißer bei mehr als 20 % Abstand vom Mittel der Bieter (GP, geprüfter Bieter
eingeschlossen), Rang nach Netto nach Nachlass. Ein angebotener Preis von 0,00 zieht das Mittel so weit herunter,
dass alle Bieter der Position als Ausreißer erscheinen.
**Fragen:** Wann findet das Interview statt? Soll die Ausreißer-Regel bei einem Preis von 0,00 anders rechnen
(z. B. Median statt Mittel)?
**Empfehlung:** Interview vor U3; die Ausreißer-Frage dem Büro am Prototyp zeigen und vor V2 entscheiden.
**Blockiert:** E-18 (Grid-Bedienung), V2.
**Antwort:**

## C. Schnitt der nächsten Stufen

Sobald W-01 beantwortet und PR #4 gemergt ist (je ein Pull Request, höchstens 8 Agenten):

| Stufe | Ticket | Paket | Hängt an |
|---|---|---|---|
| 2 | Anpassung `kern` an v1.1a (füllt `summen.vorher`, Löschen, Hinweise, Maskenbefund am Befehl) | `kern` | W-01 |
| 2 | Anpassung `speicher` an v1.1a (`konflikt`, Löschen, Auftrags-LV, `schliessen`) | `speicher` | W-01 |
| 2 | Anpassung `gaeb` an v1.1a (`wurzelId`, 3.1, `losStufe`) | `gaeb` | W-01 |
| 2 | Anpassung `ui-grid` an v1.1a (`GridZahlen`, `wurzelId`, Hinweise) | `ui-grid` | W-01 |
| 3 | K5 Positionsmerkmale, K6 Wahl- und Zuschlagspositionen (Fachdokumentation wörtlich zitieren), K7 EPA | `kern` | W-02 |
| 3 | S2 Projektliste und Projektdatei, mit Migration auf Schema 2 (ersetzt die Übergangsfunktion) | `speicher`, `apps/web` | W-02 |
| 3 | U3 LV-Grid an Befehle angebunden | `apps/web` | Anpassung `ui-grid`, W-06 |
| 3 | G2 Writer X81/X83/X86, XSD in der CI | `gaeb` | W-02 |

## Nicht geprüft in Stufe 1

- PDF: Firefox und Safari, Speicherbedarf, Web Worker, bytegleiche Ausgabe, der echte Druckdialog, andere
  Bibliotheken. Vom Layout wurden nur zwei Seiten von `typisch` als Bild angesehen.
- pdfmake 0.3.14 ist zwei Tage alt (erste Version, die Schriften als Bytes annimmt); fest auf diese Version gesetzt.
- Der Prototyp: nur vier der elf Varianten hat der Orchestrator als Bild angesehen; die Tastaturprüfung stammt aus
  dem Skript des Agenten.
- `pnpm e2e` lief für v1.1b nur beim Review-Agenten und nur mit von Hand gesetztem Browser-Pfad; in der CI läuft es.
- Ob GAEB eine Textergänzung je in einer Liste oder Tabellenzelle führt.

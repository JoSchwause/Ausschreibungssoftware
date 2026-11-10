# 24: `vertrag` v1.1a „Lücken“ (**Mensch prüft vor Merge**)

Status: ready-for-human (umgesetzt, PR #4; wartet auf die Prüfung des Nutzers, P9)
Type: task
Welle: 2 · Strang: F · Paket: `packages/vertrag`
Blocked by: -
Regeln: A2, A4, A5, A6, A7, L1, L2, N1, N3, P2, P9
Herkunft: E-02 (neun Lücken), E-06, E-09 (`next-decisions.md`)

## What to build

Der Vertrag bekommt die neun Lücken geschlossen, die Welle 1 gemeldet hat, dazu zwei Fehlercodes. **Nur Typen,
Konstanten und Kommentare**; keine Logik. Das Inhaltsmodell (Zuschlagsposition, Merkmale, Langtext, Kopfdaten)
ist **nicht** Teil dieses Tickets, sondern von Ticket 26 (v1.1b).

Vor dem Entwurf lesen: „Offene Typfragen“ in Ticket 02 und die `## Comments` der Tickets 05, 06, 07, 10, 21, 22
(dort steht je Lücke, was das meldende Paket braucht und wie es sich heute behilft).

1. **Summen umkehrbar.** `Summenaenderung` trägt alte und neue Werte und nennt die Summen entfernter Knoten, so dass
   sich ein `LvChangeSet` ohne Vorzustand umkehren lässt (heute `changeSetUmkehren(cs, zustandVorher)` im Kern).
2. **LV-Anlegen umkehrbar.** `LvChangeSetAnwenden` kann `null` liefern (das Aggregat verschwindet).
3. **Speicher.** `Speicherfehlercode` bekommt `konflikt` und `existiert-bereits`; `Speicher` bekommt `schliessen()`.
4. **Löschen.** Ein Weg, Projekt, LV und Angebot zu löschen: Befehle und die Darstellung im ChangeSet. Löschen ist
   unumkehrbar im Sinne von Q5; der Vertrag muss tragen, was Undo oder LV-Stand zum Wiederherstellen brauchen.
5. **Auftrags-LV.** Befehl(e) und ChangeSet für das Auftrags-LV, nur soweit, dass es als Aggregat angelegt und
   gespeichert werden kann (`AggregatBezug` kennt es schon). Der Zuschlag selbst ist Welle 4.
6. **Wurzel-ID.** `LvInhalt` und `LvAnsicht` kennen die Wurzel-ID; `gaeb` und `ui-grid` reichen sie heute getrennt durch.
7. **Grid-Ränder.** Die Zahlen-Randfunktionen des Grids (heute `GridZahlen` in `ui-grid`) und die ID-Quelle für das
   Einfügen stehen als Schnittstellen im Vertrag (`gaeb` nennt schon eine `IdQuelle`; es gibt danach genau eine).
8. **Codes.** `GaebVersion` kennt `3.1`. `Befehlsfehlercode` kennt „OZ doppelt“ (Umnummerieren weist Doppelte ab, F2)
   und „Überlauf der Ordnungszahl“ (nur wenn auch Schritt 1 nicht reicht; das Ausweichen auf 5, 2, 1 ist kein
   Fehler, sondern ein Hinweis, siehe Nummer 10).
9. **OZ.** `OzMaske` hat ein Feld für die Los-Stufe (F1: das Los ist die oberste Stufe und zählt zu den 5).
   `GliederungAnlegen` hat ein OZ-Feld.
10. **Hinweise und Befunde aus Befehlen.** Ein angenommener Befehl kann Hinweise mitliefern (F2: bei Überlauf weicht
    die Vergabe auf Schritt 5, 2, 1 aus „und zeigt einen Hinweis“; N5: negatives Netto nach Nachlass ist „ein Befund,
    keine Sperre“). Der Vertrag braucht dafür einen Ort im Ergebnis eines Befehls und einen stabilen Code für
    „Netto nach Nachlass negativ“. Kein Fehlercode, der den Befehl abweist. **Abweichung vom Wortlaut von E-02**
    („Befehlsfehlercode für negatives Netto“): E-06 und N5 sagen „Befund, keine Sperre“; deshalb ein Befundcode.
11. **Maskentext im Test.** Der Maskentext mit 15 Stellen in `fixtures-abbildung.test.ts` wird auf 14 Stellen
    korrigiert, passend zu Ticket 25 (das `vertrag` nicht anfassen darf).

## Grenzen

- **Additiv, wo es geht.** Der ganze Baum bleibt grün (`pnpm lint`, `pnpm typecheck`, `pnpm test`). Wo eine Änderung
  ein anderes Paket am Übersetzen hindert (neues Pflichtfeld, erschöpfende `switch`), ist in diesem Ticket
  **ausnahmsweise** die kleinste rein mechanische Anpassung in diesem Paket erlaubt: kein neues Verhalten, keine
  neue Regel, jede Stelle mit `// v1.1a: mechanisch angepasst, Folgeticket` markiert und unter `## Comments`
  aufgelistet. Alles darüber hinaus gehört in die Folgetickets (Anpassung `kern`, `speicher`, `gaeb`, `ui-grid`).
- Neue Fachbegriffe zuerst ins `GLOSSARY.md` (L2). Bezeichner ASCII-transliteriert wie bisher.
- Keine Preisspiegel-Typen (E-20: erst nach M1).
- Was sich aus den Tickets nicht entscheiden lässt, wird nicht geraten: als „Offene Typfrage“ in die Comments, mit
  der engen, leicht umkehrbaren Lesart im Typ.

## Acceptance criteria

- [ ] Jede der elf Nummern oben ist im Vertrag abgebildet; die Comments nennen je Nummer Datei und Typ
- [ ] `beispiele.ts` und `vertrag.test.ts` zeigen je Nummer ein Beispiel (Typtest oder Beispielwert); `fixtures-abbildung.test.ts` bleibt grün
- [ ] Ein Typtest belegt: Aus einem `LvChangeSet` allein (ohne Zustand) sind alle Angaben für die Umkehrung ablesbar, auch für Summen und entfernte Knoten
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün auf dem ganzen Baum
- [ ] Liste aller mechanischen Anpassungen außerhalb von `vertrag` in den Comments (Datei, Zeile, was)
- [ ] Je Folgepaket (`kern`, `speicher`, `gaeb`, `ui-grid`) eine kurze Liste in den Comments: was dort jetzt anzupassen ist
- [ ] `GLOSSARY.md` enthält jeden neuen Fachbegriff

## Nicht-Ziele

Inhaltsmodell (Ticket 26), Logik in `kern`/`speicher`/`gaeb`/`ui-grid`, Preisspiegel-Typen, Undo-Umsetzung (S3).

## Comments

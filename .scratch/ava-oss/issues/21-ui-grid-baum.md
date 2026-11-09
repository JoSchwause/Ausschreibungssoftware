# 21: `ui-grid`: virtualisiertes Baum-Grid auf Fixture-Daten (U2)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: U · Paket: `packages/ui-grid` (einziger Schreiber)
Blocked by: 02, 03, 19, 20
Regeln: U1, U2, U3, U5, A3, Q4, G-33

## What to build

Die **eine** gemeinsame Grid-Komponente (U2) auf TanStack Table mit Virtualisierung und **eigener** Baum- und
Editierlogik (ADR 0004; AG Grid ist wegen Lizenz verworfen). Baut gegen Fixtures, **bevor `kern` fertig ist**:
Die Komponente kennt nur Zeilen und Spalten aus `vertrag` und gibt Änderungen als Befehle aus (A5), sie rechnet nie selbst.
Funktionen: Auf-/Zuklappen, Inline-Bearbeitung von Kurztext, Menge, Einheit, EP, Summenzeile, Tastaturnavigation
wie in Excel (Pfeile, Tab, Enter, F2, Escape), Mehrfachauswahl, Einfügen aus der Excel-Zwischenablage (nur Parsen
und Befehle erzeugen). Zeigt Prüfhinweise je Zelle, **sperrt aber nie** (U5). Die Anzeige von Summen kommt als Wert
von außen; bis K4 fertig ist, aus den Sollwerten der Fixtures.

## Acceptance criteria

- [ ] `fixtures/typisch` wird als Baum angezeigt, aufklappbar; Sollsummen aus der Fixture erscheinen in der Summenzeile
- [ ] `fixtures/gross` (5.000 Zeilen) scrollt flüssig: Playwright-Messung mit mindestens 50 fps im Mittel oder Dokumentation des Messwerts; Ziel 10.000 Zeilen (G-33, Messung ins Ticket)
- [ ] Jede Grid-Aktion ist per Tastatur erreichbar (U3); Playwright-Test: Zelle bearbeiten, Tab/Enter, Escape verwirft
- [ ] Bearbeiten gibt einen `Befehl` aus; das Grid hält keinen zweiten Wahrheitszustand (Test mit Attrappen-Handler)
- [ ] Einfügen von 5 Zeilen aus der Zwischenablage (Tab/Zeilen getrennt, deutsche Zahlen) erzeugt 5 Befehle; ungültige Zellen werden markiert, nicht verworfen
- [ ] Das Grid importiert nur `vertrag` und `ui-basis` (A3, CI-geprüft)
- [ ] Keine zweite Grid-Implementierung im Repo (U2)

## Nicht-Ziele

Anbindung an `kern` und Speicher (U3), Positionsdialog und Rich-Text (U4), Zwischenablage mit Kopieren/Verschieben im Baum (U5), Preisspiegel-Ansicht (V3).

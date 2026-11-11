# @tethys/ui-grid

Das eine gemeinsame Grid (U2) für LV, Preisspiegel, Aufmaß und Kosten. Vollständig gesteuert: Zeilen, Spalten und
Summen kommen als Eigenschaften herein (`LvGridProps`), jede Änderung geht als Befehl hinaus (A5). Das Grid rechnet
nie, vergibt keine Ordnungszahlen und erzeugt keine Kennungen; die bekommt es über `ids` (`GridIdQuelle`).

Browser-Testseite: `pnpm --filter @tethys/ui-grid exec vite` (Parameter in `e2e/harness/main.tsx`), Tests:
`pnpm --filter @tethys/ui-grid e2e`.

## Tastenhilfe

Tastatur zuerst (U3, U8). Strg steht auf dem Mac für Cmd.

### Bewegen und Auswählen

| Taste                          | Wirkung                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| Pfeiltasten                    | Zelle wechseln                                                   |
| Pos1 / Ende                    | erste / letzte Zelle der Zeile                                   |
| Strg+Pos1 / Strg+Ende          | erste / letzte Zelle des Grids                                   |
| Bild auf / Bild ab             | eine Seite nach oben / unten                                     |
| Tab / Umschalt+Tab             | nächste / vorige Zelle; am Anfang und Ende verlässt Tab das Grid |
| Umschalt+Pfeil, Umschalt+Klick | Zeilenauswahl erweitern                                          |
| Leertaste, Strg+Klick          | Zeile in die Auswahl aufnehmen oder herausnehmen                 |
| Strg+A                         | alle Zeilen auswählen                                            |
| Escape                         | Ausschneiden abbrechen; sonst Auswahl auf die aktive Zeile       |

### Bearbeiten

| Taste                  | Wirkung                                              |
| ---------------------- | ---------------------------------------------------- |
| Enter, F2, Doppelklick | Zelle bearbeiten                                     |
| Strg+Enter             | Zeile öffnen (nur mit `onZeileOeffnen`, Ticket 54)   |
| Zeichen tippen         | Bearbeiten beginnt mit diesem Zeichen                |
| Enter / Umschalt+Enter | im Eingabefeld: übernehmen, Zelle darunter / darüber |
| Tab                    | im Eingabefeld: übernehmen, nächste Zelle            |
| Escape                 | im Eingabefeld: Eingabe verwerfen                    |
| Entf                   | Zelle leeren                                         |

### Gliederung

| Taste                    | Wirkung                                      |
| ------------------------ | -------------------------------------------- |
| Pfeil rechts / links     | in der Baumspalte: aufklappen / zuklappen    |
| Alt+Pfeil rechts / links | überall in der Zeile: aufklappen / zuklappen |

### Zeilen (Ticket 46)

| Taste                                    | Wirkung                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Strg+C                                   | ausgewählte Zeilen (sonst die aktive) als Tabelle (TSV) kopieren, Zahlen in de-DE    |
| Strg+X                                   | wie Strg+C, die Zeilen sind bis zum Einfügen als „ausgeschnitten“ markiert           |
| Strg+V                                   | einfügen hinter der aktiven Zeile, siehe unten                                       |
| Strg+Minus, Strg+Entf                    | Zeilen nach Rückfrage in den Papierkorb legen (Enter bestätigt, Escape bricht ab)    |
| Alt+Pfeil hoch / runter                  | Zeilen um eine Stelle unter ihren Geschwistern verschieben; am Rand geschieht nichts |
| Strg+Plus (US-Tastatur: Strg+Umschalt+=) | leere Position hinter der aktiven Zeile anlegen und ihren Kurztext fokussieren       |

„Hinter der aktiven Zeile“ heißt bei einer Gliederung: als erstes Kind (wie überall im Vertrag, `Einfuegeort`).

Strg+V unterscheidet nach dem Text der Zwischenablage:

- **Eigener Text** (genau der zuletzt vom Grid geschriebene): nach Strg+X ein `KnotenlisteVerschieben`, nach Strg+C ein
  Aufruf von `onKopieEinfuegen` (die App baut `KnotenEinfuegen`, verlustfrei mit Langtext und Unterknoten). Fehlt
  `onKopieEinfuegen`, legt das Grid neue Positionen an, spaltengenau ab der ersten Spalte.
- **Fremder Text** (Excel): eine neue Position je Zeile ab der aktiven Spalte; ungültige Zahlen bleiben markiert, nichts
  wird überschrieben. Eine einzelne Zelle ersetzt den Inhalt der aktiven Zelle.

Mehrere Befehle aus einem Einfügen gehen als eine Folge über `onBefehlsfolge` hinaus (ein Undo-Schritt), sonst einzeln
über `onBefehl`. Kurze Ansagen („2 Zeilen kopiert.“) stehen in der Live-Region unter dem Grid.

## Weitere Eigenschaften

- `onAktiveZeileChange(knotenId | null)`: meldet die Zeile der aktiven Zelle, sobald sie sich ändert (auch beim ersten
  Rendern, beim Fokus per Tab und wenn die Zeile aus der Ansicht verschwindet); `null` im leeren LV.
- `onZeileOeffnen(knotenId, spalte)`: Strg+Enter auf einer Zelle oder Doppelklick auf eine Zelle, die sich nicht
  bearbeiten lässt (z. B. OZ, Art, GP; im schreibgeschützten Grid jede Zelle). Ein Doppelklick auf eine bearbeitbare
  Zelle bearbeitet sie weiter. Das Grid meldet jede Zeilenart, die App entscheidet. Ohne die Eigenschaft bearbeitet
  Strg+Enter wie Enter.
- `schreibgeschuetzt`: Nur-Lese-Grid (LV-Stand, Auftrags-LV). Ohne `ids`, `onBefehl` und die übrigen Befehlsrückrufe
  (der Typ verbietet sie). Kein Zelleditor, kein Befehl, keine Zeilenaktion außer Strg+C; Navigation, Auswahl,
  Auf-/Zuklappen, Sprungziel und Zeile öffnen bleiben. Das Grid trägt `aria-readonly` und eine Beschreibung; ein
  Änderungsversuch (F2, Tippen, Entf, Strg+X/V/Minus/Plus, Alt+Pfeil) wird in der Live-Region angesagt.
- `positionenZaehlen(knotenIds)`: genaue Zahl der Positionen samt zugeklappter Unterknoten für die Rückfrage beim
  Löschen; ohne die Eigenschaft zählt das Grid die sichtbaren Zeilen und sagt „mindestens“.

- `vorPositionAnlegen`: ergänzt den Befehl von Strg+Plus (z. B. die OZ), bevor er hinausgeht.
- `sprungziel`: `{ knotenId, spalte?, nr }`; jeder neue Wert von `nr` scrollt zur Zeile und fokussiert die Zelle. Liegt
  die Zeile unter einer zugeklappten Gliederung, tut das Grid nichts (das Aufklappen gehört der App).

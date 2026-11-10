# 21: `ui-grid`: virtualisiertes Baum-Grid auf Fixture-Daten (U2)

Status: resolved (gemergt 2026-11-10, Branch claude/wave-0-1-orchestration-nkdqfx)
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

- [x] `fixtures/typisch` wird als Baum angezeigt, aufklappbar; Sollsummen aus der Fixture erscheinen in der Summenzeile
- [x] `fixtures/gross` (5.000 Zeilen) scrollt flüssig: Playwright-Messung mit mindestens 50 fps im Mittel oder Dokumentation des Messwerts; Ziel 10.000 Zeilen (G-33, Messung ins Ticket)
- [x] Jede Grid-Aktion ist per Tastatur erreichbar (U3); Playwright-Test: Zelle bearbeiten, Tab/Enter, Escape verwirft
- [x] Bearbeiten gibt einen `Befehl` aus; das Grid hält keinen zweiten Wahrheitszustand (Test mit Attrappen-Handler)
- [x] Einfügen von 5 Zeilen aus der Zwischenablage (Tab/Zeilen getrennt, deutsche Zahlen) erzeugt 5 Befehle; ungültige Zellen werden markiert, nicht verworfen
- [x] Das Grid importiert nur `vertrag` und `ui-basis` (A3, CI-geprüft)
- [x] Keine zweite Grid-Implementierung im Repo (U2)

## Nicht-Ziele

Anbindung an `kern` und Speicher (U3), Positionsdialog und Rich-Text (U4), Zwischenablage mit Kopieren/Verschieben im Baum (U5), Preisspiegel-Ansicht (V3).

## Comments

**Umsetzung (Branch `worktree-agent-ad55595869d7eae46`)**

Alles in `packages/ui-grid`. `vertrag`, `ui-basis`, `apps/web` und Root-Konfiguration sind unverändert (nur `pnpm-lock.yaml` durch pnpm).

- `src/LvGrid.tsx` (Komponente), `Zeile.tsx` (memoisierte Zeile, reine Darstellung), `Editor.tsx` (Eingabefeld in der Zelle), `tabelle.ts` (Spaltenmodell auf TanStack Table), `eingabe.ts` (Text ↔ Befehl, reine Logik), `einfuegen.ts` (Zwischenablage → Befehle), `tsv.ts` (Excel-Text-Parser), `navigation.ts` (Zellnavigation), `typen.ts` (öffentliche Typen), `texte.ts` (deutsche Texte), `grid.css` (nur Tokens aus `ui-basis`).
- TanStack Table **v9** (`@tanstack/react-table` 9.3.1): liefert Spalten-, Kopf-, Zeilen- und Zellenmodell und die Spaltenbreiten (`columnSizingFeature`). Weil `LvAnsicht.zeilen` schon der sichtbare, flache Baum ist, gibt es keine Aufklapp-Features in TanStack; Baum, Auswahl, Bearbeiten und Tastatur sind eigene Logik (ADR 0004). TanStack Virtual (`@tanstack/react-virtual` 3.14) virtualisiert die Zeilen (feste Zeilenhöhe 28 px, `scrollMargin` für den klebenden Kopf).
- Browser-Testseite: `e2e/harness/` (eigene Vite-Konfiguration `vite.config.ts`, eigene `playwright.config.ts`, Skript `e2e` in der `package.json`). Sie spielt die Rolle der App: hält Zustand, baut aus den Fixtures die `LvAnsicht` (Summen aus den Sollwerten, nichts berechnet) und nimmt Befehle entgegen. Parameter: `fixture`, `kopien`, `auf`, `thema`, `modus=attrappe|live`, `befunde=1`.

**Schnittstelle (`LvGridProps`, `src/typen.ts`)**

| Eigenschaft | Bedeutung |
|---|---|
| `ansicht: LvAnsicht` | Zeilen, Summenzeile. Aufgeklappt/zugeklappt steht in `zeile.aufgeklappt`. Einziger Datenweg hinein. |
| `spalten?: LvSpalte[]` | Reihenfolge der Spalten, Standard alle sieben. |
| `zahlen: GridZahlen` | Ränder zu `dezimal` (N4), siehe unten. Pflicht. |
| `ids: Pick<IdQuelle, 'position'>` | Kennungen für eingefügte Positionen. Das Grid erzeugt nie selbst Kennungen (A2). Pflicht. |
| `onBefehl: BefehlsEmpfaenger` | Jede Änderung, jede eingefügte Zeile: genau ein `LvBefehl`. |
| `onAufklappen?(knotenId, aufgeklappt)` | Wunsch zum Auf-/Zuklappen. Der Zustand gehört dem Aufrufer. |
| `onAuswahlChange?(knotenIds)` | Zeilen-Mehrfachauswahl, in Anzeigereihenfolge. |
| `wurzelId?: ElternId` | Ort für das Einfügen in ein leeres LV. |
| `beschriftung?`, `baumspalte?` (Standard `kurztext`), `zeilenhoehe?` (Standard 28) | Name des Grids, Spalte mit Einzug und Knopf, Zeilenhöhe. |

`GridZahlen` (Parser und Formatierer, die die App an `dezimal` anschließt; Tests und Testseite reichen Attrappen aus `e2e/harness/attrappen.ts`):

```ts
interface GridZahlen {
  parseMenge(text: string): Ergebnis<Menge, string>; // getrimmter, nicht leerer de-DE-Text; Fehler = deutsche Meldung
  parseEinheitspreis(text: string): Ergebnis<Einheitspreis, string>;
  formatMenge(wert: Menge): string; // Anzeige und Startwert im Eingabefeld, muss sich parsen lassen
  formatEinheitspreis(wert: Einheitspreis): string;
  formatBetrag(wert: Betrag): string; // GP, Titelsummen, Summenzeile
}
```

Leerer Text wird im Grid zu `null` (Menge, EP, Einheit leeren), erreicht den Parser nie. Das Grid vergleicht Werte nur als Zeichenketten auf Gleichheit und rechnet nie (A5, N1).

**Vorschlag für `vertrag` (nicht umgesetzt, `vertrag` ist für dieses Ticket gesperrt):** `GridZahlen` (als `ZahlenRand` o. Ä.) gehört in `vertrag/ansicht.ts`, damit `dezimal` sie erfüllen kann und die App sie ohne Umweg verdrahtet; ebenso ein Typ für die Kennungsquelle des Grids. Heute liegen die Typen in `ui-grid`. Weitere Lücken im Vertrag: (1) `LvAnsicht` kennt die Wurzel-ID des LV nicht, darum die zusätzliche Eigenschaft `wurzelId`. (2) Keine Zahl der Geschwister je Knoten, daher kein `aria-setsize`/`aria-posinset` an den Zeilen. (3) `Pruefbefund.ort.feld` ist ein freier String; das Grid ordnet Befunde über die Namen aus `LvSpalte` zu, ein Befund ohne passendes `feld` steht an der ersten Spalte. Das sollte im Vertrag festgeschrieben werden.

**Tastaturbelegung (U3)**

| Taste | Wirkung |
|---|---|
| Pfeile, Pos1/Ende, Strg+Pos1/Strg+Ende, Bild auf/ab | Zelle wechseln (Bild auf/ab: eine Seite, gleiche Spalte); Auswahl folgt der aktiven Zeile |
| Umschalt+Pfeil/Bild/… | Zeilenauswahl vom Anker bis zur Zielzeile erweitern |
| Tab / Umschalt+Tab | nächste/vorherige Zelle, am Zeilenende in die nächste Zeile; am Anfang/Ende des Grids verlässt der Fokus das Grid (kein Tastaturfang) |
| F2, Enter | Zelle bearbeiten (Enter auf nicht bearbeitbarer Zelle: eine Zeile nach unten) |
| Zeichen tippen | beginnt die Eingabe mit diesem Zeichen (ersetzt den Inhalt) |
| im Eingabefeld: Enter / Umschalt+Enter | bestätigen und nach unten/oben |
| im Eingabefeld: Tab / Umschalt+Tab | bestätigen und nach rechts/links |
| im Eingabefeld: Escape | verwerfen, Fokus zurück in die Zelle |
| Mausklick auf eine andere Zelle | bestätigt die Eingabe (Fokusverlust) |
| Entf | Zelle leeren (Menge, EP, Einheit → `null`; Kurztext → leer) |
| Pfeil rechts / links in der Baumspalte | aufklappen / zuklappen (sonst normale Zellbewegung) |
| Alt+Pfeil rechts / links | aufklappen / zuklappen aus jeder Spalte |
| Leertaste | Zeile in die Auswahl aufnehmen/herausnehmen |
| Strg+A | alle sichtbaren Zeilen auswählen |
| Strg+V | Einfügen (siehe unten) |
| Maus: Klick, Strg+Klick, Umschalt+Klick, Doppelklick, Klick auf den Pfeil | wählen, umschalten, Bereich, bearbeiten, auf-/zuklappen |

Bearbeitbar: `kurztext` (Gliederung und Position), `menge`, `einheit`, `einheitspreis` (nur Positionen). Ordnungszahl, Art, Gesamtpreis und Hinweistexte sind schreibgeschützt (`aria-readonly`): Ordnungszahl ist Sache der OZ-Befehle (Ticket 06), Rich-Text Sache von Ticket 22 (Nicht-Ziel).

**ARIA und Fokus**

`role="treegrid"` mit `aria-rowcount` (Zeilen + Kopf), `aria-colcount`, `aria-multiselectable`; Kopf als `rowgroup` mit `columnheader`; Zeilen mit `aria-rowindex` (Kopf = 1), `aria-level`, `aria-expanded` (nur bei Zeilen mit Unterknoten), `aria-selected`; Zellen `gridcell` mit `aria-colindex`, `aria-readonly`, `aria-invalid` und `aria-describedby` für Prüfhinweise. Roving tabindex: genau eine Zelle hat `tabindex=0`. Die aktive Zelle wird über die Knotenkennung geführt (bleibt am Knoten, wenn Zeilen davor dazukommen oder wegfallen). Die aktive Zeile steht dank eigenem `rangeExtractor` immer im DOM, auch wenn sie aus dem Sichtbereich scrollt: Der Fokus geht beim Scrollen nicht verloren und das Grid bleibt per Tab erreichbar. Nach Navigation scrollt `scrollToIndex` (mit Rand für den klebenden Kopf) die Zeile ins Bild.

**Semantik des Einfügens (Strg+V, nur Parsen und Befehle erzeugen)**

- Parser `tsv.ts`: Tab und Zeilenumbruch (`\n`, `\r\n`), zitierte Zellen mit Zeilenumbruch, Tab und `""` wie von Excel; abschließender Zeilenumbruch ergibt keine leere Zeile; leere Zellen und leere Zeilen bleiben erhalten.
- **Eine Zelle** (1×1): wirkt wie eine Eingabe in die aktive Zelle (ein Befehl wie `MengeAendern`).
- **Mehr als eine Zelle**: Der Block liegt wie in Excel ab der aktiven Spalte über den sichtbaren Spalten. **Jede eingefügte Zeile ergibt genau einen Befehl `PositionAnlegen`**, die erste mit `{ art: 'nach', knotenId: <aktive Zeile> }`, jede weitere `nach` der zuvor angelegten (Reihenfolge bleibt). Bestehende Zeilen werden nie überschrieben (Q5: nichts geht still verloren; Rückgängig = die neuen Knoten wieder entfernen). Im leeren LV: erste Zeile `{ art: 'ende', elternId: wurzelId }`. Kennungen kommen aus `ids.position()`. Neue Positionen: Art `normal`, keine Ordnungszahl (Vergabe ist Sache von `kern`/OZ-Befehlen), leerer Langtext.
- Zellen in schreibgeschützten Spalten (Ordnungszahl, Art, Gesamtpreis) und rechts der letzten Spalte werden übersprungen und in der Statusmeldung gezählt.
- **Ungültige Zellen werden markiert, nicht verworfen:** Lehnt der Parser einen Mengen- oder EP-Text ab, entsteht die Position trotzdem (Feld `null`), und das Grid merkt sich `{ Text, Meldung, Anzeigetext zum Zeitpunkt }` als flüchtige Markierung am Schlüssel `Knoten|Spalte`. Die Zelle zeigt dann den Originaltext rot, mit Warnsymbol, `aria-invalid` und der Meldung als Beschreibung. Das ist kein zweiter Wahrheitszustand: Die Markierung gilt nur, solange der Anzeigetext der Zelle (aus den Eigenschaften) dem gemerkten entspricht; ändert sich der Wert über neue Eigenschaften oder eine gültige Eingabe, ist sie hinfällig. Dasselbe gilt für eine ungültige Eingabe im Eingabefeld: kein Befehl, Eingabe bleibt sichtbar markiert, erneutes Bearbeiten beginnt mit dem abgelehnten Text. Nichts sperrt (U5).
- Statusmeldung (`role="status"`): z. B. „5 Positionen eingefügt, 1 Zelle ungültig (markiert).“
- Im Eingabefeld gilt das übliche Einfügen von Text.

**Leistung (Q4, G-33), gemessen**

Umgebung: Headless-Chromium 158 (Playwright, `/opt/pw-browsers/chromium`), Linux-Container, 4 Kerne, keine GPU (Software-Rasterung), Viewport 1440×900, Skalierung 1, Produktions-Build der Testseite (`vite build`, nicht der Entwicklungsmodus), 60-Hz-Takt der Headless-Bildsteuerung. Messung (`e2e/leistung.spec.ts`): Das Skript schiebt `scrollTop` des Grids mit gleichbleibender Geschwindigkeit, ein `requestAnimationFrame`-Zähler hält den Abstand aller Bilder fest (5 s, nach 1,5 s Aufwärmen). Zusätzlich zählt der Test, in wie vielen Bildern sich die gerenderten Zeilen ändern, und prüft am Ende, dass sie zur Scrollposition passen (das Grid arbeitet wirklich). Zwei Geschwindigkeiten: 5.600 px/s (200 Zeilen/s, zügiges Lesen) und 28.000 px/s (1.000 Zeilen/s, schneller Wisch).

| Fall | Geschwindigkeit | Bilder | Mittel | schlechtestes Bild | p95 |
|---|---|---|---|---|---|
| `gross`, 5.610 Zeilen (5.000 Positionen) | 5.600 px/s | 301 | 60 fps | 16,8 ms | 16,7 ms |
| `gross`, 5.610 Zeilen | 28.000 px/s | 301 | 60 fps | 16,8 ms | 16,7 ms |
| `gross` ×2, 11.220 Zeilen (10.000 Positionen) | 5.600 px/s | 301 | 60 fps | 16,8 ms | 16,8 ms |
| `gross` ×2, 11.220 Zeilen | 28.000 px/s | 301 | 60 fps | 16,8 ms | 16,7 ms |

Über mehrere Läufe lag der Mittelwert bei 59,6 bis 60 fps und das schlechteste Bild bei 16,8 bis 33,4 ms (je Lauf höchstens ein Bild über 33 ms). 60 fps ist die Obergrenze des Takts: Es fiel praktisch kein Bild aus. **Kontrolle, nur zur Information:** dieselbe Messung mit 6-fach gedrosselter CPU (CDP) ergibt bei 5.600 px/s 27 bis 39 fps und bei 28.000 px/s 9 bis 10 fps. Die Messung bildet Rechenlast also ab; der Spielraum beim schnellen Wisch ist auf dieser Maschine klein (grob die Bildzeit selbst), beim gewöhnlichen Scrollen groß. Eine Mindest-Bildrate prüft der Test nur, wenn `GRID_MIN_FPS` gesetzt ist, sonst gibt er die Werte aus (`[Leistung]`-Zeilen, als Annotation und Anhang am Test). Nicht gemessen: echte GPU, schwächere Hardware, Firefox/Safari.

**Verifiziert (ausgeführt)**

- `pnpm lint` (ESLint inkl. N1, Prettier, Paketgrenzen, Lizenzen, Clean-Room): grün. `pnpm typecheck`: grün. `pnpm test`: 12 Dateien, 167 Tests grün (davon im Paket: `tsv.test.ts`, `eingabe.test.ts` mit Einfügeplan und Befehlserzeugung, `navigation.test.ts`).
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm e2e`: grün (ui-grid: 16 Tests ausgeführt, 3 Bildschirmfoto-Tests übersprungen ohne `GRID_SCREENSHOT_DIR`; apps/web: 14).
- Kriterium 1 (typisch als Baum): `grid.spec.ts` „zeigt Titel, Positionen und Hinweistexte…“ (30 Zeilen, `aria-rowcount`, Summenzeile und Titelsumme gleich den formatierten Sollwerten aus `typisch.json`), „ARIA“, „Auf- und Zuklappen“ (Maus, Pfeile, Alt+Pfeil; Zeilenzahl ändert sich, das Grid meldet nur).
- Kriterium 2: siehe Messung oben (5.000 und 10.000 Zeilen).
- Kriterium 3 (Tastatur): „F2, Tab, Enter und Escape…“ (Eingabe, Tab bestätigt und geht nach rechts, Enter bestätigt und geht nach unten, Tippen beginnt, Escape verwirft ohne Befehl), „Tastaturnavigation“, „Mehrfachauswahl“, „Tab am Anfang und Ende…“, „Mausklick … bestätigt“, „gross: Virtualisierung“ (Fokus überlebt das Scrollen, Strg+Ende, Bild auf).
- Kriterium 4 (Befehl, kein zweiter Wahrheitszustand): im Modus `attrappe` zeichnet der Handler nur auf; nach dem Befehl zeigt die Zelle weiter den alten Wert, erst `uebernehmen()` (neue Eigenschaften) ändert die Anzeige. Dazu `eingabe.test.ts`.
- Kriterium 5 (Einfügen): `grid.spec.ts` mit echter Zwischenablage und Strg+V: 5 Zeilen (zitierte Zelle mit Zeilenumbruch, de-DE-Zahlen, abschließender Zeilenumbruch) ergeben genau 5 `PositionAnlegen` in Kettenreihenfolge; die ungültige Menge „viel“ erzeugt die Position mit `menge: null` und erscheint nach Übernahme markiert (`aria-invalid`, Originaltext). Dazu `eingabe.test.ts` (reiner Plan) und `tsv.test.ts`.
- Kriterium 6: `pnpm lint` (`node tools/check-boundaries.mjs`) grün; `ui-grid` importiert nur `@tethys/vertrag` und `@tethys/ui-basis` (zusätzlich TanStack und React).
- Kriterium 7: Es gibt genau eine Grid-Komponente im Repo.
- Sichtprüfung: Playwright-Bildschirmfotos (Skalierung 1) von `typisch` hell und dunkel, Zelle im Bearbeitungsmodus, Zelle mit Formathinweis im Eingabefeld, abgelehnte Eingabe, zugeklappter Baum; dabei einen Fehler gefunden (Kopf und Zeilen unterschiedlich breit) und behoben. Ablage außerhalb des Repos (`GRID_SCREENSHOT_DIR`).

**Abweichungen und Hinweise**

- **Paketgrenzen:** `tools/boundaries.mjs` verbietet `ui-grid` jeden Import aus `fixtures/`, auch in Tests und `e2e/` (die Regel `grenze-packages-ui-grid` hat keine Test-Ausnahme, nur `fixtures-nur-in-tests` hat sie). Die Testseite importiert die Fixtures deshalb nicht: Ein kleines Vite-Plugin in `vite.config.ts` liefert die JSON-Dateien vom Dateisystem aus, die Seite holt sie per `fetch`; `grid.spec.ts` liest sie per `readFileSync`. Entscheidung für den Orchestrator: so lassen oder die Grenzregel für Test-Pfade lockern.
- **Enter:** Auf einer nicht bearbeiteten, bearbeitbaren Zelle beginnt Enter die Eingabe (Excel: nach unten). Im Eingabefeld und beim Tippen verhält sich alles wie in Excel. Begründung: auffindbar, und „tippen, Enter“ geht trotzdem Zeile für Zeile.
- **Leertaste** schaltet die Zeilenauswahl; sie beginnt (anders als in Excel) keine Eingabe.
- **Kein Kopieren/Ausschneiden/Verschieben** im Baum (Nicht-Ziel, U5-Ticket). Nur Einfügen aus Excel.
- Der Test mit Attrappen-Handler läuft in Playwright, nicht in Vitest: Die Vitest-Konfiguration (Root, nicht meine) erfasst nur `*.test.ts` unter `packages/*/src` ohne DOM-Umgebung. Reine Logik (Eingabe, Einfügeplan, TSV, Navigation) ist als Vitest-Test abgedeckt.
- TanStack Table v9 hat eine andere Schnittstelle als v8 (`useTable`, `tableFeatures`, `table.FlexRender`); Spalten- und Zeilenmodell sind damit gebaut. Der TanStack-Anteil ist klein (`tabelle.ts`, drei Stellen in `LvGrid.tsx`), ein Wechsel auf v8 wäre billig, falls gewünscht.
- Prüfhinweise: Zellen zeigen Warnsymbol, Farbe (Warnung/Fehler) und Beschreibung (`title` und `aria-describedby`); kein eigener Tooltip-Baustein (ein Radix-Tooltip je Zelle wäre teuer), nur das native `title`.
- `ui-basis`-Lücken: keine Grid-Tokens (Zeilenhöhe, Zebra); es wurden nur vorhandene Tokens genutzt (`--tx-control-height` als Zeilenhöhe). Kein Pfeil-nach-rechts-Icon: `pfeilUnten` wird per CSS gedreht. `Zahlfeld`/`Eingabefeld` sind für Formulare gebaut (Label, Statuszeile) und für Zellen zu schwer; das Grid nutzt nur `pruefeZahlformatDeDE` (nicht blockierender Formathinweis am Eingabefeld, die Parser aus `GridZahlen` entscheiden) und `Icon`.
- GP und Summen der Testseite sind nach dem Bearbeiten nicht neu berechnet (kein `kern`); auch im Modus `live` bleiben sie die der Fixture.
- Nicht geprüft: Screenreader-Verhalten (nur Rollen/Attribute per Playwright), Browser außer Chromium, IME-Eingabe beim Tippen-beginnt-Eingabe, Spaltenbreite per Maus ändern oder Spalten ausblenden (nicht gefordert), Fenster unter 1280 px (U6).

**Neue Abhängigkeiten (geprüft mit `node tools/check-licenses.mjs`)**

| Paket | Lizenz | Wo |
|---|---|---|
| `@tanstack/react-table` 9.3.1 (mit `@tanstack/table-core`, `@tanstack/react-store`, `@tanstack/store`) | MIT | ui-grid |
| `@tanstack/react-virtual` 3.14 (mit `@tanstack/virtual-core`) | MIT | ui-grid |
| `@tethys/vertrag`, `@tethys/ui-basis` | AGPL-3.0-or-later | `workspace:*` |
| `react`, `react-dom` (zugleich peerDependencies), `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react` | MIT | devDependencies, wie in `apps/web` |
| `@playwright/test` | Apache-2.0 | devDependencies, wie in `apps/web` |

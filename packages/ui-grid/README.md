# @tethys/ui-grid

Das eine gemeinsame Grid (U2) für LV, Preisspiegel, Aufmaß und Kosten. Vollständig gesteuert: Zeilen, Spalten und
Summen kommen als Eigenschaften herein (`LvGridProps`), jede Änderung geht als Befehl hinaus (A5). Das Grid rechnet
nie, vergibt keine Ordnungszahlen und erzeugt keine Kennungen; die bekommt es über `ids` (`GridIdQuelle`).

Browser-Testseite: `pnpm --filter @tethys/ui-grid exec vite` (Parameter in `e2e/harness/main.tsx`; das Vergleichsgrid
unter `/vergleich.html`, Parameter in `e2e/harness/vergleich.tsx`), Tests: `pnpm --filter @tethys/ui-grid e2e`.

Zweite Komponente auf demselben Kern: `VergleichsGrid` (schreibgeschützt, freie Spalten, z. B. Preisspiegel), siehe
[unten](#vergleichsgrid-ticket-60). Gemeinsam sind aktive Zelle, Virtualisierung, Fokus und Sprung (`src/gridKern.ts`),
Navigation (`src/navigation.ts`) und Baumdarstellung (`src/Baumeinzug.tsx`).

## Tastenhilfe

Tastatur zuerst (U3, U8). Strg steht auf dem Mac für Cmd.

### Bewegen und Auswählen

| Taste                          | Wirkung                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| Pfeiltasten                    | Zelle wechseln                                                   |
| Strg+Pfeil                     | an den Rand des Grids in dieser Richtung (Zeile bzw. Spalte)     |
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

| Taste                                    | Wirkung                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Strg+C                                   | ausgewählte Zeilen (sonst die aktive) als Tabelle (TSV) kopieren, Zahlen in de-DE                                  |
| Strg+X                                   | wie Strg+C, die Zeilen sind bis zum Einfügen als „ausgeschnitten“ markiert                                         |
| Strg+V                                   | einfügen hinter der aktiven Zeile, siehe unten                                                                     |
| Strg+Minus, Strg+Entf                    | Zeilen nach Rückfrage in den Papierkorb legen (Fokus auf der Bestätigung: Enter legt sie hinein, Escape bricht ab) |
| Alt+Pfeil hoch / runter                  | Zeilen um eine Stelle unter ihren Geschwistern verschieben; am Rand geschieht nichts                               |
| Strg+Plus (US-Tastatur: Strg+Umschalt+=) | leere Position hinter der aktiven Zeile anlegen und ihren Kurztext fokussieren                                     |

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

Kennzeichen ohne eigene Eigenschaft (Ticket 74): Trägt eine Position einen Mengenansatz (`knoten.mengenansatz`, nicht
leer), zeigt die Mengenzelle die neutrale Marke Σ mit der Beschreibung „Menge aus Mengenansatz …“ (`title`, Screenreader).
Das ist kein Befund: kein Warnstil, kein `aria-invalid`. Befunde an derselben Zelle erscheinen daneben wie sonst.

## VergleichsGrid (Ticket 60)

Schreibgeschütztes Grid für Gegenüberstellungen, z. B. den Preisspiegel (Ticket 63). Eigene, generische Typen des
Pakets (`src/vergleichTypen.ts`, alle exportiert), nichts aus `vertrag`, `kern` oder `vergabe`. Das Grid rechnet und
formatiert nie (N1, A5): Jede Zelle kommt als fertiger Text, ihre Bedeutung als Kennzeichen. Zeilen und Spalten sind virtualisiert (fixierte und aktive Spalte bleiben
immer im DOM).

```tsx
import { VergleichsGrid } from '@tethys/ui-grid';
import type { VergleichsSpalte, VergleichsZeile, VergleichsSummenzeile } from '@tethys/ui-grid';

<VergleichsGrid
  beschriftung="Preisspiegel"
  spalten={spalten}          // OZ, Kurztext, …, je Bieter EP/GP mit gruppe: { id: angebotId, kopf: Bietername }
  zeilen={zeilen}            // sichtbarer, flacher Baum (zugeklappte Unterzeilen fehlen)
  summen={summen}            // Netto, Nachlass, …, Rang
  fixierteSpalten={2}        // OZ und Kurztext bleiben beim waagerechten Scrollen stehen
  baumspalte="kurztext"
  onAufklappen={(zeilenId, auf) => …}
  onZelleAktiv={(ort) => …}  // { zeilenId, spalte } | null, für die Detailleiste
/>;
```

| Eigenschaft                   | Bedeutung                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spalten`                     | `{ id, kopf, gruppe?, ausrichtung?, breite?, zeitleiste? }` in Anzeigereihenfolge (`zeitleiste`: Balkenspalte, siehe unten). Aufeinanderfolgende Spalten mit derselben `gruppe.id` teilen sich einen Gruppenkopf (zweizeiliger Kopf); `ausrichtung` `links` (Standard), `rechts`, `mitte`; `breite` in px, Standard 120. Die Breite muss Text und Marken fassen, sonst wird der Text abgeschnitten. |
| `zeilen`                      | `{ id, art: 'gliederung' \| 'position', tiefe, hatUnterknoten, aufgeklappt, zellen }`; `zellen` je Spalten-`id`, fehlende Zellen bleiben leer. Virtualisiert.                                                                                                                                                                                                                                       |
| `summen`                      | `{ id, zellen }`: feste Zeilen unter dem Körper, kleben am unteren Rand, per Tastatur erreichbar, gehören zur Auswahl. Die Beschriftung („Netto“) ist eine Zelle wie jede andere. Kennungen eindeutig gegenüber `zeilen`.                                                                                                                                                                           |
| Zelle                         | `{ text, kennzeichen?, tooltip?, balken? }` (`balken` nur in einer Balkenspalte). `kennzeichen` in Anzeigereihenfolge; `tooltip` steht hinter den Beschreibungen der Kennzeichen (z. B. „Mittel 12,17“).                                                                                                                                                                                            |
| `kennzeichenTexte`            | `{ [kennzeichen]: { symbol, beschreibung } }` für eigene Kennzeichen (z. B. ABC-Klasse) oder statt der eingebauten.                                                                                                                                                                                                                                                                                 |
| `fixierteSpalten`             | Zahl der linken Spalten, die beim waagerechten Scrollen stehen bleiben; Standard 0.                                                                                                                                                                                                                                                                                                                 |
| `baumspalte`                  | Spalte mit Einzug und Auf-/Zuklappknopf; Standard die erste.                                                                                                                                                                                                                                                                                                                                        |
| `onAufklappen`                | `(zeilenId, aufgeklappt)`; der Aufklappzustand gehört der App.                                                                                                                                                                                                                                                                                                                                      |
| `onZeileAktiv`                | `(zeilenId \| null)` nach dem Rendern, sobald sich die Zeile der aktiven Zelle ändert (auch eine Summenzeile; ohne Klick die erste Zeile).                                                                                                                                                                                                                                                          |
| `onZelleAktiv`                | `({ zeilenId, spalte } \| null)` bei jedem Wechsel der aktiven Zelle, auch nur der Spalte.                                                                                                                                                                                                                                                                                                          |
| `sprungziel`                  | `{ zeilenId, spalte?, nr }` wie beim `LvGrid`: Jede neue `nr` scrollt zur Zelle und fokussiert sie; eine zugeklappte Zeile übergeht das Grid.                                                                                                                                                                                                                                                       |
| `beschriftung`, `zeilenhoehe` | zugänglicher Name (Standard „Vergleich“), Zeilenhöhe (Standard 28).                                                                                                                                                                                                                                                                                                                                 |

Eingebaute Kennzeichen (offene Vereinigung `Kennzeichen`, jedes andere ist erlaubt): `hoch` ▲ „Ausreißer nach oben“,
`niedrig` ▼ „Ausreißer nach unten“, `min` „niedrigster Preis“, `max` „höchster Preis“, `nicht-angeboten` – „nicht
angeboten“, `nullpreis` 0 „Nullpreis“, `hinweis` ! „Hinweis“. Ein unbekanntes Kennzeichen ohne Text erscheint als •
mit sich selbst als Beschreibung. Die Marke zeigt das Symbol auf eigener Token-Fläche (Kontrast in hell und dunkel
geprüft, `src/kennzeichen.test.ts`); die Beschreibung in Worten steht im `title` der Zelle, der zugleich ihre
zugängliche Beschreibung ist (U8, nicht nur Farbe). Ausreißer `hoch`/`niedrig` unterstreichen die Zelle zusätzlich.

Leistung (Ticket 74): Eine Zelle besteht nur aus sich, ihrem Text (`.tx-grid__text`) und je Kennzeichen einer Marke,
ohne Hülle und ohne verstecktes Beschreibungselement; `aria-readonly` steht nur am Grid. Neue Zeilen tragen nur ihren
Versatz als eigenen Stil (Raster, Höhe und Mindestbreite erben sie). `e2e/leistung.spec.ts` prüft die Zahl der Elemente
je Zelle und misst das Scrollen.

Tastatur: Navigation wie im `LvGrid` (Pfeile, Strg+Pfeil, Pos1/Ende, Strg+Pos1/Ende, Bild auf/ab, Tab, Enter /
Umschalt+Enter eine Zeile weiter / zurück), Auf-/Zuklappen wie im `LvGrid`. Zellauswahl: Umschalt+Pfeil und
Umschalt+Klick ziehen ein Rechteck auf, Strg+A wählt alles, Escape hebt die Auswahl auf. Strg+C kopiert das Rechteck
(sonst die aktive Zelle) als TSV wie aus Excel: nur die Anzeigetexte, ohne Kennzeichen und Kopf. Änderungsversuche
(Tippen, F2, Entf, Strg+X/V) ändern nichts und werden in der Live-Region angesagt.

### Balkenspalte (Ticket 96)

Eine Spalte mit `zeitleiste` macht aus dem Vergleichsgrid einen Balkenplan, z. B. den Bauzeitenplan: Zeitachse im
Kopf, je Zeile ein Balken (`VergleichsZelle.balken`). Kein zweites Grid (U2). Das Grid rechnet nie mit Kalendern oder
Daten: Alle Lagen sind **Tagesindizes** (ganze Zahl ab 0 = erster Tag der Achse), alle Texte kommen fertig formatiert
(N4). Ein Tagesindex ist eine Grenze: `vonTag: 2, bisTag: 5` deckt die Tage 2, 3 und 4. Ein Meilenstein hat
`bisTag = vonTag` und steht als Raute auf der Grenze `vonTag`, eine Markierung als Linie auf der Grenze `tag`.

```tsx
const zeitplan: VergleichsSpalte = {
  id: 'balken',
  kopf: 'Zeitplan', // zugänglicher Name der Spalte
  zeitleiste: {
    tage: 730, // Breite tage × pixelJeTag = 11.680 px; `breite` und `gruppe` der Spalte gelten nicht
    pixelJeTag: 16,
    kopf: [{ text: 'Januar 2027', vonTag: 0, bisTag: 31 } /* … */],
    unterkopf: [{ text: 'KW 53', vonTag: -4, bisTag: 3 } /* … über den Rand: geschnitten */],
    freieTage: [0, 1, 2, 8, 9 /* … */], // schattiert
    markierungen: [{ tag: 90, art: 'stichtag', beschreibung: 'Stichtag 01.04.2027' }],
  },
};
const zelle: VergleichsZelle = {
  text: 'Fa. Muster Bau', // steht rechts vom Balken
  balken: {
    vonTag: 10,
    bisTag: 22,
    art: 'vorgang', // 'vorgang' | 'sammelvorgang' | 'meilenstein'
    kritisch: true,
    fortschritt: 40, // 0–100
    ist: { vonTag: 11, bisTag: 23 },
    beschreibung: '11.01.2027 bis 22.01.2027, 10 Arbeitstage, kritisch', // Pflicht: Tooltip und Name
  },
};
```

| Teil          | Darstellung                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kopf          | Zweizeilig: `kopf` oben, `unterkopf` unten; ohne `unterkopf` füllt `kopf` die Höhe. Die übrigen Spaltenköpfe reichen über beide Zeilen, Spaltengruppen bleiben wie bisher. Abschnitte, die über die Achse reichen, werden geschnitten.           |
| Vorgang       | Balken mit Rand; `fortschritt` füllt den Anteil des ganzen Balkens von links, auch wenn er abgeschnitten ist.                                                                                                                                    |
| Sammelvorgang | Schmale Klammer mit Füßen; ein abgeschnittenes Ende bleibt offen.                                                                                                                                                                                |
| Meilenstein   | Raute auf `vonTag`.                                                                                                                                                                                                                              |
| `kritisch`    | Eigene Farbe und zusätzlich schraffiert (Vorgang, Sammelvorgang) bzw. gerahmt (Meilenstein): nicht nur Farbe (U8).                                                                                                                               |
| `ist`         | Schmaler Balken unter dem Balken.                                                                                                                                                                                                                |
| Abgeschnitten | Was über die Achse reicht, wird abgeschnitten und bekommt am Rand der Achse die Marke ◀ bzw. ▶ (Tooltip: Beschreibung und Rand); ein Balken ganz außerhalb hat nur die Marke (Q5). Der Name nennt es („beginnt vor dem dargestellten Zeitraum“). |
| Freie Tage    | Schattiert, in jeder Zeile und im Kopf.                                                                                                                                                                                                          |
| Markierungen  | Senkrechte Linie über die Spalte, Fähnchen mit Tooltip im Kopf; die Beschreibungen sind die zugängliche Beschreibung des Spaltenkopfs. Eine `art` aus `[a-z0-9-]` wird zur Klasse `tx-grid__markierung--<art>`.                                  |

Bedienung: Die Balkenzelle ist eine normale Zelle (Tastatur, Auswahl, Strg+C kopiert ihren Text, `onZelleAktiv`). Ihr
Name (`aria-label`) ist Zelltext, `beschreibung` und, was abgeschnitten ist; `beschreibung` ist auch der Tooltip des
Balkens. Der Fokus per Tastatur holt den Balken (oder seine Randmarke) waagerecht in Sicht; in einer Zelle ohne Balken
bleibt die Ansicht stehen, solange die Achse zu sehen ist. Nicht enthalten: Ziehen mit der Maus (Bearbeiten in der App
über Formulare und Befehle, A5), Zoom (die App wählt `pixelJeTag`), Anordnungspfeile.

Farben: eigene Tokens in `grid.css` (`--tx-grid-balken`, `--tx-grid-balken-rand`, `--tx-grid-balken-kritisch`,
`--tx-grid-balken-kritisch-rand`, `--tx-grid-balken-ist`, `--tx-grid-sammelvorgang`, `--tx-grid-meilenstein`,
`--tx-grid-markierung`, `--tx-grid-freier-tag`), jedes ein Verweis auf ein Token aus ui-basis; Kontrast der Grafik
mindestens 3 : 1 in hell und dunkel (`src/balkenfarben.test.ts`).

Leistung: Was für alle Zeilen gleich ist (Achse, Kopf, Raster), entsteht einmal je Spalte. Eine Balkenzelle hat eine
feste Zahl Elemente (Zelle, Text, ein SVG mit einem Pfad für alle freien Tage und einem je Art der Markierungen, dazu
Balken, Ist-Balken und Randmarken), gleich wie lang die Achse ist. `e2e/leistung.spec.ts` zählt das und misst 1.000
Zeilen auf einer Achse von 730 Tagen.

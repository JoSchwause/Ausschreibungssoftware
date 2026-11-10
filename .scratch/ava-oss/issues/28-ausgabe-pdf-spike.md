# 28: O1-Spike: PDF-Druck des LV

Status: resolved (Pull Request je Ticket, 2026-11-10)
Type: research
Welle: 2 · Strang: O · Paket: `packages/ausgabe` (neu)
Blocked by: -
Regeln: A1, A2, A3, C1, C5, N4, Q4
Herkunft: `plan.md` §3 (Welle 2: „O1 (Spike)“)

## Frage, die der Spike beantwortet

Womit erzeugt Tethys AVA das PDF eines LV: **im Browser, ohne Server** (A1), mit einer Abhängigkeit, deren Lizenz
zu AGPL-3.0-or-later passt (C5), mit eingebetteter freier Schrift (C1), deutsch formatierten Zahlen (N4), und
schnell genug für 5.000 Positionen?

## What to build

Ein neues Paket `packages/ausgabe` (Abhängigkeit nur auf `vertrag` und `dezimal`, A3) mit **einer** Funktion, die
aus einem `LvZustand` ein PDF als Bytes erzeugt: Kopf (LV-Name), je Zeile OZ, Kurztext, Menge, Einheit, EP, GP,
Titelsummen, am Ende Netto, Nachlass, MwSt, Brutto; Seitenzahl „Seite x von y“; Langtext als einfacher Text.
Mindestens **zwei** Wege werden verglichen (z. B. eine PDF-Bibliothek, die im Browser zeichnet, gegen den
Druckweg des Browsers mit Druck-CSS); die Kandidaten wählt der Agent nach geöffneten Quellen (Lizenztext,
Dokumentation), nicht aus dem Gedächtnis. Der bessere Weg bleibt als Code, der andere als Messwert im Ticket.

Der Spike rechnet nichts selbst: Summen kommen aus dem `LvZustand`.

## Acceptance criteria

- [x] `fixtures/winzig` und `fixtures/typisch` ergeben je ein PDF; ein Test liest den Text des PDF zurück und findet die Sollsummen in de-DE-Schreibweise
- [x] Umlaute, `m²`, `€` stehen richtig im PDF; die Schrift ist eingebettet und frei lizenziert (Lizenz und Herkunft in `REUSE.toml`)
- [x] Gemessen und im Ticket festgehalten: Dauer und Dateigröße für `gross` (5.000 Positionen), mit Umgebung; im Browser (Chromium), nicht nur unter Node
- [x] Vergleichstabelle der Wege: Lizenz, Bündelgröße, Dauer, Seitenumbruch (Titel nicht vom ersten Kind trennen), Kopf-/Fußzeile, Barrierefreiheit (Tags), was nicht geht
- [x] Empfehlung mit Begründung als Vorschlag für eine ADR (Text im Ticket; die ADR selbst schreibt und prüft der Nutzer-Weg, nicht dieser Spike)
- [x] `pnpm lint` (einschließlich Lizenzprüfung und Paketgrenzen), `pnpm typecheck`, `pnpm test`, `reuse lint` grün

Ticket 25 schreibt `fixtures/gross.json` zur selben Zeit in Dokumentreihenfolge um. Für die Messung ist jede der
beiden Reihenfolgen recht; das Ticket nennt den Stand (Commit), an dem gemessen wurde.

## Nicht-Ziele

Druckprofile (O3), Excel (O2), formatierter Langtext (nach Ticket 26), Anbindung an `apps/web`, Layout-Feinschliff.

## Comments

### Ergebnis (Agent, Basis `4396721`; `fixtures/gross.json` zuletzt geändert in `1ff71be`, Stand in `4396721`)

**Geliefert.** `packages/ausgabe` (neu): `erzeugePdf(zustand: LvZustand, schriften, { tagged? }): Promise<Uint8Array>`
mit pdfmake (Weg A) und `erzeugeDruckHtml(zustand, schriften): string` (Weg B, Druck-CSS). Gemeinsam:
`baueAusgabemodell` (`src/modell.ts`) macht aus dem `LvZustand` flache Zeilen; Zahlen nur über `@tethys/dezimal`
(`formatiereBetragDe` u. a.), Beträge nur aus dem `Summenstand`, nichts gerechnet. Schrift: Noto Sans 400/700 (Latin,
WOFF) unter `packages/ausgabe/schriften/`; Lizenz SIL OFL-1.1 (`LICENSES/OFL-1.1.txt`, Eintrag in `REUSE.toml`). Tests
bauen den `LvZustand` mit dem Kern (`@tethys/kern`, Dev-Abhängigkeit; `tools/boundaries.mjs` erlaubt `ausgabe` → Kern
über `FACH` schon, kein Eintrag nötig). Messung: `pnpm --dir packages/ausgabe messen` (nicht Teil von `pnpm test`),
schreibt `messung/ergebnis.json`.

**Kandidaten und Quellen (Lizenzen nur aus geöffneten Dateien).**

- pdfmake 0.3.14: `node_modules/pdfmake/LICENSE` „The MIT License (MIT)“, `package.json` `"license": "MIT"` (SPDX MIT).
  Abhängigkeiten pdfkit 0.20.2, linebreak 1.1.0, xmldoc 2.0.3: je `LICENSE`-Datei MIT bzw. MIT-Text, `package.json` MIT.
  Übrige Transitive (fontkit, brotli, restructure, png-js, …) prüft `tools/check-licenses.mjs`: grün (laut
  `pnpm licenses list` MIT, `sax` BlueOak-1.0.0). pdfmake 0.3.14 trägt im CHANGELOG das Datum 2026-11-08, ist also zwei
  Tage alt; gewählt, weil erst diese Version Schriften als `Uint8Array` annimmt (CHANGELOG: „support for binary font
  definitions … using `Buffer`, `Uint8Array` or `ArrayBuffer`“), ohne Dateizugriff im Browser.
- pdfjs-dist 6.5.438 (nur Test, liest den PDF-Text zurück): `LICENSE` Apache License 2.0, `package.json`
  `"license": "Apache-2.0"`.
- Noto Sans: npm-Paket `@fontsource/noto-sans` 5.3.0, Dateien `files/noto-sans-latin-{400,700}-normal.woff`; dessen
  `LICENSE` beginnt „Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic) … licensed
  under the SIL Open Font License, Version 1.1“, `package.json` `"license": "OFL-1.1"`. Das Paket ist keine
  Abhängigkeit (nur die Dateien liegen im Repo). `reuse download OFL-1.1` hat den Lizenztext geholt. Die Latin-Teilmenge
  hat Fontsource erzeugt; wir haben nichts geändert.
- Weg B braucht keine Bibliothek: Chromium (Playwright 1.65, Chrome for Testing 153.0.8010.12), `page.pdf()` als Ersatz
  für den Druckdialog (derselbe Druckpfad von Chromium, aber ohne Dialog; was der Dialog an Kopf-/Fußzeilen und
  Papiergröße ändert, ist damit nicht gemessen).

**Umgebung der Messung.** Container, 4 Kerne Intel Xeon @ 2,10 GHz, 16 GiB, Node v22.23.4, Chromium 153.0.8010.12
headless, ohne GPU. 7 gemessene Läufe je Zeile nach 1 Aufwärmlauf, Median; Dauer im Browser mit `performance.now()` in der
Seite (Weg A, ohne Datenübergabe), bei Weg B von `setContent` bis zu den PDF-Bytes in Node. **Die Maschine war nicht
ruhig:** Andere Agenten liefen parallel, die 1-Minuten-Last lag vor der Messung bei 8,5 und danach bei 10,7 (4 Kerne). Die
Absolutwerte sind deshalb eher zu hoch. Ein früherer Lauf bei Last um 8 ergab ähnliche Mediane (Weg A Node 3,26 s,
Chromium 2,47 s; Weg B mit Tags 8,56 s, ohne Tags 3,90 s). Es gibt kein Budget (Q4 nennt für die Ausgabe keines).

**Messwerte `gross` (5.000 Positionen, A4, Noto Sans 8 pt, Langtext je Position).**

| Weg                                    | Dauer (Median, min–max)  | Dateigröße         | Seiten |
| -------------------------------------- | ------------------------ | ------------------ | ------ |
| A pdfmake, Node                        | 3.240 ms (3.080–3.587)   | 1.314.736 B        | 270    |
| A pdfmake, Chromium                    | 2.855 ms (2.383–4.061)   | 1.423.404 B        | 270    |
| B Browserdruck (`page.pdf`), mit Tags  | 9.808 ms (9.057–10.754)  | 14.992.261 B       | 268    |
| B Browserdruck (`page.pdf`), ohne Tags | 3.757 ms (3.347–5.179)   | 1.526.798 B        | 268    |
| B: HTML erzeugen (Node)                | 29 ms                    | 1.944.977 B (HTML) | –      |

**Vergleichstabelle.**

| | A: pdfmake (im Browser gezeichnet) | B: Druckweg des Browsers mit Druck-CSS |
| --- | --- | --- |
| Lizenz | MIT (pdfmake und Abhängigkeiten MIT/BlueOak, s. o.) | keine Bibliothek; Browser |
| Bündelgröße (Vite, minifiziert) | 776.852 B, gzip 290.289 B, plus 33.644 B Schrift | 5.292 B, gzip 2.369 B (nur HTML-Erzeugung); Schrift als Data-URL im HTML |
| Dauer `gross` | 2,9 s (Chromium), 3,2 s (Node) | 3,8 s ohne, 9,8 s mit Tags (`page.pdf`); im Dialog nicht gemessen |
| Ergebnis | PDF-Bytes in der App (speichern, ablegen, später an die Vergabe hängen) | keine Bytes in der App: Der Nutzer wählt im Druckdialog „Als PDF speichern“ |
| Seitenumbruch Titel/erstes Kind | `unbreakable`-Block aus Titel(n) und erstem Kind; der Test schlägt ohne den Block fehl (Gegenprobe gemacht); `gross`: 0 von 270 Seiten enden mit einem Titel | CSS `break-after: avoid` auf der Titelzeile; Gegenprobe: ohne die Regel enden 20 von 267 Seiten mit einem Titel, mit der Regel 0 von 268 (Chromium) |
| Kopf-/Fußzeile | `header`/`footer`-Funktionen mit Seite und Seitenzahl; letzte Seite „Seite 270 von 270“; Spaltenkopf wiederholt sich je Seite | `thead` wiederholt sich; `@page`-Randbox mit `counter(page)`/`counter(pages)` funktioniert in Chromium 153 („Seite 268 von 268“); andere Browser nicht geprüft |
| Barrierefreiheit (Tags) | `tagged: true` setzt `/MarkInfo` und `/Lang`, erzeugt aber **keine Strukturelemente** (`getStructTree` liefert nur einen leeren `Root`): kein PDF/UA, Tabelle nicht als Tabelle ausgezeichnet | `tagged: true` liefert echte Struktur (`Document`, `Table`, `TR`, `TH`, `TD`), kostet aber das Zehnfache an Größe und das 2,6-Fache an Zeit; ob der Druckdialog getaggt ausgibt, nicht geprüft |
| Schrift | eingebettet als Teilmenge (`/BaseFont /…+NotoSans-Regular`, `-Bold`) | eingebettet als Teilmenge (gleiche Namen), sofern die Webschrift vor dem Druck geladen ist (`document.fonts.ready`) |
| Was nicht geht / Risiko | Hauptthread belegt (2,5–3 s bei 5.000 Zeilen; Worker nicht versucht); `tagged` ohne Struktur; pdfmake mit sehr junger Version; globaler Zustand (`setFonts` je Aufruf) | Umbruch und Seitenzahl gehören dem Browser; Ergebnis hängt von Browser, Dialogeinstellungen (Ränder, Kopf-/Fußzeile des Browsers) und Papier ab; ohne Dialog nicht automatisierbar (E2E nur über `page.pdf`); 2 MB HTML mit 5.000 Tabellenzeilen im DOM (Vorschauzeit nicht gemessen) |

**Geprüft (Tests, grün).** `src/ausgabe.test.ts`: `winzig` und `typisch` ergeben je ein PDF; pdf.js liest den Text zurück
und findet Name, Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto und alle Titelsummen der Sollwerte in
de-DE-Schreibweise (`2.565,00`, `3.052,35`, …; erwartet mit `formatiereBetragDe`, nicht von Hand getippt); „Seite x von y“
auf jeder Seite; Umlaute (`Größe Ärger Übung ß ö`), `m²`, `€` und `½` stehen im Text; Schrift eingebettet (`/FontFile`,
`/BaseFont /XXXXXX+NotoSans…`, keine Standardschrift); Titel nicht vom ersten Kind getrennt (300 Titel, verschieden lange
Langtexte, mit Gegenprobe). `src/druck.test.ts`: HTML enthält Sollsummen, Randbox und Umbruchregel, Text wird maskiert.
`messung/messung.messung.ts` prüft zusätzlich an `gross`, dass die vier Sollsummen in allen Ergebnissen (A Node, A Chromium,
B mit und ohne Tags) stehen. **Nicht geprüft:** Aussehen (Layout nur über Textpositionen, nie als Bild angesehen);
Firefox/Safari; Speicherverbrauch; Worker; deterministische Bytes (pdfkit schreibt Datum/ID, nicht untersucht); Langtext
mit Bildern oder Auszeichnung.

**Empfehlung (Vorschlag für eine ADR, die der Nutzer-Weg schreibt und prüft).** _Entscheidung:_ PDF-Ausgabe im Browser mit
pdfmake (Weg A), Noto Sans (OFL-1.1) eingebettet, Bytes aus `packages/ausgabe`. _Gründe:_ (1) A1: In der lokalen PWA ohne
Server ist ein PDF als Bytes nötig (ablegen, später mit der Vergabe verknüpfen); der Druckweg liefert nur etwas über den
Dialog. (2) Etwa 3 s bei 5.000 Positionen im Browser und 1,4 MB, gemessen unter Last; der Browserdruck war langsamer und mit
Tags zehnmal größer. (3) Umbruch, Kopf und Seitenzahl unabhängig vom Browser kontrollierbar. (4) Lizenz MIT, C5 erfüllt.
_Folgen:_ Bündel +290 KB gzip (per `import()` nachladen); 2,5–3 s Hauptthread, daher Worker prüfen. **Offene Frage an den
Nutzer: Ist ein getaggtes PDF (Barrierefreiheit) für v1 verlangt?** pdfmake erzeugt keine Struktur-Tags; wäre es Pflicht,
bliebe nur der Browserdruck mit Tags (größer, langsamer, nur über den Dialog) oder eine andere, hier nicht geprüfte
Bibliothek. Weg B kann als „Drucken“-Knopf zusätzlich bestehen (5 KB). Nicht untersucht: pdf-lib, jsPDF, @react-pdf.

**Vorläufige Annahmen (Entscheidung offen).**

1. Eine Position, die laut `Positionssumme.gehtInSummeEin` nicht in die Summen eingeht (Bedarf ohne Gesamtbetrag, Wahl),
   zeigt ihren GP in Klammern. F4 verlangt getrennt ausgewiesene Bedarfs- und Wahlsummen; die gibt es im Spike nicht
   (`positionZeile` in `src/modell.ts`).
2. Langtext: nur Textbausteine, durch Zeilenumbruch verbunden; Bilder entfallen (`langtextAlsText`).
3. Los und Titel sehen gleich aus und erhalten beide eine Summenzeile (`baueAusgabemodell`). Die Ordnungszahl steht so, wie
   sie im Knoten steht, plus Index; die OZ-Maske wird nicht ausgewertet.
4. Nachlass: „Nachlass 2,00 %“ mit dem vom Kern berechneten Betrag; ohne Nachlass entfallen die Zeilen „Nachlass“ und
   „Netto nach Nachlass“. Hinweistexte stehen eingerückt in kleiner Schrift.
5. Layout (Ränder, Spaltenbreiten, Schriftgrößen) ist Wegwerf und ahmt kein Fremdprodukt nach (U4).

**Lücken in eingefrorenen Paketen.** Keine blockierend. `kern/src/testhilfen.ts` ist nicht exportiert, daher hat `ausgabe`
eine eigene kleine Fixture-Laderoutine (`src/testhilfen.ts`, nach dem Muster des Kerns). `Positionssumme.gesamtpreis` kann
`null` sein; der Spike druckt dann eine leere Zelle.

**Abweichungen vom Ticket.** Weg B bleibt (anders als „der andere nur als Messwert“) als kleiner Code im Paket, weil
`messen` ihn zum Nachmessen braucht; bei einer Entscheidung für A löschen. Wurzeldateien angefasst: `pnpm-lock.yaml`,
`REUSE.toml`, `LICENSES/OFL-1.1.txt`.

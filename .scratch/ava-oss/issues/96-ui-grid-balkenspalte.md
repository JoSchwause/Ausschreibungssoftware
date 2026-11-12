# 96: `ui-grid`: Balkenspalte (Zeitleiste) im Vergleichsgrid

Status: done-by-agent
Type: task
Welle: 6 · Strang: U, X2 · Paket: `packages/ui-grid`
Blocked by: –
Modell: opus
Regeln: U1–U4, U8, Q2, Q4, N4, A5
Herkunft: `plan.md` §2 X2 (Bauzeitenplan); U2 verlangt genau ein gemeinsames Grid, also kein zweites Grid für den
Balkenplan (Gantt)

## What to build

Das schreibgeschützte `VergleichsGrid` (Ticket 60) bekommt eine optionale **Balkenspalte**: eine breite Spalte mit
Zeitachse im Kopf und je Zeile einem Balken. Damit zeigt die App später den Bauzeitenplan (Ticket der App, X2) als Tabelle
mit Balken im einen gemeinsamen Grid. Das Grid rechnet nie mit Kalendern oder Daten: Alle Lagen kommen als **Tagesindex**
(ganze Zahl ab 0 = erster Tag der Achse) und alle Texte fertig formatiert vom Aufrufer, wie heute die Zelltexte (N4).

Typen (eigene, generische Typen des Pakets in `vergleichTypen.ts`, nicht aus `vertrag`; Namen deutsch, wie dort):

1. `VergleichsSpalte.zeitleiste?: Zeitleiste` mit `Zeitleiste { tage: number (≥ 1); pixelJeTag?: number (Standard 16);
   kopf: readonly Zeitabschnitt[] (obere Kopfzeile, z. B. Monate); unterkopf?: readonly Zeitabschnitt[] (z. B.
   Kalenderwochen oder Tage); freieTage?: readonly number[] (schattiert, z. B. Wochenende, Feiertage); markierungen?:
   readonly { tag: number; art: string; beschreibung: string }[] (senkrechte Linie, z. B. Stichtag) }` und
   `Zeitabschnitt { text: string; vonTag: number; bisTag: number /* exklusiv */ }`. Die Breite der Spalte ist
   `tage × pixelJeTag`; `breite` gilt dann nicht.
2. `VergleichsZelle.balken?: Balken` mit `Balken { vonTag: number; bisTag: number /* exklusiv; gleich vonTag bei einem
   Meilenstein */; art: 'vorgang' | 'sammelvorgang' | 'meilenstein'; kritisch?: boolean; fortschritt?: number (0–100,
   gefüllter Anteil); ist?: { vonTag: number; bisTag: number } (zweiter, schmaler Balken für Ist-Termine); beschreibung:
   string (Pflicht: Tooltip und Name für den Screenreader, z. B. „12.01.2027 bis 23.01.2027, 10 Arbeitstage, kritisch“) }`.
   Ein Balken außerhalb der Achse wird abgeschnitten und bekommt ein Kennzeichen am Rand (nichts verschwindet still, Q5).
3. **Kopf.** Mit Zeitleiste hat der Kopf zwei Zeilen: `kopf` oben, `unterkopf` unten (ohne `unterkopf` eine Zeile über
   die volle Höhe). Das verträgt sich mit den Spaltengruppen des zweizeiligen Kopfs (Ticket 60).
4. **Darstellung.** Farben nur über Design-Tokens (U4, hell und dunkel, neue Tokens in `grid.css` mit `--tx-`-Präfix wie
   die übrigen des Grids). Ein kritischer Vorgang ist nicht nur an der Farbe erkennbar (Muster oder Rahmen; U8);
   Sammelvorgang als schmale Klammer, Meilenstein als Raute. Fortschritt als gefüllter Anteil des Balkens.
5. **Bedienung.** Die Balkenzelle ist eine normale Zelle: per Tastatur erreichbar (U3), `aria-label` aus `beschreibung`
   und Zelltext, `onZelleAktiv` meldet sie wie jede Zelle. Kein Ziehen mit der Maus in diesem Ticket (Bearbeiten läuft in
   der App über Formulare und Befehle, A5). Waagerechtes Scrollen mit `fixierteSpalten` wie bisher.
6. **Leistung (Q4).** 1.000 Zeilen mit Balken und einer Achse von 730 Tagen bleiben im Budget der bestehenden
   Leistungstests des Vergleichsgrids (`e2e/leistung.spec.ts`; gleiche Messart, neue Zeile im Test).

Nicht in diesem Ticket: Anordnungspfeile zwischen Balken, Bearbeiten per Maus, Zoom (die App wählt `pixelJeTag`).

## Grenzen

- Nur `packages/ui-grid`. Kein Typ in `vertrag` (die Typen sind generisch und gehören dem Grid). `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [x] Unit-Tests der reinen Lagen-Rechnung (Tagesindex → Pixel, Abschneiden, Meilenstein) und E2E im Prüfstand des Pakets
      (`e2e/harness`): Kopf mit Monaten und KW, Balken an der richtigen Stelle und Breite, kritisch erkennbar, Tastatur in die
      Balkenzelle, Name für den Screenreader, abgeschnittener Balken mit Kennzeichen, dunkles Schema
- [x] Leistungstest mit 1.000 Zeilen grün; bestehende E2E des Pakets grün
      (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/ui-grid e2e`)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-96.1 Prüfnähte.** Getestet wird an vier Nähten: (1) das reine Modul `src/zeitleiste.ts` (Vitest: Tagesindex →
  Pixel, Abschneiden, Meilenstein, Fortschritt, freie Tage, Markierungen, Name für den Screenreader; fängt Rechenfehler,
  nicht die Darstellung); (2) `VergleichsGrid` im Browser auf der neuen Testseite `e2e/harness/bauzeit.html`
  (Playwright: Kopf, Lage und Breite, kritisch, Tastatur, Name, Abschneiden, dunkles Schema; fängt DOM, CSS, ARIA und
  Scrollen); (3) die neuen Farb-Tokens gegen `tokens.css` (Vitest, Kontrast ≥ 3 : 1 für Grafik in hell und dunkel, wie
  `kennzeichen.test.ts`); (4) `e2e/leistung.spec.ts` (Bildrate wie bisher, dazu eine maschinenunabhängige Zählung der
  Elemente je Balkenzelle). Grund: Das sind die Nähte, die das Ticket in den Akzeptanzkriterien nennt; im autonomen Lauf
  gibt es niemanden, der sie vorab bestätigt. Reversible: yes.
- **D-96.2 Kopf.** Mit einer Zeitleiste ist der Kopf sichtbar immer zweizeilig; die übrigen Spaltenköpfe reichen bis
  unten. Für den Screenreader zählen nur die Kopfzeilen von TanStack (ohne Spaltengruppen eine: `aria-rowcount` und
  `aria-rowindex` wie ohne Zeitleiste). Eine Balkenspalte gehört nie zu einer Gruppe (`gruppe` gilt nicht, wie `breite`).
  Ihr `kopf` ist der zugängliche Name des Spaltenkopfs; die Abschnitte sind `aria-hidden`, die Beschreibungen der
  Markierungen sind seine zugängliche Beschreibung („Markierungen: …“, verstecktes Element mit `aria-describedby`). Grund:
  Die zweite Zeile ist Inhalt der Achse, keine eigene Kopfzeile; Monats- und Wochennamen wären für den Screenreader
  Rauschen, die Termine stehen im Namen jedes Balkens. Reversible: yes.
- **D-96.3 Lagen.** Ein Tagesindex ist eine Grenze (`vonTag` = Anfang des Tages). Meilenstein und Markierung stehen auf der
  Grenze `vonTag` bzw. `tag` (fallen also bei gleichem Index zusammen); ein Meilenstein mit abweichendem `bisTag` steht
  trotzdem bei `vonTag`. Ein Vorgang ohne Dauer und `bisTag < vonTag` sind ein Punkt bei `vonTag`, gezeichnet mit
  mindestens 2 px (nichts verschwindet still); das Grid prüft nicht (U5, das ist Sache der App). `fortschritt` gilt für den
  ganzen Balken (auf 0–100 begrenzt), auch wenn er abgeschnitten ist; nicht endliche Werte zählen als ohne. `tage` unter 1
  gilt als 1, ein `pixelJeTag` ohne Breite als 16. Reversible: yes.
- **D-96.4 Abschneiden.** Was über die Achse reicht (Balken oder Ist-Termine), wird abgeschnitten; am Rand der Achse steht
  die Marke ◀ bzw. ▶ in der neutralen Kennzeichen-Fläche (Kontrast schon geprüft), ihr Tooltip ist Beschreibung und Rand.
  Der Name der Zelle nennt es mit Texten des Grids (`texte.ts`: „beginnt vor dem dargestellten Zeitraum“, „liegt nach …“,
  „Ist-Termine enden nach …“). Ein abgeschnittenes Ende hat keinen Rand und keinen Fuß der Klammer. Grund: Q5; der
  Name nennt nur, was das Grid selbst weiß, „kritisch“ und die Daten kommen aus `beschreibung`. Reversible: yes.
- **D-96.5 Farben.** Neun Tokens `--tx-grid-…` in `grid.css` am `.tx-grid`, jedes ein Verweis auf ein Token aus ui-basis
  (keine eigenen Werte, `ui-basis` bleibt unverändert, P2): Balken `accent-subtle` mit Rand und Fortschritt `accent`,
  kritisch `danger-subtle`/`danger`, Ist `text-muted`, Klammer und Raute `text`, Markierung `warning` (weder Fokus noch
  kritisch), freie Tage `color-mix` aus `text` mit 8 % (durchscheinend, sichtbar auf Zeile, Gliederung, Maus und Auswahl).
  Kritisch zusätzlich schraffiert (Vorgang, Sammelvorgang) bzw. gerahmt (Meilenstein). Reversible: yes.
- **D-96.6 Raster je Zeile als ein SVG.** Freie Tage und Markierungen: je Zeile ein SVG mit einem Pfad für alle freien
  Tage und einem je Art der Markierungen, gestreckt auf die Zeilenhöhe; das Element entsteht einmal je Spalte. Verworfen:
  eine Ebene über den Zeilen (sie läge über den fixierten Spalten, weil jede Zeile mit `transform` eine eigene
  Stapelebene ist), eine Ebene darunter (die Zeilen sind deckend), ein Verlauf mit harten Stopps (Kosten je Pixel wachsen
  mit der Zahl der Stopps), ein Element je freiem Tag (rund 200 je Zeile bei 730 Tagen). Reversible: yes.
- **D-96.7 Text der Zelle.** Kennzeichen und Text einer Balkenzelle folgen rechts vom Balken (`padding-left` am Element),
  ohne eigene Hülle; liegt der Balken ganz vor der Achse, hinter der Randmarke. Strg+C kopiert wie überall den Text.
  Reversible: yes.
- **D-96.8 Tastatur und waagerechtes Scrollen (gemeinsamer Kern).** `zeigeWaagerecht` in `gridKern.ts` zielt auf ein
  Element mit `data-sichtziel` in der Zelle (Balken, bei einem Balken ganz außerhalb seine Randmarke) und scrollt wie
  `scrollIntoView({ inline: 'nearest' })`; eine breite Zelle ohne Ziel (Balkenspalte ohne Balken) bleibt stehen, solange
  ein Teil sichtbar ist. Grund: Mit der alten Regel sprang der Fokus in eine 1.920 px breite Zelle ans Ende der Achse. Für
  schmale Zellen gilt dieselbe Rechnung wie vorher (`waagerechterVersatz`, Unit-Test); alle E2E von `LvGrid` und
  Vergleichsgrid bleiben grün. `LvGrid.tsx` ist nicht berührt (Ticket 95). Reversible: yes.
- **D-96.9 Leistungstest.** Ein Grid mit 1.000 Zeilen ist 28.000 px hoch; der Wisch mit 28.000 px/s stünde nach einer
  Sekunde am Ende und fiele durch die Prüfung „Zeilenwechsel in mehr als der Hälfte der Bilder“. Deshalb kehrt
  `messeScrollen` am Ende mit gleicher Geschwindigkeit um; die Grids mit 5.000 und mehr Zeilen erreichen das Ende
  höchstens in den letzten Bildern, für sie bleibt die Messung gleich. Neu: Fall „Bauzeitenplan 1.000 Zeilen, 730 Tage“
  und eine Zählung der Elemente je Balkenzelle (Zelle, Text, SVG mit zwei Pfaden, je Balken, Ist-Balken und Marke eins).
  Keine neue Schranke, kein Budget gelockert. Reversible: yes.
- **D-96.10 Testseite.** Eigene Seite `e2e/harness/bauzeit.html` (dritter Vite-Einstieg, wie D-60.9) mit einem
  erfundenen Bauzeitenplan; sie spielt die App und rechnet dafür mit UTC-Daten (Monate, ISO-Wochen, Wochenenden, feste
  Feiertagsliste 2026–2028); das Grid sieht nur Tagesindizes. Reversible: yes.
- **D-96.11 Glossar.** Kein neuer Eintrag: `Zeitleiste`, `Zeitabschnitt`, `Balken` sind Typen der Oberfläche wie
  `Kennzeichen`; Vorgang, Sammelvorgang und Meilenstein sind die X2-Begriffe aus D-57, ihre Einträge gehören zum
  Vertragsticket von X2 (97). Das Ticket erlaubt nur `packages/ui-grid`. Reversible: yes.

### Umsetzung (Branch `welle-6/96-balkenspalte`)

Nur `packages/ui-grid`. Neu: `src/zeitleiste.ts` (reine Lagen-Rechnung), `src/Balkenspalte.tsx` (Kopf der Achse,
Balkenzelle), Typen `Zeitleiste`, `Zeitabschnitt`, `Zeitmarkierung`, `Balken`, `Balkenart` in `vergleichTypen.ts` (aus
`index.ts` exportiert), Abschnitt „Balkenspalte“ im Paket-README. Geändert: `VergleichsGrid.tsx` (Kopf, Breiten, ARIA),
`Vergleichszeile.tsx` (Zweig für Balkenzellen; der Weg normaler Zellen ist unverändert), `vergleich.ts`
(`spaltenbreite`), `tabelle.ts` (Breite, keine Gruppe), `gridKern.ts` (D-96.8), `texte.ts`, `grid.css`, `vite.config.ts`.

Tests: `src/zeitleiste.test.ts` (20), `src/balkenfarben.test.ts` (Tokens; 26 Kontrastpaare in hell und dunkel), `src/gridKern.test.ts`
(`waagerechterVersatz`, 5), `e2e/balkenspalte.spec.ts` (12: Kopf mit Monaten und KW, ohne Unterkopf und ohne Gruppen,
Gruppe an der Balkenspalte, Lage und Breite, kritisch, Fortschritt und Ist, freie Tage und Markierung, Abschneiden mit
Kennzeichen, dunkles Schema, Tastatur mit Name und Meldung, Zeile ohne Balken, Strg+C), `e2e/leistung.spec.ts` (Zählung
und Messung 1.000 Zeilen, 730 Tage). Der Prüfstand der Gruppenregel ist per Mutation geprüft (Regel aus → Test rot).

Hinweise für Ticket 118 (App): `spalten` stabil halten (`useMemo`): Achse, Kopf und Raster rechnet das Grid je neuem
`spalten`. `beschreibung` nennt Daten, Dauer und „kritisch“ selbst; das Grid ergänzt nur den Rand. Lange Monate verlieren
ihre Beschriftung, sobald ihr Anfang unter den fixierten Spalten liegt (die Kalenderwochen bleiben lesbar); mitlaufende
Beschriftungen wären ein eigenes kleines Grid-Ticket.

### Ergebnis (Stand nach `git merge integration/welle-6`, Basis 74158a2)

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test`: grün (Vitest 209 Dateien, 2.712 Tests,
  3 übersprungen, alle aus `packages/ausgabe/src/excel-libreoffice.test.ts`; Fixture-Tests 29/29).
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/ui-grid e2e` (mit `CI=1`, damit kein fremder
  Vorschau-Server auf Port 4180 mitläuft): 77 bestanden.

Leistung (Headless-Chromium ohne GPU, 4 Kerne, bis zu 8 Agenten; Bilder/s bei 5.600 / 28.000 px/s):

| Fall | Datei allein, vor dem Merge (Last 4,1–4,6) | ganze E2E des Pakets nach dem Merge (Last 7–14) |
|---|---|---|
| Bauzeitenplan 1.000 Zeilen, 730 Tage | 60,0 / 59,8 | 58,8 / 52,4 |
| Vergleich 5.000 Zeilen × 5 Bieter (Bezug, gleicher Lauf) | – | 56,6 / 43,3 |
| LV-Grid `gross`, 5.000 Zeilen (Bezug, gleicher Lauf) | – | 60,0 / 59,2 |

6-fach gedrosselt (Kontrolle) Bauzeitenplan 26,3 / 11,7 (Vergleich 12,3 / 8,1). Die Balkenspalte liegt damit im Budget
der bestehenden Leistungstests des Vergleichsgrids (dieselben Prüfungen, keine Schranke gelockert).

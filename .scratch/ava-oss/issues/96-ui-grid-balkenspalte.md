# 96: `ui-grid`: Balkenspalte (Zeitleiste) im Vergleichsgrid

Status: ready-for-agent
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

- [ ] Unit-Tests der reinen Lagen-Rechnung (Tagesindex → Pixel, Abschneiden, Meilenstein) und E2E im Prüfstand des Pakets
      (`e2e/harness`): Kopf mit Monaten und KW, Balken an der richtigen Stelle und Breite, kritisch erkennbar, Tastatur in die
      Balkenzelle, Name für den Screenreader, abgeschnittener Balken mit Kennzeichen, dunkles Schema
- [ ] Leistungstest mit 1.000 Zeilen grün; bestehende E2E des Pakets grün
      (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/ui-grid e2e`)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

# 120: X4 in der App: Mängel und Bautagebuch, Tor X4

Status: claimed
Type: task
Welle: 6 · Strang: X4 · Ordner: `apps/web/src/bauleitung/` (neu); Einhängestellen in `App.tsx`, `projekt/ProjektSeite.tsx`,
`historie/arten.ts` (markiert `// Ticket 120`, D-20); E2E `apps/web/e2e/x4.spec.ts`, Kettentest `apps/web/src/x4-kette.test.ts`
Blocked by: 106, 111, 112, 113
Modell: sonnet
Regeln: A2, A5, U2–U5, Q2, Q5, D-57, D-58
Herkunft: `plan.md` §2 X4; Tor X4 (`plan.md` §4)

## What to build

1. **Mängel** (`/projekt/<id>/maengel`): Liste im `VergleichsGrid` (Nummer, Titel, Ort, Auftragnehmer, festgestellt, Frist,
   Status, Kennzeichen „überfällig“), Filter nach Status und Auftragnehmer; anlegen und bearbeiten in einem Formular (Titel,
   Beschreibung, Ort, Auftrags-LV und Position wahlweise, Bauteil eines Modells wahlweise, festgestellt, Frist; Nummer
   vorgeschlagen); Statusaktionen „Mangel anzeigen (Frist)“, „Beseitigung gemeldet“, „Abnehmen“, „Wieder öffnen“ mit Datum und
   Bemerkung; Verlauf sichtbar. Der **Stichtag** der Fristprüfung ist das heutige Datum der App (Rand, A2); überfällige Mängel
   als Befund mit Sprunglink. PDF „Mängelliste“ und „Mängelanzeige“ für einen Auftragnehmer (Ticket 113). Löschen mit
   Bestätigung.
2. **Bautagebuch** (`/projekt/<id>/bautagebuch`): Liste der Tage, Eintrag je Datum (Wetter, Temperaturen, Arbeitskräfte je Firma
   – Firmen vorgeschlagen aus den Auftragnehmern der Auftrags-LVs –, Geräte, Leistungen, Behinderungen, Vorkommnisse),
   zweiter Eintrag am selben Datum wird abgewiesen mit Hinweis; PDF für einen Zeitraum.
3. Undo/Redo (Tabelle `historie/arten.ts`), automatisch speichern, Neuladen behält alles.
4. **Tor X4** (D-58): `x4.spec.ts` mit fester Uhr in Playwright (`page.clock`) legt die Mängel und Bautagebucheinträge aus
   `fixtures/bauleitung.json` (Ticket 112) über die Oberfläche an → genau der überfällige Mangel als Befund → Auswertung =
   Soll → beide PDFs erzeugt → Neuladen; `x4-kette.test.ts` ohne Oberfläche gegen dieselben Sollwerte. Dreimal grün; sonst
   Kettentest plus verkürzte E2E.

Aus dem Review (D-66): Die Mängelanzeige nimmt die Frist aus dem Verlaufseintrag `angezeigt` (`frist?`), damit ein wieder
geöffneter Mangel die Frist der früheren Anzeige behält.

## Grenzen

- Regeln stehen in `bauleitung`. Keine Fotos (D-57). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der App-Logik, `x4.spec.ts` und `x4-kette.test.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-120.1** Stichtag: **`datumAusUhr(u.uhr())`** beim Laden der Seite (Rand, A2); `fristPruefen`/`maengelAuswerten` bekommen ihn als Wert. Grund: D-111.6 (der Aufrufer übergibt den Tag); `page.clock.setFixedTime` im E2E.
- **D-120.2** Auftragnehmer: **`AuftragsLvKopf.auftragnehmer.name`, sonst Name des Auftrags-LV** (der Zuschlag setzt ihn aus dem Bieter); Filter und Auswahl nach Name, zwei Aufträge derselben Firma sind eine Auswahl. D-111.5 (aktueller Status) bestätigt, D-111.6 (RangeError) nie ausgelöst, weil die App nur Kalendertage übergibt.
- **D-120.3** „Mangel anzeigen (Frist)“: **ein Undo-Schritt** aus `MangelstatusSetzen` (Eintrag mit `frist`, D-66) und, wenn die Frist abweicht, `MangelangabenSetzen`. Frist ist Pflicht bei dieser Aktion. Grund: Ticket 111 (Folgearbeit 120).
- **D-120.4** Mängelanzeige-Auswahl: **Mängel eines Auftragnehmers mit mindestens einem Eintrag `angezeigt`, Status offen oder angezeigt** (auch wieder geöffnete; sie behalten die Frist der Anzeige, D-66/D-113.4). Alternative: freie Auswahl.
- **D-120.5** Position im Formular als **OZ-Text** (Auflösung im gewählten Auftrags-LV), Bauteil als GlobalId (22 Zeichen) plus Modell oder „in jedem Modellstand“. Grund: skaliert bei großen LVs/Modellen, kein Listen-Select mit tausenden Einträgen.
- **D-120.6** Zeile ohne Auswahl: Das Grid meldet immer eine aktive Zeile; Aktionen gelten dieser. Nach dem Anlegen springt die Liste erst nach dem Neuladen zur neuen Zeile (`vorgemerkt`).
- **D-120.7** E2E-Aufbau: zu einem LV höchstens ein Auftrags-LV (D-21), daher `typisch` (Bieter A, Rohbau) und eine Kopie mit neuen Kennungen (Bieter B, Tiefbau) über Oberfläche (X84, Zuschlag). Mangel 2: erste Frist 19.11., nach Wiederöffnen über „Bearbeiten“ 04.12. (Fixture-Zustand); im Druck steht dann die Frist der Anzeige (19.11., D-66).
- **D-120.8** Bautagebuch: Auswertungszeitraum standardmäßig erster bis letzter Eintrag; PDF nimmt denselben Zeitraum. Firmen als Datalist und Schaltflächen aus den Auftragnehmern.

### Ergebnis (Branch `welle-6/120-web-bauleitung`)

Neu `apps/web/src/bauleitung/`: Seiten `MaengelSeite`, `BautagebuchSeite`, Formulare, `PdfDialog` mit Worker (`pdf-worker`, `pdf-lauf`), reine Logik `maengel.ts`, `bautagebuch.ts`, Schreibweg `schreiben.ts`, `pfad.ts`, `texte.ts`, Tests je Datei. Hooks `// Ticket 120` in `App.tsx`, `projekt/ProjektSeite.tsx`, `historie/arten.ts` (Umkehrung aus `bauleitung`); Abhängigkeit `@tethys/bauleitung` in `apps/web/package.json` und Lockfile. Tor X4: `e2e/x4.spec.ts` (+ `e2e/x4-aufbau.ts`), `src/x4-kette.test.ts`.

**Gate X4: bestanden.** `x4.spec.ts` (feste Uhr 26.11.2026) dreimal grün hintereinander (je ~33 s), Kettentest grün; genau Mangel 3 überfällig, Mangel 5 (Frist am Stichtag) nicht, Auswertung je Auftragnehmer 3/2/1 und 2/1/0, Bautagebuch 9/8/9, 2/19/5, Summe 26, beide Gegenproben, drei PDFs, Neuladen.

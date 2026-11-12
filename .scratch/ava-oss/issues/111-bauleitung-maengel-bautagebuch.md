# 111: X4: `bauleitung`: Mängel und Bautagebuch

Status: done-by-agent
Type: task
Welle: 6 · Strang: X4 · Paket: `packages/bauleitung` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: 97
Modell: opus
Regeln: A2, A3, A5, A6, U5, Q1, Q5, D-57
Herkunft: `plan.md` §2 X4 („Bauleitung: Mängel, Bautagebuch“), Berater D-57

## What to build

Ein reines TS-Paket (A2: keine Uhr; der Stichtag kommt vom Aufrufer), das die Befehle für `Mangel` und `Bautagebucheintrag`
(v1.6) ausführt und Auswertungen liefert. Es importiert nur `vertrag` und `dezimal` (`'packages/bauleitung':
['packages/vertrag', 'packages/dezimal']`, `apps/web` darf es importieren).

1. **Mängel.** `MangelBefehl` mit `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`. Der Ausführer bekommt den
   Bestand des Projekts (die bestehenden Mängel) für die Prüfung der eindeutigen Nummer; `naechsteMangelnummer`. Status nur
   über Verlaufseinträge: offen → angezeigt (mit Frist) → beseitigt → abgenommen; beseitigt → offen (Nachbesserung
   abgelehnt); andere Übergänge sind Fehler `statuswechsel-unzulaessig` (Lesart im Code als Tabelle). Datum eines
   Verlaufseintrags nicht vor dem vorigen: Fehler.
2. **Fristprüfung** zu einem Stichtag: überfällig = Frist vor dem Stichtag und Status offen oder angezeigt → Befund
   `mangel-frist-ueberschritten` mit Sprungziel; Frist am Stichtag ist nicht überfällig (Lesart am Code).
3. **Auswertung:** Mängel je Auftragnehmer (über das Auftrags-LV, dessen `Auftragnehmer` die App übergibt) und Status, offene
   und überfällige Zahl.
4. **Bautagebuch.** `BautagebuchBefehl` (Eintrag setzen = anlegen oder ersetzen, löschen) mit Prüfung „ein Eintrag je Datum“
   gegen den Bestand, Temperaturen und Köpfe ganzzahlig, Köpfe ≥ 0; Auswertung je Zeitraum: Arbeitskräfte je Tag und je Firma
   (Summen).
5. **Tests (Q1):** Golden-Tests für Statusverlauf, Fristprüfung (auch am Stichtag), Nummernvergabe, Bautagebuch-Summen;
   Property-Test: Umkehrung jedes Befehls stellt den Zustand wieder her.

Neue Begriffe (z. B. „Mängelanzeige“, „Frist“) zuerst ins `GLOSSARY.md` (L2), Abschnitt „Bauleitung (LP 8)“.

Aus Ticket 97 und dem Review (D-64, D-66): Befehlsnamen und Fehlercode `statuswechsel-unzulaessig` wie in v1.6; Befunde als
`Pruefbefund` mit Quelle `fristpruefung`; `Mangelverlaufseintrag.frist?` (bei `angezeigt`) hält die Frist der Mängelanzeige.

## Grenzen

- Nur `packages/bauleitung` (und die genannten Wurzeldateien). Keine Fotos (D-57). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Befehle, Umkehrung, Statustabelle, Fristprüfung, Auswertungen getestet; Paketgrenzen-Prüfung kennt `bauleitung`
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-111.0** Welche Nähte werden getestet? **Die öffentliche Fläche von `@tethys/bauleitung`**: Statustabelle
  (`MANGELSTATUSWECHSEL`, `statuswechselZulaessig`, `mangelstatus`), die beiden Ausführer samt Anwenden und Umkehren,
  `naechsteMangelnummer`, `fristPruefen`, `maengelAuswerten`, `bautagebuchAuswerten`; dazu der Kettentest auf
  `fixtures/bauleitung.json` (Tor X4) und die Paketgrenzen. Die Datumsprüfung (`datum.ts`) ist intern und nur über die Befehle
  getestet. Grund: Demo-Modus, Nähte selbst festgelegt; so prüfen die Tests Verhalten statt Aufbau.
- **D-111.1** Abhängigkeiten: **nur `vertrag`** in `package.json`; `tools/boundaries.mjs` erlaubt `vertrag` und `dezimal` wie
  im Ticket. Grund: Das Paket rechnet nur mit Zählern und ganzen Grad (N1 gilt nicht), `dezimal` würde nicht gebraucht.
- **D-111.2** Fehler im Verlauf: Ein Verlauf, der nicht mit `offen` beginnt, ist wie jeder unzulässige Wechsel
  **`statuswechsel-unzulaessig` mit `feld: 'status'`** (Vertrag: „sonst `statuswechsel-unzulaessig`“); ein unbekannter Statuswert
  `ungueltige-eingabe` (`status`), ein leerer Verlauf `ungueltige-eingabe` (`verlauf`), eine Feststellung nach dem ersten
  Eintrag auch beim Anlegen `ungueltige-eingabe` (`festgestellt`, wie bei `MangelangabenSetzen`). Prüfreihenfolge je Eintrag:
  Form, Wechsel, Datum gegen den vorigen. Eine Frist vor der Feststellung wird nicht geprüft (der Vertrag nennt die Regel
  nicht). Grund: enge Lesart des Vertrags, ein Code je Ursache.
- **D-111.3** Bestand: Ein Eintrag mit der eigenen Kennung zählt nie (Vertrag). Die **Nummer prüft nur `MangelAnlegen`**
  (danach ist sie fest); das Datum prüft `BautagebucheintragSetzen` beim Anlegen und Ersetzen. Ersetzen verlangt dieselbe
  Kennung und dasselbe Projekt (`ungueltige-eingabe` mit `feld: 'id'` bzw. `'projektId'`).
- **D-111.4** Leere Texte: **`''` wird `null`** (Beschreibung, Ort, Bemerkung, Wetterbeschreibung, Geräte, Leistungen,
  Behinderungen, Vorkommnisse), statt abzuweisen; Titel und Firma aus Leerraum werden abgewiesen. Grund: Der Vertrag sagt
  „nie `''`“; eine geleerte Eingabe ist kein Fehler (U5), Präzedenz `kosten` (Bemerkung `''` fällt weg). Alternative: abweisen.
- **D-111.5** Status für die Fristprüfung: **der aktuelle Status** (letzter Verlaufseintrag), nicht der Stand am Stichtag.
  Grund: Vertrag und D-57 („der Status sein letzter Eintrag“); die Fixture legt alle Einträge vor den Stichtag (D-112.5), die
  Sollwerte hängen nicht daran. Alternative: Status am Stichtag (letzter Eintrag mit Datum ≤ Stichtag) für Rückblicke.
- **D-111.6** Ungültiger Stichtag oder Zeitraum: **`RangeError`** in `fristPruefen`, `maengelAuswerten`, `bautagebuchAuswerten`.
  Grund: Den Tag übergibt die App aus ihrer Uhr oder einer Datumsauswahl; ein falscher ist ein Programmfehler und soll laut
  sein (Q5), nicht als leere Auswertung erscheinen. Daten in Befehlen bleiben Werte (`ungueltige-eingabe`). Ein umgekehrter
  Zeitraum (`von` > `bis`) ist kein Fehler, sondern leer. Alternative: Befund `stichtag-ungueltig`.
- **D-111.7** Befund der Fristprüfung: **Schwere `warnung`**, Quelle `fristpruefung`, Code `mangel-frist-ueberschritten`,
  Ort `{ mangelId, feld: 'frist' }` (D-97.11), nach Mangelnummer geordnet; die Codeliste führt das Paket
  (`Fristbefundcode`). Grund: Überfällig ist eine Aufforderung zu handeln, kein Fehler in den Daten (U5).
- **D-111.8** Auswertungen: Die Mängelauswertung hat **eine Zeile je Auftrags-LV** (zwei Aufträge derselben Firma bleiben zwei
  Zeilen; die App darf zusammenfassen): zuerst jedes übergebene Auftrags-LV in der übergebenen Reihenfolge, auch ohne Mangel,
  dann nicht übergebene Auftrags-LVs (`auftragnehmer: null`) nach kleinster Mangelnummer, zuletzt die Mängel ohne Auftrags-LV.
  „offen“ = Status offen oder angezeigt (D-112.5). Eingabe `Auftragnehmerangabe { auftragsLvId, auftragnehmer: string }` (die
  App nimmt den Namen aus `AuftragsLvKopf.auftragnehmer` oder dem Bieter), gleich der Form `auftraege` der Fixture. Bautagebuch:
  ein Tag mit Eintrag steht auch mit 0 Köpfen da, Firmen nach genauem Namen zusammengefasst und deutsch geordnet
  (`Intl.Collator('de-DE')` wie `speicher`, Gleichstand nach Code-Einheiten); die Summe heißt **`arbeitskraefte`**, weil die
  Lint-Regel N1 `summe: number` verbietet (der Kettentest vergleicht sie mit `summe` der Fixture).
- **D-111.9** Additive Felder: Die Ausführer **kopieren** Mangel, Verlaufseintrag und Bautagebucheintrag (`{ ...e }`) statt sie
  neu zu bauen, damit ein additives Feld nie still wegfällt (Q5). Nach dem Nachtrag zu 97 (D-66, SOLL 10) prüfen sie
  `Mangelverlaufseintrag.frist`: nur bei `angezeigt`, als Kalendertag, sonst `ungueltige-eingabe` (`feld: 'frist'`).
- **D-111.10** Fixture: **unverändert.** Die Formen von `fixtures/bauleitung.json` (D-112.5) sind genau die von v1.6; keine
  Formanpassung nötig, kein Sollwert berührt. Die Frist am Eintrag `angezeigt` ergänzt die Fixture nicht (SOLL 10: darf, muss
  nicht).

### Ergebnis (Branch `welle-6/111-bauleitung`, Basis `integration/welle-6`)

Neues Paket `packages/bauleitung` (`@tethys/bauleitung`, rein, A2): `mangelstatus.ts` (Statustabelle), `mangel-befehle.ts`
(`mangelBefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`, `naechsteMangelnummer`), `fristpruefung.ts`
(`fristPruefen`, `istUeberfaellig`), `maengelauswertung.ts` (`maengelAuswerten`), `bautagebuch-befehle.ts`
(`bautagebucheintragBefehlAusfuehren`, `…Anwenden`, `…Umkehren`), `bautagebuchauswertung.ts` (`bautagebuchAuswerten`);
intern `datum.ts`, `befehlshilfen.ts`; Tests je Datei, `befehle-eigenschaften.test.ts` (Umkehrung jedes angenommenen Befehls,
Verlauf nach der Tabelle, kein doppeltes Datum), `fixture.test.ts` (Kettentest Tor X4: alle Sollwerte und beide Gegenproben
der Fixture). Dazu `tools/boundaries.mjs` und Test (`bauleitung` darf `vertrag`, `dezimal`; die App darf `bauleitung`; `kern`
und `bauzeit` nicht), `pnpm-lock.yaml`, `GLOSSARY.md` (Frist, Mängelanzeige, Stichtag, Mangelnummer, Mängelauswertung,
Bautagebuchauswertung; Ergänzungen an Mangelstatus und Fristprüfung). Zweimal `integration/welle-6` gemergt (zuletzt mit dem
Nachtrag zu 97, D-66).

Folgearbeit: **120** (App) nutzt `fristPruefen` mit dem heutigen Datum, `maengelAuswerten` mit `Auftragnehmerangabe` je
Auftrags-LV und setzt bei der Mängelanzeige `Mangelverlaufseintrag.frist` und `Mangel.frist` im selben Undo-Schritt;
`historie/arten.ts` kann die Umkehrungen aus diesem Paket nehmen. **113** (PDF) kann `maengelAuswerten` und
`bautagebuchAuswerten` lesen.

### Prüfung

Nach dem letzten `git merge integration/welle-6` (Stand `aca2dcb`, mit dem Nachtrag zu 97): `NODE_OPTIONS=--max-old-space-size=8192
pnpm lint` grün (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean Room), `pnpm typecheck` grün, `node --test "fixtures/*.test.mjs"`
53/53. `pnpm test` (Vitest): 252 Dateien bestanden, 1 übersprungen, 6 rot, 3.285 Tests bestanden, 3 übersprungen; rot waren nur
Leistungsbudgets anderer Pakete bei Lastmittel 20–45 auf 4 Kernen (volle Suite: `gaeb/lesen` 1.708 ms < 1.000,
`kern/lv-pruefung-fixtures` 84,7 ms < 50, `kern/mengenansatz-leistung` 26,6 ms < 16, `speicher/aufmass-leistung` 163 ms < 100,
`vergabe/leistung` 4.227 ms < 1.000, `web/abrechnung/leistung` 114 ms < 100; in früheren Läufen ebenso `gaeb/schreiben`,
`kern/k9-leistung`, `kern/summen-leistung`). **Jede Datei allein wiederholt: alle grün** (Lastmittel 19). Kein Budget gelockert,
nichts übersprungen; dieser Branch ändert keines dieser Pakete. `bauleitung` selbst: 8 Dateien, 56 Tests grün.

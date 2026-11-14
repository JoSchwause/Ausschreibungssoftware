# 143: `abrechnung`: Vertragsstrafe, Skonto, Bauabzugsteuer, Zahlungen; Fixture und Kettentest

Status: done-by-agent
Type: task
Welle: 7 · Strang: A5 · Paket/Ordner: `packages/abrechnung`, `packages/speicher` (nur Rechnungsdekoder, D-93), `fixtures/` (neue Datei `typisch-zahlungen.json` o. ä.)
Blocked by: 128
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: N1–N3, A2, Q1, Q5, C4; D-34, D-72
Herkunft: umfang §3 A5, G-61

## What to build

1. **Sollwerte zuerst:** eine Fixture mit Herleitung je Zahl (Regel D-72, D-34; C4), aufbauend auf `typisch-abrechnung.json`:
   Rechnung 1 mit Skonto (Zahlung in der Frist), Rechnung 2 mit Vertragsstrafe und Zahlung nach der Frist (kein Skonto),
   Bauabzugsteuer an einer Rechnung, Teilzahlung mit offenem Betrag. Die Herleitung unabhängig vom Code (z. B. in
   `fixtures/rechnen.mjs` oder als Text in der Fixture).
2. **Rechnung prüfen** nach D-72 (beide Skonto-Szenarien, Fristende, verwirklichter Skonto, Bauabzugsteuer, Auszahlung, offen);
   Befunde (kein Eingangsdatum, Zahlung über Auszahlung, …).
3. **Befehle:** Zahlung erfassen/ändern/löschen (nur bei freigegebener Rechnung), Freigabe aufheben gesperrt bei Zahlungen,
   Vertragsstrafe/Skonto/Bauabzugsteuer setzen; Vorschlag der kumulierten Vertragsstrafe aus der Vorrechnung.
4. Alte Rechnungen ohne neue Felder ergeben dieselben Zahlen (Goldens M4 unverändert).
6. **Speicher (D-93):** Rechnungsdekoder und Projektdatei-Prüfung kennen `vertragsstrafe`, `skonto`, `bauabzugsteuer`, `zahlungen` (alle optional, Schema 7 bleibt); `konflikt`, wenn eine Zahlung an einer nicht freigegebenen Rechnung gespeichert würde; Rundweg-Test mit der Fixture.
5. **Kettentest ohne Oberfläche** (`packages/abrechnung` oder `apps/web/src/a5-kette.test.ts` – nur wenn Ordnerbesitz frei;
   sonst im Paket) mit derselben Fixture. Property-Tests für Rundung und Nichtnegativität des offenen Betrags.

## Acceptance criteria

- [x] Fixture mit Herleitung; Kettentest gleich Soll; M4-Goldens unverändert
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Lesarten und Entscheidungen (Demo-Modus; Verbraucher: 152 App, 153 Ausgabe):

- **D-143.1 Form der Fixture.** `fixtures/typisch-zahlungen.json` trägt die Rechnungen in der Form von `Rechnung` (v1.7b);
  ganze Zahlen (`nummer`, `fristTage`) als JSON-Zahl wie D-112.2 (X2–X4), nicht als Text wie M4 (D-85.4), damit Rechnungen und
  Befehle direkt den Vertragstypen zuweisbar sind. Die Kette hat die M4-Feldnamen plus `vertragsstrafe` zwischen `umlagen` und
  `einbehalt`; der Zahlungsstand die Feldnamen von `Zahlungsstand`. Herleitung je Zahl in `herleitung` und README „Abzüge und
  Zahlungen: A5“; Selbsttest `fixtures/zahlungen.test.mjs` rechnet alles eigens nach (BigInt, eigener Kalender, ohne Pakete).
- **D-143.2 Szenario.** Auf M4: AR 1 wird vor der Korrektur geprüft und mit 8.874,40 freigegeben (M4 unverändert), mit 3 % /
  14 Tage Skonto und Bauabzugsteuer, Zahlung 7.316,94 genau am Fristende (verwirklicht, offen 0,00). AR 2 nach der Korrektur
  mit Vertragsstrafe 1.500,00 (Zahlbetrag 10.070,67 → 8.570,67), 2 % / 10 Tage Skonto, Teilzahlung 5.000,00 in der Frist und
  3.000,00 danach (nicht verwirklicht, offen 570,67). Vier Varianten (ohne neue Felder; Zahlung einen Tag zu spät; Überzahlung
  mit Befund; ohne Eingang mit Befund). Die Bauabzugsteuer steht an AR 1, weil dort die Basis mit verwirklichtem Skonto geprüft
  wird; der Fall ohne Skonto steckt in der Variante „Zahlung nach Fristende“.
- **D-143.3 Grund der Vertragsstrafe.** Nur Leerraum gilt als leer (`ungueltige-eingabe`, `feld: 'vertragsstrafe.grund'`); der
  Text wird unverändert gespeichert (kein Trimmen). `speicher` prüft dasselbe.
- **D-143.4 Fristende.** Gerechnet ohne `Date` (A2) mit `plusKalendertage` (exportiert). Ein `eingang`, der kein Tag ist (lässt
  der Ausführer nicht zu), oder ein Fristende hinter dem Jahr 9999 gilt wie kein Eingang: Fristende `null`, kein Skonto, Befund
  `skonto-ohne-eingang`.
- **D-143.5 Vorschlag der Vertragsstrafe.** Reine Funktion `vertragsstrafeVorschlag(rechnungen, auftragsLvId, nummer)`: die
  Strafe der Rechnung desselben Auftrags-LV mit der größten kleineren Nummer (freigegeben oder nicht), sonst `null`. Die App
  (152) trägt sie in `RechnungAnlegen.rechnung` ein (D-128.3), wie die Einbehaltssätze in `neuerEntwurf`.
- **D-143.6 Ergebnistypen für 152/153.** `Rechnungspruefung.zahlungsstand: Zahlungsstand` (vom eingefrorenen Zahlbetrag aus,
  sonst Vorschau vom geprüften), `Abzugskette.vertragsstrafe: Betrag` (0,00 ohne) zwischen `umlagen` und `einbehalt`,
  `Rechnungsbefund` enthält `Zahlungsbefund` (nach `freigabe-abweichend`). Neue Exporte: `zahlungsstandBerechnen(rechnung,
  zahlbetrag)`, `plusKalendertage`, `vertragsstrafeVorschlag`. 153 nimmt die Kette als eigene Eingabe (D-128.9) und braucht
  dort eine Zeile „Vertragsstrafe“ zwischen Umlagen und Einbehalt.
- **D-143.7 Zahlungsbefehle.** Prüffolge: Freigabe (`ungueltige-eingabe`, `feld: 'freigabe'`), dann Form (`zahlung.id`,
  `zahlung.datum` – `null` oder kein Tag –, `zahlung.betrag` > 0,00), dann Kennung (`id-vergeben` mit `feld: 'zahlung.id'`
  bzw. `ungueltige-eingabe`, `feld: 'zahlungId'`). Meldung von `zahlungen-vorhanden` wie das Beispiel im Vertrag („Zur Rechnung 1
  ist 1 Zahlung erfasst.“ / „sind 2 Zahlungen“). `RechnungLoeschen` an einer freigegebenen Rechnung bleibt
  `rechnung-freigegeben`, auch mit Zahlungen.
- **D-143.8 Anlegen streng.** Ein vorhandener Schlüssel `vertragsstrafe: null`, `skonto: null`, `bauabzugsteuer: false` oder
  `zahlungen` (auch `[]`) ist `ungueltige-eingabe` (D-128.2: „fehlt“ ist die einzige Schreibweise). Die neuen Felder werden in
  Vertragsfolge ans Ende kanonisiert, `zahlungen` entfällt mit der letzten Zahlung.
- **D-143.9 Speicher.** Der Dekoder liest die vier Felder optional mit denselben Formen wie der Ausführer (Beträge > 0,00,
  Satz 0 < s < 100, Frist 1–365, Tag, den es gibt, Kennungen eindeutig, nie `null`/`false`/`[]`). Eine Datei mit Zahlungen an
  einer nicht freigegebenen Rechnung ist `datei-ungueltig`; ein ChangeSet (auch Undo, auch beim Einlesen) mit diesem `nachher`
  ist `konflikt` (`pruefeZahlungenNurFreigegeben`). `dateiAuf7` weist eine Datei der Version 6 mit einem der Felder oder einem
  der sechs Befehle ab (der Kopf der Datei sagt „wird nicht mehr geändert“; D-93 verlangt die Prüfung dort, für gültige Dateien
  ändert sich nichts). Kein neues Schema.
- **D-143.10 Mechanische Zeilen in `apps/web/src/rechnung`** (außerhalb des Paketschnitts, vom Typcheck erzwungen, weil
  `befundtext` alle Codes von `Rechnungsbefund` abdeckt): zwei `case` und zwei Texte („Skonto vereinbart, aber kein
  Eingangsdatum: …“, „Gezahlt wurde mehr als die Auszahlung (offen … €).“). 152 prüft und ändert die Texte nach Bedarf.
- **D-143.11 Kettentest.** Im Paket (`packages/abrechnung/src/a5-kette.test.ts`): ab dem M4-Stand aus den Testhilfen
  (`vergabe` ist dort nicht importierbar, A3), die Befehle der Fixture so, wie die App sie schickt; Vergabe → Abrechnung bleibt
  der Kettentest von M4 (`apps/web/src/m4-kette.test.ts`, unverändert). Property-Tests: `zahlungsstand-eigenschaften.test.ts`.
- Weiter unsicher (D-72, auf die Seite „Annahmen“): Basis der Bauabzugsteuer ohne Umlagen und Vertragsstrafe (§ 48 EStG).

Ergebnis (nach Merge von `integration/welle-7` bis 2895109): Lint grün, Typcheck grün. Unit-Tests 4.588 grün, rot nur 11 Zeit-
budgets bzw. Zeitüberschreitungen unter Parallellast (Last ≈ 20 auf 4 Kernen; `gaeb` Lesen/Schreiben, `kern` K9 und lvPruefen,
`speicher` Aufmaß- und X1-Budgets, `vergabe` Preisspiegel, App D-45, zwei PDF-Tests in `ausgabe`, die allein grün laufen);
keines berührt von diesem Ticket, nichts gelockert. Fixtures (`node --test`) 59 grün. E2E `rechnung.spec.ts` und `m4.spec.ts`
grün. `typisch-abrechnung.json` und die M4-Goldens unverändert.

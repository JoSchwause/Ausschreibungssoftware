# 128: `vertrag` v1.7b: Vertragsstrafe, Skonto, Bauabzugsteuer, Zahlungen

Status: claimed
Type: task
Welle: 7 · Strang: F, A5 · Paket/Ordner: `packages/vertrag` (+ `GLOSSARY.md`)
Blocked by: 127
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A4, P9, N1–N3, A8, Q5; D-34, D-72
Herkunft: umfang §3 A5, G-61

## What to build

Typen für A5 genau nach **D-72** (`../entscheidungen-auto.md`), additiv zu D-34:

- An der Rechnung: Vertragsstrafe (Betrag brutto, Grund; kumuliert geführt, Vorschlag aus der Vorrechnung), Skonto (Satz in
  Prozent, Frist in Kalendertagen), Schalter Bauabzugsteuer (Standard aus), Satz 15 als Konstante.
- Zahlungen je Rechnung (Datum, Betrag; nur auf freigegebene Rechnungen); Befehle Zahlung erfassen/ändern/löschen;
  Fehlercode „Freigabe aufheben gesperrt, solange Zahlungen bestehen“.
- Ergebnisfelder der Prüfung: Vertragsstrafe, möglicher Skonto, Fristende, verwirklichter Skonto, Bauabzugsteuer, Auszahlung
  (beide Szenarien), Σ Zahlungen, offener Betrag; neue Befundcodes (u. a. „kein Eingangsdatum, kein Skonto“).
- Neue Felder optional/`null` bei alten Rechnungen; alte Ergebnisse bleiben gleich (A8).
- Glossar: Vertragsstrafe, Skonto, Skontofrist, Bauabzugsteuer, Zahlung, offener Betrag, Auszahlung.

## Acceptance criteria

- [ ] Typen und Befehle nach D-72 mit Typtests; Lesarten unter `## Comments` (D-128.x)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Lesarten von `vertrag` v1.7b für die Verbraucher 143 (abrechnung), 139 (speicher), 152 (App), 153 (ausgabe) (Demo-Modus,
vorläufige Annahmen, enge Lesart; dieselben Texte stehen an den Typen). Alles additiv oder optional: Rechnungen, Projektdateien
(Schema 1–7), Protokolle und Fixtures vor v1.7b typprüfen und ergeben dieselben Zahlen (A8).

- **D-128.1 Ort der Zahlungen.** Frage: eigenes Aggregat oder an der Rechnung? Entscheidung: Feld `Rechnung.zahlungen`, kein
  neues Aggregat, kein neues ChangeSet, keine neue Aggregatart im Protokoll; alle neuen Befehle sind `RechnungBefehl`, ihr
  ChangeSet ist `RechnungChangeSet` (ganze Rechnung vorher/nachher). Grund: „nur auf freigegebene Rechnungen“ und „Freigabe
  aufheben gesperrt“ werden Regeln an einem Aggregat, das der Ausführer allein sieht (D-70.3); Undo, Historie der App und
  Speicherweg bleiben, wie sie sind.
- **D-128.2 Neue Felder.** `vertragsstrafe?: Vertragsstrafe`, `skonto?: Skonto`, `bauabzugsteuer?: true`, `zahlungen?:
  readonly Zahlung[]`, am Ende der `Rechnung` in dieser Reihenfolge (kanonische Feldfolge für den Ausführer, A8). „Fehlt“ ist
  die einzige Schreibweise für keine/aus (nie `null`, `false`, `[]`; wie D-43). „Per Migration `null`“ aus D-72 heißt für
  139: eine leere Spalte bzw. ein fehlender Schlüssel ergibt das fehlende Feld. Eine Rechnung ohne die Felder rechnet genau
  wie bisher (Kette D-34, kein Skonto, keine Steuer, keine Zahlungen).
- **D-128.3 Vertragsstrafe.** `{ betrag, grund }`, `betrag` > 0,00 brutto und kumuliert (die ganze bis zu dieser Rechnung
  geltend gemachte Strafe), `grund` nicht leer; sonst `ungueltige-eingabe` (`feld: 'vertragsstrafe.betrag'`/`'.grund'`).
  Befehl `VertragsstrafeSetzen { vertragsstrafe | null }`, nur vor der Freigabe (ändert den Zahlbetrag). Kette (143): nach
  den Umlagen, vor dem Einbehalt; Steuerbasis und die Basis von Umlagen und Einbehalt bleiben das Brutto kumuliert;
  `Abzugskette` bekommt `vertragsstrafe: Betrag` (0,00 ohne) zwischen `umlagen` und `einbehalt`. Gelesen bei `abschlag` und
  `schluss`. Vorschlag aus der Vorrechnung: Die App (152) setzt beim Anlegen die Strafe der vorigen Rechnung in
  `RechnungAnlegen.rechnung` (wie die Einbehaltssätze). Beispiel mit Herleitung: `beispielRechnung2MitVertragsstrafe`
  (Zahlbetrag 2,63 → 1,63).
- **D-128.4 Skonto.** `{ satz: Prozent, fristTage: number }`, Satz größer 0,00 und kleiner 100,00, Frist ganze Zahl 1–365;
  sonst `ungueltige-eingabe` (`feld: 'skonto.satz'`/`'.fristTage'`). Befehl `SkontoSetzen { skonto | null }`, nur vor der
  Freigabe. Fristende = `eingang` + `fristTage` Kalendertage (der Eingangstag zählt nicht, kein Verschieben auf Werktage);
  eine Zahlung am Fristende ist rechtzeitig. Ohne `eingang`: Fristende `null`, möglicher Skonto 0,00, Befund
  `skonto-ohne-eingang`. Möglicher Skonto = round(Zahlbetrag × Satz / 100, 2), 0,00 bei Zahlbetrag ≤ 0,00 (D-72).
- **D-128.5 Bauabzugsteuer.** Schalter `bauabzugsteuer?: true`, Befehl `BauabzugsteuerSetzen { bauabzugsteuer: boolean }`
  (`false` entfernt das Feld), nur vor der Freigabe. Satz als Konstante `BAUABZUGSTEUER_SATZ` = `'15.00'` (`Prozent`) im
  Vertrag, die eine Stelle für Rechnung, Oberfläche und Ausgabe. Je Fall round((Zahlbetrag − Skonto des Falls) × 15 / 100, 2);
  **Lesart: 0,00 bei einer Basis ≤ 0,00** (D-72 sagt es nur für den Skonto; bei einer Überzahlung gibt es keine Gegenleistung,
  von der etwas einzubehalten wäre). Umlagen und Vertragsstrafe nicht in der Basis (D-72, als unsicher auf die Seite
  „Annahmen“).
- **D-128.6 Zahlung.** `{ id: ZahlungId, datum: Kalenderdatum, betrag: Betrag }`, Betrag > 0,00, Datum ein Tag, den es gibt
  (`feld: 'zahlung.betrag'`/`'zahlung.datum'`); eine Rückzahlung kennt v1 nicht. Neue Kennungsart `ZahlungId` und
  `IdQuelle.zahlung()` (A7). `ZahlungErfassen { zahlung }` hängt an (Kennung schon da: `id-vergeben`); `ZahlungAendern {
  zahlung }` ersetzt Datum und Betrag an ihrer Stelle; `ZahlungLoeschen { zahlungId }`, die letzte entfernt das Feld;
  unbekannte Kennung: `ungueltige-eingabe` (`feld: 'zahlungId'`). Reihenfolge des Erfassens; die Anzeige ordnet nach Datum.
  Eine Zahlung geht an den Auftragnehmer; die Steuer an das Finanzamt wird nicht als Zahlung erfasst. Neue Datumsfelder sind
  `Kalenderdatum` (D-127.13: neue Felder haben keine alten Erzeuger), `Rechnung.eingang` bleibt Text.
- **D-128.7 Freigabe und Zahlungen (Q5).** An einer freigegebenen Rechnung gelten nur `RechnungsfreigabeAufheben` und die drei
  Zahlungsbefehle; alles andere wie bisher `rechnung-freigegeben`, auch Vertragsstrafe, Skonto und Bauabzugsteuer (sie gelten
  für die Zahlungsfreigabe, die mit der Freigabe entsteht). Zahlungsbefehl an einer nicht freigegebenen Rechnung:
  `ungueltige-eingabe` (`feld: 'freigabe'`), wie `RechnungsfreigabeAufheben` an einer nicht freigegebenen. Neuer Code
  `zahlungen-vorhanden`: `RechnungsfreigabeAufheben` an einer Rechnung mit Zahlungen. Invariante an der Rechnung: Zahlungen ⇒
  Freigabe; `speicher` (139) weist ein ChangeSet, dessen `nachher` sie verletzt, mit `konflikt` ab, auch ohne Ausführer
  (Undo von `RechnungFreigeben`). `RechnungAnlegen` mit `zahlungen`: `ungueltige-eingabe` (`feld: 'zahlungen'`); Vertragsstrafe,
  Skonto und Bauabzugsteuer darf es mitbringen.
- **D-128.8 Zahlungsstand (Ergebnis, nie gespeichert).** `Zahlungsstand { zahlbetrag, fristende, mitSkonto, ohneSkonto,
  skontoVerwirklicht, verwirklichterSkonto, bauabzugsteuer, auszahlung, summeZahlungen, offen }`, je Fall
  `Auszahlungsszenario { skonto, bauabzugsteuer, auszahlung }`. Basis `zahlbetrag`: der eingefrorene, sobald freigegeben,
  sonst der geprüfte (Vorschau). Folgerechnungen ziehen weiter nur eingefrorene Zahlbeträge ab; Skonto, Steuer und Zahlungen
  wirken nie auf eine spätere Rechnung (D-72). Verwirklicht: möglicher Skonto > 0,00 **und** Σ Zahlungen mit Datum ≤
  Fristende ≥ `mitSkonto.auszahlung` (Lesart: ohne möglichen Skonto nie „verwirklicht“, die Beträge sind dann gleich).
  `verwirklichterSkonto`, `bauabzugsteuer`, `auszahlung` sind die des geltenden Falls; `offen` = Zahlbetrag − verwirklichter
  Skonto − Bauabzugsteuer − Σ Zahlungen, negativ möglich. Befunde `Zahlungsbefund`: `skonto-ohne-eingang`,
  `zahlungen-ueber-auszahlung { offen }` (nur mit mindestens einer Zahlung und `offen` < 0; ohne Zahlungen meldet ein
  negativer Zahlbetrag weiter nur `ueberzahlung`). 143: `Rechnungspruefung` bekommt `zahlungsstand: Zahlungsstand`,
  `Rechnungsbefund` die `Zahlungsbefund`e, in dieser Reihenfolge nach `freigabe-abweichend`. Beispiel mit Herleitung:
  `beispielZahlungsstand` (3 % Skonto, 14 Tage, Steuer an, Zahlung in der Frist, offen 0,00).
- **D-128.9 Ort der Ergebnistypen.** `Zahlungsstand`, `Auszahlungsszenario`, `Zahlungsbefund` stehen im Vertrag, weil `ausgabe`
  (153) die Zahlungsfreigabe druckt und `abrechnung` nicht importieren darf (A3; wie `Leistungsstand`, `Honorarergebnis`).
  `Abzugskette`, `Rechnungspruefung`, `Rechnungsbefund` bleiben in `abrechnung` (sie hängen an `Leistungsbefund`); 141/153
  nehmen die Kette als eigene Eingabe des Drucks.
- **D-128.10 Form der Lieferung.** Neue Datei `zahlung.ts` (Typen, Konstante), Felder in `modell.ts`, Befehle in
  `befehle.ts`, Code in `changeset.ts`, `ZahlungId` und `IdQuelle.zahlung` in `marken.ts`; Version im Kopf von `index.ts`.
  Typtests in `vertrag-v17b.test.ts` (Beispiele in Cent nachgerechnet); in `vertrag.test.ts` nehmen die geschlossenen Listen
  aus v1.4 die sechs Befehle und den Code aus. Glossar zuerst (L2): Vertragsstrafe, Skonto / Skontofrist, Bauabzugsteuer,
  Auszahlung, Zahlung, Offener Betrag / Zahlungsstand; Rechnung, Zahlbetrag / Freigabe, Rechnungsprüfung / Abzugskette
  nachgezogen.
- **D-128.11 Mechanische Folgezeilen (vom Typcheck erzwungen).** abrechnung `rechnungBefehlAusfuehren`: die sechs Befehle
  antworten `befehl-nicht-zustaendig` bis 143 (an einer freigegebenen Rechnung greift vorher wie bisher
  `rechnung-freigegeben`); speicher `BEFEHLSARTEN`: die sechs Namen; App `lv/texte.ts`: Text zu `zahlungen-vorhanden`
  (152 prüft ihn); `IdQuelle.zahlung` in `apps/web/src/lv/ids.ts` und `packages/gaeb/src/testhilfen.ts`. Nicht erzwungen und
  darum nicht hier: Der Ausführer kanonisiert die Felder noch nicht (143). **Offen für `speicher`:** Der Dekoder aus 139
  (`rechnungZustand`) lässt nur die Schlüssel bis v1.7a zu und weist eine Rechnung mit Vertragsstrafe, Skonto,
  Bauabzugsteuer oder Zahlungen ab; nach D-139.2 braucht es keine SQL-Migration, nur den Dekoder, die Prüfung in der
  Dateimigration und den `konflikt` aus D-128.7 (Zahlungen ⇒ Freigabe). 139 ist erledigt, 143 hat `speicher` nicht im
  Paketschnitt: braucht einen Schreiber (Orchestrator).
- **D-128.12 Nicht geändert.** `Speicher.einstellungen` bleibt optional (offene Frage 1 aus 127): 139 ist nicht gemergt, eine
  Pflicht jetzt bräche den Typcheck von `speicher`. Gehört in die nächste Vertragsversion nach 139.

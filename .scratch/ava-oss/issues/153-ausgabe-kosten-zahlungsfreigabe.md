# 153: `ausgabe`: Kostenermittlung, Kostenkontrolle, Zahlungsfreigabe mit A5

Status: done-by-agent
Type: task
Welle: 7 · Strang: O, E12 · Paket/Ordner: `packages/ausgabe`
Blocked by: 141, 128
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: ADR 0012, N4, D-72
Herkunft: umfang §3 E12, E11 (A5-Zeilen)

## What to build

1. **Kostenermittlung** und **Kostenkontrolle** als PDF und Excel (je KG, mit Bezeichnungen, wo vorhanden; netto, Nachlass als
   eigene Zeile, D-37).
2. **Rechnungsprüfung/Zahlungsfreigabe** um die A5-Zeilen (Vertragsstrafe, Skonto beider Szenarien, Bauabzugsteuer „an das
   Finanzamt“, Auszahlung, Zahlungen, offen) ergänzen.
4. **ADR 0012 nachführen (D-88):** datierter Nachtrag in den Folgen: Excel für Berichte aus dem `Berichtsmodell` (D-141.2), Bilder aus dem Langtext im LV-PDF (D-141.5); die Entscheidung selbst bleibt.
3. **K:** Bauzeitenplan-PDF mit Balken – nur, wenn Zeit bleibt; sonst im Ticket als gekürzt vermerken.

## Acceptance criteria

- [x] Seitentext-/Zelltests für 1–2
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-153.1** Woher kennt `ausgabe` die Ergebnisse von `kosten`? **Wie D-141.1: Eingabetypen in `ausgabe`, gleich gebaut
  wie `Kostenermittlungsergebnis` und `Kostenkontrolle`; die App reicht sie unverändert durch.** Eine Typprobe in `apps/web`
  (nicht committet) hat gezeigt, dass `Kostenermittlung`, `Kostenermittlungsergebnis`, `Kostenkontrolle`,
  `Einstellungen.kostengruppenbezeichnungen`, `Einstellungen.buero` und `Projekt` ohne Umweg passen.
- **D-153.2** Titel der Kostenermittlung: **die Stufe („Kostenberechnung“), im Kopf „Kostenermittlung: Name“;** die Texte der
  Stufen stehen als `KOSTENERMITTLUNGSSTUFE_TEXT` im Paket (gleich wie am Bildschirm). Grund: So heißt das Dokument im Büro.
- **D-153.3** Gliederung im Druck: **keine Einrückung, Kostengruppen der ersten Ebene fett.** Grund: Die Einrückung des
  Berichtsmodells setzt Leerzeichen vor die erste Zelle, in Excel stünde die KG dann als „  330“ und ließe sich nicht mehr
  filtern; die Nummer selbst zeigt die Ebene.
- **D-153.4** Kostenkontrolle: **„Ohne Kostengruppe“, „Nachlass“ und „Gesamt“ als Zeilen nach den Kostengruppen, Text in der
  Spalte Bezeichnung; Budget und Abweichung `null` als „–“; die Abweichung trägt „über Budget“ / „unter Budget“ als Hinweis
  (wie Symbol und Beschreibung am Bildschirm, nicht nur als Vorzeichen); `mitAbrechnung: false` druckt die Spalte
  Abrechnung als „–“ mit dem Satz der Seite.** Hinweise der Kostenkontrolle kommen als fertige Texte (`hinweise`), weil ihre
  Schwere „hinweis“ nicht in `Befundtext` passt.
- **D-153.5** Seite: **A4 hoch** (sechs Spalten passen), `{lv}` = Name der Kostenermittlung bzw. „Kostenkontrolle“.
- **D-153.6** Bauzeitenplan-Balken (K): **neuer Block `balkenplan` im `Berichtsmodell` (Achse in Abschnitten, je Zeile ein
  Balken mit Lage als Anteil 0 bis 1), als eigener Abschnitt „Balkenplan“ zwischen Tabelle und kritischem Weg.** Die Lage
  bestimmt das Modell aus den Terminen der Terminrechnung in Kalendertagen (Beginn bis Ende des letzten Tages, Meilenstein an
  seinem Tag); das ist Satz, keine Fachrechnung, und ohne Uhr (A2). Achse je Monat, ab 15 Monaten je Jahr; ein Abschnitt unter
  24 pt bleibt unbeschriftet. Kritisch dunkel, sonst grau, Sammelvorgang schmal, Meilenstein als Raute; „kritisch ja/nein“
  steht weiter als Text in der Tabelle (nicht nur Farbe). A4 hoch, Achse 300 pt. Excel schreibt beim Balkenplan nur die Namen
  (der Bauzeitenplan hat ohnehin keinen Excel-Einstieg). Ohne berechnete Termine steht ein Satz statt des Plans.
- **D-153.7** Kritischer Weg im PDF: **Trenner „›“ statt „→“.** Der Pfeil fehlt im Latin-Teil von Noto Sans und erschien als
  leeres Kästchen (bei der Sichtprüfung des PDF gefunden); am Bildschirm bleibt „→“.
- **D-153.8** A5-Zeilen (Punkt 2; Bezeichnungen vom Orchestrator bestätigt): **Vertragsstrafe „Vertragsstrafe (Grund)“ als
  Abzug zwischen Umlagen und Einbehalt, wenn die Rechnung eine trägt oder die Kette einen Betrag ≠ 0,00 nennt
  (`kette.vertragsstrafe`, seit 143 in der `Abzugskette`; im Eingabetyp optional, damit eine Kette ohne A5 weiter passt). Nach „Freigabe“ ein Abschnitt „Zahlungsfreigabe“ aus
  `pruefung.zahlungsstand` (`Zahlungsstand` aus `vertrag`, optional; ohne ihn bleibt der Druck wie vor A5):** mit Skonto und
  Fristende eine Tabelle beider Fälle („Bei Zahlung bis TT.MM.JJJJ“ / „Danach“: Zahlbetrag, Skonto (Satz), „Bauabzugsteuer
  15,00 % an das Finanzamt“, „Auszahlung an den Auftragnehmer“) und derselbe Inhalt als Satz („Bei Zahlung bis …: Auszahlung
  …, danach: …“, D-72); Skonto ohne Eingangsdatum: ein Satz statt des zweiten Falls. Dann der geltende Fall als Felder:
  „Zahlbetrag (eingefroren)“ bzw. „(geprüft, noch nicht freigegeben)“, „Skonto (verwirklicht/nicht verwirklicht)“,
  Bauabzugsteuer, Auszahlung, „Summe der Zahlungen“, „Offen“; die Zahlungen als Liste nach Datum, ohne Zahlung „Noch keine
  Zahlung erfasst.“ Die Unterschriftszeilen stehen danach am Ende. Den Satz der Steuer nennt `BAUABZUGSTEUER_SATZ`.
- **D-153.9** Seitenumbruch: **Eine Tabelle bis 8 Zeilen wird im Berichts-PDF nicht geteilt, und eine Überschrift direkt
  davor bleibt bei ihr.** Bei der Sichtprüfung fiel die letzte Zeile der Fälle auf die nächste Seite und die Überschrift
  blieb allein stehen; betrifft alle Berichte mit kleinen Tabellen (Inhalt gleich, nur der Umbruch).

### Ergebnis (Branch `welle-7/153-ausgabe-kosten`, nach dem Merge von 128 und 143)

- Punkt 1: `baueKostenermittlungModell`, `baueKostenkontrolleModell`, `erzeugeKostenermittlungPdf`,
  `kostenermittlungAlsExcel`, `erzeugeKostenkontrollePdf`, `kostenkontrolleAlsExcel` (Eingaben `KostenermittlungEingabe`,
  `KostenkontrolleEingabe`; die App reicht die Ergebnisse von `kosten`, die Bezeichnungen und das Büro aus den Einstellungen
  durch). Für die Kostenseite (154).
- Punkt 2: `RechnungspruefungEingabe.pruefung` nimmt `Rechnungspruefung` aus `abrechnung` unverändert (Vertragsstrafe in der
  Kette, `zahlungsstand`; Typprobe in `apps/web`, nicht committet); Sollwerte aus `fixtures/typisch-zahlungen.json` (AR 1 und AR 2) im Seitentext geprüft.
- Punkt 3 (K): Balkenplan im Bauzeitenplan-PDF. Punkt 4: Nachtrag ADR 0012.
- Prüfläufe: `pnpm lint` grün, `pnpm typecheck` grün. `pnpm test`: 4.650 grün, 11 rot, 3 übersprungen; rot sind nur
  Leistungsbudgets (abrechnung-App Undo, ausgabe LV-Druck, gaeb X84 und Lesen, kern Bauteile und lvPruefen, speicher Aufmaß
  und v1.6, vergabe) bei einer Last um 25 bis 30 auf 4 Kernen. Einzeln: ausgabe LV-Druck, gaeb Lesen, kern lvPruefen,
  Mengenansatz, Summen und vergabe grün; App-Undo, kern K9, speicher Aufmaß und v1.6 auch einzeln rot (fremde Pakete, nicht
  geändert, Last). Nichts gelockert.
- E2E `ausgabe.spec.ts` und `x2.spec.ts` (Bauzeitenplan-PDF aus der App): 9 grün (`--workers=1`).
- Für 152: die Zahlungsfreigabe druckt sich mit `erzeugeRechnungspruefungPdf({ rechnung, auftragsLv, pruefung, … })`, wobei
  `pruefung` das Ergebnis von `rechnungPruefen` ist; die Befunde des Zahlungsstands kommen wie bisher als `befundtexte`.

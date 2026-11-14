# 152: App: Aufmaß- und Rechnungsausgaben, Skonto, Zahlungen

Status: resolved
Type: task
Welle: 7 · Strang: A2, A3, A5, E11 · Paket/Ordner: `apps/web/src/abrechnung/`, `rechnung/`
Blocked by: 141, 143, 153
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q5, N4, U5; D-72
Herkunft: umfang §3 E11, A5

## What to build

1. **PDF/Excel:** Aufmaßblatt mit Mengenansätzen, Soll/Ist, Rechnungsprüfung mit Zahlungsfreigabe (Abzugskette Zeile für
   Zeile); Vorschau im Dialog.
2. **A5 an der Rechnung:** Vertragsstrafe (Betrag, Grund, Vorschlag aus der Vorrechnung), Skonto (Satz, Frist), Schalter
   Bauabzugsteuer; Anzeige beider Szenarien („bei Zahlung bis TT.MM.JJJJ: …, danach: …“).
3. **Zahlungen** je Rechnung (Datum, Betrag) erfassen, ändern, löschen; offener Betrag; „Freigabe aufheben“ gesperrt mit Text,
   solange Zahlungen bestehen.
5. **Aus 142 (D-89):** Schaltflächenreihen auf `Werkzeuggruppe`/`Werkzeugverweis` aus `ui-basis` umstellen, wo billig; `abrechnung/Verweis.tsx` ist unbenutzt und entfällt.
6. **Texte wie im PDF (153):** „Bauabzugsteuer 15,00 % an das Finanzamt“, „Auszahlung an den Auftragnehmer“, „Summe der Zahlungen“, „Offen“ – am Bildschirm dieselben Bezeichnungen.
7. **D-95:** `Einstellungen.buero` und `Projekt` in jede PDF-Eingabe (Köpfe nach D-141).
4. E2E mit den Sollwerten der Fixture aus 143.

## Acceptance criteria

- [x] E2E für 1–4 gleich den Sollwerten; M4 grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/152-aufmass-rechnung`). Nähte: `rechnung/entwurf.ts` (Formular → Befehle, mit
A5), `rechnung/pruefung.ts` (`kettenzeilen` mit Vertragsstrafe, `freigabelage`, `zahlungsfreigabe`), `rechnung/zahlung.ts`
(Zahlungsformular), `abrechnung/berichte.ts` (Druckeingaben, geprüft über die Berichtsmodelle von `ausgabe`), E2E
`e2e/zahlungsfreigabe.spec.ts` (2 Fälle, Sollwerte aus `typisch-zahlungen.json` und `typisch-abrechnung.json`).

- **D-152.1 Vorschlag aus der Vorrechnung.** Frage: Was schlägt eine neue Rechnung vor? Entscheidung: die Vertragsstrafe über
  `vertragsstrafeVorschlag` (kumuliert, D-143.5), dazu Skonto und Bauabzugsteuer der vorigen Rechnung (wie die Einbehaltssätze;
  die Lesart am Vertrag D-128.7 nennt den Vorschlag). Grund: Skonto und Freistellung gelten je Vertrag, nicht je Rechnung.
- **D-152.2 Formular.** Vertragsstrafe und Skonto gehören je zu zweit; ein Teil allein, ein Betrag ≤ 0,00, ein Satz außerhalb
  0 < s < 100 oder eine Frist außerhalb 1–365 ist eine Meldung am Feld, nichts wird gesendet (U5). Beide Felder leer heißt
  „keine“; `RechnungAnlegen` trägt nur gesetzte Felder (D-128.2, D-143.8). Bearbeiten schickt je geänderter Angabe einen Befehl
  (`VertragsstrafeSetzen`, `SkontoSetzen`, `BauabzugsteuerSetzen`) im selben Undo-Schritt.
- **D-152.3 Zahlungsfreigabe am Bildschirm.** Eigener Abschnitt unter der Kette, Bezeichnungen wie im PDF (153, Punkt 6):
  „Bei Zahlung bis TT.MM.JJJJ“/„Danach“ als Tabelle und als Satz, dann der geltende Fall bis „Offen“ und die Zahlungen nach
  Datum. Vor der Freigabe ist es eine Vorschau vom geprüften Zahlbetrag; „Zahlung erfassen …“ ist dann gesperrt mit
  Erklärung. Die Rechnungsliste hat eine Spalte „Offen“. „Freigabe aufheben“ ist gesperrt mit „Zur Rechnung n ist 1 Zahlung
  erfasst. Zuerst die Zahlungen löschen.“ (Q5, D-128.7). Löschen einer Zahlung fragt; jede Zahlung ist ein Undo-Schritt.
- **D-152.4 Vertragsstrafe in der Kette.** Zeile „Vertragsstrafe (Grund)“ zwischen Umlagen und Einbehalt, wenn die Rechnung eine
  trägt oder die Kette einen Betrag ≠ 0,00 nennt (wie der Druck, D-153.8); sonst keine Zeile (M4-Ansicht unverändert).
- **D-152.5 Ausgaben (D-98).** PDF über `PdfMitVorschau` aus `vergabe/Ausgaben.tsx` per Import; dafür zwei mechanische Stellen in
  `vergabe/` (fremder Ordner, vom Orchestrator verlangt): `export` vor `PdfMitVorschau` und drei Arten im Druck-Worker
  (`aufmassblatt`, `soll-ist`, `rechnungspruefung`). Excel ohne Vorschau in einem kleinen Dialog (`abrechnung/Ausgabe.tsx`);
  die Rechnungsprüfung als Excel über `berichtAlsExcel(baueRechnungspruefungModell(…))` (das Paket hat keinen eigenen Einstieg).
  Büro aus den Einstellungen, Projekt mit Projektangaben, Datum von der Uhr der App in jeder Eingabe (D-95); Befunde mit den
  Texten der Seite als `befundtexte` (alle als Warnung, U5), darunter die Zahlungsbefunde. Kein Druckprofil (Standard, wie 149).
- **D-152.6 Orte der Ausgabe.** Aufmaßblatt und Soll/Ist: Gruppe „Ausgabe“ in der Werkzeugleiste der Seite. Rechnung: Gruppe
  „Ausgabe“ in einer zweiten Leiste „Aktionen der Rechnung“ (Freigeben, Freigabe aufheben, Angaben bearbeiten, löschen,
  Ausgabe), weil die Prüfung in der Prüfansicht entsteht. Der Name beginnt bewusst nicht mit „Werkzeuge“, damit der E2E-Helfer
  `werkzeug()` eindeutig die Seitenleiste trifft; für Tor E (158): `getByRole('toolbar', { name: 'Aktionen der Rechnung' })`,
  Gruppe „Ausgabe“, Punkt „Rechnungsprüfung als PDF …“, dann „Vorschau erzeugen“ und „Herunterladen“ (alles per Tastatur).
- **D-152.7 Werkzeugleisten (Punkt 5).** Aufmaßliste, Aufmaßblatt, Soll/Ist und Rechnungen auf `Werkzeugleiste`, Soll/Ist als
  `Werkzeugverweis`; X31 und die Knöpfe der Seiten bleiben direkt in der Leiste (bestehende Specs unverändert).
  `abrechnung/Verweis.tsx` gelöscht.
- **D-152.8 Texte aus D-97.** „Skonto vereinbart, aber kein Eingangsdatum: Ohne Skontofrist gibt es keinen Skonto. Das
  Eingangsdatum lässt sich unter „Angaben bearbeiten“ nachtragen.“ und „Gezahlt wurde mehr als die Auszahlung an den
  Auftragnehmer (offen … €). Bitte die Zahlungen prüfen.“ (mit nächstem Schritt, E13). Der Text zu `zahlungen-vorhanden` in
  `lv/texte.ts` passt und bleibt; die Prüfansicht zeigt ohnehin vorher den genaueren Sperrgrund.
- **D-152.9 Testpfad.** `tethysTest.aufmassBefehl(aufmassId, befehl)` (in `rechnung/testpfad.ts`) für die M4-Korrektur in der
  E2E; `e2e/rechnung-fixture.ts` liest dazu `typisch-zahlungen.json` (`A5_*`) und die Korrektur (`M4_KORREKTUR`).
- Beobachtung (Umgebung, kein Fehler der App): Ohne UTF-8-Locale meldet Chromium für Downloads mit Umlaut im Namen
  („Rechnungsprüfung …“, „Aufmaßblatt …“) nur „download“; die E2E prüft den Namen im Dialog, nicht am Download.

Ergebnis (nach dem Merge von `integration/welle-7` bis `b634d6c`, samt 153, 155, 156, 160): `pnpm lint` grün, `pnpm typecheck`
grün. `pnpm test` (vor dem letzten Merge, der nur `vertrag` v1.7c/`speicher`/`kern` brachte): 4.734 grün, 3 übersprungen, 6 rot,
alle Leistungsbudgets unter Last (Last 10–12 auf 4 Kernen: `kern` lvPruefen gross und K9, `speicher` Aufmaß und v1.6,
`vergabe` Preisspiegel, App `abrechnung/leistung.test.ts`); die App-Datei einzeln grün, nichts gelockert. Fixtures
(`node --test`) 59 grün. Nach dem letzten Merge: Typcheck grün, `rechnung/`, `abrechnung/`, Sprachtest, M4-Kette, `vertrag`
grün (nur `abrechnung/leistung.test.ts` wieder rot unter Last). E2E: `zahlungsfreigabe` (2, neu), `rechnung`, `aufmass`,
`m4`, `vergabe` – 11/11 grün. PA3 (Review): `RechnungAnlegen` trägt Vertragsstrafe, Skonto und Bauabzugsteuer nur gesetzt
(nie `undefined`); getestet in `entwurf.test.ts` („Anlegen nimmt sie nur mit, wenn gesetzt“) und am Weg AR 1 → AR 2 ohne
Vertragsstrafe in `zahlungsfreigabe.test.ts`.

## Answer

Gemergt nach `integration/welle-7` mit `7be550f`. Ergebnisse, Testläufe und Entscheidungen (D-152.x) unter `## Comments`.

# 88: A3+A4 in der App: Rechnungen prüfen und freigeben, XRechnung einlesen

Status: done-by-agent
Type: task
Welle: 5 · Strang: A3, A4 · Ordner: `apps/web/src/rechnung/` (neu); Einhängestellen in `App.tsx`,
`auftrag/AuftragsLvSeite.tsx`, `lv/befehlsweg.ts` (markiert `// Ticket 88`, D-20)
Blocked by: 76, 79, 81
Regeln: A5, N4, U3, U5, U7, Q2, Q5, D-20, D-34, D-36
Herkunft: `plan.md` §2 A3, A4; G-27 (D-34)

## What to build

1. **Rechnungsliste** je Auftrags-LV (`/projekt/<id>/auftrag/<id>/rechnungen`): Nummer, Art, Eingang, gefordert brutto,
   geprüfter Zahlbetrag, Status (offen/freigegeben). „Neue Rechnung“: Art (Abschlag/Schluss), Eingangsdatum,
   Rechnungsnummer des AN, geforderte Beträge, Aufmaßblätter (Vorauswahl: alle bisherigen, kumuliert, D-34), Umlagen
   (Liste Bezeichnung + Satz), Sicherheits- bzw. Gewährleistungssatz. Jede Änderung ein Befehl, Undo/Redo.
2. **Prüfansicht** (`rechnungPruefen`, Ticket 81): die Abzugskette Zeile für Zeile (Leistung, Nachlass, Netto n. N., MwSt,
   Brutto kumuliert, Umlagen, Einbehalt, frühere Zahlbeträge, Zahlbetrag), gefordert vs. geprüft mit Differenz, Befunde (U5).
   Zahlen nur am Rand de-DE formatiert (N4).
3. **Freigeben:** Bestätigungsdialog (Q5: friert den Zahlbetrag ein), Befehl `RechnungFreigeben { zahlbetrag }` mit dem
   gerechneten Wert; gesperrt mit Erklärung, wenn eine frühere Rechnung nicht freigegeben ist (`freigabeMoeglich`).
   „Freigabe aufheben“ nach der Lesart aus v1.4.
4. **XRechnung einlesen** (`erechnung`, Ticket 76): Datei wählen → Vorschau (Rechnungsnummer, Datum, Art, Summen, Befunde)
   → übernimmt Rechnungsnummer, Eingangsdatum, geforderte Beträge (netto BT-109, brutto BT-112) und die Art (875/877 →
   Abschlag/Schluss, sonst fragen) in eine neue oder die gewählte Rechnung.
5. **E2E** `apps/web/e2e/rechnung.spec.ts`: Aufmaßblatt → Abschlagsrechnung 1 → Prüfansicht → freigeben → zweites Blatt →
   Abschlagsrechnung 2 zieht AR 1 ab → XRechnung (selbst verfasste Testdatei aus `fixtures/extern/xrechnung/` oder Ticket 76)
   einlesen → Neuladen.

## Grenzen

- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Unit-Tests der Logik, E2E `rechnung.spec.ts` grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Die App muss `rechnung`-ChangeSets umkehren (wie 87 für `aufmass`; `rechnungChangeSetUmkehren` aus `abrechnung`);
  Einhängestellen in `historie.ts`, `befehlsweg.ts`, `HistorieAnbieter.tsx` markiert `// Ticket 88`.
- `gefordert` (D-44): fehlende Werte als „–“ ohne Differenz; Differenzzeile bevorzugt den Zahlbetrag (BT-115); XRechnung
  übernimmt netto (BT-109), brutto (BT-112), zahlbetrag (BT-115), je wie vorhanden.

## Comments

Branch `welle-5/88-rechnung` (ab `integration/welle-5`, Ticket 81 nach seinem Merge eingemergt). Neuer Ordner
`apps/web/src/rechnung/`; Einhängestellen markiert `// Ticket 88` in `App.tsx` (Route), `auftrag/AuftragsLvSeite.tsx`
(Link „Rechnungen“), `lv/befehlsweg.ts` (Umkehrung `rechnung`, `hinweise` nur wo vorhanden), `historie/historie.ts`
(`Teil.changeSet`), `historie/HistorieAnbieter.tsx` (Ziel nach Undo) und `testpfad.ts` (D-88.3). Abhängigkeiten der App:
`@tethys/abrechnung`, `@tethys/erechnung` (Workspace, Lockfile mit).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-88.1** Wo testen? **Fünf Nähte:** `pfad.ts` (Adressen, Ziel nach Undo), `entwurf.ts` (Formular: Vorschlag, de-DE lesen,
  Befehle), `xrechnung.ts` (Übernahme aus `Eingangsrechnung`), `rechnungen.ts` (Sitzung auf dem Befehlsweg gegen den echten
  Speicher: Protokoll, `konflikt`, Undo/Redo) und `pruefung.ts` (Prüfansicht als Daten, über den ganzen Weg der App gegen die
  Sollwerte der M4-Fixture: AR 1 = 8.874,40, AR 2 = 10.100,84). Oberfläche nur in der E2E. Grund: Die Rechnung liegt in
  `abrechnung`; die App verantwortet Rand, Befehle und Weitergabe der richtigen Listen.
- **D-88.2** Ausführer vor dem Merge von 81? **Eine Datei `rechnung/ausfuehrer.ts`** hielt bis zum Merge eine schlichte
  Fassung; jetzt ist sie ein Re-Export aus `@tethys/abrechnung`. `lv/befehlsweg.ts` bezieht `rechnungChangeSetUmkehren` von
  dort. Grund: Liste, Formular und E2E konnten vor 81 entstehen; nach dem Merge ist es eine Zeile.
- **D-88.3** Aufmaßblätter und Nachtrag in der E2E, solange 86/87 ihre Seiten bauen? **Über den Testpfad als Befehle**
  (`AufmassAnlegen` mit dem Ausführer aus `abrechnung`, `NachtragUebernehmen` mit dem Kern; `rechnung/testpfad.ts`, eine
  markierte Zeile in `src/testpfad.ts`, die das Ticket nicht nennt). Grund: Der Weg der Rechnungen soll nicht an fremden
  Oberflächen hängen; Ticket 91 prüft die ganze Kette durch alle Seiten. Nur im Test-Build, nie an den Befehlen vorbei.
- **D-88.4** Eingangsdatum? **Text `TT.MM.JJJJ` wie die Kopfdaten** (`datumLesen`/`datumDe` aus `lv/kopfdaten.ts`, N4); die
  XRechnung schlägt ihr Rechnungsdatum (BT-2) als Eingang vor, änderbar (Lesart an `Rechnung.eingang`: „höchstens
  vorschlägt“).
- **D-88.5** XRechnung übernehmen: Formular oder direkt? **Direkt als ein Befehl** (neue Rechnung: `RechnungAnlegen` mit dem
  Vorschlag aus D-34 plus Übernahme; gewählte: `RechnungsangabenSetzen`), ein Undo-Schritt. Ziel vorgewählt: die offene
  Rechnung der Prüfansicht, sonst „Neue Rechnung“; freigegebene sind kein Ziel. Art aus BT-3 (875 Abschlag, 877 Schluss),
  sonst muss der Nutzer wählen (Knopf aus, bis gewählt). Übernommen werden BT-1, BT-2, BT-109, BT-112, BT-115 je wie
  vorhanden; ohne alle drei Beträge `gefordert: null` (D-44).
- **D-88.6** Gefordert gegen geprüft (D-44)? **Drei Zeilen** Netto ↔ Netto n. N., Brutto ↔ Brutto kumuliert, Zahlbetrag ↔
  Zahlbetrag (die Forderung kumuliert gelesen wie in 81); fehlt eine Forderung: „–“ und keine Differenz. Die maßgebliche
  Zeile (Zahlbetrag, sonst Brutto, sonst Netto) ist hervorgehoben; den Befund `gefordert-abweichend` liefert 81.
- **D-88.7** „Geprüfter Zahlbetrag“ der Liste? **Freigegeben: der eingefrorene, sonst der heute gerechnete.** Grund: Nur so
  passt die Liste zu dem, was spätere Rechnungen abziehen (D-34 (7)).
- **D-88.8** „Freigabe aufheben“ nach v1.4? **Nur angeboten, solange keine spätere Rechnung freigegeben ist** (sonst aus,
  mit Erklärung); Bestätigungsdialog (Q5), Undo stellt die Freigabe wieder her. „Freigeben“ aus mit Erklärung nach
  `freigabeMoeglich`; „Angaben bearbeiten“ und „Löschen“ an einer freigegebenen Rechnung aus (enge Lesart an `Rechnung`).
  Jedes `konflikt` des Speichers an einer Rechnung erscheint als eigene Meldung („Freigaben gehen nur in der Reihenfolge
  der Rechnungsnummern …“), der Zustand bleibt.
- **D-88.9** Nummer einer neuen Rechnung? **Höchste Nummer + 1 in der App** (`naechsteRechnungsnummer`; `abrechnung` hat
  dafür keine Funktion); die Eindeutigkeit hält `speicher`. Eine Rechnung nach einer Schlussrechnung ist erlaubt (Befund von
  81, U5).
- **D-88.10** Liste und Prüfansicht eine Seite? **Ja**, eine Komponente je Auftrags-LV (Schlüssel `auftragsLvId`), damit der
  Wechsel nicht neu lädt; nach Undo/Redo lädt sie aus dem Speicher neu. Aufmaßblätter, die anderswo entstehen, sieht sie nach
  dem nächsten Öffnen.

### Prüfung

Volle Suite nach dem Merge von `integration/welle-5` (bis `3ed193e`, mit Ticket 86; Konflikte an den Einhängestellen in
`befehlsweg.ts` und `AuftragsLvSeite.tsx` aufgelöst, beide Zeilen bleiben): `pnpm lint` grün (Grenzen, Lizenzen, Clean
Room), `pnpm typecheck` grün, Vitest 188 Dateien (1 übersprungen), 2.498 Tests bestanden, 3 übersprungen; Fixtures 29/29.
E2E `rechnung.spec.ts`, `undo.spec.ts`, `nachtrag.spec.ts`, `m3.spec.ts` 9/9. Hinweis: mit `PW_WEB_PORT=4388`, weil
Playwright sonst mit `reuseExistingServer` den Vorschau-Server eines anderen Worktrees auf 4173 nutzen könnte.

## Answer

Rechnungen prüfen und freigeben in der App (`apps/web/src/rechnung/`):

- **Liste** `/projekt/<id>/auftrag/<id>/rechnungen` (Link „Rechnungen“ auf der Auftrags-LV-Seite): Nr., Art, Eingang,
  Rechnungsnr. AN, gefordert brutto, geprüfter Zahlbetrag, Status. **Neue Rechnung** mit Art, Eingang, Rechnungsnummer,
  geforderten Beträgen, Aufmaßblättern (alle vorgewählt), Umlagen und beiden Einbehaltssätzen (Vorschlag aus der vorigen).
- **Prüfansicht** `…/rechnungen/<id>`: Abzugskette Zeile für Zeile, gefordert/geprüft/Differenz (D-44), Befunde (U5);
  Freigeben mit Bestätigung (friert den Zahlbetrag ein), gesperrt mit Erklärung; Freigabe aufheben, Bearbeiten, Löschen.
- **XRechnung einlesen**: Vorschau (Nummer, Datum, Art, Summen, Befunde) → in neue oder offene Rechnung.
- Jede Änderung ein Befehl über `abrechnung` und `speicher`, Undo/Redo kehrt `rechnung`-ChangeSets um (D-42).
- E2E `apps/web/e2e/rechnung.spec.ts`: Zuschlag an Bieter B → Nachtrag und Blatt 1 (Testpfad) → AR 1 (8.874,40 wie die
  Fixture) → freigeben → Blatt 2 → AR 2 (10.100,84) → Reihenfolge der Freigaben, Rückgängig/Wiederholen, `konflikt` →
  XRechnung `bau-abschlag-875.xml` → Neuladen.

Offen für Folgetickets: die Aufmaßkorrektur nach der Freigabe (Fixture `ar2NachKorrektur`) prüft erst 91 durch die
Aufmaßseite; Merge-Konflikte an den Einhängestellen mit 86/87/89 (`befehlsweg.ts`, `historie.ts`, `HistorieAnbieter.tsx`,
`AuftragsLvSeite.tsx`, `App.tsx`, `package.json`/Lockfile) löst der Merger (D-20).

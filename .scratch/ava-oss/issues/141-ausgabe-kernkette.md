# 141: `ausgabe`: Preisspiegel, Vergabevorschlag, Aufmaßblatt, Soll/Ist, Bilder, Köpfe

Status: resolved
Type: task
Welle: 7 · Strang: O · Paket/Ordner: `packages/ausgabe`
Blocked by: 127
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: ADR 0012, A2, N4, D-113.1, C1
Herkunft: umfang §3 E11 (ohne Zahlungsfreigabe-Zeilen aus A5), E10 (Köpfe), B-21, B-22; Ticket 123 Punkt 7 (`ausgabe`-Namen)

## What to build

Alle über `Ausgabemodell`/`Berichtsmodell` (ADR 0012, D-113.1: Modell rechnet nichts, trägt de-DE-Texte; Erzeugungsdatum aus
der Eingabe), Druckprofile wie beim LV; je Ausgabe ein Test über den Seitentext.

1. **Preisspiegel** quer (PDF) und als Excel: Positionen × Bieter, Min/Mittel/Max, Ausreißer- und ABC-Kennzeichen, Summen,
   Nachlass.
2. **Vergabevorschlag** (PDF): Rangfolge, geprüfte Summen, freier Begründungstext (Eingabe), Absender (Büro) und Projekt.
3. **Aufmaßblatt** mit Mengenansätzen (Formel, Ergebnis) (PDF, Excel).
4. **Soll/Ist** (PDF, Excel) mit Schwellenkennzeichen.
5. **Rechnungsprüfung** (PDF): die Abzugskette D-34 Zeile für Zeile mit Freigabe; die A5-Zeilen ergänzt 153.
6. **Bilder aus dem Langtext** im LV-PDF statt „[Abbildung]“ (`langtext.ts:42`), mit Größenbegrenzung.
7. **Köpfe:** Büro (Absender), Projektangaben (Nummer, Ort, Baustelle), Bieteranschrift, wo vorhanden.
8. 123 §7: Hüllfunktionen in `x2x4-pdf.ts`, `bericht-pdf.ts` gegen `pdf.ts` (Erzeugungsdatum, Zugriffsregel, Schriften); ein
   Schriftlader.

## Acceptance criteria

- [x] Je Ausgabe Seitentext- bzw. Zelltest; Excel öffnet in LibreOffice-Test wie bisher (falls vorhanden)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-141.1** Woher kennt `ausgabe` die Ergebnisse von `vergabe` (Preisspiegel), `abrechnung` (Soll/Ist, Rechnungsprüfung) und
  `mengen` (Zeilenergebnisse)? **Über Eingabetypen in `ausgabe`, die genau die gelesenen Felder gleich gebaut beschreiben; die
  App reicht die Ergebnisse unverändert durch.** Grund: Fachpakete importieren einander nicht (A3), die Typen bleiben nach D-04
  in ihren Paketen, `vertrag` ist nicht Teil dieses Tickets. Eine Typprobe in `apps/web` (nicht committet) hat gezeigt, dass
  `Preisspiegel`, `SollIst`, `Rechnungspruefung`, `Mengenansatzergebnis.zeilen` und `Projekt` ohne Umweg passen.
- **D-141.2** Excel für Berichte? **Ein allgemeiner Renderer `berichtAlsExcel` liest das `Berichtsmodell`; eine Zahl trägt
  neben ihrem de-DE-Text den Wert in Punktnotation und ihre Zahlenart, Excel schreibt sie als Zahl mit dem Format nach N3.**
  Grund: Ticket und umfang E11 verlangen Excel für Preisspiegel, Aufmaßblatt und Soll/Ist; das Modell rechnet weiter nichts
  (A2). Der Nachtrag zu ADR 0012 sagt noch „für Berichte gibt es in v1 nur PDF“ (Frage an den Orchestrator).
- **D-141.3** Preisspiegel auf A4 quer: **je Bieter eine Spalte mit EP und GP untereinander (Teile der Spalte), Kennzeichen
  klein darunter; höchstens 5 Bieter je Tabelle (`BIETER_JE_TABELLE`), weitere in einer folgenden Tabelle mit OZ und
  Kurztext.** In Excel stehen alle Bieter in einer Tabelle, EP und GP je in eigener Spalte, Kennzeichen in einer Spalte
  „… Hinweis“. Bieter nach Rang mit Anschrift in einer eigenen Tabelle davor. Bedarfs- und Wahlsumme nur, wenn das LV solche
  Positionen hat (wie der LV-Druck, F4).
- **D-141.4** Druckprofile bei Berichten: **Seitenrand, Kopf- und Fußzeile (mit `{seite}`, `{seiten}`, `{datum}`, `{lv}` =
  LV-Name) und Deckblatt (aus: ohne Absender und Kopfangaben).** Preise, Langtext, Titelsummen und Schlussblock gelten nur
  für den LV-Druck; ein Bericht ohne seine Zahlen wäre keiner.
- **D-141.5** Bilder im LV-PDF: **PNG und JPEG, erkannt am Inhalt (nicht am Medientyp); bis 5 MB und 25 Megapixel; auf dem
  Papier in natürlicher Größe bei 96 dpi, höchstens 300 × 220 pt, nie vergrößert; alles andere bleibt „[Abbildung]“.** Ein
  PNG wird ganz geprüft (Blöcke bis IEND, entpackte Daten mit Prüfsumme, Länge und Zeilenfiltern): pdfkit bleibt an einem PNG
  mit kaputten Daten hängen, ohne Fehler zu melden (gemessen; der Druck-Worker hätte nie geantwortet). Ein Bild mitten im
  Absatz teilt den Absatz; beim Kürzen zählt es als eine Zeile.
- **D-141.6** Köpfe: **Büro als Absender rechts oben auf der ersten Seite (LV-Druck und Berichte); nach „Projekt“ folgen
  „Projektnummer“, „Ort“, „Baustelle“ (Glossar), dann „Bauherr“; im LV-Druck „Auftragnehmer“, wenn das LV einen trägt;
  Bieteranschrift in der Bietertabelle des Preisspiegels und beim Vergabevorschlag (mit Ansprechperson, Telefon, E-Mail).**
  `ModellOptionen.projekt` nimmt ein `Projekt` unverändert, `DruckEingabe` hat `buero`.
- **D-141.7** Vergabevorschlag: **Der vorgeschlagene Bieter ist Eingabe (`vorgeschlagen: BieterId | null`), nicht der Rang 1;
  „geprüfte Summen“ sind die Bietersummen aus `vergabe` (aus den Einheitspreisen neu gerechnet); kein Abstand in Prozent
  (wäre gerechnet).** Die Begründung wird an Leerzeilen in Absätze geteilt; leer steht „–“, ohne Auswahl ein Satz dazu (Q5).
  Unterschriftszeile mit Büro und Druckdatum.
- **D-141.8** Rechnungsprüfung: **Beschriftung der Kette wie am Bildschirm (`rechnung/texte.ts`), Abzüge mit „−“; der
  Leistungsstand nennt nur aufgemessene Positionen (Menge oder GP ≠ 0) mit Vertrags-EP und einem Hinweis darauf;
  Freigabe mit eingefrorenem Zahlbetrag oder „noch nicht freigegeben“, dazu Zeilen für „sachlich und rechnerisch richtig“.**
  Ein abgerechnetes Blatt, dessen Kopf die Eingabe nicht kennt, steht als eigener Punkt da. Die A5-Zeilen ergänzt 153.
- **D-141.9** Soll/Ist: **Die Schwellen im Kennzeichen und in der Legende kommen aus `optionen` (Form wie
  `SollIstOptionen`); ohne Angabe steht „über der Schwelle“.** Grund: Die Vorgaben 110/90 kennt nur `abrechnung`; der Druck
  erfindet keine Zahl.
- **D-141.10** Aufmaßblatt: **Positionen in der Reihenfolge des Auftrags-LV, eine Zeile ohne Position dort am Ende
  („Position nicht im Auftrags-LV“); Ansatzzeilen mit Zeile, Formel, Ausdruck (Variable als „A = …“) und Zeilenergebnis,
  „Fehler“ bei einer Zeile ohne Ergebnis, „ohne Mengenansatz“ bei einer Menge von Hand.**
- **D-141.11** Hülle und Schriftlader (123 §7): **`pdfmake.ts` ist die eine Hülle beider Renderer (Zugriffsregel, Schriften,
  Erzeugungsdatum, Briefkopf); `x2x4-pdf.ts` heißt `bericht-einstiege.ts`.** Die Bytes der Schriften lädt weiter der
  Aufrufer (`schriften.ts`: kein I/O im Paket); der eine Lader der App-Worker gehört zu 123 Punkt 4 (131/155).
- **D-141.12** `Druckprofil` und `LangtextUmfang` kommen aus `vertrag` (D-127.8); `ausgabe` exportiert sie unverändert weiter,
  damit die App-Importe gültig bleiben (Umstellung in 150 möglich).
- **D-141.13** Zwei gesperrte Zahlformate (EP, Prozent) kommen in die Stile der Arbeitsmappe; das Golden des LV-Exports
  bekommt nur diese zwei Einträge.

### Ergebnis (Branch `welle-7/141-ausgabe`)

Öffentliche API (alle aus `@tethys/ausgabe`; `datum?` als `JJJJ-MM-TT`, `projekt?`, `buero?`, `druckprofil?` in jeder Eingabe):

| Ausgabe | Eingabe | Modell | PDF | Excel |
|---|---|---|---|---|
| Preisspiegel | `PreisspiegelEingabe` (`lv`, `preisspiegel`, `bieter`, `spalten?`) | `bauePreisspiegelModell` | `erzeugePreisspiegelPdf` | `preisspiegelAlsExcel` |
| Vergabevorschlag | `VergabevorschlagEingabe` (`lv`, `bietersummen`, `bieter`, `vorgeschlagen`, `begruendung`) | `baueVergabevorschlagModell` | `erzeugeVergabevorschlagPdf` | – |
| Aufmaßblatt | `AufmassblattEingabe` (`aufmass`, `auftragsLv`, `ergebnisse?`, `befundtexte?`) | `baueAufmassblattModell` | `erzeugeAufmassblattPdf` | `aufmassblattAlsExcel` |
| Soll/Ist | `SollIstEingabe` (`auftragsLv`, `sollIst`, `optionen?`) | `baueSollIstModell` | `erzeugeSollIstPdf` | `sollIstAlsExcel` |
| Rechnungsprüfung | `RechnungspruefungEingabe` (`rechnung`, `auftragsLv`, `pruefung`, `aufmasse?`, `befundtexte?`) | `baueRechnungspruefungModell` | `erzeugeRechnungspruefungPdf` | – |
| LV-Druck | wie bisher, `PdfOptionen.buero`, `projekt.angaben` | `baueAusgabemodell` | `erzeugePdf` (mit Bildern) | – |

Für die App (149, 152): `Einstellungen.buero` und das `Projekt` (mit `angaben`) in jede Druckeingabe; im LV-Druck über
`profilAlsOptionen(profil, { datum, projekt, buero })`.

### Prüfläufe (nach dem Merge von `integration/welle-7`, Stand `d29bd8d`)

- `pnpm lint` grün, `pnpm typecheck` grün.
- `pnpm test`: 4.168 grün, 8 rot, 3 übersprungen. Rot sind nur Leistungsbudgets anderer Pakete (`gaeb` schreiben X86,
  `kern` K9 und lvPruefen, `speicher` Aufmaß und v1.6, `vergabe` Preisspiegel, App Aufmaß-Undo) im vollen Lauf bei einer
  Last um 30 auf 4 Kernen; alle sieben Dateien einzeln nacheinander grün (84 Tests). Nichts gelockert.
- `ausgabe` allein: 19 Dateien grün, darunter die neuen LibreOffice-Tests der Berichte (`soffice` vorhanden).
- E2E `ausgabe.spec.ts`, `druckprofil.spec.ts`, `x2.spec.ts`, `x4.spec.ts`: 13 grün (`--workers=1`; ein Lauf mit
  mehreren Workern verlor in `x4` den Browser, weil der Kernel Prozesse wegen Speichermangel beendete).

### Fragen an den Orchestrator

- ADR 0012: Der Nachtrag sagt „für Berichte gibt es in v1 nur PDF“, die Folgen „Bilder im Langtext druckt v1 nicht“; beides
  ist mit diesem Ticket überholt (Text in `docs/`, nicht in diesem Paket).
- Glossar (L2): „Vergabevorschlag“ steht noch nicht im `GLOSSARY.md`.

## Answer

Gemergt nach `integration/welle-7` mit `6c66731`. Ergebnisse, Testläufe und Entscheidungen (D-141.x) unter `## Comments`.

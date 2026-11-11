# 87: A2+M3 in der App: Aufmaßblätter, Soll/Ist, X31

Status: done-by-agent
Type: task
Welle: 5 · Strang: A2, M3 · Ordner: `apps/web/src/abrechnung/` (neu), `apps/web/src/mengen/` (Panel verallgemeinern);
Einhängestellen in `App.tsx`, `auftrag/AuftragsLvSeite.tsx`, `lv/befehlsweg.ts` (markiert `// Ticket 87`, D-20)
Blocked by: 79, 80, 81 (Soll/Ist), 83 (X31-Teil)
Regeln: A5, U2, U3, U5, U7, Q2, Q4, Q5, D-20, D-22, D-35, D-36
Herkunft: `plan.md` §2 A2, M3

## What to build

1. **Aufmaßseite** je Auftrags-LV (`/projekt/<id>/auftrag/<id>/aufmass`): Liste der Aufmaßblätter (Nummer, Bezeichnung,
   Datum, Zahl der Positionen), „Neues Aufmaßblatt“ (nächste Nummer), Blatt öffnen. Ein Blatt zeigt den Baum des Auftrags-LV
   in `ui-grid` (U2: keine zweite Grid-Implementierung) mit Spalten OZ, Kurztext, Einheit, Auftragsmenge, Menge dieses Blatts,
   kumuliert bis hier; die Menge eines Blatts wird über das Mengenansatz-Panel (Formel 91, `mengen`) eingegeben – das Panel
   aus `src/mengen/` verallgemeinern, statt es zu kopieren – oder direkt als Zahl (dann ohne Ansatz). Jeder Schritt ein
   Befehl (`AufmasspositionSetzen` usw.), Undo/Redo wie im LV.
2. **Soll/Ist-Ansicht** (`sollIstBerechnen`, Ticket 81): Grid mit Soll, Ist, Differenz, %, GP Soll/Ist, Befundspalte;
   Befunde > 110 % sichtbar markiert (neutraler Stil, Tastatur erreichbar); Summen je Gliederung und gesamt.
3. **X31:** „X31 einlesen“ (`gaeb` Ticket 83) legt ein neues Aufmaßblatt an (Menge je Position mit `mengen` gerechnet;
   Befunde in einem Dialog, U5); „Als X31 ausgeben“ je Blatt (Datei herunterladen).
4. **E2E** `apps/web/e2e/aufmass.spec.ts`: Auftrags-LV → Blatt 1 mit zwei Ansätzen → Soll/Ist zeigt Ist und einen Befund →
   Undo/Redo → Neuladen; X31 der BVBS-Prüfdatei einlesen (soweit die Positionen zum LV passen, sonst eine eigene X31 aus dem
   Rundweg) und ausgeben.

## Grenzen

- Rechnungen sind Ticket 88. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Logik, E2E `aufmass.spec.ts` grün; `mengen.spec.ts` bleibt grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Die App muss `aufmass`-ChangeSets umkehren: `Teil.changeSet` (`apps/web/src/historie/historie.ts`), `umkehren`
  (`apps/web/src/lv/befehlsweg.ts`) und das Sprungziel in `apps/web/src/historie/HistorieAnbieter.tsx` um `aufmass`
  erweitern (mit `aufmassChangeSetUmkehren` aus `abrechnung`); Einhängestelle markiert `// Ticket 87`.
- D-45: Zeit und Speicher je Undo-Schritt an einem Aufmaßblatt mit 5.000 Zeilen messen und im Ticket nennen (Q4).

## Comments

### Ergebnis (Branch `welle-5/87-aufmass`, Basis `integration/welle-5`, zuletzt gemergt mit Ticket 81 und 86)

Neuer Ordner `apps/web/src/abrechnung/`: `aufmass.ts` (Befehlsweg des Blatts, Laden), `pfad.ts` (Adressen, Sprungziel
nach Undo/Redo), `blatt.ts` (Ansicht des Blatts für das Grid, „kumuliert bis hier“, Befehl aus dem Panel), `sollist.ts`
(Soll/Ist-Ansicht), `x31.ts` (X31 lesen/schreiben), `kopf.ts`; Seiten `AbrechnungSeite.tsx` (Verteiler),
`BlattListe.tsx`, `BlattSeite.tsx`, `SollIstSeite.tsx`, Dialoge `KopfDialog.tsx`, `X31Einlesen.tsx`, `X31Ausgeben.tsx`,
`Verweis.tsx`, Texte, CSS, Testhilfe `testhilfen.ts`. `apps/web/src/mengen/`: Panel verallgemeinert
(`MengenansatzPanel`, `Mengenziel`, `mengeneingabe`, `istTextform`); `MengenPanel` des LV ist eine dünne Hülle mit
unveränderten Eigenschaften (`lv/LvSeite.tsx` unberührt). Abhängigkeit `@tethys/abrechnung` in `apps/web` (Lockfile).

Einhängestellen (`// Ticket 87`): `App.tsx` (Route vor der des Auftrags-LV), `auftrag/AuftragsLvSeite.tsx` (Verweise
„Aufmaß“ und „Soll/Ist“ in der Werkzeugleiste), `lv/befehlsweg.ts` (`umkehren` um `aufmass`; `speichern` liest `hinweise`
nur, wo das ChangeSet sie hat), `historie/historie.ts` (`Teil.changeSet` um `AufmassChangeSet`),
`historie/HistorieAnbieter.tsx` (`zielNach` → `aufmassZiel`). Kein Paket außerhalb von `apps/web` geändert.

Tests (Vitest, `apps/web/src/abrechnung/*.test.ts`, `mengen/ansatz.test.ts`): Befehlsweg gegen echten Speicher
(In-Memory-SQLite) mit Protokoll und Undo/Redo, Adressen und Sprungziel, Blattansicht (Baum, Formate, Kennzeichen),
„kumuliert bis hier“ über Blattnummern, Panel → Befehl, Soll/Ist-Ansicht mit Zahlen aus den Fixtures (Bieter A,
`typisch`), X31-Rundweg und BVBS-Prüfdatei, Blattkopf, D-45-Messung. E2E `apps/web/e2e/aufmass.spec.ts` (2 Tests).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-87.0 Seams.** Wo setzen die Tests an (Skill `tdd`, Demo-Modus statt Abstimmung)? Befehlsweg des Blatts mit
  Undo/Redo gegen den echten Speicherkern; reine Ansichtsbauer (Blatt, Soll/Ist) und Befehlsbildung (Panel, X31, Kopf);
  `zielNach`; E2E für die Bedienung. Grund: öffentliche Schnittstellen der Module, wie Ticket 64/65. Reversible: yes.
- **D-87.1 Adressen.** `/projekt/<p>/auftrag/<a>/aufmass` (Liste), `…/aufmass/<blatt>` (Blatt), `…/soll-ist`. Ein Blatt
  hat eine eigene Adresse, damit Neuladen und das Sprungziel nach Undo/Redo es treffen. Reversible: yes.
- **D-87.2 Grid und Bearbeiten (U2, U3).** Das Blatt und Soll/Ist stehen im `VergleichsGrid` aus `ui-grid` (freie Spalten,
  Baum, Kennzeichen, Summenzeile), nicht im `LvGrid` (feste LV-Spalten, sendet nur LV-Befehle). Das `VergleichsGrid` ist
  schreibgeschützt; bearbeitet wird im Panel: Enter oder F2 auf einer Position (die Seite fängt beide vor dem Grid ab),
  Strg+Alt+E (wie auf der LV-Seite) oder Doppelklick. Keine Änderung an `ui-grid` (P2). Bekannte Lücke: Ziffern und Entf
  im Grid zeigen die Meldung „schreibgeschützt“ des Grids; ein bearbeitbares Vergleichsgrid wäre ein `ui-grid`-Ticket.
  Reversible: yes.
- **D-87.3 Laden.** Auftrags-LV über `auftragsLeistungsverzeichnisse.laden` (Ticket 79, nicht über die Projektdatei),
  alle Blätter ganz (`aufmasse.auflisten`, dann `laden` je Blatt): Zahl der Positionen, „kumuliert bis hier“ und Soll/Ist
  brauchen die Zeilen. Reversible: yes.
- **D-87.4 Undo/Redo (Nachtrag aus dem Review).** `aufmass` in `Teil`, `umkehren` (`aufmassChangeSetUmkehren`) und
  `zielNach`: Steht das Blatt danach, auf das Blatt (auf Soll/Ist desselben Auftrags-LV bleiben, dort ist es sichtbar),
  sonst auf die Liste. Die Blattseite führt einen Schritt an ihrem Blatt direkt nach, wenn das ChangeSet dieselben Objekte
  wie ihr Stand trägt (der Befehlsweg meldet nur den Teil, nicht die Richtung); sonst lädt sie, wie Liste und Soll/Ist,
  neu. Der Undo-Stapel lebt im Arbeitsspeicher und ist nach dem Neuladen leer (ADR 0006, wie im LV). Reversible: yes.
- **D-87.5 Panel verallgemeinert.** Ein Panel für Position und Aufmaßzeile: Ziel (`Mengenziel`) und Ergebnis
  (`Mengeneingabe` = Ansatz + Menge) statt eines Befehls; die Seite baut den Befehl. Auf dem Blatt gibt es ein Feld „Menge
  ohne Ansatz“ (de-DE, auch negativ); es gilt nur ohne Zeilen und ist gesperrt, solange Zeilen da sind (Zeilen gehen vor),
  darum entfällt hier die Rückfrage von D-22 (a). Leer und ohne Zeilen entfernt eine vorhandene Zeile
  (`AufmasspositionEntfernen`), Undo holt sie zurück. Zeilen in der Textform (D-83.2) stehen nur lesbar da, mit Hinweis;
  löschen geht. Reversible: yes.
- **D-87.6 X31 einlesen.** Menge je Position mit `mengen` (Textform und Fehler → `menge: null`, gezählt und genannt);
  Befunde im Dialog (U5), Bezeichnung vorbelegt mit dem Dateinamen, Datum leer (D-83.6), Nummer = nächste. Passt keine
  Zeile zu einer Position des Auftrags-LV, entsteht kein Blatt („nichts zu übernehmen“, Knopf aus): Ein leeres Blatt
  brächte nichts. Die Blattnummer ist beim Anlegen nicht wählbar (`naechsteAufmassnummer`; fest nach D-70.9).
  Reversible: yes.
- **D-87.7 „Kumuliert bis hier“.** `sollIstBerechnen` über die Blätter mit Nummer ≤ diesem (die App rechnet nicht, A2/N1),
  angezeigt nur für Positionen mit einer Zeile auf einem dieser Blätter (sonst stünde überall 0,000). Bei 5.000 Zeilen
  kostet das 50–90 ms, darum im Leerlauf wie die LV-Prüfung (bis dahin der vorige Wert). Reversible: yes.
- **D-87.8 Soll/Ist-Seite.** Spalten OZ, Kurztext, Einheit, Soll, Ist, Differenz, %, GP Soll, GP Ist, Befund;
  Gliederungszeilen tragen ihre GP-Summen, die Summenzeile „Gesamt (netto vor Nachlass)“. Befund in der Befundspalte mit
  neutralem Kennzeichen (▲ über, ▼ unter, Beschreibung im Tooltip und für den Screenreader) und als Liste, deren Einträge
  per Tastatur zur Zelle springen (Vorfahren werden aufgeklappt). Schwellen als Felder für die Sitzung (nicht gespeichert,
  wie die Preisspiegel-Einstellungen), Vorgabe 110,00/90,00 (D-35). `abgeschlossen` = es gibt eine Schlussrechnung
  (`rechnungen.auflisten`). Reversible: yes.
- **D-87.9 Dateiname X31.** `<Auftrags-LV> Aufmass <Nr>.x31` (Bereinigung wie die übrigen Exporte), fester Teil ohne „ß“:
  Chromium speichert hier Dateinamen mit Nicht-ASCII-Zeichen als „download“ (gemessen; fehlende Locale der Umgebung);
  ASCII ist auch für Empfänger der Datei sicherer. Reversible: yes.
- **D-87.10 Was nicht aufgemessen wird.** Gliederungen und Zuschlagspositionen öffnen kein Panel (Meldung); Befunde von
  `aufmassPruefen` (z. B. eine Zeile zu einer Position, die es nicht mehr gibt) stehen als Liste unter dem Grid, weil
  solche Zeilen im Baum keinen Platz haben. Reversible: yes.
- **D-87.11 Blatt löschen.** Nur nach Bestätigung (Q5, Anfangsfokus „Abbrechen“), danach die Liste; Undo holt das Blatt
  zurück. Ein Blatt in einer Rechnung weist der Speicher mit `konflikt` ab; die App meldet das. Reversible: yes.
- **D-87.12 Messung D-45** (siehe unten). Gemessen am Befehlsweg der App mit dem echten Speicherkern unter Node (SQLite im
  Arbeitsspeicher; ohne Worker-Grenze und OPFS); die Testschranke (Median < 1 s) ist nur ein Schutz gegen krankhafte
  Rückschritte, kein Budget. Reversible: yes.

### Messung D-45 (Q4): Undo an einem Aufmaßblatt mit 5.000 Zeilen

`apps/web/src/abrechnung/leistung.test.ts`: Auftrags-LV aus `gross` (5.000 Positionen), Blatt mit einer Zeile je
Position, je zwei Ansatzzeilen (Blatt als JSON 1.057 KiB). 4 Kerne, bis zu 8 Agenten gleichzeitig.

| | Last 13–14 (während der Arbeit) | Last 7 (Datei allein, 2 Läufe) |
|---|---|---|
| Rückgängig je Schritt (Median) | 99–144 ms, davon Speicher 99 ms | 94 / 105 ms, davon Speicher 94 / 105 ms |
| Wiederholen je Schritt (Median) | 86–136 ms | 86 / 82 ms |
| Befehl `AufmasspositionSetzen` (Median) | 104–119 ms | 93 / 89 ms |
| Seite nachführen: „kumuliert“ (Soll/Ist) / Grid-Zeilen | 94 / 17 ms | 51–75 / 14 ms |
| Anlegen des ganzen Blatts (X31-Fall) | 148 ms | 84–98 ms |
| Arbeitsspeicher je Undo-Schritt | 37–39 KiB | 37–39 KiB |

Bewertung: **Arbeitsspeicher je Schritt unkritisch** (ein neues Feld mit 5.000 Verweisen, die Zeilen selbst werden
geteilt; bei 200 Schritten der Historie höchstens etwa 8 MiB). **Zeit je Schritt am Budget:** Fast alles liegt im
Speicherkern, der je Schritt das ganze Blatt liest, mit `vorher` vergleicht und neu schreibt (etwa 1 MiB JSON); im Browser
kommen die Worker-Grenze (zwei ganze Blätter) und OPFS dazu. Das Budget einer Einzeländerung im Browser (100 ms bei 5.000
Positionen, `e2e/leistung.spec.ts`) ist damit bei 5.000 Zeilen erreicht bzw. überschritten. Vorschlag für den
Orchestrator nach D-45: Folgeticket v1.5 (`Aenderungen<Aufmassposition>`) oder, kleiner, ein Speicherticket, das den
Vergleich mit `vorher` über den gespeicherten JSON-Text statt über ein geparstes Objekt führt. Für Blätter üblicher Größe
(einige hundert Zeilen) ist die Zeit klein (die Kosten wachsen linear).

### Prüfung

Nach dem Merge von `integration/welle-5` (mit 81 und 86): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm
typecheck && pnpm test` grün (Vitest 190 Dateien, 2.498 Tests bestanden, 3 übersprungen wie zuvor; `node --test` 29/29).
E2E `aufmass.spec.ts` (2), `mengen.spec.ts` (3), `undo.spec.ts` (6) grün (11 bestanden, Last 11–12).

## Answer

Umgesetzt auf `welle-5/87-aufmass`: Aufmaßseite je Auftrags-LV (Liste mit Nummer, Bezeichnung, Datum, Zahl der
Positionen; „Neues Aufmaßblatt“; Blatt öffnen), Blatt im `VergleichsGrid` (U2) mit OZ, Kurztext, Einheit, Auftragsmenge,
Menge dieses Blatts und kumuliert bis hier, Eingabe über das verallgemeinerte Mengenansatz-Panel (Formel 91) oder als
Menge ohne Ansatz; jeder Schritt ein Befehl am Blatt mit Undo/Redo (die App kehrt `aufmass`-ChangeSets um). Soll/Ist mit
Soll, Ist, Differenz, %, GP Soll/Ist, Befundspalte (neutral, per Tastatur erreichbar), Summen je Gliederung und gesamt.
X31 einlesen (neues Blatt, Mengen mit `mengen`, Befunde im Dialog) und je Blatt ausgeben. D-45 gemessen (siehe oben):
37–39 KiB je Undo-Schritt, 82–105 ms je Schritt (Last 7), fast ganz im Speicherkern; Folgeticket vorgeschlagen.
Entscheidungen D-87.0 bis D-87.12.

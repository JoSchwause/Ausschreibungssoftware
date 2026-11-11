# 48: App: Zwischenablage, Verschieben, Papierkorb, Undo/Redo und LV-Stände (U5)

Status: merged (integration/welle-3)
Type: task
Welle: 3 (Phase B) · Strang: U (U5) · Paket: `apps/web`
Blocked by: 47, 42, 43, 46
Regeln: A2, A5, A7, U3, U5, U7, U8, Q2, Q5, G-06, C3, ADR 0006, ADR 0009
Herkunft: Ticket 29 (Punkte 4, 5: Befehle für Papierkorb, Undo/Redo, LV-Stand), `plan.md` §2 U5, alte Tickets `.scratch/ava-mvp/issues/14` und `15` (Oberfläche), W-06 (Lücken: Löschen, Verschieben, Undo, OZ für eingefügte Positionen), Ticket 39 (vertagt: Löschen von Projekt und LV, OZ-Vorschlag), Tickets 42, 43, 46

## What to build

Die App bekommt die Bedienung, die Fehler verzeihlich macht: Undo/Redo je Sitzung, Papierkorb, benannte LV-Stände, und
die Zeilenaktionen des Grids (46) werden an Kern (42) und Speicher (43) angeschlossen. Erst damit darf die App auch
Projekte und LVs löschen (Q5). Vorgehen: TDD mit dem Skill `tdd`; am Ende
`pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün. `okf/research/` wird nicht gelesen (C3).

1. **Undo/Redo je Sitzung** (ADR 0006): Ein Stapel in der App; ein Eintrag je Benutzeraktion (eine Befehlsfolge aus dem
   Grid über `onBefehlsfolge` oder das Übernehmen im Positionsdialog ist **ein** Schritt). Rückgängig: Kern kehrt die
   ChangeSets der Aktion um (`changeSetUmkehren`, in umgekehrter Reihenfolge), Speicher schreibt sie mit dem Protokoll-
   befehl `Rueckgaengig { protokollId }` (Ticket 29, Verweis auf den Eintrag des ursprünglichen Befehls), bei einer
   Befehlsfolge je ein `Rueckgaengig` je Befehl in umgekehrter Reihenfolge (D-12); Wiederholen entsprechend mit
   `Wiederholen` (ein wiederholtes `LvStandAnlegen` friert neu ein). Weist der Speicher eine Umkehrung
   mit `konflikt` ab, bleibt der Stand, eine Meldung erklärt es, der Stapel wird nicht beschädigt. Strg+Z,
   Strg+Y und Strg+Umschalt+Z, dazu Schaltflächen; im Grid-Bearbeitungsmodus gilt Strg+Z dem Eingabefeld, nicht dem LV.
   Mindestens 100 Schritte. Der Stapel gilt für das Projekt; Wechsel des LV leert ihn nicht. Neuladen leert ihn (je
   Sitzung, ADR 0006).
2. **Zeilenaktionen des Grids** (46) an Kern und Speicher: Kopieren/Einfügen über `onKopieEinfuegen` → `kopieBauen`
   (Ticket 42, Kennungen aus der `IdQuelle` der App) → `KnotenEinfuegen`; Ausschneiden/Einfügen und Alt+Pfeil kommen als
   `KnotenlisteVerschieben`/`KnotenVerschieben`, Löschen nach Bestätigung im Grid als `KnotenInPapierkorbLegen` (Ticket 29,
   42). Neue Positionen und Titel (Schaltflächen aus 39 und Strg+Plus aus 46, dort über `vorPositionAnlegen`) bekommen
   ihre OZ über `ozVorschlag` (42) im Befehl; die Schaltfläche „Umnummerieren“ bleibt. Hinweise des Kerns (z. B.
   `oz-schritt-ausgewichen`) erscheinen als Hinweis.
3. **Papierkorb-Ansicht** je LV (`LvZustand.papierkorb`, nach `Papierkorbeintrag.nummer`; D-12): Einträge mit OZ,
   Kurztext und Zahl der Positionen, Wiederherstellen an die alte Stelle (`PapierkorbeintragWiederherstellen`,
   `ort: null`), Eintrag endgültig entfernen (`PapierkorbeintragEntfernen`) und Papierkorb leeren (`PapierkorbLeeren`),
   beides nur mit ausdrücklicher Bestätigung (Q5; Undo bleibt in der Sitzung möglich). Verweist ein Angebot auf eine
   Position im Eintrag, weist `speicher` mit `konflikt` ab; die App zeigt das als Meldung (D-12). Bezüge auf Positionen
   im Papierkorb bleiben bis zum Entfernen stehen und zählen nichts.
4. **LV-Stände:** Stand anlegen (`LvStandAnlegen` mit Name, z. B. „Versand“), Liste der Stände mit Zeitpunkt
   (`Speicher.lvStaende.auflisten`), Stand schreibgeschützt öffnen (`laden`)
   (Grid ohne Befehlsausgang; jede Bearbeitungstaste meldet „Stand ist schreibgeschützt“). Vorschlag, falls Zeit: Stand als
   neues LV übernehmen (`LeistungsverzeichnisAnlegen` mit dem Inhalt des Stands, neue LV-Kennung, Name „<LV> (Stand
   <Name>)“).
5. **Löschen von Projekt und LV** (aus Ticket 39 vertagt): mit ausdrücklicher Bestätigung, die nennt, was mitgeht
   (Angebote, Auftrags-LV); `konflikt` des Speichers (abhängige Aggregate, auch LV-Stände des LV, D-12) erscheint als
   verständliche Meldung; Undo holt
   es in derselben Sitzung zurück.
6. **Sprung aus dem Prüf-Panel** in die Zelle über `sprungziel` (46), falls 47 noch den Rückfall über den Dialog nutzt.

## Grenzen

- **Paket `apps/web`.** Fehlt in Kern, Speicher oder Grid etwas, Lücke in die Comments (42, 43, 46); keine Änderung dort.
- Undo liest nie das Befehlsprotokoll (ADR 0009); es arbeitet nur mit den ChangeSets der Sitzung.
- Speichern bei jedem Befehl bleibt (U7): auch jede Umkehrung wird sofort geschrieben.
- **Zu groß?** Zuerst streichen: „Stand als neues LV übernehmen“, dann die Papierkorb-Ansicht (Löschen bleibt über Undo
  abgesichert), dann Punkt 6. Undo/Redo, die Zeilenaktionen und das Löschen von Projekt und LV bleiben.

## Acceptance criteria

- [x] E2E: 50 gemischte Änderungen (Felder, Einfügen aus Excel-TSV, Kopieren, Verschieben, Löschen, Nachlass), dann 50× Undo → Summen und Export der Projektdatei gleich dem Anfang; 50× Redo → gleich dem Ende
- [x] Eine Mehrzeilen-Aktion ist ein Undo-Schritt (E2E: 3 Zeilen einfügen, einmal Strg+Z, alle drei weg)
- [x] Strg+Z im Eingabefeld der Zelle wirkt auf das Feld, nicht auf das LV (E2E)
- [x] Kopieren und Einfügen einer Gliederung mit Unterknoten: neue OZ nach dem Vorschlag, Summen stimmen; Ausschneiden/Einfügen verschiebt (E2E)
- [x] Gelöschte Zeilen erscheinen im Papierkorb und lassen sich wiederherstellen; Leeren nur nach Bestätigung (E2E)
- [x] LV-Stand anlegen, neu laden, Stand schreibgeschützt öffnen; Änderungen am LV ändern den Stand nicht (E2E)
- [x] Projekt und LV löschen nur nach Bestätigung; Undo holt sie zurück (E2E)
- [x] Undo eines Befehls bei 5.000 Positionen bis zur aktualisierten Summenzeile < 100 ms (Messwert im Ticket)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Sichtbares Befehlsprotokoll (ADR 0009), Undo über Sitzungen hinweg, Vergleich zweier Stände, Kopieren zwischen LVs,
GAEB (49), Datensicherung (S4).

## Comments

### Umsetzer

Nur `apps/web` (Ausnahme laut Auftrag: `e2e/dialog.spec.ts` ohne `fixme`, D-15; Ticket 50 ist gemergt, der Test ist grün).

Seams: `src/historie/historie.ts` (Stapel, rein), `Befehlsweg` in `src/lv/befehlsweg.ts` (eine Schreibkette für Befehle,
Folgen, Rückgängig und Wiederholen; Vitest gegen den echten Speicher auf In-Memory-SQLite), `HistorieAnbieter` (Tasten,
Schaltflächen, Seitenwechsel), Papierkorb-Dialog, LV-Stände-Dialog, `LvStandSeite`, Löschen auf der Projektseite;
E2E `e2e/undo.spec.ts`, Messung in `e2e/leistung.spec.ts`.

Entscheidungen (paketlokal, umkehrbar; Frage → Entscheidung → Grund):

- Reichweite des Stapels → einer je Sitzung der App (alle Projekte), nicht je Projekt; Neuladen leert ihn → „Projekt
  löschen“ geschieht auf der Projektseite und wird auf der Liste zurückgeholt; Wechsel von LV und Projekt leert nichts.
  Liegt der Schritt in einem anderen LV/Projekt als dem angezeigten, wechselt die App dorthin (`zielNach`).
- Seitenwechsel → `SpeicherAnbieter` steht jetzt auch um Seiten ohne Speicher (`mussOffen={false}`, sofort sichtbar), damit
  ein Abstecher auf „Vergabe“ oder den Katalog Speicher und Stapel nicht schließt.
- Schreibreihenfolge → alle Befehle und Umkehrungen laufen über eine Kette (`Befehlsweg.reihe`), nicht je Sitzung;
  eine Folge hält die Kette, bis alle ihre Befehle durch sind (keine fremden Befehle dazwischen).
- Ein Schritt → `onBefehlsfolge` des Grids, Übernehmen im Positionsdialog und im Dialog „LV-Angaben“ (`Sitzung.folge`);
  sonst ein Befehl. Abgewiesene Befehle einer Folge zählen nicht; ist nichts geschrieben, entsteht kein Schritt.
- Abweisung mitten in einer Umkehrung → der Schritt wird geteilt: Geschriebenes wandert auf den anderen Stapel, der Rest
  bleibt; Meldung „Rückgängig nicht möglich“ (bei `konflikt` mit Erklärung). So passt jeder Stapel zum gespeicherten Stand.
- Grenze → 200 Schritte (Ticket: mindestens 100), ältere fallen heraus.
- Strg+Z/Strg+Y/Strg+Umschalt+Z → `keydown` am Fenster; nicht in `input`, `textarea`, `select`, editierbaren Elementen,
  `[data-editor]` (Zelleditor) und in Dialogen (dort gehört die Taste dem Feld). Schaltflächen in den Werkzeugleisten
  von LV, Projekt, Projektliste und Stand.
- OZ neuer Knoten → `ozVorschlag` im Befehlsweg für jedes `PositionAnlegen`/`GliederungAnlegen` ohne OZ (Schaltflächen,
  Strg+Plus, Einfügen aus Excel), erst wenn der Befehl an der Reihe ist (Stand nach allen früheren); eine mitgebrachte OZ
  bleibt; `oz-schritt-ausgewichen` erscheint in der Hinweisleiste. `vorPositionAnlegen` wird deshalb nicht gebraucht.
- Kopieren → `onKopieEinfuegen` → `kopieBauen` mit der `IdQuelle` der App → `KnotenEinfuegen`; gibt es die kopierten Zeilen
  nicht mehr: Meldung. Ausschneiden, Alt+Pfeil und Löschen sendet das Grid selbst (46).
- Papierkorb → Dialog „Papierkorb (n)“ in der Werkzeugleiste; Tabelle nach `nummer` mit OZ und Kurztext des ersten obersten
  Knotens („(+n)“ für weitere), Zahl der Positionen; Bestätigung im selben Dialog (kein zweiter Dialog darüber). `konflikt`
  beim Entfernen/Leeren → Meldung „Ein Angebot verweist …“ (D-12).
- LV-Stände → Dialog „LV-Stände“ (Name, Liste mit Zeitpunkt in de-DE); Öffnen unter `/lv/<id>/stand/<standId>`. Das Grid
  des Stands bekommt Befehlsempfänger, die nur „Stand ist schreibgeschützt“ melden (das Grid hat keinen Nur-Lese-Modus;
  der Zelleditor öffnet sich noch, die Meldung kommt beim Übernehmen). „Als neues LV übernehmen“ umgesetzt: neue Kennungen
  über `kopieBauen`, Papierkorb des Stands kommt nicht mit.
- Löschen von LV und Projekt → ohne Kaskade: Die Bestätigung nennt Positionen und Papierkorbeinträge (LV) bzw. Bieter und
  Protokoll (Projekt) und sagt, dass Angebote, Auftrags-LV, LV-Stände bzw. LVs das Löschen verhindern; `konflikt` → eigene
  Meldung. Grund: Ein Projekt samt LVs in einer Folge zu löschen ließe sich wegen D-31.1 nicht zurückholen (das Protokoll
  geht mit dem Projekt, die `Rueckgaengig` der LV-Löschungen fänden ihren Eintrag nicht), und Angebote kann die App ohne
  `vergabe` nicht löschen.
- Testpfad → zusätzlich `projektdatei` (Export ohne Protokoll), `historie` (Stapeltiefe) und `leerlauf` (Kette leer); nur im
  Test-Build. `dialog.spec.ts` wartet nach „Umnummerieren“ auf `leerlauf`, weil neue Positionen ihre OZ jetzt schon haben
  und die alte Bedingung zu früh erfüllt war (mechanisch, keine Prüfung geschwächt).
- E2E-Fenster 1440 × 2000 in `undo.spec.ts` → das Grid ist virtualisiert; so stehen alle Zeilen von `typisch` im DOM.

Lücken (nicht hier geändert):

- **Speicher (D-31.1, 43):** Nach Undo eines `ProjektLoeschen` ist das alte Protokoll weg; ein danach zurückgenommener
  Schritt am selben Projekt (z. B. ein früheres „LV löschen“) wird mit `konflikt` abgewiesen und bleibt im Stapel.
- **Grid (46):** kein Nur-Lese-Modus (Stand); die Rückfrage beim Löschen zählt weiter nur sichtbare Zeilen.
- Kein Undo über Dateiimport (Projektdatei importieren ist kein Befehl der Sitzung).

Messwert (`e2e/leistung.spec.ts`, `gross`, Mengenänderung, dann Strg+Z bis zur Summenzeile, 9 Messungen nach 2 zum
Aufwärmen): Undo Median gesamt 69 ms, davon `speicher.anwenden` 54 ms, **App-Schicht ohne Speicher 15 ms**; hart geprüft
wie in Ticket 39 die App-Schicht (< 100 ms) und die Gesamtzeit mit grober Schranke (< 400 ms).

Suite (Umsetzer, nach Merge von `integration/welle-3` mit Ticket 50): `pnpm lint`, `pnpm typecheck` grün; `pnpm test`
1593 bestanden, 2 übersprungen (nicht aus diesem Ticket), `fixtures` 16/16; `pnpm --filter @tethys/web e2e` 34 bestanden,
kein `fixme` mehr.


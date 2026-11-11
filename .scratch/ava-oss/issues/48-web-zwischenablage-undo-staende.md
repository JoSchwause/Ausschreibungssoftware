# 48: App: Zwischenablage, Verschieben, Papierkorb, Undo/Redo und LV-Stände (U5)

Status: claimed
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

- [ ] E2E: 50 gemischte Änderungen (Felder, Einfügen aus Excel-TSV, Kopieren, Verschieben, Löschen, Nachlass), dann 50× Undo → Summen und Export der Projektdatei gleich dem Anfang; 50× Redo → gleich dem Ende
- [ ] Eine Mehrzeilen-Aktion ist ein Undo-Schritt (E2E: 3 Zeilen einfügen, einmal Strg+Z, alle drei weg)
- [ ] Strg+Z im Eingabefeld der Zelle wirkt auf das Feld, nicht auf das LV (E2E)
- [ ] Kopieren und Einfügen einer Gliederung mit Unterknoten: neue OZ nach dem Vorschlag, Summen stimmen; Ausschneiden/Einfügen verschiebt (E2E)
- [ ] Gelöschte Zeilen erscheinen im Papierkorb und lassen sich wiederherstellen; Leeren nur nach Bestätigung (E2E)
- [ ] LV-Stand anlegen, neu laden, Stand schreibgeschützt öffnen; Änderungen am LV ändern den Stand nicht (E2E)
- [ ] Projekt und LV löschen nur nach Bestätigung; Undo holt sie zurück (E2E)
- [ ] Undo eines Befehls bei 5.000 Positionen bis zur aktualisierten Summenzeile < 100 ms (Messwert im Ticket)
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Sichtbares Befehlsprotokoll (ADR 0009), Undo über Sitzungen hinweg, Vergleich zweier Stände, Kopieren zwischen LVs,
GAEB (49), Datensicherung (S4).

## Comments

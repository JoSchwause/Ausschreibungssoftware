# 55: C1: Kostengliederung (nur Nummern) und Kostenermittlung

Status: claimed
Type: task
Welle: 4 · Strang: C1 · Paket: `packages/kosten` (neu; dazu der Eintrag in `tools/boundaries.mjs`, Workspace-Konfiguration)
Blocked by: –
Regeln: A2, A3, N1, N2, N3, N4, U5, C1, G-16, G-17, D-24
Herkunft: `plan.md` §2 C1 („Kostengliederung (nur Nummern, Bezeichnungen importiert) und Kostenermittlung“)

## What to build

Ein reines TS-Paket (A2: kein DOM, kein I/O, keine Uhr, kein Zufall), das nur `vertrag` und `dezimal` importiert (A3).
Keine Vertragstypen, keine Speicherung, keine Oberfläche in diesem Ticket (D-24); die Typen leben im Paket, bis C2 (Welle 5)
sie mit LV-Zuordnung und Speicherung in den Vertrag hebt.

1. **Kostengruppen-Nummer.** Dreistellige Nummer nach Art der DIN 276 (`100`–`999`). Im Repo steht **keine** Liste der
   Gruppen und keine Bezeichnung (G-16, C1). Ebene und Elternteil folgen allein aus den Ziffern: `X00` ist Ebene 1, `XY0`
   (Y ≠ 0) Ebene 2 mit Elternteil `X00`, `XYZ` (Z ≠ 0) Ebene 3 mit Elternteil `XY0`. Funktionen: Form prüfen (`kgLesen`
   → Ergebnis mit Fehlercode), Ebene, Elternteil, Vorfahren, Sortierung. Vorschlag: eine Marke `Kostengruppennummer`
   (Branded String) im Paket.
2. **Bezeichnungen importieren.** Reine Funktion `bezeichnungenLesen(text: string)` für eine CSV des Nutzers (Trenner `;`
   oder `,` automatisch, optional Kopfzeile, UTF-8 mit/ohne BOM, Anführungszeichen nach RFC 4180). Ergebnis: Zuordnung
   Nummer → Bezeichnung plus Befunde je Zeile (Nummer ungültig, doppelt, leer). Keine Datei-API.
3. **Kostenermittlung.** Eine Ermittlung ist eine Liste von Einträgen `{ nummer, betrag: Betrag (2 Stellen), bemerkung? }`
   (Netto, keine MwSt-Logik). `kostenermittlungBerechnen(eintraege)` liefert je vorkommender Gruppe und je Vorfahre:
   eigener Betrag, Summe (= eigener Betrag + Summen der Kinder), Ebene; dazu die Gesamtsumme (Summe der Ebene-1-Gruppen).
   Doppelte Nummer, eigener Betrag zugleich mit Kinderbeträgen, negativer Betrag: Befund, nie Sperre (U5). Nur
   Dezimalarithmetik (N1), Beträge kanonisch mit 2 Stellen (N3); keine Rundung nötig, außer ein Eingang ist nicht kanonisch
   (dann Befund, nicht still runden).
4. de-DE-Formatieren nur über `dezimal` an den Rändern (N4); das Paket selbst formatiert nicht.

Begriffe „Kostengruppe“, „Kostenermittlung“, „Kostengliederung“ zuerst in `GLOSSARY.md` prüfen bzw. ergänzen (L2).

## Grenzen

- Keine DIN-276-Bezeichnungen, keine Nummernliste, keine Texte der Norm im Repo (C1, G-16); Testdaten mit erfundenen
  Bezeichnungen („Gruppe A“) oder ohne.
- Kein anderes Paket ändern außer `tools/boundaries.mjs` (neue Kante `kosten → vertrag, dezimal`) und Workspace-Dateien.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Golden-Tests (Hand-Beispiele mit hergeleiteten Summen) und Property-Tests (Summe der Ebene 1 = Summe aller eigenen
      Beträge; Reihenfolge der Einträge ändert nichts) (Q1)
- [ ] CSV-Leser: Tests für Trenner, BOM, Anführungszeichen, Befunde
- [ ] Paketgrenzen-Prüfung kennt `kosten`; Lint-Regel N1 gilt für das Paket
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Speicherung, Oberfläche, Zuordnung LV ↔ Kostengruppe (C2), Kostenkontrolle (C3), Ausgaben der Norm (Edition 2008/2018).

## Comments

- **D-55.1** Wie streng ist `kgLesen`? → Leerraum am Rand wird entfernt, sonst genau drei ASCII-Ziffern, erste Ziffer
  1–9. Codes `nummer-leer`, `nummer-form`, `nummer-null`. Grund: CSV-Zellen und Eingaben tragen oft Leerzeichen; alles
  andere (Präfix „KG“, Vollbreitenziffern, `099`) ist keine Nummer der Form `100`–`999`.
- **D-55.2** Wohin gehört `X0Z` (Z ≠ 0)? → Ebene 3 mit Elternteil `X00` (die Ticketregel `XYZ` → `XY0` mit Y = 0). Es
  gibt keine Zwischengruppe. Grund: Hierarchie nur aus den Ziffern (D-24), keine erfundene Ebene.
- **D-55.3** Was passiert mit einem Betrag, der nicht kanonisch ist? → Ist er eine Dezimalzahl in Punktnotation mit
  anderer Skala (`12.345`, `7.5`), wird er kaufmännisch auf 2 Stellen gebracht (negative nach E-07) und zählt, mit Befund
  `betrag-nicht-kanonisch`. Ist er keine Dezimalzahl (`1,00`), zählt der Eintrag nicht, Befund `betrag-ungueltig`.
  Ungültige Nummer: Eintrag zählt nicht, Befund `nummer-ungueltig`. Grund: nie still runden (Ticket), nie sperren (U5);
  was sich nicht lesen lässt, kann nicht summiert werden.
- **D-55.4** Doppelte Nummer in der Ermittlung? → Beträge werden addiert (eigener Betrag = Summe aller Einträge der
  Nummer), Befund `nummer-doppelt` an jedem weiteren gezählten Eintrag. Grund: kein Betrag geht verloren; Gesamtsumme =
  Summe aller Einträge bleibt wahr.
- **D-55.5** „Eigener Betrag zugleich mit Kinderbeträgen“ über welche Tiefe? → Über den ganzen Teilbaum: Befund
  `eigener-betrag-und-kinder` (ohne Eintragsindex) an jeder Gruppe mit eigenem Eintrag, unter der ein weiterer Eintrag
  liegt. Beides wird summiert. Gruppen, die nur als Vorfahre vorkommen, haben `eigenerBetrag: null` (nicht `0.00`), damit
  „nicht erfasst“ und „0,00 erfasst“ unterscheidbar bleiben.
- **D-55.6** CSV-Details? → Trenner: der erste `;` oder `,` außerhalb von Anführungszeichen in der ersten Zeile mit Inhalt,
  sonst `;`. Kopfzeile: die erste nicht leere Zeile, wenn ihre erste Zelle keine Ziffer enthält. Leere Zeilen und Zeilen
  nur aus Trennern werden übergangen; Spalten ab der dritten ignoriert; Nummer und Bezeichnung ohne Leerraum am Rand,
  Zeilenumbrüche in Bezeichnungen bleiben. Doppelte Nummer: die erste gilt, Befund an den weiteren. Offenes
  Anführungszeichen bis Textende: Befund `anfuehrungszeichen-offen`, der Datensatz wird nicht übernommen. Zeichen nach
  einem schließenden Anführungszeichen werden angehängt (nachsichtig statt Fehler). Befundzeile = physische Zeile, in der
  der Datensatz beginnt. Grund: deutsche Excel-Exporte nutzen `;`, andere `,`; nachsichtig lesen, aber jede verworfene
  Zeile melden.
- **D-55.7** Grenze von `kosten`? → In `tools/boundaries.mjs` von `FACH` (mit `kern`) auf `vertrag`, `dezimal` verengt, wie
  im Ticket; ein Test in `tools/boundaries.test.mjs` hält das fest. Die Lockfile-Änderung enthält nur den neuen Importer
  (die lokale pnpm-Version hätte sonst `libc`-Felder anderer Pakete umgeschrieben).

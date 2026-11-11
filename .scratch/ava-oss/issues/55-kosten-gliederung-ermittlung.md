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

# 111: X4: `bauleitung`: Mängel und Bautagebuch

Status: claimed
Type: task
Welle: 6 · Strang: X4 · Paket: `packages/bauleitung` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: 97
Modell: opus
Regeln: A2, A3, A5, A6, U5, Q1, Q5, D-57
Herkunft: `plan.md` §2 X4 („Bauleitung: Mängel, Bautagebuch“), Berater D-57

## What to build

Ein reines TS-Paket (A2: keine Uhr; der Stichtag kommt vom Aufrufer), das die Befehle für `Mangel` und `Bautagebucheintrag`
(v1.6) ausführt und Auswertungen liefert. Es importiert nur `vertrag` und `dezimal` (`'packages/bauleitung':
['packages/vertrag', 'packages/dezimal']`, `apps/web` darf es importieren).

1. **Mängel.** `MangelBefehl` mit `…BefehlAusfuehren`, `…ChangeSetAnwenden`, `…ChangeSetUmkehren`. Der Ausführer bekommt den
   Bestand des Projekts (die bestehenden Mängel) für die Prüfung der eindeutigen Nummer; `naechsteMangelnummer`. Status nur
   über Verlaufseinträge: offen → angezeigt (mit Frist) → beseitigt → abgenommen; beseitigt → offen (Nachbesserung
   abgelehnt); andere Übergänge sind Fehler `statuswechsel-unzulaessig` (Lesart im Code als Tabelle). Datum eines
   Verlaufseintrags nicht vor dem vorigen: Fehler.
2. **Fristprüfung** zu einem Stichtag: überfällig = Frist vor dem Stichtag und Status offen oder angezeigt → Befund
   `mangel-frist-ueberschritten` mit Sprungziel; Frist am Stichtag ist nicht überfällig (Lesart am Code).
3. **Auswertung:** Mängel je Auftragnehmer (über das Auftrags-LV, dessen `Auftragnehmer` die App übergibt) und Status, offene
   und überfällige Zahl.
4. **Bautagebuch.** `BautagebuchBefehl` (Eintrag setzen = anlegen oder ersetzen, löschen) mit Prüfung „ein Eintrag je Datum“
   gegen den Bestand, Temperaturen und Köpfe ganzzahlig, Köpfe ≥ 0; Auswertung je Zeitraum: Arbeitskräfte je Tag und je Firma
   (Summen).
5. **Tests (Q1):** Golden-Tests für Statusverlauf, Fristprüfung (auch am Stichtag), Nummernvergabe, Bautagebuch-Summen;
   Property-Test: Umkehrung jedes Befehls stellt den Zustand wieder her.

Neue Begriffe (z. B. „Mängelanzeige“, „Frist“) zuerst ins `GLOSSARY.md` (L2), Abschnitt „Bauleitung (LP 8)“.

## Grenzen

- Nur `packages/bauleitung` (und die genannten Wurzeldateien). Keine Fotos (D-57). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Befehle, Umkehrung, Statustabelle, Fristprüfung, Auswertungen getestet; Paketgrenzen-Prüfung kennt `bauleitung`
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

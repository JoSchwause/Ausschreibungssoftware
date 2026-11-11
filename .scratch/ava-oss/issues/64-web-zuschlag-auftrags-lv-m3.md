# 64: V4: Zuschlag und Auftrags-LV in der App, E2E für Tor M3

Status: ready-for-agent
Type: task
Welle: 4 · Strang: V4 · Paket: `apps/web` (Ordner `src/vergabe/` (nach 63) und `src/auftrag/`; Einhängestellen, D-20)
Blocked by: 63 (Preisspiegel-Seite), 59 (`zuschlagErteilen`), 57 (Speicher v1.3), 54 (schreibgeschütztes Grid), 69 (X84-Dateien)
Regeln: A5, U5, Q2, Q5, ADR 0011, E-04, D-21
Herkunft: `plan.md` §2 V4, §4 Tor M3

## What to build

1. **Zuschlag erteilen** aus dem Preisspiegel (Knopf je Bieterspalte bzw. Auswahl des Bieters): Dialog mit
   `zuschlagsvorschau` (Ticket 59): Wahlgruppen mit ihren Varianten zum Ankreuzen (höchstens eine je Gruppe), Zahl der
   entfallenden und der unbepreisten Positionen, Warnungen in Worten. Bestätigen erzeugt mit `zuschlagErteilen` den Befehl
   `AuftragsLeistungsverzeichnisAnlegen` und schickt ihn über den vorhandenen Befehlsweg (ein Undo-Schritt, U7). Gibt es zum
   LV schon ein Auftrags-LV, ist der Knopf aus und erklärt warum (Q5, D-21).
2. **Auftrags-LV-Seite** (`src/auftrag/`, Route z. B. `/projekt/<id>/auftrag/<id>`): Kopf (Bieter/Auftragnehmer, Bezug auf
   LV und Angebot), Grid **schreibgeschützt** (`LvGrid` mit der Nur-Lese-Eigenschaft aus Ticket 54), Summenzeile, Prüf-Panel
   nur lesend. Die Projektseite listet Auftrags-LVs. Export als GAEB X86 über den vorhandenen Exportweg, falls er ohne
   Paketänderung für ein Auftrags-LV nutzbar ist (sonst vermerken).
3. **E2E für Tor M3** (`apps/web/e2e/m3.spec.ts`): neues Projekt → LV `typisch` per GAEB X83 einlesen (oder vorhandener
   Testweg) → **zwei** X84-Angebote aus Ticket 69 über die Oberfläche einlesen → Preisspiegel: Netto, Netto nach Nachlass,
   Brutto je Bieter und Rang gleich den Sollwerten der Fixture → Zuschlag an den Erstplatzierten (mit einer gewählten
   Alternative, falls `typisch` eine Wahlgruppe hat) → Auftrags-LV-Seite zeigt die erwarteten Summen (Sollwerte aus
   Fixture/Ticket 69, nicht aus dem Kern abgeschrieben) → Neuladen → alles noch da.

## Grenzen

- Nur die genannten Ordner plus markierte Einhängestellen. Fehlt etwas in Paketen, melden.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] `m3.spec.ts` grün, dreimal hintereinander
- [ ] E2E: zweiter Zuschlag nicht möglich; Undo nimmt den Zuschlag zurück
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Nachträge, Aufmaß, Bearbeiten des Auftrags-LV.

## Comments

### Aus Ticket 69 (Orchestrator)
- X84-Dateien: `fixtures/angebote/typisch-bieter-{a,b,c}.x84`; Sollwerte im Block `preisspiegel` von `fixtures/typisch-angebote.json`, auch je Paar. Für M3 die Paare A+B nehmen (Rang A 1, B 2; Netto nach Nachlass 55.481,84 / 56.607,77).
- Ein aus `typisch-X83-3.3.x83` eingelesenes LV trägt keine EP: Schätzpreis-Spalte 0,00 (D-69.4). Der X83-Import meldet `wahl-ohne-grundposition` und `mwst-ersatzwert` als Warnungen: prüfen, ob die Wahlgruppe von `typisch` nach dem X83-Import für den Zuschlag mit Wahl noch taugt; sonst das LV über den vorhandenen Testweg (Projektdatei/Fixture) anlegen und das im Ticket begründen.

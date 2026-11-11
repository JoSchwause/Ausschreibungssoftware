# 64: V4: Zuschlag und Auftrags-LV in der App, E2E für Tor M3

Status: claimed
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

- [x] `m3.spec.ts` grün, dreimal hintereinander
- [x] E2E: zweiter Zuschlag nicht möglich; Undo nimmt den Zuschlag zurück
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Nachträge, Aufmaß, Bearbeiten des Auftrags-LV.

## Comments

### Aus Ticket 69 (Orchestrator)
- X84-Dateien: `fixtures/angebote/typisch-bieter-{a,b,c}.x84`; Sollwerte im Block `preisspiegel` von `fixtures/typisch-angebote.json`, auch je Paar. Für M3 die Paare A+B nehmen (Rang A 1, B 2; Netto nach Nachlass 55.481,84 / 56.607,77).
- Ein aus `typisch-X83-3.3.x83` eingelesenes LV trägt keine EP: Schätzpreis-Spalte 0,00 (D-69.4). Der X83-Import meldet `wahl-ohne-grundposition` und `mwst-ersatzwert` als Warnungen: prüfen, ob die Wahlgruppe von `typisch` nach dem X83-Import für den Zuschlag mit Wahl noch taugt; sonst das LV über den vorhandenen Testweg (Projektdatei/Fixture) anlegen und das im Ticket begründen.

### Umsetzung (Branch `welle-4/64-zuschlag-m3`)

Neu in `apps/web/src/auftrag/`: `zuschlag.ts` (rein: `zuschlagPlanen` – Vorschau, Wahlgruppen zum Ankreuzen, Zahlen,
Warnungen in Worten, Befehl; `wahlSetzen`), `auftrag.ts` (`zuschlagSpeichern` auf der Kette des Befehlswegs,
`auftragsLvsLaden`, `auftragZumLv`, `auftragsLvChangeSetUmkehren`, `alsLvZustand`), `ziel.ts` (Adresse, Ziel nach
Undo/Redo), `ausgabe.ts` (X86), `ZuschlagDialog.tsx`, `AuftragsLvSeite.tsx` (`/projekt/<id>/auftrag/<id>`),
`AuftragAusgeben.tsx`, `AuftragsLvListe.tsx`, `texte.ts`, `auftrag.css`. In `src/vergabe/`: `PreisspiegelSeite.tsx`
lädt Projekt und ein vorhandenes Auftrags-LV, „Zuschlag erteilen“ je Bieter über `Bieteruebersicht.aktion`.
Einhängestellen (`// Ticket 64`): Route in `App.tsx`, Liste in `projekt/ProjektSeite.tsx`, `Teil.changeSet` in
`historie/historie.ts`, `umkehren` in `lv/befehlsweg.ts`, `zielNach` in `historie/HistorieAnbieter.tsx`. Keine
Paketänderung.

Getestete Schnittstellen (Demo-Modus, statt Abstimmung mit dem Nutzer): `zuschlagPlanen`/`wahlSetzen` (Vitest gegen
`typisch` und die X84 von Bieter A/B), `zuschlagSpeichern` + `auftragsLvsLaden` + Undo/Redo gegen einen echten
In-Memory-Speicher (`auftrag.test.ts`), `auftragZiel`, `auftragAusgeben` (X86 mit `CTR` und Summen der Fixture), E2E
`m3.spec.ts`.

- **D-64.1** LV in der M3-E2E über den Testpfad statt X83? → Ja, `tethysTest.lvAnlegen` mit dem Inhalt der Fixture (wie
  `preisspiegel.spec.ts`); die X84 kommen über die Oberfläche. → Nach dem X83-Rundweg hat die Wahlgruppe von `typisch`
  keine Grundposition mehr (D-16, Warnung `wahl-ohne-grundposition`); eine gewählte Alternative ersetzte dann nichts
  (D-59.2) und der Zuschlag mit Wahl, den das Ticket verlangt, wäre nicht prüfbar. Der X83-Import selbst ist durch
  `gaeb.spec.ts` gedeckt. Reversible: yes.
- **D-64.2** Wie liest die App Auftrags-LVs? → Über `speicher.projektdateiExportieren(projektId)` und den Block
  `auftragsLeistungsverzeichnisse` (Dezimalwerte stehen dort in Vertragsform). → `Speicher` (Vertrag v1.3) hat kein
  Repository für Auftrags-LVs; ein `AuftragsLvRepository` (`auflisten(projektId)`, `laden(id)`) wäre ein Vertragsticket
  (A4, P9). **Lücke gemeldet.** Folge: Preisspiegel, Projektseite und Auftrags-LV-Seite exportieren beim Laden die
  ganze Projektdatei (samt Protokoll); bei `typisch` unmerklich, bei großen Projekten langsam. Deshalb trägt die Route
  auch die Projekt-ID. Reversible: yes.
- **D-64.3** Route → `/projekt/<projektId>/auftrag/<id>` (Vorschlag des Tickets), wegen D-64.2. Reversible: yes.
- **D-64.4** Undo des Zuschlags → `Teil.changeSet` kennt `AuftragsLvChangeSet`; die Umkehrung überträgt das gleich gebaute
  ChangeSet auf `changeSetUmkehren` des Kerns (Knoten, Summen), Kopf und Kennung werden nur vertauscht. → Der Kern hat
  keine `auftragsLvChangeSetUmkehren`; kein eigener Rechenweg in der App. **Lücke gemeldet** (gehört in `kern`).
  Nach Rückgängig wechselt die App zum Preisspiegel, nach Wiederholen auf die Seite des Auftrags-LV. Reversible: yes.
- **D-64.5** Dialog → Ankreuzfelder je Wahlgruppe (Überschrift „Statt <Grundpositionen>“), Ankreuzen nimmt die andere
  Alternative derselben Gruppe weg (höchstens eine, D-21); Zahlen aus `zuschlagsvorschau`, Warnungen aus
  `zuschlagErteilen` bei jeder Änderung der Wahl, also schon vor dem Bestätigen; die neue Kennung entsteht einmal je
  Dialog. Ein Fehler (`ungueltige-eingabe`) steht im Dialog, „Zuschlag erteilen“ ist dann aus. Reversible: yes.
- **D-64.6** Zweiter Zuschlag → Knöpfe aus, `aria-describedby` auf den Hinweis „Der Zuschlag zu diesem LV ist an … erteilt.
  Ein zweiter Zuschlag ist nicht möglich; Rückgängig nimmt den Zuschlag zurück.“ mit Link zum Auftrags-LV; zusätzlich
  prüft `zuschlagSpeichern` in der Kette des Befehlswegs (doppelter Klick, zweiter Tab desselben Speichers nicht möglich,
  E-14). Reversible: yes.
- **D-64.7** X86 → eigener Knopf „GAEB X86 ausgeben“ auf der Auftrags-LV-Seite über `schreibeGaeb` mit Summen und
  Zuschlagsbasen des Kerns. → `GaebAusgeben` der LV-Seite nimmt ein `LvZustand`, bietet X81/X83 an und lässt den
  Auftragnehmer weg (Ticket 49). Seit Ticket 68 nimmt der Writer das `AuftragsLeistungsverzeichnis` selbst und schreibt
  `CTR` aus `auftragnehmer`; `ausgabe.ts` übergibt es so (die frühere Writer-Option ist entfallen). Reversible: yes.
- **D-64.8** Prüf-Panel nur lesend → `lvPruefen` auf dem Auftrags-LV in LV-Form (`alsLvZustand`); Sprünge gehen zur Zelle
  bzw. Zeile, nie in den Positionsdialog. F8 wie auf der LV-Seite. Reversible: yes.
- **D-64.9** Erwartete Summen des Auftrags-LV in `m3.spec.ts` → hergeleitet aus der Fixture: Netto des Bieters minus GP der
  Grundposition plus GP der Alternative (beide aus `sollwerte.positionen`), MwSt nach N2 mit dem Satz des LV
  (55.481,84 − 5.155,30 + 5.774,21 = 56.100,75; MwSt 10.659,14; Brutto 66.759,89, wie die Goldens von Ticket 59).
  Reversible: yes.
- Nach Merge von `integration/welle-4` (2bfb344, Tickets 57 und 68): `auftrag.test.ts` grün, `m3.spec.ts` dreimal
  hintereinander grün (`--repeat-each=3`).
- Nach Merge von `integration/welle-4` (b60ca0b, Ticket 65): Lint, Typecheck, `pnpm test` (2017 Tests) grün; Web-E2E
  64/64 grün; `m3.spec.ts` erneut dreimal hintereinander grün.

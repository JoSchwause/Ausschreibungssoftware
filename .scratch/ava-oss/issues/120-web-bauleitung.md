# 120: X4 in der App: Mängel und Bautagebuch, Tor X4

Status: claimed
Type: task
Welle: 6 · Strang: X4 · Ordner: `apps/web/src/bauleitung/` (neu); Einhängestellen in `App.tsx`, `projekt/ProjektSeite.tsx`,
`historie/arten.ts` (markiert `// Ticket 120`, D-20); E2E `apps/web/e2e/x4.spec.ts`, Kettentest `apps/web/src/x4-kette.test.ts`
Blocked by: 106, 111, 112, 113
Modell: sonnet
Regeln: A2, A5, U2–U5, Q2, Q5, D-57, D-58
Herkunft: `plan.md` §2 X4; Tor X4 (`plan.md` §4)

## What to build

1. **Mängel** (`/projekt/<id>/maengel`): Liste im `VergleichsGrid` (Nummer, Titel, Ort, Auftragnehmer, festgestellt, Frist,
   Status, Kennzeichen „überfällig“), Filter nach Status und Auftragnehmer; anlegen und bearbeiten in einem Formular (Titel,
   Beschreibung, Ort, Auftrags-LV und Position wahlweise, Bauteil eines Modells wahlweise, festgestellt, Frist; Nummer
   vorgeschlagen); Statusaktionen „Mangel anzeigen (Frist)“, „Beseitigung gemeldet“, „Abnehmen“, „Wieder öffnen“ mit Datum und
   Bemerkung; Verlauf sichtbar. Der **Stichtag** der Fristprüfung ist das heutige Datum der App (Rand, A2); überfällige Mängel
   als Befund mit Sprunglink. PDF „Mängelliste“ und „Mängelanzeige“ für einen Auftragnehmer (Ticket 113). Löschen mit
   Bestätigung.
2. **Bautagebuch** (`/projekt/<id>/bautagebuch`): Liste der Tage, Eintrag je Datum (Wetter, Temperaturen, Arbeitskräfte je Firma
   – Firmen vorgeschlagen aus den Auftragnehmern der Auftrags-LVs –, Geräte, Leistungen, Behinderungen, Vorkommnisse),
   zweiter Eintrag am selben Datum wird abgewiesen mit Hinweis; PDF für einen Zeitraum.
3. Undo/Redo (Tabelle `historie/arten.ts`), automatisch speichern, Neuladen behält alles.
4. **Tor X4** (D-58): `x4.spec.ts` mit fester Uhr in Playwright (`page.clock`) legt die Mängel und Bautagebucheinträge aus
   `fixtures/bauleitung.json` (Ticket 112) über die Oberfläche an → genau der überfällige Mangel als Befund → Auswertung =
   Soll → beide PDFs erzeugt → Neuladen; `x4-kette.test.ts` ohne Oberfläche gegen dieselben Sollwerte. Dreimal grün; sonst
   Kettentest plus verkürzte E2E.

Aus dem Review (D-66): Die Mängelanzeige nimmt die Frist aus dem Verlaufseintrag `angezeigt` (`frist?`), damit ein wieder
geöffneter Mangel die Frist der früheren Anzeige behält.

## Grenzen

- Regeln stehen in `bauleitung`. Keine Fotos (D-57). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der App-Logik, `x4.spec.ts` und `x4-kette.test.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

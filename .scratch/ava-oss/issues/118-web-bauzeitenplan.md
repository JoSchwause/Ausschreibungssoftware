# 118: X2 in der App: Bauzeitenplan, Tor X2

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X2 · Ordner: `apps/web/src/bauzeit/` (neu); Einhängestellen in `App.tsx`, `projekt/ProjektSeite.tsx`,
`historie/arten.ts` (markiert `// Ticket 118`, D-20); E2E `apps/web/e2e/x2.spec.ts`, Kettentest `apps/web/src/x2-kette.test.ts`
Blocked by: 96, 106, 109, 112, 113
Modell: opus
Regeln: A5, U2–U5, U7, Q2, Q5, D-57, D-58
Herkunft: `plan.md` §2 X2; Tor X2 (`plan.md` §4)

## What to build

1. **Bauzeitenpläne des Projekts** (`/projekt/<id>/bauzeit`): Liste, anlegen (Name, Projektbeginn, Arbeitskalender: Wochentage,
   Bundesland, freie Tage), umbenennen, löschen mit Bestätigung.
2. **Planseite:** `VergleichsGrid` mit Spalten Nr., Vorgang, Dauer (AT), Beginn, Ende, Gesamtpuffer und der **Balkenspalte**
   (Ticket 96; Zeitachse und Tagesindizes aus `bauzeit`, Texte de-DE in der App, N4); Sammelvorgänge als Baum; kritische
   Vorgänge gekennzeichnet; Projektende und kritischer Weg in der Kopfzeile. Vorgang anlegen/bearbeiten in einem Formular
   (Bezeichnung, Nummer, Eltern, Dauer, Terminvorgabe, Anordnungsbeziehungen mit Art und Abstand, Bezug auf LV-Knoten,
   Ist-Termine und Fortschritt) → `BauzeitenplanBefehl`; Befunde der Terminrechnung (Zyklus, Beziehung an Sammelvorgang,
   unbekannter Vorgänger) im Prüfpanel mit Sprunglink (U5). Undo/Redo (Tabelle `historie/arten.ts`), automatisch speichern.
3. **PDF** des Plans über `ausgabe` (Ticket 113), Dialog wie die übrigen Drucke.
4. **Tor X2** (D-58): `x2.spec.ts` legt den Plan aus `fixtures/bauzeit.json` (Ticket 112) über die Oberfläche an → kritischer Weg
   und Endtermin = Soll → Neuladen → PDF erzeugt (Seitentext enthält Projektende); `x2-kette.test.ts` rechnet denselben Plan ohne
   Oberfläche gegen alle Sollwerte. Dreimal grün; sonst Kettentest plus verkürzte E2E (D-58).

## Grenzen

- Terminrechnung steht in `bauzeit`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der App-Logik, `x2.spec.ts` und `x2-kette.test.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

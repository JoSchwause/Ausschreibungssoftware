# 119: X3 in der App: Honorarberechnung, Tor X3

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X3 · Ordner: `apps/web/src/honorar/` (neu); Einhängestellen in `App.tsx`, `projekt/ProjektSeite.tsx`,
`historie/arten.ts` (markiert `// Ticket 119`, D-20); E2E `apps/web/e2e/x3.spec.ts`, Kettentest `apps/web/src/x3-kette.test.ts`
Blocked by: 106, 110, 112, 113
Modell: sonnet
Regeln: A5, N4, U3, U5, Q2, D-56, D-58
Herkunft: `plan.md` §2 X3; Tor X3 (`plan.md` §4)

## What to build

1. **Honorarberechnungen des Projekts** (`/projekt/<id>/honorar`): Liste, anlegen, umbenennen, löschen mit Bestätigung.
2. **Seite einer Honorarberechnung:** je Objekt ein Formular: Bezeichnung, Leistungsbild, Honorarzone, **Honorarsatz** in
   Prozent mit benannten Vorgaben (Basishonorarsatz 0, Viertelsatz 25, Mittelsatz 50, Dreiviertelsatz 75, oberer
   Honorarsatz 100; Standard 0 nach § 7 Abs. 1), anrechenbare Kosten als Betrag oder aus einer Kostenermittlung des Projekts
   (Schalter „Technische Anlagen nicht selbst geplant (§ 33 Abs. 2)“, Beträge nach § 33 Abs. 3 und § 4 Abs. 3), Leistungsphasen
   als Tabelle (beauftragt, Anteil mit Standard aus der Tafel), Umbauzuschlag (bei „Umbau“ Vorschlag 20 %, § 6 Abs. 2); dazu
   Nebenkosten (Prozent oder Betrag) und MwSt-Satz. Das **Ergebnis** (`honorar`) als Tabelle mit Herleitung (Tafelzeilen,
   von, bis, Honorar, Phasen, Zuschläge, Netto, USt, Brutto); Befunde und Hinweise (außerhalb der Tafel, Stufe der
   Kostenermittlung, DIN-276-Fassung) sichtbar (U5). Ein Undo-Schritt je Änderung; Neuladen behält alles.
3. **PDF** über `ausgabe` (Ticket 113).
4. **Tor X3** (D-58): `x3.spec.ts` legt den Fall aus `fixtures/honorar.json` (Ticket 112) über die Oberfläche an (Kostenberechnung
   mit KG 300/400, Honorarberechnung) → alle Sollwerte → Neuladen → PDF; `x3-kette.test.ts` ohne Oberfläche gegen dieselben
   Sollwerte. Dreimal grün; sonst Kettentest plus verkürzte E2E.

## Grenzen

- Die Rechnung steht in `honorar`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der App-Logik, `x3.spec.ts` und `x3-kette.test.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

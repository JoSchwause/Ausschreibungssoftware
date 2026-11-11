# 87: A2+M3 in der App: Aufmaßblätter, Soll/Ist, X31

Status: claimed
Type: task
Welle: 5 · Strang: A2, M3 · Ordner: `apps/web/src/abrechnung/` (neu), `apps/web/src/mengen/` (Panel verallgemeinern);
Einhängestellen in `App.tsx`, `auftrag/AuftragsLvSeite.tsx`, `lv/befehlsweg.ts` (markiert `// Ticket 87`, D-20)
Blocked by: 79, 80, 81 (Soll/Ist), 83 (X31-Teil)
Regeln: A5, U2, U3, U5, U7, Q2, Q4, Q5, D-20, D-22, D-35, D-36
Herkunft: `plan.md` §2 A2, M3

## What to build

1. **Aufmaßseite** je Auftrags-LV (`/projekt/<id>/auftrag/<id>/aufmass`): Liste der Aufmaßblätter (Nummer, Bezeichnung,
   Datum, Zahl der Positionen), „Neues Aufmaßblatt“ (nächste Nummer), Blatt öffnen. Ein Blatt zeigt den Baum des Auftrags-LV
   in `ui-grid` (U2: keine zweite Grid-Implementierung) mit Spalten OZ, Kurztext, Einheit, Auftragsmenge, Menge dieses Blatts,
   kumuliert bis hier; die Menge eines Blatts wird über das Mengenansatz-Panel (Formel 91, `mengen`) eingegeben – das Panel
   aus `src/mengen/` verallgemeinern, statt es zu kopieren – oder direkt als Zahl (dann ohne Ansatz). Jeder Schritt ein
   Befehl (`AufmasspositionSetzen` usw.), Undo/Redo wie im LV.
2. **Soll/Ist-Ansicht** (`sollIstBerechnen`, Ticket 81): Grid mit Soll, Ist, Differenz, %, GP Soll/Ist, Befundspalte;
   Befunde > 110 % sichtbar markiert (neutraler Stil, Tastatur erreichbar); Summen je Gliederung und gesamt.
3. **X31:** „X31 einlesen“ (`gaeb` Ticket 83) legt ein neues Aufmaßblatt an (Menge je Position mit `mengen` gerechnet;
   Befunde in einem Dialog, U5); „Als X31 ausgeben“ je Blatt (Datei herunterladen).
4. **E2E** `apps/web/e2e/aufmass.spec.ts`: Auftrags-LV → Blatt 1 mit zwei Ansätzen → Soll/Ist zeigt Ist und einen Befund →
   Undo/Redo → Neuladen; X31 der BVBS-Prüfdatei einlesen (soweit die Positionen zum LV passen, sonst eine eigene X31 aus dem
   Rundweg) und ausgeben.

## Grenzen

- Rechnungen sind Ticket 88. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Logik, E2E `aufmass.spec.ts` grün; `mengen.spec.ts` bleibt grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Die App muss `aufmass`-ChangeSets umkehren: `Teil.changeSet` (`apps/web/src/historie/historie.ts`), `umkehren`
  (`apps/web/src/lv/befehlsweg.ts`) und das Sprungziel in `apps/web/src/historie/HistorieAnbieter.tsx` um `aufmass`
  erweitern (mit `aufmassChangeSetUmkehren` aus `abrechnung`); Einhängestelle markiert `// Ticket 87`.
- D-45: Zeit und Speicher je Undo-Schritt an einem Aufmaßblatt mit 5.000 Zeilen messen und im Ticket nennen (Q4).

## Comments

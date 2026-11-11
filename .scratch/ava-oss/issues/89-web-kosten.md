# 89: C2+C3+C4 in der App: Kostenermittlung, Kostengruppen zuordnen, Kostenkontrolle, EP-Kalkulation

Status: claimed
Type: task
Welle: 5 · Strang: C2, C3, C4 · Ordner: `apps/web/src/kosten/` (neu); Einhängestellen in `App.tsx`,
`projekt/ProjektSeite.tsx`, `lv/LvSeite.tsx` (Spalte/Feld KG, Aktion „Kalkulieren“), `auftrag/AuftragsLvSeite.tsx`,
`lv/befehlsweg.ts` (markiert `// Ticket 89`, D-20)
Blocked by: 71, 79, 82 (und 78 für C4)
Regeln: A5, G-16, N4, U2, U3, U5, U7, Q2, D-20, D-24, D-36, D-37, D-39
Herkunft: `plan.md` §2 C2–C4

## What to build

1. **Kostenermittlungen** des Projekts (`/projekt/<id>/kosten`): Liste (Name, Stufe), anlegen, Einträge (KG-Nummer,
   Betrag, Bemerkung) in `ui-grid` bearbeiten, Bezeichnungen aus einer CSV des Nutzers zur Anzeige (G-16, `bezeichnungenLesen`;
   als Einstellung des Nutzers abgelegt, nicht im Vertrag), Summen je Gruppe und gesamt (`kostenermittlungBerechnen`).
2. **Kostengruppe zuordnen** (C2): im LV-Grid eine Spalte „KG“ (Eingabe dreistellig, Befund statt Sperre, U5) und dasselbe im
   Auftrags-LV (Befehl `KostengruppeSetzen` am Auftrags-LV); Mehrfachauswahl setzt dieselbe KG für mehrere Positionen in
   einem Undo-Schritt.
3. **Kostenkontrolle** (`kostenkontrolleBerechnen`, D-37): Seite mit Zeilen je KG (Baum), „ohne Kostengruppe“, „Nachlass“,
   Gesamt; Spalten Budget (gewählte Kostenermittlung), Vergabe, Abrechnung (Leistungsstand der jeweils letzten Rechnung je
   Auftrags-LV, `abrechnung`), Abweichung.
4. **EP-Kalkulation** (C4, Ticket 78): an einer Position „Kalkulieren“ öffnet einen Dialog mit Ansatzzeilen und
   Zuschlagssätzen je Kostenart; Ergebnis (EP, EPA) wird mit `EinheitspreisanteileSetzen` + `EinheitspreisAendern` als ein
   Undo-Schritt geschrieben (D-36 (5): Ansätze werden nicht gespeichert; der Dialog sagt das).
5. **E2E** `apps/web/e2e/kosten.spec.ts`: Kostenberechnung anlegen → KG an LV-Positionen → Zuschlag → Kostenkontrolle zeigt
   Budget und Vergabe → (mit Rechnung aus Ticket 88, falls gemergt, sonst im M4-Ticket) Abrechnung; EP kalkulieren.

## Grenzen

- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Logik, E2E `kosten.spec.ts` grün; LV-Grid-Leistungsbudgets bleiben grün (`leistung.spec.ts`)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Die App muss `kostenermittlung`-ChangeSets umkehren (wie 87; `kostenermittlungChangeSetUmkehren` aus `kosten`);
  Einhängestellen markiert `// Ticket 89`.
- Eine formwidrige KG-Nummer ist ein Zellfehler wie eine unlesbare Menge (die Marke lässt sie nicht in den Befehl); der
  Befund nach U5 betrifft eine KG außerhalb der Budget-Gliederung (Ticket 82 Punkt 3).
- Bis Ticket 84 gemergt ist, verliert der GAEB-Export gesetzte Kostengruppen; 84 ist Pflicht vor Wellenende (sonst warnt
  der Writer).

## Comments

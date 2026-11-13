# 155: App: Vorschau-Module anbinden (E16, Tickets 123/124 Rest)

Status: ready-for-agent
Type: task
Welle: 7 · Strang: X1–X4, E16 · Paket/Ordner: `apps/web/src/bauzeit/`, `bauleitung/`, `honorar/`, `bim/`, `modellvergleich/`, `packages/bim` (Hinweis Doppelmessung)
Blocked by: 131, 140
Modell: opus
Priorität: S (Teile K) (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U3, Q5, A2; D-109.7, D-118.3, D-118.7, D-122.x
Herkunft: umfang §3 E16, B-31 bis B-33; Ticket 124 Punkte 1, 2, 4, 5; Ticket 123 Punkt 4 (Honorar-PDF im Worker) und 8 (App-Teile)

## What to build

Reihenfolge = Priorität (bei Zeitnot von hinten kürzen und im Ticket vermerken):
1. **Auswahl statt Handeingabe:** Mangel → Position (Auswahl aus dem Auftrags-LV) und Bauteil (Auswahl aus dem Modell);
   Verweis Honorar ↔ Kostenermittlung (beide Richtungen); „Aufmaß aus Modell“ öffnet das Modell mit dem Auftrags-LV vorgewählt.
2. **124 §5, §1, §2:** Bezug auf einzelne LV-Knoten im Vorgangsdialog; Vorgang verschieben (Ebene, Tastatur, ein Undo);
   Fortschritt aus dem Leistungsstand vorschlagen.
3. **S:** Hinweis, wenn ein Bauteil schon auf einem anderen Aufmaßblatt gemessen ist (Funktion in `packages/bim`).
4. **123 Rest:** Honorar-PDF im Worker; `modellvergleich/folgen.ts` und `bim/uebernahme.ts` zusammenlegen;
   `ModellvergleichSeite.tsx:397` → `bim/darstellung.ts`; `bim/einlesen.ts` → `datumAusUhr`; `MengenAusModell.tsx:145` →
   `datumDe`; Text aus `BauzeitenplanSeite.tsx:396` nach `texte.ts`; `useBezug` umbenennen.
7. **Aus 140 (D-140.3, D-140.7):** `ui-modell` nimmt `IfcGlobalId` statt `string` (neue Abhängigkeit `ui-modell → vertrag`, Lockfile) zusammen mit den Aufrufern in `apps/web/src/bim/`, `modellvergleich/`; die App importiert `MENGENART_STUECK` aus `@tethys/vertrag`, danach entfällt die Durchreichung in `bim/index.ts`. Die betroffenen Dateien nennt D-140.7 in `140-fachpakete-aufraeumen.md`.
5. **124 §4:** Preisspiegel-Budget (`vergabe`) auf ruhiger Maschine messen, Wert ins Ticket (nichts lockern).
6. **K:** „Mangel aus Bauteil“ in der Modellansicht; Befund „KG im Modell weicht ab“.

## Acceptance criteria

- [ ] E2E/Unit für die erledigten Punkte; Tore X1–X4 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

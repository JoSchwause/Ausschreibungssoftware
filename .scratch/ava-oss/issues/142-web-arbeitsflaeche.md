# 142: App: Arbeitsfläche und Werkzeugleiste

Status: ready-for-agent
Type: task
Welle: 7 · Strang: U, E3 · Paket/Ordner: `apps/web/src/lv/`, `auftrag/`, `vergabe/` (Layout), `packages/ui-basis` (Werkzeugleiste, Menü)
Blocked by: 130, 131
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U1, U3, U4, U6, Q4
Herkunft: umfang §3 E3, B-05, B-06, B-08

## What to build

1. **Werkzeugleiste** als Baustein in `ui-basis`: Gruppen mit Radix-Menüs (Dropdown), Tastatur erreichbar; bei 1280 px eine
   Zeile. Dasselbe Muster auf LV-, Auftrags-LV- und Preisspiegelseite (und überall, wo heute Schaltflächenreihen stehen, sobald
   die jeweiligen Ordner-Tickets es übernehmen).
2. **LV-Seite:** 22 Schaltflächen in Gruppen (z. B. Bearbeiten, Einfügen, Struktur, Prüfen, Ausgabe, Austausch); Grid füllt die
   restliche Höhe; Prüf-Panel einklappbar, ohne Befunde zu; Summenfuß sichtbar und nicht von Meldungen überdeckt.
3. **Auftrags-LV:** Gesamtpreis sichtbar bei 1440 und 1280 px; Verweise einheitlich (Schaltfläche oder Menü).
4. **Preisspiegel:** Summenblock einklappbar, Bieterübersicht ohne Überlauf, Meldung überdeckt nichts.
5. **Ziel als Test (E2E):** bei 1280×800 zeigt die LV-Seite mit `typisch` (oder der BVBS-X83) mindestens 15 Zeilen und die
   Spalten EP und GP ohne waagerechtes Rollen; Auftrags-LV und Preisspiegel ohne waagerechten Überlauf.
6. Specs nachziehen, die Schaltflächen der alten Leiste suchen (Rolle `menuitem` statt `button` usw.).

## Acceptance criteria

- [ ] E2E aus Punkt 5; alle Web-E2E grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

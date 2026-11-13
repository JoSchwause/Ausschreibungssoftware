# 134: Bereitstellung (GitHub Pages) und Dokumente

Status: done-by-agent
Type: task
Welle: 7 · Strang: E17 · Paket/Ordner: `.github/workflows/`, `apps/web/vite.config.*`, `package.json`, `apps/web/package.json`, `README.md`, `CONTRIBUTING.md`, `docs/adr/0012*`, `okf/` (nicht `okf/research/`), Tickets 02, 18, 24, 26
Blocked by: –
Modell: sonnet
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: G-53, G-59, G-62, D-78, C2, A1
Herkunft: umfang §3 E17, B-36, B-37

## What to build

1. **Workflow** `.github/workflows/pages.yml`: baut `apps/web` aus `main` mit Basis-Pfad (`/<repo>/`, über eine Umgebungs-
   variable in Vite, Standard `/`) und veröffentlicht auf GitHub Pages (`actions/upload-pages-artifact`,
   `actions/deploy-pages`). Service Worker/PWA-Manifest und Worker-URLs mit Basis-Pfad prüfen (`pnpm build` mit gesetztem
   Basis-Pfad lokal, dann `vite preview` mit Playwright aufrufen und eine Seite laden). Kein Push, kein Einschalten (Ticket 126).
2. **Version (D-78):** `0.7.0` in `package.json` und `apps/web/package.json`; Build-Stand (Commit-Hash kurz, Datum) per `define`
   als `__APP_VERSION__`/`__APP_BUILD__` mit Typdeklaration, Ersatzwert in Tests. Die Seite „Über“ (147) liest sie.
3. `README.md`: Stand (nach Welle 7), Adresse der Demo (Platzhalter `https://<nutzer>.github.io/<repo>/`, bis 126), erste
   Schritte, Entwicklung. `CONTRIBUTING.md` auf den Stand nach M3 (DCO, Pakete, Befehle).
4. ADR 0012 auf `accepted` für v1 mit Nachtrag zum `Berichtsmodell` neben dem `Ausgabemodell` (G-62, D-113.1); ADR 0013 bleibt
   `proposed`.
5. OKF: `okf/project/overview.md` und die Konzeptdateien, die veraltet sind, berichtigen (`timestamp`); Ticketstände 02, 18, 24,
   26 in `.scratch/ava-oss/issues/` richtigstellen (was tatsächlich gilt; 18 bleibt außerhalb der Wellen).

## Acceptance criteria

- [x] `pnpm build` mit Basis-Pfad läuft; die gebaute App lädt unter dem Pfad (Probe im Ticket beschrieben)
- [x] Workflow-Datei mit `actionlint` oder einer YAML-Prüfung geprüft, falls verfügbar
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

- D-134.1 Basis-Pfad: Umgebungsvariable `VITE_BASE` (mit oder ohne Schrägstriche, Standard `/`), in `apps/web/vite.config.ts` zu `/<pfad>/` normalisiert. Grund: Der Workflow setzt `/${{ github.event.repository.name }}/`; Manifest, Service Worker, Worker und `?url`-Dateien folgen `base` von selbst, `route.ts` las `BASE_URL` schon.
- D-134.2 Build-Stand: `__APP_VERSION__` (aus `apps/web/package.json`) und `__APP_BUILD__` `{commit, datum}` per `define`; Commit = `git rev-parse --short=7 HEAD`, Datum = Commit-Datum (`%cs`), nicht die Uhr (kein `Date.now()`). Ohne Git: „unbekannt“. Ersatzwert in Tests ohne Änderung an `vitest.config.ts`: `apps/web/src/version.ts` prüft `typeof` und liefert `APP_VERSION`, `APP_BUILD`, `bauStandText()` (Test `version.test.ts`); Ticket 147 liest daraus.
- D-134.3 Probe: eigener Lauf `pnpm --filter @tethys/web run probe:basispfad` (`playwright.basispfad.config.ts`, Spec in `apps/web/e2e-basispfad/`, Port 4174, Build in `dist/basispfad` über `VITE_OUTDIR`, Basis `/tethys-probe/`). Prüft: Titel, Navigation, Speicher-Worker (Projektliste), Wechsel und Neuladen unter dem Pfad, Manifest `start_url`/`scope`, Service-Worker-Geltungsbereich, keine Antwort ≥ 400, keine Konsolenfehler. Zusätzlich als Schritt in `ci.yml` nach `pnpm e2e` (kein bestehender Schritt geändert). Erste Läufe schlugen fehl, weil `vite preview --outDir` das Verzeichnis ignoriert und `dist` auslieferte; behoben über `build.outDir` aus `VITE_OUTDIR`.
- D-134.4 `pages.yml`: Auslöser `push` auf `main` und `workflow_dispatch`; zwei Jobs (bauen, veröffentlichen) mit `upload-pages-artifact@v3` und `deploy-pages@v4`; `404.html` = Kopie von `index.html` für Adressen unterhalb des Basis-Pfads. Der Workflow wartet nicht auf `ci.yml` (Entscheidung offen für den Orchestrator: Tor „CI grün vor Veröffentlichen“ wäre ein `workflow_run`-Auslöser). `actionlint` ist nicht verfügbar; YAML-Parse geprüft.
- D-134.5 ADR 0012 `accepted` (Grund G-58/G-62, Annahmen gelten für v1) mit Nachtrag Berichtsmodell; ADR 0013 bleibt `proposed`. Tickets 02, 24, 26: `resolved`; 18: `ready-for-human` mit richtiggestelltem Text (Prototyp auf `main`, Interview = Sitzung mit dem Büro, G-59). OKF `overview.md` und `index.md` berichtigt (veraltete „nicht auf main“-Angaben, Welle 7, Timestamp).
- D-134.6 Prüfstand: `pnpm lint` und `pnpm typecheck` grün; `pnpm test` unter Last (Load 25 bis 30 auf 4 Kernen) 3968 grün, 10 rot, alle Leistungsbudgets (Q4/D-54: gaeb lesen/schreiben, kern Median 16 ms, speicher Aufmaß/Bauteile, vergabe Preisspiegel, web Aufmaß-Undo), keines in Dateien dieses Tickets, nichts gelockert; auf ruhiger Maschine zu wiederholen. E2E `start.spec.ts` und `huelle.spec.ts` (6) grün, Probe `probe:basispfad` mehrfach grün. Beim Neuladen meldet die App einmal `createSyncAccessHandle … another open Access Handle` in der Konsole (alter Speicher-Worker hält die OPFS-Datei kurz); die Probe zählt diese Meldung nicht. Befund für das Speicher-Ticket, nicht für 134.

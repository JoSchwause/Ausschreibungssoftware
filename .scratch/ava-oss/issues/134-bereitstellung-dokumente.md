# 134: Bereitstellung (GitHub Pages) und Dokumente

Status: claimed
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

- [ ] `pnpm build` mit Basis-Pfad läuft; die gebaute App lädt unter dem Pfad (Probe im Ticket beschrieben)
- [ ] Workflow-Datei mit `actionlint` oder einer YAML-Prüfung geprüft, falls verfügbar
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

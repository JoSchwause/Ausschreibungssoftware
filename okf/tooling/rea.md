---
type: Tooling
title: REA (Reverse Engineer Anything) – Setup & Nutzung
description: Node (nvm), Google Chrome, REA-MCP-Server und CLI-Workflows von rea-agents@6.8.0 für die NOVA-AVA-Recherche und Browser-/Bundle-Analyse.
resource: https://github.com/morluto/rea
tags: [rea, reverse-engineering, cdp, mcp, node, nvm, chrome, nova-ava]
timestamp: 2026-11-09T20:57:00Z
---
Teil A (Setup) und Teil B (Captures) des Plans [`.scratch/nova-ava-research/spec.md`](/.scratch/nova-ava-research/spec.md).

## Verifizierter Stand (2026-11-09)
- **Node.js**: `v24.22.2` via `nvm` (nvm **v0.41.0** in `~/.nvm`, installiert per Git-Checkout des Tags v0.41.0 bzw. `install.sh` von `raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/`). npm **11.19.1**, nvm-Alias `default -> 24`. Binärpfad: `~/.nvm/versions/node/v24.22.2/bin` (`node`, `npm`, `npx`). Erfüllt REA-Anforderung `>= 24.22.1` (Engines `^22.23.4 || ^24.22.1 || >=26.12.1`).
- `~/.bashrc` hat am Ende den nvm-Block bekommen (`NVM_DIR`, `nvm.sh`, `bash_completion`). Den lädt nur eine **interaktive** Shell.
- **REA-Paket**: `rea-agents@6.8.0` (Bin `rea` / `rea-agents`), nicht global installiert, sondern über den npx-Cache ausgeführt: `/home/jsk/.npm/_npx/da7caeae9db9c589/node_modules/.bin/rea` (175 CLI-Befehle, 229 MCP-Tools, Skill-Version 49).
- **MCP-Registrierung** (`claude_code`): `~/.claude.json` → `mcpServers.rea` (User-Scope, gilt in allen Projekten):
  ```json
  "rea": {
    "command": "npx",
    "args": ["-y", "rea-agents@6.8.0", "mcp"],
    "env": { "PATH": "/home/jsk/.nvm/versions/node/v24.22.2/bin:/home/jsk/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin" }
  }
  ```
  - Den `env.PATH`-Pin haben wir nachträglich ergänzt. Grund: Die Claude-Desktop-App startet Claude Code mit einer PATH **ohne** nvm. Ohne Pin: `spawn npx` → `ENOENT`, mit Pin funktioniert es (geprüft mit Node `spawnSync`).
  - Laut REA bleibt `env` erhalten, wenn `rea setup` erneut läuft.
  - **Nach einem Node-Update (z. B. `nvm install 24` → neue Patch-Version) muss der Pfad im Pin angepasst werden.**
  - Backup der Datei vor dem Setup: `~/.claude.json.rea.backup`.
- `antigravity`: kann entweder direkt über das CLI-Binary genutzt oder per `rea setup --client antigravity --yes` in `/home/jsk/.gemini/config/mcp_config.json` eingetragen werden.
- Skill: `~/.claude/skills/reverse-engineer-anything/` (Skill-Version 49, persönlicher Skill-Ordner, gilt in allen Projekten).
- Prüfungen:
  - `rea doctor --client claude_code --skill` → `healthy: true`, Registrierung `aligned`, Skill `aligned`.
  - MCP-Handshake mit der Registrierung (App-PATH + Pin): Server `rea 6.8.0`, 229 Tools, darunter `observe_web_session`, `inspect_web_page`, `export_web_scripts`, `analyze_web_bundle` und `list_browser_targets`.
- Nicht konfiguriert, für Web-Recherche nicht nötig: die Analyse-Provider Ghidra, IDA, JADX und Kuna. Der Doctor meldet sie als `missing_analysis_engine`.
- **Die Tools laden erst nach einem Neustart von Claude Code** bzw. in einer neuen Session.

### Google Chrome
- `google-chrome-stable` **157.0.8103.38-1** (amd64), installiert am 2026-11-09 vom Nutzer. Die Paketdatei kommt direkt von Google (`dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb`), Installation per `sudo apt install`.
- `google-chrome` → `/usr/bin/google-chrome-stable` → `/opt/google/chrome/google-chrome`.
- Das Paket hat das Google-apt-Repo selbst eingerichtet:
  - `/etc/apt/sources.list.d/google-chrome.sources` (deb822, `https://dl.google.com/linux/chrome-stable/deb/ stable main`, amd64)
  - Schlüssel: `Signed-By: /usr/share/keyrings/google-chrome.gpg`
  - Seitdem lief noch kein `apt update`; Updates kommen ab dem nächsten `apt update`.
- Chrome hat die Alternativen `x-www-browser`, `gnome-www-browser` und `google-chrome` übernommen (auto). Der GNOME-Standardbrowser bleibt Firefox (`xdg-settings`).

### Debug-Browser für CDP
- Chrome verweigert Remote-Debugging auf dem Standardprofil, deshalb eigenes Profil `~/.config/nova-ava-chrome`:
  ```bash
  google-chrome --user-data-dir=$HOME/.config/nova-ava-chrome --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --no-first-run
  ```
- Der Port lauscht nur auf `127.0.0.1`. Prüfen mit `ss -ltnp | grep 9222`.
- Login bei NOVA AVA macht der Nutzer selbst im Debug-Fenster.

## Wichtige REA-Workflows für Web-Anwendungen (CDP `http://127.0.0.1:9222`)

Alle Befehle mit gesetztem Node-24-`PATH` direkt über das CLI ausführen:

```bash
export PATH="/home/jsk/.nvm/versions/node/v24.22.2/bin:$PATH"
REA="/home/jsk/.npm/_npx/da7caeae9db9c589/node_modules/.bin/rea"
```

1. **Offene Browser-Tabs auflisten (`list-browser-targets`)**:
   ```bash
   $REA list-browser-targets http://127.0.0.1:9222 --format json
   ```
   Liefert die `targetId` des relevanten Tabs.

2. **Aktuellen Screen passiv inspizieren (`inspect-web-page`)**:
   ```bash
   $REA inspect-web-page http://127.0.0.1:9222 <targetId> \
     --observation-ms 2000 \
     --include-accessibility-text \
     --include-json-body-shapes \
     --include-websocket-shapes \
     --include-storage-keys \
     --format json
   ```
   Erfasst DOM/Accessibility-Baum, Storage-Keys (ohne geheime Werte) sowie JSON-/WebSocket-Strukturen (value-free Shapes).

3. **Benutzer-Klickpfad passiv mitschneiden (`observe-web-session`)**:
   ```bash
   $REA observe-web-session http://127.0.0.1:9222 <targetId> \
     --observation-ms 25000 \
     --format json > docs/research/nova-ava/captures/<area>-session.json
   ```
   Schneidet während des Zeitfensters Navigationen, API-Requests und **Request-Initiator-Stacks** passiv mit.

4. **Automatisierte Browser-Szenarien ausführen (`capture-browser-scenario`)**:
   - Verbindet sich per Playwright über CDP (`connect`-Modus) oder startet einen eigenen Browser (`launch`-Modus) und führt deklarierte Klick-/Eingabe-Schritte deterministisch aus.
   - Hinweis: Im `connect`-Modus navigiert REA zuerst zu `start_url` (ungespeicherter Formularzustand geht verloren); Szenario-Netzwerkrecords enthalten keine Initiator-Stacks (dafür `observe-web-session` nutzen).

5. **Web-Skripte exportieren & statisch analysieren (`export-web-scripts` / `analyze-web-bundle`)**:
   ```bash
   $REA analyze-web-bundle http://127.0.0.1:9222 <targetId> \
     --detail summary \
     --evidence_output docs/research/nova-ava/captures/bundle-evidence.json \
     --format json
   ```
   Extrahiert Routen, API-Endpunkt-Kandidaten und Modulgraphen aus den geladenen JS-Bundles. Detailabfragen erfolgen anschließend speicherschonend über `inspect-analysis-view`.

6. **HAR-/Netzwerk-Captures offline auswerten (`inspect-web-network-capture`)**:
   Falls ein HAR-Export aus den Chrome DevTools vorliegt, kann er komplett offline mit `$REA inspect-web-network-capture` analysiert werden.

## Datenschutz- & Sicherheitsgrenzen von REA
- Passive Browser-Captures speichern **keine** Credential-Header, **keine** Storage-Werte und **keine** rohen JSON-/WebSocket-Nutzdaten, sondern strukturelle Shapes und Metadaten.
- Alle Ergebnisse liefern kryptografische Digests und `evidence_id`s zur sauberen Quellenangabe im Recherchebericht.

## Rückbau
- REA: `npx rea-agents@6.8.0 uninstall` (entfernt REA-eigene Agent-Konfiguration und Skill), oder `~/.claude.json.rea.backup` zurückspielen.
- nvm/Node: `rm -rf ~/.nvm` und den nvm-Block am Ende von `~/.bashrc` entfernen.
- Chrome-Profil: `~/.config/nova-ava-chrome` löschen.

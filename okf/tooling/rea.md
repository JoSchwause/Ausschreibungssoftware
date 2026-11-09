---
type: Tooling
title: REA (Reverse Engineer Anything) – Setup & Nutzung
description: Lokale Installation, MCP-Status und CLI-Befehle von rea-agents@6.8.0 für die Browser- und Bundle-Analyse.
resource: https://github.com/morluto/rea
tags: [rea, reverse-engineering, cdp, tooling]
timestamp: 2026-11-09T17:22:00Z
---
## Verifizierter Stand
- **Node.js**: `v24.22.2` via `nvm` unter `/home/jsk/.nvm/versions/node/v24.22.2/bin/node` (erfüllt REA-Anforderung `>= 24.22.1`).
- **REA-Paket**: `rea-agents@6.8.0` installiert im npx-Cache unter `/home/jsk/.npm/_npx/da7caeae9db9c589/node_modules/.bin/rea` (175 CLI-Befehle, 229 MCP-Tools, Skill-Version 49).
- **MCP-Registrierungen**:
  - `claude_code`: registriert in `/home/jsk/.claude.json` (`npx -y rea-agents@6.8.0 mcp`), Skill installiert unter `/home/jsk/.claude/skills/reverse-engineer-anything/`.
  - `antigravity`: kann entweder direkt ohne Neustart über das CLI-Binary genutzt werden oder per `rea setup --client antigravity --yes` in `/home/jsk/.gemini/config/mcp_config.json` eingetragen werden.
- **Browser-Status (Offen)**: Aktuell ist auf dem Host nur `/usr/bin/firefox` installiert; für CDP (`--remote-debugging-port=9222`) wird ein Chromium-basierter Browser (`google-chrome-stable` oder Playwright-Chromium) benötigt.

## Wichtige REA-Workflows für Web-Anwendungen (CDP `http://127.0.0.1:9222`)

Alle Befehle können mit gesetztem Node-24-`PATH` direkt über das CLI ausgeführt werden:

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
   Schneidet während des Zeitfensters alle Navigationen, API-Requests und **Request-Initiator-Stacks** passiv mit.

4. **Automatisierte Browser-Szenarien ausführen (`capture-browser-scenario`)**:
   - Verbindet sich per Playwright über CDP (`connect`-Modus) oder startet einen eigenen Browser (`launch`-Modus) und führt deklarierte Klick-/Eingabe-Schritte deterministisch aus.
   - Hinweis: Im `connect`-Modus navigiert REA zuerst zu `start_url` (ungespeicherter Formularzustand geht verloren); außerdem enthalten Szenario-Netzwerkrecords keine Initiator-Stacks (dafür `observe-web-session` nutzen).

5. **Web-Skripte exportieren & statisch analysieren (`export-web-scripts` / `analyze-web-bundle`)**:
   ```bash
   $REA analyze-web-bundle http://127.0.0.1:9222 <targetId> \
     --detail summary \
     --evidence_output docs/research/nova-ava/captures/bundle-evidence.json \
     --format json
   ```
   Extrahiert Routen, API-Endpunkt-Kandidaten und Modulgraphen aus den geladenen JS-Bundles. Detailabfragen erfolgen anschließend speicherschonend über `inspect-analysis-view`.

6. **HAR-/Netzwerk-Captures offline auswerten (`inspect-web-network-capture`)**:
   Falls ein HAR-Export aus den Chrome DevTools vorliegt, kann dieser komplett offline mit `$REA inspect-web-network-capture` analysiert werden.

## Datenschutz- & Sicherheitsgrenzen von REA
- Passive Browser-Captures speichern **keine** Credential-Header, **keine** Storage-Werte und **keine** rohen JSON-/WebSocket-Nutzdaten, sondern strukturelle Shapes und Metadaten.
- Alle Ergebnisse liefern kryptografische Digests und `evidence_id`s zur sauberen Quellenangabe im Recherchebericht.

---
type: Tooling
title: REA + Node (nvm) für die NOVA-AVA-Recherche
description: Installationsstand von nvm, Node 24, dem REA-MCP-Server für Claude Code und Google Chrome, plus geplanter Chrome-Debug-Start.
resource: https://github.com/morluto/rea
tags: [rea, mcp, node, nvm, chrome, nova-ava]
timestamp: 2026-11-09T16:26:00Z
---
Teil A (Setup) des Plans [`.scratch/nova-ava-research/spec.md`](/.scratch/nova-ava-research/spec.md).

## Verifizierter Stand (2026-11-09)

### nvm + Node
- nvm **v0.41.0** in `~/.nvm` (Git-Checkout des Tags v0.41.0, installiert über `install.sh` aus `raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/`).
- `~/.bashrc` hat am Ende den nvm-Block bekommen (`NVM_DIR`, `nvm.sh`, `bash_completion`). Den lädt nur eine **interaktive** Shell.
- Node **v24.22.2** (LTS „Krypton“), npm **11.19.1**, nvm-Alias `default -> 24`.
- Binärpfad: `~/.nvm/versions/node/v24.22.2/bin` (`node`, `npm`, `npx`).

### REA
- Paket `rea-agents` **6.8.0** von npm (Bin `rea` / `rea-agents`). Engines: `^22.23.4 || ^24.22.1 || >=26.12.1`, also erfüllt.
- Nicht global installiert, sondern über `npx` aus dem npx-Cache (`~/.npm/_npx/`) ausgeführt.
- Setup: `npx rea-agents@latest setup --client claude_code --yes`, ausgeführt in `~` (nicht im Repo), zuerst mit `--dry-run` geprüft.
- **MCP-Registrierung:** `~/.claude.json` → `mcpServers.rea` (User-Scope, gilt in allen Projekten):
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
- Skill: `~/.claude/skills/reverse-engineer-anything/` (Skill-Version 49, persönlicher Skill-Ordner, gilt in allen Projekten).
- Prüfungen:
  - `rea doctor --client claude_code --skill` → `healthy: true`, Registrierung `aligned`, Skill `aligned`.
  - MCP-Handshake mit der Registrierung (App-PATH + Pin): Server `rea 6.8.0`, 229 Tools, darunter `observe_web_session`, `inspect_web_page`, `export_web_scripts`, `analyze_web_bundle` und `list_browser_targets`.
- Nicht konfiguriert, für Web-Recherche nicht nötig: die Analyse-Provider Ghidra, IDA, JADX und Kuna. Der Doctor meldet sie als `missing_analysis_engine`.
- **Die Tools laden erst nach einem Neustart von Claude Code** bzw. in einer neuen Session.

### Google Chrome
- `google-chrome-stable` **157.0.8103.38-1** (amd64), installiert am 2026-11-09 vom Nutzer. Die Paketdatei wurde direkt von Google geladen (`dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb`) und mit `sudo apt install` installiert.
- `google-chrome` → `/usr/bin/google-chrome-stable` → `/opt/google/chrome/google-chrome`.
- Das Paket hat das Google-apt-Repo selbst eingerichtet:
  - `/etc/apt/sources.list.d/google-chrome.sources` (deb822, `https://dl.google.com/linux/chrome-stable/deb/ stable main`, amd64)
  - Schlüssel: `Signed-By: /usr/share/keyrings/google-chrome.gpg`
  - Seitdem lief noch kein `apt update`. `apt-cache policy` kennt deshalb nur die installierte Version, Updates kommen ab dem nächsten `apt update`.
- Chrome hat die Alternativen `x-www-browser`, `gnome-www-browser` und `google-chrome` übernommen (auto). Der GNOME-Standardbrowser bleibt Firefox (`xdg-settings`).
- Der Debug-Port ist noch **nicht** gestartet und das Profil `~/.config/nova-ava-chrome` noch nicht angelegt (siehe unten).

## Geplant (noch nicht verifiziert)
- Debug-Browser für Teil B, mit eigenem Profil. Chrome verweigert Remote-Debugging auf dem Standardprofil.
  ```bash
  google-chrome --user-data-dir=$HOME/.config/nova-ava-chrome --remote-debugging-port=9222 --no-first-run
  ```
  - Der Port soll nur auf `127.0.0.1` lauschen. Prüfen mit `ss -ltnp | grep 9222`.
  - Profilordner `~/.config/nova-ava-chrome` (existiert noch nicht).
- Claude-in-Chrome-Extension in diesem Profil installieren und verbinden. Login bei NOVA AVA macht der Nutzer selbst.

## Rückbau
- REA: `npx rea-agents@6.8.0 uninstall` (entfernt REA-eigene Agent-Konfiguration und Skill), oder `~/.claude.json.rea.backup` zurückspielen.
- nvm/Node: `rm -rf ~/.nvm` und den nvm-Block am Ende von `~/.bashrc` entfernen.

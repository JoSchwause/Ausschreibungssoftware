---
type: Project
title: Projekt-Überblick
description: Grunddaten zum Projekt Ausschreibungssoftware (Ort, Status, offene Punkte).
resource: /home/jsk/Documents/Privates/Ausschreibungssoftware
tags: [ausschreibungssoftware, status]
timestamp: 2026-11-09T18:28:00Z
---
## Verifizierter Stand
- Projektordner: `/home/jsk/Documents/Privates/Ausschreibungssoftware` (sowie Worktree `reverse_engineer_nova_ava`).
- Git-Repo (Branch `main`) mit Remote `origin` = https://github.com/JoSchwause/Ausschreibungssoftware (öffentlich, angelegt 2026-11-09).
- Allgemeine AVA-Domänenbegriffe in [`GLOSSARY.md`](/GLOSSARY.md) angelegt.
- Reverse-Engineering-Tooling installiert und verifiziert: Node `v24.22.2` (via `nvm`), Google Chrome (`.deb`) mit dediziertem CDP-Profil (`127.0.0.1:9222`) und `rea-agents@6.8.0` (siehe [`okf/tooling/rea.md`](/okf/tooling/rea.md)).
- **NOVA-AVA-Recherche mit REA abgeschlossen** (siehe [`okf/research/nova-ava.md`](/okf/research/nova-ava.md) und [`.scratch/nova-ava-research/spec.md`](/.scratch/nova-ava-research/spec.md)):
  - Teil A (Setup, `.gitignore`, `GLOSSARY.md`, OKF-Dokumentation) und Teil B (automatisierte CDP-Steuerung, 28 REA-Evidenzen, Bereichskarten für LV, BIM, GAEB, Vergabe/Preisspiegel, Kosten/Aufmaß/Abrechnung sowie LV-Deep-Dive unter `docs/research/nova-ava/`) sind vollständig durchgeführt.

## Entschieden (2026-11-09)
- Lokale PWA ohne Server, React/TS, SQLite-WASM/OPFS, AGPL-3.0: siehe `docs/adr/0001`–`0007`.
- Arbeitsplan: `.scratch/ava-mvp/map.md`, Tickets P0–P2: `.scratch/ava-mvp/issues/01`–`17`.

## Offen
- Lizenzfrage DIN-276-Texte / GAEB-XSDs (Ticket 01)

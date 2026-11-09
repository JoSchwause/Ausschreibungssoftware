---
type: Project
title: Projekt-Überblick
description: Grunddaten zum Projekt Ausschreibungssoftware (Ort, Status, offene Punkte).
resource: /home/jsk/Documents/Privates/Ausschreibungssoftware
tags: [ausschreibungssoftware, status]
timestamp: 2026-11-09T19:23:00Z
---
## Kontext (vom Nutzer, 2026-11-09)
- Ziel: eine Open-Source-AVA-Software (Ausschreibung, Vergabe, Abrechnung) für einen befreundeten Architekten in Deutschland.
- Er nutzt heute NOVA AVA (nova-ava.de) und ist damit unzufrieden. Bekannter Schmerzpunkt: Preis und Lizenz; weitere Schmerzpunkte sind noch unbekannt.
- Er schreibt für öffentliche und private Bauherren aus, also sind Vergaberecht und E-Vergabe relevant.

## Verifizierter Stand
- Projektordner: `/home/jsk/Documents/Privates/Ausschreibungssoftware`
- Enthält bisher kein Code, nur `okf/` (diese Wissensbasis), Agent-Konfiguration (`AGENTS.md`, `.claude/skills/`, `docs/agents/`) und `.gitignore`.
- `.gitignore` schließt `docs/research/nova-ava/` aus (geprüft mit `git check-ignore -v`). Dort liegt das lokale Bericht-Gerüst: `README.md`, `map-{bim,lv,gaeb,vergabe,kosten}.md`, `lv-deep-dive.md`, `captures/`, bisher nur Überschriften.
- Git-Repo (Branch `main`) mit Remote `origin` = https://github.com/JoSchwause/Ausschreibungssoftware (öffentlich, angelegt 2026-11-09). Erster Commit `12d806e` auf `main` gepusht (2026-11-09). Kein Code.
- Web-Recherche zu AVA-Software abgeschlossen (2026-11-09, nur öffentliche Quellen): 23 Notizen, [Synthese](/okf/research/synthesis.md) und [Glossar](/okf/research/glossary.md) unter `okf/research/`, Einstieg über den [Recherche-Index](/okf/research/index.md).

## Geplant (noch nicht umgesetzt)
- **NOVA-AVA-Recherche mit REA** (Scoping-Interview 2026-11-09): NOVA AVA (Web-Testzugang, Demo-Daten) mit dem Reverse-Engineering-Tool REA (github.com/morluto/rea) untersuchen, um das eigene AVA-Design daraus abzuleiten. Plan: [`.scratch/nova-ava-research/spec.md`](/.scratch/nova-ava-research/spec.md) (vom Nutzer freigegeben 2026-11-09). Bericht wird git-ignoriert (`docs/research/nova-ava/`), da das Repo öffentlich ist.
- Teil A (Setup), Stand 2026-11-09:
  - Erledigt: Node v24.22.2 via nvm, REA 6.8.0 als MCP-Server `rea` in `~/.claude.json`, Google Chrome 157.0.8103.38. Details: [REA + Node](/okf/tooling/rea.md).
  - Offen: ein Neustart von Claude Code, damit die REA-Tools laden.
- Teil B (Captures/Analyse) ist noch nicht begonnen.

## Offen (nicht entschieden)
- Tech-Stack der eigenen Software
- Zielgruppe/Funktionsumfang der eigenen Software (soll aus der NOVA-Recherche abgeleitet werden)
- Erster Schnitt: drei Varianten A/B/C als Vorschlag in der [Synthese](/okf/research/synthesis.md), Abschnitt 7; nicht entschieden.
- Interview mit dem Architekten-Freund steht aus (Leitfaden: Synthese, Abschnitt 8); danach Scoping-Interview und Plan.

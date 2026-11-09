---
type: Project
title: Projekt-Überblick
description: Grunddaten zum Projekt Ausschreibungssoftware (Ort, Status, offene Punkte).
resource: /home/jsk/Documents/Privates/Ausschreibungssoftware
tags: [ausschreibungssoftware, status]
timestamp: 2026-11-09T23:00:00Z
---
## Kontext (vom Nutzer, 2026-11-09)
- Ziel: eine Open-Source-AVA-Software (Ausschreibung, Vergabe, Abrechnung) für einen befreundeten Architekten in Deutschland.
- Er nutzt heute NOVA AVA (nova-ava.de) und ist damit unzufrieden. Bekannter Schmerzpunkt: Preis und Lizenz; weitere Schmerzpunkte sind noch unbekannt.
- Er schreibt für öffentliche und private Bauherren aus, also sind Vergaberecht und E-Vergabe relevant.

## Verifizierter Stand
- Projektordner: `/home/jsk/Documents/Privates/Ausschreibungssoftware`. Zusätzlich existiert der Git-Worktree `reverse_engineer_nova_ava` (Branch `reverse_engineer_nova_ava`), dessen Arbeit am 2026-11-09 in `main` zusammengeführt wurde.
- Git-Repo (Branch `main`) mit Remote `origin` = https://github.com/JoSchwause/Ausschreibungssoftware (öffentlich, angelegt 2026-11-09).
- Enthält bisher kein Code, sondern `okf/` (Wissensbasis), Agent-Konfiguration (`AGENTS.md`, `.claude/skills/`, `docs/agents/`), Architektur-Entscheidungen (`docs/adr/`), Domänen-Glossar (`GLOSSARY.md`), lokale Issues/Plan (`.scratch/`) und `.gitignore`.
- `.gitignore` schließt `docs/research/nova-ava/` aus (Rohdaten und Bericht der NOVA-AVA-Recherche, nie committen, da das Repo öffentlich ist).
- Web-Recherche zu AVA-Software abgeschlossen (nur öffentliche Quellen): 23 Notizen, [Synthese](/okf/research/synthesis.md) und [Glossar](/okf/research/glossary.md) unter `okf/research/`, Einstieg über den [Recherche-Index](/okf/research/index.md).
- Reverse-Engineering-Tooling installiert und verifiziert: Node `v24.22.2` (via `nvm`), Google Chrome (`.deb`) mit dediziertem CDP-Profil (`127.0.0.1:9222`) und `rea-agents@6.8.0` (siehe [`okf/tooling/rea.md`](/okf/tooling/rea.md)).
- **NOVA-AVA-Recherche mit REA abgeschlossen** (siehe [`okf/research/nova-ava.md`](/okf/research/nova-ava.md) und [`.scratch/nova-ava-research/spec.md`](/.scratch/nova-ava-research/spec.md)): Teil A (Setup, `.gitignore`, `GLOSSARY.md`, OKF-Dokumentation) und Teil B (automatisierte CDP-Steuerung, 28 REA-Evidenzen, Bereichskarten für LV, BIM, GAEB, Vergabe/Preisspiegel, Kosten/Aufmaß/Abrechnung sowie LV-Deep-Dive unter `docs/research/nova-ava/`) sind durchgeführt.

## Entschieden (2026-11-09)
- Lokale PWA ohne Server, React/TS, SQLite-WASM/OPFS, AGPL-3.0: siehe `docs/adr/0001`–`0007`.
- Zielgruppe (Planer, Architekten, Ingenieurbüros) und MVP (LV-Editor, Berechnung, GAEB, Preisspiegel/Zuschlag): `.scratch/ava-mvp/map.md` §0b.
- Arbeitsplan: [`.scratch/ava-oss/plan.md`](/.scratch/ava-oss/plan.md) (11 Stränge mit je eigenem Paket, 7 Wellen, Meilensteine M1–M4). Er löst `.scratch/ava-mvp/map.md` ab; die Tickets `.scratch/ava-mvp/issues/01`–`17` (P0–P2) gelten weiter und sind den Strängen zugeordnet.
- Verbindliche Regeln: [`docs/regeln.md`](/docs/regeln.md). Mit [NEU] markierte Regeln sind vorläufig, bis das Grilling sie bestätigt.

## Offen
- Alle offenen Ziele und Entscheidungen stehen gesammelt in [`.scratch/ava-oss/grilling.md`](/.scratch/ava-oss/grilling.md) (43 Fragen G-01…G-54, Stufe 1 blockiert den Start von Welle 1). Die Grilling-Sitzung steht aus.
- Darunter: Lizenzfrage DIN-276-Texte / GAEB-XSDs (G-12, G-16, Ticket 01), erster Schnitt A/B/C (G-04), lokal oder Server (G-01), rechtliche Einordnung der NOVA-Recherche (G-42).
- Interview mit dem Architekten-Freund steht aus (Leitfaden: [Synthese](/okf/research/synthesis.md), Abschnitt 8); siehe G-02.
- Noch kein Anwendungscode. Vor dem Grilling dürfen nur F1 (Repo-Gerüst) und F3 (Fixtures) starten.

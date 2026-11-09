---
type: Project
title: Projekt-Überblick
description: Grunddaten zum Projekt Ausschreibungssoftware (Ort, Status, offene Punkte).
resource: /home/jsk/Documents/Privates/Ausschreibungssoftware
tags: [ausschreibungssoftware, status]
timestamp: 2026-11-09T23:59:00Z
---
## Kontext (vom Nutzer, 2026-11-09)
- Ziel: eine Open-Source-AVA-Software (Ausschreibung, Vergabe, Abrechnung) für einen befreundeten Architekten in Deutschland.
- Er nutzt heute NOVA AVA (nova-ava.de) und ist damit unzufrieden. Bekannter Schmerzpunkt: Preis und Lizenz; weitere Schmerzpunkte sind noch unbekannt.
- Er schreibt für öffentliche und private Bauherren aus, also sind Vergaberecht und E-Vergabe relevant.

## Verifizierter Stand
- Projektordner: `/home/jsk/Documents/Privates/Ausschreibungssoftware`. Zusätzlich existiert der Git-Worktree `reverse_engineer_nova_ava` (Branch `reverse_engineer_nova_ava`), dessen Arbeit am 2026-11-09 in `main` zusammengeführt wurde.
- Git-Repo (Branch `main`) mit Remote `origin` = https://github.com/JoSchwause/Ausschreibungssoftware (öffentlich, angelegt 2026-11-09).
- Enthält bisher kein Code, sondern `okf/` (Wissensbasis, ohne `okf/research/`), Agent-Konfiguration (`AGENTS.md`, `.claude/skills/`, `docs/agents/`), Architektur-Entscheidungen (`docs/adr/`), Domänen-Glossar (`GLOSSARY.md`), lokale Entscheidungen und Plan (`.scratch/`) und `.gitignore`.
- `.gitignore` schließt `docs/research/nova-ava/` und `okf/research/` aus. Beides nie committen, weil das Repo öffentlich ist.
- **Repo-Änderung (noch nicht committet, nicht gepusht):** `okf/research/` ist aus dem Git-Index genommen (`git rm --cached`), die lokalen Dateien bleiben. Die Git-Historie enthält den Inhalt weiterhin, bis sie ausdrücklich umgeschrieben wird (G-44, Q2). Auf GitHub ist er bis zum Push noch sichtbar.
- Reverse-Engineering-Tooling installiert und verifiziert: Node `v24.22.2` (via `nvm`), Google Chrome (`.deb`) mit dediziertem CDP-Profil (`127.0.0.1:9222`) und `rea-agents@6.8.0` (siehe [`okf/tooling/rea.md`](/okf/tooling/rea.md)).
- NOVA-AVA-Recherche mit REA abgeschlossen (Rohdaten unter `docs/research/nova-ava/`, git-ignoriert).

## Entschieden (2026-11-09, Grilling)
- Lokale PWA ohne Server in v1, Mehrbenutzer später: ADR 0001/0002. Befehlsprotokoll als Nebenbuch: ADR 0009. Lizenz AGPL-3.0-or-later mit DCO und REUSE: ADR 0008. GAEB-Validierung mit eigener Prüfung und XSD-Gegenprüfung in der CI: ADR 0010. Projektebene und getrennte LV-Aggregate: ADR 0011.
- Zielgruppe (Planer, Architekten, Ingenieurbüros) und MVP (LV-Editor, Berechnung, GAEB, Preisspiegel/Zuschlag): `.scratch/ava-mvp/map.md` §0b.
- Arbeitsname **Tethys AVA** (Platzhalter, Endname vor Veröffentlichung prüfen).
- Arbeitsplan: [`.scratch/ava-oss/plan.md`](/.scratch/ava-oss/plan.md) (Stränge, Wellen, Meilensteine M1–M4). Die Tickets `.scratch/ava-mvp/issues/01`–`17` gelten weiter und sind den Strängen zugeordnet.
- Verbindliche Regeln: [`docs/regeln.md`](/docs/regeln.md).

## Offen
- G-06 (Verhaltensgleichheit oder Lücken des Vorbilds schließen) wurde nie gestellt. Annahme: Lücken schließen.
- G-54: `.scratch/ava-mvp/spec.md` schreiben und die angenommenen ADRs prüfen (Ticket 01). Die Datei existiert noch nicht.
- Tickets für Welle 1–2 nach `.scratch/ava-oss/issues/` schneiden.
- Rechtliche Prüfung der NOVA-AVA-Recherche (G-42). Bis dahin bleibt `okf/research/` aus dem Repo.
- Verrechnung mehrerer Nachlässe im Preisspiegel (Annahme, G-26) und die zweite Bedeutung von „VOB 80“ (vor A1).
- Interview mit dem Architekten-Freund steht aus (Leitfaden: `okf/research/synthesis.md`, Abschnitt 8); siehe G-02.
- Noch kein Anwendungscode.

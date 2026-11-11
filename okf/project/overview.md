---
type: Project
title: Projekt-Überblick
description: Grunddaten zum Projekt Ausschreibungssoftware (Ort, Status, offene Punkte).
resource: /home/jsk/Documents/Privates/Ausschreibungssoftware
tags: [ausschreibungssoftware, status]
timestamp: 2026-11-11T12:00:00Z
---
## Kontext (vom Nutzer, 2026-11-09)
- Ziel: eine Open-Source-AVA-Software (Ausschreibung, Vergabe, Abrechnung) für einen befreundeten Architekten in Deutschland.
- Er nutzt heute NOVA AVA (nova-ava.de) und ist damit unzufrieden. Bekannter Schmerzpunkt: Preis und Lizenz; weitere Schmerzpunkte sind noch unbekannt.
- Er schreibt für öffentliche und private Bauherren aus, also sind Vergaberecht und E-Vergabe relevant.

## Verifizierter Stand
- Projektordner: `/home/jsk/Documents/Privates/Ausschreibungssoftware`. Zusätzlich existiert der Git-Worktree `reverse_engineer_nova_ava` (Branch `reverse_engineer_nova_ava`), dessen Arbeit am 2026-11-09 in `main` zusammengeführt wurde.
- Git-Repo (Branch `main`) mit Remote `origin` = https://github.com/JoSchwause/Ausschreibungssoftware (öffentlich, angelegt 2026-11-09).
- `main` enthält Welle 0 und 1 sowie Teile von Welle 2 (Code unter `packages/`); Welle 3 liegt lokal auf Branch `integration/welle-3` (Web-App `apps/web`, Pakete `mengen` und `vergabe`, `gaeb`-Writer). Daneben `okf/` (Wissensbasis, ohne `okf/research/`), Agent-Konfiguration (`AGENTS.md`, `.claude/skills/`, `docs/agents/`), Architektur-Entscheidungen (`docs/adr/`), Domänen-Glossar (`GLOSSARY.md`), lokale Entscheidungen und Plan (`.scratch/`) und `.gitignore`.
- `.gitignore` schließt `docs/research/nova-ava/` und `okf/research/` aus. Beides nie committen, weil das Repo öffentlich ist.
- **Repo-Änderung (gepusht auf Branch `grilling-rueckschreibung`, nicht auf `main`):** `okf/research/` ist aus dem Git-Index genommen (`git rm --cached`), die lokalen Dateien bleiben. Die Git-Historie enthält den Inhalt weiterhin, bis sie ausdrücklich umgeschrieben wird (G-44, Q2). Auf GitHub bleibt er in der Historie von `main` öffentlich sichtbar (Nutzerentscheidung 2026-11-09: Repo bleibt öffentlich, pushen).
- **Cloud-Sessions:** Lokale, git-ignorierte `.env` im Projektwurzelordner enthält die Umgebungsvariablen für die Claude-Code-Cloud-Umgebung (ohne Geheimnisse; Inhalt ins Umgebungsformular kopieren). `GAEB_XSD_URL` ist leer, bis Strang G die XSD-Quelle festlegt. Umsetzende Cloud-Agenten lesen nur Tickets (C3).
- Reverse-Engineering-Tooling installiert und verifiziert: Node `v24.22.2` (via `nvm`), Google Chrome (`.deb`) mit dediziertem CDP-Profil (`127.0.0.1:9222`) und `rea-agents@6.8.0` (siehe [`okf/tooling/rea.md`](/okf/tooling/rea.md)).
- NOVA-AVA-Recherche mit REA abgeschlossen (Rohdaten unter `docs/research/nova-ava/`, git-ignoriert).

## Entschieden (2026-11-09, Grilling)
- Lokale PWA ohne Server in v1, Mehrbenutzer später: ADR 0001/0002. Befehlsprotokoll als Nebenbuch: ADR 0009. Lizenz AGPL-3.0-or-later mit DCO und REUSE: ADR 0008. GAEB-Validierung mit eigener Prüfung und XSD-Gegenprüfung in der CI: ADR 0010. Projektebene und getrennte LV-Aggregate: ADR 0011.
- Zielgruppe (Planer, Architekten, Ingenieurbüros) und MVP (LV-Editor, Berechnung, GAEB, Preisspiegel/Zuschlag): `.scratch/ava-mvp/map.md` §0b.
- Arbeitsname **Tethys AVA** (Platzhalter, Endname vor Veröffentlichung prüfen).
- Arbeitsplan: [`.scratch/ava-oss/plan.md`](/.scratch/ava-oss/plan.md) (Stränge, Wellen, Meilensteine M1–M4). Die Tickets `.scratch/ava-mvp/issues/01`–`17` gelten weiter und sind den Strängen zugeordnet.
- Verbindliche Regeln: [`docs/regeln.md`](/docs/regeln.md).

## Offen
- G-27 (Tiefe der Rechnungsprüfung) ist vertagt bis vor Welle 5. Erledigt am 2026-11-09: G-06 (Lücken schließen), G-54 (`.scratch/ava-mvp/spec.md`, ADRs geprüft), G-55 (Fremde Testdateien, Regel C4 erweitert), G-56 (Projektdatei als JSON).
- Nutzerinterview: erst nach einem Prototyp (G-02, Nachtrag). Ticket: `.scratch/ava-oss/issues/18-prototyp-interview.md` (`ready-for-agent`, vier Fragen, klickbare UI mit Varianten, Wegwerfbranch `proto/interview`).
- Tickets für Welle 0 und 1 sind geschnitten (`.scratch/ava-oss/issues/README.md`, Nr. 02–07, 10, 19–23, dazu Prototyp 18). Welle 2 und 3 sind geschnitten (Welle 3: Nr. 29–50, Folgetickets 51–54 für Welle 4).
- Rechtliche Prüfung der NOVA-AVA-Recherche (G-42). Bis dahin bleibt `okf/research/` aus dem Repo.
- Verrechnung mehrerer Nachlässe im Preisspiegel (Annahme, G-26) und die zweite Bedeutung von „VOB 80“ (vor A1).
- Interview mit dem Architekten-Freund steht aus (Leitfaden: `okf/research/synthesis.md`, Abschnitt 8); siehe G-02.
- Anwendungscode: Welle 3 (Branch `integration/welle-3`, nicht auf `main`) liefert eine lauffähige lokale PWA: M1 „LV anlegen, rechnen, speichern“ erreicht, M2 (GAEB-Export mit XSD-Gegenprüfung) erfüllt bis auf erwartete Unterschiede im Rundweg; Handprüfung im GAEB-Betrachter offen. Bericht: `.scratch/ava-oss/welle-3-bericht.md`.
- Welle 4: Tickets 51–54 (Fixtures in GAEB-Zuschlagsform, Einzeländerung < 100 ms, `vertrag` v1.3, UI-Lücken) sind geschnitten (`.scratch/ava-oss/issues/README.md`).

---
type: Index
title: Ausschreibungssoftware – Knowledge Base
description: Einstiegspunkt der OKF-Wissensbasis des Projekts Ausschreibungssoftware.
tags: [ausschreibungssoftware]
timestamp: 2026-11-10T06:00:00Z
---
# Ausschreibungssoftware

- [Projekt-Überblick](/okf/project/overview.md) — Status, Ort, Scope
- [Domänen-Glossar](/GLOSSARY.md) — Allgemeine AVA-Fachbegriffe (LV, OZ, Positionsarten, GAEB, BIM, DIN 276, Preisspiegel)
- [Architektur-Entscheidungen](/docs/adr/) — ADRs 0001–0011 (lokale PWA, SQLite-WASM/OPFS, TS-Berechnung, React/TanStack/TipTap, Sprache, Historie, Lizenz, Befehlsprotokoll, GAEB-Validierung, Projektebene)
- [Regeln](/docs/regeln.md) — verbindliche Entwurfs- und Umsetzungsregeln für alle Agenten
- [Arbeitsplan](/.scratch/ava-oss/plan.md) und [Grilling-Ergebnis](/.scratch/ava-oss/grilling.md) — Stränge, Wellen, Entscheidungen
- [NOVA-AVA-Recherche](/okf/research/nova-ava.md) — lokal, nicht im Repo (Rechtsprüfung ausstehend, G-42/G-44)
- [REA Setup & Nutzung](/okf/tooling/rea.md) — Node/nvm, Google Chrome, REA-MCP (`rea-agents@6.8.0`) und CLI-Workflows
- [Matt Pocock Skills](/okf/tooling/mattpocock-skills.md) — Projektlokale Skills in `.claude/skills`
- [Agent-Skills-Konfiguration](/okf/tooling/agent-skills-config.md) — Tracker, Labels, Domain-Docs

## Recherche (Stand 2026-11-09, lokal)
- `okf/research/` ist seit dem 2026-11-09 aus dem Repo-Baum genommen (G-44). Die lokale Kopie bleibt erhalten.
- [Recherche-Index](/okf/research/index.md) — 23 Notizen zu NOVA AVA, Markt, AVA-Prozess, Standards und Open Source
- [Synthese](/okf/research/synthesis.md) — Kernaussagen, Fähigkeitslandkarte, mögliche erste Schnitte, Interviewleitfaden
- [Glossar (Recherche)](/okf/research/glossary.md) — AVA-Fachbegriffe für Entwickler

## Status
- Projektordner angelegt (2026-11-09). Scoping-Interview erledigt.
- Web-Recherche zu AVA-Software (nur öffentliche Quellen) abgeschlossen.
- NOVA-AVA-Recherche mit REA abgeschlossen. Rohdaten und Bericht liegen git-ignoriert unter `docs/research/nova-ava/`.
- Architektur-Entscheidungen getroffen (ADRs 0001–0011, 2026-11-09): lokale PWA ohne Server, React/TS, SQLite-WASM/OPFS, AGPL-3.0-or-later, Befehlsprotokoll, eigene GAEB-Prüfung mit XSD-Gegenprüfung in der CI, Projektebene.
- Grilling-Sitzung am 2026-11-09 durchgeführt. Ergebnis in [`.scratch/ava-oss/grilling.md`](/.scratch/ava-oss/grilling.md), Regeln in [`docs/regeln.md`](/docs/regeln.md) aktualisiert.
- G-06, G-54, G-55, G-56 geschlossen (2026-11-09); `.scratch/ava-mvp/spec.md` liegt vor. Noch offen: G-27 (vertagt), Tickets für Welle 1–2, Repo-Baum-Änderung für `okf/research/` ist auf Branch `grilling-rueckschreibung` gepusht (2026-11-09), aber noch nicht auf `main` gemergt.
- Welle 0 und 1 umgesetzt (2026-11-10) auf Branch `claude/wave-0-1-orchestration-nkdqfx`, noch nicht auf `main`: pnpm-Monorepo mit CI, `vertrag`, `dezimal`, `kern` (Baum, OZ, Summen), `speicher`, `gaeb` (Leser X81/X83 3.3), `ui-basis`, `ui-grid`, Fixtures und amtliche Testdateien. Übergabe und nächste Entscheidungen: [`.scratch/ava-oss/next-decisions.md`](/.scratch/ava-oss/next-decisions.md). `vertrag` v1 ist vom Nutzer geprüft; die Grilling-Runde E-01 bis E-20 ist beantwortet (2026-11-10), Welle 2 beginnt mit `vertrag` v1.1a/v1.1b.
- Welle 0 und 1 sind auf `main` (PR #1). Welle 2, Stufe 1 (2026-11-10): Aufräumen, Kern-Feldbefehle und PDF-Spike (Paket `ausgabe`, pdfmake) auf `main`; Interview-Prototyp auf Branch `proto/interview`; `vertrag` v1.1a (PR #4) und v1.1b (PR #7) warten auf die Prüfung des Nutzers. Übergabe: [`.scratch/ava-oss/next-decisions-welle-2.md`](/.scratch/ava-oss/next-decisions-welle-2.md).

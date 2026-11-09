---
type: Index
title: Ausschreibungssoftware – Knowledge Base
description: Einstiegspunkt der OKF-Wissensbasis des Projekts Ausschreibungssoftware.
tags: [ausschreibungssoftware]
timestamp: 2026-11-09T23:59:00Z
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
- Noch offen: G-06 (Verhaltensgleichheit, nie gestellt), G-54 (spec.md und ADR-Prüfung), Tickets für Welle 1–2, Repo-Baum-Änderung für `okf/research/` noch nicht committet und nicht gepusht.

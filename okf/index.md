---
type: Index
title: Ausschreibungssoftware – Knowledge Base
description: Einstiegspunkt der OKF-Wissensbasis des Projekts Ausschreibungssoftware.
tags: [ausschreibungssoftware]
timestamp: 2026-11-09T23:00:00Z
---
# Ausschreibungssoftware

- [Projekt-Überblick](/okf/project/overview.md) — Status, Ort, Scope
- [Domänen-Glossar](/GLOSSARY.md) — Allgemeine AVA-Fachbegriffe (LV, OZ, Positionsarten, GAEB, BIM, DIN 276)
- [Architektur-Entscheidungen](/docs/adr/) — ADRs 0001–0007 (lokale PWA, SQLite-WASM/OPFS, TS-Berechnung, React/TanStack/TipTap, Sprache, Historie, AGPL)
- [Regeln](/docs/regeln.md) — verbindliche Entwurfs- und Umsetzungsregeln für alle Agenten
- [Arbeitsplan](/.scratch/ava-oss/plan.md) und [Grilling-Backlog](/.scratch/ava-oss/grilling.md) — Stränge, Wellen, offene Entscheidungen
- [NOVA-AVA-Recherche](/okf/research/nova-ava.md) — Status und Aufbau der Referenz-Untersuchung (Details git-ignored)
- [REA Setup & Nutzung](/okf/tooling/rea.md) — Node/nvm, Google Chrome, REA-MCP (`rea-agents@6.8.0`) und CLI-Workflows
- [Matt Pocock Skills](/okf/tooling/mattpocock-skills.md) — Projektlokale Skills in `.claude/skills`
- [Agent-Skills-Konfiguration](/okf/tooling/agent-skills-config.md) — Tracker, Labels, Domain-Docs

## Recherche (Stand 2026-11-09)
- [Recherche-Index](/okf/research/index.md) — 23 Notizen zu NOVA AVA, Markt, AVA-Prozess, Standards und Open Source
- [Synthese](/okf/research/synthesis.md) — Kernaussagen, Fähigkeitslandkarte, mögliche erste Schnitte (Vorschlag), Interviewleitfaden für den Architekten-Freund
- [Glossar (Recherche)](/okf/research/glossary.md) — AVA-Fachbegriffe für Entwickler

## Status
- Projektordner angelegt (2026-11-09). Scoping-Interview erledigt: erster Schritt war eine NOVA-AVA-Recherche mit REA, Plan in `.scratch/nova-ava-research/spec.md`.
- Web-Recherche zu AVA-Software (nur öffentliche Quellen) abgeschlossen, siehe [Recherche-Index](/okf/research/index.md).
- NOVA-AVA-Recherche mit REA (Teil A Setup, Teil B Captures und LV-Deep-Dive) abgeschlossen. Rohdaten und Bericht liegen git-ignoriert unter `docs/research/nova-ava/`.
- Architektur-Entscheidungen getroffen (ADRs 0001–0007, 2026-11-09): lokale PWA ohne Server, React/TS, SQLite-WASM/OPFS, AGPL-3.0.
- Arbeitsplan mit parallelen Strängen und Regeln angelegt (2026-11-09): [`.scratch/ava-oss/plan.md`](/.scratch/ava-oss/plan.md), [`docs/regeln.md`](/docs/regeln.md).
- Nächster Schritt: Grilling-Sitzung über [`.scratch/ava-oss/grilling.md`](/.scratch/ava-oss/grilling.md) (43 offene Fragen); ihre Antworten werden in Plan, ADRs und Glossar zurückgeschrieben. Siehe [Projekt-Überblick](/okf/project/overview.md).

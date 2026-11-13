---
type: Index
title: Ausschreibungssoftware – Knowledge Base
description: Einstiegspunkt der OKF-Wissensbasis des Projekts Ausschreibungssoftware.
tags: [ausschreibungssoftware]
timestamp: 2026-11-13T02:00:00Z
---
# Ausschreibungssoftware

- [Projekt-Überblick](/okf/project/overview.md) — Status, Ort, Scope
- [Domänen-Glossar](/GLOSSARY.md) — Allgemeine AVA-Fachbegriffe (LV, OZ, Positionsarten, GAEB, BIM, DIN 276, Preisspiegel)
- [Architektur-Entscheidungen](/docs/adr/) — ADRs 0001–0013 (lokale PWA, SQLite-WASM/OPFS, TS-Berechnung, React/TanStack/TipTap, Sprache, Historie, Lizenz, Befehlsprotokoll, GAEB-Validierung, Projektebene; 0012 PDF mit pdfmake und 0013 Sync-Server nach v1, beide Vorschlag)
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
- Welle 3 umgesetzt (2026-11-10/11) auf Branch `integration/welle-3`, lokal, nicht auf `main`: Tickets 29–50 gemergt und `resolved`. Es läuft jetzt eine Web-App (`apps/web`) mit Projektliste, LV-Grid an den Befehlen, Positionsdialog mit Langtext-Editor, Prüf-Panel, Zwischenablage, Papierkorb, Undo/Redo, LV-Ständen sowie GAEB-Import und -Export (X81/X83/X86, 3.3 und 3.2, X84-Import); dazu `mengen` (REB-Formel 91), `vergabe` (Bieter, Angebot, Zuschlag, Preisspiegel-Rechnung), `speicher` Schema 3 und der `gaeb`-Writer mit XSD-Gegenprüfung. **M1 erreicht**, **M2 erfüllt** bis auf die Liste erwarteter Unterschiede im Rundweg; Handprüfung im freien GAEB-Betrachter steht aus. Offen: Einzeländerung < 100 ms (Ticket 52), Fixtures in GAEB-Zuschlagsform (51), `vertrag` v1.3 (53), UI-Lücken (54). Bericht: [`.scratch/ava-oss/welle-3-bericht.md`](/.scratch/ava-oss/welle-3-bericht.md); Tickets: [`.scratch/ava-oss/issues/README.md`](/.scratch/ava-oss/issues/README.md).
- Welle 4 umgesetzt (2026-11-11) auf Branch `integration/welle-4`, lokal: Tickets 51–69 gemergt und `resolved`. Neu: Preisspiegel-Ansicht (`ui-grid` Vergleichsgrid), Zuschlag → Auftrags-LV (nur das Beauftragte, D-21) mit eigener Seite und X86-Export, PDF-Druck des LV (ADR 0012, Vorschlag), Excel-Rundlauf für Bieter, Mengenermittlungs-Panel (REB Formel 91), PWA (offline) mit Export-Erinnerung und Sicherungsordner, Paket `kosten` (C1, rein), `vertrag` v1.3, Speicher-Migration 4, Einzeländerung < 100 ms. **M3 erreicht.** Folgetickets 70–75. Bericht: [`.scratch/ava-oss/welle-4-bericht.md`](/.scratch/ava-oss/welle-4-bericht.md).
- Welle 5 umgesetzt (2026-11-11/12) auf Branch `integration/welle-5`, lokal, ab dem Ende von Welle 4: Tickets 70–92 gemergt und `resolved`. Neu: Nachträge (Nachtrags-LV, Beauftragen ins Auftrags-LV), Aufmaßblätter mit Mengenansatz und Soll/Ist (VOB/B § 2 Abs. 3), Rechnungsprüfung mit Abzugskette und eingefrorenen Zahlbeträgen (Annahme zu G-27), XRechnung lesen (Paket `erechnung`), GAEB X31 und Kostengruppen als DIN-276-Katalogzuordnung, Kostenermittlung und Kostenkontrolle, EP-Kalkulation, Druckprofile, Muster-LV; `vertrag` v1.4, Speicher-Migration 5, Paket `abrechnung`. **M4 „durchgehende Kette LPH 6–8“ erreicht.** Folgetickets 93–95. Bericht: [`.scratch/ava-oss/welle-5-bericht.md`](/.scratch/ava-oss/welle-5-bericht.md).
- Welle 4 und 5 sind auf `main` (PR #10, `79e6680`). Welle 6 umgesetzt (2026-11-12/13) auf Branch `integration/welle-6`, lokal, ab `79e6680`: Tickets 93–122 gemergt und `resolved`. Neu: BIM/IFC (Paket `ifc` mit eigenem STEP-Leser für IFC 2x3/4, `bim` für Mengenübernahme, Aufmaß aus Auswahl, DIN 277, Kennwerte und Modellvergleich, `ui-modell` mit 3D-Ansicht über web-ifc und three.js), Bauzeitenplan mit Kalender und kritischem Weg (`bauzeit`), HOAI-2021-Honorar (`honorar`), Mängel und Bautagebuch (`bauleitung`), PDFs dazu; editierbare KG-Spalte im Grid, Balkenspalte; `vertrag` v1.5 und v1.6, Projektdatei Schema 6; ADR 0013 (Sync-Server nach v1, Vorschlag) und G-57. **Tore X1-Kern, X1-Erweitert, X2, X3, X4, X5 erreicht.** Folgetickets 123/124. Bericht: [`.scratch/ava-oss/welle-6-bericht.md`](/.scratch/ava-oss/welle-6-bericht.md).

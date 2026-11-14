---
type: Project
title: Projekt-Überblick
description: Grunddaten zum Projekt Ausschreibungssoftware (Ort, Status, offene Punkte).
resource: /home/jsk/Documents/Privates/Ausschreibungssoftware
tags: [ausschreibungssoftware, status]
timestamp: 2026-11-14T18:00:00Z
---
## Kontext (vom Nutzer, 2026-11-09)
- Ziel: eine Open-Source-AVA-Software (Ausschreibung, Vergabe, Abrechnung) für einen befreundeten Architekten in Deutschland.
- Er nutzt heute NOVA AVA (nova-ava.de) und ist damit unzufrieden. Bekannter Schmerzpunkt: Preis und Lizenz; weitere Schmerzpunkte sind noch unbekannt.
- Er schreibt für öffentliche und private Bauherren aus, also sind Vergaberecht und E-Vergabe relevant.

## Verifizierter Stand
- Projektordner: `/home/jsk/Documents/Privates/Ausschreibungssoftware`. Zusätzlich existiert der Git-Worktree `reverse_engineer_nova_ava` (Branch `reverse_engineer_nova_ava`), dessen Arbeit am 2026-11-09 in `main` zusammengeführt wurde.
- Git-Repo (Branch `main`) mit Remote `origin` = https://github.com/JoSchwause/Ausschreibungssoftware (öffentlich, angelegt 2026-11-09).
- `main` enthält Welle 0 bis 6: Welle 3 kam mit PR #9, Welle 4 und 5 mit PR #10 (`79e6680`, Tor M3 und M4), Welle 6 mit PR #11 (`6bb709e`, 2026-11-13; BIM/IFC, Bauzeitenplan, HOAI-Honorar, Mängel und Bautagebuch; Pakete `ifc`, `bim`, `ui-modell`, `bauzeit`, `honorar`, `bauleitung`). Daneben `okf/` (Wissensbasis, ohne `okf/research/`), Agent-Konfiguration (`AGENTS.md`, `.claude/skills/`, `docs/agents/`), Architektur-Entscheidungen (`docs/adr/`), Domänen-Glossar (`GLOSSARY.md`), lokale Entscheidungen und Plan (`.scratch/`) und `.gitignore`.
- `.gitignore` schließt `docs/research/nova-ava/` und `okf/research/` aus. Beides nie committen, weil das Repo öffentlich ist.
- **`okf/research/`:** aus dem Git-Index genommen (`git rm --cached`) und auf `main` nicht mehr versioniert; die lokalen Dateien bleiben. Die Git-Historie enthält den Inhalt weiterhin, bis sie ausdrücklich umgeschrieben wird (G-44, Q2). Auf GitHub bleibt er in der Historie von `main` öffentlich sichtbar (Nutzerentscheidung 2026-11-09: Repo bleibt öffentlich). Die CI schlägt fehl, wenn dort etwas versioniert ist (C2).
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
- G-27 (Tiefe der Rechnungsprüfung): im Lauf „Welle 5“ als Annahme D-34 entschieden (Abzugskette), Mensch bestätigt später. Erledigt am 2026-11-09: G-06 (Lücken schließen), G-54 (`.scratch/ava-mvp/spec.md`, ADRs geprüft), G-55 (Fremde Testdateien, Regel C4 erweitert), G-56 (Projektdatei als JSON).
- Nutzerinterview: fand bisher nicht statt. Die Demo mit Probebetrieb nach Welle 7 ist zugleich das Interview (G-02 Nachtrag 2026-11-13, G-59); Aufgaben in `.scratch/ava-oss/issues/126-handpruefungen-und-demo.md`. Der Prototyp aus Ticket 18 liegt unter `proto/interview/` auf `main`.
- Tickets liegen unter `.scratch/ava-oss/issues/` (Nr. 02–163; Übersicht `.scratch/ava-oss/issues/README.md`). Die Tickets 02, 24 und 26 (`vertrag` v1, v1.1a, v1.1b) sind `resolved`; Ticket 18 (Prototyp) bleibt außerhalb der Wellen.
- Rechtliche Prüfung der NOVA-AVA-Recherche (G-42). Bis dahin bleibt `okf/research/` aus dem Repo.
- Verrechnung mehrerer Nachlässe im Preisspiegel (Annahme, G-26); „VOB 80“ als Annahme D-35 (vermutlich § 650c Abs. 3 BGB, nicht in v1).
- Interview mit dem Architekten-Freund steht aus (Leitfaden: `okf/research/synthesis.md`, Abschnitt 8); siehe G-02.
- Anwendungscode (Welle 3, seit PR #9 auf `main`) liefert eine lauffähige lokale PWA: M1 „LV anlegen, rechnen, speichern“ erreicht, M2 (GAEB-Export mit XSD-Gegenprüfung) erfüllt bis auf erwartete Unterschiede im Rundweg; Handprüfung im GAEB-Betrachter offen. Bericht: `.scratch/ava-oss/welle-3-bericht.md`.
- Welle 4 (2026-11-11, `integration/welle-4`, seit PR #10 auf `main`): Tickets 51–69 umgesetzt, **M3 „Ausschreibung → Angebote → Zuschlag“ erreicht**. Entscheidungslog D-20 bis D-30 und `vertrag` v1.3 gelten seit G-58 als geprüft; ADR 0012 ist `accepted` (Ticket 134). Folgetickets 70–75; G-27 vor Welle 5. Bericht: `.scratch/ava-oss/welle-4-bericht.md`.
- Welle 5 (2026-11-11/12, `integration/welle-5`, ab Welle 4, mit PR #10 auf `main`): Tickets 70–92 umgesetzt, **M4 „durchgehende Kette LPH 6–8“ erreicht** (Nachtrag → Aufmaß → Soll/Ist → Abschlagsrechnungen mit eingefrorenen Zahlbeträgen → Kostenkontrolle, E2E und Kettentest gegen hergeleitete Sollwerte). Zu prüfen: Entscheidungslog D-31 bis D-48 (vor allem D-34 Rechnungsprüfung, D-35 Nachträge, D-36/D-42 `vertrag` v1.4, D-37 Kostenkontrolle, D-38 Tor M4). Folgetickets 93–95. Welle 6 (G-05, Nachtrag 2026-11-12): nach 93–95 die Erweiterungen X1–X5, Schwerpunkt BIM (X1). Bericht: `.scratch/ava-oss/welle-5-bericht.md`.
- Welle 6 (2026-11-12/13, `integration/welle-6`, ab `79e6680`, mit PR #11 auf `main`): Tickets 93–122 umgesetzt, **Tore X1-Kern, X1-Erweitert, X2, X3, X4 und X5 erreicht** (IFC 2x3/4 lesen, Modellbaum und 3D, Bauteile Positionen zuordnen, Mengen ins LV, Aufmaß aus Auswahl, DIN 277 und Kennwerte, Modellvergleich; Bauzeitenplan mit kritischem Weg; HOAI-2021-Honorar; Mängel und Bautagebuch; ADR 0013 Sync-Server als Vorschlag). Zu prüfen: Entscheidungslog D-49 bis D-70 (vor allem D-50 bis D-58 vom Berater, D-66 `vertrag` v1.5/v1.6, D-69 Review-Umfang), HOAI-Tafeln gegen die amtliche Fassung, G-57. Folgetickets 123/124. Bericht: `.scratch/ava-oss/welle-6-bericht.md`.
- Welle 7 „Einführungsreife“ (2026-11-13/14, lokaler Branch `integration/welle-7` ab `4eefd7d`, PR #13 nach `main`): Tickets 127–163 umgesetzt, **Tor E erreicht** (`apps/web/e2e/umsteiger.spec.ts`: erster Start → Beispielprojekt → Projekt aus BVBS-X83 → zwei X84 → Preisspiegel → Zuschlag → Nachtrag → Aufmaß → Rechnung mit Skonto, Zahlung, Zahlungsfreigabe-PDF → Kostenkontrolle → Sicherung → Projekt samt Inhalt löschen → Sicherung einlesen; kein Überlauf bei 1280 px; XML 3.3/3.1, GAEB 90 und GAEB 2000 ergeben dasselbe Modell). Neu: Navigation, erster Start mit Beispielprojekt und Hilfe/Annahmen, Fehlergrenze, Sprachtest, GAEB 90/2000 lesen, Suchen im Grid, Vertragsstrafe/Skonto/Bauabzugsteuer/Zahlungen (A5), Einstellungen global, Projektdatei Schema 7, `vertrag` v1.7a–c, Pages-Workflow (Version 0.7.0). M4 (Ticket 157) nach §4 gekürzt. Zu prüfen: Entscheidungslog D-71 bis D-111, `vertrag` v1.7, Annahme zu G-27 (A5); GAEB 90/2000 nur gegen eigene Fixtures geprüft (Ticket 125 fehlt). Danach: Merge nach `main`, Ticket 126 (GitHub Pages einschalten, Handprüfungen, Sitzung mit dem Büro). Offen bleibt G-57. Bericht: `.scratch/ava-oss/welle-7-bericht.md`.

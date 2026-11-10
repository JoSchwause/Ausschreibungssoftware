# 49: App: GAEB-Import und -Export, X84-Import (optional, wenn Zeit)

Status: ready-for-agent
Type: task
Welle: 3 (Phase B) · Strang: G (App-Teil) · Paket: `apps/web`
Blocked by: 48, 40, 45, 44
Regeln: A2, A5, A7, U5, U7, U8, Q2, Q3, Q5, C3, G-10, G-11, G-13, G-14, E-11, E-13, E-19, ADR 0010
Herkunft: `plan.md` §2 G2/G3 (App-Teil) und §4 (M2: „zusätzlich von Hand: Export in einem freien GAEB-Betrachter öffnen“), Ticket 18 (GAEB-Dialog im Prototyp, Teilfrage 4), Tickets 40, 45, 44

## What to build

Die GAEB-Wege aus `gaeb` werden in der App bedienbar: ein LV aus X81/X83 einlesen, ein LV als X81/X83/X86 ausgeben,
ein Angebot aus X84 einlesen. Prüfbefunde erscheinen, sperren aber nie (U5, G-13). Vorgehen: TDD mit dem Skill `tdd`;
am Ende `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün. `okf/research/` wird nicht gelesen (C3).

1. **LV einlesen (X81/X83, 3.3/3.2):** In der Projektansicht „GAEB einlesen“ → Datei wählen → `leseGaeb` (Kennungen aus
   der `IdQuelle` der App, MwSt-Ersatzwert 19,00 %, E-19) → Vorschau: Phase, Version, Zahl der Gliederungen, Positionen,
   Hinweistexte, Befunde gruppiert nach Schwere → „Übernehmen“ legt das LV mit **einem** Befehl
   `LeistungsverzeichnisAnlegen` an (Massenbefehl, im Protokoll als Kurzfassung, E-13). Eine Datei ohne Inhalt (z. B. 3.1)
   zeigt die Befunde und bietet kein Übernehmen an.
2. **LV ausgeben:** Auf der LV-Seite „GAEB ausgeben“ → Phase (X81, X83, X86) und Version (3.3, 3.2) wählen →
   `schreibeGaeb` mit Datum und Uhrzeit der App (A2: die Uhr gehört der App) und, für X86, dem Summenstand aus dem Kern →
   Befunde der eigenen Prüfung und die Warnungen über Verworfenes (E-11) anzeigen → herunterladen. Mit Fehlern:
   deutlicher Hinweis „Entwurf“, Dateiname mit Zusatz `_Entwurf` (G-13); kein Sperren.
3. **Angebot einlesen (X84):** Auf der LV-Seite „Angebot einlesen“ → Datei → `leseAngebot` gegen dieses LV → Vorschau mit
   Bietername aus der Datei (änderbar) und Befunden → „Übernehmen“: fehlt der Bieter im Projekt, zuerst `BieterAnlegen`,
   dann `AngebotAnlegen` (ein Undo-Schritt). Danach eine einfache Liste der Angebote des LV mit Bietersummen (Netto, Netto
   nach Nachlass, Brutto) aus `vergabe` (Ticket 36/44). Die Preisspiegel-Ansicht ist nicht Teil des Tickets (V3).
4. **Integrationstest ohne Oberfläche** (Vitest in `apps/web`, darf alle Pakete einbinden): BVBS AVA X81 einlesen, X84
   dazu einlesen, Bietersummen mit `vergabe` rechnen. Erwartet (wenn Ticket 44 gemergt ist): Gliederung 1.30.20
   **1.790,00**, 1.30.30 **819,10**, 1.30.10 **1.500,00** (Datei 1.450,50; Positionsnachlass nicht abbildbar, Ticket 44
   Punkt 4), Hauptgruppe 3 **12.000,00**. Ohne Ticket 44: nur 1.30.20 ohne Zuschlagsbeträge und Hauptgruppe 3 prüfen,
   Vermerk in den Comments.
5. **Roundtrip in der App** (Vitest): `typisch` als X83 3.3 ausgeben, wieder einlesen → gleiche Summen.

## Grenzen

- **Paket `apps/web`.** Fehlt in `gaeb`, `vergabe` oder `kern` etwas, Lücke in die Comments; keine Änderung dort.
- Die App liest Dateien nur über die Dateiauswahl des Browsers; kein Netz, kein Server (A1).
- Große Dateien (bis 100 MiB, Grenze des Lesers) lesen, ohne die Oberfläche einzufrieren: Vorschlag Web Worker für
  `leseGaeb`/`leseAngebot`; ist das zu viel, eine Fortschrittsanzeige und eine Messung im Ticket.
- **Zu groß?** Zuerst streichen: Punkt 3 (X84) samt Angebotsliste, dann 3.2 in der Auswahl. Punkt 1 und 2 bleiben.

## Acceptance criteria

- [ ] E2E: BVBS AVA X81 einlesen, Vorschau zeigt 22 Gliederungen, 74 Positionen, 14 Hinweistexte (Zahlen aus Ticket 22) und Befunde; Übernehmen legt das LV an; Neuladen behält es
- [ ] E2E: `typisch` als X83 3.3 ausgeben; Datei wird heruntergeladen, die eigene Prüfung zeigt keine Fehler; ein LV mit Einheit über 4 Zeichen ergibt „Entwurf“ und Dateiname mit `_Entwurf`, der Export geschieht trotzdem
- [ ] E2E: X84 zum eingelesenen BVBS-LV einlesen, Bieter wird angelegt, das Angebot erscheint mit Bietersumme
- [ ] Integrationstest Punkt 4 mit den genannten Zahlen (bzw. dem Rückfall ohne 44)
- [ ] Roundtrip Punkt 5
- [ ] Einlesen eines LV und eines Angebots ist je ein Undo-Schritt
- [ ] Handprüfung für M2 vorbereitet: README-Abschnitt oder Comments, wie man einen Export in einem freien GAEB-Betrachter öffnet (welcher, Ergebnis, falls in der Sitzung möglich)
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Preisspiegel-Ansicht (V3), Zuschlag und Auftrags-LV (V4), Excel (O2, V5), GAEB 90/2000 und 3.1 (G4), X82/X85/X89.

## Comments

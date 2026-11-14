# Tethys AVA

Freie Software für Ausschreibung, Vergabe und Abrechnung (AVA) im Bauwesen: eine lokale Einzelnutzer-PWA
(React, Vite, TypeScript), Lizenz AGPL-3.0-or-later. Arbeitsname; der Endname wird vor der Veröffentlichung geprüft.

## Stand

Version 0.7.0, Stand nach Welle 7 („Einführungsreife“). Die Ausschreibung ist der Kern: Leistungsverzeichnis mit
Gliederung, Positionsarten, Langtext und Berechnung nach Dezimalarithmetik, GAEB-Austausch (Einlesen von X81, X83,
X84 und X86 als GAEB DA XML 3.1, 3.2 und 3.3 sowie als GAEB 90 und GAEB 2000; Ausgabe als GAEB DA XML 3.3 und 3.2), PDF-
und Excel-Ausgabe, Preisspiegel und Zuschlag, Auftrags-LV, Nachträge, Aufmaß, Rechnungsprüfung und
Kostenkontrolle. Dazu kommen als Vorschau BIM mit IFC-Modellen, Bauzeitenplan, HOAI-Honorar sowie Mängel und
Bautagebuch. Alles läuft im Browser, die Daten bleiben auf dem eigenen Gerät (SQLite im Browserspeicher); der
Austausch geschieht über Dateien. Ein Server ist für spätere Versionen vorgesehen.

Es ist noch kein 1.0-Stand: Die fachlichen Annahmen (Entscheidungen der Entwicklung, ohne Fachprüfung) sind mit einem Büro im Probebetrieb
zu prüfen, und die Browserprüfung deckt bisher aktuelle Chromium-Browser (Chrome, Edge) ab; Firefox und Safari sind
nicht geprüft.

## Demo

Die Demo läuft als statische Seite auf GitHub Pages: `https://<nutzer>.github.io/<repo>/` (Platzhalter, bis Pages für
das Repository eingeschaltet ist). Der Workflow `.github/workflows/pages.yml` baut bei jedem Stand auf `main` mit dem
Basis-Pfad `/<repo>/` und veröffentlicht ihn.

## Erste Schritte

1. Die Demo im Browser öffnen (aktuelles Chrome oder Edge, Fensterbreite ab 1280 px).
2. Die Startseite bietet drei Wege: „Beispielprojekt laden“ (ein fertiges, erfundenes Projekt zum Ausprobieren), mit einer
   GAEB-Datei beginnen (die App legt dafür ein Projekt an und liest das LV ein) oder ein leeres Projekt anlegen und im
   Leistungsverzeichnis Positionen erfassen.
3. Eine Sicherung als Datei ablegen: Die Daten liegen nur im Browser dieses Geräts. Die App erinnert an Sicherungen.

## Entwicklung

Voraussetzung: Node 22 und pnpm 10. Mit `pnpm install` starten, dann:

- `pnpm dev` startet die App, `pnpm build` baut sie. Mit `VITE_BASE=/<repo>/ pnpm build` entsteht der Build für einen
  Unterpfad (GitHub Pages); `VITE_BASE` ist leer oder `/` für den Hauptpfad.
- `pnpm lint` (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean-Room), `pnpm typecheck`, `pnpm test` (Vitest) und
  `pnpm e2e` (Playwright, baut die App selbst) sind in der CI Pflicht. Dazu prüft
  `pnpm --filter @tethys/web run probe:basispfad`, dass der Build mit Basis-Pfad unter dem Pfad lädt.
- Playwright-Browser einmalig mit `pnpm --filter @tethys/web exec playwright install chromium` holen; oder
  `PW_CHROMIUM_PATH` auf ein vorhandenes Chromium setzen.
- Version und Build-Stand (kurzer Commit-Hash, Datum des Commits) setzt Vite beim Bauen; in Tests gilt ein Ersatzwert.

## Paketregeln

Abhängigkeiten laufen nur in eine Richtung: `vertrag` ← `dezimal`/`kern` ← Fachpakete (`speicher`, `gaeb`, …) ←
`apps/web`; Fachpakete importieren einander nie, `ui-basis` kennt keine Fachlogik. Die erlaubten Importe je Paket
stehen in `tools/boundaries.mjs` und werden von `pnpm lint` geprüft; ein neues Paket muss dort eingetragen werden.
Verbindliche Regeln: `docs/regeln.md`, Arbeitsplan: `.scratch/ava-oss/plan.md`, Mitarbeit: `CONTRIBUTING.md`.

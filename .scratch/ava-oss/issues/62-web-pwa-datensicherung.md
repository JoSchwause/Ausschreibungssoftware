# 62: S4: PWA-Installation, offline, Datensicherung (Export-Erinnerung, Sicherungsordner)

Status: ready-for-agent
Type: task
Welle: 4 · Strang: S4 · Paket: `apps/web` (Ordner `src/sicherung/`, dazu `vite.config.ts`, `index.html`, `public/`; in
gemeinsamen Dateien wie `App.tsx`, `main.tsx`, `ui/Huelle.tsx` nur je eine markierte Einhängestelle, D-20)
Blocked by: –
Regeln: A1, U7, Q5, G-03, G-53, C5, U4, U6
Herkunft: `plan.md` §2 S4 („PWA-Installation, Offline, Datensicherung. Export-Erinnerung und Sicherungsordner (G-03)“)

## What to build

1. **Installierbar und offline.** Web-App-Manifest (Name „Tethys AVA“, Arbeitsname G-07; eigene einfache Icons, keine
   fremden Assets, U4/C1) und Service Worker, der nach dem ersten Laden alle Bündel (JS, CSS, WASM von SQLite, Schriften)
   vorhält, sodass die App ohne Netz startet. Basis-Pfad beachten (GitHub Pages, G-53: `import.meta.env.BASE_URL`).
   Vorschlag: `vite-plugin-pwa` (MIT) mit `generateSW`; Lizenzprüfung (C5) muss grün bleiben. Ein neuer Stand der App
   wird nicht still mitten in der Arbeit aktiviert: Hinweis „Neue Version verfügbar – neu laden“ (Toast aus `ui-basis`).
2. **Export-Erinnerung (G-03).** Die App merkt sich je Projekt den Zeitpunkt des letzten Projektdatei-Exports (der
   Export existiert, Ticket 38; Ort: `ProjektSeite`/`ProjektlisteSeite`). Liegt er länger als eine Schwelle zurück (Vorschlag
   7 Tage; Konstante an einer Stelle) **und** gab es seitdem Befehle, zeigt die Projektliste einen nicht sperrenden Hinweis
   mit Knopf „Jetzt sichern“. Wo die Zeitpunkte liegen, entscheidest du (Vorschlag: `localStorage`, je Projekt-ID; keine
   Änderung an `vertrag`/`speicher`). Uhrzeit nur in der App, nie in `kern` (A2).
3. **Sicherungsordner (G-03, nur Chromium).** Über die File System Access API (`showDirectoryPicker`) wählt der Nutzer
   einen Ordner; die App schreibt danach bei „Jetzt sichern“ und – wenn eingeschaltet – automatisch nach jedem n-ten Befehl
   bzw. beim Verlassen der Seite die Projektdatei (JSON, vorhandener Export) als `<Projektname>-<Datum>.tethys.json` dorthin.
   Ordner-Handle in IndexedDB; fehlt die Berechtigung nach einem Neustart, fragt die App beim nächsten Sichern neu.
   Andere Browser: Funktion nicht angezeigt, nur der normale Export (G-03).
4. Einstellungen „Datensicherung“ (Ordner wählen/entfernen, automatisch an/aus) als Dialog aus der Projektliste.

## Grenzen

- Kein Eingriff in `speicher`, `vertrag`, `kern`. Der Export geht über den vorhandenen Weg der App.
- Service Worker darf die E2E nicht stören (im Dev-Server aus, im Build an; `playwright.config.ts` prüfen).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] `pnpm build` erzeugt Manifest und Service Worker; ein E2E (gegen `vite preview`) lädt die App, schaltet das Netz ab
      (`context.setOffline(true)`), lädt neu und sieht die Projektliste
- [ ] Erinnerung: Unit-Test der Regel (Schwelle, „seitdem Befehle“) und ein E2E mit vorgestelltem Zeitstempel
- [ ] Sicherungsordner: Unit-Test des Dateinamens und der Schreiblogik gegen eine Attrappe der API; E2E nur, wenn die API
      im Headless-Chromium bedienbar ist (sonst im Ticket begründen)
- [ ] Lizenzprüfung grün; `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und
      `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Synchronisation, Server, Sicherung des OPFS als Datenbankdatei, Wiederherstellen aus dem Ordner (Import gibt es schon).

## Comments

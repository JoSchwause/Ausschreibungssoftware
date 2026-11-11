# 62: S4: PWA-Installation, offline, Datensicherung (Export-Erinnerung, Sicherungsordner)

Status: claimed
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

### D-62.1 Wo liegen Zeitpunkt und „seitdem Befehle“?
Frage: Wo merkt sich die App den letzten Export, und woher weiß sie, ob es seitdem Befehle gab?
Entscheidung: Zeitpunkt in `localStorage` je Projekt-ID (`tethys.sicherung.letzterExport.<id>`), Einstellungen unter `tethys.sicherung.einstellungen`. „Seitdem Befehle“ liest die App aus dem Befehlsprotokoll (`speicher.protokoll`, `wann`), das nur geladen wird, wenn die Schwelle überschritten ist. Gab es noch nie einen Export, ist der erste Befehl der Bezugspunkt. Schwelle (7 Tage) und „nach jedem 20. Befehl“ stehen als Konstanten in `src/sicherung/regel.ts`.
Grund: Keine Änderung an `vertrag`/`speicher`; das Protokoll überlebt Neuladen und ist die einzige dauerhafte Befehlsquelle.

### D-62.2 Befehle zählen für das automatische Sichern
Frage: `Befehlsweg` kennt nur Hörer für Undo/Redo; wie zählt `sicherung/` Befehle ohne Eingriff in `lv/`?
Entscheidung: `SicherungsAnbieter` hüllt `u.speicher.anwenden` zur Laufzeit ein (jeder Befehl, auch Undo/Redo, geht dort durch, A5) und stellt es beim Abbau zurück. Ist der Speicher nicht beschreibbar, entfällt nur das Zählen. Beim Verlassen der Seite (`visibilitychange` nach „hidden“, `pagehide`) wird alles Offene gesichert.
Grund: Hält die Einhängestellen in gemeinsamen Dateien kurz (D-20).
Nachtrag (Review Welle 4, D-30): Die Laufzeit-Hülle ist ersetzt durch einen Hörer am Befehlsweg (`nachJedemEintrag` in `lv/befehlsweg.ts`; alle Schreibzugriffe der App gehen über `eintragSchreiben`). Ohne Paketänderung.

### D-62.3 Sicherungsordner: Grenzen und Test
Entscheidung: Fehlt die Berechtigung, fragt „Jetzt sichern“ neu (Nutzeraktion) und fällt bei Ablehnung auf den Download zurück; das automatische Sichern fragt nie nach und meldet einmal je Sitzung. Der Ordner-Handle liegt in IndexedDB (`tethys-sicherung`). Der E2E nutzt einen Ordner im OPFS statt des Systemdialogs, eingepackt in ein nicht klonbares Objekt: Das headless Chromium dieses Containers stürzt ab, sobald es einen Dateisystem-Handle aus IndexedDB liest. Das Merken über einen Neustart ist daher nur von Hand prüfbar.

### D-62.4 PWA
Entscheidung: `vite-plugin-pwa` (MIT) mit `generateSW`, `registerType: 'prompt'`, nur im Build (der E2E läuft gegen `vite preview` und ist damit mit Service Worker getestet). Manifest und Icons (PNG 192/512 aus `icon.svg`, eigene Gestaltung) erzeugt der Build mit `base`. Neue Abhängigkeiten als Dev-Abhängigkeiten: `vite-plugin-pwa`, `workbox-build`, `workbox-window` (Peers des Plugins). „Neue Version verfügbar“ ist ein eigenes Banner mit „Neu laden“, weil der Toast aus `ui-basis` keine Schaltfläche trägt.

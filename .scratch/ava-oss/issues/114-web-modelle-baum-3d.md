# 114: X1a+b in der App: Modelle einlesen, Baum ↔ 3D, Eigenschaften

Status: done-by-agent
Type: task
Welle: 6 · Strang: X1a, X1b · Ordner: `apps/web/src/bim/` (neu); Einhängestellen in `App.tsx`, `projekt/ProjektSeite.tsx`,
`historie/arten.ts` (markiert `// Ticket 114`, D-20); PWA-/Vite-Einstellungen der App für WASM und Worker
Blocked by: 100, 106, 107
Modell: opus
Regeln: ADR 0001, A5, U1–U8, Q2, Q4, Q5, D-20, D-50, D-51, D-54
Herkunft: `plan.md` §2 X1a, X1b; Tor X1-Kern (`plan.md` §4, D-58)

## What to build

1. **Modelle des Projekts** (`/projekt/<id>/modelle`): Liste (Name, Datei, Schema, eingelesen, Zahl der Bauteile, Vorgänger),
   „IFC einlesen…“, „Neuer Stand…“ (setzt `vorgaengerId`), Umbenennen, Löschen mit Bestätigung (Q5, Anfangsfokus
   „Abbrechen“). Link von der Projektseite.
2. **Einlesen.** Datei wählen → Größe prüfen (über ~200 MB Befund, keine Sperre, D-51) → in einem **Web Worker** mit `ifc`
   lesen und abbilden → `speicher.modelldateien.ablegen(bytes)` → `BauwerksmodellAnlegen` über den Befehlsweg (`bim`
   führt aus, ein Undo-Schritt) → Befunddialog (doppelte GlobalIds, fehlende Mengen, Bauteile ohne Geometrie aus
   `ui-modell`). Das Datum `eingelesen` kommt hier von der Uhr der App (Rand).
3. **Modellseite** (`/projekt/<id>/modelle/<mid>`): links der **Modellbaum** im `VergleichsGrid` (U2): Struktur (Projekt …
   Geschoss, Raum) mit den Bauteilen darunter, Spalten Klasse, Name, Typ und je eine Spalte für gängige Mengen (Länge,
   Fläche, Volumen); rechts die **3D-Ansicht** (`ui-modell`, Bytes aus `modelldateien.laden`). Auswahl synchron in beide
   Richtungen: Zeile aktiv → Bauteil hervorgehoben (Strukturknoten: alle Bauteile darunter); Klick im 3D → Sprung zur Zeile
   (`sprungziel`), Strg+Klick ergänzt. **Eigenschaften** der Auswahl (Psets bei Bedarf aus den Bytes über `ifc` im Worker,
   D-51) in einer Leiste. Sichtbarkeit: Ausblenden, Isolieren, „alles zeigen“, je Geschoss und je Klasse.
4. **Undo/Redo** der Modellbefehle (Eintrag in der Tabelle `historie/arten.ts` mit Umkehrung und Sprungziel), Neuladen
   behält alles samt 3D (Bytes aus dem Speicher).
5. **PWA und Sicherheit:** die WASM-Datei von web-ifc gebündelt und vom Service Worker vorgehalten (kein CDN, ADR 0001;
   `maximumFileSizeToCacheInBytes` passend), CSP für WASM (`'wasm-unsafe-eval'` o. ä., wie Ticket 100 es nennt), das Bündel
   der Modellseite erst beim Öffnen laden (dynamischer Import), damit der Start der App nicht langsamer wird.
6. **E2E** `apps/web/e2e/bim.spec.ts`: `fixtures/ifc/haus-v1.ifc` einlesen → Baum zeigt EG/OG und Bauteile → Auswahl im Baum
   hebt im 3D hervor, Klick im 3D wählt im Baum (über den Testhaken von `ui-modell`, nie Pixel, D-58) → Pset sichtbar →
   Neuladen behält Modell und 3D → Undo des Einlesens.

## Grenzen

- Zuordnen, Mengen, Kennwerte und Aufmaß macht Ticket 115 (gleicher Ordner, danach), den Vergleich Ticket 116. Keine Logik, die in
  `ifc`, `bim` oder `ui-modell` gehört. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Unit-Tests der Logik (Baumzeilen, Auswahlabgleich, Befunde), E2E `bim.spec.ts` grün; bestehende App-E2E grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Ergebnis (Branch `welle-6/114-web-bim`, Basis `integration/welle-6`, zuletzt gemergt bei `101010c`)

Ordner `apps/web/src/bim/` (neu); Einhängestellen `// Ticket 114` in `App.tsx` (Route, Modellseite per `lazy`),
`projekt/ProjektSeite.tsx` (Link „Modelle“), `historie/arten.ts` (Zeile `bauwerksmodell`: Umkehrung aus `bim`, Ziel `bimZiel`);
`vite.config.ts` (CSP-Plugin nur im Build, `optimizeDeps.exclude` web-ifc, Kommentar zum Vorhalten); `apps/web/package.json`
(+ `@tethys/bim`, `@tethys/ifc`, `@tethys/ui-modell`, Lockfile); Marker „Folgeticket 106“ in `lv/texte.ts` entfernt (Hinweis 106).

- **Modelle** `/projekt/<id>/modelle` (`ModellListeSeite.tsx`): Tabelle „Bauwerksmodelle“ (Name als Link, Datei, Schema, Eingelesen,
  Bauteile, Vorgänger), „IFC einlesen …“ (verstecktes `<input type=file>` mit Label „IFC-Datei wählen“), je Zeile „Neuer Stand …“
  (setzt `vorgaengerId`), „Umbenennen“, „Löschen“ (Bestätigung, Anfangsfokus „Abbrechen“). Nach dem Einlesen Dialog „Modell
  eingelesen“ / „Datei nicht eingelesen“ mit Befunden und „Modell öffnen“.
- **Einlesen** (`einlesen.ts`, `modellEinlesen`): Größe (> 200.000.000 Bytes: Warnung `datei-gross`) → `lesen` im Worker
  (`ifc-worker.ts`/`ifc-arbeiter.ts`/`ifc-auftrag.ts`, `bauwerksmodellLesen`) → `modelldateien.ablegen` → `BauwerksmodellAnlegen`
  über `bauwerksmodellSitzung` (ein Undo-Schritt). Tag des Einlesens aus `u.uhr()` in Ortszeit.
- **Modellseite** `/projekt/<id>/modelle/<mid>` (`ModellSeite.tsx`, eigenes Bündel samt three.js; web-ifc-Worker und WASM ebenfalls
  nur dort): `VergleichsGrid` „Modellbaum“ (Spalten Name [Baum], Klasse, Typ, Länge, Fläche, Volumen) links, `Modellansicht`
  rechts (Region „3D-Ansicht“), darunter Region „Eigenschaften“ (Allgemein, Mengen aus dem Modell, Psets je Satz als Region
  mit dem Satznamen, Klassifikationen, Materialien; aus dem Eigenschaftsindex im Worker) und Region „Befunde“ (Bauteile ohne
  Geometrie aus dem Ladebericht, je mit „Im Baum zeigen“). Werkzeugleiste: Undo/Redo, „Auswahl ausblenden“, „Auswahl isolieren“,
  „Alles zeigen“, je Geschoss und je Klasse „Nur diese zeigen“/„Ausblenden“.

**Öffentliche Stücke für 115/116** (alles in `apps/web/src/bim/`):

- `pfad.ts`: `modellePfad`, `modellPfad`, `bimRoute` (Arten `liste`, `modell`; 115/116 ergänzen weitere Arten hier), `bimZiel`.
- `baum.ts`: `modellbaumBauen(modell): Modellbaum` (`knoten`, `kinder`, `eltern`, `zeileVon(globalId)`; Zeilenkennungen `s<i>`/`b<i>`
  nach Platz im Modell, Gruppe `OHNE_STRUKTUR`), `sichtbareZeilen(baum, zugeklappt)`, `BAUM_SPALTEN`, `spaltenmenge`, `vorfahren`,
  `globalIdDerZeile`. Eine Spalte „Position“/Färbung für 115 kommt als weitere Spalte bzw. Zelle dazu.
- `auswahl.ts`: der Auswahlstand der Seite (`Auswahlstand { auswahl, aktiveZeile, sprungziel, erwartet, zugeklappt }`,
  `AUSWAHL_START`, `beiZeileAktiv`, `beiKlick3d`, `beiAufklappen`, `auswahlDerZeile`). `stand.auswahl` (GlobalIds) ist die
  Auswahl für „Aufmaßblatt aus Auswahl“ (115).
- `sichtbarkeit.ts`: `Sichtbarkeit`, `ALLES_SICHTBAR`, `ausblenden`, `isolieren`, `geschosse(baum)`, `klassen`, `bauteileDerKlasse`.
- `befunde.ts` + `BefundListe.tsx`: `geometriebefunde`, `befundliste`, `befundzusammenfassung`; Liste mit Sprung (`onSprung`).
- `schreiben.ts`: `bauwerksmodellBefehlAnwenden`, `bauwerksmodellSitzung`, `bauwerksmodellLaden`; `ifc-arbeiter.ts`: `IfcArbeiter`
  (`lesen`, `indexBauen`, `eigenschaften`, `beenden`).
- In `ModellSeite.tsx` heißt die innere Komponente `Arbeitsflaeche`; `faerbung` steht heute fest auf einer leeren Map
  (`KEINE_FAERBUNG`) – 115 (ohne Zuordnung, zugeordnet) und 116 (Vergleich) setzen sie dort.
- Testhaken (nur Test-Build, `VITE_TESTPFAD=1`): `window.tethysModell` (`testhaken.ts`) mit `darstellung()`, `punkt(globalId)`,
  `gezeichnet()`, `auswahl()`; E2E klickt mit `page.mouse.click` an `punkt(...)`. Die aktive Baumzeile ist die Zelle mit
  `tabindex="0"`; Zellen mit Unterknoten heißen „Zuklappen <Name>“ (siehe Hilfe `zelle` in `e2e/bim.spec.ts`). WebGL: die Spec setzt
  per `test.use` `--use-angle=swiftshader --enable-unsafe-swiftshader` (die gemeinsame `playwright.config.ts` bleibt unberührt).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-114.0 Prüfnähte.** Reine Module (`baum`, `auswahl`, `sichtbarkeit`, `befunde`, `pfad`, `ifc-auftrag`) mit Unit-Tests, dazu
  `modellEinlesen` samt Umbenennen/Löschen/Undo gegen den echten Speicher (In-Memory-SQLite) mit `haus-v1.ifc`/`haus-v2.ifc`; Oberfläche
  und 3D über die E2E. Grund: wie D-89/D-106.0, öffentliche Flächen, autonom bestätigt.
- **D-114.1 Worker.** Ein `IfcArbeiter` (Modul-Worker) je Einlesen und je offener Modellseite, danach beendet; der Index bleibt im Worker,
  jede Abfrage 0,05 ms (D-107). Grund: `ifc` nie im Hauptbündel; Speicher wird frei.
- **D-114.2 Reihenfolge Lesen → Ablegen.** Erst lesen (mit leerem Hash im Kopf), dann `ablegen`, dann den Hash in `datei` einsetzen und
  `BauwerksmodellAnlegen` schreiben. Grund: Eine Datei ohne Modell lässt keine Bytes zurück; `ifc` übernimmt den Kopf unverändert
  (D-107.3), `bim` und `speicher` prüfen Hash und Größe. Alternative: zuerst ablegen (Bytes bis zum nächsten Öffnen).
- **D-114.3 Mengenspalten.** Länge: Menge `Length`, sonst die erste der Art; Fläche und Volumen: die erste, deren Name mit `Net` beginnt,
  sonst die erste der Art; Tooltip nennt den Mengennamen. Grund: Ticket nennt „gängige Mengen“; ohne Satzwahl eindeutig und sichtbar.
- **D-114.4 Auswahlabgleich.** Die App hält die Auswahl. Zeile aktiv → alle Bauteile der Zeile und darunter (Teile unter ihrem Ganzen,
  Gruppe „Ohne Strukturknoten“) aus dem Baum; Klick im 3D → Auswahl, Vorfahren aufklappen, `sprungziel`; die eine erwartete Meldung
  der Sprungzeile ändert die Auswahl nicht (sonst ersetzte sie Strg+Klick-Auswahlen). Die erste aktive Zeile nach dem Laden wählt
  nichts (das Grid meldet ohne Klick die erste Zeile; sonst wäre beim Öffnen das ganze Modell hervorgehoben). Eigenschaften zeigen das
  Objekt der aktiven Zeile, bei mehreren dazu „n Bauteile ausgewählt“.
- **D-114.5 Sichtbarkeit.** Isolieren ersetzt ein früheres Ausblenden; Ausblenden sammelt; „Alles zeigen“ setzt beides zurück; Isolieren
  ohne Bauteile ändert nichts.
- **D-114.6 Undo-Ziel.** Jede Änderung eines Modells ist in der Liste sichtbar: dorthin, außer bei einem Umbenennen auf der Seite des
  Modells (dort bleiben). Ist das Modell nach dem Teil weg, verlässt die App seine Seite.
- **D-114.7 Befunde ohne Geometrie.** Der Dialog des Einlesens zeigt die Befunde von `ifc` (und die Größe); „Bauteil ohne Geometrie“ kennt
  erst die 3D-Ansicht und steht deshalb auf der Modellseite (Region „Befunde“, mit Sprung). Grund: Beim Einlesen läuft keine Geometrie.
- **D-114.8 CSP.** Meta-CSP nur im Build (Vite-Plugin): `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';
  connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri
  'self'`. `'unsafe-inline'` nur für Stile (React/Radix setzen `style`). Der Entwicklungsserver bleibt ohne (Inline-Skripte von Vite).
  Geprüft mit `ausgabe`, `sicherung`, `start`, `huelle`, `leistung` (alle grün).
- **D-114.9 Bündel.** Modellseite per `lazy` (three.js im Teil `ModellSeite-*.js`, 553 kB); Hauptbündel ohne three.js; vorgehalten werden
  `geometrie-worker-*.js` (3,5 MB) und `web-ifc-*.wasm` (1,6 MB), beide unter 16 MB. `bim` liegt im Hauptbündel (Undo-Tabelle), klein und
  rein.

### Prüfung

- Unit (`apps/web/src/bim`, 8 Dateien, 38 Tests; mit `historie` 52): grün.
- E2E `PW_WEB_PORT=4231 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test e2e/bim.spec.ts`:
  3/3 grün (Einlesen, Baum EG/OG, Baum → 3D: EG hebt genau die 17 EG-Bauteile hervor, 3D-Klick → Auswahl und aktive Baumzeile,
  `Pset_WallCommon`/`IsExternal`, Isolieren, Neuladen mit 3D; Undo/Redo des Einlesens; Umbenennen, Löschen mit Fokus auf „Abbrechen“
  und Undo).
- Bestehende App-E2E: `leistung.spec.ts` 3/3 grün (Median 48 / 39 / App 23 ms), dazu `ausgabe`, `sicherung`, `start`, `huelle` (CSP) –
  19/19 grün.
- Suite nach dem Merge von `integration/welle-6` (`101010c`): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` grün (ESLint,
  Prettier, Paketgrenzen, Lizenzen, Clean Room), `pnpm typecheck` grün, `pnpm test` (Vitest): 297 Dateien grün, 1 übersprungen wie zuvor,
  3.803 Tests bestanden; 2 Zeitbudgets fremder Pakete rot nur in der vollen Suite bei Last ≈ 12–14 auf 4 Kernen: `gaeb/lesen` „Datei über
  2 MB unter 1 s“ (1.779 ms) und `speicher/aufmass-leistung` (Median < 100 ms). Beide Dateien allein wiederholt: 85/85 grün.
  `node --test "fixtures/*.test.mjs"` 53/53. Kein Budget gelockert, kein Test übersprungen.

### Offen / Hinweise

- `lv/ids.ts` trägt noch den gemeinsamen Marker „v1.6 … Tickets 114, 118–120“ (Kennungen); er gehört den übrigen App-Tickets mit.
- Laden eines 10k-Modells auf der Modellseite (SHOULD 11, D-66) nicht eigens in der App gemessen; `speicher` misst `laden` mit 44 ms, die
  Leinwand 2,5 s (Ticket 100, 106).
- Glossarzeile „Modellansicht“ (D-100.1) bleibt beim Orchestrator.

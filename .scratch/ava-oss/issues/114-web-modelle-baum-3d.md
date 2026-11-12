# 114: X1a+b in der App: Modelle einlesen, Baum ↔ 3D, Eigenschaften

Status: ready-for-agent
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

- [ ] Unit-Tests der Logik (Baumzeilen, Auswahlabgleich, Befunde), E2E `bim.spec.ts` grün; bestehende App-E2E grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

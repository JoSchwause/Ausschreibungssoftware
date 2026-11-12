# 100: X1b: 3D-Ansicht des Modells im Browser (`ui-modell`)

Status: resolved
Type: task
Welle: 6 · Strang: X1b · Paket: `packages/ui-modell` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien, `REUSE.toml` falls
nötig)
Blocked by: –
Modell: opus
Regeln: ADR 0001, ADR 0004, U1, U3, U4, U6, U8, Q2, Q4, C5, D-50, D-54
Herkunft: `plan.md` §2 X1b („3D-Ansicht im Browser: Auswahl, Sichtbarkeit, Isolieren“), Berater D-50, D-54

## What to build

Ein UI-Paket mit **nur der 3D-Leinwand**: Es nimmt die Bytes einer IFC-Datei, erzeugt die Geometrie mit **web-ifc 0.0.78**
(MPL-2.0, WASM) und zeichnet sie mit **three.js 0.186.1** (MIT); beide genau so gepinnt (D-50). Es importiert nur `vertrag` und
`ui-basis` (`'packages/ui-modell': ['packages/vertrag', 'packages/ui-basis']`, `apps/web` darf es importieren). Der Modellbaum
und die Eigenschaften stehen **nicht** hier, sondern in der App auf `ui-grid` (U2); die Leinwand kennt Bauteile nur über ihre
GlobalId.

1. **Komponente** (Name nach Glossar, z. B. `Modellansicht`): Eingaben `datei: Uint8Array`, `auswahl: readonly string[]`
   (GlobalIds), `ausgeblendet`, `isoliert: readonly string[] | null`, `faerbung` (GlobalId → Kennzeichen wie
   `hinzugefuegt`, `entfernt`, `geaendert`, `zugeordnet`, `ohne-zuordnung`; Farben nur über Design-Tokens, hell und dunkel,
   U4); Ereignisse `onAuswahl(globalIds, { hinzufuegen: boolean })` (Klick, Strg+Klick), `onGeladen({ mitGeometrie,
   ohneGeometrie, dauerMs })`, `onFehler`. Befehle über eine Ref: „Auswahl zeigen“ (Kamera auf die Auswahl), „Ansicht
   zurücksetzen“.
2. **web-ifc in einem Web Worker**, Single-Thread-Build (keine COOP/COEP-Kopfzeilen nötig). Die WASM-Datei wird mit dem Paket
   gebündelt und später vom Service Worker vorgehalten, nie von einem CDN geladen (ADR 0001); prüfe die CSP der App für WASM
   und nenne nötige Änderungen im Ticket (die App-Seite macht Ticket 114). GlobalId je Bauteil über web-ifc lesen
   (`expressID` → `GlobalId`). Bauteile, die web-ifc ohne Geometrie liefert, meldet `onGeladen` (die App gleicht über die
   GlobalId mit dem eigenen Leser ab, D-50).
3. **Zeichnen für große Modelle.** Geometrie je Material zusammenfassen (z. B. `BatchedMesh` oder zusammengeführte Puffer mit
   Bereichen je Bauteil), damit 10.000 Bauteile flüssig bleiben; Hervorheben, Ausblenden und Isolieren je Bauteil ohne neues
   Laden. **Picken über einen CPU-Raycast** (three.js, gern mit `three-mesh-bvh` 0.9.16, MIT), nicht über GPU-Rückleseweg.
4. **Bedienung (U3, U8).** Maus: drehen, verschieben, zoomen. Tastatur auf der fokussierbaren Leinwand: Pfeile drehen,
   Umschalt+Pfeile verschieben, `+`/`-` zoomen, `F` „Auswahl zeigen“, `Pos1` zurücksetzen; sichtbarer Fokus, Name für den
   Screenreader mit der Zahl der Bauteile und der Auswahl. Der barrierefreie Weg zur Auswahl ist der Baum der App; die
   Leinwand ist Ergänzung.
5. **Testhaken.** Für E2E eine kleine Prüfschnittstelle nur im Prüfstand (`e2e/harness`, nie ausgeliefert): Auswahl, sichtbare
   und isolierte Bauteile lesen, Bildschirmpunkt der Mitte eines Bauteils für einen Klick. Tests prüfen Zustand, nie Pixel
   (D-58).
6. **Prüfstand und E2E** wie `ui-grid` (`e2e/harness`, eigene `playwright.config.ts`, `pnpm --filter @tethys/ui-modell e2e`,
   `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`; WebGL in Headless-Chromium über SwiftShader, Startschalter im Ticket
   nennen). Modell: `fixtures/ifc/haus-v1.ifc` (Ticket 99), sobald es auf `integration/welle-6` liegt; bis dahin ein kleines
   selbst verfasstes IFC mit extrudierten Körpern im Prüfstand.
7. **Leistung (Q4, D-54).** Mit dem Erzeuger `fixtures/ifc/erzeugen.mjs` (Ticket 99, 10.000 Bauteile): Laden bis zur ersten
   vollständigen Darstellung ≤ 20 s, Picken bis Hervorhebung ≤ 200 ms, je Median aus mehreren Läufen in Headless-Chromium;
   keine Bildraten-Schranke. Liegt der Erzeuger bei Abschluss noch nicht vor, miss mit einem eigenen Erzeuger im Prüfstand und
   nenne es im Ticket.

## Grenzen

- Nur `packages/ui-modell` (und die genannten Wurzeldateien). Keine Fachlogik, kein Speicher, kein Baum (U2).
- Abhängigkeiten genau gepinnt, Lizenzprüfung grün (C5); MPL-2.0 steht in `tools/licenses.mjs`. `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [x] E2E im Prüfstand: Laden, Auswahl über die Eingabe hebt hervor, Klick auf ein Bauteil meldet seine GlobalId, Strg+Klick
      ergänzt, Ausblenden, Isolieren, Färben, Tastatur, dunkles Schema; Leistungstest mit 10.000 Bauteilen im Budget
- [x] Unit-Tests der reinen Teile (Zuordnung `expressID` ↔ GlobalId, Auswahlzustand, Tastenbelegung)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (Budgets anderer Pakete nur allein, siehe Prüfung)

## Comments

Branch `welle-6/100-ui-modell`. Paket `packages/ui-modell` (`@tethys/ui-modell`): `Modellansicht` (React), Geometrie-Worker
(web-ifc 0.0.78), Leinwand (three.js 0.186.1), reine Teile mit Unit-Tests, Prüfstand `e2e/harness` mit eigenem
`playwright.config.ts` (Port 4185, `PW_MODELL_PORT`). Neue Abhängigkeiten genau gepinnt: `web-ifc@0.0.78` (MPL-2.0),
`three@0.186.1` (MIT), dev `@types/three@0.186.0` (MIT); alle mindestens zwei Wochen alt; Lizenzprüfung grün.
`tools/boundaries.mjs`: `'packages/ui-modell': ['packages/vertrag', 'packages/ui-basis']`, `apps/web` darf es importieren.

### Entscheidungen

- **D-100.1** (L2, P2) Name und Glossar? **Komponente `Modellansicht`, Ref-Typ `ModellansichtRef`, Kennzeichen-Typ
  `Bauteilkennzeichen`; kein Glossareintrag in diesem Ticket.** Grund: „Modellansicht“ ist ein Oberflächenname, die
  Fachwörter Bauteil und GlobalId bringt Ticket 98 ins Glossar; `GLOSSARY.md` gehört nicht zu diesem Paket (P2).
  Vorschlag an den Orchestrator: unter „BIM & IFC“ eine Zeile „Modellansicht: die 3D-Leinwand der App (`ui-modell`)“.
- **D-100.2** (D-50) Was ist ein Bauteil der Leinwand? **Jedes IfcElement (web-ifc `GetLineIDsWithType(…, IFCELEMENT,
  true)`) außer `IfcOpeningElement`, `IfcOpeningStandardCase`, `IfcVoidingFeature`, `IfcVirtualElement` (wie der Leser in
  Ticket 98); Räume, Geschosse, Gebäude und Grundstück werden nicht gezeichnet.** web-ifc' `IsIfcElement` meldet auch die
  Raumstruktur, daher die eigene Liste. `onGeladen` nennt `mitGeometrie` und `ohneGeometrie` als GlobalId-Listen, jede GlobalId
  einmal; eine doppelte GlobalId zeichnet beide Bauteile, Auswahl, Ausblenden und Färben treffen beide.
- **D-100.3** (D-58) Prüfzugang? **Die Ref trägt neben „Auswahl zeigen“ und „Ansicht zurücksetzen“ drei lesende Methoden:
  `darstellung()` (Sichtbarkeit, Hervorhebung, Farbe je GlobalId, Hintergrund, Kamera, Bildzahl, gelesen aus den Puffern der
  Szene), `bildschirmpunkt(globalId)` (ein Punkt, an dem ein Klick das Bauteil trifft, per Raycast geprüft, möglichst die
  Mitte) und `gezeichnet()` (Promise bis zum nächsten Bild). Der Haken `window.__modell` steht nur im Prüfstand.** Grund: Tests
  prüfen Zustand statt Pixel; der Testpfad der App (Ticket 117) kann dieselben Methoden nutzen.
- **D-100.4** (U4, U8) Farben? **Rollen in `modellansicht.css` als Variablen auf Tokens von ui-basis: Hintergrund
  `surface-sunken`, Auswahl `focus`, hinzugefügt `success`, entfernt `danger`, geändert `warning`, zugeordnet `accent`, ohne
  Zuordnung `warning`.** Geändert (Modellvergleich) und ohne Zuordnung (Zuordnung) teilen sich die Warnfarbe, weil beide
  Färbungsarten nie zugleich erscheinen und die Tokens keine sechste gut unterscheidbare Farbe haben. Vorrang: Auswahl vor
  Färbung, ausgeblendet vor isoliert. Ein Unit-Test prüft je Schema mindestens 3 : 1 gegen den Hintergrund (WCAG 1.4.11)
  und verschiedene Farben je Färbungsart. Schemawechsel über `data-theme` (MutationObserver), ohne neues Laden. Die Farben
  aus der IFC-Datei sind Modelldaten und bleiben.
- **D-100.5** (Q4, D-54) Zeichnen großer Modelle? **Je Deckung (deckend, durchsichtig) ein zusammengeführter Puffer mit
  Bereichen je Teil und genau ein Zeichenaufruf; Farbe je Ecke im Puffer; ein ausgeblendetes Teil bekommt entartete Dreiecke
  in seinem Indexbereich; kleine Änderungen laden nur ihre Bereiche hoch.** Grund: Der erste Stand mit `BatchedMesh` (eine
  Teilzeichnung je Bauteil) brauchte mit 10.000 Bauteilen in SwiftShader rund 850 ms je Bild; die Bildzeit wuchs mit der
  Zahl der sichtbaren Bauteile (isoliert 500: 50 ms). Grenze: Glasteile werden nicht je Teil nach Tiefe sortiert (Glas hinter
  Glas kann falsch mischen).
- **D-100.6** (Q4) Material und Kantenglättung? **Eigener kleiner Shader mit Licht je Ecke (die Teile sind eben, Normale je
  Fläche, also ohne Verlust), Rückseiten deckender Teile werden verworfen (Glas beidseitig), Kantenglättung (MSAA) nur mit
  GPU; Software-Rasterung (SwiftShader, llvmpipe, „Software“) erkennt die Leinwand am Renderer-Namen.** Gemessen (10.000
  Bauteile, Last ≈ 13 auf 4 Kernen): ohne MSAA und mit Rückseitenverwerfen fiel die Bildzeit von ≈ 950 ms auf ≈ 280 ms, der
  Shader brachte den Rest. `failIfMajorPerformanceCaveat` meldet SwiftShader in Chromium 153 nicht und taugt nicht als
  Erkennung. Folge: Flächen mit falscher Orientierung (bei web-ifc-Geometrie nicht gesehen) fehlen; später ggf. ein Schalter.
- **D-100.7** (D-50) Picken? **CPU-Raycast: erst die Grenzen je sichtbarem Teil, dann nur die Dreiecke der Teile, die der
  Strahl vor dem nächsten Treffer schneidet; ohne `three-mesh-bvh`.** Grund: wenige Millisekunden bei 10.000 Bauteilen,
  eine Abhängigkeit weniger. Klick ohne Ziehen (unter 4 px) wählt das Bauteil, Strg bzw. Cmd ergänzt, ein Klick ins Leere
  meldet `[]` (hebt auf), Strg+Klick ins Leere meldet nichts; rechte oder mittlere Taste oder Umschalt+Ziehen verschiebt.
- **D-100.8** (ADR 0001, D-50) Worker? **Ein Modul-Worker je Ladevorgang, danach beendet (gibt den WASM-Speicher frei);
  web-ifc `Init(locateFile, true)` erzwingt die Single-Thread-Bauart, die WASM-Datei kommt über `web-ifc/web-ifc.wasm?url`
  aus dem Bündel; `COORDINATE_TO_ORIGIN` gegen Float32-Ungenauigkeit; die Bytes der App werden kopiert, nicht
  übertragen.** Die Geometrie kommt als Typed Arrays zurück (übertragen, ohne Kopie). Eine Datei, die web-ifc nicht öffnet
  (auch eine leere), meldet `onFehler({ code: 'datei-nicht-lesbar' })`; fehlendes WebGL 2 `webgl-fehlt`.
- **D-100.9** (U3, U8) Tastatur und Name? **Pfeile bewegen die Kamera in Tastenrichtung um das Ziel (15°, Höhe höchstens
  ±89°), Umschalt+Pfeile verschieben um ein Zehntel des Abstands, `+`/`-` zoomen (Faktor 0,8 bzw. 1,25), `F` zeigt die
  Auswahl (ohne Auswahl nichts), `Pos1` die Startansicht (Azimut 45°, Höhe 30°); mit Strg, Alt oder Cmd bleiben Tasten beim
  Browser.** Die Leinwand ist fokussierbar (`role="application"`, sichtbarer Fokusring aus `--tx-focus-ring`), Name „3D-Ansicht
  des Modells: 7 Bauteile, 2 ausgewählt“, Bedienhilfe über `aria-describedby`.
- **D-100.10** (D-54) Leistungsmodell? **Eigener Erzeuger im Prüfstand: `grossesModell(10000)` in
  `src/testhilfe/ifc-erzeuger.ts` (IFC 4, 10 Geschosse, Wände, Stützen, Decken, Fenster mit Öffnungen, GlobalIds aus einem
  Zähler, ≈ 4,8 MB).** Grund: `fixtures/ifc/erzeugen.mjs` (Ticket 99) lag bis zum Abschluss nicht auf
  `integration/welle-6`. Messung Laden: Übergabe der Bytes bis `onGeladen` (erstes vollständiges Bild), danach GPU-Abschluss
  (ein Pixel lesen); Messung Picken: Zeigerereignisse → Raycast → `onAuswahl` → Prüfstand setzt die Auswahl → Bild mit
  Hervorhebung → GPU fertig. Je Median; drei Ladeläufe, neun Picks.
- **D-100.11** (Q2) WebGL im Prüfstand? **Headless-Chromium mit `--use-angle=swiftshader --enable-unsafe-swiftshader`
  (`playwright.config.ts`); Renderer „ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)“, WebGL 2
  mit `WEBGL_multi_draw`.** Seit Chromium 137 nimmt Chromium SwiftShader für WebGL nur mit `--enable-unsafe-swiftshader`
  (Playwright 1.65 setzt ihn schon selbst); `--use-angle=swiftshader` nimmt SwiftShader auch auf Maschinen mit GPU, damit die
  Messungen vergleichbar bleiben.

### Für die App (Ticket 114): CSP, PWA, Einbindung

- **CSP:** Die App setzt heute keine. Bekommt sie eine, braucht die Modellansicht `script-src 'self' 'wasm-unsafe-eval'`
  (WebAssembly von web-ifc; SQLite-WASM braucht dasselbe), `worker-src 'self'` (Modul-Worker als eigene Datei des Bündels,
  kein `blob:`), `connect-src 'self'` (die `.wasm`-Datei wird vom eigenen Ursprung geholt). Kein `'unsafe-eval'` (web-ifc-api
  enthält weder `eval` noch `new Function`, geprüft), kein CDN, kein COOP/COEP (Single-Thread, `crossOriginIsolated` bleibt
  `false`).
- **Auslieferung:** `.wasm` mit `Content-Type: application/wasm` (Vite tut das), sonst fällt web-ifc vom Streaming-Übersetzen
  auf den langsameren Weg zurück.
- **PWA (Workbox):** `globPatterns` enthält `js` und `wasm` schon; neu im Vorhaltespeicher sind das Worker-Bündel (≈ 3,5 MB,
  web-ifc-API samt Schema) und `web-ifc.wasm` (≈ 1,6 MB), beide unter `maximumFileSizeToCacheInBytes` (16 MB). Damit das
  Hauptbündel klein bleibt, die Modellansicht per `import()` nachladen (three.js ≈ 0,6 MB).
- **Vite der App:** `worker: { format: 'es' }` steht schon; für den Entwicklungsserver `optimizeDeps: { exclude: ['web-ifc'] }`
  ergänzen (wie im Prüfstand).
- **Einbindung:** `import '@tethys/ui-modell/modellansicht.css'` neben den Tokens; die Komponente füllt ihren Container
  (`width`/`height` 100 %), die App gibt ihm eine Größe. `faerbung` ist eine `ReadonlyMap<GlobalId, Bauteilkennzeichen>`;
  `onAuswahl` meldet nur, die App hält die Auswahl (Baum ↔ 3D).

### Prüfung und Messungen

- **Unit (Vitest, `packages/ui-modell/src`):** 8 Dateien, 57 Tests: Zuordnung expressID ↔ GlobalId und
  `Bauteilverzeichnis` (auch doppelte GlobalId), Darstellung (Sichtbarkeit, Isolieren, Vorrang der Farben, Klick-Auswahl),
  Tastenbelegung, Kamera, Geometriesammler (Lage, Normalen, Deckungsgruppen), `geometrieLesen` mit dem echten web-ifc 0.0.78
  unter Node (Öffnung abgezogen, Raum nicht gezeichnet, Platzhalter ohne Geometrie, kein IFC → `Lesefehler`), Farbrollen
  (nur Tokens, 3 : 1 hell und dunkel), Texte.
- **E2E (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/ui-modell e2e`):** 13/13 grün: Laden mit
  Bauteilen mit/ohne Geometrie und Name für Screenreader, Auswahl über die Eingabe in der Auswahlfarbe, Klick meldet die
  GlobalId, Strg+Klick ergänzt, Klick ins Leere hebt auf, Klick auf Glas trifft das Fenster, Ausblenden und Isolieren ohne
  neues Laden (Ausgeblendetes nicht anklickbar), Färbung nach Kennzeichen aus den Tokens auch nach Umschalten auf dunkel,
  Tastatur mit sichtbarem Fokus, `F` mit Abstand passend zum Bauteil, Ref-Befehle, Maus (drehen, verschieben, Rad), dunkles
  Schema von Anfang an, Datei ohne IFC → `onFehler`. Modell: selbst verfasstes kleines IFC 4 (`kleinesModell`), weil
  `fixtures/ifc/haus-v1.ifc` (Ticket 99) bis zum Abschluss nicht auf `integration/welle-6` lag; der Prüfstand liefert
  `haus-v1`/`haus-v2` unter `?modell=haus-v1` aus, sobald die Dateien da sind (Vite-Plugin), ein Test dafür fehlt noch.
- **Leistung (10.000 Bauteile, `e2e/leistung.spec.ts`, Headless-Chromium 153, SwiftShader, 4 Kerne, eigener Erzeuger
  D-100.10), Budget Laden ≤ 20 s, Picken bis Hervorhebung ≤ 200 ms, je Median:**
  - erster Stand mit `BatchedMesh` (Last ≈ 12): Laden 2.242 ms (2.403, 1.875, 2.242), Picken **661 ms** (über dem Budget) →
    D-100.5 bis D-100.7; das Budget blieb unverändert.
  - nach dem Umbau (Last ≈ 12): Laden 2.045 ms (2.157, 1.771, 2.045), Picken 123 ms (133, 128, 94, 100, 150, 123, 90, 143,
    115).
  - Endstand nach dem Merge von `integration/welle-6` (Last ≈ 23,6, andere Agenten liefen): Laden **2.524 ms** (2.665,
    2.467, 2.524), Picken **147 ms** (150, 148, 118, 154, 156, 147, 134, 143, 118).
- **Suite** auf dem Endstand (`aed58bf` gemergt): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` grün (ESLint,
  Prettier, Paketgrenzen, Lizenzen, Clean-Room), `pnpm typecheck` grün, `pnpm test`: 220 Dateien grün, 1 übersprungen wie
  zuvor; 6 Leistungsbudgets anderer Pakete fielen nur in der vollen Suite bei Last ≈ 26 auf 4 Kernen: `gaeb/lesen` 1.641 ms
  (< 1.000), `gaeb/schreiben` 1.080 ms (< 1.000), `kern/k9-leistung` 17,4 ms (< 16), `kern/lv-pruefung-fixtures` 63,0 ms
  (< 50), `speicher/aufmass-leistung` 159 ms (< 100), `vergabe/leistung` 1.140 ms (< 1.000). Jede Datei allein wiederholt
  (Last noch ≈ 24): alle grün. Kein Budget gelockert, kein Test übersprungen.

### Offen

- Test mit `fixtures/ifc/haus-v1.ifc` und Leistungsmessung mit `fixtures/ifc/erzeugen.mjs`, sobald Ticket 99 auf
  `integration/welle-6` liegt (der Prüfstand ist vorbereitet; das Budget prüft heute der eigene Erzeuger, ≈ 4,8 MB statt
  ≈ 25 MB Text, gleiche Bauteilzahl).
- Glossarzeile „Modellansicht“ (D-100.1) und die CSP/PWA-Punkte oben für Ticket 114.

## Answer

Gemergt in `integration/welle-6` mit `c04946e` (Branch `welle-6/100-ui-modell`, `878fb40`). Paket `ui-modell`: Modellansicht mit
web-ifc 0.0.78 im Worker und three.js 0.186.1, Auswahl/Ausblenden/Isolieren/Färben über GlobalId, CPU-Raycast, Testhaken; E2E 13/13;
10.000 Bauteile: Laden 2,5 s, Picken 147 ms (Budget 20 s/200 ms). Integrationssuite danach ganz grün (3.035 Tests). Offen: Test im
Prüfstand mit `fixtures/ifc/haus-v1.ifc` (Ticket 99 lag noch nicht vor; die App-E2E in 114/117 nutzt es); das große Modell der
Messung kam aus einem eigenen Erzeuger (4,8 MB statt 25 MB, gleiche Zahl Bauteile).

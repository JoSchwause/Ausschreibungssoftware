# 100: X1b: 3D-Ansicht des Modells im Browser (`ui-modell`)

Status: ready-for-agent
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

- [ ] E2E im Prüfstand: Laden, Auswahl über die Eingabe hebt hervor, Klick auf ein Bauteil meldet seine GlobalId, Strg+Klick
      ergänzt, Ausblenden, Isolieren, Färben, Tastatur, dunkles Schema; Leistungstest mit 10.000 Bauteilen im Budget
- [ ] Unit-Tests der reinen Teile (Zuordnung `expressID` ↔ GlobalId, Auswahlzustand, Tastenbelegung)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

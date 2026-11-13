# 146: App: Einlesen-Dialoge in Nutzersprache

Status: ready-for-agent
Type: task
Welle: 7 · Strang: E7 · Paket/Ordner: `apps/web/src/gaeb/`; in `abrechnung/` (X31), `rechnung/` (XRechnung), `bim/` (IFC) nur die Befundanzeige der Einlese-Dialoge
Blocked by: 136, 131, 137, 139 (D-82, S7: Bieterangaben werden erst mit Kern und Speicher gehalten)
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U5, N4, L4, L5
Herkunft: umfang §3 E7 (App-Teil), B-10 bis B-12

## What to build

1. Ein gemeinsamer Baustein „Befunde beim Einlesen“: zusammengefasst („Nicht übernommen: Währung, Projektbezeichnung, …“),
   Einzelheiten aufklappbar, Zahlen de-DE (N4), keine Kennungen als Lesetext, kein „Vertrag“, Zeilenangabe nur, wenn sie hilft;
   Kopfdaten nicht als 14 Einzelzeilen. Texte aus den Codes und Werten (136).
2. Eingesetzt in den Dialogen GAEB einlesen, Angebot (X84) einlesen, X31, XRechnung, IFC.
3. Dateidialog bietet alle GAEB-Endungen an (`.x8*`, `.d8*`, `.p8*`, Groß/Klein); abgewiesene Dateien zeigen den Satz aus 136.
5. **Aus 129:** veraltete Texte `apps/web/src/gaeb/gaeb.ts:58` und `keinX84` in `gaeb/texte.ts` („X84 in GAEB 3.3 oder 3.2“) auf den Stand nach 3.1 bringen.
4. GAEB einlesen ohne offenes Projekt legt das Projekt an (Weg für 147 „GAEB-Datei einlesen“): Funktion bereitstellen.

## Acceptance criteria

- [ ] E2E: BVBS-X83 einlesen zeigt zusammengefasste Befunde; X85 wird mit Satz abgewiesen
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

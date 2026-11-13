# 130: `ui-grid`: Spaltenbreiten, OZ-Breite, Höhe, Kürzeltabelle

Status: ready-for-agent
Type: task
Welle: 7 · Strang: U · Paket/Ordner: `packages/ui-grid`
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U1–U3, Q4, U6; D-93
Herkunft: umfang §3 E3 (Grid-Teil), B-07, B-09 (Kürzeltabelle), Ticket 123 Punkt 6

## What to build

1. **OZ-Spalte** so breit wie die längste OZ der Maske samt Index (Eingabe: Maske oder längste OZ; Messung über Zeichenzahl
   und Schriftmaß, kein DOM-Messen je Zeile). `001.001.00101` und `001.001.0010A` sind unterscheidbar.
2. **Spaltenbreiten** per Maus (Ziehgriff im Kopf) und Tastatur (z. B. Alt+Umschalt+Pfeil links/rechts auf der Kopfzelle oder
   der aktiven Spalte; im Ticket festhalten) änderbar; je Grid gemerkt über einen Schlüssel, den der Aufrufer gibt (Speicherung
   über eine Rückruf-Schnittstelle, Standard `localStorage` mit try/catch). Ersetzt die feste `SPALTENBREITE` (`tabelle.ts:17`).
3. **Zahlen nie abgeschnitten:** Mindestbreite der Zahlenspalten aus dem längsten formatierten Wert (z. B. `12.345.678,012`);
   bei zu wenig Platz Ellipse nur in Textspalten.
4. **Grid füllt die restliche Höhe** des Elternelements (Flex/`height:100%`), virtualisiert wie bisher; Summenfuß bleibt sichtbar.
5. **Kürzeltabelle:** eine exportierte Tabelle (Taste, Beschreibung de-DE, Bereich), aus der `navigation.ts`/`LvGrid` die Kürzel
   bindet; die App erzeugt daraus die Hilfeseite (147). Kein zweites Verzeichnis.
6. **123 Punkt 6:** die KG-Ausnahme an einer Stelle statt in fünf Dateien; `Einfuegeplan`/`Kostengruppenplan` teilen ihren Kern.
7. Bildschirm-/E2E-Tests der `ui-grid`-Prüfstände anpassen; Leistungsbudgets (5.000/10.000 Zeilen) unverändert grün.

## Acceptance criteria

- [ ] Unit- und Prüfstand-E2E für 1–5 (`pnpm --filter @tethys/ui-grid e2e`)
- [ ] App-Verbraucher (LV, Auftrags-LV, Preisspiegel, Aufmaß, Kosten, BIM-Baum) bauen und ihre E2E bleiben grün; App-Anpassung
  nur, wo die Schnittstelle es erzwingt (Ordnerbesitz bleibt bei 142)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

# 116: X1f in der App: Modellstände vergleichen, Mengen aktualisieren

Status: resolved
Type: task
Welle: 6 · Strang: X1f · Ordner: `apps/web/src/modellvergleich/` (neu); Einhängestellen in `App.tsx` und `bim/` (nur ein Link auf
der Modellseite, markiert `// Ticket 116`, D-20)
Blocked by: 108, 114
Modell: opus
Regeln: A5, U2, U5, Q5, D-53, D-54
Herkunft: `plan.md` §2 X1f („Modellstand und Änderungsvergleich, zwei IFC-Stände“); Tor X1-Erweitert (D-58)

## What to build

1. **Vergleichsseite** (`/projekt/<id>/modelle/<neu>/vergleich/<alt>`; Standard: der Vorgänger): Zusammenfassung (hinzugefügt,
   entfernt, geändert) und eine Liste im `VergleichsGrid` mit Art der Änderung, Klasse, Name, Geschoss und den geänderten Mengen
   (alt → neu); Befunde aus `bim` (geringe Überdeckung, doppelte GlobalIds) oben sichtbar.
2. **3D:** das neue Modell mit Färbung `hinzugefuegt` / `geaendert` (über `ui-modell`); entfernte Bauteile nur in der Liste
   (Kürzungsstufe laut Schnitt: Färbung darf entfallen, dann im Ticket vermerken).
3. **Folgen für ein LV:** LV wählen → je Position mit Zuordnungen die Menge laut altem und neuem Stand und die Differenz →
   „Mengen aktualisieren“: Vorschau, dann `MengenansatzSetzen` je betroffener Position (Menge über `mengen`) als **ein**
   Undo-Schritt (wie Ticket 115, Punkt 2; nur Ausschreibungs-LV, D-53).
4. **E2E** `apps/web/e2e/modellvergleich.spec.ts`: v1 und v2 (`fixtures/ifc/haus-v2.ifc`) → Vergleich = Soll aus
   `fixtures/typisch-bim.json` → betroffene Positionen mit Mengendifferenz = Soll → „Mengen aktualisieren“ = neue Vordersätze
   laut Soll → Undo.

## Grenzen

- Vergleichslogik steht in `bim`. Kein Schreiben in `src/bim/` außer dem markierten Link. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Unit-Tests der Ansicht, E2E `modellvergleich.spec.ts` grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-116.0 Prüfnähte.** Reine Module `vergleich.ts` (Zusammenfassung, Änderungsliste, Färbung), `folgen.ts` (Folgen, Aktualisierung,
  Befundtexte, `mengenAktualisieren` über `Sitzung.folge`) und `pfad.ts` mit Vitest gegen `haus-v1/v2.ifc` (über `ifc` gelesen) und das LV
  `typisch` im echten Speicher (In-Memory-SQLite); Oberfläche und 3D über die E2E. Grund: wie D-114.0.
- **D-116.1 Ausgangs-LV.** E2E und Unit legen `typisch` nach der Übernahme mit v1 über den Testpfad an (`LeistungsverzeichnisAnlegen` mit
  Zuordnungen und Vordersätzen aus `typisch-bim.json`, `e2e/modellvergleich-inhalt.ts`), nicht über die Zuordnungs-UI von 115 (läuft
  parallel). Grund: D-99.12 nennt genau diesen Ausgangsstand; der Weg „zuordnen → übernehmen“ ist Sache von 115/117.
- **D-116.2 Was „Mengen aktualisieren“ schreibt.** Je Position, die der Vergleich betrifft (`betroffen`) **und** deren Ansatz im LV von den
  Zeilen des neuen Stands abweicht (`geaendert`) und die Zeilen hat: `MengenansatzSetzen` (Menge über `mengen`), alle als ein Undo-Schritt.
  Nicht betroffene Positionen bleiben, auch wenn ihr Ansatz von Hand geändert wurde. Grund: Der Vergleich trägt nur Modelländerungen
  weiter; eine Übernahme aller Abweichungen ist „Mengen aus Modell…“ (115). Danach ist der Knopf gesperrt („entsprechen dem neuen Stand“).
- **D-116.3 Undo-Ziel.** Rückgängig nach „Mengen aktualisieren“ führt (wie jede LV-Änderung, `lvZiel`) zur LV-Seite; `historie/arten.ts`
  bleibt unberührt. Zurück auf der Vergleichsseite steht der alte Stand. Grund: keine Einhängestelle außerhalb von `App.tsx`/`bim/`.
- **D-116.4 Liste und Färbung.** Liste ohne Baum: hinzugefügt (Reihenfolge v2), entfernt, geändert (Reihenfolge v1); Spalte „Änderung“ mit
  „Name: alt → neu“, „Geschoss: EG → OG“, „<Menge>: alt → neu“; Geschoss = nächster Strukturknoten der Art Geschoss. 3D zeigt v2 mit
  `hinzugefuegt`/`geaendert`; entfernte Bauteile nur in der Liste (Kürzung laut Schnitt nicht nötig gewesen).
- **D-116.5 Befundtexte.** Befunde aus `bim` werden in der App um OZ/Kurztext und den Namen des Bauteils im alten Stand ergänzt
  („03.0010 Innenwände mauern: Kein Bauteil … im Modell (im alten Stand: Raumteiler Wohnen)“). Code und Schwere unverändert.
- **D-116.6 Adresse.** `/projekt/<id>/modelle/<neu>/vergleich[/<alt>]` in `modellvergleich/pfad.ts` (nicht in `bim/pfad.ts`, P2/D-20);
  `bimRoute` erkennt sie nicht. Seite per `lazy` (eigenes Bündel mit three.js). Link „Mit Vorgänger vergleichen“ auf der Modellseite nur,
  wenn das Modell einen Vorgänger hat. LV-Auswahl ohne Muster-LVs; ist nur ein LV da, ist es vorgewählt.

### Ergebnis (Branch `welle-6/116-web-modellvergleich`)

Ordner `apps/web/src/modellvergleich/` (neu: `ModellvergleichSeite.tsx`, `vergleich.ts`, `folgen.ts`, `pfad.ts`, `texte.ts`, CSS,
Testhilfen, 3 Testdateien/10 Tests); Einhängestellen `// Ticket 116` in `App.tsx` (Route, `lazy`) und `bim/ModellSeite.tsx` (Link).
E2E `apps/web/e2e/modellvergleich.spec.ts` und `e2e/modellvergleich-inhalt.ts` (LV nach Übernahme v1, Sollwerte).

**Zahlen gegen Goldens (`typisch-bim.json`), alle ohne Abweichung:** Vergleich v1 → v2: 1 hinzugefügt (IW-EG-4), 1 entfernt (IW-EG-3),
5 geändert (PL-EG Name, AW-EG-W Mengen, F-EG-W Geschoss, IW-EG-2 Mengen, AW-OG-W Mengen), 24 unverändert, keine Befunde; betroffen
03.0010 33,023 → 28,898 (−4,125) und 03.0020 99,938 → 101,337 (+1,399), 2 von 7; Befund `bauteil-fehlt` IW-EG-3 an 03.0010; nach
„Mengen aktualisieren“ alle sieben Vordersätze laut `mengenAktualisieren.vordersaetze`, Netto 35.894,85 (Summen netto/nachlass/nNN/MwSt/
brutto laut Soll im Unit-Test), Undo-Tiefe +1; Rückgängig → Netto 36.068,86.

### Prüfung

- Unit `src/modellvergleich`: 10/10 grün. E2E (Port 4661, SwiftShader): `modellvergleich.spec.ts` 1/1 und `bim.spec.ts` 3/3 grün.
- Nach `git merge integration/welle-6`: `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint` grün, `pnpm typecheck` grün, `pnpm test`:
  Vitest 315 Dateien grün (1 übersprungen wie zuvor), 3.898 Tests bestanden, 3 übersprungen; `node --test fixtures` 53/53. Kein Budget
  gelockert, kein Test übersprungen.

## Answer

Gemergt mit `a22fde8` (Branch `welle-6/116-web-modellvergleich`, `e811e83`). Vergleichsseite `/projekt/<id>/modelle/<neu>/vergleich[/<alt>]`
mit Zusammenfassung, Befunden, Änderungsliste und 3D-Einfärbung (neu/geändert); betroffene Positionen mit alt/neu/Differenz;
„Mengen aktualisieren“ mit Vorschau als ein Rückgängig-Schritt. Zahlen stimmen mit `typisch-bim.json` (Netto 35.894,85 nach, 36.068,86
vor). Suite des Umsetzers nach Merge von `integration/welle-6`: Lint, Typecheck, 3.898 Tests grün; E2E `modellvergleich`, `bim` grün.

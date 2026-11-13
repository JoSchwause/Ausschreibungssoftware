# 123: Aufräumen nach Welle 6 (Konstanten im Vertrag, Wiederholungen in Speicher und App)

Status: ready-for-agent
Type: task
Welle: 7 (Vorschlag) · Strang: – · Pakete: `packages/vertrag` (eigenes Teilticket zuerst, A4/P9), `speicher`, `bim`, `ifc`,
`kern`, `ui-grid`, `bauzeit`, `bauleitung`, `apps/web/src/{bim,modellvergleich,bauzeit,honorar,bauleitung}/`
Blocked by: 122
Regeln: A3, A4, P2, P9, L2; D-69
Herkunft: `../review-welle-6.md` (Ermessenspunkte, die Vertrag oder viele Dateien brauchen)

## What to build

1. **Konstanten im Vertrag** (zuerst, Vertragsticket mit Review): KG-Form, Hash-Form, Listen der Mengen-, Struktur- und
   Schemaarten als Werte neben den Typen; `kern`, `bim`, `ifc`, `speicher` (`dekoder.ts:992,1028,1050,1119`) nutzen sie (SA5).
2. **`speicher`:** eine Tabelle je `ChangeSet['art']` statt zweier Switches (`kern.ts:116` `aggregatDes`, `:600` `anwenden`) samt
   `schreiben.ts:255`, `projektdatei.ts` (SA6); UPDATE-Spalten nicht positionsgekoppelt an die INSERT-Tupel (`schreiben.ts:1372,1398,1429`
   ↔ `zeilen.ts:562-611`, SA7).
3. **`ifc`:** Nachrichtenketten `l.daten.id/name/klasse(…)` hinter einer Methode (SA9).
4. **App:** ein Seitengerüst (Laden, `aktiv`, `beiHistorie`, Lade-/Nicht-gefunden-Ansicht) für die neun neuen Seiten; ein
   Pfadbaukasten statt `bauzeit/pfad.ts` ≡ `honorar/pfad.ts` ≡ `kosten/pfad.ts`; ein Schreibweg (Lauf → Protokolleintrag →
   Speichern) statt fünf Kopien; ein `Feldfehler`; ein Schriftlader für die PDF-Worker, Honorar-PDF ebenfalls im Worker
   (ADR 0012 Folgen); `art === 'liste'`-Weichen in `App.tsx`; Zeilentyp `{positionId, oz, kurztext, einheit}` einmal (SC).
5. **Gemeinsamer Datumstyp** für `bauzeit` und `bauleitung` (in `vertrag` oder `dezimal`, A3; `bauleitung/datum.ts:6-22`).
6. **`ui-grid`:** die KG-Ausnahme an einer Stelle statt in fünf Dateien; `Einfuegeplan`/`Kostengruppenplan` teilen ihren Kern (SB).
7. Restliche Namen: drei `Lage`-Typen in `bauzeit`, Hüllfunktionen in `ausgabe/x2x4-pdf.ts`, `bericht-pdf.ts` gegen `pdf.ts`
   (Erzeugungsdatum, Zugriffsregel, Schriften), was 122 als Soll nicht schaffte.

8. **Rest aus Ticket 122** (Sollpunkte 19 und 20, siehe dort unter „Sollpunkte“): `MENGENART_STUECK` (Konstante nach `vertrag`,
   `bim/texte.ts` liegt im Hauptbündel); `modellvergleich/folgen.ts` und `bim/uebernahme.ts` zusammenlegen;
   `ModellvergleichSeite.tsx:397` → `bim/darstellung.ts`; `bim/einlesen.ts` → `datumAusUhr`; `MengenAusModell.tsx:145` →
   `datumDe`; Text aus `BauzeitenplanSeite.tsx:396` nach `texte.ts`; `useBezug` umbenennen (L2); alle Stichpunkte aus 122
   Punkt 20 (`kern`-Doppelungen, `bezuege.ts`, GlobalIds in `ui-modell`, Test-Exporte in `ifc`, Prozentkonstanten und Namen in
   `bauzeit`, `LEISTUNGSBILDER`, „offen“-Prädikat, `ui-grid/texte.ts`).
9. **Vertragstext:** die Quelle `fristpruefung` nennt auch `mangel-angezeigt-ohne-frist` (D-122.5).

## Acceptance criteria

- [ ] Keine Verhaltensänderung: alle Goldens und E2E unverändert grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

- Welle 7 (D-76): aufgeteilt. Punkt 1, 5, 8 (`MENGENART_STUECK`), 9 → 127; Punkt 2 → 135; Punkt 3, 7 (`bauzeit`), 8 (Paketteile) → 140; Punkt 4 → 131 (Honorar-PDF im Worker → 155); Punkt 6 → 130; Punkt 7 (`ausgabe`) → 141; Punkt 8 (App-Teile) → 155.

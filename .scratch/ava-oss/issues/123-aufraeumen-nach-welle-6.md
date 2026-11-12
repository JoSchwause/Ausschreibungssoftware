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

## Acceptance criteria

- [ ] Keine Verhaltensänderung: alle Goldens und E2E unverändert grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

# 92: Behebung des Wellen-Reviews Welle 5

Status: claimed
Type: task
Welle: 5 · Strang: – · Pakete: wie je Befund genannt (benannte Ausnahme von P2: in dieser Phase schreibt außer Ticket 91
nur dieses Ticket; 91 schreibt `apps/web/e2e/m4.spec.ts`, `m3.spec.ts`, `src/m4-kette.test.ts` – diese nicht anfassen)
Blocked by: –
Regeln: siehe je Befund; D-47, D-48
Herkunft: `../review-welle-5.md`

## What to build

In dieser Reihenfolge, je Befund ein Commit (Befundnummer in der Nachricht). Erst die Pflichtpunkte, dann die Sollpunkte.

**Pflicht**
1. **P6** (D-48): Ein neues Nachtrags-LV bekommt die OZ-Maske des Auftrags-LV **ohne deren oberste Stufe** (die übernimmt
   die Gliederung „Nachtrag <nummer>“, D-35/D-80.1); hat die Maske keine Gliederungsstufe, bleibt sie gleich und die App
   zeigt den Hinweis. `nachtragUebernehmen` warnt (`maske-zu-tief` o. ä.), wenn Tiefe des Nachtrags + 1 die Maske des
   Auftrags-LV überschreitet. Test mit einem Nachtrag, der zwei Titelstufen nutzt; die M4-Fixture bleibt gleich.
2. **S1, S2**: `Ansatzzeile` der Kalkulation → `Kalkulationszeile`; Text/Bezeichner „Zuschlag“ der Kalkulation →
   „Kalkulationszuschlag“ (Glossar „Zuschlagssatz der Kalkulation“).
3. **S11**: `Abweichung` (gefordert − geprüft) in `abrechnung` → `Differenz` (o. ä., Glossar prüfen/ergänzen, L2).
4. **P2**: „Zuschlag erteilen“ im Preisspiegel eines Nachtrags-LV ausblenden (`lv.nachtrag !== undefined`), D-42.
5. **P3**: Projektseite liest die LV-Liste über `leistungsverzeichnisse.auflisten` (`LvUebersicht` mit `nachtrag`/`vorlage`,
   D-43) statt jedes LV ganz zu laden; die Netto-Spalte braucht sonst das ganze LV – Lösung wählen und begründen (z. B.
   Summen nur für sichtbare LVs nachladen oder Spalte aus `LvUebersicht` streichen, wenn D-53.1 keine Summen vorsieht).
6. **P5**: In der Rechnungsprüfung eine Infozeile je nicht beauftragtem Nachtrag mit Angebot (Nummer, Status, Angebotssumme
   netto), nie in der Rechnung gerechnet (D-35).
7. **P7**: Unlesbare oder doppelte gespeicherte Druckprofile nicht still verwerfen: Rohdaten behalten, Hinweis zeigen (Q5).
8. **S12**: Fachlogik von Ticket 89 aus `lv/LvSeite.tsx` in `src/kosten/` (Hook), in `LvSeite.tsx` bleibt eine kurze,
   markierte Einhängestelle (D-20).

**Soll** (so weit die Zeit reicht; nicht Erledigtes als Folgeticket-Stichpunkt im Ticket)
9. **S7**: eine Tabelle `art → { umkehren, ziel }` für `befehlsweg.ts`, `historie.ts` (`Teil.changeSet` aus `ChangeSet`
   ableiten), `HistorieAnbieter.tsx`.
10. **S8**: eine `Verweis`-Komponente in `apps/web/src/ui/`, alle Kopien ersetzen; **S6** `rechnung/ausfuehrer.ts` entfernen.
11. **S5**: `nachtrag`, `abrechnung`, `rechnung`, `auftrag` nutzen `eintrag`/`speichern` des Befehlswegs statt eigener Kopien.
12. **S3**: `gaeb` und `speicher` nutzen die KG-Formregel des Kerns (`KOSTENGRUPPE_FORM`/`kostengruppeFehler`); `kosten` behält
    seine (darf `kern` nicht importieren, A3) mit Verweis-Kommentar.
13. **S9, S4, S10**: Kern exportiert die Kinder-Hilfe (`baueIndex` o. ä.) und `mengenansatzFehler`; `abrechnung`, `gaeb`
    (X31-Writer) nutzen sie; `vorlage/logik.ts` ebenso; `baueAuftragsChangeSet` und `baueChangeSet` im Kern zusammenführen.
    Die Kalenderprüfung in `abrechnung` und `erechnung` bleibt doppelt (Fachpakete importieren einander nicht) – Kommentar.
14. **D-86.7**: Wiederholen einer Beauftragung bleibt auf dem Auftrags-LV.

## Acceptance criteria

- [ ] Je Befund ein Commit; Ticket-Comments: Befund → Commit, nicht Erledigtes mit Grund
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; E2E `nachtrag`, `preisspiegel`,
      `projekt`, `rechnung`, `kosten`, `aufmass`, `vorlage`, `druckprofil`, `undo`, `m3` grün

## Comments

### Umsetzung (Branch `welle-5/92-review-fix`, Basis `integration/welle-5`)

Befund → Commit (Pflicht):
- P6 → `48e1e1c` (`nachtragsmaske` + Warnung `maske-zu-tief` in `abrechnung`, App legt das Nachtrags-LV mit der verkürzten
  Maske an, Hinweis bei Maske ohne Gliederungsstufe; Glossar „Nachtrag übernehmen“)
- S1, S2 → `8771547` (`Kalkulationszeile`, `spalteKalkulationszuschlag`; Glossar-Notiz am Kalkulationsansatz)
- S11 → `de32709` (`Forderungsdifferenz`; Glossar Rechnungsprüfung)
- P2 → `d819eec` (Preisspiegel eines Nachtrags-LV ohne „Zuschlag erteilen“, mit Hinweis; E2E in `nachtrag.spec.ts`)
- P3 → `6e1035e` (Projektseite aus `auflisten`; Netto je sichtbarer Zeile nachgeladen, `LvNetto.tsx`; E2E in `projekt.spec.ts`)
- P5 → `367911c` (Infozeilen nicht beauftragter Nachträge in der Prüfansicht, `nachtragsinfo`)
- P7 → `237a096` (`ablageLesen`/`ablageAlsText`: Zurückgehaltenes bleibt in der Ablage, Hinweis im Druckdialog; E2E)
- S12 → `0582354` (`kosten/useLvKosten.tsx`, Einhängestellen in `LvSeite.tsx`)

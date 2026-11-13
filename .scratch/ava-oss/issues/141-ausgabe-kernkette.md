# 141: `ausgabe`: Preisspiegel, Vergabevorschlag, Aufmaßblatt, Soll/Ist, Bilder, Köpfe

Status: claimed
Type: task
Welle: 7 · Strang: O · Paket/Ordner: `packages/ausgabe`
Blocked by: 127
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: ADR 0012, A2, N4, D-113.1, C1
Herkunft: umfang §3 E11 (ohne Zahlungsfreigabe-Zeilen aus A5), E10 (Köpfe), B-21, B-22; Ticket 123 Punkt 7 (`ausgabe`-Namen)

## What to build

Alle über `Ausgabemodell`/`Berichtsmodell` (ADR 0012, D-113.1: Modell rechnet nichts, trägt de-DE-Texte; Erzeugungsdatum aus
der Eingabe), Druckprofile wie beim LV; je Ausgabe ein Test über den Seitentext.

1. **Preisspiegel** quer (PDF) und als Excel: Positionen × Bieter, Min/Mittel/Max, Ausreißer- und ABC-Kennzeichen, Summen,
   Nachlass.
2. **Vergabevorschlag** (PDF): Rangfolge, geprüfte Summen, freier Begründungstext (Eingabe), Absender (Büro) und Projekt.
3. **Aufmaßblatt** mit Mengenansätzen (Formel, Ergebnis) (PDF, Excel).
4. **Soll/Ist** (PDF, Excel) mit Schwellenkennzeichen.
5. **Rechnungsprüfung** (PDF): die Abzugskette D-34 Zeile für Zeile mit Freigabe; die A5-Zeilen ergänzt 153.
6. **Bilder aus dem Langtext** im LV-PDF statt „[Abbildung]“ (`langtext.ts:42`), mit Größenbegrenzung.
7. **Köpfe:** Büro (Absender), Projektangaben (Nummer, Ort, Baustelle), Bieteranschrift, wo vorhanden.
8. 123 §7: Hüllfunktionen in `x2x4-pdf.ts`, `bericht-pdf.ts` gegen `pdf.ts` (Erzeugungsdatum, Zugriffsregel, Schriften); ein
   Schriftlader.

## Acceptance criteria

- [ ] Je Ausgabe Seitentext- bzw. Zelltest; Excel öffnet in LibreOffice-Test wie bisher (falls vorhanden)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

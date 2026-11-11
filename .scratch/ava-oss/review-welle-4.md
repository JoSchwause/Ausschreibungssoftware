# Wellen-Review Welle 4

Stand 2026-11-11. Skill `code-review`, Fixpunkt `main` (`491389c`) bis `integration/welle-4` (`c509030`), 182 Commits,
308 Dateien. Zwei Opus-Prüfer, getrennte Achsen. Suite vor dem Review auf dem gemergten Stand: Lint, Typecheck, Vitest
2017/2017 (2 übersprungen), Fixtures 20/20 grün.

## Standards

- **S1** (hart, should) `ausgabe/src/excel.ts:306` `NULL_EP = '0.000'` statt `NULL_EINHEITSPREIS` aus `dezimal` (N3); dieselbe Kopie in `gaeb/src/angebot.ts:56`.
- **S2** (Ermessen, should) `ausgabe/src/xlsx.ts` `excelZahl`: zweiter Dezimalleser mit Exponent und Rundung auf 15 Stellen; Zahlformate `#,##0.000`/`#,##0.00` fest statt aus `NACHKOMMASTELLEN` (N3, A2).
- **S3** (Ermessen, should) Datumshilfen in `apps/web/src/ausgabe/logik.ts` doppeln `lv/kopfdaten.ts`.
- **S4** (Ermessen, should) Dateinamen-Bereinigung an vier Stellen (`gaeb/gaeb.ts`, `ausgabe/logik.ts`, `sicherung/dateiname.ts`, `projekt/ProjektSeite.tsx`).
- **S5** (Ermessen, should) LV-Kopf von Hand an zwei Stellen gebaut (`gaeb/gaeb.ts` `lvAusgeben`, `auftrag/auftrag.ts` `inhaltKopf`); Ursache des Q5-Verlusts; `auftrag/ausgabe.ts` wiederholt den Rumpf von `lvAusgeben`.
- **S6** (Ermessen, should) OZ-Anzeigetext an sechs Stellen; Kinderliste nach `reihenfolge` doppelt in `ausgabe`.
- **S7** (Ermessen, should) `sicherung/` nutzt `Date.now()`/`new Date()` statt `u.uhr()`; `SicherungsBereich.tsx` wiederholt die Regel aus `regel.ts`.
- **S8** (hart, should) L2: „Zuschlag“ im Sinn der Vergabe fehlt im Glossar und kollidiert mit Zuschlagsposition/Zuschlagssatz (`Zuschlagswarnung` mit Code `zuschlagssatz-fehlt`).
- **S9** (Ermessen, should) `apps/web/src/ausgabe/pdf-worker.ts` importiert Schriften über einen relativen Pfad ins Paket statt über `exports`.
- **S10** (nit) Route `/lv/:id/preisspiegel` an drei Stellen.
- **S11** (nit) `kosten` `Kostenermittlungseintrag.betrag` als `Betrag` typisiert, aber als ungeprüfter Text behandelt.

## Spec

M3 erfüllt (`apps/web/e2e/m3.spec.ts`), C4 erfüllt, D-21 genau umgesetzt.

- **P1** (should) Ticket 63: Bedarfs- und Wahlsumme im Preisspiegel ohne Test; keine Sollwerte in der Fixture.
- **P2** (nit) Ticket 58: Bedarfs-/Wahlsumme im Druck gegen `zustand.summen` geprüft, kein unabhängiger Sollwert.
- **P3** (nit) Akzeptanz-Häkchen in 51, 53, 54, 55, 62, 63, 67 nicht gesetzt (Arbeit vorhanden).
- **P4** (nit) Prüfung `summen.vorher` überall (52, 57): nicht angekündigt, folgt aber Ticket 53 Punkt 3.
- **P5** (nit) `m3.spec.ts` `erwartet()` setzt Nachlass fest auf 0,00 statt aus der Fixture.
- **P6** (nit) `excelZahl` normalisiert auf 15 Stellen vor `leseAustausch`; zu viele Nachkommastellen bleiben Befund (Q5 hält).

## Bekannte offene Punkte (beide Achsen bestätigt)

| Punkt | Standards | Spec |
|---|---|---|
| `apps/web/src/gaeb/gaeb.ts` `lvAusgeben` verliert `epaBezeichnungen` (und `auftragnehmer`) | must | should, nahe must |
| D-57.2 `vergabe` `positionSetzen` mit altem `summen.vorher` | should | nit |
| D-64.2 kein Repository für Auftrags-LV | should | should |
| D-64.4 keine Kern-Umkehrung für Auftrags-LV | should | should |
| D-62.2 Laufzeit-Hülle um `speicher.anwenden` | should | nit |

## Behebung

Siehe `## Ergebnis` unten (Branch `fix/welle-4-review`).

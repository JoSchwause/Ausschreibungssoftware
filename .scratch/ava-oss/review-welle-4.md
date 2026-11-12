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

## Ergebnis

Branch `fix/welle-4-review` (auf `integration/welle-4` ab `9fc9005`, danach erneut gemergt). Ein Commit je Befund.

| Befund | Ergebnis |
|---|---|
| `lvAusgeben` verliert `epaBezeichnungen`/`auftragnehmer` (Q5) + **S5** | behoben in `566fc00`: Kopf an einer Stelle (`apps/web/src/lv/inhalt.ts`, `inhaltKopf`/`lvInhalt`, Feldliste per `satisfies Record<keyof LvInhaltKopf, true>` gegen den Vertrag geprüft). `lvAusgeben`, `alsLvZustand` und „Stand als neues LV“ (`lv/stand.ts`, gleicher Verlust) nutzen ihn; `auftragAusgeben` ist `lvAusgeben(alsLvZustand(z), 'X86', …)`. Test `gaeb.test.ts`: BVBS-X86 lesen, über die App ausgeben, wieder lesen → beide Felder gleich (vorher rot). |
| **S8** | behoben in `a6d12f5`: Glossar „Zuschlag (Vergabe)“ mit Benennungsregel (Vergabe = „Zuschlagserteilung“, bloßes „zuschlag“ = Zuschlagsposition). App: `zuschlagserteilungPlanen`, `zuschlagserteilungSpeichern`, `Zuschlagserteilungsplan/-eingang/-ausgang`, `ZuschlagserteilungDialog` (Dateien umbenannt), `erteilenAn` im Preisspiegel. Nicht umbenannt: `Zuschlagswarnung`, `zuschlagsvorschau` in `packages/vergabe` (nicht in D-30, P2); das Glossar nennt sie. |
| **S1** | behoben in `c8604cb`: `NULL_EINHEITSPREIS` aus `dezimal` in `ausgabe/excel.ts` und `gaeb/angebot.ts`. |
| **S2** | behoben in `e9b1fe0`: Excel-Zahlformate aus `NACHKOMMASTELLEN`, EP mit eigenem Format; Golden `excel-winzig` nur in `styles.xml` geändert; Test je Zahlstil. Exponent-Lesen bleibt in `excelZahl` (begründet im Kommentar): es beschreibt nur die Excel-Schreibweise (15 Ziffern, Exponent), den Wert liest `leseAustausch`, das Exponenten für GAEB und Eingabe absichtlich abweist; eine Ausnahme dort wäre größer als der Gewinn. |
| **S9** | behoben in `c975474`: `@tethys/ausgabe` exportiert `./schriften/*.woff`; der Worker importiert darüber. Build erzeugt die vier Schriften weiter. |
| **S7** | behoben in `5dc4ea8`: `sicherung/` nimmt die Zeit aus `u.uhr()`; die Vorprüfung der Projektliste ist `erinnerungAusgeschlossen` in `regel.ts` (auch von `erinnerungPruefen` genutzt), mit Test. |
| **P1** | behoben in `0d6d70a`: `typisch-angebote.json` trägt `preisspiegel.bieter[].ausweise` (Bedarfssumme ohne GB, Wahlsumme) aus `berechneSollwerteGaeb` (BigInt, `rechnen.mjs`); Selbsttest rechnet sie aus den Angebotszeilen nach, Bieter A von Hand (README). `ansicht.test.ts` prüft `summe:bedarf`/`summe:wahl` je Bieter. X84-Dateien byte-gleich. |
| **P5** | behoben in `9d19d13`: `erwartet()` in `m3.spec.ts` liest den Nachlass des Angebots aus der Fixture (N5, MwSt auf Netto nach Nachlass). |
| **S3** | behoben in `c35fa1e`: Druckdialog nutzt `datumLesen`/`datumDe` aus `lv/kopfdaten.ts`; Doppel samt Tests entfernt, deren Fälle in `kopfdaten.test.ts`. Das Druckdatum nimmt jetzt auch `JJJJ-MM-TT` an. |
| **S4** | behoben in `73cdac7`: `apps/web/src/dateiname.ts` (`dateinameSauber(name, ersatz)`) für GAEB, Druck/Excel, Sicherung und Projektexport. |
| **S6** | behoben in `6a085f9`, soweit Paketgrenzen es erlauben: `lv/oztext.ts` (`ozText`) für Preisspiegel (3×), Zuschlagserteilung und Papierkorb (zeigt jetzt den Index); `kinderNachReihenfolge` in `ausgabe/modell.ts` für Druck und Excel. Bleiben: je eine OZ-Bildung in `ui-grid` (nicht in D-30) und in `ausgabe` (Pakete teilen keinen Code, A3). |
| **S10** | behoben in `4278e6f`: `vergabe/pfad.ts` baut und liest die Adresse; Link, Undo-Ziel und Routing nutzen es. |
| **S11** | behoben in `ad7e791`: `Kostenermittlungseintrag.betrag` ist `string` (ungeprüfter Text, D-55.3); nur das Ergebnis ist `Betrag`. |
| **D-62.2** | behoben in `7715574`: Hörer am Befehlsweg (`nachJedemEintrag`), alle Schreibzugriffe der App über `eintragSchreiben`; Laufzeit-Hülle entfernt. Nachtrag in Ticket 62. Ohne Paketänderung. |
| P2, P6, D-57.2, D-64.2, D-64.4 | nicht behoben: Folgetickets laut D-30 (70–75). |
| P3, P4 | nicht behoben: erledigt der Orchestrator beim Abschluss (D-30). |

Suite nach dem Merge von `integration/welle-4` (`d10ada8`): Lint (mit Grenzen, Lizenzen, Clean Room), Typecheck, Vitest
2026/2028 (2 übersprungen), Fixtures 20/20, E2E `apps/web` 64/64, `ui-grid` 58/58, `speicher` 16/16 grün. Kein Test und
kein Budget abgeschwächt; das Golden `excel-winzig` ändert sich nur um das neue EP-Zahlformat (S2).

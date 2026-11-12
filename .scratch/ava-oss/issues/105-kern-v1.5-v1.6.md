# 105: Kern v1.5/v1.6: einheitlicher Fehlercode, OZ-Vorschlag am Auftrags-LV, `BauteileZuordnen`

Status: claimed
Type: task
Welle: 6 · Strang: K, X1c · Paket: `packages/kern` (benannte Ausnahmen von P2, nur wenn nötig und klein: die Stelle in
`packages/abrechnung`, die heute den OZ-Vorschlag umdeutet (D-80.1), und `zuschlagErteilen` in `packages/vergabe`, falls es
`Positionsdaten.bauteile` verliert; beide Pakete haben in Welle 6 sonst keinen Schreiber; markiert `// Ticket 105`)
Blocked by: 97 (und damit 95)
Modell: opus
Regeln: A5, A6, A7, U5, Q4, Q5, D-52, D-54, D-59, D-71.3, D-80.1
Herkunft: Ticket 95 (Punkte 1, 3), Ticket 97 (Punkt 3), Berater D-52, D-54

## What to build

1. **Einheitlicher Fehlercode (v1.5 Punkt 1, D-71.3).** Feldbefehle, die eine Position verlangen und eine Gliederung oder einen
   Hinweistext treffen, melden `knotenart-unzulaessig` (LV und Auftrags-LV); `knoten-unbekannt` nur für einen Knoten, den es
   nicht gibt. Bestehende Tests anpassen, Eigenschaftstest über alle Feldbefehle.
   Nach Ticket 95 (D-95.1) meldet der Kern heute noch `knoten-unbekannt` für `KostengruppeSetzen` an einer Gliederung; das und
   zwei Kern-Tests ändern sich.
2. **OZ-Vorschlag am Auftrags-LV (v1.5 Punkt 3, D-80.1, D-95.3).** Die Kernfunktion erfüllt die Signatur `OzVorschlagen`
   (`LvZustand | AuftragsLvZustand`) mit dem Ergebnistyp `OzVorschlag` aus `vertrag` (die eigene Kopie des Typs im Kern
   entfällt), ohne umgedeutete Kennung; `abrechnung` (`nachtragUebernehmen`) nutzt sie statt der Umdeutung (benannte Ausnahme, gleiche Ergebnisse, die
   Golden-Tests von `abrechnung` bleiben unverändert grün).
3. **`BauteileZuordnen` (v1.6 Punkt 3, D-52)** als LvBefehl und als AuftragsLvBefehl: ersetzt die ganze Liste an einer Position
   (`null` = keine); nur an Positionen (`knotenart-unzulaessig`); dasselbe Paar (GlobalId, Mengenart) zweimal →
   `ungueltige-eingabe`; GlobalIds werden nicht gegen ein Modell geprüft (A3); ChangeSet je Knoten (A6), umkehrbar,
   Protokolleintrag wie die übrigen Feldbefehle. **Kopieren** einer Position (Zwischenablage, `KnotenEinfuegen` mit Kopien)
   verwirft ihre Zuordnungen, **Verschieben** behält sie; ein LV-Stand trägt sie. Prüfe, dass der Zuschlag (`zuschlagErteilen`
   in `vergabe`) sie ins Auftrags-LV übernimmt; sonst die kleinste Änderung dort (benannte Ausnahme) mit Test.
4. **Leistung (Q4, D-54):** `BauteileZuordnen` an einer Position mit 5.000 Zuordnungen samt Undo ≤ 100 ms (Messart wie die
   übrigen Leistungstests des Kerns); eine Einzeländerung im LV `gross` mit Zuordnungen an 1.000 Positionen bleibt im Budget
   (< 16 ms, Q4).

## Grenzen

- Keine Änderung an `vertrag`. In `abrechnung` und `vergabe` nur die genannten Stellen. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit- und Eigenschaftstests (Fehlercode, OZ-Vorschlag, Zuordnen, Kopieren verwirft, Verschieben behält, Undo, LV-Stand,
      Zuschlag); Leistungstests im Budget
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Ergebnis (Branch `welle-6/105-kern`, Basis `integration/welle-6`)

Je Punkt ein Commit, test-first: `2466071` (Fehlercode), `cc51f19` (OZ-Vorschlag, `abrechnung`), `ed33f00`
(`BauteileZuordnen`, Kopieroption), `8670bf7` (Tests Zuschlag und Nachtragsübernahme), `0023d89` (Budgets).

1. **Fehlercode (D-71.3).** `kostengruppe.ts`: `KostengruppeSetzen` an Gliederung oder Hinweistext → `knotenart-unzulaessig`,
   unbekannt → `knoten-unbekannt` (LV und Auftrags-LV teilen `kostengruppeWechsel`). Neu `fehlercode.test.ts`: Eigenschaftstest
   über **alle** Feldbefehle (LV: 14, Auftrags-LV: 2) an Gliederung (Titel und Los), Hinweistext und unbekannter Kennung mit
   `fc.anything()` als Wert (der Knoten wird vor dem Wert geprüft), dazu eine Liste, die jeden Feldbefehl nennen muss. Alle
   übrigen Feldbefehle taten es schon. Angepasst: `lv-v14.test.ts`, `auftrags-lv-v14.test.ts`, `v14-eigenschaften.test.ts`
   (D-105.1).
2. **OZ-Vorschlag (D-80.1, D-95.3).** `oz-vorschlag.ts`: `export const ozVorschlag: OzVorschlagen`, Zustand nach
   `'leistungsverzeichnis' in zustand`; der eigene Typ `OzVorschlag` entfällt, `index.ts` reicht den des Vertrags weiter.
   `abrechnung/nachtrag-uebernehmen.ts`: `alsLvAnsicht` gelöscht, direkter Aufruf mit dem `AuftragsLvZustand` (markiert
   `// Ticket 105`); alle 101 Tests von `abrechnung` samt Goldens unverändert grün. Tests: Typgleichheit mit `OzVorschlagen`,
   das Beispiel `beispielOzVorschlagAuftragsLv` des Vertrags, `typisch` als Auftrags-LV (dieselben Sollwerte wie im LV), eine
   fremde Wurzel → `null`. Nebenbei (wie D-95 bittet) der veraltete Kommentar zu Typfrage 8 in `rechnung-pruefen.ts`.
3. **`BauteileZuordnen` (D-52, D-97.7).** Neu `bauteile.ts` (`bauteileWechsel`, geteilt von LV und Auftrags-LV wie bei der
   Kostengruppe); Form, Gleichheit und Normalform in `positionsfelder.ts` (`GLOBAL_ID_FORM`, `bauteileFehler`, `bauteileGleich`,
   `positionMitBauteilen`); `positionNormal` lässt `[]` weg; `positionsdatenFehler` prüft `bauteile` (damit alle Anlegebefehle:
   `PositionAnlegen`, LV und Auftrags-LV anlegen, `KnotenEinfuegen`, `NachtragUebernehmen`). `kopieBauen(…, optionen?)` mit
   `KopieOptionen { bauteile?: 'verwerfen' | 'behalten' }`, Vorgabe `verwerfen` (D-66 MUST 2). Alle v1.6-Marker in `kern` sind
   weg, `ZUSTAENDIGES_TICKET` ist wieder `{}`, `vertrag-v16.test.ts` ist durch `bauteile.test.ts` ersetzt (23 Tests, ein
   Eigenschaftstest gegen ein eigenes Orakel). Zuschlag (`vergabe`) und Nachtragsübernahme (`abrechnung`) reichen das Feld schon
   weiter: je ein Test, kein Produktivcode dort.
4. **Budgets (Q4, D-54)** in `bauteile-leistung.test.ts`, Messart wie `summen-leistung`/`mengenansatz-leistung` (warm, Median
   über 40 Läufe). Allein gemessen: 5.000 Zuordnungen samt Undo im LV `gross` 5,66 ms (schlechtester 11,05), im Auftrags-LV
   daraus 5,34 ms (Budget 100 ms); `MengeAendern` in `gross` mit Zuordnungen an 1.000 Positionen (je zehn) 2,36 ms,
   `BauteileZuordnen` mit zehn Zuordnungen dort 3,05 ms (Budget 16 ms).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-105.0** Welche Nähte werden getestet (Demo-Modus, keine Rückfrage)? **Die öffentliche Fläche von `@tethys/kern`**
  (`lvBefehlAusfuehren`, `auftragsLvBefehlAusfuehren`, Anwenden und Umkehren der ChangeSets, `kopieBauen`, `ozVorschlag`) und
  in `vergabe`/`abrechnung` nur `zuschlagErteilen` und `nachtragUebernehmen`. Grund: wie die Kern-Tickets davor; Form- und
  Gleichheitshilfen sind Innereien und werden über die Befehle getestet.
- **D-105.1** Der Eigenschaftstest von Ticket 71 (`v14-eigenschaften.test.ts`) zählte `knoten-unbekannt` nur über
  `KostengruppeSetzen` an Gliederungen. **Der Erzeuger wählt jetzt eine Stelle mehr als Knoten (unbekannte Kennung)**, statt die
  Erwartung zu streichen. Grund: Der Test soll weiter beide Codes sehen; keine Prüfung gelockert.
- **D-105.2** `ozVorschlag` mit einer Kennung, die nicht die Wurzel des übergebenen Aggregats ist (etwa die LV-Kennung am
  Auftrags-LV): **`null`** wie jeder unbekannte Ort. Grund: Lesart an `OzVorschlagen` („wird nie umgedeutet“).
- **D-105.3** Wo prüft der Kern die Form der Zuordnungen? **An einer Stelle (`bauteileFehler`), aufgerufen von
  `BauteileZuordnen` und `positionsdatenFehler`.** Damit prüfen alle Anlegebefehle gleich (Lesart an `Positionsdaten.bauteile`),
  und `PositionsmerkmaleSetzen`, das die ganze Position prüft, auch. Die GlobalId-Form ist eine eigene kleine Regel
  (`GLOBAL_ID_FORM`), weil der Kern `ifc` nicht importiert (A3, wie `KOSTENGRUPPE_FORM`). Bringt der Vertrag ein Muster
  (D-66 SHOULD 7, `IFC_GLOBALID_MUSTER`), nimmt der Kern dieses.
- **D-105.4** Wann ist eine Liste „derselbe Wert“? **Gleiche Paare in gleicher Reihenfolge**; `null`, `[]` und fehlend sind
  gleich. Eine neue Reihenfolge ist eine Änderung (ChangeSet), weil `bim` die Ansatzzeilen in dieser Reihenfolge baut (D-53).
- **D-105.5** Doppelt ist nur **dasselbe Paar**: dieselbe GlobalId mit zwei Mengenarten (auch `Stueck` neben `NetVolume`) und
  dieselbe Mengenart an zwei Bauteilen sind erlaubt (D-52 wörtlich). Leerraum in der Mengenart bleibt Text, nur `''` ist leer
  (U5, wie die Textquelle).
- **D-105.6** Kopieroption (D-66 MUST 2): **viertes, optionales Argument `optionen: KopieOptionen = {}` mit
  `bauteile: 'verwerfen' | 'behalten'`**, Vorgabe `verwerfen`; jeder heutige Aufruf bleibt gültig. Grund: Kopieren/Einfügen im
  LV (`LvSeite.tsx`) und Muster-LV (`vorlage/logik.ts`) sollen verwerfen, „LV-Stand als neues LV“ (`lv/stand.ts`) behalten;
  ein Wahrheitswert hätte am Aufruf nicht gesagt, was er meint. Die App fasse ich nicht an (121).
- **D-105.7** `zuschlagErteilen` und `nachtragUebernehmen`: **nur Tests, kein Produktivcode** in `vergabe`/`abrechnung` für
  das Feld; beide bauen Positionen mit `{ ...k }`. Die Tests stehen dort (der Kern darf `vergabe`/`abrechnung` nicht importieren,
  A3), markiert `// Ticket 105`.
- **D-105.8** „Ein LV-Stand trägt sie“ prüft der Kern nur so weit, wie er beteiligt ist: **`LvStandAnlegen` ändert den Zustand
  samt Zuordnungen nicht**; das Einfrieren ist `speicher` (106).
- **D-105.9** Budget „samt Undo“: gemessen wird **Befehl, Anwenden, Umkehren und Anwenden der Umkehrung** in einem Lauf,
  abwechselnd zwei Listen zu 5.000 (jeder Lauf ändert die Liste). Die Einzeländerung „mit Zuordnungen an 1.000 Positionen“:
  zehn je Position (10.000 im LV), gemessen `MengeAendern` (wie Q4) und `BauteileZuordnen` mit zehn.

### Folgearbeit

- **106 (`speicher`):** Der Kern nimmt Zuordnungen jetzt an; `pruefeV16` in `speicher` weist Positionen mit `bauteile` noch
  ab, bis 106 es entfernt. Bis dahin kann keine Projektdatei Zuordnungen tragen.
- **121 (App):** `lv/stand.ts` übergibt `kopieBauen(…, { bauteile: 'behalten' })`; `LvSeite.tsx` und `vorlage/logik.ts` bleiben
  bei der Vorgabe. Der Text für `knotenart-unzulaessig` sollte zu Feldbefehlen passen (siehe 95, 121); `KostengruppeSetzen` an
  einer Gliederung meldet jetzt diesen Code.
- **Ohne Ticket:** D-66 SHOULD 12 (GAEB-Export verwirft `bauteile` ohne F6-Warnung) bleibt bei der Review-Behebung der Welle.

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

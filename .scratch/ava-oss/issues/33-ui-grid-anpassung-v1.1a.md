# 33: Anpassung `ui-grid` an v1.1a (`GridZahlen`, `wurzelId`, Hinweise)

Status: claimed
Type: task
Welle: 3 (Phase A) · Strang: U · Paket: `packages/ui-grid`
Blocked by: -
Regeln: A3, A5, N1, N4, U2, U3, U4, U5, U8, L1, Q2
Herkunft: Ticket 24, Comments „Folgetickets: ui-grid“; Ticket 26, Comments „Folgetickets: ui-grid“; Abschnitt C (`next-decisions-welle-2.md`)

## What to build

Das Grid nimmt die Randtypen und die Wurzel aus dem Vertrag, zeigt Befehlshinweise an und räumt die Marker
`// v1.1a/v1.1b: mechanisch angepasst, Folgeticket` ab. Es rechnet weiter nie (A5, N1).

**v1.1a**
1. **Randtypen aus dem Vertrag.** `GridZahlen` und `GridIdQuelle` in `src/typen.ts` entfallen; `LvGridProps`,
   `einfuegen.ts`, `eingabe.ts`, `Zeile.tsx` und die Testseite (`e2e/harness/attrappen.ts`) importieren sie aus
   `@tethys/vertrag`. `src/index.ts` exportiert sie nicht mehr selbst (es gibt genau eine Definition).
2. **Wurzel aus der Ansicht.** Die Eigenschaft `wurzelId` von `LvGridProps` entfällt; das Einfügen in ein leeres LV
   nimmt `ansicht.wurzelId` (`LvGrid.tsx`, Einfügeort `ende`). Testseite (`fixture-ansicht.ts`, `main.tsx`) anpassen.
3. **Befehlshinweise anzeigen (v1.1a, Punkt 10).** Neue Eigenschaft `hinweise?: readonly Befehlshinweis[]` (die
   Hinweise zum zuletzt angenommenen Befehl; der Aufrufer setzt und leert sie). Anzeige als Hinweisleiste am Grid
   mit `aria-live="polite"`. Der Text kommt aus `texte.ts` je `Befehlshinweiscode`, nicht aus `meldung` (die ist für
   Entwickler): `oz-schritt-ausgewichen` „Die Ordnungszahlen wurden mit kleinerem Schritt vergeben.“,
   `netto-nach-nachlass-negativ` „Das Netto nach Nachlass ist negativ.“, `oz-maske-ungueltig` (kommt mit Vertrag
   v1.2) „Die OZ-Maske ist ungültig.“. Ein unbekannter Code zeigt einen allgemeinen Text, damit ein neuer Code im
   Vertrag das Grid nicht bricht (keine erschöpfende `Record`-Tabelle über den Code). Nennt ein Hinweis eine
   `knotenId`, springt ein Knopf im Hinweis per Tastatur und Maus zur Zeile (U3). Hinweise sperren nie (U5).

**v1.1b (Marker in diesem Paket)**
4. **Spalte „Art“ zeigt alle Merkmale.** `anzeigeart` (eine einzige Art, `texte.ts`) ersetzt eine Funktion, die alle
   gesetzten Merkmale in fester Reihenfolge nennt: Zuschlag, Wahl (mit Gruppe/Variante, wenn bekannt, z. B. „Wahl 1.2“),
   Bedarf („Bedarf“ bzw. „Bedarf m. GB“ für mit Gesamtbetrag), Stundenlohn, pauschal; ohne Merkmal „Normal“. Getrennt
   durch „, “. Marker in `texte.ts`, `eingabe.ts` (~62), `einfuegen.ts` (~106), `eingabe.test.ts` (~27) weg; eine neue
   Position aus der Zwischenablage hat weiter leere Merkmale.
5. **Klartext von Hinweistexten.** `hinweisKlartext` (`eingabe.ts`) kennt alle Bausteine von v1.1b: Textläufe als Text
   (Auszeichnung entfällt), `umbruch` und Absatzgrenzen als Leerzeichen, Listenpunkte mit „• “, Tabellenzellen mit
   „ | “, Textergänzung als `davor` + Inhalt (leer: „…“) + `danach`, Bild als „[Bild]“. Reine Funktion, deterministisch.
6. **Bedarfs- und Wahlsumme in der Summenzeile (F4, E-04).** Sind `gesamt.summeBedarfOhneGesamtbetrag` oder
   `gesamt.summeWahl` gesetzt, zeigt die Summenzeile sie getrennt („Bedarfssumme“, „Wahlsumme“, Glossar) nach dem
   Brutto, deutlich als „nicht im Netto“ gekennzeichnet. Fehlen sie, erscheint nichts (heute berechnet der Kern sie
   noch nicht; Ticket 37).
7. **Testseite.** `e2e/harness/fixture-ansicht.ts`: die Abbildung Fixture-Positionsart → Merkmale ist dauerhaft (die
   Fixtures behalten ihr Format); Kommentar neu, Marker weg. Marker `wurzelId` (~209) weg mit Punkt 2.

## Grenzen

- Nur `packages/ui-grid`. Keine Änderung an `vertrag`, keine zweite Grid-Implementierung (U2).
- Das Bearbeiten der Merkmale (`PositionsmerkmaleSetzen` aussenden) gehört in den Positionsdialog (Ticket 47), nicht
  hierher. Zeilen kopieren, verschieben, löschen ist Ticket 46.
- Deutsche Texte nur in `texte.ts` (L1, U8). Kontrast der Hinweisleiste über die vorhandenen Tokens (U4).
- `okf/research/` wird nicht gelesen (C3). Offene Punkte entscheidet der Umsetzer und protokolliert sie in
  `.scratch/ava-oss/entscheidungen-auto.md` (Demo-Modus).
- TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün und
  `pnpm --filter @tethys/ui-grid e2e` grün (Browserpfad: Ticket 26, Comments). Umfang: 3 h.

## Acceptance criteria

- [ ] `GridZahlen`/`GridIdQuelle` gibt es nur noch in `vertrag`; `LvGridProps` hat keine Eigenschaft `wurzelId`
- [ ] E2E: In ein leeres LV wird per Zwischenablage eine Position eingefügt; der Befehl trägt `ort: { art: 'ende', elternId: ansicht.wurzelId }`
- [ ] E2E: Hinweise werden angezeigt, per Tastatur erreichbar; der Sprungknopf setzt den Fokus auf die genannte Zeile
- [ ] Unit-Test: Text je Hinweiscode; unbekannter Code ergibt den allgemeinen Text
- [ ] Unit-Test: Spalte „Art“ für Bedarf im Stundenlohn, Wahl mit Gruppe/Variante, Zuschlag, Bedarf mit Gesamtbetrag, ohne Merkmal
- [ ] Unit-Test: `hinweisKlartext` für einen Hinweistext mit Absatz, Liste, Tabelle, Textergänzung und Bild
- [ ] Summenzeile zeigt Bedarfs- und Wahlsumme nur, wenn gesetzt (E2E oder Komponententest auf der Testseite)
- [ ] Kein Marker `mechanisch angepasst` mehr in `packages/ui-grid`
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter @tethys/ui-grid e2e` grün

## Nicht-Ziele

Merkmale bearbeiten (Ticket 47). Kopieren, Verschieben, Löschen im Grid (Ticket 46). Anbindung an Kern und Speicher
(Ticket 39). Prüfbefunde der LV-Prüfung (Ticket 41/47; `LvZeile.befunde` bleibt wie heute).

## Comments

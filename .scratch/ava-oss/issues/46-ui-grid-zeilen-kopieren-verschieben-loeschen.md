# 46: Grid: Zeilen kopieren und einfügen, per Tastatur verschieben, löschen, neue Zeile; Sprungziel (U5a)

Status: ready-for-agent
Type: task
Welle: 3 (Phase B) · Strang: U (U5a) · Paket: `packages/ui-grid`
Blocked by: 33, 29
Regeln: A2, A3, A5, N4, U1, U2, U3, U4, U5, U8, Q2, Q5, E-18, C3, L3
Herkunft: `plan.md` §2 U5, W-06 (Lücken des Grids aus dem Prototyp: Position ohne Zwischenablage anlegen, Zeile löschen und verschieben), Ticket 18 (Comments: Tastatur im echten Grid), Ticket 21 („Semantik des Einfügens“), Ticket 29 (Punkt 4: `KnotenEinfuegen`, `KnotenlisteVerschieben`, `KnotenInPapierkorbLegen`), Ticket 47 (Sprunglinks des Prüf-Panels)

## What to build

Das Grid bekommt die Zeilenaktionen, die im Prototyp fehlten. Wie bisher rechnet es nie, erzeugt keine Kennungen selbst
und schickt jede Änderung als Befehl hinaus (A5). Vorgehen: TDD mit dem Skill `tdd` (Planungsfunktionen als Vitest,
Tastatur und Zwischenablage als Playwright im Harness des Pakets); am Ende
`pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün. `okf/research/` wird nicht gelesen (C3).

**Befehle aus Ticket 29** (der Umsetzer prüft zuerst `packages/vertrag/src/befehle.ts`): `KnotenlisteVerschieben {
knotenIds; ziel }`, `KnotenVerschieben`, `KnotenInPapierkorbLegen { eintragId; knotenIds }`, `PositionAnlegen`.
`KnotenEinfuegen` (Kopie) baut das Grid **nicht** selbst: Die Kopie samt umgebogener Bezüge baut eine Hilfsfunktion des
Kerns (Ticket 42), und `ui-grid` darf `kern` nicht importieren (A3). Das Grid meldet deshalb den Wunsch über eine
Eigenschaft, die App baut den Befehl (Ticket 48).

Tastenbelegung (Vorschlag, protokollieren als `D-xx`; Excel-nah, U3; nicht mit vorhandenen Tasten kollidieren: Entf leert
eine Zelle, Alt+Pfeil links/rechts klappt, Leertaste wählt die Zeile, E-18):

| Aktion | Taste | Ausgang |
|---|---|---|
| Zeilen kopieren | Strg+C bei ausgewählten Zeilen | Zwischenablage (TSV) und interne Merkliste |
| Zeilen ausschneiden | Strg+X | wie Kopieren, Zeilen als „ausgeschnitten“ markiert |
| Einfügen | Strg+V | siehe Punkt 2 |
| Zeilen löschen | Strg+Minus oder Strg+Entf | nach Bestätigung ein `KnotenInPapierkorbLegen` |
| Zeile(n) hoch/runter | Alt+Pfeil hoch/runter | `KnotenlisteVerschieben` (bzw. `KnotenVerschieben` bei einer Zeile) |
| Neue Position | Strg+Plus (bzw. Strg+Umschalt+=) | `PositionAnlegen` hinter der aktiven Zeile |
| Ausschneiden abbrechen | Escape | – |

1. **Kopieren** (Strg+C): schreibt die ausgewählten Zeilen (Mehrfachauswahl; ohne Auswahl die aktive Zeile) als TSV der
   sichtbaren Spalten in die System-Zwischenablage, Zahlen über `GridZahlen.format*` (de-DE, N4), Texte mit Tab oder
   Zeilenumbruch in Excel-Anführung, so dass Excel sie als Tabelle einfügt. Zusätzlich merkt sich das Grid die Kennungen
   der obersten ausgewählten Knoten und den geschriebenen Text.
2. **Einfügen** (Strg+V):
   - Ist der Text der Zwischenablage genau der zuletzt vom Grid geschriebene: verlustfreies Einfügen hinter der aktiven
     Zeile. Nach Ausschneiden: `KnotenlisteVerschieben` an diese Stelle (ein Befehl). Nach Kopieren: neue Eigenschaft
     (Vorschlag) `onKopieEinfuegen?: (knotenIds: readonly KnotenId[], ort: Einfuegeort) => void`; die App baut daraus
     `KnotenEinfuegen` (Langtext, Merkmale und Unterknoten bleiben erhalten). Fehlt die Eigenschaft, fällt das Grid auf den
     nächsten Weg zurück.
   - Sonst wie bisher (Ticket 21, E-18): Text aus Excel legt neue Positionen an, eine je Zeile (`PositionAnlegen`),
     ungültige Zahlen bleiben markiert, nichts wird überschrieben. Test mit TSV, wie Excel es schreibt (Anführung,
     `\r\n`, leere letzte Zeile, Dezimalkomma, Tausenderpunkt).
3. **Löschen** mit Bestätigung (Q5): Ein Dialog aus `ui-basis` nennt die Zahl der Zeilen und der betroffenen Positionen
   („3 Zeilen in den Papierkorb legen, darunter 2 Titel mit 41 Positionen?“), Enter bestätigt, Escape bricht ab; der Fokus
   kehrt ins Grid zurück. Erst nach Bestätigung geht **ein** `KnotenInPapierkorbLegen` mit allen obersten ausgewählten
   Knoten hinaus (Ticket 29: die Oberfläche löscht über den Papierkorb). Die Eintragskennung kommt aus der ID-Quelle
   (Punkt 7).
4. **Verschieben per Tastatur:** Alt+Pfeil hoch/runter verschiebt die ausgewählten (sonst die aktive) Zeilen um eine
   Stelle unter ihren Geschwistern; am Rand nichts. Auswahl und Fokus wandern mit. Ein- und Ausrücken in einen anderen
   Elternknoten ist nicht Teil des Tickets.
5. **Neue Position ohne Zwischenablage** (W-06): Strg+Plus legt hinter der aktiven Zeile eine leere Position an (ist die
   aktive Zeile eine aufgeklappte Gliederung: als erstes Kind) und setzt den Fokus in ihren Kurztext. Die Ordnungszahl
   ergänzt die App (Ticket 48 mit dem OZ-Vorschlag aus 42); das Grid kennt keine OZ-Regel. Vorschlag: eine optionale
   Eigenschaft `vorPositionAnlegen?: (befehl: PositionAnlegen) => PositionAnlegen`, über die die App die OZ einsetzt,
   bevor der Befehl hinausgeht; sonst schickt das Grid ihn ohne OZ.
6. **Eine Benutzeraktion, eine Befehlsfolge.** Neue optionale Eigenschaft (Vorschlag) `onBefehlsfolge?: (befehle:
   readonly LvBefehl[]) => void`: Einfügen mehrerer Zeilen aus Excel geht als **eine** Folge hinaus, damit die App sie als
   einen Undo-Schritt führt (48). Fehlt die Eigenschaft, gehen die Befehle einzeln über `onBefehl`, wie heute.
7. **Kennungen.** Für `KnotenInPapierkorbLegen` braucht das Grid eine Papierkorb-Eintragskennung (Ticket 29:
   `IdQuelle.papierkorbeintrag()`). Seit Ticket 29 (D-10 (4), D-12) ist `GridIdQuelle` im Vertrag
   `Pick<IdQuelle, 'position' | 'papierkorbeintrag'>`; die Eigenschaft `ids` nimmt genau diesen Typ, keine zweite
   ID-Quelle.
8. **Sprungziel für Prüf-Links** (U6, für Ticket 47/48): Eigenschaft (Vorschlag) `sprungziel?: { knotenId: KnotenId;
   spalte?: LvSpalte; nr: number }`; ändert sich `nr`, scrollt das Grid die Zeile in den sichtbaren Bereich (virtualisiert)
   und setzt den Fokus auf die Zelle. Ist die Zeile nicht sichtbar, weil ein Vorfahr zugeklappt ist, tut das Grid nichts;
   das Aufklappen gehört der App (`onAufklappen`).
9. **Barrierefreiheit (U8):** Die neuen Tasten stehen in der Tastenhilfe bzw. im README des Pakets; der Dialog ist per
   Tastatur bedienbar; kurze Ansagen über eine Live-Region (vorhandene nutzen, sonst eine anlegen), z. B. „3 Zeilen
   kopiert“.

## Grenzen

- **Paket `packages/ui-grid`.** Keine Änderung an `vertrag` (A4) oder `ui-basis`; fehlt dort etwas (z. B. Dialoggröße,
  Ticket 18 Comments), Lücke in die Comments.
- Das Grid rechnet nie, vergibt keine OZ, erzeugt keine Kennungen und hält keinen Fachzustand (Auswahl, Fokus und
  Merkliste der Zwischenablage sind Bedienzustand).
- Eine Grid-Implementierung (U2); Erscheinungsbild über Tokens, keine Anleihen bei der Referenzsoftware (U4, L3).
- **Zu groß?** Zuerst streichen: Punkt 8 (dann springt 47 über den Positionsdialog), dann Ausschneiden (nur Kopieren),
  dann Punkt 5 (die App hat dafür Schaltflächen aus Ticket 39).

## Acceptance criteria

- [ ] Strg+C schreibt TSV, das Excel als Tabelle liest (Unit-Test der Serialisierung mit Anführung und Zahlen in de-DE)
- [ ] Strg+V mit eigenem Text: nach Strg+X ein `KnotenlisteVerschieben`, nach Strg+C ein Aufruf von `onKopieEinfuegen` mit Knoten und Ort; mit fremdem Text `PositionAnlegen` je Zeile wie bisher, als eine Folge über `onBefehlsfolge`
- [ ] Löschen nur nach Bestätigung, als ein `KnotenInPapierkorbLegen`; Escape bricht ohne Befehl ab (Playwright)
- [ ] Alt+Pfeil hoch/runter verschiebt unter Geschwistern, am Rand nichts (Playwright)
- [ ] Strg+Plus legt eine leere Position an und fokussiert den Kurztext
- [ ] `sprungziel` scrollt bei 5.000 Zeilen zur Zeile und fokussiert die Zelle (Playwright)
- [ ] Keine bestehende Taste geändert (Tests aus 21/33 grün); die neuen Tasten sind dokumentiert
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Kopie bauen (42, App 48), Undo und Papierkorb-Ansicht (48), OZ-Vergabe (42/48), Ein- und Ausrücken, Ziehen mit der Maus,
Kopieren zwischen LVs, Änderungen an Spalten oder Summenzeile.

## Comments

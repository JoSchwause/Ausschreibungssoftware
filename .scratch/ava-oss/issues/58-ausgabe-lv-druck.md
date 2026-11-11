# 58: O1: LV-Druck als PDF vervollständigen (ADR 0012)

Status: ready-for-agent
Type: task
Welle: 4 · Strang: O1 · Paket: `packages/ausgabe` (dazu `docs/adr/0012-*.md`)
Blocked by: –
Regeln: A2 (Rechnung nur im Kern), A3, N2, N4, F4, F6, U8, C1, C5, D-23
Herkunft: Ticket 28 (Spike, Empfehlung Weg A), W-04 (`next-decisions-welle-2.md`), D-23

## What to build

Der Spike (Ticket 28) hat `baueAusgabemodell` und `erzeugePdf` (pdfmake, Noto Sans) gebaut. Dieses Ticket macht daraus den
LV-Druck für v1:

1. **ADR 0012** „PDF-Ausgabe mit pdfmake, ungetaggt in v1“ im Stil der vorhandenen ADRs, `Status: proposed`, Text „für die
   Demo umgesetzt, Mensch bestätigt später (W-04)“; Kontext aus Ticket 28 (Vergleichstabelle in eigenen Worten), Folge:
   Spike mit einer taggenden Bibliothek vor O3. pdfmake bleibt hinter dem eigenen `Ausgabemodell` (Renderer tauschbar).
   Code und Messung von Weg B (Browserdruck) entfallen, wie Ticket 28 es für den Fall „Weg A“ vorsieht.
2. **Inhalt des Drucks:** Deckblatt bzw. Kopf mit Projektname, Bauherr, LV-Name, Auftraggeber und Vergabeinformationen,
   soweit gesetzt (E-11); Gliederung mit OZ, Kurztext, Langtext (Absätze, Listen, Tabellen, fett/kursiv/unterstrichen,
   Textergänzungen als markierte Lücke bzw. Wert; F6), Menge, Einheit, EP, GP; Merkmale sichtbar (Bedarf, Wahl mit
   Gruppe/Variante, Stundenlohn, Pauschal); Zuschlagspositionen mit Satz, Basis und Betrag; Leit-/Unterbeschreibungen.
   Titelsummen am Titelende; Schluss: Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto und **getrennt** Bedarfssumme und
   Wahlsumme (F4). Alle Zahlen aus dem `Summenstand`/`LvZustand` (nichts rechnen, A2), de-DE über `dezimal` (N4).
3. **Druckvarianten** als Option: „mit Preisen“ (Schätzpreise) und „ohne Preise“ (Blankett für Bieter: EP/GP-Spalten leer
   mit Linie). Seitenkopf/-fuß mit LV-Name, „Seite x von y“, Datum als Eingabe (keine Uhr im Paket).
4. Deterministische Ausgabe, soweit pdfmake es zulässt (Erzeugungsdatum/ID als Eingabe setzen); sonst Test über den Text
   (`pdftext.ts`) statt über Bytes.
5. Leistung: `gross` (5.000 Positionen) unter Node < 5 s; Messwert im Ticket.

Die Anbindung in der App (Knopf „Drucken“, Worker) ist Ticket 66.

## Grenzen

- Nur `packages/ausgabe` und die ADR. Fehlt eine Zahl im Summenstand, wird sie nicht selbst gerechnet: in den Comments melden.
- Keine Ähnlichkeit mit Layout/Logos der Referenzsoftware (U4, C1). `okf/research/` wird nicht gelesen (C3).
- Ticket 51 ändert parallel die Fixtures `typisch`/`gross` (Zuschlagsposition in GAEB-Form) und die Testhilfen in
  `ausgabe`; Tests auf Fixture-Zahlen nehmen die Sollwerte aus der Fixture, nicht feste Zahlen.

## Acceptance criteria

- [ ] ADR 0012 liegt vor (`proposed`)
- [ ] Tests über den PDF-Text: alle Fixtures (`winzig`, `typisch`, `zuschlag`) drucken jede Position, jede Titelsumme und
      die Schlussblöcke inkl. Bedarfs- und Wahlsumme; Variante „ohne Preise“ enthält keinen Preis
- [ ] Langtext mit Liste und Tabelle erscheint lesbar; Textergänzung sichtbar
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Preisspiegel-PDF, Druckprofile (O3), getaggtes PDF, Anbindung in der App.

## Comments

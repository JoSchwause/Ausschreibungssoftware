# 47: App: Positionsdialog mit Langtext-Editor, Prüf-Panel mit Sprunglinks (U4 + U6)

Status: ready-for-agent
Type: task
Welle: 3 (Phase B) · Strang: U (U4, U6) · Paket: `apps/web`
Blocked by: 39, 34, 41
Regeln: A5, F3, F4, F5, F6, N4, U1, U3, U4, U5, U6, U8, Q2, C3, L1, G-32, E-10
Herkunft: D-07 (Oberfläche der Kopfdaten-Befehle), `plan.md` §2 U4 und U6, alte Tickets `.scratch/ava-mvp/issues/13` und `16` (Oberfläche), Ticket 26 (Punkt 5: Abbildung Langtext ↔ TipTap), Ticket 34 (Langtext-Editor in `ui-basis`), Ticket 37 (Merkmale, Zuschlag, EPA), Ticket 41 (Prüfregeln), Ticket 39 (offene Merkmale im M1-E2E)

## What to build

Eine Position wird in einem Dialog vollständig bearbeitet, und die formale LV-Prüfung erscheint als Panel, dessen
Einträge zur betroffenen Stelle springen. Vorgehen: TDD mit dem Skill `tdd`; am Ende
`pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün. `okf/research/` wird nicht gelesen (C3).

1. **Positionsdialog** (`apps/web/src/lv/`), geöffnet per Doppelklick, Taste (Vorschlag Strg+Enter auf der Zeile; nicht
   mit dem Grid kollidieren) oder aus dem Prüf-Panel. Felder und Befehle:
   - Kurztext (`KurztextAendern`), Langtext mit dem Editor aus `ui-basis` (Ticket 34; `LangtextAendern`), Menge, Einheit,
     EP (`MengeAendern`, `EinheitAendern`, `EinheitspreisAendern`; de-DE über `dezimal`, N4).
   - Merkmale (F5): Bedarf (ohne/mit Gesamtbetrag), Wahl (Gruppe, Variante, Grundposition aus einer Auswahl der
     Positionen), Stundenlohn, Pauschal, Zuschlagskennzeichen → ein `PositionsmerkmaleSetzen`.
   - Zuschlag (F3): Schalter „Zuschlagsposition“, Satz in %, Bezugsform (Liste, Gliederung, Kennzeichnung), bei Liste die
     Bezugspositionen (Auswahl mit Suche nach OZ und Kurztext) mit optionaler Teilmenge; Anzeige von Basis und Betrag aus
     dem Kern. Formfehler des Kerns (Ticket 37, z. B. Pauschal an einer Zuschlagsposition) erscheinen am Feld.
   - Einheitspreisanteile (K7): sechs Felder plus Bezeichnung des freien Anteils → `EinheitspreisanteileSetzen`; der EP
     folgt nach der Regel aus Ticket 37.
   - Leitbeschreibung mit Unterbeschreibungen (Nummer, Kurztext, Langtext, Menge, Einheit) → der Befehl aus Ticket 29,
     Punkt 8 (D-07; Handler in Ticket 41), mit dem ganzen neuen Wert.
   - **Übernehmen** schickt die geänderten Felder als Folge von Befehlen (je Feld ein Befehl, nur geänderte); die Folge
     ist ein Undo-Schritt, sobald Ticket 48 Undo bringt. **Abbrechen** verwirft ohne Befehl. Validierung sperrt nie (U5):
     ein ungültiger Zahltext bleibt am Feld markiert, die übrigen Felder werden übernommen.
2. **Kopfdaten des LV** (D-07): ein Dialog „LV-Angaben“ auf der LV-Seite für Auftraggeber (Name, Straße, PLZ, Ort,
   Vergabenummer) und Vergabeinformationen (Felder wie im Vertragstyp `Vergabeinformationen`) → je ein Befehl aus Ticket 29,
   Punkt 8. Leere Eingabe heißt `null`; Datum und Uhrzeit als Text in der Form des Vertrags (`JJJJ-MM-TT`, `HH:MM:SS`),
   Eingabe de-DE (`TT.MM.JJJJ`) am Rand umgewandelt (N4).
3. **Prüf-Panel** (U6): Seitenleiste oder einklappbarer Bereich der LV-Seite. Die App ruft `lvPruefen` (Ticket 41) nach
   jedem angenommenen Befehl entkoppelt auf (Vorschlag: im nächsten Leerlauf, `requestIdleCallback` mit Rückfall auf ein
   kurzes Zeitfenster; nie im Tastendruck). Liste gruppiert nach Schwere, Zahl im Kopf, je Eintrag OZ, Kurztext und
   Meldung. Dieselben Befunde stehen an den Zellen des Grids (`LvZeile.befunde`, nach `ort.feld`).
   - **Sprunglink**: klappt die Vorfahren auf (Aufklapp-Zustand gehört der App), springt im Grid zur Zelle über
     `sprungziel` (Ticket 46). Ist 46 noch nicht gemergt: Der Link klappt auf und öffnet den Positionsdialog der Position
     (bei Gliederung und LV-Befunden das passende Feld); der Zellsprung kommt mit 48.
   - Tastatur (U3, U8): Panel per Taste erreichbar (Vorschlag F8), Pfeile durch die Einträge, Enter springt.
4. **E2E-Nachtrag zu Tor M1:** Falls Ticket 39 die Merkmale nicht abdecken konnte (siehe dort, Comments), führt dieser
   Test sie aus (Bedarfssumme 586,80, Wahlsumme 5.880,00, Summen unverändert). Neu in jedem Fall: Zuschlagsposition über
   den Dialog. Im M1-LV aus Ticket 39 am Ende von Untertitel 01.02 eine Zuschlagsposition mit Bezugsform Gliederung und
   Satz 10,00 % anlegen: Basis 1.169,97 + 977,59 = **2.147,56**, Betrag gerundet(214,756) = **214,76**; Titel 01.02 **2.362,32**,
   Titel 01 und Netto **5.718,75**, Nachlass 2 % **114,38**, Netto nach Nachlass **5.604,37**, MwSt 19 % **1.064,83**,
   Brutto **6.669,20**; nach Neuladen gleich. (Die Merkmalspositionen aus Ticket 39 stehen hinter der Zuschlagsposition
   oder sind Bedarf ohne Gesamtbetrag bzw. Wahl und ändern die Basis nicht; Regeln R2/R3 aus Ticket 37.)
5. **E2E Langtext und Kopfdaten:** Langtext mit fett, Liste und Tabelle eingeben, übernehmen, neu laden → gleicher Inhalt (der Editor
   bildet verlustfrei auf `Langtext` ab, Ticket 34). Auftraggeber und Eröffnungstermin setzen, neu laden → gleich.
6. **E2E Prüf-Panel:** Position ohne Einheit und doppelte OZ (Handeingabe) erzeugen → zwei Einträge; Enter auf dem
   Eintrag springt zur Zelle bzw. öffnet den Dialog; Einheit nachtragen → Eintrag verschwindet.

## Grenzen

- **Paket `apps/web`.** Fehlt im Editor, im Grid oder im Kern etwas, nicht dort ändern, sondern Lücke in die Comments
  (Tickets 34, 46, 41).
- Die App rechnet nicht (A5, N1): Basis, Betrag und Summen kommen aus dem Kern.
- Erscheinungsbild über Tokens und Bausteine aus `ui-basis` (U4), deutsche Texte in `texte.ts` (L1), ab 1280 px (U6).
- **Zu groß?** Zuerst streichen: Einheitspreisanteile im Dialog, dann die Auswahl der Grundposition (Wahl ohne Verweis),
  dann die Tastatur im Panel über Enter hinaus, dann die Leitbeschreibung (Kopfdaten des LV bleiben). Zuschlag,
  Langtext, Kopfdaten und Prüf-Panel mit Sprung bleiben.

## Acceptance criteria

- [ ] Dialog bearbeitet Kurz- und Langtext, Menge, Einheit, EP, Merkmale, Zuschlag (alle drei Bezugsformen) und EPA; jede Änderung als Befehl, nur geänderte Felder
- [ ] Abbrechen erzeugt keinen Befehl; ungültige Zahl sperrt die übrigen Felder nicht
- [ ] Prüf-Panel zeigt die Befunde aus `lvPruefen`, gruppiert, mit Zahl; Zellen im Grid tragen dieselben Befunde
- [ ] Sprunglink führt zur Zelle (mit 46) bzw. öffnet den Dialog (ohne 46); per Tastatur erreichbar
- [ ] E2E Zuschlagsposition mit den Zahlen aus Punkt 4, auch nach Neuladen; ggf. Merkmal-Nachtrag zu M1
- [ ] E2E Langtext mit Auszeichnung, Liste und Tabelle und die Kopfdaten bleiben nach Neuladen gleich
- [ ] E2E Prüf-Panel wie in Punkt 6
- [ ] Kopfdaten des LV und Leitbeschreibung bearbeitbar, je als Befehl; E2E wie in Punkt 5
- [ ] Prüfung läuft nicht im Tastendruck: Eingabe in einer Zelle bei 5.000 Positionen bleibt flüssig (Playwright-Messung < 100 ms bis zur Anzeige)
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Katalog- und Einheitenvorschläge, Zwischenablage, Undo, Papierkorb (48), GAEB (49).

## Comments

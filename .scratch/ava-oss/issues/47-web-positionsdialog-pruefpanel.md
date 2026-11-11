# 47: App: Positionsdialog mit Langtext-Editor, Prüf-Panel mit Sprunglinks (U4 + U6)

Status: merged (integration/welle-3)
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

- [x] Dialog bearbeitet Kurz- und Langtext, Menge, Einheit, EP, Merkmale, Zuschlag (alle drei Bezugsformen) und EPA; jede Änderung als Befehl, nur geänderte Felder
- [x] Abbrechen erzeugt keinen Befehl; ungültige Zahl sperrt die übrigen Felder nicht
- [x] Prüf-Panel zeigt die Befunde aus `lvPruefen`, gruppiert, mit Zahl; Zellen im Grid tragen dieselben Befunde
- [x] Sprunglink führt zur Zelle (mit 46) bzw. öffnet den Dialog (ohne 46); per Tastatur erreichbar
- [x] E2E Zuschlagsposition mit den Zahlen aus Punkt 4, auch nach Neuladen; ggf. Merkmal-Nachtrag zu M1
- [ ] E2E Langtext mit Auszeichnung, Liste und Tabelle und die Kopfdaten bleiben nach Neuladen gleich
- [x] E2E Prüf-Panel wie in Punkt 6
- [x] Kopfdaten des LV und Leitbeschreibung bearbeitbar, je als Befehl; E2E wie in Punkt 5
- [x] Prüfung läuft nicht im Tastendruck: Eingabe in einer Zelle bei 5.000 Positionen bleibt flüssig (Playwright-Messung < 100 ms bis zur Anzeige)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Katalog- und Einheitenvorschläge, Zwischenablage, Undo, Papierkorb (48), GAEB (49).

## Comments

### Umsetzer

Entscheidungen (paketlokal, umkehrbar; Frage → Entscheidung → Grund):

- Öffnen des Dialogs → Strg+Enter auf einer Zeile (vor dem Grid abgefangen, sonst nähme es Enter), Schaltfläche „Position bearbeiten“, Doppelklick nur auf OZ, Art, GP (Zellen ohne Eingabe), Sprunglink → Doppelklick auf Kurztext, Menge, Einheit, EP bleibt Bearbeiten im Grid (U3, Excel-nah).
- Merkmale-Dialog (Strg+Alt+M, Ticket 39) → bleibt neben dem Positionsdialog → M1-E2E nutzt ihn, Zusammenlegen wäre Ticket 48.
- Übernehmen → Befehle nacheinander in fester Reihenfolge OZ, Kurztext, Langtext, Menge, Einheit, EP, Merkmale+Zuschlag (ein `PositionsmerkmaleSetzen`), Anteile, Leitbeschreibung → Anteile setzen den EP (D-37.3) und kommen deshalb nach dem EP. Die Folge ist noch kein Undo-Schritt (48).
- Ungültige Eingabe → live am Feld markiert (`aria-invalid`); Übernehmen schickt die übrigen Befehle und lässt den Dialog offen mit „Markierte Felder wurden nicht übernommen“. Ein Befehl, zu dem ein ungültiges Feld gehört (z. B. eine Teilmenge im Merkmalbefehl), entfällt ganz → ein halber Merkmalbefehl wäre ein anderer Wert.
- Formfehler des Kerns → `Befehlsfehler.feld` wird einem Bereich im Dialog zugeordnet (`kernFehlerFeld`: merkmale, Wahl, Bezug, Zuschlag, EPA, Leitbeschreibung, Langtext), deutsche Meldung aus `texte.ts`; Speicherfehler als Toast wie bisher.
- Neuer gespeicherter Stand bei offenem Dialog (z. B. Kurztext aus dem Grid, dessen Befehl noch lief) → unberührte Felder folgen ihm, geänderte bleiben (`entwurfNachfuehren`) → sonst überschrieb Übernehmen den neuen Kurztext mit dem alten (im E2E gefunden).
- Ordnungszahl im Dialog (`OrdnungszahlSetzen`, Index bleibt) → aufgenommen → Punkt 6 verlangt doppelte OZ „von Hand“, das Grid kann die OZ nicht bearbeiten.
- Wahl → Gruppe und Variante als ganze Zahlen (leer = `null`), Grundposition aus einer Auswahl aller Positionen außer der eigenen (`Auswahl` aus `ui-basis`).
- Zuschlag → Schalter, Satz (leer = `null`), Bezugsform als Optionsfelder, neue Zuschlagsposition startet mit „Gliederung“; Liste über ein Suchfeld (OZ oder Kurztext, höchstens 8 Treffer) mit Teilmenge je Bezug. Basis und Betrag: `zuschlagsbasen` auf dem gedachten Stand nach den Befehlen des Entwurfs (`lvBefehlAusfuehren` + `lvChangeSetAnwenden`, nichts gespeichert) → Anzeige schon vor dem Übernehmen, die App rechnet nicht.
- EPA → sechs Felder + Bezeichnung; alle leer = `epa: null`.
- Leitbeschreibung → Schalter „Position ist Leitbeschreibung“ (aus = `null`) und Unterbeschreibungen mit Nummer (Vorschlag 01, 02, …), Kurztext, Langtext-Editor, Menge, Einheit.
- LV-Angaben → ein Dialog, je Teil ein Befehl; alles leer = `null`; Datum `TT.MM.JJJJ` (auch `JJJJ-MM-TT`) nur als echter Kalendertag, Uhrzeit `HH:MM[:SS]`, Gewährleistung Dauer (ganze Zahl) + Einheit als Text.
- Prüf-Panel → Seitenleiste rechts (300 px), einklappbar, Zahl im Kopf; Gruppen Fehler, dann Warnungen, je Eintrag OZ + Kurztext (LV-weit: „LV“) und die Meldung des Kerns. F8 (Schaltfläche „Prüfung“ ebenso) fokussiert den ersten Eintrag, Pfeile/Pos1/Ende wandern, Enter springt.
- Prüfzeitpunkt → `requestIdleCallback` (timeout 1 s), Rückfall `setTimeout` 50 ms; ein neuer Zustand bricht die ausstehende Prüfung ab.
- Sprungziel → Feld ist eine Grid-Spalte: Zelle (Ticket 46 ist gemergt); Gliederung ohne Feld: Zeile; Position mit Feld ohne Spalte (Langtext, Zuschlag, …) oder ohne Feld (Zuschlag, Wahl): Zeile und Positionsdialog; LV-weit: `nachlass` fokussiert das Nachlassfeld, sonst kein Ziel. Vorfahren werden aufgeklappt.
- Befunde ohne passende Spalte (z. B. `langtext-leer`) → das Grid zeigt sie an der ersten Spalte (OZ), wie `ui-grid` es vorsieht. Die Zellbeschreibung steht im Textinhalt der Zelle; E2E-Prüfungen auf Zellwerte lesen deshalb `.tx-grid__text` (`lv.spec.ts` mechanisch angepasst).

Lücken (nicht hier geändert):

- **Kern (Ticket 27/41):** `LangtextAendern` (und `HinweistextAendern`) nimmt nur Textläufe und Bilder auf oberster Ebene an (`langtextFehler`, `packages/kern/src/feld-befehle.ts`) und weist Absatz, Liste, Tabelle, Umbruch und Textergänzung (Vertrag v1.1b) mit `ungueltige-eingabe` ab. Ein Langtext mit mehreren Absätzen, Liste oder Tabelle lässt sich deshalb nicht speichern; der Dialog zeigt die Abweisung am Langtext (U5). Der E2E „Langtext mit Liste und Tabelle“ steht als `test.fixme` in `e2e/dialog.spec.ts` bereit; der E2E mit Fett/Kursiv/Unterstrichen in einem Absatz ist grün.
- **Editor (Ticket 34):** keine Schaltfläche „Tabelle einfügen“; Tabellen kommen nur über die Zwischenablage (der fixme-E2E fügt HTML ein).
- **Grid (Ticket 46/48):** Doppelklick auf eine bearbeitbare Zelle startet immer das Bearbeiten; ein eigener Rückruf „Zeile öffnen“ fehlt. Aktive Zeile weiter nur über `onAuswahlChange` (Ticket 39).

Messwert (Punkt 9, `e2e/leistung.spec.ts`, 5.000 Positionen, Prüfung läuft mit): Median gesamt 77 / 94 / 67 ms in drei Läufen, App ohne Speicher Median 19 / 20 / 18 ms.

Suite (Umsetzer): `pnpm lint`, `pnpm typecheck` grün; `pnpm test` 1503 bestanden, 2 übersprungen (nicht aus diesem Ticket); `pnpm --filter @tethys/web e2e` 26 bestanden, 1 `fixme` (Langtext mit Liste und Tabelle, siehe Lücken).


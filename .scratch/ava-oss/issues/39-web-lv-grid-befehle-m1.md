# 39: App: LV-Grid an Befehle angebunden, Projektliste, E2E für Tor M1 (U3)

Status: resolved
Type: task
Welle: 3 (Phase A) · Strang: U (U3) · Paket: `apps/web`
Blocked by: 30, 33, 38
Regeln: A1, A2, A5, A7, N1, N4, U1, U2, U3, U5, U6, U7, U8, Q2, Q5, E-14, E-18, C3
Herkunft: `plan.md` §2 U3 und §4 (M1), altes Ticket `.scratch/ava-mvp/issues/12` und `11` (App-Teil), W-06 (Lücken des Grids aus dem Prototyp, `next-decisions-welle-2.md`), Ticket 18 (Comments: Tastatur und Lücken)

## What to build

Die App wird zum ersten Mal echt: Projekte anlegen, ein LV im Grid bearbeiten, jede Änderung als Befehl durch den Kern,
sofort gespeichert, nach Neuladen wieder da. Das ist der vertikale Schnitt für das Tor **M1 „LV anlegen, rechnen,
speichern“**. Vorgehen: TDD mit dem Skill `tdd` (reine Logik als Vitest, Abläufe als Playwright); am Ende
`pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün. `okf/research/` wird nicht gelesen (C3).

1. **Befehlsweg (A5, U7).** Eine kleine Schicht in `apps/web/src/lv/` (Ordner je Strang, `plan.md` §1):
   `Befehl → kern (lvBefehlAusfuehren / Projektbefehle) → speicher.anwenden(Protokolleintrag, ChangeSet) → Zustand im
   Speicher der App fortschreiben (lvChangeSetAnwenden) → neu zeichnen`. Erst speichern, dann anzeigen: schlägt
   `anwenden` fehl, bleibt die Anzeige beim alten Stand und eine Meldung (Toast aus `ui-basis`) nennt den Grund (Q5).
   Befehlsfehler des Kerns erscheinen als Meldung an der Zelle bzw. als Toast, sperren nichts (U5). Befehlshinweise
   (`hinweise` am ChangeSet, z. B. `oz-schritt-ausgewichen`, `netto-nach-nachlass-negativ`) erscheinen als Hinweis.
   - Kennungen: eine `IdQuelle` der App erzeugt UUIDv7 (A7); Zufall und Uhr gibt es nur hier, nie im Kern (A2).
   - Protokolleintrag: `wer` ist der eine Nutzer (eine Konstante, ADR 0009), `wann` die Uhr der App.
   - `GridZahlen` verdrahtet mit `@tethys/dezimal` (de-DE nur am Rand, N4).
2. **Speicher öffnen** (`speicherOeffnen` über den Worker, OPFS). Ist die Datenbank in einem anderen Tab offen
   (`gesperrt`), zeigt die App eine verständliche Meldung statt eines leeren Bildschirms (E-14).
3. **Projektliste** (Seite `/`, ersetzt den Platzhalter): Projekte nach Name, Projekt anlegen (`ProjektAnlegen`, Name und
   Bauherr), umbenennen (`ProjektStammdatenSetzen`), öffnen. Im Projekt: LVs auflisten, LV anlegen
   (`LeistungsverzeichnisAnlegen` mit leerem Inhalt, MwSt 19,00 %, Maske `NN.NN.NNNN[I]`, beides änderbar), umbenennen
   (`LeistungsverzeichnisUmbenennen`), öffnen. Projekt exportieren (Projektdatei herunterladen) und importieren (Datei
   wählen; `existiert-bereits` erscheint als Meldung). **Löschen von Projekt oder LV kommt mit Ticket 48**, wenn Undo es
   absichert (Q5).
4. **LV-Seite** (`/lv/<id>`; das Routing in `ui/route.ts` reicht, ein Router-Paket ist nicht nötig): das `LvGrid` aus
   `ui-grid` mit `LvAnsicht` aus dem LV-Zustand (Zeilen, Auf-/Zuklappen gehört der App, `wurzelId`, Summenzeile). Dazu
   die Lücken aus dem Prototyp (W-06), soweit sie die App schließen kann, ohne `ui-grid` anzufassen:
   - **Titel anlegen** und **Position anlegen** ohne Zwischenablage: Schaltflächen über dem Grid (und Tastenkürzel der
     App, z. B. Strg+Umschalt+T / Strg+Umschalt+P; nicht mit Tastenkürzeln des Grids kollidieren), eingefügt hinter der
     aktiven Zeile (`GliederungAnlegen`, `PositionAnlegen`).
   - **Ordnungszahl** für neue Knoten: bis Ticket 42 einen OZ-Vorschlag liefert, über die Schaltfläche „Umnummerieren“
     (`Umnummerieren` des Teilbaums); Ticket 48 stellt auf den Vorschlag um.
   - **Nachlass und MwSt bearbeiten**: Felder an der Summenzeile (Prozent oder Betrag; leeren entfernt den Nachlass) →
     `NachlassSetzen`, `NachlassEntfernen`, `MwstSatzSetzen`.
   - **Merkmale**: Ist Ticket 37 beim Start oder spätestens vor dem Merge gemergt, ein kleines Menü an der Zeile
     (Bedarf ohne/mit Gesamtbetrag, Wahl, Stundenlohn, Pauschal) → `PositionsmerkmaleSetzen`; die Spalte „Art“ zeigt sie.
     Sonst entfällt das Menü hier und kommt mit dem Positionsdialog (47); in den Comments vermerken.
   - Zeile löschen, verschieben, kopieren und Undo **nicht** hier (46, 48).
5. **Leistung.** Ein LV mit 5.000 Positionen (`gross`, über einen Testpfad geladen) bleibt im Grid flüssig (Q4; das Grid
   selbst ist in 21/33 gemessen, hier zählt die App-Schicht): Eine Mengenänderung bis zur aktualisierten Summenzeile
   unter 100 ms im Playwright-Test (Messwert im Ticket).

### E2E für das Tor M1 (`apps/web/e2e/m1.spec.ts`)

Ablauf, nur über Tastatur und Schaltflächen (U3, U8): Projekt anlegen → LV anlegen (Maske `NN.NN.NNNN[I]`, zwei
Gliederungsebenen) → Titel 01 → Untertitel 01.01 und 01.02 → fünf Positionen tippen → Umnummerieren → Nachlass 2,00 %
→ **Seite neu laden** → dieselben Werte stehen da. Die Positionen stammen aus `fixtures/typisch.json` (der Test liest die
Datei und nimmt Menge, Einheit, EP, Kurztext der genannten Fixture-OZ; die Sollwerte der GP liest er aus den Fixture-
`sollwerte`):

| Ort | Fixture-OZ | Menge × EP | GP (Fixture-Sollwert) |
|---|---|---|---|
| 01.01 | 01.0010 | 1,000 psch × 1.850,000 | 1.850,00 |
| 01.01 | 01.0020 | 86,500 m × 7,450 | 644,43 |
| 01.01 | 01.0030 | 4,000 Mon × 215,500 | 862,00 |
| 01.02 | 01.0050 | 3,000 St × 389,990 | 1.169,97 |
| 01.02 | 01.0060 | 410,750 m² × 2,380 | 977,59 |

Sollwerte nach der Rechenregel aus `fixtures/README.md` (Summe der gerundeten GP, Nachlass gerundet dann abgezogen, MwSt
einmal auf die Summe): Titel 01.01 **3.356,43** · 01.02 **2.147,56** · 01 **5.503,99** · Netto **5.503,99** · Nachlass 2 %
**110,08** · Netto nach Nachlass **5.393,91** · MwSt 19 % **1.024,84** · Brutto **6.418,75**. (5.503,99 ist zugleich die
Titelsumme 01 der Fixture `typisch`, die dieselben Positionen plus eine Bedarfsposition ohne Gesamtbetrag enthält; ein
zweiter Abgleich.)

**Merkmale (nur wenn Ticket 37 gemergt ist, siehe Punkt 4):** zusätzlich 01.0010 als Pauschal (Summe gleich),
01.0060 als Bedarf mit Gesamtbetrag (Summe gleich), eine Position 01.02 aus Fixture 01.0040 (12,000 h × 48,900 = 586,80)
als Bedarf ohne Gesamtbetrag **und** Stundenlohn, eine aus Fixture 02.0070 A (96,000 m² × 61,250 = 5.880,00) als Wahl.
Erwartet: Netto und alle Summen wie oben unverändert, Bedarfssumme **586,80**, Wahlsumme **5.880,00**, beide auch nach
Neuladen. Zuschlagspositionen deckt der E2E von Ticket 47 ab (sie brauchen den Positionsdialog).

## Grenzen

- **Paket `apps/web`.** Abhängigkeiten auf `@tethys/kern`, `speicher`, `ui-grid`, `vertrag`, `dezimal` in
  `apps/web/package.json` sind erlaubt (A3: die App darf alle Pakete einbinden). Fehlt in `ui-grid`, `kern` oder `speicher`
  etwas, nicht dort ändern, sondern als Lücke in die Comments (Tickets 46, 42, 43).
- Die App rechnet nie selbst (N1, A5): Summen kommen aus dem Kern, Formatierung aus `dezimal`.
- Bedienung des Grids bleibt, wie sie ist (E-18: Enter beginnt das Bearbeiten, Leertaste wählt die Zeile, Einfügen legt
  neue Positionen an).
- Desktop ab 1280 px (U6); deutsche Texte in `texte.ts` (L1); Kontrast und Tastatur (U8).
- **Zu groß?** Zuerst streichen: Export/Import der Projektdatei (Punkt 3, zweiter Teil), dann Leistungsmessung (Punkt 5),
  dann Umbenennen. Der M1-E2E bleibt.

## Acceptance criteria

- [x] Jede Änderung im Grid und auf den Seiten geht als genau ein Befehl durch Kern und Speicher (Test mit einer Attrappe, die Befehle zählt); kein Schreibzugriff an den Befehlen vorbei
- [x] Speicherfehler: Anzeige bleibt beim alten Stand, Meldung erscheint (Test mit einem Speicher, der `speicher-voll` liefert)
- [x] Zweiter Tab: verständliche Meldung (E-14), Playwright
- [x] Projektliste: anlegen, umbenennen, öffnen; LV anlegen, umbenennen, öffnen; Export und Import der Projektdatei (Playwright: exportieren, in frischem Speicher importieren, gleiche Summen)
- [x] Position und Titel ohne Zwischenablage anlegen; Nachlass und MwSt an der Summenzeile bearbeiten (Playwright)
- [x] **M1-E2E** wie oben: fünf Positionen in zwei Ebenen, alle Summen wie in der Tabelle, nach Neuladen gleich; mit Ticket 37 zusätzlich die Merkmale samt Bedarfs- und Wahlsumme (sonst in den Comments vermerkt, wird in 47 nachgeholt)
- [ ] Mengenänderung bei 5.000 Positionen bis zur Summenzeile < 100 ms (Messwert im Ticket)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Positionsdialog und Langtext (47), Prüf-Panel (47), Zwischenablage für Zeilen, Verschieben, Löschen, Papierkorb, Undo,
LV-Stände (46, 48), GAEB (49), Preisspiegel (Welle 4), Löschen von Projekt und LV (48), Datensicherung (S4).

## Answer

- Gebaut: `apps/web`: LV-Grid an Befehle angebunden, Projektliste, Tastenkürzel für Titel/Untertitel/Position/Merkmale, Speicher-Sperre mit Wiederholung, Testpfad `VITE_TESTPFAD`; E2E `m1.spec.ts` für Tor M1.
- Merge: `be53631` (integration/welle-3).
- Offen: Offen: Kriterium „Mengenänderung < 100 ms bis zur Summenzeile“ nicht hart erfüllt (Median gesamt 78–86 ms, unter Last 101–133 ms; `speicher.anwenden` 68–111 ms) → Ticket 52. Lücken: Vertrag/Kern (`Einfuegeort` nach Gliederung, `auflisten`) → 53, aktive Zeile im Grid → 54.

## Comments

### Umsetzer

Entscheidungen (paketlokal, umkehrbar; Frage → Entscheidung → Grund):

- Tastenkürzel → Strg+Alt+T (Titel), Strg+Alt+U (Untertitel), Strg+Alt+P (Position), Strg+Alt+M (Merkmale) → Strg+Umschalt+T ist in Chrome reserviert (letzten Tab öffnen), das Grid nutzt Strg ohne Alt.
- Ort neuer Knoten → Position „hinter der aktiven Zeile“ wie Strg+Plus; Titel am Ende der Ebene der aktiven Gliederung; Untertitel als letztes Kind → `Einfuegeort` kennt „hinter einer Gliederung“ nur als „erstes Kind“, ein Geschwister direkt hinter einem nicht letzten Titel ist in einem Befehl nicht ausdrückbar (Lücke Vertrag/Kern, für 42/48).
- Aktive Zeile → aus `onAuswahlChange` (letzte gemeldete Zeile) → `ui-grid` hat keinen Rückruf für die aktive Zeile (Lücke 46/48); nur Fokus per Tab ins Grid meldet keine Auswahl.
- Umnummerieren → ganzes LV (`teilbaumId` = LV-Kennung) → einfachster Fall für M1; Teilbaum-Umnummerieren mit Ticket 48 (OZ-Vorschlag).
- Merkmale → Dialog „Merkmale“ an der aktiven Position (Optionsfelder, Enter übernimmt), ein `PositionsmerkmaleSetzen`; eine neue Wahl ohne Gruppe/Variante/Grundposition (nichts erfinden), eine bestehende Wahlzuordnung bleibt.
- Speicher-Sperre (E-14) → Öffnen wird bei `gesperrt` 12 × 250 ms wiederholt, dann Meldung mit „Erneut versuchen“ → beim Neuladen gibt der alte Worker die OPFS-Handles erst kurz nach dem Start der neuen Seite frei.
- Testpfad → `VITE_TESTPFAD=1` (nur Test-Build, wie `VITE_KATALOG`): `window.tethysTest` legt ein LV als `LeistungsverzeichnisAnlegen` an, lässt `anwenden` Fehler liefern und misst `anwenden`; nie an den Befehlen vorbei.
- `playwright.config.ts` → `PW_WEB_PORT` (Standard 4173) und `workers: 1` → parallele Worktrees auf einer Maschine stießen auf den belegten Port.

Lücken (nicht hier geändert):

- `leistungsverzeichnisse.auflisten` liefert nur Kennungen: Die Projektseite lädt jedes LV ganz, um Name und Netto zu zeigen (langsam bei vielen großen LVs; Übersicht mit Namen gehört in ein Vertragsticket).
- Siehe oben: aktive Zeile in `ui-grid`, Einfügeort „hinter einer Gliederung“ in Vertrag/Kern.

Messwert (Punkt 5, `e2e/leistung.spec.ts`, `gross`, Mengenänderung Enter → Summenzeile, 9 Messungen nach 2 zum Aufwärmen,
Maschine mit Last 5–7 durch parallele Agenten): Median gesamt 78 / 82 / 86 ms in drei Läufen, unter starker Last 101 / 133 ms;
davon `speicher.anwenden` (Worker, OPFS) Median 68–111 ms, **App-Schicht ohne Speicher Median 11–16 ms**. Hart geprüft wird die
App-Schicht (< 100 ms) und die Gesamtzeit mit grober Schranke (< 400 ms), weil der Speicheranteil mit der Last schwankt
(Ticket 10: Einzelbefehl allein Median 47 ms, „nicht optimiert“). Das Kriterium „< 100 ms bis zur Summenzeile“ hält damit
auf einer ruhigen Maschine, ist aber nicht hart gesichert; der Hebel liegt in `speicher` (Prüfung beim `anwenden`).

M1-E2E (`e2e/m1.spec.ts`): Ticket 37 ist gemergt, die Merkmale sind enthalten.

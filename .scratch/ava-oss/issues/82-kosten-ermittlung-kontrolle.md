# 82: C2+C3: Kostenermittlung als Aggregat, Kostenkontrolle

Status: resolved
Type: task
Welle: 5 · Strang: C2, C3 · Paket: `packages/kosten`
Blocked by: 70, 78
Regeln: A2, A3, A5, N1–N3, F4, U5, Q1, G-16, D-24, D-36, D-37, D-38
Herkunft: `plan.md` §2 C2, C3; `vertrag` v1.4 (Ticket 70, Comments „Folgearbeit Kosten“)

## What to build

1. **Kostenermittlung-Befehle** (v1.4): `kostenermittlungBefehlAusfuehren`, `kostenermittlungChangeSetAnwenden`,
   `kostenermittlungChangeSetUmkehren`; Formprüfungen (Nummer per `kgLesen`, Betrag kanonisch 2 Stellen, Nummern im
   gespeicherten Stand eindeutig); ChangeSet als ganzes Aggregat. Der vorhandene Weg „ungeprüfter Text → Eintrag mit
   Befunden“ (`kostenermittlungBerechnen`, CSV) bleibt und erzeugt die Einträge für `KostenermittlungAnlegen` (doppelte
   Nummern dabei zusammenfassen mit Befund, D-55.4).
2. **Kostenkontrolle (D-37).** `kostenkontrolleBerechnen({ budget: Kostenermittlung | null; auftraege: readonly
   AuftragsLvZustand[]; leistungsstaende: readonly { auftragsLvId; leistungsstand: Leistungsstand }[] })`: Zeilen je
   Kostengruppe (Baumsummen nach D-24: eigener Wert + Kinder), „ohne Kostengruppe“, „Nachlass“ (negativ, ohne Budget),
   Gesamt; Spalten Budget, Vergabe (Σ der Positionssummen des Auftrags-LV aus `summen.positionen`, nur zählende Positionen
   nach F4, je KG der Position), Abrechnung (Σ `Leistungsstand.positionen.gp` je KG; Nachlasszeile =
   `Leistungsstand.nachlass`), Abweichung Vergabe − Budget. Gesamt Vergabe = Σ Netto nach Nachlass der Auftrags-LVs; Gesamt
   Abrechnung = Σ `nettoNachNachlass`. Netto durchgehend; Umlagen, Einbehalt und MwSt gehören nicht dazu. Mehrere
   Auftrags-LVs je Projekt werden addiert. `kosten` importiert `kern` nicht (A3): die Positionssummen stehen im Zustand.
3. Befunde (U5): Kostengruppe der Position nicht in der Budget-Gliederung (zählt trotzdem), Position mit KG der Ebene 1 und
   Budget nur auf Ebene 3 (Hinweis), Leistungsstand zu einem unbekannten Auftrags-LV.

## Grenzen

- Nur `packages/kosten` (Module neben `kalkulation.ts` aus Ticket 78). Keine Speicherung, keine Oberfläche.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Golden-Tests mit hergeleiteten Werten; Property-Test: Summe der Zeilen (Ebene 1 + ohne KG + Nachlass) = Gesamt, auf den
      Cent, je Spalte; Reihenfolge der Positionen ändert nichts
- [x] anwenden ∘ umkehren = Identität für jeden Kostenermittlung-Befehl
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Pflichtpunkt: den Eingabetyp `Kostenermittlungseintrag` in `kosten` umbenennen (Vorschlag `Kostenermittlungseingabe`),
  damit es nicht zwei Typen gleichen Namens gibt (L1/L2; Offene Typfrage 12 aus Ticket 70). Verbraucher im Repo mitziehen
  (nur `kosten` selbst; die App nutzt den Typ noch nicht).

## Comments

- **D-82.1** Was wird aus der markierten Zeile in `kostengruppe.ts`? → Marker und Weiterexport von `Kostengruppennummer`
  entfernt; alle Module und Tests importieren die Marke aus `vertrag`. Grund: eine Quelle (A4); außerhalb von `kosten` hat
  niemand die Marke aus `kosten` importiert.
- **D-82.2** Umbenennung (Pflichtpunkt D-42)? → `Kostenermittlungseintrag` in `kosten` heißt `Kostenermittlungseingabe`; dabei
  ist auch `nummer` ungeprüfter Text (`string`), wie schon `betrag` (S11). Der gespeicherte Eintrag aus `vertrag` ist ihr
  zuweisbar. Glossar „Kostenermittlung“ nennt beide. Grund: L1/L2, Offene Typfrage 12; die Rechnung liest die Nummer ohnehin
  mit `kgLesen`, ein Markentyp am Eingang war eine falsche Zusicherung.
- **D-82.3** Wie entstehen die Einträge für `KostenermittlungAnlegen`? → Keine neue Funktion: `kostenermittlungBerechnen`
  liefert zusätzlich `eintraege` (Speicherform): je gültiger Nummer ein Eintrag mit dem eigenen Betrag (Duplikate addiert,
  Befund `nummer-doppelt`, D-55.4; nicht kanonische Beträge gerundet mit Befund, D-55.3; Ungültiges zählt nicht), nach
  Nummer geordnet; die verschiedenen nicht leeren Bemerkungen einer Nummer mit „; “ verbunden, in Eingabereihenfolge. Grund:
  ein Weg für Grid und CSV; keine Bemerkung geht beim Zusammenfassen verloren (Q5).
- **D-82.4** Was prüft der Ausführer? → Nur die Form (D-70.3): Nummer genau in der Form von `kgLesen` (Leerraum, den
  `kgLesen` duldet, ist im gespeicherten Stand ein Fehler), Betrag mit `alsBetrag`, Bemerkung Text, Stufe aus der
  geschlossenen Liste, Name Text; Fehler `ungueltige-eingabe` mit `feld` (`nummer`, `betrag`, `bemerkung`, `stufe`, `name`).
  `KostenermittlungAnlegen` verlangt Zustand `null`, alle anderen einen Zustand, sonst `befehl-nicht-zustaendig` (wie der
  Kern). Anlegen ordnet und weist doppelte Nummern ab; Setzen ersetzt oder fügt an der Stelle ein; Entfernen einer
  fehlenden Nummer ist `ungueltige-eingabe` (`nummer`); `bemerkung: ''` fällt immer weg. Ein angenommener Befehl ohne
  Wirkung liefert trotzdem ein ChangeSet (vorher = nachher). Anwenden nimmt `nachher` (ganzes Aggregat, `null` = gelöscht),
  Umkehren tauscht. Negative Beträge und eigene Beträge neben Kindern nimmt er an (Befund der Rechnung, U5).
- **D-82.5** Leere Zellen der Kostenkontrolle? → `budget` ist `null` ohne gewähltes Budget, in „ohne Kostengruppe“ und
  „Nachlass“ (D-37: „ohne Budget“) und für eine Kostengruppe außerhalb der Budget-Gliederung. `abweichung` = Vergabe −
  (Budget oder 0); `null` ohne Budget und für eine Zeile unter einer Kostengruppe der Budget-Gliederung (dort steht die
  Abweichung; sonst erschiene z. B. 331 unter einem Budget auf 330 als volle Überschreitung). So gehen Ebene 1 + ohne KG +
  Nachlass je Spalte auf den Cent auf (Property-Test). D-85.3 schreibt Budget 0,00 und eine Abweichung in jeder Zeile;
  in der M4-Fixture liegt keine Zeile unter einer Budgetgruppe, die Zahlen sind gleich (Golden-Test bildet `null` → 0,00 ab).
- **D-82.6** Befunde zur Budget-Gliederung? → Nur mit Budget, je Position mit Kostengruppe (Auftrags-LV und Position
  angegeben). Keiner, wenn die Gruppe oder ein Vorfahre einen eigenen Budget-Eintrag hat (der Normalfall: Budget auf Ebene
  2, Positionen auf Ebene 3). Sonst: liegt die Gruppe in der Gliederung nur als Vorfahre von Budget-Einträgen, Hinweis
  `kostengruppe-groeber-als-budget` (das Ticket nennt Ebene 1 gegen Ebene 3; jede gröbere Ebene verhält sich gleich);
  liegt sie gar nicht darin, Warnung `kostengruppe-ohne-budget`. Die Position zählt immer (U5).
- **D-82.7** Leistungsstände? → Einer zu einem nicht übergebenen Auftrags-LV: Warnung `leistungsstand-unbekannt`, zählt nicht;
  ein zweiter zum selben Auftrags-LV: Warnung `leistungsstand-doppelt`, nur der erste zählt. Eine Position des
  Leistungsstands, die das Auftrags-LV nicht kennt oder die keine Kostengruppe trägt, geht in „ohne Kostengruppe“. Grund:
  die App wählt je Auftrags-LV genau die letzte Rechnung (D-37); doppelt zählen wäre falsch, still verwerfen auch (Befund).
- **D-82.8** Gesamt aus dem Summenstand oder aus den Zeilen? → Aus dem Summenstand bzw. Leistungsstand (`nettoNachNachlass`,
  D-37); Vergabe je Zeile aus `summen.positionen` mit `gehtInSummeEin` und GP (F4). Weichen Zeilen und Gesamt ab (ein
  Summenstand passt nicht zu seinen Positionen), Warnung `summe-abweichend` mit der Spalte, ohne Korrektur.
- **D-82.9** Form des Ergebnisses? → Getrennte Felder `kostengruppen`, `ohneKostengruppe`, `nachlass`, `gesamt` mit je
  `budget`, `vergabe`, `abrechnung`, `abweichung` statt einer Liste mit Zeilenart; Befunde mit eigener Schwere
  `warnung | hinweis` (die `Befundschwere` des Vertrags kennt nur `warnung | fehler`). Grund: die Oberfläche (Ticket 89)
  braucht die Sonderzeilen getrennt; kein Vertragstyp nötig (A4).

## Answer

Merged: ee710e9 in integration/welle-5


Branch `welle-5/82-kosten-kontrolle` (auf `integration/welle-5` gemergt). Paket `packages/kosten`, neue Module
`kostenermittlung-befehle.ts` und `kostenkontrolle.ts`; `kostenermittlung.ts` und `kostengruppe.ts` angepasst; Glossar
(„Kostenermittlung“, neu „Kostenkontrolle“). Öffentliche API (`@tethys/kosten`):

- `kostenermittlungBefehlAusfuehren`, `kostenermittlungChangeSetAnwenden`, `kostenermittlungChangeSetUmkehren` nach den
  Signaturen von `vertrag` v1.4 (`KostenermittlungBefehlAusfuehren` usw.).
- `kostenermittlungBerechnen(eingaben: Kostenermittlungseingabe[])` liefert zusätzlich `eintraege:
  Kostenermittlungseintrag[]` für `KostenermittlungAnlegen`; der Eingabetyp heißt jetzt `Kostenermittlungseingabe`.
- `kostenkontrolleBerechnen({ budget, auftraege, leistungsstaende }): Kostenkontrolle` → `{ kostengruppen:
  Kostenkontrollzeile[] (nummer, ebene, budget, vergabe, abrechnung, abweichung), ohneKostengruppe, nachlass, gesamt:
  Kostenkontrollwerte, befunde: Kostenkontrollbefund[] }`.
- `Kostengruppennummer` kommt nur noch aus `vertrag` (kein Weiterexport aus `kosten`).

Tests: Golden-Tests der Befehle (Form, Ordnung, Löschen), der Einträge aus der Eingabe, der Kostenkontrolle (Hand-Beispiel
mit zwei Auftrags-LVs, ohne Budget, Leistungsstand doppelt/unbekannt, widersprüchliche Summen, Budget nur unterhalb) und
gegen die M4-Sollwerte aus `fixtures/typisch-abrechnung.json` (auf den Cent); Property-Tests: anwenden ∘ umkehren =
Identität für jeden Befehl, Einträge geordnet und eindeutig, Zeilensumme = Gesamt je Spalte, Vergabe und Abrechnung je
Teilbaum, Reihenfolge von Positionen und Auftrags-LVs. Volle Suite grün nach dem Merge: Lint, Typecheck, Vitest 2214
bestanden (2 übersprungen, wie zuvor), Fixtures 29/29.

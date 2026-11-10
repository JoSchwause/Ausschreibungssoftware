# 07: Summen, Nachlass und MwSt mit ChangeSet (K4)

Status: resolved (gemergt 2026-11-10, Branch claude/wave-0-1-orchestration-nkdqfx)
Type: task
Welle: 1 · Strang: K · Paket: `packages/kern`
Blocked by: 05
Regeln: A2, A6, N1, N2, N3, G-23, G-28, Q1, Q4

## What to build

GP je Position = `round(Menge × EP, 2)`; Titel- und LV-Summen aus den **gerundeten** GPs; Nachlass (ein Nachlass je LV,
prozentual oder absolut, umkehrbar, **nicht** in die EP eingerechnet; G-23); MwSt (ein Satz je LV) auf die **Nettosumme
nach Nachlass**, nicht je Position (N2, G-28). Jede Änderung liefert ein ChangeSet mit den geänderten Knoten und den
betroffenen Summen; Neuberechnung **nur im betroffenen Teilbaum** (A6). Hier nur Normalpositionen und Hinweistexte;
Bedarf, Wahl, Zuschlag, Pauschal kommen mit K5/K6.

## Acceptance criteria

- [x] Golden (herleitbar aus N2): 12,35 + 15,20 = 27,55 · MwSt 19 % = 5,2345 → 5,23 (nicht 5,24) · Brutto 32,78
- [x] Golden: 402,73 − 3 % = 390,6481 → 390,65 · MwSt 19 % = 74,2235 → 74,22 · Brutto 464,87
- [x] `fixtures/winzig` und `fixtures/typisch` ergeben exakt die Sollwerte aus Ticket 19
- [x] Eine Mengenänderung an einer Position liefert ein ChangeSet nur mit dieser Position, ihren Titelsummen und der LV-Summe; Test prüft, dass unbeteiligte Knoten fehlen
- [x] Property-Test: Summe über alle Positionen = LV-Summe, für zufällige Bäume
- [x] Nachlass setzen und entfernen stellt die Summen wieder her (Umkehrbarkeit)
- [x] Leistungsbudget als Test: Einzeländerung in `fixtures/gross` (5.000 Positionen) unter 16 ms (Q4); Messwert im Ticket festhalten
- [x] Rundung negativer Beträge folgt der Entscheidung aus Ticket 04

## Nicht-Ziele

Wahl-/Grundpositionen und Zuschlagspositionen (K6), mehrere Nachlässe (nicht zugelassen, G-26), MwSt-Satzwechsel, Preisspiegel (V2).

## Comments

### Ergebnis (Branch `worktree-agent-a64378d3fcac9f46b`)

Geliefert in `packages/kern/src/`. `pnpm lint`, `pnpm typecheck`, `pnpm test` laufen grün (Vitest: 18 Dateien, 364 Tests, 1 übersprungen
aus Ticket 05; Node-Tests der Fixtures: 10 pass). Test-first: erst `summen.test.ts`, `summen-eigenschaften.test.ts`,
`summen-leistung.test.ts` (eigener roter Commit), dann der Code.

**Wo die Regeln stehen**

| Datei | Inhalt |
|---|---|
| `summenregeln.ts` | die drei (vier) offenen Fachregeln, je EINE benannte Funktion, plus `SUMMEN_ANNAHMEN` (Status „vorläufige Annahme, Entscheidung offen“) |
| `summen.ts` | `positionsSumme` (GP, `gehtInSummeEin`), `gesamtsummen`, `summenBerechnen` (vollständige Neuberechnung, Orakel), `summenAenderung` (Neuberechnung entlang der Elternkette), Index des Summenstands |
| `summen-befehle.ts` | Handler `MengeAendern`, `EinheitspreisAendern`, `NachlassSetzen`, `NachlassEntfernen`, `MwstSatzSetzen` |
| `knoten-befehle.ts`, `lv-anlegen.ts` | `PositionAnlegen`, `GliederungAnlegen`, `KnotenLoeschen`, `KnotenVerschieben`, `LeistungsverzeichnisAnlegen` liefern ihre Summen |
| `changeset.ts` | `lvChangeSetAnwenden` pflegt `summen` vollständig; `changeSetUmkehren(cs, zustandVorher)`; `baueChangeSet` |

Neu exportiert über `index.ts`: `summenBerechnen`, `positionsSumme`, `gesamtsummen`, `SUMMEN_ANNAHMEN`, `positionGehtInSumme`, `nachlassBetrag`,
`nettoNachNachlass`, `nachlassFehler`, `mwstSatzFehler`. Geändert: `changeSetUmkehren(changeSet, zustandVorher: LvZustand | null)`, der zweite Parameter ist
**Pflicht** (ein Aufruf ohne ihn wäre still falsch). `ZUSTAENDIGES_TICKET` verliert die fünf Schlüssel.

**Verhalten**

- GP = `gesamtpreis(menge, ep)` aus `dezimal`; Titel/Los-Summe = Summe der GP der eingehenden Positionen im Unterbaum; Netto = Summe der obersten Beiträge;
  Nachlass, MwSt (einmal auf Netto nach Nachlass), Brutto über `dezimal`. Keine eigene Arithmetik, kein `number` für Werte.
- **Nicht gesetzt:** `menge` oder `einheitspreis` `null` → `gesamtpreis: null`, `gehtInSummeEin: false`, trägt nichts bei (nicht gleich 0,00). 0,000 ist ein
  gesetzter Wert (GP 0,00, geht ein). Folgt den Vertragskommentaren.
- **Zustand:** `LvZustand.summen` ist nach jedem `lvChangeSetAnwenden` der vollständige, richtige `Summenstand`. Die Einträge stehen in Reihenfolge der Knoten
  (Positionen, Gliederungen), der Stand ist also eine Funktion des Zustands. Property-Test: für zufällige Befehlsfolgen gleich `summenBerechnen` (und gleich einem
  zweiten, unabhängigen rekursiven Orakel im Test).
- **ChangeSet minimal (A6):** ein Befehl meldet, um welchen Betrag sich der Beitrag an einem Elternknoten ändert; die Gliederungen von dort bis zur Wurzel ändern sich
  um diesen Betrag (O(Tiefe)). Eine Mengenänderung nennt genau die Position, die Summen ihrer Vorfahren und `gesamt`. Nicht genannt werden Summen ohne Wertänderung
  (gleiche Menge noch einmal: leeres ChangeSet; Menge ändert sich, GP nicht; Wahl- oder Bedarfsposition ohne Gesamtbetrag: nur ihr eigener GP). `gesamt` ist `null`,
  wenn sich die Gesamtsummen nicht ändern. Verschieben: alte und neue Kette; gemeinsame Vorfahren ändern sich netto nicht und bleiben ungenannt. Der Property-Test
  prüft nach jedem Befehl, dass die genannten Summen genau die gegenüber dem Altzustand neuen oder geänderten sind.
- `NachlassSetzen` und `MwstSatzSetzen` liefern `kopf` (vorher/nachher) und die neuen Gesamtsummen, keine Knoten, keine Positions- oder Gliederungssummen. Derselbe Wert
  noch einmal: leeres ChangeSet. Der Nachlass geht nie in EP oder GP ein (N5).
- Fehlerwerte: `knoten-unbekannt` (auch die Wurzel), `knotenart-unzulaessig` (ID ist keine Position), `ungueltige-eingabe` (Zahl nicht kanonisch oder falsche Skala,
  Nachlass und MwSt außerhalb der Grenzen).
- **Negative Werte:** Rundung nach `dezimal` (Entscheidung Ticket 04, GLOSSARY „Kaufmännische Rundung“: nach dem Betrag runden, Vorzeichen danach). Golden: Menge −2,500 × EP 0,010
  = −0,025 → GP −0,03, +2,500 × 0,010 → 0,03; Titelsumme −0,03 + 0,03 + 50,00 = 50,00. Dazu eine reine Abzugssumme mit Nachlass und MwSt (Netto −0,13, Nachlass −0,01, nach
  Nachlass −0,12, MwSt −0,02, Brutto −0,14).

**Vorläufige Annahmen, Entscheidung offen (P5; je eine Funktion in `summenregeln.ts`, Test `Vorläufige Annahmen …`)**

1. **Welche Positionsarten in die Summen eingehen** (`positionGehtInSumme`; Fixture-Annahmen A1–A4): `normal` ja; `bedarf` nur mit `bedarfMitGesamtbetrag`; `wahl` nie; `zuschlag` ja
   mit eigener Menge × EP. **Von keiner Fixture-Annahme abgedeckt, gesondert zu entscheiden:** `stundenlohn` und das Merkmal `pauschal`; beides wie eine Normalposition (Menge × EP).
   K5/K6 besitzen die endgültige Regel; dieses Ticket braucht das Prädikat nur, damit `typisch` und `gross` stimmen.
2. **Reihenfolge der Nachlass-Rundung** (`nachlassBetrag`, Fixture A6): Nachlassbetrag halb-auf auf 2 Stellen runden, dann vom Netto abziehen. Die andere Lesart rundet das
   Ergebnis `Netto × (100 − p) / 100`. Beide liefern die Goldens des Tickets (402,73 − 3 %: 12,0819 → 12,08 → 390,65 und 390,6481 → 390,65), sie unterscheiden sich nur bei
   Gleichständen. **Beispiel:** Netto 0,25, Nachlass 10 %. Hier: Nachlass 0,025 → 0,03, Netto danach **0,22** (MwSt 19 %: 0,0418 → 0,04, Brutto 0,26). Andere Lesart: 0,25 × 90 % =
   0,225 → **0,23**. Im Test festgehalten.
3. **Grenzen beim Setzen eines Nachlasses** (`nachlassFehler`): Prozent von 0,00 bis 100,00; Betrag von 0,00 bis zum aktuellen Netto (bei Netto ≤ 0 nur 0,00); sonst `ungueltige-eingabe`.
   Restriktiv, Lockern macht gültige Nachlässe nicht ungültig. Folgen, die ebenfalls offen sind: Sinkt das Netto später unter einen absoluten Nachlass (Mengenänderung),
   wird der Nachlass **nicht** verworfen und die Änderung nicht abgewiesen (U5); die Summen rechnen weiter, Netto nach Nachlass kann negativ werden (Test). `LeistungsverzeichnisAnlegen`
   (Import) prüft von diesem Nachlass nur die Form, nicht die Grenzen (ein Import blockiert nie).
4. **Zusätzlich, gleiche Behandlung:** Grenzen des MwSt-Satzes (`mwstSatzFehler`): 0,00 bis 100,00, sonst `ungueltige-eingabe`. Das Ticket sagt dazu nichts; die Annahme steht neben (3).

Offen und nicht gelöst (kein Raten, keine Blockade): die endgültigen Regeln zu (1) bis (4). Kein Punkt war ohne restriktive, leicht umkehrbare Lesart; kein `needs-info` nötig.
„MwSt-Satzwechsel“ (Nicht-Ziel) ist als zeitlicher Wechsel verstanden; `MwstSatzSetzen` setzt den einen Satz des LV (G-28).

**Umkehrung (Undo)**

`Summenaenderung` trägt keine Vorwerte. Lösung im Kern: `changeSetUmkehren(cs, zustandVorher)` liest die alten Summen aus dem Vorzustand: für jede im ChangeSet genannte Summe und für
jeden entfernten Knoten den früheren Eintrag, `gesamt` nur, wenn das ChangeSet es geändert hat (Listen nach Kennung geordnet). Dann stellt „anwenden, Umkehrung anwenden“ den Vorzustand
einschließlich `summen` exakt her (`toEqual` auf dem ganzen `LvZustand`), und `changeSetUmkehren(changeSetUmkehren(cs, vorher), nachher)` ist wieder `cs`. Der bestehende Property-Test von
Ticket 05 ist auf die neue Signatur umgestellt und um Summen erweitert (`summen-eigenschaften.test.ts`: jeder Befehl, plus Zurückspielen der ganzen Folge).
Nebenwirkung: `lvChangeSetAnwenden` gibt für ein ChangeSet ohne jede Änderung denselben Zustand (dasselbe Objekt) zurück und übernimmt das Knotenarray, wenn das ChangeSet keine Knoten ändert.
Die Einträge im Stand stehen in Knotenreihenfolge; bei Strukturänderungen setzt `lvChangeSetAnwenden` den Stand in dieser Reihenfolge neu zusammen (O(n) wie das Knotenarray), bei reinen
Wertänderungen ersetzt es die Einträge am selben Index.

**Messung (Q4, Gate im Test `summen-leistung.test.ts`)**

`fixtures/gross` (5.610 Knoten, 5.000 Positionen, 5 Titelebenen): ein `MengeAendern` warm, Befehl ausführen + `lvChangeSetAnwenden`, 40 Läufe nach 5 Warmläufen, Median unter 16 ms
als harte Prüfung. Fünf Läufe des Tests: Median **1,88 / 1,96 / 2,29 / 2,55 / 2,69 ms** (Spanne 1,88 bis 2,69 ms), schlechtester Einzellauf **3,3 bis 6,4 ms**; davon Ausführen (Median)
0,08 bis 0,11 ms (der Rest ist Anwenden, O(n) für das Knotenarray). Aufbau von `gross` mit vollständigen Summen (`LeistungsverzeichnisAnlegen` + Anwenden): 31 ms. Das Budget ist nicht
aufgeweicht; `lvChangeSetAnwenden` wurde für Geschwindigkeit nicht umgebaut, die Zeit liegt klar darunter.

**Fixtures**

`winzig` und `typisch`: jede Position (GP, `inSumme`), jede Titelsumme und alle fünf Gesamtsummen gleich den `sollwerte` (exakt, Zeichenketten). `gross`: ebenfalls Positionen, Titelsummen und
Gesamtsummen exakt. `handbeispiele.json`: beide Summenketten und beide Gesamtpreise. Die Fixture schreibt den EP der Handbeispiele mit zwei Nachkommastellen (`"10.00"`); der Test füllt auf
drei auf (der Kern lehnt die falsche Skala ab).

**Lücken im Vertrag (nicht geändert, nicht umgangen)**

- `Summenaenderung` trägt keine Vorwerte: Undo braucht den Vorzustand (`changeSetUmkehren(cs, zustandVorher)`). Mit Vorwerten im Typ (oder einer `vorher`-Liste) wäre die Umkehrung ohne Zustand
  möglich; für das Befehlsprotokoll (ADR 0009) und Undo über Neustarts relevant.
- `Summenaenderung` kennt keine entfernten Einträge: Summen entfernter Knoten fallen mit dem Knoten weg. Das ist im Vertrag so dokumentiert und funktioniert; die Umkehrung muss sie aus dem
  Vorzustand wieder holen.
- Die Reihenfolge der Einträge in `Summenstand.positionen`/`gliederungen` ist im Vertrag nicht festgelegt; der Kern legt sie auf die Knotenreihenfolge fest (Voraussetzung für exakte
  Wiederherstellung). Persistenz (`speicher`) sollte sie nicht als Daten betrachten, sondern aus dem Zustand ableiten.
- `LvChangeSetAnwenden` liefert nie `null` (Ticket 05): Undo eines LV-Anlegens bleibt nicht darstellbar.
- Kein Feld für „Nachlass ungültig gegenüber Netto“: Sinkt das Netto unter einen absoluten Nachlass, gibt es keinen Befund im Zustand; die formale LV-Prüfung muss das nachrechnen
  (`nettoNachNachlass < 0`).

**Abweichungen vom Auftrag:** keine. `changeSetUmkehren` hat eine Pflicht-Signaturänderung (Absicht: vermeidet still falsche Summen); Ticket 06 muss bei Aufrufen den Vorzustand mitgeben.

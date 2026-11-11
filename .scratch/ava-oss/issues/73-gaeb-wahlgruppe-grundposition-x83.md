# 73: `gaeb`: Wahlgruppe verliert die Grundposition im Rundweg X83

Status: done-by-agent
Type: bug
Welle: 5 · Strang: G · Paket: `packages/gaeb`
Blocked by: –
Regeln: F4, E-04, Q3, Q5, D-16
Herkunft: Ticket 64 (D-64.1), Ticket 69 (Import meldet `wahl-ohne-grundposition`)

## What to build

`typisch` als X83 exportiert und wieder eingelesen ergibt eine Wahlgruppe ohne Grundposition (Warnung
`wahl-ohne-grundposition`); ein Zuschlag mit gewählter Alternative ist danach nicht mehr wie in der Fixture möglich. Ursache
klären (Writer: Variante 0 der Grundposition; Leser: Zuordnung über Gruppennummer) und beheben; Roundtrip-Liste kürzen.

## Acceptance criteria

- [x] Rundweg `typisch` X83 → Import ergibt die Wahlgruppe mit Grundposition; `m3.spec.ts` kann das LV per X83 einlesen

## Comments

### Umsetzung (Branch `welle-5/73-wahlgruppe-x83`)

Ursache: der **Writer**. Er gab der Wahlposition 02.0070 A (aus v1, ohne Gruppe und Variante) nach D-16 die künstliche
Gruppe 1, Variante 1, schrieb ihre Grundposition 02.0070 aber ohne `ALNGroupNo`/`ALNSerNo`. Der Leser ordnet eine
Alternative nur der ersten Grundausführung (Variante 0) derselben Gruppe im selben `Itemlist` davor zu (Regel aus Ticket
22, FD 4.5.2); die gab es nicht, also `wahl-ohne-grundposition` und `grundpositionId: null`. Der Leser bleibt unverändert.

Seams (Demo-Modus, statt Abstimmung mit dem Nutzer): `schreibeGaeb` + `leseGaeb` als Rundweg (`roundtrip.test.ts`,
neuer Block „Wahlgruppe im Rundweg“: `typisch` als X81/X83/X86 → Import ergibt 02.0070 als Gruppe 1/Variante 0 und
02.0070 A als Gruppe 1/Variante 1 mit Verweis auf 02.0070, ohne `wahl-ohne-grundposition`) und `schreibeGaeb` für die
Nummernvergabe (`schreiben.test.ts`).

- **D-73.1** Wo beheben? → Im Writer: Eine Grundposition ohne eigene Wahl, die unter demselben Elternknoten steht wie
  eine ihrer Alternativen ohne Nummer, wird als Variante 0 der künstlichen Gruppe geschrieben, mit Warnung
  `wahl-nummer-vergeben` an der Grundposition (U5). Steht sie unter einem anderen Elternknoten, bleibt sie ohne Nummer
  (GAEB ordnet nur im selben LV-Bereich zu; eine einsame Variante 0 brächte nichts). Der Leser bleibt bei Ticket 22.
  → Summen unverändert (`betragsziel`: Variante 0 geht ins Netto); das Modell im Speicher bleibt unverändert, nur die
  Datei trägt die Nummern. Ergänzt D-16 („Die Grundposition bleibt, wie sie ist“ galt nur für den Writer-Kommentar).
  Reversible: yes.
- **D-73.2** Roundtrip-Liste „kürzen“? → Die Zahl der Einträge sinkt nicht, sie steigt (`typisch` 1 → 2, `gross`
  99 → 198): Die Fixtures tragen keine Gruppen- und Variantennummern (Fixture-Format), GAEB braucht sie, also bleibt jede
  vergebene Nummer ein gelisteter Unterschied, je Position ausdrücklich (D-18). Was wegfällt, ist der Verlust: Eine
  Alternative behält ihren Verweis auf die Grundposition (früher setzte jeder Eintrag `grundpositionId: null`). Neue Art
  `grundposition-nummer-kuenstlich` (Grundposition kommt als Variante 0 zurück). Die Einträge sind aus `grundpositionId`
  der Fixtures abgeleitet, nicht aus dem Writer. Reversible: yes.
- **D-73.3** Alternative ohne Nummer zu einer Grundposition, die schon Variante 0 einer Gruppe ist (etwa aus GAEB
  gelesen und in der App um eine Alternative ergänzt; der Positionsdialog lässt Gruppe und Variante leer)? → Sie kommt
  in diese Gruppe, mit den Varianten nach der höchsten dort unter demselben Elternknoten belegten, statt in eine neue
  Gruppe ohne Grundausführung. Gleiche Ursache, gleicher Verlust im Rundweg; weicht für diesen Fall von D-16 („Gruppen
  oberhalb der höchsten belegten“) ab. Reversible: yes.
- **D-73.4** `m3.spec.ts`? → Bleibt unverändert (nur `packages/gaeb` schreiben, P2). Das Kriterium „`m3.spec.ts` kann
  das LV per X83 einlesen“ ist auf Paketebene erfüllt: Der Rundweg `typisch` → X83 → Import ergibt die Wahlgruppe mit
  Grundposition (Test in `gaeb`). Die Umstellung der E2E von `tethysTest.lvAnlegen` auf den X83-Import (D-64.1
  zurücknehmen) übernimmt das M4-Ticket 91 (Punkt 3). Hinweis dafür: Das per X83 gelesene LV trägt an 02.0070 jetzt
  Gruppe 1/Variante 0 (die Fixture: keine Wahl); `wahlgruppenBilden` erkennt beide Formen als Grundposition, die
  Summen sind gleich. Reversible: yes.
- Prüfungen: XSD-Gegenprüfung 48/48 bestanden (nach der Golden-Änderung). Nach Merge von `integration/welle-5` (bdad0be):
  `pnpm lint` und `pnpm typecheck` grün; `pnpm test` 2030 grün, 1 rot: Leistungsbudget
  `packages/vergabe/src/leistung.test.ts` („preisspiegelBerechnen für gross mit 5 Angeboten unter 1000 ms“) in der vollen
  Suite 2845 ms bei Last 11–16 auf 4 Kernen; die Datei allein grün, Messung 665,7 ms. `vergabe` hängt nicht von `gaeb` ab;
  Budget nicht gelockert. `node --test fixtures/*.test.mjs` 20/20 grün. In `gaeb` ebenso nur unter Last rot und allein
  grün: „Datei über 2 MB wird in unter 1 s gelesen“ (1951 ms im Paketlauf) und „gross als X86 unter 1 s“ (2873 ms im
  Paketlauf).

## Answer

Behoben im Writer (`packages/gaeb/src/schreiben.ts`, `kuenstlicheWahlnummern`): Die Grundposition einer künstlichen
Wahlgruppe wird als Variante 0 geschrieben (D-73.1), eine Alternative ohne Nummer zu einer schon nummerierten
Grundausführung kommt in deren Gruppe (D-73.3). Rundweg `typisch` X81/X83/X86 → Import ergibt 02.0070 (Gruppe 1,
Variante 0) und 02.0070 A (Gruppe 1, Variante 1, Verweis auf 02.0070) ohne `wahl-ohne-grundposition`
(`roundtrip.test.ts`, „Wahlgruppe im Rundweg“). Roundtrip-Liste: kein Verlust des Verweises mehr, dafür je Grundposition
ein Eintrag `grundposition-nummer-kuenstlich` (D-73.2). Goldens `typisch-X8{1,3,6}` und `gross.sha256.json` neu.
`m3.spec.ts` unverändert; die E2E-Umstellung auf X83 übernimmt Ticket 91 (D-73.4). Commits 067d4d9, 83ac0b3 auf
`welle-5/73-wahlgruppe-x83`, Merge von `integration/welle-5` in 67ee388.

# 69: X84-Dateien der Angebote zu `typisch` und Preisspiegel-Sollwerte

Status: resolved
Type: task
Welle: 4 · Strang: F · Paket: `fixtures/`
Blocked by: 51 (Fixtures in GAEB-Form)
Regeln: C4, Q3, N2, N5, G-26, G-41, D-05, D-36.1
Herkunft: `plan.md` §4 Tor M3 („E2E importiert zwei X84-Angebote, Preisspiegel-Summen stimmen mit den Sollwerten“)

## What to build

Für das Tor M3 braucht die E2E echte X84-Dateien und unabhängig berechnete Sollwerte.

1. Der Generator (`fixtures/erzeugen.mjs`) schreibt aus `typisch-angebote.json` je Bieter eine Datei
   `fixtures/angebote/typisch-<Bieter>.x84` (GAEB DA XML 3.3, Phase 84) – **unabhängig** vom Writer in `packages/gaeb`
   (eigener, kleiner XML-Baustein im Generator; Form nach dem, was der vorhandene X84-Leser (Ticket 45) und die amtlichen
   X84 unter `fixtures/extern/` zeigen). Inhalt: Kopf mit Bietername, Positionen mit OZ und `UP` (bzw. `Markup` an
   Zuschlagspositionen), „nicht angeboten“ wie in den amtlichen Dateien, Nachlass des Angebots, wenn vorhanden. Kein
   echter Firmenname (C4).
2. Sollwerte des Preisspiegels in `typisch-angebote.json` (additiv): je Bieter Netto, Nachlass, Netto nach Nachlass, MwSt,
   Brutto (gibt es schon: prüfen), Titelsummen, **Rang** (nach Netto nach Nachlass, Gleichstand 1, 1, 3 wie D-36.1), Min/
   Mittel/Max-Netto der virtuellen Bieter nach D-05/D-36.1 (Mittel und Min nur über Preise > 0, Mittel auf 2 Stellen je
   Position). Alles mit BigInt in `rechnen.mjs`, nie aus `kern`/`vergabe`.
3. Selbsttest (`fixtures.test.mjs`): Dateien wohlgeformt, Sollwerte reproduzierbar (Generator zweimal → byte-gleich).
4. `fixtures/README.md` und REUSE-Abdeckung nachziehen.

## Grenzen

- Nur `fixtures/`. Der Import-Test in `gaeb` ist Ticket 68; die E2E Ticket 63/64.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Drei `.x84`-Dateien (mindestens zwei, M3 verlangt zwei), deterministisch erzeugt
- [x] Sollwerte für Rang und virtuelle Bieter, unabhängig berechnet, mit kurzer Herleitung im README
- [x] Ein Rauchtest im Ticket (Comments): `leseAngebot` aus `@tethys/gaeb` liest jede Datei ohne Fehlerbefund (nur
      ausführen, nicht als Test in `gaeb` committen)
- [x] `node --test "fixtures/*.test.mjs"` und `pnpm test` grün

## Nicht-Ziele

Änderungen an `typisch.json` (Ticket 51), Writer in `gaeb`.

## Comments

### Umsetzer (Branch `welle-4/69-x84`)

Dateien: `fixtures/angebote/typisch-bieter-{a,b,c}.x84` (je etwa 5,5 KB), `typisch-angebote.json` additiv um
`preisspiegel` (alle übrigen Fixtures byte-gleich, `typisch-angebote.json` nur am Ende ergänzt), `rechnen.mjs`
`preisspiegelSollwerte`, zwei neue Selbsttests (X84 wohlgeformt und zeilengleich mit dem Angebot; Preisspiegel mit einer
zweiten, unmittelbaren Gegenrechnung aus den Angebotszeilen), README-Abschnitte „X84 der Angebote“ und
„Preisspiegel-Sollwerte“ mit Herleitung. REUSE: abgedeckt durch den Repo-weiten Eintrag `**` (selbst verfasst, AGPL);
kein neuer Eintrag nötig.

Sollwerte (alle drei Angebote): Netto nach Nachlass A 55.481,84 / B 56.607,77 / C 56.721,09 → Rang 1 / 2 / 3; Brutto
66.023,39 / 67.363,25 / 67.498,10; virtuell Min 52.287,26, Mittel 56.961,21, Max 62.482,84, Schätzpreis 55.465,59.
Paare A+B, A+C, B+C stehen in `preisspiegel.vergleiche`.

**Rauchtest** (Wegwerf-Vitest im Scratchpad, nicht committet): LV `typisch` aus
`packages/gaeb/testdaten/golden/export/typisch-X83-3.3.x83` mit `leseGaeb` eingelesen (wie die E2E), dann jede X84 mit
`leseAngebot` (`dateiname` gesetzt):

```
typisch-bieter-a.x84  phase X84, version 3.3, bieter "Bieter A", befunde [], nachlass null,               nicht angeboten 0, Satz 8.51
typisch-bieter-b.x84  phase X84, version 3.3, bieter "Bieter B", befunde [], nachlass prozent 3.00,       nicht angeboten 1, Satz 9.10
typisch-bieter-c.x84  phase X84, version 3.3, bieter "Bieter C", befunde [], nachlass null,               nicht angeboten 0, Satz 7.87
```

Kein Befund, auch keine Warnung. Zusätzlich (nur Gegenprobe, keine Quelle der Sollwerte): `preisspiegelBerechnen` aus
`vergabe` auf diesen gelesenen Angeboten liefert für alle vier Auswahlen dieselben Bietersummen (Netto, Nachlass, Netto
nach Nachlass, MwSt, Brutto), denselben Rang und dieselben virtuellen Min/Mittel/Max wie die Fixture. Einzige
Abweichung: Schätzpreis 0,00 statt 55.465,59, weil das X83 keine EP trägt (siehe D-69.4). Der X83-Import selbst meldet
`wahl-ohne-grundposition` und `mwst-ersatzwert` (Warnungen, nicht Gegenstand dieses Tickets; für Ticket 64 gut zu wissen).

- **D-69.1 Form „nicht angeboten“.** Frage: Das Ticket sagt „wie in den amtlichen Dateien“, die beiden amtlichen X84
  enthalten aber keine nicht angebotene Position. Entscheidung: `Item` mit `ID`/`RNoPart` ohne `UP` und ohne `IT`
  (leeres Element). Grund: So liest es der Leser (Ticket 45: `UP` fehlt → nicht angeboten, ohne Befund); eine fehlende
  Zeile gäbe dagegen die Warnung `position-fehlt-im-angebot`.
- **D-69.2 Inhalt der Zeilen und des Kopfs.** Entscheidung: Je Zeile nur `UP` + `IT` bzw. `ITMarkup` + `Markup` + `IT`
  (wie die amtlichen X84; keine `Qty`, kein Text, kein `MarkupType`, die der Leser als `nicht-abgebildet` melden würde);
  `IT` auch an Wahl und Bedarf ohne Gesamtbetrag = GP (wie der eigene X86-Export; der Leser prüft nur Menge × EP).
  `CTR/Address` nur `Name1` (C4). Maske wie der X83-Export von `typisch`. Hinweise nicht geschrieben. Grund: genau was
  Leser und E2E brauchen, ohne Befund.
- **D-69.3 Mittel der virtuellen Bieter.** Frage: „Mittel auf 2 Stellen je Position“ (Ticket) – Mittel des EP oder des
  GP? Entscheidung: an einer Normalposition Mittel des EP auf 3 Stellen (N3), dann GP = round_half_up(Menge × EP, 2);
  an der Zuschlagsposition Mittel der Beträge auf 2 Stellen; „auf 2 Stellen je Position“ ist damit der GP des Mittels,
  der je Position gerundet und dann summiert wird. Grund: So lauten D-36.1/D-44.1 (`PREISSPIEGEL_ANNAHMEN`: Ausreißer
  und Vergleich über den EP, Zuschlagszeile Σ / n auf 2 Stellen); nur so kann die E2E die Summen der App mit der Fixture
  vergleichen. Max ebenfalls nur über Werte > 0 (D-36.1).
- **D-69.4 Schätzpreis.** Entscheidung: `schaetzpreis` = Netto des LV mit den EP aus `typisch.json` (55.465,59). Ein per
  X83 eingelesenes LV hat keine EP, die App zeigt dort 0,00; vermerkt im README. Grund: Der Schätzpreis ist eine
  Eigenschaft des LV, nicht der Angebote; die E2E prüft laut Ticket 64 nur Bietersummen und Rang.
- **D-69.5 Paare.** Frage: Welche zwei Dateien liest die E2E ein? Entscheidung: Sollwerte für alle drei und für jedes
  Paar (`preisspiegel.vergleiche`), Titelsummen je Bieter über die OZ (das eingelesene LV hat andere IDs). Grund: Ticket
  64 legt die zwei Dateien nicht fest; Rang und virtuelle Bieter hängen von der Auswahl ab.
- **D-69.6 Rang als String.** Entscheidung: `"1"`, `"2"`, `"3"`. Grund: Die Fixtures enthalten keine JSON-Zahlen
  (Selbsttest „Dezimalwerte in JSON sind nie Zahlen“ prüft das ganze Dokument).

## Answer

Gemergt auf `integration/welle-4` mit Merge-Commit 66b57ab; Review-Befunde behoben in `fix/welle-4-review` (847aa43, siehe `../review-welle-4.md`).

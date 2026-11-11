# Wellen-Review Welle 3 (`code-review`, Fixpunkt `main`)

Stand 2026-11-11. Diff `main...integration/welle-3`: 339 Dateien, rund 51.000 Zeilen, 246 Commits. Zwei Prüfer (Opus),
getrennt nach Achsen. Entscheidungen zu den Befunden: D-16 bis D-18 in `entscheidungen-auto.md`.

## Standards

Geprüft gegen `docs/regeln.md`, `CONTRIBUTING.md`, `AGENTS.md`, `GLOSSARY.md`, ADRs und die Smell-Grundlinie. Kein
Verstoß gegen N1 (kein `number` für Geld/Menge/Prozent), A2 sauber in `kern`, `vergabe`, `mengen`; A5 sauber (die App
schreibt nur über `befehlsweg.ts` → `speicher.anwenden`); `dividiere` rundet negative Werte nach E-07; U5 hält im
Positionsdialog.

Harte Verstöße:

- **S1 N3** `packages/vergabe/src/preisspiegel.ts:203,209`: Stellen `mittelStellen: 3` und `2` hart kodiert statt aus
  `NACHKOMMASTELLEN`.
- **S2 L2** `packages/vergabe/src/summen.ts:70,77,97,100`: `GedachtesLv`, `Preiskennzeichen`, `Bieterzuschlag` sind
  exportierte Fachbegriffe ohne Eintrag im `GLOSSARY.md`.
- **S3 L1** `packages/gaeb/src/schreiben.ts:70`: `vorkomma.satz` statt des Glossarbegriffs `zuschlagssatz`.

Ermessensfragen (Smells):

- **S4 Doppelter Code mit abweichender Bedeutung**: `packages/gaeb/src/angebot.ts:384-387` baut die Kern-Regel
  `betragsziel` (`packages/kern/src/summenregeln.ts:64-68`) nach; bei `variante: null` ohne `grundpositionId` zählt
  `gaeb` die Position als normal, der Kern als Wahl.
- **S5 Doppelter Code**: Langtext-Formprüfung in `packages/speicher/src/dekoder.ts:195-311` und
  `packages/kern/src/langtext.ts:14-27,70ff`.
- **S6 Doppelter Code**: Grenzen `PRUEF_GRENZEN` + `vorkommastellen()` in `packages/kern/src/pruefregeln.ts:36-43,120`
  und `GRENZEN.vorkomma` + `vorkommastellen()` in `packages/gaeb/src/schreiben.ts:58-88`.
- **S7 Datenklumpen**: `Vergleichsart` (`preisspiegel.ts:195-211`) trägt `mittelArt` und das ableitbare `mittelStellen`.
- **S8 Q5-nah**: nacktes `catch {}` in `apps/web/src/gaeb/Angebote.tsx:94` und `apps/web/src/gaeb/GaebEinlesen.tsx:44`.
- **S9 klein**: `preisspiegel.ts:255` baut einen `Dezimal` aus einem Zähler per Zeichenkette.

## Spec

Stichproben stimmen: K6-Regel und Sollwerte (Ticket 37), Ausreißer mit 0,00 (36, D-05), Papierkorb-Bezüge (29 D-12, 42,
`konflikt` bei Angebotsbezug), Undo von Befehlsfolgen (48), M1-E2E (39) baut 2 Ebenen, 5 Positionen, jede Art, lädt neu,
prüft die Summen.

Fehlend oder teilweise:

- **P1** Fixture `zuschlag` fehlt in Export, Roundtrip und XSD-Prüfung (`packages/gaeb/src/testhilfen.ts:151`); Ticket
  40 §6 und M2 („jede Fixture“) verlangen sie.
- **P2** M2 „identisches Modell“ gilt nur bis auf eine Liste erwarteter Unterschiede (Altform-Zuschlag in X86, Wahl ohne
  Gruppe), weil die Fixture-Umstellung abgespalten ist (D-44.2); ein Folgeticket fehlte.
- **P3** Ticket 45: EPA-Anteile aus X84 (1.10.30.20) nicht abbildbar (`epa-nicht-abgebildet`, D-45.1; braucht Vertrag).
- **P4** Ticket 39: < 100 ms bei 5.000 Positionen bis zur Summenzeile nicht erreicht (App-Schicht ja, `speicher` nein).

Umgesetzt, aber falsch:

- **C1** Migrierte v1-Daten: Migration 2 lässt `summeBedarfOhneGesamtbetrag`/`summeWahl` auf `NULL`, der Kern rechnet
  nur Deltas darauf; nach der ersten Änderung stimmen Bedarfs- und Wahlsumme nicht. Pauschal-GP (D-37.1) macht
  gespeicherte GPs und Gliederungssummen zusätzlich veraltet.
- **C2** Wahlpositionen aus v1 (Gruppe/Variante `null`) schreibt der Writer als normale `Item`; beim Re-Import zählen sie
  ins Netto, X86-`Totals` passen nicht mehr.

Kleine Umfangserweiterungen (gebilligt oder harmlos): mechanische Änderungen an `proto/interview`; `vergabe` durch Ticket
37 (D-14); zusätzliche Prüfcodes im Writer; Satz an normaler Position wird abgewiesen (D-44.1).

**Zusammenfassung:** Standards 9 Befunde (schwerster: S4, doppelte Wahl-Regel mit abweichender Bedeutung). Spec 8
Befunde (schwerster: C1/C2, Geldwerte nach Migration).

## Behebung

Ein Opus-Umsetzer behebt S1–S8, P1, C1, C2 (Branch `fix/welle-3-review`). P2: Folgeticket 51. P3, P4: im Bericht als
offen. S9: freiwillig.

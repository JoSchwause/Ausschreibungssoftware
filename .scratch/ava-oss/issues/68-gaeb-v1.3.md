# 68: `gaeb` v1.3: Auftragnehmer in X86, EPA-Bezeichnungen, leere Langtext-Strukturen, Import der X84 aus Ticket 69

Status: claimed
Type: task
Welle: 4 · Strang: G · Paket: `packages/gaeb`
Blocked by: 53 (`vertrag` v1.3), 51 (Goldens), 57 (Speicherung der neuen Felder), 69 (X84-Dateien)
Regeln: Q3, Q5, U5, C4, ADR 0010, D-22, D-40.1, D-45.1
Herkunft: Ticket 53 (Punkte 2, 6, 8), Tickets 40, 45, 49 (Comments)

## What to build

1. **Auftragnehmer** (Punkt 6): X86-Writer schreibt `CTR` mit dem Auftragnehmer aus dem Modell (Warnung `angabe-leer`
   nur noch, wenn er fehlt); X86-Leser liest ihn. Zusätzlich: ein Auftrags-LV lässt sich als X86 schreiben (Option bzw.
   Funktion `schreibeGaeb` mit `AuftragsLeistungsverzeichnis`), falls das ohne Vertragsänderung geht.
2. **EPA-Bezeichnungen** (Punkt 2): X83/X86-Writer schreiben `LblUPComp` aus dem LV; Leser von X83/X86 übernehmen sie ins
   LV; der X84-Angebotsleser ordnet Anteile über die Bezeichnungen des LV zu, sodass die Anteile der BVBS-X84 nicht mehr
   `null` bleiben, wo das LV Bezeichnungen hat (Befund `epa-nicht-abgebildet` nur noch ohne Bezeichnung).
3. **Leere Langtext-Strukturen** (Punkt 8, D-22 (iii)): Writer verwirft leere Liste/Tabelle/Zeile mit Warnung; Export
   bleibt XSD-gültig.
4. **X84 aus Ticket 69:** Import-Test liest jede Datei mit `leseAngebot` gegen `typisch` und vergleicht die
   Angebotspositionen exakt mit `typisch-angebote.json`; Befunde nur die erwarteten.
5. Roundtrip-Liste (`testdaten/roundtrip-unterschiede.json`) nachziehen (nur kürzen, jeden neuen Eintrag begründen);
   XSD-Gegenprüfung lokal ausführen, falls das Netz die amtlichen ZIPs erreicht (sonst vermerken).

## Grenzen

- Nur `packages/gaeb`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Tests je Punkt; Golden-Exporte begründet aktualisiert
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün,
      `pnpm --filter @tethys/gaeb run xsd-gegenpruefung` grün oder mit sichtbarem Überspringen (ohne Netz)

## Nicht-Ziele

Positionsnachlass/Bieterergänzungen im Angebot (D-22 (ii)), GAEB 90/2000, X82/X85/X89.

## Comments

### Aus Ticket 53 (Review, D-27, D-28)
- Option `auftragnehmer` in `SchreibOptionen` doppelt `LvInhaltKopf.auftragnehmer`: das Modell gewinnt, die Option entfällt.
- EPA-Bezeichnungen in der Form aus D-28; nie umnummerieren. Prüfen, ob das XSD Lücken in `LblUPComp` mit `NoUPComps` = höchste Nummer annimmt; sonst Platzhalter-Beschriftung.

### Umsetzer (Branch `welle-4/68-gaeb-v1.3`, Basis `integration/welle-4` c40e373)

Seams der Tests: `schreibeGaeb`, `leseGaeb`, `leseAngebot` (die vorhandenen; Demo-Modus, keine Rückfrage möglich).
Neue Datei `packages/gaeb/src/epa.ts` (eine Deutung von `LblUPComp` für beide Leser und den Writer).

1. **Auftragnehmer.** `SchreibOptionen.auftragnehmer` entfällt; X86 schreibt `CTR/Address` (`Name1`, `Street`, `PCode`,
   `City`) aus `LvInhaltKopf.auftragnehmer`, Warnung `angabe-leer` nur ohne ihn. X86-Leser liest `CTR` ebenso.
   `schreibeGaeb` nimmt auch ein `AuftragsLeistungsverzeichnis` (ohne Vertragsänderung). Tests: `schreiben.test.ts`,
   „v1.3: Auftragnehmer (CTR) aus dem Modell“.
2. **EPA-Bezeichnungen.** Leser X81/X83/X86 → `epaBezeichnungen` mit der Nummer der Datei; Writer X81/X83/X86 schreiben
   sie mit derselben Nummer, Lücken bleiben; X86 ohne das Feld schreibt die feste Belegung wie bisher. X84-Leser ordnet
   `UPComp<n>` über die Bezeichnungen des LV zu: BVBS-AVA-X84 gegen das LV aus der AVA-X86 hat jetzt Anteile an allen
   5 Positionen, kein `epa-nicht-abgebildet` (gegen das LV aus der X81, die keine Beschriftung hat, bleibt es wie bisher).
   Tests: `lesen.test.ts`, `schreiben.test.ts`, `angebot.test.ts` (je Abschnitt „v1.3“).
3. **Leere Langtext-Strukturen.** Leere Liste/Tabelle wurden schon verworfen; neu: Zeile ohne Zellen (und damit eine
   Tabelle nur aus leeren Zeilen) mit Warnung `export-verworfen`. LV `leereStrukturenLv` (Position, Hinweistext,
   Unterbeschreibung, verschachtelt) läuft in der XSD-Gegenprüfung mit.
4. **X84 aus Ticket 69.** `angebot.test.ts`, „X84 der Angebote zu typisch“: alle drei Dateien gegen `typisch`,
   Positionen und Nachlass genau wie `typisch-angebote.json`, Bietername aus der Fixture, Befunde `[]`.
5. **Roundtrip-Liste** unverändert (kein neuer Eintrag; kürzer geht nicht, die Einträge hängen an den Wahlpositionen der
   Fixtures). **XSD-Gegenprüfung** lokal ausgeführt (Netz und xmllint vorhanden): 48 von 48 Dateien bestanden, darunter
   `reich` (EPA-Bezeichnungen mit Lücke und leerer Beschriftung, Auftragnehmer), `leer` und die amtlichen X81/X83 mit
   ihren Beschriftungen.

**Goldens.** Export-Goldens byte-gleich (der erfundene Auftragnehmer der X86 steht jetzt im Testmodell statt in der
Option: `exportInhalt` in `testhilfen.ts`). Lese-Goldens `bauausfuehrung-x83` und `texterstellung-x81`: je 5 Befunde
`nicht-abgebildet` weniger (`BoQInfo/NoUPComps`, `LblUPComp1…4`), weil die Bezeichnungen jetzt im LV ankommen.

**Für andere Pakete (nicht hier):** `apps/web/src/gaeb/gaeb.ts` (`lvAusgeben`) baut das `LvInhalt` von Hand und reicht
`auftragnehmer`/`epaBezeichnungen` nicht durch; das Auftrags-LV kann die App jetzt direkt an `schreibeGaeb` geben.
Speicherung der Felder: Ticket 57.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-68.1** Auftragnehmer außerhalb von X86? X81/X83 kennen kein `CTR` (XSD 3.2 und 3.3): verworfen mit Warnung
  `export-verworfen`; der Leser liest `CTR` nur in X86, sonst bleibt es `nicht-abgebildet`. Ein leeres `CTR` ergibt einen
  Auftragnehmer mit vier `null` (wie beim Auftraggeber). Übrige Angaben (`DPNo`, `AwardNo`, Kontakt) sind Befund.
  Grund: Schemaform je Phase; nichts still verlieren (Q5).
- **D-68.2** Auftrags-LV schreiben ohne Vertragsänderung? `schreibeGaeb(inhalt: LvInhalt | AuftragsLeistungsverzeichnis,
  …)`; Wurzel ist die Kennung des Auftrags-LV (`WurzelId`). Keine Phasensperre (U5). Grund: Kopf und Knoten sind gleich,
  nur `wurzelId` fehlt; eine eigene Funktion wäre eine zweite Schreibweise.
- **D-68.3** EPA-Bezeichnungen auch in X81? Ja, Leser und Writer. Grund: Das XSD der Phase 81 trägt `LblUPComp` wie 83
  und 86 (beide BVBS-X81 der Texterstellung zeigen sie); sonst müsste der Writer sie in X81 verwerfen und der Leser sie
  als `nicht-abgebildet` melden. Das Ticket nennt X83/X86; X81 ist die gleiche Form.
- **D-68.4** Lücken im XSD (Kommentar aus Ticket 53)? `LblUPComp1…6` sind in 81/83/86 (3.2 und 3.3) je `minOccurs="0"`,
  `NoUPComps` ist die Aufzählung 0, 2, 3, 4, 5, 6. Der Writer schreibt also nur die belegten Nummern, `NoUPComps` = höchste
  Nummer, mindestens 2; keine Platzhalter-Beschriftung, nie umnummeriert. XSD-Gegenprüfung mit Lücke bestanden.
- **D-68.5** X81/X83 ohne `epaBezeichnungen`? Keine Beschriftung (wie bisher); nur X86 mit Anteilen schreibt die feste
  Belegung. Grund: nichts erfinden (C4); Export-Goldens bleiben byte-gleich.
- **D-68.6** Eine Deutung für alle (`epa.ts`): Bezeichnung vor `Type` (D-40.1, D-45.1); „Gerät“ gilt jetzt auch in
  X81/X83/X86 (bisher nur X84; die BVBS-X86 Mengenermittlung las „Gerät“/Unknown als freien Anteil). Widerspruch
  Bezeichnung/Typ auch im LV-Leser Warnung `epa-beschriftung-abweichend`. Der Writer prüft jede Beschriftung gegen
  diese Deutung: würde sie als andere Art gelesen (Nachunternehmer ohne erkennbare Bezeichnung – GAEB hat dafür keinen
  Typ –, oder eine Bezeichnung, die eine andere Art nennt), Warnung `epa-beschriftung-mehrdeutig`, geschrieben wird
  unverändert. Bezeichnung über 20 Zeichen: Fehler `wert-zu-lang` (tgNormalizedString20). Doppelte Nummer oder Art:
  Fehler `wert-ungueltig` (der Kern prüft das schon, der Writer bleibt streng).
- **D-68.7** X84 mit Bezeichnungen im LV und in der Datei? Das LV gilt (die Nummer ist der Schlüssel, D-28; das XSD der
  Phase 84 kennt `LblUPComp` gar nicht); eine abweichende Beschriftung der Datei ist Warnung
  `epa-beschriftung-abweichend`. Ein `UPComp<n>` ohne Nummer `n` im LV bleibt unzugeordnet (`epa-nicht-abgebildet`,
  Grund „ohne EPA-Bezeichnung im LV“). LV ohne das Feld (vor v1.3): wie bisher (D-45.1, Beschriftung der Datei).
- **D-68.8** `freiBezeichnung` an der Position? Mit `epaBezeichnungen` legen alle Leser `null` ab und der Writer liest
  sie nicht (D-53.6); keine Warnung „abweichende Bezeichnung“ mehr in diesem Fall.
- **D-68.9** Roundtrip der Fixture `zuschlag` als X86 (Anteile, Feld fehlt)? Kein neuer Listeneintrag: Die `phasenform`
  des Tests zeigt, dass X86 die feste Belegung ausdrücklich macht (`epaBezeichnungen` 1 Lohn … 6 frei, freie Bezeichnung
  dort statt an der Position). Grund: gleiche Bedeutung nach D-53.6 („Feld fehlt = feste Belegung“), kein Verlust; die
  Liste nennt Unterschiede je Position, dies ist eine Form der Phase wie der leer geschriebene Auftraggeber.
- **D-68.10** Zeile ohne Zellen? Verworfen mit Warnung `leere Tabellenzeile`, obwohl das XSD ein leeres `tr` zuließe;
  eine Tabelle nur aus solchen Zeilen entfällt als `leere Tabelle`. Grund: D-22 (iii) nennt die Zeile; der Kern meldet sie
  als Befund (D-56.5), der Export soll sie nicht weitertragen.
- **D-68.11** Vergleich mit `typisch-angebote.json`? Die Fixture lässt Vorgaben weg; der Test ergänzt `epa: null` und an
  Zuschlagszeilen den Platzhalter-EP `0.000` (Vertrag v1.2, D-12 Nr. 7; die X84 tragen dort kein `UP`, D-69.2) und
  vergleicht dann mit `toEqual`; erwartete Befunde: keine.

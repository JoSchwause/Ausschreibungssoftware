# 76: A4: XRechnung lesen (UBL und CII)

Status: done-by-agent
Type: task
Welle: 5 · Strang: A4 · Paket: `packages/erechnung` (neu; dazu der Eintrag in `tools/boundaries.mjs`, Workspace-Dateien,
`fixtures/extern/xrechnung/` mit `HERKUNFT.md` und REUSE-Eintrag)
Blocked by: –
Regeln: A2, A3, N1, N3, N4, U5, Q1, Q5, C1, C4, C5, G-15, D-32
Herkunft: `plan.md` §2 A4 („XRechnung lesen, danach ZUGFeRD/Erzeugen“), G-15 (zuerst eingehende XRechnung lesen)

## What to build

Ein reines TS-Paket (A2: kein DOM, kein I/O, keine Uhr), das eine eingehende XRechnung als Text liest und ihre Angaben als
Werte mit Befunden zurückgibt. Es importiert nur `vertrag` und `dezimal` (D-32). Speicherung und Oberfläche sind nicht Teil
dieses Tickets; die App übernimmt später Rechnungsnummer, Datum und die geforderten Beträge in eine `Rechnung` (A3).

1. **Syntax erkennen.** XRechnung 3.x gibt es in zwei Syntaxen der EN 16931: UBL 2.1 (`Invoice`, `CreditNote`) und UN/CEFACT
   CII D16B (`CrossIndustryInvoice`). Beide lesen; alles andere ist ein Fehler `keine-xrechnung`.
2. **Felder (Begriffe der EN 16931, Business Terms):** BT-1 Rechnungsnummer, BT-2 Rechnungsdatum, BT-3 Rechnungsart (Code,
   z. B. 380, 381, 875 Abschlagsrechnung Bau, 876 Teilschlussrechnung Bau, 877 Schlussrechnung Bau), BT-5 Währung, BT-10
   Käuferreferenz (Leitweg-ID), BT-12 Vertragsnummer, BT-13 Bestellnummer, Verkäufer (BT-27 Name, BT-31 USt-IdNr.), Käufer
   (BT-44 Name), Summen BT-106 (Summe Nettobeträge der Positionen), BT-107, BT-108, BT-109 (Netto), BT-110 (Umsatzsteuer),
   BT-112 (Brutto), BT-113 (bereits gezahlt), BT-115 (Zahlbetrag); Umsatzsteueraufschlüsselung BG-23 (Kategorie, Satz,
   Basis, Betrag); Positionen BG-25 (BT-126 Kennung, BT-129 Menge, BT-130 Einheitencode, BT-131 Nettobetrag, BT-146
   Nettopreis, BT-153 Bezeichnung, BT-155 Artikelnummer des Verkäufers, BT-156 Artikelnummer des Käufers).
3. **Zahlen.** Nur Dezimalarithmetik (N1). Beträge mit mehr als 2 Stellen: Befund, kaufmännisch gerundet nur, wenn das
   Ticket es nennt (Beträge: ja, mit Befund `betrag-nicht-kanonisch`); Mengen und Preise bleiben als geprüfte Dezimaltexte,
   wenn sie mehr Stellen haben, als der Vertrag kennt (Befund, nie still kürzen, Q5). Fremde Währung als EUR: Befund.
4. **Rechenprüfung als Befunde, nie Sperre (U5):** BT-106 = Σ BT-131; BT-109 = BT-106 − BT-107 + BT-108; BT-112 = BT-109 +
   BT-110; BT-115 = BT-112 − BT-113 (+ BT-114, falls vorhanden); Σ BG-23-Beträge = BT-110. Fehlende Pflichtangaben
   (BT-1, BT-2, BT-5, BT-109, BT-112, BT-115): Befund.
5. **XML.** Fachpakete importieren einander nicht (A3), also nicht den GAEB-Leser. Wahl: kleiner eigener Leser oder eine
   Bibliothek mit MIT/ISC/Apache-Lizenz (C5, Lizenzprüfung der CI). Pflicht: keine DTD-/Entitätsauflösung (kein XXE, kein
   „Billion Laughs“), Größengrenze, Tiefe begrenzt. Namensräume über die Namensraum-URI, nicht über Präfixe.
6. **Testdateien (C4).** Mindestens zwei echte XRechnung-Beispiele (eine UBL, eine CII) aus der Testsuite der KoSIT
   (`github.com/itplr-kosit/xrechnung-testsuite`, Lizenz im Repo prüfen; nur übernehmen, wenn sie mit AGPL-3.0-or-later
   verträglich ist), unverändert unter `fixtures/extern/xrechnung/`, Herkunft (URL, Commit, Datum, „unverändert“) in
   `HERKUNFT.md`, REUSE-Eintrag. Dazu selbst verfasste Dateien für Bauleistungen (Rechnungsart 875 und 877) mit
   hergeleiteten Summen und Fehlerfälle (Rechenfehler, fehlende Pflichtangabe, fremde Wurzel, Entität). Ist das Netz für
   die KoSIT-Dateien gesperrt, nur selbst verfasste Dateien, das im Ticket vermerken.

Begriffe „XRechnung“, „E-Rechnung“ stehen im `GLOSSARY.md`; neue Begriffe (z. B. „Eingangsrechnung“) zuerst dort (L2).

## Grenzen

- Kein ZUGFeRD (PDF/A-3 mit eingebettetem XML) und kein Erzeugen (G-15: später). Keine Validierung gegen die Schematron-
  Regeln der KoSIT; die eigene Rechenprüfung oben genügt für v1.
- Kein anderes Paket ändern außer `tools/boundaries.mjs` (neue Zeile `'packages/erechnung': ['packages/vertrag',
  'packages/dezimal']`, dazu `apps/web` darf `packages/erechnung` importieren), Workspace-Dateien, `REUSE.toml`.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Golden-Tests je Testdatei (alle oben genannten Felder, Summen, Befunde) und Property-Test (Reihenfolge der Positionen
      ändert die Summenprüfung nicht; Leser stürzt bei beliebigem Text nicht ab)
- [x] Sicherheitstests: Entität, DOCTYPE, zu tiefe Verschachtelung, zu große Eingabe
- [x] Paketgrenzen-Prüfung kennt `erechnung`; Lint-Regel N1 gilt für das Paket; Lizenzprüfung grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

- **D-76.1** Welche Nähte werden getestet? → Nur `xrechnungLesen` aus `index` (Golden je Datei in `lesen.test.ts`,
  Sicherheit in `sicherheit.test.ts`, Eigenschaften in `eigenschaften.test.ts`); XML-Leser, Zahlenlesen und Rechenprüfung
  sind innen und werden nur über diese Naht geprüft. Grund: Die App braucht genau eine Funktion; Umbauten im Innern
  (z. B. später ZUGFeRD) lassen die Tests stehen.
- **D-76.2** Bibliothek oder eigener XML-Leser? → Eigener, **strenger** Leser (`xml.ts`, ~330 Zeilen), keine neue
  Abhängigkeit. Nicht wohlgeformtes XML wird nicht gelesen (`xml-ungueltig`), anders als der tolerante GAEB-Leser: Eine
  „gerettete“ Rechnung könnte falsche Beträge zeigen. Jeder `<!DOCTYPE` wird abgewiesen (`xml-doctype`, auch ohne
  Entitäten; XRechnung hat nie einen), nicht vordefinierte Entitäten ohne DTD ergeben `xml-entitaet`; aufgelöst werden nur
  die fünf vordefinierten Entitäten und Zeichenreferenzen. Namensräume über die URI mit Gültigkeitsbereich je Element,
  ein ungebundenes Präfix ist ein Fehler. Iterativ (kein Rekursionsstapel), Tiefe und Länge vor dem Aufbau geprüft.
  Grund: A3 verbietet den GAEB-Leser; die nötige Teilmenge ist klein, Sicherheitsgrenzen ohne Konfigurationsrisiko.
- **D-76.3** Wo stehen Herkunft und eigene Dateien? → Die vier KoSIT-Dateien liegen flach unter
  `fixtures/extern/xrechnung/`, ihre Herkunft als eigener Abschnitt in **`fixtures/extern/HERKUNFT.md`** (nicht in einer
  zweiten `xrechnung/HERKUNFT.md`: `tools/herkunft.mjs` prüft genau eine Tabelle und hätte die zweite Datei als fremde Datei
  gemeldet). REUSE-Block `fixtures/extern/xrechnung/**` mit `Apache-2.0`, Lizenztext `LICENSES/Apache-2.0.txt`
  (`reuse download`), `fixtures/extern/README.md` und `LICENSES/README.md` um je einen Abschnitt ergänzt. Lizenz der
  Testsuite: Apache-2.0 laut `LICENSE` (Tag `v2026-08-31`, Commit `44c3905`), keine NOTICE-Datei; mit AGPL-3.0-or-later
  verträglich (C4, C5). Selbst verfasste Dateien (Bau 875/876/877, Fehlerfälle) liegen in
  `packages/erechnung/testdaten/` mit Herleitung in dessen `README.md`, weil `fixtures/extern/` nur Dateien Dritter
  enthält. Dazu ein Fall in `tools/boundaries.test.mjs` (erechnung → gaeb wird abgewiesen). Grund: bestehende Prüfungen
  bleiben unverändert und decken die neuen Dateien ab.
- **D-76.4** Welcher Befundtyp? → Eigener Typ `XRechnungBefund { schwere, code, meldung, ort: Befundort }`, also
  `Pruefbefund` ohne `quelle`: `vertrag` kennt keine Quelle für E-Rechnungen, und eine Vertragsänderung wäre ein eigenes
  Ticket (A4, P9). `ort.feld` ist der Business Term (`BT-106`), `ort.pfad` das Element (`/Invoice/InvoiceLine[2]`), Zeile
  und Spalte nur bei XML-Fehlern. Falls die App die Befunde in die gemeinsame Befundliste legen will: `vertrag` um eine
  `Befundquelle` `'erechnung-lesen'` erweitern (Folgeticket, nicht hier).
- **D-76.5** Zahlen? → Lexikalisch nur `xsd:decimal` (Punkt, kein Komma, kein Exponent; `1.000,00` ist
  `zahl-ungueltig`), danach rechnet nur `dezimal`. **Beträge** werden `Betrag` (2 Stellen, kaufmännisch gerundet);
  mehr als 2 Nachkommastellen in der Datei ergeben immer `betrag-nicht-kanonisch` (EN 16931 erlaubt höchstens 2), auch wenn
  nur Nullen folgen; weniger Stellen (`336.9`) sind kein Befund. **Menge, Preis, Satz** sind `Dezimal`: Passt der Wert
  verlustfrei in die Skala des Vertrags (3/3/2), steht er genau mit dieser Skala da (`30.00000000000` → `30.000`, gültige
  `Menge`); sonst bleibt er exakt (`0.1234`) mit `menge-`/`preis-`/`satz-zu-viele-stellen`. Der Typ ist bewusst `Dezimal`,
  nicht `Menge`: Wer eine `Menge` braucht, prüft mit `alsMenge` und muss den Fall „zu viele Stellen“ behandeln. Währung
  ≠ EUR: `waehrung-nicht-eur` (Warnung), Beträge bleiben unverändert; das `currencyID`-Attribut einzelner Beträge wird nicht
  geprüft (Schematron).
- **D-76.6** Pflichtangaben und fehlende Werte in der Rechenprüfung? → Pflicht sind die sechs aus dem Ticket (BT-1, BT-2,
  BT-5, BT-109, BT-112, BT-115) und zusätzlich BT-106, BT-117 (je BG-23) und BT-131 (je Position): Ohne sie sagt eine
  Rechenregel nichts aus; alle sind auch in der EN 16931 Pflicht. Ein leeres Element gilt als fehlend; ein vorhandener,
  aber unlesbarer Wert ergibt nur `zahl-ungueltig`/`datum-ungueltig`, nicht zusätzlich `pflichtangabe-fehlt`. In den
  Regeln zählen fehlende optionale Beträge (BT-107, BT-108, BT-110, BT-113, BT-114) als 0; fehlt ein Wert, ohne den eine
  Regel nichts aussagt, entfällt sie (der fehlende Wert ist schon Befund). Jede Regel rechnet mit den Dateiwerten, nicht
  mit dem Soll der Regel davor, damit ein Fehler genau einen Befund ergibt. Reihenfolge: BT-106, BT-109, BT-110, BT-112,
  BT-115. Grund: U5 (nie sperren), keine Doppelbefunde.
- **D-76.7** Unterpositionen (XRechnung-Extension)? → Werden gelesen, nie verworfen (Q5): UBL `SubInvoiceLine` /
  `SubCreditNoteLine` verschachtelt; CII über `ParentLineID`, die auf eine **frühere** Position mit dieser `LineID`
  verweisen muss (verhindert Zyklen). Verweist sie auf keine frühere Position, wird sie eine eigene Position mit Befund
  `unterposition-ohne-oberposition`. BT-106 zählt nur die oberste Ebene. Die Summe der Unterpositionen gegen ihre
  Oberposition wird nicht geprüft (nicht im Ticket). Hinweis: Die Testsuite enthält keine CII-Datei mit Unterpositionen;
  die CII-Form ist nur mit der selbst verfassten `cii-unterpositionen.xml` geprüft.
- **D-76.8** Welche Werte bei Mehrdeutigkeit? → BT-110 ist der Steuerbetrag mit `currencyID` = BT-5 (eine zweite Summe in
  Steuerwährung ist BT-111 und wird nicht gelesen), sonst der erste. BT-31: UBL `PartyTaxScheme` mit `TaxScheme/ID = VAT`,
  CII `SpecifiedTaxRegistration/ID[@schemeID='VA']`. BT-24 (Spezifikation) wird mitgelesen; nennt er keine
  XRechnung 3.x (`urn:xeinkauf.de:kosit:xrechnung_3.`), gibt es die Warnung `spezifikation-unbekannt`, gelesen wird
  trotzdem. Rechnungsart bleibt der Code als Text (keine Prüfung der erlaubten Codes: Schematron). BT-2 ohne `Date`
  geprüft: UBL `JJJJ-MM-TT`, CII nur Format `102`; ungültig → `datum-ungueltig`, Wert `null`.
- **D-76.9** Grenzen und Auswahl? → Voreinstellung 20 Mi Zeichen (`STANDARD_MAX_ZEICHEN`, genug für eingebettete Anlagen)
  und Tiefe 100 (`STANDARD_MAX_TIEFE`), beide über `XRechnungOptionen` einstellbar. Aus der Testsuite übernommen: 01.01a
  in UBL und CII (gleicher Geschäftsfall → gleiche `Eingangsrechnung`), 04.04a (Schlussrechnung Bau 877 mit drei Ebenen
  Unterpositionen) und der umfassende CII-Fall 01.01 (BT-12, BT-13, BT-107, BT-108, BT-114, zweite Steuerwährung).
- **D-76.10** Benennung (L1, L2)? → Felder deutsch mit BT-Nummer im Kommentar; `summeAbschlaege`/`summeZuschlaege` für
  BT-107/BT-108, im Glossar gegen Abschlagsrechnung und Zuschlag (Vergabe) abgegrenzt. Neuer Begriff **Eingangsrechnung**
  im Glossar (unter „E-Rechnung“). Die interne Rechenprüfung heißt `summenregelnPruefen`, nicht `rechnungPruefen`
  (das ist die Rechnungsprüfung in `abrechnung`, Ticket 81).

## Answer

Branch `welle-5/76-xrechnung` (Stand von `integration/welle-5` eingemergt). Neues reines Paket `packages/erechnung`
(importiert nur `vertrag`, `dezimal`; keine neue Fremdabhängigkeit). Öffentliche API (`@tethys/erechnung`):

- `xrechnungLesen(text: string, optionen?: { maxZeichen?, maxTiefe? }): XRechnungLesung` →
  `{ syntax: 'ubl' | 'cii' | null, rechnung: Eingangsrechnung | null, befunde: XRechnungBefund[] }`.
- `Eingangsrechnung { spezifikation, rechnungsnummer, rechnungsdatum (JJJJ-MM-TT), rechnungsart, waehrung,
  kaeuferreferenz, vertragsnummer, bestellnummer, verkaeufer { name, umsatzsteuerId }, kaeufer { name }, summen,
  umsatzsteueraufschluesselung[], positionen[] }`; `summen` = BT-106 … BT-115 als `Betrag | null`; Position = BT-126,
  BT-129 (`Dezimal`), BT-130, BT-131 (`Betrag`), BT-146 (`Dezimal`), BT-153, BT-155, BT-156, `unterpositionen`.
- `XRechnungBefund { schwere, code: XRechnungBefundcode, meldung, ort: Befundort }`; `STANDARD_MAX_ZEICHEN`,
  `STANDARD_MAX_TIEFE`.

Für Ticket 88: Vorschau aus `rechnungsnummer`, `rechnungsdatum`, `rechnungsart`, `summen.netto` (BT-109),
`summen.brutto` (BT-112), `befunde`. Selbst verfasste Bau-Dateien für die E2E liegen in `packages/erechnung/testdaten/`
(`bau-abschlag-875.xml`, `bau-schluss-877.xml`), die KoSIT-Dateien in `fixtures/extern/xrechnung/`.

Tests (43 im Paket): Golden für alle 4 KoSIT-Dateien und 8 selbst verfasste (Bau 875 CII, 877 UBL, Unterpositionen CII
876, Rechenfehler, Pflichtangaben, auffällige Werte, Gutschrift 381, fremde Wurzel), Sicherheit (Billion Laughs, XXE,
DOCTYPE, Entität ohne DTD, Tiefe 100 000, Größe, 7 Arten kaputtes XML), 5 Property-Tests (Reihenfolge der Positionen,
beliebiger Text, XML-artiger Text, verstümmelte Echtdateien, Schreibweisen eines Betrags mit `bigint`-Orakel).
`reuse lint` lokal grün.

Volle Suite nach dem Merge: Lint grün (Grenzen, Lizenzen, Clean Room), Typecheck grün, Vitest 2119 bestanden, 2
übersprungen, 1 fehlgeschlagen: das Leistungsbudget `lvPruefen(gross): warm, Median unter 50 ms` in
`packages/kern/src/lv-pruefung-fixtures.test.ts` (fremdes Paket) mit Median 50,45 ms unter Parallellast; die Datei allein
wiederholt: 14/14 grün, Median 14,70 ms. Fixtures (`node --test`) 22/22.

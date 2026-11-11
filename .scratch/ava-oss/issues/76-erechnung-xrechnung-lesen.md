# 76: A4: XRechnung lesen (UBL und CII)

Status: ready-for-agent
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

- [ ] Golden-Tests je Testdatei (alle oben genannten Felder, Summen, Befunde) und Property-Test (Reihenfolge der Positionen
      ändert die Summenprüfung nicht; Leser stürzt bei beliebigem Text nicht ab)
- [ ] Sicherheitstests: Entität, DOCTYPE, zu tiefe Verschachtelung, zu große Eingabe
- [ ] Paketgrenzen-Prüfung kennt `erechnung`; Lint-Regel N1 gilt für das Paket; Lizenzprüfung grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

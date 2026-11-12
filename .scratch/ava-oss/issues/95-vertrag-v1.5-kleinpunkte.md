# 95: `vertrag` v1.5: Kleinpunkte aus Welle 5

Status: ready-for-agent
Type: task
Welle: 6 · Strang: F · Paket: `packages/vertrag` (+ markierte mechanische Zeilen); P9 (Mensch prüft; im Demo-Lauf Opus-Review,
D-42-Muster)
Blocked by: –
Modell: opus
Regeln: A4, L2, U5, P9, Q5, D-59
Herkunft: Ticket 71 (D-71.3), Ticket 76 (eigener `XRechnungBefund`), Ticket 80 (OZ-Vorschlag am Auftrags-LV, D-80.1), Ticket 70
(Offene Typfragen, z. B. Rechnungsdatum, Bemerkung an `Aufmassposition`, kumulierte `gefordert`-Beträge), Ticket 89 (D-89.1:
keine KG-Spalte im Grid, weil `LvSpalte` sie nicht kennt), Ticket 92 (D-92.4, D-92.6)

## What to build

Eine kleine Fassung v1.5 im Stil von Ticket 29/53/70: enge, umkehrbare Lesart im Typ, jede Lesart als Kommentar am Typ,
Alternativen als „Offene Typfragen“ unter Comments, Nicht-Additives nur mit der mechanischen Anpassung im selben Ticket
(markiert `// v1.5: mechanisch angepasst, Folgeticket`). Keine Logik außerhalb von `vertrag` (die Handler kommen in den
Folgetickets 104, 105, 106, 93, 121). Dieses Ticket läuft **vor** Ticket 97 (`vertrag` v1.6, Typen für X1–X4; D-59) und soll
klein bleiben: Ziel ist ein schneller Merge, damit 97 beginnen kann.

1. **Einheitlicher Fehlercode für Feldbefehle an einer Gliederung (D-71.3).** Heute meldet `KostengruppeSetzen` an einer
   Gliederung oder einem Hinweistext `knoten-unbekannt`, `TextquelleSetzen` dagegen `knotenart-unzulaessig`. Lesart v1.5:
   `knoten-unbekannt` nur, wenn es den Knoten nicht gibt; ein Feldbefehl, der eine Position verlangt und einen anderen
   Knoten trifft, meldet `knotenart-unzulaessig` (im LV und im Auftrags-LV). Kommentar an jedem betroffenen Befehl
   anpassen; die Umsetzung im Kern macht Ticket 105.
2. **Befundquelle für E-Rechnungen (Ticket 76).** Die gemeinsame Befundliste (`Pruefbefund`, seine Quelle) bekommt eine
   Quelle für das Lesen einer XRechnung, damit `erechnung` die gemeinsame Befundliste nutzen kann statt eines eigenen
   `XRechnungBefund` (Umstellung in Ticket 104). Ort eines solchen Befunds: der Business Term (z. B. `BT-115`) bzw. der Pfad
   in der Datei; entscheide die Form und begründe sie.
3. **OZ-Vorschlag für das Auftrags-LV (D-80.1).** Ticket 80 deutet für `ozVorschlag` eine Kennung des Auftrags-LV als
   LV-Kennung um (nur lesend). Lege fest, wie der Kern einen OZ-Vorschlag für das Auftrags-LV anbietet (Signatur am Rand des
   Vertrags, wie die übrigen Signaturen für Kern-Funktionen, falls es sie dort gibt; sonst nur Lesart am Typ), ohne
   umgedeutete Kennung. Umsetzung in Ticket 105.
4. **Offene Typfragen aus Ticket 70 sichten** (Abschnitt „Offene Typfragen“ in `issues/70-vertrag-auftrags-lv-repository.md`,
   u. a. Rechnungsdatum, Bemerkung je Aufmaßposition, ob `gefordert` kumuliert ist): je Frage entscheiden (additiv, optional)
   oder ausdrücklich vertagen, mit Grund. Nichts Nicht-Additives ohne zwingenden Grund.
5. **`LvUebersicht.netto` (D-92.4).** Additiv, optional: das gespeicherte Netto nach Nachlass des LV (`Betrag`), von `speicher`
   aus den gespeicherten Summen gefüllt (Ticket 106), damit die Projektseite das LV nicht ganz laden muss (Ticket 121). Fehlt
   = noch nicht gerechnet; nie `null`.
6. **Spalte „KG“ im LV-Grid (D-89.1, Ticket 93).** `LvSpalte` bekommt `'kostengruppe'`. Weil `LvSpalte` eine geschlossene
   Liste ist, zieht dieses Ticket `ui-grid` nur so weit mechanisch nach, dass alles wie bisher aussieht (die neue Spalte ist
   nicht in den Standardspalten und wird noch nicht gezeichnet); die echte Spalte baut Ticket 93. In `ui-grid` arbeitet zur
   selben Zeit Ticket 96 am Vergleichsgrid: ändere dort nur die nötigsten, markierten Zeilen des `LvGrid`.

Begriffe zuerst ins `GLOSSARY.md` (L2), falls neu (z. B. die Befundquelle der E-Rechnung im Eintrag „Prüfbefund“).

## Grenzen

- Nur `packages/vertrag`, dazu markierte mechanische Zeilen. Keine Typen für X1–X4 (die bringt Ticket 97).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Typen mit Kommentar im Stil von `vertrag`; Lesarten am Typ; Offene Typfragen unter Comments; Beispiele und Typtests in
      `beispiele.ts`/`vertrag.test.ts`
- [ ] Jede mechanische Anpassung markiert, Liste in den Comments; Folgearbeit je Paket als Stichpunkt für die Tickets 93, 104,
      105, 106, 121 unter Comments
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

Folgearbeit App (Ticket 121): zurückgehaltene, unlesbare Druckprofile exportieren oder löschen können (D-92.6, Q5).

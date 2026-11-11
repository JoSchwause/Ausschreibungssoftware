# 95: `vertrag` v1.5: Kleinpunkte aus Welle 5

Status: ready-for-agent
Type: task
Welle: 6 · Strang: F · Paket: `packages/vertrag` (+ markierte mechanische Zeilen); P9 (Mensch prüft)
Blocked by: –
Regeln: A4, L2, U5, P9
Herkunft: Ticket 71 (D-71.3), Ticket 76 (eigener `XRechnungBefund`), Ticket 80 (OZ-Vorschlag am Auftrags-LV), Ticket 70
(Offene Typfragen, z. B. Rechnungsdatum, Bemerkung an `Aufmassposition`, kumulierte `gefordert`-Beträge)

## What to build

1. Einheitlicher Fehlercode für Feldbefehle an einer Gliederung (`KostengruppeSetzen` meldet `knoten-unbekannt`,
   `TextquelleSetzen` `knotenart-unzulaessig`; D-71.3).
2. `Befundquelle` für E-Rechnungen, damit `erechnung` die gemeinsame Befundliste nutzt statt `XRechnungBefund` (Ticket 76).
3. Ein OZ-Vorschlag des Kerns für das Auftrags-LV ohne umgedeutete Kennung (Ticket 80, Vorschlag D-80.x).
4. Offene Typfragen aus Ticket 70 sichten (Rechnungsdatum, Bemerkung je Aufmaßposition, ob `gefordert` kumuliert ist) und
   entscheiden oder ausdrücklich vertagen.

## Acceptance criteria

- [ ] Typen mit Kommentar, mechanische Anpassungen markiert, Folgetickets je Paket

## Comments

# 70: `vertrag` v1.4: Repository und Befehle für das Auftrags-LV

Status: ready-for-agent
Type: task
Welle: 5 · Strang: F · Paket: `packages/vertrag` (+ markierte mechanische Zeilen); P9 (Mensch prüft)
Blocked by: –
Regeln: A4, ADR 0011, P9
Herkunft: Ticket 64, D-64.2 und D-64.4; Wellen-Review 4

## What to build

1. `Speicher` bekommt ein `AuftragsLvRepository` (`laden`, `auflisten(projektId)` mit Übersicht), wie `LvRepository`. Heute liest
   die App ein Auftrags-LV aus dem ganzen Projektdatei-Export (D-64.2), was bei großen Projekten langsam wird.
2. Grundlage für eine eigene Umkehrung von Auftrags-LV-ChangeSets im Kern (Ticket 71), damit die App nicht die LV-Umkehrung mit
   umgedeuteter Kennung nutzt (D-64.4).

## Acceptance criteria

- [ ] Typen mit Kommentar im Stil von `vertrag`, mechanische Anpassung markiert; Folgearbeit in `speicher` und `apps/web` als Tickets

## Comments

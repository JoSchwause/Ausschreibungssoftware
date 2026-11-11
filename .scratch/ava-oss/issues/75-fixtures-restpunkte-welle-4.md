# 75: Fixtures: Restpunkte aus Welle 4

Status: claimed
Type: task
Welle: 5 · Strang: F · Paket: `fixtures/`
Blocked by: –
Regeln: C4, D-05
Herkunft: D-63.9, Wellen-Review 4 (P2)

## What to build

1. `typisch-angebote.json` `ausreisserAnnahmeA7` nennt Bieter C an 03.0080 (Preis 0,000) als Ausreißer; nach D-05 ist das ein
   Nullpreis. Feld nach D-05 neu berechnen oder entfernen (Verbraucher prüfen).
2. Unabhängige Sollwerte für Bedarfs- und Wahlsumme der LV-Fixtures, damit der Drucktest (Ticket 58) nicht gegen den Kern prüft.

## Acceptance criteria

- [ ] Selbsttest grün; Verbraucher angepasst

## Comments

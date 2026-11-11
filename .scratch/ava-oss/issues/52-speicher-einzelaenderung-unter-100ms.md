# 52: Speicher: Einzeländerung bei 5.000 Positionen unter 100 ms bis zur Summenzeile

Status: claimed
Type: task
Welle: 4 · Strang: S · Paket: `packages/speicher` (dazu Messung in `apps/web/e2e/leistung.spec.ts`)
Blocked by: –
Regeln: Q4, G-33, A3, A5, Q5
Herkunft: Ticket 39 (Comments, Punkt 5 nicht hart erfüllt), Ticket 47 und 48 (Comments, Messwerte), Ticket 10 (Einzelbefehl Median 47 ms, „nicht optimiert“)

## What to build

Q4 verlangt: Das LV-Grid bleibt bei 5.000 Zeilen flüssig; eine Einzeländerung erreicht die Summenzeile in unter 100 ms.
Die App-Schicht hält das (Median 11–20 ms ohne Speicher), der Gesamtweg nicht sicher. Messwerte aus den Comments von 39,
47 und 48 (`gross`, Mengenänderung Enter → Summenzeile, Maschine unter Last):

- Gesamt Median 78 / 82 / 86 ms in drei Läufen, unter starker Last 101 / 133 ms (Ticket 39); 77 / 94 / 67 ms (Ticket 47)
- davon `speicher.anwenden` (Worker, OPFS) Median 68–111 ms (Ticket 39); Undo: 54 ms von 69 ms gesamt (Ticket 48)

Der Hebel liegt in `speicher`: Prüfsumme (Web Crypto, asynchron, Ticket 38), Protokolleintrag (~410 Bytes je Einzeländerung),
Baumprüfung nach dem Schreiben (`pruefeBaum`), Transaktion und Antwort über den Worker. Zuerst messen, wo die Zeit steht
(Phasen einzeln), dann die größte Stelle kürzen, ohne eine Prüfung zu schwächen (Q5) oder die Protokollform zu ändern (ADR 0009).

## Grenzen

- Nur `speicher` und Messung; Vertrag unverändert. Die Reihenfolge der Aufrufe (Kette im Kern und im Worker-Host) bleibt.
- Die harte Schranke in `e2e/leistung.spec.ts` wird auf die Gesamtzeit (< 100 ms Median) angehoben, sobald der Messwert
  auch unter Last trägt; bis dahin Messwert im Ticket nennen.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Phasenmessung von `anwenden` (Prüfsumme, Prüfungen, Transaktion, Worker-Antwort) im Ticket
- [ ] `MengeAendern` bei `gross` (5.000 Positionen) bis zur Summenzeile: Median < 100 ms gesamt, in drei Läufen; Messwert im Ticket
- [ ] Alle bisherigen `speicher`-Tests grün, Prüfungen unverändert (Q5), Protokoll unverändert
- [ ] `e2e/leistung.spec.ts` prüft die Gesamtzeit hart (< 100 ms Median, grobe Schranke nur für Ausreißer)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Änderung der Protokollform, Weglassen der Prüfsumme, Umbau auf eine andere Speicherschicht.

## Comments

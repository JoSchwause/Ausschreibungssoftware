# 94: Aufmaßblatt mit 5.000 Zeilen: Einzeländerung und Undo unter 100 ms

Status: ready-for-agent
Type: task
Welle: 6 · Strang: S, A2 · Paket: `packages/speicher` (oder `vertrag` v1.5, je nach Entscheidung)
Blocked by: –
Regeln: Q4, A6, D-36 (8), D-45, D-47
Herkunft: Wellen-Review 5, P4; Messung in Ticket 87 (D-45): Undo 82–144 ms je Schritt, ein Befehl 84–93 ms, fast alles im
Speicherkern (ganzes Blatt ≈ 1 MiB JSON lesen, mit `vorher` vergleichen, neu schreiben)

## What to build

Zuerst die kleine Lösung: `speicher` vergleicht `vorher` über den gespeicherten kanonischen Text (Hash) statt über das
geparste Blatt und schreibt nur bei Änderung. Reicht das nicht für < 100 ms im dauerhaften Profil (D-29), dann `vertrag` v1.5:
`AufmassChangeSet` mit `Aenderungen<Aufmassposition>` statt ganzem Blatt (eigenes Vertragsticket, Mensch prüft, P9).

## Acceptance criteria

- [ ] Messung vor/nach im Ticket; Budgettest für 5.000 Zeilen (Q4)

## Comments

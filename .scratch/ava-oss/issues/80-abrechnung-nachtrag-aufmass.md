# 80: A1+A2: Paket `abrechnung`: Nachtrag übernehmen, Aufmaß-Befehle

Status: ready-for-agent
Type: task
Welle: 5 · Strang: A1, A2 · Paket: `packages/abrechnung` (neu; Workspace-Dateien; `tools/boundaries.mjs` kennt es schon)
Blocked by: 70
Regeln: A2, A3, A5, A6, A7, F1, F4, N1–N3, U5, Q1, Q5, D-21, D-22, D-35, D-36
Herkunft: `plan.md` §2 A1, A2; `vertrag` v1.4 (Ticket 70, Comments „Folgearbeit Abrechnung“)

## What to build

Neues reines Paket `packages/abrechnung` (A2; darf `vertrag`, `dezimal`, `kern` importieren, A3). Zwei Teile:

1. **Nachtrag übernehmen (D-35).** `nachtragUebernehmen(auftragsLv: AuftragsLvZustand, nachtragsLv: LvZustand, angebot:
   Angebot, neueIds)` → `{ befehl: NachtragUebernehmen; warnungen }` oder Fehler. Regeln wörtlich aus D-35: eine neue
   Gliederung „Nachtrag <nummer>“ auf oberster Ebene (Los, wenn dort Lose stehen, sonst Titel; F1) mit der nächsten freien OZ
   der obersten Stufe (Maske des Auftrags-LV; kern-Hilfen für OZ nutzen), darunter der Baum des Nachtrags-LV mit
   unveränderten PositionIds; EP und EPA aus dem Angebot; nicht angeboten → EP `null` mit Warnung; Wahl-Alternativen
   entfallen mit Warnung (Grundposition bleibt); Nachlass des Angebots wird mit Warnung ignoriert; Zuschlagspositionen mit
   dem Zuschlagssatz des Angebots (wie D-21). Fehler: mehr als 5 Ebenen, MwSt-Satz des Nachtrags-LV ≠ Auftrags-LV,
   PositionId schon im Auftrags-LV, Nachtragsangaben fehlen oder gehören zu einem anderen Auftrags-LV, Angebot gehört nicht
   zum Nachtrags-LV oder nicht zum Bieter des Auftrags. Dazu `nachtragsbefunde(auftragsLv, nachtragsLvs)`: „beauftragt,
   aber Positionen fehlen im Auftrags-LV“ und „Positionen übernommen, Status nicht beauftragt“ (D-35).
2. **Aufmaß (D-36 (1)).** `aufmassBefehlAusfuehren`, `aufmassChangeSetAnwenden`, `aufmassChangeSetUmkehren` nach den
   Signaturen aus v1.4: Formprüfungen (Nummer ≥ 1, eine Zeile je Position, Menge kanonisch mit 3 Stellen, ein Ansatz mit
   Fehler kommt mit `menge: null`, Lesarten wie `MengenansatzSetzen`, D-22), ChangeSet als ganzes Aggregat. Dazu
   `aufmassPruefen(aufmass, auftragsLv)` → Befunde (Position unbekannt, Kennung ist keine Position, Position ohne EP).
   Die Nummer des nächsten Blatts: `naechsteAufmassnummer(aufmasse)`.

Soll/Ist, Leistungsstand und Rechnungsprüfung folgen in Ticket 81 (gleiches Paket, danach).

Neue Begriffe zuerst ins `GLOSSARY.md` (L2), soweit Ticket 70 sie nicht schon eingetragen hat.

## Grenzen

- Nur `packages/abrechnung` und Workspace-Dateien. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Golden-Tests `nachtragUebernehmen` an `typisch` (Auftrags-LV aus Bieter-Angebot) mit einem kleinen Nachtrags-LV (2
      Positionen, eine nicht angeboten): Knoten, OZ, EP, Warnungen; jeder Fehlerfall ein Test
- [ ] Property-Test: anwenden ∘ umkehren = Identität für jeden Aufmaß-Befehl; Ergebnis von `nachtragUebernehmen` wird vom
      Kern (`auftragsLvBefehlAusfuehren`, Ticket 71) angenommen, sobald 71 gemergt ist (bis dahin Test über die Baumregeln
      des Kerns: `baumfehler`)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- `nachtragUebernehmen` braucht den Bieter des Auftrags: zusätzlicher Parameter `auftragsangebot: AngebotKopf` (oder
  `bieterId`), sonst ist der Fehler „Angebot nicht vom Bieter des Auftrags“ nicht prüfbar.
- Nachtrags-LV mit Losen (F1: ein Los steht nur auf oberster Stufe): entscheiden – Fehler, oder Los wird Titel mit gleicher
  Kennung – und als `D-80.<n>` begründen.

## Comments

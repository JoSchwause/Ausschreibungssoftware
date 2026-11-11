# 59: V4: Zuschlag → Auftrags-LV (Rechnung)

Status: ready-for-agent
Type: task
Welle: 4 · Strang: V4 · Paket: `packages/vergabe`
Blocked by: 53 (`vertrag` v1.3: Auftragnehmer), 51 (Fixtures in GAEB-Form); für das Speichern des Ergebnisses 57
Regeln: A2, A3, A5, ADR 0011, F4, N2, N5, U5, Q5, G-26, E-04, D-21
Herkunft: `plan.md` §2 V4, D-21

## What to build

Reine Funktion in `vergabe` (D-21):

`zuschlagErteilen(lv: LvZustand, angebot: AngebotZustand | Angebot, projekt: Projekt, gewaehlt: ReadonlySet<PositionId>,
neueId: AuftragsLeistungsverzeichnisId) → Ergebnis<{ befehl: AuftragsLeistungsverzeichnisAnlegen; warnungen: Zuschlagswarnung[] }>`

1. Grundlage ist das **gedachte LV** des Angebots (`gedachtesLv`): EP des Bieters, Zuschlagssatz des Bieters an
   Zuschlagspositionen, Nachlass des Angebots, MwSt des LV, Kopfdaten (Name, OZ-Maske, Auftraggeber, Vergabeinformationen)
   aus dem LV. `projektId`, `leistungsverzeichnisId`, `angebotId` gesetzt; Auftragnehmer (v1.3) = Name des Bieters.
2. **Wahl:** Eine gewählte Wahlposition wird normale Position (`merkmale.wahl` entfernt). Grundposition (Variante 0) und
   nicht gewählte Alternativen ihrer Gruppe entfallen. Gruppen ohne Wahl behalten die Grundposition; ihre Alternativen
   entfallen. Bedarf bleibt Bedarf (mit/ohne Gesamtbetrag unverändert).
3. **Aufräumen:** `reihenfolge` je Elternknoten dicht neu; OZ unverändert (Lücken erlaubt); geleerte Titel bleiben.
   Listenbezüge von Zuschlagspositionen und `grundpositionId` auf entfallene Positionen werden entfernt, je Warnung; nicht
   umlenken (Annahme).
4. **Fehler:** mehr als eine gewählte Position je Gruppe; eine gewählte Kennung, die keine Alternative (Wahl mit Variante ≠ 0)
   des LV ist; Angebot gehört nicht zum LV. Ergebnis `ok: false` mit `ungueltige-eingabe` und Feld.
5. **Warnungen (U5):** nicht angebotene Position (auch gewählte) → EP `null`; Zuschlagsposition ohne Satz des Bieters →
   Satz `null`; entfernte Bezüge; Zahl der entfallenen Positionen. Der Befehl entsteht trotzdem.
6. Der Kern muss den Befehl annehmen (`auftragsLvBefehlAusfuehren`) und die Summen des Auftrags-LV stimmen bei einem Angebot
   ohne Wahl und ohne fehlende Preise mit den Bietersummen (`angebotSummenBerechnen`) überein: Test mit allen drei Bietern
   aus `typisch-angebote` (Sollwerte der Fixture), dazu Fälle mit Wahl und Lücken.

Hilfsfunktion für die App: `zuschlagsvorschau(lv, angebot, gewaehlt)` mit Zahl entfallender und unbepreister Positionen,
Wahlgruppen mit ihren Varianten (für den Dialog in Ticket 64).

## Grenzen

- Nur `packages/vergabe` (Abhängigkeit `vergabe → kern` ist erlaubt, A3). Keine eigene Summenregel: Summen rechnet der Kern.
- Keine Uhr (A2); ein Zuschlagsdatum gibt es in v1.3 nicht.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Golden-Tests gegen `typisch-angebote` (alle Bieter) und `zuschlag.json`; Fälle Wahl gewählt/nicht gewählt, Bedarf,
      nicht angeboten, Bezug entfernt
- [ ] Property-Test: Positionen des Auftrags-LV ⊆ Positionen des LV, IDs unverändert; ohne Wahlgruppen und ohne Lücken
      Netto des Auftrags-LV = Netto des Angebots
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Oberfläche (Ticket 64), Nachträge, X86-Export des Auftrags-LV (läuft über den vorhandenen Writer).

## Comments

### Aus Ticket 53 (Review, D-27)
- Ein gesetzter `auftragnehmer` wird von `speicher` bis Ticket 57 mit `unbekannt` abgewiesen; die Rechnung hier ist davon unabhängig, die App (64) braucht 57.
- Der Mengenansatz der Positionen kommt über das gedachte LV mit ins Auftrags-LV (Spread); das ist gewollt.

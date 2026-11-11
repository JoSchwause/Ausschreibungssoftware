# 82: C2+C3: Kostenermittlung als Aggregat, Kostenkontrolle

Status: ready-for-agent
Type: task
Welle: 5 · Strang: C2, C3 · Paket: `packages/kosten`
Blocked by: 70, 78
Regeln: A2, A3, A5, N1–N3, F4, U5, Q1, G-16, D-24, D-36, D-37, D-38
Herkunft: `plan.md` §2 C2, C3; `vertrag` v1.4 (Ticket 70, Comments „Folgearbeit Kosten“)

## What to build

1. **Kostenermittlung-Befehle** (v1.4): `kostenermittlungBefehlAusfuehren`, `kostenermittlungChangeSetAnwenden`,
   `kostenermittlungChangeSetUmkehren`; Formprüfungen (Nummer per `kgLesen`, Betrag kanonisch 2 Stellen, Nummern im
   gespeicherten Stand eindeutig); ChangeSet als ganzes Aggregat. Der vorhandene Weg „ungeprüfter Text → Eintrag mit
   Befunden“ (`kostenermittlungBerechnen`, CSV) bleibt und erzeugt die Einträge für `KostenermittlungAnlegen` (doppelte
   Nummern dabei zusammenfassen mit Befund, D-55.4).
2. **Kostenkontrolle (D-37).** `kostenkontrolleBerechnen({ budget: Kostenermittlung | null; auftraege: readonly
   AuftragsLvZustand[]; leistungsstaende: readonly { auftragsLvId; leistungsstand: Leistungsstand }[] })`: Zeilen je
   Kostengruppe (Baumsummen nach D-24: eigener Wert + Kinder), „ohne Kostengruppe“, „Nachlass“ (negativ, ohne Budget),
   Gesamt; Spalten Budget, Vergabe (Σ der Positionssummen des Auftrags-LV aus `summen.positionen`, nur zählende Positionen
   nach F4, je KG der Position), Abrechnung (Σ `Leistungsstand.positionen.gp` je KG; Nachlasszeile =
   `Leistungsstand.nachlass`), Abweichung Vergabe − Budget. Gesamt Vergabe = Σ Netto nach Nachlass der Auftrags-LVs; Gesamt
   Abrechnung = Σ `nettoNachNachlass`. Netto durchgehend; Umlagen, Einbehalt und MwSt gehören nicht dazu. Mehrere
   Auftrags-LVs je Projekt werden addiert. `kosten` importiert `kern` nicht (A3): die Positionssummen stehen im Zustand.
3. Befunde (U5): Kostengruppe der Position nicht in der Budget-Gliederung (zählt trotzdem), Position mit KG der Ebene 1 und
   Budget nur auf Ebene 3 (Hinweis), Leistungsstand zu einem unbekannten Auftrags-LV.

## Grenzen

- Nur `packages/kosten` (Module neben `kalkulation.ts` aus Ticket 78). Keine Speicherung, keine Oberfläche.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Golden-Tests mit hergeleiteten Werten; Property-Test: Summe der Zeilen (Ebene 1 + ohne KG + Nachlass) = Gesamt, auf den
      Cent, je Spalte; Reihenfolge der Positionen ändert nichts
- [ ] anwenden ∘ umkehren = Identität für jeden Kostenermittlung-Befehl
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Pflichtpunkt: den Eingabetyp `Kostenermittlungseintrag` in `kosten` umbenennen (Vorschlag `Kostenermittlungseingabe`),
  damit es nicht zwei Typen gleichen Namens gibt (L1/L2; Offene Typfrage 12 aus Ticket 70). Verbraucher im Repo mitziehen
  (nur `kosten` selbst; die App nutzt den Typ noch nicht).

## Comments

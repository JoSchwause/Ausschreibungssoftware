# 02: `vertrag` v1: Domänentypen, Befehle, ChangeSet (F2)

Status: ready-for-agent
Type: task
Welle: 0 · Strang: F · Paket: `packages/vertrag` (einziger Schreiber, P2)
Blocked by: 03
Regeln: A2, A3, A4, A5, A6, A7, A8, N1, N3, L1, L2
Gate: **Mensch prüft vor dem Merge** (G-50). Danach ist `vertrag` für Welle 1 stabil.

## What to build

Nur **Typen und Schnittstellen**, keine Logik. Ableitung aus ADR 0009, 0011, `GLOSSARY.md` und `spec.md` §5.

1. **Aggregate (ADR 0011):** `Projekt` (Name, Bauherr-Felder), `Leistungsverzeichnis` (Ausschreibung), `Angebot`, `AuftragsLeistungsverzeichnis`; getrennte Aggregate mit gemeinsamer Positions-ID (UUIDv7, A7).
2. **LV-Baum:** `Los` (nur gliedernd), `Titel` bis 5 Ebenen, `Position`, `Hinweistext`. `Ordnungszahl` ist Anzeigedatum, nie Schlüssel; `OzMaske` je LV frei definierbar.
3. **Positionsarten:** Normal, Bedarf mit und ohne Gesamtbetrag, Wahl, Zuschlagsposition (GAEB `MarkupItem`, nicht „Zulage“), Stundenlohn, Pauschal, Hinweis; Flags als Felder, nicht als Untertypen, wo GAEB sie so führt. Einheitspreisanteile (EPA).
4. **Zahlen:** Branded Types `Menge`, `Einheitspreis`, `Betrag`, `Prozent` über einem opaken `Dezimal`; Nachkommastellen als **eine** Konstantentabelle (Menge 3, EP 3, Prozent 2, Betrag 2; G-21). Kein `number` (N1).
5. **Nachlass** (ein Nachlass je LV und je Angebot, prozentual oder absolut; G-23, G-26), **MwSt** (ein Satz je LV; G-28).
6. **Befehle und ChangeSet:** `Befehl`-Union (`(Zustand, Befehl) → ChangeSet`, A5), `ChangeSet` = geänderte Knoten + betroffene Summen (A6), `Protokolleintrag` (wer, was, wann; ADR 0009).
7. **Repository-Schnittstellen** für `speicher` (S1) und die Projektdatei als **JSON** mit Schemaversion (G-56, A8).
8. **GAEB-neutrale Austauschtypen** nur, soweit `gaeb` (G1) sie braucht: Phase, Version, Prüfbefund (Warnung, Fehler, Quelle), Entwurfskennzeichen (G-13).

Begriffe kommen **zuerst** ins `GLOSSARY.md` (L2); dort ist die EP-Angabe „2, optional 3“ an G-21 anzupassen.

## Acceptance criteria

- [ ] `pnpm lint` und `tsc` grün; Paket hat keine Laufzeitabhängigkeit außer Typen (A2)
- [ ] Typtests (`expectTypeOf`): `number` ist für Menge, EP, Betrag, Prozent nicht zuweisbar
- [ ] Jede Entität hat eine UUIDv7-ID; Positionen tragen eine ID, die Ordnungszahl ist kein Schlüssel
- [ ] Die Konstantentabelle der Nachkommastellen steht an genau einer Stelle (N3)
- [ ] Beispielbefehl und Beispiel-ChangeSet als Typen kompilierbar, mit Kommentar in einem Satz
- [ ] Typen der Fixtures (Ticket 19) lassen sich vollständig auf `vertrag` abbilden; Abweichungen stehen im Ticket
- [ ] Offene Typfragen stehen als Kommentar im Ticket mit `needs-info`, nicht geraten (P5)

## Nicht-Ziele

Berechnung (K), Speicherimplementierung (S), GAEB-Elemente (G), Oberfläche.

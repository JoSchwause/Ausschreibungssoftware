# Tickets Welle 0 und 1

Stand: 2026-11-09. Nummern 02–10 sind aus `.scratch/ava-mvp/issues/` wiederverwendet und neu geschrieben (Entscheidungen
G-01 bis G-56 eingearbeitet); 18 und höher sind neu. Die alten Tickets in `.scratch/ava-mvp/issues/` gelten nur noch
als Herkunft. Regeln: `docs/regeln.md`. Spec: `.scratch/ava-mvp/spec.md`.

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Welle |
|---|---|---|---|---|---|
| 03 | F1 | Repo-Gerüst, Tooling, CI | Wurzel, `.github/` | – | 0 |
| 19 | F3 | Fixtures v1: drei LVs mit Sollwerten | `fixtures/` | – | 0 |
| 02 | F2 | `vertrag` v1 (**Mensch prüft vor Merge**) | `packages/vertrag` | 03 | 0 |
| 23 | F3b | Amtliche und fremde Testdateien einbinden | `fixtures/extern/` | 03 | 0/1 |
| 04 | K1 | Dezimal, Rundung, de-DE | `packages/dezimal` | 02 | 1 |
| 05 | K2 | LV-Hierarchie | `packages/kern` | 02, 04 | 1 |
| 06 | K3 | OZ-Maske, Umnummerierung | `packages/kern` | 05 | 1 |
| 07 | K4 | Summen, Nachlass, MwSt, ChangeSet | `packages/kern` | 05 | 1 |
| 10 | S1 | SQLite-WASM/OPFS, Migrationen, Protokoll | `packages/speicher` | 02 | 1 |
| 20 | U1 | Tokens, Hülle, Bausteine | `packages/ui-basis` | 03 | 1 |
| 21 | U2 | Baum-Grid auf Fixtures | `packages/ui-grid` | 02, 03, 19, 20 | 1 |
| 22 | G1 | GAEB-Modell und Parser X81/X83 (3.3) | `packages/gaeb` | 02, 03, 23 | 1 |
| 18 | – | Prototyp für das Nutzerinterview (Wegwerf, eigener Branch) | `proto/interview` | – | läuft getrennt |

## Reihenfolge

1. **03** und **19** parallel (Wurzel und `fixtures/` sind verschiedene Orte).
2. **02** nach 03; **23** nach 03. Danach ist `vertrag` das Tor: Welle 1 startet erst, wenn 02 gemergt und geprüft ist.
3. Welle 1 parallel, ein Schreiber je Paket: **04 → 05 → 06/07** (ein Agent für `dezimal` und `kern`), **10**, **20 → 21**, **22**.
   06 und 07 teilen `kern`; sie laufen nacheinander, nicht gleichzeitig (P2).
4. Höchstens etwa 8 Agenten gleichzeitig (P4); jeder in eigenem Worktree und Branch (P3).

## Nicht in diesen Tickets

Welle 2 (K5–K7, S2, U3, G2, O1-Spike) und später. Sie werden nach Welle 1 geschnitten, wenn `vertrag` stabil ist und das
Grid die Fixture zeigt. Bis dahin steht ihr Umfang in `plan.md` §2.

## Offene Hinweise

- Ticket 04 klärt die Rundung negativer Werte; lässt sie sich nicht belegen, geht es auf `needs-info` (P5).
- Ticket 23 nimmt amtliche Dateien ohne Lizenzangabe auf (G-55, Risiko vermerkt). Es blockiert Ticket 22 nur für die Golden-Dateien, nicht für die Fehlerdateien.
- Cloud-Agenten lesen nur Tickets (C3). Die Tickets nennen deshalb Quellen und Regeln selbst und verweisen nicht auf `okf/research/`.

# Tickets Welle 2

Stand: 2026-11-10. Schnitt nach E-20. Ab Welle 2: ein Pull Request je Ticket, Review-Agent, Merge-Commit (P7);
`vertrag`-Tickets prüft der Nutzer (P9). Tickets werden einzeln geschnitten; „offen“ heißt: wird geschnitten, sobald
die genannten Blocker gemergt sind (die Typnamen aus v1.1a/v1.1b stehen erst dann fest).

| Nr | Strang | Titel | Paket (ein Schreiber) | Blocked by | Stufe |
|---|---|---|---|---|---|
| 24 | F | `vertrag` v1.1a „Lücken“ (**Mensch prüft**) | `packages/vertrag` | – | 1 |
| 25 | – | Aufräumen nach Welle 1 | `fixtures/`, `tools/`, je eine Stelle in `kern`, `gaeb` | – | 1 |
| 18 | – | Prototyp für das Nutzerinterview | `proto/interview` (eigener Branch) | – | 1 |
| 28 | O1 | PDF-Spike | `packages/ausgabe` | – | 1 |
| 26 | F | `vertrag` v1.1b „Inhaltsmodell“ (**Mensch prüft**) | `packages/vertrag` | 24 | 1 |
| 27 | K | Kern: Feldbefehle | `packages/kern` | 25 | 2 |
| offen | K | Anpassung `kern` an v1.1a (mit Maskenbefund am Befehl, Rest von E-19 Nr. 3) | `packages/kern` | 24, 27 | 2 |
| offen | S | Anpassung `speicher` an v1.1a | `packages/speicher` | 24 | 2 |
| offen | G | Anpassung `gaeb` an v1.1a | `packages/gaeb` | 24, 25 | 2 |
| offen | U | Anpassung `ui-grid` an v1.1a | `packages/ui-grid` | 24 | 2 |
| offen | K5–K7 | Positionsmerkmale, Wahl-/Zuschlagspositionen, EPA | `packages/kern` | 26, Anpassung `kern` | 3 |
| offen | S2 | Projektliste und Projektdatei | `packages/speicher`, `apps/web` | 26 (Protokolleintrag, E-13), Anpassung `speicher` | 3 |
| offen | U3 | LV-Grid an Befehle angebunden | `apps/web` | 27, Anpassung `ui-grid` | 3 |
| offen | G2 | Writer X81/X83/X86, XSD in der CI | `packages/gaeb` | 26, Anpassung `gaeb` | 3 |

**Ausnahme von P2 in 24 und 26:** Ein Vertragsticket darf andere Pakete rein mechanisch nachziehen, damit sein Pull
Request für sich grün ist. Weil 25 und 27 zur selben Zeit in `kern` und `gaeb` schreiben, gilt die Reihenfolge beim
Mergen: 25 und 27 zuerst; der Branch von 24 (und später 26) nimmt danach `main` auf, Konflikte löst der Orchestrator.

Tor der Welle: **M1 „LV anlegen, rechnen, speichern“** (`plan.md` §4).

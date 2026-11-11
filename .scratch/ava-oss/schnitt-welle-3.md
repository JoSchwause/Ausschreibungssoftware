# Schnitt des Laufs „Welle 3“ (Phase A = Rest von Welle 2, Phase B = Welle 3)

Stand 2026-11-10, Orchestrator. Entscheidungen: `entscheidungen-auto.md` (D-01 bis D-06).
Integrationsbranch `integration/welle-3`. Ein Schreiber je Paket (P2).

| Nr | Phase | Strang | Titel | Paket (ein Schreiber) | Blocked by | Modell |
|---|---|---|---|---|---|---|
| 29 | A | F | `vertrag` v1.2: Ergänzungen für Welle 3 (Zuschlagssatz im Angebot, `''`→`null`, fehlende Befehlstypen für K9/S3) | `packages/vertrag` | – | opus |
| 30 | A | K | Anpassung `kern` an v1.1a (füllt `summen.vorher`, Löschen, Hinweise, Maskenbefund am Befehl) | `packages/kern` | – | opus |
| 31 | A | S | Anpassung `speicher` an v1.1a/v1.1b (`konflikt`, Löschen, Auftrags-LV, `schliessen`, Langtext-Sperre aufheben) | `packages/speicher` | – | opus |
| 32 | A | G | Anpassung `gaeb` an v1.1a/v1.1b (`wurzelId`, 3.1, `losStufe`, Merkmale, Langtext, Kopfdaten lesen) | `packages/gaeb` | – | opus |
| 33 | A | U | Anpassung `ui-grid` an v1.1a (`GridZahlen`, `wurzelId`, Hinweise) | `packages/ui-grid` | – | opus |
| 34 | A | U4a | Langtext-Editor (TipTap, eingeschränktes Schema, verlustfreie Abbildung `Langtext` ↔ TipTap) | `packages/ui-basis` | – | opus |
| 35 | A | M1 | REB-23.003-Formelparser (Formel 91 zuerst) | `packages/mengen` (neu) | – | opus |
| 36 | A | V1+V2 | Bieter, Angebot (Angebotsbefehle ausführen), Bietersummen, Preisspiegel-Rechnung | `packages/vergabe` (neu) | – | opus |
| 37 | A | K5–K7 | Positionsmerkmale, Wahl- und Zuschlagspositionen (D-03), EPA | `packages/kern` | 30 | opus |
| 38 | A | S2 | Projektliste und Projektdatei, Migration auf Schema 2 (ersetzt die Übergangsfunktion) | `packages/speicher` | 31 | opus |
| 39 | A | U3 | LV-Grid an Befehle angebunden, Projektliste in der App, E2E für Tor M1 | `apps/web` | 30, 33, 38 | opus |
| 40 | A | G2 | Writer X81/X83/X86, eigene Prüfung, XSD-Gegenprüfung in der CI, Roundtrip (Tor M2) | `packages/gaeb`, CI-Workflow | 32 | opus |
| 41 | B | K8 | Prüfregeln (Logikteil, formale LV-Prüfung) | `packages/kern` | 37, 29 | opus |
| 42 | B | K9 | Kopieren, Verschieben, Papierkorb als Befehle | `packages/kern` | 41, 29 | opus |
| 43 | B | S3 | Undo/Redo, LV-Stände, Befehlsprotokoll | `packages/speicher` | 38, 29 | opus |
| 44 | B | V | Zuschlagspositionen im Angebot und im Preisspiegel | `packages/vergabe` | 36, 37, 29 | opus |
| 45 | B | G3 | Import X84 → Angebot | `packages/gaeb` | 40, 29 | opus |
| 46 | B | U5a | Grid: Zeilen kopieren/einfügen, verschieben per Tastatur, löschen | `packages/ui-grid` | 33, 29 | opus |
| 47 | B | U4+U6 | Positionsdialog mit Langtext-Editor, Prüf-Panel mit Sprunglinks | `apps/web` | 39, 34, 41 | opus |
| 48 | B | U5 | Zwischenablage, Verschieben, Papierkorb, Undo/Redo und LV-Stände in der App | `apps/web` | 47, 42, 43, 46 | opus |
| 49 | B | G | GAEB-Import/-Export und X84-Import in der App (optional, wenn Zeit) | `apps/web` | 48, 40, 45 | sonnet |

Tore: nach 39 und 40 Prüfung M1 (`plan.md` §4); am Ende Prüfung M2.

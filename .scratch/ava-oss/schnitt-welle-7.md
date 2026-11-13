# Schnitt des Laufs „Welle 7“

Stand 2026-11-13, Orchestrator (`/implement-welle 7`). Integrationsbranch `integration/welle-7` (lokal) ab `4eefd7d`
(= `origin/main`, Merge von PR #12; der lokale Ref `main` ist veraltet). Umfang, Befunde und Tor E: `umfang-welle-7.md`.
Entscheidungen ab D-71 (`entscheidungen-auto.md`), Schnitt D-76. Ein Schreiber je Paket (P2), in `apps/web` je Ordner (D-20);
App-Tickets sind je Ordner gebündelt. Ticket 123 geht in 127, 131, 135, 140, 155 auf; 124 in 155 (und 148 Punkt KG-Hinweis).

| Nr | E | Titel | Paket/Ordner | Blocked by | Modell | Prio |
|---|---|---|---|---|---|---|
| 127 | E8–E10, E15, 123 | `vertrag` v1.7a | `vertrag` | – | opus | P |
| 128 | A5 | `vertrag` v1.7b Abzüge, Zahlungen | `vertrag` | 127 | opus | S |
| 129 | E5 | DA XML 3.1 lesen | `gaeb` | – | opus | P |
| 130 | E3 | `ui-grid` Arbeitsfläche | `ui-grid` | – | opus | P |
| 131 | E1, 123 | App Seitengerüst, Navigation | `ui/`, `projekt/`, `App.tsx` | – | opus | P |
| 132 | E13 | App Fehlerfestigkeit, Meldungshilfe | `fehler/`, `speicher/`, `e2e/` | – | opus | P |
| 133 | E14 | Einheitliche Sprache | `texte.ts`, Glossar | – | sonnet | P |
| 134 | E17 | Bereitstellung, Dokumente | Workflows, Doku | – | sonnet | P |
| 135 | 123 | `speicher` aufräumen | `speicher` | – | opus | P |
| 136 | E7, E10 | Dateiart, Meldungen, Bieteranschrift | `gaeb` | 129, 127 | opus | P |
| 137 | E8–E10, E15 | Kern v1.7a | `kern` (+ `kosten` falls nötig) | 127 | opus | P |
| 138 | E8, E10 | Vergabe v1.7a | `vergabe` | 127 | opus | P |
| 139 | E8, E15 | Speicher v1.7: Migration 7, Schema 7 | `speicher` | 127, 135 | opus | P |
| 140 | 123 | Fachpakete aufräumen | `ifc`, `bim`, `bauzeit`, `bauleitung`, `ui-modell` | 127 | sonnet | P |
| 141 | E11 | `ausgabe` Kernkette | `ausgabe` | 127 | opus | P |
| 142 | E3 | App Arbeitsfläche, Werkzeugleiste | `lv/`, `auftrag/`, `vergabe/`, `ui-basis` | 130, 131 | opus | P |
| 143 | A5 | `abrechnung` Abzüge, Zahlungen, Fixture | `abrechnung`, `fixtures/` | 128 | opus | S |
| 144 | E6 | GAEB 90 lesen, Formatvergleich | `gaeb`, `fixtures/gaeb-formate/` | 136 | opus | S |
| 145 | E6 | GAEB 2000 lesen | `gaeb` | 144 | opus | S |
| 146 | E7 | App Einlesen-Dialoge | `gaeb/` (+ Dialoge X31, XRechnung, IFC) | 136, 131 | opus | P |
| 147 | E2 | App Erster Start, Hilfe | `hilfe/`, `ui/`, `projekt/` | 131, 134, 130 | opus | P |
| 148 | E8, 124 | App LV-Bedienung | `lv/` | 137, 139, 142 | opus | P |
| 149 | E8, E10, E11 | App Vergabe | `vergabe/`, `gaeb/Angebote` | 137, 138, 139, 141, 142, 146 | opus | P |
| 150 | E8, E10, E15 | App Projekt, Stände, Einstellungen | `projekt/`, `historie/`, `sicherung/`, `ausgabe/` | 137, 139, 147 | opus | P |
| 151 | E9 | App Auftrag, Nachtrag | `auftrag/`, `nachtrag/` | 142 | opus | S |
| 152 | E11, A5 | App Aufmaß, Rechnung | `abrechnung/`, `rechnung/` | 141, 143, 153 | opus | P |
| 153 | E12, A5 | `ausgabe` Kosten, Zahlungsfreigabe | `ausgabe` | 141, 128 | opus | S |
| 154 | E9, E12 | App Kosten | `kosten/` | 137, 139, 153 | opus | S |
| 155 | E16, 123, 124 | App Vorschau-Module | `bauzeit/`, `bauleitung/`, `honorar/`, `bim/`, `modellvergleich/` | 131, 140 | opus | S |
| 156 | E4 | Suchen, Filter, Kontextmenü | `ui-grid`, `lv/` | 148, 130 | opus | S |
| 157 | M4 | weitere REB-Formeln | `mengen`, `gaeb`, `mengen/` | alle P/S, Tor grün | opus | K |
| 158 | – | Tor E | `e2e/`, Kettentests | alle P | opus | P |
| 159 | – | Behebung des Wellen-Reviews | je Befund | Review | opus | – |

Vor Stufe 2: Opus-Review von v1.7a gegen alle Verbraucher (wie D-66), Torvermerk im Log. Kürzungsreihenfolge bei Überlauf:
`umfang-welle-7.md` §4 (157 → K-Teile von 155/153 → 124-Teil von 155 → 153/154 → 156 → 145 → 144 → E10-Teile).

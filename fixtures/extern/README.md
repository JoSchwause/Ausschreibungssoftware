<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 Tethys AVA contributors
-->

# Dateien Dritter (`fixtures/extern/`)

Amtliche GAEB-Testdateien, unverändert und mit Herkunft (Regel C4, G-55). Sie sind **nicht** AGPL, sondern mit
`LicenseRef-BVBS-GAEB-Pruefdatei` gekennzeichnet: BVBS und GAEB nennen keine Lizenz.

## Eine Datei entfernen

1. Datei löschen (`git rm fixtures/extern/<Pfad>`).
2. Ihre Zeile in `HERKUNFT.md` löschen.
3. Tests, die die Datei lesen, anpassen oder entfernen (Suche nach dem Dateinamen).
4. Ist es die letzte Datei der Quelle: den Block in `REUSE.toml` und `LICENSES/LicenseRef-BVBS-GAEB-Pruefdatei.txt` löschen.
5. `pnpm test` und `reuse lint` laufen lassen; bei Anfrage des Rechteinhabers zusätzlich die Git-Historie bereinigen.

## Dateien

Alle Dateien: Zweck positiv, d. h. gültige Prüfdatei (keine Fehlerdateien), Herkunft siehe `HERKUNFT.md`.

| Datei (unter `bvbs/` bzw. `gaeb/`)                                  | Phase | Version | Zweck                                          |
| ------------------------------------------------------------------- | ----- | ------- | ---------------------------------------------- |
| `3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81`                  | X81   | 3.3     | positiv, AVA, Leistungsbeschreibung, groß (614 KB) |
| `3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84`                  | X84   | 3.3     | positiv, AVA, Angebotsabgabe                   |
| `3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X86`                  | X86   | 3.3     | positiv, AVA, Auftragserteilung, groß (617 KB) |
| `3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83` | X83   | 3.3     | positiv, Bauausführung, Angebotsaufforderung   |
| `3.3-bauausfuehrung/BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84` | X84 | 3.3   | positiv, Bauausführung, Angebotsabgabe         |
| `3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x31` | X31 | 3.3    | positiv, Mengenermittlung                      |
| `3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x86` | X86 | 3.3    | positiv, Mengenermittlung, Auftrag             |
| `3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x81` | X81   | 3.3     | positiv, Texterstellung                        |
| `3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x82` | X82   | 3.3     | positiv, Texterstellung, Kostenanschlag        |
| `3.1-musterdateien/Musterdatei_3.1_2008-001.X81`                    | X81   | 3.1     | positiv, groß (718 KB)                         |
| `3.1-musterdateien/Musterdatei_3.1_2008-001.X83`                    | X83   | 3.1     | positiv, groß (715 KB)                         |
| `3.1-musterdateien/Musterdatei_3.1_2008-001.X84`                    | X84   | 3.1     | positiv                                        |
| `3.1-musterdateien/Musterdatei_3.1_2008-001.X86`                    | X86   | 3.1     | positiv, groß (723 KB)                         |
| `3.1-musterdateien/Musterdatei_3.1_2008-002.X86`                    | X86   | 3.1     | positiv                                        |
| `3.1-musterdateien/Musterdatei_3.1_2008-003.X86`                    | X86   | 3.1     | positiv, sehr groß (2,8 MB)                    |
| `3.1-musterdateien/Musterdatei_3.1_2008-004.X83`                    | X83   | 3.1     | positiv                                        |
| `3.1-musterdateien/Musterdatei_3.1_2008-004.X86`                    | X86   | 3.1     | positiv                                        |

Version 3.2 ist nicht enthalten. Fehlerdateien (zehn Mini-X83) fehlen: siehe Ticket 23, Abschnitt Comments.

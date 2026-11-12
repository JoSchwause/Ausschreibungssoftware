<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 Tethys AVA contributors
-->

# Herkunft der Dateien unter `fixtures/extern/`

Regel C4, Entscheidung G-55 Nr. 1. Jede Datei unter `fixtures/extern/` steht hier genau einmal in der Tabelle. Der Test
`tools/herkunft.test.mjs` schlägt fehl, wenn eine Datei fehlt, eine Prüfsumme nicht stimmt oder irgendwo eine `.xsd`
versioniert ist.

**Lizenz und Risiko.** Alle Dateien der ersten Tabelle sind amtliche Dateien (BVBS-Prüfdateien, GAEB-Musterdateien). Die
XRechnung-Dateien stehen in einem eigenen Abschnitt weiter unten (Apache-2.0). Weder BVBS
noch GAEB nennen auf den Quellseiten eine Lizenz. Der Nutzer hat dieses Risiko für genau diese amtlichen Dateien
ausdrücklich in Kauf genommen (G-55 Nr. 1). Sie sind deshalb mit `LicenseRef-BVBS-GAEB-Pruefdatei` gekennzeichnet
(Text: `LICENSES/LicenseRef-BVBS-GAEB-Pruefdatei.txt`), **nicht** mit AGPL oder einer anderen freien Lizenz. Auf Anfrage
von BVBS oder GAEB werden sie entfernt (siehe `README.md`).

**Unverändert** heißt: Die Bytes der Datei sind gleich den Bytes der Datei in der Quell-ZIP. Nur der Dateiname im Repo
weicht ab (Leerzeichen entfernt); der Originalname steht in der Spalte „Pfad im ZIP“. Die ZIP-Prüfsumme gehört zur
heruntergeladenen Datei vom 2026-11-09.

Die beiden GAEB-ZIPs `Musterdateien_GAEB_DA_XML_3.1_20-11-2007.zip` und `Musterdateien_GAEB_DA_XML_3.1_2009-12.zip`
enthalten byte-gleiche Dateien (verglichen am 2026-11-09). Es wurde nur die Ausgabe 2009-12 übernommen.
ZIP-SHA-256 der 2007-Ausgabe: `e7908a2692cd5580899a4af1a908b98ef357e733ac718f20b1595a0ee289993a`.

Nicht übernommen: Prüfkriterien- und Muster-PDFs (reine Dokumentation), alle Schema-Dateien (`.xsd`, ADR 0010).

| Datei | Quelle (ZIP-URL) | ZIP-SHA-256 | Pfad im ZIP | Abruf | Lizenz | Unverändert | SHA-256 |
|---|---|---|---|---|---|---|---|
| `bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81` | https://www.bvbs.de/wp-content/uploads/2024/02/BVBS_Pruefdatei-GAEB-DA-XML-3.3-AVA-V-11-06-2021.X81.zip | `c7ff882d12725b7fbfe905c84f629b6ec9735d6f0f5110fa21765f4589ea6f61` | `BVBS_Pruefdatei GAEB DA XML 3.3 - AVA - V 11 06 2021.X81` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `f44a49dd24e0862c47197ad6225181fd51a0888d72f1b306d54dd010f00d759a` |
| `bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84` | https://www.bvbs.de/wp-content/uploads/2024/02/BVBS_Pruefdatei-GAEB-DA-XML-3.3-AVA-V-11-06-2021.X84.zip | `a6a899a3b09468607d45bc6ffdaf3bf346b802641442de01cc3bf8a0fbb850ae` | `BVBS_Pruefdatei GAEB DA XML 3.3 - AVA - V 11 06 2021.X84` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `926872994841c87226925b475215bfd092c9616072627ee16135933e7cc9faa7` |
| `bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X86` | https://www.bvbs.de/wp-content/uploads/2024/02/BVBS_Pruefdatei-GAEB-DA-XML-3.3-AVA-V-11-06-2021.X86.zip | `edd3b641321cc95558567cae7db9382d743dfb01aad30fde3b7ef656b2e396a8` | `BVBS_Pruefdatei GAEB DA XML 3.3 - AVA - V 11 06 2021.X86` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `7a60d33dded58b78281a3556b3e6b6e7ed54cb49589273fd84bdb27c19216657` |
| `bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83` | https://www.bvbs.de/wp-content/uploads/2024/05/Pruefdatei-GAEB-DA-XML-3.3-Bauausfuehrung-V-04-04-2024.zip | `26b669a8f09b0c4be0802c03e935015e9644a641f815aabb9db49763edffa650` | `Pruefdatei GAEB DA XML 3.3 - Bauausfuehrung - V 04 04 2024.x83` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `7c568f947f405bb88b3076d3d0b2aebe8ed56903df5b6ac180f8c7e433f886cb` |
| `bvbs/3.3-bauausfuehrung/BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84` | https://www.bvbs.de/wp-content/uploads/2024/02/BVBS_Pruefdatei-GAEB-DA-XML-3.3-Bauausfuehrung-V-11-06-2021.x84.zip | `5bdc19e189d11c81ce3fccd32f52c14a6a73f34ad81a6bce84cc13ac4362523c` | `BVBS_Pruefdatei GAEB DA XML 3.3 - Bauausfuehrung - V 11 06 2021.x84` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `a4a47a05c29191535ef165c949599299e85009bc6cc8d582734af6e0067e950f` |
| `bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x31` | https://www.bvbs.de/wp-content/uploads/2024/02/Pruefdatei-GAEB-DA-XML-3.3-Mengenermittlung-V-11-06-2021.x31.zip | `33387f6608d49b9e86627e2b1da6ea269d5062815d995275be19d52d9d72bf9d` | `Pruefdatei GAEB DA XML 3.3 - Mengenermittlung - V 11 06 2021.x31` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `a7244342a33c8efc172e27d163e554eeb67727aa8c17c837f12004828b5f6cab` |
| `bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x86` | https://www.bvbs.de/wp-content/uploads/2024/02/Pruefdatei-GAEB-DA-XML-3.3-Mengenermittlung-V-11-06-2021.x86.zip | `b6ae1a1177939364cdb92fb5e8d6bf571323ef70d7fddf2ad49793432facb2bd` | `Pruefdatei GAEB DA XML 3.3 - Mengenermittlung - V 11 06 2021.x86` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `fe20328d921dbc9e3375cc2e472c05b7e5fcc432f14d755ce8b91601f0995721` |
| `bvbs/3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x81` | https://www.bvbs.de/wp-content/uploads/2024/02/GAEB-Pruefdatei-GAEB-DA-XML-3.3-Texterstellung-V-11-06-2021.x81.zip | `e4ae78238e9d2f27d3900ec51fcd98a08b040fa423530b7953ddc54eaa7c4e2b` | `GAEB Pruefdatei GAEB DA XML 3.3 - Texterstellung V 11 06 2021.x81` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `7dcfe88751c7f8e61fe010386059022c8da0e50ba98f44ef9bc05ec15b9e9c98` |
| `bvbs/3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x82` | https://www.bvbs.de/wp-content/uploads/2024/02/GAEB-Pruefdatei-GAEB-DA-XML-3.3-Texterstellung-V-11-06-2021.x82.zip | `c43c351afaddf88d197c01d5aeb17e72b4ea2be92f8bd7fb8eb104b7517dd4ed` | `GAEB Pruefdatei GAEB DA XML 3.3 - Texterstellung V 11 06 2021.x82` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `fa7ff5efe26731eb5546bffc7f3eae5f8f638a0e7b9c4003e4bd9ca3bd5b8932` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X81` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-001.X81` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `7d085d057a42a37db4b9740fa09b83204b04698c23f432efa0f36d5f4ebcf29c` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X83` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-001.X83` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `4892c97a2a7a089b297256a61ff95d566905baeec217d72d9927a946c0d55c7d` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X84` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-001.X84` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `a9220511f9aa0c1e81a448d40077858ebeb8af3829280679ed645983649068cd` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X86` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-001.X86` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `80b5bfe3ff087859e573ffe8b452d60f512b44fec2cbe16f5886117892d6deb9` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-002.X86` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-002.X86` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `a10ad237a85313f857aa60300fddd22b611bbee7f4eec0428ad5a7a0ceb7248f` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-003.X86` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-003.X86` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `89dee863b44ed4c4a1ffacb942865e21475ae7b603549ee58e4fba4e44dfcae1` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-004.X83` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-004.X83` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `11d949a87213792b532950d7a66973d092b10aba66632bd07c0d264102b6d16b` |
| `gaeb/3.1-musterdateien/Musterdatei_3.1_2008-004.X86` | https://www.gaeb.de/wp-content/uploads/2022/11/Musterdateien_GAEB_DA_XML_3.1_2009-12.zip | `81696335235298ebe876186215f868db4cf8374c62d69400d5351e42aa172491` | `Musterdatei_3.1_2008-004.X86` | 2026-11-09 | LicenseRef-BVBS-GAEB-Pruefdatei | ja | `99fa9d3cd1cf30c273af7395f98750e65b75de25b27b79a1dc96b4d807218ca7` |

## XRechnung-Testsuite der KoSIT (Ticket 76)

Quelle: Repository `itplr-kosit/xrechnung-testsuite` der Koordinierungsstelle für IT-Standards (KoSIT), Tag
`v2026-08-31`, Commit `44c3905c69ca236aa3b94c04be1b7e9bd066ba03` (2026-09-01). **Lizenz:** Apache-2.0 laut `LICENSE` des
Repos (SHA-256 der Datei `c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4`, Text unter
`LICENSES/Apache-2.0.txt`); mit AGPL-3.0-or-later verträglich (C4, C5). Die Quelle hat keine `NOTICE`-Datei, die Dateien
tragen keinen Urhebervermerk. **Unverändert** heißt: Die Bytes sind gleich der Datei unter
`https://raw.githubusercontent.com/itplr-kosit/xrechnung-testsuite/<Commit>/<Pfad im Repo>`, abgerufen am 2026-11-11
und gegen einen Klon desselben Commits verglichen. Nur der Ordner weicht ab (flach unter `xrechnung/`).

Auswahl: je eine Rechnung in UBL und CII desselben Geschäftsfalls (01.01a), eine Schlussrechnung Bau (Rechnungsart 877)
mit Unterpositionen aus der Extension und der umfassende technische CII-Fall (BT-12, BT-13, BT-107, BT-108, BT-114,
Umsatzsteuer in zweiter Währung). Die übrigen Dateien der Testsuite sind nicht übernommen.

| Datei | Pfad im Repo | Commit | Abruf | Lizenz | Unverändert | SHA-256 |
|---|---|---|---|---|---|---|
| `xrechnung/01.01a-INVOICE_ubl.xml` | `src/test/business-cases/standard/01.01a-INVOICE_ubl.xml` | `44c3905c69ca236aa3b94c04be1b7e9bd066ba03` | 2026-11-11 | Apache-2.0 | ja | `74fb09c609d5fba15a8c543060998d3b92858f56a81fb5b0ed244d6794e498d1` |
| `xrechnung/01.01a-INVOICE_uncefact.xml` | `src/test/business-cases/standard/01.01a-INVOICE_uncefact.xml` | `44c3905c69ca236aa3b94c04be1b7e9bd066ba03` | 2026-11-11 | Apache-2.0 | ja | `727b51982a84c9b406599a7384783570910440ed405c9bb6d918b22442636886` |
| `xrechnung/04.04a-INVOICE_ubl.xml` | `src/test/business-cases/extension/04.04a-INVOICE_ubl.xml` | `44c3905c69ca236aa3b94c04be1b7e9bd066ba03` | 2026-11-11 | Apache-2.0 | ja | `275929283c921191be88f9c5fcd947432d62e57a14f692d8b9003d6debb37237` |
| `xrechnung/01.01_comprehensive_test_uncefact.xml` | `src/test/technical-cases/cius/01.01_comprehensive_test_uncefact.xml` | `44c3905c69ca236aa3b94c04be1b7e9bd066ba03` | 2026-11-11 | Apache-2.0 | ja | `655f3d18f71f672b5bd695143e9f59c439f2614ac3d4b1fbdd195993ab7c6c9a` |

## Nicht erhalten

Dateien freier Projekte (Fehlerdateien, synthetische X83/X84/X86/X89): nicht übernommen, siehe Ticket 23, Abschnitt
Comments.

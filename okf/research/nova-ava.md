---
type: Research
title: NOVA-AVA-Recherche – Status & Vorgehen
description: Stand der Reverse-Engineering-Untersuchung von NOVA AVA mittels REA (herstellerneutrale Zusammenfassung).
resource: /.scratch/nova-ava-research/spec.md
tags: [ava, research, rea]
timestamp: 2026-11-09T18:28:00Z
---
## Verifizierter Stand
- **Spezifikation**: Freigegeben und vollständig umgesetzt (Teil A + Teil B) gemäß [`.scratch/nova-ava-research/spec.md`](/.scratch/nova-ava-research/spec.md).
- **Abgrenzung & Git-Hygiene**:
  - Der detaillierte Recherchebericht (13 Dokumente) und alle 32 REA-Evidenzen (`ev_...`) liegen unter `docs/research/nova-ava/` und sind über `.gitignore` vom öffentlichen Repository ausgeschlossen.
  - Allgemeine AVA-Domänenbegriffe sind herstellerneutral in [`GLOSSARY.md`](/GLOSSARY.md) dokumentiert.
- **Fertiggestellte Berichte (`docs/research/nova-ava/`, git-ignored)**:
  - `README.md` — Berichtsindex, Systemarchitektur, Skript-Manifest (SHA-256) und vollständiges REA-Evidenz-Verzeichnis (32 `evidence_id`s)
  - `map-lv.md` — Bereichs-Map: LV und Positionen
  - `lv-deep-dive.md` — Tiefenanalyse LV (Hierarchie, OZ-Maske, alle 6 Positionsarten, mathematischer Nachweis der Rundungs-/Summenlogik, zweistufige Validierung, CRUD-Flows)
  - `map-bim.md` — Bereichs-Map: BIM-Integration (IFC-Fragment-Viewer, bidirektionale GUID-Kopplung, 3D-QTO, BCF, BIM-LV-Container)
  - `map-gaeb.md` — Bereichs-Map: GAEB-Import/-Export (GAEB 90, XML 3.2, XML 3.3, Phasen X81–X86 & X31, formale Prüfung)
  - `map-vergabe.md` — Bereichs-Map: Vergabe, E-Vergabe/Offerte, Reverse Auction und Preisspiegel (Bieter-Preismatrix, Nachlass, ABC-/Ausreißer-Wertung, Varianten, Zuschlag)
  - `map-kosten.md` — Bereichs-Map: Kostenplanung nach DIN 276-2018-12 (335 Kostengruppen), Mengenermittlung nach REB 23.003 (Formel 91/DA11), Nachträge, Aufmaßblätter, Soll/Ist und Rechnungsprüfung (inkl. E-Rechnung)
  - `upcalc-and-pricing-deep-dive.md` — Tiefenanalyse Einzelpreiskalkulation (`UpCalc`, `UpCalcSync`, `UpCalcAnalysis`), LV-/Projektvariablen (`boq_variables`), Kostenkennwerte (`boq_keyvariables`), historische Preisableitung (`pricelist`), Kostenelemente (`costelements`) und `NovaPool`
  - `hoai-and-time-deep-dive.md` — Tiefenanalyse HOAI-Honorarrechner (`HoaiCalculator`) & Honorarverträge (`HoaiCalculation`, alle 21 Leistungsbilder, Siemon/Simmendinger, RifT, DIN-276-Kostenübernahme, Variantenvergleich, Nachträge, Planerrechnungen inkl. XRechnung/ZUGFeRD, Zahlungsbuch, Controlling & Zeiterfassung `timetracking`)
  - `gantt-and-controlling-deep-dive.md` — Tiefenanalyse Bauzeitenplan (`gantt.js` + `modules.Gantt`, Arbeitszeitkalender, Vorgangs-LV-/QTO-Kopplung, Mittelabfluss-Histogramm, 4D-BIM-Simulation, MS-Project-Export), Kostenanalyse (`CostAnalysis`), Multiprojekt-Controlling (`CostControlling`) & Diagramme (`AwardDiagrams`, `CostDiagrams`)
  - `site-management-and-collaboration.md` — Tiefenanalyse Bauleitung LP 8 (2D-PDF-Pläne & Canvas-Pinning mit Lupe `issues_marker`, Mängelmanagement `Issues` + BCF + Pixie-Fotoannotation, Besprechungsprotokolle `Protocols`, Bautagebuch `diary`, Beziehungsgraph `relations`), Bieter-/Lieferantenportale (`Supplier.*` & `External.*`), DMS (`FileManager`, Catenda, Dropbox, Google Drive) & 2-Stufen-Messenger (`MessengerWatch` + `MessengerUI`)
  - `catalogs-templates-and-country-standards.md` — Tiefenanalyse Muster-LV (`mlv`), Rahmenverträge (`rlv`), Kopiervorlagen (`CopyDialog`, `ItemCopyDialog`), LV-Papierkorb (`Tender.Trash`), externe Ausschreibungstexte (`externals.js` Iframe-`postMessage`-Brücke für STLB-Bau, DBD-BIM, Heinze, Ausschreiben.de & STLB-K) sowie Länderstandards Österreich (**ÖNORM B/A 2063**) und Schweiz (**SIA 451 / CRB NPK & PRD**)
  - `architecture-and-rpc-reference.md` — Tiefenanalyse der 15 Client-Bundles, aller 65 `modules.js`-Submodule, des `Nova.AI`-Subsystems (`Context`, `Slick.GridSerializer`, `Functions`, `Tools`, `Refresh`, `Changes`), des Druck-Designers (`PrintDialog`, 18 Druckmodule), der Excel-Engine (`ExcelDialog`), der Hintergrund-Jobqueue (`JobQueue`), der Administration (`?s=admin_*`) sowie des **vollständigen Referenzkatalogs aller 88 Controller und 858 RPC-Aktionen**
  - `captures/` — Alle REA-Evidence-JSONs (`00` bis `19`), RPC-/Dialog-Kataloge und exportierte Client-Bundles

## Mögliche Folgeschritte (nächste Phasen)
1. **BIM Deep-Dive** mit eigenem Test-IFC-Modell (Detailanalyse des Fragment-Konverters und der BaseQuantities-Filter).
2. **Architekturentscheidungen (ADRs)** unter `docs/adr/` für das Design der eigenen Ausschreibungssoftware ableiten.

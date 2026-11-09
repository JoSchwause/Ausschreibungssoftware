---
type: Research Note
title: "BIM und AVA: modellbasierte Mengenermittlung, IFC und offene Werkzeuge"
description: Erklärt, wie Gebäudemodelle (BIM/IFC) mit Ausschreibung, Vergabe und Abrechnung zusammenhängen – Standards, öffentliche BIM-Pflichten, Praxis in Architekturbüros und Open-Source-Bausteine – und leitet ab, welcher BIM-Umfang für ein Open-Source-AVA realistisch ist.
resource: https://github.com/buildingSMART/IFC4.3.x-development
tags: [research, bim, ifc, mengenermittlung, open-source, oeffentliche-auftraggeber]
timestamp: 2026-11-09T17:16:17Z
sources: 42
confidence: mittel
---

# BIM und AVA: modellbasierte Mengenermittlung, IFC und offene Werkzeuge

## Kurzfassung

- **Worum es geht:** Bei „BIM2AVA" (auch: modellbasierte Ausschreibung, 5D) kommen Mengen und Bauteilinformationen aus dem digitalen Gebäudemodell statt aus Plänen. Modellelemente werden über ihre GUID mit LV-Positionen und DIN-276-Kostengruppen verknüpft. Die Bausteine dafür sind genormt: IFC-Mengensätze, GAEB-3.3-Katalogzuordnung, BIM-LV-Container. In der Praxis braucht ein LV aus dem Modell aber fast immer Nacharbeit (siehe [Schmerzpunkte](/okf/research/market/pain-points.md)).
- **IFC 4.3 ist der aktuelle Standard (ISO 16739-1:2024).** buildingSMART pflegt die Fassung als 4.3.2.x („ADD2") weiter [1][2]. In der Praxis sind IFC2x3 und IFC4 noch weit verbreitet [23]. IFC 5 ist ein Alpha-Entwurf und nicht produktionsreif [5].
- **Mengen im Modell:** IFC 4.3 definiert 115 Mengensätze (`Qto_…BaseQuantities`), z. B. für Wände Länge, Brutto-/Netto-Seitenfläche und Brutto-/Netto-Volumen [3][4]. Diese geometrischen Mengen sind **nicht** automatisch abrechnungsfähige Mengen nach VOB/C. Dort gelten je Gewerk eigene Übermessungsregeln, z. B. werden bei vielen Wandgewerken Öffnungen bis 2,5 m² nicht abgezogen (laut Sekundärquelle, siehe [HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md)).
- **Öffentliche Hand (Bund):** Laut Bundesregierung (09/2024) gilt im Bundesbau Level I mit modellbasierter Mengen- und Kostenermittlung; Level II mit dem Anwendungsfall „Leistungsverzeichnis" seit 07/2024 (ab 50 Mio. €) bzw. 13.07.2025 (Projekte nach RBBau C.6); Level III mit „Abrechnung von Bauleistungen" ab 03/2027 [9]. BIM kam 2024 aber nur in knapp 20 % der BBR-Projekte zum Einsatz [9]. Der Bund setzt ausdrücklich auf IFC und BCF [8].
- **Bundesfernstraßen:** Seit dem 27.03.2026 ist BIM dort Regelprozess für alle relevanten Projekte; Rechtsgrundlage ist laut BMV das Infrastruktur-Zukunftsgesetz [42][10]. Die Länder setzen überwiegend auf Leitfäden, Pilotprojekte und den Straßenbau; eine landesweite BIM-Pflicht im Hochbau haben wir nicht gefunden [32]. Für Kommunen gibt es keine allgemeine Pflicht.
- **Kleine Büros nutzen BIM selten:** Von den Architektur- und Planungsbüros unter 10 Personen arbeiten 70 % ohne BIM und nur 6 % regel- oder standardmäßig damit (bundesweite Kammerbefragung 2023) [34]. Wer BIM nutzt, sieht die größte Entlastung aber gerade in LPH 6–7 (51 %) [34]. Fraunhofer IRB (03/2026): 13 % der Planungsbüros nutzen BIM in allen Projekten, rund 31 % gar nicht ([Schmerzpunkte](/okf/research/market/pain-points.md)).
- **Wettbewerber:** Alle großen AVA-Programme lesen IFC, meist gegen Aufpreis (NOVA BIM-Add-on, ORCA IFC-Advanced nur in der Enterprise Edition, AVANTI BIM) – siehe [Etablierte Anbieter](/okf/research/market/established-vendors.md) und [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md).
- **Offene Bausteine sind reif genug für Import, Viewer und Prüfung:** IfcOpenShell 0.9.0 (LGPL-3.0+, inkl. ifc5d für Mengen und Kostenpläne, IfcTester für IDS) [11][12][13]; web-ifc (MPL-2.0) und That Open Components/Fragments (MIT) für den Browser [16][17]; xBIM für .NET [21]. xeokit ist AGPL-3.0 [18].
- **Einschätzung:** BIM gehört nicht in das erste Release. Das Datenmodell sollte aber von Anfang an GUID-Verknüpfungen, Katalogzuordnungen und die Herkunft jeder Menge speichern. Ein IFC-Import mit Viewer und Mengenübernahme ist mit offenen Bausteinen ein realistisches Phase-2-Ziel.

## 1. Begriffe für Nicht-Architekten

| Begriff | Erklärung | Englisch |
|---|---|---|
| **BIM** (Bauwerksinformationsmodellierung) | Arbeitsmethode: Ein Bauwerk wird als digitales Modell aus Bauteilen geplant, gebaut und betrieben. Jedes Bauteil trägt Geometrie und Eigenschaften, etwa Material, Brandschutz oder Mengen. | Building Information Modeling |
| **Fach- oder Teilmodell** | Modell einer Disziplin (Architektur, Tragwerk, Technische Gebäudeausrüstung). Für die Abstimmung werden sie zu einem Koordinationsmodell überlagert [23]. | discipline model |
| **openBIM / closedBIM** | *openBIM:* Austausch über herstellerneutrale Formate (IFC, BCF) zwischen Programmen verschiedener Hersteller. *closedBIM:* Arbeit innerhalb einer Herstellerfamilie mit eigenen Formaten und Plug-ins. Der Bundesbau verfolgt ausdrücklich offene, nichtproprietäre Formate [8]. | open/closed BIM |
| **IFC** | Industry Foundation Classes: offenes Datenmodell und Dateiformat für Bauwerksmodelle, genormt als ISO 16739-1 [2][22]. | – |
| **GUID / GlobalId** | Weltweit eindeutige Kennung jedes IFC-Objekts. Sie ist der Anker, um ein Bauteil mit einer LV-Position oder einer Kostengruppe zu verknüpfen und in neuen Modellversionen wiederzufinden. Technisch eine 128-Bit-GUID, im IFC als feste Zeichenkette aus 22 Zeichen kodiert [25]. | globally unique identifier |
| **Pset** (Eigenschaftssatz) | Gruppe von Merkmalen eines Bauteils, z. B. tragend, außenliegend, Feuerwiderstand. | property set |
| **Qto / Basismengen** | Gruppe von Mengen eines Bauteils (Länge, Fläche, Volumen, Gewicht) in einem `Qto_…`-Satz [3]. Ob Basismengen exportiert werden, legt man im Exportdialog des CAD fest [23]. | quantity set, base quantities |
| **MVD** (Model View Definition) | Festgelegte Teilmenge von IFC für einen Zweck, z. B. IFC2x3 Coordination View 2.0 oder IFC4 Reference View [23]. | model view definition |
| **IDS** | Information Delivery Specification: XML-Format, das maschinenlesbar festlegt, welche Informationen ein Modell enthalten muss, und das automatisch prüfbar ist [6]. | – |
| **BCF** | BIM Collaboration Format: Format für modellbezogene Anmerkungen und Aufgaben (Kollisionen, Rückfragen, Änderungswünsche), als Datei oder über eine Programmierschnittstelle [7][23]. | – |
| **AIA / BAP** | Auftraggeber-Informationsanforderungen und BIM-Abwicklungsplan: vertragliche Dokumente, die regeln, wer wann welche Modellinformationen liefert (Rahmen: DIN EN ISO 19650 [26]). Laut Kammerbefragung erstellen vor allem größere Büros BAP und unterstützen Auftraggeber bei der AIA [34]. | EIR / BEP |
| **LOIN** | Level of Information Need, die Informationsbedarfstiefe: wie detailliert Geometrie und Merkmale für einen bestimmten Zweck sein müssen (nach DIN EN ISO 19650-1) [8]. | level of information need |
| **CDE** | Common Data Environment, die gemeinsame Datenumgebung: zentrale Projektplattform, über die alle Beteiligten Modelle und Dokumente austauschen [8]. | common data environment |
| **Anwendungsfall (AwF)** | Festgelegter Zweck der BIM-Nutzung im Projekt, z. B. AwF 100 „Mengen- und Kostenermittlung" oder AwF 110 „Leistungsverzeichnis" [8][9]. | BIM use case |
| **4D / 5D** | 3D-Modell plus Zeit (4D, Terminplan) bzw. plus Kosten (5D). | 4D/5D BIM |
| **BIM2AVA** | Sammelbegriff für den Weg vom Modell zu LV und Kostenplanung. G&W nutzt ihn auch als Modulnamen in CaliforniaX ([Etablierte Anbieter](/okf/research/market/established-vendors.md)). | model-based tendering |
| **BIM-LV-Container** | Komprimierter Container mit IFC-Modell, GAEB-LV, Linkmodell und Metadaten nach DIN 18290-2 [24]. | – |
| **Übermessen** | Regel aus VOB/C Abschnitt 5: Kleine Öffnungen werden bei der Abrechnung nicht abgezogen. Details in [HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md). | – |

## 2. IFC: Versionen und Stand 2026

| IFC-Version | ISO-Bezug | Inhaltlicher Schwerpunkt | Verbreitung / Bedeutung für AVA |
|---|---|---|---|
| **IFC2x3** (TC1) | (keine aktuelle ISO-Fassung) | Hochbau; wichtigste MVD: Coordination View 2.0 | Laut Bundesbau-Arbeitshilfe (07/2023) die am häufigsten genutzte MVD, von den meisten BIM-Programmen unterstützt [23]. Jede AVA-Software muss sie noch lesen können. |
| **IFC4** (ADD2 TC1) | ISO 16739-1:2018; deutsche Fassung DIN EN ISO 16739-1:2021-11 [22] | Trennung in Reference View (Koordination) und Design Transfer View (Weiterbearbeitung) [23] | 2023 laut Bundesbau noch weniger verbreitet als IFC2x3 [23]. |
| **IFC 4.3** (ADD2, Versionskennung 4.3.2.x) | **ISO 16739-1:2024**, deutsch **DIN EN ISO 16739-1:2024-09** [2][22] | Erweiterung um Infrastruktur: Straße, Schiene, Brücke, Häfen und Wasserwege [22][23] | Aktueller Standard. buildingSMART sammelt im Repository weiter kleinere Korrekturen; formale Releases stehen unter CC BY-ND 4.0 [1]. NOVA liest IFC 4.3 seit 10/2026 ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)). |
| **IFC 5** („IFCX") | – | Neuentwurf; Schema in TypeSpec, JSON-Schema über ifcx.dev [5] | Nur **Alpha-Beispiele**. buildingSMART weist ausdrücklich auf unvollständige Features und Schemaänderungen hin; nicht für den Produktiveinsatz [5]. |

**Folgerungen (Einschätzung):**
- Ein Importer muss **IFC2x3, IFC4 und IFC 4.3 parallel** lesen. Das leisten die offenen Bibliotheken in Abschnitt 10 bereits.
- IFC 5 sollte man beobachten, aber nicht darauf bauen.
- Die Lizenz CC BY-ND 4.0 betrifft die Spezifikationsdokumente. Das Format zu implementieren ist üblich und wird von LGPL- und MPL-Bibliotheken seit Jahren getan. Ob Schemadateien in einem eigenen Repository mitgeliefert werden dürfen, ist wie bei GAEB vorab zu prüfen ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)).

## 3. Mengen im IFC-Modell: Qto-Sets und ihre Grenzen

**Was IFC an Mengen mitbringt:** IFC 4.3 definiert in der Dokumentation 115 Mengensätze, alphabetisch von `Qto_ActuatorBaseQuantities` bis `Qto_WindowBaseQuantities`, darunter auch solche für Haustechnik und Infrastruktur [4]. Für die Ausschreibung im Hochbau sind vor allem diese wichtig (Stand IFC 4.3 [3][4]):

| Mengensatz | gilt für | Mengen (Typ) | Hinweise aus der Spezifikation |
|---|---|---|---|
| `Qto_WallBaseQuantities` | Wände (`IfcWall`) | Length, Width, Height (Länge); GrossFootprintArea, NetFootprintArea, GrossSideArea, NetSideArea (Fläche); GrossVolume, NetVolume (Volumen); GrossWeight, NetWeight (Gewicht) | Länge entlang der Mittellinie; NetVolume nach Abzug der Öffnungen und unter Berücksichtigung der Wandanschlüsse; Höhe und Breite nur, wenn konstant [4] |
| `Qto_SlabBaseQuantities` | Decken/Platten (`IfcSlab`) | Width, Length, Depth, Perimeter; GrossArea, NetArea; GrossVolume, NetVolume; GrossWeight, NetWeight | NetVolume: Öffnungen und Aussparungen werden abgezogen, Vorsprünge addiert; Flächen und Umfang nur bei prismatischen Platten [4] |
| `Qto_SpaceBaseQuantities` | Räume (`IfcSpace`) | Height, FinishCeilingHeight, FinishFloorHeight, GrossPerimeter, NetPerimeter; Gross/NetFloorArea, Gross/NetWallArea, Gross/NetCeilingArea; GrossVolume, NetVolume | Grundlage für raumweise Mengen wie Bodenbelag, Putz oder Anstrich [3] |
| `Qto_DoorBaseQuantities` | Türen (`IfcDoor`) | Width, Height, Perimeter, Area | – [3] |
| `Qto_WindowBaseQuantities` | Fenster (`IfcWindow`) | Width, Height, Perimeter, Area | Fläche = Außenmaß der Zarge; Breite und Höhe nur bei rechteckigen Fenstern [4] |

**Warum diese Mengen nicht einfach ins LV übernommen werden können:**

1. **Brutto/Netto ist nicht VOB-Logik.** Die IFC-Nettomengen ziehen *alle* Öffnungen geometrisch ab [4]. VOB/C Abschnitt 5 schreibt dagegen je Gewerk Übermessungsregeln vor: Bei vielen Wandgewerken werden Öffnungen bis 2,5 m² nicht abgezogen (laut Sekundärquelle, siehe [HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md)). Eine AVA-Software muss die VOB-Menge also selbst ableiten oder das CAD muss sie liefern. ORCA bietet in der Enterprise Edition deshalb wahlweise Brutto-, Netto- oder VOB-Maße an ([Etablierte Anbieter](/okf/research/market/established-vendors.md)).
2. **Basismengen sind optional und herstellerabhängig.** Ob und wie Basismengen exportiert werden, stellt man im Exportdialog des CAD ein [23]. Die IFC-Schnittstellen der CAD-Hersteller unterscheiden sich laut Bundesbau-Arbeitshilfe erheblich [23], und die Spezifikation beschreibt die Mengen nur knapp (z. B. Wandlänge „entlang der Mittellinie") [4]. *Einschätzung:* Zwei CAD-Programme können für dieselbe Wand deshalb unterschiedliche Werte liefern.
3. **Viele Teilmengen hängen an Bedingungen.** Höhe, Breite, Länge oder Umfang werden nur bei konstanten Maßen oder prismatischen bzw. rechteckigen Bauteilen geliefert [4]. Bei schrägen Wänden oder freien Formen fehlen sie also gerade dort, wo man sie bräuchte.
4. **Das LV braucht mehr als das Modell.** Baustelleneinrichtung, Schutzmaßnahmen, Zulagen, Stundenlohnarbeiten oder Entsorgung sind normalerweise nicht modelliert (Einschätzung). Ein LV entsteht deshalb nie vollständig aus dem Modell.
5. **Einheiten und Rundung:** NOVA rundet IFC-Werte auf drei Nachkommastellen und rechnet Einheiten nicht um; Millimeter bleiben also Millimeter ([NOVA API](/okf/research/nova-ava/api-and-data-model.md)). Ein eigener Import sollte die Projekteinheiten des IFC-Modells auswerten.

**Zwei Architekturen für Mengen (Einschätzung):**
- **A. Mengen aus dem Modell übernehmen:** Die AVA-Software liest die exportierten Basismengen und rechnet mit ihnen weiter. Das ist einfach und schnell, die Qualität hängt aber voll am CAD-Export. NOVA arbeitet so; ein Tester kritisierte, das CAD werde dadurch zum „reinen Volumen-Container" ([NOVA Nutzerstimmen](/okf/research/nova-ava/user-feedback.md)).
- **B. Mengen selbst aus der Geometrie berechnen:** Die AVA-Software berechnet Flächen und Volumen mit einer Geometrie-Engine und kann dabei eigene Regeln anwenden, etwa Übermessungsregeln. Das ist robuster, aber deutlich aufwendiger. Mit IfcOpenShell/ifc5d gibt es dafür einen offenen Baustein (Abschnitt 10) [13].

## 4. Verknüpfung Modell ↔ LV ↔ Kosten: Klassifikation, GAEB und BIM-LV-Container

Damit „Mengen aus dem Modell" im LV ankommen, braucht es eine dauerhafte Verbindung zwischen Bauteil, Position und Kostengruppe. Dafür gibt es vier Ebenen:

| Ebene | Mechanismus | Wofür im AVA-Prozess | Quelle |
|---|---|---|---|
| **Identität** | Jedes IFC-Objekt hat eine `GlobalId`: eine 128-Bit-GUID, als feste 22-Zeichen-Zeichenkette kodiert | Bauteil in einer neuen Modellversion wiedererkennen; Änderungen (neu, gelöscht, geändert) bis ins LV verfolgen | [25] |
| **Klassifikation im Modell** | `IfcClassificationReference` (Schlüssel, Name, optional URI), über `IfcRelAssociatesClassification` an Bauteile oder Bauteiltypen gehängt. Eine „leichte" Variante speichert nur den Schlüssel, eine „volle" die ganze Hierarchie. | Bauteile einer DIN-276-Kostengruppe, einem Leistungsbereich oder einem STLB-Bau-Schlüssel zuordnen | [25] |
| **Kosten im Modell** | `IfcCostSchedule` (Typen u. a. COSTPLAN, ESTIMATE, TENDER, UNPRICEDBILLOFQUANTITIES, PRICEDBILLOFQUANTITIES, SCHEDULEOFRATES) mit `IfcCostItem`. Ein Kostenelement trägt Einheitspreise (`CostValues`) und Mengen (`CostQuantities`), die auch aus Bauteilmengen stammen können. Zuordnung von Bauteilen über die Kontrollbeziehung `IfcRelAssignsToControl`. | LV oder Kostenplan *im* IFC speichern. Das ist der openBIM-Weg ohne GAEB; Bonsai/ifc5d nutzen ihn (Abschnitt 10). | [25][13] |
| **Verknüpfung im LV** | GAEB DA XML 3.3: Katalog vom Typ „BIM" in `BoQInfo/Ctlg`; Positionen und Mengensplits verweisen per `CtlgAssign` auf Bauteil-GUIDs | LV-Position ↔ Bauteile; Mengensplit je Bauteil | [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) |
| **Container** | **DIN 18290-2:2023-11 BIM-LV-Container:** IFC-Modell (DIN EN ISO 16739-1) + LV (GAEB DA XML 3.3) + Linkmodell + Metadaten je Austauschphase, als komprimiertes Archiv | LV mit Modellbezug an Bieter, Fachplaner oder Bauherrn geben | [24][23] |

**DIN 18290 im Überblick (alle Teile Ausgabe 2023-11)** [26]:

| Teil | Inhalt | Bezug zur AVA |
|---|---|---|
| 18290-1 | Multimodell-Container: mehrere verlinkte Fachmodelle | Grundlage der anderen Teile |
| 18290-2 | **BIM-LV-Container**: Modell + Leistungsverzeichnis | LPH 6–7 (Ausschreibung, Vergabe) |
| 18290-3 | **BIM-Kosten-Container**: Modell + Kostenermittlung | Kostenplanung nach DIN 276 |
| 18290-4 | **BIM-Abrechnungs-Container**: Modell + rechnungsbegründende Unterlagen | LPH 8 (Aufmaß, Rechnung) |

- DIN 18290-1/-2 ersetzen die zurückgezogene **DIN SPEC 91350:2016-11**. Wichtigste Änderung: Anpassung an GAEB DA XML 3.3 [24]. Teil 2 hat 8 Seiten und kostet 41,78 € netto als PDF (Stand 11/2026) [24].
- NOVA nennt auf der Add-on-Seite noch DIN SPEC 91350, ORCA ebenso in seiner FAQ; G&W nennt für CaliforniaX V26 bereits DIN 18290. Das NOVA-Handbuch nennt nur das Dateiformat `.mmc` („Multimodell-Container“), keine Norm. Welche Container-Fassung NOVA und ORCA tatsächlich schreiben, ist öffentlich nicht dokumentiert (widersprüchlich - siehe Offene Fragen) ([Etablierte Anbieter](/okf/research/market/established-vendors.md), [NOVA Produkt](/okf/research/nova-ava/product-and-pricing.md), [NOVA API](/okf/research/nova-ava/api-and-data-model.md)).
- Ob die Container-Formate tatsächlich zwischen Programmen verschiedener Hersteller funktionieren, ist öffentlich kaum belegt. Es gibt dafür keine BVBS-Zertifizierung wie für GAEB (Einschätzung; siehe Offene Fragen).

**STLB-Bau als BIM-Klassifikation (DIN SPEC 91400):**
- DIN SPEC 91400 legte ein Klassifikations- und Beschreibungssystem fest. Damit sollten Modellbauteile so mit Merkmalen befüllt werden, dass sie zu STLB-Bau-Positionen passen. Die Spezifikation orientiert sich an IFC (ISO 16739) [27].
- Fassungen: 2015-01, ersetzt durch 2017-02. **Auch die Fassung 2017-02 ist inzwischen zurückgezogen.** Sie war kostenlos (16 Seiten), dazu gab es einen IfcXML-Katalog im DIN-Bauportal [27].
- Die Praxis läuft heute über die kommerzielle **DIN BIM Cloud** und **DBD-BIM**. Jedes Bauteil hat einen eindeutigen „DBD-BIMKey" und ist mit STLB-Bau-kompatiblen Leistungen und DIN-276-Kostengruppen verbunden. Plug-ins gibt es für Revit und Archicad; laut DBD ist DBD-BIM in über 24 Programmen nutzbar, darunter NOVA, ORCA, CaliforniaX, AVANTI und iTWO [28]. Lizenzen: siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md).
- *Einschätzung:* Für ein Open-Source-AVA ist DBD-BIM nur als optionale, vom Nutzer lizenzierte Anbindung denkbar. Die offene Alternative ist eine eigene Zuordnung über `IfcClassificationReference` (z. B. DIN-276-Kostengruppe) plus Filterregeln.

## 5. Modellbasierte Mengenermittlung und Ausschreibung (BIM2AVA): der Ablauf

Der folgende Ablauf fasst zusammen, wie die Anwendungsfälle des Masterplans [8], die Bundesbau-Arbeitshilfe [23] und die dokumentierten Produkt-Workflows (v. a. NOVA, siehe [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)) zusammenpassen. Die Reihenfolge ist eine *Einschätzung* aus diesen Quellen, kein normierter Prozess.

1. **Mit Ausschreibungsabsicht modellieren.** Bauteile brauchen die richtige IFC-Klasse und den passenden `PredefinedType`, Materialschichten und Merkmale. Was genau geliefert werden muss, regeln AIA bzw. IDS. Ein Vectorworks-Berater nennt als Voraussetzungen „intelligente" Objekte, Common Psets, Basismengen und Einstellungen für mehrschichtige Bauteile ([Schmerzpunkte](/okf/research/market/pain-points.md)).
2. **IFC exportieren**, je nach Empfänger als IFC2x3, IFC4 oder IFC 4.3. Im Übersetzer des CAD werden die Klassenzuordnung, die Eigenschaftssätze und die Basismengen eingestellt [23].
3. **Importieren und prüfen** in der AVA-Software: Modell im Viewer ansehen, gegen eine IDS prüfen, Plausibilität kontrollieren (fehlende Mengen, falsche Klassen, Einheiten). NOVA prüft IDS-Regeln über den Dienst BIM.permit; ORCA bietet in der Enterprise Edition eine IFC-Diagnose ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md), [Etablierte Anbieter](/okf/research/market/established-vendors.md)).
4. **Kosten planen am Modell** (Kostenschätzung und -berechnung nach DIN 276): Bauteile oder Bauteiltypen werden Kostengruppen bzw. Kostenelementen zugeordnet, z. B. über DBD-BIM-Elemente oder eigene Kennwerte ([DIN 276](/okf/research/standards/din-276-cost-planning.md)) [28].
5. **LV-Positionen per Filter füllen:** Eine Regel wählt Bauteile aus, etwa alle Innenwände mit Material Kalksandstein und Dicke 17,5 cm. Die Positionsmenge ergibt sich aus einer Mengeneigenschaft (z. B. `NetSideArea`) oder einer Formel. Dabei muss die VOB-Übermessung berücksichtigt werden (Abschnitt 3).
6. **LV vervollständigen:** Texte aus Textquellen ergänzen ([Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md)), dazu nicht modellierte Positionen wie Baustelleneinrichtung, Zulagen oder Stundenlohnarbeiten.
7. **Versenden:** klassisch als GAEB X83 mit festen Mengen, mit Modellbezug als BIM-LV-Container (DIN 18290-2) oder über ein Portal mit Bieter-Viewer, wie NOVA es anbietet [24].
8. **Modelländerungen nachführen:** Eine neue Modellversion wird über die GUIDs abgeglichen. Geänderte Mengen werden markiert und fließen in die LV-Fortschreibung bzw. Nachtragsprüfung ein. NOVA erkennt Bauteile über die GUID wieder und bietet einen Modellvergleich ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)).
9. **Abrechnung (LPH 8):** Das Modell wird mit der tatsächlichen Ausführung abgeglichen. Mengen lassen sich nur übernehmen, soweit die Ausführung dem Modell entspricht (DIN 18299, Fassung 2023). Im Bundesbau ist das erst Level III (AwF 160) [9]. *Einschätzung:* In der Praxis bleibt das Aufmaß nach REB/X31 der Normalfall ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)).

**Typische Stolpersteine (aus den Quellen):**

| Problem | Beleg |
|---|---|
| Fenster- und Türattribute fehlerhaft übergeben; ein vollautomatisches LV ohne Nacharbeit war nicht möglich (Archicad → ORCA/iTWO, HTWK Leipzig 2016) | [Schmerzpunkte](/okf/research/market/pain-points.md) |
| Die IFC-Schnittstellen der CAD-Hersteller unterscheiden sich stark darin, welche Klassen, Typen, Einheiten und Beziehungen sie unterstützen | [23] |
| Basismengen sind optional und von den Exporteinstellungen abhängig | [23] |
| Geometrische Nettomengen entsprechen nicht den VOB-Abrechnungsregeln | Abschnitt 3; [HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md) |
| Modellqualität und Disziplin im Büro entscheiden mehr als die Software; Kritik am CAD als „Volumen-Container" | [NOVA Nutzerstimmen](/okf/research/nova-ava/user-feedback.md) |
| Viele BIM-AVA-Schnittstellen gelten selbst in herstellernaher Presse als fehleranfällig | [Schmerzpunkte](/okf/research/market/pain-points.md) |

## 6. Normen und Richtlinien im Überblick

Stand der deutschen Ausgaben laut DIN-Media-Sammlung „BIM-Normen online" (Stand 2026-08) [26], ergänzt um buildingSMART-Standards:

| Norm / Standard | Ausgabe | Inhalt in einem Satz | AVA-Relevanz |
|---|---|---|---|
| DIN EN ISO 16739-1 | 2024-09 (ISO 16739-1:2024 = IFC 4.3) | IFC-Datenschema; ersetzt 2021-11 (IFC4); neu sind Infrastruktur, Trassierung und Geometrie entlang von Achsen; 16 Seiten, Schema selbst in Anhängen bzw. online [22] | **hoch** (Importformat) |
| DIN EN ISO 19650-1 bis -6 | -1/-2: 2019-08; -3: 2021-03; -4: 2023-06; -5: 2021-03; -6: 2025-10; Entwurf einer Neufassung von Teil 1: 2026-04 [26] | Informationsmanagement mit BIM: Begriffe, Planungs-/Bauphase, Betrieb, Informationsaustausch, Sicherheit, Arbeitsschutz | mittel (Rahmen für AIA/BAP und CDE) |
| DIN EN ISO 7817 (Entwurf 2023-09) | Entwurf [26] | Informationsbedarfstiefe (LOIN): Konzepte und Grundsätze | gering bis mittel |
| DIN 18290-1 bis -4 | 2023-11 [26] | Multimodell-, BIM-LV-, BIM-Kosten- und BIM-Abrechnungs-Container | **hoch**, falls BIM-LV-Austausch gefordert |
| DIN EN ISO 21597-1/-2 | 2021-07 [26] | Container für verlinkte Dokumente (ICDD) | gering (Einschätzung: verwandtes Containerprinzip) |
| DIN EN ISO 23386 / 23387 | 2020-11 / 2026-01 [26] | Merkmale und Datenvorlagen in verbundenen Datenkatalogen | gering |
| DIN EN ISO 12006-2/-3 | 2020-07 / 2022-10 [26] | Rahmen für Klassifikationssysteme bzw. Objektkataloge | gering |
| DIN SPEC 91391-1/-2 | 2019-04 [26] | Gemeinsame Datenumgebungen (CDE) unterschiedlicher Hersteller | gering |
| DIN SPEC 91400 | 2017-02, **zurückgezogen** [27] | BIM-Klassifikation nach STLB-Bau | historisch |
| DIN SPEC 91350 | 2016-11, **zurückgezogen**, ersetzt durch DIN 18290-1/-2 [24] | Vorläufer des BIM-LV-Containers | historisch, aber noch in Produkten genannt |
| DIN 18299 (VOB/C) | 2023 | Öffnungsklausel: Leistung aus Zeichnungen **oder Modellen** ermitteln, soweit die Ausführung ihnen entspricht | **hoch** für modellbasierte Abrechnung → [HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md) |
| GAEB DA XML 3.3 | 2021-05 / 2023-01 | GUID- und Katalogzuordnung für BIM | **hoch** → [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) |
| IDS (buildingSMART) | Version 1.0, als Standard anerkannt im Juni 2024 [6][29] | Maschinenlesbare Informationsanforderungen an IFC-Modelle; automatisch prüfbar | mittel (Eingangsprüfung von Modellen) |
| BCF (buildingSMART) | BCF-XML 3.0 und BCF-API [7] | Modellbezogene Tickets und Anmerkungen | gering bis mittel (Rückfragen an Planer, Mängel) |
| VDI 2552 (Richtlinienreihe) | – | BIM-Begriffe, Rollen, Prozesse; der Masterplan stützt die Bundesbau-Rollen auf VDI 2552 [8] | gering |

*Hinweis:* Die DIN-Texte sind kostenpflichtig und urheberrechtlich geschützt. Die buildingSMART-Standards IFC, IDS und BCF sind frei verfügbar und auf GitHub dokumentiert [1][6][7].

## 7. BIM-Anforderungen der öffentlichen Hand in Deutschland (Stand 11/2026)

### 7.1 Rechtsrahmen im Vergaberecht

- **§ 12 Abs. 2 VgV:** Bei Bauleistungen und Wettbewerben oberhalb der EU-Schwellenwerte *darf* der öffentliche Auftraggeber verlangen, dass Bieter elektronische Mittel für die Bauwerksdatenmodellierung (BIM) nutzen. Sind diese Werkzeuge nicht allgemein verfügbar, muss er einen alternativen Zugang anbieten (Abs. 1) [30].
- Das ist eine **Kann-Regelung**, keine allgemeine BIM-Pflicht. Pflichten entstehen erst durch Verwaltungsvorgaben des jeweiligen Auftraggebers (Bund, Land, Kommune) und durch die Vertragsunterlagen (AIA, BAP) [8][23]. Zur Einordnung der Vergabearten siehe [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md).
- **Abrechnung:** Seit 2023 erlaubt DIN 18299 (VOB/C), Leistungen aus Modellen zu ermitteln, soweit die Ausführung ihnen entspricht ([HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md)).

### 7.2 Bundesbau: Masterplan BIM für Bundesbauten

Der **Masterplan BIM für Bundesbauten** (Erläuterungsbericht, BMI, 2021) führt BIM in drei Stufen („Level") mit festgelegten Anwendungsfällen (AwF) ein. Er gilt für Neu-, Um- und Erweiterungsbauten ab 0,5 Mio. € Projektvolumen (Bagatellgrenze) [8]. Die Bundesregierung beschrieb 2024 einen leicht geänderten Zeitplan nach der **Umsetzungsstrategie vom März 2023** [9]. Beide Stände nebeneinander:

| Level | AVA-relevante Anwendungsfälle | Masterplan 2021 [8] | Umsetzungsstrategie laut Bundesregierung (09/2024) [9] |
|---|---|---|---|
| **I** | AwF 100 **Mengen- und Kostenermittlung** (laut 2024er-Liste bereits in Level I), dazu u. a. Bestandsmodell, Bedarfsplanung, Koordination, Planableitung | ab Ende 2022 für alle neu zu planenden Bundesbauten (9 AwF; AwF 100 dort erst in Level II) | im Einsatz; 2024 bei zivilen Projekten der BImA nach RBBau Abschnitt C.6 |
| **II** | AwF 110 **Leistungsverzeichnis** (LV-Positionen aus modellbasierten Mengen), AwF 150 Änderungs- und Nachtragsmanagement, AwF 170 Abnahme- und Mängelmanagement | ab 2023 bei sehr großen Maßnahmen (ab 50 Mio. €), ab 2025 für alle ab 0,5 Mio. € | ab **07/2024** für sehr große Maßnahmen, ab **13.07.2025** für Projekte nach C.6 |
| **III** | AwF 160 **Abrechnung von Bauleistungen** (Abschlags- und Schlussrechnungen aus Modellmengen), dazu Genehmigung, Logistik, Nachweise | ab 2025 bei sehr großen Maßnahmen, ab 2027 für alle ab 0,5 Mio. € | ab **07/2025** für sehr große Maßnahmen, ab **03/2027** für Projekte nach C.6 |

**Wichtige Details:**
- **Wie der Masterplan die AVA-Anwendungsfälle beschreibt** [8]:
  - AwF 100: Mengen werden *regelbasiert* aus Geometrie und Attributen abgeleitet. Die nötige Genauigkeit richtet sich nach der Leistungsphase.
  - AwF 110: LV-Positionen werden aus diesen Mengen abgeleitet.
  - AwF 160: Abschlags- und Schlussrechnungen werden mit Modellmengen erstellt bzw. geprüft.
- **Offene Formate:** Der Bundesbau will ausdrücklich offene Standards und nichtproprietäre Formate wie **IFC und BCF** nutzen [8]. Die Arbeitshilfe Datenaustausch nennt außerdem **GAEB DA XML 3.3** und den **BIM-LV-Container nach DIN 18290** als neutrale Formate [23].
- **Kritik an fehlender Verbindlichkeit:** buildingSMART Deutschland forderte im März 2026 im Lobbyregister, die Masterpläne für Bundesbauten und Fernstraßen um *verbindliche* openBIM-Anforderungen zu ergänzen [31]. *Einschätzung:* Offene Formate sind also Zielbild, aber noch keine harte Vorgabe.
- **Tatsächliche Nutzung:** 2024 kam BIM nach Level I–III in knapp 20 % der Bauprojekte des BBR zum Einsatz. Ob BIM eingesetzt wird, prüft das BBR zu Beginn jedes Projekts [9].
- **Evaluation:** Für 2026/2027 ließ sich kein amtlich veröffentlichter neuer Stand finden; siehe Offene Fragen.

### 7.3 Bundesfernstraßen, Länder und Kommunen

| Bereich | Stand | Quelle |
|---|---|---|
| **Bundesfernstraßen** | BIM ist „ab sofort" Regelprozess für alle relevanten Projekte (Pressemitteilung BMV vom 27.03.2026, Dialogforum mit Autobahn GmbH und DEGES, über 1.000 Teilnehmende); Rechtsgrundlage laut BMV: Infrastruktur-Zukunftsgesetz [42]. Laut Fachblog dient ein BIM-Leistungskatalog (seit Frühjahr 2024) als Grundlage für Ausschreibung und Abrechnung von BIM-Leistungen [10]. | [42][10] |
| **Baden-Württemberg** | BIM-Leitfaden 2021; Pflicht im Bundesauftrag (Straßenbau) ab 2025, für Landesprojekte ab 2027 | [32] |
| **Bayern** | Schrittweise Einführung, Leitfäden für Hoch- und Straßenbau (2022), Leitstelle ZBIM in der Landesbaudirektion | [32] |
| **Hamburg** | Zentrale Koordination über BIM.Hamburg mit sechs BIM-Leitstellen, Pilotprojekte | [32] |
| **Nordrhein-Westfalen** | Handlungsempfehlungen für Kommunen (2. Fassung 2023); Machbarkeitsstudie zur BIM-basierten Baugenehmigung (04/2026, 9 Pilotprojekte in 8 Kommunen) mit späterer Übernahme der Informationsstrukturen in Ausschreibung und Mengenermittlung | [32][10] |
| **Sachsen-Anhalt** | Strategie „Digital 2030": BIM soll bis 2030 Standard im Landesstraßenbau werden | [32] |
| **übrige Länder** | überwiegend Pilotprojekte, Kompetenzstellen oder Schwerpunkt Straßenbau; keine landesweite Pflicht im Hochbau gefunden | [32] |
| **Kommunen** | keine allgemeine Pflicht gefunden; Entscheidung je Projekt (Einschätzung) | – |

- **BIM Deutschland** ist das Zentrum des Bundes für die Digitalisierung des Bauwesens. Es hat das **BIM-Portal des Bundes** aufgebaut, das am 11.10.2022 freigeschaltet wurde. Das Portal bietet Informationen, Anwendungen und standardisierte, herstellerneutrale Bauteildaten und ist kostenlos [33].
- *Einschätzung für den Architekten-Freund:* Bei Landes- und Kommunalaufträgen eines kleinen Büros ist BIM heute meist **optional**. Eine modellbasierte Ausschreibung (AwF 110) wird vor allem bei Bundesbauten und großen Projekten verlangt. Die Nachfrage dürfte aber über Bundesprojekte und Landesstrategien wachsen.

## 8. Wie Architekturbüros es tatsächlich machen

### 8.1 Verbreitung nach Bürogröße

Die belastbarsten Zahlen stammen aus der bundesweiten **Berufspolitischen Befragung 2023 der Architektenkammern**, Teil 7 BIM. Befragt wurden Kammermitglieder, 15.659 haben geantwortet (Rücklaufquote 17,4 %) [34]:

| Bürogröße (nur Architektur-/Planungsbüros) | kein BIM | Einführung wird erwogen | wird eingeführt / seit Kurzem | regel- oder standardmäßig |
|---|---|---|---|---|
| unter 10 Personen | **70 %** | 13 % | 11 % | **6 %** |
| 10–24 Personen | 34 % | 22 % | 34 % | 10 % |
| 25–49 Personen | 15 % | 14 % | 46 % | 25 % (Text: 26 %) |
| 50–249 Personen | 6 % | 9 % | 41 % | 44 % |
| 250 und mehr Personen | – | – | – | 65 % |

Weitere Ergebnisse dieser Befragung [34]:
- Der Anteil der Architektur- und Planungsbüros mit intensiver BIM-Nutzung stieg von 2021 bis 2023 nur leicht, von 8 % auf 12 %.
- Wer BIM nutzt, gibt damit meist auch **Kosten- und Mengenlisten** aus: in jedem zweiten Büro bis 50 Personen, in rund zwei Dritteln der größeren Büros.
- **Für die AVA besonders wichtig:** Den größten Entlastungseffekt sehen BIM-Nutzer in den **LPH 6–7** (51 %), danach LPH 8 (33 %) und LPH 5 (32 %). Für LPH 1–3 meinen dagegen 65 %, BIM *erhöhe* den Aufwand.
- Kleine Büros begründen den Verzicht häufiger mit fehlendem Mehrwert für ihre Tätigkeitsfelder.

Neuere Zahlen bestätigen das Bild:
- Fraunhofer IRB (03/2026): 13 % der Planungsbüros nutzen BIM in allen Projekten, rund 31 % gar nicht ([Schmerzpunkte](/okf/research/market/pain-points.md)).
- BauInfoConsult „BIM Monitor 2025" (500 Telefoninterviews mit Architekturbüros und Firmen): Im Schnitt ist jedes siebte Projekt der Architekturbüros ein BIM-Projekt. Für 2027 erwartet die Studie 58 % BIM-Nutzer unter Architekten; diese Zahl schließt Planungen noch nicht nutzender Büros ein [35].

*Einschätzung:* Ein typisches kleines Büro (unter 10 Personen) arbeitet heute meist **ohne** modellbasierte AVA. Mengen kommen dort aus Plänen, CAD-Listen oder Excel. BIM-Unterstützung ist für diese Zielgruppe ein „Später", aber ein wachsendes.

### 8.2 Wege vom CAD in die AVA

| Weg | Beschreibung | Beispiele (Details in den verlinkten Notizen) |
|---|---|---|
| **A. openBIM über IFC** | CAD exportiert IFC, die AVA-Software importiert Bauteile, Merkmale und Mengen | NOVA mit Workflows für Allplan, Archicad und Vectorworks; ORCA IFC-Basic/-Advanced; G&W BIM2AVA; AVANTI (IFC2x3/IFC4); BKI IFC-Mengenermittler ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md), [Etablierte Anbieter](/okf/research/market/established-vendors.md), [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md), [DIN 276](/okf/research/standards/din-276-cost-planning.md)) |
| **B. CAD-Plug-in mit Bauteilkatalog** | Bauteile werden schon im CAD mit Kosten- und Leistungsschlüsseln versehen und dann übergeben | DBD-BIM mit Plug-ins für Revit und Archicad sowie DBD-BIMKey [28]; laut [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) seit 02.11.2026 auch Vectorworks; AVANTI-Plug-in für Revit |
| **C. closedBIM in einer Herstellerfamilie** | CAD, Kosten und AVA vom selben Anbieter mit nativen Formaten | RIB iTWO 5D; NEVARIS (Nemetschek) mit BIM-Modul und Design2Cost ([Etablierte Anbieter](/okf/research/market/established-vendors.md)) |
| **D. Listen statt Modell** | Raum- und Bauteillisten aus dem CAD per Excel/CSV in die AVA oder von Hand übertragen | verbreitet, aber kaum dokumentiert (Einschätzung; die Befragung belegt nur „Kosten- und Mengenlisten" als BIM-Nutzung [34]) |

*Einschätzung:* Für ein Open-Source-Werkzeug passen **A** (IFC-Import) und **D** (CSV/Excel-Import mit GUID- oder Raumbezug) am besten. B setzt kommerzielle Kataloge voraus, C widerspricht dem offenen Ansatz.

## 9. Was NOVA und die etablierten Anbieter bieten (Kurzüberblick)

Nur eine Zusammenfassung; Belege und Details stehen in den verlinkten Notizen.

| Produkt | BIM-Funktionen | Preis / Edition | Notiz |
|---|---|---|---|
| **NOVA AVA** | Import IFC2x3, IFC4, IFC 4.3 (seit 10/2026); Bauteile mit Katalognummern und Mengenvariablen; Wiedererkennung über GUID; Kostenplanung am Modell; LV-Mengen über 3D-Filter; Modellvergleich; BCF; IDS-Prüfung über BIM.permit; Catenda Hub; eingeschränkter Bieter-Viewer; BIM-LV-Container (laut Herstellerseite nach der zurückgezogenen DIN SPEC 91350; ob schon nach DIN 18290-2, ist offen). Mengen werden aus den IFC-Basismengen übernommen, nicht selbst berechnet. | Add-on 40 € pro Monat und Lizenz | [Handbuch](/okf/research/nova-ava/manual-and-workflows.md), [Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md), [Nutzerstimmen](/okf/research/nova-ava/user-feedback.md) |
| **ORCA AVA** | IFC-Basic ab Professional; IFC-Advanced (IFC-Diagnose; Brutto-, Netto- oder VOB-Maße) und BIM-LV-Container nur in Enterprise | Enterprise rund 600 € pro Jahr und Lizenz teurer als Professional | [Etablierte Anbieter](/okf/research/market/established-vendors.md) |
| **G&W CaliforniaX** | BIM2AVA (IFC, BCF), Raum- und Gebäudebuch; BIM-LV-Container nach DIN 18290 (V26) | Paket BIM (Business Edition): Kauf 5.510 € oder Abo 2.196 €/Jahr; zum Vergleich Paket Baukosten ohne BIM 3.110 € bzw. 1.296 €/Jahr (Stand 10/2026) | ebd. |
| **NEVARIS Build** | BIM-Modul (nur im LAN mit dem SQL-Server); kostenloser BIM-Viewer ab 2025.1; Kosten direkt aus dem Modell ab 2026.1 | Subscription-Bausteine | ebd. |
| **RIB iTWO** | iTWO 5D (modellbasiert); LV aus Plan, Objektbuch oder BIM-Modell | Preise auf Anfrage | ebd. |
| **AVANTI** | AVANTI BIM: IFC2x3/IFC4, Revit-Plug-in | Miete 250 € pro Monat (BIM-Stufe) | [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md) |
| **AVAPLAN** | BIM-Modul | 390 € | ebd. |

*Einschätzung:* BIM ist im Markt **Standardausstattung als Aufpreis**. Fast niemand berechnet Mengen selbst aus der Geometrie mit eigenen Abrechnungsregeln – öffentlich belegt ist das nur bei ORCA über die „VOB-Maße".

## 10. Open-Source-Bausteine für BIM

Stand der Versionen: Paketregister npm, PyPI und NuGet, abgerufen am 09.11.2026.

| Baustein | Sprache / Plattform | Lizenz | Version (Datum) | Was er kann | Eignung für ein Web-AVA (Einschätzung) |
|---|---|---|---|---|---|
| **IfcOpenShell** (C++-Kern, `ifcopenshell`-Python) | C++, Python; im Browser über Pyodide/WASM | LGPL-3.0-or-later [14][36] | 0.9.0.post1 (15.10.2026) [11] | Liest IFC2x3 TC1, IFC4 ADD2 TC1, IFC4x1, IFC4x2 und IFC4x3 ADD2 vollständig. Umfassende Geometrie für IFC2x3 und IFC4 (Stand README v0.8.0). High-Level-API zum Lesen, Schreiben und Ändern [36]. Repository sehr aktiv (rund 2.900 Sterne, letzter Push am 09.11.2026) [14]. | **hoch** als Server-Dienst für Import, Analyse und Mengen. Im Browser laut Doku nur als „technology preview", sehr schwer und mit langer Ladezeit [37]. |
| **ifc5d** | Python | LGPL-3.0-or-later [12] | 0.9.0 (29.09.2026) [12] | CSV → `IfcCostSchedule`/`IfcCostItem` (LV, Einheitspreisliste, Formeln, Abfragen auf Bauteile); Export nach CSV, XLSX, ODS; Modul `qto` berechnet Basismengen aus der Geometrie nach Regelsätzen für IFC4 und IFC4X3 [13] | **mittel**: Vorlage für Weg B (eigene Mengenberechnung) und für einen openBIM-Kostenexport. Import aus ODS/XLSX fehlt noch [13]. |
| **IfcTester** | Python (Bibliothek, CLI, Web-App) | LGPL-3.0-or-later [12][36] | 0.9.0 [12] | Prüft IFC-Modelle gegen IDS [12][36] | **hoch** für die Eingangsprüfung von Modellen |
| **ifcdiff** | Python | LGPL-3.0-or-later [12] | 0.9.0 [12] | Vergleicht Modellversionen: Geometrie, Eigenschaften, Struktur [12] | **mittel bis hoch** (Modellvergleich, Nachtragsprüfung) |
| **ifccsv** | Python | LGPL-3.0-or-later [12] | 0.9.0 [12] | Bauteillisten aus IFC nach CSV/XLSX/ODS und zurück [12] | **mittel** (Weg D: Listen statt Modell) |
| **bcf-client** | Python | README: LGPL-3.0-or-later; PyPI-Klassifikator: GPLv3 (widersprüchlich) [36][12] | 0.9.0 [12] | BCF-XML lesen und schreiben, BCF-API abfragen [36] | gering bis mittel |
| **Bonsai** (früher BlenderBIM) | Blender-Add-on (Python) | GPL-3.0-or-later [36] | – | Native IFC-Modellierung; Kosten- und Terminplanung mit Kosten an Material und Bauteil, Mengenermittlung, 4D. Die Doku dazu ist als „Work in Progress" gekennzeichnet [15]. | Nicht einbettbar. Nützlich als freies Autorenwerkzeug für Testmodelle und als Referenz für IFC-Kostenstrukturen. |
| **web-ifc** | C++ → WebAssembly; JavaScript/TypeScript (Browser, Node) | MPL-2.0 [16] | 0.0.78 (21.09.2026) [16] | Liest und schreibt IFC laut Projekt „at native speeds"; Eigenschaften und Geometrie [38] | **hoch** für den IFC-Import im Browser. Die Versionsnummer 0.0.x spricht für eine noch nicht stabile API (Einschätzung). |
| **That Open Components / Fragments / UI** (`@thatopen/…`) | TypeScript, Three.js | MIT [17] | components 3.6.0 (22.10.2026), fragments 3.6.1 (08.11.2026) [17] | Fertige Bausteine für browserbasierte BIM-Anwendungen: Viewer, Bemaßung, Grundrissnavigation, DXF-Export u. a. Das Paket `components` läuft im Browser und in Node.js, `components-front` nur im Browser [39]. Fragments ist laut Projekt ein offenes Binärformat samt Werkzeugkasten, um sehr große BIM-Datenmengen effizient zu speichern, anzuzeigen und zu bearbeiten [17]. | **hoch** für Viewer, Auswahl und 3D-Filter |
| **web-ifc-viewer / web-ifc-three** (IFC.js, Altbestand) | JavaScript | MIT [19] | 1.0.218 (05.07.2023) bzw. 0.0.126 (02.01.2024) [19] | Vorgänger der That-Open-Bibliotheken | **nicht verwenden** (seit 2023/24 ohne Release) |
| **xBIM** (XbimEssentials, XbimGeometry) | C#/.NET (netstandard2.0/2.1, net8, net10) | CDDL-1.0; Geometrie über OpenCASCADE (LGPL 2.1 mit Ausnahme) [40] | 6.1.605 (15.07.2026) [21] | Liest, erstellt und ändert IFC2x2, IFC2x3, IFC4 ADD2 und IFC4x1 (IFC 4.3 in der Paketbeschreibung nicht genannt) [21] | **mittel**, nur bei .NET-Backend; IFC-4.3-Stand prüfen |
| **xeokit SDK** | JavaScript | AGPL-3.0 oder kommerzielle Lizenz [18][41] | 2.6.114 (02.09.2026) [18] | Leistungsfähiger BIM-Viewer | **vorsichtig**: Die AGPL verlangt, dass auch die einbindende Anwendung unter AGPL steht [41]. |
| **Speckle Viewer** | TypeScript | Apache-2.0 [20] | 2.31.14 (15.06.2026) [20] | Viewer der Speckle-Datenplattform | gering (eigenes Datenmodell statt IFC, Einschätzung) |

**Mögliche Architektur für ein Web-AVA (Einschätzung):**
- **Browser:** web-ifc und That Open Components für Import, Anzeige, Auswahl und Filter. Große Modelle werden als Fragments zwischengespeichert.
- **Server (optional):** ein Python-Dienst mit IfcOpenShell. Er übernimmt den robusten Import, die IDS-Prüfung (IfcTester), den Versionsvergleich (ifcdiff) und später die eigene Mengenberechnung (ifc5d `qto`).
- **AVA-Datenbank:** Speichert keine IFC-Datei als Wahrheit. Gespeichert werden *Bauteil-Schnappschüsse* (GUID, Klasse, Typ, Geschoss, Material, Psets, Qtos, Modellversion) und eine **Verknüpfungstabelle**: Bauteil ↔ LV-Position/Mengensplit ↔ Mengenregel ↔ Kostengruppe.
- **Export:** GAEB 3.3 mit BIM-Katalog (`CtlgAssign` mit GUID). Den BIM-LV-Container nach DIN 18290-2 erst später, weil die Norm gekauft werden muss und die Interoperabilität unklar ist.
- **Lizenzen:** MIT-, MPL-2.0- und LGPL-Bausteine passen zu jeder üblichen Projektlizenz (MIT, Apache, GPL, AGPL). GPL-Teile wie Bonsai werden nicht eingebunden. xeokit würde das Projekt auf AGPL festlegen. Bei den mit Sternchen markierten LGPL-Bestandteilen von IfcOpenShell erklärt das README die Fußnote nicht; vor der Weitergabe von Binärpaketen ist das zu prüfen [36]. Siehe auch [Open-Source-Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).

## Relevanz für unser Projekt

**Gesamteinschätzung:** BIM ist für das erste Release **kein Kernthema**. Dafür sprechen drei Gründe:
- 70 % der Büros unter 10 Personen arbeiten nicht mit BIM, nur 6 % regelmäßig [34].
- Eine echte BIM-Pflicht mit modellbasiertem LV gibt es vor allem im Bundesbau und bei großen Projekten [9][32].
- Selbst Marktführer liefern aus IFC-Modellen nur Mengen mit Nacharbeitsbedarf ([Schmerzpunkte](/okf/research/market/pain-points.md)).

BIM ist aber ein **realistisches Phase-2-Thema mit Differenzierungspotenzial**, und das Datenmodell muss von Anfang an darauf vorbereitet sein.

### Muss (schon im MVP, kaum Aufwand)
1. **GUID- und Katalogzuordnungen verlustfrei erhalten:** GAEB-3.3-Dateien von Fachplanern können `CtlgAssign` mit BIM-GUIDs enthalten. Sie müssen Import und Export unverändert überstehen ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)).
2. **Herkunft jeder Menge speichern:** manuell, Formel, Aufmaß, Modell (mit Modellversion und Bauteil-GUIDs). Das kostet wenig und macht später modellbasierte Mengen nachvollziehbar.
3. **Kostengruppen-Zuordnung als n:m-Katalogzuordnung** modellieren, so wie GAEB und IFC (`IfcClassificationReference`) es tun [25], und nicht als einzelnes Feld.

### Soll (Phase 2: „BIM light")
4. **IFC-Import** für IFC2x3, IFC4 und IFC 4.3 mit Bauteilliste (Klasse, Typ, Geschoss, Material, Psets, Qtos), umgesetzt mit web-ifc oder IfcOpenShell [16][36].
5. **Viewer im Browser** mit Auswahl, Isolieren und Einfärben nach Zuordnungsstatus (That Open Components) [17][39].
6. **Regelbasierte Zuordnung** Bauteile → LV-Position bzw. Mengensplit und → Kostengruppe. Mengen kommen aus Qto-Werten mit Formel. Die Ableitung bleibt transparent: Welche Bauteile mit welchen Werten ergeben diese Menge?
7. **Modellversionen** mit GUID-Abgleich: neue, gelöschte und geänderte Bauteile mit ihrer Wirkung auf die LV-Mengen.
8. **CSV- und Excel-Import von Bauteillisten** (Weg D) für Büros ohne sauberen IFC-Export.

### Kann (Phase 3+)
9. Eigene Mengenberechnung aus der Geometrie mit **parametrierbaren VOB-Übermessungsregeln** je Leistungsbereich (Basis: ifc5d `qto` [13]; Regelwerte nicht mitliefern, siehe [HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md)).
10. **IDS-Prüfung** beim Import (IfcTester) [12] und **BCF** für Rückfragen an Planer [7].
11. **BIM-LV-Container nach DIN 18290-2** (Import/Export) für öffentliche Auftraggeber, die ihn verlangen [24]; danach Kosten- und Abrechnungscontainer (Teile 3 und 4) [26].
12. openBIM-Export des LV bzw. der Kostenplanung als `IfcCostSchedule` (Typ TENDER bzw. COSTPLAN) [25].
13. Modellbasierte Abrechnung (AwF 160, DIN 18299 Öffnungsklausel) [9].

### Differenzierungschancen
- **BIM ohne Aufpreis:** Bei NOVA kostet BIM 40 € pro Monat und Lizenz, bei ORCA gibt es den vollen Umfang nur in der Enterprise Edition ([Etablierte Anbieter](/okf/research/market/established-vendors.md)).
- **Transparente Mengenherleitung** statt Blackbox. Die Kritik am „Volumen-Container" ([NOVA Nutzerstimmen](/okf/research/nova-ava/user-feedback.md)) zeigt, dass Nutzer nachvollziehen wollen, woher Mengen kommen.
- **Offene Regeln:** Zuordnungs- und Übermessungsregeln als teilbare Dateien (z. B. JSON), die Büros austauschen können.
- **openBIM konsequent:** IFC, IDS und BCF statt Hersteller-Plug-ins. Das passt zum Zielbild des Bundes [8] und zur Forderung von buildingSMART Deutschland [31].

### Risiken
- **Modellqualität bleibt beim Planer:** Software kann schlechte IFC-Exporte nicht retten [23]. Die Erwartung „LV auf Knopfdruck" muss man aktiv dämpfen.
- **Geometrie-Engines sind komplex:** Eigene Mengenberechnung ist teuer und fehleranfällig; besser auf IfcOpenShell aufsetzen als selbst bauen.
- **Browser-Performance** bei großen Modellen. Mit Fragments und serverseitiger Vorverarbeitung beherrschbar (Einschätzung).
- **Lizenzen:** Die IFC-Spezifikation steht unter CC BY-ND 4.0 [1]; DIN 18290 [24] und die VOB/C-Normen wie DIN 18299 ([HOAI, VOB/B und VOB/C](/okf/research/standards/hoai-vob-b-c.md)) sind kostenpflichtig; xeokit (AGPL) und Bonsai (GPL) beeinflussen die Projektlizenz [36][41].
- **Junge APIs:** web-ifc 0.0.x, That Open 3.x mit häufigen Releases [16][17]. Versionen festpinnen und hinter einer eigenen Schnittstelle kapseln (Einschätzung).

### Aufwandsschätzung (Einschätzung, grob, in Personenwochen = PW)

| Paket | Aufwand |
|---|---|
| Datenmodell vorbereiten (GUID/Katalog verlustfrei, Mengenherkunft, n:m-Kostengruppen) | 0,5–1 PW |
| IFC-Import und Bauteil-Datenbank (web-ifc oder IfcOpenShell-Dienst) | 2–3 PW |
| Viewer mit Auswahl, Filter und Statusfarben (That Open) | 2–4 PW |
| Regelbasierte Zuordnung Bauteil → Position/KG mit Mengenübernahme | 3–5 PW |
| Modellversionen und GUID-Diff | 1–2 PW |
| CSV/Excel-Bauteillisten | 1 PW |
| **Summe Phase 2 „BIM light"** | **ca. 9–16 PW** |
| IDS-Prüfung (IfcTester als Dienst) | ca. 1 PW |
| BCF (lesen/schreiben, Ansicht im Viewer) | 1–2 PW |
| BIM-LV-Container DIN 18290-2 (nach Normkauf) | 2–3 PW |
| Eigene Mengenberechnung mit VOB-Übermessung | 4–8 PW, hohe Unsicherheit |

## Offene Fragen

**An den Architekten-Freund:**
1. Mit welchem CAD arbeitest du (Archicad, Vectorworks, Allplan, Revit, anderes)? Modellierst du in 3D mit Bauteilen oder zeichnest du überwiegend 2D?
2. Nutzt du das BIM-Add-on von NOVA? Wenn ja: Wofür (Kostenplanung, LV-Mengen, Bieter-Viewer) und wie viel Nacharbeit brauchen die Mengen?
3. Haben öffentliche Auftraggeber schon BIM verlangt, etwa AIA, BAP, IFC-Abgabe oder einen BIM-LV-Container? Bei welchen Projektgrößen?
4. Liefern Fachplaner oder Generalunternehmer IFC-Modelle oder GAEB-Dateien mit GUIDs an dich?
5. Woher kommen deine Mengen heute: Pläne, CAD-Listen, PDF-Messung, Excel?
6. Wäre ein einfacher IFC-Viewer mit Mengenübernahme für dich ein Grund zu wechseln, oder ist BIM ein Randthema?

**Nicht gefunden oder nicht verifiziert:**
- Das genaue ISO-Veröffentlichungsdatum von ISO 16739-1:2024: Die ISO-Seite und die buildingSMART-Technikseiten blockierten den Abruf. Belegt sind die Bekanntgabe durch buildingSMART (04/2024) und die DIN-Fassung 2024-09 [2][22].
- Ob die Bundesbau-Zeitpläne 2025/2026 nochmals angepasst wurden und wie weit Level II/III tatsächlich umgesetzt sind. Die BT-Drs. 20/13064 nennt den 01.01.2028 nur als Evaluierungstermin für das Gesetz zur Modernisierung des Bundesbaus, nicht speziell für BIM [9]. Der aktuelle Eintrag von buildingSMART im Lobbyregister wurde nur in der historischen Fassung gelesen [31].
- Ob der BIM-LV-Container nach DIN 18290-2 zwischen Produkten verschiedener Hersteller tatsächlich funktioniert. Eine Zertifizierung oder einen Interoperabilitätstest dafür haben wir nicht gefunden.
- Welche Container-Fassung NOVA und ORCA schreiben: Beide nennen öffentlich noch die zurückgezogene DIN SPEC 91350, G&W nennt DIN 18290. Für Interoperabilitätstests muss das mit Beispieldateien oder beim Hersteller geklärt werden.
- Ob es einen Nachfolger der zurückgezogenen DIN SPEC 91400 als Norm gibt oder ob die DIN BIM Cloud (kommerziell) diese Rolle übernommen hat [27][28].
- IFC-4.3-Unterstützung von xBIM; die Bedeutung des Sternchens bei den LGPL-Komponenten von IfcOpenShell; die widersprüchliche Lizenzangabe bei bcf-client [21][36][12].
- Belastbare Zahlen, wie viele Ausschreibungen öffentlicher Auftraggeber (Länder und Kommunen) BIM verlangen. Eine Auswertung der Vergabeplattformen könnte das klären.
- Wie die Basismengen in Archicad, Vectorworks, Allplan und Revit genau berechnet werden (z. B. Umgang mit Öffnungen und Anschlüssen). Herstellerdokumentationen wurden hier nicht ausgewertet.

## Quellen

[1] IFC4.3.x-development (README) - buildingSMART International / GitHub - https://github.com/buildingSMART/IFC4.3.x-development - Art: Primärquelle - abgerufen 2026-11-09
[2] The buildingSMART Newsletter April 2024 (IFC 4.3 als ISO-Norm veröffentlicht) - buildingSMART International - https://comms.buildingsmart.org/the-buildingsmart-newsletter-is-here-for-april-2024 - Art: Primärquelle - abgerufen 2026-11-09
[3] IFC 4.3 Property-/Quantity-Set-Definitionen (PSD-XML, z. B. Qto_WallBaseQuantities.xml) - buildingSMART International / GitHub - https://github.com/buildingSMART/IFC4.3.x-development/tree/master/reference_schemas/psd - Art: Primärquelle - abgerufen 2026-11-09
[4] IFC 4.3 Dokumentationsquellen der Mengensätze (Ordner QuantitySets in allen Schema-Modulen, z. B. IfcSharedBldgElements) - buildingSMART International / GitHub - https://github.com/buildingSMART/IFC4.3.x-development/tree/master/docs/schemas - Art: Primärquelle - abgerufen 2026-11-09
[5] IFC5-development (README, „IFC 5 alpha Examples") - buildingSMART International / GitHub - https://github.com/buildingSMART/IFC5-development - Art: Primärquelle - abgerufen 2026-11-09
[6] Information Delivery Specification (IDS) - buildingSMART International / GitHub - https://github.com/buildingSMART/IDS - Art: Primärquelle - abgerufen 2026-11-09
[7] BCF-XML (Release 3.0) - buildingSMART International / GitHub - https://github.com/buildingSMART/BCF-XML - Art: Primärquelle - abgerufen 2026-11-09
[8] Masterplan BIM für Bundesbauten – Erläuterungsbericht (2021) - Bundesministerium des Innern, für Bau und Heimat / fib-bund.de - https://fib-bund.de/Inhalt/Themen/BIM_fuer_Bundesbauten/2021-11-01_BIM_Masterplan.pdf - Art: Primärquelle - abgerufen 2026-11-09
[9] Antwort der Bundesregierung „Stand der Reform des Bundesbaus", BT-Drucksache 20/13064 (19.09.2024) - Deutscher Bundestag - https://dserver.bundestag.de/btd/20/130/2013064.pdf - Art: Primärquelle - abgerufen 2026-11-09
[10] BIM bei Bundesfernstraßen: Was öffentliche Auftraggeber jetzt wissen sollten (12.05.2026) - cosinex Blog - https://blog.cosinex.de/2026/05/12/bim-bundesfernstrassen-oeffentliche-vergabe/ - Art: Presse/Fachblog - abgerufen 2026-11-09
[11] ifcopenshell (PyPI, Version 0.9.0.post1) - Python Package Index - https://pypi.org/project/ifcopenshell/ - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[12] ifc5d, ifctester, ifcdiff, ifccsv, ifcpatch, bcf-client (PyPI, Version 0.9.0) - Python Package Index - https://pypi.org/project/ifc5d/ - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[13] ifc5d: README und Modul qto.py - IfcOpenShell / GitHub - https://github.com/IfcOpenShell/IfcOpenShell/tree/v0.8.0/src/ifc5d - Art: Primärquelle - abgerufen 2026-11-09
[14] IfcOpenShell (Repository, Lizenz) - IfcOpenShell / GitHub - https://github.com/IfcOpenShell/IfcOpenShell - Art: Primärquelle - abgerufen 2026-11-09
[15] Bonsai Documentation: Costing and Scheduling - Bonsai / IfcOpenShell - https://docs.bonsaibim.org/studio/guides/costing_and_scheduling/index.html - Art: Primärquelle - abgerufen 2026-11-09
[16] web-ifc (npm, Version 0.0.78) - npm Registry / That Open Company - https://www.npmjs.com/package/web-ifc - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[17] @thatopen/components und @thatopen/fragments (npm, Version 3.6.x) - npm Registry / That Open Company - https://www.npmjs.com/package/@thatopen/components - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[18] @xeokit/xeokit-sdk (npm, Version 2.6.114) - npm Registry / xeolabs - https://www.npmjs.com/package/@xeokit/xeokit-sdk - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[19] web-ifc-viewer (npm, Version 1.0.218) - npm Registry - https://www.npmjs.com/package/web-ifc-viewer - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[20] @speckle/viewer (npm, Version 2.31.14) - npm Registry / Speckle Systems - https://www.npmjs.com/package/@speckle/viewer - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[21] Xbim.Essentials (NuGet, Version 6.1.605) - NuGet Gallery / xBIM Team - https://www.nuget.org/packages/Xbim.Essentials - Art: Primärquelle (Paketregister) - abgerufen 2026-11-09
[22] DIN EN ISO 16739-1:2024-09 Industry Foundation Classes (IFC) … Teil 1: Datenschema - DIN Media - https://www.dinmedia.de/de/norm/din-en-iso-16739-1/379635818 - Art: Primärquelle (Normenkatalog) - abgerufen 2026-11-09
[23] BIM für Bundesbauten – BIM-Handbuch, Arbeitshilfe Datenaustausch (07/2023) - Bundesbauverwaltung / fib-bund.de - https://www.fib-bund.de/Inhalt/Themen/BIM_fuer_Bundesbauten/2023-07_BIM_AH_Datenaustausch.pdf - Art: Primärquelle (Verwaltungsleitfaden) - abgerufen 2026-11-09
[24] DIN 18290-2:2023-11 Verlinkter BIM-Datenaustausch … Teil 2: BIM-LV-Container - DIN Media - https://www.dinmedia.de/de/norm/din-18290-2/369464914 - Art: Primärquelle (Normenkatalog) - abgerufen 2026-11-09
[25] IFC 4.3 Dokumentationsquellen: IfcGloballyUniqueId, IfcClassificationReference, IfcRelAssociatesClassification, IfcCostSchedule, IfcCostScheduleTypeEnum, IfcCostItem, IfcRelAssignsToControl - buildingSMART International / GitHub - https://github.com/buildingSMART/IFC4.3.x-development/tree/master/docs/schemas - Art: Primärquelle - abgerufen 2026-11-09
[26] BIM-Normen online – Inhaltsverzeichnis (Stand 2026-08) - DIN Media - https://www.dinmedia.de/resource/blob/1053828/38b094306ab06f47085c1635797bf61a/bim-normen-online-inhalt-data.pdf - Art: Primärquelle (Normenverzeichnis) - abgerufen 2026-11-09
[27] DIN SPEC 91400:2017-02 Building Information Modeling (BIM) – Klassifikation nach STLB-Bau - DIN Media - https://www.dinmedia.de/de/technische-regel/din-spec-91400/267208318 - Art: Primärquelle (Normenkatalog) - abgerufen 2026-11-09
[28] DBD-BIM – Content-Plattform für BIM - Dr. Schiller & Partner GmbH (Dynamische BauDaten) - https://www.dbd.de/dbd-bim/ - Art: Herstellerangabe - abgerufen 2026-11-09
[29] Neuer Standard IDS v1.0 von buildingSMART - ingenieur.de (VDI Fachmedien) - https://www.ingenieur.de/fachmedien/bauingenieur/digitalisierung-bauingenieur/neuer-standard-ids-v1-0-von-buildingsmart/ - Art: Presse - abgerufen 2026-11-09
[30] Vergabeverordnung (VgV) § 12 Einsatz alternativer elektronischer Mittel bei der Kommunikation - Bundesministerium der Justiz / gesetze-im-internet.de - https://www.gesetze-im-internet.de/vgv_2016/__12.html - Art: Gesetz - abgerufen 2026-11-09
[31] Regelungsvorhaben „Präzisierung der Masterpläne BIM für Bundesbauten und Fernstraßen" (Eintrag vom 02.03.2026, buildingSMART Deutschland e. V.) - Lobbyregister des Deutschen Bundestages - https://www.lobbyregister.bundestag.de/inhalte-der-interessenvertretung/regelungsvorhabensuche/RV0022774/392709 - Art: Primärquelle (Registereintrag eines Verbands) - abgerufen 2026-11-09
[32] Initiativen der Bundesländer - BIM Deutschland (Zentrum für die Digitalisierung des Bauwesens) - https://www.bimdeutschland.de/bim-praxis/initiativen-der-bundeslaender - Art: Primärquelle - abgerufen 2026-11-09
[33] BIM-Portal des Bundes geht an den Start (Archivmeldung) - Die Bundesregierung - https://www.bundesregierung.de/breg-de/service/archiv-bundesregierung/bim-portal-freigeschaltet-2132842 - Art: Primärquelle - abgerufen 2026-11-09
[34] Berufspolitische Befragung 2023, Teil 7: BIM (bundesweite Befragung der Mitglieder der Architektenkammern der Länder) - Bundesarchitektenkammer / Architektenkammer Thüringen - https://architekten-thueringen.de/getmedia.php/_media/akt/202310/79912v0-orig.pdf - Art: Wissenschaft/Verbandsbefragung - abgerufen 2026-11-09
[35] Architekturbüros erwarten: BIM-Nutzung steuert auf Zwei-Drittel-Marke zu (BIM Monitor 2025, 07.05.2025) - BauInfoConsult - https://bauinfoconsult.de/architekturbueros-erwarten-bim-nutzung-steuert-auf-zwei-drittel-marke-zu/ - Art: Marktforschung/Presse - abgerufen 2026-11-09
[36] IfcOpenShell README (Tag v0.8.0: unterstützte Schemas, Lizenztabelle der Komponenten) - IfcOpenShell / GitHub - https://github.com/IfcOpenShell/IfcOpenShell/blob/v0.8.0/README.md - Art: Primärquelle - abgerufen 2026-11-09
[37] IfcOpenShell-Python: Installation (Abschnitt Pyodide/WASM) - IfcOpenShell / GitHub (Quelltext der Dokumentation) - https://github.com/IfcOpenShell/IfcOpenShell/blob/v0.8.0/src/ifcopenshell-python/docs/ifcopenshell-python/installation.rst - Art: Primärquelle - abgerufen 2026-11-09
[38] web-ifc README - That Open Company / GitHub - https://github.com/ThatOpen/engine_web-ifc - Art: Primärquelle - abgerufen 2026-11-09
[39] Open BIM Components README (engine_components) - That Open Company / GitHub - https://github.com/ThatOpen/engine_components - Art: Primärquelle - abgerufen 2026-11-09
[40] XbimEssentials README und LICENCE.md (CDDL) - xBIM Team / GitHub - https://github.com/xBimTeam/XbimEssentials - Art: Primärquelle - abgerufen 2026-11-09
[41] xeokit SDK README (Abschnitt Licensing & Commercial Use) - xeolabs/Creoox / GitHub - https://github.com/xeokit/xeokit-sdk - Art: Primärquelle - abgerufen 2026-11-09
[42] Pressemitteilung 024/2026 „Schnieder: Deutschland wird BIM-Land" (27.03.2026) - Bundesministerium für Verkehr - https://www.bmv.de/SharedDocs/DE/Pressemitteilungen/2026/024-schnieder-deutschland-wird-bim-land.html - Art: Primärquelle - abgerufen 2026-11-09

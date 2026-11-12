// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ausgabe: LV-Druck als PDF (ADR 0012) und Excel-Rundlauf für Bieter (G-14, D-25). Das `Ausgabemodell` ist die Naht zu den Renderern.

export { baueAusgabemodell } from './modell';
export type {
  Ausgabemodell,
  AusgabeZeile,
  HinweisZeile,
  Kopf,
  KopfFeld,
  ModellOptionen,
  PositionZeile,
  SummenBlock,
  TitelZeile,
  TitelsummeZeile,
  UnterbeschreibungZeile,
  ZuschlagAngabe,
} from './modell';
export { BILDMARKE, LUECKE, bloeckeAlsText, langtextAlsBloecke } from './langtext';
export type { DruckAbsatz, DruckBlock, DruckLauf, DruckListe, DruckTabelle, DruckZelle } from './langtext';
export {
  DRUCKPROFIL_SCHEMAVERSION,
  STANDARD_DRUCKPROFILE,
  druckprofilAlsJson,
  druckprofilAusJson,
  ersetzePlatzhalter,
  neuesDruckprofil,
  profilAlsOptionen,
} from './druckprofil';
export type {
  DruckEingabe,
  Druckprofil,
  DruckprofilBefund,
  DruckprofilBefundcode,
  PlatzhalterWerte,
} from './druckprofil';
export { KUERZUNGSMARKE, kuerzeBloecke } from './kuerzen';
export type { LangtextUmfang } from './modell';
export { erzeugePdf } from './pdf';
export type { PdfOptionen } from './pdf';
export type { Schriften } from './schriften';
export { excelRuecklaufLesen, lvAlsExcel, strukturPruefsumme } from './excel';
export type { ExcelBefund, ExcelBefundcode, ExcelDatei, ExcelOptionen, ExcelRuecklauf } from './excel';

// Ausgaben X2 bis X4 (Ticket 113): Berichtsmodell und PDF für Mängelliste, Mängelanzeige, Bautagebuch, Honorarberechnung, Bauzeitenplan.
export type {
  BerichtAbschnitt,
  BerichtBlock,
  BerichtFeld,
  BerichtSpalte,
  BerichtZeile,
  Berichtsmodell,
} from './bericht';
export { erzeugeBerichtPdf } from './bericht-pdf';
export { MAENGELANZEIGE_TEXT, baueMaengelanzeigeModell, baueMaengellisteModell } from './maengel-druck';
export type { MaengelanzeigeEingabe, MaengellisteEingabe } from './maengel-druck';
export { baueBautagebuchModell } from './bautagebuch-druck';
export type { BautagebuchEingabe } from './bautagebuch-druck';
export { DIN276_HINWEIS, baueHonorarModell } from './honorar-druck';
export type { HonorarEingabe } from './honorar-druck';
export { baueBauzeitenplanModell } from './bauzeit-druck';
export type { BauzeitenplanEingabe } from './bauzeit-druck';
export {
  erzeugeBautagebuchPdf,
  erzeugeBauzeitenplanPdf,
  erzeugeHonorarPdf,
  erzeugeMaengelanzeigePdf,
  erzeugeMaengellistePdf,
} from './x2x4-pdf';

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
export { BILDMARKE, LUECKE, MAX_BILD_BYTES, bloeckeAlsText, langtextAlsBloecke } from './langtext';
export type {
  DruckAbsatz,
  DruckBild,
  DruckBlock,
  DruckLauf,
  DruckListe,
  DruckTabelle,
  DruckZelle,
} from './langtext';
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

// Berichte (Tickets 113, 141): Berichtsmodell, PDF und Excel für Mängelliste, Mängelanzeige, Bautagebuch, Honorarberechnung,
// Bauzeitenplan und die Ausgaben der Kernkette (Preisspiegel, Vergabevorschlag, Aufmaßblatt, Soll/Ist, Rechnungsprüfung).
export type {
  BerichtAbschnitt,
  BerichtBlock,
  BerichtFeld,
  BerichtSeite,
  BerichtSpalte,
  BerichtWert,
  BerichtZahl,
  BerichtZeile,
  BerichtZelle,
  Berichtsmodell,
  Befundtext,
} from './bericht';
export { erzeugeBerichtPdf } from './bericht-pdf';
export { berichtAlsExcel } from './bericht-excel';
export type { ProjektKopf } from './koepfe';
export { BIETER_JE_TABELLE, bauePreisspiegelModell } from './preisspiegel-druck';
export type { PreisspiegelEingabe } from './preisspiegel-druck';
export { baueVergabevorschlagModell } from './vergabevorschlag-druck';
export { baueAufmassblattModell } from './aufmass-druck';
export type { AufmassblattEingabe } from './aufmass-druck';
export type { VergabevorschlagEingabe } from './vergabevorschlag-druck';
export { MAENGELANZEIGE_TEXT, baueMaengelanzeigeModell, baueMaengellisteModell } from './maengel-druck';
export type { MaengelanzeigeEingabe, MaengellisteEingabe } from './maengel-druck';
export { baueBautagebuchModell } from './bautagebuch-druck';
export type { BautagebuchEingabe } from './bautagebuch-druck';
export { DIN276_HINWEIS, baueHonorarModell } from './honorar-druck';
export type { HonorarEingabe } from './honorar-druck';
export { baueBauzeitenplanModell } from './bauzeit-druck';
export type { BauzeitenplanEingabe } from './bauzeit-druck';
export {
  aufmassblattAlsExcel,
  erzeugeAufmassblattPdf,
  erzeugeBautagebuchPdf,
  erzeugeBauzeitenplanPdf,
  erzeugeHonorarPdf,
  erzeugeMaengelanzeigePdf,
  erzeugeMaengellistePdf,
  erzeugePreisspiegelPdf,
  erzeugeVergabevorschlagPdf,
  preisspiegelAlsExcel,
} from './bericht-einstiege';

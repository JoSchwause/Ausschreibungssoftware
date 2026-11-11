// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ausgabe: LV-Druck als PDF (ADR 0012). Das `Ausgabemodell` ist die Naht zu den Renderern.

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
export { erzeugePdf } from './pdf';
export type { PdfOptionen } from './pdf';
export type { Schriften } from './schriften';

// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ifc (Ticket 98, D-50): eine IFC-Datei (STEP, IFC 2x3 und IFC 4) lesen, Inhalt ohne
// Geometrie. Rein (A2); importiert nur `vertrag` und `dezimal` (A3). Ein Format-Rand wie `gaeb` und `erechnung` (N4).

export { STANDARD_MAX_BYTES, STANDARD_MAX_TIEFE, ifcLesen } from './lesen';
export type {
  Bauteil,
  Bauteilmenge,
  Bauwerksmodell,
  Eigenschaft,
  IfcBefund,
  IfcBefundcode,
  IfcGlobalId,
  IfcKopf,
  IfcLesung,
  IfcOptionen,
  IfcSchema,
  Klassifikation,
  Strukturknoten,
} from './typen';

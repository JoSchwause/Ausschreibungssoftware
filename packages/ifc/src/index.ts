// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ifc (Tickets 98, 107; D-50, D-51): eine IFC-Datei (STEP, IFC 2x3 und IFC 4) lesen, Inhalt ohne
// Geometrie, als `Bauwerksmodell` des Vertrags (v1.6); Eigenschaften bei Bedarf aus denselben Bytes. Rein (A2); importiert nur
// `vertrag` und `dezimal` (A3). Ein Format-Rand wie `gaeb` und `erechnung` (N4).

export { globalIdLesen } from './globalid';
export type { GlobalIdFehler } from './globalid';
export { bauwerksmodellLesen } from './bauwerksmodell';
export type { BauwerksmodellLesung } from './bauwerksmodell';
export { eigenschaftenLesen, eigenschaftsindexBauen } from './eigenschaftsindex';
export type { Eigenschaftsindex, Objekteigenschaften } from './eigenschaftsindex';
export type { Eigenschaft, IfcBefundcode, IfcOptionen, Klassifikation } from './typen';
export { STANDARD_MAX_BYTES, STANDARD_MAX_TIEFE } from './lesen';

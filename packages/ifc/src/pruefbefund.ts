// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde des Lesers als `Pruefbefund` des Vertrags (v1.6, Ticket 107): Quelle `ifc-lesen`, Ort wie beim Leser (`#n`,
// Zeile, Attribut), dazu die GlobalId des Objekts des Modells, das der Befund betrifft.

import type { IfcGlobalId, Pruefbefund } from '@tethys/vertrag';
import type { IfcBefund } from './typen';

/** Ein Befund des Lesers als Prüfbefund des Vertrags; `globalId`, wenn er ein Objekt des Modells betrifft. */
export function pruefbefund(b: IfcBefund, globalId: IfcGlobalId | undefined): Pruefbefund {
  return {
    schwere: b.schwere,
    quelle: 'ifc-lesen',
    code: b.code,
    meldung: b.meldung,
    ort: globalId === undefined ? b.ort : { ...b.ort, globalId },
  };
}

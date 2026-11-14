// SPDX-License-Identifier: AGPL-3.0-or-later
// Verweis Kostenermittlung → Honorar (Ticket 155): welche Honorarberechnungen eines Projekts eine Kostenermittlung als
// Grundlage ihrer anrechenbaren Kosten lesen (§ 33 HOAI). Rein; geladen wird in `HonorarVerweise.tsx`.

import type { Honorarberechnung, HonorarberechnungId, KostenermittlungId } from '@tethys/vertrag';

export interface Honorarverweis {
  readonly id: HonorarberechnungId;
  readonly name: string;
}

/** Die Berechnungen mit mindestens einem Objekt, das die Kostenermittlung liest; jede einmal, Reihenfolge wie übergeben. */
export function honorareDerKostenermittlung(
  berechnungen: readonly Honorarberechnung[],
  kostenermittlungId: KostenermittlungId,
): Honorarverweis[] {
  return berechnungen
    .filter((b) =>
      b.objekte.some(
        (o) =>
          o.anrechenbareKosten.art === 'kostenermittlung' &&
          o.anrechenbareKosten.kostenermittlungId === kostenermittlungId,
      ),
    )
    .map((b) => ({ id: b.id, name: b.name }));
}

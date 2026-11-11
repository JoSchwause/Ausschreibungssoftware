// SPDX-License-Identifier: AGPL-3.0-or-later
// LvStandAnlegen (Ticket 42, Punkt 6; Vertrag v1.2, ADR 0006). Der Kern liefert nur den Kopf des Stands im ChangeSet;
// den Zustand friert `speicher` in derselben Transaktion ein (Ticket 43). Ein Stand verändert den LV-Zustand nicht.

import type { Befehlsfehler, Ergebnis, LvChangeSet, LvStandAnlegen, LvZustand } from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { indexVon } from './struktur';

/**
 * Prüft den Namen (nicht leer, Leerraum zählt als leer: `ungueltige-eingabe`, `feld: 'name'`) und die Kennung, soweit
 * der Kern sie kennt: nicht die Kennung des LV oder eines Knotens (`id-vergeben`). Ob es schon einen Stand mit dieser
 * Kennung gibt, weiß nur `speicher` (`konflikt`, Ticket 43).
 */
export function lvStandAnlegen(z: LvZustand, b: LvStandAnlegen): Ergebnis<LvChangeSet, Befehlsfehler> {
  const lv = z.leistungsverzeichnis;
  if (typeof b.name !== 'string' || b.name.trim() === '')
    return nein('ungueltige-eingabe', 'Ein LV-Stand braucht einen Namen.', undefined, 'name');
  if ((b.id as string) === lv.id || indexVon(lv.id, lv.knoten).byId.has(b.id))
    return nein('id-vergeben', `Kennung bereits vergeben: ${b.id}`, undefined, 'id');
  return ok({
    ...baueChangeSet(z, {}),
    lvStand: { vorher: null, nachher: { id: b.id, leistungsverzeichnisId: lv.id, name: b.name } },
  });
}

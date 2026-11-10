// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle, die die Projektseiten bauen. Nur Daten; ausgeführt werden sie über den Befehlsweg (`lv/befehlsweg.ts`).

import type {
  IdQuelle,
  LeistungsverzeichnisAnlegen,
  OzMaske,
  ProjektAnlegen,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';

/** MwSt-Satz eines neuen LV (änderbar an der Summenzeile). */
export const STANDARD_MWST = '19.00' as Prozent;

export function projektAnlegenBefehl(ids: IdQuelle, name: string, bauherr: string): ProjektAnlegen {
  return { art: 'ProjektAnlegen', id: ids.projekt(), name, bauherr: { name: bauherr, anschrift: null } };
}

/** Ein leeres LV: ohne Knoten, ohne Nachlass. */
export function lvAnlegenBefehl(
  ids: IdQuelle,
  projektId: ProjektId,
  name: string,
  ozMaske: OzMaske,
  mwstSatz: Prozent = STANDARD_MWST,
): LeistungsverzeichnisAnlegen {
  const id = ids.leistungsverzeichnis();
  return {
    art: 'LeistungsverzeichnisAnlegen',
    id,
    projektId,
    inhalt: { name, ozMaske, mwstSatz, nachlass: null, wurzelId: id, knoten: [] },
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateimigration 3 (Ticket 43, A8): hebt eine Projektdatei der Version 2 auf 3. Das Schema dazu steht in
// `migrationen.ts` (`SCHEMA_V3`). Einmal gemergt, wird hier nichts mehr geändert.
//
// Version 3 bringt nur Neues dazu, das fehlen darf: `LvZustand.papierkorb` und `Projektdatei.lvStaende` (fehlt: leer).
// Eine Datei der Version 2 hat beides nicht; ihr Inhalt bleibt deshalb, wie er ist. Trägt eine Datei, die sich als
// Version 2 ausgibt, schon eines der neuen Felder, ist sie ungültig (in Version 2 waren sie unbekannt), nicht still
// übernommen (Q5).

import { abbruch } from './ergebnis';

type Roh = Record<string, unknown>;

const istObjekt = (x: unknown): x is Roh => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Projektdatei Version 2 → 3: unverändert, bis auf die Prüfung, dass die neuen Felder noch fehlen. */
export function dateiAuf3(roh: Roh): Roh {
  if (Object.hasOwn(roh, 'lvStaende')) abbruch('datei-ungueltig', '$: unbekanntes Feld „lvStaende“');
  const lvs = roh['leistungsverzeichnisse'];
  if (Array.isArray(lvs)) {
    (lvs as unknown[]).forEach((z, i) => {
      if (istObjekt(z) && Object.hasOwn(z, 'papierkorb'))
        abbruch('datei-ungueltig', `$.leistungsverzeichnisse[${String(i)}]: unbekanntes Feld „papierkorb“`);
    });
  }
  return { ...roh };
}

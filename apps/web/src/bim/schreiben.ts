// SPDX-License-Identifier: AGPL-3.0-or-later
// Schreib- und Lesewege der Modellseiten (Ticket 114). Jede Änderung ist ein Befehl durch `bim` und Speicher mit
// Protokolleintrag und einem Undo-Teil (A5, U7); gelesen wird über die Repositories von `speicher`.

import { bauwerksmodellBefehlAusfuehren, bauwerksmodellChangeSetAnwenden } from '@tethys/bim';
import type {
  BauwerksmodellBefehl,
  BauwerksmodellId,
  BauwerksmodellZustand,
  ProjektId,
  Speicher,
} from '@tethys/vertrag';
import type { Lauf, Sitzung, Umgebung } from '../lv/befehlsweg';
import { befehlSchreiben, fachSitzung } from '../ui/schreibweg';

export type BauwerksmodellSitzung = Sitzung<BauwerksmodellZustand | null, BauwerksmodellBefehl>;

/** Ein Befehl am Bauwerksmodell durch `bim` und den Speicher. `zustand` ist `null` nur für `BauwerksmodellAnlegen`. */
export async function bauwerksmodellBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: BauwerksmodellZustand | null,
  befehl: BauwerksmodellBefehl,
): Promise<Lauf<BauwerksmodellZustand | null>> {
  return befehlSchreiben(
    u,
    projektId,
    befehl,
    bauwerksmodellBefehlAusfuehren(zustand, befehl),
    (cs) => ({ art: 'bauwerksmodell', id: cs.bauwerksmodellId }),
    (cs) => bauwerksmodellChangeSetAnwenden(zustand, cs),
  );
}

export function bauwerksmodellSitzung(
  u: Umgebung,
  projektId: ProjektId,
  zustand: BauwerksmodellZustand | null,
): BauwerksmodellSitzung {
  return fachSitzung(u, projektId, zustand, bauwerksmodellBefehlAnwenden);
}

/** Das ganze Modell; `null`, wenn es nicht (mehr) da ist. */
export async function bauwerksmodellLaden(
  speicher: Speicher,
  id: BauwerksmodellId,
): Promise<BauwerksmodellZustand | null> {
  const r = await speicher.bauwerksmodelle.laden(id);
  return r.ok ? r.wert : null;
}

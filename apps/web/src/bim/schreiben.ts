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
import { befehlswegFuer, eintrag, speichern, Sitzung, type Lauf, type Umgebung } from '../lv/befehlsweg';

export type BauwerksmodellSitzung = Sitzung<BauwerksmodellZustand | null, BauwerksmodellBefehl>;

/** Ein Befehl am Bauwerksmodell durch `bim` und den Speicher. `zustand` ist `null` nur für `BauwerksmodellAnlegen`. */
export async function bauwerksmodellBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: BauwerksmodellZustand | null,
  befehl: BauwerksmodellBefehl,
): Promise<Lauf<BauwerksmodellZustand | null>> {
  const r = bauwerksmodellBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'bauwerksmodell', id: cs.bauwerksmodellId }, befehl);
  return speichern(u, e, cs, () => bauwerksmodellChangeSetAnwenden(zustand, cs));
}

export function bauwerksmodellSitzung(
  u: Umgebung,
  projektId: ProjektId,
  zustand: BauwerksmodellZustand | null,
): BauwerksmodellSitzung {
  return new Sitzung(befehlswegFuer(u), zustand, (z, b) => bauwerksmodellBefehlAnwenden(u, projektId, z, b));
}

/** Das ganze Modell; `null`, wenn es nicht (mehr) da ist. */
export async function bauwerksmodellLaden(
  speicher: Speicher,
  id: BauwerksmodellId,
): Promise<BauwerksmodellZustand | null> {
  const r = await speicher.bauwerksmodelle.laden(id);
  return r.ok ? r.wert : null;
}

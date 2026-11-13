// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppe an der Position (Ticket 71, Vertrag v1.4; C2, D-36 (4)): `KostengruppeSetzen` im LV (Form der Nummer:
// `positionsfelder.ts`). Derselbe Befehl gilt im Auftrags-LV (D-70.1); beide Handler teilen `kostengruppeWechsel`. Keine Summe ändert sich
// (A6): die Kostengruppe wirkt auf keine Summe des Kerns.

import type {
  Befehlsfehler,
  Ergebnis,
  Knoten,
  KostengruppeSetzen,
  LvChangeSet,
  LvZustand,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { ok } from './fehler';
import { positionsfeldWechsel } from './positionsfeld';
import type { Positionsfeld, Positionswechsel } from './positionsfeld';
import { kostengruppeFehler } from './positionsfelder';
import { indexVon, mitFeld } from './struktur';

const KOSTENGRUPPE: Positionsfeld<KostengruppeSetzen> = {
  name: 'eine Kostengruppe',
  feld: 'kostengruppe',
  wert: (b) => b.kostengruppe,
  formfehler: kostengruppeFehler,
  gleich: (p, b) => (p.kostengruppe ?? null) === b.kostengruppe,
  setzen: (p, b) => mitFeld(p, 'kostengruppe', b.kostengruppe),
};

/**
 * Was `KostengruppeSetzen` an der Position ändert, im LV wie im Auftrags-LV. `knotenVon` liefert den Knoten zur Kennung
 * im Baum des Aggregats.
 *
 * - Nur an einer Position: eine Gliederung oder ein Hinweistext `knotenart-unzulaessig`, eine Kennung ohne Knoten im Baum
 *   `knoten-unbekannt` (wie jeder Feldbefehl; Vertrag v1.5, D-71.3, D-95.1; Ticket 105).
 * - Form der Nummer nach `KOSTENGRUPPENNUMMER_MUSTER` (Vertrag, `kostengruppeFehler`), sonst `ungueltige-eingabe` mit
 *   `feld: 'kostengruppe'`. Ablauf: `positionsfeldWechsel` (gemeinsam mit `BauteileZuordnen`).
 * - `null` entfernt das Feld (es fehlt danach); derselbe Wert ist keine Änderung.
 */
export const kostengruppeWechsel = (
  knotenVon: (kennung: string) => Knoten | undefined,
  b: KostengruppeSetzen,
): Ergebnis<Positionswechsel, Befehlsfehler> => positionsfeldWechsel(knotenVon, b, KOSTENGRUPPE);

/** `KostengruppeSetzen` im Ausschreibungs-LV: die Knotenänderung der Position, Summen unverändert. */
export function kostengruppeSetzen(
  z: LvZustand,
  b: KostengruppeSetzen,
): Ergebnis<LvChangeSet, Befehlsfehler> {
  const lv = z.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const w = kostengruppeWechsel((i) => idx.byId.get(i), b);
  if (!w.ok) return w;
  return ok(baueChangeSet(z, w.wert === null ? {} : { geaendert: [w.wert] }));
}

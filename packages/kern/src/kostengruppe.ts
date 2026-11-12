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
  Position,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { kostengruppeFehler } from './positionsfelder';
import { indexVon, mitFeld } from './struktur';

/** Die Änderung einer Position durch einen Feldbefehl; `null`: derselbe Wert, nichts ändert sich. */
export type Positionswechsel = { readonly vorher: Position; readonly nachher: Position } | null;

/**
 * Was `KostengruppeSetzen` an der Position ändert, im LV wie im Auftrags-LV. `knotenVon` liefert den Knoten zur Kennung
 * im Baum des Aggregats.
 *
 * - Nur an einer Position. Eine Gliederung, ein Hinweistext oder eine unbekannte Kennung ist keine bekannte Position:
 *   `knoten-unbekannt` (Wortlaut des Vertrags an `KostengruppeSetzen`; D-71.3).
 * - Form der Nummer nach `KOSTENGRUPPE_FORM` (`positionsfelder.ts`), sonst `ungueltige-eingabe` mit `feld: 'kostengruppe'`.
 * - `null` entfernt das Feld (es fehlt danach); derselbe Wert ist keine Änderung.
 */
export function kostengruppeWechsel(
  knotenVon: (kennung: string) => Knoten | undefined,
  b: KostengruppeSetzen,
): Ergebnis<Positionswechsel, Befehlsfehler> {
  const k = knotenVon(b.positionId);
  if (k?.art !== 'position')
    return nein(
      'knoten-unbekannt',
      k === undefined
        ? `Position unbekannt: ${b.positionId}`
        : `Eine Kostengruppe trägt nur eine Position, nicht „${k.art}“: ${b.positionId}`,
      b.positionId,
    );
  if (b.kostengruppe !== null) {
    const f = kostengruppeFehler(b.kostengruppe);
    if (f !== null) return nein('ungueltige-eingabe', f, b.positionId, 'kostengruppe');
  }
  if ((k.kostengruppe ?? null) === b.kostengruppe) return ok(null);
  return ok({ vorher: k, nachher: mitFeld(k, 'kostengruppe', b.kostengruppe) });
}

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

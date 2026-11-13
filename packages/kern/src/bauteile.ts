// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauteilzuordnungen an der Position (Ticket 105, Vertrag v1.6 Punkt 3; X1c, D-52, D-97.7): `BauteileZuordnen` im LV. Derselbe
// Befehl gilt im Auftrags-LV (wie `KostengruppeSetzen`, D-70.1); beide Handler teilen `bauteileWechsel`. Keine Summe ändert
// sich (A6): Zuordnungen wirken auf keine Summe des Kerns. Form und Normalform: `positionsfelder.ts`.

import type {
  BauteileZuordnen,
  Befehlsfehler,
  Ergebnis,
  Knoten,
  LvChangeSet,
  LvZustand,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { ok } from './fehler';
import { positionsfeldWechsel } from './positionsfeld';
import type { Positionsfeld, Positionswechsel } from './positionsfeld';
import { bauteileFehler, bauteileGleich, positionMitBauteilen } from './positionsfelder';
import { indexVon } from './struktur';

const BAUTEILE: Positionsfeld<BauteileZuordnen> = {
  name: 'Bauteilzuordnungen',
  feld: 'bauteile',
  wert: (b) => b.bauteile,
  formfehler: bauteileFehler,
  gleich: (p, b) => bauteileGleich(p.bauteile, b.bauteile),
  setzen: (p, b) => positionMitBauteilen(p, b.bauteile),
};

/**
 * Was `BauteileZuordnen` an der Position ändert, im LV wie im Auftrags-LV. `knotenVon` liefert den Knoten zur Kennung im Baum
 * des Aggregats.
 *
 * - Wie jeder Feldbefehl (D-71.3): eine Kennung ohne Knoten `knoten-unbekannt`, eine Gliederung oder ein Hinweistext
 *   `knotenart-unzulaessig`; der Knoten wird vor dem Wert geprüft.
 * - Form der Liste nach `bauteileFehler` (GlobalId in Form, Mengenart nicht leer, kein Paar doppelt), sonst
 *   `ungueltige-eingabe` mit `feld: 'bauteile'`. Keine Prüfung gegen ein Modell (A3).
 * - Die Liste ersetzt die alte ganz; `null` und `[]` entfernen das Feld; dieselbe Liste ist keine Änderung.
 * Ablauf: `positionsfeldWechsel` (gemeinsam mit `KostengruppeSetzen`).
 */
export const bauteileWechsel = (
  knotenVon: (kennung: string) => Knoten | undefined,
  b: BauteileZuordnen,
): Ergebnis<Positionswechsel, Befehlsfehler> => positionsfeldWechsel(knotenVon, b, BAUTEILE);

/** `BauteileZuordnen` im Ausschreibungs-LV: die Knotenänderung der Position, Summen unverändert. */
export function bauteileZuordnen(z: LvZustand, b: BauteileZuordnen): Ergebnis<LvChangeSet, Befehlsfehler> {
  const lv = z.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const w = bauteileWechsel((i) => idx.byId.get(i), b);
  if (!w.ok) return w;
  return ok(baueChangeSet(z, w.wert === null ? {} : { geaendert: [w.wert] }));
}

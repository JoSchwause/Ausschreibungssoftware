// SPDX-License-Identifier: AGPL-3.0-or-later
// MengenansatzSetzen (Ticket 56, Punkt 1; Vertrag v1.3, D-22): Mengenansatz und daraus gerechnete Menge einer Position in
// einem ChangeSet. Rein (A2). Der Kern wertet den Ansatz nicht aus (A3: kein `kern → mengen`): Er prüft nur die Form
// (`mengenansatzFehler`) und dass die Menge kanonisch ist oder `null` (Lesart (b): ein Ansatz mit Fehler kommt mit
// `menge: null`). Summen wie bei `MengeAendern` (A6). Die Knotenänderung trägt die ganze Position vorher und nachher, das
// ChangeSet ist also aus sich allein umkehrbar.

import { alsMenge } from '@tethys/dezimal';
import type { Befehlsfehler, Ergebnis, LvChangeSet, LvZustand, MengenansatzSetzen } from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { mitMengenansatz } from './mengenansatz';
import { gleicherWert } from './merkmal-befehle';
import { mengenansatzFehler } from './pruefung';
import { positionAendern, positionFinden } from './summen-befehle';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/** Vorbedingungen wie `MengeAendern` (Position vorhanden, Menge kanonisch oder `null`), dazu die Form des Ansatzes. */
export function mengenansatzSetzen(z: LvZustand, b: MengenansatzSetzen): Antwort {
  const f = positionFinden(z, b.positionId);
  if (!f.ok) return f;
  if (b.menge !== null) {
    const e = alsMenge(b.menge);
    if (!e.ok) return nein('ungueltige-eingabe', e.fehler.meldung, b.positionId, 'menge');
  }
  if (b.mengenansatz !== null) {
    const form = mengenansatzFehler(b.mengenansatz);
    if (form !== null) return nein('ungueltige-eingabe', form, b.positionId, 'mengenansatz');
  }
  const { idx, position } = f.wert;
  const neu = mitMengenansatz({ ...position, menge: b.menge }, b.mengenansatz);
  if (gleicherWert(position, neu)) return ok(baueChangeSet(z, {}));
  return ok(positionAendern(z, idx, position, neu));
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Merkmale einer Position (F4, F5): Bedarf ohne/mit Gesamtbetrag, Wahl, Stundenlohn, Pauschal, einzeln kombinierbar.
// Die Eingabe der Oberfläche wird hier zu `PositionsmerkmaleSetzen`; was die Merkmale für die Summen heißen, entscheidet
// der Kern (K5), nicht die App.

import type { Bedarf, Position, PositionsmerkmaleSetzen } from '@tethys/vertrag';

/** Was der Merkmal-Dialog einstellt. */
export interface Merkmalwahl {
  readonly bedarf: Bedarf | null;
  readonly wahl: boolean;
  readonly stundenlohn: boolean;
  readonly pauschal: boolean;
}

export function merkmalwahlVon(p: Position): Merkmalwahl {
  const m = p.merkmale;
  return { bedarf: m.bedarf, wahl: m.wahl !== null, stundenlohn: m.stundenlohn, pauschal: m.pauschal };
}

/**
 * Der Befehl zur Wahl im Dialog oder `null`, wenn sich nichts ändert. Eine bestehende Wahlzuordnung (Gruppe, Variante,
 * Grundposition, z. B. aus GAEB) bleibt erhalten; eine neue Wahl hat keine Nummern und keine Grundposition (nichts
 * erfinden). Zuschlag und Zuschlagskennzeichen bleiben, wie sie sind.
 */
export function merkmaleBefehl(p: Position, w: Merkmalwahl): PositionsmerkmaleSetzen | null {
  const alt = merkmalwahlVon(p);
  if (
    alt.bedarf === w.bedarf &&
    alt.wahl === w.wahl &&
    alt.stundenlohn === w.stundenlohn &&
    alt.pauschal === w.pauschal
  )
    return null;
  return {
    art: 'PositionsmerkmaleSetzen',
    positionId: p.id,
    merkmale: {
      ...p.merkmale,
      bedarf: w.bedarf,
      wahl: w.wahl ? (p.merkmale.wahl ?? { gruppe: null, variante: null, grundpositionId: null }) : null,
      stundenlohn: w.stundenlohn,
      pauschal: w.pauschal,
    },
    zuschlag: p.zuschlag,
  };
}

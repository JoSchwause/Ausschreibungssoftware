// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: Kennzeichen „Nachtrag N01“ eines Nachtrags-LV in der LV-Liste der Projektseite.

import type { Nachtragsangaben } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { texte } from './texte';

export function NachtragKennzeichen({
  nachtrag,
}: {
  nachtrag: Nachtragsangaben | undefined;
}): ReactElement | null {
  if (nachtrag === undefined) return null;
  return (
    <span className="lv__kennzeichen" title={texte.status[nachtrag.status]}>
      {texte.kennzeichen(nachtrag.nummer)}
    </span>
  );
}

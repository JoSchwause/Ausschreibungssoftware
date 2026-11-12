// SPDX-License-Identifier: AGPL-3.0-or-later
// Verweis auf die Preisspiegel-Seite eines LV (Ticket 63): auf der LV-Seite und in der Angebotsliste (Ticket 49).
// Ein echter Link (Mittelklick öffnet einen neuen Tab), sonst ein Seitenwechsel ohne Neuladen.

import type { LeistungsverzeichnisId } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { useRoute } from '../ui/route';
import { Verweis } from '../ui/Verweis';
import { preisspiegelPfad } from './pfad';
import { texte } from './texte';

export function PreisspiegelLink({ lvId }: { lvId: LeistungsverzeichnisId }): ReactElement {
  const { gehe } = useRoute();
  const pfad = preisspiegelPfad(lvId);
  return (
    <Verweis pfad={pfad} text={texte.seite.oeffnen} gehe={gehe} className="tx-button tx-button--sekundaer" />
  );
}

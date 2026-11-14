// SPDX-License-Identifier: AGPL-3.0-or-later
// Verweis auf die Preisspiegel-Seite eines LV (Ticket 63): auf der LV-Seite und in der Angebotsliste (Ticket 49).
// Ein echter Link (Mittelklick öffnet einen neuen Tab), sonst ein Seitenwechsel ohne Neuladen. Ticket 142: in einer
// Werkzeuggruppe ein Menüpunkt, sonst ein Verweis wie eine Schaltfläche.

import { Werkzeugverweis } from '@tethys/ui-basis';
import type { LeistungsverzeichnisId } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { hrefFuer, useRoute } from '../ui/route';
import { preisspiegelPfad } from './pfad';
import { texte } from './texte';

export function PreisspiegelLink({ lvId }: { lvId: LeistungsverzeichnisId }): ReactElement | null {
  const { gehe } = useRoute();
  const pfad = preisspiegelPfad(lvId);
  return (
    <Werkzeugverweis
      href={hrefFuer(pfad)}
      onFolgen={() => {
        gehe(pfad);
      }}
    >
      {texte.seite.oeffnen}
    </Werkzeugverweis>
  );
}

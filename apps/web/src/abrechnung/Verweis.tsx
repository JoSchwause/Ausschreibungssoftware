// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstiege der Abrechnung auf der Seite des Auftrags-LV (Ticket 87); der Link selbst ist `ui/Verweis.tsx` (S8).

import type { AuftragsLeistungsverzeichnisId, ProjektId } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { Verweis } from '../ui/Verweis';
import { aufmassPfad, sollIstPfad } from './pfad';
import { texte } from './texte';

/** Die Einstiege der Abrechnung auf der Seite des Auftrags-LV (Einhängestelle Ticket 87). */
export function AbrechnungVerweise({
  projektId,
  auftragsLvId,
  gehe,
}: {
  projektId: ProjektId;
  auftragsLvId: AuftragsLeistungsverzeichnisId;
  gehe: (pfad: string) => void;
}): ReactElement {
  return (
    <>
      <Verweis
        pfad={aufmassPfad(projektId, auftragsLvId)}
        text={texte.liste.aufmass}
        gehe={gehe}
        className="tx-button tx-button--sekundaer"
      />
      <Verweis
        pfad={sollIstPfad(projektId, auftragsLvId)}
        text={texte.liste.sollIst}
        gehe={gehe}
        className="tx-button tx-button--sekundaer"
      />
    </>
  );
}

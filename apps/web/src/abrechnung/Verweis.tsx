// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein Verweis innerhalb der App (Ticket 87): normaler Link mit `href` (neuer Tab geht), ein einfacher Klick wechselt ohne
// Neuladen.

import type { AuftragsLeistungsverzeichnisId, ProjektId } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { hrefFuer } from '../ui/route';
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

export function Verweis({
  pfad,
  text,
  gehe,
  className,
}: {
  pfad: string;
  text: string;
  gehe: (pfad: string) => void;
  className?: string;
}): ReactElement {
  return (
    <a
      href={hrefFuer(pfad)}
      className={className}
      onClick={(e) => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        gehe(pfad);
      }}
    >
      {text}
    </a>
  );
}

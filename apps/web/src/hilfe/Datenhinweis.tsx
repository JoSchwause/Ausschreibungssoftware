// SPDX-License-Identifier: AGPL-3.0-or-later
// Hinweis „Wo die Daten liegen“ beim ersten Projekt (Ticket 147, E2): wo die Projekte liegen und wie man sichert, mit einem
// Verweis auf die Hilfe. In der Begrüßung immer sichtbar; auf der Projektliste mit „Hinweis ausblenden“. Das Ausblenden merkt
// sich der Browser (`localStorage`, nur Komfort): Ohne Speicher erscheint der Hinweis wieder, mehr nicht.

import { Button } from '@tethys/ui-basis';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Verweis } from '../ui/Verweis';
import { hilfePfad } from './pfad';
import { texte } from './texte';
import './hilfe.css';

const AUSGEBLENDET = 'tethys.hinweis.daten';

function ausgeblendet(): boolean {
  try {
    return window.localStorage.getItem(AUSGEBLENDET) === '1';
  } catch {
    return false;
  }
}

function ausblendenMerken(): void {
  try {
    window.localStorage.setItem(AUSGEBLENDET, '1');
  } catch {
    // nicht speicherbar: Der Hinweis erscheint beim nächsten Mal wieder.
  }
}

export function Datenhinweis({
  gehe,
  ausblendbar = false,
}: {
  gehe: (pfad: string) => void;
  /** `true`: mit „Hinweis ausblenden“; ein ausgeblendeter Hinweis erscheint nicht mehr. */
  ausblendbar?: boolean;
}): ReactElement | null {
  const t = texte.datenhinweis;
  const [weg, setWeg] = useState(() => ausblendbar && ausgeblendet());
  if (weg) return null;
  return (
    <div className="hilfe-hinweis" role="note" aria-label={t.titel}>
      <strong className="hilfe-hinweis__titel">{t.titel}</strong>
      <p>{t.text}</p>
      <p>{t.sichern}</p>
      <div className="hilfe-hinweis__fuss">
        <Verweis pfad={hilfePfad('daten')} text={t.mehr} gehe={gehe} />
        {ausblendbar ? (
          <Button
            variante="sekundaer"
            onClick={() => {
              ausblendenMerken();
              setWeg(true);
            }}
          >
            {t.ausblenden}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

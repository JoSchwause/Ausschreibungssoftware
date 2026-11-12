// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde eines Modells als Liste (Ticket 114, U5): Schwere in Worten, Meldung, bei einem Objekt ein Sprung in den Baum.

import { Button } from '@tethys/ui-basis';
import type { Pruefbefund } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { befundliste, befundzusammenfassung } from './befunde';
import { texte } from './texte';

export function BefundListe({
  befunde,
  beschriftung,
  onSprung,
}: {
  befunde: readonly Pruefbefund[];
  beschriftung: string;
  /** Ohne: kein Sprung (z. B. im Dialog des Einlesens). */
  onSprung?: (globalId: string) => void;
}): ReactElement {
  return (
    <section className="bim__befunde" aria-label={beschriftung}>
      <p>{befundzusammenfassung(befunde)}</p>
      {befunde.length > 0 ? (
        <ul>
          {befundliste(befunde).map((e, i) => (
            <li key={i} className={`bim__befund bim__befund--${e.befund.schwere}`}>
              <strong>{e.befund.schwere === 'fehler' ? 'Fehler' : 'Warnung'}:</strong> {e.befund.meldung}
              {onSprung !== undefined && e.globalId !== null ? (
                <>
                  {' '}
                  <Button
                    variante="schlicht"
                    onClick={() => {
                      if (e.globalId !== null) onSprung(e.globalId);
                    }}
                  >
                    {texte.seite.zurZeile}
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

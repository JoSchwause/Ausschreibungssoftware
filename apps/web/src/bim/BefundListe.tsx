// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde eines Modells als Liste (Ticket 114, U5): Schwere in Worten, Meldung, bei einem Objekt ein Sprung in den Baum, bei
// einer Zuordnung ein Sprung zur Position (Ticket 122, PC-a1: auch für eine hängende Zuordnung, deren Bauteil keine Zeile hat).

import { Button } from '@tethys/ui-basis';
import type { KnotenId, Pruefbefund } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { befundliste, befundzusammenfassung } from './befunde';
import { texte } from './texte';

export function BefundListe({
  befunde,
  beschriftung,
  onSprung,
  imModell,
  onPositionSprung,
}: {
  befunde: readonly Pruefbefund[];
  beschriftung: string;
  /** Ohne: kein Sprung (z. B. im Dialog des Einlesens). */
  onSprung?: (globalId: string) => void;
  /** Ticket 115: Sprung nur zu Objekten, die im Baum stehen (eine hängende Zuordnung hat keine Zeile). Ohne: alle. */
  imModell?: (globalId: string) => boolean;
  /** Ticket 122: Sprung zur Position einer Zuordnung (`ort.knotenId`). Ohne: kein Sprung zur Position. */
  onPositionSprung?: (knotenId: KnotenId) => void;
}): ReactElement {
  return (
    <section className="bim__befunde" aria-label={beschriftung}>
      <p>{befundzusammenfassung(befunde)}</p>
      {befunde.length > 0 ? (
        <ul>
          {befundliste(befunde).map((e, i) => (
            <li key={i} className={`bim__befund bim__befund--${e.befund.schwere}`}>
              <strong>{e.befund.schwere === 'fehler' ? 'Fehler' : 'Warnung'}:</strong> {e.befund.meldung}
              {onSprung !== undefined && e.globalId !== null && (imModell?.(e.globalId) ?? true) ? (
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
              {onPositionSprung !== undefined && e.knotenId !== null ? (
                <>
                  {' '}
                  <Button
                    variante="schlicht"
                    onClick={() => {
                      if (e.knotenId !== null) onPositionSprung(e.knotenId);
                    }}
                  >
                    {texte.seite.zurPosition}
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

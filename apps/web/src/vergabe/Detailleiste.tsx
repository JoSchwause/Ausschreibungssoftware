// SPDX-License-Identifier: AGPL-3.0-or-later
// Leiste unter dem Preisspiegel (Ticket 63, Punkt 3): Bieter, Position und Wert der aktiven Zelle, die Kennzeichen in
// Worten (U8, nicht nur Farbe). Der Inhalt kommt fertig aus `zellDetail`.

import type { ReactElement } from 'react';
import type { Zelldetail } from './ansicht';
import { texte } from './texte';

const LEER = '–';

export function Detailleiste({ detail }: { detail: Zelldetail | null }): ReactElement {
  const t = texte.detail;
  return (
    <section className="preisspiegel__detail" aria-label={t.leiste}>
      {detail === null ? (
        <p>{t.keine}</p>
      ) : (
        <>
          <dl>
            <dt>{t.bieter}</dt>
            <dd data-testid="detail-bieter">{detail.bieter ?? LEER}</dd>
            <dt>{t.position}</dt>
            <dd data-testid="detail-position">{detail.position === '' ? LEER : detail.position}</dd>
            <dt>{t.wert}</dt>
            <dd data-testid="detail-wert">{detail.wert === '' ? LEER : detail.wert}</dd>
          </dl>
          {detail.erklaerungen.length > 0 ? (
            <ul>
              {detail.erklaerungen.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}

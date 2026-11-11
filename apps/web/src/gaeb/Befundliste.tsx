// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde einer GAEB-Datei, nach Schwere gruppiert (Ticket 49; Q5: nichts wird still verworfen). Sie sperren nie (U5).

import type { Pruefbefund } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { befundeNachSchwere } from './gaeb';
import { texte } from './texte';

function Gruppe({ titel, befunde }: { titel: string; befunde: readonly Pruefbefund[] }): ReactElement | null {
  if (befunde.length === 0) return null;
  return (
    <section className="gaeb__gruppe">
      <h3>
        {titel} ({befunde.length})
      </h3>
      <ul>
        {befunde.map((b, i) => (
          <li key={i}>
            <span className="gaeb__code">{b.code}</span> {b.meldung}
            {b.ort.zeile === undefined ? '' : ` (${texte.befunde.ort(b.ort.zeile)})`}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Befundliste({ befunde }: { befunde: readonly Pruefbefund[] }): ReactElement {
  const g = befundeNachSchwere(befunde);
  return (
    <div className="gaeb__befunde" role="region" aria-label={texte.befunde.liste} tabIndex={0}>
      {befunde.length === 0 ? <p>{texte.befunde.keine}</p> : null}
      <Gruppe titel={texte.befunde.gruppeFehler} befunde={g.fehler} />
      <Gruppe titel={texte.befunde.gruppeWarnungen} befunde={g.warnungen} />
    </div>
  );
}

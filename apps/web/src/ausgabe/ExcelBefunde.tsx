// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde des Excel-Rundlaufs, nach Schwere gruppiert (Ticket 66). `ExcelBefund` lebt in `ausgabe` und ist kein
// `Pruefbefund`; die Darstellung folgt `gaeb/Befundliste` (gleiche Klassen), sperrt nie (U5).

import type { ExcelBefund } from '@tethys/ausgabe';
import type { ReactElement } from 'react';
import { texte } from './texte';
import '../gaeb/gaeb.css';

function Gruppe({ titel, befunde }: { titel: string; befunde: readonly ExcelBefund[] }): ReactElement | null {
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
            {b.ort.zeile === undefined ? '' : ` (${texte.einlesen.ort(b.ort.zeile)})`}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExcelBefunde({ befunde }: { befunde: readonly ExcelBefund[] }): ReactElement {
  return (
    <div className="gaeb__befunde" role="region" aria-label={texte.einlesen.befunde} tabIndex={0}>
      {befunde.length === 0 ? <p>{texte.einlesen.befundeKeine}</p> : null}
      <Gruppe titel={texte.einlesen.gruppeFehler} befunde={befunde.filter((b) => b.schwere === 'fehler')} />
      <Gruppe
        titel={texte.einlesen.gruppeWarnungen}
        befunde={befunde.filter((b) => b.schwere === 'warnung')}
      />
    </div>
  );
}

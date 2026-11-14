// SPDX-License-Identifier: AGPL-3.0-or-later
// Vorschau eines Kostenberichts (Ticket 154, E12): das Berichtsmodell, aus dem PDF und Excel entstehen, als Tabelle im
// Dialog. Zeigt dieselben fertig formatierten Texte wie der Druck (N4: formatiert hat `ausgabe`), rechnet nichts.

import type { BerichtBlock, BerichtZelle, Berichtsmodell } from '@tethys/ausgabe';
import type { ReactElement } from 'react';
import { texte } from './texte';

const zellText = (z: string | BerichtZelle): string =>
  typeof z === 'string' ? z : z.werte.map((w) => w.text).join(' ');
const zellHinweis = (z: string | BerichtZelle): string | undefined =>
  typeof z === 'string' ? undefined : z.hinweis;

function Block({ b }: { b: BerichtBlock }): ReactElement | null {
  switch (b.art) {
    case 'absatz':
      return <p className={b.klein === true ? 'kosten__vorschau-klein' : undefined}>{b.text}</p>;
    case 'liste':
      return (
        <ul>
          {b.punkte.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      );
    case 'felder':
    case 'angaben':
      return (
        <dl className="kosten__vorschau-kopf">
          {b.felder.map((f, i) => (
            <div key={i}>
              <dt>{f.bezeichnung}</dt>
              <dd>{f.wert}</dd>
            </div>
          ))}
        </dl>
      );
    case 'tabelle':
      return (
        <table className="kosten__vorschau-tabelle">
          <thead>
            <tr>
              {b.spalten.map((s, i) => (
                <th key={i} className={s.rechts === true ? 'kosten__rechts' : undefined}>
                  {s.titel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.zeilen.map((z, i) => (
              <tr key={i} className={z.fett === true ? 'kosten__vorschau-fett' : undefined}>
                {z.zellen.map((c, j) => {
                  const hinweis = zellHinweis(c);
                  return (
                    <td key={j} className={b.spalten[j]?.rechts === true ? 'kosten__rechts' : undefined}>
                      {zellText(c)}
                      {hinweis === undefined ? null : <small> ({hinweis})</small>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'balkenplan':
      return null;
  }
}

export function BerichtVorschau({ modell }: { modell: Berichtsmodell }): ReactElement {
  return (
    <section className="kosten__vorschau" aria-label={texte.ausgabe.vorschau} data-testid="kosten-vorschau">
      {modell.absender !== undefined && modell.absender.length > 0 ? (
        <p className="kosten__vorschau-absender">
          {modell.absender.map((z, i) => (
            <span key={i}>{z}</span>
          ))}
        </p>
      ) : null}
      <h3>{modell.titel}</h3>
      {modell.kopf.length > 0 ? (
        <dl className="kosten__vorschau-kopf">
          {modell.kopf.map((f, i) => (
            <div key={i}>
              <dt>{f.bezeichnung}</dt>
              <dd>{f.wert}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {modell.datum === null ? null : (
        <p className="kosten__vorschau-klein">{texte.ausgabe.stand(modell.datum)}</p>
      )}
      {modell.abschnitte.map((a, i) => (
        <div key={i}>
          {a.ueberschrift === null ? null : <h4>{a.ueberschrift}</h4>}
          {a.bloecke.map((b, j) => (
            <Block key={j} b={b} />
          ))}
        </div>
      ))}
    </section>
  );
}

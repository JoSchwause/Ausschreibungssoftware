// SPDX-License-Identifier: AGPL-3.0-or-later
// Gemeinsamer Baustein „Befunde beim Einlesen“ (E7, B-12) für die Dialoge GAEB, Angebot (X84), X31, XRechnung und IFC:
// vorn der Satz einer Abweisung, dann die Zahl der Befunde, „Nicht übernommen: …“ in einer Zeile und die übrigen Befunde
// gruppiert mit Kurztext; die Einzelheiten lassen sich aufklappen. Befunde sperren nie (U5), nichts fällt still weg (Q5).

import type { Pruefbefund } from '@tethys/vertrag';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { befundeZusammenfassen, type Befundgruppe, type Einzelheit, type Kurztexte } from './befunde';
import { texte } from './texte';
import './gaeb.css';

const t = texte.befunde;

function Gruppe({ g }: { g: Befundgruppe }): ReactElement {
  const zusatz = [
    g.werte === null ? null : `: ${g.werte}`,
    g.oz.length > 0 ? ` (${t.oz(g.oz)})` : g.anzahl > 1 ? ` (${t.vorkommen(g.anzahl)})` : null,
  ]
    .filter((s) => s !== null)
    .join('');
  return (
    <li className={`gaeb__befund gaeb__befund--${g.schwere}`}>
      {g.schwere === 'fehler' ? <strong>{t.fehler}: </strong> : null}
      {g.titel}
      {zusatz}
    </li>
  );
}

function Zeile({ e }: { e: Einzelheit }): ReactElement {
  const ort = [e.oz === null ? null : t.oz([e.oz]), e.zeile === null ? null : t.ort(e.zeile)].filter(
    (s) => s !== null,
  );
  return (
    <li className={`gaeb__befund gaeb__befund--${e.schwere}`}>
      <strong>
        {e.schwere === 'fehler' ? `${t.fehler}: ` : ''}
        {e.titel}
      </strong>
      {e.meldung === null ? null : `: ${e.meldung}`}
      {ort.length > 0 ? ` (${ort.join(' · ')})` : null}
    </li>
  );
}

export function BefundeBeimEinlesen({
  befunde,
  kurztexte,
  beschriftung = t.liste,
}: {
  befunde: readonly Pruefbefund[];
  /** Kurztext je Code; ohne: die Liste der GAEB-Leser. */
  kurztexte?: Kurztexte;
  beschriftung?: string;
}): ReactElement {
  const z = useMemo(() => befundeZusammenfassen(befunde, kurztexte), [befunde, kurztexte]);
  const gesamt = z.fehler + z.warnungen;
  return (
    <div className="gaeb__befunde" role="region" aria-label={beschriftung} tabIndex={0}>
      {z.abweisung === null ? null : (
        <p className="gaeb__abweisung" data-testid="abweisung">
          {z.abweisung}
        </p>
      )}
      <p className="gaeb__befundzahl" data-testid="befundzahl">
        {gesamt === 0 ? t.keine : t.anzahl(z.fehler, z.warnungen)}
      </p>
      {z.nichtUebernommen.length > 0 ? (
        <p data-testid="nicht-uebernommen">
          <strong>{t.nichtUebernommen}:</strong> {z.nichtUebernommen.join(', ')}
        </p>
      ) : null}
      {z.gruppen.length > 0 ? (
        <ul className="gaeb__gruppen" aria-label={t.zusammenfassung}>
          {z.gruppen.map((g, i) => (
            <Gruppe key={i} g={g} />
          ))}
        </ul>
      ) : null}
      {z.einzelheiten.length > 0 ? (
        <details className="gaeb__einzelheiten">
          <summary>{t.einzelheiten(z.einzelheiten.length)}</summary>
          <ul aria-label={t.einzelheitenListe}>
            {z.einzelheiten.map((e, i) => (
              <Zeile key={i} e={e} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 1: die Rechnungen eines Auftrags-LV als Tabelle: Nummer, Art, Eingang, Rechnungsnummer des
// Auftragnehmers, gefordert brutto, geprüfter Zahlbetrag (freigegeben: der eingefrorene, sonst der gerechnete) und Status.
// Zahlen nur hier am Rand de-DE formatiert (N4).

import type { Rechnung } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { datumDe } from '../lv/kopfdaten';
import { formatiereBetragDe } from '../lv/zahlen';
import { rechnungPfad } from './pfad';
import { gepruefterZahlbetrag } from './pruefung';
import type { Rechnungsstand } from './rechnungen';
import { Verweis } from './Verweis';
import { texte } from './texte';

const t = texte.liste;

export function Rechnungsliste({
  rechnungen,
  stand,
  gehe,
}: {
  rechnungen: readonly Rechnung[];
  stand: Rechnungsstand;
  gehe: (pfad: string) => void;
}): ReactElement {
  if (rechnungen.length === 0) return <p className="rechnung__leer">{t.leer}</p>;
  return (
    <table className="rechnung__tabelle" aria-label={t.beschriftung}>
      <thead>
        <tr>
          <th scope="col">{t.nummer}</th>
          <th scope="col">{t.art}</th>
          <th scope="col">{t.eingang}</th>
          <th scope="col">{t.rechnungsnummer}</th>
          <th scope="col">{t.gefordertBrutto}</th>
          <th scope="col">{t.zahlbetrag}</th>
          <th scope="col">{t.status}</th>
        </tr>
      </thead>
      <tbody>
        {rechnungen.map((r) => {
          const brutto = r.gefordert?.brutto ?? null;
          return (
            <tr key={r.id}>
              <th scope="row">
                <Verweis
                  pfad={rechnungPfad(r.projektId, r.auftragsLvId, r.id)}
                  text={String(r.nummer)}
                  aria-label={t.oeffnen(r.nummer)}
                  gehe={gehe}
                />
              </th>
              <td>{texte.art[r.art]}</td>
              <td>{r.eingang === null ? '–' : datumDe(r.eingang)}</td>
              <td>{r.rechnungsnummerAuftragnehmer ?? '–'}</td>
              <td className="rechnung__zahl">{brutto === null ? '–' : formatiereBetragDe(brutto)}</td>
              <td className="rechnung__zahl" data-testid="zahlbetrag">
                {formatiereBetragDe(gepruefterZahlbetrag(r, stand, rechnungen))}
              </td>
              <td data-testid="status">{r.freigabe === null ? t.offen : t.freigegeben}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

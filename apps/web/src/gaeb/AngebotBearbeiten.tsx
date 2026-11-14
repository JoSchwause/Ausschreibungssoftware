// SPDX-License-Identifier: AGPL-3.0-or-later
// Inhalt der Ansicht „Angebot bearbeiten“ im Dialog „Angebote“ (Ticket 149; E8, B-15): je Position EP (an einer
// Zuschlagsposition der Satz) und „nicht angeboten“, dazu der Nachlass des Angebots. Die Felder sind Text (U5); was gesendet
// wird, bestimmt `entwurfsbefehle`. Tastatur: Tab geht durch die Felder, Enter speichert (U3).

import { formatiereMengeDe } from '@tethys/dezimal';
import { Auswahl, Eingabefeld } from '@tethys/ui-basis';
import type { Gesamtsummen, LvZustand } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { formatiereBetragDe } from '../lv/zahlen';
import { ozText } from '../lv/oztext';
import { positionenInReihenfolge, type Angebotsentwurf, type Nachlassart } from './angebotEntwurf';
import { texte } from './texte';

const t = texte.bearbeiten;

export function AngebotBearbeiten({
  lv,
  entwurf,
  fehler,
  summen,
  onEntwurf,
  onSpeichern,
}: {
  lv: LvZustand;
  entwurf: Angebotsentwurf;
  fehler: ReadonlyMap<string, string>;
  /** Die gespeicherten Summen des Angebots. */
  summen: Gesamtsummen;
  onEntwurf: (e: Angebotsentwurf) => void;
  onSpeichern: () => void;
}): ReactElement {
  const positionen = positionenInReihenfolge(lv);
  const nachlassMeldung = fehler.get('nachlass');
  return (
    <form
      className="gaeb__angebot"
      onSubmit={(e) => {
        e.preventDefault();
        onSpeichern();
      }}
    >
      <p data-testid="angebotssummen">
        {t.summen(
          formatiereBetragDe(summen.netto),
          formatiereBetragDe(summen.nettoNachNachlass),
          formatiereBetragDe(summen.brutto),
        )}
      </p>
      <div className="gaeb__nachlass">
        <Auswahl
          label={t.nachlassart}
          kompakt
          optionen={[
            { wert: 'kein', label: t.keinNachlass },
            { wert: 'prozent', label: t.nachlassProzent },
            { wert: 'betrag', label: t.nachlassBetrag },
          ]}
          wert={entwurf.nachlassart}
          onWertChange={(w) => {
            onEntwurf({ ...entwurf, nachlassart: w as Nachlassart });
          }}
        />
        {entwurf.nachlassart === 'kein' ? null : (
          <Eingabefeld
            label={t.nachlass}
            kompakt
            value={entwurf.nachlass}
            onWertChange={(w) => {
              onEntwurf({ ...entwurf, nachlass: w });
            }}
            {...(nachlassMeldung === undefined ? {} : { meldung: nachlassMeldung })}
          />
        )}
      </div>
      {fehler.size > 0 ? <p role="alert">{t.fehlerHinweis(fehler.size)}</p> : null}
      <div className="gaeb__preise">
        <table className="gaeb__tabelle" aria-label={t.tabelle}>
          <thead>
            <tr>
              <th scope="col">{t.oz}</th>
              <th scope="col">{t.kurztext}</th>
              <th scope="col">{t.menge}</th>
              <th scope="col">{t.einheit}</th>
              <th scope="col">{t.preis}</th>
              <th scope="col">{t.nichtAngeboten}</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p) => {
              const z = entwurf.zeilen.get(p.id);
              if (z === undefined) return null;
              const oz = ozText(p);
              const meldung = fehler.get(p.id);
              const setze = (teil: Partial<typeof z>): void => {
                onEntwurf({ ...entwurf, zeilen: new Map(entwurf.zeilen).set(p.id, { ...z, ...teil }) });
              };
              return (
                <tr key={p.id}>
                  <td>{oz}</td>
                  <td className="gaeb__kurztext">{p.kurztext}</td>
                  <td>{p.menge === null ? '' : formatiereMengeDe(p.menge)}</td>
                  <td>{p.einheit ?? ''}</td>
                  <td>
                    <input
                      className="gaeb__preis"
                      aria-label={p.zuschlag === null ? t.preisFuer(oz) : t.satzFuer(oz)}
                      {...(p.zuschlag === null ? {} : { placeholder: '%', title: t.satzHinweis })}
                      value={z.text}
                      disabled={z.nichtAngeboten}
                      aria-invalid={meldung === undefined ? undefined : true}
                      onChange={(e) => {
                        setze({ text: e.target.value });
                      }}
                    />
                    {meldung === undefined ? null : <small className="gaeb__feldmeldung">{meldung}</small>}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={t.nichtAngebotenFuer(oz)}
                      checked={z.nichtAngeboten}
                      onChange={(e) => {
                        setze({ nichtAngeboten: e.target.checked });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="submit" hidden />
    </form>
  );
}

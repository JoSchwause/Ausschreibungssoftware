// SPDX-License-Identifier: AGPL-3.0-or-later
// Inhalt der Ansicht „Angebot bearbeiten“ im Dialog „Angebote“ (Ticket 149; E8, B-15): die Preise im gemeinsamen Grid
// (U2, U3; Review Welle 7, SB3) mit Zellnavigation, Bearbeiten wie im LV und Einfügen einer Spalte aus einer
// Tabellenkalkulation; schreibgeschützt bis auf die Spalte „EP“. Ein geleerter EP heißt „nicht angeboten“. Die Sätze der
// Zuschlagspositionen und der Nachlass stehen als Felder darunter (U5: Text, was gesendet wird, bestimmt
// `entwurfsbefehle`). Gespeichert wird mit „Änderungen speichern“ als ein Undo-Schritt.

import { Auswahl, Eingabefeld } from '@tethys/ui-basis';
import { LvGrid } from '@tethys/ui-grid';
import type { Gesamtsummen, LvZustand } from '@tethys/vertrag';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { ozText } from '../lv/oztext';
import { formatiereBetragDe, gridZahlen } from '../lv/zahlen';
import { type Angebotsentwurf, type Nachlassart } from './angebotEntwurf';
import { ANGEBOTSSPALTEN, angebotsAnsicht, entwurfMitPreisen, zuschlagspositionen } from './angebotsgrid';
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
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(() => new Set());
  const ansicht = useMemo(() => angebotsAnsicht(lv, entwurf, zugeklappt), [lv, entwurf, zugeklappt]);
  const zuschlaege = useMemo(() => zuschlagspositionen(lv), [lv]);
  const nachlassMeldung = fehler.get('nachlass');
  return (
    <div className="gaeb__angebot">
      <p data-testid="angebotssummen">
        {t.summen(
          formatiereBetragDe(summen.netto),
          formatiereBetragDe(summen.nettoNachNachlass),
          formatiereBetragDe(summen.brutto),
        )}
      </p>
      {fehler.size > 0 ? <p role="alert">{t.fehlerHinweis(fehler.size)}</p> : null}
      <p className="gaeb__hinweis">{t.gridHinweis}</p>
      <div className="gaeb__preise">
        <LvGrid
          ansicht={ansicht}
          spalten={ANGEBOTSSPALTEN}
          zahlen={gridZahlen}
          beschriftung={t.tabelle}
          ozMaske={lv.leistungsverzeichnis.ozMaske}
          spaltenbreitenSchluessel="angebot"
          schreibgeschuetzt
          onEinheitspreise={(befehle) => {
            onEntwurf(entwurfMitPreisen(lv, entwurf, befehle));
          }}
          onAufklappen={(knotenId, auf) => {
            setZugeklappt((alt) => {
              const neu = new Set(alt);
              if (auf) neu.delete(knotenId);
              else neu.add(knotenId);
              return neu;
            });
          }}
        />
      </div>
      <form
        className="gaeb__angebotsfelder"
        onSubmit={(e) => {
          e.preventDefault();
          onSpeichern();
        }}
      >
        {zuschlaege.length > 0 ? (
          <fieldset className="gaeb__zuschlaege">
            <legend>{t.zuschlaege}</legend>
            {zuschlaege.map((p) => {
              const z = entwurf.zeilen.get(p.id);
              if (z === undefined) return null;
              const oz = ozText(p);
              const meldung = fehler.get(p.id);
              const setze = (teil: Partial<typeof z>): void => {
                onEntwurf({ ...entwurf, zeilen: new Map(entwurf.zeilen).set(p.id, { ...z, ...teil }) });
              };
              return (
                <div key={p.id} className="gaeb__zuschlag">
                  <span>
                    {oz} {p.kurztext}
                  </span>
                  <input
                    className="gaeb__preis"
                    aria-label={t.satzFuer(oz)}
                    placeholder="%"
                    title={t.satzHinweis}
                    value={z.text}
                    disabled={z.nichtAngeboten}
                    aria-invalid={meldung === undefined ? undefined : true}
                    onChange={(e) => {
                      setze({ text: e.target.value });
                    }}
                  />
                  <label>
                    <input
                      type="checkbox"
                      aria-label={t.nichtAngebotenFuer(oz)}
                      checked={z.nichtAngeboten}
                      onChange={(e) => {
                        setze({ nichtAngeboten: e.target.checked });
                      }}
                    />
                    <span aria-hidden="true">{t.nichtAngeboten}</span>
                  </label>
                  {meldung === undefined ? null : <small className="gaeb__feldmeldung">{meldung}</small>}
                </div>
              );
            })}
          </fieldset>
        ) : null}
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
        <button type="submit" hidden />
      </form>
    </div>
  );
}

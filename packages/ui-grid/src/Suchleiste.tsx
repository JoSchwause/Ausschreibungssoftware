// SPDX-License-Identifier: AGPL-3.0-or-later
// Leiste „Suchen und filtern“ über dem LV-Grid (Ticket 156). Reine Darstellung: Anfrage, Filter und Treffer gehören dem
// Grid. Offen nach Strg+F; bei aktivem Filter bleibt sie als Zeile „Gefiltert: …“ mit „Filter aufheben“ stehen, auch wenn
// die Suche geschlossen ist (der Filter ist immer sichtbar und mit einem Klick aufgehoben).

import { Button, Icon } from '@tethys/ui-basis';
import type { KeyboardEvent, ReactElement, RefObject } from 'react';
import { suchleistenAktion } from './kuerzel';
import { MERKMALFILTER, ZEILENARTEN, filterAktiv, filterText } from './suche';
import type { Merkmalfilter, Zeilenart, Zeilenfilter } from './suche';
import { suchtexte } from './texte';

export interface SuchleisteProps {
  readonly offen: boolean;
  readonly anfrage: string;
  /** Stand der Suche, z. B. „3 von 12“ oder „Keine Treffer.“; `null` ohne Anfrage. */
  readonly stand: string | null;
  readonly filter: Zeilenfilter;
  /** Stand des Filters, z. B. „12 von 340 Zeilen“. */
  readonly filterStand: string;
  readonly eingabe: RefObject<HTMLInputElement | null>;
  readonly onAnfrage: (text: string) => void;
  readonly onWeiter: () => void;
  readonly onZurueck: () => void;
  readonly onSchliessen: () => void;
  readonly onFilter: (f: Zeilenfilter) => void;
}

const ALLE = '';

export function Suchleiste(p: SuchleisteProps): ReactElement | null {
  const gefiltert = filterAktiv(p.filter);
  if (!p.offen && !gefiltert) return null;

  // Die Tasten kommen aus `GRID_KUERZEL` (über `suchleistenAktion`), kein zweites Verzeichnis.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const aktion = suchleistenAktion(e, e.target === p.eingabe.current);
    if (aktion === null || (aktion === 'abbrechen' && !p.offen)) return;
    e.preventDefault();
    if (aktion === 'abbrechen') p.onSchliessen();
    else if (aktion === 'treffer-weiter') p.onWeiter();
    else if (aktion === 'treffer-zurueck') p.onZurueck();
    else {
      // Strg+F in der Leiste: zurück ins Suchfeld statt in die Suche des Browsers.
      p.eingabe.current?.focus();
      p.eingabe.current?.select();
    }
  };
  const aufheben = (
    <Button
      variante="sekundaer"
      groesse="sm"
      onClick={() => {
        p.onFilter({ art: null, merkmal: null, ohnePreis: false });
      }}
    >
      {suchtexte.filterAufheben}
    </Button>
  );

  return (
    <div className="tx-grid__suche" role="search" aria-label={suchtexte.leiste} onKeyDown={onKeyDown}>
      {p.offen ? (
        <>
          <input
            ref={p.eingabe}
            type="search"
            className="tx-grid__suchfeld"
            aria-label={suchtexte.suchfeld}
            placeholder={suchtexte.platzhalter}
            value={p.anfrage}
            onChange={(e) => {
              p.onAnfrage(e.target.value);
            }}
          />
          <span className="tx-grid__suchstand" aria-hidden={p.stand === null ? true : undefined}>
            {p.stand ?? ''}
          </span>
          <Button variante="sekundaer" groesse="sm" aria-label={suchtexte.voriger} onClick={p.onZurueck}>
            <Icon name="pfeilOben" groesse={14} />
          </Button>
          <Button variante="sekundaer" groesse="sm" aria-label={suchtexte.naechster} onClick={p.onWeiter}>
            <Icon name="pfeilUnten" groesse={14} />
          </Button>
          <label className="tx-grid__filterwahl">
            <span>{suchtexte.art}</span>
            <select
              value={p.filter.art ?? ALLE}
              onChange={(e) => {
                const art = ZEILENARTEN.find(([a]) => a === e.target.value)?.[0] ?? null;
                p.onFilter({ ...p.filter, art: art satisfies Zeilenart | null });
              }}
            >
              <option value={ALLE}>{suchtexte.alleArten}</option>
              {ZEILENARTEN.map(([a, text]) => (
                <option key={a} value={a}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="tx-grid__filterwahl">
            <span>{suchtexte.merkmal}</span>
            <select
              value={p.filter.merkmal ?? ALLE}
              onChange={(e) => {
                const merkmal = MERKMALFILTER.find(([m]) => m === e.target.value)?.[0] ?? null;
                p.onFilter({ ...p.filter, merkmal: merkmal satisfies Merkmalfilter | null });
              }}
            >
              <option value={ALLE}>{suchtexte.alleMerkmale}</option>
              {MERKMALFILTER.map(([m, text]) => (
                <option key={m} value={m}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="tx-grid__filterwahl">
            <input
              type="checkbox"
              checked={p.filter.ohnePreis}
              onChange={(e) => {
                p.onFilter({ ...p.filter, ohnePreis: e.target.checked });
              }}
            />
            <span>{suchtexte.ohnePreis}</span>
          </label>
        </>
      ) : null}
      {gefiltert ? (
        <span className="tx-grid__filterstand">
          {suchtexte.gefiltert}: {filterText(p.filter)} · {p.filterStand}
        </span>
      ) : null}
      {gefiltert ? aufheben : null}
      {p.offen ? (
        <Button
          variante="sekundaer"
          groesse="sm"
          className="tx-grid__suche-zu"
          aria-label={suchtexte.schliessen}
          onClick={p.onSchliessen}
        >
          <Icon name="schliessen" groesse={14} />
        </Button>
      ) : null}
    </div>
  );
}

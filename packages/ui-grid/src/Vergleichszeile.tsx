// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine Zeile des Vergleichsgrids (Körper oder Summenzeile). Reine Darstellung: Zustand und Ereignisse gehören dem
// Grid (Delegation am Wurzelelement). Memoisiert, damit beim Scrollen nur neue Zeilen gerendert werden.

import { memo } from 'react';
import type { ReactElement } from 'react';
import { Baumeinzug } from './Baumeinzug';
import { kennzeichenText, zellbeschreibung } from './vergleich';
import type { KennzeichenText, VergleichsSpalte, VergleichsZelle, VergleichsZeile } from './vergleichTypen';

/** Nur Kennzeichen aus Kleinbuchstaben, Ziffern und Bindestrich werden zur CSS-Klasse. */
const KLASSENTAUGLICH = /^[a-z0-9-]+$/;

export interface VergleichszeileProps {
  /** Eine Zeile des Baums oder (ohne Baumangaben) eine Summenzeile. */
  readonly zellen: Readonly<Record<string, VergleichsZelle | undefined>>;
  readonly baum: Pick<VergleichsZeile, 'art' | 'tiefe' | 'hatUnterknoten' | 'aufgeklappt'> | null;
  readonly index: number;
  readonly ariaZeile: number;
  /** Abstand vom Anfang des Körpers; `null` für eine Summenzeile (sie steht im Fluss des Fußes). */
  readonly versatz: number | null;
  readonly hoehe: number;
  readonly vorlage: string;
  readonly breite: number;
  readonly spalten: readonly VergleichsSpalte[];
  /** Linker Versatz der fixierten Spalten, `null` für mitscrollende. */
  readonly versaetze: readonly (number | null)[];
  readonly baumspalte: string | undefined;
  /** Aktive Zelle in dieser Zeile (bekommt `tabindex="0"`), sonst `null`. */
  readonly aktiv: string | null;
  /** Ausgewählte Spalten dieser Zeile als Index-Spanne, sonst `null`. */
  readonly auswahl: readonly [number, number] | null;
  readonly kennzeichenTexte: Readonly<Record<string, KennzeichenText>> | undefined;
  /** Präfix für die Kennungen der Zellbeschreibungen. */
  readonly idPraefix: string;
}

function VergleichszeileKomponente(props: VergleichszeileProps): ReactElement {
  const { zellen, baum, index, ariaZeile, versatz, hoehe, vorlage, breite, spalten, versaetze } = props;
  const { baumspalte, aktiv, auswahl, kennzeichenTexte, idPraefix } = props;
  const letzteFixierte = versaetze.reduce<number>((l, v, i) => (v === null ? l : i), -1);

  const klassen = ['tx-grid__zeile'];
  if (baum) klassen.push(`tx-grid__zeile--${baum.art}`);
  else klassen.push('tx-grid__zeile--summe');

  return (
    <div
      role="row"
      className={klassen.join(' ')}
      data-i={index}
      aria-rowindex={ariaZeile}
      aria-level={baum ? baum.tiefe + 1 : undefined}
      aria-expanded={baum?.hatUnterknoten ? baum.aufgeklappt : undefined}
      style={{
        height: hoehe,
        width: '100%',
        minWidth: breite,
        gridTemplateColumns: vorlage,
        ...(versatz === null ? {} : { transform: `translateY(${String(versatz)}px)` }),
      }}
    >
      {spalten.map((spalte, si) => {
        const zelle = Object.hasOwn(zellen, spalte.id) ? zellen[spalte.id] : undefined;
        const kennzeichen = zelle?.kennzeichen ?? [];
        const beschreibung = zelle ? zellbeschreibung(zelle, kennzeichenTexte) : '';
        const beschreibungsId = `${idPraefix}-${String(index)}-${String(si)}`;
        const links = versaetze[si] ?? null;
        const ausgewaehlt = auswahl !== null && si >= auswahl[0] && si <= auswahl[1];

        const z = ['tx-grid__zelle'];
        if (spalte.ausrichtung === 'rechts' || spalte.ausrichtung === 'mitte') {
          z.push(`tx-grid__zelle--${spalte.ausrichtung}`);
        }
        if (links !== null) z.push('tx-grid__zelle--fixiert');
        if (si === letzteFixierte) z.push('tx-grid__zelle--fixiert-letzte');
        if (aktiv === spalte.id) z.push('tx-grid__zelle--aktiv');
        if (ausgewaehlt) z.push('tx-grid__zelle--ausgewaehlt');
        for (const k of kennzeichen) if (KLASSENTAUGLICH.test(k)) z.push(`tx-grid__zelle--${k}`);

        return (
          <div
            key={spalte.id}
            role="gridcell"
            className={z.join(' ')}
            data-spalte={spalte.id}
            aria-colindex={si + 1}
            aria-readonly
            aria-selected={ausgewaehlt}
            tabIndex={aktiv === spalte.id ? 0 : -1}
            aria-describedby={beschreibung === '' ? undefined : beschreibungsId}
            title={beschreibung === '' ? undefined : beschreibung}
            style={links === null ? undefined : { left: links }}
          >
            {baum && spalte.id === baumspalte ? (
              <Baumeinzug
                tiefe={baum.tiefe}
                hatUnterknoten={baum.hatUnterknoten}
                aufgeklappt={baum.aufgeklappt}
              />
            ) : null}
            {kennzeichen.length > 0 ? (
              <span className="tx-grid__kennzeichenliste" aria-hidden="true">
                {kennzeichen.map((k) => (
                  <span
                    key={k}
                    className={
                      KLASSENTAUGLICH.test(k)
                        ? `tx-grid__kennzeichen tx-grid__kennzeichen--${k}`
                        : 'tx-grid__kennzeichen'
                    }
                    data-kennzeichen={k}
                  >
                    {kennzeichenText(k, kennzeichenTexte).symbol}
                  </span>
                ))}
              </span>
            ) : null}
            <span className="tx-grid__text">{zelle?.text ?? ''}</span>
            {beschreibung === '' ? null : (
              <span id={beschreibungsId} className="tx-grid__nur-sr">
                {beschreibung}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const Vergleichszeile = memo(VergleichszeileKomponente);

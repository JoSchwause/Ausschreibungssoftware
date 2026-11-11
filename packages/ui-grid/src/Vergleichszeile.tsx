// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine Zeile des Vergleichsgrids (Körper oder Summenzeile). Reine Darstellung: Zustand und Ereignisse gehören dem
// Grid (Delegation am Wurzelelement). Memoisiert, damit beim Scrollen nur neue Zeilen gerendert werden.
//
// Schnelles Wischen montiert je Bild viele neue Zeilen; die Kosten wachsen mit den Elementen und Attributen je Zelle
// (Ticket 74, D-60.10). Deshalb trägt eine Zelle nur sich, ihren Text und je Kennzeichen eine Marke; die Beschreibung
// der Kennzeichen steht im `title` (Tooltip und zugängliche Beschreibung), `aria-readonly` steht nur am Grid.

import { Fragment, memo } from 'react';
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
  /** Feste Klassen je Spalte (Ausrichtung, fixiert), einmal je Grid berechnet. */
  readonly zellklassen: readonly string[];
  /** Indizes der gerenderten Spalten, aufsteigend (waagerechte Virtualisierung); Lücken füllt ein Platzhalter. */
  readonly sichtbar: readonly number[];
  readonly baumspalte: string | undefined;
  /** Aktive Zelle in dieser Zeile (bekommt `tabindex="0"`), sonst `null`. */
  readonly aktiv: string | null;
  /** Ausgewählte Spalten dieser Zeile als Index-Spanne, sonst `null`. */
  readonly auswahl: readonly [number, number] | null;
  readonly kennzeichenTexte: Readonly<Record<string, KennzeichenText>> | undefined;
}

function VergleichszeileKomponente(props: VergleichszeileProps): ReactElement {
  const { zellen, baum, index, ariaZeile, versatz, hoehe, vorlage, breite, spalten, versaetze } = props;
  const { zellklassen, sichtbar, baumspalte, aktiv, auswahl, kennzeichenTexte } = props;

  return (
    <div
      role="row"
      className={baum ? `tx-grid__zeile tx-grid__zeile--${baum.art}` : 'tx-grid__zeile tx-grid__zeile--summe'}
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
      {sichtbar.map((si, k) => {
        const spalte = spalten[si];
        if (spalte === undefined) return null;
        const vorher = k === 0 ? -1 : (sichtbar[k - 1] ?? -1);
        const luecke =
          si - vorher > 1 ? (
            <div
              key={`luecke-${String(si)}`}
              className="tx-grid__luecke"
              aria-hidden="true"
              style={{ gridColumn: `${String(vorher + 2)} / ${String(si + 1)}` }}
            />
          ) : null;
        const zelle = Object.hasOwn(zellen, spalte.id) ? zellen[spalte.id] : undefined;
        const kennzeichen = zelle?.kennzeichen ?? [];
        const beschreibung = zelle ? zellbeschreibung(zelle, kennzeichenTexte) : '';
        const links = versaetze[si] ?? null;
        const ausgewaehlt = auswahl !== null && si >= auswahl[0] && si <= auswahl[1];

        let klassen = zellklassen[si] ?? 'tx-grid__zelle';
        if (aktiv === spalte.id) klassen += ' tx-grid__zelle--aktiv';
        if (ausgewaehlt) klassen += ' tx-grid__zelle--ausgewaehlt';
        for (const kz of kennzeichen) if (KLASSENTAUGLICH.test(kz)) klassen += ` tx-grid__zelle--${kz}`;

        return (
          <Fragment key={spalte.id}>
            {luecke}
            <div
              role="gridcell"
              className={klassen}
              data-spalte={spalte.id}
              aria-colindex={si + 1}
              aria-selected={ausgewaehlt}
              tabIndex={aktiv === spalte.id ? 0 : -1}
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
              {kennzeichen.map((kz) => (
                <span
                  key={kz}
                  className={
                    KLASSENTAUGLICH.test(kz)
                      ? `tx-grid__kennzeichen tx-grid__kennzeichen--${kz}`
                      : 'tx-grid__kennzeichen'
                  }
                  data-kennzeichen={kz}
                  aria-hidden="true"
                >
                  {kennzeichenText(kz, kennzeichenTexte).symbol}
                </span>
              ))}
              <span className="tx-grid__text">{zelle?.text ?? ''}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export const Vergleichszeile = memo(VergleichszeileKomponente);

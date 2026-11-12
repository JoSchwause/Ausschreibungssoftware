// SPDX-License-Identifier: AGPL-3.0-or-later
// Darstellung der Balkenspalte im Vergleichsgrid (Ticket 96): die Zeitachse im Kopf und die Balkenzelle. Die Lagen
// rechnet `zeitleiste.ts`; hier entstehen nur Elemente. Was für alle Zeilen gleich ist (Achse, Abschnitte des Kopfes,
// das Raster aus freien Tagen und Markierungen), entsteht einmal je Spalte (`balkenspaltenbild`), nicht je Zeile.
//
// Leistung (Q4): Eine Balkenzelle hat eine feste Zahl Elemente, gleich wie viele freie Tage die Achse hat. Das Raster
// ist ein SVG mit einem Pfad für alle freien Tage und einem je Art der Markierungen; das Element dafür entsteht einmal
// je Spalte und wird in jede Zeile gehängt. Der Balken ist ein Element, sein Fortschritt eine Farbfläche darin.

import type { CSSProperties, ReactElement } from 'react';
import { texte } from './texte';
import { kennzeichenText } from './vergleich';
import type { KennzeichenText, VergleichsZelle, Zeitleiste } from './vergleichTypen';
import { balkenLage, balkenName, randhinweise, zeitleistenbild } from './zeitleiste';
import type { Achse, Balkenlage, Strecke, Zeitleistenbild } from './zeitleiste';

/** Nur Arten aus Kleinbuchstaben, Ziffern und Bindestrich werden zur CSS-Klasse (wie bei den Kennzeichen). */
const KLASSENTAUGLICH = /^[a-z0-9-]+$/;
/** Abstand der Beschriftung rechts vom Balken und Platz einer Randmarke, in Pixeln (passend zu `grid.css`). */
const ABSTAND = 6;
const RANDMARKE = 22;
/** Halbe Breite der Raute eines Meilensteins (12 px Kante, um 45° gedreht), in Pixeln. */
const HALBE_RAUTE = 9;

/** Eine Balkenspalte, fertig zum Zeichnen: einmal je Spalte gerechnet und an alle Zeilen gereicht. */
export interface Balkenspaltenbild extends Zeitleistenbild {
  /** Freie Tage und Markierungen als ein SVG-Element für jede Zeile und den Kopf; `null` ohne beides. */
  readonly raster: ReactElement | null;
}

function markierungsklasse(art: string, basis: string): string {
  return KLASSENTAUGLICH.test(art) ? `${basis} ${basis}--${art}` : basis;
}

const zahl = (n: number): string => String(Math.round(n * 100) / 100);

export function balkenspaltenbild(z: Zeitleiste): Balkenspaltenbild {
  const bild = zeitleistenbild(z);
  const { breite } = bild.achse;
  // Höhe 1, gestreckt auf die Höhe der Zeile bzw. des Kopfes (`preserveAspectRatio="none"`); waagerecht 1 : 1.
  const streifen = bild.freieTage
    .map((s) => `M${zahl(s.links)} 0h${zahl(s.breite)}v1h-${zahl(s.breite)}z`)
    .join('');
  const arten = [...new Set(bild.markierungen.map((m) => m.art))];
  const linien = arten.map((art) => ({
    art,
    pfad: bild.markierungen
      .filter((m) => m.art === art)
      .map((m) => `M${zahl(m.links)} 0V1`)
      .join(''),
  }));
  const raster =
    streifen === '' && linien.length === 0 ? null : (
      <svg
        className="tx-grid__zeitraster"
        width={breite}
        viewBox={`0 0 ${zahl(breite)} 1`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {streifen === '' ? null : <path className="tx-grid__freie-tage" d={streifen} />}
        {linien.map((l) => (
          <path key={l.art} className={markierungsklasse(l.art, 'tx-grid__markierung')} d={l.pfad} />
        ))}
      </svg>
    );
  return { ...bild, raster };
}

/** Inhalt der Kopfzelle einer Balkenspalte: Abschnitte oben und unten, Raster, Fähnchen der Markierungen. */
export function Zeitkopf(props: {
  readonly bild: Balkenspaltenbild;
  /** Kennung der versteckten Beschreibung der Markierungen (für `aria-describedby` der Kopfzelle). */
  readonly beschreibungsId: string;
}): ReactElement {
  const { bild, beschreibungsId } = props;
  const lageOben = bild.unterkopf === null ? 'voll' : 'oben';
  return (
    <>
      <div className="tx-grid__zeitkopf" aria-hidden="true">
        {bild.raster}
        {bild.kopf.map((a, i) => (
          <div
            key={`k${String(i)}`}
            className={`tx-grid__zeitabschnitt tx-grid__zeitabschnitt--${lageOben}`}
            data-zeitabschnitt="kopf"
            title={a.text}
            style={{ left: a.links, width: a.breite }}
          >
            {a.text}
          </div>
        ))}
        {bild.unterkopf?.map((a, i) => (
          <div
            key={`u${String(i)}`}
            className="tx-grid__zeitabschnitt tx-grid__zeitabschnitt--unten"
            data-zeitabschnitt="unterkopf"
            title={a.text}
            style={{ left: a.links, width: a.breite }}
          >
            {a.text}
          </div>
        ))}
        {bild.markierungen.map((m, i) => (
          <div
            key={`m${String(i)}`}
            className={markierungsklasse(m.art, 'tx-grid__zeitmarke')}
            data-markierung={m.art}
            title={m.beschreibung}
            style={{ left: m.links }}
          />
        ))}
      </div>
      {bild.markierungen.length === 0 ? null : (
        <span id={beschreibungsId} className="tx-grid__nur-sr">
          {`${texte.markierungen}: ${bild.markierungen.map((m) => m.beschreibung).join('; ')}`}
        </span>
      )}
    </>
  );
}

export interface BalkenzelleProps {
  readonly zelle: VergleichsZelle | undefined;
  readonly bild: Balkenspaltenbild;
  /** Klassen der Zelle wie bei jeder Zelle (fest, aktiv, ausgewählt, Kennzeichen). */
  readonly klassen: string;
  readonly spalte: string;
  readonly spaltenIndex: number;
  readonly aktiv: boolean;
  readonly ausgewaehlt: boolean;
  /** Beschreibung der Zelle aus Kennzeichen und Tooltip (`title`), leer ohne. */
  readonly beschreibung: string;
  /** Linker Versatz, wenn die Spalte fixiert ist. */
  readonly links: number | null;
  readonly kennzeichenTexte: Readonly<Record<string, KennzeichenText>> | undefined;
}

/**
 * Eine Zelle der Balkenspalte: Raster, Balken (mit Ist-Balken), Kennzeichen am Rand der Achse, dahinter Kennzeichen und
 * Text der Zelle rechts vom Balken. Eine normale Zelle für Tastatur, Auswahl und Kopieren; ihr Name ist Zelltext,
 * Beschreibung des Balkens und was abgeschnitten ist. Eine Render-Funktion ohne eigenen Zustand, aufgerufen wie die
 * übrigen Zellen in `Vergleichszeile` (keine eigene Komponente je Zelle).
 */
export function balkenzelle(p: BalkenzelleProps): ReactElement {
  const { zelle, bild } = p;
  const balken = zelle?.balken;
  const l = balken ? balkenLage(balken, bild.achse) : null;
  const rand = l ? randhinweise(l) : null;
  const kennzeichen = zelle?.kennzeichen ?? [];

  const stil: CSSProperties = {};
  if (p.links !== null) stil.left = p.links;
  if (l) stil.paddingLeft = beschriftungLinks(l, bild.achse, balken?.art === 'meilenstein');
  // Liegt nichts vom Balken auf der Achse, zeigt das Kennzeichen am Rand, wo er ist (Ziel beim Fokus per Tastatur).
  const randZiel = l && !l.soll.sichtbar ? (l.soll.vorAnfang ? 'anfang' : 'ende') : null;
  const randmarke = (seite: 'anfang' | 'ende', hinweis: string | null): ReactElement | null =>
    hinweis === null || !balken ? null : (
      <span
        className={`tx-grid__kennzeichen tx-grid__balkenrand tx-grid__balkenrand--${seite}`}
        data-balkenrand={seite}
        data-sichtziel={randZiel === seite ? '' : undefined}
        title={[balken.beschreibung, hinweis].filter((t) => t !== '').join(', ')}
        aria-hidden="true"
      >
        {seite === 'anfang' ? texte.balkenVorherSymbol : texte.balkenNachherSymbol}
      </span>
    );

  return (
    <div
      role="gridcell"
      className={`${p.klassen} tx-grid__zelle--zeitleiste`}
      data-spalte={p.spalte}
      aria-colindex={p.spaltenIndex + 1}
      aria-selected={p.ausgewaehlt}
      aria-label={balken && l ? balkenName(zelle.text, balken, l) : undefined}
      tabIndex={p.aktiv ? 0 : -1}
      title={p.beschreibung === '' ? undefined : p.beschreibung}
      style={stil}
    >
      {bild.raster}
      {balken && l?.soll.sichtbar ? (
        <span
          className={balkenklassen(balken, l)}
          data-balken={balken.art}
          data-sichtziel=""
          title={balken.beschreibung}
          style={balkenstil(l.soll.sichtbar, l.fortschritt, balken.art === 'meilenstein')}
        />
      ) : null}
      {l?.ist?.sichtbar ? (
        <span
          className="tx-grid__balken-ist"
          data-balken="ist"
          style={{ left: l.ist.sichtbar.links, width: l.ist.sichtbar.breite }}
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
          {kennzeichenText(kz, p.kennzeichenTexte).symbol}
        </span>
      ))}
      <span className="tx-grid__text">{zelle?.text ?? ''}</span>
      {randmarke('anfang', rand?.anfang ?? null)}
      {randmarke('ende', rand?.ende ?? null)}
    </div>
  );
}

function balkenklassen(b: { art: string; kritisch?: boolean }, l: Balkenlage): string {
  let k = `tx-grid__balken tx-grid__balken--${b.art}`;
  if (b.kritisch === true) k += ' tx-grid__balken--kritisch';
  if (l.fortschritt !== null) k += ' tx-grid__balken--fortschritt';
  if (l.soll.vorAnfang) k += ' tx-grid__balken--offen-anfang';
  if (l.soll.nachEnde) k += ' tx-grid__balken--offen-ende';
  return k;
}

function balkenstil(s: Strecke, fortschritt: number | null, meilenstein: boolean): CSSProperties {
  if (meilenstein) return { left: s.links };
  const stil: CSSProperties & Record<string, string | number> = { left: s.links, width: s.breite };
  if (fortschritt !== null) stil['--tx-grid-fortschritt'] = `${zahl(fortschritt)}px`;
  return stil;
}

/** Wo der Text der Zelle beginnt: rechts vom sichtbaren Balken (oder Ist-Balken), sonst hinter der Randmarke. */
function beschriftungLinks(l: Balkenlage, a: Achse, meilenstein: boolean): number {
  const enden: number[] = [];
  const s = l.soll.sichtbar;
  if (s) enden.push(s.links + s.breite + (meilenstein ? HALBE_RAUTE : 0));
  if (l.ist?.sichtbar) enden.push(l.ist.sichtbar.links + l.ist.sichtbar.breite);
  if (enden.length === 0) return l.soll.vorAnfang ? RANDMARKE : a.breite;
  return Math.min(Math.max(...enden) + ABSTAND, a.breite);
}

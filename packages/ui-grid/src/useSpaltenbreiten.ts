// SPDX-License-Identifier: AGPL-3.0-or-later
// Spaltenbreiten eines LV-Grids als Bedienzustand (Ticket 130): wirksame Breiten aus Standard, Inhalt und den Breiten, die
// der Nutzer gezogen hat. Gemerkt wird je Grid unter dem Schlüssel des Aufrufers über einen Speicher (Standard:
// `localStorage`); ohne Schlüssel gelten gezogene Breiten nur, solange das Grid steht.

import { useMemo, useRef, useState } from 'react';
import type { GridZahlen, LvSpalte, LvZeile, OzMaske } from '@tethys/vertrag';
import { gemerkteBreitenLesen, mindestbreiten, wirksameBreiten } from './spaltenbreiten';

/** Gemerkte Breiten in Pixeln je Spalte; nur Spalten, die der Nutzer geändert hat. */
export type Spaltenbreiten = Readonly<Partial<Record<LvSpalte, number>>>;

/**
 * Wo ein Grid seine Spaltenbreiten merkt. `lesen` liefert, was `schreiben` abgelegt hat (oder etwas Unbrauchbares, dann
 * gilt der Standard); beide dürfen nicht werfen.
 */
export interface SpaltenbreitenSpeicher {
  lesen(schluessel: string): unknown;
  schreiben(schluessel: string, breiten: Spaltenbreiten): void;
}

const PRAEFIX = 'tethys.grid.spaltenbreiten.';

/**
 * Standardspeicher: `localStorage` des Browsers unter `tethys.grid.spaltenbreiten.<Schlüssel>`. Ist er gesperrt oder
 * voll, gelten die Breiten nur bis zum Neuladen.
 */
export const lokalerSpaltenbreitenSpeicher: SpaltenbreitenSpeicher = {
  lesen(schluessel) {
    try {
      const text = globalThis.localStorage.getItem(PRAEFIX + schluessel);
      return text === null ? null : (JSON.parse(text) as unknown);
    } catch {
      return null;
    }
  },
  schreiben(schluessel, breiten) {
    try {
      globalThis.localStorage.setItem(PRAEFIX + schluessel, JSON.stringify(breiten));
    } catch {
      // Ohne Speicher gelten die Breiten nur bis zum Neuladen.
    }
  },
};

export interface SpaltenbreitenOptionen {
  readonly spalten: readonly LvSpalte[];
  /** Die Spalte, die zusätzlich den freien Platz einnimmt. */
  readonly flexspalte: LvSpalte;
  readonly zeilen: readonly LvZeile[];
  readonly zahlen: GridZahlen;
  readonly ozMaske?: OzMaske | undefined;
  readonly schluessel?: string | undefined;
  readonly speicher?: SpaltenbreitenSpeicher | undefined;
}

export interface SpaltenbreitenZustand {
  /** Wirksame Breite je angezeigter Spalte in Pixeln. */
  readonly breiten: Readonly<Partial<Record<LvSpalte, number>>>;
  /** Mindestbreite aus dem Inhalt (OZ und Zahlen), sonst keine. */
  readonly mindest: Readonly<Partial<Record<LvSpalte, number>>>;
  /** `grid-template-columns` der Kopf- und Datenzeilen. */
  readonly vorlage: string;
  /** Summe der Breiten (Mindestbreite der Zeilen). */
  readonly gesamtbreite: number;
  /** Setzt eine Breite (`null`: zurück zum Standard); mit `merken` auch in den Speicher. */
  readonly setze: (spalte: LvSpalte, breite: number | null, merken: boolean) => void;
  /** Schreibt die aktuellen Breiten in den Speicher (z. B. am Ende des Ziehens). */
  readonly merke: () => void;
}

export function useSpaltenbreiten(o: SpaltenbreitenOptionen): SpaltenbreitenZustand {
  const { spalten, flexspalte, zeilen, zahlen, ozMaske, schluessel } = o;
  const speicher = o.speicher ?? lokalerSpaltenbreitenSpeicher;
  const lies = (s: string | undefined): Spaltenbreiten =>
    s === undefined ? {} : gemerkteBreitenLesen(speicher.lesen(s));
  const [stand, setStand] = useState(() => ({ schluessel, gemerkt: lies(schluessel) }));
  // Ein anderer Schlüssel ist ein anderes Grid: dessen Breiten lesen.
  const aktuell = stand.schluessel === schluessel ? stand : { schluessel, gemerkt: lies(schluessel) };
  if (aktuell !== stand) setStand(aktuell);
  const gemerkt = aktuell.gemerkt;
  // Der jüngste Stand für `merke` am Ende des Ziehens, auch wenn der Rückruf aus einem älteren Rendern stammt.
  const jungst = useRef(gemerkt);
  jungst.current = gemerkt;

  const mindest = useMemo(() => mindestbreiten(zeilen, zahlen, ozMaske), [zeilen, zahlen, ozMaske]);
  const breiten = useMemo(() => wirksameBreiten(spalten, gemerkt, mindest), [spalten, gemerkt, mindest]);
  const vorlage = useMemo(
    () =>
      spalten
        .map((s) => {
          const b = `${String(breiten[s] ?? 0)}px`;
          return s === flexspalte ? `minmax(${b}, 1fr)` : b;
        })
        .join(' '),
    [spalten, breiten, flexspalte],
  );
  const gesamtbreite = useMemo(
    () => spalten.reduce((summe, s) => summe + (breiten[s] ?? 0), 0),
    [spalten, breiten],
  );

  const schreibe = (neu: Spaltenbreiten): void => {
    if (schluessel !== undefined) speicher.schreiben(schluessel, neu);
  };
  const setze = (spalte: LvSpalte, breite: number | null, merken: boolean): void => {
    const ohne = Object.fromEntries(Object.entries(jungst.current).filter(([s]) => s !== spalte)) as Partial<
      Record<LvSpalte, number>
    >;
    const neu: Spaltenbreiten = breite === null ? ohne : { ...ohne, [spalte]: breite };
    jungst.current = neu;
    setStand({ schluessel, gemerkt: neu });
    if (merken) schreibe(neu);
  };
  return {
    breiten,
    mindest,
    vorlage,
    gesamtbreite,
    setze,
    merke: () => {
      schreibe(jungst.current);
    },
  };
}

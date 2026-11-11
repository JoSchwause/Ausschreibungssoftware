// SPDX-License-Identifier: AGPL-3.0-or-later
// Der gemeinsame Kern aller Grids des Pakets (U2): aktive Zelle, Virtualisierung der Zeilen, Fokus und Sprungziel.
// `LvGrid` und `VergleichsGrid` bauen darauf auf; was sie unterscheidet (Bearbeiten, Zeilen- oder Zellauswahl, Zellen),
// bleibt bei ihnen. Der Kern kennt nur Zeilenkennungen und Spaltenkennungen, keine Fachdaten.

import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import type { Virtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Raster, Zelle } from './navigation';

/** Die aktive Zelle, gehalten über die Kennungen von Zeile und Spalte. */
export interface AktiveZelle<S extends string> {
  readonly id: string;
  readonly spalte: S;
}

/** Ziel eines Sprungs von außen: Jeder neue Wert von `nr` ist ein neuer Sprung, auch zur selben Zeile. */
export interface Sprung<S extends string> {
  readonly zeilenId: string;
  readonly spalte?: S | undefined;
  readonly nr: number;
}

export interface GridKernOptionen<S extends string> {
  /**
   * Kennungen aller Zeilen, die die Tastatur erreicht, in Anzeigereihenfolge. Die ersten `koerper` stehen im
   * virtualisierten Körper, die übrigen fest darunter (z. B. Summenzeilen).
   */
  readonly zeilenIds: readonly string[];
  /** Zahl der virtualisierten Zeilen; Standard: alle. */
  readonly koerper?: number;
  readonly spalten: readonly S[];
  readonly zeilenhoehe: number;
  /** Höhe des klebenden Kopfes über dem Körper. */
  readonly kopfhoehe: number;
  /** Höhe eines klebenden Fußes unter dem Körper (feste Zeilen); Standard 0. */
  readonly fusshoehe?: number;
  /** Solange gesetzt (z. B. offener Zelleditor), holt der Kern den Fokus nicht auf die aktive Zelle. */
  readonly fokusGesperrt?: boolean;
  /**
   * Zahl der linken Spalten, die beim waagerechten Scrollen kleben (Standard 0). Eine fokussierte Zelle dahinter holt
   * der Kern so in den Sichtbereich, dass sie nicht unter ihnen liegt.
   */
  readonly fixierteSpalten?: number;
  /** Meldet die Zeile der aktiven Zelle nach dem Rendern, sobald sie sich ändert; `null` ohne Zeilen. */
  readonly onAktiveZeileChange?: ((id: string | null) => void) | undefined;
}

export interface GridKern<S extends string> {
  readonly wurzel: RefObject<HTMLDivElement | null>;
  readonly scroller: RefObject<HTMLDivElement | null>;
  readonly virtualizer: Virtualizer<HTMLDivElement, Element>;
  readonly indexVonId: ReadonlyMap<string, number>;
  /** Die gesetzte aktive Zelle; `null` vor dem ersten Klick (dann gilt die erste Zeile). */
  readonly aktiv: AktiveZelle<S> | null;
  readonly setAktiv: (aktiv: AktiveZelle<S>) => void;
  /** Index der aktiven Zeile; -1 ohne Zeilen. */
  readonly aktivIndex: number;
  readonly aktivSpaltenIndex: number;
  readonly aktivSpalte: S | undefined;
  readonly aktiveId: string | undefined;
  /** Macht eine Zelle aktiv; mit Fokus holt der Kern sie nach dem Rendern in den Sichtbereich und fokussiert sie. */
  readonly zeigeZelle: (ziel: Zelle, mitFokus: boolean) => void;
  /** Nach dem nächsten Rendern die aktive Zelle fokussieren. */
  readonly fokusAnfrage: RefObject<boolean>;
  /** Nach dem nächsten Rendern die aktive Zeile (an ihrem neuen Platz) in den Sichtbereich holen. */
  readonly scrollAnfrage: RefObject<boolean>;
  /** Abstand einer virtualisierten Zeile vom Anfang des Körpers. */
  readonly versatz: (start: number) => number;
  readonly raster: () => Raster;
  /** Zeile und Spalte der Zelle, in der ein Ereignis spielt (Delegation am Wurzelelement), sonst `null`. */
  readonly zelleVon: (ziel: EventTarget | null) => { zi: number; si: number; spalte: S } | null;
}

export function useGridKern<S extends string>(o: GridKernOptionen<S>): GridKern<S> {
  const { zeilenIds, spalten, zeilenhoehe: zh, kopfhoehe, onAktiveZeileChange } = o;
  const koerper = o.koerper ?? zeilenIds.length;
  const fusshoehe = o.fusshoehe ?? 0;
  const anzahl = zeilenIds.length;

  const [aktiv, setAktiv] = useState<AktiveZelle<S> | null>(null);
  const letzterIndex = useRef(0);
  const fokusAnfrage = useRef(false);
  const scrollAnfrage = useRef(false);
  const wurzel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const indexVonId = useMemo(() => {
    const m = new Map<string, number>();
    zeilenIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [zeilenIds]);

  // Die aktive Zelle hängt an ihrer Zeilenkennung: Sie bleibt an ihrer Zeile, wenn Zeilen davor dazukommen oder
  // wegfallen. Verschwindet die Zeile (zugeklappt, gelöscht), gilt die Zeile am letzten Index.
  const aktivIndex =
    anzahl === 0 ? -1 : aktiv ? (indexVonId.get(aktiv.id) ?? Math.min(letzterIndex.current, anzahl - 1)) : 0;
  const aktivSpaltenIndex = Math.max(0, aktiv ? spalten.indexOf(aktiv.spalte) : 0);
  const aktivSpalte = spalten[aktivSpaltenIndex];
  const aktiveId = aktivIndex >= 0 ? zeilenIds[aktivIndex] : undefined;

  useLayoutEffect(() => {
    if (aktivIndex >= 0) letzterIndex.current = aktivIndex;
  });

  const gemeldeteZeile = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = aktiveId ?? null;
    if (!onAktiveZeileChange || gemeldeteZeile.current === id) return;
    gemeldeteZeile.current = id;
    onAktiveZeileChange(id);
  });

  // --- Virtualisierung ---------------------------------------------------------------------------------------
  const aktivIndexRef = useRef(aktivIndex);
  aktivIndexRef.current = aktivIndex;
  const virtualizer = useVirtualizer({
    count: koerper,
    getScrollElement: () => scroller.current,
    estimateSize: () => zh,
    overscan: 10,
    scrollMargin: kopfhoehe,
    scrollPaddingStart: kopfhoehe,
    scrollPaddingEnd: fusshoehe,
    getItemKey: (i) => zeilenIds[i] ?? i,
    // Die aktive Zeile bleibt immer im DOM, auch wenn sie aus dem Sichtbereich scrollt: So überlebt der Fokus
    // die Virtualisierung und das Grid bleibt per Tab erreichbar.
    rangeExtractor: (bereich) => {
      const basis = defaultRangeExtractor(bereich);
      const a = aktivIndexRef.current;
      if (a < 0 || a >= bereich.count || basis.includes(a)) return basis;
      const ergebnis = [...basis, a];
      ergebnis.sort((x, y) => x - y);
      return ergebnis;
    },
  });
  const seite = useCallback(() => {
    const h = scroller.current?.clientHeight ?? 0;
    return Math.max(1, Math.floor((h - kopfhoehe - fusshoehe) / zh) - 1);
  }, [zh, kopfhoehe, fusshoehe]);
  const raster = (): Raster => ({ zeilen: anzahl, spalten: spalten.length, seite: seite() });

  const zeigeZelle = (ziel: Zelle, mitFokus: boolean): void => {
    const id = zeilenIds[ziel.zeile];
    const spalte = spalten[ziel.spalte];
    if (id === undefined || spalte === undefined) return;
    setAktiv({ id, spalte });
    if (mitFokus) {
      fokusAnfrage.current = true;
      if (ziel.zeile < koerper) virtualizer.scrollToIndex(ziel.zeile, { align: 'auto' });
    }
  };

  const fokusGesperrt = o.fokusGesperrt ?? false;
  const fixierteSpalten = o.fixierteSpalten ?? 0;
  /** Waagerecht: die Zelle ganz in den Sichtbereich, rechts von den fixierten Spalten (Fokus ohne Browser-Scrollen). */
  const zeigeWaagerecht = (el: HTMLElement): void => {
    const sc = scroller.current;
    if (!sc || aktivSpaltenIndex < fixierteSpalten) return;
    const rand = sc.getBoundingClientRect();
    const letzteFixierte = spalten[fixierteSpalten - 1];
    const fixiertBis =
      letzteFixierte === undefined
        ? rand.left
        : (el.parentElement?.querySelector(`[data-spalte="${letzteFixierte}"]`)?.getBoundingClientRect()
            .right ?? rand.left);
    const box = el.getBoundingClientRect();
    if (box.left < fixiertBis) sc.scrollLeft -= fixiertBis - box.left;
    else if (box.right > rand.left + sc.clientWidth)
      sc.scrollLeft += box.right - (rand.left + sc.clientWidth);
  };
  useLayoutEffect(() => {
    if (!fokusAnfrage.current || fokusGesperrt || aktivIndex < 0 || aktivSpalte === undefined) return;
    const el = wurzel.current?.querySelector<HTMLElement>(
      `[data-i="${String(aktivIndex)}"] [data-spalte="${aktivSpalte}"]`,
    );
    if (el) {
      el.focus({ preventScroll: true });
      zeigeWaagerecht(el);
      fokusAnfrage.current = false;
    }
    if (scrollAnfrage.current) {
      scrollAnfrage.current = false;
      if (aktivIndex < koerper) virtualizer.scrollToIndex(aktivIndex, { align: 'auto' });
    }
  });

  const zelleVon = (ziel: EventTarget | null): { zi: number; si: number; spalte: S } | null => {
    if (!(ziel instanceof Element)) return null;
    const zelle = ziel.closest<HTMLElement>('[data-spalte]');
    const zeile = zelle?.closest<HTMLElement>('[data-i]');
    const wert = zelle?.dataset['spalte'];
    const spalte = spalten.find((s) => s === wert);
    const zi = Number(zeile?.dataset['i']);
    if (spalte === undefined || Number.isNaN(zi)) return null;
    return { zi, si: spalten.indexOf(spalte), spalte };
  };

  return {
    wurzel,
    scroller,
    virtualizer,
    indexVonId,
    aktiv,
    setAktiv,
    aktivIndex,
    aktivSpaltenIndex,
    aktivSpalte,
    aktiveId,
    zeigeZelle,
    fokusAnfrage,
    scrollAnfrage,
    versatz: (start) => start - kopfhoehe,
    raster,
    zelleVon,
  };
}

/**
 * Sprung von außen (Prüf-Links, Details der App): Ein neuer Wert von `nr` aktiviert die Zelle über `springe`. Steht die
 * Zeile nicht in der Ansicht (zugeklappt), tut das Grid nichts; das Aufklappen gehört dem Aufrufer.
 */
export function useSprung<S extends string>(
  sprung: Sprung<S> | undefined,
  kern: Pick<GridKern<S>, 'indexVonId' | 'aktivSpaltenIndex'>,
  spalten: readonly S[],
  springe: (ziel: Zelle) => void,
): void {
  const sprungNr = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!sprung || sprung.nr === sprungNr.current) return;
    sprungNr.current = sprung.nr;
    const zi = kern.indexVonId.get(sprung.zeilenId);
    if (zi === undefined) return;
    const si = sprung.spalte === undefined ? -1 : spalten.indexOf(sprung.spalte);
    springe({ zeile: zi, spalte: si >= 0 ? si : kern.aktivSpaltenIndex });
  });
}

/** Tasten, die die aktive Zelle bewegen (`zielZelle`). */
export const NAVIGATIONSTASTEN: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/** Die Tasten eines Ereignisses, soweit das Auf- und Zuklappen sie braucht. */
export interface Tastendruck {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

/**
 * Auf- oder Zuklappen per Tastatur in beiden Grids: Alt+Pfeil rechts/links überall in der Zeile, Pfeil rechts/links
 * ohne Umschalter in der Baumspalte, wenn die Zeile Unterknoten hat und nicht schon so steht. Liefert den gewünschten
 * Zustand (`true` = aufgeklappt) oder `null`, wenn die Taste kein Klappen ist. Mit Alt ist sie immer ein Klappen
 * (auch ohne Wirkung), damit der Browser nicht zurückblättert.
 */
export function klappAbsicht(
  e: Tastendruck,
  zeile: { readonly hatUnterknoten: boolean; readonly aufgeklappt: boolean },
  inBaumspalte: boolean,
): boolean | null {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return null;
  const auf = e.key === 'ArrowRight';
  if (e.altKey) return auf;
  if (e.ctrlKey || e.metaKey || e.shiftKey || !inBaumspalte || !zeile.hatUnterknoten) return null;
  return zeile.aufgeklappt === auf ? null : auf;
}

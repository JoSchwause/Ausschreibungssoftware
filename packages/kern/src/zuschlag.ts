// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlagsposition (K6, Ticket 37; F3, E-03, D-03): Rechenregeln R1 bis R5 und R8, je eine benannte Funktion.
//
// Belegt aus den amtlichen Prüfdateien (D-03): BVBS 3.3 AVA X86 Bereich 1.30, Musterdatei 3.1 X84 Bereich 1.30, BVBS 3.3
// Bauausführung X84 Bereich 002.001 (Zahlen im Ticket 37 und in `zuschlag.test.ts`). Eine Zuschlagsposition ist nie
// Basis einer anderen; so hängt ein Zuschlagsbetrag nur von Positionen ohne Zuschlag ab, und es gibt keine Ketten.
//
// Die Funktionen sind rein. Sie lesen das LV nur über eine `Basisquelle` (Knoten und eigener GP); die vollständige
// Neuberechnung (`summenBerechnen`) und die Neuberechnung im Teilbaum (`summenAenderung`) geben je ihre eigene Quelle.

import { NULL_BETRAG, addiere, gesamtpreis, prozentVon } from '@tethys/dezimal';
import type { Betrag, Knoten, Position, PositionId, Zuschlagsbezug } from '@tethys/vertrag';
import { betragsziel, eigenerGesamtpreis } from './summenregeln';

export const ZUSCHLAG_REGELN: {
  readonly status: string;
  readonly betrag: string;
  readonly basis: string;
  readonly gliederung: string;
  readonly kennzeichnung: string;
  readonly positionen: string;
  readonly teilmenge: string;
  readonly ziel: string;
  readonly altform: string;
} = {
  status:
    'entschieden aus den amtlichen Prüfdateien (D-03, D-10), Mensch bestätigt später (F3/E-03); Teilmenge vorläufige Annahme (Demo D-37.2)',
  betrag:
    'R1: Betrag = kaufmännisch gerundet(Basis × Satz / 100, 2); ohne Satz kein Betrag, außer Altform (R8)',
  basis:
    'R2: Basis = Summe der GP der Bezugspositionen mit GP; eine Zuschlagsposition ist nie Basis; nur Bezugspositionen, deren Betrag ins Netto geht (Demo D-37.2)',
  gliederung:
    'R3 (AllInCat): Geschwister vor der Zuschlagsposition unter demselben Elternknoten; unmittelbar davorstehende Zuschlagspositionen teilen die Basis; ' +
    'Bereich endet an der vorigen Zuschlagsposition oder am Anfang; Hinweistexte und Untergliederungen werden übersprungen (Demo D-37.2)',
  kennzeichnung: 'R4 (IdentAsMark): Bereich wie R3, davon nur Positionen mit Zuschlagskennzeichen',
  positionen:
    'R5 (ListInSubQty): die genannten Positionen, wo immer sie stehen, auch hinter der Zuschlagsposition',
  teilmenge:
    'R5, LÜCKE (nicht aus den Daten belegt, Demo D-37.2): Teilmenge gesetzt → gerundet(Teilmenge × EP, 2) statt GP der Bezugsposition',
  ziel: 'R6: der Betrag geht wie ein GP in Gliederungssumme und, nach den Merkmalen der Zuschlagsposition, in Netto, Bedarfs- oder Wahlsumme',
  altform:
    'R8 (Demo D-37.2, D-10): Zuschlagsposition ohne Satz mit Menge und EP rechnet Menge × EP (Fixtures typisch, gross; Schemaversion 1); K8 meldet sie',
};

/** Basis und Betrag einer Zuschlagsposition (für `vergabe`, Ticket 44). */
export interface Zuschlagsbasis {
  readonly basis: Betrag;
  /** Der Zuschlagsbetrag (R1) oder bei der Altform Menge × EP (R8); `null`: kein Betrag. */
  readonly betrag: Betrag | null;
  /** Eine Position, die zur Basis gehören würde, hat keinen Preis (z. B. „nicht angeboten“ im gedachten LV). */
  readonly bezugOhnePreis: boolean;
}

/** Wie die Regeln das LV sehen: Positionen nach Kennung und der eigene GP einer Position ohne Zuschlag. */
export interface Basisquelle {
  position(id: string): Position | undefined;
  gesamtpreis(p: Position): Betrag | null;
}

/** Teilsumme einer Basis: Betrag und ob eine Bezugsposition ohne Preis darin vorkam. */
interface Teilbasis {
  readonly summe: Betrag;
  readonly ohnePreis: boolean;
}
const LEER: Teilbasis = { summe: NULL_BETRAG, ohnePreis: false };
const dazu = (t: Teilbasis, gp: Betrag | null): Teilbasis =>
  gp === null ? { summe: t.summe, ohnePreis: true } : { summe: addiere(t.summe, gp), ohnePreis: t.ohnePreis };

/** R2: Kann diese Position zur Basis gehören? Keine Zuschlagsposition, Betrag geht ins Netto. */
export function istBasisposition(p: Position): boolean {
  return p.zuschlag === null && betragsziel(p) === 'netto';
}

/**
 * R1 und R8: der Betrag einer Zuschlagsposition aus ihrer Basis. Mit Satz: gerundet(Basis × Satz / 100, 2). Ohne Satz:
 * Altform, Menge × EP (ohne Menge oder EP kein Betrag).
 */
export function zuschlagsbetrag(p: Position, basis: Betrag): Betrag | null {
  const satz = p.zuschlag?.prozentsatz ?? null;
  return satz === null ? eigenerGesamtpreis(p) : prozentVon(basis, satz);
}

/** R5: Basis einer Liste. Teilmenge gesetzt: gerundet(Teilmenge × EP, 2) (Lücke, Annahme); sonst der GP. */
export function listenbasis(
  bezug: Extract<Zuschlagsbezug, { art: 'positionen' }>,
  q: Basisquelle,
): Teilbasis {
  let t = LEER;
  for (const b of bezug.positionen) {
    const p = q.position(b.positionId);
    if (p === undefined || !istBasisposition(p)) continue;
    if (b.teilmenge === null) t = dazu(t, q.gesamtpreis(p));
    else t = dazu(t, p.einheitspreis === null ? null : gesamtpreis(b.teilmenge, p.einheitspreis));
  }
  return t;
}

const ergebnis = (p: Position, t: Teilbasis): Zuschlagsbasis => ({
  basis: t.summe,
  betrag: zuschlagsbetrag(p, t.summe),
  bezugOhnePreis: t.ohnePreis,
});

/** Basis und Betrag einer Zuschlagsposition mit Bezugsform `positionen` (R5); für andere Formen siehe `bereichsbasen`. */
export function listenzuschlag(p: Position, q: Basisquelle): Zuschlagsbasis | null {
  const bezug = p.zuschlag?.bezug;
  return bezug?.art === 'positionen' ? ergebnis(p, listenbasis(bezug, q)) : null;
}

/**
 * R3, R4 (und R5 für die Listen darunter): Basen aller Zuschlagspositionen unter einem Elternknoten in einem Lauf über
 * die Geschwister (`kinder` in Reihenfolge). Rückwärts gelesen: unmittelbar davorstehende Zuschlagspositionen teilen die
 * Basis (ein Block), dann sammelt der Bereich bis zur vorigen Zuschlagsposition oder zum Anfang. Hinweistexte und
 * Untergliederungen werden übersprungen. Ergebnis je Zuschlagsposition in `aus`.
 */
export function bereichsbasen(
  kinder: readonly Knoten[],
  q: Basisquelle,
  aus: Map<string, Zuschlagsbasis>,
): void {
  let alle = LEER;
  let markiert = LEER;
  let block: { alle: Teilbasis; markiert: Teilbasis } | null = null;
  for (const k of kinder) {
    if (k.art !== 'position') continue;
    const bezug = k.zuschlag?.bezug;
    if (bezug === undefined) {
      block = null;
      if (!istBasisposition(k)) continue;
      const gp = q.gesamtpreis(k);
      alle = dazu(alle, gp);
      if (k.merkmale.zuschlagskennzeichen) markiert = dazu(markiert, gp);
      continue;
    }
    if (block === null) {
      block = { alle, markiert };
      alle = LEER;
      markiert = LEER;
    }
    const t =
      bezug.art === 'gliederung'
        ? block.alle
        : bezug.art === 'kennzeichnung'
          ? block.markiert
          : listenbasis(bezug, q);
    aus.set(k.id, ergebnis(k, t));
  }
}

// --- Rückwärtsindex Bezug → Zuschlag ---------------------------------------------------------------------------

const rueckCache = new WeakMap<readonly Knoten[], ReadonlyMap<string, readonly PositionId[]>>();

/**
 * Je Bezugsposition die Zuschlagspositionen, deren Liste (R5) sie nennt. Einmal je Knotenarray gebaut und gemerkt
 * (wie der Baumindex, `struktur.ts`); der Cache ist unsichtbar (nur gelesen).
 */
export function bezugsindex(knoten: readonly Knoten[]): ReadonlyMap<string, readonly PositionId[]> {
  const vorhanden = rueckCache.get(knoten);
  if (vorhanden) return vorhanden;
  const neu = new Map<string, PositionId[]>();
  for (const k of knoten) {
    if (k.art !== 'position' || k.zuschlag?.bezug.art !== 'positionen') continue;
    for (const b of k.zuschlag.bezug.positionen) {
      const liste = neu.get(b.positionId);
      if (liste) {
        if (!liste.includes(k.id)) liste.push(k.id);
      } else neu.set(b.positionId, [k.id]);
    }
  }
  rueckCache.set(knoten, neu);
  return neu;
}

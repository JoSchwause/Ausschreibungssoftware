// SPDX-License-Identifier: AGPL-3.0-or-later
// Bietersummen (Ticket 36, Punkt 2). Ein Angebot rechnet wie ein gedachtes LV: die Knoten des Ausschreibungs-LV, jede
// Position mit dem EP des Angebots (nicht angeboten oder kein Eintrag: `null`), der Nachlass des Angebots und der
// MwSt-Satz des LV. Darauf rechnet `summenBerechnen` aus dem Kern. So gelten GP-Rundung (N2), Nachlass (N5), MwSt
// einmal auf die Summe und die Regeln, welche Positionen eingehen, ohne eigene Kopie.

import { vorzeichen } from '@tethys/dezimal';
import { summenBerechnen, zuschlagsbasen } from '@tethys/kern';
import type {
  Angebot,
  Angebotsposition,
  Betrag,
  Einheitspreis,
  Knoten,
  LvZustand,
  Nachlass,
  Position,
  PositionId,
  Prozent,
  Summenstand,
} from '@tethys/vertrag';

/** Der EP, mit dem eine Angebotsposition rechnet; `null` heißt: nicht angeboten (kein GP, geht nicht ein). */
export function angebotsEinheitspreis(p: Angebotsposition | undefined): Einheitspreis | null {
  return p?.status === 'angeboten' ? p.einheitspreis : null;
}

const positionenCache = new WeakMap<readonly Angebotsposition[], ReadonlyMap<string, Angebotsposition>>();

/** Angebotspositionen nach Positions-ID; je Array einmal gebaut. */
export function angebotspositionenNachId(
  positionen: readonly Angebotsposition[],
): ReadonlyMap<string, Angebotsposition> {
  const vorhanden = positionenCache.get(positionen);
  if (vorhanden) return vorhanden;
  const neu = new Map<string, Angebotsposition>(positionen.map((p) => [p.positionId as string, p]));
  positionenCache.set(positionen, neu);
  return neu;
}

/** Der Zuschlagssatz des Bieters; `null`: kein Satz angeboten (auch bei „nicht angeboten“ oder ohne Eintrag). */
export function angebotsZuschlagssatz(p: Angebotsposition | undefined): Prozent | null {
  return p?.status === 'angeboten' ? (p.zuschlagssatz ?? null) : null;
}

/**
 * Eine Position des gedachten LV (R7, Ticket 44): der EP des Angebots; an einer Zuschlagsposition zusätzlich der Satz
 * des Bieters als `zuschlag.prozentsatz`, nie der Satz des LV. Mit Satz bleibt der EP `null` (Platzhalter, Vertrag
 * v1.2: nie gerechnet). Ohne Satz trägt sie den EP des Bieters; das rechnet nur die Altform (R8, Menge im LV gesetzt).
 */
export function angebotsPosition(k: Position, p: Angebotsposition | undefined): Position {
  if (k.zuschlag === null) return { ...k, einheitspreis: angebotsEinheitspreis(p) };
  const prozentsatz = angebotsZuschlagssatz(p);
  return {
    ...k,
    einheitspreis: prozentsatz === null ? angebotsEinheitspreis(p) : null,
    zuschlag: { ...k.zuschlag, prozentsatz },
  };
}

/** Die Knoten des LV, deren Positionen die Preise des Angebots tragen (gedachtes LV, R7). */
export function angebotsKnoten(lv: LvZustand, angebot: Pick<Angebot, 'positionen'>): Knoten[] {
  const nachId = angebotspositionenNachId(angebot.positionen);
  return lv.leistungsverzeichnis.knoten.map((k) =>
    k.art === 'position' ? angebotsPosition(k, nachId.get(k.id)) : k,
  );
}

/** Das gedachte LV eines Angebots (R7): Knoten mit den Preisen des Bieters, Nachlass des Angebots, MwSt-Satz des LV. */
export interface GedachtesLv {
  readonly id: string;
  readonly knoten: readonly Knoten[];
  readonly nachlass: Nachlass | null;
  readonly mwstSatz: Prozent;
}

export function gedachtesLv(lv: LvZustand, angebot: Pick<Angebot, 'positionen' | 'nachlass'>): GedachtesLv {
  const l = lv.leistungsverzeichnis;
  return { id: l.id, knoten: angebotsKnoten(lv, angebot), nachlass: angebot.nachlass, mwstSatz: l.mwstSatz };
}

/** Vollständiger Summenstand eines Angebots (Orakel, Startwert beim Anlegen, Preisspiegel). */
export function angebotSummenBerechnen(
  lv: LvZustand,
  angebot: Pick<Angebot, 'positionen' | 'nachlass'>,
): Summenstand {
  return summenBerechnen(gedachtesLv(lv, angebot));
}

// --- Zuschlagspositionen im Angebot (Ticket 44) ---------------------------------------------------------------------

/**
 * Kennzeichen eines Bieterpreises (D-05). `nullpreis`: angebotener Wert 0,00 (EP, bei einer Zuschlagsposition der
 * Betrag, etwa bei Satz 0,00); `nicht-angeboten` auch ohne Eintrag im Angebot; `zuschlagssatz-fehlt`: eine
 * Zuschlagsposition ist angeboten, aber ohne Satz (und nicht in der Altform rechenbar), sie rechnet wie nicht angeboten.
 */
export type Preiskennzeichen = 'angeboten' | 'nullpreis' | 'nicht-angeboten' | 'zuschlagssatz-fehlt';

/** Satz, Basis und Betrag einer Zuschlagsposition mit den Preisen eines Bieters. */
export interface Bieterzuschlag {
  readonly positionId: PositionId;
  readonly kennzeichen: Preiskennzeichen;
  /** Der Satz des Bieters; `null`: kein Satz angeboten. */
  readonly satz: Prozent | null;
  /** Summe der GP der Bezugspositionen mit den Preisen des Bieters (Kern, `zuschlagsbasen`). */
  readonly basis: Betrag;
  /** Der Zuschlagsbetrag (Kern, R1; Altform R8); `null`: kein Betrag. */
  readonly betrag: Betrag | null;
  /** `basis-unvollstaendig`: eine Bezugsposition hat keinen Preis des Bieters und trägt nichts zur Basis bei. */
  readonly basisUnvollstaendig: boolean;
}

/** Kennzeichen aus dem Betrag des Bieters und seinem Eintrag (Betrag `null`: fehlt der Satz oder der ganze Eintrag). */
export function zuschlagskennzeichenVon(
  betrag: Betrag | null,
  eintrag: Angebotsposition | undefined,
): Preiskennzeichen {
  if (betrag === null) return eintrag?.status === 'angeboten' ? 'zuschlagssatz-fehlt' : 'nicht-angeboten';
  return vorzeichen(betrag) === 0 ? 'nullpreis' : 'angeboten';
}

/** Satz, Basis, Betrag und Kennzeichen je Zuschlagsposition des LV mit den Preisen eines Bieters. */
export function angebotZuschlaegeBerechnen(
  lv: LvZustand,
  angebot: Pick<Angebot, 'positionen' | 'nachlass'>,
): ReadonlyMap<PositionId, Bieterzuschlag> {
  return bieterzuschlaege(gedachtesLv(lv, angebot), angebot);
}

/** Wie `angebotZuschlaegeBerechnen` auf einem schon gebauten gedachten LV. */
export function bieterzuschlaege(
  g: GedachtesLv,
  angebot: Pick<Angebot, 'positionen'>,
): ReadonlyMap<PositionId, Bieterzuschlag> {
  const nachId = angebotspositionenNachId(angebot.positionen);
  const aus = new Map<PositionId, Bieterzuschlag>();
  for (const [id, b] of zuschlagsbasen(g)) {
    const eintrag = nachId.get(id);
    aus.set(id, {
      positionId: id,
      kennzeichen: zuschlagskennzeichenVon(b.betrag, eintrag),
      satz: angebotsZuschlagssatz(eintrag),
      basis: b.basis,
      betrag: b.betrag,
      basisUnvollstaendig: b.bezugOhnePreis,
    });
  }
  return aus;
}

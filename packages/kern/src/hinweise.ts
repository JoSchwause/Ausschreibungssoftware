// SPDX-License-Identifier: AGPL-3.0-or-later
// Hinweise zu angenommenen Befehlen (Vertrag v1.1a, `Befehlshinweis`; Ticket 30). Ein Hinweis weist nie ab: Der Befehl
// liefert sein ChangeSet, der Hinweis steht daneben. Hier stehen die Konstruktoren und die Regeln, die für jedes
// ChangeSet gleich gelten; die OZ-Hinweise entstehen in `oz-befehle.ts`.

import { NULL_BETRAG, vergleiche } from '@tethys/dezimal';
import type { Befehlshinweis, Befehlshinweiscode, Gesamtsummen, KnotenId } from '@tethys/vertrag';

export function befehlshinweis(
  code: Befehlshinweiscode,
  meldung: string,
  knotenId?: string,
  feld?: string,
): Befehlshinweis {
  return {
    code,
    meldung,
    ...(knotenId === undefined ? {} : { knotenId: knotenId as KnotenId }),
    ...(feld === undefined ? {} : { feld }),
  };
}

/**
 * VORLÄUFIGE ANNAHME, ENTSCHEIDUNG OFFEN (Ticket 30, Punkt 8): Der Hinweis `netto-nach-nachlass-negativ` kommt bei jedem
 * ChangeSet, das neue Gesamtsummen mit negativem Netto nach Nachlass setzt, nicht nur beim Übergang von positiv zu
 * negativ. Ein ChangeSet ohne neue Gesamtsummen (`summen.gesamt: null`) trägt ihn nie.
 */
export const HINWEIS_ANNAHMEN: { readonly status: string; readonly nettoNegativ: string } = {
  status: 'vorläufige Annahme, Entscheidung offen',
  nettoNegativ:
    'netto-nach-nachlass-negativ einmal je ChangeSet, wenn summen.gesamt gesetzt und nettoNachNachlass negativ ist (jedes Mal, nicht nur beim Übergang)',
};

/** N5, E-06: negatives Netto nach Nachlass ist ein Befund, keine Sperre; höchstens ein Hinweis je ChangeSet. */
export function nettoHinweise(gesamt: Gesamtsummen | null): Befehlshinweis[] {
  if (gesamt === null || vergleiche(gesamt.nettoNachNachlass, NULL_BETRAG) >= 0) return [];
  return [
    befehlshinweis(
      'netto-nach-nachlass-negativ',
      `Das Netto nach Nachlass ist negativ (${gesamt.nettoNachNachlass}); der Nachlass übersteigt das Netto (${gesamt.netto}).`,
      undefined,
      'nachlass',
    ),
  ];
}

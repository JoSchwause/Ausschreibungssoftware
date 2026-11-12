// SPDX-License-Identifier: AGPL-3.0-or-later
// Anrechenbare Kosten (Ticket 101, D-56): bei Gebäuden und Innenräumen aus Kosten nach DIN 276 nach § 33 HOAI, sonst von
// Hand. Netto (§ 4 Abs. 1). Jeder Teilbetrag kaufmännisch auf 2 Stellen. Rein (A2), nur Dezimalarithmetik (N1).

import { NULL_BETRAG, addiere, prozentVon, subtrahiere, vergleiche } from '@tethys/dezimal';
import type { Betrag } from '@tethys/vertrag';
import { prozent } from './konstanten';

/** Kosten nach DIN 276 eines Gebäudes oder Innenraums für § 33, netto (§ 4 Abs. 1). */
export interface KostenNachDin276 {
  readonly art: 'din-276';
  /** KG 300 Bauwerk – Baukonstruktionen: voll anrechenbar (§ 33 Abs. 1). */
  readonly kg300: Betrag;
  /** KG 400 Bauwerk – Technische Anlagen (§ 33 Abs. 2). */
  readonly kg400: Betrag;
  /**
   * `true`, wenn der Auftragnehmer die Technischen Anlagen selbst fachlich plant und ihre Ausführung fachlich überwacht:
   * Dann gilt § 33 Abs. 2 nicht, und KG 400 zählt hier nicht (dafür gibt es das Leistungsbild Technische Ausrüstung).
   */
  readonly technischeAnlagenSelbstGeplant: boolean;
  /**
   * Von Hand: die Kosten nach § 33 Abs. 3, soweit anrechenbar (Herrichten, nichtöffentliche Erschließung, Ausstattung,
   * Kunstwerke, die der Auftragnehmer plant, bei deren Beschaffung er mitwirkt oder deren Ausführung oder Einbau er
   * fachlich überwacht). Mit KG 300 bilden sie die sonstigen anrechenbaren Kosten.
   */
  readonly weitereKosten: Betrag;
  /** Von Hand: der Wert der mitzuverarbeitenden Bausubstanz (§ 2 Abs. 7, § 4 Abs. 3). */
  readonly mitzuverarbeitendeBausubstanz: Betrag;
}

/** Die anrechenbaren Kosten eines Honorarobjekts: von Hand oder (Gebäude, Innenräume) aus Kosten nach DIN 276. */
export type AnrechenbareKostenangabe =
  { readonly art: 'von-hand'; readonly betrag: Betrag } | KostenNachDin276;

/** Die Herleitung nach § 33 Schritt für Schritt, jeder Teilbetrag mit 2 Stellen. */
export interface AnrechenbareKostenHerleitung {
  readonly kg300: Betrag;
  readonly weitereKosten: Betrag;
  /** KG 300 plus weitere Kosten: die sonstigen anrechenbaren Kosten des § 33 Abs. 2. */
  readonly sonstigeAnrechenbareKosten: Betrag;
  readonly kg400: Betrag;
  /** 25 % der sonstigen anrechenbaren Kosten (§ 33 Abs. 2 Nr. 1), kaufmännisch auf 2 Stellen. */
  readonly grenzeTechnischeAnlagen: Betrag;
  /** Der Teil von KG 400 bis zur Grenze, voll angerechnet (§ 33 Abs. 2 Nr. 1); 0, wenn selbst geplant. */
  readonly kg400Voll: Betrag;
  /** Die Hälfte des Teils von KG 400 über der Grenze, kaufmännisch auf 2 Stellen (Nr. 2); 0, wenn selbst geplant. */
  readonly kg400Haelfte: Betrag;
  readonly mitzuverarbeitendeBausubstanz: Betrag;
  /** Sonstige anrechenbare Kosten + KG 400 voll + KG 400 zur Hälfte + mitzuverarbeitende Bausubstanz. */
  readonly anrechenbareKosten: Betrag;
}

/** § 33 Abs. 2 Nr. 1: Technische Anlagen voll bis zu 25 Prozent der sonstigen anrechenbaren Kosten. */
const GRENZE_TECHNISCHE_ANLAGEN = prozent('25.00');
/** § 33 Abs. 2 Nr. 2: zur Hälfte mit dem Betrag darüber. */
const HAELFTE = prozent('50.00');

/** Herleitung der anrechenbaren Kosten eines Gebäudes oder Innenraums nach § 33 und § 4 Abs. 3. */
export function anrechenbareKostenHerleiten(kosten: KostenNachDin276): AnrechenbareKostenHerleitung {
  const sonstigeAnrechenbareKosten = addiere(kosten.kg300, kosten.weitereKosten);
  const grenzeTechnischeAnlagen = prozentVon(sonstigeAnrechenbareKosten, GRENZE_TECHNISCHE_ANLAGEN);
  let kg400Voll = NULL_BETRAG;
  let kg400Haelfte = NULL_BETRAG;
  if (!kosten.technischeAnlagenSelbstGeplant) {
    const ueberGrenze = vergleiche(kosten.kg400, grenzeTechnischeAnlagen) > 0;
    kg400Voll = ueberGrenze ? grenzeTechnischeAnlagen : kosten.kg400;
    if (ueberGrenze) kg400Haelfte = prozentVon(subtrahiere(kosten.kg400, grenzeTechnischeAnlagen), HAELFTE);
  }
  return {
    kg300: kosten.kg300,
    weitereKosten: kosten.weitereKosten,
    sonstigeAnrechenbareKosten,
    kg400: kosten.kg400,
    grenzeTechnischeAnlagen,
    kg400Voll,
    kg400Haelfte,
    mitzuverarbeitendeBausubstanz: kosten.mitzuverarbeitendeBausubstanz,
    anrechenbareKosten: [kg400Voll, kg400Haelfte, kosten.mitzuverarbeitendeBausubstanz].reduce(
      (a, c) => addiere(a, c),
      sonstigeAnrechenbareKosten,
    ),
  };
}

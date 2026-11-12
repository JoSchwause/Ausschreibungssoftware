// SPDX-License-Identifier: AGPL-3.0-or-later
// Anrechenbare Kosten (Ticket 101, D-56): bei Gebäuden und Innenräumen aus Kosten nach DIN 276 nach § 33 HOAI, sonst von
// Hand. Netto (§ 4 Abs. 1). Jeder Teilbetrag kaufmännisch auf 2 Stellen. Rein (A2), nur Dezimalarithmetik (N1).
// `AnrechenbareKostenHerleitung` steht im Vertrag (v1.6, Ticket 97 Punkt 5; Umstellung Ticket 110).

import { NULL_BETRAG, addiere, prozentVon, subtrahiere, vergleiche } from '@tethys/dezimal';
import type { AnrechenbareKostenHerleitung, Betrag } from '@tethys/vertrag';
import { prozent } from './konstanten';

/**
 * Kosten nach DIN 276 eines Gebäudes oder Innenraums für § 33, netto (§ 4 Abs. 1): die Beträge von KG 300 und KG 400 selbst.
 * Gespeichert wird stattdessen der Verweis auf eine Kostenermittlung (`AnrechenbareKostenangabe` mit `art: 'kostenermittlung'`
 * im Vertrag), den `honorarBerechnen` auf diese Form abbildet (Ticket 110).
 */
export interface KostenNachDin276 {
  readonly art: 'din-276';
  /** KG 300 Bauwerk – Baukonstruktionen: voll anrechenbar (§ 33 Abs. 1). */
  readonly kg300: Betrag;
  /** KG 400 Bauwerk – Technische Anlagen (§ 33 Abs. 2). */
  readonly kg400: Betrag;
  /**
   * `true` (der übliche Fall): Der Auftragnehmer plant die Technischen Anlagen nicht selbst fachlich oder überwacht ihre
   * Ausführung nicht fachlich; KG 400 zählt anteilig nach § 33 Abs. 2. `false`: Er plant und überwacht sie selbst; dann
   * zählt KG 400 hier nicht (dafür gibt es das Leistungsbild Technische Ausrüstung).
   */
  readonly technischeAnlagenAnteilig: boolean;
  /**
   * Von Hand: die Kosten nach § 33 Abs. 3, soweit anrechenbar (Herrichten, nichtöffentliche Erschließung, Ausstattung,
   * Kunstwerke, die der Auftragnehmer plant, bei deren Beschaffung er mitwirkt oder deren Ausführung oder Einbau er
   * fachlich überwacht). Mit KG 300 bilden sie die sonstigen anrechenbaren Kosten.
   */
  readonly weitereKosten: Betrag;
  /** Von Hand: der Wert der mitzuverarbeitenden Bausubstanz (§ 2 Abs. 7, § 4 Abs. 3). */
  readonly mitzuverarbeitendeBausubstanz: Betrag;
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
  if (kosten.technischeAnlagenAnteilig) {
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

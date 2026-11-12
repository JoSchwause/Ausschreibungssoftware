// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezugsgrößen nach DIN 277 aus dem Bauwerksmodell (Ticket 108 Punkt 4, X1e; Glossar „Bezugsgröße (DIN 277)“, D-99.7):
// BGF = Σ `GrossFloorArea` und BRI = Σ `GrossVolume` der Geschosse, NRF = Σ `NetFloorArea` der Räume, je wie gelesen auf
// 3 Stellen. Fehlt eine Menge an einem Geschoss oder Raum, gibt das Modell keine Größe, sondern einen Befund (kein Ersatz,
// keine Teilsumme). Eine Eingabe des Nutzers geht dem Modell vor. Rein (A2).

import { NULL_MENGE, addiere } from '@tethys/dezimal';
import type { Bauteilmenge, Bauwerksmodell, Menge, Pruefbefund, Strukturknoten } from '@tethys/vertrag';
import { modellbefund } from './befunde';
import { modellIndex } from './form';

/** Die drei Bezugsgrößen: Brutto-Grundfläche, Brutto-Rauminhalt, Netto-Raumfläche. */
export type Bezugsgroessenart = 'BGF' | 'BRI' | 'NRF';

/**
 * Eine Bezugsgröße mit Quelle (die App zeigt eine Eingabe als solche). `wert` in m² (BGF, NRF) bzw. m³ (BRI); `null` nur mit
 * Quelle `modell`, wenn das Modell sie nicht hergibt (dann steht ein Befund dabei).
 */
export interface Bezugsgroesse {
  readonly art: Bezugsgroessenart;
  readonly wert: Menge | null;
  readonly quelle: 'modell' | 'eingabe';
}

export interface Din277Groessen {
  readonly bgf: Bezugsgroesse;
  readonly bri: Bezugsgroesse;
  readonly nrf: Bezugsgroesse;
  /** Befunde zu den Größen aus dem Modell, in der Reihenfolge BGF, BRI, NRF und darin der Strukturknoten. */
  readonly befunde: readonly Pruefbefund[];
}

/** Woher eine Größe kommt: Art der Knoten, Name und Art der Menge, Code, wenn es keinen Knoten gibt. */
const REGEL: Readonly<
  Record<
    Bezugsgroessenart,
    {
      readonly knoten: Strukturknoten['art'];
      readonly menge: string;
      readonly mengenart: Bauteilmenge['art'];
      readonly keine: 'geschosse-fehlen' | 'raeume-fehlen';
    }
  >
> = {
  BGF: { knoten: 'geschoss', menge: 'GrossFloorArea', mengenart: 'flaeche', keine: 'geschosse-fehlen' },
  BRI: { knoten: 'geschoss', menge: 'GrossVolume', mengenart: 'volumen', keine: 'geschosse-fehlen' },
  NRF: { knoten: 'raum', menge: 'NetFloorArea', mengenart: 'flaeche', keine: 'raeume-fehlen' },
};

function ausModell(
  art: Bezugsgroessenart,
  knoten: readonly Strukturknoten[],
  befunde: Pruefbefund[],
): Bezugsgroesse {
  const r = REGEL[art];
  const passende = knoten.filter((k) => k.art === r.knoten);
  const ohneWert: Bezugsgroesse = { art, wert: null, quelle: 'modell' };
  if (passende.length === 0) {
    befunde.push(modellbefund(r.keine, `Kein Strukturknoten der Art ${r.knoten} für ${art}`, { feld: art }));
    return ohneWert;
  }
  let summe: Menge = NULL_MENGE;
  let vollstaendig = true;
  for (const k of passende) {
    const ort = { globalId: k.globalId, feld: r.menge };
    const treffer = k.mengen.filter((q) => q.name === r.menge);
    const [q] = treffer;
    const name = k.name ?? k.globalId;
    if (q === undefined)
      befunde.push(modellbefund('menge-fehlt', `${name} hat keine Menge ${r.menge} (${art})`, ort));
    else if (treffer.length > 1)
      befunde.push(
        modellbefund('mengenart-mehrdeutig', `${name}: ${r.menge} steht in mehreren Mengensätzen`, ort),
      );
    else if (q.art !== r.mengenart)
      befunde.push(
        modellbefund('einheit-passt-nicht', `${name}: ${r.menge} ist ${q.art}, nicht ${r.mengenart}`, ort),
      );
    else {
      summe = addiere(summe, q.wert);
      continue;
    }
    vollstaendig = false;
  }
  return vollstaendig ? { art, wert: summe, quelle: 'modell' } : ohneWert;
}

/**
 * BGF, BRI und NRF aus dem Modell (Ticket 108 Punkt 4) oder aus den Eingaben des Nutzers. Strukturknoten mit doppelter
 * GlobalId zählen einmal (das erste Objekt, D-66).
 */
export function din277Berechnen(
  modell: Bauwerksmodell,
  eingaben: Partial<Readonly<Record<Bezugsgroessenart, Menge>>> = {},
): Din277Groessen {
  const knoten = [...modellIndex(modell).knoten.values()];
  const befunde: Pruefbefund[] = [];
  const groesse = (art: Bezugsgroessenart): Bezugsgroesse => {
    const e = eingaben[art];
    return e === undefined ? ausModell(art, knoten, befunde) : { art, wert: e, quelle: 'eingabe' };
  };
  const bgf = groesse('BGF');
  const bri = groesse('BRI');
  const nrf = groesse('NRF');
  return { bgf, bri, nrf, befunde };
}

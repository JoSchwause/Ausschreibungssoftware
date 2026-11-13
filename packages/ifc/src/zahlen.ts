// SPDX-License-Identifier: AGPL-3.0-or-later
// Zahlen der Datei (Rand, N4): Der Gleitkommatext von STEP (`3.6000000000000001`, `1.E-05`, `-0.5`, `7`) wird exakt in die
// kanonische Punktnotation des Vertrags gebracht, nie über `number` (N1, Ticket 98, Punkt 2). Nur die lexikalische Form
// wird hier umgestellt (Exponent als Verschiebung des Punkts); gerechnet und gerundet wird mit `dezimal`.

import { alsDezimal } from '@tethys/dezimal';
import type { Dezimal } from '@tethys/vertrag';
import type { StepWert } from './step';

/** INTEGER oder REAL nach ISO 10303-21, dazu `e` klein und ein REAL ohne Ziffern hinter dem Punkt (`5.`). */
const STEP_ZAHL = /^([+-]?)([0-9]+)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]{1,6}))?$/;

/** Größter Betrag eines Exponenten; darüber ist der Wert keine sinnvolle Menge und der Text würde zu lang. */
const MAX_EXPONENT = 400;

/** STEP-Zahl exakt als kanonischer Dezimalwert; `null`, wenn der Text keine Zahl ist oder zu lang würde. */
export function stepZahl(text: string): Dezimal | null {
  const m = STEP_ZAHL.exec(text);
  if (m === null) return null;
  const [, vorzeichen = '', ganz = '', nach = '', exponentText = '0'] = m;
  const exponent = Number.parseInt(exponentText, 10);
  if (Math.abs(exponent) > MAX_EXPONENT) return null;
  let ziffern = ganz + nach;
  let punkt = ganz.length + exponent;
  if (punkt < 1) {
    ziffern = '0'.repeat(1 - punkt) + ziffern;
    punkt = 1;
  }
  if (ziffern.length <= punkt) ziffern += '0'.repeat(punkt - ziffern.length + 1);
  const vor = ziffern.slice(0, punkt).replace(/^0+(?=[0-9])/, '');
  const negativ = vorzeichen === '-' && /[1-9]/.test(ziffern);
  const ergebnis = alsDezimal(`${negativ ? '-' : ''}${vor}.${ziffern.slice(punkt)}`);
  return ergebnis.ok ? ergebnis.wert : null;
}

/** 10 hoch `k` als Dezimalwert (Präfixe der SI-Einheiten). */
export function zehnHoch(k: number): Dezimal | null {
  return stepZahl(`1.E${String(k)}`);
}

/** Zahl eines Parameters, auch als getypter Wert (`IFCLENGTHMEASURE(0.3048)`); `null` für jede andere Art. */
export function zahlwert(w: StepWert | undefined): Dezimal | null {
  if (w?.art === 'zahl') return stepZahl(w.text);
  if (w?.art === 'getypt') return zahlwert(w.wert);
  return null;
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingabe der Schwellen des Preisspiegels (G-26: Ausreißer-Schwelle, ABC-Schwelle A) als de-DE-Text, nur über
// `dezimal` (N4). Eine falsche Eingabe meldet am Feld und lässt die geltende Schwelle stehen; sie sperrt nie (U5).

import { alsProzent, parseDe, vergleiche, vorzeichen } from '@tethys/dezimal';
import type { Ergebnis, Prozent } from '@tethys/vertrag';
import { texte } from './texte';

const HUNDERT = ((): Prozent => {
  const h = alsProzent('100.00');
  if (!h.ok) throw new Error('100,00 % ist kein Prozentwert');
  return h.wert;
})();

/**
 * Ausreißer-Schwelle (Abweichung vom Mittel) und ABC-Schwellen (Anteile), alle höchstens 100 %: Seit die Einstellungen am LV
 * stehen (Ticket 149), gilt die Form des Befehls `PreisspiegelEinstellungenSetzen` (jeder Satz 0 bis 100, D-149.1).
 */
export function schwelleLesen(text: string): Ergebnis<Prozent, string> {
  const t = texte.einstellungen;
  const r = parseDe('prozent', text);
  if (!r.ok)
    return {
      ok: false,
      fehler: r.fehler.code === 'zu-viele-nachkommastellen' ? t.zuVieleStellen : t.ungueltig,
    };
  if (vorzeichen(r.wert) < 0) return { ok: false, fehler: t.negativ };
  if (vergleiche(r.wert, HUNDERT) > 0) return { ok: false, fehler: t.ueber100 };
  return r;
}

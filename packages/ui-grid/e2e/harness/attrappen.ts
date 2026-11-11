// SPDX-License-Identifier: AGPL-3.0-or-later
// Attrappen für Tests und die Browser-Testseite: Das Grid darf `dezimal` nicht importieren (A3), die App steckt
// später die echten Parser ein. Diese Attrappen arbeiten nur mit Zeichenketten und kennen keine Gleitkommazahl;
// sie sind keine Fachlogik und kommen nie in Produktivcode.

import type {
  Betrag,
  Einheitspreis,
  Ergebnis,
  GridIdQuelle,
  GridZahlen,
  Menge,
  PositionId,
} from '@tethys/vertrag';

const DE_ZAHL = /^(-?)(\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/;

function liesDeDE(text: string, stellen: number): string | null {
  const m = DE_ZAHL.exec(text.trim());
  if (!m) return null;
  const vorzeichen = m[1] ?? '';
  const ganz = (m[2] ?? '').replaceAll('.', '').replace(/^0+(?=\d)/, '');
  const rest = m[3] ?? '';
  if (rest.length > stellen) return null;
  return `${vorzeichen}${ganz}.${rest.padEnd(stellen, '0')}`;
}

function formatiereDeDE(wert: string): string {
  const [ganz = '', rest = ''] = wert.split('.');
  const vorzeichen = ganz.startsWith('-') ? '-' : '';
  const ziffern = vorzeichen ? ganz.slice(1) : ganz;
  const gruppiert = ziffern.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${vorzeichen}${gruppiert},${rest}`;
}

export const zahlenAttrappe: GridZahlen = {
  parseMenge(text): Ergebnis<Menge, string> {
    const w = liesDeDE(text, 3);
    return w === null
      ? { ok: false, fehler: 'Keine gültige Menge. Erwartet wird z. B. 1.234,500.' }
      : { ok: true, wert: w as Menge };
  },
  parseEinheitspreis(text): Ergebnis<Einheitspreis, string> {
    const w = liesDeDE(text, 3);
    return w === null
      ? { ok: false, fehler: 'Kein gültiger Einheitspreis. Erwartet wird z. B. 12,350.' }
      : { ok: true, wert: w as Einheitspreis };
  },
  formatMenge: (wert) => formatiereDeDE(wert),
  formatEinheitspreis: (wert) => formatiereDeDE(wert),
  formatBetrag: (wert: Betrag) => formatiereDeDE(wert),
};

/** Fortlaufende Kennungen `neu-1`, `neu-2` … (die App nimmt später UUIDv7, A7). */
export function idQuelleAttrappe(): GridIdQuelle {
  let n = 0;
  return {
    position: () => {
      n += 1;
      return `neu-${String(n)}` as PositionId;
    },
    // v1.2: mechanisch angepasst, Folgeticket (Ticket 46)
    papierkorbeintrag: () =>
      `papierkorb-${String((n += 1))}` as ReturnType<GridIdQuelle['papierkorbeintrag']>,
  };
}

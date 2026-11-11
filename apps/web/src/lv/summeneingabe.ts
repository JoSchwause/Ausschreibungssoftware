// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingabe von Nachlass an der Summenzeile: Text (de-DE) → genau ein Befehl oder eine Meldung (U5: nichts sperren).

import type { LvBefehl, Nachlass } from '@tethys/vertrag';
import { formatiereBetragDe, formatiereProzentDe, zahlLesen } from './zahlen';

export const nachlassText = (n: Nachlass | null): string =>
  n === null ? '' : n.art === 'prozent' ? formatiereProzentDe(n.wert) : formatiereBetragDe(n.wert);

/** Der Befehl zum Nachlassfeld oder eine Meldung; `null`: nichts zu tun. Leerer Text entfernt den Nachlass. */
export function nachlassBefehl(
  alt: Nachlass | null,
  art: Nachlass['art'],
  text: string,
): LvBefehl | string | null {
  if (text.trim() === '') return alt === null ? null : { art: 'NachlassEntfernen' };
  let neu: Nachlass;
  if (art === 'prozent') {
    const r = zahlLesen('prozent', text);
    if (!r.ok) return r.fehler;
    neu = { art, wert: r.wert };
  } else {
    const r = zahlLesen('betrag', text);
    if (!r.ok) return r.fehler;
    neu = { art, wert: r.wert };
  }
  return alt?.art === neu.art && alt.wert === neu.wert ? null : { art: 'NachlassSetzen', nachlass: neu };
}

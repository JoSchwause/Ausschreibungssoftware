// SPDX-License-Identifier: AGPL-3.0-or-later
// Obere Grenze des Fortschritts (N3: zwei Stellen): 100,00 Prozent. Die untere, `NULL_PROZENT`, kommt aus `dezimal`.

import { alsProzent } from '@tethys/dezimal';
import type { Prozent } from '@tethys/vertrag';

const hundert = alsProzent('100.00');
if (!hundert.ok) throw new Error(hundert.fehler.meldung);

/** Obergrenze des Fortschritts: 100,00 Prozent. */
export const HUNDERT_PROZENT: Prozent = hundert.wert;

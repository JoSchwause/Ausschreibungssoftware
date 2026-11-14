// SPDX-License-Identifier: AGPL-3.0-or-later
// Bieterangaben in der Vergabe (Ticket 138; Vertrag v1.7a, D-127.4): Form und Normalform kommen aus dem Kern
// (`bieterangabenFehler`, `bieterangabenNormalisieren`, D-82 S9, D-87); hier bleibt nur der Vergleich zweier normalisierter
// Angaben, mit dem ein unveränderter Bieter das Projekt unverändert lässt.

import type { Anschrift, Bieterangaben } from '@tethys/vertrag';

const TEXTFELDER = ['ansprechperson', 'email', 'telefon'] as const;
const ANSCHRIFTFELDER = ['strasse', 'plz', 'ort'] as const;

const gleicheAnschrift = (x: Anschrift | null, y: Anschrift | null): boolean =>
  x === y || (x !== null && y !== null && ANSCHRIFTFELDER.every((f) => x[f] === y[f]));

/** Gleichheit zweier normalisierter Bieterangaben (`null`: keine). */
export const gleicheBieterangaben = (x: Bieterangaben | null, y: Bieterangaben | null): boolean =>
  x === y ||
  (x !== null &&
    y !== null &&
    gleicheAnschrift(x.anschrift, y.anschrift) &&
    TEXTFELDER.every((f) => x[f] === y[f]));

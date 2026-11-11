// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Beispielwerte der Felder aus dem Vertrag v1.3 (Ticket 53, D-22, D-28), selbst verfasst (C4).

import type { Ansatzzeile, Auftragnehmer, EpaBezeichnung } from '@tethys/vertrag';

export const AUFTRAGNEHMER: Auftragnehmer = {
  name: 'Beispielbau GmbH (erfunden)',
  strasse: 'Musterweg 1',
  plz: null,
  ort: 'Musterstadt',
};

/** Mit Lücke (Platz 3 nicht belegt) und einer leeren Beschriftung (D-28). */
export const EPA_BEZEICHNUNGEN: readonly EpaBezeichnung[] = [
  { nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' },
  { nummer: 2, anteil: 'stoffe', bezeichnung: null },
  { nummer: 4, anteil: 'nachunternehmer', bezeichnung: 'NU-Leistung' },
];

export const ANSATZ: readonly Ansatzzeile[] = [
  { zeile: 1, formel: 91, ausdruck: '2,5*4', variable: 'A' },
  { zeile: 2, formel: 91, ausdruck: 'A+2', variable: null },
];

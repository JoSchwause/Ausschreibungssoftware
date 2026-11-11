// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet an der Rechnung anwenden und umkehren (Ticket 81; vertrag v1.4, D-36 (8)).

import type { RechnungChangeSetAnwenden, RechnungChangeSetUmkehren } from '@tethys/vertrag';

export const rechnungChangeSetAnwenden: RechnungChangeSetAnwenden = () => {
  throw new Error('Ticket 81: rechnungChangeSetAnwenden folgt');
};

export const rechnungChangeSetUmkehren: RechnungChangeSetUmkehren = () => {
  throw new Error('Ticket 81: rechnungChangeSetUmkehren folgt');
};

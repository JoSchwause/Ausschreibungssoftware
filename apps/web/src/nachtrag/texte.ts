// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Nachträge (Ticket 86, L1).

export const texte = {
  lvName: (nummer: string, bezeichnung: string): string =>
    bezeichnung === '' ? `Nachtrag ${nummer}` : `Nachtrag ${nummer} – ${bezeichnung}`,
} as const;

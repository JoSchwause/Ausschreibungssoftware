// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Hilfe (Ticket 147): eine Seite `/hilfe` mit Reitern; der Anker wählt den Reiter, so verweisen andere Seiten
// (Statuszeile, Begrüßung) direkt auf einen Teil, ohne eigene Route in `App.tsx`.

/** Die Teile der Hilfe in der Reihenfolge der Reiter. */
export const HILFETEILE = ['erste-schritte', 'daten', 'tastenkuerzel', 'annahmen', 'ueber'] as const;

export type Hilfeteil = (typeof HILFETEILE)[number];

/** `/hilfe` oder `/hilfe#<teil>`. */
export function hilfePfad(teil?: Hilfeteil): string {
  return teil === undefined ? '/hilfe' : `/hilfe#${teil}`;
}

/** Der Teil zu einem Anker (`#annahmen`); unbekannt oder leer: `null`. */
export function hilfeteilAus(anker: string): Hilfeteil | null {
  const t = anker.replace(/^#/, '');
  return (HILFETEILE as readonly string[]).includes(t) ? (t as Hilfeteil) : null;
}

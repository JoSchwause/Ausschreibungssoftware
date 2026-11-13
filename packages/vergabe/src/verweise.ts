// SPDX-License-Identifier: AGPL-3.0-or-later
// Verweissperre (Ticket 138; Vertrag v1.7a, D-127.2, D-74): Ein löschender Befehl bekommt die Verweise auf sein Ziel als
// Eingabe (Anzahl je Art, gezählt von der App aus den Listen des Speichers) und weist ab, solange eine der Arten, die ihn
// sperren, eine Anzahl > 0 hat. Rein: Die Funktion zählt nichts selbst.

import type { Befehlsfehler, Verweisanzahl, Verweisart } from '@tethys/vertrag';

const ARTEN: readonly Verweisart[] = ['angebot', 'nachtrag', 'aufmass', 'rechnung', 'mangel'];

/** Einzahl und Mehrzahl je Art, nur für die Meldung an Entwickler und Protokoll (die Anzeige baut die App, L4/L5). */
const WORT: { readonly [A in Verweisart]: readonly [string, string] } = {
  angebot: ['Angebot', 'Angebote'],
  nachtrag: ['Nachtrag', 'Nachträge'],
  aufmass: ['Aufmaßblatt', 'Aufmaßblätter'],
  rechnung: ['Rechnung', 'Rechnungen'],
  mangel: ['Mangel', 'Mängel'],
};

const ungueltig = (meldung: string): Befehlsfehler => ({ code: 'ungueltige-eingabe', meldung, feld: 'verweise' });

/**
 * Prüft die Verweise für einen löschenden Befehl. `sperrend` sind die Arten, die ihn sperren, in der Reihenfolge, in der
 * der Fehler sie nennt; andere Arten liest er nicht (ihre Form wird trotzdem geprüft). Eine fehlende Art zählt 0.
 *
 * - `verweise` fehlt oder hat nicht die Form `Verweisanzahl[]` (bekannte Art, jede höchstens einmal, ganze Anzahl ≥ 0):
 *   `ungueltige-eingabe` mit `feld: 'verweise'` (ohne Bestand ist das Löschen nicht prüfbar).
 * - eine sperrende Art mit Anzahl > 0: `verweise-vorhanden`, `verweise` mit genau diesen Arten (nie leer).
 * - sonst `null`.
 */
export function verweissperre(
  befehl: string,
  ziel: string,
  verweise: readonly Verweisanzahl[] | undefined,
  sperrend: readonly Verweisart[],
): Befehlsfehler | null {
  if (verweise === undefined)
    return ungueltig(`${befehl}: Die Verweise auf ${ziel} fehlen; ohne sie ist das Löschen nicht prüfbar.`);
  if (!Array.isArray(verweise)) return ungueltig(`${befehl}: verweise muss eine Liste sein.`);
  const anzahl = new Map<Verweisart, number>();
  for (const v of verweise as readonly unknown[]) {
    if (typeof v !== 'object' || v === null) return ungueltig(`${befehl}: Jeder Verweis muss ein Objekt sein.`);
    const { art, anzahl: n } = v as { art?: unknown; anzahl?: unknown };
    if (!ARTEN.includes(art as Verweisart)) return ungueltig(`${befehl}: Unbekannte Verweisart ${String(art)}.`);
    if (anzahl.has(art as Verweisart)) return ungueltig(`${befehl}: Verweisart ${String(art)} steht zweimal.`);
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0)
      return ungueltig(`${befehl}: Die Anzahl der Art ${String(art)} muss eine ganze Zahl ≥ 0 sein.`);
    anzahl.set(art as Verweisart, n);
  }
  const vorhanden: Verweisanzahl[] = sperrend.flatMap((art) => {
    const n = anzahl.get(art) ?? 0;
    return n > 0 ? [{ art, anzahl: n }] : [];
  });
  if (vorhanden.length === 0) return null;
  const teile = vorhanden.map(({ art, anzahl: n }) => `${n} ${WORT[art][n === 1 ? 0 : 1]}`);
  const liste = teile.length === 1 ? teile[0] : `${teile.slice(0, -1).join(', ')} und ${teile[teile.length - 1]}`;
  return {
    code: 'verweise-vorhanden',
    meldung: `${befehl}: Auf ${ziel} ${vorhanden.length === 1 && vorhanden[0]?.anzahl === 1 ? 'verweist' : 'verweisen'} ${liste}.`,
    verweise: vorhanden,
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Werkzeug „Tabelle einfügen“ (Ticket 54, Punkt 5): Dokumentknoten einer neuen Tabelle und die Grenzen der Auswahl.
// Jede Zelle enthält einen leeren losen Absatz; das ist im Langtext `{ spalten: 1, inhalt: [] }` (siehe `abbildung.ts`),
// also nie eine Tabelle ohne Zeile oder eine Zeile ohne Zelle (D-T34).

import { KNOTEN, type DokumentKnoten } from './abbildung';

/** Grenzen der Auswahl: genug für Aufmaß- und Stofftabellen im Langtext, klein genug für den Bildschirm. */
export const TABELLE_GRENZEN = {
  zeilen: { min: 1, max: 20 },
  spalten: { min: 1, max: 10 },
} as const;

export const TABELLE_VORGABE = { zeilen: 2, spalten: 2 } as const;

export interface Tabellenmass {
  zeilen: number;
  spalten: number;
}

function klemme(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Rundet auf ganze Zahlen und klemmt auf die Grenzen; keine Zahl wird zur kleinsten Größe. */
export function begrenzeTabellenmass(zeilen: number, spalten: number): Tabellenmass {
  return {
    zeilen: klemme(zeilen, TABELLE_GRENZEN.zeilen.min, TABELLE_GRENZEN.zeilen.max),
    spalten: klemme(spalten, TABELLE_GRENZEN.spalten.min, TABELLE_GRENZEN.spalten.max),
  };
}

/** Neue Tabelle als Dokumentknoten; die Maße werden begrenzt. */
export function leereTabelle(zeilen: number, spalten: number): DokumentKnoten {
  const m = begrenzeTabellenmass(zeilen, spalten);
  const zelle = (): DokumentKnoten => ({
    type: KNOTEN.tabellenzelle,
    attrs: { colspan: 1, rowspan: 1, colwidth: null },
    content: [{ type: KNOTEN.absatz, attrs: { lose: true } }],
  });
  return {
    type: KNOTEN.tabelle,
    content: Array.from({ length: m.zeilen }, () => ({
      type: KNOTEN.tabellenzeile,
      content: Array.from({ length: m.spalten }, zelle),
    })),
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Kanonisches JSON (G-56): Schlüssel aufsteigend sortiert, Arrayreihenfolge unverändert, keine Gleitkommazahlen.

function sortiere(wert: unknown, pfad: string): unknown {
  if (wert === null || typeof wert === 'string' || typeof wert === 'boolean') return wert;
  if (typeof wert === 'number') {
    if (!Number.isSafeInteger(wert)) {
      throw new TypeError(
        `${pfad}: nur ganze Zahlen sind kanonisch darstellbar (Geld steht als Zeichenkette, N1)`,
      );
    }
    return wert;
  }
  if (Array.isArray(wert)) return (wert as unknown[]).map((w, i) => sortiere(w, `${pfad}[${String(i)}]`));
  if (typeof wert === 'object') {
    const eintraege = Object.entries(wert)
      .filter(([, w]) => w !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, w]): [string, unknown] => [k, sortiere(w, `${pfad}.${k}`)]);
    // `fromEntries` legt Eigenschaften an, ohne `__proto__` als Prototypsetzung zu deuten.
    return Object.fromEntries(eintraege);
  }
  throw new TypeError(`${pfad}: Wert vom Typ ${typeof wert} ist nicht JSON-tauglich`);
}

/** Kompakte kanonische Form (Vergleich, Speicherung einzelner Felder). */
export function kanonischKompakt(wert: unknown): string {
  return JSON.stringify(sortiere(wert, '$'));
}

/** Kanonische Form der Projektdatei: zwei Leerzeichen Einrückung, abschließender Zeilenumbruch. */
export function kanonischesJson(wert: unknown): string {
  return `${JSON.stringify(sortiere(wert, '$'), null, 2)}\n`;
}

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

/**
 * Kompakte kanonische Form einer Liste, gleich `kanonischKompakt(liste)`, Element für Element mit Merkliste (Ticket 94):
 * Ein Element, das als dasselbe Objekt schon einmal geschrieben wurde, wird nicht noch einmal sortiert. Die Merkliste gilt
 * nur, solange niemand die Elemente ändert, also innerhalb eines Aufrufs von `anwenden` (ChangeSets sind unveränderlich).
 */
export function kanonischeListe(
  liste: readonly unknown[],
  merkliste: WeakMap<object, string>,
  pfad = '$',
): string {
  const teile: string[] = [];
  for (let i = 0; i < liste.length; i++) {
    // Eine Lücke schreibt `JSON.stringify` als `null`, wie in `kanonischKompakt`.
    if (!(i in liste)) {
      teile.push('null');
      continue;
    }
    const element = liste[i];
    const objekt = typeof element === 'object' && element !== null ? element : null;
    let text = objekt === null ? undefined : merkliste.get(objekt);
    if (text === undefined) {
      text = JSON.stringify(sortiere(element, `${pfad}[${String(i)}]`));
      if (objekt !== null) merkliste.set(objekt, text);
    }
    teile.push(text);
  }
  return `[${teile.join(',')}]`;
}

/** Kanonische Form der Projektdatei: zwei Leerzeichen Einrückung, abschließender Zeilenumbruch. */
export function kanonischesJson(wert: unknown): string {
  return `${JSON.stringify(sortiere(wert, '$'), null, 2)}\n`;
}

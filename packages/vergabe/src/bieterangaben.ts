// SPDX-License-Identifier: AGPL-3.0-or-later
// Bieterangaben: Form prüfen und normalisieren (Ticket 138; Vertrag v1.7a, D-127.4).
//
// Lokale Fassung (D-82, S9): Die Normalisierung gehört als eine Funktion in den Kern, der sie für `BieterAnlegen` mit Angaben
// ebenso braucht (Ticket 137 exportiert sie). Bis sie dort steht, liegt sie hier und wird nicht exportiert; danach ersetzt der
// Import aus `@tethys/kern` diese Datei (Folgeschritt, siehe `## Comments` in Ticket 138).

import type { Anschrift, Bieterangaben } from '@tethys/vertrag';

const TEXTFELDER = ['ansprechperson', 'email', 'telefon'] as const;
const ANSCHRIFTFELDER = ['strasse', 'plz', 'ort'] as const;

const istObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/** Das erste der Felder, das weder Text noch `null` ist, als Pfad; sonst `null`. */
function feldFehler(objekt: Record<string, unknown>, felder: readonly string[], pfad: string): string | null {
  const f = felder.find((x) => objekt[x] !== null && typeof objekt[x] !== 'string');
  return f === undefined ? null : `${pfad}.${f}`;
}

/**
 * Prüft die Form der Bieterangaben eines Befehls: Objekt oder `null`; jedes Textfeld Text oder `null` (fehlend ist ein
 * Fehler); `anschrift` Objekt oder `null` mit Teilen aus Text oder `null`. Liefert den Pfad des ersten falschen Felds
 * (`angaben`, `angaben.email`, `angaben.anschrift.plz`, …) oder `null`. Kein Formatcheck für E-Mail und Telefon (U5).
 */
export function bieterangabenFormfehler(a: unknown): string | null {
  if (a === null) return null;
  if (!istObjekt(a)) return 'angaben';
  if (a.anschrift !== null) {
    if (!istObjekt(a.anschrift)) return 'angaben.anschrift';
    const f = feldFehler(a.anschrift, ANSCHRIFTFELDER, 'angaben.anschrift');
    if (f !== null) return f;
  }
  return feldFehler(a, TEXTFELDER, 'angaben');
}

const leer = (t: string | null): string | null => (t === '' ? null : t);

/**
 * Normalisiert Bieterangaben (D-127.4): `''` wird `null`, eine Anschrift ohne jedes Teil `null`, Angaben ohne jedes Feld
 * `null` (der Block fehlt dann am Bieter). Text bleibt sonst unverändert (kein Kürzen, U5). Setzt die Form voraus
 * (`bieterangabenFormfehler`).
 */
export function bieterangabenNormalisieren(a: Bieterangaben | null): Bieterangaben | null {
  if (a === null) return null;
  const teile: Anschrift | null =
    a.anschrift === null
      ? null
      : { strasse: leer(a.anschrift.strasse), plz: leer(a.anschrift.plz), ort: leer(a.anschrift.ort) };
  const anschrift = teile !== null && ANSCHRIFTFELDER.some((f) => teile[f] !== null) ? teile : null;
  const n: Bieterangaben = {
    anschrift,
    ansprechperson: leer(a.ansprechperson),
    email: leer(a.email),
    telefon: leer(a.telefon),
  };
  return anschrift === null && TEXTFELDER.every((f) => n[f] === null) ? null : n;
}

const gleicheAnschrift = (x: Anschrift | null, y: Anschrift | null): boolean =>
  x === y || (x !== null && y !== null && ANSCHRIFTFELDER.every((f) => x[f] === y[f]));

/** Gleichheit zweier normalisierter Bieterangaben (`null`: keine). */
export const gleicheBieterangaben = (x: Bieterangaben | null, y: Bieterangaben | null): boolean =>
  x === y ||
  (x !== null &&
    y !== null &&
    gleicheAnschrift(x.anschrift, y.anschrift) &&
    TEXTFELDER.every((f) => x[f] === y[f]));

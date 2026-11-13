// SPDX-License-Identifier: AGPL-3.0-or-later
// Stammdaten aus Vertrag v1.7a (Ticket 137; E10, D-127.4, D-127.5, D-127.8): Form und Normalform von Anschrift,
// Projektangaben, Bieterangaben und Büro. Eine Stelle für die Regel „nie `''`, ganz leer ist keine Angabe“: Projektbefehle,
// Einstellungsbefehle und (über den Einstiegspunkt) die Bieterbefehle der Vergabe fragen hier (D-82 S9).
//
// Normalform: `''` in einem Textfeld wird `null`; eine Anschrift ohne jedes Teil wird `null`; Angaben ohne jeden Wert werden
// `null`, und der Aufrufer lässt das Feld dann weg (eine Schreibweise für „keine Angaben“). Leerraum bleibt Text (U5), und
// kein Format (E-Mail, Telefon, PLZ) wird geprüft. Die Normalform trägt genau die Felder des Vertrags: Was ein Aufrufer zur
// Laufzeit mehr mitbringt, fällt weg.

import type { Anschrift, Bieter, Bieterangaben, Buero, Projektangaben } from '@tethys/vertrag';
import type { Formfehler } from './positionsfelder';
import { mitFeld } from './struktur';

const istObjekt = (w: unknown): w is Record<string, unknown> =>
  typeof w === 'object' && w !== null && !Array.isArray(w);

/** Die Textfelder `felder` von `wert`: je ein Text oder `null`; ein fehlendes Feld ist ein Formfehler. */
function textfelderFehler(
  wert: Record<string, unknown>,
  felder: readonly string[],
  pfad: string,
): Formfehler | null {
  for (const f of felder) {
    const v = wert[f];
    if (v !== null && typeof v !== 'string')
      return { feld: `${pfad}.${f}`, meldung: `${f} muss ein Text oder null sein.` };
  }
  return null;
}

/** `''` ist kein Wert: `null`. */
const text = (t: string | null): string | null => (t === '' ? null : t);

const ANSCHRIFT_FELDER = ['strasse', 'plz', 'ort'] as const;

/** Form einer Anschrift oder `null` an der Stelle `pfad` (etwa `angaben.baustelle`). */
export function anschriftFehler(wert: unknown, pfad: string): Formfehler | null {
  if (wert === null) return null;
  if (!istObjekt(wert)) return { feld: pfad, meldung: 'Die Anschrift ist ein Objekt oder null.' };
  return textfelderFehler(wert, ANSCHRIFT_FELDER, pfad);
}

/** Normalform einer Anschrift: `''` → `null`; ohne jedes Teil `null`. */
export function anschriftNormal(a: Anschrift | null): Anschrift | null {
  if (a === null) return null;
  const n: Anschrift = { strasse: text(a.strasse), plz: text(a.plz), ort: text(a.ort) };
  return n.strasse === null && n.plz === null && n.ort === null ? null : n;
}

/** Form der Projektangaben (Vertrag `Projektangaben`) an der Stelle `pfad`; `null` ist in Form. */
export function projektangabenFehler(wert: unknown, pfad: string): Formfehler | null {
  if (wert === null) return null;
  if (!istObjekt(wert)) return { feld: pfad, meldung: 'Die Projektangaben sind ein Objekt oder null.' };
  return (
    textfelderFehler(wert, ['nummer', 'ort'], pfad) ?? anschriftFehler(wert['baustelle'], `${pfad}.baustelle`)
  );
}

/** Normalform der Projektangaben; `null`: keine Angaben (das Feld fehlt am Projekt). */
export function projektangabenNormal(a: Projektangaben | null): Projektangaben | null {
  if (a === null) return null;
  const n: Projektangaben = {
    nummer: text(a.nummer),
    ort: text(a.ort),
    baustelle: anschriftNormal(a.baustelle),
  };
  return n.nummer === null && n.ort === null && n.baustelle === null ? null : n;
}

/**
 * Form der Bieterangaben (Vertrag `Bieterangaben`) an der Stelle `pfad` (`angaben` bei `BieterangabenSetzen`,
 * `bieter.angaben` bei `BieterAnlegen`); `null` ist in Form. Für `vergabe` exportiert (D-82 S9).
 */
export function bieterangabenFehler(wert: unknown, pfad: string): Formfehler | null {
  if (wert === null) return null;
  if (!istObjekt(wert)) return { feld: pfad, meldung: 'Die Bieterangaben sind ein Objekt oder null.' };
  return (
    anschriftFehler(wert['anschrift'], `${pfad}.anschrift`) ??
    textfelderFehler(wert, ['ansprechperson', 'email', 'telefon'], pfad)
  );
}

/**
 * Normalform der Bieterangaben (D-127.4): `''` → `null`, eine leere Anschrift `null`; ganz leere Angaben `null` (das Feld
 * fehlt dann am Bieter, siehe `bieterMitAngaben`). Für `vergabe` exportiert (D-82 S9).
 */
export function bieterangabenNormal(a: Bieterangaben | null): Bieterangaben | null {
  if (a === null) return null;
  const n: Bieterangaben = {
    anschrift: anschriftNormal(a.anschrift),
    ansprechperson: text(a.ansprechperson),
    email: text(a.email),
    telefon: text(a.telefon),
  };
  return n.anschrift === null && n.ansprechperson === null && n.email === null && n.telefon === null
    ? null
    : n;
}

/** Der Bieter mit den normalisierten Angaben `angaben`; ohne Angaben fehlt das Feld (nie `null`). */
export const bieterMitAngaben = (b: Bieter, angaben: Bieterangaben | null): Bieter =>
  mitFeld(b, 'angaben', bieterangabenNormal(angaben));

/** Form des Büros (Vertrag `Buero`) an der Stelle `pfad`: Name nicht leer (Leerraum zählt als leer), sonst wie oben. */
export function bueroFehler(wert: unknown, pfad: string): Formfehler | null {
  if (wert === null) return null;
  if (!istObjekt(wert)) return { feld: pfad, meldung: 'Das Büro ist ein Objekt oder null.' };
  const name = wert['name'];
  if (typeof name !== 'string' || name.trim() === '')
    return { feld: `${pfad}.name`, meldung: 'Ein Büro braucht einen Namen.' };
  return (
    anschriftFehler(wert['anschrift'], `${pfad}.anschrift`) ??
    textfelderFehler(wert, ['telefon', 'email'], pfad)
  );
}

/** Normalform des Büros: die Felder wie bei den Bieterangaben; der Name bleibt, wie er ist. */
export const bueroNormal = (b: Buero): Buero => ({
  name: b.name,
  anschrift: anschriftNormal(b.anschrift),
  telefon: text(b.telefon),
  email: text(b.email),
});

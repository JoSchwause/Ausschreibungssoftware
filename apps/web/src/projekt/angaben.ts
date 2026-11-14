// SPDX-License-Identifier: AGPL-3.0-or-later
// Formulare „Projektangaben“ und „Büro (Absender)“ (Ticket 150; E10, D-127.5, D-73): Formularwerte als Text, daraus die
// Befehle. Leere Felder werden `null` (der Kern normalisiert ebenso, D-137.8); kein Formatcheck (U5).

import type { Anschrift, Buero, Projekt, ProjektangabenSetzen } from '@tethys/vertrag';

export interface ProjektFormular {
  readonly name: string;
  readonly bauherr: string;
  readonly nummer: string;
  readonly ort: string;
  readonly strasse: string;
  readonly plz: string;
  readonly baustelleOrt: string;
}

export interface BueroFormular {
  readonly name: string;
  readonly strasse: string;
  readonly plz: string;
  readonly ort: string;
  readonly telefon: string;
  readonly email: string;
}

const text = (w: string | null | undefined): string => w ?? '';
const wert = (w: string): string | null => (w.trim() === '' ? null : w.trim());

function anschrift(strasse: string, plz: string, ort: string): Anschrift | null {
  const a = { strasse: wert(strasse), plz: wert(plz), ort: wert(ort) };
  return a.strasse === null && a.plz === null && a.ort === null ? null : a;
}

export function projektFormular(p: Projekt): ProjektFormular {
  const a = p.angaben;
  return {
    name: p.name,
    bauherr: p.bauherr.name,
    nummer: text(a?.nummer),
    ort: text(a?.ort),
    strasse: text(a?.baustelle?.strasse),
    plz: text(a?.baustelle?.plz),
    baustelleOrt: text(a?.baustelle?.ort),
  };
}

/** Ein Befehl für den ganzen Dialog (ein Undo-Schritt); die Anschrift des Bauherrn (freier Text) bleibt unverändert. */
export function projektangabenBefehl(p: Projekt, f: ProjektFormular): ProjektangabenSetzen {
  const angaben = {
    nummer: wert(f.nummer),
    ort: wert(f.ort),
    baustelle: anschrift(f.strasse, f.plz, f.baustelleOrt),
  };
  const leer = angaben.nummer === null && angaben.ort === null && angaben.baustelle === null;
  return {
    art: 'ProjektangabenSetzen',
    name: f.name.trim(),
    bauherr: { name: f.bauherr.trim(), anschrift: p.bauherr.anschrift },
    angaben: leer ? null : angaben,
  };
}

export function bueroFormular(b: Buero | null): BueroFormular {
  return {
    name: text(b?.name),
    strasse: text(b?.anschrift?.strasse),
    plz: text(b?.anschrift?.plz),
    ort: text(b?.anschrift?.ort),
    telefon: text(b?.telefon),
    email: text(b?.email),
  };
}

/** Das Büro aus dem Formular: alles leer → kein Büro; Angaben ohne Namen → `ok: false` (ein Büro braucht einen Namen). */
export function bueroAusFormular(
  f: BueroFormular,
): { readonly ok: true; readonly buero: Buero | null } | { readonly ok: false } {
  const name = wert(f.name);
  const rest = {
    anschrift: anschrift(f.strasse, f.plz, f.ort),
    telefon: wert(f.telefon),
    email: wert(f.email),
  };
  if (name === null)
    return rest.anschrift === null && rest.telefon === null && rest.email === null
      ? { ok: true, buero: null }
      : { ok: false };
  return { ok: true, buero: { name, ...rest } };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Bieter im Formular (Ticket 149; E8, E10): Name und Bieterangaben als Texte der Felder, daraus die Befehle `BieterUmbenennen`
// und `BieterangabenSetzen`, nur für das, was sich ändert (ein Dialog, eine Befehlsfolge, ein Undo-Schritt; D-12). Rein und
// ohne React. Normalisiert wird wie in `vergabe` (D-138.3): `''` → `null`, kein Kürzen, kein Formatcheck (U5).

import type { Anschrift, Bieter, Bieterangaben, ProjektBefehl } from '@tethys/vertrag';

export interface Bieterformular {
  readonly name: string;
  readonly strasse: string;
  readonly plz: string;
  readonly ort: string;
  readonly ansprechperson: string;
  readonly email: string;
  readonly telefon: string;
}

const text = (t: string | null | undefined): string => t ?? '';
const oderNull = (t: string): string | null => (t === '' ? null : t);

/** Die Felder des Formulars aus dem gespeicherten Bieter. */
export function bieterformular(b: Bieter): Bieterformular {
  return { name: b.name, ...angabenfelder(b.angaben) };
}

function angabenfelder(a: Bieterangaben | null | undefined): Omit<Bieterformular, 'name'> {
  return {
    strasse: text(a?.anschrift?.strasse),
    plz: text(a?.anschrift?.plz),
    ort: text(a?.anschrift?.ort),
    ansprechperson: text(a?.ansprechperson),
    email: text(a?.email),
    telefon: text(a?.telefon),
  };
}

/** Die Bieterangaben des Formulars in Normalform; `null`: keine Angaben. */
export function bieterangabenAusFormular(f: Bieterformular): Bieterangaben | null {
  const anschrift: Anschrift = { strasse: oderNull(f.strasse), plz: oderNull(f.plz), ort: oderNull(f.ort) };
  const a: Bieterangaben = {
    anschrift:
      anschrift.strasse === null && anschrift.plz === null && anschrift.ort === null ? null : anschrift,
    ansprechperson: oderNull(f.ansprechperson),
    email: oderNull(f.email),
    telefon: oderNull(f.telefon),
  };
  return a.anschrift === null && a.ansprechperson === null && a.email === null && a.telefon === null
    ? null
    : a;
}

/** Gleich nach der Normalform (`''` wie `null`, leere Anschrift wie keine). */
const gleicheAngaben = (a: Bieterangaben | null | undefined, b: Bieterangaben | null | undefined): boolean =>
  JSON.stringify(bieterangabenAusFormular({ name: '', ...angabenfelder(a) })) ===
  JSON.stringify(bieterangabenAusFormular({ name: '', ...angabenfelder(b) }));

/** Die Befehle, die den Bieter auf den Stand des Formulars bringen; leer, wenn sich nichts ändert. */
export function bieterBefehle(b: Bieter, f: Bieterformular): ProjektBefehl[] {
  const befehle: ProjektBefehl[] = [];
  if (f.name !== b.name) befehle.push({ art: 'BieterUmbenennen', bieterId: b.id, name: f.name });
  const neu = bieterangabenAusFormular(f);
  if (!gleicheAngaben(b.angaben, neu))
    befehle.push({ art: 'BieterangabenSetzen', bieterId: b.id, angaben: neu });
  return befehle;
}

/** Ob die Angaben der Datei (X84) von denen des vorhandenen Bieters abweichen (D-82 S7: dann bietet die App sie an). */
export function angabenWeichenAb(b: Bieter, ausDatei: Bieterangaben): boolean {
  return !gleicheAngaben(b.angaben, ausDatei);
}

/** Eine Zeile für die Anschrift: „Straße, PLZ Ort“; leer ohne Anschrift. */
export function anschriftZeile(a: Anschrift | null | undefined): string {
  if (a === null || a === undefined) return '';
  const ort = [a.plz, a.ort].filter((x) => x !== null).join(' ');
  return [a.strasse ?? '', ort].filter((x) => x !== '').join(', ');
}

/** Kontakt in einer Zeile: Ansprechperson, Telefon, E-Mail, getrennt mit „ · “. */
export function kontaktZeile(a: Bieterangaben | undefined): string {
  if (a === undefined) return '';
  return [a.ansprechperson, a.telefon, a.email].filter((x): x is string => x !== null).join(' · ');
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (O3): die eigenen Druckprofile des Nutzers als Einstellung der App (D-36 (7), D-90.1): eine Liste, als JSON
// in einem Schlüssel abgelegt, nicht im Projekt. Alles hier ist rein; `@tethys/ausgabe` kommt als `Werkzeug` herein,
// damit das Hauptbündel pdfmake nicht mitzieht (die Dialoge laden das Paket nach). Nichts wirft, nichts sperrt (U5).

import type { Druckprofil, DruckprofilBefund } from '@tethys/ausgabe';
import { ERSATZ_LV, dateinameSauber } from '../dateiname';

export type Werkzeug = Pick<
  typeof import('@tethys/ausgabe'),
  'STANDARD_DRUCKPROFILE' | 'druckprofilAusJson' | 'druckprofilAlsJson'
>;

/** Schlüssel im Speicher des Browsers (Einstellung des Nutzers, wie `tethys-modus`). */
export const PROFILE_SCHLUESSEL = 'tethys-druckprofile';
export const PROFIL_GEWAEHLT_SCHLUESSEL = 'tethys-druckprofil-gewaehlt';

/** Mehr Zeilen kürzt kein Nutzer sinnvoll; schützt vor Tippfehlern. */
export const ZEILEN_HOECHSTENS = 999;

export const istStandardName = (w: Werkzeug, name: string): boolean =>
  w.STANDARD_DRUCKPROFILE.some((p) => p.name === name);

/** Standardprofile zuerst, dann die eigenen in Ablagereihenfolge. */
export const alleProfile = (w: Werkzeug, eigene: readonly Druckprofil[]): readonly Druckprofil[] => [
  ...w.STANDARD_DRUCKPROFILE,
  ...eigene,
];

/** Liest die abgelegte Liste; Unlesbares fällt weg, Namen von Standardprofilen und doppelte Namen ebenso. */
export function eigeneAusText(w: Werkzeug, text: string | null): Druckprofil[] {
  if (text === null) return [];
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(roh)) return [];
  const aus: Druckprofil[] = [];
  for (const eintrag of roh as unknown[]) {
    const { profil } = w.druckprofilAusJson(JSON.stringify(eintrag));
    if (profil === null || profil.name.trim() === '') continue;
    if (istStandardName(w, profil.name) || aus.some((p) => p.name === profil.name)) continue;
    aus.push(profil);
  }
  return aus;
}

export const eigeneAlsText = (eigene: readonly Druckprofil[]): string => JSON.stringify(eigene);

export type ProfilFehler = 'name-leer' | 'name-standard' | 'name-vergeben';

export type ProfilErgebnis =
  | { readonly ok: true; readonly eigene: Druckprofil[] }
  | { readonly ok: false; readonly fehler: ProfilFehler };

/** Legt ein neues eigenes Profil an; ein vergebener oder Standard-Name ist abgewiesen (nichts überschreibt still, Q5). */
export function profilAnlegen(w: Werkzeug, eigene: readonly Druckprofil[], profil: Druckprofil): ProfilErgebnis {
  const name = profil.name.trim();
  if (name === '') return { ok: false, fehler: 'name-leer' };
  if (istStandardName(w, name)) return { ok: false, fehler: 'name-standard' };
  if (eigene.some((p) => p.name === name)) return { ok: false, fehler: 'name-vergeben' };
  return { ok: true, eigene: [...eigene, { ...profil, name }] };
}

/** Ändert ein vorhandenes eigenes Profil am Platz; ein Standardprofil ändert sich nie. */
export function profilAendern(w: Werkzeug, eigene: readonly Druckprofil[], profil: Druckprofil): ProfilErgebnis {
  if (istStandardName(w, profil.name)) return { ok: false, fehler: 'name-standard' };
  if (!eigene.some((p) => p.name === profil.name)) return { ok: false, fehler: 'name-leer' };
  return { ok: true, eigene: eigene.map((p) => (p.name === profil.name ? profil : p)) };
}

export const profilLoeschen = (eigene: readonly Druckprofil[], name: string): Druckprofil[] =>
  eigene.filter((p) => p.name !== name);

/** Ein freier Name: `name`, sonst `name (2)`, `name (3)` … gegen Standard- und eigene Profile. */
export function freierName(w: Werkzeug, eigene: readonly Druckprofil[], name: string): string {
  const grund = name.trim() === '' ? 'Profil' : name.trim();
  const belegt = (n: string): boolean => istStandardName(w, n) || eigene.some((p) => p.name === n);
  if (!belegt(grund)) return grund;
  for (let i = 2; ; i += 1) {
    const n = `${grund} (${String(i)})`;
    if (!belegt(n)) return n;
  }
}

export interface Import {
  readonly eigene: Druckprofil[];
  readonly profil: Druckprofil | null;
  readonly befunde: readonly DruckprofilBefund[];
  /** Der Name wurde geändert, weil er schon vergeben war. */
  readonly umbenannt: boolean;
}

/** Liest eine Profil-Datei und hängt das Profil an; ein vergebener Name wird mit „(2)“ ergänzt. */
export function profilImportieren(w: Werkzeug, eigene: readonly Druckprofil[], text: string): Import {
  const r = w.druckprofilAusJson(text);
  if (r.profil === null) return { eigene: [...eigene], profil: null, befunde: r.befunde, umbenannt: false };
  const name = freierName(w, eigene, r.profil.name);
  const profil = { ...r.profil, name };
  return {
    eigene: [...eigene, profil],
    profil,
    befunde: r.befunde,
    umbenannt: name !== r.profil.name.trim(),
  };
}

export const dateinameProfil = (name: string): string => `${dateinameSauber(name, ERSATZ_LV)}.druckprofil.json`;

/** Zeilenzahl der Kürzung: ganze Zahl von 1 bis `ZEILEN_HOECHSTENS`, sonst `null`. */
export function zeilenLesen(text: string): number | null {
  if (!/^\s*\d{1,4}\s*$/.test(text)) return null;
  const n = Number(text.trim());
  return n >= 1 && n <= ZEILEN_HOECHSTENS ? n : null;
}

/** Gleicher Inhalt? Für „geändert“ im Dialog. */
export function profilGleich(a: Druckprofil, b: Druckprofil): boolean {
  return (
    a.name === b.name &&
    a.mitPreisen === b.mitPreisen &&
    a.titelsummen === b.titelsummen &&
    a.schlussblock === b.schlussblock &&
    a.deckblatt === b.deckblatt &&
    a.kopfzeile === b.kopfzeile &&
    a.fusszeile === b.fusszeile &&
    a.seitenrand === b.seitenrand &&
    a.langtext.art === b.langtext.art &&
    (a.langtext.art !== 'zeilen' || (b.langtext.art === 'zeilen' && a.langtext.anzahl === b.langtext.anzahl))
  );
}

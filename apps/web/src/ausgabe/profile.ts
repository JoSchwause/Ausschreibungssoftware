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

/**
 * Ein Eintrag der Ablage, der nicht als eigenes Profil gilt: unlesbar (auch ohne Namen), mit dem Namen eines
 * Standardprofils oder mit einem Namen, den ein früherer Eintrag schon trägt. Er bleibt unverändert (`roh`) in der Ablage,
 * damit das nächste Schreiben ihn nicht still verwirft (Q5, Review Welle 5, P7).
 */
export interface Zurueckgehalten {
  readonly roh: unknown;
  readonly grund: 'unlesbar' | 'standardname' | 'doppelt';
  readonly name: string | null;
}

export interface Ablage {
  /** Die eigenen Profile in Ablagereihenfolge. */
  readonly eigene: Druckprofil[];
  readonly zurueck: readonly Zurueckgehalten[];
}

/**
 * Liest die abgelegte Liste. Was nicht als eigenes Profil gilt, steht mit Grund in `zurueck`; ist der ganze Text keine
 * JSON-Liste, ist er selbst ein unlesbarer Eintrag. Nichts wirft (U5).
 */
export function ablageLesen(w: Werkzeug, text: string | null): Ablage {
  if (text === null) return { eigene: [], zurueck: [] };
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    roh = undefined;
  }
  if (!Array.isArray(roh)) return { eigene: [], zurueck: [{ roh: text, grund: 'unlesbar', name: null }] };
  const eigene: Druckprofil[] = [];
  const zurueck: Zurueckgehalten[] = [];
  for (const eintrag of roh as unknown[]) {
    const { profil } = w.druckprofilAusJson(JSON.stringify(eintrag));
    if (profil === null || profil.name.trim() === '')
      zurueck.push({ roh: eintrag, grund: 'unlesbar', name: null });
    else if (istStandardName(w, profil.name))
      zurueck.push({ roh: eintrag, grund: 'standardname', name: profil.name });
    else if (eigene.some((p) => p.name === profil.name))
      zurueck.push({ roh: eintrag, grund: 'doppelt', name: profil.name });
    else eigene.push(profil);
  }
  return { eigene, zurueck };
}

/** Der Text der Ablage: die eigenen Profile, dahinter die zurückgehaltenen Einträge unverändert. */
export const ablageAlsText = (eigene: readonly Druckprofil[], zurueck: readonly Zurueckgehalten[]): string =>
  JSON.stringify([...eigene, ...zurueck.map((z) => z.roh)]);

/** Zahl der zurückgehaltenen Einträge, die sich gar nicht als Druckprofil lesen ließen (Ticket 121). */
export const zurueckNichtLesbar = (zurueck: readonly Zurueckgehalten[]): number =>
  zurueck.filter((z) => z.grund === 'unlesbar').length;

/** Die Sicherungsdatei der zurückgehaltenen Einträge: alle unverändert, als JSON-Liste (Q5, D-92.6, Ticket 121). */
export const zurueckAlsDatei = (zurueck: readonly Zurueckgehalten[]): string =>
  JSON.stringify(
    zurueck.map((z) => z.roh),
    null,
    2,
  );

export const dateinameZurueck = (): string => 'Druckprofile-nicht-gelesen.json';

export type ProfilFehler = 'name-leer' | 'name-standard' | 'name-vergeben';

export type ProfilErgebnis =
  | { readonly ok: true; readonly eigene: Druckprofil[] }
  | { readonly ok: false; readonly fehler: ProfilFehler };

/** Legt ein neues eigenes Profil an; ein vergebener oder Standard-Name ist abgewiesen (nichts überschreibt still, Q5). */
export function profilAnlegen(
  w: Werkzeug,
  eigene: readonly Druckprofil[],
  profil: Druckprofil,
): ProfilErgebnis {
  const name = profil.name.trim();
  if (name === '') return { ok: false, fehler: 'name-leer' };
  if (istStandardName(w, name)) return { ok: false, fehler: 'name-standard' };
  if (eigene.some((p) => p.name === name)) return { ok: false, fehler: 'name-vergeben' };
  return { ok: true, eigene: [...eigene, { ...profil, name }] };
}

/** Ändert ein vorhandenes eigenes Profil am Platz; ein Standardprofil ändert sich nie. */
export function profilAendern(
  w: Werkzeug,
  eigene: readonly Druckprofil[],
  profil: Druckprofil,
): ProfilErgebnis {
  if (istStandardName(w, profil.name)) return { ok: false, fehler: 'name-standard' };
  if (!eigene.some((p) => p.name === profil.name)) return { ok: false, fehler: 'name-leer' };
  return { ok: true, eigene: eigene.map((p) => (p.name === profil.name ? profil : p)) };
}

export const profilLoeschen = (eigene: readonly Druckprofil[], name: string): Druckprofil[] =>
  eigene.filter((p) => p.name !== name);

/** Das Standardprofil „Auftrags-LV mit Preisen“ (= Druck wie bisher). */
export function standardProfil(w: Werkzeug): Druckprofil {
  const p = w.STANDARD_DRUCKPROFILE[2] ?? w.STANDARD_DRUCKPROFILE[0];
  if (p === undefined) throw new Error('Kein Standardprofil vorhanden.');
  return p;
}

/**
 * Ticket 162 (U3): Was nach dem Löschen von `name` gewählt ist: das nächste eigene Profil, am Ende der Liste das vorige,
 * ohne weitere eigene Profile das Standardprofil.
 */
export function profilNachLoeschen(w: Werkzeug, eigene: readonly Druckprofil[], name: string): Druckprofil {
  const i = eigene.findIndex((p) => p.name === name);
  if (i < 0) return standardProfil(w);
  return eigene[i + 1] ?? eigene[i - 1] ?? standardProfil(w);
}

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

export const dateinameProfil = (name: string): string =>
  `${dateinameSauber(name, ERSATZ_LV)}.druckprofil.json`;

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

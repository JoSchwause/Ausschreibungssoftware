// SPDX-License-Identifier: AGPL-3.0-or-later
// Platzhalter in Kopf- und Fußzeilentexten (Druckprofil, Ticket 77): `{seite}`, `{seiten}`, `{datum}`, `{lv}`.

export interface PlatzhalterWerte {
  readonly seite: number;
  readonly seiten: number;
  /** Druckdatum `TT.MM.JJJJ`; `null`: keines, der Platzhalter wird leer. */
  readonly datum: string | null;
  /** LV-Name. */
  readonly lv: string;
}

/** Ersetzt die vier Platzhalter in einem Durchgang; unbekannte Platzhalter bleiben stehen. */
export function ersetzePlatzhalter(text: string, werte: PlatzhalterWerte): string {
  return text.replace(/\{(seite|seiten|datum|lv)\}/g, (_, name: keyof PlatzhalterWerte) => {
    const wert = werte[name];
    return wert === null ? '' : String(wert);
  });
}

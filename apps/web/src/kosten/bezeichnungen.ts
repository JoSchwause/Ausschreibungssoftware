// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezeichnungen der Kostengruppen als Einstellung des Nutzers (Ticket 89, G-16, C1): Die Texte stammen aus einer CSV, die
// der Nutzer mitbringt; sie stehen nie im Repo und nicht im Vertrag, also auch nicht in der Projektdatei. Gemerkt wird der
// CSV-Text im Browserspeicher dieses Geräts (reine Annehmlichkeit: ohne ihn bleiben die Zellen leer). Jeder Zugriff darauf
// kann in einem privaten Fenster oder mit gesperrten Daten scheitern und fällt dann still weg.

import { bezeichnungenLesen } from '@tethys/kosten';

export const BEZEICHNUNGEN_SCHLUESSEL = 'tethys.kosten.bezeichnungen';

type Ablage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function standardAblage(): Ablage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Der gemerkte CSV-Text; `null`, wenn es keinen gibt oder der Browserspeicher nicht zugänglich ist. */
export function bezeichnungenGemerkt(ablage: Ablage | null = standardAblage()): string | null {
  try {
    return ablage?.getItem(BEZEICHNUNGEN_SCHLUESSEL) ?? null;
  } catch {
    return null;
  }
}

/** Merkt den CSV-Text (`null` vergisst ihn). Gibt `false` zurück, wenn der Browserspeicher es nicht zuließ. */
export function bezeichnungenMerken(csv: string | null, ablage: Ablage | null = standardAblage()): boolean {
  try {
    if (ablage === null) return false;
    if (csv === null) ablage.removeItem(BEZEICHNUNGEN_SCHLUESSEL);
    else ablage.setItem(BEZEICHNUNGEN_SCHLUESSEL, csv);
    return true;
  } catch {
    return false;
  }
}

/** Nummer → Bezeichnung aus dem CSV-Text; die Befunde des Lesens (übergangene Zeilen) sind für die Anzeige ohne Belang. */
export function bezeichnungenAusCsv(csv: string | null): ReadonlyMap<string, string> {
  if (csv === null) return new Map();
  return bezeichnungenLesen(csv).bezeichnungen;
}

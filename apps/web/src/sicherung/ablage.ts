// SPDX-License-Identifier: AGPL-3.0-or-later
// Wo die Zeitpunkte und Einstellungen der Datensicherung liegen: `localStorage`, je Projekt-ID (keine Änderung an
// `vertrag` oder `speicher`). Jeder Zugriff ist abgesichert: Ohne Speicher (privates Fenster, gesperrt) läuft die App
// weiter, sie erinnert dann nur nicht.

const PRAEFIX = 'tethys.sicherung.';
const exportKey = (projektId: string): string => `${PRAEFIX}letzterExport.${projektId}`;
const EINSTELLUNGEN = `${PRAEFIX}einstellungen`;

function lesen(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function schreiben(key: string, wert: string): void {
  try {
    window.localStorage.setItem(key, wert);
  } catch {
    // nicht speicherbar: ohne Zeitpunkt gibt es später nur eine Erinnerung mehr
  }
}

/** Zeitpunkt des letzten Exports oder Sicherns des Projekts (ms seit 1970); `null`: noch nie. */
export function letzterExportLesen(projektId: string): number | null {
  const roh = lesen(exportKey(projektId));
  if (roh === null) return null;
  const t = Date.parse(roh);
  return Number.isNaN(t) ? null : t;
}

export function letzterExportMerken(projektId: string, jetzt: number): void {
  schreiben(exportKey(projektId), new Date(jetzt).toISOString());
}

export interface Einstellungen {
  readonly automatisch: boolean;
}

export function einstellungenLesen(): Einstellungen {
  try {
    const roh = lesen(EINSTELLUNGEN);
    const w = roh === null ? null : (JSON.parse(roh) as { automatisch?: unknown });
    return { automatisch: w?.automatisch === true };
  } catch {
    return { automatisch: false };
  }
}

export function einstellungenSchreiben(e: Einstellungen): void {
  schreiben(EINSTELLUNGEN, JSON.stringify(e));
}

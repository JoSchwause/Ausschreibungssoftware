// SPDX-License-Identifier: AGPL-3.0-or-later
// Regel der Export-Erinnerung (G-03). Reine Funktion: Die Uhr und die Zeitpunkte kommen von außen, die Uhrzeit gibt es
// nur in der App, nie in `kern` (A2).

/** Nach so vielen Tagen ohne Export erinnert die Projektliste (an genau dieser Stelle einstellbar). */
export const ERINNERUNG_SCHWELLE_TAGE = 7;

/** Automatisches Sichern in den Ordner nach jedem so vielen Befehlen (je Projekt). */
export const AUTO_SICHERN_ALLE_BEFEHLE = 20;

const TAG_MS = 24 * 60 * 60 * 1000;

export interface ErinnerungEingabe {
  /** Jetzt, in Millisekunden seit 1970. */
  readonly jetzt: number;
  /** Zeitpunkt des letzten Exports (oder Sicherns in den Ordner); `null`: noch nie. */
  readonly letzterExport: number | null;
  /** Zeitpunkte aller Befehle des Projekts (Befehlsprotokoll), in Millisekunden. */
  readonly befehlszeiten: readonly number[];
}

export type Erinnerung = { readonly faellig: false } | { readonly faellig: true; readonly tage: number };

/**
 * Schon ohne Befehlsprotokoll entschieden: Liegt der letzte Export nicht länger als die Schwelle zurück, ist nichts
 * fällig. Die Projektliste liest das Protokoll nur, wenn das nicht so ist.
 */
export function erinnerungAusgeschlossen(jetzt: number, letzterExport: number | null): boolean {
  return letzterExport !== null && jetzt - letzterExport <= ERINNERUNG_SCHWELLE_TAGE * TAG_MS;
}

/**
 * Fällig, wenn es seit dem letzten Export Befehle gab **und** der Bezugspunkt länger als die Schwelle zurückliegt.
 * Bezugspunkt ist der letzte Export; gab es noch keinen, der erste Befehl des Projekts.
 */
export function erinnerungPruefen({ jetzt, letzterExport, befehlszeiten }: ErinnerungEingabe): Erinnerung {
  if (erinnerungAusgeschlossen(jetzt, letzterExport)) return { faellig: false };
  const seitdem = befehlszeiten.filter((t) => letzterExport === null || t > letzterExport);
  if (seitdem.length === 0) return { faellig: false };
  const bezug = letzterExport ?? Math.min(...seitdem);
  const vergangen = jetzt - bezug;
  if (vergangen <= ERINNERUNG_SCHWELLE_TAGE * TAG_MS) return { faellig: false };
  return { faellig: true, tage: Math.floor(vergangen / TAG_MS) };
}

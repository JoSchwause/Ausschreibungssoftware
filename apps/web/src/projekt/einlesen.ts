// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektdatei einlesen (Ticket 150; E8, E15, D-73, D-84, D-127.9, D-127.10): mit Übernahme der Einstellungen der Datei als
// protokolliertem Befehl (`einstellungsuebernahme`, der Speicher schreibt `EinstellungenUebernehmen` in derselben
// Transaktion) und, wenn das Projekt schon da ist, auf Wunsch als Kopie mit neuen Kennungen und neuem Namen.

import type {
  Einstellungsschluessel,
  Ergebnis,
  ProjektdateiEinleseergebnis,
  Speicherfehler,
} from '@tethys/vertrag';
import type { Umgebung } from '../lv/befehlsweg';
import { texte } from './texte';

const t = texte.importieren;

/**
 * Liest die Projektdatei ein und übernimmt, was in den Einstellungen fehlt. `kopieName`: als Kopie unter diesem Namen (das
 * Original bleibt). Ein vorhandenes Projekt ohne `kopieName` ergibt `existiert-bereits`.
 */
export async function projektdateiEinlesen(
  u: Umgebung,
  inhalt: string,
  kopieName?: string,
): Promise<Ergebnis<ProjektdateiEinleseergebnis, Speicherfehler>> {
  if (u.speicher.projektdateiEinlesen === undefined) {
    // Ein Speicher vor Schema 7: ohne Kopie und ohne Einstellungen wie bisher.
    const r = await u.speicher.projektdateiImportieren(inhalt);
    return r.ok ? { ok: true, wert: { projektId: r.wert, einstellungen: null } } : r;
  }
  return u.speicher.projektdateiEinlesen(inhalt, {
    einstellungsuebernahme: { id: u.ids.protokoll(), wer: u.nutzer, wann: u.uhr() },
    ...(kopieName === undefined ? {} : { alsKopie: { ids: u.ids, name: kopieName } }),
  });
}

/** Der Projektname aus der Datei (für die Frage nach der Kopie); `null`, wenn er sich nicht lesen lässt. */
export function projektnameDerDatei(inhalt: string): string | null {
  try {
    const d = JSON.parse(inhalt) as { projekt?: { name?: unknown } } | null;
    const name = d?.projekt?.name;
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

function zeile(s: Einstellungsschluessel): string {
  switch (s.art) {
    case 'buero':
      return t.buero;
    case 'druckprofil':
      return t.druckprofil(s.name);
    case 'kostengruppenbezeichnung':
      return t.kostengruppe(s.nummer);
  }
}

/** Was aus den Einstellungen der Datei wurde, als Zeilen für den Dialog; `null`: Die Datei trägt keine. */
export function berichtZeilen(
  bericht: ProjektdateiEinleseergebnis['einstellungen'],
): { readonly uebernommen: string[]; readonly belassen: string[] } | null {
  if (bericht === null) return null;
  return { uebernommen: bericht.uebernommen.map(zeile), belassen: bericht.belassen.map(zeile) };
}

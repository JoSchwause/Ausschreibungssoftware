// SPDX-License-Identifier: AGPL-3.0-or-later
// Bautagebuchauswertung (Ticket 111 Punkt 4; Glossar „Bautagebuchauswertung“): Arbeitskräfte eines Zeitraums je Tag und je
// Firma. Rein (A2); der Zeitraum kommt vom Aufrufer.

import type { Bautagebucheintrag } from '@tethys/vertrag';
import { istKalendertag } from './datum';

export interface Bautagebuchauswertung {
  /** Erster Tag des Zeitraums, eingeschlossen. */
  readonly von: string;
  /** Letzter Tag des Zeitraums, eingeschlossen. */
  readonly bis: string;
  /** Je Tag mit Eintrag die Summe der Köpfe, nach Datum; Tage ohne Eintrag fehlen, ein Eintrag ohne Arbeitskräfte zählt 0. */
  readonly jeTag: readonly { readonly datum: string; readonly arbeitskraefte: number }[];
  /** Je Firma die Summe der Köpfe über den Zeitraum, nach Namen deutsch geordnet (D-111.8). */
  readonly jeFirma: readonly { readonly firma: string; readonly arbeitskraefte: number }[];
  /** Summe der Köpfe über den Zeitraum (Kopftage). */
  readonly arbeitskraefte: number;
}

const NAMENSVERGLEICH = new Intl.Collator('de-DE');

/** Deutsch nach Namen, bei Gleichstand der Collator nach Code-Einheiten (deterministisch). */
function nachNamen(a: string, b: string): number {
  return NAMENSVERGLEICH.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Wertet die Einträge des Bautagebuchs im Zeitraum `von`–`bis` (`JJJJ-MM-TT`, beide eingeschlossen) aus. Liegt `von` nach
 * `bis`, ist der Zeitraum leer. Eine Grenze, die kein Kalendertag ist: `RangeError` (D-111.6). Firmen werden nach genauem
 * Namen zusammengefasst.
 */
export function bautagebuchAuswerten(
  eintraege: readonly Pick<Bautagebucheintrag, 'datum' | 'arbeitskraefte'>[],
  von: string,
  bis: string,
): Bautagebuchauswertung {
  for (const grenze of [von, bis]) {
    if (!istKalendertag(grenze))
      throw new RangeError(`Kein Kalendertag als Grenze: ${JSON.stringify(grenze)}`);
  }
  const imZeitraum = eintraege
    .filter((e) => von <= e.datum && e.datum <= bis)
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  const jeFirma = new Map<string, number>();
  const jeTag = imZeitraum.map((e) => {
    let tag = 0;
    for (const { firma, anzahl } of e.arbeitskraefte) {
      tag += anzahl;
      jeFirma.set(firma, (jeFirma.get(firma) ?? 0) + anzahl);
    }
    return { datum: e.datum, arbeitskraefte: tag };
  });
  return {
    von,
    bis,
    jeTag,
    jeFirma: [...jeFirma]
      .sort(([a], [b]) => nachNamen(a, b))
      .map(([firma, arbeitskraefte]) => ({ firma, arbeitskraefte })),
    arbeitskraefte: jeTag.reduce((s, t) => s + t.arbeitskraefte, 0),
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Vergabe (Ticket 149; E11, B-21): Eingaben für `ausgabe` aus dem Stand der Preisspiegel-Seite, Dateinamen und
// der PDF-Lauf im Web Worker (abbrechbar). Die App rechnet nichts (A2): Der Preisspiegel kommt unverändert aus `vergabe`,
// das Druckdatum aus der Uhr der App; Projekt (mit Projektangaben) und Büro gehen in die Köpfe (D-141.6).

import type { PreisspiegelEingabe, VergabevorschlagEingabe } from '@tethys/ausgabe';
import type { Preisspiegel } from '@tethys/vergabe';
import type { BieterId, Buero, LvZustand, Projekt } from '@tethys/vertrag';
import { dateinameSauber } from '../dateiname';
import type { Spaltenwahl } from './ansicht';
import { pdfLauf, type PdfLauf } from '../ui/pdf-lauf';
import type { Druckauftrag } from './druck-worker';

export interface Druckstand {
  readonly lv: LvZustand;
  readonly projekt: Projekt;
  readonly preisspiegel: Preisspiegel;
  readonly buero: Buero | null;
  /** `JJJJ-MM-TT` */
  readonly datum: string;
}

/** Preisspiegel als PDF oder Excel; Spalten wie am Bildschirm (Schätzpreis, virtuelle Bieter). */
export function preisspiegelEingabe(s: Druckstand, wahl: Spaltenwahl): PreisspiegelEingabe {
  return {
    lv: s.lv,
    preisspiegel: s.preisspiegel,
    bieter: s.projekt.bieter,
    projekt: s.projekt,
    buero: s.buero,
    datum: s.datum,
    spalten: { schaetzpreis: wahl.schaetzpreis, virtuelleBieter: wahl.virtuell },
  };
}

/** Vergabevorschlag: Rangfolge und geprüfte Summen aus dem Preisspiegel, der gewählte Bieter, die Begründung. */
export function vergabevorschlagEingabe(
  s: Druckstand,
  vorgeschlagen: BieterId | null,
  begruendung: string,
): VergabevorschlagEingabe {
  return {
    lv: s.lv,
    bietersummen: s.preisspiegel.bietersummen,
    bieter: s.projekt.bieter,
    vorgeschlagen,
    begruendung,
    projekt: s.projekt,
    buero: s.buero,
    datum: s.datum,
  };
}

const name = (art: string, lv: LvZustand): string =>
  dateinameSauber(`${art} ${lv.leistungsverzeichnis.name}`, art);

export const dateinamePreisspiegelPdf = (lv: LvZustand): string => `${name('Preisspiegel', lv)}.pdf`;
export const dateinamePreisspiegelExcel = (lv: LvZustand): string => `${name('Preisspiegel', lv)}.xlsx`;
export const dateinameVergabevorschlag = (lv: LvZustand): string => `${name('Vergabevorschlag', lv)}.pdf`;

/** Ein PDF im Worker über den gemeinsamen Worker-Start (`ui/pdf-lauf.ts`); abbrechbar. */
export function pdfImWorker(auftrag: Druckauftrag): PdfLauf {
  return pdfLauf(new Worker(new URL('./druck-worker.ts', import.meta.url), { type: 'module' }), auftrag);
}

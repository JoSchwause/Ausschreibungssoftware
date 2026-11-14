// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Vergabe (Ticket 149; E11, B-21): Eingaben für `ausgabe` aus dem Stand der Preisspiegel-Seite, Dateinamen und
// der PDF-Lauf im Web Worker (abbrechbar). Die App rechnet nichts (A2): Der Preisspiegel kommt unverändert aus `vergabe`,
// das Druckdatum aus der Uhr der App; Projekt (mit Projektangaben) und Büro gehen in die Köpfe (D-141.6).

import type { PreisspiegelEingabe, VergabevorschlagEingabe } from '@tethys/ausgabe';
import type { Preisspiegel } from '@tethys/vergabe';
import type { BieterId, Buero, LvZustand, Projekt, Speicher } from '@tethys/vertrag';
import { dateinameSauber } from '../dateiname';
import type { Spaltenwahl } from './ansicht';
import type { Druckantwort, Druckauftrag } from './druck-worker';

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

/** Die Büroangaben aus den Einstellungen; ohne Einstellungen im Speicher oder bei einem Lesefehler keine. */
export async function bueroLaden(speicher: Speicher): Promise<Buero | null> {
  const e = await speicher.einstellungen?.laden();
  return e?.ok === true ? e.wert.buero : null;
}

export interface Drucklauf {
  /** Die Bytes des PDF; `null`, wenn der Lauf abgebrochen wurde. Ein Fehler des Erzeugers wird zur Ablehnung. */
  readonly ergebnis: Promise<Uint8Array | null>;
  abbrechen: () => void;
}

/** Ein PDF im Worker; der Worker wird je Lauf angelegt und danach beendet. */
export function pdfImWorker(auftrag: Druckauftrag): Drucklauf {
  const worker = new Worker(new URL('./druck-worker.ts', import.meta.url), { type: 'module' });
  let fertig: (b: Uint8Array | null) => void = () => undefined;
  const ergebnis = new Promise<Uint8Array | null>((ok, fehler) => {
    fertig = ok;
    worker.onmessage = (e: MessageEvent<Druckantwort>) => {
      worker.terminate();
      if (e.data.art === 'fertig') ok(e.data.bytes);
      else fehler(new Error(e.data.meldung));
    };
    worker.onerror = (e) => {
      worker.terminate();
      fehler(new Error(e.message || 'Der Druck-Worker ist abgestürzt.'));
    };
  });
  worker.postMessage(auftrag);
  return {
    ergebnis,
    abbrechen: () => {
      worker.terminate();
      fertig(null);
    },
  };
}

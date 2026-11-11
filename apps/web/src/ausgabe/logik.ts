// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: die reinen Teile von Drucken und Excel in der App (Dateinamen, Datum, Vorschau des Excel-Rücklaufs).
// Die Uhr gehört der App (A2): Das Datum kommt von `u.uhr()`, nicht aus dem Paket `ausgabe`.

import type { ExcelBefund } from '@tethys/ausgabe';
import type { Angebot, IdQuelle, LvZustand, Projekt, Zeitstempel } from '@tethys/vertrag';
import { ERSATZ_LV, dateinameSauber } from '../dateiname';
import { angebotAnlegenPlan, type Angebotsplan, type Angebotsvorschau } from '../gaeb/gaeb';

/** Dateiname ohne Sonderzeichen (wie beim GAEB-Export), mit Endung. */
export const dateinamePdf = (lvName: string): string => `${dateinameSauber(lvName, ERSATZ_LV)}.pdf`;
export const dateinameExcel = (lvName: string): string => `${dateinameSauber(lvName, ERSATZ_LV)}-Bieter.xlsx`;

/** Vorschlag für den Bieternamen: der Dateiname ohne `.xlsx`; der Nutzer ändert ihn in der Vorschau. */
export const bieterNameAusDatei = (dateiname: string): string => dateiname.replace(/\.xlsx$/i, '').trim();

/**
 * Das Datum der Uhr als `JJJJ-MM-TT` in Ortszeit (so liest der Nutzer „heute“). Lesen und Anzeigen eines Datums
 * (`datumLesen`, `datumDe`) liegen in `lv/kopfdaten.ts`, an einer Stelle für die ganze App (S3).
 */
export function datumAusUhr(jetzt: Zeitstempel): string {
  const d = new Date(jetzt);
  const zwei = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

/** Bieter (falls neu) und Angebot für den Befehlsweg; wie `angebotAnlegenPlan` der X84-Vorschau. */
export function excelAngebotPlan(
  vorschau: ExcelVorschau,
  bieterName: string,
  projekt: Projekt,
  ids: IdQuelle,
): Angebotsplan | null {
  return angebotAnlegenPlan({ ...vorschau, befunde: [] }, bieterName, projekt, ids);
}

export interface ExcelVorschau extends Omit<Angebotsvorschau, 'befunde'> {
  readonly befunde: readonly ExcelBefund[];
}

/**
 * Liest den Rücklauf eines Bieters gegen dieses LV. Die Vorschau hat die Form der X84-Vorschau (`Angebotsvorschau`),
 * damit `angebotAnlegenPlan` aus `src/gaeb/` den Bieter (falls neu) und das Angebot für **einen** Befehl aufbereitet.
 * Übernehmbar ist eine Datei mit mindestens einer angebotenen Position; ein leeres Blankett oder eine Datei für ein
 * anderes LV liefert keine (nichts zu übernehmen).
 */
export async function excelAngebotLesen(
  bytes: Uint8Array,
  dateiname: string,
  lv: LvZustand,
  ids: IdQuelle,
): Promise<ExcelVorschau> {
  // Nachgeladen: `ausgabe` zieht pdfmake mit und gehört nicht ins Hauptbündel.
  const { excelRuecklaufLesen } = await import('@tethys/ausgabe');
  const r = excelRuecklaufLesen(bytes, lv);
  const l = lv.leistungsverzeichnis;
  const angebot: Angebot | null = r.positionen.every((p) => p.status === 'nicht-angeboten')
    ? null
    : {
        id: ids.angebot(),
        projektId: l.projektId,
        leistungsverzeichnisId: l.id,
        bieterId: ids.bieter(),
        nachlass: r.nachlass,
        positionen: r.positionen,
      };
  return {
    phase: null,
    version: null,
    befunde: r.befunde,
    bieterName: bieterNameAusDatei(dateiname),
    angebot,
    uebernehmbar: angebot !== null,
  };
}

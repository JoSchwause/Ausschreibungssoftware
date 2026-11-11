// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: die reinen Teile von Drucken und Excel in der App (Dateinamen, Datum, Vorschau des Excel-Rücklaufs).
// Die Uhr gehört der App (A2): Das Datum kommt von `u.uhr()`, nicht aus dem Paket `ausgabe`.

import { excelRuecklaufLesen, type ExcelBefund } from '@tethys/ausgabe';
import type { Angebot, IdQuelle, LvZustand, Zeitstempel } from '@tethys/vertrag';
import type { Angebotsvorschau } from '../gaeb/gaeb';

const STANDARDNAME = 'Leistungsverzeichnis';

/** Dateiname ohne Sonderzeichen (wie beim GAEB-Export), mit Endung. */
function sauber(lvName: string): string {
  return (
    lvName
      .replace(/[^\p{L}\p{N} _-]+/gu, '')
      .replace(/ {2,}/g, ' ')
      .trim() || STANDARDNAME
  );
}

export const dateinamePdf = (lvName: string): string => `${sauber(lvName)}.pdf`;
export const dateinameExcel = (lvName: string): string => `${sauber(lvName)}-Bieter.xlsx`;

/** Vorschlag für den Bieternamen: der Dateiname ohne `.xlsx`; der Nutzer ändert ihn in der Vorschau. */
export const bieterNameAusDatei = (dateiname: string): string => dateiname.replace(/\.xlsx$/i, '').trim();

/** Das Datum der Uhr als `JJJJ-MM-TT` in Ortszeit (so liest der Nutzer „heute“). */
export function datumAusUhr(jetzt: Zeitstempel): string {
  const d = new Date(jetzt);
  const zwei = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

/** `JJJJ-MM-TT` mit einem Kalendertag, den es gibt. */
export function istDatumIso(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m === null) return false;
  const [j, mo, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(j, mo - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === mo - 1 && d.getUTCDate() === t;
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
export function excelAngebotLesen(
  bytes: Uint8Array,
  dateiname: string,
  lv: LvZustand,
  ids: IdQuelle,
): ExcelVorschau {
  const r = excelRuecklaufLesen(bytes, lv);
  const l = lv.leistungsverzeichnis;
  const angebot: Angebot | null =
    r.positionen.every((p) => p.status === 'nicht-angeboten')
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

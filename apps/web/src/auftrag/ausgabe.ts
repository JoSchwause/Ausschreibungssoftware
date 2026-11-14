// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: das Auftrags-LV als GAEB X86 (Auftragserteilung) über den vorhandenen Writer von `gaeb`, wie „GAEB
// ausgeben“ auf der LV-Seite (Ticket 49) und über denselben Weg (`lvAusgeben`, S5): Kopf samt `auftragnehmer` (CTR,
// Ticket 68) und EPA-Bezeichnungen aus `lvInhalt`, Summen und Zuschlagsbasen aus dem Kern, Datum und Uhrzeit von der Uhr
// der App (A2).

import type { ExcelDatei } from '@tethys/ausgabe';
import type { ExportVersion } from '@tethys/gaeb';
import type { AuftragsLvZustand } from '@tethys/vertrag';
import { ERSATZ_LV, dateinameSauber } from '../dateiname';
import { lvAusgeben, type Ausgabe } from '../gaeb/gaeb';
import { alsLvZustand } from './auftrag';

export function auftragAusgeben(z: AuftragsLvZustand, version: ExportVersion, jetzt: Date): Ausgabe {
  return lvAusgeben(alsLvZustand(z), 'X86', version, jetzt);
}

/**
 * Ticket 151 (B-17): das Auftrags-LV als Excel über die vorhandene LV-Excel-Ausgabe, mit den Vertragspreisen
 * (`mitPreisen`, D-151.5); Dateiname `<Name>-Auftrag.xlsx`, damit er nicht mit dem Blankett für Bieter verwechselt wird.
 * `ausgabe` wird nachgeladen (pdfmake gehört nicht ins Hauptbündel); `datum` (`JJJJ-MM-TT`) kommt von der Uhr der App.
 */
export async function auftragExcel(
  z: AuftragsLvZustand,
  datum: string,
): Promise<{ readonly dateiname: string; readonly datei: ExcelDatei }> {
  const { lvAlsExcel } = await import('@tethys/ausgabe');
  return {
    dateiname: `${dateinameSauber(z.auftragsLeistungsverzeichnis.name, ERSATZ_LV)}-Auftrag.xlsx`,
    datei: lvAlsExcel(alsLvZustand(z), { mitPreisen: true, datum }),
  };
}

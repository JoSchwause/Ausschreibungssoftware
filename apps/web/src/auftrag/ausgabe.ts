// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: das Auftrags-LV als GAEB X86 (Auftragserteilung) über den vorhandenen Writer von `gaeb`, wie „GAEB
// ausgeben“ auf der LV-Seite (Ticket 49) und über denselben Weg (`lvAusgeben`, S5): Kopf samt `auftragnehmer` (CTR,
// Ticket 68) und EPA-Bezeichnungen aus `lvInhalt`, Summen und Zuschlagsbasen aus dem Kern, Datum und Uhrzeit von der Uhr
// der App (A2).

import type { ExportVersion } from '@tethys/gaeb';
import type { AuftragsLvZustand } from '@tethys/vertrag';
import { lvAusgeben, type Ausgabe } from '../gaeb/gaeb';
import { alsLvZustand } from './auftrag';

export function auftragAusgeben(z: AuftragsLvZustand, version: ExportVersion, jetzt: Date): Ausgabe {
  return lvAusgeben(alsLvZustand(z), 'X86', version, jetzt);
}

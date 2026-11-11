// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: das Auftrags-LV als GAEB X86 (Auftragserteilung) über den vorhandenen Writer von `gaeb`, wie „GAEB
// ausgeben“ auf der LV-Seite (Ticket 49). Der Writer nimmt das Auftrags-LV selbst und schreibt `CTR` aus seinem
// `auftragnehmer` (Ticket 68). Summen und Zuschlagsbasen kommen aus dem Kern, Datum und Uhrzeit von der Uhr der App (A2).

import { zuschlagsbasen } from '@tethys/kern';
import { schreibeGaeb, type ExportVersion } from '@tethys/gaeb';
import type { AuftragsLvZustand, Betrag, PositionId } from '@tethys/vertrag';
import { PROGRAMMNAME, dateinameAusgabe, type Ausgabe } from '../gaeb/gaeb';
import { alsLvZustand } from './auftrag';

export function auftragAusgeben(z: AuftragsLvZustand, version: ExportVersion, jetzt: Date): Ausgabe {
  const iso = jetzt.toISOString();
  const a = z.auftragsLeistungsverzeichnis;
  const basen = new Map<PositionId, Betrag>();
  for (const [p, b] of zuschlagsbasen(alsLvZustand(z).leistungsverzeichnis)) basen.set(p, b.basis);
  const e = schreibeGaeb(a, {
    phase: 'X86',
    version,
    erstellt: { datum: iso.slice(0, 10), zeit: iso.slice(11, 19) },
    programm: PROGRAMMNAME,
    summen: z.summen,
    zuschlagsbasen: basen,
  });
  return {
    xml: e.xml,
    phase: 'X86',
    version,
    befunde: e.befunde,
    entwurf: e.entwurf,
    dateiname: dateinameAusgabe(a.name, 'X86', e.entwurf),
  };
}

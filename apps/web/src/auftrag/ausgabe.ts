// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: das Auftrags-LV als GAEB X86 (Auftragserteilung) über den vorhandenen Writer von `gaeb`, wie „GAEB
// ausgeben“ auf der LV-Seite (Ticket 49). Summen und Zuschlagsbasen kommen aus dem Kern, Datum und Uhrzeit von der Uhr
// der App (A2). Der Auftragnehmer steht in `CTR`.

import { zuschlagsbasen } from '@tethys/kern';
import { schreibeGaeb, type ExportVersion } from '@tethys/gaeb';
import type { AuftragsLvZustand, Betrag, PositionId } from '@tethys/vertrag';
import { PROGRAMMNAME, dateinameAusgabe, type Ausgabe } from '../gaeb/gaeb';
import { alsLvZustand, inhaltKopf } from './auftrag';

export function auftragAusgeben(z: AuftragsLvZustand, version: ExportVersion, jetzt: Date): Ausgabe {
  const iso = jetzt.toISOString();
  const l = alsLvZustand(z).leistungsverzeichnis;
  const basen = new Map<PositionId, Betrag>();
  for (const [p, b] of zuschlagsbasen(l)) basen.set(p, b.basis);
  const name = z.auftragsLeistungsverzeichnis.auftragnehmer?.name ?? null;
  const e = schreibeGaeb(
    { ...inhaltKopf(l), wurzelId: l.id, knoten: l.knoten },
    {
      phase: 'X86',
      version,
      erstellt: { datum: iso.slice(0, 10), zeit: iso.slice(11, 19) },
      programm: PROGRAMMNAME,
      summen: z.summen,
      zuschlagsbasen: basen,
      ...(name === null ? {} : { auftragnehmer: name }),
    },
  );
  return {
    xml: e.xml,
    phase: 'X86',
    version,
    befunde: e.befunde,
    entwurf: e.entwurf,
    dateiname: dateinameAusgabe(l.name, 'X86', e.entwurf),
  };
}

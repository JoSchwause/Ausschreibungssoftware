// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB einlesen ohne offenes Projekt (E7, Weg „GAEB-Datei einlesen“ beim ersten Start): Das Projekt entsteht aus der Datei,
// das LV darin, beides als **ein** Undo-Schritt über den Befehlsweg (A5, U7). Der Vorschlag für Name und Bauherr kommt aus
// dem LV; die Oberfläche lässt ihn ändern. Der Auftraggeber des LV bleibt am LV; sein Name ist nur der Vorschlag für den
// Bauherrn (Glossar: nicht gleichgesetzt).

import type { LvInhalt, LvZustand, Projekt } from '@tethys/vertrag';
import {
  befehlswegFuer,
  lvBefehlAnwenden,
  projektBefehlAnwenden,
  type Abweisung,
  type Umgebung,
} from '../lv/befehlsweg';
import type { Teil } from '../historie/historie';
import { projektAnlegenBefehl } from '../projekt/befehle';
import type { Lesevorschau } from './gaeb';

export interface Projektvorschlag {
  readonly name: string;
  readonly bauherr: string;
}

export type ProjektAusGaeb =
  | { readonly ok: true; readonly projekt: Projekt; readonly lv: LvZustand }
  | { readonly ok: false; readonly abweisung: Abweisung };

const ohneEndung = (dateiname: string): string => dateiname.replace(/\.[^.]*$/, '').trim();

/** Name: der des LV, sonst der Dateiname ohne Endung. Bauherr: der Name des Auftraggebers, sonst leer. */
export function projektVorschlag(
  vorschau: Pick<Lesevorschau, 'inhalt'>,
  dateiname: string,
): Projektvorschlag {
  const lvName = vorschau.inhalt?.name.trim() ?? '';
  return {
    name: lvName === '' ? ohneEndung(dateiname) : lvName,
    bauherr: vorschau.inhalt?.auftraggeber?.name?.trim() ?? '',
  };
}

/**
 * Legt ein neues Projekt mit dem gelesenen LV an (`ProjektAnlegen`, dann `LeistungsverzeichnisAnlegen`): ein Undo-Schritt.
 * Ein leerer Name nimmt den des LV. Weist der Kern oder der Speicher das LV ab, bleibt das Projekt und ist einzeln
 * rückgängig zu machen (wie beim Angebot mit neuem Bieter).
 */
export function projektAusGaebAnlegen(
  u: Umgebung,
  angaben: Projektvorschlag,
  inhalt: LvInhalt,
): Promise<ProjektAusGaeb> {
  const weg = befehlswegFuer(u);
  return weg.reihe(async () => {
    const teile: Teil[] = [];
    try {
      const name = angaben.name.trim() === '' ? inhalt.name.trim() : angaben.name.trim();
      const p = await projektBefehlAnwenden(
        u,
        null,
        projektAnlegenBefehl(u.ids, name, angaben.bauherr.trim()),
      );
      if (!p.ok) return p;
      teile.push(p.teil);
      if (p.zustand === null) throw new Error('projektAusGaebAnlegen: Projekt fehlt');
      const projekt = p.zustand;
      const l = await lvBefehlAnwenden(u, projekt.id, null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: inhalt.wurzelId,
        projektId: projekt.id,
        inhalt,
      });
      if (!l.ok) return l;
      teile.push(l.teil);
      if (l.zustand === null) throw new Error('projektAusGaebAnlegen: LV fehlt');
      return { ok: true, projekt, lv: l.zustand };
    } finally {
      weg.historie.aufnehmen(teile);
    }
  });
}

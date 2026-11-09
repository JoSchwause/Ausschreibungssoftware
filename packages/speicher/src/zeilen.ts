// SPDX-License-Identifier: AGPL-3.0-or-later
// Abbildung zwischen Tabellenzeilen und den Typen aus `vertrag`. Dezimalwerte sind Zeichenketten in
// kanonischer Punktnotation; sie werden unverändert als TEXT gespeichert und gelesen, nie gerechnet und nie
// in `number` gewandelt (N1). Die Casts auf die Zahlentypen sind deshalb reine Typmarken.

import type {
  AngebotId,
  Angebotsposition,
  Betrag,
  BieterId,
  ElternId,
  Einheitspreis,
  Einheitspreisanteile,
  GliederungId,
  HinweistextId,
  Knoten,
  Langtext,
  LeistungsverzeichnisId,
  LosId,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzMaske,
  PositionId,
  Positionsart,
  ProjektId,
  Prozent,
  Gesamtsummen,
  TitelId,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import { kanonischKompakt } from './kanonisch';
import type { SqlWert, SqlZeile } from './sql';

// --- Hilfen zum Lesen einer Zeile -----------------------------------------------------------------------------

export function text(z: SqlZeile, spalte: string): string {
  const w = z[spalte];
  if (typeof w !== 'string') return abbruch('datei-ungueltig', `Spalte ${spalte}: Text erwartet.`);
  return w;
}

export function textOderNull(z: SqlZeile, spalte: string): string | null {
  const w = z[spalte];
  if (w === null || w === undefined) return null;
  if (typeof w !== 'string') return abbruch('datei-ungueltig', `Spalte ${spalte}: Text oder NULL erwartet.`);
  return w;
}

export function ganzzahl(z: SqlZeile, spalte: string): number {
  const w = z[spalte];
  if (typeof w !== 'number') return abbruch('datei-ungueltig', `Spalte ${spalte}: Ganzzahl erwartet.`);
  return w;
}

const jsonLesen = (wert: string, spalte: string): unknown => {
  try {
    return JSON.parse(wert) as unknown;
  } catch {
    return abbruch('datei-ungueltig', `Spalte ${spalte}: kein gültiges JSON.`);
  }
};

// --- Nachlass (LV, Auftrags-LV, Angebot) --------------------------------------------------------------------

export function nachlassSpalten(n: Nachlass | null): [SqlWert, SqlWert] {
  return n === null ? [null, null] : [n.art, n.wert];
}

export function nachlassAusZeile(z: SqlZeile): Nachlass | null {
  const art = textOderNull(z, 'nachlass_art');
  const wert = textOderNull(z, 'nachlass_wert');
  if (art === null || wert === null) return null;
  return art === 'prozent'
    ? { art: 'prozent', wert: wert as Prozent }
    : { art: 'betrag', wert: wert as Betrag };
}

export const maskeAusZeile = (z: SqlZeile): OzMaske => jsonLesen(text(z, 'oz_maske'), 'oz_maske') as OzMaske;

// --- Knoten -----------------------------------------------------------------------------------------------------

export const KNOTEN_SPALTEN = [
  'aggregat_id',
  'id',
  'art',
  'eltern_id',
  'reihenfolge',
  'ordnungszahl',
  'oz_index',
  'kurztext',
  'positionsart',
  'pauschal',
  'bedarf_mit_gesamtbetrag',
  'bezugsposition_id',
  'grundposition_id',
  'text_json',
  'menge',
  'einheit',
  'einheitspreis',
  'epa',
] as const;

export function knotenZuBindung(aggregatId: string, k: Knoten): SqlWert[] {
  const kopf: SqlWert[] = [aggregatId, k.id, k.art, k.elternId, k.reihenfolge];
  switch (k.art) {
    case 'los':
    case 'titel':
      return [
        ...kopf,
        k.ordnungszahl,
        null,
        k.kurztext,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ];
    case 'hinweis':
      return [
        ...kopf,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        JSON.stringify(k.text),
        null,
        null,
        null,
        null,
      ];
    case 'position':
      return [
        ...kopf,
        k.ordnungszahl,
        k.ozIndex,
        k.kurztext,
        k.positionsart,
        k.pauschal ? 1 : 0,
        k.bedarfMitGesamtbetrag ? 1 : 0,
        k.bezugspositionId,
        k.grundpositionId,
        JSON.stringify(k.langtext),
        k.menge,
        k.einheit,
        k.einheitspreis,
        k.epa === null ? null : kanonischKompakt(k.epa),
      ];
  }
}

export function knotenAusZeile(z: SqlZeile): Knoten {
  const lage = {
    elternId: text(z, 'eltern_id') as ElternId,
    reihenfolge: ganzzahl(z, 'reihenfolge'),
  };
  const art = text(z, 'art');
  const ozOderNull = textOderNull(z, 'ordnungszahl') as Ordnungszahl | null;
  switch (art) {
    case 'los':
      return {
        ...lage,
        art: 'los',
        id: text(z, 'id') as LosId,
        ordnungszahl: ozOderNull,
        kurztext: text(z, 'kurztext'),
      };
    case 'titel':
      return {
        ...lage,
        art: 'titel',
        id: text(z, 'id') as TitelId,
        ordnungszahl: ozOderNull,
        kurztext: text(z, 'kurztext'),
      };
    case 'hinweis':
      return {
        ...lage,
        art: 'hinweis',
        id: text(z, 'id') as HinweistextId,
        text: jsonLesen(text(z, 'text_json'), 'text_json') as Langtext,
      };
    case 'position': {
      const epa = textOderNull(z, 'epa');
      return {
        ...lage,
        art: 'position',
        id: text(z, 'id') as PositionId,
        ordnungszahl: ozOderNull,
        ozIndex: textOderNull(z, 'oz_index'),
        positionsart: text(z, 'positionsart') as Positionsart,
        pauschal: ganzzahl(z, 'pauschal') === 1,
        bedarfMitGesamtbetrag: ganzzahl(z, 'bedarf_mit_gesamtbetrag') === 1,
        bezugspositionId: textOderNull(z, 'bezugsposition_id') as PositionId | null,
        grundpositionId: textOderNull(z, 'grundposition_id') as PositionId | null,
        kurztext: text(z, 'kurztext'),
        langtext: jsonLesen(text(z, 'text_json'), 'text_json') as Langtext,
        menge: textOderNull(z, 'menge') as Menge | null,
        einheit: textOderNull(z, 'einheit'),
        einheitspreis: textOderNull(z, 'einheitspreis') as Einheitspreis | null,
        epa: epa === null ? null : (jsonLesen(epa, 'epa') as Einheitspreisanteile),
      };
    }
    default:
      return abbruch('datei-ungueltig', `Unbekannte Knotenart in der Datenbank: ${art}`);
  }
}

// --- Angebotspositionen -------------------------------------------------------------------------------------

export function angebotspositionZuBindung(angebotId: AngebotId, p: Angebotsposition): SqlWert[] {
  return p.status === 'angeboten'
    ? [angebotId, p.positionId, 'angeboten', p.einheitspreis, p.epa === null ? null : kanonischKompakt(p.epa)]
    : [angebotId, p.positionId, 'nicht-angeboten', null, null];
}

export function angebotspositionAusZeile(z: SqlZeile): Angebotsposition {
  const positionId = text(z, 'position_id') as PositionId;
  if (text(z, 'status') === 'nicht-angeboten') return { positionId, status: 'nicht-angeboten' };
  const epa = textOderNull(z, 'epa');
  return {
    positionId,
    status: 'angeboten',
    einheitspreis: text(z, 'einheitspreis') as Einheitspreis,
    epa: epa === null ? null : (jsonLesen(epa, 'epa') as Einheitspreisanteile),
  };
}

// --- Summen ---------------------------------------------------------------------------------------------------

export function gesamtAusZeile(z: SqlZeile): Gesamtsummen {
  return {
    netto: text(z, 'netto') as Betrag,
    nachlass: text(z, 'nachlass') as Betrag,
    nettoNachNachlass: text(z, 'netto_nach_nachlass') as Betrag,
    mwst: text(z, 'mwst') as Betrag,
    brutto: text(z, 'brutto') as Betrag,
  };
}

// --- Kennungen (nur Typmarken) -----------------------------------------------------------------------------

export const projektId = (z: SqlZeile, spalte = 'projekt_id'): ProjektId => text(z, spalte) as ProjektId;
export const lvId = (z: SqlZeile, spalte: string): LeistungsverzeichnisId =>
  text(z, spalte) as LeistungsverzeichnisId;
export const bieterId = (z: SqlZeile, spalte: string): BieterId => text(z, spalte) as BieterId;
export const gliederungId = (z: SqlZeile, spalte: string): GliederungId => text(z, spalte) as GliederungId;

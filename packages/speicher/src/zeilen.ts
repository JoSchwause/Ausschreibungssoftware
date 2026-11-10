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
  Position,
  PositionId,
  Positionsmerkmale,
  ProjektId,
  Prozent,
  Gesamtsummen,
  Gliederungssumme,
  TitelId,
  Zuschlag,
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

// // v1.1b: mechanisch angepasst, Folgeticket: Felder, für die `speicher` noch keine Spalten hat (Kopfdaten des LV, getrennte Bedarfs- und Wahlsummen).
// Sie werden abgewiesen statt still verworfen (Q5), bis das Folgeticket `speicher` sie aufnimmt. Der Kern setzt sie
// heute nie, kein Paket erzeugt sie.

export function pruefeKopfdaten(k: {
  id: string;
  auftraggeber?: unknown;
  vergabeinformationen?: unknown;
}): void {
  if (k.auftraggeber !== undefined || k.vergabeinformationen !== undefined)
    abbruch(
      'unbekannt',
      `LV ${k.id}: Auftraggeber und Vergabeinformationen lassen sich noch nicht speichern (Vertrag v1.1b, Folgeticket speicher).`,
    );
}

export function pruefeSummenfelder(
  aggregatId: string,
  s: { gesamt: Gesamtsummen | null; gliederungen: readonly Gliederungssumme[] },
): void {
  const g = s.gesamt;
  if (
    g?.summeBedarfOhneGesamtbetrag !== undefined ||
    g?.summeWahl !== undefined ||
    s.gliederungen.some((x) => x.summeBedarfOhneGesamtbetrag !== undefined || x.summeWahl !== undefined)
  )
    abbruch(
      'unbekannt',
      `${aggregatId}: Die Bedarfs- und Wahlsummen lassen sich noch nicht speichern (Vertrag v1.1b, Folgeticket speicher).`,
    );
}

// // v1.1b: mechanisch angepasst, Folgeticket: Die Tabelle `knoten` hat noch die Spalten vor v1.1b (eine Positionsart, ein Bezug, eine Grundposition).
// Eine Position, die sich darin nicht verlustfrei ablegen lässt, wird abgewiesen (Q5: nie still verwerfen), bis das
// Folgeticket `speicher` (Ticket 38) Spalten oder JSON für Merkmale, Zuschlag und Leitbeschreibung einführt
// (Migration, A8). Der Langtext liegt schon vollständig als JSON in `text_json` (v1.1b, Ticket 31).
export function altSpalten(k: Position): [string, number, number, PositionId | null, PositionId | null] {
  const m = k.merkmale;
  const arten = [k.zuschlag !== null, m.wahl !== null, m.bedarf !== null, m.stundenlohn].filter(
    Boolean,
  ).length;
  const bezug = k.zuschlag?.bezug;
  const nichtSpeicherbar =
    arten > 1 ||
    m.zuschlagskennzeichen ||
    k.leitbeschreibung !== undefined ||
    (m.wahl !== null && (m.wahl.gruppe !== null || m.wahl.variante !== null)) ||
    (k.zuschlag !== null &&
      (k.zuschlag.prozentsatz !== null ||
        bezug?.art !== 'positionen' ||
        bezug.positionen.length > 1 ||
        bezug.positionen.some((b) => b.teilmenge !== null)));
  if (nichtSpeicherbar)
    return abbruch(
      'unbekannt',
      `Position ${k.id}: Die Merkmale, der Zuschlag oder die Leitbeschreibung lassen sich noch nicht speichern (Vertrag v1.1b, Folgeticket speicher).`,
    );
  const art =
    k.zuschlag !== null
      ? 'zuschlag'
      : m.wahl !== null
        ? 'wahl'
        : m.bedarf !== null
          ? 'bedarf'
          : m.stundenlohn
            ? 'stundenlohn'
            : 'normal';
  return [
    art,
    m.pauschal ? 1 : 0,
    m.bedarf === 'mit-gesamtbetrag' ? 1 : 0,
    bezug?.art === 'positionen' ? (bezug.positionen[0]?.positionId ?? null) : null,
    m.wahl?.grundpositionId ?? null,
  ];
}

function neuAusAltSpalten(z: SqlZeile): { merkmale: Positionsmerkmale; zuschlag: Zuschlag | null } {
  const art = text(z, 'positionsart');
  const bezug = textOderNull(z, 'bezugsposition_id') as PositionId | null;
  return {
    merkmale: {
      bedarf:
        art === 'bedarf'
          ? ganzzahl(z, 'bedarf_mit_gesamtbetrag') === 1
            ? 'mit-gesamtbetrag'
            : 'ohne-gesamtbetrag'
          : null,
      wahl:
        art === 'wahl'
          ? {
              gruppe: null,
              variante: null,
              grundpositionId: textOderNull(z, 'grundposition_id') as PositionId | null,
            }
          : null,
      stundenlohn: art === 'stundenlohn',
      pauschal: ganzzahl(z, 'pauschal') === 1,
      zuschlagskennzeichen: false,
    },
    zuschlag:
      art === 'zuschlag'
        ? {
            prozentsatz: null,
            bezug: {
              art: 'positionen',
              positionen: bezug === null ? [] : [{ positionId: bezug, teilmenge: null }],
            },
          }
        : null,
  };
}

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
        ...altSpalten(k),
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
        ...neuAusAltSpalten(z), // // v1.1b: mechanisch angepasst, Folgeticket
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

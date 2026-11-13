// SPDX-License-Identifier: AGPL-3.0-or-later
// Bausteine für Tests (nur Tests): kleine Bauwerksmodelle und Positionen. Die `as`-Casts auf Marken ersetzen hier `ifc`,
// `dezimal` und die App; Werte sind selbst verfasst (C4).

import type {
  Ansatzzeile,
  Bauteil,
  Bauteilmenge,
  Bauteilzuordnung,
  Bauwerksmodell,
  BauwerksmodellId,
  Einheit,
  ElternId,
  IfcGlobalId,
  Knoten,
  Menge,
  Position,
  PositionId,
  ProjektId,
  Strukturknoten,
} from '@tethys/vertrag';

/** Eine GlobalId in Form (22 Zeichen aus dem IFC-Base64-Alphabet) aus einem kurzen Schlüssel aus Buchstaben und Ziffern. */
export function gid(schluessel: string): IfcGlobalId {
  const rein = schluessel.replace(/[^0-9A-Za-z_$]/g, '_');
  if (rein.length > 22) throw new Error(`Schlüssel zu lang: ${schluessel}`);
  return rein.padEnd(22, '$') as IfcGlobalId; // `$` kommt in keinem Schlüssel vor: B1 und B10 bleiben verschieden
}

export const m = (wert: string): Menge => wert as Menge;

export function menge(
  name: string,
  wert: string,
  art: Bauteilmenge['art'] = 'flaeche',
  satz: string | null = 'Qto_Test',
): Bauteilmenge {
  return { satz, name, art, wert: m(wert) };
}

export function knoten(
  schluessel: string,
  art: Strukturknoten['art'],
  eltern: string | null,
  mengen: readonly Bauteilmenge[] = [],
  name: string | null = schluessel,
): Strukturknoten {
  return {
    globalId: gid(schluessel),
    art,
    name,
    elternGlobalId: eltern === null ? null : gid(eltern),
    mengen,
  };
}

export function bauteil(
  schluessel: string,
  mengen: readonly Bauteilmenge[],
  ueber: Partial<Bauteil> = {},
): Bauteil {
  return {
    globalId: gid(schluessel),
    ifcKlasse: 'IfcWall',
    name: schluessel,
    typ: null,
    strukturGlobalId: gid('EG'),
    mengen,
    ...ueber,
  };
}

/** Projekt → Gebäude → Geschosse EG und OG (je mit BGF und BRI) → Raum R1 im EG; Bauteile nach Wahl. */
export function struktur(): Strukturknoten[] {
  return [
    knoten('P', 'projekt', null),
    knoten('G', 'gebaeude', 'P'),
    knoten('EG', 'geschoss', 'G', [
      menge('GrossFloorArea', '100.000', 'flaeche', 'Qto_BuildingStoreyBaseQuantities'),
      menge('GrossVolume', '300.000', 'volumen', 'Qto_BuildingStoreyBaseQuantities'),
    ]),
    knoten('OG', 'geschoss', 'G', [
      menge('GrossFloorArea', '90.500', 'flaeche', 'Qto_BuildingStoreyBaseQuantities'),
      menge('GrossVolume', '250.250', 'volumen', 'Qto_BuildingStoreyBaseQuantities'),
    ]),
    knoten('R1', 'raum', 'EG', [menge('NetFloorArea', '80.125', 'flaeche', 'Qto_SpaceBaseQuantities')]),
  ];
}

export function modell(ueber: Partial<Bauwerksmodell> = {}): Bauwerksmodell {
  return {
    id: 'modell-1' as BauwerksmodellId,
    projektId: 'projekt-1' as ProjektId,
    name: 'Haus',
    datei: { hash: 'a'.repeat(64), dateiname: 'haus.ifc', groesse: 1234 },
    schema: 'IFC4',
    vorgaengerId: null,
    eingelesen: '2026-11-12',
    struktur: struktur(),
    bauteile: [
      bauteil('W1', [menge('Length', '5.000', 'laenge'), menge('NetSideArea', '12.500')]),
      bauteil('W2', [menge('Length', '3.250', 'laenge'), menge('NetSideArea', '8.125')], {
        strukturGlobalId: gid('OG'),
      }),
    ],
    ...ueber,
  };
}

export const zuordnung = (schluessel: string, mengenart: string): Bauteilzuordnung => ({
  globalId: gid(schluessel),
  mengenart,
});

export const zeile = (nr: number, ausdruck: string): Ansatzzeile => ({
  zeile: nr,
  formel: 91,
  ausdruck,
  variable: null,
});

/** Eine Position mit allen Pflichtfeldern; was `bim` nicht liest, steht auf einem neutralen Wert. */
export function position(
  id: string,
  einheit: Einheit | null,
  bauteile: readonly Bauteilzuordnung[] | undefined,
  ueber: Partial<Position> = {},
): Position {
  return {
    art: 'position',
    id: id as PositionId,
    elternId: 'lv-1' as ElternId,
    reihenfolge: 0,
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext: id,
    langtext: [],
    menge: null,
    einheit,
    einheitspreis: null,
    epa: null,
    ...(bauteile === undefined ? {} : { bauteile }),
    ...ueber,
  };
}

/** Knotenliste aus Positionen (Reihenfolge wie übergeben). */
export const lv = (...positionen: Position[]): Knoten[] => positionen;

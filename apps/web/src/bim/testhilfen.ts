// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Vitest (Ticket 114): das Hausmodell aus `fixtures/ifc` über `ifc` gelesen, wie die App es im Worker tut, und
// kleine Modelle von Hand.

import { readFileSync } from 'node:fs';
import { bauwerksmodellLesen } from '@tethys/ifc';
import type {
  Bauteil,
  Bauteilmenge,
  Bauwerksmodell,
  BauwerksmodellId,
  BauwerksmodellKopf,
  IfcGlobalId,
  Menge,
  ProjektId,
  Strukturknoten,
} from '@tethys/vertrag';

export const PROJEKT = 'p1' as ProjektId;

export function hausBytes(name: 'haus-v1' | 'haus-v2' = 'haus-v1'): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`../../../../fixtures/ifc/${name}.ifc`, import.meta.url)));
}

export function kopfOhneSchema(
  bytes: Uint8Array,
  id = 'm1',
  dateiname = 'haus-v1.ifc',
): Omit<BauwerksmodellKopf, 'schema'> {
  return {
    id: id as BauwerksmodellId,
    projektId: PROJEKT,
    name: 'Haus',
    datei: { hash: 'a'.repeat(64), dateiname, groesse: bytes.length },
    vorgaengerId: null,
    eingelesen: '2026-11-12',
  };
}

let haus: Bauwerksmodell | null = null;
/** `haus-v1.ifc` als Bauwerksmodell (ohne Befund, Ticket 107). */
export function hausModell(): Bauwerksmodell {
  if (haus === null) {
    const bytes = hausBytes();
    const r = bauwerksmodellLesen(bytes, kopfOhneSchema(bytes));
    if (r.bauwerksmodell === null) throw new Error('haus-v1 nicht lesbar');
    haus = r.bauwerksmodell;
  }
  return haus;
}

/** 22 Zeichen aus einem kurzen Namen (nur für Testmodelle). */
export const gid = (kurz: string): IfcGlobalId => kurz.padEnd(22, '0').slice(0, 22) as IfcGlobalId;

export const menge = (name: string, art: Bauteilmenge['art'], wert: string): Bauteilmenge => ({
  satz: 'Qto',
  name,
  art,
  wert: wert as Menge,
});

export function knoten(
  kurz: string,
  art: Strukturknoten['art'],
  eltern: string | null,
  name: string | null = kurz,
): Strukturknoten {
  return { globalId: gid(kurz), art, name, elternGlobalId: eltern === null ? null : gid(eltern), mengen: [] };
}

export function bauteil(
  kurz: string,
  struktur: string | null,
  weiter: Partial<Omit<Bauteil, 'globalId'>> & { teilVon?: string } = {},
): Bauteil {
  const { teilVon, ...rest } = weiter;
  return {
    globalId: gid(kurz),
    ifcKlasse: 'IfcWall',
    name: kurz,
    typ: null,
    strukturGlobalId: struktur === null ? null : gid(struktur),
    mengen: [],
    ...(teilVon === undefined ? {} : { teilVonGlobalId: gid(teilVon) }),
    ...rest,
  };
}

export function modell(struktur: Strukturknoten[], bauteile: Bauteil[]): Bauwerksmodell {
  return {
    id: 'm1' as BauwerksmodellId,
    projektId: PROJEKT,
    name: 'Test',
    datei: { hash: 'a'.repeat(64), dateiname: 't.ifc', groesse: 1 },
    schema: 'IFC4',
    vorgaengerId: null,
    eingelesen: '2026-11-12',
    struktur,
    bauteile,
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Kern des Geometrie-Workers: liest eine IFC-Datei mit web-ifc und liefert die Geometrie je Bauteil (D-50). Läuft im
// Browser im Worker (`geometrie-worker.ts`) und in den Tests unter Node mit derselben web-ifc-Version.

import type { IfcGlobalId } from '@tethys/vertrag';
import { IFCELEMENT } from 'web-ifc';
import type { IfcAPI } from 'web-ifc';
import { Geometriesammler } from './geometrie';
import type { Geometriegruppe, Rohteil } from './geometrie';
import type { Grenzen } from './kamera';
import { istBauteilklasse, zuordnen } from './zuordnung';
import type { IfcElementEintrag } from './zuordnung';

export interface Modellgeometrie {
  readonly gruppen: readonly Geometriegruppe[];
  /** GlobalId je Bauteilindex (`Geometriegruppe.teile` nennt den Index) */
  readonly globalIdJeIndex: readonly IfcGlobalId[];
  readonly mitGeometrie: readonly IfcGlobalId[];
  readonly ohneGeometrie: readonly IfcGlobalId[];
  /** Grenzen aller gezeichneten Teile, `null` ohne Geometrie */
  readonly grenzen: Grenzen | null;
}

/** Die Datei ist keine lesbare IFC-Datei (web-ifc öffnet sie nicht). */
export class Lesefehler extends Error {
  override readonly name = 'Lesefehler';
}

/** Einstellungen für web-ifc: das Modell an den Ursprung rücken, damit Float32 auch bei Landeskoordinaten genau bleibt. */
const EINSTELLUNGEN = { COORDINATE_TO_ORIGIN: true } as const;

function oeffnen(api: IfcAPI, datei: Uint8Array): number {
  let modell: number;
  try {
    modell = api.OpenModel(datei, EINSTELLUNGEN);
  } catch (e) {
    throw new Lesefehler(e instanceof Error ? e.message : String(e));
  }
  if (modell < 0) throw new Lesefehler('web-ifc kann die Datei nicht öffnen.');
  return modell;
}

function elementeLesen(api: IfcAPI, modell: number): IfcElementEintrag[] {
  const ids = api.GetLineIDsWithType(modell, IFCELEMENT, true);
  const elemente: IfcElementEintrag[] = [];
  for (let i = 0; i < ids.size(); i++) {
    const expressId = ids.get(i);
    const klasse = api.GetNameFromTypeCode(api.GetLineType(modell, expressId) as number);
    const zeile = api.GetLine(modell, expressId) as { GlobalId?: { value?: unknown } } | undefined;
    const globalId = zeile?.GlobalId?.value;
    // Quelle der Marke (Ticket 155, D-140.7): die GlobalId, wie sie in der Datei steht; der Abgleich mit dem Leser der App
    // läuft über Gleichheit, eine nicht wohlgeformte meldet der Leser als Befund.
    if (typeof globalId === 'string') elemente.push({ expressId, globalId: globalId as IfcGlobalId, klasse });
  }
  return elemente;
}

/** Liest die Geometrie aller Bauteile. Wirft `Lesefehler`, wenn web-ifc die Datei nicht öffnet. */
export function geometrieLesen(api: IfcAPI, datei: Uint8Array): Modellgeometrie {
  const modell = oeffnen(api, datei);
  try {
    const elemente = elementeLesen(api, modell);
    const bauteile = new Set(elemente.filter((e) => istBauteilklasse(e.klasse)).map((e) => e.expressId));
    const geliefert: number[] = [];
    const roh: (Omit<Rohteil, 'bauteil'> & { readonly expressId: number })[] = [];
    api.StreamAllMeshes(modell, (netz) => {
      if (!bauteile.has(netz.expressID)) return;
      geliefert.push(netz.expressID);
      const teile = netz.geometries;
      for (let i = 0; i < teile.size(); i++) {
        const teil = teile.get(i);
        const g = api.GetGeometry(modell, teil.geometryExpressID);
        try {
          roh.push({
            expressId: netz.expressID,
            ecken: api.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize()),
            dreiecke: api.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize()),
            lage: [...teil.flatTransformation],
            farbe: [teil.color.x, teil.color.y, teil.color.z, teil.color.w],
          });
        } finally {
          g.delete();
        }
      }
    });

    const z = zuordnen(elemente, geliefert);
    const sammler = new Geometriesammler();
    for (const { expressId, ...teil } of roh) {
      const bauteil = z.indexJeExpressId.get(expressId);
      if (bauteil !== undefined && teil.dreiecke.length > 0) sammler.hinzufuegen({ ...teil, bauteil });
    }
    return {
      gruppen: sammler.fertig(),
      globalIdJeIndex: z.globalIdJeIndex,
      mitGeometrie: z.mitGeometrie,
      ohneGeometrie: z.ohneGeometrie,
      grenzen: sammler.grenzen(),
    };
  } finally {
    api.CloseModel(modell);
  }
}

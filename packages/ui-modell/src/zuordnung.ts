// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuordnung der Geometrie zu Bauteilen. Der Worker kennt die expressID (Zeilennummer der IFC-Datei), die App nur die
// GlobalId (D-50). Ein Bauteil ist hier jedes IfcElement außer Öffnungen und virtuellen Elementen (wie im Leser von
// Ticket 98); Räume und Grundstück sind keine Elemente und werden nicht gezeichnet.
import type { IfcGlobalId } from '@tethys/vertrag';

/** Ein IfcElement der Datei, wie es web-ifc liefert. `klasse` ist der IFC-Klassenname (Groß-/Kleinschreibung egal). */
export interface IfcElementEintrag {
  readonly expressId: number;
  readonly globalId: IfcGlobalId;
  readonly klasse: string;
}

export interface Zuordnung {
  /** GlobalId je Bauteilindex. Ein Bauteilindex steht für ein gezeichnetes Bauteil, in der Reihenfolge der Geometrie. */
  readonly globalIdJeIndex: readonly IfcGlobalId[];
  /** Bauteilindex je expressID, nur für gezeichnete Bauteile. */
  readonly indexJeExpressId: ReadonlyMap<number, number>;
  /** Die GlobalIds der gezeichneten Bauteile, jede einmal. */
  readonly mitGeometrie: readonly IfcGlobalId[];
  /** Die GlobalIds der Bauteile, für die web-ifc keine Geometrie liefert, jede einmal (Reihenfolge der Datei). */
  readonly ohneGeometrie: readonly IfcGlobalId[];
}

/** Elementklassen, die keine Bauteile sind (Ticket 98: Öffnungen und virtuelle Elemente). */
const KEINE_BAUTEILE: ReadonlySet<string> = new Set([
  'IFCOPENINGELEMENT',
  'IFCOPENINGSTANDARDCASE',
  'IFCVOIDINGFEATURE',
  'IFCVIRTUALELEMENT',
]);

/** Ist ein Element dieser IFC-Klasse ein Bauteil? */
export function istBauteilklasse(klasse: string): boolean {
  return !KEINE_BAUTEILE.has(klasse.toUpperCase());
}

/**
 * Ordnet die expressIDs, für die web-ifc Geometrie liefert (in Lieferreihenfolge), den Bauteilen zu.
 * Geometrie ohne Bauteil (Raum, Grundstück, Öffnung) wird nicht gezeichnet.
 */
export function zuordnen(
  elemente: readonly IfcElementEintrag[],
  expressIdsMitGeometrie: Iterable<number>,
): Zuordnung {
  const bauteile = new Map<number, IfcElementEintrag>();
  for (const e of elemente) if (istBauteilklasse(e.klasse)) bauteile.set(e.expressId, e);

  const indexJeExpressId = new Map<number, number>();
  const globalIdJeIndex: IfcGlobalId[] = [];
  for (const expressId of expressIdsMitGeometrie) {
    const bauteil = bauteile.get(expressId);
    if (!bauteil || indexJeExpressId.has(expressId)) continue;
    indexJeExpressId.set(expressId, globalIdJeIndex.length);
    globalIdJeIndex.push(bauteil.globalId);
  }

  const gezeichnet = new Set(globalIdJeIndex);
  const ohne = new Set<IfcGlobalId>();
  for (const b of bauteile.values()) if (!gezeichnet.has(b.globalId)) ohne.add(b.globalId);
  return {
    globalIdJeIndex,
    indexJeExpressId,
    mitGeometrie: [...gezeichnet],
    ohneGeometrie: [...ohne],
  };
}

/** GlobalId ↔ Bauteilindex auf der Seite der Leinwand. Eine doppelte GlobalId steht für alle ihre Bauteile. */
export class Bauteilverzeichnis {
  readonly #globalIds: readonly IfcGlobalId[];
  readonly #indizes = new Map<string, number[]>();

  constructor(globalIdJeIndex: readonly IfcGlobalId[]) {
    this.#globalIds = globalIdJeIndex;
    globalIdJeIndex.forEach((id, i) => {
      const liste = this.#indizes.get(id);
      if (liste) liste.push(i);
      else this.#indizes.set(id, [i]);
    });
  }

  get anzahl(): number {
    return this.#globalIds.length;
  }

  globalId(index: number): IfcGlobalId {
    const id = this.#globalIds[index];
    if (id === undefined) throw new RangeError(`Kein Bauteil mit Index ${String(index)}`);
    return id;
  }

  indizes(globalId: IfcGlobalId): readonly number[] {
    return this.#indizes.get(globalId) ?? [];
  }

  enthaelt(globalId: IfcGlobalId): boolean {
    return this.#indizes.has(globalId);
  }
}

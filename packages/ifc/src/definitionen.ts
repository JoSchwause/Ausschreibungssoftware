// SPDX-License-Identifier: AGPL-3.0-or-later
// Wer was definiert (Ticket 98, Punkte 5 bis 7): `IfcRelDefinesByProperties` hängt Mengen- und Eigenschaftssätze an
// Objekte, `IfcRelDefinesByType` gibt einem Objekt seinen Typ, der Typ trägt eigene Sätze (`HasPropertySets`).

import type { Modellleser } from './modell';

/** Ein Satz (Index der Instanz in der Datei) mit seinen gelesenen Einträgen. */
export interface Satzeintraege<T> {
  readonly pos: number;
  readonly eintraege: readonly T[];
}

export class Definitionen {
  private readonly vonObjekt: Map<number, number[]>;
  private readonly typVon: Map<number, number>;

  /**
   * Sammelt die Beziehungen der Datei; mit `vorlage` übernimmt sie deren Sammlung und liest mit `l` (der Eigenschaftsindex,
   * Ticket 107: Beziehungen einmal sammeln, je Abfrage mit eigenem Leser für ihre Befunde).
   */
  constructor(
    private readonly l: Modellleser,
    vorlage?: Definitionen,
  ) {
    this.vonObjekt = vorlage?.vonObjekt ?? new Map<number, number[]>();
    this.typVon = vorlage?.typVon ?? new Map<number, number>();
    if (vorlage !== undefined) return;
    for (const r of l.instanzen('IFCRELDEFINESBYPROPERTIES')) {
      const p = l.parameter(r);
      if (p === null) continue;
      // IFC 4 erlaubt statt eines Satzes ein `IfcPropertySetDefinitionSet`, einen getypten Wert mit einer Liste.
      const definition = p[5];
      const saetze =
        definition?.art === 'getypt'
          ? l.ziele(r, definition.wert)
          : [l.ziel(r, definition)].filter((s): s is number => s !== null);
      for (const o of l.ziele(r, p[4])) {
        const liste = this.vonObjekt.get(o);
        if (liste === undefined) this.vonObjekt.set(o, [...saetze]);
        else liste.push(...saetze);
      }
    }
    for (const r of l.instanzen('IFCRELDEFINESBYTYPE')) {
      const p = l.parameter(r);
      if (p === null) continue;
      const typ = l.ziel(r, p[5]);
      if (typ === null) continue;
      for (const o of l.ziele(r, p[4])) if (!this.typVon.has(o)) this.typVon.set(o, typ);
    }
  }

  /** Index des Typs eines Objekts (`IfcRelDefinesByType`). */
  typ(i: number): number | undefined {
    return this.typVon.get(i);
  }

  /** Sätze am Objekt selbst und an seinem Typ (`HasPropertySets` und Beziehungen), je ohne Wiederholung. */
  saetze(i: number): { readonly eigene: readonly number[]; readonly vomTyp: readonly number[] } {
    const eigene = [...new Set(this.vonObjekt.get(i) ?? [])];
    const typ = this.typVon.get(i);
    if (typ === undefined) return { eigene, vomTyp: [] };
    const amTyp = [...this.l.ziele(typ, this.l.parameter(typ)?.[5]), ...(this.vonObjekt.get(typ) ?? [])];
    return { eigene, vomTyp: [...new Set(amTyp)].filter((s) => !eigene.includes(s)) };
  }
}

/**
 * Führt die Einträge der Sätze am Objekt und am Typ zusammen: Ein Eintrag am Objekt überschreibt den gleichnamigen
 * desselben Satzes am Typ. Reihenfolge: die Sätze nach ihrer Stelle in der Datei, darin die Reihenfolge ihrer Liste.
 */
export function zusammenfuehren<T extends { readonly satz: string | null; readonly name: string }>(
  eigene: readonly Satzeintraege<T>[],
  vomTyp: readonly Satzeintraege<T>[],
): T[] {
  const schluessel = (e: T): string => `${e.satz ?? ''}\u0000${e.name}`;
  const ueberschrieben = new Set(eigene.flatMap((s) => s.eintraege.map(schluessel)));
  const vomTypUebrig = vomTyp.map((s) => ({
    pos: s.pos,
    eintraege: s.eintraege.filter((e) => !ueberschrieben.has(schluessel(e))),
  }));
  return [...eigene, ...vomTypUebrig].sort((a, b) => a.pos - b.pos).flatMap((s) => s.eintraege);
}

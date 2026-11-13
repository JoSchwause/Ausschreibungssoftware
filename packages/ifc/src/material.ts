// SPDX-License-Identifier: AGPL-3.0-or-later
// Materialnamen (Ticket 98, Punkt 5): `IfcRelAssociatesMaterial` → Material, Schichtenfolge, Profile, Bestandteile oder
// Liste, bis zu den `IfcMaterial`-Namen. Die Stellen der Verweise nach der öffentlichen IFC-Spezifikation.

import type { Modellleser } from './modell';
import { text } from './werte';

/** Wo eine Materialangabe auf die nächste verweist: Stelle des Attributs, Liste oder einzelner Verweis. */
const WEGE: ReadonlyMap<string, { readonly stelle: number; readonly liste: boolean }> = new Map([
  ['IFCMATERIALLIST', { stelle: 0, liste: true }],
  ['IFCMATERIALLAYERSETUSAGE', { stelle: 0, liste: false }],
  ['IFCMATERIALLAYERSET', { stelle: 0, liste: true }],
  ['IFCMATERIALLAYER', { stelle: 0, liste: false }],
  ['IFCMATERIALLAYERWITHOFFSETS', { stelle: 0, liste: false }],
  ['IFCMATERIALPROFILESETUSAGE', { stelle: 0, liste: false }],
  ['IFCMATERIALPROFILESETUSAGETAPERING', { stelle: 0, liste: false }],
  ['IFCMATERIALPROFILESET', { stelle: 2, liste: true }],
  ['IFCMATERIALPROFILE', { stelle: 2, liste: false }],
  ['IFCMATERIALPROFILEWITHOFFSETS', { stelle: 2, liste: false }],
  ['IFCMATERIALCONSTITUENTSET', { stelle: 2, liste: true }],
  ['IFCMATERIALCONSTITUENT', { stelle: 2, liste: false }],
]);

/** Größte Tiefe einer Materialangabe (Nutzung → Satz → Schicht → Material sind 4). */
const MAX_TIEFE = 8;

export class Materialleser {
  private readonly vonObjekt: Map<number, number[]>;

  /** Sammelt die Zuordnungen der Datei; mit `vorlage` übernimmt er deren Sammlung und liest mit `l` (wie `Definitionen`). */
  constructor(
    private readonly l: Modellleser,
    vorlage?: Materialleser,
  ) {
    this.vonObjekt = vorlage?.vonObjekt ?? new Map<number, number[]>();
    if (vorlage !== undefined) return;
    for (const r of l.instanzen('IFCRELASSOCIATESMATERIAL')) {
      const p = l.parameter(r);
      if (p === null) continue;
      const m = l.ziel(r, p[5]);
      if (m === null) continue;
      for (const o of l.ziele(r, p[4])) {
        const liste = this.vonObjekt.get(o);
        if (liste === undefined) this.vonObjekt.set(o, [m]);
        else liste.push(m);
      }
    }
  }

  /** Materialnamen des Objekts ohne Wiederholung; die des Typs nur, wenn das Objekt selbst keine nennt. */
  materialien(i: number, typ: number | undefined): string[] {
    const eigene = this.namen(this.vonObjekt.get(i) ?? []);
    return eigene.length > 0 || typ === undefined ? eigene : this.namen(this.vonObjekt.get(typ) ?? []);
  }

  private namen(angaben: readonly number[]): string[] {
    const namen: string[] = [];
    const besucht = new Set<number>();
    const besuche = (m: number, tiefe: number): void => {
      if (tiefe > MAX_TIEFE || besucht.has(m)) return;
      besucht.add(m);
      const p = this.l.parameter(m);
      if (p === null) return;
      const klasse = this.l.klasseVon(m);
      if (klasse === 'IFCMATERIAL') {
        const name = text(p[0]);
        if (name !== null && !namen.includes(name)) namen.push(name);
        return;
      }
      const weg = WEGE.get(klasse);
      if (weg === undefined) return;
      const ziele = weg.liste ? this.l.ziele(m, p[weg.stelle]) : [this.l.ziel(m, p[weg.stelle])];
      for (const z of ziele) if (z !== null) besuche(z, tiefe + 1);
    };
    for (const m of angaben) besuche(m, 0);
    return namen;
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Klassifikation (Ticket 98, Punkt 8): `IfcRelAssociatesClassification` → `IfcClassificationReference`. Kennung an
// zweiter Stelle (2x3 `ItemReference`, 4 `Identification`), Name an dritter, die Quelle an vierter: eine
// `IfcClassification` (Name an vierter Stelle) oder, in IFC 4, eine übergeordnete Referenz.

import type { Kostengruppennummer } from '@tethys/vertrag';
import { klassenname } from './klassen';
import type { Modellleser } from './modell';
import type { Klassifikation } from './typen';
import { text } from './werte';

/** Dreistellige Kostengruppennummer (Form wie `Kostengruppennummer`, die erste Ziffer nicht 0). */
const KOSTENGRUPPE = /^[1-9][0-9]{2}$/;

/** Größte Zahl übergeordneter Referenzen bis zur Klassifikation; schützt vor Kreisen. */
const MAX_STUFEN = 16;

export class Klassifikationsleser {
  private readonly vonObjekt: Map<number, number[]>;
  private readonly gelesen = new Map<number, Klassifikation | null>();

  /** Sammelt die Zuordnungen der Datei; mit `vorlage` übernimmt er deren Sammlung und liest mit `l` (wie `Definitionen`). */
  constructor(
    private readonly l: Modellleser,
    vorlage?: Klassifikationsleser,
  ) {
    this.vonObjekt = vorlage?.vonObjekt ?? new Map<number, number[]>();
    if (vorlage !== undefined) return;
    for (const r of l.daten.klasse('IFCRELASSOCIATESCLASSIFICATION')) {
      const p = l.parameter(r);
      if (p === null) continue;
      const k = l.ziel(r, p[5]);
      if (k === null) continue;
      for (const o of l.ziele(r, p[4])) {
        const liste = this.vonObjekt.get(o);
        if (liste === undefined) this.vonObjekt.set(o, [k]);
        else if (!liste.includes(k)) liste.push(k);
      }
    }
  }

  /** Klassifikationen am Objekt und, danach, die weiteren an seinem Typ. */
  klassifikationen(i: number, typ: number | undefined): Klassifikation[] {
    const eigene = this.vonObjekt.get(i) ?? [];
    const amTyp = typ === undefined ? [] : (this.vonObjekt.get(typ) ?? []).filter((k) => !eigene.includes(k));
    return [...eigene, ...amTyp].map((k) => this.lesen(k)).filter((k): k is Klassifikation => k !== null);
  }

  private lesen(k: number): Klassifikation | null {
    const fertig = this.gelesen.get(k);
    if (fertig !== undefined) return fertig;
    let ergebnis: Klassifikation | null = null;
    const p = this.l.parameter(k);
    const klasse = this.l.daten.name(k);
    if (klasse === 'IFCCLASSIFICATIONREFERENCE' && p !== null)
      ergebnis = { system: this.system(k), kennung: text(p[1]), name: text(p[2]) };
    else if (p !== null)
      this.l.melde(
        'warnung',
        'klassifikation-nicht-gelesen',
        `${klassenname(klasse)} #${String(this.l.daten.id(k))} ist keine Klassifikationsreferenz und wird nicht gelesen.`,
        this.l.ort(k),
      );
    this.gelesen.set(k, ergebnis);
    return ergebnis;
  }

  /** Name der Klassifikation, zu der die Referenz `k` gehört (über übergeordnete Referenzen). */
  private system(k: number): string | null {
    let quelle = this.l.ziel(k, this.l.parameter(k)?.[3]);
    for (let stufe = 0; quelle !== null && stufe < MAX_STUFEN; stufe++) {
      const klasse = this.l.daten.name(quelle);
      if (klasse === 'IFCCLASSIFICATION') return text(this.l.parameter(quelle)?.[3]);
      if (klasse !== 'IFCCLASSIFICATIONREFERENCE') return null;
      quelle = this.l.ziel(quelle, this.l.parameter(quelle)?.[3]);
    }
    return null;
  }
}

/** Kostengruppen-Vorschläge der Klassifikationen: dreistellige Nummer aus einem System mit „276“ im Namen. */
export function kostengruppenvorschlaege(klassifikationen: readonly Klassifikation[]): Kostengruppennummer[] {
  const vorschlaege: Kostengruppennummer[] = [];
  for (const k of klassifikationen) {
    const kennung = k.kennung?.trim() ?? '';
    if (k.system?.includes('276') !== true || !KOSTENGRUPPE.test(kennung)) continue;
    // Form geprüft (vertrag: wer eine Nummer aus einer Datei liest, prüft die Form selbst).
    const nummer = kennung as Kostengruppennummer;
    if (!vorschlaege.includes(nummer)) vorschlaege.push(nummer);
  }
  return vorschlaege;
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauwerksmodell aus den Instanzen der STEP-Datei (Ticket 98, Punkte 4 bis 8). Attributfolgen nach der öffentlichen
// IFC-Spezifikation; die hier gelesenen Attribute stehen in IFC 2x3 und IFC 4 an derselben Stelle.

import type { Befundort } from '@tethys/vertrag';
import { befund } from './step';
import type { StepDaten, StepWert } from './step';
import type { Bauteilmenge, IfcBefund, IfcBefundcode, Strukturknoten } from './typen';
import { liste, text, verweis } from './werte';

/** Klassen der Bauwerksstruktur und ihre Art (Ticket 98, Punkt 4). */
export const STRUKTURARTEN: ReadonlyMap<string, Strukturknoten['art']> = new Map([
  ['IFCPROJECT', 'projekt'],
  ['IFCSITE', 'grundstueck'],
  ['IFCBUILDING', 'gebaeude'],
  ['IFCBUILDINGSTOREY', 'geschoss'],
  ['IFCSPACE', 'raum'],
]);

/** Form einer GlobalId (Glossar): 22 Zeichen aus dem IFC-Base64-Alphabet. */
const GLOBALID = /^[0-9A-Za-z_$]{22}$/;

/** Gemeinsamer Zustand beim Lesen der Instanzen: Daten, Befunde, aufgelöste Verweise, vergebene GlobalIds. */
export class Modellleser {
  private readonly fehlendeVerweise = new Set<string>();
  /** Erste Instanz je wohlgeformter GlobalId der Strukturknoten und Bauteile. */
  private readonly vergeben = new Map<string, number>();

  constructor(
    readonly daten: StepDaten,
    readonly befunde: IfcBefund[],
  ) {}

  ort(i: number, feld?: string): Befundort {
    const ort = { pfad: `#${String(this.daten.id(i))}`, zeile: this.daten.zeile(i) };
    return feld === undefined ? ort : { ...ort, feld };
  }

  melde(schwere: IfcBefund['schwere'], code: IfcBefundcode, meldung: string, ort: Befundort): void {
    this.befunde.push(befund(schwere, code, meldung, ort));
  }

  /** Parameter der Instanz mit Index `i`. */
  parameter(i: number): readonly StepWert[] | null {
    return this.daten.parameter(i);
  }

  /** Index der Instanz, auf die `w` in der Instanz `von` verweist; `null` ohne Verweis, Befund, wenn sie fehlt. */
  ziel(von: number, w: StepWert | undefined): number | null {
    const id = verweis(w);
    if (id === null) return null;
    const i = this.daten.index(id);
    if (i !== undefined) return i;
    const schluessel = `${String(von)}:${String(id)}`;
    if (!this.fehlendeVerweise.has(schluessel)) {
      this.fehlendeVerweise.add(schluessel);
      this.melde(
        'fehler',
        'verweis-fehlt',
        `#${String(this.daten.id(von))} verweist auf #${String(id)}; diese Instanz fehlt in der Datei.`,
        this.ort(von),
      );
    }
    return null;
  }

  /** Alle Ziele einer Liste von Verweisen. */
  ziele(von: number, w: StepWert | undefined): number[] {
    const aus: number[] = [];
    for (const element of liste(w)) {
      const i = this.ziel(von, element);
      if (i !== null) aus.push(i);
    }
    return aus;
  }

  /** GlobalId (erstes Attribut jeder `IfcRoot`-Instanz) als Text der Datei, `''` wenn sie fehlt. */
  globalId(i: number): string {
    return text(this.parameter(i)?.[0]) ?? '';
  }

  /**
   * GlobalId eines Strukturknotens oder Bauteils, geprüft (Ticket 98, Punkt 5): nicht wohlgeformt oder schon vergeben ist
   * ein Befund; der Wert bleibt, wie er in der Datei steht, und beide Objekte bleiben.
   */
  gepruefteGlobalId(i: number): string {
    const globalId = this.globalId(i);
    const nummer = `#${String(this.daten.id(i))}`;
    if (!GLOBALID.test(globalId)) {
      this.melde(
        'fehler',
        'globalid-ungueltig',
        globalId === ''
          ? `${nummer} hat keine GlobalId.`
          : `Die GlobalId „${globalId}“ von ${nummer} ist nicht wohlgeformt (22 Zeichen aus 0-9, A-Z, a-z, _ und $).`,
        this.ort(i, 'GlobalId'),
      );
      return globalId;
    }
    const erste = this.vergeben.get(globalId);
    if (erste === undefined) this.vergeben.set(globalId, i);
    else
      this.melde(
        'fehler',
        'globalid-doppelt',
        `Die GlobalId ${globalId} steht bei #${String(this.daten.id(erste))} und ${nummer}; beide bleiben.`,
        this.ort(i, 'GlobalId'),
      );
    return globalId;
  }

  /** `Name` einer `IfcRoot`-Instanz (drittes Attribut). */
  name(i: number): string | null {
    return text(this.parameter(i)?.[2]);
  }
}

/** Ganzes zu jedem Teil aus `IfcRelAggregates` (RelatingObject, RelatedObjects); die erste Beziehung gilt. */
export function zerlegungLesen(l: Modellleser): ReadonlyMap<number, number> {
  const ganzes = new Map<number, number>();
  for (const r of l.daten.klasse('IFCRELAGGREGATES')) {
    const p = l.parameter(r);
    if (p === null) continue;
    const oben = l.ziel(r, p[4]);
    for (const teil of l.ziele(r, p[5])) if (oben !== null && !ganzes.has(teil)) ganzes.set(teil, oben);
  }
  return ganzes;
}

/** Strukturknoten in der Reihenfolge der Datei (Ticket 98, Punkt 4). */
export function strukturLesen(
  l: Modellleser,
  ganzes: ReadonlyMap<number, number>,
  mengen: (i: number) => Bauteilmenge[],
): Strukturknoten[] {
  const indizes = [...STRUKTURARTEN.keys()].flatMap((k) => l.daten.klasse(k)).sort((a, b) => a - b);
  const knoten: Strukturknoten[] = [];
  for (const i of indizes) {
    const art = STRUKTURARTEN.get(l.daten.name(i));
    if (art === undefined || l.parameter(i) === null) continue;
    const globalId = l.gepruefteGlobalId(i);
    const oben = ganzes.get(i);
    const eltern = oben !== undefined && STRUKTURARTEN.has(l.daten.name(oben)) ? l.globalId(oben) : null;
    if (eltern === null && art !== 'projekt')
      l.melde(
        'warnung',
        'strukturknoten-ohne-eltern',
        `${l.name(i) ?? l.globalId(i)} (#${String(l.daten.id(i))}) hängt an keinem Strukturknoten (IfcRelAggregates).`,
        l.ort(i),
      );
    knoten.push({ globalId, art, name: l.name(i), elternGlobalId: eltern, mengen: mengen(i) });
  }
  return knoten;
}

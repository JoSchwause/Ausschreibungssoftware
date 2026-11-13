// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauwerksmodell aus den Instanzen der STEP-Datei (Ticket 98, Punkte 4 bis 8). Attributfolgen nach der öffentlichen
// IFC-Spezifikation; die hier gelesenen Attribute stehen in IFC 2x3 und IFC 4 an derselben Stelle.

import type { Befundort } from '@tethys/vertrag';
import { istGlobalId } from './globalid';
import { befund } from './step';
import type { StepDaten, StepWert } from './step';
import type { StepBauteilmenge, IfcBefund, IfcBefundcode, StepStrukturknoten } from './typen';
import { liste, text, verweis } from './werte';

/** Klassen der Bauwerksstruktur und ihre Art (Ticket 98, Punkt 4). */
export const STRUKTURARTEN: ReadonlyMap<string, StepStrukturknoten['art']> = new Map([
  ['IFCPROJECT', 'projekt'],
  ['IFCSITE', 'grundstueck'],
  ['IFCBUILDING', 'gebaeude'],
  ['IFCBUILDINGSTOREY', 'geschoss'],
  ['IFCSPACE', 'raum'],
]);

/** Gemeinsamer Zustand beim Lesen der Instanzen: Daten, Befunde, aufgelöste Verweise, vergebene GlobalIds. */
export class Modellleser {
  private readonly fehlendeVerweise = new Set<string>();
  /** Instanzen, deren Befunde beim Zerlegen dieser Leser schon gemeldet hat. */
  private readonly zerlegungGemeldet = new Set<number>();
  /** Erste Instanz je wohlgeformter GlobalId der Strukturknoten und Bauteile. */
  private readonly vergeben = new Map<string, number>();
  /**
   * Das Objekt (Index der Instanz), das ein Befund betrifft, wenn es nicht die Instanz seines Orts ist (z. B. das Bauteil
   * eines Befunds an einer Beziehung). Die Abbildung auf den Vertrag nennt daraus die GlobalId (Ticket 107).
   */
  readonly objektVon = new Map<IfcBefund, number>();

  /**
   * @param ohneGlobalIdEntfaellt Lesart für die Abbildung auf den Vertrag (Ticket 107): Ein Objekt ohne GlobalId in Form
   *   steht nicht im Bauwerksmodell; der Befund `globalid-ungueltig` sagt das dazu.
   */
  constructor(
    readonly daten: StepDaten,
    readonly befunde: IfcBefund[],
    private readonly ohneGlobalIdEntfaellt = false,
  ) {}

  /** Nummer der Instanz mit Index `i` in der Datei (der Teil nach `#`). */
  nummer(i: number): number {
    return this.daten.id(i);
  }

  /** Klassenname der Instanz mit Index `i`, wie ihn die Datei schreibt (Großbuchstaben, z. B. `IFCWALL`). */
  klasseVon(i: number): string {
    return this.daten.name(i);
  }

  /** Indizes aller Instanzen der Klasse `klasse` (Großbuchstaben) in Dateireihenfolge. */
  instanzen(klasse: string): readonly number[] {
    return this.daten.klasse(klasse);
  }

  ort(i: number, feld?: string): Befundort {
    const ort = { pfad: `#${String(this.nummer(i))}`, zeile: this.daten.zeile(i) };
    return feld === undefined ? ort : { ...ort, feld };
  }

  /** Meldet einen Befund; `objekt` ist das betroffene Objekt, wenn es nicht die Instanz von `ort` ist. */
  melde(
    schwere: IfcBefund['schwere'],
    code: IfcBefundcode,
    meldung: string,
    ort: Befundort,
    objekt?: number,
  ): void {
    const b = befund(schwere, code, meldung, ort);
    this.befunde.push(b);
    if (objekt !== undefined) this.objektVon.set(b, objekt);
  }

  /** Parameter der Instanz mit Index `i`; Befunde beim Zerlegen meldet dieser Leser einmal je Instanz. */
  parameter(i: number): readonly StepWert[] | null {
    const p = this.daten.parameter(i);
    const befunde = this.daten.zerlegungsbefunde(i);
    if (befunde.length > 0 && !this.zerlegungGemeldet.has(i)) {
      this.zerlegungGemeldet.add(i);
      this.befunde.push(...befunde);
    }
    return p;
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
        `#${String(this.nummer(von))} verweist auf #${String(id)}; diese Instanz fehlt in der Datei.`,
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
    const nummer = `#${String(this.nummer(i))}`;
    if (!istGlobalId(globalId)) {
      const folge = this.ohneGlobalIdEntfaellt
        ? ' Ohne GlobalId in Form steht es nicht im Bauwerksmodell.'
        : '';
      this.melde(
        'fehler',
        'globalid-ungueltig',
        (globalId === ''
          ? `${nummer} hat keine GlobalId.`
          : `Die GlobalId „${globalId}“ von ${nummer} ist nicht wohlgeformt (22 Zeichen aus 0-9, A-Z, a-z, _ und $).`) +
          folge,
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
        `Die GlobalId ${globalId} steht bei #${String(this.nummer(erste))} und ${nummer}; beide bleiben.`,
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
  for (const r of l.instanzen('IFCRELAGGREGATES')) {
    const p = l.parameter(r);
    if (p === null) continue;
    const oben = l.ziel(r, p[4]);
    for (const teil of l.ziele(r, p[5])) if (oben !== null && !ganzes.has(teil)) ganzes.set(teil, oben);
  }
  return ganzes;
}

/** Ein gelesener Strukturknoten mit den Instanzen der Datei: seiner (`i`) und der seiner Eltern, falls ein Strukturknoten. */
export interface GelesenerKnoten {
  readonly i: number;
  readonly eltern: number | null;
  readonly knoten: StepStrukturknoten;
}

/** Strukturknoten in der Reihenfolge der Datei (Ticket 98, Punkt 4). */
export function strukturLesen(
  l: Modellleser,
  ganzes: ReadonlyMap<number, number>,
  mengen: (i: number) => StepBauteilmenge[],
): GelesenerKnoten[] {
  const indizes = [...STRUKTURARTEN.keys()].flatMap((k) => l.instanzen(k)).sort((a, b) => a - b);
  const knoten: GelesenerKnoten[] = [];
  for (const i of indizes) {
    const art = STRUKTURARTEN.get(l.klasseVon(i));
    if (art === undefined || l.parameter(i) === null) continue;
    const globalId = l.gepruefteGlobalId(i);
    const oben = ganzes.get(i);
    const elternInstanz = oben !== undefined && STRUKTURARTEN.has(l.klasseVon(oben)) ? oben : null;
    const eltern = elternInstanz === null ? null : l.globalId(elternInstanz);
    if (eltern === null && art !== 'projekt')
      l.melde(
        'warnung',
        'strukturknoten-ohne-eltern',
        `${l.name(i) ?? l.globalId(i)} (#${String(l.nummer(i))}) hängt an keinem Strukturknoten (IfcRelAggregates).`,
        l.ort(i),
      );
    knoten.push({
      i,
      eltern: elternInstanz,
      knoten: { globalId, art, name: l.name(i), elternGlobalId: eltern, mengen: mengen(i) },
    });
  }
  return knoten;
}

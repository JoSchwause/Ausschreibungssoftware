// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengen (Ticket 98, Punkt 6): `IfcElementQuantity` am Objekt und an seinem Typ mit `IfcQuantityLength` … `…Time`. Der
// Wert ist der Text der Datei exakt, mal dem exakten Faktor der Einheit, am Ende kaufmännisch auf 3 Stellen (N1, N3).

import { multipliziere, runden } from '@tethys/dezimal';
import { zusammenfuehren } from './definitionen';
import type { Definitionen } from './definitionen';
import type { Einheiten } from './einheiten';
import { klassenname } from './klassen';
import type { Modellleser } from './modell';
import type { Bauteilmenge } from './typen';
import { text, verweis } from './werte';
import { zahlwert } from './zahlen';

/** Einfache Mengen und ihre Art; IFC 4 hat ein Attribut `Formula` mehr als 2x3, der Wert steht in beiden an vierter Stelle. */
const MENGENARTEN: ReadonlyMap<string, Bauteilmenge['art']> = new Map([
  ['IFCQUANTITYLENGTH', 'laenge'],
  ['IFCQUANTITYAREA', 'flaeche'],
  ['IFCQUANTITYVOLUME', 'volumen'],
  ['IFCQUANTITYCOUNT', 'anzahl'],
  ['IFCQUANTITYWEIGHT', 'gewicht'],
  ['IFCQUANTITYTIME', 'zeit'],
]);

export class Mengenleser {
  /** Gelesene Mengensätze; ein Satz am Typ wird so nur einmal gelesen und gemeldet. */
  private readonly gelesen = new Map<number, readonly Bauteilmenge[]>();
  /** Instanz jeder Menge ohne Wert, für den Ort des Befunds, wenn sie bei der Abbildung wegfällt (Ticket 107). */
  private readonly ohneWert = new Map<Bauteilmenge, number>();

  constructor(
    private readonly l: Modellleser,
    private readonly einheiten: Einheiten,
    private readonly definitionen: Definitionen,
  ) {}

  /** Mengen eines Objekts und seines Typs; die Menge am Objekt überschreibt die gleichnamige desselben Satzes am Typ. */
  mengen(i: number): Bauteilmenge[] {
    const { eigene, vomTyp } = this.definitionen.saetze(i);
    const lesen = (saetze: readonly number[]) =>
      saetze
        .filter((s) => this.l.daten.name(s) === 'IFCELEMENTQUANTITY')
        .map((s) => ({ pos: s, eintraege: this.satz(s) }));
    return zusammenfuehren(lesen(eigene), lesen(vomTyp));
  }

  /** Index der Instanz einer Menge ohne Wert (`IfcQuantity…`); `undefined` für jede andere Menge. */
  instanzOhneWert(menge: Bauteilmenge): number | undefined {
    return this.ohneWert.get(menge);
  }

  private satz(s: number): readonly Bauteilmenge[] {
    const fertig = this.gelesen.get(s);
    if (fertig !== undefined) return fertig;
    const p = this.l.parameter(s);
    const satz = text(p?.[2]);
    const mengen: Bauteilmenge[] = [];
    for (const q of this.l.ziele(s, p?.[5])) {
      const menge = this.menge(q, satz);
      if (menge === null) continue;
      mengen.push(menge);
      if (menge.wert === null) this.ohneWert.set(menge, q);
    }
    this.gelesen.set(s, mengen);
    return mengen;
  }

  private menge(q: number, satz: string | null): Bauteilmenge | null {
    const klasse = this.l.daten.name(q);
    const nummer = `#${String(this.l.daten.id(q))}`;
    const art = MENGENARTEN.get(klasse);
    if (art === undefined) {
      this.l.melde(
        'warnung',
        'menge-nicht-gelesen',
        `${klassenname(klasse)} ${nummer} ist keine einfache Menge (Länge, Fläche, Volumen, Anzahl, Gewicht, Zeit) und wird nicht gelesen.`,
        this.l.ort(q),
      );
      return null;
    }
    const p = this.l.parameter(q);
    if (p === null) return null;
    const name = text(p[0]);
    // Ein Name nur aus Leerraum ist keiner (vertrag v1.6: der Name einer Bauteilmenge ist nicht leer; Ticket 107).
    if (name === null || name.trim() === '') {
      this.l.melde(
        'fehler',
        'menge-ungueltig',
        `Die Menge ${nummer} hat keinen Namen und fällt weg.`,
        this.l.ort(q),
      );
      return null;
    }
    const zahl = zahlwert(p[3]);
    if (zahl === null) {
      this.l.melde(
        'fehler',
        'menge-ungueltig',
        `Die Menge ${name} (${nummer}) hat keine lesbare Zahl; sie bleibt ohne Wert.`,
        this.l.ort(q),
      );
      return { satz, name, art, wert: null };
    }
    // Nennt die Menge eine eigene Einheit, die fehlt, gilt nicht stillschweigend die des Projekts.
    const eigene = this.l.ziel(q, p[2]);
    if (verweis(p[2]) !== null && eigene === null) return { satz, name, art, wert: null };
    const faktor = this.einheiten.faktor(art, q, eigene);
    return { satz, name, art, wert: faktor === null ? null : runden(multipliziere(zahl, faktor), 'menge') };
  }
}

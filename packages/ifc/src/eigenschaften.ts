// SPDX-License-Identifier: AGPL-3.0-or-later
// Eigenschaften (Ticket 98, Punkt 7): `IfcPropertySet` am Objekt und an seinem Typ mit `IfcPropertySingleValue` und
// `IfcPropertyEnumeratedValue`. Werte als Text mit IFC-Typname, ohne Umrechnung; andere Arten sind ein Befund (nichts
// erfunden). Getrennt von den Mengen gehalten: Eigenschaften werden nicht gespeichert (D-51).

import { zusammenfuehren } from './definitionen';
import type { Definitionen } from './definitionen';
import { klassenname } from './klassen';
import type { Modellleser } from './modell';
import type { StepWert } from './step';
import type { Eigenschaft } from './typen';
import { liste, text } from './werte';
import { stepZahl } from './zahlen';

type Wert = Eigenschaft['werte'][number];

const WAHRHEITSWERTE: ReadonlyMap<string, string> = new Map([
  ['T', 'TRUE'],
  ['F', 'FALSE'],
  ['U', 'UNKNOWN'],
]);

/** Zahl als Text: ganze Zahlen ohne Vorzeichen `+` und führende Nullen, Gleitkommazahlen exakt als Dezimaltext. */
function zahltext(roh: string): string {
  const ganz = /^([+-]?)0*([0-9]+)$/.exec(roh);
  if (ganz !== null) {
    const ziffern = ganz[2] ?? '0';
    return ganz[1] === '-' && ziffern !== '0' ? `-${ziffern}` : ziffern;
  }
  return stepZahl(roh) ?? roh;
}

/** Ein getypter Wert (`IFCLABEL('…')`) als Text mit Typname; `null` für alles andere. */
function wertLesen(w: StepWert | undefined): Wert | null {
  if (w?.art !== 'getypt') return null;
  const innen = w.wert;
  let inhalt: string | null = null;
  if (innen.art === 'text') inhalt = innen.wert;
  else if (innen.art === 'aufzaehlung') inhalt = WAHRHEITSWERTE.get(innen.wert) ?? innen.wert;
  else if (innen.art === 'zahl') inhalt = zahltext(innen.text);
  else if (innen.art === 'binaer') inhalt = innen.text;
  return inhalt === null ? null : { typ: klassenname(w.typ), text: inhalt };
}

export class Eigenschaftenleser {
  /** Gelesene Eigenschaftssätze; ein Satz am Typ wird so nur einmal gelesen und gemeldet. */
  private readonly gelesen = new Map<number, readonly Eigenschaft[]>();

  constructor(
    private readonly l: Modellleser,
    private readonly definitionen: Definitionen,
  ) {}

  /** Eigenschaften eines Objekts und seines Typs; die am Objekt überschreibt die gleichnamige desselben Satzes am Typ. */
  eigenschaften(i: number): Eigenschaft[] {
    const { eigene, vomTyp } = this.definitionen.saetze(i);
    const lesen = (saetze: readonly number[]) =>
      saetze
        .filter((s) => this.l.klasseVon(s) === 'IFCPROPERTYSET')
        .map((s) => ({ pos: s, eintraege: this.satz(s) }));
    return zusammenfuehren(lesen(eigene), lesen(vomTyp));
  }

  private satz(s: number): readonly Eigenschaft[] {
    const fertig = this.gelesen.get(s);
    if (fertig !== undefined) return fertig;
    const p = this.l.parameter(s);
    const satz = text(p?.[2]);
    const eigenschaften: Eigenschaft[] = [];
    for (const e of this.l.ziele(s, p?.[4])) {
      const eigenschaft = this.eigenschaft(e, satz);
      if (eigenschaft !== null) eigenschaften.push(eigenschaft);
    }
    this.gelesen.set(s, eigenschaften);
    return eigenschaften;
  }

  private eigenschaft(e: number, satz: string | null): Eigenschaft | null {
    const klasse = this.l.klasseVon(e);
    const p = this.l.parameter(e);
    if (p === null) return null;
    const name = text(p[0]);
    let werte: Wert[] | null = null;
    if (klasse === 'IFCPROPERTYSINGLEVALUE') {
      const wert = wertLesen(p[2]);
      werte = p[2]?.art === 'fehlt' ? [] : wert === null ? null : [wert];
    } else if (klasse === 'IFCPROPERTYENUMERATEDVALUE') {
      const gelesen = liste(p[2]).map(wertLesen);
      werte = gelesen.every((w) => w !== null) ? gelesen : null;
    }
    if (name !== null && werte !== null) return { satz, name, werte };
    this.l.melde(
      'warnung',
      'eigenschaft-nicht-gelesen',
      `${klassenname(klasse)} ${name ?? ''} (#${String(this.l.nummer(e))}) wird nicht gelesen; gelesen werden Einzelwerte und Aufzählungen mit getypten Werten.`,
      this.l.ort(e),
    );
    return null;
  }
}

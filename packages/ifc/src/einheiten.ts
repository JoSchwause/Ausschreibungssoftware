// SPDX-License-Identifier: AGPL-3.0-or-later
// Einheiten (Ticket 98, Punkt 3): `IfcUnitAssignment` des `IfcProject`, `IfcSIUnit` mit Präfix, `IfcConversionBasedUnit`
// über ihren Umrechnungsfaktor, die eigene Einheit einer Menge. Jeder Faktor ist exakt (Dezimal), nie über `number`.

import { multipliziere } from '@tethys/dezimal';
import type { Dezimal } from '@tethys/vertrag';
import { klassenname } from './klassen';
import type { Modellleser } from './modell';
import type { StepBauteilmenge } from './typen';
import { aufzaehlung, text } from './werte';
import { zahlwert, zehnHoch } from './zahlen';

type Art = StepBauteilmenge['art'];

/** Einheitentyp (`IfcUnitEnum`) und Zeichen der SI-Grundeinheit je Art; `anzahl` hat keine Einheit (Stück). */
const EINHEIT: Readonly<Record<Exclude<Art, 'anzahl'>, { readonly typ: string; readonly zeichen: string }>> =
  {
    laenge: { typ: 'LENGTHUNIT', zeichen: 'm' },
    flaeche: { typ: 'AREAUNIT', zeichen: 'm²' },
    volumen: { typ: 'VOLUMEUNIT', zeichen: 'm³' },
    gewicht: { typ: 'MASSUNIT', zeichen: 'kg' },
    zeit: { typ: 'TIMEUNIT', zeichen: 's' },
  };

/**
 * SI-Einheiten der fünf Arten: Typ, Potenz (der Präfix gilt vor dem Potenzieren: mm² = (10⁻³ m)²) und Abstand zur
 * SI-Grundeinheit (Gramm ist 10⁻³ kg).
 */
const SI_EINHEITEN: ReadonlyMap<
  string,
  { readonly typ: string; readonly potenz: number; readonly basis: number }
> = new Map([
  ['METRE', { typ: 'LENGTHUNIT', potenz: 1, basis: 0 }],
  ['SQUARE_METRE', { typ: 'AREAUNIT', potenz: 2, basis: 0 }],
  ['CUBIC_METRE', { typ: 'VOLUMEUNIT', potenz: 3, basis: 0 }],
  ['GRAM', { typ: 'MASSUNIT', potenz: 1, basis: -3 }],
  ['SECOND', { typ: 'TIMEUNIT', potenz: 1, basis: 0 }],
]);

/** SI-Präfixe (`IfcSIPrefix`) als Zehnerpotenz. */
const PRAEFIXE: ReadonlyMap<string, number> = new Map([
  ['EXA', 18],
  ['PETA', 15],
  ['TERA', 12],
  ['GIGA', 9],
  ['MEGA', 6],
  ['KILO', 3],
  ['HECTO', 2],
  ['DECA', 1],
  ['DECI', -1],
  ['CENTI', -2],
  ['MILLI', -3],
  ['MICRO', -6],
  ['NANO', -9],
  ['PICO', -12],
  ['FEMTO', -15],
  ['ATTO', -18],
]);

const EINS = zehnHoch(0);

type Umrechnung =
  | { readonly ok: true; readonly faktor: Dezimal; readonly umgerechnet: boolean }
  | { readonly ok: false; readonly fehler: string };

export class Einheiten {
  /** Einheit des Projekts je Einheitentyp (Index der Instanz). */
  private readonly projekt = new Map<string, number>();
  private readonly faktoren = new Map<string, Dezimal | null>();
  private readonly fehlendGemeldet = new Set<string>();

  constructor(private readonly l: Modellleser) {
    const projekt = l.instanzen('IFCPROJECT')[0];
    if (projekt === undefined) {
      l.melde(
        'fehler',
        'projekt-fehlt',
        'Die Datei hat kein IfcProject; ohne seine Einheiten bleiben Mengen ohne Wert.',
        {},
      );
      return;
    }
    const zuweisung = l.ziel(projekt, l.parameter(projekt)?.[8]);
    if (zuweisung === null) return;
    for (const u of l.ziele(zuweisung, l.parameter(zuweisung)?.[0])) {
      const typ = aufzaehlung(l.parameter(u)?.[1]);
      if (typ !== null && !this.projekt.has(typ)) this.projekt.set(typ, u);
    }
  }

  /**
   * Faktor in die SI-Grundeinheit für eine Menge der Art `art` (Index `instanz`) mit ihrer eigenen Einheit (`eigene`) oder
   * der des Projekts. `null` mit Befund, wenn keine Einheit da ist oder sie sich nicht umrechnen lässt.
   */
  faktor(art: Art, instanz: number, eigene: number | null): Dezimal | null {
    if (art === 'anzahl') return EINS;
    const { typ, zeichen } = EINHEIT[art];
    const u = eigene ?? this.projekt.get(typ);
    if (u === undefined) {
      if (!this.fehlendGemeldet.has(typ)) {
        this.fehlendGemeldet.add(typ);
        this.l.melde(
          'fehler',
          'einheit-fehlt',
          `Für ${typ} nennt das Projekt keine Einheit (IfcUnitAssignment); Mengen dieser Art bleiben ohne Wert.`,
          this.l.ort(instanz),
        );
      }
      return null;
    }
    const schluessel = `${String(u)}:${typ}`;
    const bekannt = this.faktoren.get(schluessel);
    if (bekannt !== undefined) return bekannt;
    const ergebnis = this.umrechnung(u, typ, 0);
    let faktor: Dezimal | null = null;
    const einheit = `${klassenname(this.l.klasseVon(u))} #${String(this.l.nummer(u))}`;
    if (!ergebnis.ok)
      this.l.melde(
        'fehler',
        'einheit-ungueltig',
        `Die Einheit ${einheit} lässt sich nicht in ${zeichen} umrechnen (${ergebnis.fehler}); Mengen mit ihr bleiben ohne Wert.`,
        this.l.ort(u),
      );
    else {
      faktor = ergebnis.faktor;
      if (ergebnis.umgerechnet)
        this.l.melde(
          'warnung',
          'einheit-umgerechnet',
          `Die Einheit ${text(this.l.parameter(u)?.[2]) ?? einheit} ist keine SI-Einheit; Mengen werden mit dem Faktor ${faktor} in ${zeichen} umgerechnet.`,
          this.l.ort(u),
        );
    }
    this.faktoren.set(schluessel, faktor);
    return faktor;
  }

  private umrechnung(u: number, typ: string, tiefe: number): Umrechnung {
    const nein = (fehler: string): Umrechnung => ({ ok: false, fehler });
    if (tiefe > 4) return nein('zu viele Umrechnungsstufen');
    const p = this.l.parameter(u);
    if (p === null) return nein('nicht lesbar');
    const einheitentyp = aufzaehlung(p[1]);
    if (einheitentyp !== typ) return nein(`sie ist ${einheitentyp ?? 'ohne Typ'}, gebraucht wird ${typ}`);
    const klasse = this.l.klasseVon(u);
    if (klasse === 'IFCSIUNIT') {
      const name = aufzaehlung(p[3]) ?? '';
      const si = SI_EINHEITEN.get(name);
      if (si?.typ !== typ) return nein(`SI-Einheit ${name} passt nicht zu ${typ}`);
      const praefix = aufzaehlung(p[2]);
      const potenz = praefix === null ? 0 : PRAEFIXE.get(praefix);
      if (potenz === undefined) return nein(`unbekannter Präfix ${praefix ?? ''}`);
      const faktor = zehnHoch(potenz * si.potenz + si.basis);
      return faktor === null
        ? nein('Präfix außerhalb des Bereichs')
        : { ok: true, faktor, umgerechnet: false };
    }
    if (klasse === 'IFCCONVERSIONBASEDUNIT') {
      const mass = this.l.ziel(u, p[3]);
      if (mass === null || this.l.klasseVon(mass) !== 'IFCMEASUREWITHUNIT')
        return nein('ohne Umrechnungsfaktor (IfcMeasureWithUnit)');
      const pm = this.l.parameter(mass);
      const wert = zahlwert(pm?.[0]);
      const basis = this.l.ziel(mass, pm?.[1]);
      if (wert === null || basis === null) return nein('Umrechnungsfaktor nicht lesbar');
      const innen = this.umrechnung(basis, typ, tiefe + 1);
      if (!innen.ok) return innen;
      return { ok: true, faktor: multipliziere(wert, innen.faktor), umgerechnet: true };
    }
    return nein(`${klassenname(klasse)} hat keinen Umrechnungsfaktor`);
  }
}

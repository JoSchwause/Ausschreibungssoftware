// SPDX-License-Identifier: AGPL-3.0-or-later
// Köpfe der Drucke (E10, E11; Glossar „Büro“, „Projektangaben“, „Bieter“): das Büro als Absender, die Projektangaben und die
// Anschrift eines Bieters oder Auftragnehmers als fertige Texte. Nur gesetzte Angaben erscheinen (E-11), nichts wird
// gerechnet (A2). LV-Druck und Berichte nehmen dieselben Zeilen.

import type { Anschrift, Bauherr, Bieterangaben, Buero, Projektangaben } from '@tethys/vertrag';

/** Eine Angabe im Kopf: Bezeichnung links, Wert rechts. */
export interface KopfFeld {
  readonly bezeichnung: string;
  readonly wert: string;
}

/**
 * Das Projekt, wie ein Druck es braucht: Name, Bauherr und die Projektangaben (v1.7a). Ein `Projekt` aus `vertrag` passt
 * unverändert.
 */
export interface ProjektKopf {
  readonly name: string;
  readonly bauherr?: Bauherr;
  readonly angaben?: Projektangaben;
}

const gesetzt = (t: string | null | undefined): t is string =>
  t !== null && t !== undefined && t.trim() !== '';

/** Teile mit Trennzeichen verbinden; leere Teile fallen weg. */
export const verbinde = (teile: readonly (string | null | undefined)[], mit = ', '): string =>
  teile.filter(gesetzt).join(mit);

/** Eine Anschrift als Zeilen: Straße, dann „PLZ Ort“; fehlende Teile fallen weg. */
export function anschriftZeilen(a: Anschrift | null | undefined): string[] {
  if (a === null || a === undefined) return [];
  return [a.strasse, verbinde([a.plz, a.ort], ' ')].filter(gesetzt);
}

/** Eine Anschrift in einer Zeile: „Straße, PLZ Ort“. */
export const anschriftText = (a: Anschrift | null | undefined): string => anschriftZeilen(a).join(', ');

/** Das Büro als Absender: Name, Anschrift, Telefon, E-Mail, je eine Zeile; ohne Büro keine Zeile. */
export function absenderZeilen(buero: Buero | null | undefined): string[] {
  if (buero === null || buero === undefined) return [];
  return [
    buero.name,
    ...anschriftZeilen(buero.anschrift),
    ...(gesetzt(buero.telefon) ? [`Telefon ${buero.telefon}`] : []),
    ...(gesetzt(buero.email) ? [`E-Mail ${buero.email}`] : []),
  ].filter(gesetzt);
}

/** Sammelt Kopffelder; nur gesetzte Werte kommen hinein. */
export class Kopffelder {
  readonly felder: KopfFeld[] = [];

  feld(bezeichnung: string, wert: string | null | undefined): this {
    if (gesetzt(wert)) this.felder.push({ bezeichnung, wert });
    return this;
  }
}

/** Projekt, Projektnummer, Ort, Baustelle und Bauherr, soweit gesetzt. */
export function projektFelder(projekt: ProjektKopf | undefined): KopfFeld[] {
  if (projekt === undefined) return [];
  const k = new Kopffelder()
    .feld('Projekt', projekt.name)
    .feld('Projektnummer', projekt.angaben?.nummer)
    .feld('Ort', projekt.angaben?.ort)
    .feld('Baustelle', anschriftText(projekt.angaben?.baustelle));
  if (projekt.bauherr !== undefined)
    k.feld('Bauherr', verbinde([projekt.bauherr.name, projekt.bauherr.anschrift]));
  return k.felder;
}

/** Anschrift, Ansprechperson, Telefon und E-Mail eines Bieters, soweit gesetzt. */
export function bieterFelder(angaben: Bieterangaben | undefined): KopfFeld[] {
  if (angaben === undefined) return [];
  return new Kopffelder()
    .feld('Anschrift', anschriftText(angaben.anschrift))
    .feld('Ansprechperson', angaben.ansprechperson)
    .feld('Telefon', angaben.telefon)
    .feld('E-Mail', angaben.email).felder;
}

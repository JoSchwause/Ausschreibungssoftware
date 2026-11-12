// SPDX-License-Identifier: AGPL-3.0-or-later
// Was die Leinwand je Bauteil zeichnet, rein aus den Eingaben der Komponente (ohne three.js): sichtbar oder nicht, und in
// welcher Farbe. Die Farben selbst kommen aus den Design-Tokens (`farben.ts`, U4).

import type { Bauteilverzeichnis } from './zuordnung';

/** Kennzeichen einer Färbung, z. B. aus dem Modellvergleich oder der Zuordnung zu Positionen. */
export type Bauteilkennzeichen = 'hinzugefuegt' | 'entfernt' | 'geaendert' | 'zugeordnet' | 'ohne-zuordnung';

export const BAUTEILKENNZEICHEN: readonly Bauteilkennzeichen[] = [
  'hinzugefuegt',
  'entfernt',
  'geaendert',
  'zugeordnet',
  'ohne-zuordnung',
];

export interface Darstellungseingaben {
  readonly auswahl: readonly string[];
  readonly ausgeblendet: readonly string[];
  /** `null`: nichts isoliert. Sonst sind nur diese Bauteile sichtbar (eine leere Liste zeigt nichts). */
  readonly isoliert: readonly string[] | null;
  readonly faerbung: ReadonlyMap<string, Bauteilkennzeichen>;
}

/** `eigen`: die Farbe aus der IFC-Datei. */
export type Anzeigefarbe = 'eigen' | 'auswahl' | Bauteilkennzeichen;

export interface Bauteildarstellung {
  /** je Bauteilindex */
  readonly sichtbar: readonly boolean[];
  /** je Bauteilindex */
  readonly farbe: readonly Anzeigefarbe[];
}

function markieren(verzeichnis: Bauteilverzeichnis, globalIds: Iterable<string>): boolean[] {
  const markiert = new Array<boolean>(verzeichnis.anzahl).fill(false);
  for (const id of globalIds) for (const i of verzeichnis.indizes(id)) markiert[i] = true;
  return markiert;
}

/** Sichtbar ist ein Bauteil, wenn es isoliert ist (oder nichts isoliert ist) und nicht ausgeblendet. */
export function darstellungBerechnen(verzeichnis: Bauteilverzeichnis, e: Darstellungseingaben): Bauteildarstellung {
  const ausgeblendet = markieren(verzeichnis, e.ausgeblendet);
  const isoliert = e.isoliert === null ? null : markieren(verzeichnis, e.isoliert);
  const ausgewaehlt = markieren(verzeichnis, e.auswahl);

  const farbe = new Array<Anzeigefarbe>(verzeichnis.anzahl).fill('eigen');
  for (const [id, kennzeichen] of e.faerbung) for (const i of verzeichnis.indizes(id)) farbe[i] = kennzeichen;
  ausgewaehlt.forEach((ja, i) => {
    if (ja) farbe[i] = 'auswahl';
  });

  return {
    sichtbar: ausgeblendet.map((aus, i) => !aus && (isoliert === null || isoliert[i] === true)),
    farbe,
  };
}

export interface Auswahlereignis {
  readonly globalIds: readonly string[];
  readonly hinzufuegen: boolean;
}

/**
 * Was ein Klick auf die Leinwand meldet: das getroffene Bauteil (Strg bzw. Cmd ergänzt die Auswahl), ein Klick ins Leere
 * hebt die Auswahl auf; Strg+Klick ins Leere meldet nichts.
 */
export function auswahlBeiKlick(getroffen: string | null, ergaenzen: boolean): Auswahlereignis | null {
  if (getroffen === null) return ergaenzen ? null : { globalIds: [], hinzufuegen: false };
  return { globalIds: [getroffen], hinzufuegen: ergaenzen };
}

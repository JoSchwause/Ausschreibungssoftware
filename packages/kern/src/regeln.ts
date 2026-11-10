// SPDX-License-Identifier: AGPL-3.0-or-later
// Fachliche Baumregeln an genau einer Stelle (Ticket 05). Alles, was über den Typ hinaus festlegt, wo ein Knoten
// stehen darf, steht hier; Befehle und Prüfung fragen nur diese Konstanten und Prädikate.

import type { Knoten } from '@tethys/vertrag';

/** Höchstzahl der Gliederungsebenen (Glossar „Gliederung“: bis zu 5). */
export const MAX_GLIEDERUNGSEBENEN = 5;

/**
 * VORLÄUFIGE ANNAHME, ENTSCHEIDUNG OFFEN (Ticket 02, „Offene Typfragen“, Frage 6; Ticket 05, „Offene Fragen“):
 *
 * (a) Zählt ein Los zu den 5 Gliederungsebenen?  Angenommen: ja, es belegt eine Ebene.
 * (b) Wo darf ein Los stehen?  Angenommen: nur direkt unter der Wurzel (dem LV), nie unter einem Los oder Titel.
 *
 * Das ist die restriktive Lesart: Sie lässt sich ohne Datenmigration lockern (jedes nach dieser Regel gültige LV bleibt
 * auch nach jeder lockereren Regel gültig). Wer die Frage entscheidet, ändert nur dieses Objekt und die Prädikate
 * darunter.
 */
export const LOS_ANNAHME: {
  readonly status: string;
  readonly zaehltAlsEbene: boolean;
  readonly nurUnterWurzel: boolean;
} = {
  status: 'vorläufige Annahme, Entscheidung offen',
  /** (a) Ein Los zählt als eine der `MAX_GLIEDERUNGSEBENEN`. */
  zaehltAlsEbene: true,
  /** (b) Ein Los steht nur direkt unter der Wurzel. */
  nurUnterWurzel: true,
};

/** Art des Elternknotens: die Wurzel (das LV) oder die Art eines Knotens. */
export type ElternArt = 'wurzel' | Knoten['art'];

/** Darf ein Los unter diesem Elternknoten stehen? (Annahme (b), siehe `LOS_ANNAHME`.) */
export function losErlaubtUnter(eltern: ElternArt): boolean {
  if (eltern === 'wurzel') return true;
  return !LOS_ANNAHME.nurUnterWurzel && (eltern === 'los' || eltern === 'titel');
}

/** Wie viele der 5 Gliederungsebenen belegt ein Knoten dieser Art? (Annahme (a), siehe `LOS_ANNAHME`.) */
export function ebenenbeitrag(art: Knoten['art']): 0 | 1 {
  if (art === 'titel') return 1;
  if (art === 'los') return LOS_ANNAHME.zaehltAlsEbene ? 1 : 0;
  return 0;
}

/** Nur Gliederungen (Los, Titel) und die Wurzel dürfen Kinder haben. */
export function darfKinderHaben(eltern: ElternArt): boolean {
  return eltern === 'wurzel' || eltern === 'los' || eltern === 'titel';
}

/**
 * F1, E-08 (Ticket 30): Darf eine Gliederung der Art `art` neu auf die oberste Ebene (direkt unter das LV), wo schon
 * Knoten der Arten `geschwister` stehen? Fehlertext oder `null`. Positionen und Hinweistexte sind dort immer erlaubt.
 *  - `losStufe === true` (Maske): die oberste Stufe ist die Los-Stufe, ein Titel steht dort nie.
 *  - In jedem Fall: Lose und Titel stehen nicht nebeneinander auf der obersten Ebene.
 * Ist `losStufe` nicht `true`, gilt sonst `LOS_ANNAHME` unverändert. Gefragt wird nur, wenn ein Knoten neu auf die
 * oberste Ebene kommt (Anlegen, Verschieben von anderswo); `LeistungsverzeichnisAnlegen` (Import) prüft es nicht (U5),
 * das meldet die LV-Prüfung.
 */
export function obersteEbeneFehler(
  art: Knoten['art'],
  geschwister: Iterable<Knoten['art']>,
  losStufe: boolean,
): string | null {
  if (art !== 'los' && art !== 'titel') return null;
  if (losStufe && art === 'titel') {
    return 'Die Maske hat eine Los-Stufe: auf der obersten Ebene stehen nur Lose, keine Titel (F1).';
  }
  const andere = art === 'los' ? 'titel' : 'los';
  for (const g of geschwister) {
    if (g === andere) return 'Lose und Titel stehen nicht nebeneinander auf der obersten Ebene (F1).';
  }
  return null;
}

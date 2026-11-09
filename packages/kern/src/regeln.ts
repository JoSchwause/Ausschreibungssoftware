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

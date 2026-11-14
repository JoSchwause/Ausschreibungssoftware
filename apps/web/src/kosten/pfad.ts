// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Kostenseiten und das Ziel nach Rückgängig/Wiederholen einer Kostenermittlung (Ticket 89), seit Ticket 154
// aus dem Pfadbaukasten (D-131.1); die Kostenkontrolle ist eine eigene Regel vor der Liste. Ohne Abhängigkeit auf Kern oder
// Speicher, damit die Hülle sie billig importiert.

import type { Aenderung, Kostenermittlung, KostenermittlungId, ProjektId } from '@tethys/vertrag';
import { projektliste, type Listenroute } from '../ui/pfade';

const ermittlungen = projektliste<'ermittlung', KostenermittlungId>('kosten', 'ermittlung');

/** Liste der Kostenermittlungen eines Projekts. */
export const kostenPfad = ermittlungen.liste;

/** Eine Kostenermittlung im Editor. */
export const kostenermittlungPfad = ermittlungen.einzeln;

/** Die Kostenkontrolle des Projekts. */
export function kontrollePfad(projektId: ProjektId): string {
  return `${kostenPfad(projektId)}/kontrolle`;
}

/** Anker des Abschnitts „Bezeichnungen der Kostengruppen“ auf der Liste der Kostenermittlungen (B-14). */
export const BEZEICHNUNGEN_ANKER = 'bezeichnungen';

/** Die Liste der Kostenermittlungen, dort der Abschnitt zum Einlesen der Bezeichnungen der Kostengruppen. */
export function bezeichnungenPfad(projektId: ProjektId): string {
  return `${kostenPfad(projektId)}#${BEZEICHNUNGEN_ANKER}`;
}

export type KostenRoute =
  | Listenroute<'ermittlung', KostenermittlungId>
  | { readonly art: 'kontrolle'; readonly projektId: ProjektId };

/** Erkennt einen Pfad der Kostenseiten; `null`, wenn er keiner ist. */
export function kostenRoute(pfad: string): KostenRoute | null {
  const r = ermittlungen.route(pfad);
  if (r?.art === 'ermittlung' && (r.id as string) === 'kontrolle')
    return { art: 'kontrolle', projektId: r.projektId };
  return r;
}

/**
 * Wohin nach einem Teil an einer Kostenermittlung: Steht sie danach (Wiederholen eines Anlegens, Rückgängig eines
 * Löschens, jede Änderung), auf ihren Editor; ist sie weg (Rückgängig eines Anlegens), in die Liste. `null`: bleiben.
 */
export function kostenZiel(
  projektId: ProjektId,
  cs: { readonly kostenermittlung: Aenderung<Kostenermittlung> },
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  return ermittlungen.ziel(projektId, cs.kostenermittlung, rueckwaerts, pfad);
}

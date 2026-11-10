// SPDX-License-Identifier: AGPL-3.0-or-later
// Bietersummen (Ticket 36, Punkt 2). Ein Angebot rechnet wie ein gedachtes LV: die Knoten des Ausschreibungs-LV, jede
// Position mit dem EP des Angebots (nicht angeboten oder kein Eintrag: `null`), der Nachlass des Angebots und der
// MwSt-Satz des LV. Darauf rechnet `summenBerechnen` aus dem Kern. So gelten GP-Rundung (N2), Nachlass (N5), MwSt
// einmal auf die Summe und die Regeln, welche Positionen eingehen, ohne eigene Kopie.

import { summenBerechnen } from '@tethys/kern';
import type {
  Angebot,
  Angebotsposition,
  Einheitspreis,
  Knoten,
  LvZustand,
  Summenstand,
} from '@tethys/vertrag';

/** Der EP, mit dem eine Angebotsposition rechnet; `null` heißt: nicht angeboten (kein GP, geht nicht ein). */
export function angebotsEinheitspreis(p: Angebotsposition | undefined): Einheitspreis | null {
  return p?.status === 'angeboten' ? p.einheitspreis : null;
}

const positionenCache = new WeakMap<readonly Angebotsposition[], ReadonlyMap<string, Angebotsposition>>();

/** Angebotspositionen nach Positions-ID; je Array einmal gebaut. */
export function angebotspositionenNachId(
  positionen: readonly Angebotsposition[],
): ReadonlyMap<string, Angebotsposition> {
  const vorhanden = positionenCache.get(positionen);
  if (vorhanden) return vorhanden;
  const neu = new Map<string, Angebotsposition>(positionen.map((p) => [p.positionId as string, p]));
  positionenCache.set(positionen, neu);
  return neu;
}

/** Die Knoten des LV, deren Positionen den EP des Angebots tragen. */
export function angebotsKnoten(lv: LvZustand, angebot: Pick<Angebot, 'positionen'>): Knoten[] {
  const nachId = angebotspositionenNachId(angebot.positionen);
  return lv.leistungsverzeichnis.knoten.map((k) =>
    k.art === 'position' ? { ...k, einheitspreis: angebotsEinheitspreis(nachId.get(k.id)) } : k,
  );
}

/** Vollständiger Summenstand eines Angebots (Orakel, Startwert beim Anlegen, Preisspiegel). */
export function angebotSummenBerechnen(
  lv: LvZustand,
  angebot: Pick<Angebot, 'positionen' | 'nachlass'>,
): Summenstand {
  const l = lv.leistungsverzeichnis;
  return summenBerechnen({
    id: l.id,
    knoten: angebotsKnoten(lv, angebot),
    nachlass: angebot.nachlass,
    mwstSatz: l.mwstSatz,
  });
}

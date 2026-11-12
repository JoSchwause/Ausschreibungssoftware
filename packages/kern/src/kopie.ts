// SPDX-License-Identifier: AGPL-3.0-or-later
// Kopie bauen (K9, Ticket 42, Punkt 1): reine Hilfsfunktion, deren Ergebnis der Inhalt von `KnotenEinfuegen.knoten` ist.
// Der Kern erzeugt keine Kennung (A2); er ruft nur die übergebene Quelle.

import type { IdQuelle, Knoten, KnotenId, LvZustand, Position, PositionId } from '@tethys/vertrag';
import { wurzelnVon } from './platzieren';
import { positionMitBauteilen } from './positionsfelder';
import { indexVon, unterbaum } from './struktur';

/** Der Teil der einen `IdQuelle`, den eine Kopie braucht (ein Zuschnitt, keine zweite Schnittstelle). */
export type KopieIdQuelle = Pick<IdQuelle, 'los' | 'titel' | 'position' | 'hinweistext'>;

/**
 * Wie eine Kopie mit den Bauteilzuordnungen der Positionen umgeht (Ticket 105, D-52, Review D-66):
 * - `'verwerfen'` (Vorgabe): Kopieren und Einfügen im LV und die Übernahme eines Muster-LV; dasselbe Bauteil soll nicht
 *   unbemerkt an zwei Positionen zählen.
 * - `'behalten'`: Ein ganzes LV wird zu einem neuen LV (etwa ein LV-Stand als neues LV); die Zuordnungen gehören dort zu
 *   ihrer Position wie im Stand.
 */
export interface KopieOptionen {
  readonly bauteile?: 'verwerfen' | 'behalten';
}

const neueKennung = (k: Knoten, ids: KopieIdQuelle): string =>
  k.art === 'los'
    ? ids.los()
    : k.art === 'titel'
      ? ids.titel()
      : k.art === 'position'
        ? ids.position()
        : ids.hinweistext();

/** Die Position mit Bezügen auf kopierte Positionen umgebogen; Bezüge nach außen bleiben. */
function bezuegeUmbiegen(p: Position, neu: ReadonlyMap<string, string>): Position {
  let n = p;
  const z = p.zuschlag;
  if (z?.bezug.art === 'positionen' && z.bezug.positionen.some((b) => neu.has(b.positionId))) {
    n = {
      ...n,
      zuschlag: {
        ...z,
        bezug: {
          art: 'positionen',
          positionen: z.bezug.positionen.map((b) => {
            const ziel = neu.get(b.positionId);
            return ziel === undefined ? b : { ...b, positionId: ziel as PositionId };
          }),
        },
      },
    };
  }
  const wahl = p.merkmale.wahl;
  const grund = wahl?.grundpositionId === null || wahl === null ? undefined : neu.get(wahl.grundpositionId);
  if (wahl !== null && grund !== undefined) {
    n = { ...n, merkmale: { ...n.merkmale, wahl: { ...wahl, grundpositionId: grund as PositionId } } };
  }
  return n;
}

/**
 * Kopiert die Knoten samt Unterbäumen: flach, Eltern vor Kindern, Wurzeln in genannter Reihenfolge (doppelte Nennungen
 * und Nachfahren genannter Knoten zählen nicht eigens). Jeder Knoten bekommt eine neue Kennung aus `ids`, in Präorder
 * aufgerufen. Innerhalb der Kopie zeigen `elternId`, Zuschlagsbezug und `wahl.grundpositionId` auf die Kopien; Bezüge
 * nach außen bleiben. Die Wurzeln behalten ihre alte Lage (`KnotenEinfuegen` setzt sie am Ort neu). Ordnungszahlen
 * bleiben, wie sie sind; `KnotenEinfuegen` vergibt sie neu (D-42.2). Bauteilzuordnungen verwirft sie, solange
 * `optionen.bauteile` nicht `'behalten'` sagt (`KopieOptionen`; D-52, Vertrag `Positionsdaten.bauteile`; Ticket 105).
 *
 * Eine unbekannte Kennung ist ein Programmfehler des Aufrufers (die Auswahl stammt aus dem Zustand): die Funktion wirft.
 */
export function kopieBauen(
  zustand: LvZustand,
  knotenIds: readonly KnotenId[],
  ids: KopieIdQuelle,
  optionen: KopieOptionen = {},
): Knoten[] {
  const behalten = optionen.bauteile === 'behalten';
  const lv = zustand.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const w = wurzelnVon(idx, knotenIds);
  if (!w.ok) throw new Error(`kopieBauen: ${w.fehler.meldung}`);
  const quelle = w.wert.flatMap((k) => unterbaum(idx, k));
  const neu = new Map<string, string>();
  for (const k of quelle) neu.set(k.id, neueKennung(k, ids));
  return quelle.map((k): Knoten => {
    const kennung = neu.get(k.id) ?? k.id;
    const eltern = (neu.get(k.elternId) ?? k.elternId) as Knoten['elternId'];
    if (k.art === 'position') {
      const kopie: Position = { ...bezuegeUmbiegen(k, neu), id: kennung as PositionId, elternId: eltern };
      return behalten ? kopie : positionMitBauteilen(kopie, null);
    }
    return { ...k, id: kennung, elternId: eltern } as Knoten;
  });
}

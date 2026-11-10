// SPDX-License-Identifier: AGPL-3.0-or-later
// PositionsmerkmaleSetzen (K5, Ticket 37; F4, F5, E-04, E-05): setzt Merkmale und Zuschlagsangaben einer Position
// gemeinsam. Rein (A2). Das ChangeSet nennt die Position, ihre Positionssumme, die Gliederungen bis zur Wurzel, die
// Gesamtsummen und jede Zuschlagsposition, deren Basis sich dadurch ändert (A6). Derselbe Wert: leeres ChangeSet.

import type {
  Befehlsfehler,
  Ergebnis,
  LvChangeSet,
  LvZustand,
  Position,
  PositionsmerkmaleSetzen,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { positionsdatenFehler } from './pruefung';
import { positionAendern, positionFinden } from './summen-befehle';
import { bezugsindex } from './zuschlag';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/** Strukturelle Gleichheit zweier JSON-Werte (Merkmale, Zuschlag); die Reihenfolge der Schlüssel zählt nicht. */
export function gleicherWert(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  return ka.every((k) => Object.hasOwn(y, k) && gleicherWert(x[k], y[k]));
}

export function positionsmerkmaleSetzen(z: LvZustand, b: PositionsmerkmaleSetzen): Antwort {
  const f = positionFinden(z, b.positionId);
  if (!f.ok) return f;
  const { idx, position } = f.wert;
  const neu: Position = { ...position, merkmale: b.merkmale, zuschlag: b.zuschlag };
  const formfehler = positionsdatenFehler(neu, position.id, (i) => idx.byId.get(i));
  if (formfehler) return { ok: false, fehler: formfehler };
  // Wird die Position zur Zuschlagsposition, darf keine Liste sie nennen (D-03; sonst verletzte das LV Prüfung 3).
  if (b.zuschlag !== null && position.zuschlag === null) {
    const nennende = bezugsindex(z.leistungsverzeichnis.knoten).get(position.id) ?? [];
    if (nennende.length > 0)
      return nein(
        'ungueltige-eingabe',
        `Die Position ist Bezugsposition der Zuschlagsposition ${nennende.join(', ')} und kann keine Zuschlagsposition werden.`,
        position.id,
        'zuschlag',
      );
  }
  if (gleicherWert(position.merkmale, b.merkmale) && gleicherWert(position.zuschlag, b.zuschlag))
    return ok(baueChangeSet(z, {}));
  return ok(positionAendern(z, idx, position, neu));
}

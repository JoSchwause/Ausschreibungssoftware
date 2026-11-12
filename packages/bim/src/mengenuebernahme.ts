// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenübernahme (Ticket 108 Punkt 2, X1d, D-53; Glossar „Mengenübernahme“): zu einer Position mit Bauteilzuordnungen und
// einem gewählten Bauwerksmodell die Ansatzzeilen des Vordersatzes. Je Zuordnung, deren Bauteil im Modell steht, eine Zeile
// mit Formel 91 und dem Wert der Menge (bei `Stueck` 1), exakt in die Einheit der Position umgerechnet und kaufmännisch auf
// 3 Stellen, in der Reihenfolge von `bauteile`; wo das nicht geht, ein Befund statt einer Zeile, nie 0 (U5, Q5). Die
// gespeicherte Menge rechnet die App mit `mengen` (D-22); `menge` hier ist die Summe der Zeilen zur Anzeige. Rein (A2).

import { NULL_MENGE, addiere } from '@tethys/dezimal';
import type {
  Ansatzzeile,
  Bauteilzuordnung,
  Bauwerksmodell,
  IfcGlobalId,
  Knoten,
  Menge,
  Position,
  PositionId,
  Pruefbefund,
} from '@tethys/vertrag';
import { modellbefund } from './befunde';
import { einheitsregel, inEinheit } from './einheiten';
import type { Modellindex } from './form';
import { modellIndex } from './form';

/** REB-Formel des freien Rechenansatzes (D-53): Der Ausdruck ist die Zahl selbst. */
export const FORMEL_FREIER_ANSATZ = 91;

/** Die Mengenart, bei der jedes Bauteil 1 zählt (Glossar „Mengenart“). */
export const MENGENART_STUECK = 'Stueck';

const EINS = '1.000' as Menge;

/**
 * Die Mengenübernahme einer Position aus einem Modell (Vorschau und Grundlage von `MengenansatzSetzen`).
 *
 * - `zeilen`: die Ansatzzeilen aus dem Modell, Zeilennummern ab 1 ohne Lücke; `[]`, wenn keine Zuordnung eine Zeile ergibt.
 *   Der Ausdruck ist der Wert mit Dezimalkomma und 3 Stellen, ohne Tausenderpunkt (`18,874`, D-99.5).
 * - `menge`: Summe der Zeilenwerte (gleich der Summe, die `mengen` aus diesen Zeilen rechnet); `null` ohne Zeile.
 * - `vorher`: der Ansatz und die Menge der Position, wie sie im LV stehen.
 * - `geaendert`: Es gibt Zeilen, und sie unterscheiden sich vom bisherigen Ansatz. Nur dann setzt die App
 *   `MengenansatzSetzen`; ohne Zeile bleibt die Position, wie sie ist (nie 0, nie ein leerer Ansatz).
 * - `befunde`: je Zuordnung ohne Zeile ein Befund (Quelle `modell-pruefung`, Ort: Position, GlobalId, Feld), dazu eine
 *   Warnung bei einer GlobalId, die im Modell mehrfach steht (das erste Bauteil gilt, D-66); in der Reihenfolge der Zuordnungen.
 */
export interface Positionsuebernahme {
  readonly positionId: PositionId;
  readonly zeilen: readonly Ansatzzeile[];
  readonly menge: Menge | null;
  readonly vorher: { readonly mengenansatz: readonly Ansatzzeile[] | null; readonly menge: Menge | null };
  readonly geaendert: boolean;
  readonly befunde: readonly Pruefbefund[];
}

/** Die Mengenübernahme eines ganzen LV: je Position mit Zuordnungen in der Reihenfolge des LV, alle Befunde dazu. */
export interface Mengenuebernahme {
  readonly positionen: readonly Positionsuebernahme[];
  readonly befunde: readonly Pruefbefund[];
}

/** Zeilen einer Position (intern, auch für das Aufmaß aus einer Auswahl). */
export interface Zeilenlesung {
  readonly zeilen: readonly Ansatzzeile[];
  readonly menge: Menge | null;
  readonly befunde: readonly Pruefbefund[];
  /** Die GlobalIds der Zuordnungen, die gelesen wurden (bei einer Auswahl nur die ausgewählten), in ihrer Reihenfolge. */
  readonly bauteile: readonly IfcGlobalId[];
}

/** Der Wert einer Zuordnung in der Einheit der Position oder ein Befund. */
function wertDerZuordnung(
  z: Bauteilzuordnung,
  position: Position,
  index: Modellindex,
  befunde: Pruefbefund[],
): Menge | null {
  const ort = { knotenId: position.id, globalId: z.globalId };
  const b = index.bauteil.get(z.globalId);
  if (b === undefined) {
    befunde.push(
      modellbefund('bauteil-fehlt', `Bauteil ${z.globalId} steht nicht im Modell`, {
        ...ort,
        feld: 'bauteile',
      }),
    );
    return null;
  }
  if (index.doppelteBauteile.has(z.globalId))
    befunde.push(
      modellbefund(
        'globalid-doppelt',
        `GlobalId ${z.globalId} steht mehrfach im Modell; das erste Bauteil gilt`,
        {
          ...ort,
          feld: 'bauteile',
        },
      ),
    );
  const regel = einheitsregel(position.einheit);
  const unpassend = (art: string): null => {
    befunde.push(
      modellbefund(
        'einheit-passt-nicht',
        `Einheit ${JSON.stringify(position.einheit)} passt nicht zu ${z.mengenart} (${art})`,
        { ...ort, feld: 'mengenart' },
      ),
    );
    return null;
  };
  if (z.mengenart === MENGENART_STUECK) return regel?.art === 'anzahl' ? EINS : unpassend('Stück');
  const treffer = b.mengen.filter((q) => q.name === z.mengenart);
  const [q] = treffer;
  if (q === undefined) {
    befunde.push(
      modellbefund('menge-fehlt', `Bauteil ${z.globalId} hat keine Menge ${z.mengenart}`, {
        ...ort,
        feld: 'mengenart',
      }),
    );
    return null;
  }
  if (treffer.length > 1) {
    const saetze = treffer.map((t) => t.satz ?? '(ohne Satz)').join(', ');
    befunde.push(
      modellbefund('mengenart-mehrdeutig', `Bauteil ${z.globalId}: ${z.mengenart} steht in ${saetze}`, {
        ...ort,
        feld: 'mengenart',
      }),
    );
    return null;
  }
  if (regel?.art !== q.art) return unpassend(q.art);
  return inEinheit(q.wert, regel);
}

/** Liest die Zuordnungen einer Position gegen das Modell; `auswahl` beschränkt auf diese GlobalIds. */
export function zeilenLesen(
  position: Position,
  index: Modellindex,
  auswahl?: ReadonlySet<IfcGlobalId>,
): Zeilenlesung {
  const zeilen: Ansatzzeile[] = [];
  const befunde: Pruefbefund[] = [];
  const bauteile: IfcGlobalId[] = [];
  let summe = NULL_MENGE;
  for (const z of position.bauteile ?? []) {
    if (auswahl !== undefined && !auswahl.has(z.globalId)) continue;
    bauteile.push(z.globalId);
    const wert = wertDerZuordnung(z, position, index, befunde);
    if (wert === null) continue;
    zeilen.push({
      zeile: zeilen.length + 1,
      formel: FORMEL_FREIER_ANSATZ,
      ausdruck: wert.replace('.', ','),
      variable: null,
    });
    summe = addiere(summe, wert);
  }
  return { zeilen, menge: zeilen.length === 0 ? null : summe, befunde, bauteile };
}

function gleicheZeilen(a: readonly Ansatzzeile[], b: readonly Ansatzzeile[] | undefined): boolean {
  if (b === undefined || a.length !== b.length) return false;
  return a.every((z, i) => {
    const y = b[i];
    return (
      y !== undefined &&
      z.zeile === y.zeile &&
      z.formel === y.formel &&
      z.ausdruck === y.ausdruck &&
      z.variable === y.variable
    );
  });
}

function uebernehmen(position: Position, index: Modellindex): Positionsuebernahme {
  const { zeilen, menge, befunde } = zeilenLesen(position, index);
  return {
    positionId: position.id,
    zeilen,
    menge,
    vorher: { mengenansatz: position.mengenansatz ?? null, menge: position.menge },
    geaendert: zeilen.length > 0 && !gleicheZeilen(zeilen, position.mengenansatz),
    befunde,
  };
}

/** Positionen mit mindestens einer Bauteilzuordnung, in der Reihenfolge der Knotenliste. */
export function zugeordnetePositionen(knoten: readonly Knoten[]): Position[] {
  return knoten.filter((k): k is Position => k.art === 'position' && (k.bauteile?.length ?? 0) > 0);
}

/** Mengenübernahme einer Position aus einem Modell (Ticket 108 Punkt 2). */
export function positionUebernehmen(position: Position, modell: Bauwerksmodell): Positionsuebernahme {
  return uebernehmen(position, modellIndex(modell));
}

/**
 * Mengenübernahme eines LV aus einem Modell (Vorschau für „Mengen aus Modell“ und „Mengen aktualisieren“): je Position mit
 * Zuordnungen die alten und neuen Ansätze. Für `MengenansatzSetzen` gibt es sie nur im Ausschreibungs-LV (D-53); die App baut
 * je Position mit `geaendert` den Befehl mit `zeilen` und der Menge aus `mengen`.
 */
export function mengenuebernahmeBerechnen(
  knoten: readonly Knoten[],
  modell: Bauwerksmodell,
): Mengenuebernahme {
  const index = modellIndex(modell);
  const positionen = zugeordnetePositionen(knoten).map((p) => uebernehmen(p, index));
  return { positionen, befunde: positionen.flatMap((p) => p.befunde) };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenansatz an der Position (Ticket 56; Vertrag v1.3, D-22): Normalform im Zustand. Der Kern wertet den Ansatz nie aus
// (A3: kein `kern → mengen`); er legt ihn ab, entfernt ihn nach Lesart (a) und hält „nie `[]` im Zustand“.

import type { Ansatzzeile, Position } from '@tethys/vertrag';
import { positionMitEinheiten } from './einheit';

/**
 * Die Position mit dem Mengenansatz `ansatz`: `null`, `undefined` und `[]` entfernen das Feld (ein leerer Ansatz ist
 * keiner), sonst steht die Liste dort.
 */
export function mitMengenansatz(p: Position, ansatz: readonly Ansatzzeile[] | null | undefined): Position {
  if (ansatz !== null && ansatz !== undefined && ansatz.length > 0) return { ...p, mengenansatz: ansatz };
  const ohne: { -readonly [K in keyof Position]?: Position[K] } = { ...p };
  delete ohne.mengenansatz;
  return ohne as Position;
}

/**
 * Normalform einer mitgebrachten Position (Anlegen, LV-Anlegen, Einfügen, Auftrags-LV): `''` als Einheit wird `null`
 * (`positionMitEinheiten`, v1.2), ein leerer Ansatz `[]` fällt weg. Ändert sich nichts, kommt dasselbe Objekt zurück.
 */
export function positionNormal(p: Position): Position {
  const e = positionMitEinheiten(p);
  return e.mengenansatz?.length === 0 ? mitMengenansatz(e, null) : e;
}

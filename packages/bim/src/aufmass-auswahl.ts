// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt aus Auswahl (Ticket 108 Punkt 3, X1d, D-53; Glossar „Aufmaßblatt aus Auswahl“): zu den Positionen eines
// Auftrags-LV, einem Modell und einer Auswahl von GlobalIds je zugeordneter Position die Ansatzzeilen der ausgewählten
// Bauteile (Regeln wie bei der Mengenübernahme). Die App rechnet die Mengen mit `mengen` und legt mit `AufmassAnlegen` ein
// Blatt an. Rein (A2).

import type {
  Ansatzzeile,
  Bauwerksmodell,
  IfcGlobalId,
  Knoten,
  Menge,
  PositionId,
  Pruefbefund,
} from '@tethys/vertrag';
import { modellIndex } from './form';
import { zeilenLesen, zugeordnetePositionen } from './mengenuebernahme';

/**
 * Hinweis zum Ergebnis (kein Befund, gilt immer): Eine Ansatzzeile trägt keine GlobalId, darum ist nicht erkennbar, ob ein
 * Bauteil schon auf einem anderen Blatt aufgemessen ist (Offene Typfrage 4, Ticket 97; D-53).
 */
export type Aufmasshinweis = 'bauteil-auf-mehreren-blaettern-nicht-erkennbar';

/** Vorschlag für eine Aufmaßposition des neuen Blatts. */
export interface Aufmassvorschlag {
  readonly positionId: PositionId;
  /** Die ausgewählten, zugeordneten GlobalIds in der Reihenfolge der Zuordnungen (auch die ohne Zeile). */
  readonly bauteile: readonly IfcGlobalId[];
  /** Ansatzzeilen ab 1; `[]`, wenn keine ausgewählte Zuordnung eine Zeile ergibt (dann legt die App keine Zeile an). */
  readonly zeilen: readonly Ansatzzeile[];
  /** Summe der Zeilen zur Anzeige; `null` ohne Zeile. Die gespeicherte Menge rechnet die App mit `mengen`. */
  readonly menge: Menge | null;
  readonly befunde: readonly Pruefbefund[];
}

export interface AufmassAusAuswahl {
  /** Je Position mit mindestens einem zugeordneten, ausgewählten Bauteil, in der Reihenfolge des LV. */
  readonly positionen: readonly Aufmassvorschlag[];
  readonly befunde: readonly Pruefbefund[];
  readonly hinweise: readonly Aufmasshinweis[];
}

/**
 * Die Bauteile, die im Strukturknoten oder in einem Knoten darunter stehen (die Auswahl „Geschoss“, D-99.9), in der
 * Reihenfolge des Modells, jede GlobalId einmal; maßgeblich ist das erste Bauteil einer GlobalId (D-66). Ein unbekannter
 * Knoten ergibt `[]`.
 */
export function bauteileImStrukturknoten(
  modell: Bauwerksmodell,
  strukturGlobalId: IfcGlobalId,
): IfcGlobalId[] {
  const index = modellIndex(modell);
  if (!index.knoten.has(strukturGlobalId)) return [];
  const kinder = new Map<IfcGlobalId, IfcGlobalId[]>();
  for (const [id, k] of index.knoten) {
    if (k.elternGlobalId === null) continue;
    const liste = kinder.get(k.elternGlobalId) ?? [];
    liste.push(id);
    kinder.set(k.elternGlobalId, liste);
  }
  const darin = new Set<IfcGlobalId>([strukturGlobalId]);
  const offen = [strukturGlobalId];
  for (let id = offen.pop(); id !== undefined; id = offen.pop())
    for (const kind of kinder.get(id) ?? [])
      if (!darin.has(kind)) {
        darin.add(kind);
        offen.push(kind);
      }
  return [...index.bauteil.values()]
    .filter((b) => b.strukturGlobalId !== null && darin.has(b.strukturGlobalId))
    .map((b) => b.globalId);
}

/** Vorschlag für ein Aufmaßblatt aus einer Auswahl von Bauteilen (Ticket 108 Punkt 3). */
export function aufmassAusAuswahl(
  knoten: readonly Knoten[],
  modell: Bauwerksmodell,
  auswahl: readonly IfcGlobalId[],
): AufmassAusAuswahl {
  const index = modellIndex(modell);
  const gewaehlt = new Set(auswahl);
  const positionen: Aufmassvorschlag[] = [];
  for (const p of zugeordnetePositionen(knoten)) {
    const l = zeilenLesen(p, index, gewaehlt);
    if (l.bauteile.length === 0) continue;
    positionen.push({
      positionId: p.id,
      bauteile: l.bauteile,
      zeilen: l.zeilen,
      menge: l.menge,
      befunde: l.befunde,
    });
  }
  return {
    positionen,
    befunde: positionen.flatMap((p) => p.befunde),
    hinweise: ['bauteil-auf-mehreren-blaettern-nicht-erkennbar'],
  };
}

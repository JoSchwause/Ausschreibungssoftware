// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt aus Auswahl (Ticket 108 Punkt 3, X1d, D-53; Glossar „Aufmaßblatt aus Auswahl“): zu den Positionen eines
// Auftrags-LV, einem Modell und einer Auswahl von GlobalIds je zugeordneter Position die Ansatzzeilen der ausgewählten
// Bauteile (Regeln wie bei der Mengenübernahme). Die App rechnet die Mengen mit `mengen` und legt mit `AufmassAnlegen` ein
// Blatt an. Rein (A2).

import type {
  Ansatzzeile,
  Aufmass,
  AufmassId,
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

/**
 * Eine Position des Vorschlags, die schon auf einem anderen Blatt steht (Ticket 155, Befund B-32): Ob dort dieselben Bauteile
 * gemessen sind, ist nicht erkennbar (eine Ansatzzeile trägt keine GlobalId, D-53); sicher ist nur, dass die Position schon
 * eine Menge hat. Die App zeigt das als Hinweis vor dem Anlegen.
 */
export interface Aufmassueberschneidung {
  readonly positionId: PositionId;
  /** Die anderen Blätter mit einer Zeile dieser Position, nach Blattnummer. */
  readonly blaetter: readonly {
    readonly aufmassId: AufmassId;
    readonly nummer: number;
    readonly menge: Menge | null;
  }[];
}

/**
 * Welche Positionen des Vorschlags mit Zeilen (also die, die das neue Blatt aufmisst) schon auf einem der übergebenen
 * Blätter stehen; erwartet die Blätter desselben Auftrags-LV. Reihenfolge der Positionen wie im Vorschlag.
 */
export function aufmassUeberschneidungen(
  vorschlag: AufmassAusAuswahl,
  blaetter: readonly Aufmass[],
): Aufmassueberschneidung[] {
  const geordnet = [...blaetter].sort((a, b) => a.nummer - b.nummer);
  const ergebnis: Aufmassueberschneidung[] = [];
  for (const v of vorschlag.positionen) {
    if (v.zeilen.length === 0) continue;
    const treffer = geordnet.flatMap((b) =>
      b.positionen
        .filter((z) => z.positionId === v.positionId)
        .map((z) => ({ aufmassId: b.id, nummer: b.nummer, menge: z.menge })),
    );
    if (treffer.length > 0) ergebnis.push({ positionId: v.positionId, blaetter: treffer });
  }
  return ergebnis;
}

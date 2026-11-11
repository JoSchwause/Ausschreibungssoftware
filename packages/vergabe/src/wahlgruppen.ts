// SPDX-License-Identifier: AGPL-3.0-or-later
// Wahlgruppen eines LV (Ticket 59, D-59.1): welche Alternativen zusammen eine Wahl bilden und welche Grundpositionen
// sie ersetzen. Zwei Formen kommen vor und dürfen gemischt sein:
//  - GAEB-Form: `wahl.gruppe` und `wahl.variante`; eine Gruppe gilt je Elternknoten (der GAEB-Leser zählt
//    `ALNGroupNo` je `Itemlist`), Variante 0 ist die Grundposition;
//  - Verweisform (Daten vor v1.1b, Handeingabe): `wahl.grundpositionId` nennt die Grundposition (oder eine andere
//    Alternative); Gruppe und Variante sind `null`.
// Eine Wahlgruppe ist die Zusammenhangskomponente aus beiden Verbindungen. Alternative heißt: Wahl mit Variante ≠ 0
// (`null` zählt als Alternative, D-37.1); jedes andere Mitglied ist Grundposition.

import type { Knoten, Position, PositionId } from '@tethys/vertrag';

/** Eine Wahlgruppe: mindestens eine Alternative, keine oder mehrere Grundpositionen; beide in Dokumentreihenfolge. */
export interface Wahlgruppe {
  /** Grundpositionen (Variante 0 oder Ziel eines Verweises); leer, wenn die Daten keine nennen. */
  readonly grundpositionen: readonly PositionId[];
  readonly alternativen: readonly PositionId[];
}

/** Eine Alternative: Wahl mit Variante ≠ 0 (Variante `null` eingeschlossen, D-37.1). */
export function istAlternative(p: Position): boolean {
  return p.merkmale.wahl !== null && p.merkmale.wahl.variante !== 0;
}

/** Die Wahlgruppen der Knoten in Dokumentreihenfolge (nach der ersten Position der Gruppe). */
export function wahlgruppenBilden(knoten: readonly Knoten[]): readonly Wahlgruppe[] {
  const positionen = new Map<string, Position>();
  for (const k of knoten) if (k.art === 'position') positionen.set(k.id, k);

  const vater = new Map<string, string>();
  const wurzel = (x: string): string => {
    let w = x;
    for (let v = vater.get(w); v !== undefined && v !== w; v = vater.get(w)) w = v;
    for (let y = x; y !== w;) {
      const v = vater.get(y) ?? w;
      vater.set(y, w);
      y = v;
    }
    return w;
  };
  const verbinde = (x: string, y: string): void => {
    if (!vater.has(x)) vater.set(x, x);
    if (!vater.has(y)) vater.set(y, y);
    const wx = wurzel(x);
    const wy = wurzel(y);
    if (wx !== wy) vater.set(wy, wx);
  };

  for (const p of positionen.values()) {
    const w = p.merkmale.wahl;
    if (w === null) continue;
    verbinde(p.id, p.id);
    // Das Präfix trennt die gedachten Gruppenknoten von Positions-IDs.
    if (w.gruppe !== null) verbinde(p.id, `\u0000gruppe|${p.elternId}|${String(w.gruppe)}`);
    if (istAlternative(p) && w.grundpositionId !== null && positionen.has(w.grundpositionId))
      verbinde(p.id, w.grundpositionId);
  }

  const gruppen = new Map<string, { grundpositionen: PositionId[]; alternativen: PositionId[] }>();
  for (const p of positionen.values()) {
    if (!vater.has(p.id)) continue;
    const w = wurzel(p.id);
    let g = gruppen.get(w);
    if (g === undefined) {
      g = { grundpositionen: [], alternativen: [] };
      gruppen.set(w, g);
    }
    (istAlternative(p) ? g.alternativen : g.grundpositionen).push(p.id);
  }
  return [...gruppen.values()].filter((g) => g.alternativen.length > 0);
}

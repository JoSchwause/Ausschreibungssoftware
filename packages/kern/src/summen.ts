// SPDX-License-Identifier: AGPL-3.0-or-later
// Summen (Ticket 07): GP je Position, Summen je Los und Titel, Summen des LV (Netto, Nachlass, MwSt, Brutto).
//
// Alle Rechnung läuft über `@tethys/dezimal` (N1). Welche Positionen eingehen und wie der Nachlass rundet, steht in
// `summenregeln.ts` (vorläufige Annahmen, Entscheidung offen).
//
// Zwei Wege zum selben Ergebnis:
//  - `summenBerechnen`: vollständige Neuberechnung eines LV aus seinen Knoten. Orakel in den Tests und Startwert
//    bei `LeistungsverzeichnisAnlegen`.
//  - `summenAenderung`: Neuberechnung nur im betroffenen Teilbaum (A6). Ein Befehl meldet, um welchen Betrag sich der
//    Beitrag an einem Elternknoten ändert; die Summen der Gliederungen von dort bis zur Wurzel ändern sich um diesen
//    Betrag, sonst nichts. Kosten: O(Tiefe), nicht O(Knoten).
//
// Darstellung des Summenstands (`LvZustand.summen`): `positionen` in der Reihenfolge der Positionsknoten, `gliederungen`
// in der Reihenfolge der Gliederungsknoten des Knotenarrays (kanonisch, siehe `struktur.ts`). So ist der Stand eine
// Funktion des Zustands, und „anwenden, Umkehrung anwenden“ stellt ihn exakt her. Eine Zuordnung `id → Arrayindex` wird
// einmal je Stand gebaut und gemerkt (`WeakMap`, wie der Baumindex).

import {
  NULL_BETRAG,
  addiere,
  gesamtpreis,
  negiere,
  prozentVon,
  summiereBetraege,
  vergleiche,
} from '@tethys/dezimal';
import type {
  Betrag,
  Gesamtsummen,
  GliederungId,
  Gliederungssumme,
  Knoten,
  Leistungsverzeichnis,
  LvZustand,
  Nachlass,
  Position,
  Positionssumme,
  Prozent,
  Summenaenderung,
  Summenstand,
  Summenvorher,
} from '@tethys/vertrag';
import { indexVon, praeorder } from './struktur';
import type { Baumindex } from './struktur';
import { nachlassBetrag, nettoNachNachlass, positionGehtInSumme } from './summenregeln';

// --- Eine Position ---------------------------------------------------------------------------------------------

/**
 * GP und Summenzugehörigkeit einer Position. Ist `menge` oder `einheitspreis` nicht gesetzt (`null`), entsteht kein GP
 * (`gesamtpreis: null`, geht nicht ein, trägt nichts bei); das folgt den Typkommentaren in `vertrag/summen.ts` und
 * `modell.ts` („nicht gesetzt“ ist nicht 0).
 */
export function positionsSumme(p: Position): Positionssumme {
  const gp = p.menge !== null && p.einheitspreis !== null ? gesamtpreis(p.menge, p.einheitspreis) : null;
  return { positionId: p.id, gesamtpreis: gp, gehtInSummeEin: gp !== null && positionGehtInSumme(p) };
}

/** Was die Position zur Summe ihres Elternknotens beiträgt. */
export function beitragZurSumme(s: Positionssumme): Betrag {
  return s.gehtInSummeEin && s.gesamtpreis !== null ? s.gesamtpreis : NULL_BETRAG;
}

// --- Gesamtsummen -----------------------------------------------------------------------------------------------

/** Netto, Nachlass, Netto nach Nachlass, MwSt (einmal auf die Summe, N2) und Brutto. */
export function gesamtsummen(netto: Betrag, nachlass: Nachlass | null, mwstSatz: Prozent): Gesamtsummen {
  const nachNachlass = nettoNachNachlass(netto, nachlass);
  const mwst = prozentVon(nachNachlass, mwstSatz);
  return {
    netto,
    nachlass: nachlassBetrag(netto, nachlass),
    nettoNachNachlass: nachNachlass,
    mwst,
    brutto: addiere(nachNachlass, mwst),
  };
}

export function gleicheGesamtsummen(a: Gesamtsummen, b: Gesamtsummen): boolean {
  return (
    vergleiche(a.netto, b.netto) === 0 &&
    vergleiche(a.nachlass, b.nachlass) === 0 &&
    vergleiche(a.nettoNachNachlass, b.nettoNachNachlass) === 0 &&
    vergleiche(a.mwst, b.mwst) === 0 &&
    vergleiche(a.brutto, b.brutto) === 0
  );
}

// --- Index des Summenstands --------------------------------------------------------------------------------------

export interface SummenIndex {
  readonly positionen: ReadonlyMap<string, number>;
  readonly gliederungen: ReadonlyMap<string, number>;
}

const indexCache = new WeakMap<Summenstand, SummenIndex>();

export function baueSummenIndex(stand: Pick<Summenstand, 'positionen' | 'gliederungen'>): SummenIndex {
  const positionen = new Map<string, number>();
  stand.positionen.forEach((p, i) => positionen.set(p.positionId, i));
  const gliederungen = new Map<string, number>();
  stand.gliederungen.forEach((g, i) => gliederungen.set(g.gliederungId, i));
  return { positionen, gliederungen };
}

/** Index zum Stand, gebaut beim ersten Zugriff. */
export function summenIndexVon(stand: Summenstand): SummenIndex {
  const vorhanden = indexCache.get(stand);
  if (vorhanden) return vorhanden;
  const neu = baueSummenIndex(stand);
  indexCache.set(stand, neu);
  return neu;
}

/** Trägt den Index eines neu gebauten Stands ein (er gehört zu genau diesem Objekt). */
export function merkeSummenIndex(stand: Summenstand, index: SummenIndex): void {
  indexCache.set(stand, index);
}

export function positionssummeVon(stand: Summenstand, positionId: string): Positionssumme | undefined {
  const i = summenIndexVon(stand).positionen.get(positionId);
  return i === undefined ? undefined : stand.positionen[i];
}

export function gliederungssummeVon(stand: Summenstand, gliederungId: string): Gliederungssumme | undefined {
  const i = summenIndexVon(stand).gliederungen.get(gliederungId);
  return i === undefined ? undefined : stand.gliederungen[i];
}

/** Was der Knoten zur Summe seines Elternknotens beiträgt: Position ihren GP, Gliederung ihre Summe, Hinweistext nichts. */
export function beitragVon(stand: Summenstand, k: Knoten): Betrag {
  if (k.art === 'position') return beitragZurSumme(positionsSumme(k));
  if (k.art === 'hinweis') return NULL_BETRAG;
  return gliederungssummeVon(stand, k.id)?.summe ?? NULL_BETRAG;
}

// --- Vollständige Neuberechnung ------------------------------------------------------------------------------------

/**
 * Berechnet den vollständigen Summenstand eines LV aus seinen Knoten neu (Orakel; auch Startwert eines neuen LV).
 * Rein und unabhängig von jedem früheren Stand. Die Einträge stehen in Reihenfolge des Knotenarrays. `id` ist die Wurzel
 * (LV oder Auftrags-LV).
 */
export function summenBerechnen(
  lv: Pick<Leistungsverzeichnis, 'knoten' | 'nachlass' | 'mwstSatz'> & { readonly id: string },
): Summenstand {
  const index = indexVon(lv.id, lv.knoten);
  const reihe = praeorder(lv.id, index.kinder);
  const beitraege = new Map<string, Betrag[]>();
  const ablegen = (eltern: string, b: Betrag): void => {
    const liste = beitraege.get(eltern);
    if (liste) liste.push(b);
    else beitraege.set(eltern, [b]);
  };
  const summen = new Map<string, Betrag>();
  // Rückwärts durch die Vorordnung: Kinder vor ihren Eltern.
  for (let i = reihe.length - 1; i >= 0; i--) {
    const k = reihe[i];
    if (!k || k.art === 'hinweis') continue;
    if (k.art === 'position') {
      ablegen(k.elternId, beitragZurSumme(positionsSumme(k)));
    } else {
      const s = summiereBetraege(beitraege.get(k.id) ?? []);
      summen.set(k.id, s);
      ablegen(k.elternId, s);
    }
  }
  const netto = summiereBetraege(beitraege.get(lv.id) ?? []);

  const positionen: Positionssumme[] = [];
  const gliederungen: Gliederungssumme[] = [];
  for (const k of lv.knoten) {
    if (k.art === 'position') positionen.push(positionsSumme(k));
    else if (k.art !== 'hinweis') {
      gliederungen.push({ gliederungId: k.id, summe: summen.get(k.id) ?? NULL_BETRAG });
    }
  }
  const stand: Summenstand = {
    positionen,
    gliederungen,
    gesamt: gesamtsummen(netto, lv.nachlass, lv.mwstSatz),
  };
  merkeSummenIndex(stand, baueSummenIndex(stand));
  return stand;
}

// --- Neuberechnung im betroffenen Teilbaum -------------------------------------------------------------------------

/** Der Beitrag an einem Elternknoten ändert sich um `betrag` (mit Vorzeichen). */
export interface Beitragsaenderung {
  /** LV-ID oder Gliederungs-ID. */
  readonly eltern: string;
  readonly betrag: Betrag;
}

export interface SummenEingabe {
  /** Beitragsänderungen; die Kette von `eltern` bis zur Wurzel ändert sich um `betrag`. */
  readonly beitraege?: readonly Beitragsaenderung[];
  /** Neue oder geänderte Summen von Positionen (vom Befehl berechnet, nur wirklich geänderte). */
  readonly positionen?: readonly Positionssumme[];
  /** Neue Gliederungen mit ihrer Summe. */
  readonly neueGliederungen?: readonly Gliederungssumme[];
  /** Geänderte Stammdaten, die die Gesamtsummen beeinflussen (Nachlass, MwSt-Satz); sonst die des Zustands. */
  readonly kopf?: { readonly nachlass: Nachlass | null; readonly mwstSatz: Prozent };
}

const nachId = <T>(liste: readonly T[], id: (x: T) => string): T[] =>
  [...liste].sort((a, b) => {
    const x = id(a);
    const y = id(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });

/**
 * Die betroffenen Summen eines Befehls (A6). Walks nur die Elternketten der gemeldeten Beitragsänderungen; was sich
 * nicht ändert (Änderung null, gleiche Summe), steht nicht im Ergebnis. `gesamt` ist `null`, wenn die Gesamtsummen
 * gleich bleiben. Die Listen sind nach Kennung geordnet (deterministisch, auch für die Umkehrung).
 */
export function summenAenderung(z: LvZustand, baum: Baumindex, e: SummenEingabe): Summenaenderung {
  const aufsummiert = new Map<string, Betrag>();
  for (const b of e.beitraege ?? []) {
    if (vergleiche(b.betrag, NULL_BETRAG) === 0) continue;
    let k = b.eltern;
    for (let schritt = 0; schritt <= baum.byId.size; schritt++) {
      aufsummiert.set(k, addiere(aufsummiert.get(k) ?? NULL_BETRAG, b.betrag));
      if (k === baum.lvId) break;
      const knoten = baum.byId.get(k);
      if (!knoten) break;
      k = knoten.elternId;
    }
  }

  const gliederungen: Gliederungssumme[] = [...(e.neueGliederungen ?? [])];
  let nettoAenderung = NULL_BETRAG;
  for (const [k, aenderung] of aufsummiert) {
    if (k === baum.lvId) {
      nettoAenderung = aenderung;
    } else if (vergleiche(aenderung, NULL_BETRAG) !== 0) {
      const alt = gliederungssummeVon(z.summen, k)?.summe ?? NULL_BETRAG;
      gliederungen.push({ gliederungId: k as GliederungId, summe: addiere(alt, aenderung) });
    }
  }

  let gesamt: Gesamtsummen | null = null;
  if (e.kopf !== undefined || vergleiche(nettoAenderung, NULL_BETRAG) !== 0) {
    const kopf = e.kopf ?? z.leistungsverzeichnis;
    const neu = gesamtsummen(addiere(z.summen.gesamt.netto, nettoAenderung), kopf.nachlass, kopf.mwstSatz);
    if (!gleicheGesamtsummen(neu, z.summen.gesamt)) gesamt = neu;
  }
  return {
    positionen: nachId(e.positionen ?? [], (p) => p.positionId),
    gliederungen: nachId(gliederungen, (g) => g.gliederungId),
    gesamt,
  };
}

/** Beitrag, der ein Knoten aus seiner Kette herausnimmt: der negierte Beitrag. */
export const herausnehmen = (eltern: string, beitrag: Betrag): Beitragsaenderung => ({
  eltern,
  betrag: negiere(beitrag),
});

export const hineinlegen = (eltern: string, beitrag: Betrag): Beitragsaenderung => ({
  eltern,
  betrag: beitrag,
});

export { nachId as ordneNachKennung };

// --- Alte Werte (v1.1a, Ticket 30) ---------------------------------------------------------------------------------

/** Keine alten Werte: das ChangeSet ändert keine Summe (oder das LV entsteht erst). */
export const LEERES_SUMMENVORHER: Summenvorher = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  entfernt: { positionen: [], gliederungen: [] },
};

/** Die Summen der Knoten im Stand `alt`, nach Kennung geordnet; Hinweistexte und Knoten ohne Eintrag fallen weg. */
export function summenDerKnoten(alt: Summenstand, knoten: readonly Knoten[]): Summenvorher['entfernt'] {
  const positionen: Positionssumme[] = [];
  const gliederungen: Gliederungssumme[] = [];
  for (const k of knoten) {
    if (k.art === 'position') {
      const p = positionssummeVon(alt, k.id);
      if (p) positionen.push(p);
    } else if (k.art !== 'hinweis') {
      const g = gliederungssummeVon(alt, k.id);
      if (g) gliederungen.push(g);
    }
  }
  return {
    positionen: nachId(positionen, (p) => p.positionId),
    gliederungen: nachId(gliederungen, (g) => g.gliederungId),
  };
}

/**
 * Die alten Werte zu einer Summenänderung (`Summenaenderung.vorher`, v1.1a): für jede genannte Positions- und
 * Gliederungssumme, die es im Stand `alt` schon gab, deren alter Wert; `gesamt`, wenn die Änderung es setzt; die vollen
 * Summen der entfernten Knoten. Kosten: O(genannte Summen + entfernte Knoten), Nachschlagen über den Index des Stands.
 */
export function summenVorher(
  alt: Summenstand,
  s: Pick<Summenaenderung, 'positionen' | 'gliederungen' | 'gesamt'>,
  entfernt: readonly Knoten[],
): Summenvorher {
  if (s.positionen.length === 0 && s.gliederungen.length === 0 && s.gesamt === null && entfernt.length === 0)
    return LEERES_SUMMENVORHER;
  const positionen: Positionssumme[] = [];
  const gliederungen: Gliederungssumme[] = [];
  for (const p of s.positionen) {
    const a = positionssummeVon(alt, p.positionId);
    if (a) positionen.push(a);
  }
  for (const g of s.gliederungen) {
    const a = gliederungssummeVon(alt, g.gliederungId);
    if (a) gliederungen.push(a);
  }
  return {
    positionen: nachId(positionen, (p) => p.positionId),
    gliederungen: nachId(gliederungen, (g) => g.gliederungId),
    gesamt: s.gesamt === null ? null : alt.gesamt,
    entfernt: summenDerKnoten(alt, entfernt),
  };
}

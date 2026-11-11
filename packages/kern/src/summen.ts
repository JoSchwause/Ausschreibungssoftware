// SPDX-License-Identifier: AGPL-3.0-or-later
// Summen (Ticket 07; Ausweise, Zuschlagsposition, Pauschal: Ticket 37): GP je Position, Summen je Los und Titel, Summen
// des LV (Netto, Nachlass, MwSt, Brutto) und die Ausweise für Bedarf ohne Gesamtbetrag und Wahl (F4).
//
// Alle Rechnung läuft über `@tethys/dezimal` (N1). Wohin ein Betrag geht und wie der Nachlass rundet, steht in
// `summenregeln.ts`; wie eine Zuschlagsposition rechnet, in `zuschlag.ts`.
//
// Zwei Wege zum selben Ergebnis:
//  - `summenBerechnen`: vollständige Neuberechnung eines LV aus seinen Knoten. Orakel in den Tests, Startwert bei
//    `LeistungsverzeichnisAnlegen` und Rechenweg für ein „gedachtes LV“ (R7: `vergabe` setzt die Preise eines Bieters
//    ein). Rechnet nur aus den Daten des übergebenen LV; gemerkt wird höchstens ein Index je Knotenarray.
//  - `summenAenderung`: Neuberechnung nur im betroffenen Teilbaum (A6). Ein Befehl übergibt seine Knotenänderungen; daraus
//    folgen die geänderten Positionssummen (samt der Zuschlagspositionen, deren Bereich oder Liste betroffen ist) und je
//    Elternknoten eine Änderung der Anteile (Summe, Bedarf, Wahl), die bis zur Wurzel aufläuft. Kosten: O(Änderungen +
//    Geschwister der betroffenen Elternknoten + Tiefe), nicht O(Knoten).
//
// Darstellung des Summenstands (`LvZustand.summen`): `positionen` in der Reihenfolge der Positionsknoten, `gliederungen`
// in der Reihenfolge der Gliederungsknoten des Knotenarrays (kanonisch, siehe `struktur.ts`). So ist der Stand eine
// Funktion des Zustands, und „anwenden, Umkehrung anwenden“ stellt ihn exakt her. Eine Zuordnung `id → Arrayindex` wird
// einmal je Stand gebaut und gemerkt (`WeakMap`, wie der Baumindex).

import { NULL_BETRAG, addiere, negiere, prozentVon, vergleiche } from '@tethys/dezimal';
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
  PositionId,
  Positionssumme,
  Prozent,
  Summenaenderung,
  Summenstand,
  Summenvorher,
} from '@tethys/vertrag';
import { indexVon, praeorder } from './struktur';
import type { Baumindex } from './struktur';
import { betragsziel, eigenerGesamtpreis, nachlassBetrag, nettoNachNachlass } from './summenregeln';
import { bereichsbasen, bezugsindex, listenzuschlag } from './zuschlag';
import type { Basisquelle, Zuschlagsbasis } from './zuschlag';

// --- Anteile: was ein Knoten zu Summe, Bedarfs- und Wahlsumme seines Elternknotens beiträgt ------------------------

export interface Anteile {
  /** Netto bzw. Gliederungssumme. */
  readonly summe: Betrag;
  readonly bedarf: Betrag;
  readonly wahl: Betrag;
}

export const NULL_ANTEILE: Anteile = { summe: NULL_BETRAG, bedarf: NULL_BETRAG, wahl: NULL_BETRAG };

const plus = (a: Anteile, b: Anteile): Anteile => ({
  summe: addiere(a.summe, b.summe),
  bedarf: addiere(a.bedarf, b.bedarf),
  wahl: addiere(a.wahl, b.wahl),
});
const minus = (a: Anteile): Anteile => ({
  summe: negiere(a.summe),
  bedarf: negiere(a.bedarf),
  wahl: negiere(a.wahl),
});
const istNull = (a: Anteile): boolean =>
  vergleiche(a.summe, NULL_BETRAG) === 0 &&
  vergleiche(a.bedarf, NULL_BETRAG) === 0 &&
  vergleiche(a.wahl, NULL_BETRAG) === 0;

/** Der Betrag einer Position geht in genau eines der drei Ziele, ohne Betrag nirgends (`betragsziel`, Teil 1). */
export function anteileDerPosition(gp: Betrag | null, p: Pick<Position, 'merkmale'>): Anteile {
  if (gp === null) return NULL_ANTEILE;
  const ziel = betragsziel(p);
  if (ziel === 'netto') return { ...NULL_ANTEILE, summe: gp };
  return ziel === 'bedarf' ? { ...NULL_ANTEILE, bedarf: gp } : { ...NULL_ANTEILE, wahl: gp };
}

function anteileDerGliederung(g: Gliederungssumme | undefined): Anteile {
  if (g === undefined) return NULL_ANTEILE;
  return {
    summe: g.summe,
    bedarf: g.summeBedarfOhneGesamtbetrag ?? NULL_BETRAG,
    wahl: g.summeWahl ?? NULL_BETRAG,
  };
}

const gliederungssumme = (gliederungId: string, a: Anteile): Gliederungssumme => ({
  gliederungId: gliederungId as GliederungId,
  summe: a.summe,
  summeBedarfOhneGesamtbetrag: a.bedarf,
  summeWahl: a.wahl,
});

// --- Eine Position ---------------------------------------------------------------------------------------------

/**
 * Positionssumme aus einem GP (oder Zuschlagsbetrag). `gehtInSummeEin` heißt „geht ins Netto ein“: ein Betrag und das
 * Ziel Netto (`betragsziel`).
 */
export function positionssummeAus(p: Pick<Position, 'id' | 'merkmale'>, gp: Betrag | null): Positionssumme {
  return { positionId: p.id, gesamtpreis: gp, gehtInSummeEin: gp !== null && betragsziel(p) === 'netto' };
}

/**
 * GP und Summenzugehörigkeit einer Position für sich, ohne LV: gerundet(Menge × EP, 2), Pauschal ohne Menge mit Menge 1.
 * Ist `menge` oder `einheitspreis` nicht gesetzt (`null`), entsteht kein GP. Eine Zuschlagsposition mit Satz rechnet
 * nur im LV (`summenBerechnen`, `zuschlagsbasen`); hier ergibt sie wie die Altform (R8) Menge × EP.
 */
export function positionsSumme(p: Position): Positionssumme {
  return positionssummeAus(p, eigenerGesamtpreis(p));
}

// --- Gesamtsummen -----------------------------------------------------------------------------------------------

/** Die Ausweise neben den Summen (F4); gehen nicht in Netto, Nachlass, MwSt oder Brutto ein. */
export interface Ausweise {
  readonly bedarf: Betrag;
  readonly wahl: Betrag;
}

/**
 * Netto, Nachlass, Netto nach Nachlass, MwSt (einmal auf die Summe, N2) und Brutto. Mit `ausweise` stehen
 * `summeBedarfOhneGesamtbetrag` und `summeWahl` dabei (das LV setzt sie immer, Ticket 37).
 */
export function gesamtsummen(
  netto: Betrag,
  nachlass: Nachlass | null,
  mwstSatz: Prozent,
  ausweise?: Ausweise,
): Gesamtsummen {
  const nachNachlass = nettoNachNachlass(netto, nachlass);
  const mwst = prozentVon(nachNachlass, mwstSatz);
  return {
    netto,
    nachlass: nachlassBetrag(netto, nachlass),
    nettoNachNachlass: nachNachlass,
    mwst,
    brutto: addiere(nachNachlass, mwst),
    ...(ausweise === undefined
      ? {}
      : { summeBedarfOhneGesamtbetrag: ausweise.bedarf, summeWahl: ausweise.wahl }),
  };
}

const gleichOptional = (a: Betrag | undefined, b: Betrag | undefined): boolean =>
  a === undefined || b === undefined ? a === b : vergleiche(a, b) === 0;

export function gleicheGesamtsummen(a: Gesamtsummen, b: Gesamtsummen): boolean {
  return (
    vergleiche(a.netto, b.netto) === 0 &&
    vergleiche(a.nachlass, b.nachlass) === 0 &&
    vergleiche(a.nettoNachNachlass, b.nettoNachNachlass) === 0 &&
    vergleiche(a.mwst, b.mwst) === 0 &&
    vergleiche(a.brutto, b.brutto) === 0 &&
    gleichOptional(a.summeBedarfOhneGesamtbetrag, b.summeBedarfOhneGesamtbetrag) &&
    gleichOptional(a.summeWahl, b.summeWahl)
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

// --- Vollständige Neuberechnung ------------------------------------------------------------------------------------

type LvDaten = Pick<Leistungsverzeichnis, 'knoten' | 'nachlass' | 'mwstSatz'> & { readonly id: string };

/** GP jeder Position (Zuschlagspositionen nach `zuschlag.ts`) und die Basen der Zuschlagspositionen. */
function alleBetraege(lv: Pick<LvDaten, 'id' | 'knoten'>): {
  readonly index: Baumindex;
  readonly gp: ReadonlyMap<string, Betrag | null>;
  readonly basen: ReadonlyMap<string, Zuschlagsbasis>;
} {
  const index = indexVon(lv.id, lv.knoten);
  const gp = new Map<string, Betrag | null>();
  const zuschlagsEltern = new Set<string>();
  for (const k of lv.knoten) {
    if (k.art !== 'position') continue;
    if (k.zuschlag === null) gp.set(k.id, eigenerGesamtpreis(k));
    else zuschlagsEltern.add(k.elternId);
  }
  const q: Basisquelle = {
    position: (i) => {
      const k = index.byId.get(i);
      return k?.art === 'position' ? k : undefined;
    },
    gesamtpreis: (p) => (gp.has(p.id) ? (gp.get(p.id) ?? null) : eigenerGesamtpreis(p)),
  };
  const basen = new Map<string, Zuschlagsbasis>();
  for (const e of zuschlagsEltern) bereichsbasen(index.kinder.get(e) ?? [], q, basen);
  for (const [i, b] of basen) gp.set(i, b.betrag);
  return { index, gp, basen };
}

/**
 * Berechnet den vollständigen Summenstand eines LV aus seinen Knoten neu (Orakel; Startwert eines neuen LV; gedachtes LV
 * eines Bieters, R7). Rein und unabhängig von jedem früheren Stand. Die Einträge stehen in Reihenfolge des
 * Knotenarrays. `id` ist die Wurzel (LV oder Auftrags-LV). Die Ausweise (Bedarf, Wahl) stehen an jeder Gliederung und im
 * Gesamt, auch als `0.00`.
 */
export function summenBerechnen(lv: LvDaten): Summenstand {
  const { index, gp } = alleBetraege(lv);
  const reihe = praeorder(lv.id, index.kinder);
  const anteile = new Map<string, Anteile>();
  const ablegen = (eltern: string, a: Anteile): void => {
    anteile.set(eltern, plus(anteile.get(eltern) ?? NULL_ANTEILE, a));
  };
  // Rückwärts durch die Vorordnung: Kinder vor ihren Eltern.
  for (let i = reihe.length - 1; i >= 0; i--) {
    const k = reihe[i];
    if (!k || k.art === 'hinweis') continue;
    if (k.art === 'position') ablegen(k.elternId, anteileDerPosition(gp.get(k.id) ?? null, k));
    else ablegen(k.elternId, anteile.get(k.id) ?? NULL_ANTEILE);
  }
  const lvAnteile = anteile.get(lv.id) ?? NULL_ANTEILE;

  const positionen: Positionssumme[] = [];
  const gliederungen: Gliederungssumme[] = [];
  for (const k of lv.knoten) {
    if (k.art === 'position') positionen.push(positionssummeAus(k, gp.get(k.id) ?? null));
    else if (k.art !== 'hinweis')
      gliederungen.push(gliederungssumme(k.id, anteile.get(k.id) ?? NULL_ANTEILE));
  }
  const stand: Summenstand = {
    positionen,
    gliederungen,
    gesamt: gesamtsummen(lvAnteile.summe, lv.nachlass, lv.mwstSatz, {
      bedarf: lvAnteile.bedarf,
      wahl: lvAnteile.wahl,
    }),
  };
  merkeSummenIndex(stand, baueSummenIndex(stand));
  return stand;
}

/**
 * Basis, Betrag und „Bezug ohne Preis“ je Zuschlagsposition eines LV (R7; für `vergabe`, Ticket 44). Rechnet wie
 * `summenBerechnen` nur aus dem übergebenen LV, also auch aus einem gedachten LV mit den Preisen eines Bieters.
 */
export function zuschlagsbasen(
  lv: Pick<Leistungsverzeichnis, 'knoten'> & { readonly id: string },
): ReadonlyMap<PositionId, Zuschlagsbasis> {
  return alleBetraege(lv).basen as ReadonlyMap<PositionId, Zuschlagsbasis>;
}

// --- Neuberechnung im betroffenen Teilbaum -------------------------------------------------------------------------

/** Knotenänderungen eines Befehls, wie sie ins ChangeSet gehen. */
export interface Knotenaenderungen {
  readonly hinzugefuegt?: readonly Knoten[];
  readonly geaendert?: readonly { readonly vorher: Knoten; readonly nachher: Knoten }[];
  readonly entfernt?: readonly Knoten[];
}

export interface SummenEingabe {
  /** Die Knotenänderungen des Befehls; aus ihnen folgen alle Summenänderungen. */
  readonly knoten?: Knotenaenderungen;
  /** Geänderte Stammdaten, die die Gesamtsummen beeinflussen (Nachlass, MwSt-Satz); sonst die des Zustands. */
  readonly kopf?: { readonly nachlass: Nachlass | null; readonly mwstSatz: Prozent };
}

const nachId = <T>(liste: readonly T[], id: (x: T) => string): T[] =>
  [...liste].sort((a, b) => {
    const x = id(a);
    const y = id(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });

const gleicheSumme = (a: Positionssumme | undefined, b: Positionssumme): boolean =>
  a !== undefined && a.gesamtpreis === b.gesamtpreis && a.gehtInSummeEin === b.gehtInSummeEin;

/** Ändert sich etwas, das Betrag, Ziel oder Bezug betrifft? (Die Reihenfolge allein zählt hier nicht.) */
const rechnetAnders = (a: Position, b: Position): boolean =>
  a.menge !== b.menge ||
  a.einheitspreis !== b.einheitspreis ||
  a.merkmale !== b.merkmale ||
  a.zuschlag !== b.zuschlag ||
  a.elternId !== b.elternId;

interface Anteilsaenderung {
  readonly eltern: string;
  readonly a: Anteile;
}

/**
 * Die betroffenen Summen eines Befehls (A6) aus seinen Knotenänderungen. Neu berechnet werden die geänderten und neuen
 * Positionen, die Zuschlagspositionen unter jedem Elternknoten, dessen Kinder sich ändern (R3, R4), und jede
 * Zuschlagsposition, deren Liste (R5) eine geänderte Position nennt (Rückwärtsindex, auch in anderen Gliederungen). Je
 * Elternknoten läuft die Änderung der Anteile bis zur Wurzel (Entfernen im alten Baum, Hinzufügen im neuen). Was sich
 * nicht ändert, steht nicht im Ergebnis; `gesamt` ist `null`, wenn die Gesamtsummen gleich bleiben. Die Listen sind nach
 * Kennung geordnet (deterministisch, auch für die Umkehrung).
 */
export function summenAenderung(
  z: LvZustand,
  baum: Baumindex,
  e: SummenEingabe,
): Omit<Summenaenderung, 'vorher'> {
  // v1.3: mechanisch angepasst, Folgeticket (Summenaenderung.vorher Pflicht; `vorher` setzt `baueChangeSet`)
  const stand = z.summen;
  const hinzu = e.knoten?.hinzugefuegt ?? [];
  const geaendert = e.knoten?.geaendert ?? [];
  const entfernt = e.knoten?.entfernt ?? [];

  const weg = new Set<string>(entfernt.map((k) => k.id));
  const neu = new Map<string, Knoten>();
  for (const g of geaendert) neu.set(g.nachher.id, g.nachher);
  for (const k of hinzu) neu.set(k.id, k);
  const knotenNeu = (i: string): Knoten | undefined =>
    weg.has(i) ? undefined : (neu.get(i) ?? baum.byId.get(i));

  // Elternknoten, deren Kinderliste sich ändert, und Positionen, deren Betrag oder Ziel sich ändern kann.
  const eltern = new Set<string>();
  const zuzug = new Map<string, Knoten[]>();
  const geaendertePositionen: string[] = [];
  const zuziehen = (k: Knoten): void => {
    const liste = zuzug.get(k.elternId);
    if (liste) liste.push(k);
    else zuzug.set(k.elternId, [k]);
  };
  for (const k of entfernt) {
    if (!weg.has(k.elternId)) eltern.add(k.elternId);
    if (k.art === 'position') geaendertePositionen.push(k.id);
  }
  for (const k of hinzu) {
    eltern.add(k.elternId);
    zuziehen(k);
    if (k.art === 'position') geaendertePositionen.push(k.id);
  }
  for (const { vorher, nachher } of geaendert) {
    eltern.add(vorher.elternId);
    eltern.add(nachher.elternId);
    if (vorher.elternId !== nachher.elternId) zuziehen(nachher);
    if (vorher.art === 'position' && nachher.art === 'position' && rechnetAnders(vorher, nachher))
      geaendertePositionen.push(nachher.id);
  }

  // Eigener GP: geänderte Knoten neu gerechnet, sonst aus dem Stand (er gehört zum Zustand).
  const q: Basisquelle = {
    position: (i) => {
      const k = knotenNeu(i);
      return k?.art === 'position' ? k : undefined;
    },
    gesamtpreis: (p) => {
      if (neu.has(p.id)) return eigenerGesamtpreis(p);
      const s = positionssummeVon(stand, p.id);
      return s === undefined ? eigenerGesamtpreis(p) : s.gesamtpreis;
    },
  };
  const kinderNeu = (x: string): Knoten[] => {
    const liste: Knoten[] = [];
    for (const k of baum.kinder.get(x) ?? []) {
      if (weg.has(k.id)) continue;
      const n = neu.get(k.id) ?? k;
      if (n.elternId === x) liste.push(n);
    }
    for (const k of zuzug.get(x) ?? []) liste.push(k);
    return liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  };

  // Zuschlagspositionen neu berechnen: R3/R4 je betroffenem Elternknoten, R5 über den Rückwärtsindex.
  const basen = new Map<string, Zuschlagsbasis>();
  for (const x of eltern) {
    if (weg.has(x) || (x !== baum.lvId && knotenNeu(x) === undefined)) continue;
    const kinder = kinderNeu(x);
    if (kinder.some((k) => k.art === 'position' && k.zuschlag !== null)) bereichsbasen(kinder, q, basen);
  }
  const rueck = bezugsindex(z.leistungsverzeichnis.knoten);
  for (const pid of geaendertePositionen) {
    for (const zid of rueck.get(pid) ?? []) {
      if (basen.has(zid)) continue;
      const k = knotenNeu(zid);
      if (k?.art !== 'position') continue;
      const b = listenzuschlag(k, q);
      if (b !== null) basen.set(zid, b);
    }
  }
  const gpNeu = (p: Position): Betrag | null => {
    const b = basen.get(p.id);
    return b !== undefined ? b.betrag : eigenerGesamtpreis(p);
  };
  const anteileAlt = (k: Knoten): Anteile => {
    if (k.art === 'position')
      return anteileDerPosition(positionssummeVon(stand, k.id)?.gesamtpreis ?? null, k);
    return k.art === 'hinweis' ? NULL_ANTEILE : anteileDerGliederung(gliederungssummeVon(stand, k.id));
  };

  // Änderungen der Anteile je Elternknoten, getrennt nach altem und neuem Baum.
  const imAlten: Anteilsaenderung[] = [];
  const imNeuen: Anteilsaenderung[] = [];
  const positionen: Positionssumme[] = [];
  const erledigt = new Set<string>();
  const neueGliederungen: string[] = [];

  for (const k of entfernt) {
    if (!weg.has(k.elternId)) imAlten.push({ eltern: k.elternId, a: minus(anteileAlt(k)) });
  }
  for (const k of hinzu) {
    erledigt.add(k.id);
    if (k.art === 'position') {
      const g = gpNeu(k);
      positionen.push(positionssummeAus(k, g));
      imNeuen.push({ eltern: k.elternId, a: anteileDerPosition(g, k) });
    } else if (k.art !== 'hinweis') neueGliederungen.push(k.id);
  }
  for (const { vorher, nachher } of geaendert) {
    erledigt.add(nachher.id);
    const umgezogen = vorher.elternId !== nachher.elternId;
    if (nachher.art === 'position' && vorher.art === 'position') {
      const alt = positionssummeVon(stand, vorher.id);
      const s = positionssummeAus(nachher, gpNeu(nachher));
      if (!gleicheSumme(alt, s)) positionen.push(s);
      const aAlt = anteileDerPosition(alt?.gesamtpreis ?? null, vorher);
      const aNeu = anteileDerPosition(s.gesamtpreis, nachher);
      if (umgezogen) {
        imAlten.push({ eltern: vorher.elternId, a: minus(aAlt) });
        imNeuen.push({ eltern: nachher.elternId, a: aNeu });
      } else imNeuen.push({ eltern: nachher.elternId, a: plus(aNeu, minus(aAlt)) });
    } else if (umgezogen) {
      const a = anteileAlt(vorher);
      imAlten.push({ eltern: vorher.elternId, a: minus(a) });
      imNeuen.push({ eltern: nachher.elternId, a });
    }
  }
  for (const [zid, b] of basen) {
    if (erledigt.has(zid)) continue;
    const k = knotenNeu(zid);
    if (k?.art !== 'position') continue;
    const alt = positionssummeVon(stand, zid);
    const s = positionssummeAus(k, b.betrag);
    if (gleicheSumme(alt, s)) continue;
    positionen.push(s);
    imNeuen.push({
      eltern: k.elternId,
      a: plus(anteileDerPosition(s.gesamtpreis, k), minus(anteileDerPosition(alt?.gesamtpreis ?? null, k))),
    });
  }

  // Aufsummieren entlang der Ketten bis zur Wurzel.
  const aufsummiert = new Map<string, Anteile>();
  const grenze = baum.byId.size + neu.size;
  const hochlaufen = (x: Anteilsaenderung, elternVon: (i: string) => string | undefined): void => {
    if (istNull(x.a)) return;
    let k: string | undefined = x.eltern;
    for (let schritt = 0; k !== undefined && schritt <= grenze; schritt++) {
      aufsummiert.set(k, plus(aufsummiert.get(k) ?? NULL_ANTEILE, x.a));
      if (k === baum.lvId) break;
      k = elternVon(k);
    }
  };
  for (const x of imAlten) hochlaufen(x, (i) => baum.byId.get(i)?.elternId);
  for (const x of imNeuen) hochlaufen(x, (i) => knotenNeu(i)?.elternId);

  const gliederungen: Gliederungssumme[] = neueGliederungen.map((gid) =>
    gliederungssumme(gid, aufsummiert.get(gid) ?? NULL_ANTEILE),
  );
  const istNeu = new Set(neueGliederungen);
  let lvAenderung = NULL_ANTEILE;
  for (const [k, a] of aufsummiert) {
    if (k === baum.lvId) lvAenderung = a;
    else if (!istNeu.has(k) && !weg.has(k) && !istNull(a)) {
      gliederungen.push(gliederungssumme(k, plus(anteileDerGliederung(gliederungssummeVon(stand, k)), a)));
    }
  }

  let gesamt: Gesamtsummen | null = null;
  if (e.kopf !== undefined || !istNull(lvAenderung)) {
    const kopf = e.kopf ?? z.leistungsverzeichnis;
    const alt = stand.gesamt;
    const neuGesamt = gesamtsummen(addiere(alt.netto, lvAenderung.summe), kopf.nachlass, kopf.mwstSatz, {
      bedarf: addiere(alt.summeBedarfOhneGesamtbetrag ?? NULL_BETRAG, lvAenderung.bedarf),
      wahl: addiere(alt.summeWahl ?? NULL_BETRAG, lvAenderung.wahl),
    });
    if (!gleicheGesamtsummen(neuGesamt, alt)) gesamt = neuGesamt;
  }
  return {
    positionen: nachId(positionen, (p) => p.positionId),
    gliederungen: nachId(gliederungen, (g) => g.gliederungId),
    gesamt,
  };
}

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

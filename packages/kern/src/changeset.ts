// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet anwenden und umkehren (Ticket 05, Summen: Ticket 07, ohne Vorzustand: Ticket 30). Beides sind reine
// Funktionen; die App nutzt sie für den Zustand, der Kern in Tests, `changeSetUmkehren` für Undo (S3).

import { NULL_BETRAG } from '@tethys/dezimal';
import type {
  Aenderung,
  Aenderungen,
  Befehlshinweis,
  Gesamtsummen,
  Gliederungssumme,
  Knoten,
  Leistungsverzeichnis,
  LvChangeSet,
  LvChangeSetAnwenden,
  LvKopf,
  LvZustand,
  Positionssumme,
  Summenaenderung,
  Summenstand,
} from '@tethys/vertrag';
import { nettoHinweise } from './hinweise';
import { kanonisch, ohneKnoten } from './struktur';
import {
  LEERES_SUMMENVORHER,
  baueSummenIndex,
  merkeSummenIndex,
  ordneNachKennung,
  summenIndexVon,
  summenVorher,
} from './summen';

/** Keine Summenänderung (zum Beispiel bei Hinweistexten und Nullbewegungen); auch keine alten Werte. */
export const LEERE_SUMMENAENDERUNG: Summenaenderung = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  vorher: LEERES_SUMMENVORHER,
};

/** Alle Gesamtsummen null: Ausgangsstand, auf den ein ChangeSet ein neues LV anwendet. */
const NULL_GESAMT: Gesamtsummen = {
  netto: NULL_BETRAG,
  nachlass: NULL_BETRAG,
  nettoNachNachlass: NULL_BETRAG,
  mwst: NULL_BETRAG,
  brutto: NULL_BETRAG,
};

export const LEERER_SUMMENSTAND: Summenstand = { positionen: [], gliederungen: [], gesamt: NULL_GESAMT };

/**
 * Wendet die Summen eines ChangeSets an. Der Stand ist eine Funktion des Zustands: `positionen` und `gliederungen` stehen
 * in der Reihenfolge der Knoten (siehe `summen.ts`).
 *  - Ändert sich nur der Wert vorhandener Einträge (Menge, Preis, Nachlass, MwSt), werden sie am selben Arrayindex
 *    ersetzt; die Zuordnung `id → Index` wird mit dem neuen Stand geteilt (O(Arraygröße) für die Kopie, kein Neuaufbau).
 *  - Ändert sich die Struktur (Knoten hinzugefügt, entfernt oder verschoben), wird der Stand in Knotenreihenfolge neu
 *    zusammengesetzt: Einträge entfernter Knoten fallen weg, neue kommen aus `cs.summen`, alle anderen bleiben.
 */
function summenAnwenden(alt: Summenstand, cs: LvChangeSet, knoten: readonly Knoten[]): Summenstand {
  const s = cs.summen;
  const gesamt = s.gesamt ?? alt.gesamt;
  const k = cs.knoten;
  const struktur =
    k.hinzugefuegt.length > 0 ||
    k.entfernt.length > 0 ||
    k.geaendert.some(
      (g) => g.vorher.elternId !== g.nachher.elternId || g.vorher.reihenfolge !== g.nachher.reihenfolge,
    );
  const altIndex = summenIndexVon(alt);

  if (!struktur) {
    if (s.positionen.length === 0 && s.gliederungen.length === 0) {
      if (s.gesamt === null) return alt;
      const stand: Summenstand = { ...alt, gesamt };
      merkeSummenIndex(stand, altIndex);
      return stand;
    }
    const bekannt =
      s.positionen.every((p) => altIndex.positionen.has(p.positionId)) &&
      s.gliederungen.every((g) => altIndex.gliederungen.has(g.gliederungId));
    if (bekannt) {
      const positionen = alt.positionen.slice();
      const gliederungen = alt.gliederungen.slice();
      for (const p of s.positionen) positionen[altIndex.positionen.get(p.positionId) ?? 0] = p;
      for (const g of s.gliederungen) gliederungen[altIndex.gliederungen.get(g.gliederungId) ?? 0] = g;
      const stand: Summenstand = {
        positionen: s.positionen.length > 0 ? positionen : alt.positionen,
        gliederungen: s.gliederungen.length > 0 ? gliederungen : alt.gliederungen,
        gesamt,
      };
      merkeSummenIndex(stand, altIndex);
      return stand;
    }
  }

  const neueP = new Map<string, Positionssumme>(s.positionen.map((p) => [p.positionId as string, p]));
  const neueG = new Map<string, Gliederungssumme>(s.gliederungen.map((g) => [g.gliederungId as string, g]));
  const positionen: Positionssumme[] = [];
  const gliederungen: Gliederungssumme[] = [];
  for (const n of knoten) {
    if (n.art === 'hinweis') continue;
    if (n.art === 'position') {
      const i = altIndex.positionen.get(n.id);
      const e = neueP.get(n.id) ?? (i === undefined ? undefined : alt.positionen[i]);
      if (e) positionen.push(e);
    } else {
      const i = altIndex.gliederungen.get(n.id);
      const e = neueG.get(n.id) ?? (i === undefined ? undefined : alt.gliederungen[i]);
      if (e) gliederungen.push(e);
    }
  }
  const stand: Summenstand = { positionen, gliederungen, gesamt };
  merkeSummenIndex(stand, baueSummenIndex(stand));
  return stand;
}

/** Teile eines ChangeSets am LV; was fehlt, ist leer. */
export interface ChangeSetTeile {
  readonly kopf?: Aenderung<LvKopf>;
  readonly hinzugefuegt?: readonly Knoten[];
  readonly geaendert?: readonly { readonly vorher: Knoten; readonly nachher: Knoten }[];
  readonly entfernt?: readonly Knoten[];
  /** Neue Werte; `vorher` setzt `baueChangeSet` aus dem Zustand (ein mitgegebenes `vorher` zählt nicht). */
  readonly summen?: Summenaenderung;
  readonly hinweise?: readonly Befehlshinweis[];
}

/**
 * Baut ein ChangeSet am LV des Zustands. Die alten Summen (`summen.vorher`, v1.1a) liest es aus dem Zustand: für jede
 * genannte Summe, `gesamt` bei geänderten Gesamtsummen und die vollen Summen der entfernten Knoten. So trägt jedes
 * ChangeSet eines Befehls, was seine Umkehrung braucht, ohne dass ein Befehl daran denken muss.
 */
export function baueChangeSet(z: LvZustand, teile: ChangeSetTeile): LvChangeSet {
  const entfernt = teile.entfernt ?? [];
  const s = teile.summen ?? LEERE_SUMMENAENDERUNG;
  const hinweise = [...(teile.hinweise ?? []), ...nettoHinweise(s.gesamt)];
  return {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: z.leistungsverzeichnis.id,
    kopf: teile.kopf ?? null,
    knoten: {
      hinzugefuegt: teile.hinzugefuegt ?? [],
      geaendert: teile.geaendert ?? [],
      entfernt,
    },
    summen: {
      positionen: s.positionen,
      gliederungen: s.gliederungen,
      gesamt: s.gesamt,
      vorher: summenVorher(z.summen, s, entfernt),
    },
    ...(hinweise.length === 0 ? {} : { hinweise }),
  };
}

/**
 * Wendet ein ChangeSet auf einen Zustand an. `zustand: null`: das LV entsteht; dann muss `kopf.nachher` gesetzt sein.
 * `kopf.nachher: null` (das LV wird gelöscht, oder die Umkehrung seines Anlegens): Ergebnis `null`, es gibt kein LV mehr.
 *
 * - Knoten: entfernen, ersetzen (`geaendert`), hinzufügen; das Ergebnis steht in kanonischer Reihenfolge
 *   (Vorordnung, siehe `struktur.ts`). Ein ChangeSet ohne Knotenänderung übernimmt das Array unverändert.
 * - Summen: `cs.summen` ersetzt oder ergänzt die Einträge, Einträge entfernter Knoten fallen weg; `gesamt: null` lässt die
 *   Gesamtsummen stehen. Das Ergebnis ist der vollständige Summenstand, sofern `cs` von diesem Kern stammt
 *   (Property-Test: gleich der Neuberechnung `summenBerechnen`).
 * - Ein ChangeSet ohne jede Änderung liefert denselben Zustand (dasselbe Objekt).
 * - `hinweise` wertet die Funktion nicht aus (sie gehören zur Antwort auf den Befehl).
 *
 * Ein ChangeSet ohne Kopf auf „kein LV“ ist ein Programmfehler, kein erwartbarer Fehler: die Funktion wirft. Der Kern
 * selbst erzeugt solche ChangeSets nicht.
 */
export const lvChangeSetAnwenden: LvChangeSetAnwenden = (zustand, cs) => {
  let kopf: Omit<Leistungsverzeichnis, 'knoten'>;
  if (cs.kopf !== null) {
    if (cs.kopf.nachher === null) return null;
    kopf = cs.kopf.nachher;
  } else if (zustand !== null) {
    kopf = ohneKnoten(zustand.leistungsverzeichnis);
  } else {
    throw new Error('ChangeSet ohne Kopf lässt sich nicht auf „kein LV“ anwenden.');
  }

  const k = cs.knoten;
  const knotenGeaendert = k.hinzugefuegt.length > 0 || k.geaendert.length > 0 || k.entfernt.length > 0;
  const s = cs.summen;
  if (
    zustand !== null &&
    cs.kopf === null &&
    !knotenGeaendert &&
    s.positionen.length === 0 &&
    s.gliederungen.length === 0 &&
    s.gesamt === null
  ) {
    return zustand;
  }

  let knoten: readonly Knoten[];
  if (zustand !== null && !knotenGeaendert) {
    knoten = zustand.leistungsverzeichnis.knoten;
  } else {
    const weg = new Set<string>(k.entfernt.map((n) => n.id));
    const ersatz = new Map<string, Knoten>(k.geaendert.map((g) => [g.nachher.id, g.nachher]));
    const rest: Knoten[] = [];
    for (const n of zustand?.leistungsverzeichnis.knoten ?? []) {
      if (weg.has(n.id)) continue;
      rest.push(ersatz.get(n.id) ?? n);
    }
    for (const n of k.hinzugefuegt) rest.push(n);
    knoten = kanonisch(kopf.id, rest);
  }
  const summen = summenAnwenden(zustand?.summen ?? LEERER_SUMMENSTAND, cs, knoten);
  return { leistungsverzeichnis: { ...kopf, knoten }, summen };
};

/** Vertauscht die beiden Seiten einer Sammlungsänderung. */
function aenderungenUmkehren<T>(a: Aenderungen<T>): Aenderungen<T> {
  return {
    hinzugefuegt: a.entfernt,
    geaendert: a.geaendert.map((g) => ({ vorher: g.nachher, nachher: g.vorher })),
    entfernt: a.hinzugefuegt,
  };
}

/**
 * Die Summen der Umkehrung, allein aus dem ChangeSet (v1.1a). Die Umkehrung setzt die alten Werte
 * (`vorher.positionen`/`gliederungen`) und bringt die Summen der zurückkehrenden Knoten (`vorher.entfernt`) wieder; ihr
 * eigenes `vorher` sind die neuen Werte des ChangeSets, aufgeteilt in überschriebene Summen und solche der Knoten, die
 * die Umkehrung entfernt (`knoten.hinzugefuegt` des ChangeSets). `gesamt` und `vorher.gesamt` tauschen die Plätze;
 * das deckt auch Anlegen und Löschen ab (das eine ist die Umkehrung des anderen).
 */
function summenUmkehren(cs: LvChangeSet): Summenaenderung {
  const s = cs.summen;
  const v = s.vorher;
  if (v === undefined)
    throw new Error(
      'ChangeSet ohne summen.vorher: ohne Vorzustand nicht umkehrbar (vor Vertrag v1.1a erzeugt).',
    );
  const neu = new Set<string>(cs.knoten.hinzugefuegt.map((k) => k.id));
  const positionen = (bleibt: boolean): Positionssumme[] =>
    s.positionen.filter((p) => neu.has(p.positionId) !== bleibt);
  const gliederungen = (bleibt: boolean): Gliederungssumme[] =>
    s.gliederungen.filter((g) => neu.has(g.gliederungId) !== bleibt);
  return {
    positionen: ordneNachKennung([...v.positionen, ...v.entfernt.positionen], (p) => p.positionId),
    gliederungen: ordneNachKennung([...v.gliederungen, ...v.entfernt.gliederungen], (g) => g.gliederungId),
    gesamt: v.gesamt,
    vorher: {
      positionen: ordneNachKennung(positionen(true), (p) => p.positionId),
      gliederungen: ordneNachKennung(gliederungen(true), (g) => g.gliederungId),
      gesamt: s.gesamt,
      entfernt: {
        positionen: ordneNachKennung(positionen(false), (p) => p.positionId),
        gliederungen: ordneNachKennung(gliederungen(false), (g) => g.gliederungId),
      },
    },
  };
}

/**
 * Die Umkehrung eines ChangeSets (Undo), allein aus dem ChangeSet (v1.1a): `vorher`/`nachher` und
 * `hinzugefuegt`/`entfernt` vertauscht, die Summen aus `summen.vorher` (siehe `summenUmkehren`). `entfernt` steht wie
 * `hinzugefuegt` mit Eltern vor Kindern, so lässt sich die Umkehrung ohne Umsortieren anwenden. Die Umkehrung des
 * Anlegens löscht das LV, die des Löschens legt es wieder an.
 *
 * Anwenden und dann die Umkehrung anwenden stellt den Vorzustand samt Summen exakt her; die Umkehrung der Umkehrung ist
 * wieder das ChangeSet, die Summenlisten als Mengen verglichen (Property-Tests). Hinweise gehören zur Antwort auf den
 * Befehl und gehen nicht in die Umkehrung ein. Papierkorb und LV-Stand (v1.2) werden ebenso vertauscht.
 */
export function changeSetUmkehren(cs: LvChangeSet): LvChangeSet {
  return {
    art: cs.art,
    leistungsverzeichnisId: cs.leistungsverzeichnisId,
    kopf: cs.kopf === null ? null : { vorher: cs.kopf.nachher, nachher: cs.kopf.vorher },
    knoten: aenderungenUmkehren(cs.knoten),
    summen: summenUmkehren(cs),
    ...(cs.papierkorb === undefined ? {} : { papierkorb: aenderungenUmkehren(cs.papierkorb) }),
    ...(cs.lvStand === undefined
      ? {}
      : { lvStand: { vorher: cs.lvStand.nachher, nachher: cs.lvStand.vorher } }),
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet anwenden und umkehren (Ticket 05, Summen: Ticket 07). Beides sind reine Funktionen; die App nutzt sie für
// den Zustand, der Kern in Tests, `changeSetUmkehren` bereitet Undo vor.

import { NULL_BETRAG } from '@tethys/dezimal';
import type {
  Aenderung,
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
import { kanonisch, ohneKnoten } from './struktur';
import {
  baueSummenIndex,
  gliederungssummeVon,
  merkeSummenIndex,
  ordneNachKennung,
  positionssummeVon,
  summenIndexVon,
} from './summen';

/** Keine Summenänderung (zum Beispiel bei Hinweistexten und Nullbewegungen). */
export const LEERE_SUMMENAENDERUNG: Summenaenderung = { positionen: [], gliederungen: [], gesamt: null };

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
  readonly summen?: Summenaenderung;
}

/** Baut ein ChangeSet am LV des Zustands. */
export function baueChangeSet(z: LvZustand, teile: ChangeSetTeile): LvChangeSet {
  return {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: z.leistungsverzeichnis.id,
    kopf: teile.kopf ?? null,
    knoten: {
      hinzugefuegt: teile.hinzugefuegt ?? [],
      geaendert: teile.geaendert ?? [],
      entfernt: teile.entfernt ?? [],
    },
    summen: teile.summen ?? LEERE_SUMMENAENDERUNG,
  };
}

/**
 * Wendet ein ChangeSet auf einen Zustand an. `zustand: null`: das LV entsteht; dann muss `kopf.nachher` gesetzt sein.
 *
 * - Knoten: entfernen, ersetzen (`geaendert`), hinzufügen; das Ergebnis steht in kanonischer Reihenfolge
 *   (Vorordnung, siehe `struktur.ts`). Ein ChangeSet ohne Knotenänderung übernimmt das Array unverändert.
 * - Summen: `cs.summen` ersetzt oder ergänzt die Einträge, Einträge entfernter Knoten fallen weg; `gesamt: null` lässt die
 *   Gesamtsummen stehen. Das Ergebnis ist der vollständige Summenstand, sofern `cs` von diesem Kern stammt
 *   (Property-Test: gleich der Neuberechnung `summenBerechnen`).
 * - Ein ChangeSet ohne jede Änderung liefert denselben Zustand (dasselbe Objekt).
 *
 * Ein ChangeSet, das sich nicht anwenden lässt (kein Zustand und kein neuer Kopf; ein ChangeSet, das das LV
 * entfernt), ist ein Programmfehler, kein erwartbarer Fehler: die Funktion wirft. Der Kern selbst erzeugt solche
 * ChangeSets nicht.
 */
// v1.1a: mechanisch angepasst, Folgeticket (kern: `null` als Ergebnis, wenn das ChangeSet das LV entfernt). `satisfies`
// statt Annotation, damit die Funktion weiter `LvZustand` liefert und kein Aufrufer `null` behandeln muss.
export const lvChangeSetAnwenden = ((zustand, cs) => {
  let kopf: Omit<Leistungsverzeichnis, 'knoten'>;
  if (cs.kopf !== null) {
    if (cs.kopf.nachher === null)
      throw new Error('ChangeSet entfernt das LV: als LvZustand nicht darstellbar.');
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
  return { leistungsverzeichnis: { ...kopf, knoten }, summen } satisfies LvZustand;
}) satisfies LvChangeSetAnwenden;

/** Die Summen, die die Umkehrung herstellen muss: die Werte vor dem ChangeSet (siehe `changeSetUmkehren`). */
function summenUmkehren(cs: LvChangeSet, vorher: LvZustand | null): Summenaenderung {
  if (vorher === null) return LEERE_SUMMENAENDERUNG;
  const alt = vorher.summen;
  const positionen = new Map<string, Positionssumme>();
  const gliederungen = new Map<string, Gliederungssumme>();
  for (const p of cs.summen.positionen) {
    const a = positionssummeVon(alt, p.positionId);
    if (a) positionen.set(p.positionId, a);
  }
  for (const g of cs.summen.gliederungen) {
    const a = gliederungssummeVon(alt, g.gliederungId);
    if (a) gliederungen.set(g.gliederungId, a);
  }
  // Entfernte Knoten kommen mit der Umkehrung zurück; ihre Summen sind im alten Stand die richtigen.
  for (const n of cs.knoten.entfernt) {
    if (n.art === 'position') {
      const a = positionssummeVon(alt, n.id);
      if (a) positionen.set(n.id, a);
    } else if (n.art !== 'hinweis') {
      const a = gliederungssummeVon(alt, n.id);
      if (a) gliederungen.set(n.id, a);
    }
  }
  return {
    positionen: ordneNachKennung([...positionen.values()], (p) => p.positionId),
    gliederungen: ordneNachKennung([...gliederungen.values()], (g) => g.gliederungId),
    gesamt: cs.summen.gesamt === null ? null : alt.gesamt,
  };
}

/**
 * Die Umkehrung eines ChangeSets (Undo): `vorher`/`nachher` und `hinzugefuegt`/`entfernt` vertauscht.
 * `entfernt` steht wie `hinzugefuegt` mit Eltern vor Kindern, so lässt sich die Umkehrung ohne Umsortieren anwenden.
 *
 * `zustandVorher` ist der Zustand, auf den `changeSet` angewendet wurde. Der Vertrag lässt `Summenaenderung` ohne Vorwerte,
 * deshalb liest die Umkehrung die alten Summen aus dem Vorzustand: für jede im ChangeSet genannte Summe und für jeden
 * entfernten Knoten die Werte von damals, `gesamt` nur, wenn das ChangeSet es geändert hat. So stellt „anwenden, Umkehrung
 * anwenden“ den Vorzustand einschließlich der Summen exakt her (Property-Test), und die Umkehrung der Umkehrung (mit dem
 * Nachzustand) ist wieder das ChangeSet. `null` (das LV entstand erst): keine Summen.
 * Die Umkehrung eines LV-Anlegens (`kopf.nachher: null`) kann `lvChangeSetAnwenden` nicht anwenden.
 */
export function changeSetUmkehren(cs: LvChangeSet, zustandVorher: LvZustand | null): LvChangeSet {
  return {
    art: cs.art,
    leistungsverzeichnisId: cs.leistungsverzeichnisId,
    kopf: cs.kopf === null ? null : { vorher: cs.kopf.nachher, nachher: cs.kopf.vorher },
    knoten: {
      hinzugefuegt: cs.knoten.entfernt,
      geaendert: cs.knoten.geaendert.map((g) => ({ vorher: g.nachher, nachher: g.vorher })),
      entfernt: cs.knoten.hinzugefuegt,
    },
    summen: summenUmkehren(cs, zustandVorher),
  };
}

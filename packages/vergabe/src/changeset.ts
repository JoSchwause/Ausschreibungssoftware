// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet am Angebot anwenden und umkehren (Ticket 36, Punkt 3). Beides sind reine Funktionen.
//
// Darstellung des Zustands: `angebot.positionen` in der Reihenfolge des Hinzufügens (neue Einträge hinten, geänderte am
// selben Platz); `summen` wie `angebotSummenBerechnen`: `positionen` und `gliederungen` in der Reihenfolge der Knoten
// des LV, je Position des LV genau ein Eintrag. Ein Angebotsbefehl ändert am Summenstand nur Werte, nie die Liste
// selbst (außer Anlegen und Löschen); so ersetzt `angebotChangeSetAnwenden` Einträge am selben Arrayindex.

import type {
  AngebotChangeSet,
  AngebotKopf,
  AngebotZustand,
  Angebotsposition,
  Gliederungssumme,
  Positionssumme,
  Summenaenderung,
  Summenstand,
} from '@tethys/vertrag';

/** Kopf eines Angebots: alles außer `positionen`. */
export function angebotKopf<T extends { readonly positionen: unknown }>(a: T): Omit<T, 'positionen'> {
  const kopie: { -readonly [K in keyof T]?: T[K] } = { ...a };
  delete kopie.positionen;
  return kopie as Omit<T, 'positionen'>;
}

// --- Index der Summen (je Array einmal, geteilt mit dem Folgestand bei reiner Wertänderung) -----------------------

const indexCache = new WeakMap<readonly unknown[], ReadonlyMap<string, number>>();

function indexVon<T>(liste: readonly T[], id: (x: T) => string): ReadonlyMap<string, number> {
  const vorhanden = indexCache.get(liste);
  if (vorhanden) return vorhanden;
  const neu = new Map<string, number>();
  liste.forEach((x, i) => neu.set(id(x), i));
  indexCache.set(liste, neu);
  return neu;
}

const positionsKennung = (p: Positionssumme): string => p.positionId;
const gliederungsKennung = (g: Gliederungssumme): string => g.gliederungId;
const angebotspositionsKennung = (p: Angebotsposition): string => p.positionId;

/** Ersetzt Einträge am selben Index; der Index des alten Arrays gilt auch für das neue. */
function ersetze<T>(alt: readonly T[], neu: readonly T[], id: (x: T) => string): readonly T[] {
  if (neu.length === 0) return alt;
  const index = indexVon(alt, id);
  const aus = alt.slice();
  for (const n of neu) {
    const i = index.get(id(n));
    if (i === undefined) throw new Error(`ChangeSet passt nicht zum Zustand: ${id(n)} fehlt`);
    aus[i] = n;
  }
  indexCache.set(aus, index);
  return aus;
}

function summenAnwenden(alt: Summenstand, s: Summenaenderung): Summenstand {
  if (s.positionen.length === 0 && s.gliederungen.length === 0 && s.gesamt === null) return alt;
  return {
    positionen: ersetze(alt.positionen, s.positionen, positionsKennung),
    gliederungen: ersetze(alt.gliederungen, s.gliederungen, gliederungsKennung),
    gesamt: s.gesamt ?? alt.gesamt,
  };
}

function positionenAnwenden(
  alt: readonly Angebotsposition[],
  cs: AngebotChangeSet,
): readonly Angebotsposition[] {
  const { hinzugefuegt, geaendert, entfernt } = cs.positionen;
  if (hinzugefuegt.length === 0 && geaendert.length === 0 && entfernt.length === 0) return alt;
  let aus = ersetze(
    alt,
    geaendert.map((g) => g.nachher),
    angebotspositionsKennung,
  );
  if (entfernt.length > 0) {
    const weg = new Set<string>(entfernt.map(angebotspositionsKennung));
    aus = aus.filter((p) => !weg.has(p.positionId));
  }
  return hinzugefuegt.length > 0 ? [...aus, ...hinzugefuegt] : aus;
}

const istLeer = (cs: AngebotChangeSet): boolean =>
  cs.kopf === null &&
  cs.positionen.hinzugefuegt.length === 0 &&
  cs.positionen.geaendert.length === 0 &&
  cs.positionen.entfernt.length === 0 &&
  cs.summen.positionen.length === 0 &&
  cs.summen.gliederungen.length === 0 &&
  cs.summen.gesamt === null;

/**
 * Wendet ein ChangeSet auf ein Angebot an. `zustand: null`: das Angebot entsteht (`kopf.vorher` ist `null`); Ergebnis
 * `null`: das Angebot verschwindet (`kopf.nachher` ist `null`). Ein leeres ChangeSet liefert denselben Zustand.
 * Ein ChangeSet, das nicht zum Zustand passt, ist ein Programmfehler: die Funktion wirft.
 */
export function angebotChangeSetAnwenden(
  zustand: AngebotZustand | null,
  cs: AngebotChangeSet,
): AngebotZustand | null {
  if (cs.kopf !== null && cs.kopf.nachher === null) return null;
  if (zustand === null) {
    const kopf = cs.kopf?.nachher;
    if (!kopf) throw new Error('Kein Angebot und kein neuer Kopf im ChangeSet');
    const gesamt = cs.summen.gesamt;
    if (gesamt === null) throw new Error('Neues Angebot ohne Gesamtsummen im ChangeSet');
    const positionen = cs.summen.positionen;
    const gliederungen = cs.summen.gliederungen;
    return {
      angebot: { ...kopf, positionen: cs.positionen.hinzugefuegt },
      summen: { positionen, gliederungen, gesamt },
    };
  }
  if (istLeer(cs)) return zustand;
  const kopf: AngebotKopf = cs.kopf?.nachher ?? angebotKopf(zustand.angebot);
  return {
    angebot: { ...kopf, positionen: positionenAnwenden(zustand.angebot.positionen, cs) },
    summen: summenAnwenden(zustand.summen, cs.summen),
  };
}

const LEERES_VORHER = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  entfernt: { positionen: [], gliederungen: [] },
} as const;

/**
 * Kehrt ein ChangeSet um, ohne den Vorzustand zu kennen: alte und neue Stände tauschen, Hinzugefügtes wird entfernt
 * und umgekehrt. Anlegen und Löschen sind Gegenstücke. Doppelte Umkehrung ergibt das ChangeSet.
 */
export function angebotChangeSetUmkehren(cs: AngebotChangeSet): AngebotChangeSet {
  const s = cs.summen;
  const v = s.vorher ?? LEERES_VORHER;
  const altP = new Set<string>(v.positionen.map(positionsKennung));
  const altG = new Set<string>(v.gliederungen.map(gliederungsKennung));
  const summen: Summenaenderung = {
    positionen: [...v.positionen, ...v.entfernt.positionen],
    gliederungen: [...v.gliederungen, ...v.entfernt.gliederungen],
    gesamt: v.gesamt,
    vorher: {
      positionen: s.positionen.filter((p) => altP.has(p.positionId)),
      gliederungen: s.gliederungen.filter((g) => altG.has(g.gliederungId)),
      gesamt: s.gesamt,
      entfernt: {
        positionen: s.positionen.filter((p) => !altP.has(p.positionId)),
        gliederungen: s.gliederungen.filter((g) => !altG.has(g.gliederungId)),
      },
    },
  };
  return {
    art: 'angebot',
    angebotId: cs.angebotId,
    kopf: cs.kopf === null ? null : { vorher: cs.kopf.nachher, nachher: cs.kopf.vorher },
    positionen: {
      hinzugefuegt: cs.positionen.entfernt,
      geaendert: cs.positionen.geaendert.map((g) => ({ vorher: g.nachher, nachher: g.vorher })),
      entfernt: cs.positionen.hinzugefuegt,
    },
    summen,
  };
}

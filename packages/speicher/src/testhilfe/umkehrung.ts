// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Umkehrung eines ChangeSets allein aus seinen Daten (v1.1a/v1.2/v1.4, wie `umkehrenV12` in
// `packages/vertrag/src/vertrag.test.ts`), ohne `kern` (A3). Dazu kleine Bauhilfen für ChangeSets am LV, wie der Kern
// sie liefert: Feld ändern, Knoten einfügen, aus dem Baum nehmen (löschen oder in den Papierkorb), verschieben.
// Die Summenwerte sind Speicherbeispiele: `speicher` rechnet nicht, es schreibt und prüft nur.

import type {
  Aenderung,
  Aenderungen,
  AngebotChangeSet,
  AufmassChangeSet,
  BauwerksmodellChangeSet,
  BauzeitenplanChangeSet,
  AuftragsLvChangeSet,
  Betrag,
  ChangeSet,
  ElternId,
  Gesamtsummen,
  Knoten,
  KostenermittlungChangeSet,
  LvChangeSet,
  LvKopf,
  LvZustand,
  Papierkorbeintrag,
  PapierkorbeintragId,
  Positionssumme,
  RechnungChangeSet,
  Summenaenderung,
} from '@tethys/vertrag';

const tausche = <T>(a: Aenderung<T>): Aenderung<T> => ({ vorher: a.nachher, nachher: a.vorher });

function sammlungUmkehren<T>(a: Aenderungen<T>): Aenderungen<T> {
  return {
    hinzugefuegt: a.entfernt,
    geaendert: a.geaendert.map((g) => ({ vorher: g.nachher, nachher: g.vorher })),
    entfernt: a.hinzugefuegt,
  };
}

/** Summen umkehren: alte Werte und die Summen entfernter Knoten zurück, neu entstandene Summen fallen weg. */
export function summenUmkehren(s: Summenaenderung): Summenaenderung {
  const v = s.vorher;
  const alteP = new Set<string>(v.positionen.map((p) => p.positionId));
  const alteG = new Set<string>(v.gliederungen.map((g) => g.gliederungId));
  return {
    positionen: [...v.positionen, ...v.entfernt.positionen],
    gliederungen: [...v.gliederungen, ...v.entfernt.gliederungen],
    gesamt: v.gesamt,
    vorher: {
      positionen: s.positionen.filter((p) => alteP.has(p.positionId)),
      gliederungen: s.gliederungen.filter((g) => alteG.has(g.gliederungId)),
      gesamt: s.gesamt,
      entfernt: {
        positionen: s.positionen.filter((p) => !alteP.has(p.positionId)),
        gliederungen: s.gliederungen.filter((g) => !alteG.has(g.gliederungId)),
      },
    },
  };
}

/** Die Umkehrung jeder ChangeSet-Art, nur aus dem ChangeSet (Undo, ADR 0006). */
export function umkehren(cs: LvChangeSet): LvChangeSet;
export function umkehren(cs: AngebotChangeSet): AngebotChangeSet;
export function umkehren(cs: AuftragsLvChangeSet): AuftragsLvChangeSet;
export function umkehren(cs: AufmassChangeSet): AufmassChangeSet;
export function umkehren(cs: RechnungChangeSet): RechnungChangeSet;
export function umkehren(cs: KostenermittlungChangeSet): KostenermittlungChangeSet;
export function umkehren(cs: BauwerksmodellChangeSet): BauwerksmodellChangeSet;
export function umkehren(cs: BauzeitenplanChangeSet): BauzeitenplanChangeSet;
export function umkehren(cs: ChangeSet): ChangeSet;
export function umkehren(cs: ChangeSet): ChangeSet {
  switch (cs.art) {
    case 'projekt':
      return { art: 'projekt', projektId: cs.projektId, projekt: tausche(cs.projekt) };
    case 'leistungsverzeichnis':
      return {
        art: 'leistungsverzeichnis',
        leistungsverzeichnisId: cs.leistungsverzeichnisId,
        kopf: cs.kopf === null ? null : tausche(cs.kopf),
        knoten: sammlungUmkehren(cs.knoten),
        summen: summenUmkehren(cs.summen),
        ...(cs.papierkorb === undefined ? {} : { papierkorb: sammlungUmkehren(cs.papierkorb) }),
        ...(cs.lvStand === undefined ? {} : { lvStand: tausche(cs.lvStand) }),
      };
    case 'angebot':
      return {
        art: 'angebot',
        angebotId: cs.angebotId,
        kopf: cs.kopf === null ? null : tausche(cs.kopf),
        positionen: sammlungUmkehren(cs.positionen),
        summen: summenUmkehren(cs.summen),
      };
    case 'auftrags-leistungsverzeichnis':
      return {
        art: 'auftrags-leistungsverzeichnis',
        auftragsLeistungsverzeichnisId: cs.auftragsLeistungsverzeichnisId,
        kopf: cs.kopf === null ? null : tausche(cs.kopf),
        knoten: sammlungUmkehren(cs.knoten),
        summen: summenUmkehren(cs.summen),
      };
    // v1.4: ganze Aggregate (D-36 (8)), umgekehrt durch Tausch von `vorher` und `nachher`.
    case 'aufmass':
      return { art: 'aufmass', aufmassId: cs.aufmassId, aufmass: tausche(cs.aufmass) };
    case 'rechnung':
      return { art: 'rechnung', rechnungId: cs.rechnungId, rechnung: tausche(cs.rechnung) };
    case 'kostenermittlung':
      return {
        art: 'kostenermittlung',
        kostenermittlungId: cs.kostenermittlungId,
        kostenermittlung: tausche(cs.kostenermittlung),
      };
    // v1.6: Bauwerksmodell mit Kopf und (beim Anlegen und Löschen) Inhalt, die übrigen als ganze Aggregate.
    case 'bauwerksmodell':
      return {
        art: 'bauwerksmodell',
        bauwerksmodellId: cs.bauwerksmodellId,
        kopf: tausche(cs.kopf),
        ...(cs.inhalt === undefined ? {} : { inhalt: tausche(cs.inhalt) }),
      };
    case 'bauzeitenplan':
      return {
        art: 'bauzeitenplan',
        bauzeitenplanId: cs.bauzeitenplanId,
        bauzeitenplan: tausche(cs.bauzeitenplan),
      };
    case 'honorarberechnung':
      return {
        art: 'honorarberechnung',
        honorarberechnungId: cs.honorarberechnungId,
        honorarberechnung: tausche(cs.honorarberechnung),
      };
    case 'mangel':
      return { art: 'mangel', mangelId: cs.mangelId, mangel: tausche(cs.mangel) };
    case 'bautagebucheintrag':
      return {
        art: 'bautagebucheintrag',
        bautagebucheintragId: cs.bautagebucheintragId,
        bautagebucheintrag: tausche(cs.bautagebucheintrag),
      };
  }
}

/** Ein Anlegen-ChangeSet (`kopf.vorher: null`) mit leerem `summen.vorher`: so ist es ohne Vorzustand umkehrbar. */
export function mitLeeremVorher<T extends ChangeSet>(cs: T): T {
  // Die Aggregate aus v1.4 und v1.6 haben keine Summen.
  if (cs.art !== 'leistungsverzeichnis' && cs.art !== 'angebot' && cs.art !== 'auftrags-leistungsverzeichnis')
    return cs;
  return {
    ...cs,
    summen: {
      ...cs.summen,
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        entfernt: { positionen: [], gliederungen: [] },
      },
    },
  };
}

// --- Bauhilfen für ChangeSets am LV ------------------------------------------------------------------------------

const LEER: Aenderungen<Knoten> = { hinzugefuegt: [], geaendert: [], entfernt: [] };

/** Neue Gesamtsummen (Speicherbeispiel): das Netto ist um einen Cent-Schritt verändert, sonst wie vorher. */
export const andereGesamt = (g: Gesamtsummen, netto: string): Gesamtsummen => ({
  ...g,
  netto: netto as Betrag,
});

/** Rahmen eines LV-ChangeSets ohne Kopf. */
function rahmen(z: LvZustand): Pick<LvChangeSet, 'art' | 'leistungsverzeichnisId' | 'kopf'> {
  return { art: 'leistungsverzeichnis', leistungsverzeichnisId: z.leistungsverzeichnis.id, kopf: null };
}

/** Ein Feld einer Position ändern; die Positions- und Gesamtsumme ändern sich mit (wie `MengeAendern`). */
export function feldAendern(z: LvZustand, knotenId: string, nachher: Knoten, gp: string): LvChangeSet {
  const vorher = z.leistungsverzeichnis.knoten.find((k) => k.id === knotenId);
  if (vorher === undefined) throw new Error(`Knoten ${knotenId} fehlt`);
  const altP = z.summen.positionen.filter((p) => p.positionId === knotenId);
  return {
    ...rahmen(z),
    knoten: { ...LEER, geaendert: [{ vorher, nachher }] },
    summen: {
      positionen: altP.map((p): Positionssumme => ({ ...p, gesamtpreis: gp as Betrag })),
      gliederungen: [],
      gesamt: andereGesamt(z.summen.gesamt, gp),
      vorher: {
        positionen: altP,
        gliederungen: [],
        gesamt: z.summen.gesamt,
        entfernt: { positionen: [], gliederungen: [] },
      },
    },
  };
}

/** Kopf ändern (Nachlass, MwSt, Name); die Gesamtsummen ändern sich mit. */
export function kopfAendern(
  z: LvZustand,
  nachher: Partial<Omit<LvZustand['leistungsverzeichnis'], 'knoten' | 'id' | 'projektId'>>,
  netto: string,
): LvChangeSet {
  const kopf: LvKopf & { knoten?: unknown } = { ...z.leistungsverzeichnis };
  Reflect.deleteProperty(kopf, 'knoten');
  return {
    ...rahmen(z),
    kopf: { vorher: kopf, nachher: { ...kopf, ...nachher } },
    knoten: LEER,
    summen: {
      positionen: [],
      gliederungen: [],
      gesamt: andereGesamt(z.summen.gesamt, netto),
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: z.summen.gesamt,
        entfernt: { positionen: [], gliederungen: [] },
      },
    },
  };
}

/** Kinder von `elternId` nach `reihenfolge`. */
const kinder = (z: LvZustand, elternId: string): Knoten[] =>
  z.leistungsverzeichnis.knoten
    .filter((k) => k.elternId === elternId)
    .sort((a, b) => a.reihenfolge - b.reihenfolge);

/**
 * Fügt die Teilbäume `neu` (Wurzeln zuerst, Eltern vor Kindern) am Ende von `elternId` ein (`PositionAnlegen`,
 * `KnotenEinfuegen`). Die Wurzeln bekommen die Lage am Ende; neue Positionen bekommen eine Summe.
 */
export function einfuegen(
  z: LvZustand,
  elternId: ElternId,
  neu: readonly Knoten[],
  gp = '1.00',
): LvChangeSet {
  const ids = new Set(neu.map((k) => k.id as string));
  let platz = kinder(z, elternId).length;
  const knoten = neu.map((k) => (ids.has(k.elternId) ? k : { ...k, elternId, reihenfolge: platz++ }));
  return {
    ...rahmen(z),
    knoten: { ...LEER, hinzugefuegt: knoten },
    summen: {
      positionen: knoten
        .filter((k) => k.art === 'position')
        .map((k): Positionssumme => ({ positionId: k.id, gesamtpreis: gp as Betrag, gehtInSummeEin: true })),
      gliederungen: [],
      gesamt: andereGesamt(z.summen.gesamt, gp),
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: z.summen.gesamt,
        entfernt: { positionen: [], gliederungen: [] },
      },
    },
  };
}

/**
 * Nimmt die Knoten `ids` samt Unterbäumen aus dem Baum (`KnotenLoeschen`); die folgenden Geschwister rücken auf
 * (`geaendert`). Mit `eintrag` landen die Knoten in einem neuen Papierkorbeintrag (`KnotenInPapierkorbLegen`).
 */
export function ausBaumNehmen(
  z: LvZustand,
  ids: readonly string[],
  eintrag?: { id: string; nummer: number },
): LvChangeSet {
  const alle = z.leistungsverzeichnis.knoten;
  const weg = new Set<string>();
  const nimm = (id: string): void => {
    weg.add(id);
    for (const k of alle) if (k.elternId === id) nimm(k.id);
  };
  ids.forEach(nimm);
  const entfernt = alle.filter((k) => weg.has(k.id));
  const eltern = new Set(entfernt.filter((k) => !weg.has(k.elternId)).map((k) => k.elternId as string));
  const geaendert: { vorher: Knoten; nachher: Knoten }[] = [];
  for (const e of eltern) {
    let i = 0;
    for (const k of kinder(z, e)) {
      if (weg.has(k.id)) continue;
      if (k.reihenfolge !== i) geaendert.push({ vorher: k, nachher: { ...k, reihenfolge: i } });
      i++;
    }
  }
  const s = z.summen;
  const papierkorb: Papierkorbeintrag | null =
    eintrag === undefined
      ? null
      : { id: eintrag.id as PapierkorbeintragId, nummer: eintrag.nummer, knoten: entfernt };
  return {
    ...rahmen(z),
    knoten: { hinzugefuegt: [], geaendert, entfernt },
    summen: {
      positionen: [],
      gliederungen: [],
      gesamt: andereGesamt(s.gesamt, '2.00'),
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: s.gesamt,
        entfernt: {
          positionen: s.positionen.filter((p) => weg.has(p.positionId)),
          gliederungen: s.gliederungen.filter((g) => weg.has(g.gliederungId)),
        },
      },
    },
    ...(papierkorb === null
      ? {}
      : { papierkorb: { hinzugefuegt: [papierkorb], geaendert: [], entfernt: [] } }),
  };
}

/** Verschiebt den letzten Unterknoten von `von` an das Ende von `nach` (`KnotenVerschieben`). */
export function letztenVerschieben(z: LvZustand, von: string, nach: ElternId): LvChangeSet {
  const k = kinder(z, von).at(-1);
  if (k === undefined) throw new Error(`${von} hat keine Unterknoten`);
  return {
    ...rahmen(z),
    knoten: {
      ...LEER,
      geaendert: [{ vorher: k, nachher: { ...k, elternId: nach, reihenfolge: kinder(z, nach).length } }],
    },
    summen: { positionen: [], gliederungen: [], gesamt: null, vorher: leeresVorher() },
  };
}

/** Endgültiges Entfernen eines Papierkorbeintrags (`PapierkorbeintragEntfernen`, ohne hängende Bezüge). */
export function eintragEntfernen(z: LvZustand, e: Papierkorbeintrag): LvChangeSet {
  return {
    ...rahmen(z),
    knoten: LEER,
    summen: { positionen: [], gliederungen: [], gesamt: null, vorher: leeresVorher() },
    papierkorb: { hinzugefuegt: [], geaendert: [], entfernt: [e] },
  };
}

/** ChangeSet von `LvStandAnlegen`: nur der Kopf des Stands. */
export function standAnlegen(z: LvZustand, id: string, name: string): LvChangeSet {
  return {
    ...rahmen(z),
    knoten: LEER,
    summen: { positionen: [], gliederungen: [], gesamt: null, vorher: leeresVorher() },
    lvStand: {
      vorher: null,
      nachher: { id: id as never, leistungsverzeichnisId: z.leistungsverzeichnis.id, name },
    },
  };
}

function leeresVorher(): NonNullable<Summenaenderung['vorher']> {
  return { positionen: [], gliederungen: [], gesamt: null, entfernt: { positionen: [], gliederungen: [] } };
}

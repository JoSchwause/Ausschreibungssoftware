// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests (fast-check) für den LV-Baum (Ticket 05). Zuerst geschrieben (Q1).
//
// Zufällige Befehlsfolgen werden gegen den Kern gefahren. Das Orakel ist ein einfaches Listenmodell der
// Geschwisterlisten, unabhängig vom Index des Kerns. Geprüft wird nach jedem Befehl:
//  - angenommen: alle Invarianten (auch mit eigener, unabhängiger Prüfung), Baum = Modell, ChangeSet minimal und
//    gegen den Altzustand stimmig, Umkehrung stellt den Altzustand exakt wieder her;
//  - abgewiesen: Fehlerwert mit bekanntem Code, Zustand unverändert.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Befehlsfehlercode,
  Einfuegeort,
  Knoten,
  LvBefehl,
  LvChangeSet,
  LvZustand,
} from '@tethys/vertrag';
import {
  LOS_ANNAHME,
  MAX_GLIEDERUNGSEBENEN,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  changeSetUmkehren,
  pruefeLvInvarianten,
  summenBerechnen,
} from './index';
import {
  ohneReihenfolge,
  anwenden,
  LV_ID,
  PROJEKT_ID,
  id,
  inhalt,
  neuesLv,
  positionsdaten,
} from './testhilfen';
import type { Menge } from '@tethys/vertrag';

// --- Zufällige Aktionen -----------------------------------------------------------------------------------------

interface OrtWahl {
  readonly art: 'nach' | 'anfang' | 'ende' | 'hinter-gliederung';
  readonly ziel: number;
  readonly unbekannt: boolean;
}
type Aktion =
  | { readonly art: 'titel' | 'los' | 'hinweis'; readonly ort: OrtWahl; readonly doppelteId: boolean }
  | {
      readonly art: 'position';
      readonly ort: OrtWahl;
      readonly doppelteId: boolean;
      readonly mitMenge: boolean;
    }
  | { readonly art: 'loeschen'; readonly knoten: number; readonly unbekannt: boolean }
  | {
      readonly art: 'verschieben';
      readonly knoten: number;
      readonly ort: OrtWahl;
      readonly unbekannt: boolean;
    };

const ortArb: fc.Arbitrary<OrtWahl> = fc.record({
  art: fc.constantFrom('nach', 'anfang', 'ende', 'hinter-gliederung'),
  ziel: fc.nat(10_000),
  unbekannt: fc.integer({ min: 0, max: 24 }).map((n) => n === 0),
});
const selten = fc.integer({ min: 0, max: 19 }).map((n) => n === 0);

const aktionArb: fc.Arbitrary<Aktion> = fc.oneof(
  {
    weight: 5,
    arbitrary: fc.record({ art: fc.constant('titel' as const), ort: ortArb, doppelteId: selten }),
  },
  { weight: 1, arbitrary: fc.record({ art: fc.constant('los' as const), ort: ortArb, doppelteId: selten }) },
  {
    weight: 2,
    arbitrary: fc.record({ art: fc.constant('hinweis' as const), ort: ortArb, doppelteId: selten }),
  },
  {
    weight: 5,
    arbitrary: fc.record({
      art: fc.constant('position' as const),
      ort: ortArb,
      doppelteId: selten,
      mitMenge: fc.boolean(),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      art: fc.constant('loeschen' as const),
      knoten: fc.nat(10_000),
      unbekannt: selten,
    }),
  },
  {
    weight: 4,
    arbitrary: fc.record({
      art: fc.constant('verschieben' as const),
      knoten: fc.nat(10_000),
      ort: ortArb,
      unbekannt: selten,
    }),
  },
);

/** Übersetzt eine Aktion in einen Befehl gegen den aktuellen Zustand; neue IDs aus dem Zähler (kein Zufall im Kern). */
function befehlAus(z: LvZustand, a: Aktion, nr: number): LvBefehl {
  const knoten = z.leistungsverzeichnis.knoten;
  const alle = [LV_ID as string, ...knoten.map((k) => k.id as string)];
  const knotenId = (n: number, unbekannt: boolean): string =>
    unbekannt || knoten.length === 0 ? 'gibt-es-nicht' : (knoten[n % knoten.length]?.id ?? 'gibt-es-nicht');
  // `hinter-gliederung` (Ticket 56): meist eine Gliederung, gelegentlich ein anderer Knoten (dann abgewiesen).
  const gliederungen = knoten.filter((k) => k.art === 'los' || k.art === 'titel');
  const hinterZiel = (o: OrtWahl): string =>
    o.ziel % 5 === 0 || gliederungen.length === 0
      ? knotenId(o.ziel, o.unbekannt)
      : o.unbekannt
        ? 'gibt-es-nicht'
        : (gliederungen[o.ziel % gliederungen.length]?.id ?? 'gibt-es-nicht');
  const ort = (o: OrtWahl): Einfuegeort =>
    o.art === 'nach'
      ? { art: 'nach', knotenId: id.knoten(knotenId(o.ziel, o.unbekannt)) }
      : o.art === 'hinter-gliederung'
        ? { art: 'hinter-gliederung', gliederungId: id.titel(hinterZiel(o)) }
        : {
            art: o.art,
            elternId: id.eltern(o.unbekannt ? 'gibt-es-nicht' : (alle[o.ziel % alle.length] ?? LV_ID)),
          };
  const neueId = (doppelt: boolean): string => (doppelt && knoten[0] ? knoten[0].id : `n${String(nr)}`);
  switch (a.art) {
    case 'titel':
      return {
        art: 'GliederungAnlegen',
        id: id.titel(neueId(a.doppelteId)),
        gliederungsart: 'titel',
        ort: ort(a.ort),
        kurztext: 'T',
      };
    case 'los':
      return {
        art: 'GliederungAnlegen',
        id: id.los(neueId(a.doppelteId)),
        gliederungsart: 'los',
        ort: ort(a.ort),
        kurztext: 'L',
      };
    case 'hinweis':
      return { art: 'HinweistextAnlegen', id: id.hinweis(neueId(a.doppelteId)), ort: ort(a.ort), text: [] };
    case 'position':
      return {
        art: 'PositionAnlegen',
        id: id.pos(neueId(a.doppelteId)),
        ort: ort(a.ort),
        daten: positionsdaten('P', a.mitMenge ? { menge: '1.000' as Menge, einheit: 'm' } : {}),
      };
    case 'loeschen':
      return { art: 'KnotenLoeschen', knotenId: id.knoten(knotenId(a.knoten, a.unbekannt)) };
    case 'verschieben':
      return {
        art: 'KnotenVerschieben',
        knotenId: id.knoten(knotenId(a.knoten, a.unbekannt)),
        ziel: ort(a.ort),
      };
  }
}

// --- Orakel: Listenmodell -----------------------------------------------------------------------------------------

type Baum = Map<string, string[]>;

function baumVon(z: LvZustand): Baum {
  const b: Baum = new Map();
  const sortiert = [...z.leistungsverzeichnis.knoten].sort((x, y) => x.reihenfolge - y.reihenfolge);
  for (const k of sortiert) b.set(k.elternId, [...(b.get(k.elternId) ?? []), k.id]);
  return b;
}

const artVon = (z: LvZustand, i: string): Knoten['art'] | undefined =>
  z.leistungsverzeichnis.knoten.find((k) => k.id === i)?.art;
const elternVon = (z: LvZustand, i: string): string | undefined =>
  z.leistungsverzeichnis.knoten.find((k) => k.id === i)?.elternId;

function unterbaum(b: Baum, wurzel: string): string[] {
  return (b.get(wurzel) ?? []).flatMap((k) => [k, ...unterbaum(b, k)]);
}

/** Erwarteter Baum nach einem angenommenen Befehl: unabhängig vom Kern aus Listenoperationen. */
function erwarteterBaum(z: LvZustand, b: LvBefehl): Baum {
  const baum: Baum = new Map([...baumVon(z)].map(([k, v]) => [k, [...v]]));
  const einsetzen = (neu: string, ort: Einfuegeort): void => {
    let eltern: string;
    let index: number;
    if (ort.art === 'nach') {
      const art = artVon(z, ort.knotenId);
      if (art === 'titel' || art === 'los') {
        eltern = ort.knotenId;
        index = 0;
      } else {
        eltern = elternVon(z, ort.knotenId) ?? '';
        index = (baum.get(eltern) ?? []).indexOf(ort.knotenId) + 1;
      }
    } else if (ort.art === 'hinter-gliederung') {
      // Ticket 56: Geschwister direkt hinter der Gliederung (wie `nach` einer Position).
      eltern = elternVon(z, ort.gliederungId) ?? '';
      index = (baum.get(eltern) ?? []).indexOf(ort.gliederungId) + 1;
    } else {
      eltern = ort.elternId;
      index = ort.art === 'anfang' ? 0 : (baum.get(eltern) ?? []).length;
    }
    const liste = baum.get(eltern) ?? [];
    liste.splice(index, 0, neu);
    baum.set(eltern, liste);
  };
  switch (b.art) {
    case 'GliederungAnlegen':
    case 'PositionAnlegen':
    case 'HinweistextAnlegen':
      einsetzen(b.id, b.ort);
      break;
    case 'KnotenLoeschen': {
      const alt = elternVon(z, b.knotenId) ?? '';
      for (const g of [b.knotenId as string, ...unterbaum(baum, b.knotenId)]) baum.delete(g);
      baum.set(
        alt,
        (baum.get(alt) ?? []).filter((x) => x !== b.knotenId),
      );
      break;
    }
    case 'KnotenVerschieben': {
      const alt = elternVon(z, b.knotenId) ?? '';
      // Selbstbezug einer Position/eines Hinweistexts (`nach`) oder einer Gliederung (`hinter-gliederung`) ist eine
      // Nullbewegung.
      if (b.ziel.art === 'nach' && b.ziel.knotenId === b.knotenId) break;
      if (b.ziel.art === 'hinter-gliederung' && b.ziel.gliederungId === b.knotenId) break;
      baum.set(
        alt,
        (baum.get(alt) ?? []).filter((x) => x !== b.knotenId),
      );
      einsetzen(b.knotenId, b.ziel);
      break;
    }
    default:
      throw new Error('Nicht Teil des Modells');
  }
  for (const [k, v] of baum) if (v.length === 0) baum.delete(k);
  return baum;
}

const normal = (b: Baum): [string, string[]][] =>
  [...b].filter(([, v]) => v.length > 0).sort(([x], [y]) => (x < y ? -1 : 1));

// --- Unabhängige Invariantenprüfung (nicht `pruefeLvInvarianten`) --------------------------------------------------

function unabhaengigePruefung(z: LvZustand): string[] {
  const fehler: string[] = [];
  const knoten = z.leistungsverzeichnis.knoten;
  const byId = new Map(knoten.map((k) => [k.id as string, k]));
  if (byId.size !== knoten.length) fehler.push('IDs nicht eindeutig');
  if (byId.has(LV_ID)) fehler.push('LV-ID als Knoten-ID');
  for (const k of knoten) {
    // genau ein existierender Elternknoten: LV oder Los/Titel
    if (k.elternId !== LV_ID) {
      const e = byId.get(k.elternId);
      if (e?.art !== 'los' && e?.art !== 'titel')
        fehler.push(`Elternknoten von ${k.id} ist keine Gliederung`);
    }
    // zyklenfrei: Aufstieg endet an der Wurzel
    let tiefe = 0;
    let aktuell: Knoten | undefined = k;
    const gesehen = new Set<string>();
    while (aktuell && aktuell.elternId !== LV_ID) {
      if (gesehen.has(aktuell.id)) {
        fehler.push(`Zyklus bei ${k.id}`);
        break;
      }
      gesehen.add(aktuell.id);
      aktuell = byId.get(aktuell.elternId);
      if (aktuell && (aktuell.art === 'los' || aktuell.art === 'titel')) tiefe++;
    }
    if ((k.art === 'titel' || k.art === 'los') && tiefe + 1 > MAX_GLIEDERUNGSEBENEN)
      fehler.push(`Tiefe bei ${k.id}`);
    if (k.art === 'los' && k.elternId !== LV_ID) fehler.push(`Los ${k.id} nicht unter der Wurzel`);
  }
  // F1: Lose und Titel nicht nebeneinander auf der obersten Ebene
  const oben = new Set(knoten.filter((k) => k.elternId === LV_ID).map((k) => k.art));
  if (oben.has('los') && oben.has('titel'))
    fehler.push('Lose und Titel nebeneinander auf der obersten Ebene');
  // dichte Reihenfolge je Elternknoten
  const gruppen = new Map<string, number[]>();
  for (const k of knoten) gruppen.set(k.elternId, [...(gruppen.get(k.elternId) ?? []), k.reihenfolge]);
  for (const [e, r] of gruppen) {
    r.sort((a, b) => a - b);
    if (r.some((v, i) => v !== i)) fehler.push(`Reihenfolge unter ${e} nicht dicht: ${r.join(',')}`);
  }
  return fehler;
}

const ERLAUBTE_FEHLER: readonly Befehlsfehlercode[] = [
  'knoten-unbekannt',
  'eltern-unbekannt',
  'id-vergeben',
  'zyklus',
  'ebene-ueberschritten',
  'knotenart-unzulaessig',
];

/** Prüft die Beziehung zwischen Altzustand, ChangeSet und Neuzustand. */
function pruefeChangeSet(alt: LvZustand, cs: LvChangeSet, neu: LvZustand): void {
  const altById = new Map(alt.leistungsverzeichnis.knoten.map((k) => [k.id as string, k]));
  const neuById = new Map(neu.leistungsverzeichnis.knoten.map((k) => [k.id as string, k]));
  // Das ChangeSet beschreibt genau die Differenz der beiden Zustände.
  const hinzu = [...neuById.keys()].filter((i) => !altById.has(i)).sort();
  const weg = [...altById.keys()].filter((i) => !neuById.has(i)).sort();
  const anders = [...neuById.keys()].filter((i) => {
    const a = altById.get(i);
    return a !== undefined && JSON.stringify(a) !== JSON.stringify(neuById.get(i));
  });
  expect(cs.knoten.hinzugefuegt.map((k) => k.id as string).sort()).toEqual(hinzu);
  expect(cs.knoten.entfernt.map((k) => k.id as string).sort()).toEqual(weg);
  expect(cs.knoten.geaendert.map((g) => g.nachher.id as string).sort()).toEqual(anders.sort());
  for (const g of cs.knoten.geaendert) {
    expect(g.vorher).toEqual(altById.get(g.vorher.id));
    expect(g.vorher).not.toEqual(g.nachher);
    expect(g.nachher.id).toBe(g.vorher.id);
  }
  for (const k of cs.knoten.entfernt) expect(k).toEqual(altById.get(k.id));
  // Eltern vor Kindern in hinzugefuegt und entfernt.
  for (const liste of [cs.knoten.hinzugefuegt, cs.knoten.entfernt]) {
    const gesehen = new Set<string>();
    const ids = new Set(liste.map((k) => k.id as string));
    for (const k of liste) {
      if (ids.has(k.elternId)) expect(gesehen.has(k.elternId)).toBe(true);
      gesehen.add(k.id);
    }
  }
  // Summen (Ticket 07): hier haben alle Positionen höchstens eine Menge, nie einen EP; Summen ändern sich nicht.
  // Neue Positionen und Gliederungen stehen mit ihrem Eintrag im ChangeSet, sonst nichts (Details: `summen-*.test.ts`).
  expect(cs.summen.gesamt).toBeNull();
  expect(cs.summen.positionen.map((p) => p.positionId as string).sort()).toEqual(
    cs.knoten.hinzugefuegt
      .filter((k) => k.art === 'position')
      .map((k) => k.id as string)
      .sort(),
  );
  expect(cs.summen.gliederungen.map((g) => g.gliederungId as string).sort()).toEqual(
    cs.knoten.hinzugefuegt
      .filter((k) => k.art === 'titel' || k.art === 'los')
      .map((k) => k.id as string)
      .sort(),
  );
  expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
  expect(cs.kopf).toBeNull();
}

// --- Eigenschaften ---------------------------------------------------------------------------------------------------

const folgeArb = fc.array(aktionArb, { minLength: 10, maxLength: 80 });

describe('Befehlsfolgen auf dem LV-Baum', () => {
  it('jeder angenommene Befehl erhält alle Invarianten, ChangeSet und Umkehrung stimmen; jeder abgewiesene ändert nichts', () => {
    const statistik = { angenommen: 0, abgewiesen: 0, los: 0, verschoben: 0, geloescht: 0, hinter: 0 };
    fc.assert(
      fc.property(folgeArb, (folge) => {
        let z = neuesLv();
        folge.forEach((aktion, nr) => {
          const befehl = befehlAus(z, aktion, nr);
          const vorher = structuredClone(z);
          const e = lvBefehlAusfuehren(z, befehl);
          expect(z).toEqual(vorher); // reine Funktion
          expect(lvBefehlAusfuehren(z, befehl)).toEqual(e); // deterministisch
          if (!e.ok) {
            statistik.abgewiesen++;
            expect(ERLAUBTE_FEHLER).toContain(e.fehler.code);
            return;
          }
          statistik.angenommen++;
          if (befehl.art === 'KnotenVerschieben') statistik.verschoben++;
          if (befehl.art === 'KnotenLoeschen') statistik.geloescht++;
          if (befehl.art === 'GliederungAnlegen' && befehl.gliederungsart === 'los') statistik.los++;
          if (
            ('ort' in befehl ? befehl.ort : 'ziel' in befehl ? befehl.ziel : null)?.art ===
            'hinter-gliederung'
          )
            statistik.hinter++;
          const neu = anwenden(z, e.wert);
          expect(unabhaengigePruefung(neu)).toEqual([]);
          expect(pruefeLvInvarianten(neu.leistungsverzeichnis)).toEqual([]);
          expect(normal(baumVon(neu))).toEqual(normal(erwarteterBaum(z, befehl)));
          pruefeChangeSet(z, e.wert, neu);
          // v1.1a: jedes ChangeSet trägt die alten Summen; die Umkehrung kennt den Vorzustand nicht.
          expect(e.wert.summen.vorher).toBeDefined();
          // Undo: Umkehrung stellt exakt wieder her (auch die Reihenfolge im flachen Array), und umgekehrt noch einmal.
          expect(anwenden(neu, changeSetUmkehren(e.wert))).toEqual(z);
          expect(ohneReihenfolge(changeSetUmkehren(changeSetUmkehren(e.wert)))).toEqual(
            ohneReihenfolge(e.wert),
          );
          z = neu;
        });
      }),
      { numRuns: 300 },
    );
    // Der Test ist nicht leer: alle Befehlsarten kommen angenommen und abgewiesen oft genug vor.
    expect(statistik.angenommen).toBeGreaterThan(1000);
    expect(statistik.abgewiesen).toBeGreaterThan(100);
    expect(statistik.verschoben).toBeGreaterThan(100);
    expect(statistik.geloescht).toBeGreaterThan(50);
    expect(statistik.los).toBeGreaterThan(20);
    expect(statistik.hinter).toBeGreaterThan(100);
    console.info('[kern/05] Property-Statistik', JSON.stringify(statistik));
  });

  it('die Folge der ChangeSets lässt sich vollständig zurückspielen (Undo über viele Schritte)', () => {
    fc.assert(
      fc.property(folgeArb, (folge) => {
        let z = neuesLv();
        const start = z;
        const verlauf: LvChangeSet[] = [];
        folge.forEach((aktion, nr) => {
          const e = lvBefehlAusfuehren(z, befehlAus(z, aktion, nr));
          if (!e.ok) return;
          verlauf.push(e.wert);
          z = anwenden(z, e.wert);
        });
        // Löschen des ganzen LV (v1.1a): Anwenden ergibt null, die Umkehrung auf null das LV samt Summen.
        const loeschen = lvBefehlAusfuehren(z, { art: 'LeistungsverzeichnisLoeschen' });
        if (!loeschen.ok) throw new Error('LeistungsverzeichnisLoeschen abgewiesen');
        expect(lvChangeSetAnwenden(z, loeschen.wert)).toBeNull();
        expect(lvChangeSetAnwenden(null, changeSetUmkehren(loeschen.wert))).toEqual(z);
        for (const cs of verlauf.reverse()) z = anwenden(z, changeSetUmkehren(cs));
        expect(z).toEqual(start);
      }),
      { numRuns: 150 },
    );
  });

  it('Befehle mit beliebigen Zeichenketten als Kennungen werfen nie, sondern liefern einen Ergebniswert', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.constantFrom('nach', 'anfang', 'ende'), (a, b, art) => {
        const z = neuesLv();
        const ort: Einfuegeort =
          art === 'nach' ? { art, knotenId: id.knoten(b) } : { art, elternId: id.eltern(b) };
        for (const befehl of [
          { art: 'PositionAnlegen', id: id.pos(a), ort, daten: positionsdaten('x') },
          { art: 'KnotenVerschieben', knotenId: id.knoten(a), ziel: ort },
          { art: 'KnotenLoeschen', knotenId: id.knoten(a) },
        ] as const) {
          const e = lvBefehlAusfuehren(z, befehl);
          expect(typeof e.ok).toBe('boolean');
        }
      }),
    );
  });

  it('LeistungsverzeichnisAnlegen: ein beliebig umsortiert angeliefertes LV ergibt denselben Zustand', () => {
    fc.assert(
      fc.property(folgeArb, fc.infiniteStream(fc.nat(1000)), (folge, zufall) => {
        let z = neuesLv();
        folge.forEach((aktion, nr) => {
          const e = lvBefehlAusfuehren(z, befehlAus(z, aktion, nr));
          if (e.ok) z = anwenden(z, e.wert);
        });
        // Fisher-Yates mit den vom Property gelieferten Zahlen
        const mischung = [...z.leistungsverzeichnis.knoten];
        const it = zufall[Symbol.iterator]();
        for (let i = mischung.length - 1; i > 0; i--) {
          const j = it.next().value % (i + 1);
          [mischung[i], mischung[j]] = [mischung[j] as Knoten, mischung[i] as Knoten];
        }
        const neu = lvBefehlAusfuehren(null, {
          art: 'LeistungsverzeichnisAnlegen',
          id: LV_ID,
          projektId: PROJEKT_ID,
          inhalt: inhalt(mischung),
        });
        expect(neu.ok).toBe(true);
        if (neu.ok) expect(anwenden(null, neu.wert)).toEqual(z);
      }),
      { numRuns: 150 },
    );
  });
});

describe('vorläufige Annahme zum Los ist an einer Stelle gebündelt', () => {
  it('ist als offen gekennzeichnet', () => {
    expect(LOS_ANNAHME).toMatchObject({
      status: 'vorläufige Annahme, Entscheidung offen',
      zaehltAlsEbene: true,
      nurUnterWurzel: true,
    });
  });
});

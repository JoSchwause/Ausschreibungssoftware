// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudgets als Test (Q4, D-54; Ticket 105), gemessen wie die übrigen Budgets des Kerns: warm, Median über 40 Läufe,
// `performance.now()` um Befehl und Anwenden.
//  - `BauteileZuordnen` an einer Position mit 5.000 Zuordnungen samt Undo (ausführen, anwenden, umkehren, anwenden)
//    ≤ 100 ms, im LV `gross` (5.000 Positionen) und im Auftrags-LV daraus.
//  - Eine Einzeländerung im LV `gross` mit Zuordnungen an 1.000 Positionen bleibt im Budget (< 16 ms): `MengeAendern` und
//    `BauteileZuordnen` mit zehn Zuordnungen.
// Das Budget wird nicht aufgeweicht; die Messwerte stehen im Ticket.

import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvZustand,
  Bauteilzuordnung,
  IfcGlobalId,
  Knoten,
  LeistungsverzeichnisId,
  LvBefehl,
  LvZustand,
  Menge,
  Position,
} from '@tethys/vertrag';
import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  auftragsLvChangeSetUmkehren,
  changeSetUmkehren,
  lvBefehlAusfuehren,
  summenBerechnen,
} from './index';
import { PROJEKT_ID, anwenden, erwarteOk, fixtureAlsInhalt, fixtureLesen, id } from './testhilfen';

const BUDGET_ZUORDNEN_MS = 100;
const BUDGET_EINZEL_MS = 16;
const LAEUFE = 40;
const WARMLAUF = 5;

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

/** Eine GlobalId in Form aus einer Nummer (Basis 36, links mit `0` aufgefüllt, 22 Zeichen). */
const gid = (nr: number): IfcGlobalId => nr.toString(36).padStart(22, '0') as IfcGlobalId;

/** `anzahl` Zuordnungen ab Nummer `start`, alle mit der Mengenart `mengenart`. */
const zuordnungen = (start: number, anzahl: number, mengenart: string): readonly Bauteilzuordnung[] =>
  Array.from({ length: anzahl }, (_, i) => ({ globalId: gid(start + i), mengenart }));

/** Die Knoten von `fixtures/gross`; die ersten `mit` Positionen tragen je zehn Zuordnungen. */
function grossKnoten(mit: number): { knoten: Knoten[]; positionen: Position[] } {
  const inh = fixtureAlsInhalt(fixtureLesen('gross'));
  let n = 0;
  const knoten = inh.knoten.map((k): Knoten => {
    if (k.art !== 'position' || n >= mit) return k;
    n++;
    return { ...k, bauteile: zuordnungen(n * 10, 10, 'NetVolume') };
  });
  const positionen = knoten.filter((k): k is Position => k.art === 'position');
  return { knoten, positionen };
}

function grossLv(mit: number): { z: LvZustand; positionen: Position[] } {
  const fx = fixtureLesen('gross');
  const inh = fixtureAlsInhalt(fx);
  const { knoten, positionen } = grossKnoten(mit);
  const z = anwenden(
    null,
    erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: fx.id as LeistungsverzeichnisId,
        projektId: PROJEKT_ID,
        inhalt: { ...inh, knoten },
      }),
    ),
  );
  return { z, positionen };
}

function bericht(name: string, werte: readonly number[]): number {
  const median = mitte(werte);
  console.info(
    `[kern/105] ${name} (${String(werte.length)} Läufe): Median ${median.toFixed(2)} ms, ` +
      `schlechtester ${Math.max(...werte).toFixed(2)} ms`,
  );
  return median;
}

const A = zuordnungen(1_000_000, 5_000, 'NetVolume');
const B = zuordnungen(2_000_000, 5_000, 'NetArea');

describe('Leistungsbudget BauteileZuordnen (Q4, D-54)', () => {
  it(`LV gross: 5.000 Zuordnungen an einer Position samt Undo, warm, Median ≤ ${String(BUDGET_ZUORDNEN_MS)} ms`, () => {
    const { z: start, positionen } = grossLv(0);
    const ziel = positionen[2500];
    if (ziel === undefined) throw new Error('Fixture zu klein');
    let z = start;
    const werte: number[] = [];
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const befehl: LvBefehl = {
        art: 'BauteileZuordnen',
        positionId: id.pos(ziel.id),
        bauteile: i % 2 ? B : A,
      };
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      const neu = anwenden(z, cs);
      const zurueck = anwenden(neu, changeSetUmkehren(cs));
      const t1 = performance.now();
      expect(cs.knoten.geaendert).toHaveLength(1);
      if (i === 0) expect(zurueck).toEqual(z); // einmal genügt; der Vergleich von 5.000 Knoten zählt nicht zur Messung
      z = neu;
      if (i >= WARMLAUF) werte.push(t1 - t0);
    }
    const p = z.leistungsverzeichnis.knoten.find((k) => k.id === ziel.id);
    expect(p?.art === 'position' && p.bauteile).toHaveLength(5_000);
    expect(bericht('gross, BauteileZuordnen 5.000 samt Undo', werte)).toBeLessThanOrEqual(BUDGET_ZUORDNEN_MS);
  });

  it(`Auftrags-LV aus gross: 5.000 Zuordnungen an einer Position samt Undo, warm, Median ≤ ${String(BUDGET_ZUORDNEN_MS)} ms`, () => {
    const inh = fixtureAlsInhalt(fixtureLesen('gross'));
    const aid = 'auftrags-lv-gross' as AuftragsLeistungsverzeichnisId;
    const anlegen = erwarteOk(
      auftragsLvBefehlAusfuehren(null, {
        art: 'AuftragsLeistungsverzeichnisAnlegen',
        auftragsLeistungsverzeichnis: {
          name: inh.name,
          ozMaske: inh.ozMaske,
          mwstSatz: inh.mwstSatz,
          nachlass: inh.nachlass,
          id: aid,
          projektId: PROJEKT_ID,
          leistungsverzeichnisId: 'lv-gross' as LeistungsverzeichnisId,
          angebotId: 'angebot-gross' as AngebotId,
          knoten: inh.knoten.map((k) =>
            k.elternId === inh.wurzelId ? { ...k, elternId: id.eltern(aid) } : k,
          ),
        },
      }),
    );
    let z: AuftragsLvZustand | null = auftragsLvChangeSetAnwenden(null, anlegen);
    const ziel = z?.auftragsLeistungsverzeichnis.knoten.filter((k) => k.art === 'position')[2500];
    if (z === null || ziel === undefined) throw new Error('kein Auftrags-LV');
    const werte: number[] = [];
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const befehl: AuftragsLvBefehl = {
        art: 'BauteileZuordnen',
        positionId: id.pos(ziel.id),
        bauteile: i % 2 ? B : A,
      };
      const t0 = performance.now();
      const cs = erwarteOk(auftragsLvBefehlAusfuehren(z, befehl));
      const neu: AuftragsLvZustand | null = auftragsLvChangeSetAnwenden(z, cs);
      const zurueck = auftragsLvChangeSetAnwenden(neu, auftragsLvChangeSetUmkehren(cs));
      const t1 = performance.now();
      if (i === 0) expect(zurueck).toEqual(z);
      z = neu;
      if (z === null) throw new Error('Auftrags-LV verschwunden');
      if (i >= WARMLAUF) werte.push(t1 - t0);
    }
    expect(bericht('Auftrags-LV gross, BauteileZuordnen 5.000 samt Undo', werte)).toBeLessThanOrEqual(
      BUDGET_ZUORDNEN_MS,
    );
  });
});

describe('Leistungsbudget Einzeländerung mit Zuordnungen an 1.000 Positionen (Q4, D-54)', () => {
  const { z: start, positionen } = grossLv(1_000);

  it('die Fixture trägt Zuordnungen an 1.000 Positionen', () => {
    const mit = start.leistungsverzeichnis.knoten.filter(
      (k) => k.art === 'position' && k.bauteile !== undefined,
    );
    expect(mit).toHaveLength(1_000);
  });

  it(`MengeAendern: ausführen + anwenden, warm, Median unter ${String(BUDGET_EINZEL_MS)} ms`, () => {
    const ziel = positionen.filter((p) => p.einheitspreis !== null && p.einheitspreis !== '0.000')[2500];
    if (ziel === undefined) throw new Error('Fixture zu klein');
    let z = start;
    const werte: number[] = [];
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const befehl: LvBefehl = {
        art: 'MengeAendern',
        positionId: id.pos(ziel.id),
        menge: `${String(100 + i)}.000` as Menge,
      };
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      z = anwenden(z, cs);
      const t1 = performance.now();
      if (i >= WARMLAUF) werte.push(t1 - t0);
    }
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
    expect(bericht('gross mit 1.000 zugeordneten Positionen, MengeAendern', werte)).toBeLessThan(
      BUDGET_EINZEL_MS,
    );
  });

  it(`BauteileZuordnen mit zehn Zuordnungen: ausführen + anwenden, warm, Median unter ${String(BUDGET_EINZEL_MS)} ms`, () => {
    const ziel = positionen[500];
    if (ziel === undefined) throw new Error('Fixture zu klein');
    let z = start;
    const werte: number[] = [];
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const befehl: LvBefehl = {
        art: 'BauteileZuordnen',
        positionId: id.pos(ziel.id),
        bauteile: zuordnungen(3_000_000 + i * 10, 10, 'Length'),
      };
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      z = anwenden(z, cs);
      const t1 = performance.now();
      expect(cs.knoten.geaendert).toHaveLength(1);
      if (i >= WARMLAUF) werte.push(t1 - t0);
    }
    expect(bericht('gross mit 1.000 zugeordneten Positionen, BauteileZuordnen 10', werte)).toBeLessThan(
      BUDGET_EINZEL_MS,
    );
  });
});

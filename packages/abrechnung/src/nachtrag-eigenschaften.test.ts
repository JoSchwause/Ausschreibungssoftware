// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Test `nachtragUebernehmen` (Ticket 80, Q1): Für beliebige kleine Auftrags-LVs und Nachtrags-LVs (Titel oder Lose,
// Hinweistexte, Alternativen, Zuschlagspositionen, Preise angeboten, nicht angeboten oder ohne Eintrag) ist das Ergebnis ein
// Befehl, den der Kern annimmt: die Baumregeln (`baumfehler`) gelten für den Baum danach, F1 auf der obersten Ebene, jede
// Kennung des Nachtrags außer den Alternativen genau einmal, unter genau einer neuen Gliederung am Ende. Sobald Ticket 71
// gemergt ist, führt der Kern den Befehl zusätzlich aus (`kernAusfuehrung`).

import fc from 'fast-check';
import { baumfehler, summenBerechnen } from '@tethys/kern';
import type {
  Angebotsposition,
  BieterId,
  Knoten,
  LosId,
  OzMaske,
  PositionId,
  Prozent,
  TitelId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { istAlternative, nachtragUebernehmen } from './nachtrag-uebernehmen';
import {
  MASKE_5,
  PROJEKT,
  angebot,
  auftragsLv,
  ep,
  erwarteOk,
  hinweis,
  kernAusfuehrung,
  los,
  lvZustand,
  nichtAngeboten,
  position,
  satz,
  titel,
  zuschlagsposition,
} from './testhilfen';

/** Ein Knoten des Bauplans: Art, Wahl des Elternknotens unter den möglichen, Preis im Angebot. */
interface Bauteil {
  readonly art: 'gliederung' | 'hinweis' | 'position' | 'alternative' | 'zuschlag';
  readonly eltern: number;
  readonly preis: 'angeboten' | 'nicht-angeboten' | 'fehlt';
  readonly menge: number;
}

const bauteil: fc.Arbitrary<Bauteil> = fc.record({
  art: fc.constantFrom(
    'gliederung',
    'gliederung',
    'hinweis',
    'position',
    'position',
    'alternative',
    'zuschlag',
  ),
  eltern: fc.nat(50),
  preis: fc.constantFrom('angeboten', 'angeboten', 'nicht-angeboten', 'fehlt'),
  menge: fc.integer({ min: 1, max: 9999 }),
});

/**
 * Baut einen Baum unter `wurzel` aus dem Plan: Gliederungen höchstens `tiefe` Ebenen, die der obersten Ebene als Los
 * (`lose`) oder Titel; Alternativen verweisen auf die vorige Position, Zuschlagspositionen auf die zwei vorigen (auch auf
 * Alternativen, deren Bezug dann entfernt wird).
 */
function baum(
  wurzel: string,
  praefix: string,
  plan: readonly Bauteil[],
  tiefe: number,
  lose: boolean,
): { knoten: Knoten[]; preise: Angebotsposition[] } {
  const knoten: Knoten[] = [];
  const preise: Angebotsposition[] = [];
  const eltern: { id: string; ebene: number }[] = [{ id: wurzel, ebene: 0 }];
  const anzahl = new Map<string, number>();
  const basis: string[] = [];
  plan.forEach((t, i) => {
    const kandidaten = t.art === 'gliederung' ? eltern.filter((e) => e.ebene < tiefe) : eltern;
    const e = kandidaten[t.eltern % kandidaten.length] ?? { id: wurzel, ebene: 0 };
    const r = anzahl.get(e.id) ?? 0;
    anzahl.set(e.id, r + 1);
    const id = `${praefix}${String(i)}`;
    const menge = `${String(t.menge)}.000`;
    if (t.art === 'gliederung') {
      knoten.push(e.id === wurzel && lose ? los(id, e.id, r) : titel(id, e.id, r));
      eltern.push({ id, ebene: e.ebene + 1 });
      return;
    }
    if (t.art === 'hinweis') {
      knoten.push(hinweis(id, e.id, r));
      return;
    }
    if (t.art === 'zuschlag') {
      knoten.push(zuschlagsposition(id, e.id, r, null, basis.slice(-2), '5.00'));
      if (t.preis !== 'fehlt') preise.push(t.preis === 'angeboten' ? satz(id, '6.50') : nichtAngeboten(id));
      return;
    }
    const grund = basis.at(-1);
    const wahl =
      t.art === 'alternative'
        ? { wahl: { gruppe: null, variante: null, grundpositionId: (grund ?? null) as PositionId | null } }
        : {};
    knoten.push(position(id, e.id, r, null, menge, '1.000', wahl));
    basis.push(id);
    if (t.preis !== 'fehlt')
      preise.push(t.preis === 'angeboten' ? ep(id, `${String(t.menge % 97)}.125`) : nichtAngeboten(id));
  });
  return { knoten, preise };
}

const MASKE: OzMaske = MASKE_5;

describe('nachtragUebernehmen: Eigenschaften', () => {
  it('der Kern nimmt jedes Ergebnis an; jede Kennung außer den Alternativen genau einmal unter der neuen Gliederung', () => {
    fc.assert(
      fc.property(
        fc.array(bauteil, { maxLength: 12 }),
        fc.array(bauteil, { maxLength: 14 }),
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 1, max: 4 }),
        (auftragsplan, nachtragsplan, auftragLose, nachtragLose, tiefe) => {
          const auftrag = baum('auftrag', 'a', auftragsplan, 5, auftragLose);
          const al = auftragsLv('auftrag', auftrag.knoten, { maske: MASKE });
          const nachtrag = baum('nlv', 'n', nachtragsplan, tiefe, nachtragLose);
          const nlv = lvZustand(
            'nlv',
            {
              name: 'N',
              ozMaske: MASKE,
              mwstSatz: '19.00' as Prozent,
              nachlass: null,
              knoten: nachtrag.knoten,
            },
            PROJEKT,
            { auftragsLvId: al.auftragsLeistungsverzeichnis.id, nummer: 'N01', status: 'angeboten' },
          );
          const an = angebot('na', nlv, 'bieter', nachtrag.preise);
          const aa = { id: al.auftragsLeistungsverzeichnis.angebotId, bieterId: 'bieter' as BieterId };
          const ids = { los: () => 'neu' as LosId, titel: () => 'neu' as TitelId };
          const { befehl } = erwarteOk(nachtragUebernehmen(al, nlv, an, aa, ids));

          const a = al.auftragsLeistungsverzeichnis;
          const danach = [...a.knoten, ...befehl.knoten];
          expect(baumfehler(a.id, danach)).toEqual([]);
          const oben = danach.filter((k) => k.elternId === a.id).map((k) => k.art);
          expect(oben.includes('los') && oben.includes('titel')).toBe(false);

          const [kopf, ...rest] = befehl.knoten;
          expect(kopf).toMatchObject({
            elternId: a.id,
            reihenfolge: a.knoten.filter((k) => k.elternId === a.id).length,
          });
          const erwartet = nlv.leistungsverzeichnis.knoten.filter((k) => !istAlternative(k)).map((k) => k.id);
          expect(rest.map((k) => k.id).sort()).toEqual([...erwartet].sort());
          const drin = new Set<string>(befehl.knoten.map((k) => k.id));
          for (const k of rest) expect(drin.has(k.elternId)).toBe(true);

          summenBerechnen({ id: a.id, knoten: danach, nachlass: a.nachlass, mwstSatz: a.mwstSatz });
          const cs = kernAusfuehrung(al, befehl);
          if (cs !== null) expect(cs.knoten.hinzugefuegt).toHaveLength(befehl.knoten.length);
        },
      ),
      { numRuns: 150 },
    );
  });
});

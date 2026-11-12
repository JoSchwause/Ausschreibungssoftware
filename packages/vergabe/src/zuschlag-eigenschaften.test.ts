// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Test (Ticket 59, Q1): zufällige LVs mit Wahlgruppen beider Formen, Bedarf und Zuschlagspositionen, zufällige
// Angebote mit Lücken, zufällige Wahl. Der Kern nimmt jeden Befehl an; das Auftrags-LV hat nur Knoten des LV mit
// unveränderten Kennungen, keine Alternative mehr, und ohne Wahl dieselben Summen wie das Angebot.

import fc from 'fast-check';
import { auftragsLvBefehlAusfuehren } from '@tethys/kern';
import type {
  Angebotsposition,
  AuftragsLeistungsverzeichnisId,
  Knoten,
  Nachlass,
  PositionId,
  Positionsmerkmale,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { angebotSummenBerechnen, zuschlagErteilen } from './index';
import {
  angebot,
  ep,
  erwarteOk,
  liste,
  lv,
  nichtAngeboten,
  position,
  projekt,
  prozent,
  satz,
  titel,
  zuschlagsposition,
} from './testhilfen';

const ELTERN = ['lv-e', 't1', 't11', 't2'] as const;
type Art =
  | { art: 'normal' }
  | { art: 'bedarf'; mit: boolean }
  | { art: 'wahl-verweis'; ziel: number; variante: 0 | null }
  | { art: 'wahl-gruppe'; gruppe: number; variante: number; ziel: number | null }
  | { art: 'zuschlag'; ziele: number[]; satz: string | null };

const satzText = fc.integer({ min: 0, max: 2_000 }).map((n) => (n / 100).toFixed(2));
const epText = fc.integer({ min: 0, max: 500_000 }).map((n) => (n / 1000).toFixed(3));
const mengeText = fc.integer({ min: 0, max: 50_000 }).map((n) => (n / 1000).toFixed(3));

const art: fc.Arbitrary<Art> = fc.oneof(
  { weight: 4, arbitrary: fc.constant<Art>({ art: 'normal' }) },
  { weight: 1, arbitrary: fc.boolean().map((mit): Art => ({ art: 'bedarf', mit })) },
  {
    weight: 3,
    arbitrary: fc
      .tuple(fc.nat(), fc.constantFrom<0 | null>(null, null, 0))
      .map(([ziel, variante]): Art => ({ art: 'wahl-verweis', ziel, variante })),
  },
  {
    weight: 3,
    arbitrary: fc
      .tuple(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 0, max: 3 }),
        fc.option(fc.nat(), { nil: null }),
      )
      .map(([gruppe, variante, ziel]): Art => ({ art: 'wahl-gruppe', gruppe, variante, ziel })),
  },
  {
    weight: 2,
    arbitrary: fc
      .tuple(fc.array(fc.nat(), { maxLength: 4 }), fc.option(satzText, { nil: null }))
      .map(([ziele, s]): Art => ({ art: 'zuschlag', ziele, satz: s })),
  },
);

interface Zeile {
  readonly art: Art;
  readonly eltern: (typeof ELTERN)[number];
  readonly menge: string;
  readonly ep: string;
  /** 0 angeboten, 1 nicht angeboten, 2 ohne Eintrag; an einer Zuschlagsposition 3: angeboten ohne Satz. */
  readonly preis: number;
  readonly bieterEp: string;
  readonly bieterSatz: string;
}

const zeile: fc.Arbitrary<Zeile> = fc.record({
  art,
  eltern: fc.constantFrom(...ELTERN),
  menge: mengeText,
  ep: epText,
  preis: fc.constantFrom(0, 0, 0, 0, 1, 2, 3),
  bieterEp: epText,
  bieterSatz: satzText,
});

function baue(zeilen: readonly Zeile[]): { knoten: Knoten[]; positionen: Angebotsposition[] } {
  const ids = zeilen.map((_, i) => `p${String(i)}`);
  const zuschlag = new Set(zeilen.flatMap((z, i) => (z.art.art === 'zuschlag' ? [ids[i] ?? ''] : [])));
  const anderes = (i: number, n: number): string | null => {
    if (ids.length < 2) return null;
    const j = n % ids.length;
    return ids[j === i ? (j + 1) % ids.length : j] ?? null;
  };
  const reihenfolge = new Map<string, number>([
    ['lv-e', 2],
    ['t1', 1],
  ]);
  const naechste = (e: string): number => {
    const r = reihenfolge.get(e) ?? 0;
    reihenfolge.set(e, r + 1);
    return r;
  };
  const knoten: Knoten[] = [titel('t1', 'lv-e', 0), titel('t11', 't1', 0), titel('t2', 'lv-e', 1)];
  const positionen: Angebotsposition[] = [];
  zeilen.forEach((z, i) => {
    const id = ids[i] ?? '';
    const r = naechste(z.eltern);
    const a = z.art;
    if (a.art === 'zuschlag') {
      const ziele = [
        ...new Set(
          a.ziele.map((n) => anderes(i, n)).filter((x): x is string => x !== null && !zuschlag.has(x)),
        ),
      ];
      knoten.push(zuschlagsposition(id, z.eltern, r, liste(...ziele), a.satz));
      if (z.preis === 0) positionen.push(satz(id, z.bieterSatz));
      if (z.preis === 3) positionen.push(ep(id, z.bieterEp));
    } else {
      let merkmale: Partial<Positionsmerkmale> = {};
      if (a.art === 'bedarf') merkmale = { bedarf: a.mit ? 'mit-gesamtbetrag' : 'ohne-gesamtbetrag' };
      if (a.art === 'wahl-verweis')
        merkmale = {
          wahl: {
            gruppe: null,
            variante: a.variante,
            grundpositionId: anderes(i, a.ziel) as PositionId | null,
          },
        };
      if (a.art === 'wahl-gruppe')
        merkmale = {
          wahl: {
            gruppe: a.gruppe,
            variante: a.variante,
            grundpositionId: (a.ziel === null ? null : anderes(i, a.ziel)) as PositionId | null,
          },
        };
      knoten.push(position(id, z.eltern, r, z.menge, z.ep, merkmale));
      if (z.preis === 0 || z.preis === 3) positionen.push(ep(id, z.bieterEp));
    }
    if (z.preis === 1) positionen.push(nichtAngeboten(id));
  });
  return { knoten, positionen };
}

const nachlass: fc.Arbitrary<Nachlass | null> = fc.option(
  fc.integer({ min: 0, max: 1_000 }).map((n) => prozent((n / 100).toFixed(2))),
  { nil: null },
);

const NEUE_ID = 'auftrag' as AuftragsLeistungsverzeichnisId;

describe('Eigenschaften von zuschlagErteilen', () => {
  it('Kern nimmt an; Knoten ⊆ LV mit gleichen IDs; keine Alternative; ohne Wahl Summen wie das Angebot', () => {
    fc.assert(
      fc.property(
        fc.array(zeile, { minLength: 1, maxLength: 14 }),
        nachlass,
        fc.array(fc.nat(), { maxLength: 3 }),
        (zeilen, n, wahlIndizes) => {
          const { knoten, positionen } = baue(zeilen);
          const z = lv('lv-e', knoten);
          const a = angebot('a', z, 'b', positionen, n);
          const gewaehlt = new Set(wahlIndizes.map((w) => `p${String(w % zeilen.length)}` as PositionId));
          const e = zuschlagErteilen(z, a, projekt(['b']), gewaehlt, NEUE_ID);
          if (!e.ok) {
            // Nur die Wahl kann scheitern (Punkt 4).
            expect(gewaehlt.size).toBeGreaterThan(0);
            expect(e.fehler).toMatchObject({ code: 'ungueltige-eingabe', feld: 'gewaehlt' });
            return;
          }
          const { befehl, warnungen } = e.wert;
          const cs = erwarteOk(auftragsLvBefehlAusfuehren(null, befehl));
          const lvKnoten = new Map(z.leistungsverzeichnis.knoten.map((k) => [k.id as string, k]));
          const auftrag = befehl.auftragsLeistungsverzeichnis.knoten;
          for (const k of auftrag) {
            const vorher = lvKnoten.get(k.id);
            expect(vorher?.art).toBe(k.art);
            if (k.art === 'position') {
              expect(k.merkmale.wahl === null || k.merkmale.wahl.variante === 0).toBe(true);
              if (gewaehlt.has(k.id)) expect(k.merkmale.wahl).toBeNull();
            }
          }
          // Gliederungen bleiben alle, gewählte Positionen stehen im Auftrags-LV.
          const imAuftrag = new Set(auftrag.map((k) => k.id as string));
          for (const id of ['t1', 't11', 't2', ...gewaehlt]) expect(imAuftrag.has(id)).toBe(true);
          const entfallen = z.leistungsverzeichnis.knoten.length - auftrag.length;
          const zahl = warnungen.find((w) => w.code === 'positionen-entfallen');
          expect(zahl?.anzahl ?? 0).toBe(entfallen);
          expect(cs.summen.gesamt?.summeWahl).toBe('0.00');
          if (gewaehlt.size === 0) {
            const angebotsSummen = angebotSummenBerechnen(z, a).gesamt;
            expect(cs.summen.gesamt).toEqual({ ...angebotsSummen, summeWahl: '0.00' });
          }
        },
      ),
      { numRuns: 400 },
    );
  });
});

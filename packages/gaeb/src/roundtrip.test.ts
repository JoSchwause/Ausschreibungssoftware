// SPDX-License-Identifier: AGPL-3.0-or-later
// Roundtrip Export → Import → Modell (Q3, Ticket 40, D-18): für jede Fixture und jede Phase und für die Inhalte, die
// der Leser aus den amtlichen 3.3-Dateien X81/X83 liest. Seams: `schreibeGaeb` und `leseGaeb`.
//
// Verglichen wird das Ausgangsmodell mit normierten Kennungen (zählende IdQuelle in Dokumentreihenfolge, wie der
// Leser sie vergibt) gegen das wieder gelesene Modell, und zwar ganz: Erlaubt ist nur, was die Phase nicht trägt
// (`phasenform`), und die ausdrücklich gelisteten Unterschiede je Fixture und Position
// (`testdaten/roundtrip-unterschiede.json`). Jeder andere Unterschied lässt den Test scheitern, ebenso ein gelisteter, der
// nicht (mehr) eintritt. Der zweite Export des wieder gelesenen Modells ist byte-gleich dem ersten. M2 gilt damit als
// „erfüllt mit gelisteten Unterschieden“ (D-18); die Fixture-Umstellung auf die GAEB-Form leert die Liste (Ticket 51).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LvInhalt, Position } from '@tethys/vertrag';
import { leseGaeb, schreibeGaeb } from './index';
import type { ExportPhase, ExportVersion } from './index';
import {
  AMTLICH_LESBAR,
  FIXTURES,
  amtlichLv,
  exportOptionen,
  fixtureLv,
  normiereKennungen,
  testIds,
} from './testhilfen';
import type { FixtureName, Normiert } from './testhilfen';

/**
 * Ein erwarteter Unterschied an einer Position, benannt über ihre OZ mit Index:
 * - `altform-zuschlag`: Zuschlagsposition in der Altform (Menge × EP ohne Satz, D-10). X81/X83 schreiben sie als
 *   `MarkupItem` ohne Menge, Einheit und EP; X86 als Position ohne Zuschlagsbezug (Ticket 40, Punkt 4).
 * - `wahl-nummer-kuenstlich`: Wahlposition ohne Gruppe und Variante (aus v1). Der Writer vergibt diese Nummern (D-16);
 *   die Grundposition kennt sie danach nicht mehr (GAEB kennt nur die Nummern, eine Variante 0 gibt es nicht).
 */
type Unterschied =
  | { readonly oz: string; readonly art: 'altform-zuschlag' }
  | {
      readonly oz: string;
      readonly art: 'wahl-nummer-kuenstlich';
      readonly gruppe: number;
      readonly variante: number;
    };

const UNTERSCHIEDE = JSON.parse(
  readFileSync(new URL('../testdaten/roundtrip-unterschiede.json', import.meta.url), 'utf8'),
) as Readonly<Record<FixtureName, readonly Unterschied[]>>;

const ozVon = (p: Position): string => `${p.ordnungszahl ?? ''}${p.ozIndex ?? ''}`;

/**
 * Was die Phase überhaupt trägt (kein Unterschied des Modells, sondern die Form der Phase): X81/X83 haben keine Preise
 * (EP, Anteile, Zuschlagssatz, Nachlass); X86 schreibt einen fehlenden Auftraggeber leer (OWN ist Pflicht).
 */
function phasenform(inhalt: LvInhalt, phase: ExportPhase): LvInhalt {
  const x86 = phase === 'X86';
  const knoten = inhalt.knoten.map((k) => {
    if (k.art !== 'position' || x86) return k;
    const p: Position = { ...k, einheitspreis: null, epa: null };
    return p.zuschlag === null ? p : { ...p, zuschlag: { ...p.zuschlag, prozentsatz: null } };
  });
  return {
    ...inhalt,
    knoten,
    ...(x86 ? {} : { nachlass: null }),
    ...(x86 && inhalt.auftraggeber === undefined
      ? { auftraggeber: { name: null, strasse: null, plz: null, ort: null, vergabenummer: null } }
      : {}),
  };
}

/** Wendet einen gelisteten Unterschied an; passt er nicht zur Position, ist die Liste falsch. */
function wende(p: Position, u: Unterschied, phase: ExportPhase): Position {
  if (u.art === 'altform-zuschlag') {
    const z = p.zuschlag;
    expect(
      z !== null && z.prozentsatz === null && (p.menge !== null || p.einheitspreis !== null),
      `${u.oz}: keine Altform`,
    ).toBe(true);
    return phase === 'X86'
      ? { ...p, zuschlag: null }
      : { ...p, menge: null, einheit: null, einheitspreis: null, epa: null };
  }
  const w = p.merkmale.wahl;
  expect(w !== null && (w.gruppe === null || w.variante === null), `${u.oz}: keine Wahl ohne Nummer`).toBe(
    true,
  );
  return {
    ...p,
    merkmale: { ...p.merkmale, wahl: { gruppe: u.gruppe, variante: u.variante, grundpositionId: null } },
  };
}

/** Das erwartete wieder gelesene Modell: Phasenform des Ausgangsmodells mit genau den gelisteten Unterschieden. */
function erwartet(inhalt: LvInhalt, phase: ExportPhase, liste: readonly Unterschied[]): LvInhalt {
  const nachOz = new Map(liste.map((u) => [u.oz, u]));
  expect(nachOz.size, 'jede OZ höchstens einmal in der Liste').toBe(liste.length);
  const getroffen: string[] = [];
  const knoten = inhalt.knoten.map((k) => {
    const u = k.art === 'position' ? nachOz.get(ozVon(k)) : undefined;
    if (k.art !== 'position' || u === undefined) return k;
    getroffen.push(u.oz);
    return wende(k, u, phase);
  });
  expect(getroffen.sort(), 'jede gelistete OZ gibt es im LV').toEqual([...nachOz.keys()].sort());
  return phasenform({ ...inhalt, knoten }, phase);
}

function rundweg(
  n: Normiert,
  phase: ExportPhase,
  version: ExportVersion,
): { erster: string; zweiter: string; gelesen: LvInhalt | null } {
  const opt = exportOptionen(phase, version, n);
  const erster = schreibeGaeb(n.inhalt, opt);
  const l = leseGaeb(erster.xml, { ids: testIds(), standardMwstSatz: n.inhalt.mwstSatz });
  expect(l.phase).toBe(phase);
  expect(l.version).toBe(version);
  expect(l.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
  const gelesen = l.inhalt;
  const zweiter = gelesen === null ? '' : schreibeGaeb(gelesen, opt).xml;
  return { erster: erster.xml, zweiter, gelesen };
}

const PHASEN: readonly ExportPhase[] = ['X81', 'X83', 'X86'];

describe('Roundtrip der Fixtures', () => {
  it('die Liste der Unterschiede nennt genau die Fixtures', () => {
    expect(Object.keys(UNTERSCHIEDE).sort()).toEqual([...FIXTURES].sort());
  });

  for (const name of FIXTURES)
    for (const phase of PHASEN)
      for (const version of ['3.3', '3.2'] as const)
        it(`${name} als ${phase} ${version}: Modell gleich bis auf die erwarteten Unterschiede, zweiter Export byte-gleich`, () => {
          const { inhalt, summen, basen } = fixtureLv(name);
          const n = normiereKennungen(inhalt, summen, basen);
          const r = rundweg(n, phase, version);
          expect(r.gelesen).toEqual(erwartet(n.inhalt, phase, UNTERSCHIEDE[name]));
          expect(r.zweiter).toBe(r.erster);
        });
});

describe('Roundtrip der amtlichen Dateien (Inhalt des Lesers)', () => {
  for (const a of AMTLICH_LESBAR)
    for (const phase of ['X81', 'X83'] as const)
      it(`${a.name} als ${phase} 3.3`, () => {
        const n = amtlichLv(a.pfad);
        const r = rundweg(n, phase, '3.3');
        expect(r.gelesen).toEqual(erwartet(n.inhalt, phase, []));
        expect(r.zweiter).toBe(r.erster);
      });
});

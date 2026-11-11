// SPDX-License-Identifier: AGPL-3.0-or-later
// Roundtrip Export → Import → Modell (Q3, Ticket 40): für jede Fixture und jede Phase und für die Inhalte, die der
// Leser aus den amtlichen 3.3-Dateien X81/X83 liest. Seams: `schreibeGaeb` und `leseGaeb`.
//
// Verglichen wird das Ausgangsmodell mit normierten Kennungen (zählende IdQuelle in Dokumentreihenfolge, wie der
// Leser sie vergibt) gegen das wieder gelesene Modell. Erwartete Unterschiede stehen je Phase in `erwartet` und
// sind die vollständige Liste; der zweite Export des wieder gelesenen Modells ist byte-gleich dem ersten.

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
import type { Normiert } from './testhilfen';

/**
 * Die festgeschriebenen Unterschiede je Phase (Ticket 40, Punkt 4 und 6):
 * - X81/X83: keine Preise (EP, Anteile, Zuschlagssatz, Nachlass); die Altform einer Zuschlagsposition (Menge × EP
 *   ohne Satz) verliert Menge, Einheit und EP.
 * - X86: die Altform wird eine Position ohne Zuschlagsbezug; ein fehlender Auftraggeber wird leer (OWN ist Pflicht).
 * - Alle Phasen: eine Wahlposition ohne Gruppen- und Variantennummer bekommt künstliche Nummern (D-16) und bleibt Wahl;
 *   ihre Grundposition kennt sie danach nicht mehr (GAEB kennt nur die Nummern, eine Variante 0 gibt es nicht).
 */
function erwartet(inhalt: LvInhalt, phase: ExportPhase): LvInhalt {
  const x86 = phase === 'X86';
  const knoten = inhalt.knoten.map((k) => {
    if (k.art !== 'position') return k;
    let p: Position = k;
    const wahl = p.merkmale.wahl;
    if (wahl !== null && (wahl.gruppe === null || wahl.variante === null))
      p = {
        ...p,
        merkmale: {
          ...p.merkmale,
          wahl: {
            gruppe: expect.any(Number) as number,
            variante: expect.any(Number) as number,
            grundpositionId: null,
          },
        },
      };
    const z = p.zuschlag;
    const altform = z !== null && z.prozentsatz === null && (p.menge !== null || p.einheitspreis !== null);
    if (altform && x86) p = { ...p, zuschlag: null };
    else if (altform) p = { ...p, menge: null, einheit: null, einheitspreis: null, epa: null };
    if (!x86) {
      p = { ...p, einheitspreis: null, epa: null };
      if (p.zuschlag !== null) p = { ...p, zuschlag: { ...p.zuschlag, prozentsatz: null } };
    }
    return p;
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
  for (const name of FIXTURES)
    for (const phase of PHASEN)
      for (const version of ['3.3', '3.2'] as const)
        it(`${name} als ${phase} ${version}: Modell gleich bis auf die erwarteten Unterschiede, zweiter Export byte-gleich`, () => {
          const { inhalt, summen } = fixtureLv(name);
          const n = normiereKennungen(inhalt, summen);
          const r = rundweg(n, phase, version);
          expect(r.gelesen).toEqual(erwartet(n.inhalt, phase));
          expect(r.zweiter).toBe(r.erster);
        });
});

describe('Roundtrip der amtlichen Dateien (Inhalt des Lesers)', () => {
  for (const a of AMTLICH_LESBAR)
    for (const phase of ['X81', 'X83'] as const)
      it(`${a.name} als ${phase} 3.3`, () => {
        const n = amtlichLv(a.pfad);
        const r = rundweg(n, phase, '3.3');
        expect(r.gelesen).toEqual(erwartet(n.inhalt, phase));
        expect(r.zweiter).toBe(r.erster);
      });
});

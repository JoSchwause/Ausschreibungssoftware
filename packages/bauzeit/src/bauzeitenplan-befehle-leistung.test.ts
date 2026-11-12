// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget der Befehle als Test (Q4, Ticket 109 Punkt 4, D-57): an einem Plan mit 1.000 Vorgängen (20 Sammelvorgänge
// mit je 49 Kindern, Dokumentreihenfolge, 2.000 Anordnungsbeziehungen) je Befehl Ausführen samt Anwenden und die Umkehrung
// samt Anwenden in höchstens 16 ms CPU-Zeit (Q4: eine Einzeländerung unter 16 ms). Gemessen wie in
// `bauzeitenplan-leistung.test.ts`: CPU-Zeit des Prozesses, warm, Median von fünf Läufen; das Budget wird nie gelockert.
// Speichern und Undo in `speicher` misst Ticket 106.

import type {
  Anordnungsart,
  Anordnungsbeziehung,
  Bauzeitenplan,
  BauzeitenplanBefehl,
  BauzeitenplanId,
  ProjektId,
  Vorgang,
  VorgangId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  bauzeitenplanBefehlAusfuehren,
  bauzeitenplanChangeSetAnwenden,
  bauzeitenplanChangeSetUmkehren,
} from './index';

const ARTEN: readonly Anordnungsart[] = ['ende-anfang', 'anfang-anfang', 'ende-ende', 'anfang-ende'];
const vid = (id: string): VorgangId => id as VorgangId;
const BUDGET_MS = 16;

/** 20 Sammelvorgänge mit je 49 Kindern in Dokumentreihenfolge, 2.000 Beziehungen zwischen den Blättern. */
function grosserPlan(): Bauzeitenplan {
  let zustand = 4711;
  const zufall = (grenze: number): number => {
    zustand = (zustand * 1_103_515_245 + 12_345) % 2_147_483_648;
    return zustand % grenze;
  };
  const blaetter = 980;
  const beziehungen: Anordnungsbeziehung[][] = Array.from({ length: blaetter }, () => []);
  for (let i = 1; i < blaetter; i++)
    beziehungen[i]?.push({ vorgaengerId: vid(`v${String(i - 1)}`), art: 'ende-anfang', abstand: 0 });
  for (let k = 0; k < 2000 - (blaetter - 1); k++) {
    const nach = 1 + zufall(blaetter - 1);
    const art = ARTEN[1 + zufall(3)] ?? 'anfang-anfang';
    const vorgaengerId = vid(`v${String(zufall(nach))}`);
    if (beziehungen[nach]?.some((b) => b.vorgaengerId === vorgaengerId && b.art === art) === true) {
      k--;
      continue;
    }
    beziehungen[nach]?.push({ vorgaengerId, art, abstand: zufall(6) - 2 });
  }
  const vorgaenge: Vorgang[] = [];
  for (let s = 0; s < 20; s++) {
    vorgaenge.push(vorgang(`s${String(s)}`, null, 0, []));
    for (let i = s * 49; i < (s + 1) * 49; i++) {
      vorgaenge.push(vorgang(`v${String(i)}`, `s${String(s)}`, (i * 7 + 3) % 11, beziehungen[i] ?? []));
    }
  }
  return {
    id: '019b7a12-e000-7000-8000-000000000001' as BauzeitenplanId,
    projektId: '019b7a12-e000-7000-8000-000000000002' as ProjektId,
    name: 'Großer Plan',
    projektbeginn: '2027-01-04',
    kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BY', freieTage: ['2027-12-24', '2027-12-31'] },
    vorgaenge,
  };
}

function vorgang(
  id: string,
  elternId: string | null,
  dauer: number,
  vorgaenger: readonly Anordnungsbeziehung[],
): Vorgang {
  return {
    id: vid(id),
    nummer: null,
    bezeichnung: `Vorgang ${id}`,
    elternId: elternId === null ? null : vid(elternId),
    dauer,
    vorgaenger,
    fruehesterBeginn: null,
    bezug: null,
    ist: null,
  };
}

/** Median der CPU-Zeit in ms von fünf warmen Läufen. */
function median(lauf: () => void): { median: number; messungen: number[] } {
  lauf(); // Aufwärmen
  const messungen: number[] = [];
  for (let i = 0; i < 5; i++) {
    const c0 = process.cpuUsage();
    lauf();
    const c = process.cpuUsage(c0);
    messungen.push((c.user + c.system) / 1000);
  }
  return { median: [...messungen].sort((x, y) => x - y)[2] ?? Infinity, messungen };
}

describe('Leistungsbudget der Befehle (Q4, Ticket 109)', () => {
  const plan = grosserPlan();
  const mitte = plan.vorgaenge[502] ?? vorgang('x', null, 1, []);
  const befehle: readonly [string, BauzeitenplanBefehl][] = [
    [
      'BauzeitenplanAnlegen (ganzer Plan, alle Prüfungen)',
      { art: 'BauzeitenplanAnlegen', bauzeitenplan: plan },
    ],
    [
      'VorgangSetzen (Vorgang in der Mitte ändern, an seiner Stelle)',
      {
        art: 'VorgangSetzen',
        vorgang: { ...mitte, dauer: mitte.dauer + 1 },
        nach: plan.vorgaenge[501]?.id ?? null,
      },
    ],
    [
      'VorgangSetzen (Sammelvorgang mit 49 Kindern ans Ende verschieben)',
      { art: 'VorgangSetzen', vorgang: plan.vorgaenge[0] ?? mitte, nach: vid('s19') },
    ],
    [
      'VorgangEntfernen (Sammelvorgang mit 49 Kindern und den Beziehungen darauf)',
      { art: 'VorgangEntfernen', vorgangId: vid('s10') },
    ],
  ];

  it('1.000 Vorgänge, 2.000 Beziehungen: der Plan ist gültig', () => {
    expect(plan.vorgaenge).toHaveLength(1000);
    expect(plan.vorgaenge.reduce((n, v) => n + v.vorgaenger.length, 0)).toBe(2000);
    expect(bauzeitenplanBefehlAusfuehren(null, { art: 'BauzeitenplanAnlegen', bauzeitenplan: plan }).ok).toBe(
      true,
    );
  });

  it.each(befehle)(`%s: Befehl und Umkehrung je höchstens ${String(BUDGET_MS)} ms CPU`, (name, befehl) => {
    const zustand = befehl.art === 'BauzeitenplanAnlegen' ? null : { bauzeitenplan: plan };
    const ausfuehren = () => {
      const e = bauzeitenplanBefehlAusfuehren(zustand, befehl);
      if (!e.ok) throw new Error(e.fehler.meldung);
      return { cs: e.wert, neu: bauzeitenplanChangeSetAnwenden(zustand, e.wert) };
    };
    const { cs, neu } = ausfuehren();
    const befehlMs = median(() => void ausfuehren());
    const umkehrungMs = median(() => {
      const zurueck = bauzeitenplanChangeSetAnwenden(neu, bauzeitenplanChangeSetUmkehren(cs));
      if (zurueck !== zustand && zurueck?.bauzeitenplan !== plan) throw new Error('Umkehrung falsch');
    });
    console.log(
      `bauzeit ${name}: Befehl Median ${befehlMs.median.toFixed(2)} ms (${befehlMs.messungen.map((m) => m.toFixed(2)).join(', ')}), ` +
        `Umkehrung Median ${umkehrungMs.median.toFixed(3)} ms CPU`,
    );
    expect(befehlMs.median).toBeLessThanOrEqual(BUDGET_MS);
    expect(umkehrungMs.median).toBeLessThanOrEqual(BUDGET_MS);
  });
});

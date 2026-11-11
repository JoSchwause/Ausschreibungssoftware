// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget als Test (Q4, Ticket 56): `MengenansatzSetzen` in `fixtures/gross` (5.000 Positionen), Befehl ausführen +
// ChangeSet anwenden, warm, Median unter 16 ms. Abwechselnd ein Ansatz mit zehn Zeilen und `MengeAendern` (Lesart (a)
// entfernt ihn wieder), damit jeder Lauf Menge, Ansatz und Summen ändert. Das Budget wird nicht aufgeweicht.

import { describe, expect, it } from 'vitest';
import type { Ansatzzeile, LeistungsverzeichnisId, LvBefehl, LvZustand, Menge } from '@tethys/vertrag';
import { lvBefehlAusfuehren, summenBerechnen } from './index';
import { PROJEKT_ID, anwenden, erwarteOk, fixtureAlsInhalt, fixtureLesen, id } from './testhilfen';

const BUDGET_MS = 16;
const LAEUFE = 40;
const WARMLAUF = 5;

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

describe('Leistungsbudget Mengenansatz (Q4)', () => {
  it(`MengenansatzSetzen in fixtures/gross: ausführen + anwenden, warm, Median unter ${String(BUDGET_MS)} ms`, () => {
    const fx = fixtureLesen('gross');
    const inh = fixtureAlsInhalt(fx);
    let z: LvZustand = anwenden(
      null,
      erwarteOk(
        lvBefehlAusfuehren(null, {
          art: 'LeistungsverzeichnisAnlegen',
          id: fx.id as LeistungsverzeichnisId,
          projektId: PROJEKT_ID,
          inhalt: inh,
        }),
      ),
    );
    const positionen = inh.knoten.filter((k) => k.art === 'position' && k.einheitspreis !== null);
    expect(positionen.length).toBeGreaterThan(4000);
    const ziel = positionen[2500];
    if (ziel?.art !== 'position') throw new Error('Fixture zu klein');
    const ansatz: readonly Ansatzzeile[] = Array.from({ length: 10 }, (_, i) => ({
      zeile: i + 1,
      formel: 91,
      ausdruck: `${String(i + 1)},5*2`,
      variable: null,
    }));

    const werte: number[] = [];
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const menge = `${String(100 + i)}.000` as Menge;
      const befehl: LvBefehl =
        i % 2 === 0
          ? { art: 'MengenansatzSetzen', positionId: id.pos(ziel.id), mengenansatz: ansatz, menge }
          : { art: 'MengeAendern', positionId: id.pos(ziel.id), menge };
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      z = anwenden(z, cs);
      const t1 = performance.now();
      expect(cs.knoten.geaendert).toHaveLength(1);
      if (i >= WARMLAUF && befehl.art === 'MengenansatzSetzen') werte.push(t1 - t0);
    }
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
    const median = mitte(werte);
    console.info(
      `[kern/56] gross, MengenansatzSetzen warm (${String(werte.length)} Läufe): Median ${median.toFixed(2)} ms, ` +
        `schlechtester ${Math.max(...werte).toFixed(2)} ms`,
    );
    expect(median).toBeLessThan(BUDGET_MS);
  });
});

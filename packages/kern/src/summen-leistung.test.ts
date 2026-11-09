// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget als Test (Q4, Ticket 07): eine Mengenänderung in `fixtures/gross` (5.000 Positionen),
// Befehl ausführen + ChangeSet anwenden, warm, unter 16 ms (Median über wiederholte Läufe). Das Budget wird
// nicht aufgeweicht; der Messwert steht im Ticket.

import { describe, expect, it } from 'vitest';
import type { LvBefehl, LvZustand, Menge } from '@tethys/vertrag';
import { lvBefehlAusfuehren, lvChangeSetAnwenden, summenBerechnen } from './index';
import { PROJEKT_ID, erwarteOk, fixtureAlsInhalt, fixtureLesen, id } from './testhilfen';
import type { LeistungsverzeichnisId } from '@tethys/vertrag';

const BUDGET_MS = 16;
const LAEUFE = 40;
const WARMLAUF = 5;

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

describe('Leistungsbudget (Q4)', () => {
  it(`MengeAendern in fixtures/gross: ausführen + anwenden, warm, Median unter ${String(BUDGET_MS)} ms`, () => {
    const fx = fixtureLesen('gross');
    const inh = fixtureAlsInhalt(fx);
    let z: LvZustand = lvChangeSetAnwenden(
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
    const positionen = inh.knoten.filter(
      (k) => k.art === 'position' && k.einheitspreis !== null && k.einheitspreis !== '0.000',
    );
    expect(positionen.length).toBeGreaterThan(4000);
    const ziel = positionen[2500];
    if (ziel?.art !== 'position') throw new Error('Fixture zu klein');

    const werte: number[] = [];
    const ausfuehrenWerte: number[] = [];
    let geaendertEintraege = 0;
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const befehl: LvBefehl = {
        art: 'MengeAendern',
        positionId: id.pos(ziel.id),
        menge: `${String(100 + i)}.000` as Menge,
      };
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      const t1 = performance.now();
      z = lvChangeSetAnwenden(z, cs);
      const t2 = performance.now();
      if (i >= WARMLAUF) {
        werte.push(t2 - t0);
        ausfuehrenWerte.push(t1 - t0);
      }
      geaendertEintraege = cs.summen.positionen.length + cs.summen.gliederungen.length;
    }
    // Nach den Läufen stimmt der inkrementell gepflegte Stand mit der vollständigen Neuberechnung überein.
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
    // Änderung wirkt nur auf die Kette: Position + 5 Titelebenen
    expect(geaendertEintraege).toBeLessThanOrEqual(1 + 5);

    const median = mitte(werte);
    const schlimmster = Math.max(...werte);
    console.info(
      `[kern/07] gross, 1 MengeAendern warm (${String(LAEUFE)} Läufe): Median ${median.toFixed(2)} ms, ` +
        `schlechtester ${schlimmster.toFixed(2)} ms; davon ausführen (Median) ${mitte(ausfuehrenWerte).toFixed(2)} ms`,
    );
    expect(median).toBeLessThan(BUDGET_MS);
  });
});

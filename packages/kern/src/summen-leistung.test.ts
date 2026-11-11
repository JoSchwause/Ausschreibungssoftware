// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget als Test (Q4, Ticket 07): eine Mengenänderung in `fixtures/gross` (5.000 Positionen),
// Befehl ausführen + ChangeSet anwenden, warm, unter 16 ms (Median über wiederholte Läufe). Das Budget wird
// nicht aufgeweicht; der Messwert steht im Ticket.

import { describe, expect, it } from 'vitest';
import type { Knoten, LvBefehl, LvZustand, Menge } from '@tethys/vertrag';
import { lvBefehlAusfuehren, summenBerechnen } from './index';
import {
  LV_ID,
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  id,
  lvMit,
  merkmale,
  posKnoten,
  titelKnoten,
  zuschlagAuf,
  zuschlagsliste,
} from './testhilfen';
import type { LeistungsverzeichnisId } from '@tethys/vertrag';

const BUDGET_MS = 16;
const LAEUFE = 40;
const WARMLAUF = 5;

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

describe('Leistungsbudget (Q4)', () => {
  it(`MengeAendern in fixtures/gross: ausführen + anwenden, warm, Median unter ${String(BUDGET_MS)} ms`, () => {
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
      z = anwenden(z, cs);
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

describe('Leistungsbudget mit Zuschlagspositionen (Q4, Ticket 37)', () => {
  /**
   * 50 Titel zu je 100 Positionen (5.000), jede dritte gekennzeichnet; je Titel vier Zuschlagspositionen der Bezugsform
   * `gliederung` (nach je 25 Positionen), eine `kennzeichnung` (im Block nach 75) und eine `positionen`-Liste mit elf Positionen des
   * nächsten Titels. Gemessen wird eine Mengenänderung an einer Position, die in einem Bereich (R3, R4) und in einer
   * Liste eines anderen Titels (R5) steht.
   */
  function lvMitZuschlaegen(): LvZustand {
    const knoten: Knoten[] = [];
    const pid = (t: number, p: number) => `P${String(t)}-${String(p)}`;
    for (let t = 0; t < 50; t++) {
      const titel = `T${String(t)}`;
      knoten.push(titelKnoten(titel, LV_ID, t));
      let r = 0;
      for (let p = 0; p < 100; p++) {
        knoten.push(
          posKnoten(pid(t, p), titel, r++, `${String(1 + (p % 7))}.250`, `${String(10 + p)}.125`, {
            merkmale: merkmale({ zuschlagskennzeichen: p % 3 === 0 }),
          }),
        );
        if (p % 25 === 24) {
          const zid = `Z${String(t)}-${String(p)}`;
          knoten.push(
            posKnoten(zid, titel, r++, null, null, { zuschlag: zuschlagAuf('gliederung', '7.50') }),
          );
        }
        // Direkt hinter der Zuschlagsposition nach 75 Positionen: gleicher Bereich (R3, R4).
        if (p === 74)
          knoten.push(
            posKnoten(`K${String(t)}`, titel, r++, null, null, {
              zuschlag: zuschlagAuf('kennzeichnung', '3.00'),
            }),
          );
      }
      const naechster = (t + 1) % 50;
      const liste = [...Array.from({ length: 10 }, (_, i) => pid(naechster, i)), pid(naechster, 51)];
      knoten.push(
        posKnoten(`L${String(t)}`, titel, r, null, null, { zuschlag: zuschlagsliste(liste, '10.00') }),
      );
    }
    return lvMit(knoten);
  }

  it(`MengeAendern an einer Bezugsposition aller drei Formen: ausführen + anwenden, Median unter ${String(BUDGET_MS)} ms`, () => {
    let z = lvMitZuschlaegen();
    expect(z.summen.positionen.length).toBe(5300);
    const ziel = 'P25-51'; // Bereich von Z25-74 (R3), gekennzeichnet für K25 (R4), Liste von L24 (R5)
    const werte: number[] = [];
    let betroffen: string[] = [];
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const befehl: LvBefehl = {
        art: 'MengeAendern',
        positionId: id.pos(ziel),
        menge: `${String(100 + i)}.000` as Menge,
      };
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      z = anwenden(z, cs);
      const t1 = performance.now();
      if (i >= WARMLAUF) werte.push(t1 - t0);
      betroffen = cs.summen.positionen.map((p) => p.positionId);
    }
    expect(betroffen).toEqual(['K25', 'L24', 'P25-51', 'Z25-74']);
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
    const median = mitte(werte);
    console.info(
      `[kern/37] 5.000 Positionen mit Zuschlägen, 1 MengeAendern warm (${String(LAEUFE)} Läufe): ` +
        `Median ${median.toFixed(2)} ms, schlechtester ${Math.max(...werte).toFixed(2)} ms`,
    );
    expect(median).toBeLessThan(BUDGET_MS);
  });
});

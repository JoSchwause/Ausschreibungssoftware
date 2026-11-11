// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget als Test (Q4, Ticket 42): einen Titel mit rund 300 Positionen in `fixtures/gross` in einen anderen
// Elternknoten verschieben (mit OZ-Neuvergabe des Unterbaums), ausführen + anwenden, warm, Median unter 16 ms. Das Budget
// wird nicht aufgeweicht; der Messwert steht im Ticket.

import { describe, expect, it } from 'vitest';
import type { Knoten, LeistungsverzeichnisId, LvBefehl, LvZustand } from '@tethys/vertrag';
import { lvBefehlAusfuehren, summenBerechnen } from './index';
import { PROJEKT_ID, anwenden, erwarteOk, fixtureAlsInhalt, fixtureLesen, id } from './testhilfen';

const BUDGET_MS = 16;
const LAEUFE = 30;
const WARMLAUF = 5;
const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

function positionenUnter(knoten: readonly Knoten[], wurzel: string): number {
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) kinder.set(k.elternId, [...(kinder.get(k.elternId) ?? []), k]);
  let n = 0;
  const stapel = [wurzel];
  for (let x = stapel.pop(); x !== undefined; x = stapel.pop()) {
    for (const k of kinder.get(x) ?? []) {
      if (k.art === 'position') n++;
      stapel.push(k.id);
    }
  }
  return n;
}

describe('Leistungsbudget K9 (Q4)', () => {
  it(`KnotenlisteVerschieben eines Titels mit rund 300 Positionen in gross: Median unter ${String(BUDGET_MS)} ms`, () => {
    const fx = fixtureLesen('gross');
    let z: LvZustand = anwenden(
      null,
      erwarteOk(
        lvBefehlAusfuehren(null, {
          art: 'LeistungsverzeichnisAnlegen',
          id: fx.id as LeistungsverzeichnisId,
          projektId: PROJEKT_ID,
          inhalt: fixtureAlsInhalt(fx),
        }),
      ),
    );
    const knoten = z.leistungsverzeichnis.knoten;
    const oben = knoten.filter((k) => k.elternId === fx.id && k.art === 'titel');
    const [a, b] = oben;
    if (a === undefined || b === undefined) throw new Error('Fixture zu klein');
    const titel = knoten.find((k) => k.elternId === a.id && k.art === 'titel');
    if (titel === undefined) throw new Error('Fixture ohne Untertitel');
    const anzahl = positionenUnter(knoten, titel.id);
    expect(anzahl).toBeGreaterThan(250);
    expect(anzahl).toBeLessThan(400);

    const werte: number[] = [];
    let geaendert = 0;
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const ziel = i % 2 === 0 ? b : a;
      const befehl: LvBefehl = {
        art: 'KnotenlisteVerschieben',
        knotenIds: [id.knoten(titel.id)],
        ziel: { art: 'ende', elternId: id.eltern(ziel.id) },
      };
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      z = anwenden(z, cs);
      const t1 = performance.now();
      if (i >= WARMLAUF) werte.push(t1 - t0);
      geaendert = cs.knoten.geaendert.length;
    }
    // Der Unterbaum wird neu nummeriert: jeder Knoten darin steht im ChangeSet.
    expect(geaendert).toBeGreaterThan(anzahl);
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
    const median = mitte(werte);
    console.info(
      `[kern/42] gross, Titel mit ${String(anzahl)} Positionen verschieben (${String(LAEUFE)} Läufe): ` +
        `Median ${median.toFixed(2)} ms, schlechtester ${Math.max(...werte).toFixed(2)} ms`,
    );
    expect(median).toBeLessThan(BUDGET_MS);
  });
});

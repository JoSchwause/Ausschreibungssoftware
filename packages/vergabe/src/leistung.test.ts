// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudgets als Test (Q4, Ticket 36): `AngebotspositionSetzen` auf einem Angebot zu `fixtures/gross`
// (5.000 Positionen), ausführen + anwenden, warm, Median unter 16 ms (wie im Kern). `preisspiegelBerechnen` für
// `gross` mit 5 erzeugten Angeboten unter 1 s (festgehaltenes Budget). Budgets werden nicht aufgeweicht.

import { describe, expect, it } from 'vitest';
import type { AngebotZustand, Angebotsposition } from '@tethys/vertrag';
import {
  angebotBefehlAusfuehrer,
  angebotChangeSetAnwenden,
  angebotSummenBerechnen,
  preisspiegelBerechnen,
} from './index';
import { angebot, ep, erwarteOk, lvAusFixture, nichtAngeboten, projekt } from './testhilfen';

const BUDGET_BEFEHL_MS = 16;
const BUDGET_PREISSPIEGEL_MS = 1000;
const LAEUFE = 40;
const WARMLAUF = 5;

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

const { zustand: lv } = lvAusFixture('gross');
const positionIds = lv.leistungsverzeichnis.knoten.filter((k) => k.art === 'position').map((k) => k.id);

/** Deterministisch erzeugte Preise: je Angebot k und Position i ein EP zwischen 0,000 und 999,999; jede 97. fehlt. */
function erzeugtesAngebot(k: number): AngebotZustand {
  const positionen = positionIds.map((id, i): Angebotsposition => {
    if ((i + k) % 97 === 0) return nichtAngeboten(id);
    const tausendstel = ((i * 7919 + k * 104_729) % 1_000_000).toString().padStart(4, '0');
    return ep(id, `${tausendstel.slice(0, -3)}.${tausendstel.slice(-3)}`);
  });
  const a = angebot(`angebot-${String(k)}`, lv, `bieter-${String(k)}`, positionen);
  const ausfuehren = angebotBefehlAusfuehrer(projekt([a.bieterId], lv.leistungsverzeichnis.projektId), lv);
  return angebotChangeSetAnwenden(
    null,
    erwarteOk(ausfuehren(null, { art: 'AngebotAnlegen', angebot: a })),
  ) as AngebotZustand;
}

describe('Leistungsbudget (Q4)', () => {
  it(`AngebotspositionSetzen in gross: ausführen + anwenden, warm, Median unter ${String(BUDGET_BEFEHL_MS)} ms`, () => {
    expect(positionIds.length).toBeGreaterThanOrEqual(5000);
    let z = erzeugtesAngebot(1);
    const ausfuehren = angebotBefehlAusfuehrer(
      projekt([z.angebot.bieterId], lv.leistungsverzeichnis.projektId),
      lv,
    );
    const ziel = positionIds[2500] ?? '';
    const werte: number[] = [];
    for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
      const t0 = performance.now();
      const cs = erwarteOk(
        ausfuehren(z, { art: 'AngebotspositionSetzen', position: ep(ziel, `${String(100 + i)}.125`) }),
      );
      z = angebotChangeSetAnwenden(z, cs) as AngebotZustand;
      const t1 = performance.now();
      if (i >= WARMLAUF) werte.push(t1 - t0);
    }
    expect(z.summen).toEqual(angebotSummenBerechnen(lv, z.angebot));
    console.info(`AngebotspositionSetzen (gross): Median ${mitte(werte).toFixed(3)} ms`);
    expect(mitte(werte)).toBeLessThan(BUDGET_BEFEHL_MS);
  });

  it(`preisspiegelBerechnen für gross mit 5 Angeboten unter ${String(BUDGET_PREISSPIEGEL_MS)} ms`, () => {
    const angebote = [1, 2, 3, 4, 5].map(erzeugtesAngebot);
    preisspiegelBerechnen(lv, angebote); // Warmlauf
    const t0 = performance.now();
    const ps = preisspiegelBerechnen(lv, angebote);
    const dauer = performance.now() - t0;
    expect(ps.zeilen.length).toBe(positionIds.length);
    console.info(`preisspiegelBerechnen (gross, 5 Angebote): ${dauer.toFixed(1)} ms`);
    expect(dauer).toBeLessThan(BUDGET_PREISSPIEGEL_MS);
  });
});

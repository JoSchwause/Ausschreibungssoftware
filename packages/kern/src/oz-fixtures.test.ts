// SPDX-License-Identifier: AGPL-3.0-or-later
// Umnummerieren gegen die Fixtures (Ticket 06): Die Fixtures tragen die OZ, die ein Mensch nach +1/+10 vergeben hat.
// Wird die OZ entfernt und der Baum umnummeriert, muss genau diese OZ wieder entstehen. Dazu eine Messung (kein Gate).
//
// Die Fixtures beschreiben ihre Maske als Text mit höchstens 14 Stellen (F2; Ticket 25): `winzig` und `typisch`
// `NN.NN.NNNN[I]`, `gross` `NN.NN.NN.NN.NN.NNNN`. Der frühere Text mit 15 Stellen (fünf Stufen, Position, Index) verletzte
// die GAEB-Regel (FD 3.3, 11.2.3 BoQInfo Regel 2); die Tests nehmen für `winzig` und `typisch` die Maske mit zwei Stufen,
// für `gross` die mit fünf Stufen ohne Index.

import { describe, expect, it } from 'vitest';
import type { Knoten, LvZustand, OzMaske } from '@tethys/vertrag';
import { changeSetUmkehren, doppelteOrdnungszahlen, lvBefehlAusfuehren, ozMaskeFehler } from './index';
import { anwenden, PROJEKT_ID, erwarteOk, fixtureAlsInhalt, fixtureLesen, id } from './testhilfen';
import type { LeistungsverzeichnisId } from '@tethys/vertrag';

const num = (laenge: number) => ({ laenge, zeichen: 'numerisch' as const });
const MASKE_ZWEI_STUFEN: OzMaske = {
  gliederung: [num(2), num(2)],
  position: num(4),
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};
const MASKE_FUENF_OHNE_INDEX: OzMaske = {
  gliederung: Array.from({ length: 5 }, () => num(2)),
  position: num(4),
  index: null,
  trennzeichen: '.',
};
/** Der frühere, zu lange Maskentext der Fixtures: 15 Stellen, zur Probe der Abweisung. */
const MASKE_FIXTURE_TEXT: OzMaske = {
  ...MASKE_FUENF_OHNE_INDEX,
  index: { laenge: 1, zeichen: 'alphanumerisch' },
};

const maskeVon = (name: 'winzig' | 'typisch' | 'gross'): OzMaske =>
  name === 'gross' ? MASKE_FUENF_OHNE_INDEX : MASKE_ZWEI_STUFEN;

function anlegen(
  name: 'winzig' | 'typisch' | 'gross',
  ohneOz: boolean,
): { z: LvZustand; soll: Map<string, string | null> } {
  const fx = fixtureLesen(name);
  const inh = fixtureAlsInhalt(fx);
  const soll = new Map<string, string | null>(
    inh.knoten.map((k) => [k.id, k.art === 'hinweis' ? null : k.ordnungszahl] as const),
  );
  const knoten = ohneOz
    ? inh.knoten.map((k): Knoten => (k.art === 'hinweis' ? k : { ...k, ordnungszahl: null }))
    : inh.knoten;
  const z = anwenden(
    null,
    erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: fx.id as LeistungsverzeichnisId,
        projektId: PROJEKT_ID,
        inhalt: { ...inh, ozMaske: maskeVon(name), knoten },
      }),
    ),
  );
  return { z, soll };
}

const wurzel = (z: LvZustand) => id.eltern(z.leistungsverzeichnis.id);

describe.each(['winzig', 'typisch', 'gross'] as const)('Fixture %s', (name) => {
  it('die Maske des Tests ist zulässig', () => {
    expect(ozMaskeFehler(maskeVon(name))).toBeNull();
  });

  it('Umnummerieren des Fixture-Baums mit seiner OZ ändert nichts (Golden: +1 und +10, Indexposition teilt den Grundteil)', () => {
    const { z } = anlegen(name, false);
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'Umnummerieren', teilbaumId: wurzel(z) }));
    expect(cs.knoten.geaendert).toEqual([]);
    expect(anwenden(z, cs)).toBe(z);
  });

  it('ohne OZ umnummeriert entsteht für jeden Knoten genau die OZ der Fixture', () => {
    const { z, soll } = anlegen(name, true);
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'Umnummerieren', teilbaumId: wurzel(z) }));
    const neu = anwenden(z, cs);
    let verglichen = 0;
    for (const k of neu.leistungsverzeichnis.knoten) {
      if (k.art === 'hinweis') continue;
      expect(k.ordnungszahl, k.id).toBe(soll.get(k.id));
      verglichen++;
    }
    expect(verglichen).toBe([...soll.values()].filter((v) => v !== null).length);
    expect(cs.knoten.geaendert).toHaveLength(verglichen);
    expect(doppelteOrdnungszahlen(neu.leistungsverzeichnis.knoten)).toEqual([]);
    expect(neu.summen).toBe(z.summen);
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });
});

describe('Früherer Maskentext der Fixtures (15 Stellen)', () => {
  it('hat 15 Stellen und wird abgewiesen (FD 3.3, 11.2.3 BoQInfo Regel 2: höchstens 14)', () => {
    expect(ozMaskeFehler(MASKE_FIXTURE_TEXT)).toMatch(/15/);
    const { z } = anlegen('typisch', false);
    const e = lvBefehlAusfuehren(z, { art: 'OzMaskeSetzen', maske: MASKE_FIXTURE_TEXT });
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe('maske-ungueltig');
  });
});

describe('Maskenwechsel an den Fixtures', () => {
  it('typisch: Wechsel auf die Maske ohne Trennzeichen ändert die OZ aller Knoten unterhalb der Stufe 1, Rückweg stellt her', () => {
    const { z } = anlegen('typisch', false);
    const ohneTrenner: OzMaske = { ...MASKE_ZWEI_STUFEN, trennzeichen: null };
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'OzMaskeSetzen', maske: ohneTrenner }));
    const neu = anwenden(z, cs);
    expect(neu.leistungsverzeichnis.ozMaske).toEqual(ohneTrenner);
    const positionen = neu.leistungsverzeichnis.knoten.filter((k) => k.art === 'position');
    expect(positionen.every((p) => p.ordnungszahl !== null && !p.ordnungszahl.includes('.'))).toBe(true);
    expect(positionen[0]?.ordnungszahl).toBe('010010');
    const zurueck = anwenden(
      neu,
      erwarteOk(lvBefehlAusfuehren(neu, { art: 'OzMaskeSetzen', maske: MASKE_ZWEI_STUFEN })),
    );
    expect(zurueck).toEqual(z);
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });
});

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

describe('Messung (kein Gate)', () => {
  it('gross: alle 5.610 Knoten umnummerieren (Befehl, Anwenden) und Maske wechseln', () => {
    const { z } = anlegen('gross', true);
    const befehl = { art: 'Umnummerieren' as const, teilbaumId: wurzel(z) };
    const laeufe: number[] = [];
    const ausfuehren: number[] = [];
    let geaendert = 0;
    for (let i = 0; i < 7; i++) {
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, befehl));
      const t1 = performance.now();
      anwenden(z, cs);
      const t2 = performance.now();
      if (i >= 2) {
        laeufe.push(t2 - t0);
        ausfuehren.push(t1 - t0);
      }
      geaendert = cs.knoten.geaendert.length;
    }
    expect(geaendert).toBe(5605);
    const ohneTrenner: OzMaske = { ...MASKE_FUENF_OHNE_INDEX, trennzeichen: null };
    const wechsel: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'OzMaskeSetzen', maske: ohneTrenner }));
      anwenden(z, cs);
      wechsel.push(performance.now() - t0);
    }
    console.info(
      `[kern/06] gross (5.610 Knoten, ${String(geaendert)} OZ neu): Umnummerieren Befehl+Anwenden Median ${mitte(laeufe).toFixed(1)} ms ` +
        `(Spanne ${Math.min(...laeufe).toFixed(1)} bis ${Math.max(...laeufe).toFixed(1)}), davon Befehl Median ${mitte(ausfuehren).toFixed(1)} ms; ` +
        `OzMaskeSetzen Befehl+Anwenden Median ${mitte(wechsel).toFixed(1)} ms`,
    );
    expect(mitte(laeufe)).toBeGreaterThan(0);
  });
});

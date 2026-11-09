// SPDX-License-Identifier: AGPL-3.0-or-later
// Strukturgleichheit mit den Fixtures (Ticket 05): Das LV aus `LeistungsverzeichnisAnlegen` und das LV, das Knoten für
// Knoten mit den Baumbefehlen aufgebaut wird, haben denselben Baum wie die Fixture. Dazu eine Messung (kein Gate;
// das Leistungsbudget kommt mit Ticket 07).

import { describe, expect, it } from 'vitest';
import type { Knoten, LvBefehl, LvInhalt, LvZustand, Positionsdaten } from '@tethys/vertrag';
import { lvBefehlAusfuehren, lvChangeSetAnwenden, pruefeLvInvarianten } from './index';
import { PROJEKT_ID, erwarteOk, fixtureAlsInhalt, fixtureLesen, id, positionsdaten } from './testhilfen';
import type { LeistungsverzeichnisId } from '@tethys/vertrag';

/** Baum als Abbildung Elternknoten → Kinder-IDs in Reihenfolge, unabhängig von der Array-Reihenfolge. */
function baumform(knoten: readonly Knoten[]): Map<string, string[]> {
  const gruppen = new Map<string, Knoten[]>();
  for (const k of knoten) gruppen.set(k.elternId, [...(gruppen.get(k.elternId) ?? []), k]);
  return new Map(
    [...gruppen].map(([eltern, kinder]) => [
      eltern,
      kinder.sort((a, b) => a.reihenfolge - b.reihenfolge).map((k) => k.id),
    ]),
  );
}

const ohneLage = (k: Knoten): unknown => ({ ...k, elternId: null, reihenfolge: null });

function anlegen(lvId: string, inh: LvInhalt): LvBefehl {
  return {
    art: 'LeistungsverzeichnisAnlegen',
    id: lvId as LeistungsverzeichnisId,
    projektId: PROJEKT_ID,
    inhalt: inh,
  };
}

describe.each(['winzig', 'typisch', 'gross'] as const)('Fixture %s', (name) => {
  const fx = fixtureLesen(name);
  const inh = fixtureAlsInhalt(fx);

  it('LeistungsverzeichnisAnlegen übernimmt den Baum unverändert (Struktur und Knotendaten)', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(null, anlegen(fx.id, inh)));
    const z = lvChangeSetAnwenden(null, cs);
    const lv = z.leistungsverzeichnis;
    expect(lv.knoten).toHaveLength(inh.knoten.length);
    expect(baumform(lv.knoten)).toEqual(baumform(inh.knoten));
    const alt = new Map(inh.knoten.map((k) => [k.id as string, k]));
    for (const k of lv.knoten) expect(k).toEqual(alt.get(k.id));
    expect(pruefeLvInvarianten(lv)).toEqual([]);
    // Der Kern hält die Knoten kanonisch (Vorordnung, Eltern vor Kindern). `gross` steht nicht in Vorordnung, daher
    // wird die Reihenfolge der Fixture nicht verlangt, nur Eltern vor Kindern in Zustand und ChangeSet.
    expect(lv.knoten.map((k) => k.id)).toEqual(cs.knoten.hinzugefuegt.map((k) => k.id));
    const gesehen = new Set<string>([fx.id]);
    for (const k of lv.knoten) {
      expect(gesehen.has(k.elternId)).toBe(true);
      gesehen.add(k.id);
    }
  });

  it.runIf(name !== 'gross')('Knoten für Knoten mit den Baumbefehlen aufgebaut ergibt denselben Baum', () => {
    let z: LvZustand = lvChangeSetAnwenden(
      null,
      erwarteOk(lvBefehlAusfuehren(null, anlegen(fx.id, { ...inh, knoten: [] }))),
    );
    for (const k of inh.knoten) {
      const ort = { art: 'ende', elternId: k.elternId } as const;
      let befehl: LvBefehl;
      if (k.art === 'titel' || k.art === 'los') {
        befehl = {
          art: 'GliederungAnlegen',
          id: id.titel(k.id),
          gliederungsart: k.art,
          ort,
          kurztext: k.kurztext,
        };
      } else if (k.art === 'hinweis') {
        befehl = { art: 'HinweistextAnlegen', id: k.id, ort, text: k.text };
      } else {
        const daten: Positionsdaten = {
          ordnungszahl: k.ordnungszahl,
          ozIndex: k.ozIndex,
          positionsart: k.positionsart,
          pauschal: k.pauschal,
          bedarfMitGesamtbetrag: k.bedarfMitGesamtbetrag,
          bezugspositionId: k.bezugspositionId,
          grundpositionId: k.grundpositionId,
          kurztext: k.kurztext,
          langtext: k.langtext,
          menge: k.menge,
          einheit: k.einheit,
          einheitspreis: k.einheitspreis,
          epa: k.epa,
        };
        befehl = { art: 'PositionAnlegen', id: k.id, ort, daten };
      }
      z = lvChangeSetAnwenden(z, erwarteOk(lvBefehlAusfuehren(z, befehl)));
    }
    expect(baumform(z.leistungsverzeichnis.knoten)).toEqual(baumform(inh.knoten));
    // `GliederungAnlegen` trägt keine Ordnungszahl (Ticket 06); die Fixture-Ordnungszahlen der Titel fehlen daher.
    const ohneOz = (k: Knoten): unknown =>
      k.art === 'titel' ? { ...(ohneLage(k) as object), ordnungszahl: null } : ohneLage(k);
    const nachId = (liste: readonly Knoten[]) => new Map(liste.map((k) => [k.id as string, ohneOz(k)]));
    expect(nachId(z.leistungsverzeichnis.knoten)).toEqual(nachId(inh.knoten));
    expect(pruefeLvInvarianten(z.leistungsverzeichnis)).toEqual([]);
  });
});

describe('Messung an fixtures/gross (kein Gate)', () => {
  it('Aufbau über LeistungsverzeichnisAnlegen und ein einzelnes PositionAnlegen', () => {
    const fx = fixtureLesen('gross');
    const inh = fixtureAlsInhalt(fx);
    const befehl = anlegen(fx.id, inh);

    const t0 = performance.now();
    const cs = erwarteOk(lvBefehlAusfuehren(null, befehl));
    const z = lvChangeSetAnwenden(null, cs);
    const aufbau = performance.now() - t0;

    // Eine Position mitten in den Baum einfügen („nach“ einer Position, die Geschwister dahinter rücken auf).
    const ziel = inh.knoten.filter((k) => k.art === 'position')[2500];
    if (!ziel) throw new Error('Fixture zu klein');
    const einfuegen = (z0: LvZustand, neu: string) => {
      const b: LvBefehl = {
        art: 'PositionAnlegen',
        id: id.pos(neu),
        ort: { art: 'nach', knotenId: ziel.id },
        daten: positionsdaten('neu'),
      };
      const t1 = performance.now();
      const c = erwarteOk(lvBefehlAusfuehren(z0, b));
      const t2 = performance.now();
      const z1 = lvChangeSetAnwenden(z0, c);
      const t3 = performance.now();
      return { z1, ausfuehren: t2 - t1, anwenden: t3 - t2 };
    };
    // Kalter Lauf (Index noch nicht gebaut) und warme Läufe auf dem Ergebniszustand der Vorrunde.
    const kalt = einfuegen(structuredClone(z), 'neu-0');
    let warm = z;
    const werte: number[] = [];
    const ausfuehrenWerte: number[] = [];
    for (let i = 1; i <= 20; i++) {
      const r = einfuegen(warm, `neu-${String(i)}`);
      werte.push(r.ausfuehren + r.anwenden);
      ausfuehrenWerte.push(r.ausfuehren);
      warm = r.z1;
    }
    const mitte = (w: number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;
    const median = mitte(werte);
    console.info(
      `[kern/05] gross: ${String(inh.knoten.length)} Knoten; Aufbau (Anlegen + Anwenden) ${aufbau.toFixed(1)} ms; ` +
        `1 Einfügen kalt: ausführen ${kalt.ausfuehren.toFixed(2)} ms + anwenden ${kalt.anwenden.toFixed(2)} ms; ` +
        `1 Einfügen warm (Median von 20): ausführen ${mitte(ausfuehrenWerte).toFixed(2)} ms, ausführen + anwenden ${median.toFixed(2)} ms`,
    );
    expect(pruefeLvInvarianten(warm.leistungsverzeichnis)).toEqual([]);
    // Nur eine grobe Plausibilität gegen versehentlich quadratisches Verhalten, kein Budget (Budget: Ticket 07).
    expect(median).toBeLessThan(250);
  });
});

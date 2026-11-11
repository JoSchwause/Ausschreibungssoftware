// SPDX-License-Identifier: AGPL-3.0-or-later
// Baumprüfung nach dem Schreiben (Ticket 10, schneller in Ticket 52): Jede Art von Befund wird mit derselben Meldung wie
// bisher abgewiesen, und nichts wird geschrieben. Waisen gehen vor Lücken; die Lücke nennt den ersten Elternknoten
// in Kennungsreihenfolge.

import type { Knoten, LvChangeSet, Position, PositionId, Protokolleintrag, Titel } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert, zaehle } from './testhilfe/node';

const typisch = ladeFixture('typisch');
const lvId = typisch.lv.leistungsverzeichnis.id;
const knoten = typisch.lv.leistungsverzeichnis.knoten;

async function mitTypisch(): Promise<Awaited<ReturnType<typeof neuerKern>>> {
  const env = await neuerKern();
  await speichere(env.kern, anlegenSchritte(typisch));
  return env;
}

let nr = 500;
const lvEintrag = (): Protokolleintrag =>
  eintrag(nr++, typisch.projekt.id, { art: 'leistungsverzeichnis', id: lvId }, { art: 'NachlassEntfernen' });

const changeSet = (k: Partial<LvChangeSet['knoten']>): LvChangeSet => ({
  art: 'leistungsverzeichnis',
  leistungsverzeichnisId: lvId,
  kopf: null,
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [], ...k },
  summen: { positionen: [], gliederungen: [], gesamt: null },
});

const kinder = (elternId: string): Knoten[] => knoten.filter((k) => k.elternId === elternId);
const ersteGliederungMitKindern = (): Titel => {
  const t = knoten.find((k): k is Titel => k.art === 'titel' && kinder(k.id).length > 1);
  if (t === undefined) throw new Error('kein Titel mit Kindern');
  return t;
};
const positionUnter = (elternId: string): Position => {
  const p = kinder(elternId).find((k): k is Position => k.art === 'position');
  if (p === undefined) throw new Error('keine Position');
  return p;
};

/** Wendet `cs` an, erwartet `konflikt` mit `meldung` und prüft, dass weder Daten noch Protokoll sich ändern. */
async function abgewiesen(cs: LvChangeSet, meldung: string): Promise<void> {
  const { kern, db } = await mitTypisch();
  const vorher = wert(kern.lvLaden(lvId));
  const eintraege = zaehle(db, 'protokoll');
  const r = await kern.anwenden(lvEintrag(), cs);
  expect(r).toEqual({ ok: false, fehler: { code: 'konflikt', meldung } });
  expect(wert(kern.lvLaden(lvId))).toEqual(vorher);
  expect(zaehle(db, 'protokoll')).toBe(eintraege);
}

describe('Baumprüfung nach dem Schreiben', () => {
  it('ein Knoten mit unbekanntem Elternknoten ist eine Waise', async () => {
    const p = positionUnter(ersteGliederungMitKindern().id);
    const neu = { ...p, id: 'waise-1' as PositionId, elternId: 'gibt-es-nicht' as never, reihenfolge: 0 };
    await abgewiesen(
      changeSet({ hinzugefuegt: [neu] }),
      'Konflikt: Knoten waise-1 hat keinen vorhandenen Elternknoten; nichts geschrieben.',
    );
  });

  it('eine entfernte Gliederung lässt ihre Kinder als Waisen zurück', async () => {
    const t = ersteGliederungMitKindern();
    const geschwister = kinder(t.elternId).filter((k) => k.reihenfolge > t.reihenfolge);
    // Die Geschwister rücken auf, damit nur die Waisen bleiben (keine Lücke).
    const nachruecken = geschwister.map((k) => ({
      vorher: k,
      nachher: { ...k, reihenfolge: k.reihenfolge - 1 },
    }));
    const { kern } = await mitTypisch();
    const r = await kern.anwenden(lvEintrag(), changeSet({ entfernt: [t], geaendert: nachruecken }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fehler.code).toBe('konflikt');
    expect(r.fehler.meldung).toMatch(
      /^Konflikt: Knoten .+ hat keinen vorhandenen Elternknoten; nichts geschrieben\.$/,
    );
  });

  it('eine Lücke am Ende der Reihenfolge', async () => {
    const t = ersteGliederungMitKindern();
    const p = positionUnter(t.id);
    const neu = { ...p, id: 'luecke-1' as PositionId, reihenfolge: kinder(t.id).length + 1 };
    await abgewiesen(
      changeSet({ hinzugefuegt: [neu] }),
      `Konflikt: Die Reihenfolge unter ${t.id} ist nicht dicht; nichts geschrieben.`,
    );
  });

  it('zwei Knoten mit derselben Reihenfolge', async () => {
    const t = ersteGliederungMitKindern();
    const p = positionUnter(t.id);
    const n = kinder(t.id).length;
    // n + 1 Kinder mit den Werten 0..n-1 und n-1 doppelt: kleinster 0, größter n, aber nicht dicht.
    const a = { ...p, id: 'doppelt-1' as PositionId, reihenfolge: n - 1 };
    const b = { ...p, id: 'doppelt-2' as PositionId, reihenfolge: n };
    const c = { ...p, id: 'doppelt-3' as PositionId, reihenfolge: n };
    await abgewiesen(
      changeSet({ hinzugefuegt: [a, b, c] }),
      `Konflikt: Die Reihenfolge unter ${t.id} ist nicht dicht; nichts geschrieben.`,
    );
  });

  it('eine Reihenfolge, die nicht bei 0 beginnt', async () => {
    const t = ersteGliederungMitKindern();
    const neuerTitel = { ...t, id: 'titel-neu' as never, reihenfolge: kinder(t.elternId).length };
    const p = positionUnter(t.id);
    const kind = { ...p, id: 'kind-1' as PositionId, elternId: 'titel-neu' as never, reihenfolge: 1 };
    await abgewiesen(
      changeSet({ hinzugefuegt: [neuerTitel, kind] }),
      'Konflikt: Die Reihenfolge unter titel-neu ist nicht dicht; nichts geschrieben.',
    );
  });

  it('Waise und Lücke zugleich: die Waise wird gemeldet', async () => {
    const t = ersteGliederungMitKindern();
    const p = positionUnter(t.id);
    const luecke = { ...p, id: 'luecke-2' as PositionId, reihenfolge: kinder(t.id).length + 3 };
    const waise = { ...p, id: 'waise-2' as PositionId, elternId: 'gibt-es-nicht' as never, reihenfolge: 0 };
    await abgewiesen(
      changeSet({ hinzugefuegt: [luecke, waise] }),
      'Konflikt: Knoten waise-2 hat keinen vorhandenen Elternknoten; nichts geschrieben.',
    );
  });

  it('zwei Lücken: gemeldet wird der erste Elternknoten nach Kennung', async () => {
    const titel = knoten.filter(
      (k): k is Titel => k.art === 'titel' && kinder(k.id).some((x) => x.art === 'position'),
    );
    const [t1, t2] = [...titel].sort((a, b) => (a.id < b.id ? -1 : 1));
    if (t1 === undefined || t2 === undefined) throw new Error('zu wenige Titel');
    const neu = (t: Titel, id: string): Position => ({
      ...positionUnter(t.id),
      id: id as PositionId,
      reihenfolge: kinder(t.id).length + 1,
    });
    await abgewiesen(
      changeSet({ hinzugefuegt: [neu(t2, 'luecke-b'), neu(t1, 'luecke-a')] }),
      `Konflikt: Die Reihenfolge unter ${t1.id} ist nicht dicht; nichts geschrieben.`,
    );
  });

  it('ein Verschieben, das den Baum dicht lässt, wird angenommen', async () => {
    const t = ersteGliederungMitKindern();
    const [a, b] = [...kinder(t.id)].sort((x, y) => x.reihenfolge - y.reihenfolge);
    if (a === undefined || b === undefined) throw new Error('zu wenige Kinder');
    const { kern } = await mitTypisch();
    const r = await kern.anwenden(
      lvEintrag(),
      changeSet({
        geaendert: [
          { vorher: a, nachher: { ...a, reihenfolge: b.reihenfolge } },
          { vorher: b, nachher: { ...b, reihenfolge: a.reihenfolge } },
        ],
      }),
    );
    expect(r).toEqual({ ok: true, wert: undefined });
  });
});

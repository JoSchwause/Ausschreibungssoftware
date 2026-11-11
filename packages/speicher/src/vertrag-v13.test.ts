// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.3: mechanisch angepasst, Folgeticket (Ticket 57 speichert die Felder und löscht diesen Test): Felder aus dem Vertrag
// v1.3, die die Tabellen noch nicht halten, werden laut abgewiesen, nicht still verworfen (Q5).

import type { Knoten, LvZustand } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { eintrag, ladeFixture, lvAnlegenChangeSet, projektChangeSet } from './testhilfe/fixtures';
import { neuerKern, wert } from './testhilfe/node';

const f = ladeFixture('winzig');
const lv = f.lv.leistungsverzeichnis;

async function anlegenMit(z: LvZustand): Promise<unknown> {
  const { kern } = await neuerKern();
  const p = eintrag(
    1,
    f.projekt.id,
    { art: 'projekt', id: f.projekt.id },
    {
      art: 'ProjektAnlegen',
      id: f.projekt.id,
      name: f.projekt.name,
      bauherr: f.projekt.bauherr,
    },
  );
  wert(await kern.anwenden(p, projektChangeSet(f.projekt)));
  const e = eintrag(
    2,
    f.projekt.id,
    { art: 'leistungsverzeichnis', id: lv.id },
    {
      art: 'LeistungsverzeichnisUmbenennen',
      name: lv.name,
    },
  );
  const r = await kern.anwenden(e, lvAnlegenChangeSet(z));
  return r.ok ? 'ok' : r.fehler.code;
}

describe('Vertrag v1.3: neue Felder vor Ticket 57', () => {
  it('ohne die neuen Felder wird das LV angelegt', async () => {
    expect(await anlegenMit(f.lv)).toBe('ok');
  });

  it('Auftragnehmer oder EPA-Bezeichnungen am Kopf: unbekannt', async () => {
    const auftragnehmer = { name: 'Beispielbau', strasse: null, plz: null, ort: null };
    expect(await anlegenMit({ ...f.lv, leistungsverzeichnis: { ...lv, auftragnehmer } })).toBe('unbekannt');
    const epaBezeichnungen = [{ nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' }] as const;
    expect(await anlegenMit({ ...f.lv, leistungsverzeichnis: { ...lv, epaBezeichnungen } })).toBe(
      'unbekannt',
    );
  });

  it('Mengenansatz an einer Position: unbekannt', async () => {
    const mitAnsatz = (k: Knoten): Knoten =>
      k.art === 'position'
        ? { ...k, mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '1', variable: null }] }
        : k;
    const knoten = lv.knoten.map(mitAnsatz);
    expect(await anlegenMit({ ...f.lv, leistungsverzeichnis: { ...lv, knoten } })).toBe('unbekannt');
  });
});

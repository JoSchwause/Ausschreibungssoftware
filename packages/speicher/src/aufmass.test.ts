// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt in `speicher` (Ticket 79, Vertrag v1.4): ganzes Aggregat im ChangeSet (D-36 (8)), `vorher` muss zum
// gespeicherten Stand passen, Undo durch Tausch, Repository nach Blattnummer, `AufmassAnlegen` als Kurzfassung (E-13).

import type { AufmassChangeSet, Befehl } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { imProtokoll, wert } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';
import { anwenden, aufmass, aufmassCs, AUFTRAG, mitAuftrag, P } from './testhilfe/v14';

const anlegen = (a = aufmass(1)): [AufmassChangeSet, Befehl] => [
  aufmassCs(null, a),
  { art: 'AufmassAnlegen', aufmass: a },
];

const code = (r: { ok: boolean; fehler?: { code: string } }): string | false => !r.ok && (r.fehler?.code ?? '');

describe('Aufmaßblatt speichern und laden', () => {
  it('Anlegen → Laden; auflisten liefert die Köpfe nach Blattnummer; AufmassAnlegen steht als Kurzfassung im Protokoll', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const zwei = aufmass(2, { datum: null, bezeichnung: '' });
    wert(await anwenden(kern, ...anlegen(zwei)));
    wert(await anwenden(kern, ...anlegen()));
    expect(wert(await s.aufmasse.laden(zwei.id))).toEqual({ aufmass: zwei });
    expect(wert(await s.aufmasse.laden(aufmass(1).id))).toEqual({ aufmass: aufmass(1) });
    const kopf = (n: number, mehr: object = {}) => {
      const { positionen: _, ...k } = { ...aufmass(n), ...mehr };
      return k;
    };
    expect(wert(await s.aufmasse.auflisten(AUFTRAG))).toEqual([kopf(1), kopf(2, { datum: null, bezeichnung: '' })]);
    const letzter = wert(kern.protokoll(P)).at(-1);
    if (letzter === undefined) throw new Error('kein Protokolleintrag');
    expect(letzter.befehl.art).toBe('Befehlskurzfassung');
    expect(letzter).toEqual(imProtokoll({ ...letzter, befehl: anlegen()[1] }));
  });

  it('Ändern (eine Zeile) mit Undo und Redo; ein vorher, das nicht zum gespeicherten Stand passt: konflikt', async () => {
    const kern = await mitAuftrag();
    wert(await anwenden(kern, ...anlegen()));
    const a = aufmass(1);
    const geaendert = { ...a, positionen: [a.positionen[0], { ...a.positionen[1], menge: '2.400' }] } as typeof a;
    const cs = aufmassCs(a, geaendert);
    wert(await anwenden(kern, cs));
    expect(wert(kern.aufmassLaden(a.id)).aufmass).toEqual(geaendert);
    wert(await anwenden(kern, umkehren(cs)));
    expect(wert(kern.aufmassLaden(a.id)).aufmass).toEqual(a);
    wert(await anwenden(kern, cs));
    expect(wert(kern.aufmassLaden(a.id)).aufmass).toEqual(geaendert);
    // Noch einmal dasselbe ChangeSet: Sein vorher ist veraltet.
    expect(code(await anwenden(kern, cs))).toBe('konflikt');
    expect(wert(kern.aufmassLaden(a.id)).aufmass).toEqual(geaendert);
  });

  it('Löschen mit vollem Stand und Undo; mit veraltetem Stand konflikt; ein unbekanntes Blatt ändern: nicht-gefunden', async () => {
    const kern = await mitAuftrag();
    wert(await anwenden(kern, ...anlegen()));
    const a = aufmass(1);
    expect(code(await anwenden(kern, aufmassCs({ ...a, bezeichnung: 'alt' }, null)))).toBe('konflikt');
    const loeschen = aufmassCs(a, null);
    wert(await anwenden(kern, loeschen));
    expect(code(kern.aufmassLaden(a.id))).toBe('nicht-gefunden');
    expect(wert(kern.aufmasseAuflisten(AUFTRAG))).toEqual([]);
    wert(await anwenden(kern, umkehren(loeschen)));
    expect(wert(kern.aufmassLaden(a.id)).aufmass).toEqual(a);
    expect(code(await anwenden(kern, aufmassCs(aufmass(7), aufmass(7, { bezeichnung: 'x' }))))).toBe(
      'nicht-gefunden',
    );
  });

  it('Anlegen: Kennung schon vergeben, Blattnummer im Auftrags-LV doppelt, Auftrags-LV nicht im Projekt: konflikt', async () => {
    const kern = await mitAuftrag();
    wert(await anwenden(kern, ...anlegen()));
    expect(code(await anwenden(kern, ...anlegen(aufmass(1, { bezeichnung: 'zweimal' }))))).toBe('konflikt');
    expect(code(await anwenden(kern, ...anlegen(aufmass(2, { nummer: 1 }))))).toBe('konflikt');
    expect(code(await anwenden(kern, ...anlegen(aufmass(3, { auftragsLvId: 'fremd' as never }))))).toBe(
      'konflikt',
    );
    expect(wert(kern.aufmasseAuflisten(AUFTRAG)).map((k) => k.id)).toEqual(['aufmass-1']);
  });

  it('Programmfehler im ChangeSet (Kennung, Projekt, feste Felder, beide Seiten leer): unbekannt', async () => {
    const kern = await mitAuftrag();
    wert(await anwenden(kern, ...anlegen()));
    const a = aufmass(1);
    const faelle: AufmassChangeSet[] = [
      { ...aufmassCs(null, aufmass(2)), aufmassId: 'anders' as never },
      aufmassCs(null, aufmass(2, { projektId: 'anderes-projekt' as never })),
      aufmassCs(a, { ...a, nummer: 5 }),
      aufmassCs(a, { ...a, auftragsLvId: 'auftrags-lv-2' as never }),
      aufmassCs(null, aufmass(0)),
      { art: 'aufmass', aufmassId: a.id, aufmass: { vorher: null, nachher: null } },
    ];
    for (const cs of faelle) expect(code(await anwenden(kern, cs)), JSON.stringify(cs).slice(0, 80)).toBe('unbekannt');
    expect(wert(kern.aufmassLaden(a.id)).aufmass).toEqual(a);
  });

  it('auflisten zu einem unbekannten Auftrags-LV: nicht-gefunden', async () => {
    const kern = await mitAuftrag();
    expect(code(kern.aufmasseAuflisten('unbekannt' as never))).toBe('nicht-gefunden');
  });
});

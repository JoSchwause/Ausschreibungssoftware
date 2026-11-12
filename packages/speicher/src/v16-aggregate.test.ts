// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauzeitenplan, Honorarberechnung, Mangel und Bautagebucheintrag in `speicher` (`vertrag` v1.6 Punkte 4 bis 6 und 8; D-57,
// D-97.6; Ticket 106 Punkt 3): ganze Aggregate im ChangeSet (Anlegen, Ändern, Löschen; `vorher` muss zum gespeicherten Stand
// passen), Repositories mit den Sortierungen des Vertrags, die starken Verweise (`konflikt`) und Undo durch Tausch.

import type { AuftragsLeistungsverzeichnisId, ChangeSet, IfcGlobalId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, auftragsLvLoeschenChangeSet, eintrag } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';
import {
  AUFTRAG,
  AUFTRAG_ZUSTAND,
  aggregatVon,
  F,
  kostenermittlung,
  kostenermittlungCs,
  mitAuftrag,
  P,
} from './testhilfe/v14';
import {
  bauzeitenplan,
  honorarberechnung,
  honorarCs,
  ifcBytes,
  mangel,
  mangelCs,
  modell,
  modellAnlegenCs,
  modellLoeschenCs,
  planCs,
  tagebuch,
  tagebuchCs,
} from './testhilfe/v16';

let nr = 800;
function schreibe(kern: SpeicherKern, cs: ChangeSet) {
  nr += 1;
  return kern.anwenden(eintrag(nr, P, aggregatVon(cs), { art: 'MangelLoeschen' }), cs);
}
const code = async (r: ReturnType<typeof schreibe>): Promise<string | false> => {
  const e = await r;
  return !e.ok && e.fehler.code;
};

describe('Bauzeitenplan (v1.6, D-57)', () => {
  it('anlegen, laden, auflisten ohne Vorgänge nach Name; ändern und löschen mit Undo', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const a = bauzeitenplan(1, 3, { name: 'Rohbau' });
    const b = bauzeitenplan(2, 0, { name: 'Ausbau' });
    wert(await schreibe(kern, planCs(null, a)));
    wert(await schreibe(kern, planCs(null, b)));
    expect(wert(await s.bauzeitenplaene.laden(a.id))).toEqual({ bauzeitenplan: a });
    const { vorgaenge, ...kopfB } = b;
    void vorgaenge;
    expect(wert(await s.bauzeitenplaene.auflisten(P))[0]).toEqual(kopfB);
    expect(wert(await s.bauzeitenplaene.auflisten(P)).map((u) => u.name)).toEqual(['Ausbau', 'Rohbau']);

    const mehr = { ...a, vorgaenge: [...a.vorgaenge, ...bauzeitenplan(1, 13).vorgaenge.slice(10)] };
    const aendern = planCs(a, mehr);
    wert(await schreibe(kern, aendern));
    expect(wert(kern.bauzeitenplanLaden(a.id)).bauzeitenplan).toEqual(mehr);
    wert(await schreibe(kern, umkehren(aendern)));
    expect(wert(kern.bauzeitenplanLaden(a.id)).bauzeitenplan).toEqual(a);
    const loeschen = planCs(a, null);
    wert(await schreibe(kern, loeschen));
    expect(wert(kern.bauzeitenplaeneAuflisten(P))).toHaveLength(1);
    wert(await schreibe(kern, umkehren(loeschen)));
    expect(wert(kern.bauzeitenplanLaden(a.id)).bauzeitenplan).toEqual(a);
  });

  it('ein Vorherstand, der nicht passt: konflikt; unbekannter Plan: nicht-gefunden; eine Datei mit Kopf allein ändert nur den Kopf', async () => {
    const kern = await mitAuftrag();
    const a = bauzeitenplan(1, 3);
    wert(await schreibe(kern, planCs(null, a)));
    expect(await code(schreibe(kern, planCs({ ...a, vorgaenge: [] }, { ...a, name: 'x' })))).toBe('konflikt');
    expect(await code(schreibe(kern, planCs({ ...a, name: 'y' }, { ...a, name: 'x' })))).toBe('konflikt');
    expect(await code(schreibe(kern, planCs(bauzeitenplan(9), null)))).toBe('nicht-gefunden');
    expect(await code(schreibe(kern, planCs(null, a)))).toBe('konflikt');
    wert(await schreibe(kern, planCs(a, { ...a, name: 'Neu', projektbeginn: '2027-01-04' })));
    expect(wert(kern.bauzeitenplanLaden(a.id)).bauzeitenplan).toEqual({
      ...a,
      name: 'Neu',
      projektbeginn: '2027-01-04',
    });
  });

  it('ein Vorgangsbezug ist ein schwacher Verweis: ein LV, das es nicht gibt, sperrt nichts', async () => {
    const kern = await mitAuftrag();
    const [erster, ...rest] = bauzeitenplan(1, 2).vorgaenge;
    if (erster === undefined) throw new Error('Vorgang');
    const a = bauzeitenplan(1, 2, {
      vorgaenge: [
        {
          ...erster,
          bezug: {
            art: 'auftrags-leistungsverzeichnis',
            id: 'gibt-es-nicht' as AuftragsLeistungsverzeichnisId,
            knotenIds: null,
          },
        },
        ...rest,
      ],
    });
    wert(await schreibe(kern, planCs(null, a)));
    expect(wert(kern.bauzeitenplanLaden(a.id)).bauzeitenplan).toEqual(a);
  });
});

describe('Honorarberechnung (v1.6, D-56)', () => {
  const KE = kostenermittlung(1);

  it('anlegen mit Verweis auf eine Kostenermittlung; auflisten ohne Objekte; Undo', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    wert(await schreibe(kern, kostenermittlungCs(null, KE)));
    const h = honorarberechnung(1, KE.id);
    const anlegen = honorarCs(null, h);
    wert(await schreibe(kern, anlegen));
    expect(wert(await s.honorarberechnungen.laden(h.id))).toEqual({ honorarberechnung: h });
    const { objekte, ...uebersicht } = h;
    void objekte;
    expect(wert(await s.honorarberechnungen.auflisten(P))).toEqual([uebersicht]);
    const aendern = honorarCs(h, { ...h, name: 'Tragwerk', nebenkosten: null });
    wert(await schreibe(kern, aendern));
    wert(await schreibe(kern, umkehren(aendern)));
    expect(wert(kern.honorarberechnungLaden(h.id)).honorarberechnung).toEqual(h);
    wert(await schreibe(kern, umkehren(anlegen)));
    expect(wert(kern.honorarberechnungenAuflisten(P))).toEqual([]);
  });

  it('ein Verweis auf eine Kostenermittlung, die es im Projekt nicht gibt: konflikt', async () => {
    const kern = await mitAuftrag();
    expect(await code(schreibe(kern, honorarCs(null, honorarberechnung(1, KE.id))))).toBe('konflikt');
    wert(await schreibe(kern, honorarCs(null, honorarberechnung(2, null))));
  });

  it('eine Kostenermittlung, auf die eine Honorarberechnung verweist, lässt sich nicht löschen (konflikt, Q5)', async () => {
    const kern = await mitAuftrag();
    wert(await schreibe(kern, kostenermittlungCs(null, KE)));
    const h = honorarberechnung(1, KE.id);
    wert(await schreibe(kern, honorarCs(null, h)));
    expect(await code(schreibe(kern, kostenermittlungCs(KE, null)))).toBe('konflikt');
    wert(await schreibe(kern, kostenermittlungCs(KE, { ...KE, name: 'umbenannt' })));
    wert(await schreibe(kern, honorarCs(h, null)));
    wert(await schreibe(kern, kostenermittlungCs({ ...KE, name: 'umbenannt' }, null)));
  });
});

describe('Mangel (v1.6, D-57, D-97.6)', () => {
  it('anlegen, Status wechseln, Undo; auflisten ganz nach Nummer', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const m2 = mangel(2);
    const m1 = mangel(1, { auftragsLvId: AUFTRAG, positionId: 'gibt-es-nicht' as never });
    wert(await schreibe(kern, mangelCs(null, m2)));
    wert(await schreibe(kern, mangelCs(null, m1)));
    expect(wert(await s.maengel.auflisten(P))).toEqual([m1, m2]);
    const angezeigt = {
      ...m1,
      verlauf: [...m1.verlauf, { status: 'angezeigt' as const, datum: '2026-11-21', bemerkung: null }],
    };
    const wechsel = mangelCs(m1, angezeigt);
    wert(await schreibe(kern, wechsel));
    expect(wert(await s.maengel.laden(m1.id))).toEqual({ mangel: angezeigt });
    wert(await schreibe(kern, umkehren(wechsel)));
    expect(wert(kern.mangelLaden(m1.id)).mangel).toEqual(m1);
  });

  it('eine Nummer, die im Projekt vergeben ist: konflikt; die Nummer bleibt fest (unbekannt)', async () => {
    const kern = await mitAuftrag();
    wert(await schreibe(kern, mangelCs(null, mangel(1))));
    expect(await code(schreibe(kern, mangelCs(null, { ...mangel(1), id: 'mangel-x' as never })))).toBe(
      'konflikt',
    );
    expect(await code(schreibe(kern, mangelCs(mangel(1), { ...mangel(1), nummer: 5 })))).toBe('unbekannt');
  });

  it('Auftrags-LV und Modell müssen im Projekt sein (konflikt); solange ein Mangel darauf zeigt, lassen sie sich nicht löschen', async () => {
    const kern = await mitAuftrag();
    const bytes = ifcBytes('mangel');
    await kern.modelldateiAblegen(bytes);
    const mod = modell(1, bytes);
    wert(await schreibe(kern, modellAnlegenCs(mod)));
    const fremdesLv = mangel(1, { auftragsLvId: 'fremd' as AuftragsLeistungsverzeichnisId });
    expect(await code(schreibe(kern, mangelCs(null, fremdesLv)))).toBe('konflikt');
    const bauteil = {
      bauwerksmodellId: 'modell-fremd' as never,
      globalId: '1Wand$Aussen_EG_000001' as IfcGlobalId,
    };
    expect(await code(schreibe(kern, mangelCs(null, mangel(1, { bauteil }))))).toBe('konflikt');

    const m = mangel(1, { auftragsLvId: AUFTRAG, bauteil: { ...bauteil, bauwerksmodellId: mod.id } });
    wert(await schreibe(kern, mangelCs(null, m)));
    expect(await code(schreibe(kern, auftragsLvLoeschenChangeSet(AUFTRAG_ZUSTAND)))).toBe('konflikt');
    expect(await code(schreibe(kern, modellLoeschenCs(mod)))).toBe('konflikt');
    // Ein Mangel ohne bestimmten Stand (`bauwerksmodellId: null`) sperrt kein Modell (D-97.6).
    const ohneStand = { ...m, bauteil: { ...bauteil, bauwerksmodellId: null } };
    wert(await schreibe(kern, mangelCs(m, ohneStand)));
    wert(await schreibe(kern, modellLoeschenCs(mod)));
    wert(await schreibe(kern, mangelCs(ohneStand, null)));
    wert(await schreibe(kern, auftragsLvLoeschenChangeSet(AUFTRAG_ZUSTAND)));
  });
});

describe('Bautagebucheintrag (v1.6, D-57)', () => {
  it('anlegen, ändern, Undo; auflisten ganz nach Datum', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const b = tagebuch(1, '2026-11-24');
    const a = tagebuch(2, '2026-11-23');
    wert(await schreibe(kern, tagebuchCs(null, b)));
    wert(await schreibe(kern, tagebuchCs(null, a)));
    expect(wert(await s.bautagebuch.auflisten(P))).toEqual([a, b]);
    const aendern = tagebuchCs(b, { ...b, datum: '2026-11-25', vorkommnisse: 'Abnahme Bodenplatte' });
    wert(await schreibe(kern, aendern));
    expect(wert(await s.bautagebuch.laden(b.id))).toEqual({
      bautagebucheintrag: aendern.bautagebucheintrag.nachher,
    });
    wert(await schreibe(kern, umkehren(aendern)));
    expect(wert(kern.bautagebucheintragLaden(b.id)).bautagebucheintrag).toEqual(b);
  });

  it('ein Datum, das im Projekt schon ein anderer Eintrag trägt: konflikt (anlegen und ändern)', async () => {
    const kern = await mitAuftrag();
    const a = tagebuch(1, '2026-11-23');
    const b = tagebuch(2, '2026-11-24');
    wert(await schreibe(kern, tagebuchCs(null, a)));
    wert(await schreibe(kern, tagebuchCs(null, b)));
    expect(await code(schreibe(kern, tagebuchCs(null, tagebuch(3, '2026-11-23'))))).toBe('konflikt');
    expect(await code(schreibe(kern, tagebuchCs(b, { ...b, datum: '2026-11-23' })))).toBe('konflikt');
  });
});

describe('Repositories und Löschregeln am Projekt', () => {
  it('unbekanntes Projekt: nicht-gefunden; ein Projekt mit einem der neuen Aggregate lässt sich nicht löschen', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const fremd = 'p-?' as ProjektId;
    for (const r of [
      await s.bauzeitenplaene.auflisten(fremd),
      await s.honorarberechnungen.auflisten(fremd),
      await s.maengel.auflisten(fremd),
      await s.bautagebuch.auflisten(fremd),
      await s.bauzeitenplaene.laden('x' as never),
      await s.honorarberechnungen.laden('x' as never),
      await s.maengel.laden('x' as never),
      await s.bautagebuch.laden('x' as never),
    ])
      expect(!r.ok && r.fehler.code).toBe('nicht-gefunden');
  });

  it('ein Projekt, an dem einer der neuen Aggregate hängt, lässt sich nicht löschen (konflikt); ohne sie geht es', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(F).slice(0, 1));
    const loeschen = { art: 'projekt', projektId: P, projekt: { vorher: F.projekt, nachher: null } } as const;
    for (const cs of [
      planCs(null, bauzeitenplan(1)),
      honorarCs(null, honorarberechnung(1, null)),
      mangelCs(null, mangel(1)),
      tagebuchCs(null, tagebuch(1, '2026-11-23')),
    ]) {
      wert(await schreibe(kern, cs));
      expect(await code(schreibe(kern, loeschen)), cs.art).toBe('konflikt');
      wert(await schreibe(kern, umkehren(cs)));
    }
    wert(await schreibe(kern, loeschen));
  });
});

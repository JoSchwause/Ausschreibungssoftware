// SPDX-License-Identifier: AGPL-3.0-or-later
// S3, Punkte 2–4: `Rueckgaengig`/`Wiederholen` im Protokoll, LV-Stände (ADR 0006) und Papierkorb im Speicher.

import type {
  Befehl,
  ChangeSet,
  LvChangeSet,
  LvZustand,
  Position,
  Protokolleintrag,
  ProtokollId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, eintrag, ladeFixture, lvLoeschenChangeSet } from './testhilfe/fixtures';
import { imProtokoll, neuerKern, speichere, wert, zaehle } from './testhilfe/node';
import { ausBaumNehmen, eintragEntfernen, feldAendern, standAnlegen, umkehren } from './testhilfe/umkehrung';
import type { Datenbank } from './sql';

const typisch = ladeFixture('typisch');
const P = typisch.projekt.id;
const LV = typisch.lv.leistungsverzeichnis.id;
const HINWEIS = typisch.lv.leistungsverzeichnis.knoten.find((k) => k.art === 'hinweis')?.id as string;
const positionen = typisch.lv.leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position');
const pos = (i: number): Position =>
  positionen[i] ??
  (() => {
    throw new Error('Position fehlt');
  })();
const lvAggregat: Protokolleintrag['aggregat'] = { art: 'leistungsverzeichnis', id: LV };

let nr = 1000;
const naechste = (): number => nr++;
const um = (n: number): Protokolleintrag['wann'] =>
  `2026-11-10T12:${String(n).padStart(2, '0')}:00.000Z` as Protokolleintrag['wann'];

async function mitTypisch(): Promise<{ kern: SpeicherKern; db: Datenbank }> {
  const env = await neuerKern();
  await speichere(env.kern, anlegenSchritte(typisch));
  return env;
}

const lv = (kern: SpeicherKern): LvZustand => wert(kern.lvLaden(LV));
const code = (r: { ok: boolean; fehler?: { code: string } }): string | undefined => r.fehler?.code;

/** Wendet an und liefert den Eintrag (mit eigener Zeit, wenn gegeben). */
async function schreibe(
  kern: SpeicherKern,
  befehl: Befehl,
  cs: ChangeSet,
  wann?: Protokolleintrag['wann'],
  aggregat = lvAggregat,
): Promise<Protokolleintrag> {
  const e = { ...eintrag(naechste(), P, aggregat, befehl), ...(wann === undefined ? {} : { wann }) };
  wert(await kern.anwenden(e, cs));
  return e;
}

const mengeAendern = (z: LvZustand, p: Position, menge: string, gp: string): [Befehl, LvChangeSet] => {
  const aktuell = z.leistungsverzeichnis.knoten.find((k) => k.id === p.id) as Position;
  return [
    { art: 'MengeAendern', positionId: p.id, menge: menge as never },
    feldAendern(z, p.id, { ...aktuell, menge: menge as Position['menge'] }, gp),
  ];
};

describe('Rueckgaengig und Wiederholen im Protokoll (S3, Punkt 2)', () => {
  it('je genau ein Eintrag mit Verweis auf den ursprünglichen Befehl; Wiederholen wendet das Original wieder an', async () => {
    const { kern } = await mitTypisch();
    const vorher = wert(kern.protokoll(P)).length;
    const [befehl, cs] = mengeAendern(lv(kern), pos(0), '3.000', '30.00');
    const original = await schreibe(kern, befehl, cs);
    const zurueck = await schreibe(kern, { art: 'Rueckgaengig', protokollId: original.id }, umkehren(cs));
    const wieder = await schreibe(kern, { art: 'Wiederholen', protokollId: original.id }, cs);
    const protokoll = wert(kern.protokoll(P));
    expect(protokoll).toHaveLength(vorher + 3);
    expect(protokoll.slice(-3)).toEqual([original, zurueck, wieder]);
    expect(lv(kern).leistungsverzeichnis.knoten.find((k) => k.id === pos(0).id)).toMatchObject({
      menge: '3.000',
    });
  });

  it('eine Befehlsfolge wird mit je einem Rueckgaengig je Befehl in umgekehrter Reihenfolge zurückgenommen (D-12)', async () => {
    const { kern } = await mitTypisch();
    const davor = lv(kern);
    const [b1, cs1] = mengeAendern(lv(kern), pos(0), '3.000', '30.00');
    const e1 = await schreibe(kern, b1, cs1);
    const [b2, cs2] = mengeAendern(lv(kern), pos(0), '4.000', '40.00');
    const e2 = await schreibe(kern, b2, cs2);
    // Falsche Reihenfolge: das erste zuerst zurückzunehmen passt nicht mehr zum Stand.
    const falsch = await kern.anwenden(
      eintrag(naechste(), P, lvAggregat, { art: 'Rueckgaengig', protokollId: e1.id }),
      umkehren(cs1),
    );
    expect(code(falsch)).toBe('konflikt');
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: e2.id }, umkehren(cs2));
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: e1.id }, umkehren(cs1));
    expect(lv(kern)).toEqual(davor);
  });

  it.each<[string, (e: Protokolleintrag) => Protokolleintrag]>([
    [
      'unbekannter Eintrag',
      (e) => ({ ...e, befehl: { art: 'Rueckgaengig', protokollId: 'gibt-es-nicht' as ProtokollId } }),
    ],
    [
      'Eintrag eines anderen Aggregats',
      (e) => ({ ...e, befehl: { art: 'Wiederholen', protokollId: 'protokoll-000001' as ProtokollId } }),
    ],
  ])('Verweis auf %s: konflikt, nichts geschrieben', async (_name, aendere) => {
    const { kern, db } = await mitTypisch();
    const [befehl, cs] = mengeAendern(lv(kern), pos(0), '3.000', '30.00');
    const original = await schreibe(kern, befehl, cs);
    const davor = wert(kern.projektdateiExportieren(P));
    const e = aendere(eintrag(naechste(), P, lvAggregat, { art: 'Rueckgaengig', protokollId: original.id }));
    expect(code(await kern.anwenden(e, umkehren(cs)))).toBe('konflikt');
    expect(wert(kern.projektdateiExportieren(P)) === davor).toBe(true);
    expect(zaehle(db, 'protokoll')).toBe((JSON.parse(davor) as { protokoll: unknown[] }).protokoll.length);
  });

  it('Verweis auf einen Eintrag eines anderen Projekts oder auf ein Rueckgaengig: konflikt', async () => {
    const { kern } = await mitTypisch();
    const winzig = ladeFixture('winzig');
    await speichere(kern, anlegenSchritte(winzig, 900));
    const fremd = 'protokoll-000901' as ProtokollId; // LV-Anlegen im Projekt winzig
    const [befehl, cs] = mengeAendern(lv(kern), pos(0), '3.000', '30.00');
    const original = await schreibe(kern, befehl, cs);
    const r1 = await kern.anwenden(
      eintrag(naechste(), P, lvAggregat, { art: 'Rueckgaengig', protokollId: fremd }),
      umkehren(cs),
    );
    expect(code(r1)).toBe('konflikt');
    const zurueck = await schreibe(kern, { art: 'Rueckgaengig', protokollId: original.id }, umkehren(cs));
    const r2 = await kern.anwenden(
      eintrag(naechste(), P, lvAggregat, { art: 'Wiederholen', protokollId: zurueck.id }),
      cs,
    );
    expect(code(r2)).toBe('konflikt');
  });

  it('der Dekoder liest beide Befehle: Export → Import → Export ist byte-gleich', async () => {
    const { kern } = await mitTypisch();
    const [befehl, cs] = mengeAendern(lv(kern), pos(0), '3.000', '30.00');
    const original = await schreibe(kern, befehl, cs);
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: original.id }, umkehren(cs));
    await schreibe(kern, { art: 'Wiederholen', protokollId: original.id }, cs);
    const text = wert(kern.projektdateiExportieren(P));
    const { kern: zweiter } = await neuerKern();
    wert(zweiter.projektdateiImportieren(text));
    expect(wert(zweiter.projektdateiExportieren(P)) === text).toBe(true);
  });

  it.each<[string, (p: Record<string, unknown>[]) => void]>([
    [
      'Verweis ins Leere',
      (p) => {
        (p.at(-1)?.['befehl'] as Record<string, unknown>)['protokollId'] = 'x';
      },
    ],
    [
      'Verweis nach vorn',
      (p) => {
        const b = p.at(-2)?.['befehl'] as Record<string, unknown>;
        b['protokollId'] = p.at(-1)?.['id'];
      },
    ],
    [
      'Verweis auf ein Rueckgaengig',
      (p) => {
        (p.at(-1)?.['befehl'] as Record<string, unknown>)['protokollId'] = p.at(-2)?.['id'];
      },
    ],
    [
      'ohne protokollId',
      (p) => {
        Reflect.deleteProperty(p.at(-1)?.['befehl'] as object, 'protokollId');
      },
    ],
    [
      'mit fremdem Feld',
      (p) => {
        (p.at(-1)?.['befehl'] as Record<string, unknown>)['knotenId'] = 'k';
      },
    ],
  ])('Projektdatei mit Historienbefehl, %s: datei-ungueltig', async (_name, aendere) => {
    const { kern } = await mitTypisch();
    const [befehl, cs] = mengeAendern(lv(kern), pos(0), '3.000', '30.00');
    const original = await schreibe(kern, befehl, cs);
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: original.id }, umkehren(cs));
    await schreibe(kern, { art: 'Wiederholen', protokollId: original.id }, cs);
    const d = JSON.parse(wert(kern.projektdateiExportieren(P))) as { protokoll: Record<string, unknown>[] };
    aendere(d.protokoll);
    const { kern: zweiter } = await neuerKern();
    expect(zweiter.projektdateiImportieren(JSON.stringify(d))).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
  });
});

describe('LV-Stände (S3, Punkt 3; ADR 0006)', () => {
  it('Anlegen friert den gespeicherten Stand ein; spätere Befehle ändern ihn nicht; auflisten und laden', async () => {
    const { kern } = await mitTypisch();
    const eingefroren = lv(kern);
    await schreibe(
      kern,
      { art: 'LvStandAnlegen', id: 'stand-1' as never, name: 'Versand' },
      standAnlegen(lv(kern), 'stand-1', 'Versand'),
      um(5),
    );
    const [befehl, cs] = mengeAendern(lv(kern), pos(0), '3.000', '30.00');
    await schreibe(kern, befehl, cs);
    await schreibe(
      kern,
      { art: 'LvStandAnlegen', id: 'stand-2' as never, name: 'Auftrag' },
      standAnlegen(lv(kern), 'stand-2', 'Auftrag'),
      um(9),
    );

    expect(wert(kern.lvStaendeAuflisten(LV))).toEqual([
      { id: 'stand-1', leistungsverzeichnisId: LV, name: 'Versand', angelegt: um(5) },
      { id: 'stand-2', leistungsverzeichnisId: LV, name: 'Auftrag', angelegt: um(9) },
    ]);
    const s1 = wert(kern.lvStandLaden('stand-1' as never));
    expect(s1).toEqual({
      id: 'stand-1',
      leistungsverzeichnisId: LV,
      name: 'Versand',
      angelegt: um(5),
      zustand: eingefroren,
    });
    expect(wert(kern.lvStandLaden('stand-2' as never)).zustand).toEqual(lv(kern));
    expect(s1.zustand).not.toEqual(lv(kern));
  });

  it('der Stand trägt den Papierkorb; Umkehrung entfernt ihn, Wiederholen friert neu ein (neues angelegt, D-12)', async () => {
    const { kern } = await mitTypisch();
    await schreibe(
      kern,
      { art: 'KnotenInPapierkorbLegen', eintragId: 'e1' as never, knotenIds: [HINWEIS as never] },
      ausBaumNehmen(lv(kern), [HINWEIS], { id: 'e1', nummer: 1 }),
    );
    const cs = standAnlegen(lv(kern), 'stand-1', 'Versand');
    const original = await schreibe(
      kern,
      { art: 'LvStandAnlegen', id: 'stand-1' as never, name: 'Versand' },
      cs,
      um(1),
    );
    expect(wert(kern.lvStandLaden('stand-1' as never)).zustand.papierkorb).toHaveLength(1);
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: original.id }, umkehren(cs), um(2));
    expect(wert(kern.lvStaendeAuflisten(LV))).toEqual([]);
    expect(kern.lvStandLaden('stand-1' as never)).toMatchObject({
      ok: false,
      fehler: { code: 'nicht-gefunden' },
    });
    await schreibe(kern, { art: 'Wiederholen', protokollId: original.id }, cs, um(3));
    expect(wert(kern.lvStaendeAuflisten(LV))).toEqual([
      { id: 'stand-1', leistungsverzeichnisId: LV, name: 'Versand', angelegt: um(3) },
    ]);
  });

  it('zwei Stände mit derselben Kennung: konflikt; ein Stand zu einem anderen LV: unbekannt', async () => {
    const { kern } = await mitTypisch();
    const cs = standAnlegen(lv(kern), 'stand-1', 'Versand');
    await schreibe(kern, { art: 'LvStandAnlegen', id: 'stand-1' as never, name: 'Versand' }, cs);
    expect(
      code(
        await kern.anwenden(
          eintrag(naechste(), P, lvAggregat, {
            art: 'LvStandAnlegen',
            id: 'stand-1' as never,
            name: 'Versand',
          }),
          cs,
        ),
      ),
    ).toBe('konflikt');
    const fremd: LvChangeSet = {
      ...cs,
      lvStand: {
        vorher: null,
        nachher: { id: 'stand-9' as never, leistungsverzeichnisId: 'anderes' as never, name: 'x' },
      },
    };
    expect(
      code(
        await kern.anwenden(
          eintrag(naechste(), P, lvAggregat, { art: 'LvStandAnlegen', id: 'stand-9' as never, name: 'x' }),
          fremd,
        ),
      ),
    ).toBe('unbekannt');
  });

  it('LeistungsverzeichnisLoeschen mit bestehendem LV-Stand: konflikt (D-12)', async () => {
    const winzig = ladeFixture('winzig');
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig, 10));
    const id = winzig.lv.leistungsverzeichnis.id;
    const agg: Protokolleintrag['aggregat'] = { art: 'leistungsverzeichnis', id };
    const e = (b: Befehl): Protokolleintrag => eintrag(naechste(), winzig.projekt.id, agg, b);
    wert(
      await kern.anwenden(
        e({ art: 'LvStandAnlegen', id: 'stand-w' as never, name: 'Versand' }),
        standAnlegen(wert(kern.lvLaden(id)), 'stand-w', 'Versand'),
      ),
    );
    const r = await kern.anwenden(
      e({ art: 'LeistungsverzeichnisLoeschen' }),
      lvLoeschenChangeSet(wert(kern.lvLaden(id))),
    );
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(code(r) === 'konflikt' && !r.ok && r.fehler.meldung.includes('LV-Stand')).toBe(true);
    expect(wert(kern.lvStaendeAuflisten(id))).toHaveLength(1);
  });

  it('unbekanntes LV oder unbekannter Stand: nicht-gefunden', async () => {
    const { kern } = await mitTypisch();
    expect(kern.lvStaendeAuflisten('gibt-es-nicht' as never)).toMatchObject({
      ok: false,
      fehler: { code: 'nicht-gefunden' },
    });
    expect(kern.lvStandLaden('gibt-es-nicht' as never)).toMatchObject({
      ok: false,
      fehler: { code: 'nicht-gefunden' },
    });
  });
});

describe('Papierkorb (S3, Punkt 4)', () => {
  async function mitKorb(): Promise<{ kern: SpeicherKern; db: Datenbank; hinein: LvChangeSet[] }> {
    const env = await mitTypisch();
    const k = env.kern;
    const h1 = ausBaumNehmen(lv(k), [pos(3).id], { id: 'e1', nummer: 1 });
    await schreibe(
      k,
      { art: 'KnotenInPapierkorbLegen', eintragId: 'e1' as never, knotenIds: [pos(3).id] },
      h1,
    );
    const h2 = ausBaumNehmen(lv(k), [HINWEIS], { id: 'e2', nummer: 2 });
    await schreibe(
      k,
      { art: 'KnotenInPapierkorbLegen', eintragId: 'e2' as never, knotenIds: [HINWEIS as never] },
      h2,
    );
    return { ...env, hinein: [h1, h2] };
  }

  it('Speichern und Laden: lvLaden liefert den Papierkorb nach nummer; Knoten mit alter Lage', async () => {
    const { kern } = await mitKorb();
    const korb = lv(kern).papierkorb ?? [];
    expect(korb.map((e) => [e.id, e.nummer])).toEqual([
      ['e1', 1],
      ['e2', 2],
    ]);
    expect(korb[0]?.knoten).toEqual([pos(3)]);
    expect(lv(kern).leistungsverzeichnis.knoten.some((k) => k.id === pos(3).id)).toBe(false);
  });

  it('Export → Import → Export ist byte-gleich, der Papierkorb kommt mit', async () => {
    const { kern } = await mitKorb();
    const text = wert(kern.projektdateiExportieren(P));
    const { kern: zweiter } = await neuerKern();
    wert(zweiter.projektdateiImportieren(text));
    expect(wert(zweiter.lvLaden(LV))).toEqual(lv(kern));
    expect(wert(zweiter.projektdateiExportieren(P)) === text).toBe(true);
  });

  it('Wiederherstellen per ChangeSet legt die Knoten zurück; das Angebot findet seine Position wieder', async () => {
    const { kern, hinein } = await mitKorb();
    const [h1, h2] = hinein as [LvChangeSet, LvChangeSet];
    await schreibe(
      kern,
      { art: 'PapierkorbeintragWiederherstellen', eintragId: 'e2' as never, ort: null },
      umkehren(h2),
    );
    expect(lv(kern).papierkorb?.map((e) => e.id)).toEqual(['e1']);
    await schreibe(
      kern,
      { art: 'PapierkorbeintragWiederherstellen', eintragId: 'e1' as never, ort: null },
      umkehren(h1),
    );
    expect(lv(kern).leistungsverzeichnis.knoten.find((k) => k.id === pos(3).id)).toEqual(pos(3));
    expect(lv(kern)).toEqual(wert((await mitTypisch()).kern.lvLaden(LV)));
  });

  it('eine Angebotsposition auf eine Position im Papierkorb bleibt änderbar (D-12)', async () => {
    const { kern } = await mitKorb();
    const a = wert(kern.angebotLaden(typisch.angebote[0]?.angebot.id as never));
    const ap = a.angebot.positionen.find((x) => x.positionId === pos(3).id);
    if (ap === undefined) throw new Error('keine Angebotsposition');
    const neu = { ...ap, status: 'nicht-angeboten' as const };
    Reflect.deleteProperty(neu, 'einheitspreis');
    Reflect.deleteProperty(neu, 'epa');
    wert(
      await kern.anwenden(
        eintrag(
          naechste(),
          P,
          { art: 'angebot', id: a.angebot.id },
          { art: 'AngebotspositionSetzen', position: neu },
        ),
        {
          art: 'angebot',
          angebotId: a.angebot.id,
          kopf: null,
          positionen: { hinzugefuegt: [], geaendert: [{ vorher: ap, nachher: neu }], entfernt: [] },
          summen: { positionen: [], gliederungen: [], gesamt: null },
        },
      ),
    );
  });

  it('Entfernen eines Eintrags mit einer Position, auf die ein Angebot verweist: konflikt; ohne Verweis geht es', async () => {
    const { kern, db } = await mitKorb();
    const [e1, e2] = lv(kern).papierkorb ?? [];
    if (e1 === undefined || e2 === undefined) throw new Error('Einträge fehlen');
    const r = await kern.anwenden(
      eintrag(naechste(), P, lvAggregat, { art: 'PapierkorbeintragEntfernen', eintragId: e1.id }),
      eintragEntfernen(lv(kern), e1),
    );
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    const leeren: LvChangeSet = {
      ...eintragEntfernen(lv(kern), e1),
      papierkorb: { hinzugefuegt: [], geaendert: [], entfernt: [e1, e2] },
    };
    expect(
      code(await kern.anwenden(eintrag(naechste(), P, lvAggregat, { art: 'PapierkorbLeeren' }), leeren)),
    ).toBe('konflikt');
    expect(zaehle(db, 'papierkorb_eintrag')).toBe(2);
    await schreibe(
      kern,
      { art: 'PapierkorbeintragEntfernen', eintragId: e2.id },
      eintragEntfernen(lv(kern), e2),
    );
    expect(lv(kern).papierkorb?.map((e) => e.id)).toEqual(['e1']);
  });

  it('ein Knoten im Baum und im Papierkorb zugleich, eine doppelte Nummer oder ein veralteter Eintrag: konflikt', async () => {
    const { kern } = await mitKorb();
    const e1 = lv(kern).papierkorb?.[0];
    if (e1 === undefined) throw new Error('kein Eintrag');
    const doppelt: LvChangeSet = {
      ...eintragEntfernen(lv(kern), e1),
      papierkorb: {
        hinzugefuegt: [{ id: 'e3' as never, nummer: 3, knoten: [pos(0)] }],
        geaendert: [],
        entfernt: [],
      },
    };
    expect(
      code(await kern.anwenden(eintrag(naechste(), P, lvAggregat, { art: 'PapierkorbLeeren' }), doppelt)),
    ).toBe('konflikt');
    const nummer = ausBaumNehmen(lv(kern), [pos(5).id], { id: 'e3', nummer: 2 });
    expect(
      code(
        await kern.anwenden(
          eintrag(naechste(), P, lvAggregat, {
            art: 'KnotenInPapierkorbLegen',
            eintragId: 'e3' as never,
            knotenIds: [pos(5).id],
          }),
          nummer,
        ),
      ),
    ).toBe('konflikt');
    const veraltet = eintragEntfernen(lv(kern), { ...e1, nummer: 7 });
    expect(
      code(
        await kern.anwenden(
          eintrag(naechste(), P, lvAggregat, { art: 'PapierkorbeintragEntfernen', eintragId: e1.id }),
          veraltet,
        ),
      ),
    ).toBe('konflikt');
  });

  it('LV löschen ohne seinen Papierkorb im ChangeSet: konflikt', async () => {
    const winzig = ladeFixture('winzig');
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig, 10));
    const id = winzig.lv.leistungsverzeichnis.id;
    const agg: Protokolleintrag['aggregat'] = { art: 'leistungsverzeichnis', id };
    const z = wert(kern.lvLaden(id));
    const erste = z.leistungsverzeichnis.knoten[0]?.id as string;
    wert(
      await kern.anwenden(
        eintrag(naechste(), winzig.projekt.id, agg, {
          art: 'KnotenInPapierkorbLegen',
          eintragId: 'e' as never,
          knotenIds: [erste as never],
        }),
        ausBaumNehmen(z, [erste], { id: 'e', nummer: 1 }),
      ),
    );
    const r = await kern.anwenden(
      eintrag(naechste(), winzig.projekt.id, agg, { art: 'LeistungsverzeichnisLoeschen' }),
      lvLoeschenChangeSet(wert(kern.lvLaden(id))),
    );
    expect(code(r)).toBe('konflikt');
  });

  it('Protokoll: Massenbefehle als Kurzfassung, alles andere vollständig', async () => {
    const { kern } = await mitKorb();
    const p = wert(kern.protokoll(P));
    expect(p.slice(0, 5)).toEqual(anlegenSchritte(typisch).map((s) => imProtokoll(s.eintrag)));
  });
});

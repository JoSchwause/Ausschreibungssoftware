// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests der Feldbefehle (Ticket 27): KurztextAendern, LangtextAendern, HinweistextAendern, EinheitAendern,
// LeistungsverzeichnisUmbenennen. Zuerst geschrieben (Q1).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  BildId,
  Hinweistext,
  Knoten,
  Langtext,
  LvBefehl,
  LvChangeSet,
  LvZustand,
  Los,
  Position,
} from '@tethys/vertrag';
import {
  FELD_ANNAHMEN,
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  langtextGleich,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  summenBerechnen,
} from './index';
import { id, lvMit, posKnoten, titelKnoten } from './testhilfen';

const hinweis = (kennung: string, eltern: string, reihenfolge: number, text: Langtext = []): Hinweistext => ({
  art: 'hinweis',
  id: id.hinweis(kennung),
  elternId: id.eltern(eltern),
  reihenfolge,
  text,
});
const los = (kennung: string, reihenfolge: number): Los => ({
  art: 'los',
  id: id.los(kennung),
  elternId: id.eltern('lv-test'),
  reihenfolge,
  ordnungszahl: null,
  kurztext: `Los ${kennung}`,
});

function basis(): LvZustand {
  const knoten: Knoten[] = [
    titelKnoten('T1', 'lv-test', 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000', { einheit: 'm', langtext: [{ art: 'text', text: 'alt' }] }),
    hinweis('H1', 'T1', 1, [{ art: 'text', text: 'Hinweis' }]),
  ];
  return lvMit(knoten, {});
}

/** Element eines Arrays, das der Test als vorhanden kennt. */
function an<T>(liste: readonly T[], i: number): T {
  const x = liste[i];
  if (x === undefined) throw new Error(`Index ${String(i)} fehlt`);
  return x;
}

const lauf = (z: LvZustand, b: LvBefehl) => lvBefehlAusfuehren(z, b);
function ok(z: LvZustand, b: LvBefehl): LvChangeSet {
  const e = lauf(z, b);
  if (!e.ok) throw new Error(JSON.stringify(e.fehler));
  return e.wert;
}
const knotenVon = (z: LvZustand, kennung: string): Knoten => {
  const k = z.leistungsverzeichnis.knoten.find((n) => n.id === kennung);
  if (!k) throw new Error(`fehlt: ${kennung}`);
  return k;
};
const leer = (cs: LvChangeSet): boolean =>
  cs.kopf === null &&
  cs.knoten.hinzugefuegt.length === 0 &&
  cs.knoten.geaendert.length === 0 &&
  cs.knoten.entfernt.length === 0 &&
  cs.summen.positionen.length === 0 &&
  cs.summen.gliederungen.length === 0 &&
  cs.summen.gesamt === null;

const FUENF = [
  'LeistungsverzeichnisUmbenennen',
  'KurztextAendern',
  'LangtextAendern',
  'HinweistextAendern',
  'EinheitAendern',
];

describe('Zuständigkeit', () => {
  it('die fünf Feldbefehle haben keinen Eintrag mehr in ZUSTAENDIGES_TICKET', () => {
    for (const art of FUENF) expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain(art);
    expect(Object.keys(ZUSTAENDIGES_TICKET)).toContain('EinheitspreisanteileSetzen');
    expect(Object.keys(ZUSTAENDIGES_TICKET)).toContain('PositionsmerkmaleSetzen'); // // v1.1b: mechanisch angepasst, Folgeticket: umbenannt
  });

  it('die Annahme zu leeren Texten steht an einer benannten Stelle', () => {
    expect(FELD_ANNAHMEN.status).toBe('vorläufige Annahme, Entscheidung offen');
    expect(FELD_ANNAHMEN.leererKurztextErlaubt).toBe(true);
    expect(FELD_ANNAHMEN.leererLvNameErlaubt).toBe(true);
  });
});

describe('KurztextAendern', () => {
  it.each([
    ['Titel', 'T1'],
    ['Position', 'P1'],
    ['Los', 'L1'],
  ])('wirkt auf %s und liefert genau diesen Knoten, keine Summen', (_n, kennung) => {
    const z = lvMit([los('L1', 0), titelKnoten('T1', 'L1', 0), posKnoten('P1', 'T1', 0, '2.000', '10.000')]);
    const cs = ok(z, { art: 'KurztextAendern', knotenId: id.knoten(kennung) as never, kurztext: '  Neu  ' });
    expect(cs.kopf).toBeNull();
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.entfernt).toEqual([]);
    expect(cs.knoten.geaendert).toHaveLength(1);
    const g = cs.knoten.geaendert[0];
    expect(g?.vorher).toEqual(knotenVon(z, kennung));
    expect(g?.nachher).toEqual({ ...knotenVon(z, kennung), kurztext: '  Neu  ' }); // unverändert, nicht getrimmt
    expect(cs.summen).toEqual({ positionen: [], gliederungen: [], gesamt: null });
    expect(lvChangeSetAnwenden(z, cs).summen).toBe(z.summen);
  });

  it('gleicher Wert: leeres ChangeSet', () => {
    const z = basis();
    expect(leer(ok(z, { art: 'KurztextAendern', knotenId: id.pos('P1'), kurztext: 'Position P1' }))).toBe(
      true,
    );
  });

  it('leerer Kurztext ist erlaubt (vorläufige Annahme)', () => {
    const z = basis();
    const neu = lvChangeSetAnwenden(
      z,
      ok(z, { art: 'KurztextAendern', knotenId: id.pos('P1'), kurztext: '' }),
    );
    expect((knotenVon(neu, 'P1') as Position).kurztext).toBe('');
  });

  it('Hinweistext: knotenart-unzulaessig; unbekannt: knoten-unbekannt; kein String: ungueltige-eingabe', () => {
    const z = basis();
    const a = lauf(z, { art: 'KurztextAendern', knotenId: id.hinweis('H1') as never, kurztext: 'x' });
    expect(!a.ok && a.fehler.code).toBe('knotenart-unzulaessig');
    expect(!a.ok && a.fehler.knotenId).toBe('H1');
    const b = lauf(z, { art: 'KurztextAendern', knotenId: id.pos('gibtsnicht'), kurztext: 'x' });
    expect(!b.ok && b.fehler.code).toBe('knoten-unbekannt');
    const c = lauf(z, { art: 'KurztextAendern', knotenId: id.pos('P1'), kurztext: 5 as never });
    expect(!c.ok && c.fehler.code).toBe('ungueltige-eingabe');
    expect(!c.ok && c.fehler.feld).toBe('kurztext');
  });
});

describe('LangtextAendern', () => {
  const neuText: Langtext = [
    { art: 'text', text: 'a' },
    { art: 'bild', bild: { id: 'b1' as BildId, medientyp: 'image/png', daten: 'AAAA' } },
  ];

  it('wirkt auf die Position, keine Summen', () => {
    const z = basis();
    const cs = ok(z, { art: 'LangtextAendern', positionId: id.pos('P1'), langtext: neuText });
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect((cs.knoten.geaendert[0]?.nachher as Position).langtext).toEqual(neuText);
    expect(cs.summen.gesamt).toBeNull();
    expect(cs.summen.positionen).toEqual([]);
  });

  it('strukturell gleicher Langtext (andere Objekte): leeres ChangeSet', () => {
    const z = basis();
    const kopie: Langtext = [{ art: 'text', text: 'alt' }];
    expect(leer(ok(z, { art: 'LangtextAendern', positionId: id.pos('P1'), langtext: kopie }))).toBe(true);
  });

  it('Reihenfolge und Bildinhalt zählen als Unterschied', () => {
    const z = basis();
    const a = ok(z, { art: 'LangtextAendern', positionId: id.pos('P1'), langtext: neuText });
    const z2 = lvChangeSetAnwenden(z, a);
    const geaendert: Langtext = [
      an(neuText, 0),
      { art: 'bild', bild: { id: 'b1' as BildId, medientyp: 'image/png', daten: 'AAAB' } },
    ];
    expect(leer(ok(z2, { art: 'LangtextAendern', positionId: id.pos('P1'), langtext: geaendert }))).toBe(
      false,
    );
    expect(
      leer(
        ok(z2, {
          art: 'LangtextAendern',
          positionId: id.pos('P1'),
          langtext: [an(neuText, 1), an(neuText, 0)],
        }),
      ),
    ).toBe(false);
  });

  it('langtextGleich vergleicht strukturell', () => {
    expect(langtextGleich([], [])).toBe(true);
    expect(langtextGleich([{ art: 'text', text: 'a' }], [{ art: 'text', text: 'a' }])).toBe(true);
    expect(langtextGleich([{ art: 'text', text: 'a' }], [{ art: 'text', text: 'b' }])).toBe(false);
    expect(langtextGleich([{ art: 'text', text: 'a' }], [])).toBe(false);
    expect(langtextGleich(neuText, neuText.slice())).toBe(true);
  });

  it('Fehlerfälle', () => {
    const z = basis();
    const a = lauf(z, { art: 'LangtextAendern', positionId: id.pos('T1'), langtext: [] });
    expect(!a.ok && a.fehler.code).toBe('knotenart-unzulaessig');
    const b = lauf(z, { art: 'LangtextAendern', positionId: id.pos('nix'), langtext: [] });
    expect(!b.ok && b.fehler.code).toBe('knoten-unbekannt');
    const c = lauf(z, { art: 'LangtextAendern', positionId: id.pos('P1'), langtext: 'x' as never });
    expect(!c.ok && c.fehler.code).toBe('ungueltige-eingabe');
    expect(!c.ok && c.fehler.feld).toBe('langtext');
    const d = lauf(z, {
      art: 'LangtextAendern',
      positionId: id.pos('P1'),
      langtext: [{ art: 'x' }] as never,
    });
    expect(!d.ok && d.fehler.code).toBe('ungueltige-eingabe');
  });
});

describe('HinweistextAendern', () => {
  it('wirkt auf den Hinweistext; gleicher Wert leer; Fehlerfälle', () => {
    const z = basis();
    const text: Langtext = [{ art: 'text', text: 'neu' }];
    const cs = ok(z, { art: 'HinweistextAendern', knotenId: id.hinweis('H1'), text });
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect((cs.knoten.geaendert[0]?.nachher as Hinweistext).text).toEqual(text);
    expect(cs.summen.gesamt).toBeNull();
    expect(
      leer(
        ok(z, {
          art: 'HinweistextAendern',
          knotenId: id.hinweis('H1'),
          text: [{ art: 'text', text: 'Hinweis' }],
        }),
      ),
    ).toBe(true);
    const a = lauf(z, { art: 'HinweistextAendern', knotenId: id.hinweis('P1'), text });
    expect(!a.ok && a.fehler.code).toBe('knotenart-unzulaessig');
    const b = lauf(z, { art: 'HinweistextAendern', knotenId: id.hinweis('nix'), text });
    expect(!b.ok && b.fehler.code).toBe('knoten-unbekannt');
    const c = lauf(z, { art: 'HinweistextAendern', knotenId: id.hinweis('H1'), text: null as never });
    expect(!c.ok && c.fehler.code).toBe('ungueltige-eingabe');
  });
});

describe('EinheitAendern', () => {
  it('setzt, leert (null) und übernimmt Text unverändert', () => {
    const z = basis();
    const a = lvChangeSetAnwenden(
      z,
      ok(z, { art: 'EinheitAendern', positionId: id.pos('P1'), einheit: ' m² ' }),
    );
    expect((knotenVon(a, 'P1') as Position).einheit).toBe(' m² ');
    const b = lvChangeSetAnwenden(
      z,
      ok(z, { art: 'EinheitAendern', positionId: id.pos('P1'), einheit: null }),
    );
    expect((knotenVon(b, 'P1') as Position).einheit).toBeNull();
    const c = lvChangeSetAnwenden(z, ok(z, { art: 'EinheitAendern', positionId: id.pos('P1'), einheit: '' }));
    expect((knotenVon(c, 'P1') as Position).einheit).toBe(''); // Leerstring bleibt Leerstring, unterscheidet sich von null
  });

  it('gleicher Wert: leeres ChangeSet (auch null auf null)', () => {
    const z = basis();
    expect(leer(ok(z, { art: 'EinheitAendern', positionId: id.pos('P1'), einheit: 'm' }))).toBe(true);
    const z2 = lvMit([posKnoten('P2', 'lv-test', 0, null, null)]);
    expect(leer(ok(z2, { art: 'EinheitAendern', positionId: id.pos('P2'), einheit: null }))).toBe(true);
  });

  it('ChangeSet ohne Summen', () => {
    const z = basis();
    const cs = ok(z, { art: 'EinheitAendern', positionId: id.pos('P1'), einheit: 'kg' });
    expect(cs.summen).toEqual({ positionen: [], gliederungen: [], gesamt: null });
  });

  it('Fehlerfälle', () => {
    const z = basis();
    const a = lauf(z, { art: 'EinheitAendern', positionId: id.pos('H1'), einheit: 'm' });
    expect(!a.ok && a.fehler.code).toBe('knotenart-unzulaessig');
    const b = lauf(z, { art: 'EinheitAendern', positionId: id.pos('T1'), einheit: 'm' });
    expect(!b.ok && b.fehler.code).toBe('knotenart-unzulaessig');
    const c = lauf(z, { art: 'EinheitAendern', positionId: id.pos('nix'), einheit: 'm' });
    expect(!c.ok && c.fehler.code).toBe('knoten-unbekannt');
    const d = lauf(z, { art: 'EinheitAendern', positionId: id.pos('P1'), einheit: 3 as never });
    expect(!d.ok && d.fehler.code).toBe('ungueltige-eingabe');
    expect(!d.ok && d.fehler.feld).toBe('einheit');
  });
});

describe('LeistungsverzeichnisUmbenennen', () => {
  it('ändert nur den Kopf, keine Knoten, keine Summen', () => {
    const z = basis();
    const cs = ok(z, { art: 'LeistungsverzeichnisUmbenennen', name: ' Neuer Name ' });
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen).toEqual({ positionen: [], gliederungen: [], gesamt: null });
    expect(cs.kopf?.vorher?.name).toBe('Testverzeichnis');
    expect(cs.kopf?.nachher?.name).toBe(' Neuer Name ');
    expect(cs.kopf?.nachher).toEqual({ ...cs.kopf?.vorher, name: ' Neuer Name ' });
    expect(lvChangeSetAnwenden(z, cs).leistungsverzeichnis.name).toBe(' Neuer Name ');
  });

  it('gleicher Name: leer; leerer Name erlaubt; kein String: ungueltige-eingabe', () => {
    const z = basis();
    expect(leer(ok(z, { art: 'LeistungsverzeichnisUmbenennen', name: 'Testverzeichnis' }))).toBe(true);
    expect(ok(z, { art: 'LeistungsverzeichnisUmbenennen', name: '' }).kopf?.nachher?.name).toBe('');
    const e = lauf(z, { art: 'LeistungsverzeichnisUmbenennen', name: 1 as never });
    expect(!e.ok && e.fehler.code).toBe('ungueltige-eingabe');
    expect(!e.ok && e.fehler.feld).toBe('name');
  });

  it('ohne Zustand: befehl-nicht-zustaendig', () => {
    const e = lvBefehlAusfuehren(null, { art: 'LeistungsverzeichnisUmbenennen', name: 'x' });
    expect(!e.ok && e.fehler.code).toBe('befehl-nicht-zustaendig');
  });
});

// --- Eigenschaften -------------------------------------------------------------------------------------------

type Aktion =
  | { a: 'kurz'; k: number; t: number }
  | { a: 'lang'; k: number; t: number }
  | { a: 'hinweis'; k: number; t: number }
  | { a: 'einheit'; k: number; t: number }
  | { a: 'name'; t: number };

const TEXTE: readonly string[] = ['', 'a', 'A', ' a ', 'm²', 'Zeile\nzwei', 'Ünï', 'x'.repeat(500)];
const LANGTEXTE: readonly Langtext[] = [
  [],
  [{ art: 'text', text: 'a' }],
  [
    { art: 'text', text: 'a' },
    { art: 'text', text: 'b' },
  ],
  [{ art: 'text', text: 'alt' }],
  [{ art: 'bild', bild: { id: 'b' as BildId, medientyp: 'image/png', daten: 'QQ==' } }],
];
const aktionArb: fc.Arbitrary<Aktion> = fc.oneof(
  fc.record({ a: fc.constant('kurz' as const), k: fc.nat(1000), t: fc.nat(TEXTE.length - 1) }),
  fc.record({ a: fc.constant('lang' as const), k: fc.nat(1000), t: fc.nat(LANGTEXTE.length - 1) }),
  fc.record({ a: fc.constant('hinweis' as const), k: fc.nat(1000), t: fc.nat(LANGTEXTE.length - 1) }),
  fc.record({ a: fc.constant('einheit' as const), k: fc.nat(1000), t: fc.nat(TEXTE.length) }),
  fc.record({ a: fc.constant('name' as const), t: fc.nat(TEXTE.length - 1) }),
);

function befehlAus(z: LvZustand, x: Aktion): LvBefehl {
  const knoten = z.leistungsverzeichnis.knoten;
  const wahl = (n: number) => an(knoten, n % knoten.length).id as string;
  switch (x.a) {
    case 'kurz':
      return { art: 'KurztextAendern', knotenId: wahl(x.k) as never, kurztext: an(TEXTE, x.t) };
    case 'lang':
      return { art: 'LangtextAendern', positionId: wahl(x.k) as never, langtext: an(LANGTEXTE, x.t) };
    case 'hinweis':
      return { art: 'HinweistextAendern', knotenId: wahl(x.k) as never, text: an(LANGTEXTE, x.t) };
    case 'einheit':
      return { art: 'EinheitAendern', positionId: wahl(x.k) as never, einheit: TEXTE[x.t] ?? null };
    case 'name':
      return { art: 'LeistungsverzeichnisUmbenennen', name: an(TEXTE, x.t) };
  }
}

function eigenschaftsBasis(): LvZustand {
  return lvMit([
    los('L1', 0),
    titelKnoten('T1', 'L1', 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000', { einheit: 'm', langtext: [{ art: 'text', text: 'alt' }] }),
    posKnoten('P2', 'T1', 1, '3.500', '1.235', { positionsart: 'bedarf' }),
    hinweis('H1', 'T1', 2, [{ art: 'text', text: 'Hinweis' }]),
    posKnoten('P3', 'L1', 1, null, null),
  ]);
}

describe('Eigenschaften der Feldbefehle', () => {
  it('anwenden und umkehren ergibt den Ausgangszustand; Summen unverändert und gleich summenBerechnen', () => {
    fc.assert(
      fc.property(fc.array(aktionArb, { minLength: 1, maxLength: 40 }), (folge) => {
        let z = eigenschaftsBasis();
        for (const x of folge) {
          const e = lvBefehlAusfuehren(z, befehlAus(z, x));
          if (!e.ok) {
            expect(['knotenart-unzulaessig', 'knoten-unbekannt']).toContain(e.fehler.code);
            continue;
          }
          const cs = e.wert;
          const neu = lvChangeSetAnwenden(z, cs);
          // Summen unverändert und gleich der Neuberechnung
          expect(cs.summen).toEqual({ positionen: [], gliederungen: [], gesamt: null });
          expect(neu.summen).toEqual(z.summen);
          expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
          // Undo: Zustand exakt wieder da; Umkehrung der Umkehrung ist das ChangeSet
          const rueck = changeSetUmkehren(cs, z);
          expect(lvChangeSetAnwenden(neu, rueck)).toEqual(z);
          expect(changeSetUmkehren(rueck, neu)).toEqual(cs);
          // Wiederholen ergibt ein leeres ChangeSet
          expect(leer(ok(neu, befehlAus(z, x)))).toBe(true);
          z = neu;
        }
      }),
      { numRuns: 200 },
    );
  });
});

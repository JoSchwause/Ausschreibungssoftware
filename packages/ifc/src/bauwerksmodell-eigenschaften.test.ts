// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Abbildung (Ticket 107, Q1): Aus beliebigen Geflechten von Strukturknoten und Bauteilen (doppelte und
// kaputte GlobalIds, Ringe, Teile von Teilen, Mengen ohne Wert) und aus verstümmelten Dateien entsteht immer ein Modell, das
// die Lesarten des Vertrags v1.6 erfüllt, die `BauwerksmodellAnlegen` prüft (Form, Verweise auf das erste Objekt, kein
// Ring); nie eine Ausnahme, immer dasselbe Ergebnis. Die Prüfung hier ist unabhängig von der Abbildung geschrieben.

import { alsMenge } from '@tethys/dezimal';
import type { BauwerksmodellId, BauwerksmodellKopf, ProjektId } from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bauwerksmodellLesen } from './index';
import type { BauwerksmodellLesung } from './index';
import type { IfcBefundcode } from './typen';
import { bytes, gid, grundgeruest, ifcText } from './testhilfen';

const KOPF: Omit<BauwerksmodellKopf, 'schema'> = {
  id: '0193a1b2-0000-7000-8000-000000000107' as BauwerksmodellId,
  projektId: '0193a1b2-0000-7000-8000-000000000001' as ProjektId,
  name: 'Haus',
  datei: { hash: 'cd'.repeat(32), dateiname: 'haus.ifc', groesse: 1 },
  vorgaengerId: null,
  eingelesen: '2026-11-12',
};

const FORM = /^[0-9A-Za-z_$]{22}$/;

const CODES: ReadonlySet<string> = new Set<IfcBefundcode>([
  'eingabe-zu-gross',
  'keine-ifc-datei',
  'schema-nicht-unterstuetzt',
  'kodierung-utf8',
  'kodierung-latin1',
  'datei-unvollstaendig',
  'step-syntaxfehler',
  'step-zu-tief',
  'instanz-doppelt',
  'zeichenkette-ungueltig',
  'verweis-fehlt',
  'strukturknoten-ohne-eltern',
  'bauteil-mehrfach-enthalten',
  'bauteil-ohne-strukturknoten',
  'bauteil-ohne-mengen',
  'projekt-fehlt',
  'einheit-fehlt',
  'einheit-ungueltig',
  'einheit-umgerechnet',
  'menge-ungueltig',
  'menge-nicht-gelesen',
  'eigenschaft-nicht-gelesen',
  'klassifikation-nicht-gelesen',
  'kostengruppe-mehrdeutig',
  'globalid-ungueltig',
  'globalid-doppelt',
  'menge-ohne-wert',
  'bauteil-ohne-ganzes',
  'verweis-mehrdeutig',
  'strukturknoten-ring',
  'bauteil-ring',
]);

/**
 * Die Lesarten von `Bauwerksmodell` und `BauwerksmodellAnlegen` (vertrag v1.6 mit Nachtrag D-66): GlobalIds in Form; jeder
 * Verweis meint das erste Objekt seiner GlobalId (`struktur` vor `bauteile`), und das ist von der richtigen Art; Struktur und
 * Teile ohne Ring; Mengen mit Namen und kanonischem Wert; optionale Felder fehlen statt `null`; Befunde mit Quelle `ifc-lesen`.
 */
function pruefeVertrag(lesung: BauwerksmodellLesung): void {
  for (const b of lesung.befunde) {
    expect(b.quelle).toBe('ifc-lesen');
    expect(CODES.has(b.code)).toBe(true);
    if (b.ort.globalId !== undefined) expect(b.ort.globalId).toMatch(FORM);
  }
  const modell = lesung.bauwerksmodell;
  if (modell === null) {
    expect(lesung.befunde).toHaveLength(1);
    return;
  }
  const erstes = new Map<string, 'knoten' | 'bauteil'>();
  for (const k of modell.struktur) if (!erstes.has(k.globalId)) erstes.set(k.globalId, 'knoten');
  for (const b of modell.bauteile) if (!erstes.has(b.globalId)) erstes.set(b.globalId, 'bauteil');
  const ersterKnoten = new Map<string, number>();
  modell.struktur.forEach((k, n) => {
    if (!ersterKnoten.has(k.globalId)) ersterKnoten.set(k.globalId, n);
  });
  const erstesBauteil = new Map<string, number>();
  modell.bauteile.forEach((b, n) => {
    if (!erstesBauteil.has(b.globalId)) erstesBauteil.set(b.globalId, n);
  });

  for (const objekt of [...modell.struktur, ...modell.bauteile]) {
    expect(objekt.globalId).toMatch(FORM);
    for (const m of objekt.mengen) {
      expect(m.name.trim()).not.toBe('');
      expect(alsMenge(m.wert).ok).toBe(true);
    }
  }
  for (const k of modell.struktur)
    if (k.elternGlobalId !== null) expect(erstes.get(k.elternGlobalId)).toBe('knoten');
  for (const b of modell.bauteile) {
    if (b.strukturGlobalId !== null) expect(erstes.get(b.strukturGlobalId)).toBe('knoten');
    expect('teilVonGlobalId' in b ? b.teilVonGlobalId : 'fehlt').not.toBeUndefined();
    if (b.teilVonGlobalId !== undefined) expect(erstes.get(b.teilVonGlobalId)).toBe('bauteil');
    expect('kostengruppe' in b ? b.kostengruppe : '100').toMatch(/^[1-9][0-9]{2}$/);
  }
  // Kein Ring: Von jedem Objekt aus endet die Kette der Verweise (über das jeweils erste Objekt) nach höchstens n Schritten.
  modell.struktur.forEach((_k, start) => {
    let n: number | undefined = start;
    for (let schritt = 0; n !== undefined; schritt++) {
      expect(schritt).toBeLessThanOrEqual(modell.struktur.length);
      const eltern: string | null = modell.struktur[n]?.elternGlobalId ?? null;
      n = eltern === null ? undefined : ersterKnoten.get(eltern);
    }
  });
  modell.bauteile.forEach((_b, start) => {
    let n: number | undefined = start;
    for (let schritt = 0; n !== undefined; schritt++) {
      expect(schritt).toBeLessThanOrEqual(modell.bauteile.length);
      const ganzes: string | undefined = modell.bauteile[n]?.teilVonGlobalId;
      n = ganzes === undefined ? undefined : erstesBauteil.get(ganzes);
    }
  });
}

const STRUKTURKLASSEN = [
  "IFCSITE(@,$,'N',$,$,$,$,$,.ELEMENT.,$,$,$,$,$)",
  "IFCBUILDING(@,$,'N',$,$,$,$,$,.ELEMENT.,$,$,$)",
  "IFCBUILDINGSTOREY(@,$,'N',$,$,$,$,$,.ELEMENT.,0.)",
  "IFCSPACE(@,$,'N',$,$,$,$,$,.ELEMENT.,.INTERNAL.,$)",
];
const BAUTEILKLASSEN = ["IFCWALL(@,$,'N',$,$,$,$,$,$)", "IFCBUILDINGELEMENTPART(@,$,'N',$,$,$,$,$,$)"];
/** Wenige GlobalIds, damit Doppelte häufig sind; dazu zwei, die nicht in Form sind. */
const GLOBALIDS = [`'${gid('a')}'`, `'${gid('b')}'`, `'${gid('c')}'`, `'${gid('d')}'`, "'kurz'", '$'];

/** Ein Geflecht: Objekte ab #100, Beziehungen dahinter; Verweise als Nummer eines Objekts (0 … Zahl − 1). */
const geflecht = fc.record({
  knoten: fc.array(fc.record({ klasse: fc.nat(3), globalId: fc.nat(5) }), { maxLength: 8 }),
  bauteile: fc.array(
    fc.record({
      klasse: fc.nat(1),
      globalId: fc.nat(5),
      menge: fc.constantFrom('2.5', '$', '1.E999', '-0.0004'),
    }),
    { maxLength: 10 },
  ),
  zerlegungen: fc.array(fc.record({ ganzes: fc.nat(30), teile: fc.array(fc.nat(30), { maxLength: 3 }) }), {
    maxLength: 10,
  }),
  enthalten: fc.array(fc.record({ in: fc.nat(30), elemente: fc.array(fc.nat(30), { maxLength: 3 }) }), {
    maxLength: 6,
  }),
  /** Ringe aus Zerlegungen (a → b → … → a), vor den übrigen Zerlegungen, damit sie als erste Beziehung gelten. */
  ringe: fc.array(fc.array(fc.nat(30), { minLength: 1, maxLength: 3 }), { maxLength: 2 }),
});

type Geflecht = typeof geflecht extends fc.Arbitrary<infer T> ? T : never;

function alsDatei(g: Geflecht): string {
  const objekte = [
    ...g.knoten.map((k) => (STRUKTURKLASSEN[k.klasse] ?? '').replace('@', GLOBALIDS[k.globalId] ?? '$')),
    ...g.bauteile.map((b) => (BAUTEILKLASSEN[b.klasse] ?? '').replace('@', GLOBALIDS[b.globalId] ?? '$')),
  ];
  const nummer = (n: number) => `#${String(100 + (objekte.length === 0 ? 0 : n % objekte.length))}`;
  const zeilen = objekte.map((o, n) => `${nummer(n)}=${o};`);
  let r = 500;
  const rel = (text: string) =>
    zeilen.push(`#${String(r)}=${text.replace('@', `'${gid(`r${String(r++)}`)}'`)};`);
  // Das Grundgerüst (#1 … #15) hängt mit dem EG (#12) daran: Verweis 30 heißt „EG“.
  const ziel = (n: number) => (n === 30 || objekte.length === 0 ? '#12' : nummer(n));
  for (const ring of g.ringe)
    ring.forEach((a, n) => {
      rel(`IFCRELAGGREGATES(@,$,$,$,${ziel(a)},(${ziel(ring[(n + 1) % ring.length] ?? a)}))`);
    });
  for (const z of g.zerlegungen)
    rel(`IFCRELAGGREGATES(@,$,$,$,${ziel(z.ganzes)},(${z.teile.map(ziel).join(',') || ziel(0)}))`);
  for (const e of g.enthalten)
    rel(
      `IFCRELCONTAINEDINSPATIALSTRUCTURE(@,$,$,$,(${e.elemente.map(ziel).join(',') || ziel(0)}),${ziel(e.in)})`,
    );
  g.bauteile.forEach((b, n) => {
    const q = 800 + n * 2;
    zeilen.push(`#${String(q)}=IFCQUANTITYLENGTH('Length',$,$,${b.menge},$);`);
    rel(`IFCELEMENTQUANTITY(@,$,'Qto',$,$,(#${String(q)}))`);
    rel(`IFCRELDEFINESBYPROPERTIES(@,$,$,$,(${nummer(g.knoten.length + n)}),#${String(r - 1)})`);
  });
  return ifcText([...grundgeruest(), ...zeilen]);
}

describe('Abbildung: Eigenschaften', () => {
  it('jedes Geflecht ergibt ein Modell nach den Lesarten des Vertrags, deterministisch', () => {
    fc.assert(
      fc.property(geflecht, (g) => {
        const text = alsDatei(g);
        const lesung = bauwerksmodellLesen(bytes(text), KOPF);
        pruefeVertrag(lesung);
        expect(bauwerksmodellLesen(bytes(text), KOPF)).toEqual(lesung);
      }),
      { numRuns: 400 },
    );
  });

  it('verstümmelte Dateien ergeben ein Modell nach den Lesarten des Vertrags oder genau einen Fehler', () => {
    const vorlage = alsDatei({
      knoten: [
        { klasse: 2, globalId: 0 },
        { klasse: 3, globalId: 1 },
      ],
      bauteile: [
        { klasse: 0, globalId: 2, menge: '2.5' },
        { klasse: 1, globalId: 3, menge: '$' },
      ],
      zerlegungen: [
        { ganzes: 0, teile: [1] },
        { ganzes: 2, teile: [3] },
      ],
      enthalten: [{ in: 0, elemente: [2] }],
      ringe: [],
    });
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            stelle: fc.nat(),
            loeschen: fc.nat({ max: 30 }),
            einfuegen: fc.constantFrom('', '(', ')', "'", ',', ';', '#', '#100', '#12', '$', '.', '9', 'ä'),
          }),
          { minLength: 1, maxLength: 6 },
        ),
        (eingriffe) => {
          let text = vorlage;
          for (const e of eingriffe) {
            const p = e.stelle % (text.length + 1);
            text = text.slice(0, p) + e.einfuegen + text.slice(p + e.loeschen);
          }
          pruefeVertrag(bauwerksmodellLesen(bytes(text), KOPF));
        },
      ),
      { numRuns: 400 },
    );
  });
});

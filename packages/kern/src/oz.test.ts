// SPDX-License-Identifier: AGPL-3.0-or-later
// Beispiel- und Golden-Tests zu OZ-Maske, OZ-Vergabe und Umnummerieren (Ticket 06). Zuerst geschrieben (Q1).
// Die Längenregel (14 Stellen) und die Stufenregeln sind in der GAEB-Fachdokumentation DA XML 3.3 belegt
// (Quellen im Kopf von `ozregeln.ts`); alles andere ist als „vorläufige Annahme“ gekennzeichnet.

import { describe, expect, it } from 'vitest';
import type {
  Befehlsfehler,
  ElternId,
  Knoten,
  LvBefehl,
  LvChangeSet,
  LvZustand,
  Ordnungszahl,
  OzMaske,
  Position,
  Titel,
} from '@tethys/vertrag';
import {
  GLIEDERUNG_SCHRITT,
  OZ_ANNAHMEN,
  OZ_MAX_LAENGE,
  POSITION_SCHRITT,
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  doppelteOrdnungszahlen,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  ozFehler,
  ozMaskeFehler,
} from './index';
import {
  LV_ID,
  PROJEKT_ID,
  erwarteOk,
  id,
  inhalt,
  positionsdaten,
  posKnoten,
  titelKnoten,
  wende,
} from './testhilfen';

// --- Masken ---------------------------------------------------------------------------------------------------

const num = (laenge: number) => ({ laenge, zeichen: 'numerisch' as const });
const alnum = (laenge: number) => ({ laenge, zeichen: 'alphanumerisch' as const });

/** Standardmaske `NN.NN.NNNN[.A]`: zwei Stufen, Position vierstellig, Indexbuchstabe. */
export const MASKE_STANDARD: OzMaske = {
  gliederung: [num(2), num(2)],
  position: num(4),
  index: alnum(1),
  trennzeichen: '.',
};
/** Abweichende Maske ohne Trennzeichen, `1122PPPPI`: Stufen zu je zwei Stellen, Position vierstellig, Index. */
export const MASKE_OHNE_TRENNER: OzMaske = {
  gliederung: [num(2), num(2)],
  position: num(4),
  index: alnum(1),
  trennzeichen: null,
};
/** Das Muster der FD 3.3, 11.4 (`11.22.33.44.5.PPPP.I`): fünf Stufen, 14 Stellen. */
export const MASKE_FD: OzMaske = {
  gliederung: [num(2), num(2), num(2), num(2), num(1)],
  position: num(4),
  index: alnum(1),
  trennzeichen: '.',
};

const mitMaske = (m: OzMaske, knoten: readonly Knoten[] = []): LvZustand =>
  wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: LV_ID,
    projektId: PROJEKT_ID,
    inhalt: { ...inhalt(knoten), ozMaske: m },
  });

const fehlerVon = (z: LvZustand, b: LvBefehl): Befehlsfehler => {
  const e = lvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error('Fehlerwert erwartet');
  return e.fehler;
};
const okVon = (z: LvZustand, b: LvBefehl): LvChangeSet => erwarteOk(lvBefehlAusfuehren(z, b));
const nummeriere = (z: LvZustand, teilbaum: string = LV_ID): LvChangeSet =>
  okVon(z, { art: 'Umnummerieren', teilbaumId: teilbaum as ElternId });
const knotenMap = (z: LvZustand): Map<string, Knoten> =>
  new Map(z.leistungsverzeichnis.knoten.map((k) => [k.id, k]));
const ozVon = (z: LvZustand, kennung: string): string | null => {
  const k = knotenMap(z).get(kennung);
  if (!k || k.art === 'hinweis') throw new Error(`kein Knoten mit OZ: ${kennung}`);
  return k.ordnungszahl;
};
const keineAenderung = (cs: LvChangeSet): boolean =>
  cs.kopf === null &&
  cs.knoten.hinzugefuegt.length === 0 &&
  cs.knoten.geaendert.length === 0 &&
  cs.knoten.entfernt.length === 0 &&
  cs.summen.positionen.length === 0 &&
  cs.summen.gliederungen.length === 0 &&
  cs.summen.gesamt === null;

/** Beispielbaum: T1 (T11 (P111, P112, Hinweis), P12), T2 (P21). */
function beispielbaum(): Knoten[] {
  return [
    titelKnoten('T1', LV_ID, 0),
    titelKnoten('T11', 'T1', 0),
    posKnoten('P111', 'T11', 0, '1.000', '1.000'),
    posKnoten('P112', 'T11', 1, '1.000', '1.000'),
    { art: 'hinweis', id: id.hinweis('H'), elternId: id.eltern('T11'), reihenfolge: 2, text: [] },
    posKnoten('P12', 'T1', 1, '1.000', '1.000'),
    titelKnoten('T2', LV_ID, 1),
    posKnoten('P21', 'T2', 0, '1.000', '1.000'),
  ];
}

describe('Konstanten: Schritte und Längenregel', () => {
  it('Gliederung +1, Positionen +10, höchstens 14 Stellen (FD 3.3, 4.2.1; 11.2.3 BoQInfo Regel 2)', () => {
    expect(GLIEDERUNG_SCHRITT).toBe(1);
    expect(POSITION_SCHRITT).toBe(10);
    expect(OZ_MAX_LAENGE).toBe(14);
    expect(OZ_ANNAHMEN.status).toBe('vorläufige Annahme, Entscheidung offen');
  });

  it('die drei OZ-Befehle sind umgesetzt (kein Eintrag mehr in ZUSTAENDIGES_TICKET)', () => {
    for (const art of ['OzMaskeSetzen', 'OrdnungszahlSetzen', 'Umnummerieren']) {
      expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain(art);
    }
  });
});

// --- Maske prüfen ----------------------------------------------------------------------------------------------

describe('ozMaskeFehler: gültige Masken', () => {
  it.each([
    ['Standard NN.NN.NNNN[.A]', MASKE_STANDARD],
    ['ohne Trennzeichen 1122PPPPI', MASKE_OHNE_TRENNER],
    ['FD-Muster 11.22.33.44.5.PPPP.I (genau 14 Stellen)', MASKE_FD],
    [
      'ohne Stufe, nur Position (FD 3.3, 4.3.3)',
      { gliederung: [], position: num(4), index: null, trennzeichen: null },
    ],
    [
      'Position mit 14 Stellen ohne Index',
      { gliederung: [], position: num(14), index: null, trennzeichen: null },
    ],
    [
      'Position mit 13 Stellen und Index',
      { gliederung: [], position: num(13), index: alnum(1), trennzeichen: null },
    ],
    ['alphanumerische Stufe', { gliederung: [alnum(3)], position: num(4), index: null, trennzeichen: '-' }],
  ] as const)('%s', (_name, maske) => {
    expect(ozMaskeFehler(maske)).toBeNull();
  });
});

describe('ozMaskeFehler: ungültige Masken', () => {
  const basis = MASKE_STANDARD;
  it.each([
    ['Stufe mit 0 Stellen', { ...basis, gliederung: [num(0), num(2)] }],
    ['Stufe mit negativer Länge', { ...basis, gliederung: [num(-1), num(2)] }],
    ['Stufe mit gebrochener Länge', { ...basis, gliederung: [num(1.5), num(2)] }],
    ['Stufe mit NaN', { ...basis, gliederung: [num(Number.NaN)] }],
    ['Position mit 0 Stellen (keine Positionsziffer)', { ...basis, position: num(0) }],
    ['Index mit 0 Stellen', { ...basis, index: alnum(0) }],
    ['Index mit 2 Stellen (FD 3.3: immer einstellig)', { ...basis, index: alnum(2) }],
    ['15 Stellen insgesamt (14 sind das Höchste)', { ...basis, position: num(10) }],
    ['Position mit 14 Stellen und Index (15)', { ...basis, gliederung: [], position: num(14) }],
    [
      'sechs Stufen (höchstens 5)',
      { ...basis, gliederung: Array.from({ length: 6 }, () => num(1)), position: num(1), index: null },
    ],
    ['leeres Trennzeichen', { ...basis, trennzeichen: '' }],
    ['mehrstelliges Trennzeichen', { ...basis, trennzeichen: '..' }],
    ['Ziffer als Trennzeichen', { ...basis, trennzeichen: '1' }],
    ['Buchstabe als Trennzeichen', { ...basis, trennzeichen: 'A' }],
    ['Leerzeichen als Trennzeichen', { ...basis, trennzeichen: ' ' }],
    ['unbekannte Zeichenart', { ...basis, position: { laenge: 4, zeichen: 'hex' as 'numerisch' } }],
  ] as const)('%s', (_name, maske) => {
    expect(ozMaskeFehler(maske as unknown as OzMaske)).toEqual(expect.any(String));
  });

  it('der Fehlertext nennt die Ursache (Länge, Stufenzahl)', () => {
    expect(ozMaskeFehler({ ...basis, position: num(10) })).toMatch(/15.*14/);
    expect(ozMaskeFehler({ ...basis, gliederung: [num(0)] })).toMatch(/stufe 1/i);
  });
});

// --- OZ-Vergabe: Golden ----------------------------------------------------------------------------------------

describe('Umnummerieren: Golden mit der Standardmaske', () => {
  it('Gliederung +1, Positionen +10, führende Nullen, Hinweistexte ohne OZ, IDs bleiben', () => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    const cs = nummeriere(z);
    const danach = lvChangeSetAnwenden(z, cs);
    const soll: Record<string, string> = {
      T1: '01',
      T11: '01.01',
      P111: '01.01.0010',
      P112: '01.01.0020',
      P12: '01.0010',
      T2: '02',
      P21: '02.0010',
    };
    for (const [kennung, oz] of Object.entries(soll)) expect(ozVon(danach, kennung)).toBe(oz);
    expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual([
      'T1',
      'T11',
      'P111',
      'P112',
      'P12',
      'T2',
      'P21',
    ]);
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.entfernt).toEqual([]);
    expect(knotenMap(danach).get('H')).toEqual(knotenMap(z).get('H'));
    expect(danach.leistungsverzeichnis.knoten.map((k) => k.id)).toEqual(
      z.leistungsverzeichnis.knoten.map((k) => k.id),
    );
  });

  it('ohne Trennzeichen (1122PPPPI): Teile ohne Trenner aneinander', () => {
    const z = mitMaske(MASKE_OHNE_TRENNER, beispielbaum());
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'T1')).toBe('01');
    expect(ozVon(danach, 'T11')).toBe('0101');
    expect(ozVon(danach, 'P111')).toBe('01010010');
    expect(ozVon(danach, 'P112')).toBe('01010020');
    expect(ozVon(danach, 'P12')).toBe('010010');
    expect(ozVon(danach, 'P21')).toBe('020010');
  });

  it('die volle Tiefe der FD-Maske ergibt 13 Ziffern (mit Index 14 Stellen, FD 3.3, 4.3.3)', () => {
    const kette: Knoten[] = [
      titelKnoten('A', LV_ID, 0),
      titelKnoten('B', 'A', 0),
      titelKnoten('C', 'B', 0),
      titelKnoten('D', 'C', 0),
      titelKnoten('E', 'D', 0),
      posKnoten('P', 'E', 0, '1.000', '1.000'),
    ];
    const z = mitMaske(MASKE_FD, kette);
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'E')).toBe('01.01.01.01.1');
    expect(ozVon(danach, 'P')).toBe('01.01.01.01.1.0010');
    expect((ozVon(danach, 'P') ?? '').replaceAll('.', '')).toHaveLength(13);
  });

  it('ein Los belegt die oberste Stufe (vorläufige Annahme LOS_ANNAHME): Los 01, Titel darunter 01.01', () => {
    const los: Knoten = {
      art: 'los',
      id: id.los('L1'),
      elternId: id.eltern(LV_ID),
      reihenfolge: 0,
      ordnungszahl: null,
      kurztext: 'Los 1',
    };
    const z = mitMaske(MASKE_STANDARD, [
      los,
      { ...titelKnoten('T1', 'L1', 0) },
      posKnoten('P1', 'T1', 0, '1.000', '1.000'),
    ]);
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'L1')).toBe('01');
    expect(ozVon(danach, 'T1')).toBe('01.01');
    expect(ozVon(danach, 'P1')).toBe('01.01.0010');
  });

  it('unbelegte untere Stufen (FD 3.3, 4.3.4): Position unter Stufe 1 hat nur zwei Teile, 01.0010', () => {
    const z = mitMaske(MASKE_FD, [titelKnoten('T1', LV_ID, 0), posKnoten('P1', 'T1', 0, '1.000', '1.000')]);
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'P1')).toBe('01.0010');
  });

  it('Positionen direkt unter der Wurzel: nur der Positionsteil, bei Maske ohne Stufen wie in FD 3.3, 4.3.3', () => {
    const z = mitMaske({ gliederung: [], position: num(4), index: alnum(1), trennzeichen: null }, [
      posKnoten('P1', LV_ID, 0, '1.000', '1.000'),
      posKnoten('P2', LV_ID, 1, '1.000', '1.000'),
    ]);
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'P1')).toBe('0010');
    expect(ozVon(danach, 'P2')).toBe('0020');
  });

  it('zählt je Elternknoten neu und ordnet nach reihenfolge, nicht nach Array-Reihenfolge', () => {
    const z = mitMaske(MASKE_STANDARD, [
      posKnoten('Pb', LV_ID, 1, '1.000', '1.000'),
      posKnoten('Pa', LV_ID, 0, '1.000', '1.000'),
    ]);
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'Pa')).toBe('0010');
    expect(ozVon(danach, 'Pb')).toBe('0020');
  });

  it('eine bereits kanonische OZ ergibt ein leeres ChangeSet, dasselbe Objekt als Zustand', () => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    const z1 = lvChangeSetAnwenden(z, nummeriere(z));
    const cs = nummeriere(z1);
    expect(keineAenderung(cs)).toBe(true);
    expect(lvChangeSetAnwenden(z1, cs)).toBe(z1);
  });

  it('Summen bleiben unverändert und das ChangeSet nennt keine Summen (A6)', () => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    const cs = nummeriere(z);
    expect(cs.summen).toEqual({ positionen: [], gliederungen: [], gesamt: null });
    expect(lvChangeSetAnwenden(z, cs).summen).toBe(z.summen);
  });

  it('Anwenden und Umkehrung stellen den Vorzustand exakt her', () => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    const cs = nummeriere(z);
    const danach = lvChangeSetAnwenden(z, cs);
    expect(danach).not.toEqual(z);
    expect(lvChangeSetAnwenden(danach, changeSetUmkehren(cs, z))).toEqual(z);
  });
});

describe('Umnummerieren: Indexpositionen (vorläufige Annahme d)', () => {
  const mitIndex = (): Knoten[] => [
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '1.000', '1.000'),
    posKnoten('P2', 'T1', 1, '1.000', '1.000'),
    posKnoten('P2A', 'T1', 2, '1.000', '1.000', { ozIndex: 'A' }),
    { art: 'hinweis', id: id.hinweis('H'), elternId: id.eltern('T1'), reihenfolge: 3, text: [] },
    posKnoten('P2B', 'T1', 4, '1.000', '1.000', { ozIndex: 'B' }),
    posKnoten('P3', 'T1', 5, '1.000', '1.000'),
  ];

  it('eine Position mit ozIndex teilt den Grundteil der vorhergehenden Position und verbraucht keinen Zähler', () => {
    const z = mitMaske(MASKE_STANDARD, mitIndex());
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'P1')).toBe('01.0010');
    expect(ozVon(danach, 'P2')).toBe('01.0020');
    expect(ozVon(danach, 'P2A')).toBe('01.0020');
    expect(ozVon(danach, 'P2B')).toBe('01.0020');
    expect(ozVon(danach, 'P3')).toBe('01.0030');
  });

  it('ozIndex bleibt unverändert und taucht im ChangeSet nicht als Änderung auf', () => {
    const z = mitMaske(MASKE_STANDARD, mitIndex());
    const cs = nummeriere(z);
    expect(cs.knoten.geaendert.length).toBeGreaterThan(0);
    for (const g of cs.knoten.geaendert) {
      if (g.nachher.art === 'hinweis') throw new Error('Hinweistexte tragen keine OZ');
      expect({
        ...g.nachher,
        ordnungszahl: g.vorher.art === 'hinweis' ? null : g.vorher.ordnungszahl,
      }).toEqual(g.vorher);
    }
    const danach = lvChangeSetAnwenden(z, cs);
    const p = knotenMap(danach).get('P2A') as Position;
    expect(p.ozIndex).toBe('A');
  });

  it('ohne vorhergehende Position bekommt die Indexposition einen eigenen Grundteil', () => {
    const z = mitMaske(MASKE_STANDARD, [
      titelKnoten('T1', LV_ID, 0),
      posKnoten('PA', 'T1', 0, '1.000', '1.000', { ozIndex: 'A' }),
      posKnoten('P2', 'T1', 1, '1.000', '1.000'),
    ]);
    const danach = lvChangeSetAnwenden(z, nummeriere(z));
    expect(ozVon(danach, 'PA')).toBe('01.0010');
    expect(ozVon(danach, 'P2')).toBe('01.0020');
  });

  it('ozIndex bei einer Maske ohne Index wird abgewiesen (kein stiller Datenverlust, Q5)', () => {
    const z = mitMaske({ ...MASKE_STANDARD, index: null }, mitIndex());
    const f = fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('P2A');
  });

  it('zwei Indexpositionen mit gleichem Buchstaben am selben Grundteil: abgewiesen, kein Duplikat', () => {
    const z = mitMaske(MASKE_STANDARD, [
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '1.000'),
      posKnoten('PA', 'T1', 1, '1.000', '1.000', { ozIndex: 'A' }),
      posKnoten('PA2', 'T1', 2, '1.000', '1.000', { ozIndex: 'A' }),
    ]);
    const f = fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) });
    expect(f.code).toBe('oz-ungueltig');
    expect(f.knotenId).toBe('PA2');
  });

  it('ein Indexbuchstabe, der nicht zur Maske passt (zwei Zeichen), wird mit Knoten abgewiesen', () => {
    const z = mitMaske(MASKE_STANDARD, [
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '1.000'),
      posKnoten('PA', 'T1', 1, '1.000', '1.000', { ozIndex: 'AB' }),
    ]);
    const f = fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('PA');
  });
});

describe('Umnummerieren: Grenzen und Fehler', () => {
  it('Überlauf der Positionszähler (vorläufige Annahme c): 9 Positionen bei 2 Stellen, die 10. wird abgewiesen', () => {
    const maske: OzMaske = { gliederung: [], position: num(2), index: null, trennzeichen: null };
    const neun = Array.from({ length: 9 }, (_, i) => posKnoten(`P${String(i)}`, LV_ID, i, '1.000', '1.000'));
    const z9 = mitMaske(maske, neun);
    const danach = lvChangeSetAnwenden(z9, nummeriere(z9));
    expect(ozVon(danach, 'P8')).toBe('90');
    const z10 = mitMaske(maske, [...neun, posKnoten('P9', LV_ID, 9, '1.000', '1.000')]);
    const f = fehlerVon(z10, { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('P9');
  });

  it('Überlauf der Gliederungszähler: 9 Titel bei 1 Stelle, der 10. wird abgewiesen', () => {
    const maske: OzMaske = { gliederung: [num(1)], position: num(4), index: null, trennzeichen: null };
    const titel = (n: number): Titel => titelKnoten(`T${String(n)}`, LV_ID, n);
    const z = mitMaske(
      maske,
      Array.from({ length: 10 }, (_, i) => titel(i)),
    );
    const f = fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('T9');
  });

  it('999 Positionen passen bei 4 Stellen nicht: ab der 1000. Position (Schritt 10, höchstens 999) abgewiesen', () => {
    const maske: OzMaske = { gliederung: [], position: num(4), index: null, trennzeichen: null };
    const n = Array.from({ length: 1000 }, (_, i) => posKnoten(`P${String(i)}`, LV_ID, i, '1.000', '1.000'));
    const f = fehlerVon(mitMaske(maske, n), { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('P999');
    const z999 = mitMaske(maske, n.slice(0, 999));
    const danach = lvChangeSetAnwenden(z999, nummeriere(z999));
    expect(ozVon(danach, 'P998')).toBe('9990');
  });

  it('ein Knoten tiefer als die Maske Stufen hat: abgewiesen, der Fehler nennt den Knoten', () => {
    const maske: OzMaske = { gliederung: [num(2)], position: num(4), index: null, trennzeichen: '.' };
    const z = mitMaske(maske, [titelKnoten('T1', LV_ID, 0), titelKnoten('T11', 'T1', 0)]);
    const f = fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('T11');
  });

  it('Teilbaum unbekannt: knoten-unbekannt; eine Position als Teilbaum: knotenart-unzulaessig', () => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    expect(fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern('gibt-es-nicht') }).code).toBe(
      'knoten-unbekannt',
    );
    expect(fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern('P111') }).code).toBe(
      'knotenart-unzulaessig',
    );
    expect(fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern('H') }).code).toBe(
      'knotenart-unzulaessig',
    );
  });

  it('ein Zustand ohne LV: befehl-nicht-zustaendig', () => {
    expect(lvBefehlAusfuehren(null, { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) }).ok).toBe(false);
  });

  it('eine neue OZ, die auf eine bestehende außerhalb des Teilbaums trifft, wird abgewiesen (kein Duplikat)', () => {
    // T1 trägt „01“; unter T2 steht von Hand schon „01.01.0010“, das beim Umnummerieren unter T1 ein zweites Mal entstünde.
    const knoten = beispielbaum().map((k): Knoten => {
      if (k.id === 'T1') return { ...(k as Titel), ordnungszahl: '01' as Ordnungszahl };
      if (k.id === 'P21') return { ...(k as Position), ordnungszahl: '01.01.0010' as Ordnungszahl };
      return k;
    });
    const z = mitMaske(MASKE_STANDARD, knoten);
    const f = fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern('T1') });
    expect(f.code).toBe('oz-ungueltig');
    expect(f.knotenId).toBe('P111');
  });
});

describe('Umnummerieren: Teilbaum', () => {
  it('nur die Nachfahren der Teilbaumwurzel, mit deren OZ als Vorsilbe; die Wurzel selbst bleibt', () => {
    const z0 = mitMaske(MASKE_STANDARD, beispielbaum());
    const z1 = lvChangeSetAnwenden(z0, nummeriere(z0));
    // Die Nachfahren von T1 werden verstellt; Umnummerieren(T1) stellt sie wieder her.
    const verstellt = {
      ...z1,
      leistungsverzeichnis: {
        ...z1.leistungsverzeichnis,
        knoten: z1.leistungsverzeichnis.knoten.map((k) =>
          k.art === 'hinweis' || k.id === 'T1' || k.id === 'T2' || k.id === 'P21'
            ? k
            : { ...k, ordnungszahl: null },
        ),
      },
    };
    const cs = nummeriere(verstellt, 'T1');
    expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(['T11', 'P111', 'P112', 'P12']);
    expect(lvChangeSetAnwenden(verstellt, cs).leistungsverzeichnis.knoten).toEqual(
      z1.leistungsverzeichnis.knoten,
    );
  });

  it('eine Teilbaumwurzel ohne gültige OZ liefert oz-ungueltig mit dem Knoten', () => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    const f = fehlerVon(z, { art: 'Umnummerieren', teilbaumId: id.eltern('T1') });
    expect(f.code).toBe('oz-ungueltig');
    expect(f.knotenId).toBe('T1');
  });
});

// --- OrdnungszahlSetzen ----------------------------------------------------------------------------------------

describe('OrdnungszahlSetzen: gültige Eingaben', () => {
  const z0 = (): LvZustand => mitMaske(MASKE_STANDARD, beispielbaum());
  const setze = (z: LvZustand, knoten: string, oz: string | null, index: string | null = null): LvChangeSet =>
    okVon(z, {
      art: 'OrdnungszahlSetzen',
      knotenId: id.knoten(knoten) as never,
      ordnungszahl: oz as Ordnungszahl | null,
      ozIndex: index,
    });

  it('setzt OZ und Index einer Position; das ChangeSet nennt genau diesen Knoten', () => {
    const z = z0();
    const cs = setze(z, 'P111', '01.01.0010', 'A');
    expect(cs.knoten.geaendert).toHaveLength(1);
    const danach = lvChangeSetAnwenden(z, cs);
    const p = knotenMap(danach).get('P111') as Position;
    expect(p.ordnungszahl).toBe('01.01.0010');
    expect(p.ozIndex).toBe('A');
    expect(lvChangeSetAnwenden(danach, changeSetUmkehren(cs, z))).toEqual(z);
  });

  it('setzt die OZ einer Gliederung (Stufe 1: zwei Ziffern; Stufe 2: zwei Teile)', () => {
    const z = z0();
    expect(ozVon(lvChangeSetAnwenden(z, setze(z, 'T1', '07')), 'T1')).toBe('07');
    expect(ozVon(lvChangeSetAnwenden(z, setze(z, 'T11', '07.03')), 'T11')).toBe('07.03');
  });

  it('eine Position direkt unter Stufe 1 hat zwei Teile (unbelegte Stufe, FD 3.3, 4.3.4)', () => {
    const z = z0();
    expect(ozVon(lvChangeSetAnwenden(z, setze(z, 'P12', '01.0010')), 'P12')).toBe('01.0010');
  });

  it('null löscht die OZ', () => {
    const z = lvChangeSetAnwenden(z0(), nummeriere(z0()));
    expect(ozVon(lvChangeSetAnwenden(z, setze(z, 'P111', null)), 'P111')).toBeNull();
  });

  it('derselbe Wert noch einmal: leeres ChangeSet', () => {
    const z = lvChangeSetAnwenden(z0(), nummeriere(z0()));
    expect(keineAenderung(setze(z, 'P111', '01.01.0010'))).toBe(true);
  });

  it('alphanumerische Stufe nimmt Buchstaben und Unterstrich (vorläufige Annahme f)', () => {
    const maske: OzMaske = { gliederung: [alnum(3)], position: num(4), index: null, trennzeichen: '-' };
    const z = mitMaske(maske, [titelKnoten('T1', LV_ID, 0)]);
    for (const oz of ['A1b', 'X_9', '001']) {
      expect(ozVon(lvChangeSetAnwenden(z, setze(z, 'T1', oz)), 'T1')).toBe(oz);
    }
  });

  it('Duplikate werden nicht abgewiesen (U5); die Hilfe nennt sie für die formale Prüfung', () => {
    const z = lvChangeSetAnwenden(z0(), nummeriere(z0()));
    const dup = lvChangeSetAnwenden(z, setze(z, 'P112', '01.01.0010'));
    expect(ozVon(dup, 'P112')).toBe('01.01.0010');
    expect(doppelteOrdnungszahlen(dup.leistungsverzeichnis.knoten)).toEqual([
      { ordnungszahl: '01.01.0010', ozIndex: null, knotenIds: ['P111', 'P112'] },
    ]);
  });

  it('Umlaute sind in der alphanumerischen Stelle nicht erlaubt, das Zeichen _ schon', () => {
    const maske: OzMaske = { gliederung: [alnum(2)], position: num(4), index: null, trennzeichen: null };
    expect(ozFehler(maske, 'ä1', null, 'gliederung', 1)).toEqual(expect.any(String));
    expect(ozFehler(maske, 'A_', null, 'gliederung', 1)).toBeNull();
  });
});

describe('OrdnungszahlSetzen: Eingaben, die abgewiesen werden', () => {
  const z = mitMaske(MASKE_STANDARD, beispielbaum());
  const versuche: readonly [string, string, string | null, string | null][] = [
    ['zu lange OZ (mehr als 14 Stellen)', 'P111', '01.01.0010.0020.0030', null],
    ['zu viele Teile', 'P111', '01.01.01.0010', null],
    ['zu wenige Teile für eine Position unter Stufe 2', 'P111', '0010', null],
    ['Teil zu kurz', 'P111', '01.01.010', null],
    ['Teil zu lang', 'P111', '01.01.00100', null],
    ['Buchstabe in numerischer Stelle', 'P111', '01.01.00A0', null],
    ['Kleinbuchstabe in numerischer Stufe', 'T1', 'a1', null],
    ['Leerzeichen', 'P111', '01.01.00 0', null],
    ['Umlaut', 'P111', '01.01.00ä0', null],
    ['falsches Trennzeichen', 'P111', '01-01-0010', null],
    ['leere OZ', 'P111', '', null],
    ['Teil nur aus Nullen', 'P111', '01.01.0000', null],
    ['Stufe nur aus Nullen', 'T1', '00', null],
    ['Index mit zwei Zeichen', 'P111', '01.01.0010', 'AB'],
    ['leerer Index', 'P111', '01.01.0010', ''],
    ['Index ohne OZ', 'P111', null, 'A'],
    ['Index an einer Gliederung', 'T1', '01', 'A'],
    ['OZ mit Stufe 3 unter einer Stufe-2-Maske', 'P111', '01.01.01.0010', null],
  ];
  it.each(versuche)('%s', (_name, knoten, oz, index) => {
    const f = fehlerVon(z, {
      art: 'OrdnungszahlSetzen',
      knotenId: id.knoten(knoten) as never,
      ordnungszahl: oz as Ordnungszahl | null,
      ozIndex: index,
    });
    expect(f.code).toBe('oz-ungueltig');
    expect(f.knotenId).toBe(knoten);
  });

  it('Index bei einer Maske ohne Indexstelle', () => {
    const ohne = mitMaske({ ...MASKE_STANDARD, index: null }, beispielbaum());
    const f = fehlerVon(ohne, {
      art: 'OrdnungszahlSetzen',
      knotenId: id.pos('P111') as never,
      ordnungszahl: '01.01.0010' as Ordnungszahl,
      ozIndex: 'A',
    });
    expect(f.code).toBe('oz-ungueltig');
  });

  it('unbekannter Knoten, Hinweistext und LV-Wurzel', () => {
    const b = (k: string): LvBefehl => ({
      art: 'OrdnungszahlSetzen',
      knotenId: id.knoten(k) as never,
      ordnungszahl: null,
      ozIndex: null,
    });
    expect(fehlerVon(z, b('gibt-es-nicht')).code).toBe('knoten-unbekannt');
    expect(fehlerVon(z, b(LV_ID)).code).toBe('knoten-unbekannt');
    expect(fehlerVon(z, b('H')).code).toBe('knotenart-unzulaessig');
  });

  it('ein abgewiesener Befehl ändert den Zustand nicht (reine Funktion)', () => {
    const vorher = structuredClone(z);
    fehlerVon(z, {
      art: 'OrdnungszahlSetzen',
      knotenId: id.pos('P111') as never,
      ordnungszahl: 'x' as Ordnungszahl,
      ozIndex: null,
    });
    expect(z).toEqual(vorher);
  });

  it('in der Maske ohne Trennzeichen entscheidet die Gesamtlänge', () => {
    const o = mitMaske(MASKE_OHNE_TRENNER, beispielbaum());
    const setze = (oz: string): LvBefehl => ({
      art: 'OrdnungszahlSetzen',
      knotenId: id.pos('P111') as never,
      ordnungszahl: oz as Ordnungszahl,
      ozIndex: null,
    });
    expect(lvBefehlAusfuehren(o, setze('01010010')).ok).toBe(true);
    expect(lvBefehlAusfuehren(o, setze('0101010')).ok).toBe(false);
    expect(lvBefehlAusfuehren(o, setze('010100100')).ok).toBe(false);
  });
});

// --- OzMaskeSetzen -----------------------------------------------------------------------------------------------

describe('OzMaskeSetzen', () => {
  const z0 = (): LvZustand => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    return lvChangeSetAnwenden(z, nummeriere(z));
  };

  it('ein ChangeSet: neue Maske im Kopf und alle umnummerierten Knoten', () => {
    const z = z0();
    const cs = okVon(z, { art: 'OzMaskeSetzen', maske: MASKE_OHNE_TRENNER });
    expect(cs.kopf?.vorher?.ozMaske).toEqual(MASKE_STANDARD);
    expect(cs.kopf?.nachher?.ozMaske).toEqual(MASKE_OHNE_TRENNER);
    // T1 und T2 (Stufe 1, zwei Ziffern) behalten ihre OZ „01“ und „02“: sie stehen nicht im ChangeSet.
    expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(['T11', 'P111', 'P112', 'P12', 'P21']);
    const danach = lvChangeSetAnwenden(z, cs);
    expect(danach.leistungsverzeichnis.ozMaske).toEqual(MASKE_OHNE_TRENNER);
    expect(ozVon(danach, 'P111')).toBe('01010010');
    expect(ozVon(danach, 'P21')).toBe('020010');
    expect(danach.summen).toBe(z.summen);
    expect(lvChangeSetAnwenden(danach, changeSetUmkehren(cs, z))).toEqual(z);
  });

  it('ändert nur das Nötige: die OZ, die schon stimmt, steht nicht im ChangeSet', () => {
    const z = z0();
    const andere: OzMaske = { ...MASKE_STANDARD, trennzeichen: '-' };
    const cs = okVon(z, { art: 'OzMaskeSetzen', maske: andere });
    // Gliederung Stufe 1 hat kein Trennzeichen in der OZ, bleibt also gleich.
    expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(['T11', 'P111', 'P112', 'P12', 'P21']);
  });

  it('dieselbe Maske noch einmal: leeres ChangeSet, auch mit einem gleichwertigen anderen Objekt', () => {
    const z = z0();
    expect(keineAenderung(okVon(z, { art: 'OzMaskeSetzen', maske: structuredClone(MASKE_STANDARD) }))).toBe(
      true,
    );
  });

  it('lässt sich ein Knoten nicht nummerieren, gibt es nur einen Fehlerwert und keinerlei Änderung', () => {
    const z = z0();
    const eng: OzMaske = { gliederung: [num(2)], position: num(4), index: alnum(1), trennzeichen: '.' };
    const f = fehlerVon(z, { art: 'OzMaskeSetzen', maske: eng });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('T11');
    expect(z.leistungsverzeichnis.ozMaske).toEqual(MASKE_STANDARD);
  });

  it.each([
    ['Stufe mit 0 Stellen', { ...MASKE_STANDARD, gliederung: [num(0), num(2)] }],
    ['15 Stellen', { ...MASKE_STANDARD, position: num(10) }],
    [
      'sechs Stufen',
      {
        ...MASKE_STANDARD,
        gliederung: Array.from({ length: 6 }, () => num(1)),
        position: num(1),
        index: null,
      },
    ],
  ] as const)('ungültige Maske (%s): maske-ungueltig ohne Knoten', (_name, maske) => {
    const f = fehlerVon(z0(), { art: 'OzMaskeSetzen', maske: maske as unknown as OzMaske });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBeUndefined();
  });

  it('ein Index an einer Position, aber keine Indexstelle in der neuen Maske: abgewiesen', () => {
    const z = mitMaske(MASKE_STANDARD, [
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '1.000'),
      posKnoten('P1A', 'T1', 1, '1.000', '1.000', { ozIndex: 'A' }),
    ]);
    const f = fehlerVon(z, { art: 'OzMaskeSetzen', maske: { ...MASKE_STANDARD, index: null } });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('P1A');
  });

  it('eine Maske mit einem Titel in einem LV ohne Stufen: abgewiesen, Zustand unverändert', () => {
    const z = z0();
    const f = fehlerVon(z, {
      art: 'OzMaskeSetzen',
      maske: { gliederung: [], position: num(4), index: null, trennzeichen: null },
    });
    expect(f.code).toBe('maske-ungueltig');
    expect(f.knotenId).toBe('T1');
  });
});

// --- Neue Knoten: Autonummer ist ein Nicht-Ziel (U3) -------------------------------------------------------------

describe('PositionAnlegen und GliederungAnlegen vergeben keine OZ', () => {
  it('die OZ bleibt, wie geliefert (null oder gesetzt); automatisches Nummerieren beim Einfügen ist ein Nicht-Ziel', () => {
    const z = mitMaske(MASKE_STANDARD, beispielbaum());
    const mitTitel = wende(z, {
      art: 'GliederungAnlegen',
      id: id.titel('TN'),
      gliederungsart: 'titel',
      ort: { art: 'ende', elternId: id.eltern(LV_ID) },
      kurztext: 'Neu',
    });
    expect(ozVon(mitTitel, 'TN')).toBeNull();
    const mitPosition = wende(mitTitel, {
      art: 'PositionAnlegen',
      id: id.pos('PN'),
      ort: { art: 'ende', elternId: id.eltern('TN') },
      daten: positionsdaten('Neu', { ordnungszahl: 'frei' as Ordnungszahl }),
    });
    expect(ozVon(mitPosition, 'PN')).toBe('frei');
    const ohne = wende(mitTitel, {
      art: 'PositionAnlegen',
      id: id.pos('PO'),
      ort: { art: 'ende', elternId: id.eltern('TN') },
      daten: positionsdaten('Neu'),
    });
    expect(ozVon(ohne, 'PO')).toBeNull();
  });
});

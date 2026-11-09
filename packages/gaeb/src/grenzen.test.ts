// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des GAEB-Lesers (Ticket 22), zweiter Teil: Los und Gliederung, Trennzeichen, Robustheit.

import { describe, expect, it } from 'vitest';
import type { Knoten, Position, Pruefbefund } from '@tethys/vertrag';
import { leseGaeb } from './index';
import type { GaebLesungErgebnis } from './index';
import { TEST_MWST, lesePfad, testIds } from './testhilfen';

const lies = (eingabe: Uint8Array | string, dateiname?: string): GaebLesungErgebnis =>
  leseGaeb(eingabe, {
    ids: testIds(),
    standardMwstSatz: TEST_MWST,
    ...(dateiname === undefined ? {} : { dateiname }),
  });
const codes = (l: { befunde: readonly Pruefbefund[] }): string[] => l.befunde.map((b) => b.code);
const knoten = (l: GaebLesungErgebnis): readonly Knoten[] => l.inhalt?.knoten ?? [];
const positionen = (l: GaebLesungErgebnis): Position[] =>
  knoten(l).filter((k): k is Position => k.art === 'position');

const BAU_X83 = 'fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83';
const TEXT_X81 = 'fixtures/extern/bvbs/3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x81';

describe('Los als oberste Gliederungsstufe (Fachdokumentation 3.3, 4.2.1)', () => {
  const lv = (bkdn: string, koerper: string): string =>
    '<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><Award><DP>83</DP><BoQ><BoQInfo>' +
    bkdn +
    '<BoQBkdn><Type>Item</Type><Length>4</Length><Num>Yes</Num></BoQBkdn></BoQInfo><BoQBody>' +
    koerper +
    '</BoQBody></BoQ></Award></GAEB>';
  const stufe = (typ: string, laenge: number): string =>
    `<BoQBkdn><Type>${typ}</Type><Length>${String(laenge)}</Length><Num>Yes</Num></BoQBkdn>`;
  const position = '<Itemlist><Item ID="p" RNoPart="0010"><Qty>1.000</Qty><QU>St</QU></Item></Itemlist>';

  it('BoQBkdn Lot wird Los-Knoten ganz oben und belegt eine Stufe der Maske', () => {
    const l = lies(
      lv(
        stufe('Lot', 1) + stufe('BoQLevel', 2),
        `<BoQCtgy ID="l" RNoPart="1"><LblTx><p><span>Los 1</span></p></LblTx><BoQBody><BoQCtgy ID="t" RNoPart="01"><LblTx><p><span>Titel</span></p></LblTx><BoQBody>${position}</BoQBody></BoQCtgy></BoQBody></BoQCtgy>`,
      ),
    );
    expect(l.inhalt?.ozMaske.gliederung).toEqual([
      { laenge: 1, zeichen: 'numerisch' },
      { laenge: 2, zeichen: 'numerisch' },
    ]);
    expect(knoten(l).map((k) => k.art)).toEqual(['los', 'titel', 'position']);
    expect(knoten(l).map((k) => (k.art === 'hinweis' ? '' : k.ordnungszahl))).toEqual([
      '1',
      '1.01',
      '1.01.0010',
    ]);
    expect(knoten(l)[0]?.elternId).toBe(l.wurzelId);
    expect(codes(l)).not.toContain('gliederung-zu-tief');
  });

  it('Lot plus vier Stufen (5 insgesamt) ist erlaubt, Lot plus fünf Stufen ist ein Fehler', () => {
    const fuenf = stufe('Lot', 1) + stufe('BoQLevel', 1).repeat(4);
    expect(codes(lies(lv(fuenf, position)))).not.toContain('gliederung-zu-tief');
    const sechs = stufe('Lot', 1) + stufe('BoQLevel', 1).repeat(5);
    expect(codes(lies(lv(sechs, position)))).toContain('gliederung-zu-tief');
  });

  it('Lot nicht an erster Stelle ist ein Befund', () => {
    expect(codes(lies(lv(stufe('BoQLevel', 2) + stufe('Lot', 1), position)))).toContain(
      'oz-maske-reihenfolge',
    );
  });

  it('Ebene tiefer als die Gliederung ist ein Fehler', () => {
    const l = lies(
      lv(
        stufe('BoQLevel', 2),
        `<BoQCtgy ID="a" RNoPart="01"><BoQBody><BoQCtgy ID="b" RNoPart="01"><BoQBody>${position}</BoQBody></BoQCtgy></BoQBody></BoQCtgy>`,
      ),
    );
    expect(codes(l)).toContain('gliederung-ueberzaehlig');
    expect(positionen(l)).toHaveLength(1);
  });

  it('OZ über 14 Stellen: Fehlerbefund an Maske und Position', () => {
    const l = lies(
      lv(
        stufe('BoQLevel', 6) + stufe('BoQLevel', 5),
        `<BoQCtgy ID="a" RNoPart="123456"><BoQBody><BoQCtgy ID="b" RNoPart="12345"><BoQBody>${position}</BoQBody></BoQCtgy></BoQBody></BoQCtgy>`,
      ),
    );
    expect(codes(l)).toEqual(expect.arrayContaining(['oz-maske-ueberlauf', 'oz-ueberlauf']));
  });

  it('Trennzeichen ist eine Option und steht in der Maske', () => {
    const doc = lv(
      stufe('BoQLevel', 2),
      `<BoQCtgy ID="a" RNoPart="01"><BoQBody>${position}</BoQBody></BoQCtgy>`,
    );
    const ohne = leseGaeb(doc, { ids: testIds(), standardMwstSatz: TEST_MWST, trennzeichen: null });
    expect(positionen(ohne)[0]?.ordnungszahl).toBe('010010');
    expect(ohne.inhalt?.ozMaske.trennzeichen).toBeNull();
    const strich = leseGaeb(doc, { ids: testIds(), standardMwstSatz: TEST_MWST, trennzeichen: '-' });
    expect(positionen(strich)[0]?.ordnungszahl).toBe('01-0010');
  });
});

describe('Robustheit', () => {
  it('Leerraum um einen Dezimalwert (Zeilenumbruch im Tag) ist kein Befund', () => {
    const l = lies(
      '<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><Award><DP>83</DP><BoQ><BoQBody><Itemlist><Item ID="a" RNoPart="1"><Qty>\n  12.500\n </Qty><QU>m</QU></Item></Itemlist></BoQBody></BoQ></Award></GAEB>',
    );
    expect(positionen(l)[0]?.menge).toBe('12.500');
    expect(codes(l)).not.toContain('leerraum-entfernt');
  });

  it('an jeder Stelle abgeschnittene Datei wirft nie und liefert Positionen bis dahin', () => {
    const voll = lesePfad(BAU_X83);
    const gesamt = positionen(lies(voll)).length;
    let vorher = 0;
    for (let p = 400; p < voll.length; p += Math.floor(voll.length / 97)) {
      const l = lies(voll.slice(0, p), 'x.x83');
      expect(l.befunde.length).toBeGreaterThan(0);
      const n = positionen(l).length;
      expect(n).toBeGreaterThanOrEqual(vorher);
      expect(n).toBeLessThanOrEqual(gesamt);
      vorher = n;
    }
    expect(vorher).toBeGreaterThan(20);
  });

  it('Zufallsbytes und Müll werfen nie', () => {
    let z = 12345;
    const zufall = (): number => {
      z = (z * 1103515245 + 12345) % 2147483648;
      return z;
    };
    for (const laenge of [0, 1, 7, 100, 5000]) {
      const b = new Uint8Array(laenge).map(() => zufall() % 256);
      expect(() => lies(b)).not.toThrow();
    }
    const muell = [
      '',
      '<',
      '<<<>>>',
      '&',
      '<a',
      '<a b="',
      '<!--',
      '<![CDATA[',
      '</>',
      '<GAEB><Award><BoQ><Itemlist><Item><',
      '\u0000\u0001',
    ];
    for (const s of muell) expect(() => lies(s)).not.toThrow();
  });

  it('begrenzt die Zahl der Befunde, damit eine Datei voller Fehler den Speicher schont', () => {
    const items = '<Item ID="x" RNoPart="1"><Qty>1,5</Qty><QU>m</QU></Item>'.repeat(30_000);
    const l = lies(
      `<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><Award><DP>83</DP><BoQ><BoQBody><Itemlist>${items}</Itemlist></BoQBody></BoQ></Award></GAEB>`,
    );
    expect(positionen(l)).toHaveLength(30_000);
    expect(l.befunde.length).toBeLessThan(25_000);
    expect(codes(l)).toContain('befunde-begrenzt');
  });

  it('Eingabe als Buffer, Uint8Array und String ergibt dasselbe', () => {
    const bytes = lesePfad(TEXT_X81);
    const a = lies(bytes);
    const b = lies(Buffer.from(bytes));
    const c = lies(new TextDecoder().decode(bytes));
    expect(b).toEqual(a);
    expect(c.inhalt).toEqual(a.inhalt);
  });
});

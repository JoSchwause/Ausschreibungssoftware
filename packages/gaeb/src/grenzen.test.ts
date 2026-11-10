// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des GAEB-Lesers (Ticket 22), zweiter Teil: Los und Gliederung, Trennzeichen, Robustheit.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Knoten, Position, Pruefbefund } from '@tethys/vertrag';
import { MAX_STUFEN, leseGaeb } from './index';
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

const zaehle = (l: GaebLesungErgebnis, art: Knoten['art']): number =>
  knoten(l).filter((k) => k.art === art).length;
const WURZEL = new URL('../../..', import.meta.url).pathname;
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

describe('Der Leser liefert nichts, was der Kern als Ganzes abweist (U5: Import blockiert nie)', () => {
  // Der Kern darf hier nicht importiert werden (A3); die Invarianten, die er beim Anlegen prüft, stehen darum
  // als Einzelprüfung der Leser-Ausgabe da: Los nur direkt unter dem LV, höchstens 5 Gliederungsebenen, Bezüge
  // nur auf eine andere vorhandene Position.
  const lv = (bkdn: string, koerper: string): string =>
    '<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><Award><DP>83</DP><BoQ><BoQInfo>' +
    bkdn +
    '<BoQBkdn><Type>Item</Type><Length>4</Length><Num>Yes</Num></BoQBkdn></BoQInfo><BoQBody>' +
    koerper +
    '</BoQBody></BoQ></Award></GAEB>';
  const stufe = (typ: string, laenge = 1): string =>
    `<BoQBkdn><Type>${typ}</Type><Length>${String(laenge)}</Length><Num>Yes</Num></BoQBkdn>`;
  const position = (id: string, nr: string): string =>
    `<Item ID="${id}" RNoPart="${nr}"><Qty>1.000</Qty><QU>St</QU></Item>`;
  const kategorie = (id: string, nr: string, inhalt: string): string =>
    `<BoQCtgy ID="${id}" RNoPart="${nr}"><LblTx><p><span>Bereich ${id}</span></p></LblTx><BoQBody>${inhalt}</BoQBody></BoQCtgy>`;
  const zuschlag = (id: string, nr: string, bezug: string): string =>
    `<MarkupItem ID="${id}" RNoPart="${nr}"><MarkupType>ListInSubQty</MarkupType><MarkupSubQty><RefItem IDRef="${bezug}"/></MarkupSubQty></MarkupItem>`;

  /** Höchste Zahl verschachtelter Gliederungsknoten (Los und Titel) auf einem Pfad. */
  function gliederungstiefe(l: GaebLesungErgebnis): number {
    const alle = knoten(l);
    const nachId = new Map(alle.map((k) => [k.id as string, k]));
    let tiefste = 0;
    for (const k of alle) {
      let n = 0;
      for (let a: Knoten | undefined = k; a !== undefined; a = nachId.get(a.elternId)) {
        if (a.art === 'los' || a.art === 'titel') n += 1;
      }
      tiefste = Math.max(tiefste, n);
    }
    return tiefste;
  }

  function pruefeKernInvarianten(l: GaebLesungErgebnis): void {
    const alle = knoten(l);
    const ids = new Set(alle.map((k) => k.id as string));
    expect(ids.size).toBe(alle.length);
    for (const k of alle) {
      expect(k.elternId === l.wurzelId || ids.has(k.elternId)).toBe(true);
      if (k.art === 'los') expect(k.elternId).toBe(l.wurzelId);
      if (k.art === 'position' && k.bezugspositionId !== null) {
        expect(k.bezugspositionId).not.toBe(k.id);
        expect(ids.has(k.bezugspositionId)).toBe(true);
      }
    }
    expect(gliederungstiefe(l)).toBeLessThanOrEqual(MAX_STUFEN);
  }

  it('Zuschlagsposition, deren RefItem auf die eigene ID zeigt: kein Bezug, Warnung', () => {
    const l = lies(lv('', `<Itemlist>${position('a', '0010')}${zuschlag('z', '0020', 'z')}</Itemlist>`));
    const z = positionen(l).find((p) => p.positionsart === 'zuschlag');
    expect(z).toBeDefined();
    expect(z?.bezugspositionId).toBeNull();
    const b = l.befunde.find((x) => x.code === 'verweis-auf-sich');
    expect(b?.schwere).toBe('warnung');
    expect(b?.ort.knotenId).toBe(z?.id);
    pruefeKernInvarianten(l);
  });

  it('Zuschlagsposition mit gültigem Bezug behält ihn', () => {
    const l = lies(lv('', `<Itemlist>${position('a', '0010')}${zuschlag('z', '0020', 'a')}</Itemlist>`));
    const [pos, z] = positionen(l);
    expect(z?.bezugspositionId).toBe(pos?.id);
    expect(codes(l)).not.toContain('verweis-auf-sich');
  });

  it('Zuschlagsposition mit Verweis auf einen Titel oder eine unbekannte ID: kein Bezug, Befund', () => {
    const l = lies(
      lv(
        stufe('BoQLevel', 2),
        kategorie(
          't',
          '01',
          `<Itemlist>${zuschlag('z', '0010', 't')}${zuschlag('y', '0020', 'nix')}</Itemlist>`,
        ),
      ),
    );
    expect(positionen(l).map((p) => p.bezugspositionId)).toEqual([null, null]);
    expect(codes(l).filter((c) => c === 'verweis-unbekannt')).toHaveLength(2);
    pruefeKernInvarianten(l);
  });

  it('Lot weiter unten in der Gliederung wird ein Titel, mit Befund', () => {
    const l = lies(
      lv(
        stufe('BoQLevel', 2) + stufe('Lot', 1),
        kategorie('a', '01', kategorie('b', '1', `<Itemlist>${position('p', '0010')}</Itemlist>`)),
      ),
    );
    expect(knoten(l).map((k) => k.art)).toEqual(['titel', 'titel', 'position']);
    const b = l.befunde.find((x) => x.code === 'los-zu-titel');
    expect(b?.schwere).toBe('warnung');
    expect(codes(l)).toContain('oz-maske-reihenfolge');
    pruefeKernInvarianten(l);
  });

  it('zweites Lot in der Gliederung: oberste Stufe bleibt Los, die zweite wird Titel', () => {
    const l = lies(
      lv(
        stufe('Lot') + stufe('Lot'),
        kategorie('a', '1', kategorie('b', '2', `<Itemlist>${position('p', '0010')}</Itemlist>`)),
      ),
    );
    expect(knoten(l).map((k) => k.art)).toEqual(['los', 'titel', 'position']);
    expect(codes(l)).toContain('los-zu-titel');
    pruefeKernInvarianten(l);
  });

  it('Los oben bleibt Los und erzeugt keinen Befund los-zu-titel', () => {
    const l = lies(
      lv(
        stufe('Lot') + stufe('BoQLevel'),
        kategorie('a', '1', kategorie('b', '2', `<Itemlist>${position('p', '0010')}</Itemlist>`)),
      ),
    );
    expect(knoten(l).map((k) => k.art)).toEqual(['los', 'titel', 'position']);
    expect(codes(l)).not.toContain('los-zu-titel');
    pruefeKernInvarianten(l);
  });

  it('Gliederung tiefer als 5 Stufen: die Ebenen ab der 6. entfallen mit Befund, Positionen bleiben', () => {
    const innen = `<Itemlist>${position('p', '0010')}</Itemlist>`;
    let baum = innen;
    for (const nr of ['7', '6', '5', '4', '3', '2', '1']) baum = kategorie(`k${nr}`, '1', baum);
    const l = lies(lv(stufe('BoQLevel').repeat(7), baum));
    expect(zaehle(l, 'titel')).toBe(5);
    expect(positionen(l)).toHaveLength(1);
    expect(positionen(l)[0]?.ordnungszahl).toBe('1.1.1.1.1.1.1.0010');
    expect(codes(l).filter((c) => c === 'gliederung-ebene-entfallen')).toHaveLength(2);
    expect(codes(l)).toContain('gliederung-zu-tief');
    pruefeKernInvarianten(l);
  });

  it('Gliederung ohne BoQBkdn und sechs Ebenen tief: höchstens 5 Titel', () => {
    let baum = `<Itemlist>${position('p', '0010')}</Itemlist>`;
    for (const nr of ['6', '5', '4', '3', '2', '1']) baum = kategorie(`k${nr}`, '1', baum);
    const l = lies(lv('', baum));
    expect(zaehle(l, 'titel')).toBe(5);
    expect(positionen(l)).toHaveLength(1);
    expect(codes(l)).toContain('gliederung-ebene-entfallen');
    pruefeKernInvarianten(l);
  });

  it('Los mit 5 Stufen insgesamt (Los plus 4 Titel) bleibt unverändert', () => {
    let baum = `<Itemlist>${position('p', '0010')}</Itemlist>`;
    for (const nr of ['5', '4', '3', '2', '1']) baum = kategorie(`k${nr}`, '1', baum);
    const l = lies(lv(stufe('Lot') + stufe('BoQLevel').repeat(4), baum));
    expect(zaehle(l, 'los')).toBe(1);
    expect(zaehle(l, 'titel')).toBe(4);
    expect(codes(l)).not.toContain('gliederung-ebene-entfallen');
    pruefeKernInvarianten(l);
  });

  it('doppelte OZ und fehlende Mengen bleiben Befunde, nie ein Grund zum Verwerfen', () => {
    const l = lies(
      lv(
        '',
        `<Itemlist>${position('a', '0010')}${position('b', '0010')}<Item ID="c" RNoPart="0020"/></Itemlist>`,
      ),
    );
    expect(positionen(l)).toHaveLength(3);
    expect(codes(l)).toEqual(expect.arrayContaining(['doppelte-ordnungszahl', 'menge-fehlt']));
    pruefeKernInvarianten(l);
  });

  it('amtliche Dateien und Fehlerdateien erfüllen die Kern-Invarianten', () => {
    const fehler = readdirSync(join(WURZEL, 'packages/gaeb/testdaten/fehler')).map((n) =>
      join('packages/gaeb/testdaten/fehler', n),
    );
    for (const pfad of [BAU_X83, TEXT_X81, ...fehler]) {
      const l = lies(lesePfad(pfad), pfad.split('/').at(-1));
      if (l.inhalt !== null) pruefeKernInvarianten(l);
    }
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

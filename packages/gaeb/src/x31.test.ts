// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests der Mengenermittlung X31 (Ticket 83, M3; D-33). Zuerst geschrieben (Q1). Seams: `x31Lesen` und `aufmassAlsX31`.
//
// Die erwarteten Ansatzzeilen der BVBS-Prüfdatei sind von Hand aus den Zeilen der Datei abgeschrieben (Spalten 32–69,
// Zeilen ohne `=` am Ende setzen sich in der nächsten fort), nicht aus dem Leser erzeugt.

import { describe, expect, it } from 'vitest';
import type { Ansatzzeile, Aufmass, AufmassId, Menge, PositionId, ProjektId } from '@tethys/vertrag';
import { aufmassAlsX31, x31Lesen } from './index';
import type { X31Aufmass } from './index';
import { BVBS_MENGENERMITTLUNG, TEST_ERSTELLT, auftragsLvAus, lesePfad, positionId } from './testhilfen';

const BVBS = BVBS_MENGENERMITTLUNG;
const BVBS_LV = auftragsLvAus(lesePfad(`${BVBS}.x86`));

// --- Kleine Dateien gegen dasselbe Auftrags-LV ------------------------------------------------------------------

interface Rechenzeile {
  readonly kennung?: string;
  readonly text?: string;
  readonly vorzeichenFaktor?: string;
  readonly formel?: string;
  readonly inhalt: string;
  readonly nummer: string;
}

/** Eine Zeile im Spaltenformat: 1–12 leer, 13 Kennung, 14–22 Text, 23–29 Vorzeichen/Faktor, 30–31 Formel, 32–69, 70–75. */
const rechen = (z: Rechenzeile): string =>
  ' '.repeat(12) +
  (z.kennung ?? ' ') +
  (z.text ?? '').padEnd(9) +
  (z.vorzeichenFaktor ?? '').padStart(7) +
  (z.formel ?? '91') +
  z.inhalt.padEnd(38) +
  z.nummer +
  ' '.repeat(5);
const text = (t: string, nummer: string): string =>
  ' '.repeat(12) + '*' + t.padEnd(56) + nummer + ' '.repeat(5);

interface Eintrag {
  readonly oz: string;
  readonly index?: string;
  readonly zeilen?: readonly string[];
  readonly qty?: string;
}

/** Eine X31 mit der Maske der Prüfdatei; alle Items stehen unter 001.001 (die OZ des Eintrags ist nur der letzte Teil). */
function x31(eintraege: readonly Eintrag[], version = '3.3'): string {
  const items = eintraege
    .map((e, i) => {
      const qd =
        (e.qty === undefined ? '' : `<Qty>${e.qty}</Qty>`) +
        (e.zeilen ?? []).map((r) => `<QDetermItem><QTakeoff Row="${r}"/></QDetermItem>`).join('');
      return `<Item ID="I${String(i)}" RNoPart="${e.oz}"${e.index === undefined ? '' : ` RNoIndex="${e.index}"`}><QtyDeterm>${qd}</QtyDeterm></Item>`;
    })
    .join('');
  const stufe = (typ: string, n: number, num: string) =>
    `<BoQBkdn><Type>${typ}</Type><Length>${String(n)}</Length><Num>${num}</Num></BoQBkdn>`;
  return (
    `<?xml version="1.0" encoding="UTF-8"?><GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA31/${version}">` +
    `<GAEBInfo><Version>${version}</Version><VersDate>2021-05</VersDate><Date>2026-11-11</Date></GAEBInfo>` +
    '<QtyDeterm><QtyDetermInfo><MethodDescription>REB23003-2009</MethodDescription></QtyDetermInfo><DP>31</DP>' +
    `<BoQ ID="B1">${stufe('BoQLevel', 3, 'Yes')}${stufe('BoQLevel', 3, 'Yes')}${stufe('Item', 4, 'Yes')}` +
    `${stufe('Index', 1, 'No')}<BoQBody><BoQCtgy ID="C1" RNoPart="001"><BoQBody><BoQCtgy ID="C2" RNoPart="001">` +
    `<BoQBody><Itemlist>${items}</Itemlist></BoQBody></BoQCtgy></BoQBody></BoQCtgy></BoQBody></BoQ></QtyDeterm></GAEB>`
  );
}

describe('X31 lesen: einzelne Regeln', () => {
  const lies = (eintraege: readonly Eintrag[], version?: string) =>
    x31Lesen(x31(eintraege, version), BVBS_LV);
  const P10 = positionId(BVBS_LV, '001.001.0010');
  const codes = (l: ReturnType<typeof lies>) => l.befunde.map((b) => b.code);

  it('ein Verweis auf eine frühere Zeile derselben Position wird zum Bezug Z<n>', () => {
    const l = lies([
      {
        oz: '0010',
        zeilen: [
          rechen({ inhalt: '2,5=', nummer: '0001B0' }),
          rechen({ inhalt: '(0001B0 + 1) * 2=', nummer: '0001C0' }),
        ],
      },
    ]);
    expect(l.aufmass?.positionen).toEqual([
      {
        positionId: P10,
        mengenansatz: [
          { zeile: 1, formel: 91, ausdruck: '2,5', variable: null },
          { zeile: 2, formel: 91, ausdruck: '(Z1 + 1) * 2', variable: null },
        ],
        menge: null,
      },
    ]);
    expect(l.befunde).toEqual([]);
  });

  it('ein Verweis auf eine Zeile in der Textform oder auf eine unbekannte Zeile macht auch diese Zeile zur Textform', () => {
    const l = lies([
      {
        oz: '0010',
        zeilen: [
          rechen({ kennung: 'H', inhalt: '3=', nummer: '0001B0' }),
          rechen({ inhalt: '0001B0 + 1=', nummer: '0001C0' }),
          rechen({ inhalt: '0009Z9 + 1=', nummer: '0001D0' }),
        ],
      },
    ]);
    expect(l.aufmass?.positionen[0]?.mengenansatz?.map((z) => z.ausdruck)).toEqual([
      '*H                913=',
      '*                 910001B0 + 1=',
      '*                 910009Z9 + 1=',
    ]);
    expect(codes(l)).toEqual(['zeile-nicht-abbildbar']);
  });

  it('Buchstaben, Vorzeichen oder Faktor in einer Zeile der Formel 91: Textform', () => {
    const l = lies([
      {
        oz: '0010',
        zeilen: [
          rechen({ inhalt: 'a * 2=', nummer: '0001B0' }),
          rechen({ vorzeichenFaktor: '-  2000', inhalt: '1,5=', nummer: '0001C0' }),
        ],
      },
    ]);
    expect(l.aufmass?.positionen[0]?.mengenansatz?.map((z) => z.ausdruck.startsWith('*'))).toEqual([
      true,
      true,
    ]);
    expect(l.befunde[0]?.meldung).toContain('Buchstaben im Ausdruck');
    expect(l.befunde[0]?.meldung).toContain('Vorzeichen oder Faktor');
  });

  it('ein Ausdruck ohne „=“ endet an der nächsten Zeile, die nicht Formel 91 ist, mit Warnung', () => {
    const l = lies([
      {
        oz: '0010',
        zeilen: [rechen({ inhalt: '1 +', nummer: '0001B0' }), rechen({ inhalt: '2', nummer: '0001C0' })],
      },
      { oz: '0010', index: '1', zeilen: [rechen({ inhalt: '4', nummer: '0002B0' }), text('Ende', '0002C0')] },
    ]);
    expect(l.aufmass?.positionen.map((p) => p.mengenansatz?.map((z) => z.ausdruck))).toEqual([
      ['1 +2'],
      ['4'],
    ]);
    expect(codes(l)).toEqual([
      'formel-ohne-abschluss',
      'formel-ohne-abschluss',
      'bemerkung-nicht-abgebildet',
    ]);
  });

  it('mehrere Items zur selben OZ ergeben eine Aufmaßposition mit fortlaufenden Zeilen (D-42)', () => {
    const l = lies([
      { oz: '0010', zeilen: [rechen({ inhalt: '1=', nummer: '0001B0' })] },
      { oz: '0010', index: '1', zeilen: [rechen({ inhalt: '5=', nummer: '0001C0' })] },
      { oz: '0010', zeilen: [rechen({ inhalt: '0001B0 + 2=', nummer: '0001D0' })] },
    ]);
    expect(
      l.aufmass?.positionen.map((p) => [p.positionId, p.mengenansatz?.map((z) => [z.zeile, z.ausdruck])]),
    ).toEqual([
      [
        P10,
        [
          [1, '1'],
          [2, 'Z1 + 2'],
        ],
      ],
      [positionId(BVBS_LV, '001.001.00101'), [[1, '5']]],
    ]);
  });

  it('eine Menge (Qty) ohne Zeilen ist eine Menge von Hand; neben Zeilen wird sie nicht übernommen', () => {
    const l = lies([
      { oz: '0010', qty: '12.500' },
      { oz: '0010', index: '1', qty: '3.000', zeilen: [rechen({ inhalt: '3=', nummer: '0001B0' })] },
      { oz: '0010', index: 'A' },
    ]);
    expect(l.aufmass?.positionen).toEqual([
      { positionId: P10, mengenansatz: null, menge: '12.500' },
      {
        positionId: positionId(BVBS_LV, '001.001.00101'),
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '3', variable: null }],
        menge: null,
      },
    ]);
    expect(codes(l)).toEqual(['menge-nicht-uebernommen']);
  });

  it('zwei Mengen ohne Zeilen zu einer Position: Fehler, keine Aufmaßposition', () => {
    const l = lies([
      { oz: '0010', qty: '1.000' },
      { oz: '0010', qty: '2.000' },
    ]);
    expect(l.aufmass?.positionen).toEqual([]);
    expect(codes(l)).toEqual(['menge-mehrfach']);
  });

  it('eine OZ, die es im Auftrags-LV nicht gibt: Fehler position-unbekannt, die Zeilen entfallen', () => {
    const l = lies([{ oz: '0990', zeilen: [rechen({ inhalt: '1=', nummer: '0001B0' })] }]);
    expect(l.aufmass?.positionen).toEqual([]);
    expect(l.befunde.map((b) => [b.schwere, b.code])).toEqual([['fehler', 'position-unbekannt']]);
  });

  it('eine Zeile mit weniger als 80 Zeichen wird nach den Spalten gelesen, mit Warnung', () => {
    const l = lies([{ oz: '0010', zeilen: [rechen({ inhalt: '7=', nummer: '0001B0' }).trimEnd()] }]);
    expect(l.aufmass?.positionen[0]?.mengenansatz?.[0]?.ausdruck).toBe('7');
    expect(codes(l)).toEqual(['zeile-laenge']);
  });

  it('liest 3.2 wie 3.3', () => {
    const l = lies([{ oz: '0010', zeilen: [rechen({ inhalt: '7=', nummer: '0001B0' })] }], '3.2');
    expect(l.version).toBe('3.2');
    expect(l.aufmass?.positionen[0]?.mengenansatz?.[0]?.ausdruck).toBe('7');
  });

  it('eine andere Phase liefert kein Aufmaßblatt (phase-nicht-unterstuetzt)', () => {
    const l = x31Lesen(lesePfad(`${BVBS}.x86`), BVBS_LV);
    expect(l.aufmass).toBeNull();
    expect(codes(l)).toContain('phase-nicht-unterstuetzt');
  });
});

describe('X31 lesen: BVBS-Prüfdatei Mengenermittlung 3.3', () => {
  const l = x31Lesen(lesePfad(`${BVBS}.x31`), BVBS_LV);

  it('erkennt Phase und Version und liefert ein Aufmaßblatt', () => {
    expect(l.phase).toBe('X31');
    expect(l.version).toBe('3.3');
    expect(l.aufmass).not.toBeNull();
  });

  const zeilenVon = (oz: string) =>
    l.aufmass?.positionen.find((p) => p.positionId === positionId(BVBS_LV, oz))?.mengenansatz;
  const befundeVon = (oz: string) =>
    l.befunde.filter((b) => b.ort.knotenId === positionId(BVBS_LV, oz)).map((b) => [b.schwere, b.code]);

  it('ordnet jedes Item mit Zeilen einer Position zu; leere Items ergeben keine Aufmaßposition', () => {
    expect(l.befunde.filter((b) => b.code === 'position-unbekannt')).toEqual([]);
    // Die Items mit Zeilen in Dateireihenfolge (aus der Datei abgelesen).
    expect(l.aufmass?.positionen.map((p) => p.positionId)).toEqual(
      [
        '001.001.0010',
        '001.001.00101',
        '001.002.0010',
        '001.002.0020',
        '001.002.0030',
        '001.002.0040',
        '001.002.0050',
        '001.003.0010',
        '001.003.0020',
        '002.001.0010',
        '002.001.0020',
        '999.999.9999',
        '999.999.9999y',
        '999.999.9999z',
      ].map((oz) => positionId(BVBS_LV, oz)),
    );
    expect(l.aufmass?.positionen.every((p) => p.menge === null)).toBe(true);
    expect(l.aufmass?.bezeichnung).toBe('');
    expect(l.aufmass?.datum).toBeNull();
  });

  it('Formel 91 einzeilig, Textzeilen und Texte der Rechenzeilen als Befund', () => {
    expect(zeilenVon('001.001.0010')).toEqual([{ zeile: 1, formel: 91, ausdruck: '0,25', variable: null }]);
    expect(zeilenVon('001.003.0010')).toEqual([
      { zeile: 1, formel: 91, ausdruck: '670,540', variable: null },
      { zeile: 2, formel: 91, ausdruck: '983,33', variable: null },
    ]);
    expect(zeilenVon('999.999.9999')?.map((z) => z.ausdruck)).toEqual(['8', '7', '9']);
    expect(befundeVon('001.001.0010')).toEqual([['warnung', 'bemerkung-nicht-abgebildet']]);
    const texte = l.befunde.find(
      (b) =>
        b.code === 'bemerkung-nicht-abgebildet' && b.ort.knotenId === positionId(BVBS_LV, '999.999.9999'),
    );
    expect(texte?.meldung).toContain('„12.12.20“, „14.12.20“, „15.12.20“');
  });

  it('andere Formeln stehen in der Textform (Spalten 13–69 hinter „*“) mit Befund formel-nicht-unterstuetzt', () => {
    expect(zeilenVon('001.002.0010')).toEqual([
      { zeile: 1, formel: 5, ausdruck: '* Achse 1         05    12330  18550   4650   5120', variable: null },
      { zeile: 2, formel: 5, ausdruck: '* Achse 2     200005     6450   7340   4550   4760', variable: null },
    ]);
    expect(befundeVon('001.002.0010')).toEqual([['fehler', 'formel-nicht-unterstuetzt']]);
  });

  it('Formel 91 mit Kennung H oder mit Verweis in eine andere Position steht in der Textform (zeile-nicht-abbildbar)', () => {
    expect(zeilenVon('001.002.0020')?.slice(0, 3)).toEqual([
      {
        zeile: 1,
        formel: 91,
        ausdruck: '*                 91(4,55 + 4,65 + 4,48 + 4,52 + 4,51 +',
        variable: null,
      },
      {
        zeile: 2,
        formel: 91,
        ausdruck: '*                 914,49 + 4,41 + 4,48 + 4,62 + 4,60 +',
        variable: null,
      },
      { zeile: 3, formel: 91, ausdruck: '*H                914,53 + 4,51) / 12=', variable: null },
    ]);
    expect(befundeVon('001.002.0020')).toEqual([
      ['fehler', 'formel-nicht-unterstuetzt'],
      ['fehler', 'zeile-nicht-abbildbar'],
      ['warnung', 'bemerkung-nicht-abgebildet'],
    ]);
    // 001.002.0040 übernimmt die Zwischensumme 0004K0 aus 001.002.0030: kein Bezug innerhalb der Position.
    expect(zeilenVon('001.002.0040')).toEqual([
      { zeile: 1, formel: 91, ausdruck: '*                 910004K0=', variable: null },
    ]);
    expect(befundeVon('001.002.0040')).toEqual([
      ['fehler', 'zeile-nicht-abbildbar'],
      ['warnung', 'bemerkung-nicht-abgebildet'],
    ]);
  });

  it('Golden: mehrzeilige Formel 91 wird je Rechenansatz eine Ansatzzeile (002.001.0020)', () => {
    const z = l.aufmass?.positionen.find((p) => p.positionId === positionId(BVBS_LV, '002.001.0020'));
    expect(z).toEqual({
      positionId: positionId(BVBS_LV, '002.001.0020'),
      mengenansatz: [
        { zeile: 1, formel: 91, ausdruck: '(4,55 + 5,12 + 5,12) * 2', variable: null },
        {
          zeile: 2,
          formel: 91,
          ausdruck: '((5,50 + 7,50 + 1,22 * (2,3*1,23)))+(5,12 +5,33 + 9,21)',
          variable: null,
        },
      ],
      menge: null,
    });
  });
});

// --- X31 schreiben ------------------------------------------------------------------------------------------------

const OPT = { erstellt: TEST_ERSTELLT, programm: 'Tethys AVA (Test)' } as const;
const z91 = (zeile: number, ausdruck: string, variable: string | null = null): Ansatzzeile => ({
  zeile,
  formel: 91,
  ausdruck,
  variable,
});

/** Ein eigenes Aufmaßblatt zum Auftrags-LV der Prüfdatei. */
function blatt(positionen: Aufmass['positionen'], kopf: Partial<Aufmass> = {}): Aufmass {
  return {
    id: 'aufmass-1' as AufmassId,
    projektId: 'projekt-1' as ProjektId,
    auftragsLvId: BVBS_LV.auftragsLeistungsverzeichnis.id,
    nummer: 1,
    bezeichnung: '',
    datum: null,
    positionen,
    ...kopf,
  };
}

/** Was ein Rundweg zurückbringen kann: neben einem Ansatz rechnet die App die Menge (D-22), die Datei trägt keine. */
const ohneMengeNebenAnsatz = (a: X31Aufmass): X31Aufmass => ({
  ...a,
  positionen: a.positionen.map((p) => (p.mengenansatz === null ? p : { ...p, menge: null })),
});

describe('X31 schreiben', () => {
  const P10 = positionId(BVBS_LV, '001.001.0010');
  const P3_10 = positionId(BVBS_LV, '001.003.0010');
  const P2_20 = positionId(BVBS_LV, '002.001.0020');
  const lang = '(12,345 + 23,456 + 34,567 + 45,678) * (1,5 + 2,25) - 7,125 / 3';

  it('Rundweg eigenes Aufmaß → X31 → Aufmaß: gleich (Q3)', () => {
    const eigen = blatt([
      { positionId: P10, mengenansatz: [z91(1, '2,5'), z91(2, 'Z1 * 2')], menge: '7.500' as Menge },
      { positionId: P3_10, mengenansatz: null, menge: '12.500' as Menge },
      { positionId: P2_20, mengenansatz: [z91(1, lang), z91(2, ' Z1 + 1 ')], menge: null },
    ]);
    const e = aufmassAlsX31(eigen, BVBS_LV, '3.3', OPT);
    expect(e.phase).toBe('X31');
    expect(e.entwurf).toBe(false);
    expect(e.befunde).toEqual([]);
    const l = x31Lesen(e.xml, BVBS_LV);
    expect(l.befunde).toEqual([]);
    const inhalt: X31Aufmass = {
      bezeichnung: eigen.bezeichnung,
      datum: eigen.datum,
      positionen: eigen.positionen,
    };
    expect(l.aufmass).toEqual(ohneMengeNebenAnsatz(inhalt));
    // Der zweite Export des gelesenen Blatts ist byte-gleich.
    expect(aufmassAlsX31({ ...eigen, ...l.aufmass }, BVBS_LV, '3.3', OPT).xml).toBe(e.xml);
  });

  it('Zeilen im Spaltenformat: 80 Zeichen, Formel 91 in 30–31, Ausdruck ab 32 mit „=“, Zeilennummern fortlaufend', () => {
    const e = aufmassAlsX31(
      blatt([{ positionId: P10, mengenansatz: [z91(1, '2,5'), z91(2, 'Z1 * 2')], menge: null }]),
      BVBS_LV,
      '3.3',
      OPT,
    );
    const zeilen = [...e.xml.matchAll(/Row="([^"]*)"/g)].map((m) => m[1]);
    expect(zeilen).toEqual([
      `${' '.repeat(29)}912,5=${' '.repeat(34)}0001B0     `,
      `${' '.repeat(29)}910001B0 * 2=${' '.repeat(27)}0001C0     `,
    ]);
    expect(e.xml).toContain('<MethodDescription>REB23003-2009</MethodDescription>');
    expect(e.xml).toContain('xmlns="http://www.gaeb.de/GAEB_DA_XML/DA31/3.3"');
  });

  it('ein langer Ausdruck geht über mehrere Zeilen, geteilt vor einem Leerzeichen', () => {
    const e = aufmassAlsX31(
      blatt([{ positionId: P2_20, mengenansatz: [z91(1, lang)], menge: null }]),
      BVBS_LV,
      '3.3',
      OPT,
    );
    const inhalte = [...e.xml.matchAll(/Row="([^"]*)"/g)].map((m) => (m[1] ?? '').slice(29, 69));
    expect(inhalte).toEqual([
      '91(12,345 + 23,456 + 34,567 + 45,678) *'.padEnd(40),
      '91 (1,5 + 2,25) - 7,125 / 3='.padEnd(40),
    ]);
  });

  it('Variablennamen werden zu Verweisen auf die Zeilennummer; der Name selbst entfällt mit Warnung', () => {
    const eigen = blatt([
      { positionId: P10, mengenansatz: [z91(1, '2,5', 'breite'), z91(2, 'breite * 3')], menge: null },
    ]);
    const e = aufmassAlsX31(eigen, BVBS_LV, '3.3', OPT);
    expect(e.befunde.map((b) => [b.schwere, b.code])).toEqual([['warnung', 'export-verworfen']]);
    expect(x31Lesen(e.xml, BVBS_LV).aufmass?.positionen[0]?.mengenansatz).toEqual([
      z91(1, '2,5'),
      z91(2, 'Z1 * 3'),
    ]);
  });

  it('eine Position mit einer Zeile, die X31 nicht abbildet, entfällt ganz, mit Warnung (keine Teilmenge)', () => {
    const faelle: Ansatzzeile[][] = [
      [z91(1, '1'), { zeile: 2, formel: 5, ausdruck: '2,5', variable: null }],
      [z91(1, '1'), z91(2, '*                 913=')],
      [z91(1, 'Z2 + 1'), z91(2, '1')],
      [z91(1, 'hoehe * 2')],
      [z91(1, '1 = 1')],
    ];
    for (const mengenansatz of faelle) {
      const e = aufmassAlsX31(blatt([{ positionId: P10, mengenansatz, menge: null }]), BVBS_LV, '3.3', OPT);
      expect(e.xml, JSON.stringify(mengenansatz)).not.toContain('QTakeoff');
      expect(e.befunde.map((b) => [b.schwere, b.code])).toEqual([['warnung', 'export-verworfen']]);
      expect(e.entwurf).toBe(false);
    }
  });

  it('Bezeichnung und Datum des Blatts hat X31 nicht: Warnung; eine Zeile ohne Menge und Ansatz entfällt', () => {
    const e = aufmassAlsX31(
      blatt([{ positionId: P10, mengenansatz: null, menge: null }], {
        bezeichnung: 'Erdarbeiten',
        datum: '2026-11-11',
      }),
      BVBS_LV,
      '3.3',
      OPT,
    );
    expect(e.befunde.map((b) => b.meldung.split(':')[0])).toEqual([
      'Bezeichnung des Aufmaßblatts',
      'Datum des Aufmaßblatts',
      'Aufmaßzeile ohne Menge und ohne Mengenansatz',
    ]);
  });

  it('eine Position, die es im Auftrags-LV nicht gibt: Fehler, Entwurf', () => {
    const fremd = 'fremd' as PositionId;
    const e = aufmassAlsX31(
      blatt([{ positionId: fremd, mengenansatz: null, menge: '1.000' as Menge }]),
      BVBS_LV,
      '3.3',
      OPT,
    );
    expect(e.befunde.map((b) => [b.schwere, b.code])).toEqual([['fehler', 'position-unbekannt']]);
    expect(e.entwurf).toBe(true);
  });

  it('3.2: Namensraum und Versionsdatum der Version, gelesen gleich', () => {
    const eigen = blatt([{ positionId: P10, mengenansatz: [z91(1, '4')], menge: null }]);
    const e = aufmassAlsX31(eigen, BVBS_LV, '3.2', OPT);
    expect(e.version).toBe('3.2');
    expect(e.xml).toContain('xmlns="http://www.gaeb.de/GAEB_DA_XML/DA31/3.2"');
    expect(e.xml).toContain('<VersDate>2013-10</VersDate>');
    expect(x31Lesen(e.xml, BVBS_LV).aufmass?.positionen).toEqual(eigen.positionen);
  });

  it('Rundweg BVBS-X31 → Aufmaß → X31 → Aufmaß: gleich, soweit Formel 91 (Positionen mit Textform entfallen)', () => {
    const erst = x31Lesen(lesePfad(`${BVBS}.x31`), BVBS_LV).aufmass;
    if (erst === null) throw new Error('kein Aufmaß');
    const e = aufmassAlsX31(blatt(erst.positionen), BVBS_LV, '3.3', OPT);
    const zweit = x31Lesen(e.xml, BVBS_LV);
    expect(zweit.befunde).toEqual([]);
    const nurFormel91 = erst.positionen.filter((p) =>
      (p.mengenansatz ?? []).every((z) => z.formel === 91 && !z.ausdruck.startsWith('*')),
    );
    // Aus der Datei: genau diese sieben Positionen haben nur Formel 91 ohne Kennung, Faktor oder fremden Verweis.
    expect(nurFormel91.map((p) => p.positionId)).toEqual(
      [
        '001.001.0010',
        '001.001.00101',
        '001.003.0010',
        '002.001.0020',
        '999.999.9999',
        '999.999.9999y',
        '999.999.9999z',
      ].map((oz) => positionId(BVBS_LV, oz)),
    );
    expect(zweit.aufmass?.positionen).toEqual(nurFormel91);
    const verworfen = e.befunde.filter((b) => b.code === 'export-verworfen');
    expect(verworfen).toHaveLength(1);
    expect(verworfen[0]?.meldung).toContain('(7 Vorkommen)');
  });
});

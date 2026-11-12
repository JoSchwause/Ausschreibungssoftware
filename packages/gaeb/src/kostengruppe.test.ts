// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppe als Katalogzuordnung und neue Felder v1.4 beim Export (Ticket 84). Seams: `leseGaeb`, `schreibeGaeb`.
// Den Rundweg mit Kostengruppen an `typisch` prüft `roundtrip.test.ts`.

import { describe, expect, it } from 'vitest';
import type {
  IfcGlobalId,
  Kostengruppennummer,
  LvInhalt,
  Nachtragsangaben,
  OzMaske,
  Position,
  Prozent,
  Pruefbefund,
  AuftragsLeistungsverzeichnisId,
} from '@tethys/vertrag';
import { leseGaeb, schreibeGaeb } from './index';
import type { ExportPhase } from './index';
import { LV, TEST_ERSTELLT, TEST_MWST, lesePfad, position, testIds, titel } from './testhilfen';

const AVA_X81 = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81';
const kg = (s: string) => s as Kostengruppennummer;

const MASKE: OzMaske = {
  gliederung: [{ laenge: 2, zeichen: 'numerisch' }],
  position: { laenge: 4, zeichen: 'numerisch' },
  index: null,
  trennzeichen: '.',
};

function lv(knoten: LvInhalt['knoten']): LvInhalt {
  return {
    name: 'Kleines LV',
    ozMaske: MASKE,
    mwstSatz: '19.00' as Prozent,
    nachlass: null,
    wurzelId: LV,
    knoten: [titel('t1', '01'), ...knoten],
  };
}

const schreibe = (
  inhalt: Parameters<typeof schreibeGaeb>[0],
  phase: ExportPhase = 'X81',
  version: '3.3' | '3.2' = '3.3',
) => schreibeGaeb(inhalt, { phase, version, erstellt: TEST_ERSTELLT, programm: 'Test' });
const lies = (xml: string) => leseGaeb(xml, { ids: testIds(), standardMwstSatz: TEST_MWST });
const positionen = (inhalt: LvInhalt | null): Position[] =>
  (inhalt?.knoten ?? []).filter((k): k is Position => k.art === 'position');
const ohneLeerraum = (s: string) => s.replace(/>\s+</g, '><');
/** Ohne die Hinweise zum MwSt-Satz, die jede X81 trägt (Ersatzwert beim Lesen, verworfen beim Schreiben). */
const ohneMwst = (befunde: readonly Pruefbefund[]) =>
  befunde.filter((b) => b.code !== 'mwst-ersatzwert' && !b.meldung.startsWith('MwSt-Satz des LV'));

describe('Kostengruppe lesen (Ticket 84)', () => {
  it('BVBS-AVA: die Zuordnungen zum Katalog DIN 276-06 werden zur Kostengruppe der Position', () => {
    const l = leseGaeb(lesePfad(AVA_X81), { ids: testIds(), standardMwstSatz: TEST_MWST });
    const mitKg = positionen(l.inhalt)
      .filter((p) => p.kostengruppe !== undefined)
      .map((p) => [`${p.ordnungszahl ?? ''}${p.ozIndex ?? ''}`, p.kostengruppe]);
    // Aus der Datei (CtlgID CANKDEDI, CtlgType „cost group DIN 276-06“) an Items; die Aufteilungen in QtySplit nicht.
    expect(mitKg).toEqual([
      ['1.10.25.10', '331'],
      ['1.10.25.20', '332'],
      ['1.10.25.30', '334'],
      ['1.10.30.10', '310'],
      ['1.10.40.10', '310'],
      ['2.1.5.10', '344'],
    ]);
    // Die Zuordnungen zu den übrigen Katalogen bleiben Befund.
    expect(l.befunde.map((b) => b.meldung).filter((m) => m.includes('CtlgAssign'))).toEqual([
      expect.stringContaining('Item/CtlgAssign (work category)'),
      expect.stringContaining('Item/CtlgAssign (locality)'),
      expect.stringContaining('Item/CtlgAssign (cost unit)'),
    ]);
  });

  /** Eine kleine X81 mit einer Position der Kostengruppe 330, deren Katalog und Zuordnung danach verändert werden. */
  const datei = (ersetze: (xml: string) => string): string =>
    ersetze(schreibe(lv([position('p1', '01.0010', 0, { kostengruppe: kg('330') })])).xml);

  it('eine andere Ausgabe der DIN 276 und eine andere Katalogart: Befund, keine Kostengruppe', () => {
    const alt = lies(datei((x) => x.replace('cost group DIN 276 2018-12', 'cost group DIN 276-93')));
    expect(positionen(alt.inhalt)[0]?.kostengruppe).toBeUndefined();
    expect(alt.befunde.map((b) => b.code)).toEqual(
      expect.arrayContaining(['katalog-nicht-abgebildet', 'nicht-abgebildet']),
    );
    const ort = lies(datei((x) => x.replace('cost group DIN 276 2018-12', 'locality')));
    expect(positionen(ort.inhalt)[0]?.kostengruppe).toBeUndefined();
    expect(ort.befunde.filter((b) => b.code === 'nicht-abgebildet').map((b) => b.meldung)).toEqual([
      expect.stringContaining('BoQInfo/Ctlg (locality)'),
      expect.stringContaining('Item/CtlgAssign (locality)'),
    ]);
  });

  it('ein Code, der keine Kostengruppennummer ist, eine Aufteilung und eine zweite Kostengruppe: Befund', () => {
    const ungueltig = lies(datei((x) => x.replace('<CtlgCode>330</CtlgCode>', '<CtlgCode>330.1</CtlgCode>')));
    expect(positionen(ungueltig.inhalt)[0]?.kostengruppe).toBeUndefined();
    expect(ohneMwst(ungueltig.befunde).map((b) => [b.code, b.ort.feld])).toEqual([
      ['kostengruppe-ungueltig', 'kostengruppe'],
    ]);

    const zwei = lies(
      datei((x) =>
        x.replace(
          /<\/CtlgAssign>/,
          '</CtlgAssign><CtlgAssign><CtlgID>DIN276</CtlgID><CtlgCode>340</CtlgCode></CtlgAssign>',
        ),
      ),
    );
    expect(positionen(zwei.inhalt)[0]?.kostengruppe).toBe('330');
    expect(ohneMwst(zwei.befunde).map((b) => b.code)).toEqual(['kostengruppe-mehrfach']);

    const anteil = lies(
      datei((x) =>
        x.replace('<CtlgCode>330</CtlgCode>', '<CtlgCode>330</CtlgCode><Quantity>50.000</Quantity>'),
      ),
    );
    expect(positionen(anteil.inhalt)[0]?.kostengruppe).toBeUndefined();
    expect(ohneMwst(anteil.befunde).map((b) => b.code)).toEqual(['kostengruppe-anteil']);
  });
});

describe('Kostengruppe schreiben (Ticket 84)', () => {
  const inhalt = lv([
    position('p1', '01.0010', 0, { kostengruppe: kg('330') }),
    position('p2', '01.0020', 1),
    position('z', '01.0030', 2, {
      menge: null,
      einheit: null,
      zuschlag: { prozentsatz: null, bezug: { art: 'gliederung' } },
      kostengruppe: kg('390'),
    }),
  ]);

  for (const [version, art] of [
    ['3.3', 'cost group DIN 276 2018-12'],
    ['3.2', 'cost group DIN 276-1 2008-12'],
  ] as const)
    it(`${version}: Katalog am Ende von BoQInfo (${art}), Zuordnung im Item hinter QU, im MarkupItem am Ende`, () => {
      const e = schreibe(inhalt, 'X81', version);
      const xml = ohneLeerraum(e.xml);
      expect(xml).toContain(
        `<Ctlg><CtlgID>DIN276</CtlgID><CtlgType>${art}</CtlgType><CtlgName>DIN 276</CtlgName></Ctlg></BoQInfo>`,
      );
      expect(xml).toContain(
        '<QU>m</QU><CtlgAssign><CtlgID>DIN276</CtlgID><CtlgCode>330</CtlgCode></CtlgAssign>',
      );
      expect(xml).toMatch(
        /<\/Description><CtlgAssign><CtlgID>DIN276<\/CtlgID><CtlgCode>390<\/CtlgCode><\/CtlgAssign><\/MarkupItem>/,
      );
      expect(xml.match(/<CtlgAssign>/g)).toHaveLength(2);
      expect(ohneMwst(e.befunde)).toEqual([]);
      expect(positionen(lies(e.xml).inhalt).map((p) => p.kostengruppe)).toEqual(['330', undefined, '390']);
    });

  it('ohne Kostengruppe kein Katalog', () => {
    expect(schreibe(lv([position('p1', '01.0010', 0)])).xml).not.toContain('<Ctlg>');
  });

  it('eine Kostengruppe, die keine Nummer ist: Fehler, Entwurf', () => {
    const e = schreibe(lv([position('p1', '01.0010', 0, { kostengruppe: kg('33') })]));
    expect(ohneMwst(e.befunde).map((b) => [b.schwere, b.code, b.ort.feld])).toEqual([
      ['fehler', 'wert-ungueltig', 'kostengruppe'],
    ]);
    expect(e.entwurf).toBe(true);
  });
});

/** Leere Summen für einen X86-Export, der nur die Befunde prüft. */
const SUMMEN_NULL = {
  positionen: [],
  gliederungen: [],
  gesamt: { netto: '0.00', nachlass: '0.00', nettoNachNachlass: '0.00', mwst: '0.00', brutto: '0.00' },
} as never;

describe('neue Felder ohne GAEB-Gegenstück: beim Export mit Warnung verworfen (Ticket 84)', () => {
  const NACHTRAG: Nachtragsangaben = {
    auftragsLvId: 'auftrags-lv-1' as AuftragsLeistungsverzeichnisId,
    nummer: 'N01',
    status: 'angemeldet',
  };

  it('Textquelle der Position, Muster-LV und Nachtragsangaben am Kopf', () => {
    const inhalt = {
      ...lv([
        position('p1', '01.0010', 0, { textquelle: 'Muster-LV Rohbau' }),
        position('p2', '01.0020', 1, { textquelle: 'eigener Text' }),
      ]),
      vorlage: true as const,
      nachtrag: NACHTRAG,
    };
    for (const phase of ['X81', 'X83', 'X86'] as const) {
      const e = schreibeGaeb(inhalt, {
        phase,
        version: '3.3',
        erstellt: TEST_ERSTELLT,
        programm: 'Test',
        ...(phase === 'X86'
          ? {
              summen: {
                positionen: [],
                gliederungen: [],
                gesamt: {
                  netto: '0.00',
                  nachlass: '0.00',
                  nettoNachNachlass: '0.00',
                  mwst: '0.00',
                  brutto: '0.00',
                },
              } as never,
            }
          : {}),
      });
      const verworfen = e.befunde.filter((b) => b.code === 'export-verworfen').map((b) => b.meldung);
      expect(verworfen, phase).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^Textquelle der Position: .*\(2 Vorkommen\)/),
          expect.stringMatching(/^Kennzeichen Muster-LV: /),
          expect.stringMatching(/^Nachtragsangaben des LV: /),
        ]),
      );
      expect(e.xml).not.toContain('Muster-LV Rohbau');
      expect(e.xml).not.toContain('N01');
    }
  });

  it('Bauteilzuordnungen der Position (v1.6): mit Warnung verworfen, auch an einer Zuschlagsposition (D-66 SOLL 12, Ticket 122)', () => {
    const wand = { globalId: '31nogOTPLaujT$VUogaKgY' as IfcGlobalId, mengenart: 'NetSideArea' };
    const inhalt = lv([
      position('p1', '01.0010', 0, { bauteile: [wand, { ...wand, mengenart: 'Stueck' }] }),
      position('p2', '01.0020', 1, { bauteile: [] }),
      position('z', '01.0030', 2, {
        menge: null,
        einheit: null,
        zuschlag: { prozentsatz: '10.00' as Prozent, bezug: { art: 'gliederung' } },
        bauteile: [wand],
      }),
    ]);
    for (const phase of ['X81', 'X83', 'X86'] as const) {
      const e = schreibeGaeb(inhalt, {
        phase,
        version: '3.3',
        erstellt: TEST_ERSTELLT,
        programm: 'Test',
        ...(phase === 'X86' ? { summen: SUMMEN_NULL } : {}),
      });
      const verworfen = e.befunde.filter((b) => b.code === 'export-verworfen');
      expect(
        verworfen.map((b) => b.meldung),
        phase,
      ).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^Bauteilzuordnungen der Position: .*\(2 Vorkommen\)/),
        ]),
      );
      expect(verworfen.find((b) => b.meldung.startsWith('Bauteilzuordnungen'))?.schwere).toBe('warnung');
      expect(e.xml).not.toContain(wand.globalId);
    }
  });
});

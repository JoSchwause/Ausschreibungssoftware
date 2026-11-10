// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des GAEB-Writers (Ticket 40). Seam: `schreibeGaeb` (und für den Rundweg `leseGaeb`).
//
// Golden-Dateien der Exporte liegen unter `packages/gaeb/testdaten/golden/export/` (selbst erzeugt, AGPL). Für
// `gross` (6 MB je Datei) steht dort nur die SHA-256. Aktualisieren nach einer gewollten Änderung:
//
//   GOLDEN_UPDATE=1 pnpm vitest run packages/gaeb/src/schreiben.test.ts

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  Betrag,
  Einheitspreis,
  ElternId,
  GaebExport,
  Knoten,
  LvInhalt,
  Menge,
  Ordnungszahl,
  Position,
  PositionId,
  Prozent,
  Pruefbefund,
  Summenstand,
  TitelId,
} from '@tethys/vertrag';
import { leseGaeb, schreibeGaeb } from './index';
import type { ExportPhase, SchreibOptionen } from './index';
import {
  FIXTURES,
  LV,
  TEST_ERSTELLT,
  exportOptionen,
  fixtureLv,
  normiereKennungen,
  position,
  reichesLv,
  testIds,
  titel,
} from './testhilfen';

const HIER = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HIER, '..', 'testdaten', 'golden', 'export');
const AKTUALISIEREN = process.env['GOLDEN_UPDATE'] === '1';

const codes = (e: GaebExport): string[] => e.befunde.map((b) => b.code);
const befund = (e: GaebExport, code: string): Pruefbefund | undefined =>
  e.befunde.find((b) => b.code === code);
const verworfen = (e: GaebExport): string[] =>
  e.befunde.filter((b) => b.code === 'export-verworfen').map((b) => b.meldung);

// --- Kleine LVs von Hand ------------------------------------------------------------------------------------------

const MASKE: LvInhalt['ozMaske'] = {
  gliederung: [{ laenge: 2, zeichen: 'numerisch' }],
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};

function lv(knoten: readonly Knoten[], ueber: Partial<LvInhalt> = {}): LvInhalt {
  return {
    name: 'Kleines LV',
    ozMaske: MASKE,
    mwstSatz: '19.00' as Prozent,
    nachlass: null,
    wurzelId: LV,
    knoten: [titel('t1', '01'), ...knoten],
    ...ueber,
  };
}

const SUMMEN_LEER: Summenstand = {
  positionen: [],
  gliederungen: [{ gliederungId: 't1' as TitelId, summe: '0.00' as Betrag }],
  gesamt: {
    netto: '0.00' as Betrag,
    nachlass: '0.00' as Betrag,
    nettoNachNachlass: '0.00' as Betrag,
    mwst: '0.00' as Betrag,
    brutto: '0.00' as Betrag,
  },
};

function schreibe(
  inhalt: LvInhalt,
  phase: ExportPhase = 'X81',
  extra: Partial<SchreibOptionen> = {},
): GaebExport {
  return schreibeGaeb(inhalt, {
    phase,
    version: '3.3',
    erstellt: TEST_ERSTELLT,
    programm: 'Test',
    ...(phase === 'X86' ? { summen: SUMMEN_LEER, auftragnehmer: 'AN' } : {}),
    ...extra,
  });
}

const p1 = (ueber: Partial<Position> = {}): Position => position('p1', '01.0010', 0, ueber);

// --- Grundform -----------------------------------------------------------------------------------------------------

describe('Grundform des Exports', () => {
  it('Namensraum, GAEBInfo mit Datum und Uhrzeit des Aufrufers, DP je Phase', () => {
    for (const [phase, version, versDate] of [
      ['X81', '3.3', '2021-05'],
      ['X83', '3.2', '2013-10'],
      ['X86', '3.3', '2021-05'],
    ] as const) {
      const e = schreibe(lv([p1()]), phase, { version });
      expect(e.xml).toContain(`<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA${phase.slice(1)}/${version}">`);
      expect(e.xml).toContain(`<Version>${version}</Version>`);
      expect(e.xml).toContain(`<VersDate>${versDate}</VersDate>`);
      expect(e.xml).toContain('<Date>2026-11-10</Date>');
      expect(e.xml).toContain('<Time>12:00:00</Time>');
      expect(e.xml).toContain(`<DP>${phase.slice(1)}</DP>`);
      expect([e.phase, e.version]).toEqual([phase, version]);
    }
  });

  it('GAEB-Kennungen werden deterministisch aus den Modellkennungen abgeleitet', () => {
    const e = schreibe(lv([position('0190-abcd', '01.0010', 0)]));
    expect(e.xml).toContain('<Item ID="P0190abcd" RNoPart="0010">');
    expect(e.xml).toContain('<BoQCtgy ID="Gt1" RNoPart="01">');
  });

  it('Zahlen in Punktnotation mit fester Skala, nie de-DE (N4)', () => {
    const e = schreibe(lv([p1({ menge: '1234.500' as Menge })]));
    expect(e.xml).toContain('<Qty>1234.500</Qty>');
  });

  it('X81 und X83 schreiben keine Preise; X86 schreibt UP, IT und Totals aus dem Summenstand', () => {
    const p = p1({ einheitspreis: '10.000' as Einheitspreis });
    const summen: Summenstand = {
      ...SUMMEN_LEER,
      positionen: [{ positionId: 'p1' as PositionId, gesamtpreis: '10.00' as Betrag, gehtInSummeEin: true }],
    };
    for (const phase of ['X81', 'X83'] as const) {
      const e = schreibe(lv([p]), phase, { summen });
      expect(e.xml).not.toMatch(/<UP>|<IT>|<Totals>/);
    }
    const e = schreibe(lv([p]), 'X86', { summen });
    expect(e.xml).toContain('<UP>10.000</UP>');
    expect(e.xml).toContain('<IT>10.00</IT>');
    expect(e.xml).toContain('<Total>0.00</Total>');
  });

  it('3.2 unterscheidet sich von 3.3 nur in Namensraum, Version und VersDate', () => {
    const { inhalt, summen } = fixtureLv('typisch');
    const n = normiereKennungen(inhalt, summen);
    for (const phase of ['X81', 'X83', 'X86'] as const) {
      const a = schreibeGaeb(n.inhalt, exportOptionen(phase, '3.3', n)).xml;
      const b = schreibeGaeb(n.inhalt, exportOptionen(phase, '3.2', n)).xml;
      expect(
        b
          .replace(/\/3\.2"/, '/3.3"')
          .replace('<Version>3.2', '<Version>3.3')
          .replace('2013-10', '2021-05'),
      ).toBe(a);
    }
  });
});

// --- Golden ------------------------------------------------------------------------------------------------------------

describe('Golden-Dateien je Fixture und Phase (deterministisch)', () => {
  const phasen: readonly ExportPhase[] = ['X81', 'X83', 'X86'];
  for (const name of FIXTURES)
    for (const phase of phasen)
      it(`${name} ${phase} 3.3`, () => {
        const { inhalt, summen } = fixtureLv(name);
        const n = normiereKennungen(inhalt, summen);
        const e = schreibeGaeb(n.inhalt, exportOptionen(phase, '3.3', n));
        expect(e.entwurf).toBe(false);
        expect(e.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
        expect(schreibeGaeb(n.inhalt, exportOptionen(phase, '3.3', n)).xml).toBe(e.xml);
        if (name === 'gross') {
          // 6 MB je Datei: nur die Prüfsumme ist Golden.
          const datei = join(GOLDEN, 'gross.sha256.json');
          const schluessel = `${name}-${phase}-3.3`;
          const soll = existsSync(datei)
            ? (JSON.parse(readFileSync(datei, 'utf8')) as Record<string, string>)
            : {};
          const ist = createHash('sha256').update(e.xml).digest('hex');
          if (AKTUALISIEREN || soll[schluessel] === undefined) {
            soll[schluessel] = ist;
            mkdirSync(GOLDEN, { recursive: true });
            writeFileSync(datei, `${JSON.stringify(soll, null, 2)}\n`);
          }
          expect(ist).toBe(soll[schluessel]);
          return;
        }
        const datei = join(GOLDEN, `${name}-${phase}-3.3.${phase.toLowerCase()}`);
        if (AKTUALISIEREN || !existsSync(datei)) {
          mkdirSync(GOLDEN, { recursive: true });
          writeFileSync(datei, e.xml);
        }
        expect(e.xml).toBe(readFileSync(datei, 'utf8'));
      });
});

describe('Leistung', () => {
  it('gross (5.000 Positionen) als X86 unter 1 s', () => {
    const { inhalt, summen } = fixtureLv('gross');
    schreibeGaeb(inhalt, exportOptionen('X86', '3.3', { inhalt, summen })); // Aufwärmen
    const start = performance.now();
    const e = schreibeGaeb(inhalt, exportOptionen('X86', '3.3', { inhalt, summen }));
    const dauer = performance.now() - start;
    console.log(`gross X86: ${dauer.toFixed(0)} ms, ${String(e.xml.length)} Zeichen`);
    expect(dauer).toBeLessThan(1000);
  });
});

// --- Eigene Prüfung ---------------------------------------------------------------------------------------------

describe('Eigene Prüfung (gaeb-pruefung): Fehler machen den Export zum Entwurf', () => {
  it('ohne Fehler: kein Entwurf, kein Kommentar', () => {
    const e = schreibe(lv([p1()]));
    expect(e.entwurf).toBe(false);
    expect(e.xml).not.toContain('<!--');
    expect(e.befunde.every((b) => b.quelle === 'gaeb-pruefung')).toBe(true);
  });

  it('mit Fehler: Entwurf, Kommentar „Entwurf: …“ am Anfang, Export trotzdem vollständig (U5)', () => {
    const e = schreibe(lv([p1({ einheit: 'Stück' })]));
    expect(e.entwurf).toBe(true);
    expect(e.xml.split('\n')[1]).toMatch(
      /^<!-- Entwurf: Die eigene Prüfung fand 1 Fehler, zuerst einheit-ungueltig/,
    );
    expect(e.xml).toContain('<QU>Stück</QU>');
    expect(befund(e, 'einheit-ungueltig')).toMatchObject({
      schwere: 'fehler',
      quelle: 'gaeb-pruefung',
      ort: { knotenId: 'p1', feld: 'einheit' },
    });
  });

  it('OZ: fehlt, passt nicht zur Maske, Index ungültig, doppelt, zu lang', () => {
    expect(codes(schreibe(lv([p1({ ordnungszahl: null })])))).toContain('oz-fehlt');
    expect(codes(schreibe(lv([p1({ ordnungszahl: '01.00100' as Ordnungszahl })])))).toContain(
      'oz-passt-nicht-zur-maske',
    );
    expect(codes(schreibe(lv([p1({ ordnungszahl: '01.00A0' as Ordnungszahl })])))).toContain(
      'oz-passt-nicht-zur-maske',
    );
    expect(codes(schreibe(lv([p1({ ordnungszahl: '02.0010' as Ordnungszahl })])))).toContain(
      'oz-passt-nicht-zur-maske',
    );
    expect(codes(schreibe(lv([p1({ ozIndex: 'AB' })])))).toContain('oz-index-ungueltig');
    expect(codes(schreibe(lv([p1(), position('p2', '01.0010', 1)])))).toContain('oz-doppelt');
    expect(codes(schreibe(lv([p1({ ozIndex: 'A' }), position('p2', '01.0010', 1)])))).not.toContain(
      'oz-doppelt',
    );
    const lang: LvInhalt['ozMaske'] = {
      gliederung: [5, 2].map((laenge) => ({ laenge, zeichen: 'numerisch' as const })),
      position: { laenge: 7, zeichen: 'numerisch' },
      index: { laenge: 1, zeichen: 'alphanumerisch' },
      trennzeichen: '.',
    };
    const e = schreibe({
      ...lv([]),
      ozMaske: lang,
      knoten: [
        titel('t1', '00001'),
        titel('t2', '00001.01', 0, 't1'),
        { ...position('p1', '00001.01.0000010', 0, { ozIndex: 'A' }), elternId: 't2' as ElternId },
      ],
    });
    expect(codes(e)).toEqual(expect.arrayContaining(['oz-zu-lang', 'maske-ungueltig']));
  });

  it('Einheit: höchstens 4 Zeichen und einzeilig; in X83 Pflicht', () => {
    expect(codes(schreibe(lv([p1({ einheit: 'Stück' })])))).toContain('einheit-ungueltig');
    expect(codes(schreibe(lv([p1({ einheit: 'm\n2' })])))).toContain('einheit-ungueltig');
    expect(codes(schreibe(lv([p1({ einheit: 'm²' })])))).not.toContain('einheit-ungueltig');
    expect(codes(schreibe(lv([p1({ einheit: null })]), 'X81'))).not.toContain('einheit-fehlt');
    expect(befund(schreibe(lv([p1({ einheit: null })]), 'X83'), 'einheit-fehlt')?.schwere).toBe('fehler');
  });

  it('X83 ohne Menge: „Menge noch festzulegen“ (QtyTBD) mit Warnung', () => {
    const e = schreibe(lv([p1({ menge: null })]), 'X83');
    expect(e.xml).toContain('<QtyTBD>Yes</QtyTBD>');
    expect(befund(e, 'menge-offen')?.schwere).toBe('warnung');
    expect(e.entwurf).toBe(false);
  });

  it('Stellen: Menge 8, EP 10, Betrag 11, Satz 3 Vorkommastellen', () => {
    const ok = schreibe(lv([p1({ menge: '12345678.000' as Menge })]));
    expect(codes(ok)).not.toContain('zahl-zu-gross');
    const menge = schreibe(lv([p1({ menge: '123456789.000' as Menge })]));
    expect(befund(menge, 'zahl-zu-gross')).toMatchObject({ schwere: 'fehler', ort: { feld: 'menge' } });
    const ep = schreibe(lv([p1({ einheitspreis: '12345678901.000' as Einheitspreis })]), 'X86');
    expect(befund(ep, 'zahl-zu-gross')?.ort.feld).toBe('einheitspreis');
    const betrag = schreibe(lv([p1()]), 'X86', {
      summen: { ...SUMMEN_LEER, gesamt: { ...SUMMEN_LEER.gesamt, netto: '123456789012.00' as Betrag } },
    });
    expect(befund(betrag, 'zahl-zu-gross')?.ort.feld).toBe('summen.netto');
    const satz = schreibe(
      lv([
        p1({
          menge: null,
          einheit: null,
          zuschlag: { prozentsatz: '1000.00' as Prozent, bezug: { art: 'gliederung' } },
        }),
      ]),
      'X86',
      { zuschlagsbasen: new Map([['p1' as PositionId, '10.00' as Betrag]]) },
    );
    expect(befund(satz, 'zahl-zu-gross')?.ort.feld).toBe('zuschlag.prozentsatz');
  });

  it('LV-Name über 20 Zeichen: gekürzt in Name, voll in LblBoQ, Warnung; der Leser nimmt den vollen Namen', () => {
    const name = 'Ein ziemlich langer Name für ein LV';
    const e = schreibe(lv([p1()], { name }));
    expect(e.xml).toContain('<Name>Ein ziemlich langer</Name>');
    expect(e.xml).toContain(`<LblBoQ>${name}</LblBoQ>`);
    expect(befund(e, 'name-gekuerzt')?.schwere).toBe('warnung');
    expect(e.entwurf).toBe(false);
    expect(leseGaeb(e.xml, { ids: testIds() }).inhalt?.name).toBe(name);
    expect(codes(schreibe(lv([p1()], { name: 'Kurz' })))).not.toContain('name-gekuerzt');
  });

  it('Kennungen eindeutig, jeder Verweis zeigt auf ein geschriebenes Element', () => {
    expect(codes(schreibe(lv([position('a-b', '01.0010', 0), position('ab', '01.0020', 1)])))).toContain(
      'kennung-doppelt',
    );
    const zuschlag = (ziel: string): Position =>
      position('z', '01.0090', 1, {
        menge: null,
        einheit: null,
        zuschlag: {
          prozentsatz: null,
          bezug: { art: 'positionen', positionen: [{ positionId: ziel as PositionId, teilmenge: null }] },
        },
      });
    expect(codes(schreibe(lv([p1(), zuschlag('fehlt')])))).toContain('verweis-ohne-ziel');
    expect(codes(schreibe(lv([p1(), zuschlag('p1')])))).not.toContain('verweis-ohne-ziel');
  });

  it('Pflichtelemente je Phase: X86 ohne Summenstand, Zuschlag ohne Satz oder Basis, Bereich ohne Summe', () => {
    const ohne = schreibeGaeb(lv([p1()]), {
      phase: 'X86',
      version: '3.3',
      erstellt: TEST_ERSTELLT,
      programm: 'T',
    });
    expect(befund(ohne, 'pflichtelement-fehlt')?.ort.feld).toBe('summen');
    const z = p1({
      menge: null,
      einheit: null,
      zuschlag: { prozentsatz: null, bezug: { art: 'gliederung' } },
    });
    const e = schreibe(lv([z]), 'X86');
    expect(e.befunde.filter((b) => b.code === 'pflichtelement-fehlt').map((b) => b.ort.feld)).toEqual([
      'zuschlag',
      'zuschlag.prozentsatz',
    ]);
    const bereich = schreibe(lv([p1()]), 'X86', { summen: { ...SUMMEN_LEER, gliederungen: [] } });
    expect(befund(bereich, 'pflichtelement-fehlt')?.ort.knotenId).toBe('t1');
  });

  it('Gliederung: gemischt mit Positionen und tiefer als die Maske sind Fehler', () => {
    expect(codes(schreibe(lv([p1(), titel('t2', '01.01', 1, 't1')])))).toContain('gliederung-gemischt');
    expect(codes(schreibe(lv([titel('t2', '01.01', 0, 't1')])))).toContain('gliederung-zu-tief');
  });

  it('Werte mit GAEB-Form: Kennung einer Textergänzung, Nummer der Unterbeschreibung, Wahlnummern, Kopfdaten', () => {
    const te = schreibe(
      lv([
        p1({
          langtext: [
            {
              art: 'ergaenzung',
              herkunft: 'bieter',
              kennung: 'x1',
              leer: true,
              davor: [],
              inhalt: [],
              danach: [],
            },
          ],
        }),
      ]),
    );
    expect(codes(te)).toContain('ergaenzung-kennung-ungueltig');
    const ub = schreibe(
      lv([
        p1({
          leitbeschreibung: {
            unterbeschreibungen: [{ nummer: '100', kurztext: 'U', langtext: [], menge: null, einheit: null }],
          },
        }),
      ]),
    );
    expect(codes(ub)).toContain('unterbeschreibung-nummer-ungueltig');
    const wahl = schreibe(
      lv([
        p1({ merkmale: { ...p1().merkmale, wahl: { gruppe: 1000, variante: 1, grundpositionId: null } } }),
      ]),
    );
    expect(codes(wahl)).toContain('wahl-nummer-ungueltig');
    const kopf = schreibe(
      lv([p1()], {
        auftraggeber: { name: 'x'.repeat(41), strasse: null, plz: null, ort: null, vergabenummer: null },
        vergabeinformationen: {
          eroeffnungsdatum: '10.11.2026',
          eroeffnungszeit: null,
          abgabeort: null,
          ausfuehrungsbeginn: null,
          ausfuehrungsende: null,
          auftragsnummer: null,
          auftragsdatum: null,
          abnahmeart: null,
          gewaehrleistung: { dauer: 5, einheit: 'Jahre' },
        },
      }),
    );
    expect(kopf.befunde.filter((b) => b.schwere === 'fehler').map((b) => [b.code, b.ort.feld])).toEqual([
      ['wert-ungueltig', 'vergabeinformationen.eroeffnungsdatum'],
      ['wert-ungueltig', 'vergabeinformationen.gewaehrleistung'],
      ['wert-zu-lang', 'auftraggeber.name'],
    ]);
  });

  it('Erstellungsdatum und -zeit des Aufrufers in GAEB-Form', () => {
    const e = schreibe(lv([p1()]), 'X81', { erstellt: { datum: '2026-13-01', zeit: '25:00' } });
    expect(e.befunde.filter((b) => b.code === 'wert-ungueltig').map((b) => b.ort.feld)).toEqual([
      'erstellt.datum',
      'erstellt.zeit',
    ]);
  });
});

// --- Verwerfen mit Warnung (E-11) ------------------------------------------------------------------------------------

describe('Verwerfen mit Warnung: nicht abbildbar in Phase oder Version (export-verworfen)', () => {
  it('Preise, Anteile, Zuschlagssatz, Nachlass und MwSt in X81/X83, je Art einmal je Datei', () => {
    const epa = {
      lohn: '1.000' as Einheitspreis,
      stoffe: null,
      geraete: null,
      nachunternehmer: null,
      sonstiges: null,
      frei: null,
      freiBezeichnung: null,
    };
    const e = schreibe(
      lv(
        [
          p1({ einheitspreis: '2.000' as Einheitspreis, epa }),
          position('p2', '01.0020', 1, { einheitspreis: '3.000' as Einheitspreis }),
          position('z', '01.0030', 2, {
            menge: null,
            einheit: null,
            zuschlag: { prozentsatz: '10.00' as Prozent, bezug: { art: 'gliederung' } },
          }),
        ],
        { nachlass: { art: 'prozent', wert: '2.00' as Prozent } },
      ),
      'X83',
    );
    const v = verworfen(e);
    expect(v).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^Einheitspreise: in X83 3\.3 nicht abbildbar, nicht geschrieben \(2 Vorkommen\)/,
        ),
        expect.stringMatching(/^Einheitspreisanteile:/),
        expect.stringMatching(/^Zuschlagssätze:/),
        expect.stringMatching(/^Nachlass des LV:/),
        expect.stringMatching(/^MwSt-Satz des LV:/),
      ]),
    );
    expect(e.befunde.every((b) => b.code !== 'export-verworfen' || b.schwere === 'warnung')).toBe(true);
    expect(e.entwurf).toBe(false);
  });

  it('Wahlposition ohne Gruppe/Variante: ohne ALNGroupNo/ALNSerNo geschrieben', () => {
    const e = schreibe(
      lv([
        p1({ merkmale: { ...p1().merkmale, wahl: { gruppe: null, variante: null, grundpositionId: null } } }),
      ]),
    );
    expect(e.xml).not.toContain('ALNGroupNo');
    expect(verworfen(e)[0]).toMatch(/^Wahlposition ohne Gruppen- und Variantennummer/);
  });

  it('Altform der Zuschlagsposition: X81/X83 als MarkupItem ohne Menge und EP, X86 als Position ohne Bezug', () => {
    const alt = position('z', '01.0020', 1, {
      einheitspreis: '5.000' as Einheitspreis,
      zuschlag: {
        prozentsatz: null,
        bezug: { art: 'positionen', positionen: [{ positionId: 'p1' as PositionId, teilmenge: null }] },
      },
    });
    const x81 = schreibe(lv([p1(), alt]));
    expect(x81.xml).toMatch(/<MarkupItem ID="Pz" RNoPart="0020">\s*<MarkupType>ListInSubQty<\/MarkupType>/);
    expect(x81.xml.split('<MarkupItem')[1]).not.toMatch(/<Qty>|<QU>/);
    expect(verworfen(x81)[0]).toMatch(/^Menge, Einheit und EP der Altform/);
    const x86 = schreibe(lv([p1(), alt]), 'X86');
    expect(x86.xml).not.toContain('<MarkupItem');
    expect(x86.xml).toMatch(/<Item ID="Pz" RNoPart="0020">/);
    expect(verworfen(x86)[0]).toMatch(/^Altform der Zuschlagsposition/);
  });

  it('Teilmenge einer Bezugsposition: 3.2 trägt sie wie 3.3 (nichts zu verwerfen), der Leser liest sie', () => {
    const z = position('z', '01.0020', 1, {
      menge: null,
      einheit: null,
      zuschlag: {
        prozentsatz: null,
        bezug: {
          art: 'positionen',
          positionen: [{ positionId: 'p1' as PositionId, teilmenge: '0.500' as Menge }],
        },
      },
    });
    const e = schreibe(lv([p1(), z]), 'X81', { version: '3.2' });
    expect(e.xml).toContain('<SubQty>0.500</SubQty>');
    expect(verworfen(e)).toEqual([expect.stringMatching(/^MwSt-Satz/)]);
    const gelesen = leseGaeb(e.xml, { ids: testIds() }).inhalt?.knoten.find(
      (k) => k.art === 'position' && k.zuschlag,
    );
    expect(gelesen?.art === 'position' ? gelesen.zuschlag?.bezug : null).toEqual({
      art: 'positionen',
      positionen: [{ positionId: 'position-0001', teilmenge: '0.500' }],
    });
  });

  it('Eröffnungstermin und Abgabeort in X86 (AwardInfo kennt sie dort nicht)', () => {
    const vi = {
      eroeffnungsdatum: '2026-12-01',
      eroeffnungszeit: '10:00:00',
      abgabeort: 'Rathaus',
      ausfuehrungsbeginn: null,
      ausfuehrungsende: null,
      auftragsnummer: null,
      auftragsdatum: null,
      abnahmeart: null,
      gewaehrleistung: null,
    };
    const e = schreibe(lv([p1()], { vergabeinformationen: vi }), 'X86');
    expect(e.xml).not.toMatch(/OpenDate|SubmLoc/);
    expect(verworfen(e)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Eröffnungstermin/),
        expect.stringMatching(/^Abgabeort/),
      ]),
    );
    expect(schreibe(lv([p1()], { vergabeinformationen: vi }), 'X83').xml).toContain(
      '<OpenDate>2026-12-01</OpenDate>',
    );
  });

  it('Langtext: leere Liste und Tabelle, Bild mit fremdem Medientyp, Tabelle im Listenpunkt (Text bleibt)', () => {
    const e = schreibe(
      lv([
        p1({
          langtext: [
            { art: 'liste', geordnet: false, punkte: [] },
            { art: 'tabelle', zeilen: [] },
            { art: 'bild', bild: { id: 'b1' as never, medientyp: 'image/bmp', daten: 'AAAA' } },
            {
              art: 'liste',
              geordnet: true,
              punkte: [
                [
                  {
                    art: 'tabelle',
                    zeilen: [{ zellen: [{ spalten: 1, inhalt: [{ art: 'text', text: 'Zelle' }] }] }],
                  },
                ],
              ],
            },
          ],
        }),
      ]),
    );
    expect(verworfen(e)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^leere Liste/),
        expect.stringMatching(/^leere Tabelle/),
        expect.stringMatching(/^Bild mit Medientyp image\/bmp/),
        expect.stringMatching(/^Tabelle in einem Listenpunkt/),
      ]),
    );
    expect(e.xml).toContain('<span>Zelle</span>');
  });
});

describe('Rundweg eines LV mit allen abbildbaren Inhalten', () => {
  for (const version of ['3.3', '3.2'] as const)
    it(`X86 ${version}: Export → Import gleich, ohne Fehler und ohne Verwerfen; zweiter Export byte-gleich`, () => {
      const r = reichesLv();
      const n = normiereKennungen(r.inhalt, r.summen, r.basen);
      const opt = exportOptionen('X86', version, n);
      const e = schreibeGaeb(n.inhalt, opt);
      expect(e.befunde.filter((x) => x.code !== 'name-gekuerzt')).toEqual([]);
      const l = leseGaeb(e.xml, { ids: testIds() });
      expect(l.befunde.filter((x) => x.schwere === 'fehler')).toEqual([]);
      expect(l.inhalt).toEqual(n.inhalt);
      expect(schreibeGaeb(l.inhalt ?? n.inhalt, opt).xml).toBe(e.xml);
    });

  it('X81 und X83: gleich bis auf Preise, Sätze und Nachlass', () => {
    const r = reichesLv();
    const n = normiereKennungen(r.inhalt);
    for (const phase of ['X81', 'X83'] as const) {
      const e = schreibeGaeb(n.inhalt, exportOptionen(phase, '3.3', n));
      expect(e.entwurf).toBe(false);
      const l = leseGaeb(e.xml, { ids: testIds(), standardMwstSatz: '7.00' as Prozent });
      const ohnePreise = n.inhalt.knoten.map((k) =>
        k.art !== 'position'
          ? k
          : {
              ...k,
              menge: phase === 'X83' && k.zuschlag === null ? k.menge : k.menge,
              einheitspreis: null,
              epa: null,
              zuschlag: k.zuschlag === null ? null : { ...k.zuschlag, prozentsatz: null },
            },
      );
      expect(l.inhalt).toEqual({ ...n.inhalt, nachlass: null, knoten: ohnePreise });
    }
  });
});

describe('Der Leser nimmt X86 an (amtliche AVA-X86)', () => {
  it('Preise, Anteile, Sätze, Nachlass und MwSt aus der Datei', () => {
    const roh = readFileSync(
      join(HIER, '..', '..', '..', 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X86'),
    );
    const l = leseGaeb(new Uint8Array(roh), { ids: testIds() });
    expect([l.phase, l.version]).toEqual(['X86', '3.3']);
    const ps = (l.inhalt?.knoten ?? []).filter((k): k is Position => k.art === 'position');
    expect(ps.filter((p) => p.einheitspreis !== null).length).toBeGreaterThan(50);
    expect(ps.filter((p) => p.epa !== null).length).toBeGreaterThan(0);
    expect(ps.filter((p) => p.zuschlag?.prozentsatz === '10.00')).toHaveLength(6);
    expect(l.befunde.map((b) => b.code)).not.toContain('phase-nicht-unterstuetzt');
    expect(l.befunde.map((b) => b.code)).not.toContain('mwst-standardsatz');
    expect(l.inhalt?.mwstSatz).toBe('19.00');
    // Positionsnachlass (Item/DiscountPcnt) kennt der Vertrag nicht (G-23): IT weicht dann von Menge × EP ab.
    const abweichend = l.befunde.filter((b) => b.code === 'gesamtpreis-abweichend');
    expect(abweichend.length).toBeGreaterThan(0);
    expect(abweichend[0]?.schwere).toBe('warnung');
  });
});

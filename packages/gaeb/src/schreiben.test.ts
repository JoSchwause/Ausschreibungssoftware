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
import { MAX_GLIEDERUNGSEBENEN, OZ_MAX_LAENGE, PRUEF_GRENZEN } from '@tethys/kern';
import { GRENZEN, leseGaeb, schreibeGaeb } from './index';
import type { ExportPhase, SchreibOptionen } from './index';
import {
  FIXTURES,
  LV,
  TEST_ERSTELLT,
  exportInhalt,
  exportOptionen,
  fixtureLv,
  normiereKennungen,
  ohneAuftragnehmer,
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
/** XML ohne die Einrückung zwischen Elementen, für Vergleiche über mehrere Zeilen. */
const kompakt = (xml: string): string => xml.replace(/>\s+</g, '><');
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
    ...(phase === 'X86' ? { summen: SUMMEN_LEER } : {}),
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
      const a = schreibeGaeb(exportInhalt(phase, n), exportOptionen(phase, '3.3', n)).xml;
      const b = schreibeGaeb(exportInhalt(phase, n), exportOptionen(phase, '3.2', n)).xml;
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
        const { inhalt, summen, basen } = fixtureLv(name);
        const n = normiereKennungen(inhalt, summen, basen);
        const e = schreibeGaeb(exportInhalt(phase, n), exportOptionen(phase, '3.3', n));
        expect(e.entwurf).toBe(false);
        expect(e.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
        expect(schreibeGaeb(exportInhalt(phase, n), exportOptionen(phase, '3.3', n)).xml).toBe(e.xml);
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

// --- Grenzen an einer Stelle (N3, Review S6) ----------------------------------------------------------------------

describe('Grenzen der eigenen Prüfung kommen aus dem Kern (N3, eine Stelle)', () => {
  it('Vorkommastellen, Name, Einheit, OZ-Länge und Stufen sind die des Kerns', () => {
    expect(GRENZEN.vorkomma).toBe(PRUEF_GRENZEN.vorkommastellen);
    expect(GRENZEN.name).toBe(PRUEF_GRENZEN.lvNameZeichen);
    expect(GRENZEN.einheit).toBe(PRUEF_GRENZEN.einheitZeichen);
    expect(GRENZEN.oz).toBe(OZ_MAX_LAENGE);
    expect(GRENZEN.stufen).toBe(MAX_GLIEDERUNGSEBENEN);
  });

  it('der Zuschlagssatz wird mit der Grenze zuschlagssatz geprüft, auch mit Vorzeichen', () => {
    const z = (satz: string): Position =>
      position('z', '01.0020', 1, {
        menge: null,
        einheit: null,
        zuschlag: { prozentsatz: satz as Prozent, bezug: { art: 'gliederung' } },
      });
    const grenze = PRUEF_GRENZEN.vorkommastellen.zuschlagssatz;
    const passt = `-${'9'.repeat(grenze)}.00`;
    const zuGross = `${'9'.repeat(grenze + 1)}.00`;
    const basen = new Map([['z' as PositionId, '0.00' as Betrag]]);
    expect(codes(schreibe(lv([p1(), z(passt)]), 'X86', { zuschlagsbasen: basen }))).not.toContain(
      'zahl-zu-gross',
    );
    expect(
      befund(schreibe(lv([p1(), z(zuGross)]), 'X86', { zuschlagsbasen: basen }), 'zahl-zu-gross'),
    ).toMatchObject({
      ort: { knotenId: 'z', feld: 'zuschlag.prozentsatz' },
    });
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

  it('Wahlposition ohne Gruppe/Variante: künstliche Wahlgruppe oberhalb der höchsten belegten, mit Warnung (D-16)', () => {
    const wahl = (gruppe: number | null, variante: number | null, grund: string | null) => ({
      ...p1().merkmale,
      wahl: { gruppe, variante, grundpositionId: grund as PositionId | null },
    });
    const inhalt = lv([
      position('g1', '01.0010', 0),
      position('w1', '01.0020', 1, { merkmale: wahl(null, null, 'g1') }),
      position('n', '01.0030', 2, { merkmale: wahl(7, 0, null) }),
      position('w2', '01.0040', 3, { merkmale: wahl(null, null, null) }),
      position('w3', '01.0050', 4, { merkmale: wahl(null, null, 'g1') }),
      position('w4', '01.0060', 5, { merkmale: wahl(null, null, null) }),
    ]);
    const e = schreibe(inhalt);
    const nummern = [
      ...e.xml.matchAll(/<Item ID="P(\w+)"[^>]*>\s*<ALNGroupNo>(\d+)<\/ALNGroupNo>\s*<ALNSerNo>(\d+)</g),
    ].map((m) => `${m[1] ?? ''}:${m[2] ?? ''}/${m[3] ?? ''}`);
    // Je Grundposition eine Gruppe, Varianten 1..n in LV-Reihenfolge; Wahl ohne Grundposition je eine eigene Gruppe.
    expect(nummern).toEqual(['w1:8/1', 'n:7/0', 'w2:9/1', 'w3:8/2', 'w4:10/1']);
    expect(e.befunde.filter((b) => b.code === 'wahl-nummer-vergeben').map((b) => [b.schwere, b.ort])).toEqual(
      ['w1', 'w2', 'w3', 'w4'].map((id) => ['warnung', { knotenId: id, feld: 'merkmale.wahl' }]),
    );
    expect(verworfen(e).filter((m) => m.startsWith('Wahl'))).toEqual([]);
    expect(e.entwurf).toBe(false);
    // Wieder gelesen bleiben sie Wahlpositionen: ihr Betrag geht nie still ins Netto (D-37.1).
    const gelesen = leseGaeb(e.xml, { ids: testIds(), standardMwstSatz: '19.00' as Prozent }).inhalt;
    const wahlen = (gelesen?.knoten ?? []).filter(
      (k): k is Position => k.art === 'position' && k.merkmale.wahl !== null,
    );
    expect(wahlen.map((k) => [k.ordnungszahl, k.merkmale.wahl?.gruppe, k.merkmale.wahl?.variante])).toEqual([
      ['01.0020', 8, 1],
      ['01.0030', 7, 0],
      ['01.0040', 9, 1],
      ['01.0050', 8, 2],
      ['01.0060', 10, 1],
    ]);
  });

  it('künstliche Wahlnummern über 9 Varianten oder 999 Gruppen: Fehler wahl-nummer-ungueltig, kein Rückfall auf eine Position ohne Wahl', () => {
    const wahl = (gruppe: number | null, grund: string | null) => ({
      ...p1().merkmale,
      wahl: { gruppe, variante: gruppe === null ? null : 0, grundpositionId: grund as PositionId | null },
    });
    const zehn = Array.from({ length: 10 }, (_, i) =>
      position(`w${String(i)}`, `01.${String(20 + i * 10).padStart(4, '0')}`, i + 1, {
        merkmale: wahl(null, 'g1'),
      }),
    );
    const viele = schreibe(lv([position('g1', '01.0010', 0), ...zehn]));
    expect(befund(viele, 'wahl-nummer-ungueltig')).toMatchObject({
      schwere: 'fehler',
      ort: { knotenId: 'w9' },
    });
    expect(viele.xml).toContain('<ALNSerNo>10</ALNSerNo>');
    expect(viele.entwurf).toBe(true);

    const hoch = schreibe(
      lv([
        position('n', '01.0010', 0, { merkmale: wahl(999, null) }),
        position('w', '01.0020', 1, { merkmale: wahl(null, null) }),
      ]),
    );
    expect(befund(hoch, 'wahl-nummer-ungueltig')).toMatchObject({
      schwere: 'fehler',
      ort: { knotenId: 'w' },
    });
    expect(hoch.xml).toContain('<ALNGroupNo>1000</ALNGroupNo>');
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

// --- v1.3 (Ticket 68) ----------------------------------------------------------------------------------------------

describe('v1.3: Auftragnehmer (CTR) aus dem Modell', () => {
  const an = { name: 'Beispielbau (erfunden)', strasse: 'Weg 1', plz: '12345', ort: 'Musterstadt' };

  it('X86 schreibt CTR/Address aus LvInhalt.auftragnehmer, ohne Warnung; der Leser liest ihn zurück', () => {
    const e = schreibe(lv([p1()], { auftragnehmer: an }), 'X86');
    expect(kompakt(e.xml)).toContain(
      '<CTR><Address><Name1>Beispielbau (erfunden)</Name1><Street>Weg 1</Street><PCode>12345</PCode>' +
        '<City>Musterstadt</City></Address></CTR>',
    );
    expect(e.befunde.filter((b) => b.ort.feld === 'auftragnehmer')).toEqual([]);
    const l = leseGaeb(e.xml, { ids: testIds() });
    expect(l.inhalt?.auftragnehmer).toEqual(an);
    expect(l.befunde.filter((b) => b.code === 'nicht-abgebildet')).toEqual([]);
  });

  it('X86 ohne Auftragnehmer: leere Adresse und Warnung angabe-leer (nur dann)', () => {
    const e = schreibe(lv([p1()]), 'X86');
    expect(kompakt(e.xml)).toContain('<CTR><Address><Name1/><Street/><PCode/><City/></Address></CTR>');
    expect(e.befunde.filter((b) => b.code === 'angabe-leer').map((b) => b.ort.feld)).toEqual([
      'auftraggeber',
      'auftragnehmer',
    ]);
  });

  it('die Option auftragnehmer gibt es nicht mehr (das Modell gewinnt)', () => {
    // @ts-expect-error: SchreibOptionen kennt seit v1.3 keinen Auftragnehmer
    const opt: SchreibOptionen = {
      phase: 'X86',
      version: '3.3',
      erstellt: TEST_ERSTELLT,
      programm: 'T',
      auftragnehmer: 'x',
    };
    expect(opt.phase).toBe('X86');
  });

  it('X81 und X83 kennen kein CTR: Auftragnehmer verworfen mit Warnung', () => {
    for (const phase of ['X81', 'X83'] as const) {
      const e = schreibe(lv([p1()], { auftragnehmer: an }), phase);
      expect(e.xml).not.toContain('<CTR>');
      expect(verworfen(e)).toEqual(expect.arrayContaining([expect.stringMatching(/^Auftragnehmer/)]));
    }
  });

  it('Name über 40 Zeichen ist ein Fehler am Feld auftragnehmer.name', () => {
    const e = schreibe(lv([p1()], { auftragnehmer: { ...an, name: 'x'.repeat(41) } }), 'X86');
    expect(e.befunde.filter((b) => b.schwere === 'fehler').map((b) => [b.code, b.ort.feld])).toEqual([
      ['wert-zu-lang', 'auftragnehmer.name'],
    ]);
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

  it('X81 und X83: gleich bis auf Preise, Sätze, Nachlass und Auftragnehmer', () => {
    const r = reichesLv();
    const n = normiereKennungen(r.inhalt);
    for (const phase of ['X81', 'X83'] as const) {
      const e = schreibeGaeb(exportInhalt(phase, n), exportOptionen(phase, '3.3', n));
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
      expect(l.inhalt).toEqual({ ...ohneAuftragnehmer(n.inhalt), nachlass: null, knoten: ohnePreise });
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

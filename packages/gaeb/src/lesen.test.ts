// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des GAEB-Lesers X81/X83 3.3 (Ticket 22). Zuerst geschrieben (Q1).
//
// Golden-Dateien liegen unter `packages/gaeb/testdaten/golden/` (eine pro amtlicher 3.3-Datei und pro Fehlerdatei).
// Aktualisieren nach einer gewollten Änderung der Befunde:
//
//   GOLDEN_UPDATE=1 pnpm vitest run packages/gaeb
//
// Danach `git diff packages/gaeb/testdaten/golden` prüfen: jede Zeile ist ein Befund, jede Änderung eine Entscheidung.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Knoten, Position, Pruefbefund } from '@tethys/vertrag';
import { leseGaeb } from './index';
import type { GaebLesungErgebnis } from './index';
import { TEST_MWST, alleBausteine, leseTestdatei, lesePfad, ohneMerkmale, testIds } from './testhilfen';

const HIER = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HIER, '..', 'testdaten', 'golden');
const AKTUALISIEREN = process.env['GOLDEN_UPDATE'] === '1';

const lies = (bytes: Uint8Array | string, dateiname?: string): GaebLesungErgebnis =>
  leseGaeb(bytes, {
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

// --- Golden ----------------------------------------------------------------------------------------------

/** Kurzbeschreibung des Ergebnisses: Köpfe und Zählung, damit Golden auch Strukturänderungen zeigt. */
function zusammenfassung(datei: string, l: GaebLesungErgebnis): Record<string, unknown> {
  const ps = positionen(l);
  const zaehleWenn = (f: (p: Position) => boolean): number => ps.filter(f).length;
  const bausteine: Record<string, number> = {};
  let bilder = 0;
  for (const k of knoten(l)) {
    const text = k.art === 'position' ? k.langtext : k.art === 'hinweis' ? k.text : [];
    for (const b of alleBausteine(text)) {
      bausteine[b.art] = (bausteine[b.art] ?? 0) + 1;
      if (k.art === 'position' && b.art === 'bild') bilder += 1;
    }
  }
  const zuschlaege: Record<string, number> = {};
  for (const p of ps)
    if (p.zuschlag !== null) zuschlaege[p.zuschlag.bezug.art] = (zuschlaege[p.zuschlag.bezug.art] ?? 0) + 1;
  return {
    datei,
    phase: l.phase,
    version: l.version,
    name: l.inhalt?.name ?? null,
    ozMaske: l.inhalt?.ozMaske ?? null,
    mwstSatz: l.inhalt?.mwstSatz ?? null,
    auftraggeber: l.inhalt?.auftraggeber ?? null,
    vergabeinformationen: l.inhalt?.vergabeinformationen ?? null,
    anzahl: {
      los: zaehle(l, 'los'),
      titel: zaehle(l, 'titel'),
      positionen: zaehle(l, 'position'),
      hinweise: zaehle(l, 'hinweis'),
      bilderInPositionen: bilder,
    },
    merkmale: {
      ohne: zaehleWenn(ohneMerkmale),
      bedarf: zaehleWenn((p) => p.merkmale.bedarf !== null),
      wahl: zaehleWenn((p) => p.merkmale.wahl !== null),
      stundenlohn: zaehleWenn((p) => p.merkmale.stundenlohn),
      zuschlagskennzeichen: zaehleWenn((p) => p.merkmale.zuschlagskennzeichen),
      leitbeschreibung: zaehleWenn((p) => p.leitbeschreibung !== undefined),
    },
    zuschlaege,
    pauschal: zaehleWenn((p) => p.merkmale.pauschal),
    langtextBausteine: bausteine,
    befunde: l.befunde.length,
  };
}

const alsZeilen = (datei: string, l: GaebLesungErgebnis): string =>
  [zusammenfassung(datei, l), ...l.befunde].map((z) => JSON.stringify(z)).join('\n') + '\n';

function vergleicheGolden(name: string, datei: string, l: GaebLesungErgebnis): void {
  const pfad = join(GOLDEN, `${name}.golden.jsonl`);
  const ist = alsZeilen(datei, l);
  if (AKTUALISIEREN) {
    mkdirSync(GOLDEN, { recursive: true });
    writeFileSync(pfad, ist);
  }
  expect(existsSync(pfad), `Golden fehlt: ${pfad} (GOLDEN_UPDATE=1 setzen)`).toBe(true);
  expect(ist).toBe(readFileSync(pfad, 'utf8'));
}

// --- Amtliche 3.3-Dateien --------------------------------------------------------------------------------

const AVA_X81 = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81';
const BAU_X83 = 'fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83';
const TEXT_X81 = 'fixtures/extern/bvbs/3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x81';

const AMTLICH = [
  { name: 'ava-x81', pfad: AVA_X81, phase: 'X81' },
  { name: 'bauausfuehrung-x83', pfad: BAU_X83, phase: 'X83' },
  { name: 'texterstellung-x81', pfad: TEXT_X81, phase: 'X81' },
] as const;

describe('amtliche 3.3-Dateien (X81/X83)', () => {
  for (const { name, pfad, phase } of AMTLICH) {
    it(`${name}: liest ohne Absturz, Phase und Version, Befunde als Golden`, () => {
      const l = lies(lesePfad(pfad), pfad.split('/').at(-1));
      expect(l.phase).toBe(phase);
      expect(l.version).toBe('3.3');
      expect(l.inhalt).not.toBeNull();
      expect(l.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
      vergleicheGolden(name, pfad.split('/').at(-1) ?? pfad, l);
    });

    it(`${name}: ist deterministisch`, () => {
      expect(lies(lesePfad(pfad))).toEqual(lies(lesePfad(pfad)));
    });
  }

  describe('Bauausführung X83', () => {
    const l = lies(lesePfad(BAU_X83), 'x.x83');
    const inhalt = l.inhalt;

    it('Zählung: 12 Gliederungen, 28 Positionen (27 Item + 1 Zuschlag), 4 Hinweistexte', () => {
      expect(zaehle(l, 'los')).toBe(0);
      expect(zaehle(l, 'titel')).toBe(12);
      expect(zaehle(l, 'position')).toBe(28);
      expect(zaehle(l, 'hinweis')).toBe(4);
    });

    it('OZ-Maske aus BoQBkdn: 3+3 numerisch, Position 4 numerisch, Index 1 alphanumerisch', () => {
      expect(inhalt?.ozMaske).toEqual({
        gliederung: [
          { laenge: 3, zeichen: 'numerisch' },
          { laenge: 3, zeichen: 'numerisch' },
        ],
        position: { laenge: 4, zeichen: 'numerisch' },
        index: { laenge: 1, zeichen: 'alphanumerisch' },
        trennzeichen: '.',
      });
    });

    it('Ordnungszahlen und Indexpositionen (RNoIndex)', () => {
      const mitIndex = positionen(l).filter((p) => p.ozIndex !== null);
      expect(mitIndex.map((p) => `${p.ordnungszahl ?? '?'}|${p.ozIndex ?? ''}`)).toEqual([
        '001.001.0010|1',
        '001.001.0010|A',
        '999.999.9999|y',
        '999.999.9999|z',
      ]);
    });

    it('Bedarfsposition mit Gesamtbetrag (Provis WithTotal)', () => {
      const p = positionen(l).find((x) => x.ordnungszahl === '001.001.0010' && x.ozIndex === '1');
      expect(p?.merkmale.bedarf).toBe('mit-gesamtbetrag');
    });

    it('Grund- und Wahlposition (ALNGroupNo/ALNSerNo) verweisen aufeinander', () => {
      const grund = positionen(l).find((x) => x.ordnungszahl === '001.002.0040');
      const wahl = positionen(l).find((x) => x.ordnungszahl === '001.002.0050');
      expect(grund?.merkmale.wahl).toEqual({ gruppe: 1, variante: 0, grundpositionId: null });
      expect(wahl?.merkmale.wahl).toEqual({ gruppe: 1, variante: 1, grundpositionId: grund?.id });
    });

    it('Zuschlagsposition (MarkupItem, AllInCat) hat Bezug gliederung, keine Menge, keinen Preis', () => {
      const z = positionen(l).filter((x) => x.zuschlag !== null);
      expect(z.map((p) => p.zuschlag)).toEqual([{ prozentsatz: null, bezug: { art: 'gliederung' } }]);
      for (const p of z) {
        expect(p.menge).toBeNull();
        expect(p.einheitspreis).toBeNull();
      }
    });

    it('stimmt mit den Positionsnummern überein, die die BVBS-Prüfkriterien nennen (Ticket 23)', () => {
      const oz = (z: string): Position | undefined => positionen(l).find((x) => x.ordnungszahl === z);
      expect(ohneMerkmale(oz('002.000.0000'))).toBe(true); // Position „0000“ muss vorhanden sein
      expect(oz('002.001.0030')?.zuschlag).not.toBeNull(); // Zuschlagspositionen ab 002.001.0030
      expect(oz('001.002.0040')?.merkmale.wahl?.variante).toBe(0); // Grundposition
      expect(oz('001.002.0050')?.merkmale.wahl?.variante).toBe(1); // Alternativposition
    });

    it('Menge mit 8 Vorkomma- und 3 Nachkommastellen bleibt exakt', () => {
      const p = positionen(l).find((x) => x.ordnungszahl === '001.002.0030' && x.ozIndex === null);
      expect(p?.menge).toBe('12345678.012');
    });

    it('Bild im Langtext bleibt als Baustein erhalten, nicht in Kurztext oder Namen', () => {
      const bilder = positionen(l).flatMap((p) => alleBausteine(p.langtext).filter((b) => b.art === 'bild'));
      expect(bilder).toHaveLength(1);
      const b = bilder[0];
      expect(b?.art === 'bild' && b.bild.medientyp).toBe('image/jpeg');
      expect(b?.art === 'bild' && b.bild.daten.startsWith('/9j/4AAQ')).toBe(true);
      for (const k of knoten(l)) {
        if (k.art === 'position' || k.art === 'titel' || k.art === 'los')
          expect(k.kurztext).not.toContain('/9j/');
      }
      expect(inhalt?.name).not.toContain('/9j/');
    });

    it('meldet verworfene Formatierung, statt sie still zu verlieren', () => {
      expect(codes(l)).toContain('formatierung-verworfen');
    });

    it('setzt den Ersatz-MwSt-Satz und meldet das', () => {
      expect(inhalt?.mwstSatz).toBe(TEST_MWST);
      expect(codes(l)).toContain('mwst-ersatzwert');
    });
  });

  describe('AVA X81', () => {
    const l = lies(lesePfad(AVA_X81), 'x.X81');

    it('Zählung: 22 Gliederungen, 74 Positionen (68 Item + 6 Zuschlag), 14 Hinweistexte', () => {
      expect(zaehle(l, 'los')).toBe(0);
      expect(zaehle(l, 'titel')).toBe(22);
      expect(zaehle(l, 'position')).toBe(74);
      expect(zaehle(l, 'hinweis')).toBe(14);
    });

    it('Pauschal-, Stundenlohn-, Bedarfs-, Wahl- und Zuschlagspositionen werden unterschieden', () => {
      const ps = positionen(l);
      expect(ps.filter((p) => p.merkmale.pauschal)).toHaveLength(3);
      expect(ps.filter((p) => p.zuschlag !== null)).toHaveLength(6);
      expect(ps.filter((p) => p.merkmale.wahl !== null)).toHaveLength(12);
      expect(ps.filter((p) => p.merkmale.bedarf !== null)).toHaveLength(5);
      expect(ps.filter((p) => p.merkmale.stundenlohn)).toHaveLength(5);
      expect(ps.filter((p) => p.merkmale.zuschlagskennzeichen)).toHaveLength(2);
      expect(codes(l)).not.toContain('positionsart-kombination');
    });

    it('Bedarf und Stundenlohn zugleich (Hilfskraft): beide Merkmale, kein Befund (F5)', () => {
      const p = positionen(l).find((x) => x.kurztext === 'Hilfskraft');
      expect(p?.merkmale).toEqual({
        bedarf: 'mit-gesamtbetrag',
        wahl: null,
        stundenlohn: true,
        pauschal: false,
        zuschlagskennzeichen: false,
      });
    });

    it('Wahl: Gruppe und Variante wie in der Datei (0, 1, 2), Alternativen verweisen auf die erste Grundposition', () => {
      const ps = positionen(l).filter((p) => p.merkmale.wahl !== null);
      expect(
        ps.map((p) => `${String(p.merkmale.wahl?.gruppe)}/${String(p.merkmale.wahl?.variante)}`),
      ).toEqual([
        ...Array<string>(4).fill('1/0'),
        ...Array<string>(3).fill('1/1'),
        ...Array<string>(5).fill('1/2'),
      ]);
      const erste = ps[0];
      for (const p of ps)
        expect(p.merkmale.wahl?.grundpositionId).toBe(p.merkmale.wahl?.variante === 0 ? null : erste?.id);
      expect(codes(l)).not.toContain('wahl-variante-nicht-abgebildet');
    });

    it('Zuschlagskennzeichen (MarkupIt) an den Bezugspositionen, nicht mehr als nicht abgebildet gemeldet', () => {
      const markiert = positionen(l).filter((p) => p.merkmale.zuschlagskennzeichen);
      expect(markiert.map((p) => p.kurztext)).toEqual(['Ist zu bezuschlagen', 'Ist zu bezuschlagen']);
      expect(l.befunde.some((b) => b.meldung.includes('Item/MarkupIt'))).toBe(false);
    });

    it('Zuschlagspositionen: je Bezugsform aus der Datei (IdentAsMark, AllInCat, ListInSubQty), ohne Satz', () => {
      const ps = positionen(l);
      const z = ps.filter((p) => p.zuschlag !== null);
      expect(z.map((p) => p.zuschlag?.bezug.art)).toEqual([
        'kennzeichnung',
        'gliederung',
        'gliederung',
        'gliederung',
        'positionen',
        'positionen',
      ]);
      expect(z.every((p) => p.zuschlag?.prozentsatz === null)).toBe(true);
      const ziele = z.flatMap((p) =>
        p.zuschlag?.bezug.art === 'positionen' ? p.zuschlag.bezug.positionen : [],
      );
      expect(ziele.map((b) => b.teilmenge)).toEqual([null, null]);
      const ziel = (id: string): Position | undefined => ps.find((p) => p.id === id);
      expect(
        ziele.map((b) => `${ziel(b.positionId)?.kurztext ?? '?'}|${ziel(b.positionId)?.menge ?? '?'}`),
      ).toEqual(['Position .......|20.000', 'Position mit Mengensplit|100.000']);
      expect(codes(l)).not.toContain('zuschlag-bezug-nicht-abbildbar');
    });

    it('QtyTBD: Menge bleibt null statt 0', () => {
      const ohne = positionen(l).filter((p) => p.menge === null && p.zuschlag === null);
      expect(ohne.length).toBeGreaterThanOrEqual(3);
    });

    it('Indexpositionen A und Z', () => {
      const idx = positionen(l)
        .map((p) => p.ozIndex)
        .filter((i) => i !== null);
      expect(idx).toEqual(['A', 'Z']);
    });

    it('Bilder im Langtext bleiben erhalten (an ihrer Stelle zwischen Textbausteinen)', () => {
      const bilder = positionen(l).flatMap((p) => alleBausteine(p.langtext).filter((b) => b.art === 'bild'));
      expect(bilder.length).toBeGreaterThan(0);
    });

    it('jede Position hat eine Ordnungszahl, Wurzel-Eltern sind die Wurzel-ID', () => {
      expect(positionen(l).every((p) => p.ordnungszahl !== null)).toBe(true);
      expect('wurzelId' in l).toBe(false);
      expect(l.inhalt?.wurzelId).toBe('lv-0001');
      const ids = new Set(knoten(l).map((k) => k.id as string));
      const lose = knoten(l).filter((k) => !ids.has(k.elternId));
      expect(lose.length).toBeGreaterThan(0);
      expect(lose.every((k) => k.elternId === l.inhalt?.wurzelId)).toBe(true);
    });
  });

  describe('Kopfdaten (E-11)', () => {
    it('AVA X81: OWN wird Auftraggeber, AwardInfo wird Vergabeinformationen', () => {
      const inhalt = lies(lesePfad(AVA_X81), 'x.X81').inhalt;
      expect(inhalt?.auftraggeber).toEqual({
        name: 'BVBS',
        strasse: 'Budapester Straße 31',
        plz: '10787',
        ort: 'Berlin',
        vergabenummer: 'V-3456789012345',
      });
      expect(inhalt?.vergabeinformationen).toEqual({
        eroeffnungsdatum: '2021-07-06',
        eroeffnungszeit: '13:32:25',
        abgabeort: 'Zi. 5 in der OFD Gaebhausen',
        ausfuehrungsbeginn: '2021-06-15',
        ausfuehrungsende: '2021-12-23',
        auftragsnummer: 'Auftrag-Nr. 34567890',
        auftragsdatum: '2021-10-19',
        abnahmeart: 'Förmliche Abnahme',
        gewaehrleistung: { dauer: 2, einheit: 'Years' },
      });
    });

    it('Bauausführung X83: nur vorhandene Werte, sonst null; nicht abgebildete Teile sind Befund', () => {
      const l = lies(lesePfad(BAU_X83), 'x.x83');
      expect(l.inhalt?.auftraggeber).toEqual({
        name: null,
        strasse: null,
        plz: null,
        ort: null,
        vergabenummer: 'BVBS-4711',
      });
      expect(l.inhalt?.vergabeinformationen).toEqual({
        eroeffnungsdatum: '2024-04-04',
        eroeffnungszeit: '11:11:00',
        abgabeort: null,
        ausfuehrungsbeginn: null,
        ausfuehrungsende: null,
        auftragsnummer: null,
        auftragsdatum: null,
        abnahmeart: null,
        gewaehrleistung: null,
      });
      const nicht = l.befunde.filter((b) => b.code === 'nicht-abgebildet').map((b) => b.meldung);
      expect(nicht.some((m) => m.includes('Award/OWN '))).toBe(false);
      expect(nicht.some((m) => m.includes('Award/AwardInfo '))).toBe(false);
      expect(nicht.some((m) => m.includes('OWN/DPNo'))).toBe(true);
      expect(nicht.some((m) => m.includes('AwardInfo/Cur '))).toBe(true);
    });

    it('Texterstellung X81: ohne OWN fehlt der Auftraggeber', () => {
      const inhalt = lies(lesePfad(TEXT_X81), 'x.x81').inhalt;
      expect(inhalt !== null && 'auftraggeber' in inhalt).toBe(false);
      expect(inhalt?.vergabeinformationen?.auftragsnummer).toBeNull();
    });
  });

  describe('Leitbeschreibung (E-11)', () => {
    it('AVA X81: SumDescr mit drei Unterbeschreibungen, Menge nur mit QtySpec, Einheit ---- bleibt Text', () => {
      const ps = positionen(lies(lesePfad(AVA_X81), 'x.X81'));
      const leit = ps.filter((p) => p.leitbeschreibung !== undefined);
      expect(leit).toHaveLength(1);
      const u = leit[0]?.leitbeschreibung?.unterbeschreibungen ?? [];
      expect(u.map((x) => [x.nummer, x.kurztext, x.menge, x.einheit])).toEqual([
        ['1', 'Unterkonstruktion verz.Stahlblech', '0.000', '----'],
        ['2', "Dämmschicht mineralisch '40'", '0.000', '----'],
        ['3', 'Beplankung,beids. GKF 12,5 mm', '0.000', '----'],
      ]);
      expect(u[1]?.langtext.filter((b) => b.art === 'ergaenzung')).toHaveLength(2);
    });
  });

  it('Eltern stehen vor Kindern, Reihenfolge ist je Eltern dicht 0..n-1', () => {
    for (const { pfad } of AMTLICH) {
      const l = lies(lesePfad(pfad));
      const gesehen = new Set<string>([l.inhalt?.wurzelId as string]);
      const proEltern = new Map<string, number[]>();
      for (const k of knoten(l)) {
        expect(gesehen.has(k.elternId)).toBe(true);
        gesehen.add(k.id);
        proEltern.set(k.elternId, [...(proEltern.get(k.elternId) ?? []), k.reihenfolge]);
      }
      for (const folge of proEltern.values()) expect(folge).toEqual(folge.map((_, i) => i));
    }
  });
});

// --- Version 3.1, andere Phasen ---------------------------------------------------------------------------

describe('Version 3.1 und andere Phasen', () => {
  const dateien31 = readdirSync(join(HIER, '..', '..', '..', 'fixtures/extern/gaeb/3.1-musterdateien'));
  for (const d of dateien31) {
    it(`3.1 ${d}: kein Absturz, Version 3.1 nicht unterstützt, kein Inhalt`, () => {
      const l = lies(lesePfad(`fixtures/extern/gaeb/3.1-musterdateien/${d}`), d);
      expect(l.version).toBe('3.1');
      expect(l.inhalt).toBeNull();
      const b = l.befunde.find((x) => x.code === 'version-nicht-unterstuetzt');
      expect(b?.schwere).toBe('fehler');
      expect(b?.meldung).toContain('3.1');
    });
  }

  it('3.1-Datei: Phase wird trotzdem aus Award/DP erkannt', () => {
    const l = lies(lesePfad('fixtures/extern/gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X83'));
    expect(l.phase).toBe('X83');
  });

  it('X84 (3.3): Phase nicht unterstützt, kein Inhalt', () => {
    const l = lies(lesePfad('fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84'));
    expect(l.phase).toBe('X84');
    expect(l.version).toBe('3.3');
    expect(l.inhalt).toBeNull();
    expect(codes(l)).toContain('phase-nicht-unterstuetzt');
  });
});

// --- Fehlerdateien ----------------------------------------------------------------------------------------

interface Fehlerfall {
  readonly datei: string;
  readonly code: string;
  readonly schwere: 'warnung' | 'fehler';
  readonly positionen: number;
  readonly pruefe?: (l: GaebLesungErgebnis) => void;
}

const FEHLER: readonly Fehlerfall[] = [
  {
    datei: '01-tag-nicht-geschlossen.x83',
    code: 'xml-tag-nicht-geschlossen',
    schwere: 'fehler',
    positionen: 4,
    pruefe: (l) => {
      expect(positionen(l)[0]?.einheit).toBe('m3');
      expect(positionen(l)[0]?.kurztext).toBe('Boden lösen');
    },
  },
  {
    datei: '02-dezimalkomma.x83',
    code: 'dezimalkomma',
    schwere: 'warnung',
    positionen: 4,
    pruefe: (l) => {
      expect(positionen(l)[0]?.menge).toBe('12.500');
    },
  },
  {
    datei: '03-enum-ungueltig.x83',
    code: 'enum-ungueltig',
    schwere: 'warnung',
    positionen: 4,
    pruefe: (l) => {
      expect(ohneMerkmale(positionen(l)[0])).toBe(true);
    },
  },
  { datei: '04-doppelte-id.x83', code: 'doppelte-id', schwere: 'fehler', positionen: 4 },
  {
    datei: '05-latin1-als-utf8.x83',
    code: 'kodierung-ungueltig',
    schwere: 'warnung',
    positionen: 4,
    pruefe: (l) => {
      expect(positionen(l)[0]?.kurztext).toBe('Boden lösen');
    },
  },
  { datei: '06-oz-ueberlauf.x83', code: 'oz-maske-ueberlauf', schwere: 'fehler', positionen: 4 },
  {
    datei: '07-namespace-fehlt.x83',
    code: 'namespace-fehlt',
    schwere: 'warnung',
    positionen: 4,
    pruefe: (l) => {
      expect(l.phase).toBe('X83');
      expect(l.version).toBe('3.3');
    },
  },
  {
    datei: '08-version-unbekannt.x83',
    code: 'version-unbekannt',
    schwere: 'warnung',
    positionen: 4,
    pruefe: (l) => {
      expect(l.version).toBeNull();
    },
  },
  {
    datei: '09-menge-ohne-einheit.x83',
    code: 'einheit-fehlt',
    schwere: 'warnung',
    positionen: 4,
    pruefe: (l) => {
      expect(positionen(l)[0]?.menge).toBe('12.500');
      expect(positionen(l)[0]?.einheit).toBeNull();
    },
  },
  {
    datei: '10-phase-endung-widerspruch.x81',
    code: 'phase-endung-widerspruch',
    schwere: 'warnung',
    positionen: 4,
    pruefe: (l) => {
      expect(l.phase).toBe('X83');
    },
  },
  { datei: '11-oz-teil-ueberlauf.x83', code: 'oz-teil-ueberlauf', schwere: 'fehler', positionen: 4 },
  {
    datei: '12-datei-abgeschnitten.x83',
    code: 'xml-tag-nicht-geschlossen',
    schwere: 'fehler',
    positionen: 2,
    pruefe: (l) => {
      expect(positionen(l)[0]?.menge).toBe('12.500');
    },
  },
];

describe('zehn und mehr synthetische Fehlerdateien', () => {
  it('es gibt mindestens zehn, und die Tabelle kennt jede Datei', () => {
    const vorhanden = readdirSync(join(HIER, '..', 'testdaten', 'fehler')).sort();
    expect(vorhanden).toEqual(FEHLER.map((f) => f.datei).sort());
    expect(FEHLER.length).toBeGreaterThanOrEqual(10);
  });

  for (const f of FEHLER) {
    it(`${f.datei}: ${f.code} (${f.schwere}), übrige Positionen werden geliefert`, () => {
      const l = lies(leseTestdatei(`fehler/${f.datei}`), f.datei);
      expect(l.inhalt).not.toBeNull();
      const b = l.befunde.find((x) => x.code === f.code);
      expect(b, `Befund ${f.code} fehlt; vorhanden: ${codes(l).join(', ')}`).toBeDefined();
      expect(b?.schwere).toBe(f.schwere);
      expect(b?.quelle).toBe('gaeb-lesen');
      expect(positionen(l)).toHaveLength(f.positionen);
      f.pruefe?.(l);
      vergleicheGolden(`fehler-${f.datei.replace(/\.[^.]+$/, '')}`, f.datei, l);
    });
  }

  it('Befunde tragen Zeile und Spalte, wo die Datei eine Stelle hat', () => {
    const l = lies(leseTestdatei('fehler/02-dezimalkomma.x83'), '02.x83');
    const b = l.befunde.find((x) => x.code === 'dezimalkomma');
    expect(b?.ort.zeile).toBeGreaterThan(30);
    expect(b?.ort.spalte).toBeGreaterThan(0);
    expect(b?.ort.pfad).toContain('/Item/Qty');
    expect(b?.ort.knotenId).toBeDefined();
    expect(b?.ort.feld).toBe('menge');
  });
});

// --- Sicherheit -------------------------------------------------------------------------------------------

describe('Sicherheit', () => {
  it('Billion-Laughs-Datei wird abgewiesen, ohne zu expandieren', () => {
    const start = performance.now();
    const l = lies(leseTestdatei('sicherheit/billion-laughs.x83'), 'b.x83');
    expect(performance.now() - start).toBeLessThan(1000);
    expect(l.inhalt).toBeNull();
    const b = l.befunde.find((x) => x.code === 'xml-doctype-entitaeten');
    expect(b?.schwere).toBe('fehler');
  });

  it('Datei mit externer Entität wird abgewiesen, der Inhalt der Datei taucht nirgends auf', () => {
    const l = lies(leseTestdatei('sicherheit/externe-entitaet.x83'), 'x.x83');
    expect(l.inhalt).toBeNull();
    expect(codes(l)).toContain('xml-doctype-entitaeten');
    expect(JSON.stringify(l)).not.toContain('root:');
  });

  it('Größengrenze: zu große Eingabe wird nicht gelesen', () => {
    const l = leseGaeb('<GAEB/>'.padEnd(200, ' '), {
      ids: testIds(),
      standardMwstSatz: TEST_MWST,
      maxBytes: 100,
    });
    expect(l.inhalt).toBeNull();
    expect(l.befunde.map((b) => b.code)).toEqual(['datei-zu-gross']);
  });

  it('Tiefengrenze: sehr tiefe Verschachtelung bricht mit Fehlerbefund ab, ohne Absturz', () => {
    const tief = '<GAEB>' + '<a>'.repeat(5000) + '</a>'.repeat(5000) + '</GAEB>';
    const l = lies(tief);
    expect(codes(l)).toContain('xml-tiefe-ueberschritten');
  });
});

// --- Erkennung von Version und Phase ---------------------------------------------------------------------

const mini = (ns: string | null, version: string | null, dp: string | null): string =>
  `<GAEB${ns === null ? '' : ` xmlns="${ns}"`}>${version === null ? '' : `<GAEBInfo><Version>${version}</Version></GAEBInfo>`}` +
  `<Award>${dp === null ? '' : `<DP>${dp}</DP>`}<BoQ><BoQInfo><BoQBkdn><Type>Item</Type><Length>4</Length><Num>Yes</Num></BoQBkdn></BoQInfo>` +
  `<BoQBody><Itemlist><Item ID="a" RNoPart="0010"><Qty>1.000</Qty><QU>St</QU></Item></Itemlist></BoQBody></BoQ></Award></GAEB>`;

describe('Version und Phase: Reihenfolge Namensraum, GAEBInfo/Version, Award/DP, Endung', () => {
  const NS = 'http://www.gaeb.de/GAEB_DA_XML/DA83/3.3';

  it('alles stimmig: keine Erkennungsbefunde', () => {
    const l = lies(mini(NS, '3.3', '83'), 'a.x83');
    expect(l.phase).toBe('X83');
    expect(l.version).toBe('3.3');
    expect(
      codes(l).filter((c) => c.startsWith('phase') || c.startsWith('version') || c.startsWith('namespace')),
    ).toEqual([]);
  });

  it('ohne Namensraum gilt GAEBInfo/Version und Award/DP', () => {
    const l = lies(mini(null, '3.3', '81'));
    expect(l.version).toBe('3.3');
    expect(l.phase).toBe('X81');
    expect(codes(l)).toContain('namespace-fehlt');
  });

  it('ohne alles bleibt die Endung als letzte Quelle', () => {
    const l = lies(mini(null, '3.3', null), 'x.X83');
    expect(l.phase).toBe('X83');
  });

  it('Namensraum schlägt GAEBInfo und DP; Widerspruch ist ein Befund', () => {
    const l = lies(mini(NS, '3.2', '81'), 'a.x83');
    expect(l.version).toBe('3.3');
    expect(l.phase).toBe('X83');
    expect(codes(l)).toEqual(expect.arrayContaining(['version-widerspruch', 'phase-widerspruch']));
  });

  it('3.2 wird gelesen wie 3.3 (Ticket 40)', () => {
    const l = lies(mini('http://www.gaeb.de/GAEB_DA_XML/DA83/3.2', '3.2', '83'));
    expect(l.version).toBe('3.2');
    expect(l.phase).toBe('X83');
    expect(positionen(l)).toHaveLength(1);
    expect(codes(l)).not.toContain('version-nicht-unterstuetzt');
  });

  it('3.1 wird erkannt, aber nicht gelesen (G4)', () => {
    const l = lies(mini(null, '3.1', '83'));
    expect(l.version).toBe('3.1');
    expect(l.inhalt).toBeNull();
    expect(codes(l)).toContain('version-nicht-unterstuetzt');
  });

  it('fremder Namensraum und fremdes Wurzelelement', () => {
    expect(codes(lies(mini('urn:fremd', '3.3', '83')))).toContain('namespace-unbekannt');
    const f = lies('<Rechnung/>');
    expect(f.inhalt).toBeNull();
    expect(codes(f)).toContain('wurzel-unerwartet');
  });

  it('Phase ungültig oder fehlend', () => {
    expect(codes(lies(mini(null, '3.3', '77')))).toContain('phase-ungueltig');
    const l = lies(mini(null, '3.3', null));
    expect(l.phase).toBeNull();
    expect(codes(l)).toContain('phase-unbekannt');
    expect(l.inhalt).not.toBeNull();
  });
});

// --- Kodierung --------------------------------------------------------------------------------------------

describe('Kodierung', () => {
  const doc = (kopf: string): string => kopf + mini('http://www.gaeb.de/GAEB_DA_XML/DA83/3.3', '3.3', '83');

  it('UTF-8 mit BOM wird ohne Befund gelesen', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(doc(''))]);
    expect(lies(bytes).befunde.filter((b) => b.code.startsWith('kodierung'))).toEqual([]);
  });

  it('als ISO-8859-1 deklarierte Datei wird ohne Befund gelesen', () => {
    const text = doc('<?xml version="1.0" encoding="ISO-8859-1"?>').replace('<QU>St</QU>', '<QU>Stück</QU>');
    const bytes = Uint8Array.from(Buffer.from(text, 'latin1'));
    const l = lies(bytes);
    expect(codes(l)).not.toContain('kodierung-ungueltig');
    expect(positionen(l)[0]?.einheit).toBe('Stück');
  });

  it('Zeichenkette mit führendem BOM-Zeichen wird gelesen', () => {
    expect(lies('﻿' + doc('')).inhalt).not.toBeNull();
  });
});

// --- Dezimalwerte, Pflichtangaben, MwSt ------------------------------------------------------------------

describe('Dezimalwerte und Pflichtangaben', () => {
  const item = (inner: string): string =>
    mini('http://www.gaeb.de/GAEB_DA_XML/DA83/3.3', '3.3', '83').replace(
      '<Qty>1.000</Qty><QU>St</QU>',
      inner,
    );

  it('unlesbare Menge ergibt Fehlerbefund, die Position bleibt mit Menge null', () => {
    const l = lies(item('<Qty>1.2.3</Qty><QU>St</QU>'));
    expect(l.befunde.find((b) => b.code === 'dezimal-ungueltig')?.schwere).toBe('fehler');
    expect(positionen(l)).toHaveLength(1);
    expect(positionen(l)[0]?.menge).toBeNull();
  });

  it('gerundeter Wert ist ein Fehlerbefund, weniger Nachkommastellen sind keiner', () => {
    expect(
      lies(item('<Qty>1.0005</Qty><QU>St</QU>')).befunde.find((b) => b.code === 'gerundet')?.schwere,
    ).toBe('fehler');
    expect(
      codes(lies(item('<Qty>1</Qty><QU>St</QU>'))).filter(
        (c) => c.startsWith('dezimal') || c === 'nachkommastellen-aufgefuellt',
      ),
    ).toEqual([]);
    expect(positionen(lies(item('<Qty>1</Qty><QU>St</QU>')))[0]?.menge).toBe('1.000');
  });

  it('leere Einheit (QU) ergibt null, nie leeren Text; ---- bleibt Text (Vertrag v1.2)', () => {
    const leer = lies(item('<Qty>1.000</Qty><QU></QU>'));
    expect(positionen(leer)[0]?.einheit).toBeNull();
    expect(codes(leer)).toContain('einheit-fehlt');
    expect(positionen(lies(item('<Qty>1.000</Qty><QU> </QU>')))[0]?.einheit).toBeNull();
    expect(positionen(lies(item('<Qty>1.000</Qty><QU>----</QU>')))[0]?.einheit).toBe('----');
  });

  it('fehlende Menge ohne QtyTBD oder LumpSumItem ist ein Befund, mit ihnen nicht', () => {
    expect(codes(lies(item('<QU>St</QU>')))).toContain('menge-fehlt');
    expect(codes(lies(item('<QtyTBD>Yes</QtyTBD><QU>St</QU>')))).not.toContain('menge-fehlt');
    const l = lies(item('<LumpSumItem>Yes</LumpSumItem><QU>psch</QU>'));
    expect(codes(l)).not.toContain('menge-fehlt');
    expect(positionen(l)[0]?.merkmale.pauschal).toBe(true);
    expect(positionen(l)[0]?.menge).toBeNull();
  });

  it('Merkmalskombination wahl und bedarf: beide bleiben (F5), kein Kombinationsbefund', () => {
    const l = lies(
      item(
        '<Provis>WithoutTotal</Provis><ALNGroupNo>1</ALNGroupNo><ALNSerNo>1</ALNSerNo><Qty>1.000</Qty><QU>St</QU>',
      ),
    );
    expect(positionen(l)[0]?.merkmale.wahl).toEqual({ gruppe: 1, variante: 1, grundpositionId: null });
    expect(positionen(l)[0]?.merkmale.bedarf).toBe('ohne-gesamtbetrag');
    expect(codes(l)).not.toContain('positionsart-kombination');
    expect(codes(l)).toContain('wahl-ohne-grundposition');
  });
});

// --- Leistung ----------------------------------------------------------------------------------------------

describe('Leistung (Messung)', () => {
  it('Datei über 2 MB wird in unter 1 s gelesen', () => {
    const teile: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?><GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><GAEBInfo><Version>3.3</Version></GAEBInfo><Award><DP>83</DP><BoQ><BoQInfo>' +
        '<BoQBkdn><Type>BoQLevel</Type><Length>2</Length><Num>Yes</Num></BoQBkdn><BoQBkdn><Type>BoQLevel</Type><Length>2</Length><Num>Yes</Num></BoQBkdn>' +
        '<BoQBkdn><Type>Item</Type><Length>4</Length><Num>Yes</Num></BoQBkdn><BoQBkdn><Type>Index</Type><Length>1</Length><Num>No</Num></BoQBkdn></BoQInfo><BoQBody>',
    ];
    for (let g = 1; g <= 10; g++) {
      teile.push(
        `<BoQCtgy ID="g${String(g)}" RNoPart="${String(g).padStart(2, '0')}"><LblTx><p><span>Gruppe ${String(g)}</span></p></LblTx><BoQBody><BoQCtgy ID="u${String(g)}" RNoPart="01"><LblTx><p><span>Untergruppe</span></p></LblTx><BoQBody><Itemlist>`,
      );
      for (let i = 1; i <= 420; i++) {
        teile.push(
          `<Item ID="i${String(g)}_${String(i)}" RNoPart="${String(i * 10).padStart(4, '0')}"><Qty>${String(i)}.500</Qty><QU>m2</QU><Description><CompleteText><DetailTxt><Text>` +
            `<p style="text-align:left;"><span style="font-family:Arial;">Langtext der Position ${String(i)} mit etwas Inhalt, damit die Datei wächst und der Leser Text verarbeiten muss.</span><br/></p>` +
            `<p><span>Zweiter Absatz mit &amp; Entität und Umlauten äöüß.</span></p></Text></DetailTxt><OutlineText><OutlTxt><TextOutlTxt><p><span>Kurztext ${String(i)}</span></p></TextOutlTxt></OutlTxt></OutlineText></CompleteText></Description></Item>`,
        );
      }
      teile.push('</Itemlist></BoQBody></BoQCtgy></BoQBody></BoQCtgy>');
    }
    teile.push('</BoQBody></BoQ></Award></GAEB>');
    const bytes = new TextEncoder().encode(teile.join(''));
    expect(bytes.length).toBeGreaterThan(2 * 1024 * 1024);

    lies(bytes); // Warmlauf (JIT)
    const start = performance.now();
    const l = lies(bytes);
    const ms = performance.now() - start;
    console.log(
      `gaeb: ${String(positionen(l).length)} Positionen, ${(bytes.length / 1048576).toFixed(2)} MB in ${ms.toFixed(0)} ms`,
    );
    expect(positionen(l)).toHaveLength(4200);
    expect(ms).toBeLessThan(1000);
  });
});

// --- v1.3: EPA-Bezeichnungen (Ticket 68, D-28) ----------------------------------------------------------------

describe('v1.3: EPA-Bezeichnungen aus LblUPComp (X81, X83, X86)', () => {
  /** Eine kleine Datei der Phase mit den gegebenen Beschriftungen im BoQInfo. */
  const mitBeschriftung = (dp: '81' | '83' | '86', lbl: string): string =>
    mini(`http://www.gaeb.de/GAEB_DA_XML/DA${dp}/3.3`, '3.3', dp).replace(
      '</BoQBkdn></BoQInfo>',
      `</BoQBkdn>${lbl}</BoQInfo>`,
    );
  const nichtAbgebildet = (l: GaebLesungErgebnis): string[] =>
    l.befunde.filter((b) => b.code === 'nicht-abgebildet').map((b) => b.meldung);

  it('BVBS Bauausführung X83: Lohn, Material, Gerät, Sonstiges mit Type Unknown → Arten über die Bezeichnung', () => {
    const l = lies(lesePfad(BAU_X83), 'x.x83');
    expect(l.inhalt?.epaBezeichnungen).toEqual([
      { nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' },
      { nummer: 2, anteil: 'stoffe', bezeichnung: 'Material' },
      { nummer: 3, anteil: 'geraete', bezeichnung: 'Gerät' },
      { nummer: 4, anteil: 'sonstiges', bezeichnung: 'Sonstiges' },
    ]);
    expect(nichtAbgebildet(l).filter((m) => m.includes('UPComp'))).toEqual([]);
  });

  it('BVBS Texterstellung X81 ebenso', () => {
    const l = lies(lesePfad(TEXT_X81), 'x.x81');
    expect(l.inhalt?.epaBezeichnungen?.map((e) => [e.nummer, e.anteil])).toEqual([
      [1, 'lohn'],
      [2, 'stoffe'],
      [3, 'geraete'],
      [4, 'sonstiges'],
    ]);
  });

  it('ohne LblUPComp fehlt das Feld (nie [])', () => {
    const l = lies(mini('http://www.gaeb.de/GAEB_DA_XML/DA83/3.3', '3.3', '83'));
    expect(l.inhalt).not.toBeNull();
    expect(l.inhalt && 'epaBezeichnungen' in l.inhalt).toBe(false);
  });

  it('Lücken bleiben Lücken (nie umnummeriert); leere Beschriftung mit Type → bezeichnung null', () => {
    const l = lies(
      mitBeschriftung(
        '83',
        '<NoUPComps>5</NoUPComps><LblUPComp2 Type="Plant"></LblUPComp2>' +
          '<LblUPComp5 Type="Miscellaneous">Nachunternehmer</LblUPComp5>',
      ),
    );
    expect(l.inhalt?.epaBezeichnungen).toEqual([
      { nummer: 2, anteil: 'geraete', bezeichnung: null },
      { nummer: 5, anteil: 'nachunternehmer', bezeichnung: 'Nachunternehmer' },
    ]);
    expect(nichtAbgebildet(l)).toEqual([]);
  });

  it('zweiter Anteil derselben Art: Platz bleibt frei, Befund nicht-abgebildet', () => {
    const l = lies(
      mitBeschriftung(
        '81',
        '<NoUPComps>2</NoUPComps><LblUPComp1 Type="Wages">Lohn</LblUPComp1>' +
          '<LblUPComp2 Type="Wages">Lohn 2</LblUPComp2>',
      ),
    );
    expect(l.inhalt?.epaBezeichnungen).toEqual([{ nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' }]);
    expect(nichtAbgebildet(l)).toEqual([expect.stringContaining('LblUPComp2')]);
  });

  it('Bezeichnung und Type widersprechen sich: die Bezeichnung gilt, Warnung epa-beschriftung-abweichend', () => {
    const l = lies(
      mitBeschriftung('83', '<NoUPComps>2</NoUPComps><LblUPComp1 Type="Plant">Lohn</LblUPComp1>'),
    );
    expect(l.inhalt?.epaBezeichnungen).toEqual([{ nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' }]);
    expect(codes(l)).toContain('epa-beschriftung-abweichend');
  });

  it('unbekannte Bezeichnung mit Type Unknown ist der freie Anteil', () => {
    const l = lies(
      mitBeschriftung('86', '<NoUPComps>6</NoUPComps><LblUPComp6 Type="Unknown">Wagnis</LblUPComp6>'),
    );
    expect(l.inhalt?.epaBezeichnungen).toEqual([{ nummer: 6, anteil: 'frei', bezeichnung: 'Wagnis' }]);
  });
});

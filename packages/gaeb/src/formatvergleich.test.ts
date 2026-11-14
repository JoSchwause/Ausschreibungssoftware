// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 144, Tor E Punkt 3: Kettentest „dasselbe Modell“. Dasselbe kleine LV liegt von Hand geschrieben als GAEB DA XML 3.3,
// DA XML 3.1 und GAEB 90 in `fixtures/gaeb-formate/` (Herkunft dort). Alle Formate ergeben dasselbe Modell bis auf die Liste
// `FORMATUNTERSCHIEDE`; jeder Eintrag sagt, was abweicht und warum. Ticket 145 ergänzt GAEB 2000 (.p83/.p86).

import { describe, expect, it } from 'vitest';
import { pruefeLvInvarianten, summenBerechnen } from '@tethys/kern';
import type {
  AngebotId,
  BieterId,
  Knoten,
  Langtext,
  LangtextInnen,
  Leistungsverzeichnis,
  LvInhalt,
  Position,
  ProjektId,
} from '@tethys/vertrag';
import { leseAngebot, leseGaeb } from './index';
import type { GaebLesungErgebnis } from './index';
import { TEST_MWST, lesePfad, normiereKennungen, testIds } from './testhilfen';

const ORDNER = 'fixtures/gaeb-formate';
const lies = (datei: string): GaebLesungErgebnis =>
  leseGaeb(lesePfad(`${ORDNER}/${datei}`), { ids: testIds(), standardMwstSatz: TEST_MWST, dateiname: datei });

function inhalt(datei: string): LvInhalt {
  const l = lies(datei);
  if (l.inhalt === null) throw new Error(`${datei}: kein Inhalt`);
  return normiereKennungen(l.inhalt).inhalt;
}

/**
 * Die dokumentierten Unterschiede der Formate (Tor E Punkt 3). Jeder Eintrag ist eine Angleichung in `vergleichsform` und
 * nennt den Grund. Was hier nicht steht, muss gleich sein.
 */
const FORMATUNTERSCHIEDE = [
  {
    was: 'Langtext: Auszeichnung (fett) und Listen',
    warum:
      'GAEB 90 kennt keine Formatierung (nur Textzeilen); die Liste steht dort als Zeilen mit „- “. Verglichen wird der Text ' +
      'zeilenweise.',
  },
  {
    was: 'Stundenlohn, Pauschal und Kennzeichnung für den Zuschlag an der Position',
    warum:
      'Für GAEB 90 ist in den frei zugänglichen Beschreibungen kein Kennzeichen dafür belegt (D-144.5); die GAEB-90-Datei ' +
      'trägt diese Positionen als normale Positionen.',
  },
  {
    was: 'Zuschlagsposition 02.0060',
    warum:
      'Wie eine Zuschlagsposition in GAEB 90 steht, ist nicht belegt; die GAEB-90-Datei hat sie nicht. Das Netto der X86 ist ' +
      'deshalb um den Zuschlag höher.',
  },
  {
    was: 'Wahl: Gruppen- und Variantennummer',
    warum:
      'GAEB 90 kennt nur Grundposition (G) und Alternative (A) ohne Nummern; die Grundposition hat Variante 0, die Alternative ' +
      'keine Nummer. Verglichen werden Art und Verweis auf die Grundposition.',
  },
] as const;

/** Langtext als Zeilen: Absätze mit Umbrüchen werden Zeilen, ein neuer Absatz eine Leerzeile, Listenpunkte „- …“. */
function zeilen(l: Langtext | LangtextInnen): string[] {
  const aus: string[] = [];
  let zeile = '';
  const absatzEnde = (): void => {
    if (zeile !== '') aus.push(zeile);
    zeile = '';
  };
  for (const b of l) {
    if (b.art === 'absatz') {
      if (aus.length > 0 && aus.at(-1) !== '' && zeile === '') aus.push('');
      for (const i of b.inhalt)
        if (i.art === 'text') zeile += i.text;
        else if (i.art === 'umbruch') {
          aus.push(zeile);
          zeile = '';
        }
      absatzEnde();
    } else if (b.art === 'liste') for (const p of b.punkte) aus.push(`- ${zeilen(p).join(' ')}`);
    else if (b.art === 'text') zeile += b.text;
  }
  absatzEnde();
  return aus;
}

/** Das Modell mit den Angleichungen aus `FORMATUNTERSCHIEDE`. */
function vergleichsform(i: LvInhalt): unknown {
  const knoten = i.knoten
    .filter((k) => !(k.art === 'position' && k.zuschlag !== null))
    .map((k): unknown => {
      if (k.art === 'hinweis') return { ...k, text: zeilen(k.text) };
      if (k.art !== 'position') return k;
      const w = k.merkmale.wahl;
      return {
        ...k,
        langtext: zeilen(k.langtext),
        merkmale: {
          ...k.merkmale,
          stundenlohn: false,
          pauschal: false,
          zuschlagskennzeichen: false,
          wahl:
            w === null
              ? null
              : { art: w.variante === 0 ? 'grund' : 'alternative', grundpositionId: w.grundpositionId },
        },
      };
    });
  return { ...i, knoten };
}

const positionen = (i: LvInhalt): Position[] => i.knoten.flatMap((k) => (k.art === 'position' ? [k] : []));
const lvVon = (i: LvInhalt): Leistungsverzeichnis => {
  const { wurzelId, knoten, ...kopf } = i;
  return { ...kopf, id: wurzelId, projektId: 'projekt-1' as ProjektId, knoten };
};

describe('Kettentest „dasselbe Modell“ (Tor E Punkt 3)', () => {
  for (const phase of ['X83', 'X86'] as const) {
    const d = phase.slice(1);

    it(`${phase}: DA XML 3.3 und 3.1 ergeben genau dasselbe Modell`, () => {
      expect(inhalt(`geraeteschuppen-3.1.${phase}`)).toEqual(inhalt(`geraeteschuppen-3.3.${phase}`));
    });

    it(`${phase}: GAEB 90 (.d${d}) ergibt dasselbe Modell bis auf die dokumentierten Unterschiede`, () => {
      const xml = inhalt(`geraeteschuppen-3.3.${phase}`);
      const g90 = inhalt(`geraeteschuppen.d${d}`);
      expect(vergleichsform(g90)).toEqual(vergleichsform(xml));
      // Die Unterschiede sind wirklich da (sonst gehört der Eintrag aus der Liste).
      expect(positionen(xml)).toHaveLength(10);
      expect(positionen(g90)).toHaveLength(9);
      expect(positionen(xml).some((p) => p.merkmale.stundenlohn)).toBe(true);
      expect(positionen(xml).find((p) => p.ordnungszahl === '01.0010')).toMatchObject({
        langtext: [{ art: 'absatz', inhalt: [{ fett: true }, {}] }, { art: 'liste' }],
      });
      // Der Kern nimmt jedes gelesene LV an.
      for (const i of [xml, g90]) expect(pruefeLvInvarianten(lvVon(i))).toEqual([]);
    });
  }

  it('Formatunterschiede sind begründet', () => {
    for (const u of FORMATUNTERSCHIEDE) expect(u.warum.length, u.was).toBeGreaterThan(40);
  });

  it('X86: Netto der GAEB-90-Datei wie ihr Abschlusssatz, die DA-XML-Datei um den Zuschlag höher', () => {
    // Von Hand: Titel 01 545,93 + 911,93 + 390,00 (Bedarf mit Gesamtbetrag) = 1.847,86; Titel 02 3.404,00 + 6.259,01 +
    // 1.160,00 + 2.450,00 = 13.273,01; zusammen 15.120,87 (Satz 99 der .d86). Bedarf ohne Gesamtbetrag (650,00) und Wahl
    // (3.652,40) zählen nicht (F4). Zuschlag 5 % auf 6.259,01 = 312,95.
    const netto = (datei: string): string => {
      const i = inhalt(datei);
      return summenBerechnen({ ...lvVon(i) }).gesamt.netto;
    };
    expect(netto('geraeteschuppen.d86')).toBe('15120.87');
    expect(netto('geraeteschuppen-3.3.X86')).toBe('15433.82');
    expect(netto('geraeteschuppen-3.1.X86')).toBe('15433.82');
  });

  it('jeder GAEB-90-Import trägt den festen Hinweis; die DA-XML-Dateien lesen ohne Befund', () => {
    for (const d of ['geraeteschuppen.d83', 'geraeteschuppen.d86'])
      expect(lies(d).befunde.map((b) => b.code)).toContain('format-ungeprueft');
    for (const x of ['3.3.X83', '3.3.X86', '3.1.X83', '3.1.X86']) {
      const l = lies(`geraeteschuppen-${x}`);
      expect(
        l.befunde.filter((b) => !['mwst-standardsatz', 'mwst-ersatzwert'].includes(b.code)),
        x,
      ).toEqual([]);
    }
  });

  it('.d84 gegen das LV aus der .d83: Preise je Position, der Zehntelcent bleibt', () => {
    const lv = lvVon(lies('geraeteschuppen.d83').inhalt as LvInhalt);
    const a = leseAngebot(lesePfad(`${ORDNER}/geraeteschuppen.d84`), {
      lv,
      angebotId: 'angebot-1' as AngebotId,
      bieterId: 'bieter-1' as BieterId,
      dateiname: 'geraeteschuppen.d84',
    });
    expect(a.bieter).toEqual({ name: 'Musterbau GmbH' });
    const ep = new Map(
      (a.befehl?.angebot.positionen ?? []).map((p) => [
        (lv.knoten.find((k) => k.id === p.positionId) as Knoten & { ordnungszahl: string }).ordnungszahl,
        p.status === 'angeboten' ? p.einheitspreis : null,
      ]),
    );
    expect(Object.fromEntries(ep)).toEqual({
      '01.0010': '4.125',
      '01.0020': '19.500',
      '01.0030': '60.000',
      '01.0040': '30.000',
      '02.0010': '180.000',
      '02.0020': '195.000',
      '02.0030': '70.000',
      '02.0040': '55.000',
      '02.0050': '2300.000',
    });
    expect(a.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
  });
});

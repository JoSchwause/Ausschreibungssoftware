// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 144, Tor E Punkt 3: Kettentest „dasselbe Modell“. Dasselbe kleine LV liegt von Hand geschrieben als GAEB DA XML 3.3,
// DA XML 3.1, GAEB 90 und (Ticket 145) GAEB 2000 in `fixtures/gaeb-formate/` (Herkunft dort). Alle Formate ergeben dasselbe
// Modell bis auf die Listen `FORMATUNTERSCHIEDE` (GAEB 90) und `FORMATUNTERSCHIEDE_2000`; jeder Eintrag sagt, was abweicht und
// warum.

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

/** Die dokumentierten Unterschiede zwischen GAEB 2000 und DA XML (Ticket 145); angeglichen in `vergleichsform2000`. */
const FORMATUNTERSCHIEDE_2000 = [
  {
    was: 'Langtext: Listen',
    warum:
      'Der GAEB-2000-Leser liest den RTF-Text mit Absätzen, Zeilenumbrüchen und Auszeichnung (fett, kursiv, unterstrichen); ' +
      'Listen erkennt er nicht, die Liste steht dort als Zeilen mit „- “. Verglichen wird der Text zeilenweise.',
  },
  {
    was: 'Bedarf, Wahl, Stundenlohn, Pauschal und Kennzeichnung für den Zuschlag an der Position',
    warum:
      'Für GAEB 2000 ist in den frei zugänglichen Beschreibungen kein Schlüsselwort dafür belegt (D-145.4); die Datei trägt ' +
      'diese Positionen als normale Positionen. Das Netto der .p86 enthält deshalb auch Bedarf ohne Gesamtbetrag und Wahl.',
  },
  {
    was: 'Zuschlagsposition 02.0060',
    warum:
      'Wie eine Zuschlagsposition in GAEB 2000 steht, ist nicht belegt; die GAEB-2000-Datei hat sie nicht (wie GAEB 90).',
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

/** Das Modell mit den Angleichungen aus `FORMATUNTERSCHIEDE_2000`: wie GAEB 90, zusätzlich ohne Bedarf und Wahl. */
function vergleichsform2000(i: LvInhalt): unknown {
  const v = vergleichsform(i) as LvInhalt;
  return {
    ...v,
    knoten: v.knoten.map((k) =>
      k.art === 'position' ? { ...k, merkmale: { ...k.merkmale, bedarf: null, wahl: null } } : k,
    ),
  };
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

  for (const phase of ['X83', 'X86'] as const) {
    const d = phase.slice(1);
    it(`${phase}: GAEB 2000 (.p${d}) ergibt dasselbe Modell bis auf die dokumentierten Unterschiede`, () => {
      const xml = inhalt(`geraeteschuppen-3.3.${phase}`);
      const g2000 = inhalt(`geraeteschuppen.p${d}`);
      expect(vergleichsform2000(g2000)).toEqual(vergleichsform2000(xml));
      expect(positionen(g2000)).toHaveLength(9);
      expect(positionen(g2000).every((p) => p.merkmale.bedarf === null && p.merkmale.wahl === null)).toBe(
        true,
      );
      // Anders als GAEB 90 bleibt die Auszeichnung erhalten (RTF).
      expect(positionen(g2000).find((p) => p.ordnungszahl === '01.0010')?.langtext[0]).toEqual({
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'Oberboden', fett: true },
          { art: 'text', text: ' abtragen und seitlich lagern.' },
          { art: 'umbruch' },
          { art: 'text', text: '- Dicke bis 30 cm' },
          { art: 'umbruch' },
          { art: 'text', text: '- Lagerung auf der Baustelle' },
        ],
      });
      expect(pruefeLvInvarianten(lvVon(g2000))).toEqual([]);
    });
  }

  it('Formatunterschiede sind begründet', () => {
    for (const u of [...FORMATUNTERSCHIEDE, ...FORMATUNTERSCHIEDE_2000])
      expect(u.warum.length, u.was).toBeGreaterThan(40);
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
    // GAEB 2000 ohne Bedarf und Wahl: 15.120,87 + 650,00 (Bedarf ohne Gesamtbetrag) + 3.652,40 (Wahl) = 19.423,27.
    expect(netto('geraeteschuppen.p86')).toBe('19423.27');
  });

  it('jeder GAEB-90- und GAEB-2000-Import trägt den festen Hinweis; die DA-XML-Dateien lesen ohne Befund', () => {
    for (const d of [
      'geraeteschuppen.d83',
      'geraeteschuppen.d86',
      'geraeteschuppen.p83',
      'geraeteschuppen.p86',
    ])
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

describe('GAEB 2000: Angebot (.p84) gegen das LV aus der .p83', () => {
  it('Preise je Position, Bieter aus dem Auftragnehmer der Datei', () => {
    const lv = lvVon(lies('geraeteschuppen.p83').inhalt as LvInhalt);
    const a = leseAngebot(lesePfad(`${ORDNER}/geraeteschuppen.p84`), {
      lv,
      angebotId: 'angebot-1' as AngebotId,
      bieterId: 'bieter-1' as BieterId,
      dateiname: 'geraeteschuppen.p84',
    });
    expect(a.format).toBe('gaeb-2000');
    expect(a.bieter).toEqual({ name: 'Musterbau GmbH' });
    const ep = Object.fromEntries(
      (a.befehl?.angebot.positionen ?? []).map((p) => [
        (lv.knoten.find((k) => k.id === p.positionId) as Knoten & { ordnungszahl: string }).ordnungszahl,
        p.status === 'angeboten' ? p.einheitspreis : null,
      ]),
    );
    expect(ep).toEqual({
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
    expect(a.befunde.map((b) => b.code)).toContain('format-ungeprueft');
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 145: GAEB 2000 lesen, je Schlüsselwort ein Test. Seams: `leseGaeb` (LV, .p81/.p83/.p86) und `leseAngebot` (.p84). Die
// Dateien sind von Hand nach der Formatbeschreibung geschrieben (Aufbau siehe `gaeb2000.ts`, Quellen im Ticket); sie prüfen das
// eigene Verständnis des Formats, nicht Dateien anderer Software (D-71).

import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  BieterId,
  Hinweistext,
  Leistungsverzeichnis,
  Position,
  ProjektId,
  Titel,
} from '@tethys/vertrag';
import { leseAngebot, leseGaeb } from './index';
import type { GaebBefund } from './index';
import { TEST_MWST, lesePfad, testIds } from './testhilfen';

const MASKE = [
  '#begin[LVGlied]',
  '[Typ]LVStufe[end]',
  '[Laenge]2[end]',
  '#end[LVGlied]',
  '#begin[LVGlied]',
  '[Typ]Position[end]',
  '[Laenge]4[end]',
  '#end[LVGlied]',
  '#begin[LVGlied]',
  '[Typ]Index[end]',
  '[Laenge]1[end]',
  '#end[LVGlied]',
];

/** Eine Datei: Kopf mit Phase, `LVInfo` mit Maske (2/4/Index) und der Inhalt des LV. */
function datei(
  dp: string,
  lvInhalt: readonly string[],
  weiter: { info?: string[]; vergabe?: string[]; kopf?: string[] } = {},
): string {
  return [
    '#begin[GAEB]',
    ' #begin[GAEBInfo]',
    '  [Version]1.2[end]',
    '  [Zeichensatz]ANSI[end]',
    ' #end[GAEBInfo]',
    ...(weiter.kopf ?? []),
    ' #begin[Vergabe]',
    `  [DP]${dp}[end]`,
    ...(weiter.vergabe ?? []),
    '  #begin[LV]',
    '   #begin[LVInfo]',
    '    [Name]Testbau Halle[end]',
    ...(weiter.info ?? []),
    ...MASKE,
    '   #end[LVInfo]',
    ...lvInhalt,
    '  #end[LV]',
    ' #end[Vergabe]',
    '#end[GAEB]',
  ].join('\r\n');
}
const bereich = (oz: string, bez: string, ...inhalt: string[]): string[] => [
  '#begin[LVBereich]',
  `[OZ]${oz}[end]`,
  `[Bez]${bez}[end]`,
  ...inhalt,
  '#end[LVBereich]',
];
const position = (oz: string, ...felder: string[]): string =>
  ['#begin[Position]', `[OZ]${oz}[end]`, ...felder, '#end[Position]'].join('\r\n');
const beschreibung = (kurz: string | null, lang: string | null): string =>
  [
    '#begin[Beschreibung]',
    ...(kurz === null ? [] : [`[Kurztext]${kurz}[end]`]),
    ...(lang === null ? [] : [`[Langtext]${lang}[end]`]),
    '#end[Beschreibung]',
  ].join('\r\n');

const lies = (t: string | Uint8Array, dateiname = 'lv.p83') =>
  leseGaeb(t, { ids: testIds(), standardMwstSatz: TEST_MWST, dateiname });
function inhaltVon(t: string | Uint8Array, dateiname?: string) {
  const l = lies(t, dateiname);
  if (l.inhalt === null) throw new Error(`kein Inhalt: ${l.befunde.map((b) => b.meldung).join(' | ')}`);
  return { ...l, inhalt: l.inhalt };
}
const positionen = (knoten: readonly { art: string }[]): Position[] =>
  knoten.filter((k): k is Position => k.art === 'position');
const codes = (b: readonly GaebBefund[]): string[] => b.map((x) => x.code);
const nichtUebernommen = (b: readonly GaebBefund[]): (string | undefined)[] =>
  b.filter((x) => x.code === 'nicht-abgebildet').map((x) => x.nichtUebernommen);
const EINE = [
  ...bereich(
    '01',
    'Rohbau',
    position('010010', '[Menge]1,000[end]', '[ME]St[end]', beschreibung('Tür', null)),
  ),
];

describe('jeder GAEB-2000-Import', () => {
  it('trägt den festen Hinweis „nicht an Dateien aus anderer Software geprüft, Summen vergleichen“ (D-71)', () => {
    const l = lies(datei('83', EINE));
    expect(l.format).toBe('gaeb-2000');
    const h = l.befunde.filter((b) => b.code === 'format-ungeprueft');
    expect(h).toHaveLength(1);
    expect(h[0]?.meldung).toBe(
      'Das Lesen von GAEB 2000 ist nach der Formatbeschreibung gebaut und nicht an Dateien aus anderer Software geprüft; ' +
        'bitte die Summen mit denen des Absenders vergleichen.',
    );
    expect(h[0]?.werte).toEqual({ format: { art: 'text', wert: 'GAEB 2000' } });
  });

  it('die Testdatei .p86 liest mit genau den erwarteten Befunden', () => {
    const l = lies(lesePfad('fixtures/gaeb-formate/geraeteschuppen.p86'), 'geraeteschuppen.p86');
    expect(codes(l.befunde).sort()).toEqual(
      [
        'format-ungeprueft',
        'mwst-ersatzwert',
        'nicht-abgebildet',
        'nicht-abgebildet',
        'nicht-abgebildet',
      ].sort(),
    );
    expect(nichtUebernommen(l.befunde)).toEqual([
      'Währung',
      'Bezeichnung der Währung',
      'Datum des Leistungsverzeichnisses',
    ]);
  });
});

describe('Kopf: GAEBInfo, PrjInfo, Vergabe, AG, AN, LVInfo', () => {
  it('[DP] ist die Phase; widerspricht die Endung, gilt die Datei', () => {
    const l = inhaltVon(datei('83', EINE), 'lv.p81');
    expect(l.phase).toBe('X83');
    expect(codes(l.befunde)).toContain('phase-endung-widerspruch');
  });

  it('andere Phasen als X81, X83, X86 weist der LV-Leser mit Satz ab', () => {
    const l = lies(datei('85', EINE), 'lv.p85');
    expect(l.inhalt).toBeNull();
    expect(l.befunde.find((b) => b.code === 'phase-nicht-unterstuetzt')?.meldung).toContain('Nebenangebot');
  });

  it('LVGlied ergibt die OZ-Maske; Name, oder Bez, wenn Name deren Anfang ist', () => {
    const l = inhaltVon(datei('83', EINE, { info: ['[Bez]Testbau Halle Nord[end]'] }));
    expect(l.inhalt.name).toBe('Testbau Halle Nord');
    expect(l.inhalt.ozMaske).toEqual({
      gliederung: [{ laenge: 2, zeichen: 'numerisch' }],
      position: { laenge: 4, zeichen: 'numerisch' },
      index: { laenge: 1, zeichen: 'alphanumerisch' },
      trennzeichen: '.',
    });
    const anders = inhaltVon(datei('83', EINE, { info: ['[Bez]Anderes[end]'] }));
    expect(anders.inhalt.name).toBe('Testbau Halle');
    expect(nichtUebernommen(anders.befunde)).toContain('Bezeichnung des Leistungsverzeichnisses');
  });

  it('AG/Adresse/Name1 ist der Auftraggeber, AN in X86 der Auftragnehmer; Währung, Datum, Projekt „nicht übernommen“', () => {
    const adresse = (wer: string, name: string): string[] => [
      `#begin[${wer}]`,
      '#begin[Adresse]',
      `[Name1]${name}[end]`,
      '#end[Adresse]',
      `#end[${wer}]`,
    ];
    const vergabe = [
      '#begin[VergabeInfo]',
      '[Wae]EUR[end]',
      '#end[VergabeInfo]',
      ...adresse('AG', 'Stadt Beispiel'),
      ...adresse('AN', 'Bau AG'),
    ];
    const kopf = ['#begin[PrjInfo]', '[Name]Projekt X[end]', '[Bez]Neubau Halle[end]', '#end[PrjInfo]'];
    const l86 = inhaltVon(datei('86', EINE, { vergabe, kopf, info: ['[Datum]01.02.2026[end]'] }), 'lv.p86');
    expect(l86.inhalt.auftraggeber?.name).toBe('Stadt Beispiel');
    expect(l86.inhalt.auftragnehmer?.name).toBe('Bau AG');
    expect(nichtUebernommen(l86.befunde)).toEqual([
      'Projektbezeichnung',
      'Währung',
      'Datum des Leistungsverzeichnisses',
    ]);
    const l83 = inhaltVon(datei('83', EINE, { vergabe }));
    expect(l83.inhalt.auftragnehmer).toBeUndefined();
    expect(nichtUebernommen(l83.befunde)).toContain('Angaben zum Bieter');
  });

  it('kein Steuersatz aus GAEB 2000 ([USt] nur aus einem Beispiel): der eingestellte Satz mit Befund', () => {
    const l = inhaltVon(datei('86', EINE, { info: ['[USt]7[end]'] }), 'lv.p86');
    expect(l.inhalt.mwstSatz).toBe(TEST_MWST);
    expect(codes(l.befunde)).toContain('mwst-ersatzwert');
  });

  it('eine unbekannte Version ist ein Befund, gelesen wird trotzdem', () => {
    const l = inhaltVon(datei('83', EINE).replace('[Version]1.2[end]', '[Version]2.1[end]'));
    expect(l.befunde.find((b) => b.code === 'version-unbekannt')?.werte).toEqual({
      version: { art: 'text', wert: '2.1' },
    });
  });

  it('eine unlesbare Maske ist ein Fehler; die ganze OZ gilt als Positionsnummer', () => {
    const t = datei('83', [position('010010', '[Menge]1[end]', '[ME]St[end]')]).replace(
      '[Typ]Index[end]',
      '[Typ]LVStufe[end]',
    );
    const l = inhaltVon(t);
    expect(codes(l.befunde)).toContain('oz-maske-ungueltig');
    expect(positionen(l.inhalt.knoten)[0]?.ordnungszahl).toBe('010010');
  });
});

describe('LVBereich, Position, Hinweis', () => {
  it('Bereiche geschachtelt nach der Maske; OZ ohne Trennzeichen, Index als letzte Stelle', () => {
    const l = inhaltVon(
      datei('83', [
        ...bereich(
          '01',
          'Erdarbeiten',
          position('010010', '[Menge]125,500[end]', '[ME]m2[end]', beschreibung('Oberboden', null)),
          position('010010A', '[Menge]1,5[end]', '[ME]m2[end]', beschreibung('Oberboden, Index', null)),
        ),
      ]),
    );
    const t = l.inhalt.knoten.find((k): k is Titel => k.art === 'titel');
    expect(t).toMatchObject({ ordnungszahl: '01', kurztext: 'Erdarbeiten' });
    const [p, q] = positionen(l.inhalt.knoten);
    expect(p).toMatchObject({
      ordnungszahl: '01.0010',
      ozIndex: null,
      menge: '125.500',
      einheit: 'm2',
      elternId: t?.id,
    });
    expect(q).toMatchObject({ ordnungszahl: '01.0010', ozIndex: 'A', menge: '1.500' });
    expect(p?.merkmale).toEqual({
      bedarf: null,
      wahl: null,
      stundenlohn: false,
      pauschal: false,
      zuschlagskennzeichen: false,
    });
  });

  it('eine OZ, die nicht zur Maske passt, bleibt leer; Buchstaben außerhalb des Index sind ein Befund', () => {
    const l = inhaltVon(
      datei('83', [
        ...bereich(
          '01',
          'A',
          position('0100', '[Menge]1[end]', '[ME]St[end]'),
          position('01001X', '[Menge]1[end]', '[ME]St[end]'),
        ),
      ]),
    );
    const [p, q] = positionen(l.inhalt.knoten);
    expect(p?.ordnungszahl).toBeNull();
    expect(q?.ordnungszahl).toBe('01.001X');
    expect(codes(l.befunde)).toEqual(expect.arrayContaining(['oz-teil-fehlt', 'oz-teil-zeichen']));
  });

  it('EP mit drei Nachkommastellen, GB geprüft gegen Menge × EP', () => {
    const l = inhaltVon(
      datei('86', [
        ...bereich(
          '01',
          'A',
          position('010010', '[Menge]125,500[end]', '[ME]m2[end]', '[EP]4,350[end]', '[GB]545,93[end]'),
          position('010020', '[Menge]2[end]', '[ME]St[end]', '[EP]10[end]', '[GB]25,00[end]'),
        ),
      ]),
      'lv.p86',
    );
    const [p, q] = positionen(l.inhalt.knoten);
    expect(p?.einheitspreis).toBe('4.350');
    expect(q?.einheitspreis).toBe('10.000');
    const b = l.befunde.filter((x) => x.code === 'gesamtpreis-abweichend');
    expect(b).toHaveLength(1);
    expect(b[0]?.oz).toBe('01.0020');
  });

  it('Zahlen: Dezimalpunkt wird gelesen, ist aber ein Befund; Unlesbares fehlt mit Fehler', () => {
    const l = inhaltVon(
      datei('83', [
        ...bereich(
          '01',
          'A',
          position('010010', '[Menge]12.5[end]', '[ME]m[end]'),
          position('010020', '[Menge]1.234,5[end]', '[ME]m[end]'),
        ),
      ]),
    );
    const [p, q] = positionen(l.inhalt.knoten);
    expect(p?.menge).toBe('12.500');
    expect(q?.menge).toBeNull();
    expect(codes(l.befunde)).toEqual(
      expect.arrayContaining(['dezimalpunkt', 'dezimal-ungueltig', 'menge-fehlt']),
    );
  });

  it('unbekannte Schlüsselwörter (etwa ein Kennzeichen für Bedarf) sind ein Befund; die Position bleibt normal', () => {
    const l = inhaltVon(
      datei('83', [
        ...bereich(
          '01',
          'A',
          position('010010', '[Menge]1[end]', '[ME]St[end]', '[Bedarf]E[end]'),
          position('010020', '[Menge]1[end]', '[ME]St[end]', '[Bedarf]M[end]'),
        ),
      ]),
    );
    const b = l.befunde.filter((x) => x.code === 'schluesselwort-unbekannt');
    expect(b).toHaveLength(1);
    expect(b[0]?.werte).toEqual({
      schluesselwort: { art: 'text', wert: 'Bedarf' },
      anzahl: { art: 'anzahl', wert: 2 },
    });
    expect(positionen(l.inhalt.knoten).every((p) => p.merkmale.bedarf === null)).toBe(true);
  });

  it('Hinweis: Vortext am LV, Nachtext im Bereich; ohne Langtext trägt der Kurztext', () => {
    const hinweis = (kurz: string | null, lang: string | null): string =>
      ['#begin[Hinweis]', beschreibung(kurz, lang), '#end[Hinweis]'].join('\r\n');
    const l = inhaltVon(
      datei('83', [
        hinweis(null, 'Vorbemerkung'),
        ...bereich(
          '01',
          'A',
          position('010010', '[Menge]1[end]', '[ME]St[end]'),
          hinweis('Nur Kurztext', null),
        ),
      ]),
    );
    const h = l.inhalt.knoten.filter((k): k is Hinweistext => k.art === 'hinweis');
    expect(h.map((x) => x.text)).toEqual([
      [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Vorbemerkung' }] }],
      [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Nur Kurztext' }] }],
    ]);
    expect(h[0]?.elternId).toBe(l.inhalt.wurzelId);
  });
});

describe('Texte (RTF ab Version 1.1, einfacher Text in 1.0)', () => {
  const lang = (wert: string) =>
    positionen(
      inhaltVon(
        datei('83', [
          ...bereich('01', 'A', position('010010', '[Menge]1[end]', '[ME]St[end]', beschreibung('K', wert))),
        ]),
      ).inhalt.knoten,
    )[0]?.langtext;

  it("RTF: \\par Absatz, \\line Umbruch, fett/kursiv/unterstrichen, \\'hh und \\u, Kopf und Schrifttabelle übergangen", () => {
    expect(
      lang(
        '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fswiss Arial;}}\r\n     {\\b Fett} und {\\i kursiv}\\line\r\n     {\\ul unter}' +
          "strichen \\'fcber \\u8364?\\par\r\n     Zweiter\\par}",
      ),
    ).toEqual([
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'Fett', fett: true },
          { art: 'text', text: ' und ' },
          { art: 'text', text: 'kursiv', kursiv: true },
          { art: 'umbruch' },
          { art: 'text', text: 'unter', unterstrichen: true },
          { art: 'text', text: 'strichen über €' },
        ],
      },
      { art: 'absatz', inhalt: [{ art: 'text', text: 'Zweiter' }] },
    ]);
  });

  it('RTF: Schriftgröße und Farbe sind verworfene Formatierung (Befund), Bilder „nicht übernommen“', () => {
    const l = lies(
      datei('83', [
        ...bereich(
          '01',
          'A',
          position(
            '010010',
            '[Menge]1[end]',
            '[ME]St[end]',
            beschreibung('K', '{\\rtf1 {\\fs28\\cf2 Groß}{\\pict\\pngblip 89504e47}\\par}'),
          ),
        ),
      ]),
    );
    expect(codes(l.befunde)).toContain('formatierung-verworfen');
    expect(nichtUebernommen(l.befunde)).toContain('Bild im Text');
    expect(positionen(l.inhalt?.knoten ?? [])[0]?.langtext).toEqual([
      { art: 'absatz', inhalt: [{ art: 'text', text: 'Groß' }] },
    ]);
  });

  it('einfacher Text: Einrückung fällt weg, Zeilen mit Umbruch, eine leere Zeile beginnt einen neuen Absatz', () => {
    expect(lang('\r\n      Erste Zeile\r\n      zweite Zeile\r\n\r\n      Neuer Absatz')).toEqual([
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'Erste Zeile' },
          { art: 'umbruch' },
          { art: 'text', text: 'zweite Zeile' },
        ],
      },
      { art: 'absatz', inhalt: [{ art: 'text', text: 'Neuer Absatz' }] },
    ]);
  });

  it('Kurztext aus RTF wird eine Zeile; Bezeichnung des Bereichs über mehrere Zeilen mit Leerzeichen', () => {
    const l = inhaltVon(
      datei('83', [
        ...bereich(
          '01',
          'L O S 1\r\n    Abwasserleitung',
          position(
            '010010',
            '[Menge]1[end]',
            '[ME]St[end]',
            beschreibung('{\\rtf1\\ansi Rohr\\par DN 150\\par}', null),
          ),
        ),
      ]),
    );
    expect(l.inhalt.knoten.find((k) => k.art === 'titel')).toMatchObject({
      kurztext: 'L O S 1 Abwasserleitung',
    });
    expect(positionen(l.inhalt.knoten)[0]?.kurztext).toBe('Rohr DN 150');
  });
});

describe('Aufbau der Datei', () => {
  it('Nummern hinter #begin/#end und die Zählung hinter #end[GAEB] werden toleriert, ohne Befund', () => {
    const t = datei('83', EINE)
      .replace('#begin[Vergabe]', '#begin[Vergabe]3')
      .replace('#end[Vergabe]', '#end[Vergabe]3')
      .replace(/#end\[GAEB\]$/, '#end[GAEB]29|88');
    const l = inhaltVon(t);
    expect(codes(l.befunde).filter((c) => c.startsWith('xml-'))).toEqual([]);
    expect(positionen(l.inhalt.knoten)).toHaveLength(1);
  });

  it('ein Wert ohne [end] endet vor dem nächsten Schlüsselwort (Befund); offene Abschnitte und fremde Enden sind Befunde', () => {
    const t = datei('83', [
      ...bereich(
        '01',
        'A',
        position(
          '010010',
          '[Menge]1[end]',
          '[ME]St[end]',
          '#begin[Beschreibung]\r\n[Kurztext]Tür ohne Ende\r\n#end[Beschreibung]',
        ),
      ),
      '#end[Fremd]',
    ]);
    const l = inhaltVon(t);
    expect(positionen(l.inhalt.knoten)[0]?.kurztext).toBe('Tür ohne Ende');
    expect(codes(l.befunde)).toEqual(
      expect.arrayContaining(['xml-tag-nicht-geschlossen', 'xml-schliessendes-tag-unerwartet']),
    );
    const offen = lies(datei('83', EINE).replace(/#end\[GAEB\]$/, ''));
    expect(codes(offen.befunde)).toContain('xml-abschnitt-offen');
    expect(offen.inhalt).not.toBeNull();
  });

  it('ohne LV ist kein Inhalt da (Fehler)', () => {
    const l = lies('#begin[GAEB]\r\n#begin[Vergabe]\r\n[DP]83[end]\r\n#end[Vergabe]\r\n#end[GAEB]');
    expect(l.inhalt).toBeNull();
    expect(codes(l.befunde)).toContain('lv-fehlt');
  });
});

describe('Zeichensatz', () => {
  /** Text aus Zeichen bis 0xFF als Bytes (Latin-1 = Windows-1252 für die deutschen Umlaute). */
  const ansi = (t: string): Uint8Array => Uint8Array.from({ length: t.length }, (_, i) => t.charCodeAt(i));
  const mitUmlaut = (angabe: string): string =>
    datei('83', [
      ...bereich('01', 'Erdarbeiten für Gärten', position('010010', '[Menge]1[end]', '[ME]St[end]')),
    ]).replace('[Zeichensatz]ANSI[end]', angabe);

  it('ANSI wie angegeben als Windows-1252, ohne Befund', () => {
    const l = inhaltVon(ansi(mitUmlaut('[Zeichensatz]ANSI[end]')));
    expect(l.inhalt.knoten.find((k) => k.art === 'titel')).toMatchObject({
      kurztext: 'Erdarbeiten für Gärten',
    });
    expect(codes(l.befunde)).not.toContain('zeichensatz-erkannt');
  });

  it('ANSI angegeben, aber gültiges UTF-8: gelesen als UTF-8, mit Befund; ohne Angabe am Inhalt erkannt', () => {
    const utf8 = inhaltVon(new TextEncoder().encode(mitUmlaut('[Zeichensatz]ANSI[end]')));
    expect(utf8.inhalt.knoten.find((k) => k.art === 'titel')).toMatchObject({
      kurztext: 'Erdarbeiten für Gärten',
    });
    expect(utf8.befunde.find((b) => b.code === 'zeichensatz-erkannt')?.meldung).toContain(
      'nennt den Zeichensatz „ANSI“',
    );
    const ohne = inhaltVon(ansi(mitUmlaut('')));
    expect(ohne.befunde.find((b) => b.code === 'zeichensatz-erkannt')?.meldung).toContain(
      'nennt ihren Zeichensatz nicht',
    );
  });
});

describe('.p84: Angebot', () => {
  const LV_TEXT = datei('83', [
    ...bereich(
      '01',
      'A',
      position('010010', '[Menge]10[end]', '[ME]m[end]', beschreibung('Rohr', null)),
      position('010020', '[Menge]5[end]', '[ME]St[end]', beschreibung('Bogen', null)),
    ),
  ]);
  const lvVon = (): Leistungsverzeichnis => {
    const i = inhaltVon(LV_TEXT).inhalt;
    const { wurzelId, knoten, ...kopf } = i;
    return { ...kopf, id: wurzelId, projektId: 'p' as ProjektId, knoten };
  };
  const angebot = (t: string, lv = lvVon()) =>
    leseAngebot(t, { lv, angebotId: 'a' as AngebotId, bieterId: 'b' as BieterId, dateiname: 'a.p84' });

  it('EP je OZ, Bieter aus AN; fehlende Positionen gelten als nicht angeboten, unbekannte sind ein Fehler', () => {
    const t = datei(
      '84',
      [
        ...bereich(
          '01',
          'A',
          position('010010', '[EP]12,345[end]', '[GB]123,45[end]'),
          position('019990', '[EP]1[end]'),
        ),
      ],
      { vergabe: ['#begin[AN]', '#begin[Adresse]', '[Name1]Bieter GmbH[end]', '#end[Adresse]', '#end[AN]'] },
    );
    const lv = lvVon();
    const a = angebot(t, lv);
    expect(a.format).toBe('gaeb-2000');
    expect(a.bieter).toEqual({ name: 'Bieter GmbH' });
    const [p1, p2] = positionen(lv.knoten);
    expect(a.befehl?.angebot.positionen).toEqual([
      { positionId: p1?.id, status: 'angeboten', einheitspreis: '12.345', epa: null },
      { positionId: p2?.id, status: 'nicht-angeboten' },
    ]);
    expect(codes(a.befunde)).toEqual(
      expect.arrayContaining(['format-ungeprueft', 'position-unbekannt', 'position-fehlt-im-angebot']),
    );
  });

  it('eine Angebotsaufforderung ist kein Angebot', () => {
    const a = angebot(LV_TEXT);
    expect(a.befehl).toBeNull();
    expect(codes(a.befunde)).toContain('phase-nicht-unterstuetzt');
  });
});

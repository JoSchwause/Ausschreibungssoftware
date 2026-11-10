// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des Langtext-Lesens (Ticket 32, Punkt 8; F6, E-10): die GAEB-abbildbare Teilmenge in die Bausteine von v1.1b.
// Seam: `leseGaeb`. Kleine selbst geschriebene Dateien für jede Regel, dazu ein Golden aus der amtlichen AVA-X81.
//
// Golden aktualisieren: GOLDEN_UPDATE=1 pnpm vitest run packages/gaeb

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Langtext, Position, Pruefbefund } from '@tethys/vertrag';
import { leseGaeb } from './index';
import type { GaebLesungErgebnis } from './index';
import { TEST_MWST, alleBausteine, lesePfad, testIds } from './testhilfen';

const HIER = dirname(fileURLToPath(import.meta.url));
const AVA_X81 = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81';

const lies = (eingabe: Uint8Array | string): GaebLesungErgebnis =>
  leseGaeb(eingabe, { ids: testIds(), standardMwstSatz: TEST_MWST });
const positionen = (l: GaebLesungErgebnis): Position[] =>
  (l.inhalt?.knoten ?? []).filter((k): k is Position => k.art === 'position');
const formatBefund = (l: GaebLesungErgebnis): Pruefbefund | undefined =>
  l.befunde.find((b) => b.code === 'formatierung-verworfen');

/** Eine X83 mit einer Position; `detail` ist der Inhalt von `DetailTxt`, `kurz` der von `TextOutlTxt`. */
const datei = (detail: string, kurz = '<p><span>Kurz</span></p>'): string =>
  '<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><Award><DP>83</DP><BoQ><BoQInfo>' +
  '<BoQBkdn><Type>Item</Type><Length>4</Length><Num>Yes</Num></BoQBkdn></BoQInfo><BoQBody><Itemlist>' +
  '<Item ID="a" RNoPart="0010"><Qty>1.000</Qty><QU>St</QU><Description><CompleteText>' +
  `<DetailTxt>${detail}</DetailTxt><OutlineText><OutlTxt><TextOutlTxt>${kurz}</TextOutlTxt></OutlTxt></OutlineText>` +
  '</CompleteText></Description></Item></Itemlist></BoQBody></BoQ></Award></GAEB>';

const langtext = (detail: string): Langtext => positionen(lies(datei(detail)))[0]?.langtext ?? [];

describe('Langtext: Auszeichnung, Absätze, Umbrüche', () => {
  it('span mit font-weight/font-style/text-decoration wird Textlauf mit fett/kursiv/unterstrichen', () => {
    const l = lies(
      datei(
        '<Text><p><span style="font-weight:bold;">fett</span><span> normal</span><br/>' +
          '<span style="font-style:italic;text-decoration:underline;">beides</span></p></Text>',
      ),
    );
    expect(positionen(l)[0]?.langtext).toEqual([
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'fett', fett: true },
          { art: 'text', text: ' normal' },
          { art: 'umbruch' },
          { art: 'text', text: 'beides', kursiv: true, unterstrichen: true },
        ],
      },
    ]);
    expect(formatBefund(l)).toBeUndefined();
  });

  it('Auszeichnung erbt sich in verschachtelte span, normal hebt sie auf; gleiche Läufe verschmelzen', () => {
    expect(
      langtext(
        '<Text><p style="font-weight:bold;"><span>a</span><span>b</span>' +
          '<span style="font-weight:normal;">c<span style="font-style:italic;">d</span></span></p></Text>',
      ),
    ).toEqual([
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'ab', fett: true },
          { art: 'text', text: 'c' },
          { art: 'text', text: 'd', kursiv: true },
        ],
      },
    ]);
  });

  it('span und br ohne Absatz bleiben lose Bausteine; ein leerer Absatz bleibt; kein \\n entsteht', () => {
    const l = langtext('<Text><span>eins</span><br/><span>zwei</span></Text><Text><p/></Text>');
    expect(l).toEqual([
      { art: 'text', text: 'eins' },
      { art: 'umbruch' },
      { art: 'text', text: 'zwei' },
      { art: 'absatz', inhalt: [] },
    ]);
  });

  it('Zeilenwechsel im Text der Datei werden Leerzeichen, nie \\n', () => {
    const l = langtext('<Text><p><span>eins\nzwei\r\ndrei</span></p></Text>');
    expect(JSON.stringify(l)).not.toContain('\\n');
    expect(l).toEqual([{ art: 'absatz', inhalt: [{ art: 'text', text: 'eins zwei drei' }] }]);
  });

  it('Schriftart, -größe, Farbe, Ausrichtung, Seitenumbruch werden als Befund gemeldet, der Text bleibt', () => {
    const l = lies(
      datei(
        '<Text><p style="text-align:left;"><span style="font-family:Arial;font-size:10pt;color:rgb(0,0,0);">x</span></p>' +
          '<page/></Text>',
      ),
    );
    expect(positionen(l)[0]?.langtext).toEqual([{ art: 'absatz', inhalt: [{ art: 'text', text: 'x' }] }]);
    const b = formatBefund(l);
    expect(b?.schwere).toBe('warnung');
    for (const art of ['Schriftart', 'Schriftgröße', 'Farbe', 'Ausrichtung', 'Seitenumbruch'])
      expect(b?.meldung).toContain(art);
  });

  it('Bild im Absatz steht an seiner Stelle im Absatz; Bildgröße ist Befund', () => {
    const l = lies(
      datei('<Text><p><span>vor</span><image Type="image/png" width="40">iVBORw0K</image></p></Text>'),
    );
    expect(positionen(l)[0]?.langtext).toEqual([
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'vor' },
          { art: 'bild', bild: { id: 'bild-0001', medientyp: 'image/png', daten: 'iVBORw0K' } },
        ],
      },
    ]);
    expect(formatBefund(l)?.meldung).toContain('Bildgröße');
  });
});

describe('Langtext: Listen und Tabellen', () => {
  it('ul und ol werden Listen, jeder Punkt ein Langtext; Listenstil ist Befund', () => {
    const l = lies(
      datei(
        '<Text><ul style="list-style:disc;"><li><span>a</span></li><li><span>b</span><br/></li></ul>' +
          '<ol><li><p><span style="font-weight:bold;">c</span></p></li></ol></Text>',
      ),
    );
    expect(positionen(l)[0]?.langtext).toEqual([
      {
        art: 'liste',
        geordnet: false,
        punkte: [[{ art: 'text', text: 'a' }], [{ art: 'text', text: 'b' }, { art: 'umbruch' }]],
      },
      {
        art: 'liste',
        geordnet: true,
        punkte: [[{ art: 'absatz', inhalt: [{ art: 'text', text: 'c', fett: true }] }]],
      },
    ]);
    expect(formatBefund(l)?.meldung).toContain('Listenstil');
  });

  it('table/tr/td mit colspan wird Tabelle; Breiten sind Befund', () => {
    const l = lies(
      datei(
        '<Text><table cellpadding="0"><tr><td colspan="2" style="width:100;"><p><span>kopf</span></p></td></tr>' +
          '<tr><td><span>a</span></td><td/></tr></table></Text>',
      ),
    );
    expect(positionen(l)[0]?.langtext).toEqual([
      {
        art: 'tabelle',
        zeilen: [
          { zellen: [{ spalten: 2, inhalt: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'kopf' }] }] }] },
          {
            zellen: [
              { spalten: 1, inhalt: [{ art: 'text', text: 'a' }] },
              { spalten: 1, inhalt: [] },
            ],
          },
        ],
      },
    ]);
    expect(formatBefund(l)?.meldung).toContain('Tabellenbreiten');
  });

  it('ungültiges colspan zählt als 1 und ist ein Befund', () => {
    const l = lies(datei('<Text><table><tr><td colspan="x"><span>a</span></td></tr></table></Text>'));
    const t = positionen(l)[0]?.langtext[0];
    expect(t?.art === 'tabelle' && t.zeilen[0]?.zellen[0]?.spalten).toBe(1);
    expect(formatBefund(l)?.meldung).toContain('colspan');
  });
});

describe('Langtext: Textergänzungen', () => {
  const te =
    '<TextComplement Kind="Owner" MarkLbl="21" ArtChrIdent="5534"><ComplCaption><span>Breite </span></ComplCaption>' +
    '<ComplBodyDec Value="80"/><ComplBody><span>\'80\'</span><br/><span>cm</span></ComplBody><ComplTail><span>,</span></ComplTail></TextComplement>';

  it('TextComplement auf oberster Ebene wird Textergänzung mit Herkunft, Kennung, leer und drei Teilen', () => {
    const l = lies(
      datei(
        `<Text><p><span>vor</span></p></Text>${te}<Text><p><span>nach</span></p></Text>` +
          '<TextComplement Kind="Bidder" MarkLbl="61" Empty="Yes"><ComplCaption/><ComplBody><span>...</span></ComplBody><ComplTail/></TextComplement>',
      ),
    );
    expect(positionen(l)[0]?.langtext).toEqual([
      { art: 'absatz', inhalt: [{ art: 'text', text: 'vor' }] },
      {
        art: 'ergaenzung',
        herkunft: 'ausschreibender',
        kennung: '21',
        leer: false,
        davor: [{ art: 'text', text: 'Breite ' }],
        inhalt: [{ art: 'text', text: "'80'" }, { art: 'umbruch' }, { art: 'text', text: 'cm' }],
        danach: [{ art: 'text', text: ',' }],
      },
      { art: 'absatz', inhalt: [{ art: 'text', text: 'nach' }] },
      {
        art: 'ergaenzung',
        herkunft: 'bieter',
        kennung: '61',
        leer: true,
        davor: [],
        inhalt: [{ art: 'text', text: '...' }],
        danach: [],
      },
    ]);
    const b = formatBefund(l);
    expect(b?.meldung).toContain('ComplBodyDec');
    expect(b?.meldung).toContain('ArtChrIdent');
  });

  it('TextComplement innerhalb eines Absatzes: Text bleibt, Befund ergaenzung-nicht-oben', () => {
    const l = lies(datei(`<Text><p><span>a </span>${te}</p></Text>`));
    expect(alleBausteine(positionen(l)[0]?.langtext ?? []).some((b) => b.art === 'ergaenzung')).toBe(false);
    expect(JSON.stringify(positionen(l)[0]?.langtext)).toContain('Breite ');
    expect(l.befunde.map((b) => b.code)).toContain('ergaenzung-nicht-oben');
  });

  it('TextComplement ohne gültige Herkunft (Kind): Text bleibt als Absatz, Befund ergaenzung-ungueltig', () => {
    const l = lies(
      datei('<TextComplement MarkLbl="1"><ComplBody><span>x</span></ComplBody></TextComplement>'),
    );
    expect(positionen(l)[0]?.langtext).toEqual([{ art: 'absatz', inhalt: [{ art: 'text', text: 'x' }] }]);
    expect(l.befunde.map((b) => b.code)).toContain('ergaenzung-ungueltig');
  });
});

describe('Kurztext', () => {
  it('bleibt ein Einzeiler; Auszeichnung im Kurztext ist Befund', () => {
    const l = lies(datei('', '<p><span style="font-weight:bold;">Boden</span><br/><span>lösen</span></p>'));
    expect(positionen(l)[0]?.kurztext).toBe('Boden lösen');
    expect(formatBefund(l)?.meldung).toContain('Auszeichnung im Kurztext');
  });
});

// --- Golden aus der amtlichen AVA-X81 ----------------------------------------------------------------------

/** Bilddaten gekürzt, damit das Golden lesbar bleibt. */
const kuerze = (_k: string, v: unknown): unknown =>
  typeof v === 'string' && v.length > 80 && /^[A-Za-z0-9+/=]+$/.test(v)
    ? `${v.slice(0, 16)}… (${String(v.length)} Zeichen)`
    : v;

describe('Golden: Langtexte der AVA-X81 (Liste, Tabelle mit colspan, Textergänzung, Leitbeschreibung)', () => {
  it('stimmt mit testdaten/golden/ava-x81-langtext.golden.json überein', () => {
    const ps = positionen(lies(lesePfad(AVA_X81)));
    const mit = (art: string, f: (p: Position) => boolean = () => true): Position | undefined =>
      ps.find((p) => f(p) && alleBausteine(p.langtext).some((b) => b.art === art));
    const auswahl = {
      formatierungen: ps.find((p) => p.kurztext === 'Formatierungen'),
      liste: mit('liste'),
      tabelleMitColspan: ps.find((p) =>
        alleBausteine(p.langtext).some(
          (b) => b.art === 'tabelle' && b.zeilen.some((z) => z.zellen.some((c) => c.spalten > 1)),
        ),
      ),
      textergaenzungBieter: mit('ergaenzung', (p) => p.kurztext.startsWith('Position mit 3 TE Bieter')),
      leitbeschreibung: ps.find((p) => p.leitbeschreibung !== undefined),
    };
    const ist =
      JSON.stringify(
        Object.fromEntries(
          Object.entries(auswahl).map(([name, p]) => [
            name,
            p === undefined
              ? null
              : {
                  ordnungszahl: p.ordnungszahl,
                  kurztext: p.kurztext,
                  langtext: p.langtext,
                  ...(p.leitbeschreibung ? { leitbeschreibung: p.leitbeschreibung } : {}),
                },
          ]),
        ),
        kuerze,
        2,
      ) + '\n';
    const pfad = join(HIER, '..', 'testdaten', 'golden', 'ava-x81-langtext.golden.json');
    if (process.env['GOLDEN_UPDATE'] === '1') writeFileSync(pfad, ist);
    expect(existsSync(pfad), `Golden fehlt: ${pfad} (GOLDEN_UPDATE=1 setzen)`).toBe(true);
    expect(Object.values(auswahl).every((p) => p !== undefined)).toBe(true);
    expect(ist).toBe(readFileSync(pfad, 'utf8'));
  });

  it('formatierung-verworfen nennt nur noch nicht abgebildete Reste', () => {
    const b = formatBefund(lies(lesePfad(AVA_X81)));
    const arten = /\(([^)]*)\)\./.exec(b?.meldung ?? '')?.[1]?.split('; ') ?? [];
    expect(arten.length).toBeGreaterThan(0);
    for (const alt of ['Liste', 'Tabelle', 'Textergänzung (Art und Nummer der Kennzeichnung)'])
      expect(arten).not.toContain(alt);
    expect(arten.filter((a) => a.includes('style'))).toEqual([]);
  });
});

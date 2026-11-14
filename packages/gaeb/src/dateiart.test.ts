// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 136 Punkt 1: Dateiart am Inhalt erkennen (GAEB DA XML mit Version und Phase, GAEB 90, GAEB 2000, unbekannt), die
// Endung ist nur Hinweis. Seam: `erkenneGaebDatei`. Die GAEB-90- und GAEB-2000-Köpfe sind selbst geschrieben (C4): Sie prüfen
// das eigene Verständnis der Formate (feste Satzlänge mit Satzart vorn, Schlüsselwörter), nicht Dateien anderer Software (D-71).

import { describe, expect, it } from 'vitest';
import { erkenneGaebDatei } from './index';
import { lesePfad } from './testhilfen';

const AVA = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021';
const MUSTER_31 = 'fixtures/extern/gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001';

/** Kleinste DA-XML-Datei mit wählbarem Namensraum, Version und Award/DP. */
const mini = (ns: string | null, version: string | null, dp: string | null): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<GAEB${ns === null ? '' : ` xmlns="${ns}"`}>` +
  (version === null ? '' : `<GAEBInfo><Version>${version}</Version></GAEBInfo>`) +
  `<PrjInfo><NamePrj>Test</NamePrj></PrjInfo><Award>${dp === null ? '' : `<DP>${dp}</DP>`}<BoQ/></Award></GAEB>`;

/** Ein Satz einer Datei mit fester Satzlänge: Satzart (2 Stellen), Inhalt, Satznummer in den letzten 6 Stellen; 80 Zeichen. */
const satz = (art: string, inhalt: string, nummer: number): string =>
  `${art}${inhalt.padEnd(72, ' ')}${String(nummer).padStart(6, '0')}`;

const gaeb90 = (inhalt = 'Rohbau Musterhaus'): string =>
  [
    satz('00', '        Testkopf von Hand', 1),
    satz('01', inhalt, 2),
    satz('02', 'Projekt Muster', 3),
    satz('11', '01  Erdarbeiten', 4),
    satz('99', '', 5),
  ].join('\r\n') + '\r\n';

const gaeb2000 = (dp: string | null): string =>
  [
    '#begin[GAEB]',
    '#begin[GAEBInfo]',
    '[Version]1.2[end]',
    '#end[GAEBInfo]',
    '#begin[Award]',
    ...(dp === null ? [] : [`[DP]${dp}[end]`]),
    '#end[Award]',
    '#end[GAEB]',
  ].join('\r\n');

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const latin1 = (text: string): Uint8Array => Uint8Array.from(Buffer.from(text, 'latin1'));

describe('GAEB DA XML: Version und Phase aus dem Inhalt', () => {
  it('amtliche X83 3.3: DA XML, Version und Phase aus dem Inhalt, UTF-8', () => {
    const d = erkenneGaebDatei(
      lesePfad('fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83'),
      'Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83',
    );
    expect(d).toEqual({
      format: 'da-xml',
      version: '3.3',
      phase: 'X83',
      phasenquelle: 'inhalt',
      kodierung: 'utf-8',
    });
  });

  it('3.1 hat einen gemeinsamen Namensraum: die Phase kommt aus Award/DP, ohne Dateiname', () => {
    const d = erkenneGaebDatei(lesePfad(`${MUSTER_31}.X84`));
    expect([d.format, d.version, d.phase, d.phasenquelle]).toEqual(['da-xml', '3.1', 'X84', 'inhalt']);
  });

  it('die Endung ist nur Hinweis: eine X86 mit der Endung .x81 bleibt X86', () => {
    const d = erkenneGaebDatei(lesePfad(`${AVA}.X86`), 'falsch.x81');
    expect([d.phase, d.phasenquelle]).toEqual(['X86', 'inhalt']);
  });

  it('ohne Phase im Inhalt gilt die Endung als Hinweis', () => {
    const d = erkenneGaebDatei(mini(null, '3.3', null), 'lv.X83');
    expect([d.format, d.phase, d.phasenquelle]).toEqual(['da-xml', 'X83', 'endung']);
    const ohne = erkenneGaebDatei(mini(null, '3.3', null));
    expect([ohne.phase, ohne.phasenquelle]).toEqual([null, null]);
  });

  it('jede Phase X80 bis X89 am Namensraum und an Award/DP erkannt', () => {
    for (let n = 80; n <= 89; n++) {
      const ns = erkenneGaebDatei(mini(`http://www.gaeb.de/GAEB_DA_XML/DA${String(n)}/3.3`, '3.3', null));
      expect([ns.phase, ns.phasenquelle], `Namensraum DA${String(n)}`).toEqual([`X${String(n)}`, 'inhalt']);
      const dp = erkenneGaebDatei(mini('http://www.gaeb.de/GAEB_DA_XML/200407', '3.1', String(n)));
      expect([dp.phase, dp.version], `DP ${String(n)}`).toEqual([`X${String(n)}`, '3.1']);
    }
  });

  it('X31 (Mengenermittlung) wird erkannt', () => {
    const d = erkenneGaebDatei(
      lesePfad('fixtures/extern/bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x31'),
    );
    expect([d.format, d.version, d.phase]).toEqual(['da-xml', '3.3', 'X31']);
  });

  it('ältere Versionen werden im Wortlaut genannt', () => {
    const d = erkenneGaebDatei(mini(null, '3.0', '83'));
    expect([d.format, d.version, d.phase]).toEqual(['da-xml', '3.0', 'X83']);
  });

  it('Kodierung: Deklaration, Byte-Order-Mark und ungültiges UTF-8', () => {
    const iso = mini(null, '3.3', '83').replace('encoding="UTF-8"', 'encoding="ISO-8859-1"');
    expect(erkenneGaebDatei(latin1(iso.replace('Test', 'Stück'))).kodierung).toBe('iso-8859-1');
    const utf16 = Uint8Array.from([0xff, 0xfe, ...Buffer.from(mini(null, '3.3', '83'), 'utf16le')]);
    expect(erkenneGaebDatei(utf16)).toMatchObject({ format: 'da-xml', kodierung: 'utf-16le', phase: 'X83' });
    expect(erkenneGaebDatei(latin1(mini(null, '3.3', '83').replace('Test', 'Stück'))).kodierung).toBe(
      'windows-1252',
    );
  });

  it('Text statt Bytes: keine Kodierung', () => {
    expect(erkenneGaebDatei(mini(null, '3.3', '83')).kodierung).toBeNull();
  });
});

describe('GAEB 90 (feste Satzlänge, Satzarten)', () => {
  it('ein Kopf mit Sätzen zu 80 Zeichen ist GAEB 90; ohne Phase im Inhalt kommt sie aus der Endung', () => {
    const d = erkenneGaebDatei(bytes(gaeb90()), 'lv.d83');
    expect(d).toEqual({
      format: 'gaeb-90',
      version: null,
      phase: 'X83',
      phasenquelle: 'endung',
      kodierung: 'ascii',
    });
  });

  it('der Inhalt entscheidet, nicht die Endung: GAEB 90 mit der Endung .x83', () => {
    expect(erkenneGaebDatei(bytes(gaeb90()), 'lv.x83').format).toBe('gaeb-90');
    expect(erkenneGaebDatei(bytes(gaeb90())).phase).toBeNull();
  });

  it('Zeichensatz am Inhalt: DOS-Codepage (CP437/850) oder ISO-8859-1', () => {
    const dos = bytes(gaeb90('Rohbau Gebaeude'));
    dos[dos.indexOf('a'.charCodeAt(0), 90)] = 0x84; // ä in CP437/850
    expect(erkenneGaebDatei(dos, 'lv.D81')).toMatchObject({ format: 'gaeb-90', kodierung: 'cp850' });
    expect(erkenneGaebDatei(latin1(gaeb90('Rohbau Gebäude')), 'lv.d81').kodierung).toBe('iso-8859-1');
    expect(erkenneGaebDatei(bytes(gaeb90('Rohbau Gebäude')), 'lv.d81').kodierung).toBe('utf-8');
  });

  it('die Datenart in den Stellen 11 und 12 des Satzes 00 ist die Phase (Ticket 144, berichtigt D-136.2)', () => {
    const mitDa = [satz('00', '        83L', 1), satz('01', 'Rohbau', 2), satz('99', '', 3)].join('\r\n');
    const d = erkenneGaebDatei(bytes(mitDa), 'lv.d81');
    expect([d.format, d.phase, d.phasenquelle]).toEqual(['gaeb-90', 'X83', 'inhalt']);
  });

  it('vertragliche Regelungen (T0 … T9) vor dem Satz 00 sind erlaubt', () => {
    const mitT = [
      satz('T0', '', 1),
      satz('T1', 'Vorbemerkungen', 2),
      satz('T9', '', 3),
      satz('00', '        86L', 4),
    ];
    const d = erkenneGaebDatei(bytes(mitT.join('\r\n')), 'lv.d86');
    expect([d.format, d.phase, d.phasenquelle]).toEqual(['gaeb-90', 'X86', 'inhalt']);
  });

  it('ohne Satznummer in den Stellen 75 bis 80 kein GAEB 90', () => {
    const ohneNummer = gaeb90().replace(/[0-9]{6}\r\n/g, 'abcdef\r\n');
    expect(erkenneGaebDatei(bytes(ohneNummer), 'x.d83').format).toBeNull();
  });

  it('kein GAEB 90: zu lange Sätze, keine Satzart vorn oder kein Kopfsatz', () => {
    const lang = gaeb90().replace(
      satz('02', 'Projekt Muster', 3),
      `${satz('02', 'Projekt Muster', 3)}überlang`,
    );
    expect(erkenneGaebDatei(bytes(lang), 'x.d83').format).toBeNull();
    const ohneKopf = gaeb90().split('\r\n').slice(1).join('\r\n');
    expect(erkenneGaebDatei(bytes(ohneKopf), 'x.d83').format).toBeNull();
    expect(erkenneGaebDatei(bytes('Hallo Welt\r\n'), 'x.d83').format).toBeNull();
  });
});

describe('GAEB 2000 (Schlüsselwörter)', () => {
  it('ein Kopf mit #begin[…] ist GAEB 2000; die Phase steht in [DP]', () => {
    const d = erkenneGaebDatei(bytes(gaeb2000('86')), 'lv.p83');
    expect(d).toEqual({
      format: 'gaeb-2000',
      version: null,
      phase: 'X86',
      phasenquelle: 'inhalt',
      kodierung: 'ascii',
    });
  });

  it('ohne [DP] gilt die Endung als Hinweis', () => {
    const d = erkenneGaebDatei(bytes(gaeb2000(null)), 'lv.P84');
    expect([d.format, d.phase, d.phasenquelle]).toEqual(['gaeb-2000', 'X84', 'endung']);
  });
});

describe('unbekannt', () => {
  it('weder XML noch GAEB 90 noch GAEB 2000', () => {
    for (const inhalt of ['das ist kein XML', '', '%PDF-1.7\n', '{"json": true}'])
      expect(erkenneGaebDatei(bytes(inhalt), 'x.x83'), inhalt).toEqual({
        format: null,
        version: null,
        phase: null,
        phasenquelle: null,
        kodierung: 'ascii',
      });
  });

  it('XML, aber kein GAEB (anderes Wurzelelement)', () => {
    const d = erkenneGaebDatei('<?xml version="1.0"?><Invoice xmlns="urn:x"><ID>1</ID></Invoice>', 'r.xml');
    expect(d.format).toBeNull();
  });
});

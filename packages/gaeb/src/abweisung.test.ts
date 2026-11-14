// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 136 Punkt 2: Jede abgewiesene Version, Phase und Dateiart bekommt einen Satz, was die Datei ist und was stattdessen
// geht (B-10, B-11). Seams: `leseGaeb`, `leseAngebot`, `x31Lesen`. Die erwarteten Sätze sind die aus D-136.3.

import { describe, expect, it } from 'vitest';
import type { AngebotId, BieterId, GaebPhase, Leistungsverzeichnis, ProjektId } from '@tethys/vertrag';
import { leseAngebot, leseGaeb, x31Lesen } from './index';
import type { GaebBefund } from './index';
import { BVBS_MENGENERMITTLUNG, TEST_MWST, auftragsLvAus, lesePfad, testIds } from './testhilfen';

const lies = (eingabe: Uint8Array | string, dateiname?: string) =>
  leseGaeb(eingabe, {
    ids: testIds(),
    standardMwstSatz: TEST_MWST,
    ...(dateiname === undefined ? {} : { dateiname }),
  });

const AVA_X81 = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81';

function lvAus(bytes: Uint8Array): Leistungsverzeichnis {
  const l = lies(bytes);
  if (l.inhalt === null) throw new Error('LV nicht lesbar');
  const { wurzelId, knoten, ...kopf } = l.inhalt;
  return { ...kopf, id: wurzelId, projektId: 'projekt-1' as ProjektId, knoten };
}
const LV = lvAus(lesePfad(AVA_X81));
const angebot = (eingabe: Uint8Array | string, dateiname?: string) =>
  leseAngebot(eingabe, {
    lv: LV,
    angebotId: 'angebot-1' as AngebotId,
    bieterId: 'bieter-1' as BieterId,
    ...(dateiname === undefined ? {} : { dateiname }),
  });
const AUFTRAG = auftragsLvAus(lesePfad(`${BVBS_MENGENERMITTLUNG}.x86`));

/** Kleinste DA-XML-Datei der Phase mit einer Position (für den LV-Leser lesbar, wenn die Phase passt). */
const datei = (phase: string, version = '3.3'): string =>
  `<?xml version="1.0" encoding="UTF-8"?><GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA${phase.slice(1)}/${version}">` +
  `<GAEBInfo><Version>${version}</Version></GAEBInfo><Award><DP>${phase.slice(1)}</DP><BoQ><BoQInfo>` +
  '<BoQBkdn><Type>Item</Type><Length>4</Length><Num>Yes</Num></BoQBkdn></BoQInfo><BoQBody><Itemlist>' +
  '<Item ID="a" RNoPart="0010"><Qty>1.000</Qty><QU>St</QU></Item></Itemlist></BoQBody></BoQ></Award></GAEB>';

const satz = (art: string, inhalt: string, nummer: number): string =>
  `${art}${inhalt.padEnd(72, ' ')}${String(nummer).padStart(6, '0')}`;
const GAEB_90 = [satz('00', '        Testkopf von Hand', 1), satz('01', 'Rohbau', 2), satz('99', '', 3)].join(
  '\r\n',
);
const GAEB_2000 = ['#begin[GAEB]', '#begin[Award]', '[DP]83[end]', '#end[Award]', '#end[GAEB]'].join('\r\n');

const einziger = (befunde: readonly GaebBefund[], code: string): GaebBefund => {
  const b = befunde.filter((x) => x.code === code);
  expect(b, `genau ein ${code}: ${befunde.map((x) => x.code).join(', ')}`).toHaveLength(1);
  return b[0] as GaebBefund;
};

/** Ein Satz für Nutzer: keine Codes, keine Funktions- oder Paketnamen, keine Ticketnummern (L5). */
function nutzersprache(meldung: string): void {
  expect(meldung).not.toMatch(/\b[a-z]+(?:-[a-z]+)+\b/); // Code wie phase-nicht-unterstuetzt
  expect(meldung).not.toMatch(/lese[A-Z]|x31Lesen|Vertrag|@tethys|Ticket|\b[GDE]-\d/);
}

describe('LV-Leser: jede Phase X80 bis X89 und X31', () => {
  const GELESEN = ['X81', 'X83', 'X86'];
  const SATZ: Readonly<Record<string, string>> = {
    // X80 und X87: Bedeutung nach der Fachdokumentation DA XML 3.3 auf gaeb.de (Ticket 144, D-86).
    X80:
      'Die Datei ist ein Austausch universeller LV-Daten (X80). Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 ' +
      'und X86.',
    X82: 'Die Datei ist ein Kostenansatz (X82). Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.',
    X84:
      'Die Datei ist eine Angebotsabgabe (X84). Ein Angebot wird bei dem Leistungsverzeichnis eingelesen, auf das es sich ' +
      'bezieht. Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.',
    X85:
      'Die Datei ist ein Nebenangebot (X85). Nebenangebote werden nicht eingelesen. Eingelesen werden ' +
      'Leistungsverzeichnisse der Phasen X81, X83 und X86.',
    X87: 'Die Datei ist eine Auftragsbestätigung (X87). Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.',
    X88:
      'Die Datei gehört zur Austauschphase X88; Dateien dieser Phase werden nicht eingelesen. ' +
      'Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.',
    X89:
      'Die Datei ist eine Rechnung (X89). Rechnungen im GAEB-Format werden nicht eingelesen; eine Rechnung lässt sich als ' +
      'XRechnung einlesen. Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.',
    X31:
      'Die Datei ist eine Mengenermittlung (X31). Eine Mengenermittlung wird bei der Abrechnung eines Auftrags eingelesen. ' +
      'Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.',
  };

  for (const phase of ['X80', 'X81', 'X82', 'X83', 'X84', 'X85', 'X86', 'X87', 'X88', 'X89', 'X31'] as const)
    it(`${phase}: ${GELESEN.includes(phase) ? 'gelesen' : 'abgewiesen mit Satz'}`, () => {
      const l = lies(datei(phase));
      expect([l.phase, l.version, l.format]).toEqual([phase, '3.3', 'da-xml']);
      if (GELESEN.includes(phase)) {
        expect(l.inhalt).not.toBeNull();
        expect(l.befunde.map((b) => b.code)).not.toContain('phase-nicht-unterstuetzt');
        return;
      }
      expect(l.inhalt).toBeNull();
      const b = einziger(l.befunde, 'phase-nicht-unterstuetzt');
      expect(b.schwere).toBe('fehler');
      expect(b.meldung).toBe(SATZ[phase]);
      expect(b.werte).toEqual({ phase: { art: 'text', wert: phase } });
      nutzersprache(b.meldung);
    });

  it('X80, X87 und X88 werden nicht mehr wie ein LV gelesen, auch wenn nur Award/DP sie nennt', () => {
    for (const n of ['80', '87', '88']) {
      const l = lies(datei(`X${n}`).replace(/ xmlns="[^"]*"/, ''));
      expect(l.phase).toBe(`X${n}`);
      expect(l.inhalt).toBeNull();
      expect(l.befunde.map((b) => b.code)).not.toContain('phase-ungueltig');
    }
  });
});

describe('Angebotsleser und Mengenermittlung: die falsche Phase', () => {
  it('ein LV ist kein Angebot: der Satz sagt, wohin es gehört', () => {
    const l = angebot(lesePfad(AVA_X81));
    expect(l.befehl).toBeNull();
    expect(einziger(l.befunde, 'phase-nicht-unterstuetzt').meldung).toBe(
      'Die Datei ist eine Leistungsbeschreibung (X81). Ein Leistungsverzeichnis wird als GAEB-Datei in ein Projekt ' +
        'eingelesen. Als Angebot wird eine Angebotsabgabe (X84) eingelesen.',
    );
  });

  it('ein Nebenangebot (X85) wird mit Satz abgewiesen', () => {
    const b = einziger(angebot(datei('X85')).befunde, 'phase-nicht-unterstuetzt');
    expect(b.meldung).toBe(
      'Die Datei ist ein Nebenangebot (X85). Nebenangebote werden nicht eingelesen. Als Angebot wird eine ' +
        'Angebotsabgabe (X84) eingelesen.',
    );
  });

  it('jede andere Phase im Angebotsleser und in der Mengenermittlung hat einen Satz in Nutzersprache', () => {
    const phasen: readonly GaebPhase[] = [
      'X80',
      'X81',
      'X82',
      'X83',
      'X85',
      'X86',
      'X87',
      'X88',
      'X89',
      'X31',
    ];
    for (const phase of phasen) {
      const a = einziger(angebot(datei(phase)).befunde, 'phase-nicht-unterstuetzt');
      expect(a.meldung).toContain(phase);
      expect(a.meldung.endsWith('Als Angebot wird eine Angebotsabgabe (X84) eingelesen.')).toBe(true);
      nutzersprache(a.meldung);
    }
    for (const phase of [...phasen.filter((p) => p !== 'X31'), 'X84'] as const) {
      const m = einziger(x31Lesen(datei(phase), AUFTRAG).befunde, 'phase-nicht-unterstuetzt');
      expect(m.meldung.endsWith('Bei der Abrechnung wird eine Mengenermittlung (X31) eingelesen.')).toBe(
        true,
      );
      nutzersprache(m.meldung);
    }
  });

  it('eine Auftragserteilung in der Mengenermittlung: wohin sie gehört', () => {
    const l = x31Lesen(lesePfad(`${BVBS_MENGENERMITTLUNG}.x86`), AUFTRAG);
    expect(l.aufmass).toBeNull();
    expect(einziger(l.befunde, 'phase-nicht-unterstuetzt').meldung).toBe(
      'Die Datei ist eine Auftragserteilung (X86). Ein Leistungsverzeichnis wird als GAEB-Datei in ein Projekt ' +
        'eingelesen. Bei der Abrechnung wird eine Mengenermittlung (X31) eingelesen.',
    );
  });
});

describe('Versionen und Formate', () => {
  it('GAEB DA XML älter als 3.1: Satz mit den gelesenen Versionen und was stattdessen geht', () => {
    const l = lies(datei('X83', '3.0').replace(/ xmlns="[^"]*"/, ''));
    expect(l.inhalt).toBeNull();
    const b = einziger(l.befunde, 'version-nicht-unterstuetzt');
    expect(b.meldung).toBe(
      'Die Datei ist GAEB DA XML 3.0. Gelesen werden die Versionen 3.1, 3.2 und 3.3; die Software, aus der die Datei ' +
        'stammt, kann sie in der Regel in einer dieser Versionen ausgeben.',
    );
    expect(b.werte).toEqual({
      version: { art: 'text', wert: '3.0' },
      format: { art: 'text', wert: 'GAEB DA XML' },
    });
    expect(l.format).toBe('da-xml');
  });

  it('GAEB 90 wird als LV gelesen (Ticket 144); Angebots- und Mengenleser weisen eine GAEB-90-LV-Datei mit Satz ab', () => {
    for (const l of [lies(GAEB_90, 'lv.d83'), lies(new TextEncoder().encode(GAEB_90), 'lv.D83')]) {
      expect([l.format, l.phase, l.version]).toEqual(['gaeb-90', 'X83', null]);
      expect(l.befunde.map((b) => b.code)).not.toContain('format-nicht-unterstuetzt');
    }
    const a = angebot(GAEB_90, 'lv.d83');
    expect([a.format, a.befehl]).toEqual(['gaeb-90', null]);
    expect(einziger(a.befunde, 'phase-nicht-unterstuetzt').meldung).toBe(
      'Die Datei ist eine Angebotsaufforderung (X83). Ein Leistungsverzeichnis wird als GAEB-Datei in ein Projekt ' +
        'eingelesen. Als Angebot wird eine Angebotsabgabe (X84) eingelesen.',
    );
    const m = x31Lesen(GAEB_90, AUFTRAG, { dateiname: 'm.d83' });
    expect([m.format, m.aufmass]).toEqual(['gaeb-90', null]);
    const b = einziger(m.befunde, 'format-nicht-unterstuetzt');
    expect(b.meldung).toBe(
      'Die Datei ist im Format GAEB 90 (Phase X83). Dieses Format wird nicht gelesen; die Software, aus der die Datei ' +
        'stammt, kann sie in der Regel als GAEB DA XML ausgeben (Endung .x83). Bei der Abrechnung wird eine ' +
        'Mengenermittlung im Format GAEB DA XML eingelesen (Endung .x31).',
    );
    expect(b.werte).toEqual({
      format: { art: 'text', wert: 'GAEB 90' },
      phase: { art: 'text', wert: 'X83' },
    });
    nutzersprache(b.meldung);
  });

  it('GAEB 2000 in allen drei Lesern: erkannt und mit Satz abgewiesen', () => {
    const lv = lies(GAEB_2000, 'lv.p83');
    expect([lv.format, lv.phase, lv.inhalt]).toEqual(['gaeb-2000', 'X83', null]);
    expect(einziger(lv.befunde, 'format-nicht-unterstuetzt').meldung).toContain(
      'im Format GAEB 2000 (Phase X83)',
    );
    const a = angebot(GAEB_2000, 'a.p84');
    expect([a.format, a.befehl]).toEqual(['gaeb-2000', null]);
    const am = einziger(a.befunde, 'format-nicht-unterstuetzt').meldung;
    expect(am).toContain('im Format GAEB 2000 (Phase X83)');
    expect(
      am.endsWith(
        'Als Angebot wird eine Angebotsabgabe im Format GAEB DA XML (Endung .x84) oder GAEB 90 (Endung .d84) eingelesen.',
      ),
    ).toBe(true);
    const m = x31Lesen(GAEB_2000, AUFTRAG, { dateiname: 'm.p31' });
    expect([m.format, m.aufmass]).toEqual(['gaeb-2000', null]);
    nutzersprache(einziger(m.befunde, 'format-nicht-unterstuetzt').meldung);
  });

  it('weder GAEB DA XML noch GAEB 90 oder 2000: ein Satz statt „kein XML-Element“', () => {
    const l = lies(new TextEncoder().encode('das ist kein XML'), 'kaputt.x83');
    expect(l.inhalt).toBeNull();
    expect('format' in l).toBe(false);
    expect(l.befunde.map((b) => b.code)).toEqual(['dateiart-unbekannt']);
    expect(l.befunde[0]?.meldung).toBe(
      'Die Datei ist keine GAEB-Datei (weder GAEB DA XML noch GAEB 90 oder GAEB 2000). Eingelesen werden ' +
        'Leistungsverzeichnisse im Format GAEB DA XML (Endungen .x81, .x83 und .x86) und GAEB 90 (Endungen .d81, .d83 und ' +
        '.d86).',
    );
  });

  it('XML mit einem anderen obersten Element: ein Satz, der das Element nennt', () => {
    const l = angebot('<?xml version="1.0"?><Invoice><ID>1</ID></Invoice>');
    const b = einziger(l.befunde, 'wurzel-unerwartet');
    expect(b.meldung).toBe(
      'Die Datei ist eine XML-Datei, aber keine GAEB-Datei (ihr oberstes Element heißt „Invoice“). Als Angebot wird eine ' +
        'Angebotsabgabe im Format GAEB DA XML (Endung .x84) oder GAEB 90 (Endung .d84) eingelesen.',
    );
    expect(b.werte).toEqual({ element: { art: 'text', wert: 'Invoice' } });
  });

  it('gelesene Dateien nennen ihr Format', () => {
    expect(lies(lesePfad(AVA_X81)).format).toBe('da-xml');
    expect(
      angebot(lesePfad('fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84')).format,
    ).toBe('da-xml');
    expect(x31Lesen(lesePfad(`${BVBS_MENGENERMITTLUNG}.x31`), AUFTRAG).format).toBe('da-xml');
  });
});

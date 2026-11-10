// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Einheitspreis, KnotenId, LvZustand, Menge, Positionsdaten, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { lvAnsichtBauen } from './ansicht';
import { lvSitzung, projektSitzung, type LvSitzung } from './befehlsweg';
import { positionOrt, titelOrt, untertitelOrt } from './einfuegeort';
import { ozMaskeLesen } from './ozmaske';
import { gridZahlen } from './zahlen';

const maske = (() => {
  const r = ozMaskeLesen('NN.NN.NNNN[I]');
  if (!r.ok) throw new Error(r.fehler);
  return r.wert;
})();

const daten = (kurztext: string, menge: string, einheit: string, ep: string): Positionsdaten => ({
  ordnungszahl: null,
  ozIndex: null,
  merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
  zuschlag: null,
  kurztext,
  langtext: [],
  menge: menge as Menge,
  einheit,
  einheitspreis: ep as Einheitspreis,
  epa: null,
});

const lv = (s: LvSitzung): LvZustand => {
  if (s.zustand === null) throw new Error('kein LV');
  return s.zustand;
};

/**
 * Baut den M1-Ablauf über die Orte der Schaltflächen nach: Titel, Untertitel, Titel auf derselben Ebene, Positionen
 * hinter der aktiven Zeile, Umnummerieren. Erwartete Werte aus Ticket 39 (Fixture `typisch`).
 */
async function m1Lv() {
  const u = testUmgebung(await speicherImSpeicher());
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'P', 'B'));
  const projekt = (p.ok ? p.zustand : null) as Projekt;
  const s = lvSitzung(u, projekt.id, null);
  await s.befehl(lvAnlegenBefehl(u.ids, projekt.id, 'LV', maske));
  const titel = async (ort: 'titel' | 'untertitel', aktiv: KnotenId | null, kurztext: string) => {
    const id = u.ids.titel();
    const z = lv(s).leistungsverzeichnis;
    await s.befehl({
      art: 'GliederungAnlegen',
      id,
      gliederungsart: 'titel',
      ort: ort === 'titel' ? titelOrt(z, aktiv) : untertitelOrt(z, aktiv),
      kurztext,
    });
    return id;
  };
  const position = async (aktiv: KnotenId, d: Positionsdaten) => {
    const id = u.ids.position();
    await s.befehl({ art: 'PositionAnlegen', id, ort: positionOrt(lv(s).leistungsverzeichnis, aktiv), daten: d });
    return id;
  };
  const t01 = await titel('titel', null, 'Baustelle');
  const t0101 = await titel('untertitel', t01, 'Einrichtung');
  const t0102 = await titel('titel', t0101, 'Entsorgung');
  let a: KnotenId = await position(t0101, daten('Baustelle einrichten', '1.000', 'psch', '1850.000'));
  a = await position(a, daten('Bauzaun stellen', '86.500', 'm', '7.450'));
  await position(a, daten('Baustrom und Bauwasser', '4.000', 'Mon', '215.500'));
  a = await position(t0102, daten('Bauschutt entsorgen', '3.000', 'St', '389.990'));
  await position(a, daten('Grundstück räumen', '410.750', 'm²', '2.380'));
  const r = await s.befehl({ art: 'Umnummerieren', teilbaumId: lv(s).leistungsverzeichnis.id });
  if (!r.ok) throw new Error(JSON.stringify(r.abweisung));
  return { s, t01, t0101, t0102 };
}

describe('LV-Ansicht aus dem Zustand', () => {
  it('zeigt den Baum in Dokumentreihenfolge mit Tiefe, OZ und Summen aus dem Kern', async () => {
    const { s } = await m1Lv();
    const ansicht = lvAnsichtBauen(lv(s), new Set());
    const zeilen = ansicht.zeilen.map((z) => [
      z.tiefe,
      z.knoten.art === 'hinweis' ? '' : z.knoten.ordnungszahl,
      z.summe === null ? null : gridZahlen.formatBetrag(z.summe),
    ]);
    expect(zeilen).toEqual([
      [0, '01', '5.503,99'],
      [1, '01.01', '3.356,43'],
      [2, '01.01.0010', '1.850,00'],
      [2, '01.01.0020', '644,43'],
      [2, '01.01.0030', '862,00'],
      [1, '01.02', '2.147,56'],
      [2, '01.02.0010', '1.169,97'],
      [2, '01.02.0020', '977,59'],
    ]);
    expect(ansicht.wurzelId).toBe(lv(s).leistungsverzeichnis.id);
    expect(ansicht.gesamt?.netto).toBe('5503.99');
    expect(ansicht.zeilen.filter((z) => z.knoten.art === 'position').every((z) => z.gehtInSummeEin)).toBe(true);
  });

  it('zugeklappte Gliederungen verbergen ihren Unterbaum und bleiben selbst sichtbar', async () => {
    const { s, t0101 } = await m1Lv();
    const ansicht = lvAnsichtBauen(lv(s), new Set([t0101]));
    expect(ansicht.zeilen.map((z) => z.knoten.art === 'hinweis' || z.knoten.ordnungszahl)).toEqual([
      '01',
      '01.01',
      '01.02',
      '01.02.0010',
      '01.02.0020',
    ]);
    const zeile = ansicht.zeilen[1];
    expect(zeile?.hatUnterknoten && !zeile.aufgeklappt).toBe(true);
  });

  it('Untertitel am Ende der Gliederung, Titel auf derselben Ebene, leeres LV an der Wurzel', async () => {
    const { s, t01, t0102 } = await m1Lv();
    const z = lv(s).leistungsverzeichnis;
    expect(titelOrt(z, null)).toEqual({ art: 'ende', elternId: z.id });
    expect(titelOrt(z, t01)).toEqual({ art: 'ende', elternId: z.id });
    expect(titelOrt(z, t0102)).toEqual({ art: 'ende', elternId: t01 });
    expect(untertitelOrt(z, t0102)).toEqual({ art: 'ende', elternId: t0102 });
    const position = z.knoten.find((k) => k.art === 'position' && k.elternId === t0102);
    expect(position && untertitelOrt(z, position.id)).toEqual({ art: 'ende', elternId: t0102 });
    expect(position && titelOrt(z, position.id)).toEqual({ art: 'ende', elternId: t01 });
    expect(positionOrt(z, null)).toEqual({ art: 'ende', elternId: z.id });
  });
});

describe('Zahlenränder des Grids (N4)', () => {
  it('liest und schreibt de-DE über dezimal', () => {
    expect(gridZahlen.parseMenge('86,5')).toEqual({ ok: true, wert: '86.500' });
    expect(gridZahlen.parseEinheitspreis('1.850')).toEqual({ ok: true, wert: '1850.000' });
    expect(gridZahlen.formatEinheitspreis('1850.000' as Einheitspreis)).toBe('1.850,000');
  });

  it('meldet Fehler auf Deutsch und rundet nie still', () => {
    const r = gridZahlen.parseMenge('1,2345');
    expect(r).toEqual({ ok: false, fehler: 'Eine Menge hat höchstens 3 Nachkommastellen.' });
    expect(gridZahlen.parseEinheitspreis('12.34').ok).toBe(false);
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests (Handrechnung, aus N2 herleitbar) und Fehlerfälle. Zuerst geschrieben (Q1).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Betrag, Einheitspreis, Menge, Prozent } from '@tethys/vertrag';
import {
  NULL_BETRAG,
  NULL_EINHEITSPREIS,
  NULL_MENGE,
  NULL_PROZENT,
  addiere,
  alsBetrag,
  alsDezimal,
  alsEinheitspreis,
  alsMenge,
  alsProzent,
  formatiereBetragDe,
  formatiereMengeDe,
  gesamtpreis,
  leseAustausch,
  multipliziere,
  negiere,
  parseBetragDe,
  parseEinheitspreisDe,
  parseMengeDe,
  parseProzentDe,
  prozentVon,
  rundeAufGanzzahl,
  rundeAufStellen,
  runden,
  subtrahiere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from './index';

/** Test-Hilfe: Wert ist garantiert gültig, sonst schlägt der Test fehl. */
function ok<T>(e: { ok: true; wert: T } | { ok: false; fehler: unknown }): T {
  if (!e.ok) throw new Error(`unerwarteter Fehler: ${JSON.stringify(e.fehler)}`);
  return e.wert;
}
const m = (s: string): Menge => ok(alsMenge(s));
const ep = (s: string): Einheitspreis => ok(alsEinheitspreis(s));
const b = (s: string): Betrag => ok(alsBetrag(s));
const p = (s: string): Prozent => ok(alsProzent(s));
const d = (s: string) => ok(alsDezimal(s));

describe('Golden: Handrechnung', () => {
  it('1,235 × 10,00 = 12,35 und 3,333 × 4,56 = 15,19848 → 15,20', () => {
    expect(multipliziere(m('1.235'), ep('10.000'))).toBe('12.350000');
    expect(gesamtpreis(m('1.235'), ep('10.000'))).toBe('12.35');
    expect(multipliziere(m('3.333'), ep('4.560'))).toBe('15.198480');
    expect(gesamtpreis(m('3.333'), ep('4.560'))).toBe('15.20');
  });

  it('Rundung auf 0 Stellen: 2,5 → 3 und 2,4 → 2', () => {
    expect(rundeAufGanzzahl(d('2.5'))).toBe(3n);
    expect(rundeAufGanzzahl(d('2.4'))).toBe(2n);
    expect(rundeAufGanzzahl(d('0.5'))).toBe(1n);
    expect(rundeAufGanzzahl(d('0.49999'))).toBe(0n);
  });

  it('half-up auf die Stelle genau, auch bei langer Nachkommafolge', () => {
    expect(rundeAufStellen(d('13.3749'), 2)).toBe('13.37');
    expect(rundeAufStellen(d('13.3750'), 2)).toBe('13.38');
    expect(rundeAufStellen(d('0.0049999999'), 2)).toBe('0.00');
    expect(rundeAufStellen(d('0.005'), 2)).toBe('0.01');
    expect(rundeAufStellen(d('999.995'), 2)).toBe('1000.00');
  });

  it('Rundung auf Typskala', () => {
    expect(runden(d('15.198480'), 'betrag')).toBe('15.20');
    expect(runden(d('1.2345'), 'menge')).toBe('1.235');
    expect(runden(d('1.2'), 'betrag')).toBe('1.20');
  });

  it('Handbeispiele aus den Fixtures', () => {
    const f = JSON.parse(readFileSync(new URL('../../../fixtures/handbeispiele.json', import.meta.url), 'utf8')) as {
      gesamtpreise: { menge: string; einheitspreis: string; exakt: string; gp: string }[];
      summenketten: {
        netto: string;
        nachlass: { art: 'prozent'; wert: string } | null;
        mwstSatz: string;
        soll: { nachlass: string; nettoNachNachlass: string; mwst: string; brutto: string };
      }[];
    };
    expect(f.gesamtpreise.length).toBeGreaterThan(0);
    for (const z of f.gesamtpreise) {
      expect(multipliziere(m(z.menge), ep(z.einheitspreis))).toBe(z.exakt);
      expect(gesamtpreis(m(z.menge), ep(z.einheitspreis))).toBe(z.gp);
    }
    expect(f.summenketten.length).toBeGreaterThan(0);
    for (const k of f.summenketten) {
      const netto = b(k.netto);
      const nachlass = k.nachlass ? prozentVon(netto, p(k.nachlass.wert)) : NULL_BETRAG;
      expect(nachlass).toBe(k.soll.nachlass);
      const nach = subtrahiere(netto, nachlass);
      expect(nach).toBe(k.soll.nettoNachNachlass);
      const mwst = prozentVon(nach, p(k.mwstSatz));
      expect(mwst).toBe(k.soll.mwst);
      expect(addiere(nach, mwst)).toBe(k.soll.brutto);
    }
  });
});

describe('Negative Werte: Betrag des Werts runden, Vorzeichen zurücksetzen (DIN 1333)', () => {
  it('−13,3749 → −13,37 und −13,3750 → −13,38; −1,25 auf 1 Stelle → −1,3', () => {
    expect(rundeAufStellen(d('-13.3749'), 2)).toBe('-13.37');
    expect(rundeAufStellen(d('-13.3750'), 2)).toBe('-13.38');
    expect(rundeAufStellen(d('-1.25'), 1)).toBe('-1.3');
    expect(rundeAufStellen(d('1.15'), 1)).toBe('1.2');
    expect(rundeAufGanzzahl(d('-2.5'))).toBe(-3n);
  });

  it('negative Null entsteht nie', () => {
    expect(rundeAufStellen(d('-0.004'), 2)).toBe('0.00');
    expect(runden(d('-0.004'), 'betrag')).toBe('0.00');
    expect(negiere(NULL_BETRAG)).toBe('0.00');
    expect(subtrahiere(b('1.00'), b('1.00'))).toBe('0.00');
  });

  it('Abzugsposition: Gesamtpreis negativer Menge', () => {
    expect(gesamtpreis(m('-2.500'), ep('0.010'))).toBe('-0.03');
    expect(gesamtpreis(m('-1.235'), ep('10.000'))).toBe('-12.35');
    expect(prozentVon(b('-402.73'), p('3.00'))).toBe('-12.08');
  });
});

describe('Betragsrechnung', () => {
  it('Null-Konstanten tragen die Typskala', () => {
    expect(NULL_MENGE).toBe('0.000');
    expect(NULL_EINHEITSPREIS).toBe('0.000');
    expect(NULL_BETRAG).toBe('0.00');
    expect(NULL_PROZENT).toBe('0.00');
  });

  it('addieren, subtrahieren, vergleichen, summieren', () => {
    expect(addiere(b('0.10'), b('0.20'))).toBe('0.30');
    expect(subtrahiere(b('0.10'), b('0.20'))).toBe('-0.10');
    expect(vergleiche(b('1.00'), b('2.00'))).toBe(-1);
    expect(vergleiche(b('-1.00'), b('-2.00'))).toBe(1);
    expect(vergleiche(b('1.00'), b('1.00'))).toBe(0);
    expect(vorzeichen(b('-0.01'))).toBe(-1);
    expect(vorzeichen(NULL_BETRAG)).toBe(0);
    expect(summiereBetraege([])).toBe('0.00');
    expect(summiereBetraege([b('12.35'), b('15.20'), b('-0.55')])).toBe('27.00');
  });

  it('Summe kennt kein Gleitkommaproblem', () => {
    expect(summiereBetraege(Array.from({ length: 10 }, () => b('0.10')))).toBe('1.00');
  });
});

describe('Kanonische Konstruktoren', () => {
  it('nehmen nur die Skala des Typs an', () => {
    expect(alsBetrag('12.35').ok).toBe(true);
    expect(alsMenge('10.000').ok).toBe(true);
    expect(alsBetrag('12.350')).toMatchObject({ ok: false, fehler: { code: 'falsche-nachkommastellen' } });
    expect(alsMenge('10.00')).toMatchObject({ ok: false, fehler: { code: 'falsche-nachkommastellen' } });
    expect(alsEinheitspreis('1.2')).toMatchObject({ ok: false });
    expect(alsProzent('19.0')).toMatchObject({ ok: false });
  });

  it.each([
    '',
    ' ',
    'abc',
    '1,5',
    '1.2.3',
    '1',
    '.5',
    '5.',
    '+1.00',
    '01.00',
    '1.00e2',
    '-0.00',
    '1 000.00',
    '1.000,00',
    ' 1.00',
    '1.00\n',
    '--1.00',
    'NaN',
    'Infinity',
  ])('lehnt nicht kanonisches %j ab (Fehlerwert, keine Ausnahme)', (s) => {
    expect(alsDezimal(s).ok).toBe(false);
  });

  it('Fehlercodes', () => {
    expect(alsDezimal('')).toMatchObject({ ok: false, fehler: { code: 'leer' } });
    expect(alsDezimal('abc')).toMatchObject({ ok: false, fehler: { code: 'ungueltiges-format' } });
  });

  it('akzeptiert Negatives, Null und sehr große Werte', () => {
    expect(alsBetrag('-12.35').ok).toBe(true);
    expect(alsBetrag('0.00').ok).toBe(true);
    expect(alsBetrag('100000000000000000000000.01').ok).toBe(true);
  });
});

describe('de-DE parsen und formatieren (nur Rand, N4)', () => {
  it('formatiert mit Tausenderpunkt, Dezimalkomma und allen Nullen', () => {
    expect(formatiereBetragDe(b('1072.55'))).toBe('1.072,55');
    expect(formatiereBetragDe(b('0.50'))).toBe('0,50');
    expect(formatiereBetragDe(b('-1234567.00'))).toBe('-1.234.567,00');
    expect(formatiereMengeDe(m('12.000'))).toBe('12,000');
  });

  it('parst deutsche Eingaben', () => {
    expect(parseBetragDe('1.072,55')).toEqual({ ok: true, wert: '1072.55' });
    expect(parseBetragDe('1072,55')).toEqual({ ok: true, wert: '1072.55' });
    expect(parseBetragDe('12,5')).toEqual({ ok: true, wert: '12.50' });
    expect(parseBetragDe('12')).toEqual({ ok: true, wert: '12.00' });
    expect(parseBetragDe('-3,10')).toEqual({ ok: true, wert: '-3.10' });
    expect(parseBetragDe(' 3,10 ')).toEqual({ ok: true, wert: '3.10' });
    expect(parseMengeDe('1.235')).toEqual({ ok: true, wert: '1235.000' }); // Tausenderpunkt, kein Dezimalpunkt
    expect(parseMengeDe('1,235')).toEqual({ ok: true, wert: '1.235' });
    expect(parseEinheitspreisDe('4,56')).toEqual({ ok: true, wert: '4.560' });
    expect(parseProzentDe('19')).toEqual({ ok: true, wert: '19.00' });
    expect(parseBetragDe('-0,00')).toEqual({ ok: true, wert: '0.00' });
    expect(parseBetragDe(',5')).toEqual({ ok: true, wert: '0.50' });
  });

  it.each(['', '   ', 'abc', '1,2,3', '1.2,3.4', '1..000,00', '12.34', '1.00', '1,', '--1', '1e3', '1 000,00', '+1,00'])(
    'lehnt %j ab',
    (s) => {
      expect(parseBetragDe(s).ok).toBe(false);
    },
  );

  it('lehnt mehr Nachkommastellen als die Skala ab, statt still zu runden', () => {
    expect(parseBetragDe('1,234')).toMatchObject({ ok: false, fehler: { code: 'zu-viele-nachkommastellen' } });
    expect(parseProzentDe('19,001')).toMatchObject({ ok: false });
    expect(parseBetragDe('1,230')).toMatchObject({ ok: false }); // auch mit Nullen: kein Raten
  });
});

describe('Toleranter Leser für Austauschformate (Punktnotation)', () => {
  it('kanonische Eingabe: keine Hinweise', () => {
    expect(leseAustausch('betrag', '12.35')).toEqual({ ok: true, wert: '12.35', hinweise: [] });
  });

  it('weniger Nachkommastellen: auffüllen', () => {
    expect(leseAustausch('menge', '12.5')).toEqual({
      ok: true,
      wert: '12.500',
      hinweise: [{ code: 'nachkommastellen-aufgefuellt', original: '12.5' }],
    });
    expect(leseAustausch('menge', '12')).toMatchObject({ ok: true, wert: '12.000' });
  });

  it('mehr Nachkommastellen: nur Nullen abschneiden, sonst runden und melden', () => {
    expect(leseAustausch('betrag', '12.3500')).toEqual({
      ok: true,
      wert: '12.35',
      hinweise: [{ code: 'nullen-abgeschnitten', original: '12.3500' }],
    });
    expect(leseAustausch('betrag', '12.3451')).toEqual({
      ok: true,
      wert: '12.35',
      hinweise: [{ code: 'gerundet', original: '12.3451' }],
    });
    expect(leseAustausch('betrag', '-12.345')).toMatchObject({ ok: true, wert: '-12.35' });
  });

  it('führende Nullen, Plus und fehlende Ziffern vor/nach dem Punkt', () => {
    expect(leseAustausch('betrag', '007.50')).toMatchObject({
      ok: true,
      wert: '7.50',
      hinweise: [{ code: 'fuehrende-nullen-entfernt' }],
    });
    expect(leseAustausch('betrag', '+7.50')).toMatchObject({
      ok: true,
      wert: '7.50',
      hinweise: [{ code: 'plus-entfernt' }],
    });
    expect(leseAustausch('betrag', '.5')).toMatchObject({ ok: true, wert: '0.50' });
    expect(leseAustausch('betrag', '5.')).toMatchObject({ ok: true, wert: '5.00' });
    expect(leseAustausch('betrag', '-0.00')).toMatchObject({ ok: true, wert: '0.00' });
  });

  it('Dezimalkomma wird gelesen und ausdrücklich gemeldet', () => {
    expect(leseAustausch('betrag', '12,5')).toEqual({
      ok: true,
      wert: '12.50',
      hinweise: [
        { code: 'dezimalkomma', original: '12,5' },
        { code: 'nachkommastellen-aufgefuellt', original: '12,5' },
      ],
    });
  });

  it('Unlesbares: Fehlerwert', () => {
    for (const s of ['', ' ', 'abc', '1.2.3', '1,2,3', '1.000,00', '1,000.00', '1e3', '--1', '.', '-', '0x10']) {
      expect(leseAustausch('betrag', s).ok, s).toBe(false);
    }
    expect(leseAustausch('betrag', '')).toMatchObject({ ok: false, fehler: { code: 'leer' } });
  });

  it('umgebende Leerzeichen werden toleriert und gemeldet', () => {
    expect(leseAustausch('betrag', ' 1.00 ')).toMatchObject({
      ok: true,
      wert: '1.00',
      hinweise: [{ code: 'leerraum-entfernt' }],
    });
  });
});

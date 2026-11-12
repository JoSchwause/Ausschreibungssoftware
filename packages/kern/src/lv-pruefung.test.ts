// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests der formalen LV-Prüfung (K8, Ticket 41): je Regel ein positiver und ein negativer Fall. Zuerst geschrieben (Q1).
// Die Erwartungen stehen als Literale (Code, Schwere, Ort), nicht aus dem Code abgeleitet.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Einheitspreis,
  Einheitspreisanteile,
  Hinweistext,
  Knoten,
  Los,
  LvZustand,
  Menge,
  Nachlass,
  Ordnungszahl,
  Position,
  Positionsdaten,
  Pruefbefund,
  Titel,
} from '@tethys/vertrag';
import { PRUEF_GRENZEN, lvPruefen, ozFehler } from './index';
import {
  betragNachlass,
  id,
  lvMit,
  merkmale,
  posKnoten,
  standardMaske,
  wahlzuordnung,
  zuschlagAuf,
  zuschlagsliste,
} from './testhilfen';

const oz = (s: string): Ordnungszahl => s as Ordnungszahl;

const titel = (kennung: string, ordnungszahl: string | null, ueber: Partial<Titel> = {}): Titel => ({
  art: 'titel',
  id: id.titel(kennung),
  elternId: id.eltern('lv-test'),
  reihenfolge: 0,
  ordnungszahl: ordnungszahl === null ? null : oz(ordnungszahl),
  kurztext: `Titel ${kennung}`,
  ...ueber,
});

/** Eine vollständige Position unter T1: OZ, Kurz- und Langtext, Menge, Einheit, EP. */
const pos = (kennung: string, reihenfolge: number, ueber: Partial<Positionsdaten> = {}): Position =>
  posKnoten(kennung, 'T1', reihenfolge, '2.000', '10.000', {
    ordnungszahl: oz(`01.${String((reihenfolge + 1) * 10).padStart(4, '0')}`),
    kurztext: `Position ${kennung}`,
    langtext: [{ art: 'text', text: 'Langtext' }],
    einheit: 'm',
    ...ueber,
  });

const hinweis = (kennung: string, eltern: string, reihenfolge: number, text: string): Hinweistext => ({
  art: 'hinweis',
  id: id.hinweis(kennung),
  elternId: id.eltern(eltern),
  reihenfolge,
  text: [{ art: 'text', text }],
});

/** Ein sauberes LV: ein Titel 01 mit Positionen. `positionen` ersetzt die Standardposition P1. */
function lv(
  positionen: readonly Knoten[] = [pos('P1', 0)],
  kopf: { nachlass?: Nachlass | null; titel?: Partial<Titel>; name?: string } = {},
): LvZustand {
  const z = lvMit([titel('T1', '01', kopf.titel), ...positionen], { nachlass: kopf.nachlass ?? null });
  if (kopf.name === undefined) return z;
  return { ...z, leistungsverzeichnis: { ...z.leistungsverzeichnis, name: kopf.name } };
}

const mit = (z: LvZustand, code: string): Pruefbefund[] => lvPruefen(z).filter((b) => b.code === code);

/** Erwartet genau die Befunde dieses Codes mit Schwere, Quelle und Ort (Reihenfolge wie geliefert). */
function erwarte(
  z: LvZustand,
  code: string,
  schwere: 'warnung' | 'fehler',
  orte: readonly { knotenId?: string; feld?: string }[],
): void {
  const b = mit(z, code);
  expect(b.map((x) => x.ort)).toEqual(orte);
  for (const x of b) {
    expect(x.schwere).toBe(schwere);
    expect(x.quelle).toBe('lv-pruefung');
    expect(x.meldung.length).toBeGreaterThan(0);
  }
}

const epa = (ueber: Partial<Einheitspreisanteile>): Einheitspreisanteile => ({
  lohn: null,
  stoffe: null,
  geraete: null,
  nachunternehmer: null,
  sonstiges: null,
  frei: null,
  freiBezeichnung: null,
  ...ueber,
});

describe('lvPruefen: Grundlagen', () => {
  it('ein sauberes LV hat keinen Befund', () => {
    expect(lvPruefen(lv())).toEqual([]);
  });

  it('Grenzen stehen an einer Stelle (N3-Prinzip)', () => {
    expect(PRUEF_GRENZEN).toEqual({
      lvNameZeichen: 20,
      einheitZeichen: 4,
      vorkommastellen: { menge: 8, einheitspreis: 10, betrag: 11, zuschlagssatz: 3 },
    });
  });
});

describe('LV-weite Regeln', () => {
  it('netto-nach-nachlass-negativ: Fehler am Nachlass; nicht bei Nachlass = Netto', () => {
    erwarte(lv(undefined, { nachlass: betragNachlass('20.01') }), 'netto-nach-nachlass-negativ', 'fehler', [
      { feld: 'nachlass' },
    ]);
    erwarte(
      lv(undefined, { nachlass: betragNachlass('20.00') }),
      'netto-nach-nachlass-negativ',
      'fehler',
      [],
    );
  });

  it('lv-name-leer: nur Leerraum ist leer; ein Zeichen genügt', () => {
    erwarte(lv(undefined, { name: '  \t' }), 'lv-name-leer', 'warnung', [{ feld: 'name' }]);
    erwarte(lv(undefined, { name: 'x' }), 'lv-name-leer', 'warnung', []);
  });

  it('lv-name-zu-lang: mehr als 20 Zeichen; genau 20 sind erlaubt (Zeichen, nicht Bytes)', () => {
    erwarte(lv(undefined, { name: 'a'.repeat(21) }), 'lv-name-zu-lang', 'warnung', [{ feld: 'name' }]);
    erwarte(lv(undefined, { name: 'ä'.repeat(20) }), 'lv-name-zu-lang', 'warnung', []);
  });
});

describe('Ordnungszahl', () => {
  it('oz-fehlt: Gliederung und Position ohne OZ; Hinweistext nie', () => {
    const z = lv([pos('P1', 0, { ordnungszahl: null }), hinweis('H1', 'T1', 1, 'Text')], {
      titel: { ordnungszahl: null },
    });
    erwarte(z, 'oz-fehlt', 'warnung', [
      { knotenId: 'T1', feld: 'ordnungszahl' },
      { knotenId: 'P1', feld: 'ordnungszahl' },
    ]);
    erwarte(lv(), 'oz-fehlt', 'warnung', []);
  });

  it('oz-doppelt: je beteiligtem Knoten ein Fehler; gleiche OZ mit anderem Index ist nicht doppelt', () => {
    const z = lv([pos('P1', 0), pos('P2', 1, { ordnungszahl: oz('01.0010') })]);
    erwarte(z, 'oz-doppelt', 'fehler', [
      { knotenId: 'P1', feld: 'ordnungszahl' },
      { knotenId: 'P2', feld: 'ordnungszahl' },
    ]);
    const indexMaske = lv([pos('P1', 0), pos('P2', 1, { ordnungszahl: oz('01.0010'), ozIndex: 'A' })]);
    erwarte(indexMaske, 'oz-doppelt', 'fehler', []);
  });

  it('oz-maske-verletzt: falsche Länge oder Zeichen; passende OZ nicht', () => {
    const z = lv([
      pos('P1', 0, { ordnungszahl: oz('01.10') }),
      pos('P2', 1, { ordnungszahl: oz('01.00A0') }),
    ]);
    erwarte(z, 'oz-maske-verletzt', 'fehler', [
      { knotenId: 'P1', feld: 'ordnungszahl' },
      { knotenId: 'P2', feld: 'ordnungszahl' },
    ]);
    erwarte(lv(), 'oz-maske-verletzt', 'fehler', []);
  });

  it('oz-maske-verletzt: ein Index, den die Maske nicht hat', () => {
    erwarte(lv([pos('P1', 0, { ozIndex: 'A' })]), 'oz-maske-verletzt', 'fehler', [
      { knotenId: 'P1', feld: 'ordnungszahl' },
    ]);
  });

  it('oz-passt-nicht-zur-gliederung: vordere Teile weichen von der OZ des Titels ab', () => {
    const z = lv([pos('P1', 0, { ordnungszahl: oz('02.0010') })]);
    erwarte(z, 'oz-passt-nicht-zur-gliederung', 'warnung', [{ knotenId: 'P1', feld: 'ordnungszahl' }]);
    erwarte(lv(), 'oz-passt-nicht-zur-gliederung', 'warnung', []);
  });
});

describe('Texte', () => {
  it('kurztext-leer: Titel und Position ohne Kurztext (nur Leerraum zählt als leer)', () => {
    const z = lv([pos('P1', 0, { kurztext: ' ' })], { titel: { kurztext: '' } });
    erwarte(z, 'kurztext-leer', 'warnung', [
      { knotenId: 'T1', feld: 'kurztext' },
      { knotenId: 'P1', feld: 'kurztext' },
    ]);
    erwarte(lv(), 'kurztext-leer', 'warnung', []);
  });

  it('kurztext-leer: auch am Los', () => {
    const los: Los = {
      art: 'los',
      id: id.los('L1'),
      elternId: id.eltern('lv-test'),
      reihenfolge: 0,
      ordnungszahl: oz('01'),
      kurztext: '',
    };
    const z = lvMit([los, posKnoten('P1', 'L1', 0, '1.000', '1.000', { kurztext: 'x', einheit: 'm' })]);
    expect(mit(z, 'kurztext-leer').map((b) => b.ort)).toEqual([{ knotenId: 'L1', feld: 'kurztext' }]);
  });

  it('kurztext-zeilenumbruch: Zeilenumbruch oder Steuerzeichen; Leerzeichen sind erlaubt', () => {
    const z = lv([pos('P1', 0, { kurztext: 'a\nb' }), pos('P2', 1, { kurztext: 'a\tb' })]);
    erwarte(z, 'kurztext-zeilenumbruch', 'warnung', [
      { knotenId: 'P1', feld: 'kurztext' },
      { knotenId: 'P2', feld: 'kurztext' },
    ]);
    erwarte(lv([pos('P1', 0, { kurztext: 'a  b' })]), 'kurztext-zeilenumbruch', 'warnung', []);
  });

  it('langtext-leer: kein Baustein oder nur Leerraum; ein Bild ist Inhalt', () => {
    const z = lv([
      pos('P1', 0, { langtext: [] }),
      pos('P2', 1, { langtext: [{ art: 'absatz', inhalt: [{ art: 'text', text: '  ' }] }] }),
    ]);
    erwarte(z, 'langtext-leer', 'warnung', [
      { knotenId: 'P1', feld: 'langtext' },
      { knotenId: 'P2', feld: 'langtext' },
    ]);
    const bild = lv([
      pos('P1', 0, {
        langtext: [{ art: 'bild', bild: { id: 'b1' as never, medientyp: 'image/png', daten: 'AA==' } }],
      }),
    ]);
    erwarte(bild, 'langtext-leer', 'warnung', []);
  });

  it('langtext-struktur-leer: leere Liste, Tabelle ohne Zeilen, Zeile ohne Zellen, auch verschachtelt (Ticket 56)', () => {
    const text = [{ art: 'text' as const, text: 'x' }];
    const z = lv([
      pos('P1', 0, { langtext: [...text, { art: 'liste', geordnet: false, punkte: [] }] }),
      pos('P2', 1, { langtext: [{ art: 'tabelle', zeilen: [] }] }),
      pos('P3', 2, {
        langtext: [
          { art: 'tabelle', zeilen: [{ zellen: [{ spalten: 1, inhalt: text } as const] }, { zellen: [] }] },
        ],
      }),
      pos('P4', 3, {
        langtext: [
          { art: 'liste', geordnet: true, punkte: [[{ art: 'liste', geordnet: false, punkte: [] }]] },
        ],
      }),
      pos('P5', 4, {
        langtext: [
          { art: 'liste', geordnet: false, punkte: [text] },
          {
            art: 'tabelle',
            zeilen: [{ zellen: [{ spalten: 1, inhalt: [{ art: 'tabelle', zeilen: [] }] }] }],
          },
          { art: 'liste', geordnet: false, punkte: [] },
        ],
      }),
      {
        art: 'hinweis',
        id: id.hinweis('H1'),
        elternId: id.eltern('T1'),
        reihenfolge: 5,
        text: [{ art: 'liste', geordnet: false, punkte: [] }],
      },
      pos('P6', 6, {
        leitbeschreibung: {
          unterbeschreibungen: [
            {
              nummer: '01',
              kurztext: 'U',
              langtext: [{ art: 'tabelle', zeilen: [] }],
              menge: null,
              einheit: null,
            },
          ],
        },
      }),
    ]);
    // Ein Befund je Text (Sprungziel: Knoten und Feld), auch wenn er mehrere leere Strukturen enthält (P5).
    erwarte(z, 'langtext-struktur-leer', 'warnung', [
      { knotenId: 'P1', feld: 'langtext' },
      { knotenId: 'P2', feld: 'langtext' },
      { knotenId: 'P3', feld: 'langtext' },
      { knotenId: 'P4', feld: 'langtext' },
      { knotenId: 'P5', feld: 'langtext' },
      { knotenId: 'H1', feld: 'text' },
      { knotenId: 'P6', feld: 'leitbeschreibung' },
    ]);
    expect(mit(z, 'langtext-struktur-leer')[4]?.meldung).toMatch(/Liste.*Tabelle|Tabelle.*Liste/);
    // Gefüllte Strukturen und leere Zellen sind kein Befund (eine leere Zelle kann der Editor darstellen).
    const voll = lv([
      pos('P1', 0, {
        langtext: [
          { art: 'liste', geordnet: false, punkte: [text, []] },
          { art: 'tabelle', zeilen: [{ zellen: [{ spalten: 2, inhalt: [] }] }] },
        ],
      }),
    ]);
    erwarte(voll, 'langtext-struktur-leer', 'warnung', []);
  });

  it('hinweistext-leer: Hinweistext ohne Text', () => {
    const z = lv([pos('P1', 0), hinweis('H1', 'T1', 1, ''), hinweis('H2', 'T1', 2, 'Vorbemerkung')]);
    erwarte(z, 'hinweistext-leer', 'warnung', [{ knotenId: 'H1', feld: 'text' }]);
  });
});

describe('Gliederung', () => {
  it('gliederung-leer: Titel ohne Position im Unterbaum, auch wenn er Untertitel oder Hinweise hat', () => {
    const t2 = titel('T2', '02', { reihenfolge: 1 });
    const t21: Titel = { ...titel('T21', '02.01'), elternId: id.eltern('T2') };
    const z = lvMit([titel('T1', '01'), pos('P1', 0), t2, t21, hinweis('H1', 'T21', 0, 'Text')]);
    expect(mit(z, 'gliederung-leer').map((b) => b.ort)).toEqual([{ knotenId: 'T2' }, { knotenId: 'T21' }]);
    expect(mit(z, 'gliederung-leer')[0]?.schwere).toBe('warnung');
    erwarte(lv(), 'gliederung-leer', 'warnung', []);
  });
});

describe('Einheit und Menge', () => {
  it('einheit-fehlt: Position ohne Einheit; nicht bei Pauschal und nicht bei Zuschlag', () => {
    const z = lv([
      pos('P1', 0, { einheit: null }),
      pos('P2', 1, { einheit: null, merkmale: merkmale({ pauschal: true }), menge: null }),
      pos('P3', 2, {
        einheit: null,
        zuschlag: zuschlagAuf('gliederung', '5.00'),
        menge: null,
        einheitspreis: null,
      }),
    ]);
    erwarte(z, 'einheit-fehlt', 'warnung', [{ knotenId: 'P1', feld: 'einheit' }]);
  });

  it('einheit-zu-lang: mehr als 4 Zeichen; genau 4 sind erlaubt', () => {
    erwarte(lv([pos('P1', 0, { einheit: 'Stück' })]), 'einheit-zu-lang', 'fehler', [
      { knotenId: 'P1', feld: 'einheit' },
    ]);
    erwarte(lv([pos('P1', 0, { einheit: 'Std.' })]), 'einheit-zu-lang', 'fehler', []);
  });

  it('einheit-zeichen: Zeilenumbruch oder Steuerzeichen', () => {
    erwarte(lv([pos('P1', 0, { einheit: 'm\n' })]), 'einheit-zeichen', 'fehler', [
      { knotenId: 'P1', feld: 'einheit' },
    ]);
    erwarte(lv([pos('P1', 0, { einheit: 'm²' })]), 'einheit-zeichen', 'fehler', []);
  });

  it('menge-fehlt: Position ohne Menge; Pauschal und Zuschlag dürfen ohne Menge sein', () => {
    const z = lv([
      pos('P1', 0, { menge: null }),
      pos('P2', 1, { menge: null, merkmale: merkmale({ pauschal: true }) }),
      pos('P3', 2, { menge: null, einheitspreis: null, zuschlag: zuschlagAuf('gliederung', '5.00') }),
    ]);
    erwarte(z, 'menge-fehlt', 'warnung', [{ knotenId: 'P1', feld: 'menge' }]);
  });

  it('menge-null: Menge 0,000', () => {
    erwarte(lv([pos('P1', 0, { menge: '0.000' as Menge })]), 'menge-null', 'warnung', [
      { knotenId: 'P1', feld: 'menge' },
    ]);
    erwarte(lv([pos('P1', 0, { menge: '0.001' as Menge })]), 'menge-null', 'warnung', []);
  });

  it('pauschal-menge: Pauschal mit Menge ≠ 1,000; mit 1,000 oder ohne Menge nicht', () => {
    const p = merkmale({ pauschal: true });
    const z = lv([
      pos('P1', 0, { merkmale: p, menge: '2.000' as Menge }),
      pos('P2', 1, { merkmale: p, menge: '1.000' as Menge }),
      pos('P3', 2, { merkmale: p, menge: null }),
    ]);
    erwarte(z, 'pauschal-menge', 'warnung', [{ knotenId: 'P1', feld: 'menge' }]);
  });

  it('zahl-zu-gross: Menge mit 9 Vorkommastellen, EP mit 11, GP mit 12 (je Feld ein Befund)', () => {
    const z = lv([
      pos('P1', 0, { menge: '123456789.000' as Menge, einheitspreis: '1000.000' as Einheitspreis }),
      pos('P2', 1, { menge: '10.000' as Menge, einheitspreis: '12345678901.000' as Einheitspreis }),
    ]);
    const orte = mit(z, 'zahl-zu-gross').map((b) => b.ort);
    expect(orte).toContainEqual({ knotenId: 'P1', feld: 'menge' });
    expect(orte).toContainEqual({ knotenId: 'P1', feld: 'gesamtpreis' });
    expect(orte).toContainEqual({ knotenId: 'P2', feld: 'einheitspreis' });
    expect(orte).toContainEqual({ knotenId: 'P2', feld: 'gesamtpreis' });
    expect(orte).toContainEqual({ knotenId: 'T1', feld: 'gesamtpreis' });
    expect(orte).toContainEqual({ feld: 'netto' });
    expect(mit(z, 'zahl-zu-gross').every((b) => b.schwere === 'fehler')).toBe(true);
  });

  it('zahl-zu-gross: an der Grenze (8, 10, 11 Vorkommastellen) kein Befund', () => {
    const z = lv([
      pos('P1', 0, { menge: '12345678.000' as Menge, einheitspreis: '1.000' as Einheitspreis }),
      pos('P2', 1, { menge: '1.000' as Menge, einheitspreis: '1234567890.000' as Einheitspreis }),
    ]);
    expect(mit(z, 'zahl-zu-gross')).toEqual([]);
  });

  it('zahl-zu-gross: Zuschlagssatz mit 4 Vorkommastellen', () => {
    const z = lv([
      pos('P1', 0),
      pos('P2', 1, {
        menge: null,
        einheitspreis: null,
        einheit: null,
        zuschlag: zuschlagAuf('gliederung', '1000.00'),
      }),
    ]);
    expect(mit(z, 'zahl-zu-gross').map((b) => b.ort)).toContainEqual({ knotenId: 'P2', feld: 'zuschlag' });
    const ok = lv([
      pos('P1', 0),
      pos('P2', 1, {
        menge: null,
        einheitspreis: null,
        einheit: null,
        zuschlag: zuschlagAuf('gliederung', '999.99'),
      }),
    ]);
    expect(mit(ok, 'zahl-zu-gross')).toEqual([]);
  });
});

describe('Zuschlagsposition', () => {
  const satz = { menge: null, einheitspreis: null, einheit: null } as const;

  it('zuschlag-ohne-bezug: leere Liste, Bereich ohne Position, Bereich ohne Kennzeichen', () => {
    const z = lv([
      pos('Z1', 0, { ...satz, zuschlag: zuschlagsliste([], '5.00') }),
      pos('Z2', 1, { ...satz, zuschlag: zuschlagAuf('gliederung', '5.00') }),
      pos('P1', 2),
      pos('Z3', 3, { ...satz, zuschlag: zuschlagAuf('kennzeichnung', '5.00') }),
    ]);
    erwarte(z, 'zuschlag-ohne-bezug', 'warnung', [
      { knotenId: 'Z1' },
      { knotenId: 'Z2' },
      { knotenId: 'Z3' },
    ]);
  });

  it('zuschlag-ohne-bezug: kein Befund bei Bereich mit Position, Kennzeichen oder Liste', () => {
    const z = lv([
      pos('P1', 0, { merkmale: merkmale({ zuschlagskennzeichen: true }) }),
      pos('Z1', 1, { ...satz, zuschlag: zuschlagAuf('gliederung', '5.00') }),
      pos('Z2', 2, { ...satz, zuschlag: zuschlagAuf('kennzeichnung', '5.00') }),
      pos('Z3', 3, { ...satz, zuschlag: zuschlagsliste(['P1'], '5.00') }),
    ]);
    erwarte(z, 'zuschlag-ohne-bezug', 'warnung', []);
  });

  it('zuschlag-altform: ohne Satz, mit Menge und EP; mit Satz nicht', () => {
    const z = lv([pos('P1', 0), pos('Z1', 1, { zuschlag: zuschlagsliste(['P1']) })]);
    erwarte(z, 'zuschlag-altform', 'warnung', [{ knotenId: 'Z1' }]);
    const neu = lv([pos('P1', 0), pos('Z1', 1, { ...satz, zuschlag: zuschlagsliste(['P1'], '5.00') })]);
    erwarte(neu, 'zuschlag-altform', 'warnung', []);
  });

  it('zuschlag-satz-und-menge: Satz und zugleich Menge oder EP', () => {
    const z = lv([
      pos('P1', 0),
      pos('Z1', 1, { zuschlag: zuschlagsliste(['P1'], '5.00') }),
      pos('Z2', 2, {
        ...satz,
        einheitspreis: '1.000' as Einheitspreis,
        zuschlag: zuschlagsliste(['P1'], '5.00'),
      }),
      pos('Z3', 3, { ...satz, zuschlag: zuschlagsliste(['P1'], '5.00') }),
    ]);
    erwarte(z, 'zuschlag-satz-und-menge', 'warnung', [
      { knotenId: 'Z1', feld: 'menge' },
      { knotenId: 'Z2', feld: 'menge' },
    ]);
  });

  it('zuschlagskennzeichen-ohne-zuschlag: Kennzeichen ohne Kennzeichnungs-Zuschlag in seinem Bereich', () => {
    const k = merkmale({ zuschlagskennzeichen: true });
    const z = lv([
      pos('P1', 0, { merkmale: k }),
      pos('Z1', 1, { ...satz, zuschlag: zuschlagAuf('gliederung', '5.00') }),
      pos('P2', 2, { merkmale: k }),
      pos('Z2', 3, { ...satz, zuschlag: zuschlagAuf('gliederung', '5.00') }),
      pos('Z3', 4, { ...satz, zuschlag: zuschlagAuf('kennzeichnung', '5.00') }),
      pos('P3', 5, { merkmale: k }),
    ]);
    erwarte(z, 'zuschlagskennzeichen-ohne-zuschlag', 'warnung', [{ knotenId: 'P1' }, { knotenId: 'P3' }]);
  });

  it('teilmenge-zu-gross: Teilmenge über der Menge der Bezugsposition; gleich groß nicht', () => {
    const bezug = (teilmenge: string) => ({
      prozentsatz: '5.00' as never,
      bezug: {
        art: 'positionen' as const,
        positionen: [{ positionId: id.pos('P1'), teilmenge: teilmenge as Menge }],
      },
    });
    erwarte(
      lv([pos('P1', 0), pos('Z1', 1, { ...satz, zuschlag: bezug('2.001') })]),
      'teilmenge-zu-gross',
      'warnung',
      [{ knotenId: 'Z1', feld: 'zuschlag' }],
    );
    erwarte(
      lv([pos('P1', 0), pos('Z1', 1, { ...satz, zuschlag: bezug('2.000') })]),
      'teilmenge-zu-gross',
      'warnung',
      [],
    );
  });
});

describe('Wahl und Einheitspreisanteile', () => {
  it('wahl-ohne-zuordnung: ohne Gruppe, Variante und Grundposition; mit einer Angabe nicht', () => {
    const z = lv([
      pos('P1', 0),
      pos('W1', 1, { merkmale: merkmale({ wahl: wahlzuordnung(null, null, null) }) }),
      pos('W2', 2, { merkmale: merkmale({ wahl: wahlzuordnung(null, null, 'P1') }) }),
      pos('W3', 3, { merkmale: merkmale({ wahl: wahlzuordnung(1, null, null) }) }),
    ]);
    erwarte(z, 'wahl-ohne-zuordnung', 'warnung', [{ knotenId: 'W1' }]);
  });

  it('epa-summe-abweichend: Anteile gesetzt, Summe ≠ EP; gleiche Summe oder keine Anteile nicht', () => {
    const z = lv([
      pos('P1', 0, { epa: epa({ lohn: '4.000' as Einheitspreis, stoffe: '5.000' as Einheitspreis }) }),
      pos('P2', 1, { epa: epa({ lohn: '4.000' as Einheitspreis, stoffe: '6.000' as Einheitspreis }) }),
      pos('P3', 2, { epa: epa({}) }),
    ]);
    erwarte(z, 'epa-summe-abweichend', 'warnung', [{ knotenId: 'P1', feld: 'einheitspreis' }]);
  });
});

describe('Reihenfolge', () => {
  it('LV-weite Befunde zuerst, dann Dokumentreihenfolge, je Knoten nach Code', () => {
    const z = lv([pos('P1', 0, { kurztext: '', einheit: null, menge: null, langtext: [] })], {
      name: '',
      titel: { kurztext: '' },
    });
    expect(lvPruefen(z).map((b) => [b.ort.knotenId ?? '-', b.code])).toEqual([
      ['-', 'lv-name-leer'],
      ['T1', 'kurztext-leer'],
      ['P1', 'einheit-fehlt'],
      ['P1', 'kurztext-leer'],
      ['P1', 'langtext-leer'],
      ['P1', 'menge-fehlt'],
    ]);
  });
});

describe('Eigenschaft: oz-maske-verletzt folgt genau ozFehler', () => {
  it('für beliebige OZ an Titel und Position meldet die Prüfung genau dann, wenn ozFehler einen Fehler nennt', () => {
    const ozArb = fc.string({ unit: fc.constantFrom('0', '1', '9', 'A', '_', '.', ' '), maxLength: 12 });
    fc.assert(
      fc.property(ozArb, ozArb, fc.constantFrom(null, 'A', '1'), (tOz, pOz, index) => {
        const z = lv([pos('P1', 0, { ordnungszahl: oz(pOz), ozIndex: index })], {
          titel: { ordnungszahl: oz(tOz) },
        });
        const gemeldet = new Set<string | undefined>(mit(z, 'oz-maske-verletzt').map((b) => b.ort.knotenId));
        expect(gemeldet.has('T1')).toBe(ozFehler(standardMaske, tOz, null, 'gliederung', 1) !== null);
        expect(gemeldet.has('P1')).toBe(ozFehler(standardMaske, pOz, index, 'position', 1) !== null);
      }),
      { numRuns: 300 },
    );
  });
});

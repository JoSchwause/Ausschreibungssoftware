// SPDX-License-Identifier: AGPL-3.0-or-later
// Preisspiegel als PDF (quer) und Excel (Ticket 141): Positionen × Bieter mit EP und GP, Min, Mittel, Max, Ausreißer- und
// ABC-Kennzeichen, Summen und Nachlass; die Bieter nach Rang mit Anschrift. Alle Zahlen stammen aus der Eingabe
// (`testhilfe/kernkette.ts`), der Druck rechnet nichts.

import { describe, expect, it } from 'vitest';
import type { AngebotId, BieterId } from '@tethys/vertrag';
import { neuesDruckprofil } from './druckprofil';
import { bauePreisspiegelModell, erzeugePreisspiegelPdf, preisspiegelAlsExcel } from './index';
import type { BerichtBlock, BerichtZelle, PreisspiegelEingabe } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand } from './testhilfe/bau';
import { BIETER, BUERO, PREISSPIEGEL, PROJEKT, WINZIG, excelZeilen } from './testhilfe/kernkette';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const { zustand } = fixtureZustand('winzig');

const eingabe: PreisspiegelEingabe = {
  lv: zustand,
  preisspiegel: PREISSPIEGEL,
  bieter: BIETER,
  projekt: PROJEKT,
  buero: BUERO,
  datum: '2026-11-13',
};

const tabellen = (bloecke: readonly BerichtBlock[]) =>
  bloecke.filter((b): b is Extract<BerichtBlock, { art: 'tabelle' }> => b.art === 'tabelle');
/** Texte einer Zelle: die Werte, dann der Hinweis, wenn es einen gibt. */
const texte = (z: string | BerichtZelle | undefined): string[] =>
  z === undefined
    ? []
    : typeof z === 'string'
      ? [z]
      : [...z.werte.map((w) => w.text), ...(z.hinweis === undefined ? [] : [z.hinweis])];

describe('Preisspiegel: Modell', () => {
  const m = bauePreisspiegelModell(eingabe);
  const [bieter, positionen] = m.abschnitte;

  it('steht quer, mit Büro als Absender, Projektangaben und LV im Kopf', () => {
    expect(m.titel).toBe('Preisspiegel');
    expect(m.seite?.ausrichtung).toBe('quer');
    expect(m.absender?.[0]).toBe('Planungsbüro Beispiel');
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Projekt', wert: 'Neubau Beispiel' },
        { bezeichnung: 'Projektnummer', wert: 'P-2026-07' },
        { bezeichnung: 'Leistungsverzeichnis', wert: zustand.leistungsverzeichnis.name },
      ]),
    );
    expect(m.datum).toBe('13.11.2026');
  });

  it('führt die Bieter nach Rang mit Anschrift und Summen samt Nachlass auf', () => {
    const [t] = tabellen(bieter?.bloecke ?? []);
    expect(t?.spalten.map((s) => s.titel)).toEqual([
      'Rang',
      'Bieter',
      'Anschrift',
      'Netto',
      'Nachlass',
      'Netto nach Nachlass',
      'MwSt 19,00 %',
      'Brutto',
      'Nicht angeboten',
    ]);
    expect(t?.zeilen.map((z) => z.zellen.slice(0, 3).flatMap(texte))).toEqual([
      ['1', 'Musterbau AG', '–'],
      ['2', 'Beispielbau GmbH', 'Werkweg 2, 20000 Musterort'],
      ['3', 'Probe & Söhne KG', '–'],
    ]);
    expect(t?.zeilen[0]?.zellen.slice(3).flatMap(texte)).toEqual([
      '2.411,73',
      '50,00',
      '2.361,73',
      '448,73',
      '2.810,46',
      '1',
    ]);
  });

  it('zeigt je Position EP und GP je Bieter mit Kennzeichen, Schätzpreis, Min, Mittel, Max und ABC', () => {
    const [t] = tabellen(positionen?.bloecke ?? []);
    expect(t?.spalten.map((s) => s.titel)).toEqual([
      'OZ',
      'Kurztext',
      'Menge',
      'Einh.',
      'ABC',
      'Schätzpreis',
      'Beispielbau GmbH',
      'Musterbau AG',
      'Probe & Söhne KG',
      'Min',
      'Mittel',
      'Max',
    ]);
    expect(t?.spalten[6]?.teile).toEqual(['EP', 'GP']);
    const zeile = (oz: string) => t?.zeilen.find((z) => z.zellen[0] === oz)?.zellen.map(texte);
    expect(zeile('01.0010')).toEqual([
      ['01.0010'],
      ['Pflaster verlegen'],
      ['1,235'],
      ['m²'],
      ['C'],
      ['10,000', '12,35'],
      ['11,000', '13,59'],
      ['9,500', '11,73'],
      ['15,000', '18,53', 'Ausreißer hoch'],
      ['9,500', '11,73'],
      ['11,833', '14,61'],
      ['15,000', '18,53'],
    ]);
    expect(zeile('01.0020')?.slice(7, 9)).toEqual([
      ['–', '–', 'nicht angeboten'],
      ['0,000', '0,00', 'Nullpreis'],
    ]);
  });

  it('schließt mit Titelsumme, Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto und Rang je Bieter', () => {
    const [t] = tabellen(positionen?.bloecke ?? []);
    const zeile = (name: string) => t?.zeilen.find((z) => texte(z.zellen[1])[0] === name)?.zellen.map(texte);
    expect(zeile('Summe 01 Kleine Musterarbeiten')?.slice(5, 9)).toEqual([
      ['', '2.565,00'],
      ['', '2.530,26'],
      ['', '2.411,73'],
      ['', '2.618,53'],
    ]);
    expect(zeile('Netto')?.slice(5)).toEqual([
      ['', '2.565,00'],
      ['', '2.530,26'],
      ['', '2.411,73'],
      ['', '2.618,53'],
      ['', '2.428,40'],
      ['', '2.531,28'],
      ['', '2.635,20'],
    ]);
    expect(
      zeile('Nachlass')
        ?.slice(6, 9)
        .map((z) => z[1]),
    ).toEqual(['0,00', '50,00', '0,00']);
    expect(
      zeile('Brutto')
        ?.slice(6, 9)
        .map((z) => z[1]),
    ).toEqual(['3.011,01', '2.810,46', '3.116,05']);
    expect(
      zeile('Rang')
        ?.slice(6, 9)
        .map((z) => z[1]),
    ).toEqual(['2', '1', '3']);
  });

  it('teilt viele Bieter auf mehrere Tabellen, jede mit OZ und Kurztext', () => {
    const viele = Array.from({ length: 7 }, (_, i) => `x${String(i)}`);
    const angebot = (i: number) => `angebot-${viele[i] ?? ''}` as AngebotId;
    const [summeA] = PREISSPIEGEL.bietersummen;
    if (summeA === undefined) throw new Error('Testdaten ohne Bietersumme');
    const ps: PreisspiegelEingabe['preisspiegel'] = {
      ...PREISSPIEGEL,
      zeilen: PREISSPIEGEL.zeilen.map((z) => ({
        ...z,
        bieter: z.bieter.slice(0, 1).flatMap((p) => viele.map((_, i) => ({ ...p, angebotId: angebot(i) }))),
      })),
      bietersummen: viele.map((x, i) => ({
        ...summeA,
        angebotId: angebot(i),
        bieterId: x as BieterId,
        rang: i + 1,
      })),
      gliederungen: [],
    };
    const m7 = bauePreisspiegelModell({
      ...eingabe,
      preisspiegel: ps,
      bieter: viele.map((x) => ({ id: x as BieterId, name: `Bieter ${x}` })),
    });
    const ts = tabellen(m7.abschnitte[1]?.bloecke ?? []);
    expect(ts).toHaveLength(2);
    expect(ts.map((t) => t.spalten.filter((s) => s.titel.startsWith('Bieter ')).length)).toEqual([5, 2]);
    for (const t of ts) expect(t.spalten.slice(0, 2).map((s) => s.titel)).toEqual(['OZ', 'Kurztext']);
  });
});

describe('Preisspiegel: PDF', () => {
  it('druckt quer die Bieter, Kennzeichen und Summen; der Seitentext trägt die Beträge', async () => {
    const inhalt = await liesPdf(await erzeugePreisspiegelPdf(eingabe, schriften));
    const t = normal(alsText(inhalt));
    for (const s of [
      'Preisspiegel',
      'Planungsbüro Beispiel',
      'Projektnummer P-2026-07',
      'Musterbau AG',
      'Werkweg 2, 20000 Musterort',
      'Ausreißer hoch',
      'nicht angeboten',
      'Nullpreis',
      '2.810,46',
      '2.361,73',
      'Summe 01 Kleine Musterarbeiten',
      'Stand: 13.11.2026',
    ])
      expect(t, s).toContain(s);
    expect(t).toMatch(new RegExp(`Seite 1 von ${String(inhalt.seiten.length)}`));
    expect(inhalt.formate[0]).toEqual({ breite: 842, hoehe: 595 });
  });

  it('nimmt Rand, Fußzeile und Deckblatt aus dem Druckprofil', async () => {
    const profil = {
      ...neuesDruckprofil('Knapp'),
      deckblatt: false,
      seitenrand: 'eng' as const,
      fusszeile: '{lv}, Seite {seite}/{seiten}',
    };
    const t = normal(
      alsText(await liesPdf(await erzeugePreisspiegelPdf({ ...eingabe, druckprofil: profil }, schriften))),
    );
    expect(t).toContain(`${zustand.leistungsverzeichnis.name}, Seite 1/`);
    expect(t).not.toContain('Planungsbüro Beispiel');
    expect(t).not.toContain('Projektnummer');
  });

  it('ist bei gleicher Eingabe gleich', async () => {
    const a = await erzeugePreisspiegelPdf(eingabe, schriften);
    const b = await erzeugePreisspiegelPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

describe('Preisspiegel: Excel', () => {
  const z = excelZeilen(preisspiegelAlsExcel(eingabe));

  it('hat je Bieter eine EP- und eine GP-Spalte mit Zahlen und die Kennzeichen als Text', () => {
    const kopf = z.find((r) => r[0] === 'OZ') ?? [];
    expect(kopf).toEqual(
      expect.arrayContaining(['Beispielbau GmbH EP', 'Beispielbau GmbH GP', 'Probe & Söhne KG Hinweis']),
    );
    const p1 = z.find((r) => r[0] === '01.0010') ?? [];
    const spalte = (titel: string) => p1[kopf.indexOf(titel)];
    expect(spalte('Menge')).toBe('1.235');
    expect(spalte('Probe & Söhne KG EP')).toBe('15');
    expect(spalte('Probe & Söhne KG GP')).toBe('18.53');
    expect(spalte('Probe & Söhne KG Hinweis')).toBe('Ausreißer hoch');
    expect(spalte('Mittel EP')).toBe('11.833');
  });

  it('trägt alle Bieter in einer Tabelle und die Summen als Zahlen', () => {
    expect(z.filter((r) => r[0] === 'OZ')).toHaveLength(1);
    const brutto = z.find((r) => r[1] === 'Brutto') ?? [];
    expect(brutto).toEqual(expect.arrayContaining(['3011.01', '2810.46', '3116.05']));
  });
});

describe('Preisspiegel: Positionen ohne Zeile', () => {
  it('druckt eine Position, zu der der Preisspiegel nichts sagt, mit Strichen statt sie wegzulassen (Q5)', () => {
    const ohne = { ...PREISSPIEGEL, zeilen: PREISSPIEGEL.zeilen.filter((z) => z.positionId !== WINZIG.p2) };
    const m = bauePreisspiegelModell({ ...eingabe, preisspiegel: ohne });
    const [t] = tabellen(m.abschnitte[1]?.bloecke ?? []);
    const z = t?.zeilen.find((r) => r.zellen[0] === '01.0020');
    expect(z?.zellen.slice(5, 7).map(texte)).toEqual([
      ['–', '–'],
      ['–', '–'],
    ]);
  });
});

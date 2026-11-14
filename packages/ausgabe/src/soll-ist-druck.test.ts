// SPDX-License-Identifier: AGPL-3.0-or-later
// Soll/Ist als PDF und Excel (Ticket 141): je Position Soll, Ist, Differenz, Anteil und die Gesamtpreise beider Seiten, je
// Gliederung und gesamt summiert, mit dem Kennzeichen der Schwelle (VOB/B § 2 Abs. 3). Werte aus der Eingabe.

import { describe, expect, it } from 'vitest';
import type { Prozent } from '@tethys/vertrag';
import { baueSollIstModell, erzeugeSollIstPdf, sollIstAlsExcel } from './index';
import type { BerichtZelle, SollIstEingabe } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand } from './testhilfe/bau';
import { BUERO, PROJEKT, SOLL_IST, auftragsLvAus, excelZeilen } from './testhilfe/kernkette';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const auftragsLv = auftragsLvAus(fixtureZustand('winzig').zustand);

const eingabe: SollIstEingabe = {
  auftragsLv,
  sollIst: SOLL_IST,
  optionen: { oberSchwelle: '110.00' as Prozent, unterSchwelle: '90.00' as Prozent },
  projekt: PROJEKT,
  buero: BUERO,
  datum: '2026-11-13',
};

const texte = (z: string | BerichtZelle | undefined): string =>
  z === undefined
    ? ''
    : typeof z === 'string'
      ? z
      : [...z.werte.map((w) => w.text), ...(z.hinweis === undefined ? [] : [z.hinweis])].join(' | ');

describe('Soll/Ist: Modell', () => {
  const m = baueSollIstModell(eingabe);
  const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
  if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');

  it('nennt Auftrags-LV, Auftragnehmer, Projekt und Absender', () => {
    expect(m.titel).toBe('Soll/Ist');
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Auftrags-LV', wert: auftragsLv.auftragsLeistungsverzeichnis.name },
        { bezeichnung: 'Auftragnehmer', wert: 'Beispielbau GmbH, Werkweg 2, 20000 Musterort' },
        { bezeichnung: 'Projekt', wert: 'Neubau Beispiel' },
      ]),
    );
    expect(m.absender?.[0]).toBe('Planungsbüro Beispiel');
  });

  it('zeigt je Position Soll, Ist, Differenz, Anteil und GP, mit dem Kennzeichen der Schwelle', () => {
    expect(tabelle.spalten.map((s) => s.titel)).toEqual([
      'OZ',
      'Kurztext',
      'Einh.',
      'Soll',
      'Ist',
      'Differenz',
      'Anteil in %',
      'GP Soll',
      'GP Ist',
    ]);
    expect(tabelle.zeilen.map((z) => z.zellen.map(texte))).toEqual([
      ['01', 'Kleine Musterarbeiten'],
      [
        '01.0010',
        'Pflaster verlegen',
        'm²',
        '1,235',
        '1,500',
        '0,265',
        '121,46 | über 110,00 %',
        '12,35',
        '15,00',
      ],
      ['01.0020', 'Randstein setzen', 'm', '3,333', '3,000', '-0,333', '90,01', '15,20', '13,68'],
      ['01.0030', 'Fläche abdichten', 'm²', '5,000', '0,000', '-5,000', '0,00', '2.537,45', '0,00'],
      ['', 'Summe 01 Kleine Musterarbeiten', '', '', '', '', '', '2.565,00', '28,68'],
      ['', 'Gesamt', '', '', '', '', '', '2.565,00', '28,68'],
    ]);
  });

  it('nennt die Schwellen in der Legende, wie gerechnet', () => {
    const legende = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'absatz');
    expect(legende?.art === 'absatz' && legende.text).toContain('über 110,00 %');
    expect(legende?.art === 'absatz' && legende.text).toContain('unter 90,00 %');
    expect(legende?.art === 'absatz' && legende.text).toContain('VOB/B § 2 Abs. 3');
  });

  it('nennt ohne Angabe der Schwellen keine Zahl, sondern die Schwelle', () => {
    const ohne = baueSollIstModell({ ...eingabe, optionen: {} });
    const t = ohne.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
    if (t?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(texte(t.zeilen[1]?.zellen[6])).toBe('121,46 | über der Schwelle');
  });
});

describe('Soll/Ist: PDF und Excel', () => {
  it('trägt Mengen, Anteile, Kennzeichen und Summen im Seitentext', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeSollIstPdf(eingabe, schriften))));
    for (const s of [
      'Soll/Ist',
      'Planungsbüro Beispiel',
      '01.0010 Pflaster verlegen m² 1,235 1,500 0,265 121,46',
      'über 110,00 %',
      'Summe 01 Kleine Musterarbeiten 2.565,00 28,68',
      'Gesamt 2.565,00 28,68',
    ])
      expect(t, s).toContain(s);
  });

  it('schreibt Mengen, Anteile und Beträge als Zahlen', () => {
    const z = excelZeilen(sollIstAlsExcel(eingabe));
    const p1 = z.find((r) => r[0] === '01.0010');
    expect(p1).toEqual([
      '01.0010',
      'Pflaster verlegen',
      'm²',
      '1.235',
      '1.5',
      '0.265',
      '121.46',
      'über 110,00 %',
      '12.35',
      '15',
    ]);
    expect(z.find((r) => r[1] === 'Gesamt')).toEqual(['', 'Gesamt', '', '', '', '', '', '', '2565', '28.68']);
  });
});

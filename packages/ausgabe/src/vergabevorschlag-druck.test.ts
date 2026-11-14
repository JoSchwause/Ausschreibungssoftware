// SPDX-License-Identifier: AGPL-3.0-or-later
// Vergabevorschlag als PDF (Ticket 141): Rangfolge mit den geprüften Summen, der vorgeschlagene Bieter mit Anschrift, der
// freie Begründungstext, Büro als Absender und das Projekt. Zahlen aus der Eingabe (`testhilfe/kernkette.ts`).

import { describe, expect, it } from 'vitest';
import type { BieterId } from '@tethys/vertrag';
import { baueVergabevorschlagModell, erzeugeVergabevorschlagPdf } from './index';
import type { BerichtBlock, BerichtZelle, VergabevorschlagEingabe } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand } from './testhilfe/bau';
import { BIETER, BUERO, PREISSPIEGEL, PROJEKT } from './testhilfe/kernkette';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const { zustand } = fixtureZustand('winzig');

const eingabe: VergabevorschlagEingabe = {
  lv: zustand,
  bietersummen: PREISSPIEGEL.bietersummen,
  bieter: BIETER,
  vorgeschlagen: 'bieter-a' as BieterId,
  begruendung:
    'Das Angebot auf Rang 1 lässt eine Position aus.\n\nDas zweitgünstigste Angebot ist vollständig und wirtschaftlich.',
  projekt: PROJEKT,
  buero: BUERO,
  datum: '2026-11-20',
};

const texte = (z: string | BerichtZelle | undefined): string[] =>
  z === undefined
    ? []
    : typeof z === 'string'
      ? [z]
      : [...z.werte.map((w) => w.text), ...(z.hinweis === undefined ? [] : [z.hinweis])];
const bloecke = (m: ReturnType<typeof baueVergabevorschlagModell>, ueberschrift: string): BerichtBlock[] => [
  ...(m.abschnitte.find((a) => a.ueberschrift === ueberschrift)?.bloecke ?? []),
];

describe('Vergabevorschlag: Modell', () => {
  const m = baueVergabevorschlagModell(eingabe);

  it('hat Büro als Absender, Projekt und LV im Kopf', () => {
    expect(m.titel).toBe('Vergabevorschlag');
    expect(m.absender).toEqual([
      'Planungsbüro Beispiel',
      'Planweg 1',
      '10002 Beispielstadt',
      'Telefon 030 1234',
      'E-Mail info@example.org',
    ]);
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Projekt', wert: 'Neubau Beispiel' },
        { bezeichnung: 'Baustelle', wert: 'Baustraße 9, 10001 Beispielstadt' },
        { bezeichnung: 'Leistungsverzeichnis', wert: zustand.leistungsverzeichnis.name },
      ]),
    );
  });

  it('nennt die Rangfolge mit den geprüften Summen und kennzeichnet den Vorschlag', () => {
    const [t] = bloecke(m, 'Rangfolge der Angebote').filter((b) => b.art === 'tabelle');
    if (t?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(t.spalten.map((s) => s.titel)).toEqual([
      'Rang',
      'Bieter',
      'Netto',
      'Nachlass',
      'Netto nach Nachlass',
      'MwSt 19,00 %',
      'Brutto',
    ]);
    expect(t.zeilen.map((z) => z.zellen.flatMap(texte))).toEqual([
      [
        '1',
        'Musterbau AG',
        '1 Position nicht angeboten',
        '2.411,73',
        '50,00',
        '2.361,73',
        '448,73',
        '2.810,46',
      ],
      ['2', 'Beispielbau GmbH', 'vorgeschlagen', '2.530,26', '0,00', '2.530,26', '480,75', '3.011,01'],
      ['3', 'Probe & Söhne KG', '2.618,53', '0,00', '2.618,53', '497,52', '3.116,05'],
    ]);
    expect(t.zeilen[1]?.fett).toBe(true);
  });

  it('nennt den vorgeschlagenen Bieter mit Summe und Anschrift und übernimmt die Begründung in Absätzen', () => {
    const vorschlag = bloecke(m, 'Vorschlag');
    expect(vorschlag[0]).toEqual({
      art: 'absatz',
      text: 'Es wird vorgeschlagen, den Auftrag an Beispielbau GmbH zu vergeben (Rang 2, Angebotssumme 3.011,01 € brutto).',
    });
    expect(vorschlag[1]).toEqual({
      art: 'angaben',
      felder: [
        { bezeichnung: 'Anschrift', wert: 'Werkweg 2, 20000 Musterort' },
        { bezeichnung: 'Ansprechperson', wert: 'Frau Muster' },
        { bezeichnung: 'Telefon', wert: '040 5678' },
      ],
    });
    expect(bloecke(m, 'Begründung')).toEqual([
      { art: 'absatz', text: 'Das Angebot auf Rang 1 lässt eine Position aus.' },
      { art: 'absatz', text: 'Das zweitgünstigste Angebot ist vollständig und wirtschaftlich.' },
    ]);
  });

  it('sagt ohne Auswahl und ohne Begründung, dass sie fehlen, statt still zu schweigen (Q5)', () => {
    const leer = baueVergabevorschlagModell({ ...eingabe, vorgeschlagen: null, begruendung: '  \n ' });
    expect(bloecke(leer, 'Vorschlag')).toEqual([
      { art: 'absatz', text: 'Es ist noch kein Bieter ausgewählt.' },
    ]);
    expect(bloecke(leer, 'Begründung')).toEqual([{ art: 'absatz', text: '–' }]);
  });
});

describe('Vergabevorschlag: PDF', () => {
  it('trägt Rangfolge, Summen, Vorschlag, Begründung und Absender im Seitentext', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeVergabevorschlagPdf(eingabe, schriften))));
    for (const s of [
      'Vergabevorschlag',
      'Planungsbüro Beispiel',
      'Projektnummer P-2026-07',
      'Rangfolge der Angebote',
      '2.810,46',
      '3.011,01',
      'Es wird vorgeschlagen, den Auftrag an Beispielbau GmbH zu vergeben',
      'Werkweg 2, 20000 Musterort',
      'Das zweitgünstigste Angebot ist vollständig und wirtschaftlich.',
      'Aufgestellt: Planungsbüro Beispiel, 20.11.2026',
      'Stand: 20.11.2026',
    ])
      expect(t, s).toContain(s);
  });

  it('ist bei gleicher Eingabe gleich', async () => {
    const a = await erzeugeVergabevorschlagPdf(eingabe, schriften);
    const b = await erzeugeVergabevorschlagPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

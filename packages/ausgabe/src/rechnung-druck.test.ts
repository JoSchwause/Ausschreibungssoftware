// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnungsprüfung als PDF (Ticket 141): die Abzugskette nach D-34 Zeile für Zeile, der Leistungsstand, der Vergleich mit
// der Forderung, die Befunde und die Freigabe. Ohne die Zeilen aus A5 (Vertragsstrafe, Skonto, Bauabzugsteuer, Zahlungen).
// Werte aus der Eingabe.

import { describe, expect, it } from 'vitest';
import type { AufmassId, Betrag } from '@tethys/vertrag';
import { baueRechnungspruefungModell, erzeugeRechnungspruefungPdf } from './index';
import type { BerichtBlock, BerichtZelle, RechnungspruefungEingabe } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand } from './testhilfe/bau';
import { AUFMASS, BUERO, PROJEKT, PRUEFUNG, RECHNUNG, auftragsLvAus } from './testhilfe/kernkette';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const auftragsLv = auftragsLvAus(fixtureZustand('winzig').zustand);

const eingabe: RechnungspruefungEingabe = {
  rechnung: RECHNUNG,
  auftragsLv,
  pruefung: PRUEFUNG,
  aufmasse: [AUFMASS],
  befundtexte: [{ schwere: 'warnung', ort: null, text: 'Der geforderte Zahlbetrag weicht ab.' }],
  projekt: PROJEKT,
  buero: BUERO,
  datum: '2026-11-14',
};

const abschnitt = (m: ReturnType<typeof baueRechnungspruefungModell>, titel: string): BerichtBlock[] => [
  ...(m.abschnitte.find((a) => a.ueberschrift === titel)?.bloecke ?? []),
];
const texte = (z: string | BerichtZelle | undefined): string =>
  z === undefined ? '' : typeof z === 'string' ? z : z.werte.map((w) => w.text).join(' | ');

describe('Rechnungsprüfung: Modell', () => {
  const m = baueRechnungspruefungModell(eingabe);

  it('nennt Rechnung, Eingang, Auftrags-LV, Auftragnehmer und Projekt im Kopf', () => {
    expect(m.titel).toBe('Rechnungsprüfung: Abschlagsrechnung 2');
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Rechnungsnummer des Auftragnehmers', wert: 'AR-0815' },
        { bezeichnung: 'Eingang', wert: '12.11.2026' },
        { bezeichnung: 'Auftrags-LV', wert: auftragsLv.auftragsLeistungsverzeichnis.name },
        { bezeichnung: 'Auftragnehmer', wert: 'Beispielbau GmbH, Werkweg 2, 20000 Musterort' },
        { bezeichnung: 'Projektnummer', wert: 'P-2026-07' },
      ]),
    );
    expect(m.absender?.[0]).toBe('Planungsbüro Beispiel');
  });

  it('listet die abgerechneten Blätter nach Nummer und nennt ein unbekanntes Blatt (Q5)', () => {
    expect(abschnitt(m, 'Abgerechnete Aufmaßblätter')).toEqual([
      {
        art: 'liste',
        punkte: [
          'Blatt 3: Pflasterflächen Hof (10.11.2026)',
          'Ein Blatt, das es nicht mehr gibt (nicht gezählt)',
        ],
      },
    ]);
  });

  it('zeigt den Leistungsstand der aufgemessenen Positionen mit Vertrags-EP', () => {
    const [t] = abschnitt(m, 'Leistungsstand je Position');
    if (t?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(t.zeilen.map((z) => z.zellen.map(texte))).toEqual([
      ['01.0010', 'Pflaster verlegen', '1,500', 'm²', '10,000', '15,00'],
      ['01.0020', 'Randstein setzen', '3,000', 'm', '4,560', '13,68'],
      ['', 'Leistung (kumuliert)', '', '', '', '28,68'],
    ]);
  });

  it('führt die Abzugskette Zeile für Zeile, Abzüge mit Minuszeichen, bis zum Zahlbetrag', () => {
    const [felder] = abschnitt(m, 'Abzugskette');
    if (felder?.art !== 'felder') throw new Error('keine Felder');
    expect(felder.felder.map((f) => [f.bezeichnung, f.wert])).toEqual([
      ['Leistung (kumuliert)', '28,68 €'],
      ['Nachlass', '0,00 €'],
      ['Netto nach Nachlass', '28,68 €'],
      ['MwSt 19,00 %', '5,45 €'],
      ['Brutto kumuliert', '34,13 €'],
      ['Umlage Bauwesenversicherung (0,50 %)', '−0,17 €'],
      ['Sicherheitseinbehalt (5,00 %)', '−1,71 €'],
      ['Zahlbetrag Rechnung 1 (freigegeben)', '−10,00 €'],
      ['Zahlbetrag', '22,25 €'],
    ]);
    expect(felder.felder.at(-1)).toMatchObject({ fett: true });
  });

  it('vergleicht Forderung und Prüfung je genannter Größe', () => {
    const [t] = abschnitt(m, 'Gefordert und geprüft');
    if (t?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(t.zeilen.map((z) => z.zellen.map(texte))).toEqual([
      ['Netto (kumuliert)', '30,00', '28,68', '1,32'],
      ['Zahlbetrag', '20,00', '22,25', '-2,25'],
    ]);
  });

  it('sagt, ob die Rechnung freigegeben ist, und nennt den eingefrorenen Zahlbetrag', () => {
    expect(abschnitt(m, 'Freigabe')[0]).toEqual({
      art: 'absatz',
      text: 'Die Rechnung ist noch nicht freigegeben.',
    });
    const frei = baueRechnungspruefungModell({
      ...eingabe,
      rechnung: { ...RECHNUNG, freigabe: { zahlbetrag: '22.25' as Betrag } },
    });
    const [felder] = abschnitt(frei, 'Freigabe');
    expect(felder).toMatchObject({
      art: 'felder',
      felder: [{ bezeichnung: 'Freigegebener Zahlbetrag (eingefroren)', wert: '22,25 €', fett: true }],
    });
  });

  it('sagt ohne Blätter, dass noch nichts abgerechnet ist', () => {
    const leer = baueRechnungspruefungModell({
      ...eingabe,
      rechnung: { ...RECHNUNG, aufmassIds: [] as AufmassId[] },
    });
    expect(abschnitt(leer, 'Abgerechnete Aufmaßblätter')).toEqual([
      { art: 'absatz', text: 'Noch kein Aufmaßblatt abgerechnet.' },
    ]);
  });
});

describe('Rechnungsprüfung: PDF', () => {
  it('trägt Abzugskette, Forderung, Befunde und Freigabe im Seitentext', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeRechnungspruefungPdf(eingabe, schriften))));
    for (const s of [
      'Rechnungsprüfung: Abschlagsrechnung 2',
      'Planungsbüro Beispiel',
      'Brutto kumuliert 34,13 €',
      'Umlage Bauwesenversicherung (0,50 %) −0,17 €',
      'Sicherheitseinbehalt (5,00 %) −1,71 €',
      'Zahlbetrag Rechnung 1 (freigegeben) −10,00 €',
      'Zahlbetrag 22,25 €',
      'Warnung: Der geforderte Zahlbetrag weicht ab.',
      'Die Rechnung ist noch nicht freigegeben.',
      'Sachlich und rechnerisch richtig',
    ])
      expect(t, s).toContain(s);
  });

  it('ist bei gleicher Eingabe gleich', async () => {
    const a = await erzeugeRechnungspruefungPdf(eingabe, schriften);
    const b = await erzeugeRechnungspruefungPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

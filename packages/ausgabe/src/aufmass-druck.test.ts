// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt als PDF und Excel (Ticket 141): je Position die Menge des Blatts und darunter die Zeilen des Mengenansatzes mit
// Formel, Ausdruck und Zeilenergebnis; Zeilen ohne Position im Auftrags-LV bleiben sichtbar (Q5). Werte aus der Eingabe.

import { describe, expect, it } from 'vitest';
import { aufmassblattAlsExcel, baueAufmassblattModell, erzeugeAufmassblattPdf } from './index';
import type { AufmassblattEingabe, BerichtZelle } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand } from './testhilfe/bau';
import {
  AUFMASS,
  AUFMASS_ERGEBNISSE,
  BUERO,
  PROJEKT,
  auftragsLvAus,
  excelZeilen,
} from './testhilfe/kernkette';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const auftragsLv = auftragsLvAus(fixtureZustand('winzig').zustand);

const eingabe: AufmassblattEingabe = {
  aufmass: AUFMASS,
  auftragsLv,
  ergebnisse: AUFMASS_ERGEBNISSE,
  befundtexte: [{ schwere: 'warnung', ort: 'Zeile 4', text: 'Die Position gehört nicht zum Auftrags-LV.' }],
  projekt: PROJEKT,
  buero: BUERO,
  datum: '2026-11-13',
};

const texte = (z: string | BerichtZelle | undefined): string[] =>
  z === undefined
    ? []
    : typeof z === 'string'
      ? [z]
      : [...z.werte.map((w) => w.text), ...(z.hinweis === undefined ? [] : [z.hinweis])];

describe('Aufmaßblatt: Modell', () => {
  const m = baueAufmassblattModell(eingabe);
  const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
  if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');

  it('nennt Blatt, Datum, Auftrags-LV, Auftragnehmer und Projekt im Kopf', () => {
    expect(m.titel).toBe('Aufmaßblatt 3');
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Bezeichnung', wert: 'Pflasterflächen Hof' },
        { bezeichnung: 'Aufgemessen am', wert: '10.11.2026' },
        { bezeichnung: 'Auftrags-LV', wert: auftragsLv.auftragsLeistungsverzeichnis.name },
        { bezeichnung: 'Auftragnehmer', wert: 'Beispielbau GmbH, Werkweg 2, 20000 Musterort' },
        { bezeichnung: 'Projektnummer', wert: 'P-2026-07' },
      ]),
    );
    expect(m.absender?.[0]).toBe('Planungsbüro Beispiel');
  });

  it('ordnet die Positionen nach dem Auftrags-LV und setzt die Ansatzzeilen mit Formel und Ergebnis darunter', () => {
    expect(tabelle.spalten.map((s) => s.titel)).toEqual([
      'OZ',
      'Kurztext',
      'Zeile',
      'Formel',
      'Ansatz',
      'Ergebnis',
      'Menge',
      'Einh.',
    ]);
    expect(tabelle.zeilen.map((z) => z.zellen.map((c) => texte(c).join(' | ')))).toEqual([
      ['01.0010', 'Pflaster verlegen', '', '', '', '', '1,235', 'm²'],
      ['', '', '1', '91', 'A = 2,5*0,4', '1,000', '', ''],
      ['', '', '2', '91', 'A-0,765', '0,235', '', ''],
      ['01.0020', 'Randstein setzen', '', '', '', '', '– | keine Menge', 'm'],
      ['', '', '1', '91', '3,333/0', 'Fehler', '', ''],
      ['01.0030', 'Fläche abdichten', '', '', 'ohne Mengenansatz', '', '4,000', 'm²'],
      ['–', 'Position nicht im Auftrags-LV', '', '', 'ohne Mengenansatz', '', '1,000', ''],
    ]);
    expect(tabelle.zeilen.map((z) => z.fett === true)).toEqual([true, false, false, true, false, true, true]);
  });

  it('führt die Befunde des Blatts mit den Texten der Seite auf', () => {
    const befunde = m.abschnitte.find((a) => a.ueberschrift === 'Befunde');
    expect(befunde?.bloecke).toEqual([
      { art: 'liste', punkte: ['Warnung (Zeile 4): Die Position gehört nicht zum Auftrags-LV.'] },
    ]);
  });
});

describe('Aufmaßblatt: PDF und Excel', () => {
  it('trägt Positionen, Ansätze, Ergebnisse und Mengen im Seitentext', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeAufmassblattPdf(eingabe, schriften))));
    for (const s of [
      'Aufmaßblatt 3',
      'Pflasterflächen Hof',
      'Planungsbüro Beispiel',
      '01.0010 Pflaster verlegen',
      'A = 2,5*0,4 1,000',
      'A-0,765 0,235',
      '1,235 m²',
      '3,333/0 Fehler',
      'Position nicht im Auftrags-LV',
      'Warnung (Zeile 4): Die Position gehört nicht zum Auftrags-LV.',
    ])
      expect(t, s).toContain(s);
  });

  it('schreibt Ergebnisse und Mengen als Zahlen ins Blatt', () => {
    const z = excelZeilen(aufmassblattAlsExcel(eingabe));
    const kopf = z.findIndex((r) => r[0] === 'OZ');
    expect(z[kopf]).toEqual([
      'OZ',
      'Kurztext',
      'Zeile',
      'Formel',
      'Ansatz',
      'Ergebnis',
      'Menge',
      'Menge Hinweis',
      'Einh.',
    ]);
    expect(z[kopf + 1]).toEqual(['01.0010', 'Pflaster verlegen', '', '', '', '', '1.235', '', 'm²']);
    expect(z[kopf + 2]).toEqual(['', '', '1', '91', 'A = 2,5*0,4', '1']);
  });

  it('ist bei gleicher Eingabe gleich', async () => {
    const a = await erzeugeAufmassblattPdf(eingabe, schriften);
    const b = await erzeugeAufmassblattPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Excel aus dem Berichtsmodell (Ticket 141): Zahlen stehen als Zahlen mit den Nachkommastellen ihrer Art in der Zelle (N3,
// N4), Teile einer Spalte (EP, GP) als eigene Spalten, Hinweise als Text daneben. Erwartete Werte stehen im Modell.

import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { Betrag, Einheitspreis } from '@tethys/vertrag';
import { berichtAlsExcel } from './bericht-excel';
import { wert } from './bericht';
import type { Berichtsmodell } from './bericht';
import { excelZeilen as zeilen } from './testhilfe/kernkette';
import { leseXlsx } from './xlsx';

const modell: Berichtsmodell = {
  titel: 'Soll/Ist: Probe [1]',
  absender: ['Planungsbüro Beispiel', 'Planweg 1'],
  kopf: [{ bezeichnung: 'Projekt', wert: 'Neubau Beispiel' }],
  datum: '13.11.2026',
  erstellt: '2026-11-13',
  abschnitte: [
    {
      ueberschrift: 'Positionen',
      bloecke: [
        {
          art: 'tabelle',
          spalten: [
            { titel: 'OZ', breite: 40 },
            { titel: 'Bieter A', breite: 50, rechts: true, teile: ['EP', 'GP'] },
            { titel: 'Kurztext', breite: '*' },
          ],
          zeilen: [
            {
              zellen: [
                '01.0010',
                {
                  werte: [wert.einheitspreis('12.500' as Einheitspreis), wert.betrag('1250.00' as Betrag)],
                  hinweis: 'Ausreißer hoch',
                },
                'Aushub',
              ],
              kleinerText: 'über der Schwelle',
            },
            { zellen: ['01.0020', { werte: [wert.einheitspreis(null), wert.betrag(null)] }, 'Verfüllen'] },
          ],
        },
      ],
    },
    {
      ueberschrift: 'Summen',
      bloecke: [
        {
          art: 'felder',
          felder: [{ bezeichnung: 'Netto', wert: '1.250,00 €', zahl: { wert: '1250.00', art: 'betrag' } }],
        },
      ],
    },
  ],
};

describe('berichtAlsExcel', () => {
  const bytes = berichtAlsExcel(modell);
  const z = zeilen(bytes);

  it('schreibt Titel, Absender, Kopf und Stand oben', () => {
    expect(z[0]).toEqual(['Soll/Ist: Probe [1]']);
    expect(z).toContainEqual(['Absender', 'Planungsbüro Beispiel, Planweg 1']);
    expect(z).toContainEqual(['Projekt', 'Neubau Beispiel']);
    expect(z).toContainEqual(['Stand', '13.11.2026']);
  });

  it('teilt eine Spalte mit Teilen in eigene Spalten und schreibt Zahlen als Zahlen', () => {
    const kopf = z.findIndex((r) => r[0] === 'OZ');
    expect(z[kopf]).toEqual(['OZ', 'Bieter A EP', 'Bieter A GP', 'Bieter A Hinweis', 'Kurztext', 'Hinweis']);
    expect(z[kopf + 1]).toEqual(['01.0010', '12.5', '1250', 'Ausreißer hoch', 'Aushub', 'über der Schwelle']);
    expect(z[kopf + 2]).toEqual(['01.0020', '–', '–', '', 'Verfüllen']);
    const lesung = leseXlsx(bytes);
    if (!lesung.ok) throw new Error(lesung.meldung);
    expect(lesung.zeilen.get(kopf + 2)?.get(1)?.wert.art).toBe('zahl');
  });

  it('schreibt Felder mit dem Betrag als Zahl', () => {
    expect(z).toContainEqual(['Netto', '1250']);
  });

  it('nennt das Blatt nach dem Titel, ohne die in Blattnamen verbotenen Zeichen und höchstens 31 Zeichen lang', () => {
    const blattname = (b: Uint8Array): string | undefined => {
      const wb = unzipSync(b)['xl/workbook.xml'];
      return /<sheet name="([^"]*)"/.exec(wb === undefined ? '' : strFromU8(wb))?.[1];
    };
    expect(blattname(bytes)).toBe('Soll-Ist- Probe -1-');
    expect(blattname(berichtAlsExcel({ ...modell, titel: 'x'.repeat(80) }))).toBe('x'.repeat(31));
  });

  it('ist bei gleicher Eingabe gleich', () => {
    expect(Buffer.from(berichtAlsExcel(modell)).equals(Buffer.from(bytes))).toBe(true);
  });
});

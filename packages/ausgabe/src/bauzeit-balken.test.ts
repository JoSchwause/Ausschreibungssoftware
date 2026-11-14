// SPDX-License-Identifier: AGPL-3.0-or-later
// Balkenplan im Bauzeitenplan-PDF (Ticket 153, E12 K): je Vorgang ein Balken auf einer Zeitachse in Kalendertagen vom
// Projektbeginn bis zum Projektende, Meilenstein als Raute, Abschnitte der Achse je Monat. Die Lage steht im Modell als Anteil
// der Achse (0 bis 1); die Termine kommen aus dem Ergebnis der Terminrechnung.

import { describe, expect, it } from 'vitest';
import { baueBauzeitenplanModell, berichtAlsExcel, erzeugeBauzeitenplanPdf } from './index';
import type { BerichtBlock, Berichtsmodell } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { excelZeilen } from './testhilfe/kernkette';
import * as fx from './testhilfe/x2x4';

const schriften = schriftenAusDateien();
const eingabe = {
  plan: fx.bauzeitenplan,
  ergebnis: fx.bauzeitenergebnis,
  befundtexte: [],
  datum: '2026-12-01',
};

function balkenplan(m: Berichtsmodell): Extract<BerichtBlock, { art: 'balkenplan' }> | undefined {
  for (const b of m.abschnitte.flatMap((a) => a.bloecke)) if (b.art === 'balkenplan') return b;
  return undefined;
}

describe('Bauzeitenplan: Balkenplan im Modell', () => {
  const m = baueBauzeitenplanModell(eingabe);
  const plan = balkenplan(m);

  it('steht als eigener Abschnitt nach der Tabelle', () => {
    expect(m.abschnitte.map((a) => a.ueberschrift)).toEqual([null, 'Balkenplan', 'Kritischer Weg']);
  });

  it('teilt die Achse (16.11. bis 07.12.2026, 22 Kalendertage) in Monate', () => {
    expect(plan?.achse).toEqual([
      { text: '11.2026', von: 0, bis: 15 / 22 },
      { text: '12.2026', von: 15 / 22, bis: 1 },
    ]);
  });

  it('legt je Vorgang den Balken vom Beginn bis zum Ende des letzten Tages, den Meilenstein an seinen Tag', () => {
    expect(plan?.zeilen).toEqual([
      { name: '1 Rohbau', fett: true, balken: { art: 'sammelvorgang', von: 0, bis: 1 } },
      { name: '1.1 Erdarbeiten', einrueckung: 1, balken: { art: 'kritisch', von: 0, bis: 5 / 22 } },
      { name: '1.2 Mauerwerk EG', einrueckung: 1, balken: { art: 'kritisch', von: 7 / 22, bis: 19 / 22 } },
      { name: 'Rohbau fertig', einrueckung: 1, balken: { art: 'meilenstein', von: 21 / 22, bis: 21 / 22 } },
    ]);
  });

  it('zeichnet einen Vorgang mit Puffer als normalen Vorgang', () => {
    const p = baueBauzeitenplanModell({
      ...eingabe,
      ergebnis: {
        ...fx.bauzeitenergebnis,
        vorgaenge: fx.bauzeitenergebnis.vorgaenge.map((v, i) =>
          i === 1 && v.termine !== null ? { ...v, termine: { ...v.termine, kritisch: false } } : v,
        ),
      },
    });
    expect(balkenplan(p)?.zeilen[1]?.balken?.art).toBe('vorgang');
  });

  it('nimmt ein Jahr je Abschnitt, wenn der Plan mehr als 14 Monate umfasst', () => {
    const lang = baueBauzeitenplanModell({
      ...eingabe,
      ergebnis: { ...fx.bauzeitenergebnis, projektende: '2028-03-31' },
    });
    expect(balkenplan(lang)?.achse.map((a) => a.text)).toEqual(['2026', '2027', '2028']);
  });

  it('ohne gerechnete Termine gibt es keinen Balkenplan, sondern einen Satz', () => {
    const ohne = baueBauzeitenplanModell({
      ...eingabe,
      ergebnis: { ...fx.bauzeitenergebnis, projektende: null, vorgaenge: [], kritischeWege: [] },
    });
    expect(balkenplan(ohne)).toBeUndefined();
    const a = ohne.abschnitte.find((x) => x.ueberschrift === 'Balkenplan');
    expect(a?.bloecke).toEqual([{ art: 'absatz', text: 'Keine Termine berechnet; kein Balkenplan.' }]);
  });
});

describe('Bauzeitenplan: Balkenplan im PDF', () => {
  it('druckt Überschrift, Monate und Vorgänge des Balkenplans', async () => {
    const t = alsText(await liesPdf(await erzeugeBauzeitenplanPdf(eingabe, schriften))).replace(/\s+/g, ' ');
    for (const s of ['Balkenplan', '11.2026', '12.2026', '1.1 Erdarbeiten', '1.2 Mauerwerk EG'])
      expect(t, s).toContain(s);
  });

  it('trennt die Vorgänge des kritischen Wegs mit einem Zeichen, das die Schrift kennt', async () => {
    const t = alsText(await liesPdf(await erzeugeBauzeitenplanPdf(eingabe, schriften))).replace(/\s+/g, ' ');
    expect(t).toContain('1.1 Erdarbeiten › 1.2 Mauerwerk EG › Rohbau fertig');
    expect(t).not.toContain('→');
  });

  it('bleibt bei gleicher Eingabe gleich', async () => {
    const a = await erzeugeBauzeitenplanPdf(eingabe, schriften);
    const b = await erzeugeBauzeitenplanPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it('Excel schreibt je Vorgang eine Zeile mit dem Namen', () => {
    const z = excelZeilen(berichtAlsExcel(baueBauzeitenplanModell(eingabe)));
    expect(z.filter((r) => r[0] === '1.1 Erdarbeiten')).toHaveLength(1);
  });
});

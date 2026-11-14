// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostenermittlung und Kostenkontrolle als PDF und Excel (Ticket 153, E12): je Kostengruppe mit Bezeichnung, wo vorhanden,
// netto; in der Kostenkontrolle „ohne Kostengruppe“ und der Nachlass als eigene Zeilen vor dem Gesamt (D-37). Werte aus der
// Eingabe.

import { describe, expect, it } from 'vitest';
import {
  baueKostenermittlungModell,
  baueKostenkontrolleModell,
  erzeugeKostenermittlungPdf,
  erzeugeKostenkontrollePdf,
  kostenermittlungAlsExcel,
  kostenkontrolleAlsExcel,
} from './index';
import type {
  BerichtBlock,
  BerichtZelle,
  Berichtsmodell,
  KostenermittlungEingabe,
  KostenkontrolleEingabe,
} from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { BUERO, PROJEKT, excelZeilen } from './testhilfe/kernkette';
import {
  BEZEICHNUNGEN,
  KOSTENERMITTLUNG,
  KOSTENERMITTLUNG_ERGEBNIS,
  KOSTENKONTROLLE,
} from './testhilfe/kosten';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const texte = (z: string | BerichtZelle | undefined): string =>
  z === undefined
    ? ''
    : typeof z === 'string'
      ? z
      : [...z.werte.map((w) => w.text), ...(z.hinweis === undefined ? [] : [z.hinweis])].join(' | ');

function tabelleVon(m: Berichtsmodell): Extract<BerichtBlock, { art: 'tabelle' }> {
  for (const b of m.abschnitte.flatMap((a) => a.bloecke)) if (b.art === 'tabelle') return b;
  throw new Error('keine Tabelle');
}
const absaetze = (m: Berichtsmodell): string =>
  m.abschnitte
    .flatMap((a) => a.bloecke)
    .flatMap((b) => (b.art === 'absatz' ? [b.text] : b.art === 'liste' ? b.punkte : []))
    .join('\n');

// --- Kostenermittlung --------------------------------------------------------------------------------------------

const ermittlung: KostenermittlungEingabe = {
  kostenermittlung: KOSTENERMITTLUNG,
  ergebnis: KOSTENERMITTLUNG_ERGEBNIS,
  bezeichnungen: BEZEICHNUNGEN,
  projekt: PROJEKT,
  buero: BUERO,
  datum: '2026-11-14',
};

describe('Kostenermittlung: Modell', () => {
  const m = baueKostenermittlungModell(ermittlung);

  it('trägt die Stufe als Titel und nennt Name, Projekt und Absender', () => {
    expect(m.titel).toBe('Kostenberechnung');
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Kostenermittlung', wert: 'Entwurf' },
        { bezeichnung: 'Projekt', wert: 'Neubau Beispiel' },
      ]),
    );
    expect(m.absender?.[0]).toBe('Planungsbüro Beispiel');
    expect(m.datum).toBe('14.11.2026');
  });

  it('zeigt je Kostengruppe Bezeichnung (wo vorhanden), eigenen Betrag, Summe und Bemerkung, dann das Gesamt', () => {
    const t = tabelleVon(m);
    expect(t.spalten.map((s) => s.titel)).toEqual([
      'KG',
      'Bezeichnung',
      'Eigener Betrag',
      'Summe',
      'Bemerkung',
    ]);
    expect(t.zeilen.map((z) => z.zellen.map(texte))).toEqual([
      ['300', 'Eigene Gruppe Hochbau', '', '165.000,00', ''],
      ['330', 'Eigene Gruppe Mauern', '120.000,00', '120.000,00', 'nach Planstand 3'],
      ['340', '', '45.000,00', '45.000,00', ''],
      ['400', '', '30.000,00', '30.000,00', ''],
      ['', 'Gesamt', '', '195.000,00', ''],
    ]);
    expect(t.zeilen.map((z) => z.fett === true)).toEqual([true, false, false, true, true]);
  });

  it('sagt, dass alle Beträge netto sind', () => {
    expect(absaetze(m)).toContain('netto');
  });

  it('nennt eine Kostenermittlung ohne Einträge, statt eine leere Tabelle zu drucken', () => {
    const leer = baueKostenermittlungModell({
      ...ermittlung,
      kostenermittlung: { ...KOSTENERMITTLUNG, eintraege: [] },
      ergebnis: { gruppen: [], gesamtsumme: '0.00' as never },
    });
    expect(absaetze(leer)).toContain('Noch keine Einträge.');
  });

  it('lässt ohne Deckblatt Absender und Projektangaben weg', () => {
    const ohne = baueKostenermittlungModell({
      ...ermittlung,
      druckprofil: {
        name: 'x',
        mitPreisen: true,
        langtext: { art: 'voll' },
        titelsummen: true,
        schlussblock: true,
        deckblatt: false,
        kopfzeile: null,
        fusszeile: null,
        seitenrand: 'normal',
      },
    });
    expect(ohne.absender).toEqual([]);
    expect(ohne.kopf.map((f) => f.bezeichnung)).toEqual(['Kostenermittlung']);
  });
});

describe('Kostenermittlung: PDF und Excel', () => {
  it('trägt Kostengruppen, Bezeichnungen, Beträge und das Gesamt im Seitentext', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeKostenermittlungPdf(ermittlung, schriften))));
    for (const s of [
      'Kostenberechnung',
      'Planungsbüro Beispiel',
      'Kostenermittlung Entwurf',
      '300 Eigene Gruppe Hochbau 165.000,00',
      '330 Eigene Gruppe Mauern 120.000,00 120.000,00 nach Planstand 3',
      '340 45.000,00 45.000,00',
      'Gesamt 195.000,00',
    ])
      expect(t, s).toContain(s);
  });

  it('schreibt die Beträge als Zahlen und die Kostengruppe als Text', () => {
    const z = excelZeilen(kostenermittlungAlsExcel(ermittlung));
    expect(z[0]).toEqual(['Kostenberechnung']);
    expect(z.find((r) => r[0] === '330')).toEqual([
      '330',
      'Eigene Gruppe Mauern',
      '120000',
      '120000',
      'nach Planstand 3',
    ]);
    expect(z.find((r) => r[0] === '300')).toEqual(['300', 'Eigene Gruppe Hochbau', '', '165000']);
    expect(z.find((r) => r[1] === 'Gesamt')).toEqual(['', 'Gesamt', '', '195000']);
  });
});

// --- Kostenkontrolle ---------------------------------------------------------------------------------------------

const kontrolle: KostenkontrolleEingabe = {
  kontrolle: KOSTENKONTROLLE,
  budget: { name: KOSTENERMITTLUNG.name, stufe: KOSTENERMITTLUNG.stufe },
  bezeichnungen: BEZEICHNUNGEN,
  auftragsLvs: ['Rohbau', 'Dach'],
  projekt: PROJEKT,
  buero: BUERO,
  datum: '2026-11-14',
};

describe('Kostenkontrolle: Modell', () => {
  const m = baueKostenkontrolleModell(kontrolle);

  it('nennt Budget, Auftrags-LVs, Projekt und Absender', () => {
    expect(m.titel).toBe('Kostenkontrolle');
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Budget', wert: 'Entwurf (Kostenberechnung)' },
        { bezeichnung: 'Auftrags-LV', wert: 'Rohbau, Dach' },
        { bezeichnung: 'Projekt', wert: 'Neubau Beispiel' },
      ]),
    );
    expect(m.absender?.[0]).toBe('Planungsbüro Beispiel');
  });

  it('zeigt je Kostengruppe Budget, Vergabe, Abrechnung und Abweichung; ohne Kostengruppe und Nachlass als eigene Zeilen', () => {
    const t = tabelleVon(m);
    expect(t.spalten.map((s) => s.titel)).toEqual([
      'KG',
      'Bezeichnung',
      'Budget',
      'Vergabe',
      'Abrechnung',
      'Abweichung',
    ]);
    expect(t.zeilen.map((z) => z.zellen.map(texte))).toEqual([
      ['300', 'Eigene Gruppe Hochbau', '165.000,00', '158.400,50', '80.000,00', '-6.599,50 | unter Budget'],
      ['330', 'Eigene Gruppe Mauern', '120.000,00', '125.000,25', '80.000,00', '5.000,25 | über Budget'],
      ['340', '', '45.000,00', '33.400,25', '0,00', '-11.599,75 | unter Budget'],
      ['400', '', '30.000,00', '0,00', '0,00', '-30.000,00 | unter Budget'],
      ['', 'Ohne Kostengruppe', '–', '1.200,00', '300,00', '1.200,00 | über Budget'],
      ['', 'Nachlass', '–', '-3.000,00', '-1.500,00', '-3.000,00 | unter Budget'],
      ['', 'Gesamt', '195.000,00', '156.600,50', '78.800,00', '-38.399,50 | unter Budget'],
    ]);
    expect(t.zeilen.at(-1)?.fett).toBe(true);
  });

  it('erklärt die Spalten: netto, Nachlass nicht verteilt, Abrechnung ohne Umlagen, Einbehalt und MwSt', () => {
    const a = absaetze(m);
    expect(a).toContain('netto');
    expect(a).toContain('Nachlass');
    expect(a).toContain('ohne Umlagen, Einbehalt und MwSt');
  });

  it('ohne Budget: Budget und Abweichung als Strich, der Kopf sagt es', () => {
    const ohne = baueKostenkontrolleModell({
      ...kontrolle,
      budget: null,
      kontrolle: {
        ...KOSTENKONTROLLE,
        kostengruppen: KOSTENKONTROLLE.kostengruppen.map((g) => ({ ...g, budget: null, abweichung: null })),
        gesamt: { ...KOSTENKONTROLLE.gesamt, budget: null, abweichung: null },
        ohneKostengruppe: { ...KOSTENKONTROLLE.ohneKostengruppe, abweichung: null },
        nachlass: { ...KOSTENKONTROLLE.nachlass, abweichung: null },
      },
    });
    expect(ohne.kopf).toContainEqual({ bezeichnung: 'Budget', wert: 'Kein Budget gewählt' });
    const t = tabelleVon(ohne);
    expect(t.zeilen[0]?.zellen.map(texte)).toEqual([
      '300',
      'Eigene Gruppe Hochbau',
      '–',
      '158.400,50',
      '80.000,00',
      '–',
    ]);
  });

  it('ohne Rechnung bleibt die Spalte Abrechnung leer, mit einem Satz dazu', () => {
    const ohne = baueKostenkontrolleModell({ ...kontrolle, mitAbrechnung: false });
    const t = tabelleVon(ohne);
    expect(t.zeilen.map((z) => texte(z.zellen[4]))).toEqual(['–', '–', '–', '–', '–', '–', '–']);
    expect(absaetze(ohne)).toContain('Noch keine Rechnung');
  });

  it('druckt Hinweise der Kostenkontrolle als Liste', () => {
    const mit = baueKostenkontrolleModell({
      ...kontrolle,
      hinweise: ['Kostengruppe 350 liegt nicht in der Gliederung des gewählten Budgets.'],
    });
    expect(mit.abschnitte.find((a) => a.ueberschrift === 'Hinweise')?.bloecke).toEqual([
      { art: 'liste', punkte: ['Kostengruppe 350 liegt nicht in der Gliederung des gewählten Budgets.'] },
    ]);
    expect(m.abschnitte.find((a) => a.ueberschrift === 'Hinweise')).toBeUndefined();
  });
});

describe('Kostenkontrolle: PDF und Excel', () => {
  it('trägt Kostengruppen, Nachlass und Gesamt im Seitentext', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeKostenkontrollePdf(kontrolle, schriften))));
    for (const s of [
      'Kostenkontrolle',
      'Planungsbüro Beispiel',
      'Budget Entwurf (Kostenberechnung)',
      '330 Eigene Gruppe Mauern 120.000,00 125.000,25 80.000,00 5.000,25',
      'über Budget',
      'Ohne Kostengruppe – 1.200,00 300,00 1.200,00',
      'Nachlass – -3.000,00 -1.500,00 -3.000,00',
      'Gesamt 195.000,00 156.600,50 78.800,00 -38.399,50',
    ])
      expect(t, s).toContain(s);
  });

  it('schreibt die Beträge als Zahlen, den Hinweis der Abweichung als Text daneben', () => {
    const z = excelZeilen(kostenkontrolleAlsExcel(kontrolle));
    expect(z.find((r) => r[0] === '330')).toEqual([
      '330',
      'Eigene Gruppe Mauern',
      '120000',
      '125000.25',
      '80000',
      '5000.25',
      'über Budget',
    ]);
    expect(z.find((r) => r[1] === 'Nachlass')).toEqual([
      '',
      'Nachlass',
      '–',
      '-3000',
      '-1500',
      '-3000',
      'unter Budget',
    ]);
    expect(z.find((r) => r[1] === 'Gesamt')).toEqual([
      '',
      'Gesamt',
      '195000',
      '156600.5',
      '78800',
      '-38399.5',
      'unter Budget',
    ]);
  });
});

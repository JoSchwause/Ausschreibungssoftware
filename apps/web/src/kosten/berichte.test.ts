// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 154 (E12): Kostenermittlung und Kostenkontrolle als PDF und Excel. Die App reicht das Ergebnis von `kosten`, die
// Bezeichnungen der Kostengruppen, Projekt, Büro und Datum an `ausgabe` (D-153.1); geprüft am Berichtsmodell, das Vorschau,
// PDF und Excel gemeinsam lesen. Erwartete Werte von Hand aus den Eingaben.

import { baueKostenermittlungModell, baueKostenkontrolleModell, type Berichtsmodell } from '@tethys/ausgabe';
import type { BerichtBlock, BerichtZelle } from '@tethys/ausgabe';
import { kostenkontrolleBerechnen } from '@tethys/kosten';
import type {
  Betrag,
  Kostenermittlung,
  KostenermittlungId,
  Kostengruppennummer,
  Projekt,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  dateinameKostenermittlung,
  dateinameKostenkontrolle,
  kostenermittlungEingabe,
  kostenkontrolleEingabe,
} from './berichte';
import { kontrollbefundText } from './kontrolle';

const projekt: Projekt = {
  id: 'p1' as ProjektId,
  name: 'Musterhaus',
  bauherr: { name: 'Bauherr', anschrift: '' },
} as unknown as Projekt;

const ke: Kostenermittlung = {
  id: 'k1' as KostenermittlungId,
  projektId: 'p1' as ProjektId,
  name: 'KB Entwurf',
  stufe: 'kostenberechnung',
  eintraege: [
    { nummer: '390' as Kostengruppennummer, betrag: '6000.00' as Betrag },
    { nummer: '310' as Kostengruppennummer, betrag: '26000.00' as Betrag, bemerkung: 'Reserve' },
  ],
};

const kopf = {
  projekt,
  buero: null,
  datum: '2026-11-14',
  bezeichnungen: new Map([['390', 'Sonstige Maßnahmen']]),
};

const zellText = (z: string | BerichtZelle | undefined): string =>
  z === undefined ? '' : typeof z === 'string' ? z : z.werte.map((w) => w.text).join(' ');

function tabelle(m: Berichtsmodell): string[][] {
  const t = m.abschnitte.flatMap((a) => a.bloecke).find((b): b is Extract<BerichtBlock, { art: 'tabelle' }> => b.art === 'tabelle');
  if (t === undefined) throw new Error('keine Tabelle');
  return t.zeilen.map((z) => z.zellen.map(zellText));
}

describe('Kostenermittlung als Bericht', () => {
  it('je Kostengruppe mit der Bezeichnung des Nutzers, Summen aus `kosten`, Kopf mit Projekt und Datum', () => {
    const m = baueKostenermittlungModell(kostenermittlungEingabe(ke, kopf));
    expect(m.titel).toBe('Kostenberechnung');
    expect(m.datum).toBe('14.11.2026');
    expect(m.kopf).toEqual(
      expect.arrayContaining([
        { bezeichnung: 'Kostenermittlung', wert: 'KB Entwurf' },
        { bezeichnung: 'Projekt', wert: 'Musterhaus' },
      ]),
    );
    // 300 = 6.000 + 26.000 (Summe der Gruppen darunter), ohne eigenen Betrag.
    expect(tabelle(m)).toEqual([
      ['300', '', '', '32.000,00', ''],
      ['310', '', '26.000,00', '26.000,00', 'Reserve'],
      ['390', 'Sonstige Maßnahmen', '6.000,00', '6.000,00', ''],
      ['', 'Gesamt', '', '32.000,00', ''],
    ]);
  });

  it('Dateinamen nach dem Namen der Kostenermittlung bzw. des Projekts', () => {
    expect(dateinameKostenermittlung('KB Entwurf', 'pdf')).toBe('Kostenermittlung KB Entwurf.pdf');
    expect(dateinameKostenermittlung('KB/1', 'xlsx')).toBe('Kostenermittlung KB1.xlsx');
    expect(dateinameKostenkontrolle('Musterhaus', 'xlsx')).toBe('Kostenkontrolle Musterhaus.xlsx');
  });
});

describe('Kostenkontrolle als Bericht', () => {
  it('Budget im Kopf, ohne Rechnung bleibt die Abrechnung leer, Hinweise mit den Texten der Seite', () => {
    const kontrolle = kostenkontrolleBerechnen({ budget: ke, auftraege: [], leistungsstaende: [] });
    const m = baueKostenkontrolleModell(
      kostenkontrolleEingabe({ kontrolle, budget: ke, auftraege: [], mitAbrechnung: false }, kopf),
    );
    expect(m.titel).toBe('Kostenkontrolle');
    expect(m.kopf).toEqual(
      expect.arrayContaining([{ bezeichnung: 'Budget', wert: 'KB Entwurf (Kostenberechnung)' }]),
    );
    const z = tabelle(m);
    expect(z.find((r) => r[0] === '390')).toEqual(['390', 'Sonstige Maßnahmen', '6.000,00', '0,00', '–', '-6.000,00']);
    expect(z.at(-1)).toEqual(['', 'Gesamt', '32.000,00', '0,00', '–', '-32.000,00']);
  });

  it('die Hinweise stehen im Druck mit denselben Sätzen wie auf der Seite', () => {
    const kontrolle = kostenkontrolleBerechnen({ budget: null, auftraege: [], leistungsstaende: [] });
    const befund = {
      code: 'kostengruppe-ohne-budget' as const,
      schwere: 'hinweis' as const,
      auftragsLvId: null,
      positionId: null,
      nummer: '340' as Kostengruppennummer,
      spalte: null,
      meldung: 'intern',
    };
    const e = kostenkontrolleEingabe(
      { kontrolle: { ...kontrolle, befunde: [befund] }, budget: null, auftraege: [], mitAbrechnung: true },
      kopf,
    );
    expect(e.hinweise).toEqual([kontrollbefundText(befund)]);
    expect(e.hinweise?.[0]).toBe('Kostengruppe 340 liegt nicht in der Gliederung des gewählten Budgets.');
    expect(baueKostenkontrolleModell(e).kopf).toEqual(
      expect.arrayContaining([{ bezeichnung: 'Budget', wert: 'Kein Budget gewählt' }]),
    );
  });
});

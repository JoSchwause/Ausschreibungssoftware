// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 118: Ansicht des Bauzeitenplans (Grid-Zeilen, Balken, Kopfzeile, Befunde) auf dem Plan aus `fixtures/bauzeit.json`.
// Die erwarteten Texte folgen aus den Sollwerten der Fixture (Ticket 112, von Hand hergeleitet), in de-DE geschrieben.

import { readFileSync } from 'node:fs';
import { BAUZEIT_ANNAHMEN, bauzeitenplanBerechnen } from '@tethys/bauzeit';
import type { Bauzeitenplan, VorgangId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { planAnsicht } from './ansicht';

const fx = JSON.parse(
  readFileSync(new URL('../../../../fixtures/bauzeit.json', import.meta.url), 'utf8'),
) as {
  plan: Bauzeitenplan;
};
const plan = fx.plan;
const ergebnis = bauzeitenplanBerechnen(plan);
const id = (n: string): VorgangId => `019b7a12-b000-7000-8000-0000000000${n}` as VorgangId;

const zelle = (a: ReturnType<typeof planAnsicht>, zeile: string, spalte: string): string | undefined =>
  a.zeilen.find((z) => z.id === zeile)?.zellen[spalte]?.text;

describe('Ansicht des Bauzeitenplans', () => {
  const a = planAnsicht(plan, ergebnis, new Set());

  it('Kopfzeile: Projektbeginn, Projektende, kritischer Weg über die Nummern', () => {
    expect(a.kopf).toEqual({
      projektbeginn: '02.11.2026',
      projektende: '24.11.2026',
      kritischerWeg: '1.1 → 1.2 → 1.3 → 2 → 3',
    });
  });

  it('Spalten: Nr., Vorgang, Dauer, Beginn, Ende, Gesamtpuffer und die Balkenspalte', () => {
    expect(a.spalten.map((s) => s.kopf)).toEqual([
      'Nr.',
      'Vorgang',
      'Dauer (AT)',
      'Beginn',
      'Ende',
      'Gesamtpuffer',
      'Zeitplan',
    ]);
  });

  it('Zeilen in Planreihenfolge mit Baum, Terminen und Puffer laut Soll', () => {
    expect(a.zeilen.map((z) => [z.id, z.tiefe, z.art, z.hatUnterknoten])).toEqual([
      [id('11'), 0, 'gliederung', true],
      [id('12'), 1, 'position', false],
      [id('13'), 1, 'position', false],
      [id('14'), 1, 'position', false],
      [id('15'), 0, 'position', false],
      [id('16'), 0, 'position', false],
      [id('17'), 0, 'position', false],
      [id('18'), 0, 'position', false],
    ]);
    const zeilen = a.zeilen.map((z) =>
      ['nummer', 'dauer', 'beginn', 'ende', 'puffer'].map((s) => zelle(a, z.id, s)),
    );
    expect(zeilen).toEqual([
      ['1', '', '02.11.2026', '13.11.2026', '0'],
      ['1.1', '4', '02.11.2026', '05.11.2026', '0'],
      ['1.2', '4', '04.11.2026', '09.11.2026', '0'],
      ['1.3', '5', '09.11.2026', '13.11.2026', '0'],
      ['2', 'Meilenstein', '16.11.2026', '16.11.2026', '0'],
      ['3', '6', '16.11.2026', '24.11.2026', '0'],
      ['4', '2', '12.11.2026', '13.11.2026', '4'],
      ['5', '3', '13.11.2026', '17.11.2026', '4'],
    ]);
  });

  it('kritische Vorgänge tragen das Kennzeichen, die übrigen nicht; der Meilenstein erklärt seine Lesart (D-63)', () => {
    const kritisch = a.zeilen
      .filter((z) => z.zellen['vorgang']?.kennzeichen?.includes('kritisch'))
      .map((z) => z.id);
    expect(kritisch).toEqual([id('11'), id('12'), id('13'), id('14'), id('15'), id('16')]);
    expect(a.zeilen.find((z) => z.id === id('15'))?.zellen['dauer']?.tooltip).toBe(
      BAUZEIT_ANNAHMEN.meilenstein,
    );
  });

  it('Balken: Tagesindex ab dem Projektbeginn, Ende exklusiv, Meilenstein ohne Breite', () => {
    const achse = a.spalten.at(-1)?.zeitleiste;
    // Achse ab Mo 02.11.2026; freie Tage: Wochenenden und Buß- und Bettag (Index 16)
    expect(achse?.freieTage?.slice(0, 5)).toEqual([5, 6, 12, 13, 16]);
    expect(achse?.kopf[0]?.text).toBe('November 2026');
    expect(achse?.unterkopf?.[0]).toEqual({ text: 'KW 45', vonTag: 0, bisTag: 7 });
    expect(achse?.markierungen).toEqual([
      { tag: 23, art: 'projektende', beschreibung: 'Projektende 24.11.2026' },
    ]);
    const balken = (n: string) => a.zeilen.find((z) => z.id === id(n))?.zellen['balken']?.balken;
    expect(balken('11')).toMatchObject({ vonTag: 0, bisTag: 12, art: 'sammelvorgang', kritisch: true });
    expect(balken('13')).toMatchObject({ vonTag: 2, bisTag: 8, art: 'vorgang', kritisch: true });
    expect(balken('15')).toMatchObject({ vonTag: 14, bisTag: 14, art: 'meilenstein' });
    expect(balken('17')).toMatchObject({ vonTag: 10, bisTag: 12, kritisch: false });
    expect(balken('17')?.beschreibung).toBe(
      '12.11.2026 bis 13.11.2026, 2 Arbeitstage, Gesamtpuffer 4 Arbeitstage',
    );
    expect(balken('15')?.beschreibung).toBe('Meilenstein am 16.11.2026, kritisch');
  });

  it('Zugeklappter Sammelvorgang verbirgt seine Kinder', () => {
    const zu = planAnsicht(plan, ergebnis, new Set([id('11')]));
    expect(zu.zeilen.map((z) => z.id)).toEqual([id('11'), id('15'), id('16'), id('17'), id('18')]);
    expect(zu.zeilen[0]?.aufgeklappt).toBe(false);
  });

  it('Ist-Termine und Fortschritt als zweiter Balken bzw. Anteil', () => {
    const mitIst: Bauzeitenplan = {
      ...plan,
      vorgaenge: plan.vorgaenge.map((v) =>
        v.id === id('12')
          ? { ...v, ist: { beginn: '2026-11-03', ende: '2026-11-06', fortschritt: '50.00' as never } }
          : v,
      ),
    };
    const b = planAnsicht(mitIst, bauzeitenplanBerechnen(mitIst), new Set()).zeilen.find(
      (z) => z.id === id('12'),
    )?.zellen['balken']?.balken;
    expect(b?.ist).toEqual({ vonTag: 1, bisTag: 5 });
    expect(b?.fortschritt).toBe(50);
  });

  it('Befunde je Schwere mit Ort am Vorgang (Sprungziel)', () => {
    const zyklus: Bauzeitenplan = {
      ...plan,
      vorgaenge: plan.vorgaenge.map((v) =>
        v.id === id('12')
          ? { ...v, vorgaenger: [{ vorgaengerId: id('13'), art: 'ende-anfang', abstand: 0 }] }
          : v,
      ),
    };
    const b = planAnsicht(zyklus, bauzeitenplanBerechnen(zyklus), new Set());
    const fehler = b.befunde.find((g) => g.schwere === 'fehler')?.eintraege ?? [];
    expect(fehler.map((e) => [e.befund.code, e.ort, e.vorgangId])).toEqual([
      ['zyklus', '1.1 Erdarbeiten', id('12')],
      ['zyklus', '1.2 Streifenfundamente', id('13')],
    ]);
    // ohne Termine: Striche
    expect(zelle(b, id('12'), 'beginn')).toBe('–');
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 89: Zeilen der Kostenseiten. Die Zahlen sind von Hand aus den Eingaben hergeleitet.

import { kostenermittlungBerechnen, kostenkontrolleBerechnen } from '@tethys/kosten';
import type { AuftragsLvZustand, Kostenermittlung, KostenermittlungId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { ermittlungAnsicht, kontrolleAnsicht } from './ansicht';

const KEINE: ReadonlySet<string> = new Set();
const text = (
  z: { zellen: Readonly<Record<string, { text: string } | undefined>> },
  s: string,
): string | undefined => z.zellen[s]?.text;

describe('ermittlungAnsicht', () => {
  // 300 hat keinen eigenen Eintrag; 330 = 100.000,00, 340 = 25.000,50, 410 = 7,00. Summe 300 = 125.000,50.
  const erg = kostenermittlungBerechnen([
    { nummer: '330', betrag: '100000.00', bemerkung: 'Rohbau' },
    { nummer: '340', betrag: '25000.50' },
    { nummer: '410', betrag: '7.00' },
  ]);
  const bez = new Map([['330', 'Außenwände']]);
  const bem = new Map([['330', 'Rohbau']]);

  it('Baum in Dokumentreihenfolge mit Summen, Bezeichnung aus der CSV und Bemerkung', () => {
    const a = ermittlungAnsicht(erg, bez, bem, KEINE);
    expect(a.zeilen.map((z) => [z.id, z.tiefe, z.hatUnterknoten, z.aufgeklappt])).toEqual([
      ['300', 0, true, true],
      ['330', 1, false, false],
      ['340', 1, false, false],
      ['400', 0, true, true],
      ['410', 1, false, false],
    ]);
    const z330 = a.zeilen[1];
    expect(z330 && text(z330, 'summe')).toBe('100.000,00');
    expect(z330 && text(z330, 'bezeichnung')).toBe('Außenwände');
    expect(z330 && text(z330, 'bemerkung')).toBe('Rohbau');
    expect(a.zeilen[0] && text(a.zeilen[0], 'summe')).toBe('125.000,50');
    expect(a.zeilen[0] && text(a.zeilen[0], 'eigener')).toBe(''); // nur Vorfahre
    expect(a.summen[0] && text(a.summen[0], 'summe')).toBe('125.007,50');
  });

  it('eine zugeklappte Gruppe blendet ihre Kinder aus', () => {
    const a = ermittlungAnsicht(erg, bez, bem, new Set(['300']));
    expect(a.zeilen.map((z) => z.id)).toEqual(['300', '400', '410']);
    expect(a.zeilen[0]?.aufgeklappt).toBe(false);
  });
});

describe('kontrolleAnsicht', () => {
  const projekt = 'p' as ProjektId;
  const budget: Kostenermittlung = {
    id: 'k' as KostenermittlungId,
    projektId: projekt,
    stufe: 'kostenberechnung',
    name: 'KB',
    eintraege: [{ nummer: '330' as never, betrag: '1000.00' as never }],
  };
  // Ein Auftrags-LV ohne Positionen und ohne Nachlass: nur die Sonderzeilen und das Budget.
  const leer = {
    auftragsLeistungsverzeichnis: { id: 'a', knoten: [] },
    summen: {
      positionen: [],
      gliederungen: [],
      gesamt: { netto: '0.00', nachlass: '0.00', nettoNachNachlass: '0.00', mwst: '0.00', brutto: '0.00' },
    },
  } as unknown as AuftragsLvZustand;

  it('Budget in der Baumzeile, Vergabe 0, Abweichung gegen das Budget; Abrechnung ohne Rechnung leer', () => {
    const k = kostenkontrolleBerechnen({ budget, auftraege: [leer], leistungsstaende: [] });
    const a = kontrolleAnsicht(k, new Map(), KEINE, false);
    expect(a.zeilen.map((z) => z.id)).toEqual(['300', '330']);
    const z330 = a.zeilen[1];
    expect(z330 && text(z330, 'budget')).toBe('1.000,00');
    expect(z330 && text(z330, 'vergabe')).toBe('0,00');
    expect(z330 && text(z330, 'abrechnung')).toBe('–'); // keine Rechnung: die Spalte bleibt leer
    expect(z330 && text(z330, 'abweichung')).toBe('-1.000,00'); // Vergabe 0,00 − Budget 1.000,00
    expect(z330?.zellen['abweichung']?.kennzeichen).toEqual(['unter-budget']);
    expect(a.summen.map((s) => text(s, 'nummer'))).toEqual(['Ohne Kostengruppe', 'Nachlass', 'Gesamt']);
  });

  it('mit Abrechnung zeigt die Spalte Werte; ohne Budget sind Budget und Abweichung leer', () => {
    const k = kostenkontrolleBerechnen({ budget: null, auftraege: [leer], leistungsstaende: [] });
    const a = kontrolleAnsicht(k, new Map(), KEINE, true);
    const gesamt = a.summen[2];
    expect(gesamt && text(gesamt, 'budget')).toBe('–');
    expect(gesamt && text(gesamt, 'abrechnung')).toBe('0,00');
    expect(gesamt && text(gesamt, 'abweichung')).toBe('–');
  });

  it('die Gesamtzeile gegen das Budget: Vergabe 0,00 − 1.000,00 liegt unter dem Budget', () => {
    const k = kostenkontrolleBerechnen({ budget, auftraege: [leer], leistungsstaende: [] });
    const a = kontrolleAnsicht(k, new Map(), KEINE, false);
    expect(a.summen[2]?.zellen['abweichung']?.kennzeichen).toEqual(['unter-budget']);
    expect(a.summen[2] && text(a.summen[2], 'abweichung')).toBe('-1.000,00');
  });

  it('eine Überschreitung trägt das Kennzeichen „über Budget“', () => {
    const w = { budget: '1.00', vergabe: '3.00', abrechnung: '0.00', abweichung: '2.00' };
    const k = {
      kostengruppen: [{ nummer: '330', ebene: 3, ...w }],
      ohneKostengruppe: { budget: null, vergabe: '0.00', abrechnung: '0.00', abweichung: '0.00' },
      nachlass: { budget: null, vergabe: '0.00', abrechnung: '0.00', abweichung: '0.00' },
      gesamt: w,
    } as unknown as Parameters<typeof kontrolleAnsicht>[0];
    const a = kontrolleAnsicht(k, new Map(), KEINE, true);
    expect(a.zeilen[0]?.zellen['abweichung']).toMatchObject({ text: '2,00', kennzeichen: ['ueber-budget'] });
    expect(a.summen[0]?.zellen['abweichung']).toEqual({ text: '0,00' }); // 0 trägt kein Kennzeichen
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: Lesen und Anzeigen von Bautagebucheinträgen. Erwartet werden Werte, die von Hand aus den Eingaben folgen.

import type { Bautagebucheintrag, BautagebucheintragId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  entwurfAusEintrag,
  eintragLesen,
  koepfe,
  leererEintrag,
  tageZeilen,
  wetterText,
  type EintragEntwurf,
} from './bautagebuch';

const P = 'p1' as ProjektId;
const ID = 'b1' as BautagebucheintragId;

const eintrag = (id: string, datum: string, extra: Partial<Bautagebucheintrag> = {}): Bautagebucheintrag => ({
  id: id as BautagebucheintragId,
  projektId: P,
  datum,
  wetter: { beschreibung: null, temperaturMin: null, temperaturMax: null },
  arbeitskraefte: [],
  geraete: null,
  leistungen: null,
  behinderungen: null,
  vorkommnisse: null,
  ...extra,
});

describe('Entwurf', () => {
  it('schlägt das heutige Datum und die Auftragnehmer als Firmenzeilen vor', () => {
    const e = leererEintrag('2026-11-16', ['Rohbau', 'Tiefbau']);
    expect(e.datum).toBe('16.11.2026');
    expect(e.arbeitskraefte).toEqual([
      { firma: 'Rohbau', anzahl: '' },
      { firma: 'Tiefbau', anzahl: '' },
    ]);
  });

  it('Eintrag → Entwurf → Eintrag bleibt gleich', () => {
    const e = eintrag('b1', '2026-11-19', {
      wetter: { beschreibung: 'Frost', temperaturMin: -3, temperaturMax: 4 },
      arbeitskraefte: [{ firma: 'Rohbau', anzahl: 7 }],
      geraete: null,
      leistungen: 'Mauerwerk',
      behinderungen: 'Frost',
      vorkommnisse: null,
    });
    const r = eintragLesen(entwurfAusEintrag(e), ID, P, []);
    expect(r).toEqual({ ok: true, wert: { ...e, id: ID } });
  });
});

describe('eintragLesen', () => {
  const basis: EintragEntwurf = {
    ...leererEintrag('2026-11-16'),
    wetter: ' bedeckt ',
    temperaturMin: '2',
    temperaturMax: '8',
    arbeitskraefte: [
      { firma: ' Rohbau ', anzahl: '6' },
      { firma: '', anzahl: '' },
      { firma: 'Tiefbau', anzahl: '3' },
    ],
    leistungen: 'Mauerwerk begonnen',
  };

  it('liest de-DE-Datum, ganze Grad und Firmen; leere Texte werden null, eine leere Zeile fällt weg', () => {
    const r = eintragLesen(basis, ID, P, []);
    expect(r).toEqual({
      ok: true,
      wert: {
        id: ID,
        projektId: P,
        datum: '2026-11-16',
        wetter: { beschreibung: 'bedeckt', temperaturMin: 2, temperaturMax: 8 },
        arbeitskraefte: [
          { firma: 'Rohbau', anzahl: 6 },
          { firma: 'Tiefbau', anzahl: 3 },
        ],
        geraete: null,
        leistungen: 'Mauerwerk begonnen',
        behinderungen: null,
        vorkommnisse: null,
      },
    });
  });

  it('nimmt Minus und echtes Minuszeichen', () => {
    const r = eintragLesen({ ...basis, temperaturMin: '−3', temperaturMax: '-1' }, ID, P, []);
    expect(r.ok && r.wert.wetter).toMatchObject({ temperaturMin: -3, temperaturMax: -1 });
  });

  it('weist ein zweites Eintrag am selben Datum ab, den eigenen nicht', () => {
    const fremd = eintragLesen(basis, ID, P, [{ id: 'b2' as BautagebucheintragId, datum: '2026-11-16' }]);
    expect(fremd.ok ? null : fremd.fehler['datum']).toMatch(/Für den 16\.11\.2026 gibt es schon einen Eintrag/);
    const eigen = eintragLesen(basis, ID, P, [{ id: ID, datum: '2026-11-16' }]);
    expect(eigen.ok).toBe(true);
  });

  it('meldet jedes unlesbare Feld', () => {
    const r = eintragLesen(
      {
        ...basis,
        datum: '30.02.2026',
        temperaturMin: '9',
        temperaturMax: '1',
        arbeitskraefte: [
          { firma: '', anzahl: '4' },
          { firma: 'Rohbau', anzahl: 'viele' },
          { firma: 'Rohbau', anzahl: '2' },
        ],
      },
      ID,
      P,
      [],
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fehler).sort()).toEqual(['anzahl-1', 'datum', 'firma-0', 'firma-2', 'temperaturMin']);
  });

  it('eine Temperatur mit Nachkommastelle ist ein Feldfehler', () => {
    const r = eintragLesen({ ...basis, temperaturMax: '8,5' }, ID, P, []);
    expect(r.ok ? null : Object.keys(r.fehler)).toEqual(['temperaturMax']);
  });
});

describe('Anzeige', () => {
  it('Wetter mit Temperaturen und echtem Minuszeichen; Köpfe als Summe', () => {
    expect(wetterText({ beschreibung: 'Frost', temperaturMin: -3, temperaturMax: 4 })).toBe('Frost, −3 bis 4 °C');
    expect(wetterText({ beschreibung: null, temperaturMin: null, temperaturMax: 4 })).toBe('höchstens 4 °C');
    expect(wetterText({ beschreibung: null, temperaturMin: null, temperaturMax: null })).toBe('–');
    expect(koepfe(eintrag('x', '2026-11-16', { arbeitskraefte: [{ firma: 'a', anzahl: 6 }, { firma: 'b', anzahl: 3 }] }))).toBe(9);
  });

  it('eine Zeile je Tag, nach Datum', () => {
    const z = tageZeilen([
      eintrag('b2', '2026-11-17', { arbeitskraefte: [{ firma: 'a', anzahl: 8 }] }),
      eintrag('b1', '2026-11-16', { leistungen: 'Mauerwerk' }),
    ]);
    expect(z.map((x) => x.zellen['datum']?.text)).toEqual(['16.11.2026', '17.11.2026']);
    expect(z[0]?.zellen['koepfe']?.text).toBe('0');
    expect(z[1]?.zellen['koepfe']?.text).toBe('8');
    expect(z[0]?.zellen['leistungen']?.text).toBe('Mauerwerk');
    expect(z[1]?.zellen['leistungen']?.text).toBe('–');
  });
});

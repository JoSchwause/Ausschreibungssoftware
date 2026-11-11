// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Auftraggeber, Vergabeinformationen } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { datumDe, datumLesen, kopfdatenBefehle, kopfdatenEntwurf, zeitLesen } from './kopfdaten';

const AG: Auftraggeber = {
  name: 'Gemeinde Musterdorf',
  strasse: 'Hauptstraße 1',
  plz: '12345',
  ort: 'Musterdorf',
  vergabenummer: null,
};
const VI: Vergabeinformationen = {
  eroeffnungsdatum: '2026-12-01',
  eroeffnungszeit: '10:30:00',
  abgabeort: null,
  ausfuehrungsbeginn: null,
  ausfuehrungsende: null,
  auftragsnummer: null,
  auftragsdatum: null,
  abnahmeart: null,
  gewaehrleistung: null,
};

describe('Datum und Uhrzeit am Rand (N4)', () => {
  it('liest TT.MM.JJJJ und schreibt JJJJ-MM-TT', () => {
    expect(datumLesen('1.12.2026')).toEqual({ ok: true, wert: '2026-12-01' });
    expect(datumLesen('01.12.2026')).toEqual({ ok: true, wert: '2026-12-01' });
    expect(datumLesen('2026-12-01')).toEqual({ ok: true, wert: '2026-12-01' });
    expect(datumLesen('31.02.2026').ok).toBe(false);
    expect(datumLesen('morgen').ok).toBe(false);
    expect(datumDe('2026-12-01')).toBe('01.12.2026');
  });

  it('liest HH:MM oder HH:MM:SS und schreibt HH:MM:SS', () => {
    expect(zeitLesen('9:30')).toEqual({ ok: true, wert: '09:30:00' });
    expect(zeitLesen('10:30:15')).toEqual({ ok: true, wert: '10:30:15' });
    expect(zeitLesen('24:00').ok).toBe(false);
  });
});

describe('LV-Angaben: Entwurf → je ein Befehl', () => {
  it('ohne Änderung kein Befehl', () => {
    const e = kopfdatenEntwurf({ auftraggeber: AG, vergabeinformationen: VI });
    expect(kopfdatenBefehle({ auftraggeber: AG, vergabeinformationen: VI }, e)).toEqual({
      befehle: [],
      fehler: {},
    });
    expect(e.vergabe.eroeffnungsdatum).toBe('01.12.2026');
    expect(e.vergabe.eroeffnungszeit).toBe('10:30');
  });

  it('Auftraggeber setzen; leere Eingabe heißt null; alles leer entfernt ihn', () => {
    const e = kopfdatenEntwurf({});
    const r = kopfdatenBefehle(
      {},
      { ...e, auftraggeber: { ...e.auftraggeber, name: 'Gemeinde', ort: ' Musterdorf ' } },
    );
    expect(r.befehle).toEqual([
      {
        art: 'AuftraggeberSetzen',
        auftraggeber: { name: 'Gemeinde', strasse: null, plz: null, ort: 'Musterdorf', vergabenummer: null },
      },
    ]);
    const leer = kopfdatenEntwurf({ auftraggeber: AG });
    const ohne = { ...leer, auftraggeber: { name: '', strasse: '', plz: '', ort: '', vergabenummer: '' } };
    expect(kopfdatenBefehle({ auftraggeber: AG }, ohne).befehle).toEqual([
      { art: 'AuftraggeberSetzen', auftraggeber: null },
    ]);
  });

  it('Eröffnungstermin aus de-DE-Eingabe; ungültiges Datum bleibt am Feld, der Auftraggeber geht trotzdem', () => {
    const e = kopfdatenEntwurf({});
    const r = kopfdatenBefehle(
      {},
      { ...e, vergabe: { ...e.vergabe, eroeffnungsdatum: '15.01.2027', eroeffnungszeit: '11:00' } },
    );
    expect(r.befehle).toEqual([
      {
        art: 'VergabeinformationenSetzen',
        vergabeinformationen: { ...leerVi(), eroeffnungsdatum: '2027-01-15', eroeffnungszeit: '11:00:00' },
      },
    ]);
    const f = kopfdatenBefehle(
      {},
      {
        ...e,
        auftraggeber: { ...e.auftraggeber, name: 'A' },
        vergabe: { ...e.vergabe, eroeffnungsdatum: '32.01.2027' },
      },
    );
    expect(f.befehle.map((b) => b.art)).toEqual(['AuftraggeberSetzen']);
    expect(Object.keys(f.fehler)).toEqual(['eroeffnungsdatum']);
  });

  it('Gewährleistung: Dauer als ganze Zahl mit Einheit', () => {
    const e = kopfdatenEntwurf({});
    const r = kopfdatenBefehle(
      {},
      { ...e, vergabe: { ...e.vergabe, gewaehrleistungDauer: '5', gewaehrleistungEinheit: 'Years' } },
    );
    expect(r.befehle).toEqual([
      {
        art: 'VergabeinformationenSetzen',
        vergabeinformationen: { ...leerVi(), gewaehrleistung: { dauer: 5, einheit: 'Years' } },
      },
    ]);
  });
});

function leerVi(): Vergabeinformationen {
  return {
    eroeffnungsdatum: null,
    eroeffnungszeit: null,
    abgabeort: null,
    ausfuehrungsbeginn: null,
    ausfuehrungsende: null,
    auftragsnummer: null,
    auftragsdatum: null,
    abnahmeart: null,
    gewaehrleistung: null,
  };
}

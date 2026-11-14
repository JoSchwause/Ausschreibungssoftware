// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 149: Bieterformular → Befehle (nur Geändertes), Abweichung der X84-Angaben vom vorhandenen Bieter.

import type { Bieter, Bieterangaben, BieterId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { angabenWeichenAb, anschriftZeile, bieterBefehle, bieterformular, kontaktZeile } from './bieter';

const id = 'b1' as BieterId;
const angaben: Bieterangaben = {
  anschrift: { strasse: 'Weg 1', plz: '12345', ort: 'Musterstadt' },
  ansprechperson: null,
  email: 'a@example.org',
  telefon: null,
};
const ohne: Bieter = { id, name: 'Bieter A' };
const mit: Bieter = { id, name: 'Bieter A', angaben };

describe('bieterBefehle', () => {
  it('unverändert: keine Befehle', () => {
    expect(bieterBefehle(ohne, bieterformular(ohne))).toEqual([]);
    expect(bieterBefehle(mit, bieterformular(mit))).toEqual([]);
  });

  it('nur der Name: BieterUmbenennen', () => {
    expect(bieterBefehle(mit, { ...bieterformular(mit), name: 'Bieter A GmbH' })).toEqual([
      { art: 'BieterUmbenennen', bieterId: id, name: 'Bieter A GmbH' },
    ]);
  });

  it('Angaben: leere Felder werden null, eine leere Anschrift fällt weg, ganz leer ist null', () => {
    expect(bieterBefehle(ohne, { ...bieterformular(ohne), telefon: '0123' })).toEqual([
      {
        art: 'BieterangabenSetzen',
        bieterId: id,
        angaben: { anschrift: null, ansprechperson: null, email: null, telefon: '0123' },
      },
    ]);
    expect(bieterBefehle(mit, { ...bieterformular(mit), strasse: '', plz: '', ort: '', email: '' })).toEqual([
      { art: 'BieterangabenSetzen', bieterId: id, angaben: null },
    ]);
  });
});

describe('angabenWeichenAb', () => {
  it('gleich nach der Normalform: nein; anders oder vorher keine: ja', () => {
    expect(angabenWeichenAb(mit, { ...angaben })).toBe(false);
    expect(angabenWeichenAb(mit, { ...angaben, telefon: '0123' })).toBe(true);
    expect(angabenWeichenAb(ohne, angaben)).toBe(true);
  });
});

describe('Zeilen', () => {
  it('Anschrift und Kontakt in einer Zeile', () => {
    expect(anschriftZeile(angaben.anschrift)).toBe('Weg 1, 12345 Musterstadt');
    expect(anschriftZeile({ strasse: null, plz: null, ort: 'Musterstadt' })).toBe('Musterstadt');
    expect(kontaktZeile(angaben)).toBe('a@example.org');
    expect(kontaktZeile(undefined)).toBe('');
  });
});

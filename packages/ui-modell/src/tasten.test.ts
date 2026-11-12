// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { befehlAusTaste } from './tasten';
import type { Tastendruck } from './tasten';

const taste = (key: string, mit: Partial<Omit<Tastendruck, 'key'>> = {}): Tastendruck => ({
  key,
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...mit,
});

describe('Tastenbelegung der Leinwand (U3)', () => {
  it('Pfeiltasten drehen die Ansicht', () => {
    expect(befehlAusTaste(taste('ArrowLeft'))).toEqual({ art: 'drehen', richtung: 'links' });
    expect(befehlAusTaste(taste('ArrowRight'))).toEqual({ art: 'drehen', richtung: 'rechts' });
    expect(befehlAusTaste(taste('ArrowUp'))).toEqual({ art: 'drehen', richtung: 'hoch' });
    expect(befehlAusTaste(taste('ArrowDown'))).toEqual({ art: 'drehen', richtung: 'runter' });
  });

  it('Umschalt+Pfeiltasten verschieben die Ansicht', () => {
    expect(befehlAusTaste(taste('ArrowLeft', { shiftKey: true }))).toEqual({
      art: 'verschieben',
      richtung: 'links',
    });
    expect(befehlAusTaste(taste('ArrowDown', { shiftKey: true }))).toEqual({
      art: 'verschieben',
      richtung: 'runter',
    });
  });

  it('+ und - zoomen, auch vom Ziffernblock und mit Umschalt (US-Tastatur)', () => {
    expect(befehlAusTaste(taste('+'))).toEqual({ art: 'zoomen', richtung: 'naeher' });
    expect(befehlAusTaste(taste('+', { shiftKey: true }))).toEqual({ art: 'zoomen', richtung: 'naeher' });
    expect(befehlAusTaste(taste('-'))).toEqual({ art: 'zoomen', richtung: 'weiter' });
  });

  it('F zeigt die Auswahl, Pos1 setzt die Ansicht zurück', () => {
    expect(befehlAusTaste(taste('f'))).toEqual({ art: 'auswahl-zeigen' });
    expect(befehlAusTaste(taste('F', { shiftKey: true }))).toEqual({ art: 'auswahl-zeigen' });
    expect(befehlAusTaste(taste('Home'))).toEqual({ art: 'zuruecksetzen' });
  });

  it('lässt Tastenkürzel des Browsers und andere Tasten durch', () => {
    expect(befehlAusTaste(taste('f', { ctrlKey: true }))).toBeNull();
    expect(befehlAusTaste(taste('+', { ctrlKey: true }))).toBeNull();
    expect(befehlAusTaste(taste('ArrowLeft', { altKey: true }))).toBeNull();
    expect(befehlAusTaste(taste('ArrowLeft', { metaKey: true }))).toBeNull();
    expect(befehlAusTaste(taste('Tab'))).toBeNull();
    expect(befehlAusTaste(taste('Enter'))).toBeNull();
    expect(befehlAusTaste(taste('a'))).toBeNull();
  });
});

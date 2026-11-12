// SPDX-License-Identifier: AGPL-3.0-or-later
// Lagen-Rechnung der Balkenspalte (Ticket 96): Tagesindex → Pixel, Abschneiden an der Achse, Meilenstein, Fortschritt,
// freie Tage und Markierungen. Die erwarteten Pixel stehen als Literale da (Tag × 16 bzw. × 10 im Kopf gerechnet).

import { describe, expect, it } from 'vitest';
import { spaltenbreite } from './vergleich';
import { achse, balkenLage } from './zeitleiste';
import type { Balken } from './vergleichTypen';

describe('spaltenbreite', () => {
  it('eine Balkenspalte ist tage × pixelJeTag breit, Standard 16 Pixel je Tag; breite gilt dann nicht', () => {
    expect(spaltenbreite({ breite: 200, zeitleiste: { tage: 730, kopf: [] } })).toBe(11680);
    expect(spaltenbreite({ zeitleiste: { tage: 120, pixelJeTag: 10, kopf: [] } })).toBe(1200);
  });

  it('jede andere Spalte hat ihre breite, ohne Angabe 120', () => {
    expect(spaltenbreite({ breite: 96 })).toBe(96);
    expect(spaltenbreite({})).toBe(120);
  });
});

/** Ein Balken mit den Angaben, die die Lage nicht ändern. */
const balken = (b: Omit<Balken, 'beschreibung'>): Balken => ({ ...b, beschreibung: 'x' });
const achse120 = achse({ tage: 120 });

describe('balkenLage', () => {
  it('ein Vorgang beginnt bei vonTag × 16 Pixel und ist (bisTag − vonTag) × 16 Pixel breit', () => {
    expect(balkenLage(balken({ vonTag: 10, bisTag: 22, art: 'vorgang' }), achse120).soll).toEqual({
      sichtbar: { links: 160, breite: 192 },
      vorAnfang: false,
      nachEnde: false,
    });
  });

  it('ein Balken über den Rand der Achse wird dort abgeschnitten und so gekennzeichnet', () => {
    expect(balkenLage(balken({ vonTag: -10, bisTag: 6, art: 'vorgang' }), achse120).soll).toEqual({
      sichtbar: { links: 0, breite: 96 },
      vorAnfang: true,
      nachEnde: false,
    });
    expect(balkenLage(balken({ vonTag: 115, bisTag: 130, art: 'vorgang' }), achse120).soll).toEqual({
      sichtbar: { links: 1840, breite: 80 },
      vorAnfang: false,
      nachEnde: true,
    });
    expect(balkenLage(balken({ vonTag: -5, bisTag: 125, art: 'sammelvorgang' }), achse120).soll).toEqual({
      sichtbar: { links: 0, breite: 1920 },
      vorAnfang: true,
      nachEnde: true,
    });
  });

  it('ein Balken ganz außerhalb der Achse hat nichts Sichtbares, aber sein Kennzeichen', () => {
    expect(balkenLage(balken({ vonTag: -20, bisTag: 0, art: 'vorgang' }), achse120).soll).toEqual({
      sichtbar: null,
      vorAnfang: true,
      nachEnde: false,
    });
    expect(balkenLage(balken({ vonTag: 120, bisTag: 140, art: 'vorgang' }), achse120).soll).toEqual({
      sichtbar: null,
      vorAnfang: false,
      nachEnde: true,
    });
  });

  it('ein Meilenstein ist ein Punkt bei vonTag × 16, auch auf den Rändern der Achse', () => {
    const punkt = (tag: number, bisTag = tag) =>
      balkenLage(balken({ vonTag: tag, bisTag, art: 'meilenstein' }), achse120).soll;
    expect(punkt(52)).toEqual({ sichtbar: { links: 832, breite: 0 }, vorAnfang: false, nachEnde: false });
    expect(punkt(0).sichtbar).toEqual({ links: 0, breite: 0 });
    expect(punkt(120).sichtbar).toEqual({ links: 1920, breite: 0 });
    // ein Meilenstein mit Dauer steht trotzdem bei vonTag
    expect(punkt(52, 60).sichtbar).toEqual({ links: 832, breite: 0 });
  });

  it('ein Meilenstein außerhalb der Achse hat nichts Sichtbares, aber sein Kennzeichen', () => {
    const punkt = (tag: number) =>
      balkenLage(balken({ vonTag: tag, bisTag: tag, art: 'meilenstein' }), achse120).soll;
    expect(punkt(-1)).toEqual({ sichtbar: null, vorAnfang: true, nachEnde: false });
    expect(punkt(121)).toEqual({ sichtbar: null, vorAnfang: false, nachEnde: true });
  });

  it('ein Vorgang ohne Dauer verschwindet nicht: er ist ein Punkt bei vonTag wie ein Meilenstein', () => {
    expect(balkenLage(balken({ vonTag: 10, bisTag: 10, art: 'vorgang' }), achse120).soll.sichtbar).toEqual({
      links: 160,
      breite: 0,
    });
    expect(balkenLage(balken({ vonTag: 10, bisTag: 4, art: 'vorgang' }), achse120).soll.sichtbar).toEqual({
      links: 160,
      breite: 0,
    });
  });

  it('ein Balken, der genau an einem Rand der Achse endet, ist nicht abgeschnitten', () => {
    expect(balkenLage(balken({ vonTag: 0, bisTag: 120, art: 'vorgang' }), achse120).soll).toEqual({
      sichtbar: { links: 0, breite: 1920 },
      vorAnfang: false,
      nachEnde: false,
    });
  });
});

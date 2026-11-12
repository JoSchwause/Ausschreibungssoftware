// SPDX-License-Identifier: AGPL-3.0-or-later
// Lagen-Rechnung der Balkenspalte (Ticket 96): Tagesindex → Pixel, Abschneiden an der Achse, Meilenstein, Fortschritt,
// freie Tage und Markierungen. Die erwarteten Pixel stehen als Literale da (Tag × 16 bzw. × 10 im Kopf gerechnet).

import { describe, expect, it } from 'vitest';
import { spaltenbreite } from './vergleich';
import { achse, balkenLage, balkenName, randhinweise, zeitleistenbild } from './zeitleiste';
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

  it('der Fortschritt füllt den Anteil des ganzen Balkens von links, in Pixeln ab dem sichtbaren Anfang', () => {
    const fortschritt = (vonTag: number, bisTag: number, f: number) =>
      balkenLage(balken({ vonTag, bisTag, art: 'vorgang', fortschritt: f }), achse120).fortschritt;
    // 40 % von 10 Tagen = 4 Tage = 64 px
    expect(fortschritt(10, 20, 40)).toBe(64);
    // abgeschnitten: 25 % von 20 Tagen enden bei Tag −5, vor dem Sichtbaren; 75 % bei Tag 5 = 80 px ab Tag 0
    expect(fortschritt(-10, 10, 25)).toBe(0);
    expect(fortschritt(-10, 10, 75)).toBe(80);
    // über 100 füllt den sichtbaren Teil, unter 0 nichts
    expect(fortschritt(110, 130, 150)).toBe(160);
    expect(fortschritt(10, 20, -5)).toBe(0);
  });

  it('ohne Fortschritt, beim Meilenstein und ganz außerhalb gibt es keine Füllung', () => {
    expect(balkenLage(balken({ vonTag: 10, bisTag: 20, art: 'vorgang' }), achse120).fortschritt).toBeNull();
    expect(
      balkenLage(balken({ vonTag: 10, bisTag: 10, art: 'meilenstein', fortschritt: 100 }), achse120)
        .fortschritt,
    ).toBeNull();
    expect(
      balkenLage(balken({ vonTag: 130, bisTag: 140, art: 'vorgang', fortschritt: 50 }), achse120).fortschritt,
    ).toBeNull();
  });

  it('die Ist-Termine liegen als eigener Balken auf der Achse, abgeschnitten wie der Balken', () => {
    const mitIst = (ist: { vonTag: number; bisTag: number } | undefined) =>
      balkenLage(balken({ vonTag: 24, bisTag: 36, art: 'vorgang', ...(ist ? { ist } : {}) }), achse120).ist;
    expect(mitIst({ vonTag: 26, bisTag: 38 })).toEqual({
      sichtbar: { links: 416, breite: 192 },
      vorAnfang: false,
      nachEnde: false,
    });
    expect(mitIst({ vonTag: 110, bisTag: 125 })).toEqual({
      sichtbar: { links: 1760, breite: 160 },
      vorAnfang: false,
      nachEnde: true,
    });
    expect(mitIst(undefined)).toBeNull();
  });

  it('ein Balken, der genau an einem Rand der Achse endet, ist nicht abgeschnitten', () => {
    expect(balkenLage(balken({ vonTag: 0, bisTag: 120, art: 'vorgang' }), achse120).soll).toEqual({
      sichtbar: { links: 0, breite: 1920 },
      vorAnfang: false,
      nachEnde: false,
    });
  });
});

describe('randhinweise und balkenName', () => {
  const b = (x: Partial<Balken>): Balken => ({
    vonTag: 10,
    bisTag: 22,
    art: 'vorgang',
    beschreibung: '11.01.2027 bis 22.01.2027, 10 Arbeitstage, kritisch',
    ...x,
  });

  it('der Name ist Zelltext und Beschreibung des Balkens', () => {
    const balken = b({});
    expect(balkenName('Fa. Muster', balken, balkenLage(balken, achse120))).toBe(
      'Fa. Muster, 11.01.2027 bis 22.01.2027, 10 Arbeitstage, kritisch',
    );
    expect(balkenName('', balken, balkenLage(balken, achse120))).toBe(
      '11.01.2027 bis 22.01.2027, 10 Arbeitstage, kritisch',
    );
  });

  it('ein abgeschnittener Balken nennt seinen Rand in Worten, im Namen und am Kennzeichen', () => {
    const vorne = b({ vonTag: -3, beschreibung: 'Vorarbeiten' });
    expect(randhinweise(balkenLage(vorne, achse120))).toEqual({
      anfang: 'beginnt vor dem dargestellten Zeitraum',
      ende: null,
    });
    expect(balkenName('', vorne, balkenLage(vorne, achse120))).toBe(
      'Vorarbeiten, beginnt vor dem dargestellten Zeitraum',
    );
    const ueberall = b({ vonTag: -3, bisTag: 130 });
    expect(randhinweise(balkenLage(ueberall, achse120))).toEqual({
      anfang: 'beginnt vor dem dargestellten Zeitraum',
      ende: 'endet nach dem dargestellten Zeitraum',
    });
  });

  it('ein Balken oder Meilenstein ganz außerhalb liegt davor oder dahinter', () => {
    const danach = b({ vonTag: 125, bisTag: 130 });
    expect(randhinweise(balkenLage(danach, achse120))).toEqual({
      anfang: null,
      ende: 'liegt nach dem dargestellten Zeitraum',
    });
    const meilenstein = b({ vonTag: -1, bisTag: -1, art: 'meilenstein' });
    expect(randhinweise(balkenLage(meilenstein, achse120))).toEqual({
      anfang: 'liegt vor dem dargestellten Zeitraum',
      ende: null,
    });
  });

  it('auch abgeschnittene Ist-Termine werden genannt', () => {
    const mitIst = b({ ist: { vonTag: -5, bisTag: -2 } });
    const l = balkenLage(mitIst, achse120);
    expect(randhinweise(l)).toEqual({
      anfang: 'Ist-Termine liegen vor dem dargestellten Zeitraum',
      ende: null,
    });
    const beides = b({ bisTag: 125, ist: { vonTag: 100, bisTag: 126 } });
    expect(balkenName('', beides, balkenLage(beides, achse120))).toBe(
      '11.01.2027 bis 22.01.2027, 10 Arbeitstage, kritisch, endet nach dem dargestellten Zeitraum, ' +
        'Ist-Termine enden nach dem dargestellten Zeitraum',
    );
  });
});

describe('zeitleistenbild', () => {
  // 30 Tage zu je 10 Pixeln
  const kopf = [
    { text: 'Dezember', vonTag: -5, bisTag: 10 },
    { text: 'Januar', vonTag: 10, bisTag: 41 },
    { text: 'März', vonTag: 200, bisTag: 230 },
  ];

  it('schneidet die Abschnitte des Kopfes auf die Achse; ganz außerhalb liegende fehlen', () => {
    const bild = zeitleistenbild({ tage: 30, pixelJeTag: 10, kopf });
    expect(bild.kopf).toEqual([
      { text: 'Dezember', links: 0, breite: 100 },
      { text: 'Januar', links: 100, breite: 200 },
    ]);
    expect(bild.unterkopf).toBeNull();
    expect(bild.achse).toEqual({ tage: 30, pixelJeTag: 10, breite: 300 });
  });

  it('die untere Kopfzeile wird ebenso geschnitten', () => {
    const bild = zeitleistenbild({
      tage: 30,
      pixelJeTag: 10,
      kopf,
      unterkopf: [
        { text: 'KW 53', vonTag: -4, bisTag: 3 },
        { text: 'KW 1', vonTag: 3, bisTag: 10 },
      ],
    });
    expect(bild.unterkopf).toEqual([
      { text: 'KW 53', links: 0, breite: 30 },
      { text: 'KW 1', links: 30, breite: 70 },
    ]);
  });

  it('fasst freie Tage zu Läufen zusammen, sortiert, ohne Doppelte und ohne Tage außerhalb der Achse', () => {
    const bild = zeitleistenbild({
      tage: 30,
      pixelJeTag: 10,
      kopf: [],
      freieTage: [6, 0, 7, 13, 14, 6, 40, -1, 29],
    });
    expect(bild.freieTage).toEqual([
      { links: 0, breite: 10 },
      { links: 60, breite: 20 },
      { links: 130, breite: 20 },
      { links: 290, breite: 10 },
    ]);
    expect(zeitleistenbild({ tage: 30, kopf: [] }).freieTage).toEqual([]);
  });

  it('setzt Markierungen an den Anfang ihres Tages; auf dem Ende der Achse bleibt sie, dahinter fehlt sie', () => {
    const bild = zeitleistenbild({
      tage: 30,
      pixelJeTag: 10,
      kopf: [],
      markierungen: [
        { tag: 15, art: 'stichtag', beschreibung: 'Stichtag 16.01.' },
        { tag: 30, art: 'ende', beschreibung: 'Ende' },
        { tag: 31, art: 'stichtag', beschreibung: 'später' },
        { tag: -1, art: 'stichtag', beschreibung: 'früher' },
      ],
    });
    expect(bild.markierungen).toEqual([
      { links: 150, art: 'stichtag', beschreibung: 'Stichtag 16.01.' },
      { links: 300, art: 'ende', beschreibung: 'Ende' },
    ]);
  });
});

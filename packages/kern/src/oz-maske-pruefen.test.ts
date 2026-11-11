// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüfbefund zur OZ-Maske beim Anlegen (Ticket 25, Punkt 3). Zuerst geschrieben (Q1).
// Die Funktion liefert Befunde statt Stille; `LeistungsverzeichnisAnlegen` nimmt die Maske an (U5) und liefert den
// Befund als Hinweis (Ticket 30).

import { describe, expect, it } from 'vitest';
import type { OzMaske } from '@tethys/vertrag';
import { lvBefehlAusfuehren, ozMaskeFehler, ozMaskePruefen } from './index';
import { LV_ID, PROJEKT_ID, inhalt } from './testhilfen';

const num = (laenge: number) => ({ laenge, zeichen: 'numerisch' as const });
const alnum = (laenge: number) => ({ laenge, zeichen: 'alphanumerisch' as const });

const GUELTIG: OzMaske = {
  gliederung: [num(2), num(2)],
  position: num(4),
  index: alnum(1),
  trennzeichen: '.',
};

describe('ozMaskePruefen', () => {
  it('gültige Maske: keine Befunde', () => {
    expect(ozMaskePruefen(GUELTIG)).toEqual([]);
  });

  it('genau 14 Stellen sind gültig', () => {
    const m: OzMaske = { ...GUELTIG, gliederung: [num(2), num(2), num(2), num(2), num(2)], index: null };
    expect(ozMaskePruefen(m)).toEqual([]);
  });

  it('zu lang (15 Stellen): eine Warnung mit stabilem Code, Quelle und Ort', () => {
    const m: OzMaske = { ...GUELTIG, gliederung: [num(2), num(2), num(2), num(2), num(2)] };
    const befunde = ozMaskePruefen(m);
    expect(befunde).toHaveLength(1);
    expect(befunde[0]).toMatchObject({
      schwere: 'warnung',
      quelle: 'lv-pruefung',
      code: 'oz-maske-ungueltig',
      ort: { feld: 'ozMaske' },
    });
    expect(befunde[0]?.meldung).toMatch(/15/);
  });

  it('Index mit 2 Zeichen: Befund', () => {
    const befunde = ozMaskePruefen({ ...GUELTIG, index: alnum(2) });
    expect(befunde).toHaveLength(1);
    expect(befunde[0]?.code).toBe('oz-maske-ungueltig');
    expect(befunde[0]?.meldung).toMatch(/Index/);
  });

  it('dieselben Regeln wie ozMaskeFehler (eine Stelle für die Regeln)', () => {
    const masken: OzMaske[] = [
      GUELTIG,
      { ...GUELTIG, position: num(0) },
      { ...GUELTIG, trennzeichen: 'x' },
      { ...GUELTIG, gliederung: Array.from({ length: 6 }, () => num(1)) },
    ];
    for (const m of masken) {
      const fehler = ozMaskeFehler(m);
      expect(ozMaskePruefen(m).map((b) => b.meldung)).toEqual(fehler === null ? [] : [fehler]);
    }
  });
});

describe('LeistungsverzeichnisAnlegen mit ungültiger Maske', () => {
  it('geht weiter durch (U5); die Prüffunktion meldet die Maske (Hinweis am Befehl: lv-aggregat.test.ts)', () => {
    const zuLang: OzMaske = { ...GUELTIG, gliederung: [num(2), num(2), num(2), num(2), num(2)] };
    const e = lvBefehlAusfuehren(null, {
      art: 'LeistungsverzeichnisAnlegen',
      id: LV_ID,
      projektId: PROJEKT_ID,
      inhalt: { ...inhalt([]), ozMaske: zuLang },
    });
    expect(e.ok).toBe(true);
    expect(ozMaskePruefen(zuLang)).toHaveLength(1);
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
import { honorarBerechnen } from '@tethys/honorar';
import type { Honorarbefundcode } from '@tethys/honorar';
import type {
  Betrag,
  Honorarberechnung,
  HonorarberechnungId,
  Honorarobjekt,
  KostenermittlungId,
  ProjektId,
  Prozent,
  Pruefbefund,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befundAnsicht } from './ansicht';
import { BEFUNDTEXT, DIN276_HINWEIS } from './texte';

const btr = (s: string): Betrag => s as Betrag;
const pz = (s: string): Prozent => s as Prozent;

/** Eine Kennung der App (UUID, A7): Sie gehört nie in einen Befundtext (L1). */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/** Eine Zahl in kanonischer Form (`40.00`), nicht der Tausenderpunkt der de-DE-Form (`1.000,00`, N4). */
const KANONISCHE_ZAHL = /(?<![\d.])\d+\.\d{2,3}(?![\d.,])/;
/** Ein Feldschlüssel des Aggregats statt seines Namens. */
const FELDSCHLUESSEL =
  /\b(honorarsatz|anrechenbareKosten|leistungsphasen|umbauzuschlagssatz|mwstSatz|leistungsbild|honorarzone)\b/;

const objekt = (o: Partial<Honorarobjekt> = {}): Honorarobjekt => ({
  bezeichnung: 'Neubau',
  leistungsbild: 'gebaeude',
  honorarzone: 'III',
  honorarsatz: pz('50.00'),
  anrechenbareKosten: { art: 'betrag', betrag: btr('819756.16') },
  leistungsphasen: [{ nummer: 1 }, { nummer: 2 }],
  umbauzuschlagssatz: null,
  ...o,
});

const berechnung = (
  objekte: readonly Honorarobjekt[],
  o: Partial<Honorarberechnung> = {},
): Honorarberechnung => ({
  id: '019b5f2e-0000-7000-8000-00000000000a' as HonorarberechnungId,
  projektId: '019b5f2e-0000-7000-8000-00000000000b' as ProjektId,
  name: 'Architekt',
  objekte,
  nebenkosten: null,
  mwstSatz: pz('19.00'),
  ...o,
});

/** Die Befunde, wie `honorarBerechnen` sie liefert, mit den Texten der Seite. */
function ansichten(b: Honorarberechnung): ReturnType<typeof befundAnsicht>[] {
  const ergebnis = honorarBerechnen(b, []);
  return ergebnis.befunde.map((x) => befundAnsicht(x, { berechnung: b, ergebnis }));
}

describe('Befunde der Honorarberechnung für Seite und PDF (Ticket 122, N4)', () => {
  it('jede Meldung der Rechnung wird ein de-DE-Text: kein UUID, keine kanonische Zahl, kein Feldschlüssel', () => {
    const b = berechnung(
      [
        objekt({
          honorarsatz: pz('120.00'),
          leistungsphasen: [{ nummer: 1 }, { nummer: 1 }, { nummer: 3, anteil: pz('12.00') }],
          umbauzuschlagssatz: pz('40.00'),
        }),
        objekt({
          bezeichnung: 'Anbau',
          anrechenbareKosten: {
            art: 'kostenermittlung',
            kostenermittlungId: '019b5f2e-8c1a-7d3e-9f40-1a2b3c4d5e6f' as KostenermittlungId,
            technischeAnlagenAnteilig: false,
            weitereKosten: btr('0.00'),
            mitzuverarbeitendeBausubstanz: btr('0.00'),
          },
        }),
        objekt({ bezeichnung: 'Klein', anrechenbareKosten: { art: 'betrag', betrag: btr('1000.00') } }),
        objekt({
          bezeichnung: 'Tragwerk',
          leistungsbild: 'tragwerksplanung',
          leistungsphasen: [{ nummer: 9 }],
        }),
        objekt({ bezeichnung: 'Negativ', umbauzuschlagssatz: pz('-5.00') }),
      ],
      { nebenkosten: { art: 'betrag', betrag: btr('-10.00') }, mwstSatz: pz('-19.00') },
    );
    const a = ansichten(b);
    const ergebnis = honorarBerechnen(b, []);
    const codes = new Set(ergebnis.befunde.map((x) => x.code));
    for (const c of [
      'honorarsatz-ausserhalb-spanne',
      'leistungsphase-doppelt',
      'anteil-abweichend',
      'umbauzuschlag-ueber-grenze',
      'kostenermittlung-unbekannt',
      'ausserhalb-honorartafel',
      'leistungsphase-unbekannt',
      'wert-negativ',
      'mehrere-objekte',
    ])
      expect(codes, c).toContain(c);
    expect(ergebnis.befunde.map((x) => x.meldung).join(' ')).toMatch(KANONISCHE_ZAHL);
    expect(ergebnis.befunde.map((x) => x.meldung).join(' ')).toMatch(UUID);
    a.forEach((x, i) => {
      const meldung = ergebnis.befunde[i]?.meldung ?? '';
      expect(x.text, meldung).not.toBe(meldung);
      expect(`${x.ort ?? ''} ${x.text}`, meldung).not.toMatch(UUID);
      expect(`${x.ort ?? ''} ${x.text}`, meldung).not.toMatch(KANONISCHE_ZAHL);
      expect(`${x.ort ?? ''} ${x.text}`, meldung).not.toMatch(FELDSCHLUESSEL);
    });
  });

  it('nennt die Werte des Objekts de-DE: Umbauzuschlag über der Grenze, Honorarsatz, außerhalb der Tafel', () => {
    const a = ansichten(
      berechnung([
        objekt({ honorarsatz: pz('120.00'), umbauzuschlagssatz: pz('40.00') }),
        objekt({ anrechenbareKosten: { art: 'betrag', betrag: btr('1000.00') } }),
      ]),
    );
    const zu = (code: string) => a.find((x) => x.code === code);
    expect(zu('umbauzuschlag-ueber-grenze')).toEqual({
      schwere: 'warnung',
      ort: 'Objekt 1, Umbauzuschlag',
      text: 'Der Umbauzuschlag von 40,00 % liegt über 33,00 % (§ 36 Abs. 1 HOAI); gerechnet wird mit dem eingegebenen Satz.',
      code: 'umbauzuschlag-ueber-grenze',
    });
    expect(zu('honorarsatz-ausserhalb-spanne')?.text).toContain('120,00 %');
    expect(zu('ausserhalb-honorartafel')?.ort).toBe('Objekt 2, Anrechenbare Kosten');
    expect(zu('ausserhalb-honorartafel')?.text).toContain('1.000,00 €');
    expect(zu('ausserhalb-honorartafel')?.text).toContain('§ 35 Abs. 1 HOAI');
    expect(zu('mehrere-objekte')?.ort).toBeNull();
    expect(zu('mehrere-objekte')?.text).toContain('2 Honorarobjekte');
  });

  it('ein Befund zur ganzen Berechnung nennt nur das Feld', () => {
    const a = ansichten(berechnung([objekt()], { mwstSatz: pz('-19.00') }));
    expect(a.map((x) => [x.code, x.ort])).toEqual([['wert-negativ', 'MwSt-Satz']]);
  });

  it('jeder Code der Rechnung hat einen eigenen Text, auch ohne passende Eingabe (die Meldung erscheint nie)', () => {
    const alle: Readonly<Record<Honorarbefundcode, true>> = {
      'keine-honorartafel': true,
      'herleitung-nicht-anwendbar': true,
      'kostenermittlung-unbekannt': true,
      'kostenermittlungsstufe-abweichend': true,
      'kostenberechnung-vorhanden': true,
      'ausserhalb-honorartafel': true,
      'honorarzone-unbekannt': true,
      'leistungsphase-unbekannt': true,
      'leistungsphase-doppelt': true,
      'anteil-abweichend': true,
      'honorarsatz-ausserhalb-spanne': true,
      'umbauzuschlag-ueber-grenze': true,
      'wert-negativ': true,
      'mehrere-objekte': true,
    };
    const b = berechnung([]);
    const ergebnis = honorarBerechnen(b, []);
    for (const code of Object.keys(alle)) {
      const roh: Pruefbefund = {
        schwere: 'warnung',
        quelle: 'honorarberechnung',
        code,
        meldung: `Meldung ${code} 12.50`,
        ort: { pfad: '/objekte[3]', feld: 'honorarsatz' },
      };
      const x = befundAnsicht(roh, { berechnung: b, ergebnis });
      expect(x.text, code).not.toContain('Meldung');
      expect(x.text, code).not.toMatch(KANONISCHE_ZAHL);
      expect(x.ort, code).toBe('Objekt 3, Honorarsatz');
    }
  });

  it('die Stufen der Kostenermittlung behalten ihren eigenen Text (D-110.4)', () => {
    const b = berechnung([]);
    const ergebnis = honorarBerechnen(b, []);
    for (const code of [
      'kostenermittlung-unbekannt',
      'kostenberechnung-vorhanden',
      'kostenermittlungsstufe-abweichend',
    ] as const) {
      const roh: Pruefbefund = {
        schwere: 'warnung',
        quelle: 'honorarberechnung',
        code,
        meldung: '',
        ort: {},
      };
      expect(befundAnsicht(roh, { berechnung: b, ergebnis }).text).toBe(BEFUNDTEXT[code]);
    }
  });
});

describe('Hinweis zu DIN 276', () => {
  it('ist ein fester Text mit Fassung und Paragraph, kein Befund (D-66)', () => {
    expect(DIN276_HINWEIS).toContain('§ 4 Abs. 1 HOAI');
    expect(DIN276_HINWEIS).toContain('DIN 276:2008-12');
    // Ticket 122 (PB9): genau der Hinweis aus D-56/D-66, nichts darüber hinaus.
    expect(DIN276_HINWEIS).toBe(
      'Hinweis: § 4 Abs. 1 HOAI verweist für die anrechenbaren Kosten auf DIN 276 in der Fassung DIN 276:2008-12.',
    );
  });
});

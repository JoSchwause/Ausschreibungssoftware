// SPDX-License-Identifier: AGPL-3.0-or-later
// Fristprüfung zu einem Stichtag (Ticket 111 Punkt 2; D-57, D-97.11, Glossar „Fristprüfung“): Golden-Fälle, auch für die
// Frist am Stichtag.

import type { Mangel } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fristPruefen } from './index';
import { mangel, mangelId } from './testhilfen';

const verlauf = (...status: Mangel['verlauf'][number]['status'][]): Mangel['verlauf'] =>
  status.map((s) => ({ status: s, datum: '2026-11-10', bemerkung: null }));

describe('fristPruefen', () => {
  it('meldet einen offenen oder angezeigten Mangel mit Frist vor dem Stichtag als überfällig', () => {
    const befunde = fristPruefen(
      [
        mangel(1, { frist: '2026-11-25', verlauf: verlauf('offen') }),
        mangel(2, { frist: '2026-11-25', verlauf: verlauf('offen', 'angezeigt') }),
      ],
      '2026-11-26',
    );
    expect(befunde).toEqual([
      {
        schwere: 'warnung',
        quelle: 'fristpruefung',
        code: 'mangel-frist-ueberschritten',
        meldung: 'Mangel 1: Frist 2026-11-25 vor dem Stichtag 2026-11-26 überschritten (Status offen)',
        ort: { mangelId: mangelId(1), feld: 'frist' },
      },
      {
        schwere: 'warnung',
        quelle: 'fristpruefung',
        code: 'mangel-frist-ueberschritten',
        meldung: 'Mangel 2: Frist 2026-11-25 vor dem Stichtag 2026-11-26 überschritten (Status angezeigt)',
        ort: { mangelId: mangelId(2), feld: 'frist' },
      },
    ]);
  });

  it('eine Frist am Stichtag ist nicht überfällig, erst am Tag danach', () => {
    const m = mangel(5, { frist: '2026-11-26', verlauf: verlauf('offen', 'angezeigt') });
    expect(fristPruefen([m], '2026-11-26')).toEqual([]);
    expect(fristPruefen([m], '2026-11-27').map((b) => b.ort.mangelId)).toEqual([mangelId(5)]);
    expect(fristPruefen([m], '2026-11-25')).toEqual([]);
  });

  it('beseitigte und abgenommene Mängel und Mängel ohne Frist sind nie überfällig', () => {
    expect(
      fristPruefen(
        [
          mangel(1, { frist: '2026-11-01', verlauf: verlauf('offen', 'angezeigt', 'beseitigt') }),
          mangel(2, {
            frist: '2026-11-01',
            verlauf: verlauf('offen', 'angezeigt', 'beseitigt', 'abgenommen'),
          }),
          mangel(3, { frist: null, verlauf: verlauf('offen') }),
        ],
        '2026-12-31',
      ),
    ).toEqual([]);
  });

  it('nach abgelehnter Nachbesserung zählt der Mangel wieder als offen', () => {
    const m = mangel(2, {
      frist: '2026-11-20',
      verlauf: verlauf('offen', 'angezeigt', 'beseitigt', 'offen'),
    });
    expect(fristPruefen([m], '2026-11-21')).toHaveLength(1);
  });

  it('ordnet die Befunde nach der Nummer, gleich in welcher Reihenfolge die Mängel kommen', () => {
    const befunde = fristPruefen(
      [
        mangel(7, { frist: '2026-11-01' }),
        mangel(3, { frist: '2026-11-01' }),
        mangel(5, { frist: '2026-11-01' }),
      ],
      '2026-11-02',
    );
    expect(befunde.map((b) => b.ort.mangelId)).toEqual([mangelId(3), mangelId(5), mangelId(7)]);
  });

  it('ein angezeigter Mangel ohne Frist ist ein Befund: er könnte nie überfällig werden (Ticket 122, PB6, U5)', () => {
    const ohne = mangel(4, { frist: null, verlauf: verlauf('offen', 'angezeigt') });
    const nurImVerlauf = mangel(6, {
      frist: null,
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'angezeigt', datum: '2026-11-11', bemerkung: null, frist: '2026-11-20' },
      ],
    });
    const ueberfaellig = mangel(5, { frist: '2026-11-01', verlauf: verlauf('offen', 'angezeigt') });
    expect(fristPruefen([nurImVerlauf, ueberfaellig, ohne], '2026-11-02')).toEqual([
      {
        schwere: 'warnung',
        quelle: 'fristpruefung',
        code: 'mangel-angezeigt-ohne-frist',
        meldung: 'Mangel 4: angezeigt ohne Frist; er kann nicht überfällig werden',
        ort: { mangelId: mangelId(4), feld: 'frist' },
      },
      {
        schwere: 'warnung',
        quelle: 'fristpruefung',
        code: 'mangel-frist-ueberschritten',
        meldung: 'Mangel 5: Frist 2026-11-01 vor dem Stichtag 2026-11-02 überschritten (Status angezeigt)',
        ort: { mangelId: mangelId(5), feld: 'frist' },
      },
      {
        schwere: 'warnung',
        quelle: 'fristpruefung',
        code: 'mangel-angezeigt-ohne-frist',
        meldung: 'Mangel 6: angezeigt ohne Frist; er kann nicht überfällig werden',
        ort: { mangelId: mangelId(6), feld: 'frist' },
      },
    ]);
    // Offen ohne Frist ist kein Befund (noch nicht angezeigt), ebenso ein beseitigter Mangel ohne Frist.
    expect(
      fristPruefen(
        [
          mangel(1, { frist: null, verlauf: verlauf('offen') }),
          mangel(2, { frist: null, verlauf: verlauf('offen', 'angezeigt', 'beseitigt') }),
        ],
        '2026-11-02',
      ),
    ).toEqual([]);
  });

  it('weist einen Stichtag ab, der kein Kalendertag ist (Programmfehler der App)', () => {
    expect(() => fristPruefen([mangel(1)], '2026-11-31')).toThrow(RangeError);
    expect(() => fristPruefen([], '')).toThrow(RangeError);
  });
});

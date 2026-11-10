// SPDX-License-Identifier: AGPL-3.0-or-later
// Goldens aus den amtlichen Dateien (Ticket 44, Punkt 4; D-03, C4). LV aus der BVBS-Prüfdatei 3.3 AVA X81
// (`fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81`: Mengen, `MarkupIt`, `MarkupType`, `RefItem`;
// die X81 trägt weder EP noch Satz), Angebot aus der zugehörigen X84 (`…V-11-06-2021.X84`: `UP` und `<Markup>10.00</Markup>`
// des Bieters). Die Knoten-IDs sind die `ID` der Elemente in beiden Dateien.
//
// Zeilen der X84 (gekürzt, Werte unverändert):
//   1.30.10 (CBHMDECI) Total 1450.50
//     Item       CBHMDHLI  UP 10.000  IT 100.00            (X81: Qty 10.000, MarkupIt Yes)
//     Item       CBHMDMJI  UP 20.000  IT 400.00            (X81: Qty 20.000)
//     Item       CBHMEALA  UP 30.000  DiscountPcnt 5.00  IT 855.00   (X81: Qty 30.000, MarkupIt Yes)
//     MarkupItem CBHMEFIA  ITMarkup 955.00  Markup 10.00  IT 95.50   (X81: IdentAsMark)
//   1.30.20 (CBHMEJEI) Total 1790.00
//     Item CBHMEMNA UP 10.000 IT 100.00; Item CBHMFBLI UP 20.000 IT 400.00; Item CBHMFGEA UP 30.000 IT 900.00
//     MarkupItem CBHMFKNA ITMarkup 1400.00 Markup 10.00 IT 140.00 (AllInCat)
//     MarkupItem CBHMFOAI ITMarkup 1400.00 Markup 10.00 IT 140.00 (AllInCat, direkt dahinter: gleiche Basis)
//     Item CBHMGBOI UP 10.000 IT 100.00
//     MarkupItem CBHMGGLA ITMarkup 100.00 Markup 10.00 IT 10.00 (AllInCat)
//   1.30.30 (CBHMBPBI) Total 819.10
//     Item CBHMCCKI UP 10.000 IT 100.00; Item CBHMCHII UP 20.000 IT 400.00
//     MarkupItem CBHMCKPA ITMarkup 400.00 Markup 10.00 IT 40.00 (ListInSubQty, RefItem CBHMCHII)
//     MarkupItem CBHMBLMI ITMarkup 2791.00 Markup 10.00 IT 279.10 (ListInSubQty, RefItem CBHMBGAI)
//   1.10.30.20 Item CBHMBGAI UP 27.910 IT 2791.00 (X81: Qty 100.000), Bezug von CBHMBLMI in einem anderen Bereich.

import { describe, expect, it } from 'vitest';
import type { PositionId } from '@tethys/vertrag';
import { angebotSummenBerechnen, angebotZuschlaegeBerechnen } from './index';
import { angebot, ep, liste, lv, position, satz, titel, zuschlagsposition } from './testhilfen';

const LV_ID = 'CBADAAAA';
const markiert = { zuschlagskennzeichen: true };

const bvbs = lv(LV_ID, [
  titel('CBAFAAAA', LV_ID, 0), // 1
  titel('CBAFAHEI', 'CBAFAAAA', 0), // 1.10
  titel('CBHMAMIA', 'CBAFAHEI', 0), // 1.10.30
  position('CBHMBGAI', 'CBHMAMIA', 0, '100.000'),
  titel('CBHMDAJI', 'CBAFAAAA', 1), // 1.30
  titel('CBHMDECI', 'CBHMDAJI', 0), // 1.30.10
  position('CBHMDHLI', 'CBHMDECI', 0, '10.000', null, markiert),
  position('CBHMDMJI', 'CBHMDECI', 1, '20.000'),
  position('CBHMEALA', 'CBHMDECI', 2, '30.000', null, markiert),
  zuschlagsposition('CBHMEFIA', 'CBHMDECI', 3, { art: 'kennzeichnung' }),
  titel('CBHMEJEI', 'CBHMDAJI', 1), // 1.30.20
  position('CBHMEMNA', 'CBHMEJEI', 0, '10.000'),
  position('CBHMFBLI', 'CBHMEJEI', 1, '20.000'),
  position('CBHMFGEA', 'CBHMEJEI', 2, '30.000'),
  zuschlagsposition('CBHMFKNA', 'CBHMEJEI', 3, { art: 'gliederung' }),
  zuschlagsposition('CBHMFOAI', 'CBHMEJEI', 4, { art: 'gliederung' }),
  position('CBHMGBOI', 'CBHMEJEI', 5, '10.000'),
  zuschlagsposition('CBHMGGLA', 'CBHMEJEI', 6, { art: 'gliederung' }),
  titel('CBHMBPBI', 'CBHMDAJI', 2), // 1.30.30
  position('CBHMCCKI', 'CBHMBPBI', 0, '10.000'),
  position('CBHMCHII', 'CBHMBPBI', 1, '20.000'),
  zuschlagsposition('CBHMCKPA', 'CBHMBPBI', 2, liste('CBHMCHII')),
  zuschlagsposition('CBHMBLMI', 'CBHMBPBI', 3, liste('CBHMBGAI')),
]);

// Das Angebot der X84: EP (`UP`) je Position und Satz 10,00 % (`Markup`) je Zuschlagsposition. Ein Nachlass des Bieters
// an einer Position (`DiscountPcnt`) ist in v1 nicht abbildbar (G-23, G-26: ein Nachlass je Angebot, D-10 (3)).
const bieter = angebot('x84', bvbs, 'pinsel', [
  ep('CBHMBGAI', '27.910'),
  ep('CBHMDHLI', '10.000'),
  ep('CBHMDMJI', '20.000'),
  ep('CBHMEALA', '30.000'),
  satz('CBHMEFIA', '10.00'),
  ep('CBHMEMNA', '10.000'),
  ep('CBHMFBLI', '20.000'),
  ep('CBHMFGEA', '30.000'),
  satz('CBHMFKNA', '10.00'),
  satz('CBHMFOAI', '10.00'),
  ep('CBHMGBOI', '10.000'),
  satz('CBHMGGLA', '10.00'),
  ep('CBHMCCKI', '10.000'),
  ep('CBHMCHII', '20.000'),
  satz('CBHMCKPA', '10.00'),
  satz('CBHMBLMI', '10.00'),
]);

describe('BVBS 3.3 AVA X84, Bereich 1.30: Bietersummen mit dem Satz des Bieters', () => {
  const s = angebotSummenBerechnen(bvbs, bieter);
  const summe = (id: string): string | undefined => s.gliederungen.find((g) => g.gliederungId === id)?.summe;
  const z = angebotZuschlaegeBerechnen(bvbs, bieter);
  const basisUndBetrag = (id: string): [string, string | null] | undefined => {
    const b = z.get(id as PositionId);
    return b && [b.basis, b.betrag];
  };

  it('1.30.20 (AllInCat) = 1.790,00 wie in der Datei: Beträge 140,00 / 140,00 / 10,00', () => {
    expect(basisUndBetrag('CBHMFKNA')).toEqual(['1400.00', '140.00']);
    expect(basisUndBetrag('CBHMFOAI')).toEqual(['1400.00', '140.00']);
    expect(basisUndBetrag('CBHMGGLA')).toEqual(['100.00', '10.00']);
    expect(summe('CBHMEJEI')).toBe('1790.00');
  });

  it('1.30.30 (ListInSubQty) = 819,10 wie in der Datei: Beträge 40,00 / 279,10 (Bezug in 1.10.30)', () => {
    expect(basisUndBetrag('CBHMCKPA')).toEqual(['400.00', '40.00']);
    expect(basisUndBetrag('CBHMBLMI')).toEqual(['2791.00', '279.10']);
    expect(summe('CBHMBPBI')).toBe('819.10');
  });

  it('1.30.10 (IdentAsMark) = 1.500,00 statt 1.450,50 der Datei: Positionsnachlass 5 % an 1.30.10.30 ist in v1 nicht abbildbar', () => {
    // Die Datei rechnet CBHMEALA mit `DiscountPcnt` 5,00: IT 855,00 statt 30 × 30,000 = 900,00, Basis 955,00, Betrag 95,50,
    // Summe 1.450,50. Einen Positionsnachlass gibt es in v1 nicht (G-23; G-26: genau ein Nachlass je Angebot), also
    // GP 900,00, Basis 100,00 + 900,00 = 1.000,00 (nur `MarkupIt`), Betrag 100,00, Summe 100 + 400 + 900 + 100 = 1.500,00.
    const dateiwert = '1450.50';
    expect(s.positionen.find((p) => p.positionId === 'CBHMEALA')?.gesamtpreis).toBe('900.00');
    expect(basisUndBetrag('CBHMEFIA')).toEqual(['1000.00', '100.00']);
    expect(summe('CBHMDECI')).toBe('1500.00');
    expect(summe('CBHMDECI')).not.toBe(dateiwert);
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Review Welle 4, S5: der LV-Kopf an einer Stelle. Jedes Kopffeld kommt mit, fehlende bleiben weg.

import type {
  Leistungsverzeichnis,
  LeistungsverzeichnisId,
  LvInhaltKopf,
  Prozent,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { ozMaskeLesen } from './ozmaske';
import { inhaltKopf, lvInhalt } from './inhalt';

const maske = (() => {
  const r = ozMaskeLesen('NN.NNNN');
  if (!r.ok) throw new Error(r.fehler);
  return r.wert;
})();

const voll: LvInhaltKopf = {
  name: 'Rohbau',
  ozMaske: maske,
  mwstSatz: '19.00' as Prozent,
  nachlass: null,
  auftraggeber: { name: 'Stadt', strasse: null, plz: null, ort: null, vergabenummer: null },
  auftragnehmer: { name: 'Bau GmbH', strasse: null, plz: null, ort: null },
  epaBezeichnungen: [{ nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' }],
};

describe('inhaltKopf und lvInhalt', () => {
  it('nimmt jedes Kopffeld mit, auch Auftragnehmer und EPA-Bezeichnungen (Q5)', () => {
    expect(inhaltKopf(voll)).toEqual(voll);
  });

  it('lässt fehlende Felder weg und nimmt keine Kennungen mit', () => {
    const lv: Leistungsverzeichnis = {
      name: 'X',
      ozMaske: maske,
      mwstSatz: '19.00' as Prozent,
      nachlass: null,
      id: 'lv' as LeistungsverzeichnisId,
      projektId: 'p' as ProjektId,
      knoten: [],
    };
    expect(Object.keys(inhaltKopf(lv)).sort()).toEqual(['mwstSatz', 'nachlass', 'name', 'ozMaske']);
    expect(lvInhalt({ ...lv, ...voll })).toEqual({ ...voll, wurzelId: 'lv', knoten: [] });
  });
});

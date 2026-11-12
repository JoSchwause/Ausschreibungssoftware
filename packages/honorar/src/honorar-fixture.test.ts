// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X3 (D-58, Ticket 112) über die gespeicherte Form (Ticket 110, D-64): `fixtures/honorar.json` trägt die Eingabe mit den
// Beträgen nach DIN 276 und die Kostenberechnung, aus der sie stammen. Gespeichert verweist das Honorarobjekt auf diese
// Kostenermittlung; beide Wege ergeben die von Hand hergeleiteten Sollwerte (Brutto 267.595,90, keine Befunde). Dazu das
// Beispiel des Vertrags (v1.6 Punkt 5): Golden-Fall 1 aus Ticket 101 über eine Kostenberechnung.

import { readFileSync } from 'node:fs';
import type {
  Honorarberechnung,
  HonorarberechnungZustand,
  Honorarergebnis,
  Honorarobjekt,
  Kostenermittlung,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  beispielHonorarberechnung,
  beispielHonorarergebnis,
  beispielKostenberechnungHoai,
} from '../../vertrag/src/beispiele';
import type { Honorarberechnungseingabe, Honorarobjekteingabe, KostenNachDin276 } from './index';
import {
  honorarBerechnen,
  honorarberechnungBefehlAusfuehren,
  honorarberechnungChangeSetAnwenden,
} from './index';

interface Fixture {
  readonly kostenermittlung: Kostenermittlung;
  readonly ausKostenermittlung: { readonly kg300: string; readonly kg400: string };
  readonly honorarberechnung: Honorarberechnungseingabe &
    Pick<Honorarberechnung, 'id' | 'projektId' | 'name'>;
  readonly sollwerte: Honorarergebnis;
}

const fixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/honorar.json', import.meta.url), 'utf8'),
) as Fixture;

/**
 * Die gespeicherte Form eines Objekts der Fixture: statt der Beträge nach DIN 276 der Verweis auf die Kostenermittlung der
 * Datei; `technischeAnlagenAnteilig`, `weitereKosten` und `mitzuverarbeitendeBausubstanz` bleiben (von Hand, D-56).
 */
function gespeichert(objekt: Honorarobjekteingabe, kostenermittlung: Kostenermittlung): Honorarobjekt {
  const kosten = objekt.anrechenbareKosten;
  if (kosten.art !== 'din-276') throw new Error('Die Fixture trägt Beträge nach DIN 276');
  return {
    ...objekt,
    anrechenbareKosten: {
      art: 'kostenermittlung',
      kostenermittlungId: kostenermittlung.id,
      technischeAnlagenAnteilig: kosten.technischeAnlagenAnteilig,
      weitereKosten: kosten.weitereKosten,
      mitzuverarbeitendeBausubstanz: kosten.mitzuverarbeitendeBausubstanz,
    },
  };
}

const GESPEICHERT: Honorarberechnung = {
  ...fixture.honorarberechnung,
  objekte: fixture.honorarberechnung.objekte.map((o) => gespeichert(o, fixture.kostenermittlung)),
};

describe('Tor X3: fixtures/honorar.json', () => {
  it('die Eingabe mit Beträgen nach DIN 276 ergibt die Sollwerte', () => {
    expect(honorarBerechnen(fixture.honorarberechnung)).toEqual(fixture.sollwerte);
  });

  it('die gespeicherte Form (Verweis auf die Kostenberechnung der Datei) ergibt dieselben Sollwerte', () => {
    const kosten = fixture.honorarberechnung.objekte[0]?.anrechenbareKosten as KostenNachDin276;
    // Die Fixture nennt KG 300 und KG 400 der Kostenberechnung; die Eingabe trägt dieselben Beträge.
    expect([kosten.kg300, kosten.kg400]).toEqual([
      fixture.ausKostenermittlung.kg300,
      fixture.ausKostenermittlung.kg400,
    ]);
    const e = honorarBerechnen(GESPEICHERT, [fixture.kostenermittlung]);
    expect(e).toEqual(fixture.sollwerte);
    expect(e.brutto).toBe('267595.90');
  });

  it('über den Befehl angelegt und aus dem ChangeSet gerechnet: dieselben Sollwerte', () => {
    const cs = honorarberechnungBefehlAusfuehren(null, {
      art: 'HonorarberechnungAnlegen',
      honorarberechnung: GESPEICHERT,
    });
    if (!cs.ok) throw new Error(cs.fehler.meldung);
    const zustand: HonorarberechnungZustand | null = honorarberechnungChangeSetAnwenden(null, cs.wert);
    if (zustand === null) throw new Error('angelegt erwartet');
    expect(honorarBerechnen(zustand.honorarberechnung, [fixture.kostenermittlung])).toEqual(
      fixture.sollwerte,
    );
  });
});

describe('Beispiel des Vertrags (v1.6 Punkt 5)', () => {
  it('beispielHonorarberechnung mit beispielKostenberechnungHoai ergibt beispielHonorarergebnis', () => {
    expect(honorarBerechnen(beispielHonorarberechnung, [beispielKostenberechnungHoai])).toEqual(
      beispielHonorarergebnis,
    );
  });
});

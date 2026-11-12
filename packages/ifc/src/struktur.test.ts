// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Bauwerksstruktur (Ticket 98, Punkt 4): Projekt → Grundstück → Gebäude → Geschoss → Raum über
// `IfcRelAggregates`, Knoten in der Reihenfolge der Datei. Sollwerte von Hand aus den IFC-Texten unten.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import { bytes, codes, gid, grundgeruest, ifcText } from './testhilfen';

describe('Bauwerksstruktur', () => {
  it('liest Projekt, Grundstück, Gebäude, Geschoss und Raum mit ihren Eltern', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(),
          `#16=IFCSPACE('${gid('kueche')}',$,'0.01',$,$,$,$,'K\\X\\FCche',.ELEMENT.,.INTERNAL.,$);`,
          `#17=IFCRELAGGREGATES('${gid('r17')}',$,$,$,#12,(#16));`,
        ]),
      ),
    );
    expect(lesung.befunde).toEqual([]);
    expect(lesung.modell?.struktur).toEqual([
      { globalId: gid('projekt'), art: 'projekt', name: 'Projekt', elternGlobalId: null, mengen: [] },
      {
        globalId: gid('grundstueck'),
        art: 'grundstueck',
        name: 'Grundstück',
        elternGlobalId: gid('projekt'),
        mengen: [],
      },
      { globalId: gid('gebaeude'), art: 'gebaeude', name: 'Haus', elternGlobalId: gid('grundstueck'), mengen: [] },
      { globalId: gid('eg'), art: 'geschoss', name: 'EG', elternGlobalId: gid('gebaeude'), mengen: [] },
      { globalId: gid('kueche'), art: 'raum', name: '0.01', elternGlobalId: gid('eg'), mengen: [] },
    ]);
  });

  it('gibt die Knoten in der Reihenfolge der Datei aus, nicht in der der Beziehungen', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(),
          `#20=IFCBUILDINGSTOREY('${gid('og')}',$,'OG',$,$,$,$,$,.ELEMENT.,3.);`,
          `#21=IFCBUILDINGSTOREY('${gid('kg')}',$,'KG',$,$,$,$,$,.ELEMENT.,-3.);`,
          `#22=IFCRELAGGREGATES('${gid('r22')}',$,$,$,#11,(#21,#20));`,
        ]),
      ),
    );
    expect(lesung.modell?.struktur.map((k) => [k.name, k.elternGlobalId])).toEqual([
      ['Projekt', null],
      ['Grundstück', gid('projekt')],
      ['Haus', gid('grundstueck')],
      ['EG', gid('gebaeude')],
      ['OG', gid('gebaeude')],
      ['KG', gid('gebaeude')],
    ]);
  });

  it('meldet einen Knoten ohne Eltern und behält ihn', () => {
    const lesung = ifcLesen(
      bytes(ifcText([...grundgeruest(), `#20=IFCBUILDINGSTOREY('${gid('og')}',$,'OG',$,$,$,$,$,.ELEMENT.,3.);`])),
    );
    expect(lesung.modell?.struktur.at(-1)).toEqual({
      globalId: gid('og'),
      art: 'geschoss',
      name: 'OG',
      elternGlobalId: null,
      mengen: [],
    });
    expect(codes(lesung)).toEqual(['strukturknoten-ohne-eltern']);
    // Kopf 7 Zeilen, Grundgerüst 13 Zeilen: #20 steht in Zeile 21.
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'warnung', ort: { pfad: '#20', zeile: 21 } });
  });

  it('meldet einen Verweis auf eine fehlende Instanz, ohne abzustürzen', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(),
          `#20=IFCBUILDINGSTOREY('${gid('og')}',$,'OG',$,$,$,$,$,.ELEMENT.,3.);`,
          `#21=IFCRELAGGREGATES('${gid('r21')}',$,$,$,#999,(#20));`,
        ]),
      ),
    );
    expect(lesung.modell?.struktur.at(-1)?.elternGlobalId).toBeNull();
    expect(codes(lesung)).toEqual(['verweis-fehlt', 'strukturknoten-ohne-eltern']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'fehler', ort: { pfad: '#21' } });
    expect(lesung.befunde[0]?.meldung).toContain('#999');
  });
});

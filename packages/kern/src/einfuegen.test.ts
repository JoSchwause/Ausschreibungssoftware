// SPDX-License-Identifier: AGPL-3.0-or-later
// KnotenEinfuegen und KnotenlisteVerschieben (Ticket 42, Punkte 2 bis 4). Zuerst geschrieben (Q1). Property-Test über
// gemischte Folgen: `k9-eigenschaften.test.ts`.

import { describe, expect, it } from 'vitest';
import type {
  Befehlsfehlercode,
  Einfuegeort,
  HinweistextId,
  Knoten,
  LosId,
  LvBefehl,
  LvZustand,
  Ordnungszahl,
  PapierkorbeintragId,
  Position,
  PositionId,
  TitelId,
} from '@tethys/vertrag';
import {
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  kopieBauen,
  lvBefehlAusfuehren,
  pruefeLvInvarianten,
  summenBerechnen,
} from './index';
import type { KopieIdQuelle } from './index';
import {
  LV_ID,
  anwenden,
  erwarteOk,
  id,
  kinderIds,
  lvMit,
  merkmale,
  posKnoten,
  titelKnoten,
  wahlzuordnung,
  wende,
  zuschlagAuf,
  zuschlagsliste,
} from './testhilfen';

const oz = (s: string) => s as Ordnungszahl;
const ende = (eltern: string): Einfuegeort => ({ art: 'ende', elternId: id.eltern(eltern) });
const anfang = (eltern: string): Einfuegeort => ({ art: 'anfang', elternId: id.eltern(eltern) });
const nach = (knoten: string): Einfuegeort => ({ art: 'nach', knotenId: id.knoten(knoten) });
const einfuegen = (ort: Einfuegeort, knoten: readonly Knoten[]): LvBefehl => ({
  art: 'KnotenEinfuegen',
  ort,
  knoten,
});
const verschieben = (ziel: Einfuegeort, ...knoten: string[]): LvBefehl => ({
  art: 'KnotenlisteVerschieben',
  knotenIds: knoten.map(id.knoten),
  ziel,
});

function quelle(): KopieIdQuelle {
  let n = 0;
  const neu = (art: string): string => `${art}-${String(++n)}`;
  return {
    los: () => neu('L') as LosId,
    titel: () => neu('T') as TitelId,
    position: () => neu('P') as PositionId,
    hinweistext: () => neu('H') as HinweistextId,
  };
}

const t = (k: string, eltern: string, r: number, o: string): Knoten => ({
  ...titelKnoten(k, eltern, r),
  ordnungszahl: oz(o),
});
const p = (
  k: string,
  eltern: string,
  r: number,
  o: string,
  menge: string | null,
  ep: string | null,
  ueber = {},
) => posKnoten(k, eltern, r, menge, ep, { ordnungszahl: oz(o), ...ueber });

/**
 * T1 01 [P1 20,00; P2 15,00; Z 10 % auf die Gliederung], T2 02 [P3 100,00; T21 02.01 [P4 7,00; ZT 10 % Gliederung]].
 */
function basis(): LvZustand {
  return lvMit([
    t('T1', LV_ID, 0, '01'),
    p('P1', 'T1', 0, '01.0010', '2.000', '10.000'),
    p('P2', 'T1', 1, '01.0020', '3.000', '5.000'),
    p('Z', 'T1', 2, '01.0030', null, null, { zuschlag: zuschlagAuf('gliederung', '10.00') }),
    t('T2', LV_ID, 1, '02'),
    p('P3', 'T2', 0, '02.0010', '1.000', '100.000'),
    t('T21', 'T2', 1, '02.01'),
    p('P4', 'T21', 0, '02.01.0010', '1.000', '7.000'),
    p('ZT', 'T21', 1, '02.01.0020', null, null, { zuschlag: zuschlagAuf('gliederung', '10.00') }),
  ]);
}

const knoten = (z: LvZustand, k: string): Knoten | undefined =>
  z.leistungsverzeichnis.knoten.find((n) => n.id === k);
const ozVon = (z: LvZustand, k: string): string | null | undefined => {
  const n = knoten(z, k);
  return n === undefined || n.art === 'hinweis' ? undefined : n.ordnungszahl;
};
const gp = (z: LvZustand, k: string) => z.summen.positionen.find((s) => s.positionId === k)?.gesamtpreis;
const summe = (z: LvZustand, g: string) => z.summen.gliederungen.find((s) => s.gliederungId === g)?.summe;
const fehler = (z: LvZustand, b: LvBefehl): Befehlsfehlercode | null => {
  const e = lvBefehlAusfuehren(z, b);
  return e.ok ? null : e.fehler.code;
};
const schritt = (z: LvZustand, b: LvBefehl): LvZustand => {
  const cs = erwarteOk(lvBefehlAusfuehren(z, b));
  const neu = anwenden(z, cs);
  expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
  expect(pruefeLvInvarianten(neu.leistungsverzeichnis, neu.papierkorb)).toEqual([]);
  expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  return neu;
};

describe('zuständig', () => {
  it('KnotenEinfuegen und KnotenlisteVerschieben stehen nicht mehr in ZUSTAENDIGES_TICKET', () => {
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('KnotenEinfuegen');
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('KnotenlisteVerschieben');
  });
});

describe('KnotenEinfuegen', () => {
  it('Kopie eines Titels ans Ende: neue OZ für die Wurzel, Unterbaum neu nummeriert, Summen und Zuschlag der Kopie', () => {
    const z = basis();
    const kopie = kopieBauen(z, [id.knoten('T1')], quelle());
    const cs = erwarteOk(lvBefehlAusfuehren(z, einfuegen(ende(LV_ID), kopie)));
    expect(cs.knoten.hinzugefuegt.map((k) => k.id)).toEqual(['T-1', 'P-2', 'P-3', 'P-4']);
    expect(cs.knoten.geaendert).toEqual([]);
    const n = schritt(z, einfuegen(ende(LV_ID), kopie));
    expect(kinderIds(n, LV_ID)).toEqual(['T1', 'T2', 'T-1']);
    expect(['T-1', 'P-2', 'P-3', 'P-4'].map((k) => ozVon(n, k))).toEqual([
      '03',
      '03.0010',
      '03.0020',
      '03.0030',
    ]);
    expect(gp(n, 'P-4')).toBe('3.50');
    expect(summe(n, 'T-1')).toBe('38.50');
    expect(n.summen.gesamt.netto).toBe('184.70');
  });

  it('Kopie hinter eine Position desselben Elternknotens: OZ dazwischen (Schritt 5, Hinweis), Zuschlag am Zielort neu', () => {
    const z = basis();
    const kopie = kopieBauen(z, [id.knoten('P1')], quelle());
    const cs = erwarteOk(lvBefehlAusfuehren(z, einfuegen(nach('P2'), kopie)));
    expect(cs.hinweise?.map((h) => [h.code, h.knotenId])).toEqual([['oz-schritt-ausgewichen', 'P-1']]);
    expect(cs.knoten.geaendert.map((g) => [g.nachher.id, g.nachher.reihenfolge])).toEqual([['Z', 3]]);
    expect(cs.summen.positionen.map((s) => s.positionId).sort()).toEqual(['P-1', 'Z']);
    const n = schritt(z, einfuegen(nach('P2'), kopie));
    expect(kinderIds(n, 'T1')).toEqual(['P1', 'P2', 'P-1', 'Z']);
    expect(ozVon(n, 'P-1')).toBe('01.0025');
    expect(gp(n, 'Z')).toBe('5.50');
  });

  it('mehrere Wurzeln hintereinander am Ort; mitgebrachte Lage der Wurzeln zählt nicht; interne Bezüge', () => {
    const z = basis();
    const liste: Knoten[] = [
      p('N1', 'irgendwo', 7, '99', '1.000', '1.000'),
      p('N2', 'egal', 3, '99', null, null, { zuschlag: zuschlagsliste(['N1', 'P3'], '50.00') }),
      p('N3', 'egal', 0, '', '1.000', '2.000', { merkmale: merkmale({ wahl: wahlzuordnung(1, 1, 'N1') }) }),
    ];
    const n = schritt(z, einfuegen(anfang('T21'), liste));
    expect(kinderIds(n, 'T21')).toEqual(['N1', 'N2', 'N3', 'P4', 'ZT']);
    expect(['N1', 'N2', 'N3'].map((k) => ozVon(n, k))).toEqual(['02.01.0005', '02.01.0007', '02.01.0009']);
    expect(gp(n, 'N2')).toBe('50.50');
    // ZT (Gliederung, R3) zählt die Positionen vor sich bis zur vorigen Zuschlagsposition N2: P4.
    expect(gp(n, 'ZT')).toBe('0.70');
  });

  it("leere Einheit '' wird null, auch in Unterbeschreibungen", () => {
    const n = schritt(
      basis(),
      einfuegen(ende('T1'), [
        p('N1', 'x', 0, '', '1.000', '1.000', {
          einheit: '',
          leitbeschreibung: {
            unterbeschreibungen: [{ nummer: '01', kurztext: 'U', langtext: [], menge: null, einheit: '' }],
          },
        }),
      ]),
    );
    const k = knoten(n, 'N1') as Position;
    expect(k.einheit).toBeNull();
    expect(k.leitbeschreibung?.unterbeschreibungen[0]?.einheit).toBeNull();
  });

  it('Fehler: leere Liste, vergebene oder doppelte Kennung, Bezug unbekannt, Formfehler, Ort', () => {
    const z = basis();
    const neu = (k: string, ueber = {}) => p(k, 'x', 0, '', '1.000', '1.000', ueber);
    expect(fehler(z, einfuegen(ende(LV_ID), []))).toBe('ungueltige-eingabe');
    expect(fehler(z, einfuegen(ende(LV_ID), [neu('P1')]))).toBe('id-vergeben');
    expect(fehler(z, einfuegen(ende(LV_ID), [neu(LV_ID)]))).toBe('id-vergeben');
    expect(fehler(z, einfuegen(ende(LV_ID), [neu('N'), neu('N')]))).toBe('id-vergeben');
    expect(fehler(z, einfuegen(ende(LV_ID), [neu('N', { zuschlag: zuschlagsliste(['weg'], '1.00') })]))).toBe(
      'bezug-unbekannt',
    );
    expect(fehler(z, einfuegen(ende(LV_ID), [neu('N', { menge: '1.5' })]))).toBe('ungueltige-eingabe');
    expect(fehler(z, einfuegen(ende('gibt-es-nicht'), [neu('N')]))).toBe('eltern-unbekannt');
    expect(fehler(z, einfuegen(ende('P1'), [neu('N')]))).toBe('knotenart-unzulaessig');
    expect(fehler(z, einfuegen(nach('gibt-es-nicht'), [neu('N')]))).toBe('knoten-unbekannt');
    const korb = wende(z, {
      art: 'KnotenInPapierkorbLegen',
      eintragId: 'E1' as PapierkorbeintragId,
      knotenIds: [id.knoten('P3')],
    });
    expect(fehler(korb, einfuegen(ende(LV_ID), [neu('P3')]))).toBe('id-vergeben');
    // Bezug in den Papierkorb ist zulässig (D-12).
    expect(
      fehler(korb, einfuegen(ende('T1'), [neu('N', { zuschlag: zuschlagsliste(['P3'], '1.00') })])),
    ).toBeNull();
  });

  it('Fehler im Teilbaum: Eltern nach Kindern, Kind unter Position, Reihenfolge, Hinweistext mit Menge, Los unter Titel', () => {
    const z = basis();
    const titel = t('NT', 'x', 0, '');
    expect(fehler(z, einfuegen(ende(LV_ID), [p('NP', 'NT', 0, '', null, null), titel]))).toBe(
      'ungueltige-eingabe',
    );
    expect(
      fehler(z, einfuegen(ende(LV_ID), [p('NP', 'x', 0, '', null, null), p('NQ', 'NP', 0, '', null, null)])),
    ).toBe('knotenart-unzulaessig');
    expect(
      fehler(
        z,
        einfuegen(ende(LV_ID), [titel, p('A', 'NT', 0, '', null, null), p('B', 'NT', 2, '', null, null)]),
      ),
    ).toBe('ungueltige-eingabe');
    const hinweis = {
      art: 'hinweis',
      id: id.hinweis('NH'),
      elternId: id.eltern('x'),
      reihenfolge: 0,
      text: [],
      menge: '1.000',
    } as unknown as Knoten;
    expect(fehler(z, einfuegen(ende(LV_ID), [hinweis]))).toBe('ungueltige-eingabe');
    const los: Knoten = {
      art: 'los',
      id: id.los('NL'),
      elternId: id.eltern('x'),
      reihenfolge: 0,
      ordnungszahl: null,
      kurztext: 'L',
    };
    expect(fehler(z, einfuegen(ende('T1'), [los]))).toBe('knotenart-unzulaessig');
    expect(fehler(z, einfuegen(ende(LV_ID), [titel, { ...los, elternId: id.eltern('NT') }]))).toBe(
      'knotenart-unzulaessig',
    );
    // F1: Los neben Titeln auf der obersten Ebene.
    expect(fehler(z, einfuegen(ende(LV_ID), [los]))).toBe('knotenart-unzulaessig');
  });

  it('ebene-ueberschritten, wenn der eingefügte Teilbaum zu tief würde', () => {
    const z = basis(); // T21 liegt auf Ebene 2
    const kette = [t('A', 'x', 0, ''), t('B', 'A', 0, ''), t('C', 'B', 0, ''), t('D', 'C', 0, '')];
    expect(fehler(z, einfuegen(ende('T21'), kette))).toBe('ebene-ueberschritten');
    expect(fehler(z, einfuegen(ende('T21'), kette.slice(0, 3)))).toBeNull();
  });
});

describe('KnotenlisteVerschieben', () => {
  it('zwei Positionen aus zwei Gliederungen als ein Befehl ans Ende von T21: OZ neu, Summen und Zuschläge beider Seiten', () => {
    const z = basis();
    const n = schritt(z, verschieben(ende('T21'), 'P1', 'P3'));
    expect(kinderIds(n, 'T21')).toEqual(['P4', 'ZT', 'P1', 'P3']);
    expect(kinderIds(n, 'T1')).toEqual(['P2', 'Z']);
    expect(ozVon(n, 'P1')).toBe('02.01.0030');
    expect(ozVon(n, 'P3')).toBe('02.01.0040');
    expect(gp(n, 'Z')).toBe('1.50'); // Quelle: Basis nur noch P2
    expect(gp(n, 'ZT')).toBe('0.70'); // hinter ZT: zählt nicht
    expect(summe(n, 'T1')).toBe('16.50');
    expect(summe(n, 'T21')).toBe('127.70');
    expect(summe(n, 'T2')).toBe('127.70');
  });

  it('an den Anfang von T21: der Zuschlag am Ziel bekommt die Positionen in die Basis', () => {
    const n = schritt(basis(), verschieben(anfang('T21'), 'P1'));
    expect(gp(n, 'ZT')).toBe('2.70');
    expect(ozVon(n, 'P1')).toBe('02.01.0005');
  });

  it('innerhalb desselben Elternknotens bleibt die OZ (A7)', () => {
    const n = schritt(basis(), verschieben(nach('Z'), 'P1'));
    expect(kinderIds(n, 'T1')).toEqual(['P2', 'Z', 'P1']);
    expect(ozVon(n, 'P1')).toBe('01.0010');
    expect(gp(n, 'Z')).toBe('1.50');
  });

  it('ein Titel in einen anderen Elternknoten: neue OZ, Unterbaum neu nummeriert', () => {
    const n = schritt(basis(), verschieben(ende(LV_ID), 'T21'));
    expect(kinderIds(n, LV_ID)).toEqual(['T1', 'T2', 'T21']);
    expect(['T21', 'P4', 'ZT'].map((k) => ozVon(n, k))).toEqual(['03', '03.0010', '03.0020']);
  });

  it('nach einem mitbewegten Knoten: die Liste landet an dessen Stelle; Nachfahren genannter Knoten gehen mit', () => {
    const n = schritt(basis(), verschieben(nach('P2'), 'P2', 'P1', 'T21', 'P4'));
    expect(kinderIds(n, 'T1')).toEqual(['P2', 'P1', 'T21', 'Z']);
    expect(kinderIds(n, 'T21')).toEqual(['P4', 'ZT']);
  });

  it('Fehler: leere Liste, unbekannter Knoten, Zyklus, Ebenen, Los unter Titel, F1', () => {
    const z = basis();
    expect(fehler(z, verschieben(ende('T1')))).toBe('ungueltige-eingabe');
    expect(fehler(z, verschieben(ende('T1'), 'gibt-es-nicht'))).toBe('knoten-unbekannt');
    expect(fehler(z, verschieben(ende('T21'), 'P1', 'T2'))).toBe('zyklus');
    expect(fehler(z, verschieben(nach('T2'), 'T2'))).toBe('zyklus');
    expect(fehler(z, verschieben(ende('P1'), 'P2'))).toBe('knotenart-unzulaessig');
    const tief = lvMit([
      titelKnoten('A', LV_ID, 0),
      titelKnoten('B', 'A', 0),
      titelKnoten('C', 'B', 0),
      titelKnoten('D', 'C', 0),
      titelKnoten('X', LV_ID, 1),
      titelKnoten('Y', 'X', 0),
    ]);
    expect(fehler(tief, verschieben(ende('D'), 'X'))).toBe('ebene-ueberschritten');
    expect(fehler(tief, verschieben(ende('C'), 'X'))).toBeNull();
    const mitLos = lvMit([
      {
        art: 'los',
        id: id.los('L1'),
        elternId: id.eltern(LV_ID),
        reihenfolge: 0,
        ordnungszahl: null,
        kurztext: 'L',
      },
      titelKnoten('T', 'L1', 0),
      titelKnoten('U', 'T', 0),
    ]);
    expect(fehler(mitLos, verschieben(ende('T'), 'L1'))).toBe('zyklus');
    expect(fehler(mitLos, verschieben(ende(LV_ID), 'U'))).toBe('knotenart-unzulaessig'); // F1
  });
});

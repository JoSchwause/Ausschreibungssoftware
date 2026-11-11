// SPDX-License-Identifier: AGPL-3.0-or-later
// Einfügeort „hinter einer Gliederung als Geschwister“ (Ticket 56, Punkt 2; Vertrag v1.3, Ticket 53 Punkt 5): Lage wie
// „nach“ einer Position (Elternknoten der Gliederung, Index direkt hinter ihr), F1- und Ebenenprüfungen wie bisher,
// OZ-Vorschlag nach D-42.3. Die Form `nach` einer Gliederung (erstes Kind) bleibt unverändert.

import { describe, expect, it } from 'vitest';
import type {
  Einfuegeort,
  Knoten,
  LvBefehl,
  LvZustand,
  Ordnungszahl,
  PapierkorbeintragId,
  PositionId,
  TitelId,
} from '@tethys/vertrag';
import { changeSetUmkehren, kopieBauen, lvBefehlAusfuehren } from './index';
import type { KopieIdQuelle } from './index';
import {
  LV_ID,
  anwenden,
  erwarteOk,
  id,
  kinderIds,
  lvMit,
  posKnoten,
  positionsdaten,
  titelKnoten,
} from './testhilfen';

const oz = (s: string) => s as Ordnungszahl;
const hinter = (g: string): Einfuegeort => ({ art: 'hinter-gliederung', gliederungId: id.titel(g) });
const titel = (i: string, ort: Einfuegeort): LvBefehl => ({
  art: 'GliederungAnlegen',
  id: id.titel(i),
  gliederungsart: 'titel',
  ort,
  kurztext: i,
});
const position = (i: string, ort: Einfuegeort): LvBefehl => ({
  art: 'PositionAnlegen',
  id: id.pos(i),
  ort,
  daten: positionsdaten(i),
});
const verschiebe = (i: string, ziel: Einfuegeort): LvBefehl => ({
  art: 'KnotenVerschieben',
  knotenId: id.knoten(i),
  ziel,
});
const liste = (ziel: Einfuegeort, ...knoten: string[]): LvBefehl => ({
  art: 'KnotenlisteVerschieben',
  knotenIds: knoten.map(id.knoten),
  ziel,
});

/** T1 (01) mit P1, P2 und Untertitel T11 (01.01) mit P11; T2 (03) mit P3; P5 direkt unter dem LV. */
function start(): LvZustand {
  return lvMit([
    { ...titelKnoten('T1', LV_ID, 0), ordnungszahl: oz('01') },
    posKnoten('P1', 'T1', 0, '1.000', '1.000', { ordnungszahl: oz('01.0010') }),
    posKnoten('P2', 'T1', 1, '1.000', '1.000', { ordnungszahl: oz('01.0020') }),
    { ...titelKnoten('T11', 'T1', 2), ordnungszahl: oz('01.01') },
    posKnoten('P11', 'T11', 0, '1.000', '1.000', { ordnungszahl: oz('01.01.0010') }),
    { ...titelKnoten('T2', LV_ID, 1), ordnungszahl: oz('03') },
    posKnoten('P3', 'T2', 0, '1.000', '1.000', { ordnungszahl: oz('03.0010') }),
    posKnoten('P5', LV_ID, 2, '1.000', '1.000'),
  ]);
}

function ausfuehren(z: LvZustand, b: LvBefehl): LvZustand {
  const cs = erwarteOk(lvBefehlAusfuehren(z, b));
  const neu = anwenden(z, cs);
  expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  return neu;
}

const fehlercode = (z: LvZustand, b: LvBefehl): string | null => {
  const e = lvBefehlAusfuehren(z, b);
  return e.ok ? null : e.fehler.code;
};

const knotenIn = (z: LvZustand, kennung: string): Knoten | undefined =>
  z.leistungsverzeichnis.knoten.find((k) => k.id === kennung);

function quelle(): KopieIdQuelle & { eintrag(): PapierkorbeintragId } {
  let n = 0;
  return {
    los: () => `neu-L${String(++n)}` as never,
    titel: () => `neu-T${String(++n)}` as TitelId,
    position: () => `neu-P${String(++n)}` as PositionId,
    hinweistext: () => `neu-H${String(++n)}` as never,
    eintrag: () => `neu-E${String(++n)}` as PapierkorbeintragId,
  };
}

describe('Anlegen hinter einer Gliederung', () => {
  it('GliederungAnlegen und PositionAnlegen landen als Geschwister direkt hinter der Gliederung samt Unterbaum', () => {
    const z = start();
    expect(kinderIds(ausfuehren(z, titel('TN', hinter('T1'))), LV_ID)).toEqual(['T1', 'TN', 'T2', 'P5']);
    expect(kinderIds(ausfuehren(z, position('PN', hinter('T1'))), LV_ID)).toEqual(['T1', 'PN', 'T2', 'P5']);
    expect(kinderIds(ausfuehren(z, position('PN', hinter('T11'))), 'T1')).toEqual(['P1', 'P2', 'T11', 'PN']);
    // Die bisherige Form bleibt: `nach` einer Gliederung ist ihr erstes Kind.
    expect(
      kinderIds(ausfuehren(z, position('PN', { art: 'nach', knotenId: id.knoten('T1') })), 'T1'),
    ).toEqual(['PN', 'P1', 'P2', 'T11']);
  });

  it('Ziel unbekannt: knoten-unbekannt; Ziel keine Gliederung: knotenart-unzulaessig', () => {
    const z = start();
    expect(fehlercode(z, titel('TN', hinter('gibt-es-nicht')))).toBe('knoten-unbekannt');
    expect(fehlercode(z, titel('TN', hinter('P1')))).toBe('knotenart-unzulaessig');
    expect(fehlercode(z, position('PN', hinter('P5')))).toBe('knotenart-unzulaessig');
  });

  it('Ebenen zählen am Elternknoten der Gliederung: hinter der fünften Stufe geht, nach ihr (erstes Kind) nicht', () => {
    let z = lvMit([titelKnoten('A', LV_ID, 0)]);
    for (const [kind, eltern] of [
      ['B', 'A'],
      ['C', 'B'],
      ['D', 'C'],
      ['E', 'D'],
    ] as const)
      z = ausfuehren(z, titel(kind, { art: 'ende', elternId: id.eltern(eltern) }));
    expect(fehlercode(z, titel('F', { art: 'nach', knotenId: id.knoten('E') }))).toBe('ebene-ueberschritten');
    expect(kinderIds(ausfuehren(z, titel('F', hinter('E'))), 'D')).toEqual(['E', 'F']);
  });

  it('F1: ein Los hinter einem Titel der obersten Ebene wird abgewiesen', () => {
    const b: LvBefehl = {
      art: 'GliederungAnlegen',
      id: id.los('LN'),
      gliederungsart: 'los',
      ort: hinter('T1'),
      kurztext: 'L',
    };
    expect(fehlercode(start(), b)).toBe('knotenart-unzulaessig');
  });
});

describe('Verschieben hinter eine Gliederung', () => {
  it('KnotenVerschieben: aus der Gliederung heraus hinter sie; Gliederung hinter eine andere', () => {
    const z = start();
    expect(kinderIds(ausfuehren(z, verschiebe('P1', hinter('T1'))), LV_ID)).toEqual(['T1', 'P1', 'T2', 'P5']);
    const t1HinterT2 = ausfuehren(z, verschiebe('T1', hinter('T2')));
    expect(kinderIds(t1HinterT2, LV_ID)).toEqual(['T2', 'T1', 'P5']);
    expect(kinderIds(ausfuehren(z, verschiebe('P11', hinter('T11'))), 'T1')).toEqual([
      'P1',
      'P2',
      'T11',
      'P11',
    ]);
    expect(kinderIds(ausfuehren(z, verschiebe('P5', hinter('T1'))), LV_ID)).toEqual(['T1', 'P5', 'T2']);
  });

  it('KnotenVerschieben hinter sich selbst ist eine Nullbewegung; hinter den eigenen Untertitel ein Zyklus', () => {
    const z = start();
    const cs = erwarteOk(lvBefehlAusfuehren(z, verschiebe('T1', hinter('T1'))));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(fehlercode(z, verschiebe('T1', hinter('T11')))).toBe('zyklus');
    expect(fehlercode(z, verschiebe('P1', hinter('P2')))).toBe('knotenart-unzulaessig');
  });

  it('KnotenlisteVerschieben: hinter die Gliederung; liegt sie selbst unter den bewegten, an ihre Stelle', () => {
    const z = start();
    expect(kinderIds(ausfuehren(z, liste(hinter('T1'), 'P1', 'P3')), LV_ID)).toEqual([
      'T1',
      'P1',
      'P3',
      'T2',
      'P5',
    ]);
    expect(kinderIds(ausfuehren(z, liste(hinter('T2'), 'P5', 'T2')), LV_ID)).toEqual(['T1', 'P5', 'T2']);
    expect(fehlercode(z, liste(hinter('T11'), 'T1'))).toBe('zyklus');
  });
});

describe('Einfügen und Wiederherstellen hinter einer Gliederung', () => {
  it('KnotenEinfuegen: Kopie eines Titels hinter T1 bekommt den OZ-Vorschlag zwischen 01 und 03 (D-42.3)', () => {
    const z = start();
    const kopie = kopieBauen(z, [id.knoten('T2')], quelle());
    const neu = ausfuehren(z, { art: 'KnotenEinfuegen', ort: hinter('T1'), knoten: kopie });
    const wurzel = kopie[0];
    expect(kinderIds(neu, LV_ID)).toEqual(['T1', wurzel?.id, 'T2', 'P5']);
    expect(knotenIn(neu, wurzel?.id ?? '')).toMatchObject({ ordnungszahl: '02' });
    const unter = kinderIds(neu, wurzel?.id ?? '');
    expect(knotenIn(neu, unter[0] ?? '')).toMatchObject({ ordnungszahl: '02.0010' });
  });

  it('PapierkorbeintragWiederherstellen mit Ort hinter einer Gliederung', () => {
    const ids = quelle();
    const eintragId = ids.eintrag();
    const z = ausfuehren(start(), {
      art: 'KnotenInPapierkorbLegen',
      eintragId,
      knotenIds: [id.knoten('P3')],
    });
    const neu = ausfuehren(z, { art: 'PapierkorbeintragWiederherstellen', eintragId, ort: hinter('T1') });
    expect(kinderIds(neu, LV_ID)).toEqual(['T1', 'P3', 'T2', 'P5']);
    expect(fehlercode(z, { art: 'PapierkorbeintragWiederherstellen', eintragId, ort: hinter('P1') })).toBe(
      'knotenart-unzulaessig',
    );
  });
});

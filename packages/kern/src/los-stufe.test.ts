// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 30, Punkt 7 (F1, E-08): Los-Stufe der Maske und „Lose und Titel nicht nebeneinander auf der obersten Ebene“.

import { describe, expect, it } from 'vitest';
import type { Einfuegeort, LvBefehl, LvZustand, OzMaske } from '@tethys/vertrag';
import { lvBefehlAusfuehren } from './index';
import {
  LV_ID,
  PROJEKT_ID,
  id,
  inhalt,
  positionsdaten,
  standardMaske,
  titelKnoten,
  wende,
} from './testhilfen';

const MIT_LOS: OzMaske = { ...standardMaske, losStufe: true };

const lvMitMaske = (maske: OzMaske, knoten = inhalt().knoten): LvZustand =>
  wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: LV_ID,
    projektId: PROJEKT_ID,
    inhalt: { ...inhalt(knoten), ozMaske: maske },
  });

const ende = (eltern: string): Einfuegeort => ({ art: 'ende', elternId: id.eltern(eltern) });
const gliederung = (i: string, art: 'los' | 'titel', ort: Einfuegeort): LvBefehl => ({
  art: 'GliederungAnlegen',
  id: art === 'los' ? id.los(i) : id.titel(i),
  gliederungsart: art,
  ort,
  kurztext: i,
});

const fehler = (z: LvZustand, b: LvBefehl) => {
  const e = lvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error(`angenommen: ${b.art}`);
  return e.fehler;
};

describe('losStufe: true', () => {
  it('ein Titel auf der obersten Ebene wird beim Anlegen abgewiesen; ein Los dort, ein Titel im Los, Positionen und Hinweise direkt unter dem LV nicht', () => {
    const z = lvMitMaske(MIT_LOS);
    const f = fehler(z, gliederung('T1', 'titel', ende(LV_ID)));
    expect(f.code).toBe('knotenart-unzulaessig');
    expect(f.knotenId).toBe('T1');
    const z1 = wende(z, gliederung('L1', 'los', ende(LV_ID)));
    const z2 = wende(z1, gliederung('T1', 'titel', ende('L1')));
    const z3 = wende(z2, {
      art: 'PositionAnlegen',
      id: id.pos('P1'),
      ort: ende(LV_ID),
      daten: positionsdaten('x'),
    });
    const z4 = wende(z3, { art: 'HinweistextAnlegen', id: id.hinweis('H1'), ort: ende(LV_ID), text: [] });
    expect(z4.leistungsverzeichnis.knoten.map((k) => k.id)).toEqual(['L1', 'T1', 'P1', 'H1']);
  });

  it('ein Titel wird nicht auf die oberste Ebene verschoben', () => {
    const z = wende(
      wende(lvMitMaske(MIT_LOS), gliederung('L1', 'los', ende(LV_ID))),
      gliederung('T1', 'titel', ende('L1')),
    );
    const f = fehler(z, { art: 'KnotenVerschieben', knotenId: id.knoten('T1'), ziel: ende(LV_ID) });
    expect(f.code).toBe('knotenart-unzulaessig');
    expect(f.knotenId).toBe('T1');
  });

  it('OzMaskeSetzen mit Los-Stufe weist ab, solange ein Titel auf der obersten Ebene steht', () => {
    const z = lvMitMaske(standardMaske, [titelKnoten('T1', LV_ID, 0)]);
    const f = fehler(z, { art: 'OzMaskeSetzen', maske: MIT_LOS });
    expect(f.code).toBe('knotenart-unzulaessig');
    expect(f.knotenId).toBe('T1');
    expect(f).not.toHaveProperty('knotenIds');
    // Vertrag v1.7a (D-127.14): mehrere Titel auf der obersten Ebene werden alle genannt.
    const zwei = lvMitMaske(standardMaske, [titelKnoten('T1', LV_ID, 0), titelKnoten('T2', LV_ID, 1)]);
    expect(fehler(zwei, { art: 'OzMaskeSetzen', maske: MIT_LOS }).knotenIds).toEqual(['T1', 'T2']);
    const nurLose = wende(lvMitMaske(standardMaske), gliederung('L1', 'los', ende(LV_ID)));
    expect(lvBefehlAusfuehren(nurLose, { art: 'OzMaskeSetzen', maske: MIT_LOS }).ok).toBe(true);
  });
});

describe('Lose und Titel nebeneinander auf der obersten Ebene (F1)', () => {
  for (const maske of [standardMaske, MIT_LOS]) {
    it(`werden abgewiesen (losStufe ${String(maske.losStufe ?? false)})`, () => {
      const z = wende(lvMitMaske(maske), gliederung('L1', 'los', ende(LV_ID)));
      expect(fehler(z, gliederung('T1', 'titel', ende(LV_ID))).code).toBe('knotenart-unzulaessig');
    });
  }

  it('ohne Los-Stufe: neben Titeln kein Los, weder angelegt noch hingeschoben; Titel neben Titeln bleiben erlaubt', () => {
    const z = wende(
      wende(lvMitMaske(standardMaske), gliederung('T1', 'titel', ende(LV_ID))),
      gliederung('T2', 'titel', ende(LV_ID)),
    );
    expect(fehler(z, gliederung('L1', 'los', ende(LV_ID))).code).toBe('knotenart-unzulaessig');
    const mitLos = wende(lvMitMaske(standardMaske), gliederung('L1', 'los', ende(LV_ID)));
    const mitTitelImLos = wende(mitLos, gliederung('T1', 'titel', ende('L1')));
    expect(
      fehler(mitTitelImLos, { art: 'KnotenVerschieben', knotenId: id.knoten('T1'), ziel: ende(LV_ID) }).code,
    ).toBe('knotenart-unzulaessig');
  });
});

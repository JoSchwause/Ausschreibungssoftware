// SPDX-License-Identifier: AGPL-3.0-or-later
// ozVorschlag (Ticket 42, Punkt 4; W-06, F2): OZ für einen neuen Knoten hinter dem Vorgänger. Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type { Einfuegeort, LeistungsverzeichnisId, LvZustand, Ordnungszahl, OzMaske } from '@tethys/vertrag';
import { ozVorschlag } from './index';
import {
  LV_ID,
  PROJEKT_ID,
  fixtureAlsInhalt,
  fixtureLesen,
  id,
  inhalt,
  posKnoten,
  titelKnoten,
  wende,
} from './testhilfen';

const ende = (eltern: string): Einfuegeort => ({ art: 'ende', elternId: id.eltern(eltern) });
const anfang = (eltern: string): Einfuegeort => ({ art: 'anfang', elternId: id.eltern(eltern) });
const nach = (knoten: string): Einfuegeort => ({ art: 'nach', knotenId: id.knoten(knoten) });

function typisch(): LvZustand {
  const fx = fixtureLesen('typisch');
  return wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: fx.id as LeistungsverzeichnisId,
    projektId: PROJEKT_ID,
    inhalt: fixtureAlsInhalt(fx),
  });
}
const T01 = '019b76e9-ea41-7576-8947-bf4601b85123';
const T02 = '019b76e9-ea48-7e5f-8113-92b1ee0bbcbf';
const P01_0020 = '019b76e9-ea43-79e5-a71b-20f7abf907b0';
const P02_0050A = '019b76e9-ea4e-72e6-aa2e-a1ad93edf894';
const HINWEIS_T01 = '019b76e9-ea5d-71d0-a8ee-b0ce854744c0';

const oz = (s: string) => s as Ordnungszahl;
const ohneHinweis = (o: string) => ({ ordnungszahl: oz(o), ozIndex: null });
const ausgewichen = (o: string) => ({
  ordnungszahl: oz(o),
  ozIndex: null,
  hinweis: expect.objectContaining({ code: 'oz-schritt-ausgewichen', feld: 'ordnungszahl' }) as unknown,
});

describe('ozVorschlag mit fixtures/typisch', () => {
  const z = typisch();
  const lv = z.leistungsverzeichnis.id;

  it('Normalfall: Position +10, Gliederung +1 hinter dem letzten Geschwister', () => {
    expect(ozVorschlag(z, ende(T01), 'position')).toEqual(ohneHinweis('01.0070'));
    expect(ozVorschlag(z, ende(T02), 'position')).toEqual(ohneHinweis('02.0100'));
    expect(ozVorschlag(z, ende(lv), 'titel')).toEqual(ohneHinweis('04'));
  });

  it('nach einem Hinweistext am Anfang: der nächste Nachfolger begrenzt, Ausweichen auf Schritt 5', () => {
    expect(ozVorschlag(z, nach(HINWEIS_T01), 'position')).toEqual(ausgewichen('01.0005'));
  });

  it('zwischen zwei Positionen: Ausweichen auf 5 mit Hinweis', () => {
    expect(ozVorschlag(z, nach(P01_0020), 'position')).toEqual(ausgewichen('01.0025'));
    expect(ozVorschlag(z, nach(P02_0050A), 'position')).toEqual(ausgewichen('02.0055'));
  });

  it('kein Platz: null (Gliederung hat keinen Rückfall), sonst Gliederung ab 1', () => {
    expect(ozVorschlag(z, anfang(lv), 'titel')).toBeNull();
    expect(ozVorschlag(z, nach(T01), 'titel')).toEqual(ohneHinweis('01.01')); // erste Untergliederung
  });

  it('unbekannter Ort: null', () => {
    expect(ozVorschlag(z, nach('gibt-es-nicht'), 'position')).toBeNull();
  });
});

describe('ozVorschlag nahe dem Überlauf', () => {
  /** Eine Stufe zu 2, Position zu 2 Stellen: Positionen 10 … 90, dann wird es eng. */
  const maske: OzMaske = {
    gliederung: [{ laenge: 2, zeichen: 'numerisch' }],
    position: { laenge: 2, zeichen: 'numerisch' },
    index: null,
    trennzeichen: '.',
  };
  const mit = (letzte: string): LvZustand =>
    wende(null, {
      art: 'LeistungsverzeichnisAnlegen',
      id: LV_ID,
      projektId: PROJEKT_ID,
      inhalt: {
        ...inhalt([
          { ...titelKnoten('T1', LV_ID, 0), ordnungszahl: oz('01') },
          posKnoten('P', 'T1', 0, null, null, { ordnungszahl: oz(`01.${letzte}`) }),
        ]),
        ozMaske: maske,
      },
    });

  it('90 → 95 (Schritt 5), 96 → 98 (Schritt 2), 98 → 99 (Schritt 1), 99 → null', () => {
    expect(ozVorschlag(mit('90'), ende('T1'), 'position')).toEqual(ausgewichen('01.95'));
    expect(ozVorschlag(mit('96'), ende('T1'), 'position')).toEqual(ausgewichen('01.98'));
    expect(ozVorschlag(mit('98'), ende('T1'), 'position')).toEqual(ausgewichen('01.99'));
    expect(ozVorschlag(mit('99'), ende('T1'), 'position')).toBeNull();
    expect(ozVorschlag(mit('80'), ende('T1'), 'position')).toEqual(ohneHinweis('01.90'));
  });

  it('Elternknoten ohne OZ oder Stufe tiefer als die Maske: null', () => {
    const z = mit('10');
    const ohneOz = wende(z, {
      art: 'OrdnungszahlSetzen',
      knotenId: id.titel('T1'),
      ordnungszahl: null,
      ozIndex: null,
    });
    expect(ozVorschlag(ohneOz, ende('T1'), 'position')).toBeNull();
    expect(ozVorschlag(z, ende('T1'), 'titel')).toBeNull();
  });
});

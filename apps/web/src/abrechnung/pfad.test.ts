// SPDX-License-Identifier: AGPL-3.0-or-later
import type {
  Aufmass,
  AufmassChangeSet,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  ProjektId,
  ProtokollId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { Teil } from '../historie/historie';
import { zielNach } from '../historie/HistorieAnbieter';
import { abrechnungsseite, aufmassPfad, blattPfad, sollIstPfad } from './pfad';

const p = 'p1' as ProjektId;
const a = 'a1' as AuftragsLeistungsverzeichnisId;
const id = 'b1' as AufmassId;
const blatt: Aufmass = {
  id,
  projektId: p,
  auftragsLvId: a,
  nummer: 1,
  bezeichnung: '',
  datum: null,
  positionen: [],
};
const teil = (cs: AufmassChangeSet): Teil => ({
  protokollId: 'e1' as ProtokollId,
  projektId: p,
  aggregat: { art: 'aufmass', id },
  changeSet: cs,
});
const anlegen = teil({ art: 'aufmass', aufmassId: id, aufmass: { vorher: null, nachher: blatt } });
const aendern = teil({
  art: 'aufmass',
  aufmassId: id,
  aufmass: { vorher: blatt, nachher: { ...blatt, bezeichnung: 'neu' } },
});

describe('Adressen der Abrechnung', () => {
  it('Liste, Blatt und Soll/Ist hängen am Auftrags-LV und lassen sich zurücklesen', () => {
    expect(aufmassPfad(p, a)).toBe('/projekt/p1/auftrag/a1/aufmass');
    expect(blattPfad(p, a, id)).toBe('/projekt/p1/auftrag/a1/aufmass/b1');
    expect(sollIstPfad(p, a)).toBe('/projekt/p1/auftrag/a1/soll-ist');
    expect(abrechnungsseite('/projekt/p1/auftrag/a1/aufmass')).toEqual({
      art: 'liste',
      projektId: p,
      auftragsLvId: a,
    });
    expect(abrechnungsseite('/projekt/p1/auftrag/a1/aufmass/b1')).toEqual({
      art: 'blatt',
      projektId: p,
      auftragsLvId: a,
      aufmassId: id,
    });
    expect(abrechnungsseite('/projekt/p%201/auftrag/a1/soll-ist')).toEqual({
      art: 'soll-ist',
      projektId: 'p 1',
      auftragsLvId: a,
    });
    expect(abrechnungsseite('/projekt/p1/auftrag/a1')).toBeNull();
    expect(abrechnungsseite('/projekt/p1/auftrag/a1/aufmass/b1/x')).toBeNull();
  });

  it('nach Rückgängig und Wiederholen zeigt die App das Blatt, oder die Liste, wenn es weg ist', () => {
    // Rückgängig des Anlegens: Das Blatt ist weg, also die Liste.
    expect(zielNach(anlegen, true, blattPfad(p, a, id))).toBe(aufmassPfad(p, a));
    expect(zielNach(anlegen, true, aufmassPfad(p, a))).toBeNull();
    // Wiederholen des Anlegens: das Blatt.
    expect(zielNach(anlegen, false, '/')).toBe(blattPfad(p, a, id));
    // Eine Änderung am Blatt: dort sichtbar; auf Soll/Ist desselben Auftrags-LV ebenso, also bleiben.
    expect(zielNach(aendern, true, aufmassPfad(p, a))).toBe(blattPfad(p, a, id));
    expect(zielNach(aendern, false, blattPfad(p, a, id))).toBeNull();
    expect(zielNach(aendern, true, sollIstPfad(p, a))).toBeNull();
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// `nachtragUebernehmen` an kleinen Bäumen von Hand (Ticket 80, D-35): Art und OZ der neuen Gliederung, Alternativen,
// Zuschlagspositionen, Bezüge, Hinweistexte, Lose im Nachtrags-LV (D-80.2), OZ außerhalb der Maske (D-80.1).

import { baumfehler } from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisId,
  BieterId,
  Knoten,
  LosId,
  LvZustand,
  Nachtragsangaben,
  OzMaske,
  Position,
  PositionId,
  Prozent,
  TitelId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { nachtragUebernehmen } from './nachtrag-uebernehmen';
import type { Nachtragsergebnis } from './nachtrag-uebernehmen';
import {
  MASKE,
  PROJEKT,
  angebot,
  auftragsLv,
  ep,
  erwarteOk,
  hinweis,
  los,
  lvZustand,
  nichtAngeboten,
  position,
  satz,
  titel,
  zuschlagsposition,
} from './testhilfen';

const ids = { los: () => 'neu' as LosId, titel: () => 'neu' as TitelId };
const BIETER = 'bieter-an';

function angaben(auftragsLvId: string): Nachtragsangaben {
  return { auftragsLvId: auftragsLvId as AuftragsLeistungsverzeichnisId, nummer: 'N07', status: 'angeboten' };
}

function nachtragsLv(auftragsLvId: string, knoten: readonly Knoten[], maske: OzMaske = MASKE): LvZustand {
  return lvZustand(
    'nlv',
    { name: 'Nachtrag', ozMaske: maske, mwstSatz: '19.00' as Prozent, nachlass: null, knoten },
    PROJEKT,
    angaben(auftragsLvId),
  );
}

/** Übernahme mit dem Auftragsangebot des Auftrags-LV und dem Bieter `BIETER`. */
function uebernehmen(
  auftrag: ReturnType<typeof auftragsLv>,
  nlv: LvZustand,
  positionen: Parameters<typeof angebot>[3],
): Nachtragsergebnis {
  const an = angebot('nachtragsangebot', nlv, BIETER, positionen);
  const aa = { id: auftrag.auftragsLeistungsverzeichnis.angebotId, bieterId: BIETER as BieterId };
  return erwarteOk(nachtragUebernehmen(auftrag, nlv, an, aa, ids));
}

const knotenNach = (e: Nachtragsergebnis, id: string): Knoten | undefined =>
  e.befehl.knoten.find((k) => k.id === id);

describe('nachtragUebernehmen: Titel-Fall mit Alternativen, Zuschlagsposition und Hinweistext', () => {
  const auftrag = auftragsLv('auftrag', [
    titel('t1', 'auftrag', 0, '01'),
    position('a1', 't1', 0, '01.0010', '1.000', '10.000'),
  ]);
  const nlv = nachtragsLv('auftrag', [
    hinweis('h0', 'nlv', 0),
    position('pa', 'nlv', 1, '0010', '2.000'),
    titel('nt', 'nlv', 2, '01'),
    position('p1', 'nt', 0, '01.0010', '3.000', '99.000'),
    position('p2', 'nt', 1, '01.0020', '4.000'),
    position('pAlt', 'nt', 2, '01.0030', '4.000', null, {
      wahl: { gruppe: null, variante: null, grundpositionId: 'p2' as PositionId },
    }),
    zuschlagsposition('z', 'nt', 3, '01.0040', ['p1', 'pAlt'], '5.00'),
    position('p3', 'nt', 4, '01.0050', '1.000'),
  ]);
  const ergebnis = uebernehmen(auftrag, nlv, [
    ep('pa', '1.500'),
    ep('p1', '12.000'),
    ep('p2', '3.250'),
    ep('pAlt', '3.000'),
    satz('z', '7.50'),
    nichtAngeboten('p3'),
  ]);

  it('die neue Gliederung ist ein Titel „Nachtrag N07“ am Ende der obersten Ebene mit der nächsten freien OZ', () => {
    expect(ergebnis.befehl.knoten[0]).toEqual({
      art: 'titel',
      id: 'neu',
      elternId: 'auftrag',
      reihenfolge: 1,
      ordnungszahl: '02',
      kurztext: 'Nachtrag N07',
    });
  });

  it('der Baum hängt unter ihr, Alternativen entfallen, Reihenfolge dicht, OZ mit „02.“ davor', () => {
    const lage = ergebnis.befehl.knoten.map((k) => [
      k.id,
      k.elternId,
      k.reihenfolge,
      k.art === 'hinweis' ? null : k.ordnungszahl,
    ]);
    expect(lage).toEqual([
      ['neu', 'auftrag', 1, '02'],
      ['h0', 'neu', 0, null],
      ['pa', 'neu', 1, '02.0010'],
      ['nt', 'neu', 2, '02.01'],
      ['p1', 'nt', 0, '02.01.0010'],
      ['p2', 'nt', 1, '02.01.0020'],
      ['z', 'nt', 2, '02.01.0040'],
      ['p3', 'nt', 3, '02.01.0050'],
    ]);
  });

  it('Preise des Angebots: EP ersetzt den Schätzpreis, Zuschlagssatz des Angebots, nicht angeboten ohne EP', () => {
    expect(knotenNach(ergebnis, 'p1')).toMatchObject({ einheitspreis: '12.000', menge: '3.000' });
    expect(knotenNach(ergebnis, 'z')).toMatchObject({
      einheitspreis: null,
      zuschlag: {
        prozentsatz: '7.50',
        bezug: { art: 'positionen', positionen: [{ positionId: 'p1', teilmenge: null }] },
      },
    });
    expect(knotenNach(ergebnis, 'p3')).toMatchObject({ einheitspreis: null });
  });

  it('Warnungen: Alternativen zuerst, dann je Knoten in Dokumentreihenfolge', () => {
    expect(ergebnis.warnungen).toEqual([
      { code: 'alternativen-entfallen', anzahl: 1, positionIds: ['pAlt'] },
      { code: 'bezug-entfernt', positionId: 'z', feld: 'zuschlag.bezug.positionen', zielId: 'pAlt' },
      { code: 'nicht-angeboten', positionId: 'p3' },
    ]);
  });

  it('der Kern nimmt den Baum an (Baumregeln)', () => {
    const a = auftrag.auftragsLeistungsverzeichnis;
    expect(baumfehler(a.id, [...a.knoten, ...ergebnis.befehl.knoten])).toEqual([]);
  });

  it('eine Zuschlagsposition ohne Satz im Angebot: Satz null mit Warnung', () => {
    const e = uebernehmen(auftrag, nlv, [
      ep('pa', '1.500'),
      ep('p1', '12.000'),
      ep('p2', '3.250'),
      ep('z', '0.000'),
      ep('p3', '1.000'),
    ]);
    expect(knotenNach(e, 'z')).toMatchObject({ zuschlag: { prozentsatz: null } });
    expect(e.warnungen).toContainEqual({ code: 'zuschlagssatz-fehlt', positionId: 'z' });
  });

  it('ein Verweis auf eine Grundposition, die nicht mitkommt, wird entfernt', () => {
    const mitVerweis = nachtragsLv('auftrag', [
      position('g', 'nlv', 0, '0010', '1.000', null, {
        wahl: { gruppe: 1, variante: 0, grundpositionId: null },
      }),
      position('alt', 'nlv', 1, '0020', '1.000', null, {
        wahl: { gruppe: 1, variante: 1, grundpositionId: null },
      }),
      position('x', 'nlv', 2, '0030', '1.000', null, {
        wahl: { gruppe: 2, variante: 0, grundpositionId: 'alt' as PositionId },
      }),
    ]);
    const e = uebernehmen(auftrag, mitVerweis, [ep('g', '1.000'), ep('alt', '1.000'), ep('x', '1.000')]);
    expect(e.befehl.knoten.map((k) => k.id)).toEqual(['neu', 'g', 'x']);
    expect((knotenNach(e, 'g') as Position).merkmale.wahl).toEqual({
      gruppe: 1,
      variante: 0,
      grundpositionId: null,
    });
    expect(e.warnungen).toEqual([
      { code: 'alternativen-entfallen', anzahl: 1, positionIds: ['alt'] },
      { code: 'bezug-entfernt', positionId: 'x', feld: 'merkmale.wahl.grundpositionId', zielId: 'alt' },
    ]);
  });
});

describe('nachtragUebernehmen: Lose (F1, D-80.2)', () => {
  const MASKE_LOS: OzMaske = { ...MASKE, losStufe: true };

  it('stehen oben Lose, wird die neue Gliederung ein Los; ein Los des Nachtrags-LV wird Titel derselben Kennung', () => {
    const auftrag = auftragsLv(
      'auftrag',
      [
        los('l1', 'auftrag', 0, '01'),
        titel('t1', 'l1', 0, '01.01'),
        position('a1', 't1', 0, '01.01.0010', '1.000', '1.000'),
      ],
      { maske: MASKE_LOS },
    );
    const nlv = nachtragsLv(
      'auftrag',
      [los('nl', 'nlv', 0, '01'), position('np', 'nl', 0, '01.0010', '1.000')],
      MASKE_LOS,
    );
    const e = uebernehmen(auftrag, nlv, [ep('np', '2.000')]);
    expect(e.befehl.knoten).toEqual([
      {
        art: 'los',
        id: 'neu',
        elternId: 'auftrag',
        reihenfolge: 1,
        ordnungszahl: '02',
        kurztext: 'Nachtrag N07',
      },
      { art: 'titel', id: 'nl', elternId: 'neu', reihenfolge: 0, ordnungszahl: '02.01', kurztext: 'Los nl' },
      expect.objectContaining({
        id: 'np',
        elternId: 'nl',
        ordnungszahl: '02.01.0010',
        einheitspreis: '2.000',
      }),
    ]);
    expect(e.warnungen).toEqual([{ code: 'los-wird-titel', knotenId: 'nl' }]);
    const a = auftrag.auftragsLeistungsverzeichnis;
    expect(baumfehler(a.id, [...a.knoten, ...e.befehl.knoten])).toEqual([]);
  });

  it('hat die Maske eine Los-Stufe, wird die neue Gliederung ein Los, auch wenn oben noch nichts steht', () => {
    const auftrag = auftragsLv('auftrag', [], { maske: MASKE_LOS });
    const nlv = nachtragsLv('auftrag', [position('np', 'nlv', 0, '0010', '1.000')]);
    const e = uebernehmen(auftrag, nlv, [ep('np', '2.000')]);
    expect(e.befehl.knoten[0]).toMatchObject({ art: 'los', reihenfolge: 0, ordnungszahl: '01' });
  });
});

describe('nachtragUebernehmen: OZ außerhalb der Maske (D-80.1, U5)', () => {
  it('fehlende oder unpassende OZ kommen wie berechnet und stehen in einer Warnung', () => {
    const auftrag = auftragsLv('auftrag', [titel('t1', 'auftrag', 0, '01')]);
    const nlv = nachtragsLv('auftrag', [
      titel('nt', 'nlv', 0, '01'),
      titel('nu', 'nt', 0, '01.01'),
      position('tief', 'nu', 0, '01.01.0010', '1.000'),
      position('ohne', 'nt', 1, null, '1.000'),
      position('kurz', 'nt', 2, '01.010', '1.000'),
      position('gut', 'nt', 3, '01.0030', '1.000'),
    ]);
    const e = uebernehmen(auftrag, nlv, [
      ep('tief', '1.000'),
      ep('ohne', '1.000'),
      ep('kurz', '1.000'),
      ep('gut', '1.000'),
    ]);
    expect(knotenNach(e, 'tief')).toMatchObject({ ordnungszahl: '02.01.01.0010' });
    expect(knotenNach(e, 'ohne')).toMatchObject({ ordnungszahl: null });
    expect(knotenNach(e, 'kurz')).toMatchObject({ ordnungszahl: '02.01.010' });
    expect(e.warnungen).toEqual([{ code: 'oz-unpassend', knotenIds: ['nu', 'tief', 'ohne', 'kurz'] }]);
  });

  it('ohne freie OZ der obersten Stufe bleibt die neue Gliederung samt Baum ohne OZ', () => {
    const eng: OzMaske = { ...MASKE, gliederung: [{ laenge: 1, zeichen: 'numerisch' }] };
    const voll = Array.from({ length: 9 }, (_, i) => titel(`t${String(i + 1)}`, 'auftrag', i, String(i + 1)));
    const auftrag = auftragsLv('auftrag', voll, { maske: eng });
    const nlv = nachtragsLv('auftrag', [position('np', 'nlv', 0, '0010', '1.000')], eng);
    const e = uebernehmen(auftrag, nlv, [ep('np', '1.000')]);
    expect(e.befehl.knoten.map((k) => (k.art === 'hinweis' ? undefined : k.ordnungszahl))).toEqual([
      null,
      null,
    ]);
    expect(e.warnungen).toEqual([{ code: 'oz-unpassend', knotenIds: ['neu', 'np'] }]);
  });
});

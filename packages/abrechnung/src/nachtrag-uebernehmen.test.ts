// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests `nachtragUebernehmen` (Ticket 80, D-35): Auftrags-LV aus `typisch` mit dem Angebot von Bieter B, Nachtrag N01
// aus der M4-Fixture (Ticket 85, D-85.2). Sollwerte stammen aus der Fixture (unabhängig hergeleitet), nicht aus dem Code.

import { baumfehler, summenBerechnen } from '@tethys/kern';
import type {
  Angebot,
  AngebotId,
  AngebotKopf,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Befehlsfehler,
  BieterId,
  LeistungsverzeichnisId,
  Leistungsverzeichnis,
  LosId,
  LvZustand,
  ProjektId,
  Prozent,
  TitelId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { nachtragUebernehmen } from './nachtrag-uebernehmen';
import {
  MASKE_5,
  PROJEKT,
  abrechnungsFixture,
  angebot,
  auftragsLv,
  auftragsLvZustand,
  ep,
  erwarteFehler,
  erwarteOk,
  fxKnoten,
  lvZustand,
  m4AuftragsLv,
  m4Nachtrag,
  nichtAngeboten,
  position,
  titel,
} from './testhilfen';

const NEUE_GLIEDERUNG = '019b7708-6ec7-707f-80f3-72005df5fcdc';
const ids = { los: () => NEUE_GLIEDERUNG as LosId, titel: () => NEUE_GLIEDERUNG as TitelId };

describe('nachtragUebernehmen: Tor M4 (typisch, Bieter B, Nachtrag N01)', () => {
  const fx = abrechnungsFixture();
  const auftrag = m4AuftragsLv();
  const nachtrag = m4Nachtrag();
  const auftragsangebot = {
    id: auftrag.auftragsLeistungsverzeichnis.angebotId,
    bieterId: nachtrag.angebot.bieterId,
  };

  it('das Auftrags-LV der Hilfe hat die Summen der Fixture (D-21, Bieter B)', () => {
    expect(auftrag.summen.gesamt).toMatchObject(fx.zuschlag.sollwerte.summen);
  });

  it('liefert die Knoten der Fixture: Titel „Nachtrag N01“ mit OZ 04 am Ende, Baum mit 04. davor, EP aus dem Angebot', () => {
    const { befehl, warnungen } = erwarteOk(
      nachtragUebernehmen(auftrag, nachtrag.lv, nachtrag.angebot, auftragsangebot, ids),
    );
    const erwartet = fxKnoten(
      fx.nachtrag.uebernahme.knoten,
      new Map([[NEUE_GLIEDERUNG, Number(fx.nachtrag.uebernahme.gliederungReihenfolge)]]),
    );
    expect(befehl).toEqual({
      art: 'NachtragUebernehmen',
      nachtragLvId: fx.nachtrag.uebernahme.nachtragLvId,
      knoten: erwartet,
    });
    expect(warnungen).toEqual([]);
  });

  it('eine nicht angebotene Position kommt mit EP null und Warnung; die Summe zählt nur die angebotene (D-35, wie D-21)', () => {
    const [p1, p2] = nachtrag.angebot.positionen;
    if (p1 === undefined || p2 === undefined) throw new Error('Angebot ohne zwei Positionen');
    const teilweise = { ...nachtrag.angebot, positionen: [p1, nichtAngeboten(p2.positionId)] };
    const { befehl, warnungen } = erwarteOk(
      nachtragUebernehmen(auftrag, nachtrag.lv, teilweise, auftragsangebot, ids),
    );
    const zweite = befehl.knoten.find((k) => k.id === p2.positionId);
    expect(zweite).toMatchObject({
      art: 'position',
      ordnungszahl: '04.01.0020',
      einheitspreis: null,
      menge: '6.000',
    });
    expect(warnungen).toEqual([{ code: 'nicht-angeboten', positionId: p2.positionId }]);
    // Ohne den Eintrag im Angebot ebenso.
    const ohneEintrag = { ...nachtrag.angebot, positionen: [p1] };
    expect(
      erwarteOk(nachtragUebernehmen(auftrag, nachtrag.lv, ohneEintrag, auftragsangebot, ids)).warnungen,
    ).toEqual([{ code: 'nicht-angeboten', positionId: p2.positionId }]);
    // Summe: 58.358,53 + 922,49 = 59.281,02 netto (Handrechnung aus den Sollwerten der Fixture).
    const a = auftrag.auftragsLeistungsverzeichnis;
    const s = summenBerechnen({
      id: a.id,
      knoten: [...a.knoten, ...befehl.knoten],
      nachlass: a.nachlass,
      mwstSatz: a.mwstSatz,
    });
    expect(s.gesamt.netto).toBe('59281.02');
  });

  it('der Nachlass des Nachtragsangebots wird mit Warnung ignoriert (D-35)', () => {
    const mitNachlass = {
      ...nachtrag.angebot,
      nachlass: { art: 'prozent', wert: '5.00' as Prozent } as const,
    };
    const { befehl, warnungen } = erwarteOk(
      nachtragUebernehmen(auftrag, nachtrag.lv, mitNachlass, auftragsangebot, ids),
    );
    expect(warnungen).toEqual([{ code: 'nachlass-ignoriert', nachlass: mitNachlass.nachlass }]);
    expect(befehl).toEqual(
      erwarteOk(nachtragUebernehmen(auftrag, nachtrag.lv, nachtrag.angebot, auftragsangebot, ids)).befehl,
    );
  });

  it('der Baum danach erfüllt die Baumregeln des Kerns und hat die Summen der Fixture', () => {
    const { befehl } = erwarteOk(
      nachtragUebernehmen(auftrag, nachtrag.lv, nachtrag.angebot, auftragsangebot, ids),
    );
    const a = auftrag.auftragsLeistungsverzeichnis;
    const knoten = [...a.knoten, ...befehl.knoten];
    expect(baumfehler(a.id, knoten)).toEqual([]);
    const summen = summenBerechnen({ id: a.id, knoten, nachlass: a.nachlass, mwstSatz: a.mwstSatz });
    expect(summen.gesamt).toMatchObject(fx.nachtrag.sollwerte.summen);
    for (const [id, { summe }] of Object.entries(fx.nachtrag.sollwerte.titel))
      expect(summen.gliederungen.find((g) => g.gliederungId === id)?.summe).toBe(summe);
  });
});

describe('nachtragUebernehmen: Fehler (D-35, D-42)', () => {
  const auftrag = m4AuftragsLv();
  const nachtrag = m4Nachtrag();
  const auftragsangebot = {
    id: auftrag.auftragsLeistungsverzeichnis.angebotId,
    bieterId: nachtrag.angebot.bieterId,
  };
  let gerufen = 0;
  const zaehlendeIds = {
    los: () => {
      gerufen++;
      return NEUE_GLIEDERUNG as LosId;
    },
    titel: () => {
      gerufen++;
      return NEUE_GLIEDERUNG as TitelId;
    },
  };
  const mitKopf = (aenderung: Partial<Leistungsverzeichnis>): LvZustand => ({
    ...nachtrag.lv,
    leistungsverzeichnis: { ...nachtrag.lv.leistungsverzeichnis, ...aenderung },
  });
  /** Der Fehler; die `IdQuelle` wird dabei nie gerufen. */
  const fehlerVon = (
    nlv: LvZustand = nachtrag.lv,
    an: Angebot = nachtrag.angebot,
    aa: Pick<AngebotKopf, 'id' | 'bieterId'> = auftragsangebot,
    al: AuftragsLvZustand = auftrag,
  ): Befehlsfehler => {
    gerufen = 0;
    const f = erwarteFehler(nachtragUebernehmen(al, nlv, an, aa, zaehlendeIds));
    expect(gerufen).toBe(0);
    return f;
  };

  it('ein LV ohne Nachtragsangaben', () => {
    const ohne: Leistungsverzeichnis = { ...nachtrag.lv.leistungsverzeichnis };
    delete (ohne as { nachtrag?: unknown }).nachtrag;
    expect(fehlerVon({ ...nachtrag.lv, leistungsverzeichnis: ohne })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'nachtragsLv.nachtrag',
    });
  });

  it('Nachtragsangaben zu einem anderen Auftrags-LV', () => {
    const n = nachtrag.lv.leistungsverzeichnis.nachtrag;
    if (n === undefined) throw new Error('Nachtragsangaben fehlen');
    const fremd = mitKopf({ nachtrag: { ...n, auftragsLvId: 'anderes' as AuftragsLeistungsverzeichnisId } });
    expect(fehlerVon(fremd)).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'nachtragsLv.nachtrag.auftragsLvId',
    });
  });

  it('ein Nachtrags-LV aus einem anderen Projekt', () => {
    expect(fehlerVon(mitKopf({ projektId: 'anderes' as ProjektId }))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'nachtragsLv.projektId',
    });
  });

  it('ein Angebot, das nicht zum Nachtrags-LV gehört', () => {
    const fremd = { ...nachtrag.angebot, leistungsverzeichnisId: 'anderes' as LeistungsverzeichnisId };
    expect(fehlerVon(nachtrag.lv, fremd)).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'angebot.leistungsverzeichnisId',
    });
  });

  it('ein Angebot, das nicht vom Bieter des Auftrags ist', () => {
    const fremd = { ...nachtrag.angebot, bieterId: '019b76f9-2c80-737e-8c4e-d0e9e835d68a' as BieterId };
    expect(fehlerVon(nachtrag.lv, fremd)).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'angebot.bieterId',
    });
  });

  it('ein Auftragsangebot, das nicht das beauftragte Angebot des Auftrags-LV ist', () => {
    const fremd = { ...auftragsangebot, id: 'anderes' as AngebotId };
    expect(fehlerVon(nachtrag.lv, nachtrag.angebot, fremd)).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'auftragsangebot.id',
    });
  });

  it('ein anderer MwSt-Satz als im Auftrags-LV', () => {
    expect(fehlerVon(mitKopf({ mwstSatz: '7.00' as Prozent }))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'nachtragsLv.mwstSatz',
    });
  });

  it('eine zweite Übernahme desselben Nachtrags: Kennung schon im Auftrags-LV', () => {
    const { befehl } = erwarteOk(
      nachtragUebernehmen(auftrag, nachtrag.lv, nachtrag.angebot, auftragsangebot, ids),
    );
    const a = auftrag.auftragsLeistungsverzeichnis;
    const danach = auftragsLvZustand({ ...a, knoten: [...a.knoten, ...befehl.knoten] });
    const [, ersterNachtragsknoten] = befehl.knoten;
    expect(fehlerVon(nachtrag.lv, nachtrag.angebot, auftragsangebot, danach)).toMatchObject({
      code: 'id-vergeben',
      knotenId: ersterNachtragsknoten?.id,
    });
  });

  it('eine Position mit einer Kennung, die das Auftrags-LV schon hat', () => {
    const [vorhanden] = auftrag.auftragsLeistungsverzeichnis.knoten.filter((k) => k.art === 'position');
    if (vorhanden === undefined) throw new Error('Auftrags-LV ohne Position');
    const n = nachtrag.lv.leistungsverzeichnis;
    const doppelt = n.knoten.map((k) =>
      k.art === 'position' && k.reihenfolge === 1 ? { ...k, id: vorhanden.id } : k,
    );
    expect(fehlerVon(mitKopf({ knoten: doppelt }))).toMatchObject({
      code: 'id-vergeben',
      knotenId: vorhanden.id,
    });
  });

  it('mehr als 5 Gliederungsebenen samt der neuen Gliederung', () => {
    const al = auftragsLv(
      'auftrag-tief',
      [titel('t1', 'auftrag-tief', 0, '01'), position('p1', 't1', 0, '01.0010', '1.000', '1.000')],
      { maske: MASKE_5 },
    );
    const tief = [
      titel('n1', 'nlv', 0, '01'),
      titel('n2', 'n1', 0, '01.01'),
      titel('n3', 'n2', 0, '01.01.01'),
      titel('n4', 'n3', 0, '01.01.01.01'),
      titel('n5', 'n4', 0, '01.01.01.01.01'),
      position('np', 'n5', 0, '01.01.01.01.01.0010', '1.000'),
    ];
    const angaben = {
      auftragsLvId: 'auftrag-tief' as AuftragsLeistungsverzeichnisId,
      nummer: 'N01',
      status: 'angeboten' as const,
    };
    const kopf = { name: 'N', ozMaske: MASKE_5, mwstSatz: '19.00' as Prozent, nachlass: null };
    const nlv = lvZustand('nlv', { ...kopf, knoten: tief }, PROJEKT, angaben);
    const an = angebot('na', nlv, 'bieter', [ep('np', '2.000')]);
    const aa = { id: al.auftragsLeistungsverzeichnis.angebotId, bieterId: 'bieter' as BieterId };
    expect(fehlerVon(nlv, an, aa, al)).toMatchObject({ code: 'ebene-ueberschritten', knotenId: 'n5' });
    // Mit vier Ebenen im Nachtrags-LV geht es (fünf samt der neuen).
    const vierEbenen = [...tief.slice(0, 4), position('np', 'n4', 0, '01.01.01.01.0010', '1.000')];
    const vier = lvZustand('nlv', { ...kopf, knoten: vierEbenen }, PROJEKT, angaben);
    const { befehl } = erwarteOk(nachtragUebernehmen(al, vier, an, aa, ids));
    const a = al.auftragsLeistungsverzeichnis;
    expect(baumfehler(a.id, [...a.knoten, ...befehl.knoten])).toEqual([]);
  });
});

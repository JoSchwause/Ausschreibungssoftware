// SPDX-License-Identifier: AGPL-3.0-or-later
// `aufmassPruefen` und `naechsteAufmassnummer` (Ticket 80, D-70.3, U5): der Bezug eines Aufmaßblatts zum Auftrags-LV als
// Befund, nie als Sperre. Grundlage ist das Tor M4 (Auftrags-LV aus `typisch` mit Nachtrag N01, Blätter 1 und 2).

import type {
  AufmassKopf,
  AuftragsLeistungsverzeichnisId,
  Aufmassposition,
  LosId,
  Menge,
  PositionId,
  TitelId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { aufmassPruefen, naechsteAufmassnummer } from './aufmass-pruefen';
import { nachtragUebernehmen } from './nachtrag-uebernehmen';
import {
  abrechnungsFixture,
  imKernUebernehmen,
  erwarteOk,
  fxAufmass,
  m4AuftragsLv,
  m4Nachtrag,
} from './testhilfen';

const ids = { los: () => 'neu' as LosId, titel: () => 'neu' as TitelId };

/** Das Auftrags-LV des Tors M4 nach der Übernahme von N01. */
function m4MitNachtrag(): ReturnType<typeof m4AuftragsLv> {
  const auftrag = m4AuftragsLv();
  const n = m4Nachtrag();
  const a = auftrag.auftragsLeistungsverzeichnis;
  const { befehl } = erwarteOk(
    nachtragUebernehmen(auftrag, n.lv, n.angebot, { id: a.angebotId, bieterId: n.angebot.bieterId }, ids),
  );
  return imKernUebernehmen(auftrag, befehl).danach;
}

const zeile = (positionId: string, menge: string | null): Aufmassposition => ({
  positionId: positionId as PositionId,
  mengenansatz: null,
  menge: menge as Menge | null,
});

describe('aufmassPruefen', () => {
  const fx = abrechnungsFixture();
  const auftrag = m4MitNachtrag();
  const blaetter = fx.aufmasse.map((b) => fxAufmass(b.aufmass));
  const [blatt1] = blaetter;
  if (blatt1 === undefined) throw new Error('Fixture ohne Aufmaßblatt');

  it('die Blätter des Tors M4 haben keinen Befund (auch die Nachtragsposition nicht)', () => {
    for (const b of blaetter) expect(aufmassPruefen(b, auftrag)).toEqual([]);
  });

  it('je Zeile: unbekannte Position, keine Position, Zuschlagsposition, ohne EP, ohne Menge', () => {
    const knoten = auftrag.auftragsLeistungsverzeichnis.knoten;
    const gliederung = knoten.find((k) => k.art === 'titel');
    const zuschlag = knoten.find((k) => k.art === 'position' && k.zuschlag !== null);
    const ohneEp = knoten.find(
      (k) => k.art === 'position' && k.zuschlag === null && k.einheitspreis === null,
    );
    const normal = knoten.find(
      (k) => k.art === 'position' && k.zuschlag === null && k.einheitspreis !== null,
    );
    if (!gliederung || !zuschlag || !ohneEp || !normal) throw new Error('M4-Auftrags-LV unvollständig');
    const blatt = {
      ...blatt1,
      positionen: [
        zeile('unbekannt', '1.000'),
        zeile(gliederung.id, '1.000'),
        zeile(zuschlag.id, '1.000'),
        zeile(ohneEp.id, null),
        zeile(normal.id, null),
      ],
    };
    expect(aufmassPruefen(blatt, auftrag)).toEqual([
      { code: 'position-unbekannt', positionId: 'unbekannt' },
      { code: 'keine-position', positionId: gliederung.id },
      { code: 'zuschlagsposition', positionId: zuschlag.id },
      { code: 'ohne-einheitspreis', positionId: ohneEp.id },
      { code: 'menge-fehlt', positionId: ohneEp.id },
      { code: 'menge-fehlt', positionId: normal.id },
    ]);
  });

  it('ein Blatt eines anderen Auftrags-LV: ein Befund vorweg', () => {
    const fremd = { ...blatt1, auftragsLvId: 'anderes' as AuftragsLeistungsverzeichnisId };
    expect(aufmassPruefen(fremd, auftrag)[0]).toEqual({
      code: 'auftrags-lv-abweichend',
      auftragsLvId: 'anderes',
    });
  });
});

describe('naechsteAufmassnummer', () => {
  const kopf = (nummer: number): Pick<AufmassKopf, 'nummer'> => ({ nummer });

  it('1 ohne Blatt, sonst die höchste vorhandene + 1 (Lücken bleiben)', () => {
    expect(naechsteAufmassnummer([])).toBe(1);
    expect(naechsteAufmassnummer([kopf(1), kopf(2)])).toBe(3);
    expect(naechsteAufmassnummer([kopf(5), kopf(2)])).toBe(6);
  });
});

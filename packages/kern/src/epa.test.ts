// SPDX-License-Identifier: AGPL-3.0-or-later
// Einheitspreisanteile (K7, Ticket 37). Golden: BVBS 3.3 AVA X86
// (fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X86), 1.10.30.20 (ID CBNEBKMI): Menge 100,000,
// UP 27,910 = UPComp1 2,230 + UPComp2 23,120 + UPComp3 2,560 + UPComp4 0,000, IT 2.791,00.

import { describe, expect, it } from 'vitest';
import type {
  Einheitspreis,
  Einheitspreisanteile,
  EinheitspreisanteileSetzen,
  LeistungsverzeichnisId,
  LvZustand,
} from '@tethys/vertrag';
import {
  EPA_ANNAHMEN,
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  epaSummen,
  lvBefehlAusfuehren,
  summenBerechnen,
} from './index';
import {
  KEINE_SUMMEN,
  LV_ID,
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  id,
  lvMit,
  merkmale,
  posKnoten,
  titelKnoten,
  wende,
  zuschlagAuf,
} from './testhilfen';

const ep = (s: string | null) => s as Einheitspreis | null;
const anteile = (lohn: string | null, stoffe: string | null, geraete: string | null, nu: string | null) =>
  ({
    lohn: ep(lohn),
    stoffe: ep(stoffe),
    geraete: ep(geraete),
    nachunternehmer: ep(nu),
    sonstiges: null,
    frei: null,
    freiBezeichnung: null,
  }) as Einheitspreisanteile;
const X86_1_10_30_20 = anteile('2.230', '23.120', '2.560', '0.000');

const setzen = (positionId: string, epa: Einheitspreisanteile | null): EinheitspreisanteileSetzen => ({
  art: 'EinheitspreisanteileSetzen',
  positionId: id.pos(positionId),
  epa,
});

function basis(): LvZustand {
  return lvMit([
    titelKnoten('T1.10', LV_ID, 0),
    titelKnoten('T1.10.30', 'T1.10', 0),
    posKnoten('CBNEBKMI', 'T1.10.30', 0, '100.000', '20.000'),
    posKnoten('Z', 'T1.10.30', 1, null, null, { zuschlag: zuschlagAuf('gliederung', '10.00') }),
  ]);
}

describe('EinheitspreisanteileSetzen', () => {
  it('ist zuständig; ZUSTAENDIGES_TICKET nennt den Befehl nicht mehr', () => {
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('EinheitspreisanteileSetzen');
    expect(EPA_ANNAHMEN.status).toMatch(/D-37\.3/);
  });

  it('EP folgt den Anteilen (27,910 = 2,230 + 23,120 + 2,560 + 0,000); GP, Zuschlag und Summen ziehen im selben ChangeSet nach', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('CBNEBKMI', X86_1_10_30_20)));
    expect(cs.knoten.geaendert[0]?.nachher).toMatchObject({ einheitspreis: '27.910', epa: X86_1_10_30_20 });
    expect(cs.summen.positionen.map((p) => [p.positionId, p.gesamtpreis])).toEqual([
      ['CBNEBKMI', '2791.00'],
      ['Z', '279.10'],
    ]);
    expect(cs.summen.gesamt?.netto).toBe('3070.10');
    const neu = anwenden(z, cs);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('BVBS X86 1.10.30.10: 30,000 = 5,120 + 4,880 + 0,000 + 20,000', () => {
    const z = lvMit([posKnoten('CBNEBEFA', LV_ID, 0, '1.000', null)]);
    const neu = wende(z, setzen('CBNEBEFA', anteile('5.120', '4.880', '0.000', '20.000')));
    expect(neu.leistungsverzeichnis.knoten[0]).toMatchObject({ einheitspreis: '30.000' });
  });

  it('epa: null entfernt nur die Anteile, der EP bleibt; derselbe Wert ergibt ein leeres ChangeSet', () => {
    const z = wende(basis(), setzen('CBNEBKMI', X86_1_10_30_20));
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('CBNEBKMI', null)));
    expect(cs.knoten.geaendert[0]?.nachher).toMatchObject({ einheitspreis: '27.910', epa: null });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    const gleich = erwarteOk(lvBefehlAusfuehren(z, setzen('CBNEBKMI', { ...X86_1_10_30_20 })));
    expect(gleich.knoten.geaendert).toEqual([]);
    expect(anwenden(z, gleich)).toBe(z);
  });

  it('Anteile ganz ohne Wert lassen den EP stehen', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('CBNEBKMI', anteile(null, null, null, null))));
    expect(cs.knoten.geaendert[0]?.nachher).toMatchObject({ einheitspreis: '20.000' });
  });

  it('EinheitspreisAendern lässt die Anteile stehen (die Abweichung meldet K8)', () => {
    const z = wende(basis(), setzen('CBNEBKMI', X86_1_10_30_20));
    const neu = wende(z, {
      art: 'EinheitspreisAendern',
      positionId: id.pos('CBNEBKMI'),
      einheitspreis: ep('30.000'),
    });
    expect(neu.leistungsverzeichnis.knoten.find((k) => k.id === 'CBNEBKMI')).toMatchObject({
      einheitspreis: '30.000',
      epa: X86_1_10_30_20,
    });
  });

  it('Anteile an einer Zuschlagsposition mit Satz: knotenart-unzulaessig; Form der Anteile: ungueltige-eingabe mit feld', () => {
    const z = basis();
    const e = lvBefehlAusfuehren(z, setzen('Z', X86_1_10_30_20));
    expect(e.ok ? null : e.fehler.code).toBe('knotenart-unzulaessig');
    expect(lvBefehlAusfuehren(z, setzen('Z', null)).ok).toBe(true);
    const f = lvBefehlAusfuehren(z, setzen('CBNEBKMI', anteile('2.23', null, null, null)));
    expect(f.ok ? null : [f.fehler.code, f.fehler.feld]).toEqual(['ungueltige-eingabe', 'epa.lohn']);
    const t = lvBefehlAusfuehren(z, setzen('T1.10', null));
    expect(t.ok ? null : t.fehler.code).toBe('knotenart-unzulaessig');
  });

  it('die Altform einer Zuschlagsposition (ohne Satz) darf Anteile tragen', () => {
    const z = lvMit([
      posKnoten('A', LV_ID, 0, '2.000', '5.000', { zuschlag: zuschlagAuf('gliederung', null) }),
    ]);
    const neu = wende(z, setzen('A', anteile('1.000', '2.000', null, null)));
    expect(neu.summen.gesamt.netto).toBe('6.00');
  });
});

describe('epaSummen', () => {
  it('Golden 1.10.30.20: Menge 100,000 → 223,00 / 2.312,00 / 256,00 / 0,00, zusammen 2.791,00 = GP', () => {
    const z = wende(basis(), setzen('CBNEBKMI', X86_1_10_30_20));
    const s = epaSummen(z.leistungsverzeichnis);
    const erwartet = {
      lohn: '223.00',
      stoffe: '2312.00',
      geraete: '256.00',
      nachunternehmer: '0.00',
      sonstiges: '0.00',
      frei: '0.00',
    };
    expect(s.gesamt).toEqual(erwartet);
    expect(s.gliederungen.get(id.titel('T1.10.30'))).toEqual(erwartet);
    expect(s.gliederungen.get(id.titel('T1.10'))).toEqual(erwartet);
    expect(z.summen.positionen.find((p) => p.positionId === 'CBNEBKMI')?.gesamtpreis).toBe('2791.00');
  });

  it('nur Positionen, die ins Netto gehen; Gliederungen ohne Anteile stehen mit 0,00 da', () => {
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      titelKnoten('T2', LV_ID, 1),
      posKnoten('N', 'T1', 0, '2.000', '3.000', { epa: anteile('1.000', '2.000', null, null) }),
      posKnoten('B', 'T1', 1, '2.000', '3.000', {
        epa: anteile('1.000', '2.000', null, null),
        merkmale: merkmale({ bedarf: 'ohne-gesamtbetrag' }),
      }),
      posKnoten('W', 'T1', 2, '2.000', '3.000', {
        epa: anteile('1.000', '2.000', null, null),
        merkmale: merkmale({ wahl: { gruppe: 1, variante: 1, grundpositionId: null } }),
      }),
      posKnoten('P', 'T2', 0, null, '3.000', {
        epa: anteile('1.555', '1.445', null, null),
        merkmale: merkmale({ pauschal: true }),
      }),
    ]);
    const s = epaSummen(z.leistungsverzeichnis);
    expect(s.gliederungen.get(id.titel('T1'))).toMatchObject({
      lohn: '2.00',
      stoffe: '4.00',
      geraete: '0.00',
    });
    expect(s.gliederungen.get(id.titel('T2'))).toMatchObject({ lohn: '1.56', stoffe: '1.45' }); // Menge 1 (Pauschal)
    expect(s.gesamt).toMatchObject({ lohn: '3.56', stoffe: '5.45', frei: '0.00' });
  });

  it('Fixture zuschlag.json: gleich den unabhängig berechneten Sollwerten (rechnen.mjs)', () => {
    const fx = fixtureLesen('zuschlag');
    const soll = (
      fx as unknown as {
        sollwerte: { epa: { gesamt: Record<string, string>; titel: Record<string, Record<string, string>> } };
      }
    ).sollwerte.epa;
    const z = wende(null, {
      art: 'LeistungsverzeichnisAnlegen',
      id: fx.id as LeistungsverzeichnisId,
      projektId: PROJEKT_ID,
      inhalt: fixtureAlsInhalt(fx),
    });
    const s = epaSummen(z.leistungsverzeichnis);
    expect(s.gesamt).toEqual(soll.gesamt);
    expect(Object.fromEntries(s.gliederungen)).toEqual(soll.titel);
  });
});

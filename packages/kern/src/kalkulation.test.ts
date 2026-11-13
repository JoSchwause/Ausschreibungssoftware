// SPDX-License-Identifier: AGPL-3.0-or-later
// KalkulationSetzen und Lesart (a) der Preisbefehle (Vertrag v1.7a, D-127.6; Ticket 137): Die Position trägt die Eingaben
// der Einzelpreiskalkulation; EP und EPA bringt der Befehl gerechnet mit (die App rechnet mit `kosten`), der Kern rechnet
// nicht nach (A3). Zuerst geschrieben (Q1).
//
// Beispiel (wie `beispielKalkulationSetzen` im Vertrag, gerechnet nach D-39): Lohn 0,450 h × 48,500 = 21,825 × 1,15 =
// 25,09875 → 25,099; Stoffe 1,000 × 30,000 = 30,000 × 1,10 = 33,000; EP = 58,099; bei Menge 2,000 ist der GP 116,20.

import { describe, expect, it } from 'vitest';
import type {
  Einheitspreis,
  Einheitspreisanteile,
  Kalkulationsangaben,
  KalkulationSetzen,
  LvBefehl,
  LvZustand,
  Menge,
  Position,
  Prozent,
} from '@tethys/vertrag';
import { baumfehler, changeSetUmkehren, kopieBauen, lvBefehlAusfuehren } from './index';
import {
  LV_ID,
  anwenden,
  erwarteOk,
  id,
  lvMit,
  merkmale,
  positionsdaten,
  posKnoten,
  titelKnoten,
  wende,
  zuschlagAuf,
} from './testhilfen';

const ep = (s: string): Einheitspreis => s as Einheitspreis;

const KALKULATION: Kalkulationsangaben = {
  ansaetze: [
    { art: 'lohn', bezeichnung: 'Mauern', ansatzmenge: '0.450' as Menge, kostensatz: ep('48.500') },
    { art: 'stoffe', bezeichnung: 'Stein', ansatzmenge: '1.000' as Menge, kostensatz: ep('30.000') },
  ],
  zuschlagssaetze: { lohn: '15.00' as Prozent, stoffe: '10.00' as Prozent },
};

const EPA: Einheitspreisanteile = {
  lohn: ep('25.099'),
  stoffe: ep('33.000'),
  geraete: null,
  nachunternehmer: null,
  sonstiges: null,
  frei: null,
  freiBezeichnung: null,
};

const setzen = (
  positionId: string,
  kalkulation: Kalkulationsangaben | null,
  einheitspreis: string | null = '58.099',
  epa: Einheitspreisanteile | null = EPA,
): KalkulationSetzen => ({
  art: 'KalkulationSetzen',
  positionId: id.pos(positionId),
  kalkulation,
  einheitspreis: einheitspreis as Einheitspreis | null,
  epa,
});

function basis(): LvZustand {
  return lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000'),
    posKnoten('P2', 'T1', 1, '1.000', '5.000'),
    posKnoten('Z', 'T1', 2, null, null, { zuschlag: zuschlagAuf('gliederung', '5.00') }),
  ]);
}

const position = (z: LvZustand, kennung: string): Position => {
  const k = z.leistungsverzeichnis.knoten.find((n) => n.id === id.pos(kennung));
  if (k?.art !== 'position') throw new Error(`keine Position ${kennung}`);
  return k;
};

const fehler = (z: LvZustand, b: LvBefehl): [string, string | undefined] | null => {
  const e = lvBefehlAusfuehren(z, b);
  return e.ok ? null : [e.fehler.code, e.fehler.feld];
};

describe('KalkulationSetzen', () => {
  it('legt Kalkulation, EP und EPA in einem ChangeSet ab; GP und Summen folgen dem EP', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('P1', KALKULATION)));
    expect(cs.knoten.geaendert).toHaveLength(1);
    const neu = anwenden(z, cs);
    const p = position(neu, 'P1');
    expect(p.kalkulation).toEqual(KALKULATION);
    expect(p.einheitspreis).toBe('58.099');
    expect(p.epa).toEqual(EPA);
    expect(cs.summen.positionen.find((s) => s.positionId === id.pos('P1'))?.gesamtpreis).toBe('116.20');
    expect(cs.summen.gesamt?.netto).not.toBe(z.summen.gesamt.netto);
  });

  it('Undo stellt die Position ohne Kalkulation wieder her', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('P1', KALKULATION)));
    expect(anwenden(anwenden(z, cs), changeSetUmkehren(cs))).toEqual(z);
  });

  it('der Kern rechnet nicht nach: EP und EPA stehen, wie sie kommen', () => {
    const neu = wende(basis(), setzen('P1', KALKULATION, '1.000', null));
    expect(position(neu, 'P1').einheitspreis).toBe('1.000');
    expect(position(neu, 'P1').epa).toBeNull();
  });

  it('null entfernt die Kalkulation (das Feld fehlt danach); EP und EPA werden trotzdem gesetzt', () => {
    const mit = wende(basis(), setzen('P1', KALKULATION));
    const ohne = wende(mit, setzen('P1', null, '12.000', null));
    expect(position(ohne, 'P1')).not.toHaveProperty('kalkulation');
    expect(position(ohne, 'P1').einheitspreis).toBe('12.000');
    expect(position(ohne, 'P1').epa).toBeNull();
  });

  it('eine leere Kalkulation (kein Ansatz, kein Satz) ist keine: das Feld fehlt', () => {
    const neu = wende(basis(), setzen('P1', { ansaetze: [], zuschlagssaetze: {} }));
    expect(position(neu, 'P1')).not.toHaveProperty('kalkulation');
  });

  it('nur Sätze oder nur Zeilen ohne Werte sind eine Kalkulation (der Kern legt ab, was kommt)', () => {
    const nurSatz: Kalkulationsangaben = { ansaetze: [], zuschlagssaetze: { lohn: '0.00' as Prozent } };
    expect(position(wende(basis(), setzen('P1', nurSatz)), 'P1').kalkulation).toEqual(nurSatz);
    const ohneWerte: Kalkulationsangaben = {
      ansaetze: [{ art: 'geraete', bezeichnung: '', ansatzmenge: null, kostensatz: null }],
      zuschlagssaetze: {},
    };
    expect(position(wende(basis(), setzen('P1', ohneWerte)), 'P1').kalkulation).toEqual(ohneWerte);
  });

  it('dieselben Werte: leeres ChangeSet', () => {
    const mit = wende(basis(), setzen('P1', KALKULATION));
    const cs = erwarteOk(lvBefehlAusfuehren(mit, setzen('P1', structuredClone(KALKULATION))));
    expect(cs.knoten.geaendert).toEqual([]);
  });

  it('nur die Felder des Vertrags landen an der Position', () => {
    const mehr = {
      ansaetze: [{ ...KALKULATION.ansaetze[0], extra: 1 }],
      zuschlagssaetze: KALKULATION.zuschlagssaetze,
      extra: 2,
    } as unknown as Kalkulationsangaben;
    const k = position(wende(basis(), setzen('P1', mehr)), 'P1').kalkulation;
    expect(k).toEqual({ ansaetze: [KALKULATION.ansaetze[0]], zuschlagssaetze: KALKULATION.zuschlagssaetze });
  });

  it('Gliederung, Hinweistext oder unbekannte Kennung: knotenart-unzulaessig bzw. knoten-unbekannt', () => {
    const z = basis();
    expect(fehler(z, setzen('T1', KALKULATION))?.[0]).toBe('knotenart-unzulaessig');
    expect(fehler(z, setzen('gibt-es-nicht', KALKULATION))?.[0]).toBe('knoten-unbekannt');
  });

  it('Zuschlagsposition mit Satz: knotenart-unzulaessig (sie hat keinen EP, D-137.4); null bleibt erlaubt', () => {
    const z = basis();
    expect(fehler(z, setzen('Z', KALKULATION, null, null))?.[0]).toBe('knotenart-unzulaessig');
    expect(fehler(z, setzen('Z', null, null, EPA))?.[0]).toBe('knotenart-unzulaessig');
    expect(fehler(z, setzen('Z', null, null, null))).toBeNull();
  });

  it('Form: ungueltige-eingabe mit dem Feld', () => {
    const z = basis();
    const ansatz = KALKULATION.ansaetze[0];
    const mit = (k: unknown): KalkulationSetzen => setzen('P1', k as Kalkulationsangaben);
    const faelle: [KalkulationSetzen, string][] = [
      [mit('x'), 'kalkulation'],
      [mit({ ansaetze: {}, zuschlagssaetze: {} }), 'kalkulation.ansaetze'],
      [mit({ ansaetze: [], zuschlagssaetze: [] }), 'kalkulation.zuschlagssaetze'],
      [mit({ ...KALKULATION, ansaetze: ['x'] }), 'kalkulation.ansaetze'],
      [mit({ ...KALKULATION, ansaetze: [{ ...ansatz, art: 'zulage' }] }), 'kalkulation.ansaetze.art'],
      [
        mit({ ...KALKULATION, ansaetze: [{ ...ansatz, bezeichnung: null }] }),
        'kalkulation.ansaetze.bezeichnung',
      ],
      [
        mit({ ...KALKULATION, ansaetze: [{ ...ansatz, ansatzmenge: '0.45' }] }),
        'kalkulation.ansaetze.ansatzmenge',
      ],
      [
        mit({ ...KALKULATION, ansaetze: [{ ...ansatz, kostensatz: 48.5 }] }),
        'kalkulation.ansaetze.kostensatz',
      ],
      [mit({ ...KALKULATION, zuschlagssaetze: { lohn: '15' } }), 'kalkulation.zuschlagssaetze.lohn'],
      [mit({ ...KALKULATION, zuschlagssaetze: { wagnis: '5.00' } }), 'kalkulation.zuschlagssaetze.wagnis'],
      [setzen('P1', KALKULATION, '58.1'), 'einheitspreis'],
      [setzen('P1', KALKULATION, '58.099', { ...EPA, lohn: ep('25.1') }), 'epa.lohn'],
      [setzen('P1', KALKULATION, '58.099', 'x' as unknown as Einheitspreisanteile), 'epa'],
    ];
    for (const [b, feld] of faelle) expect(fehler(z, b), feld).toEqual(['ungueltige-eingabe', feld]);
  });

  it('Sätze unter −100 % und negative Werte sind Befunde der Kalkulation, keine Sperre (U5)', () => {
    const k: Kalkulationsangaben = {
      ansaetze: [{ art: 'lohn', bezeichnung: 'x', ansatzmenge: '-1.000' as Menge, kostensatz: ep('-2.000') }],
      zuschlagssaetze: { lohn: '-150.00' as Prozent },
    };
    expect(fehler(basis(), setzen('P1', k))).toBeNull();
  });
});

describe('Lesart (a): ein reiner Preisbefehl entfernt die Kalkulation (D-127.6)', () => {
  const mit = (): LvZustand => wende(basis(), setzen('P1', KALKULATION));

  it('EinheitspreisAendern entfernt sie im selben ChangeSet; Undo bringt sie zurück', () => {
    const z = mit();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'EinheitspreisAendern',
        positionId: id.pos('P1'),
        einheitspreis: ep('60.000'),
      }),
    );
    const neu = anwenden(z, cs);
    expect(position(neu, 'P1')).not.toHaveProperty('kalkulation');
    expect(position(neu, 'P1').einheitspreis).toBe('60.000');
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('EinheitspreisanteileSetzen entfernt sie ebenso', () => {
    const neu = wende(mit(), {
      art: 'EinheitspreisanteileSetzen',
      positionId: id.pos('P1'),
      epa: { ...EPA, lohn: ep('26.000') },
    });
    expect(position(neu, 'P1')).not.toHaveProperty('kalkulation');
    expect(position(neu, 'P1').einheitspreis).toBe('59.000');
  });

  it('derselbe EP oder dieselben Anteile ändern nichts, auch nicht die Kalkulation', () => {
    const z = mit();
    const a = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'EinheitspreisAendern',
        positionId: id.pos('P1'),
        einheitspreis: ep('58.099'),
      }),
    );
    const b = erwarteOk(
      lvBefehlAusfuehren(z, { art: 'EinheitspreisanteileSetzen', positionId: id.pos('P1'), epa: EPA }),
    );
    expect(a.knoten.geaendert).toEqual([]);
    expect(b.knoten.geaendert).toEqual([]);
  });

  it('Menge, Kurztext und Merkmale lassen die Kalkulation stehen (sie gilt je Einheit)', () => {
    let z = mit();
    z = wende(z, { art: 'MengeAendern', positionId: id.pos('P1'), menge: '3.000' as Menge });
    z = wende(z, { art: 'KurztextAendern', knotenId: id.pos('P1'), kurztext: 'Neu' });
    z = wende(z, {
      art: 'PositionsmerkmaleSetzen',
      positionId: id.pos('P1'),
      merkmale: merkmale({ stundenlohn: true }),
      zuschlag: null,
    });
    expect(position(z, 'P1').kalkulation).toEqual(KALKULATION);
  });
});

describe('Anlegen und Kopieren nehmen die Kalkulation mit (Muster-LV, D-127.6)', () => {
  it('PositionAnlegen bringt sie mit; leer fällt sie weg; außer Form: ungueltige-eingabe', () => {
    const z = basis();
    const anlegen = (kalkulation: unknown): LvBefehl => ({
      art: 'PositionAnlegen',
      id: id.pos('P9'),
      ort: { art: 'ende', elternId: id.eltern('T1') },
      daten: positionsdaten('Neu', { kalkulation: kalkulation as Kalkulationsangaben }),
    });
    expect(position(wende(z, anlegen(KALKULATION)), 'P9').kalkulation).toEqual(KALKULATION);
    expect(position(wende(z, anlegen({ ansaetze: [], zuschlagssaetze: {} })), 'P9')).not.toHaveProperty(
      'kalkulation',
    );
    expect(fehler(z, anlegen({ ansaetze: 'x', zuschlagssaetze: {} }))).toEqual([
      'ungueltige-eingabe',
      'kalkulation.ansaetze',
    ]);
  });

  it('LeistungsverzeichnisAnlegen bringt sie mit; die Invariantenprüfung kennt ihre Form', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '58.099', { kalkulation: KALKULATION })]);
    expect(position(z, 'P1').kalkulation).toEqual(KALKULATION);
    expect(baumfehler(LV_ID, z.leistungsverzeichnis.knoten)).toEqual([]);
    const kaputt = z.leistungsverzeichnis.knoten.map((k) =>
      k.art === 'position' ? { ...k, kalkulation: { ansaetze: 1 } as unknown as Kalkulationsangaben } : k,
    );
    expect(baumfehler(LV_ID, kaputt).map((f) => f.feld)).toContain('kalkulation.ansaetze');
  });

  it('kopieBauen nimmt sie mit', () => {
    const z = wende(basis(), setzen('P1', KALKULATION));
    let n = 0;
    const kopie = kopieBauen(z, [id.pos('P1')], {
      los: () => `l${String(++n)}`,
      titel: () => `t${String(++n)}`,
      position: () => `p${String(++n)}`,
      hinweistext: () => `h${String(++n)}`,
    } as never);
    expect(kopie[0]?.art === 'position' ? kopie[0].kalkulation : undefined).toEqual(KALKULATION);
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 71 (Vertrag v1.4): LV-Befehle KostengruppeSetzen, TextquelleSetzen, NachtragsangabenSetzen, VorlageSetzen und
// die neuen Positionsfelder an mitgebrachten Knoten. Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type {
  AuftragsLeistungsverzeichnisId,
  HinweistextId,
  Knoten,
  Kostengruppennummer,
  LosId,
  LvBefehl,
  LvZustand,
  Nachtragsangaben,
  PositionId,
  Positionsdaten,
  TitelId,
} from '@tethys/vertrag';
import { changeSetUmkehren, kopieBauen, lvBefehlAusfuehren, pruefeLvInvarianten } from './index';
import {
  KEINE_SUMMEN,
  LV_ID,
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  id,
  inhalt,
  lvMit,
  posKnoten,
  positionsdaten,
  titelKnoten,
} from './testhilfen';

const kg = (s: string) => s as Kostengruppennummer;

function basis(): LvZustand {
  return lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000'),
    { art: 'hinweis', id: id.hinweis('H1'), elternId: id.eltern('T1'), reihenfolge: 1, text: [] },
  ]);
}

const fehler = (z: LvZustand, b: LvBefehl) => {
  const e = lvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error(`angenommen: ${b.art}`);
  return e.fehler;
};

/** Befehl ausführen, anwenden, Umkehrung prüfen; liefert den neuen Zustand. */
function wendeMitUmkehr(z: LvZustand, b: LvBefehl): LvZustand {
  const cs = erwarteOk(lvBefehlAusfuehren(z, b));
  const neu = anwenden(z, cs);
  expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  return neu;
}

const position = (z: LvZustand, kennung: string) => {
  const p = z.leistungsverzeichnis.knoten.find((k) => k.id === kennung);
  if (p?.art !== 'position') throw new Error(`keine Position: ${kennung}`);
  return p;
};

describe('KostengruppeSetzen im LV', () => {
  const setze = (positionId: string, kostengruppe: string | null): LvBefehl => ({
    art: 'KostengruppeSetzen',
    positionId: id.pos(positionId),
    kostengruppe: kostengruppe === null ? null : kg(kostengruppe),
  });

  it('setzt die Kostengruppe der Position: eine Knotenänderung, keine Summen; null entfernt das Feld', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setze('P1', '330')));
    expect(cs.kopf).toBeNull();
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(cs.knoten.geaendert).toEqual([
      { vorher: position(z, 'P1'), nachher: { ...position(z, 'P1'), kostengruppe: '330' } },
    ]);
    const z1 = wendeMitUmkehr(z, setze('P1', '330'));
    expect(position(z1, 'P1').kostengruppe).toBe('330');
    const z2 = wendeMitUmkehr(z1, setze('P1', '341'));
    expect(position(z2, 'P1').kostengruppe).toBe('341');
    const z3 = wendeMitUmkehr(z2, setze('P1', null));
    expect(position(z3, 'P1')).not.toHaveProperty('kostengruppe');
    expect(z3).toEqual(z);
  });

  it('derselbe Wert noch einmal liefert ein leeres ChangeSet', () => {
    const z1 = wendeMitUmkehr(basis(), setze('P1', '330'));
    const cs = erwarteOk(lvBefehlAusfuehren(z1, setze('P1', '330')));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    const leer = erwarteOk(lvBefehlAusfuehren(basis(), setze('P1', null)));
    expect(leer.knoten.geaendert).toEqual([]);
  });

  it('Form der Nummer: drei Ziffern 100 bis 999 (Glossar „Kostengruppe“), sonst ungueltige-eingabe', () => {
    const z = basis();
    for (const falsch of ['099', '000', '1000', '33', '33a', ' 330', '330 ', '', 'KG330']) {
      const f = fehler(z, setze('P1', falsch));
      expect(f.code, falsch).toBe('ungueltige-eingabe');
      expect(f.feld).toBe('kostengruppe');
    }
    const keinText = fehler(z, {
      art: 'KostengruppeSetzen',
      positionId: id.pos('P1'),
      kostengruppe: 330 as unknown as Kostengruppennummer,
    });
    expect(keinText.code).toBe('ungueltige-eingabe');
    for (const gut of ['100', '330', '999'])
      expect(lvBefehlAusfuehren(z, setze('P1', gut)).ok, gut).toBe(true);
  });

  it('nur an einer Position: Gliederung und Hinweistext knotenart-unzulaessig, unbekannte Kennung knoten-unbekannt (D-71.3, Ticket 105)', () => {
    const z = basis();
    for (const [k, code] of [
      ['T1', 'knotenart-unzulaessig'],
      ['H1', 'knotenart-unzulaessig'],
      ['gibt-es-nicht', 'knoten-unbekannt'],
    ] as const) {
      const f = fehler(z, setze(k, '330'));
      expect(f.code, k).toBe(code);
      expect(f.knotenId).toBe(k);
    }
  });
});

describe('TextquelleSetzen (D-40)', () => {
  const setze = (positionId: string, textquelle: string | null): LvBefehl => ({
    art: 'TextquelleSetzen',
    positionId: id.pos(positionId),
    textquelle,
  });

  it('setzt die Textquelle: eine Knotenänderung, keine Summen; null entfernt das Feld', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setze('P1', 'Muster-LV Hochbau')));
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(cs.knoten.geaendert).toEqual([
      { vorher: position(z, 'P1'), nachher: { ...position(z, 'P1'), textquelle: 'Muster-LV Hochbau' } },
    ]);
    const z1 = wendeMitUmkehr(z, setze('P1', 'Muster-LV Hochbau'));
    expect(position(z1, 'P1').textquelle).toBe('Muster-LV Hochbau');
    const z2 = wendeMitUmkehr(z1, setze('P1', null));
    expect(position(z2, 'P1')).not.toHaveProperty('textquelle');
    expect(z2).toEqual(z);
  });

  it("'' ist keine Quelle: wie null (das Feld fehlt danach, nie '' im Zustand); Leerzeichen bleiben Text (kein Trimmen)", () => {
    const z1 = wendeMitUmkehr(basis(), setze('P1', 'eigener Text'));
    const z2 = wendeMitUmkehr(z1, setze('P1', ''));
    expect(position(z2, 'P1')).not.toHaveProperty('textquelle');
    const leer = erwarteOk(lvBefehlAusfuehren(basis(), setze('P1', '')));
    expect(leer.knoten.geaendert).toEqual([]);
    const z3 = wendeMitUmkehr(basis(), setze('P1', ' '));
    expect(position(z3, 'P1').textquelle).toBe(' ');
    const gleich = erwarteOk(lvBefehlAusfuehren(z1, setze('P1', 'eigener Text')));
    expect(gleich.knoten.geaendert).toEqual([]);
  });

  it('Fehler: kein Text, keine Position, unbekannte Kennung', () => {
    const z = basis();
    const keinText = fehler(z, {
      art: 'TextquelleSetzen',
      positionId: id.pos('P1'),
      textquelle: 7 as unknown as string,
    });
    expect(keinText.code).toBe('ungueltige-eingabe');
    expect(keinText.feld).toBe('textquelle');
    expect(fehler(z, setze('T1', 'x')).code).toBe('knotenart-unzulaessig');
    expect(fehler(z, setze('H1', 'x')).code).toBe('knotenart-unzulaessig');
    expect(fehler(z, setze('gibt-es-nicht', 'x')).code).toBe('knoten-unbekannt');
  });
});

describe('NachtragsangabenSetzen (D-35)', () => {
  const angaben = (ueber: Partial<Nachtragsangaben> = {}): Nachtragsangaben => ({
    auftragsLvId: 'auftrag-1' as AuftragsLeistungsverzeichnisId,
    nummer: 'N01',
    status: 'angemeldet',
    ...ueber,
  });
  const setze = (nachtrag: Nachtragsangaben | null): LvBefehl => ({
    art: 'NachtragsangabenSetzen',
    nachtrag,
  });

  it('setzt die Angaben am Kopf (nur Kopf, keine Knoten, keine Summen); null entfernt das Feld', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setze(angaben())));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(cs.kopf?.vorher).not.toHaveProperty('nachtrag');
    expect(cs.kopf?.nachher?.nachtrag).toEqual(angaben());
    const z1 = wendeMitUmkehr(z, setze(angaben()));
    expect(z1.leistungsverzeichnis.nachtrag).toEqual(angaben());
    const z2 = wendeMitUmkehr(z1, setze(angaben({ status: 'beauftragt' })));
    expect(z2.leistungsverzeichnis.nachtrag?.status).toBe('beauftragt');
    const z3 = wendeMitUmkehr(z2, setze(null));
    expect(z3.leistungsverzeichnis).not.toHaveProperty('nachtrag');
    expect(z3).toEqual(z);
  });

  it('derselbe Wert und null ohne Angaben liefern ein leeres ChangeSet', () => {
    const z1 = wendeMitUmkehr(basis(), setze(angaben()));
    expect(erwarteOk(lvBefehlAusfuehren(z1, setze(angaben()))).kopf).toBeNull();
    expect(erwarteOk(lvBefehlAusfuehren(basis(), setze(null))).kopf).toBeNull();
  });

  it('jeder Status der Liste ist erlaubt; nur die drei Felder landen im Kopf', () => {
    for (const status of ['angemeldet', 'angeboten', 'beauftragt', 'abgelehnt'] as const)
      expect(lvBefehlAusfuehren(basis(), setze(angaben({ status }))).ok, status).toBe(true);
    const mitMehr = { ...angaben(), bemerkung: 'x' } as Nachtragsangaben;
    const kopf = erwarteOk(lvBefehlAusfuehren(basis(), setze(mitMehr))).kopf?.nachher;
    expect(kopf?.nachtrag).toEqual(angaben());
  });

  it('Form: Nummer nicht leer (auch nicht nur Leerraum), Status aus der Liste, Kennung ein Text', () => {
    const z = basis();
    const falsch: [unknown, string][] = [
      [angaben({ nummer: '' }), 'nachtrag.nummer'],
      [angaben({ nummer: '  \t' }), 'nachtrag.nummer'],
      [{ ...angaben(), nummer: 1 }, 'nachtrag.nummer'],
      [{ ...angaben(), status: 'erledigt' }, 'nachtrag.status'],
      [{ ...angaben(), auftragsLvId: null }, 'nachtrag.auftragsLvId'],
      ['N01', 'nachtrag'],
      [[], 'nachtrag'],
    ];
    for (const [wert, feld] of falsch) {
      const f = fehler(z, setze(wert as Nachtragsangaben));
      expect(f.code, feld).toBe('ungueltige-eingabe');
      expect(f.feld).toBe(feld);
    }
  });
});

describe('VorlageSetzen (D-40)', () => {
  const setze = (vorlage: boolean): LvBefehl => ({ art: 'VorlageSetzen', vorlage });

  it('true kennzeichnet das LV als Muster-LV, false nimmt das Feld weg (nie false im Zustand)', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setze(true)));
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(cs.kopf?.vorher).not.toHaveProperty('vorlage');
    expect(cs.kopf?.nachher?.vorlage).toBe(true);
    const z1 = wendeMitUmkehr(z, setze(true));
    expect(z1.leistungsverzeichnis.vorlage).toBe(true);
    const z2 = wendeMitUmkehr(z1, setze(false));
    expect(z2.leistungsverzeichnis).not.toHaveProperty('vorlage');
    expect(z2).toEqual(z);
  });

  it('derselbe Wert liefert ein leeres ChangeSet; kein Wahrheitswert: ungueltige-eingabe', () => {
    const z1 = wendeMitUmkehr(basis(), setze(true));
    expect(erwarteOk(lvBefehlAusfuehren(z1, setze(true))).kopf).toBeNull();
    expect(erwarteOk(lvBefehlAusfuehren(basis(), setze(false))).kopf).toBeNull();
    const f = fehler(basis(), { art: 'VorlageSetzen', vorlage: 'ja' as unknown as boolean });
    expect(f.code).toBe('ungueltige-eingabe');
    expect(f.feld).toBe('vorlage');
  });
});

describe('Kostengruppe und Textquelle an mitgebrachten Knoten (Nachtrag D-42 an Ticket 71)', () => {
  const mitFeldern = { kostengruppe: kg('330'), textquelle: 'Muster-LV Hochbau' };

  it('PositionAnlegen übernimmt beide Felder; textquelle "" fällt weg; die Umkehrung entfernt die Position', () => {
    const z = basis();
    const anlegen = (daten: Partial<Positionsdaten>): LvBefehl => ({
      art: 'PositionAnlegen',
      id: id.pos('P2'),
      ort: { art: 'ende', elternId: id.eltern('T1') },
      daten: positionsdaten('neu', daten),
    });
    const z1 = wendeMitUmkehr(z, anlegen(mitFeldern));
    expect(position(z1, 'P2')).toMatchObject(mitFeldern);
    const z2 = wendeMitUmkehr(z, anlegen({ textquelle: '' }));
    expect(position(z2, 'P2')).not.toHaveProperty('textquelle');
    expect(position(z2, 'P2')).not.toHaveProperty('kostengruppe');
  });

  it('PositionAnlegen weist eine Kostengruppe in falscher Form und eine Textquelle, die kein Text ist, ab', () => {
    const z = basis();
    const anlegen = (daten: Partial<Record<keyof Positionsdaten, unknown>>): LvBefehl => ({
      art: 'PositionAnlegen',
      id: id.pos('P2'),
      ort: { art: 'ende', elternId: id.eltern('T1') },
      daten: positionsdaten('neu', daten as Partial<Positionsdaten>),
    });
    const kgFalsch = fehler(z, anlegen({ kostengruppe: '33' }));
    expect([kgFalsch.code, kgFalsch.feld, kgFalsch.knotenId]).toEqual([
      'ungueltige-eingabe',
      'kostengruppe',
      'P2',
    ]);
    const tqFalsch = fehler(z, anlegen({ textquelle: 5 }));
    expect([tqFalsch.code, tqFalsch.feld]).toEqual(['ungueltige-eingabe', 'textquelle']);
  });

  it('LeistungsverzeichnisAnlegen und KnotenEinfuegen: Felder bleiben, "" fällt weg, falsche Form wird abgewiesen', () => {
    const knoten = [
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '1.000', mitFeldern),
      posKnoten('P2', 'T1', 1, '1.000', '1.000', { textquelle: '' }),
    ];
    const z = lvMit(knoten);
    expect(position(z, 'P1')).toMatchObject(mitFeldern);
    expect(position(z, 'P2')).not.toHaveProperty('textquelle');
    const anlegen = (k: readonly Knoten[]): LvBefehl => ({
      art: 'LeistungsverzeichnisAnlegen',
      id: LV_ID,
      projektId: PROJEKT_ID,
      inhalt: inhalt(k),
    });
    const falsch = lvBefehlAusfuehren(
      null,
      anlegen([posKnoten('P1', LV_ID, 0, null, null, { kostengruppe: kg('1') })]),
    );
    expect(!falsch.ok && [falsch.fehler.code, falsch.fehler.feld]).toEqual([
      'ungueltige-eingabe',
      'kostengruppe',
    ]);

    const einfuegen = (k: readonly Knoten[]): LvBefehl => ({
      art: 'KnotenEinfuegen',
      ort: { art: 'ende', elternId: id.eltern(LV_ID) },
      knoten: k,
    });
    const z1 = wendeMitUmkehr(
      basis(),
      einfuegen([
        posKnoten('E1', 'x', 0, null, null, mitFeldern),
        posKnoten('E2', 'x', 0, null, null, { textquelle: '' }),
      ]),
    );
    expect(position(z1, 'E1')).toMatchObject(mitFeldern);
    expect(position(z1, 'E2')).not.toHaveProperty('textquelle');
    const f = fehler(basis(), einfuegen([posKnoten('E1', 'x', 0, null, null, { kostengruppe: kg('abc') })]));
    expect([f.code, f.feld]).toEqual(['ungueltige-eingabe', 'kostengruppe']);
  });

  it('pruefeLvInvarianten meldet eine Kostengruppe in falscher Form', () => {
    const lv = {
      id: LV_ID,
      knoten: [posKnoten('P1', LV_ID, 0, null, null, { kostengruppe: kg('0') })],
    };
    expect(pruefeLvInvarianten(lv).join('\n')).toContain('ungueltige-eingabe');
  });

  it('kopieBauen (K9): Kostengruppe und Textquelle bleiben an der Kopie erhalten (Muster-LV als Quelle, C5)', () => {
    const z = wendeMitUmkehr(
      wendeMitUmkehr(basis(), {
        art: 'KostengruppeSetzen',
        positionId: id.pos('P1'),
        kostengruppe: kg('330'),
      }),
      { art: 'TextquelleSetzen', positionId: id.pos('P1'), textquelle: 'Muster-LV Hochbau' },
    );
    let n = 0;
    const ids = {
      los: () => `kopie-L${String(++n)}` as LosId,
      titel: () => `kopie-T${String(++n)}` as TitelId,
      position: () => `kopie-P${String(++n)}` as PositionId,
      hinweistext: () => `kopie-H${String(++n)}` as HinweistextId,
    };
    const kopie = kopieBauen(z, [id.knoten('T1')], ids);
    const p = kopie.find((k) => k.art === 'position');
    expect(p).toMatchObject(mitFeldern);
    const z1 = wendeMitUmkehr(z, {
      art: 'KnotenEinfuegen',
      ort: { art: 'ende', elternId: id.eltern(LV_ID) },
      knoten: kopie,
    });
    expect(position(z1, p?.id ?? '')).toMatchObject(mitFeldern);
  });
});

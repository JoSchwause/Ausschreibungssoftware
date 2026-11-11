// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 71 (Vertrag v1.4): LV-Befehle KostengruppeSetzen, TextquelleSetzen, NachtragsangabenSetzen, VorlageSetzen und
// die neuen Positionsfelder an mitgebrachten Knoten. Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type { Kostengruppennummer, LvBefehl, LvZustand } from '@tethys/vertrag';
import { changeSetUmkehren, lvBefehlAusfuehren } from './index';
import {
  KEINE_SUMMEN,
  LV_ID,
  anwenden,
  erwarteOk,
  id,
  lvMit,
  posKnoten,
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
    for (const gut of ['100', '330', '999']) expect(lvBefehlAusfuehren(z, setze('P1', gut)).ok, gut).toBe(true);
  });

  it('nur an einer Position: Gliederung, Hinweistext und unbekannte Kennung werden mit knoten-unbekannt abgewiesen', () => {
    const z = basis();
    for (const k of ['T1', 'H1', 'gibt-es-nicht']) {
      const f = fehler(z, setze(k, '330'));
      expect(f.code, k).toBe('knoten-unbekannt');
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

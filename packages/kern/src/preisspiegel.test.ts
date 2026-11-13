// SPDX-License-Identifier: AGPL-3.0-or-later
// PreisspiegeleinstellungenSetzen (Vertrag v1.7a, D-127.7; Ticket 137): die Einstellungen des Preisspiegels am Kopf des LV.
// Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type {
  LvBefehl,
  LvInhalt,
  PreisspiegelEinstellungen,
  Prozent,
} from '@tethys/vertrag';
import { changeSetUmkehren, lvBefehlAusfuehren } from './index';
import { KEINE_SUMMEN, LV_ID, anwenden, erwarteOk, lvMit, posKnoten } from './testhilfen';

const p = (s: string): Prozent => s as Prozent;

const EIGENE: PreisspiegelEinstellungen = {
  ausreisserSchwelle: p('15.00'),
  abcSchwelleA: p('70.00'),
  abcSchwelleB: p('90.00'),
  abcBezug: 'schaetzpreis',
};

const setzen = (einstellungen: PreisspiegelEinstellungen | null): LvBefehl => ({
  art: 'PreisspiegeleinstellungenSetzen',
  einstellungen,
});

const zustand = lvMit([posKnoten('P1', LV_ID, 0, '2.000', '10.000')]);

/** Code und Feld des Fehlerwerts, `null` bei Annahme. */
const fehler = (einstellungen: unknown): [string, string | undefined] | null => {
  const e = lvBefehlAusfuehren(zustand, setzen(einstellungen as PreisspiegelEinstellungen));
  return e.ok ? null : [e.fehler.code, e.fehler.feld];
};

describe('PreisspiegeleinstellungenSetzen', () => {
  it('setzt die Einstellungen am Kopf; nur der Kopf, keine Knoten, keine Summen', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(zustand, setzen(EIGENE)));
    const { knoten: _k, ...kopf } = zustand.leistungsverzeichnis;
    expect(cs.kopf).toEqual({ vorher: kopf, nachher: { ...kopf, preisspiegel: EIGENE } });
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    const neu = anwenden(zustand, cs);
    expect(neu.leistungsverzeichnis.preisspiegel).toEqual(EIGENE);
    expect(neu.summen).toBe(zustand.summen);
  });

  it('null entfernt das Feld (es fehlt danach); Undo stellt die Einstellungen wieder her', () => {
    const mit = anwenden(zustand, erwarteOk(lvBefehlAusfuehren(zustand, setzen(EIGENE))));
    const cs = erwarteOk(lvBefehlAusfuehren(mit, setzen(null)));
    const ohne = anwenden(mit, cs);
    expect(ohne.leistungsverzeichnis).not.toHaveProperty('preisspiegel');
    expect(ohne).toEqual(zustand);
    expect(anwenden(ohne, changeSetUmkehren(cs))).toEqual(mit);
  });

  it('dieselben Einstellungen und null ohne Einstellungen: leeres ChangeSet', () => {
    const mit = anwenden(zustand, erwarteOk(lvBefehlAusfuehren(zustand, setzen(EIGENE))));
    expect(erwarteOk(lvBefehlAusfuehren(mit, setzen({ ...EIGENE }))).kopf).toBeNull();
    expect(erwarteOk(lvBefehlAusfuehren(zustand, setzen(null))).kopf).toBeNull();
  });

  it('nur die vier Felder landen im Kopf', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(zustand, setzen({ ...EIGENE, extra: 1 } as PreisspiegelEinstellungen)));
    expect(cs.kopf?.nachher?.preisspiegel).toEqual(EIGENE);
  });

  it('Grenzen: 0,00 und 100,00 sind erlaubt, A gleich B auch', () => {
    expect(
      fehler({ ausreisserSchwelle: p('0.00'), abcSchwelleA: p('100.00'), abcSchwelleB: p('100.00'), abcBezug: 'mittel' }),
    ).toBeNull();
  });

  it('Sätze außer Form oder außerhalb 0,00 bis 100,00: ungueltige-eingabe mit dem Feld', () => {
    for (const [feld, wert] of [
      ['ausreisserSchwelle', '20'],
      ['ausreisserSchwelle', '-1.00'],
      ['abcSchwelleA', '100.01'],
      ['abcSchwelleB', 'x'],
      ['abcSchwelleB', 95],
    ] as const) {
      expect(fehler({ ...EIGENE, [feld]: wert }), `${feld} = ${String(wert)}`).toEqual([
        'ungueltige-eingabe',
        `einstellungen.${feld}`,
      ]);
    }
  });

  it('A größer als B: ungueltige-eingabe an abcSchwelleB', () => {
    expect(fehler({ ...EIGENE, abcSchwelleA: p('96.00'), abcSchwelleB: p('95.00') })).toEqual([
      'ungueltige-eingabe',
      'einstellungen.abcSchwelleB',
    ]);
  });

  it('ein LV aus dem Inhalt eines anderen (etwa eines LV-Stands) bringt die Einstellungen nicht mit (D-127.7)', () => {
    const mit = anwenden(zustand, erwarteOk(lvBefehlAusfuehren(zustand, setzen(EIGENE))));
    const { knoten, ...kopf } = mit.leistungsverzeichnis;
    const cs = erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: kopf.projektId,
        inhalt: { ...kopf, wurzelId: LV_ID, knoten } as LvInhalt,
      }),
    );
    expect(cs.kopf?.nachher).not.toHaveProperty('preisspiegel');
  });

  it('unbekannter Bezug oder kein Objekt: ungueltige-eingabe', () => {
    expect(fehler({ ...EIGENE, abcBezug: 'median' })).toEqual(['ungueltige-eingabe', 'einstellungen.abcBezug']);
    expect(fehler('20.00')).toEqual(['ungueltige-eingabe', 'einstellungen']);
    expect(fehler([])).toEqual(['ungueltige-eingabe', 'einstellungen']);
  });
});

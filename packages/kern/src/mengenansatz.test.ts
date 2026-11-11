// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenansatz an der Position (Ticket 56, Punkt 1; Vertrag v1.3, D-22): `MengenansatzSetzen` legt Ansatz und Menge
// unausgewertet ab (A3: kein `kern → mengen`), Summen wie `MengeAendern` (A6); Lesart (a): ein reiner Mengenbefehl an
// einer Position mit Ansatz entfernt den Ansatz im selben ChangeSet.

import { describe, expect, it } from 'vitest';
import type { Ansatzzeile, LvBefehl, LvZustand, Menge, Position } from '@tethys/vertrag';
import { changeSetUmkehren, lvBefehlAusfuehren, summenBerechnen } from './index';
import { LV_ID, anwenden, erwarteOk, id, lvMit, posKnoten, titelKnoten } from './testhilfen';

const ANSATZ: readonly Ansatzzeile[] = [
  { zeile: 1, formel: 91, ausdruck: '2,5*0,494', variable: 'a' },
  { zeile: 2, formel: 91, ausdruck: 'a', variable: null },
];

function start(): LvZustand {
  return lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '1.000', '10.000'),
    posKnoten('P2', 'T1', 1, '2.000', '5.000'),
  ]);
}

const setzen = (
  positionId: string,
  mengenansatz: readonly Ansatzzeile[] | null,
  menge: string | null,
): LvBefehl => ({
  art: 'MengenansatzSetzen',
  positionId: id.pos(positionId),
  mengenansatz,
  menge: menge as Menge | null,
});

const positionIn = (z: LvZustand, kennung: string): Position => {
  const k = z.leistungsverzeichnis.knoten.find((x) => x.id === kennung);
  if (k?.art !== 'position') throw new Error(kennung);
  return k;
};

const fehler = (z: LvZustand, b: LvBefehl) => {
  const e = lvBefehlAusfuehren(z, b);
  return e.ok ? null : { code: e.fehler.code, feld: e.fehler.feld };
};

describe('MengenansatzSetzen', () => {
  it('setzt Ansatz und Menge in einem ChangeSet; GP und Summen folgen wie bei MengeAendern; umkehrbar', () => {
    const z = start();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('P1', ANSATZ, '1.235')));
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect(cs.knoten.geaendert[0]?.nachher).toEqual({
      ...positionIn(z, 'P1'),
      menge: '1.235',
      mengenansatz: ANSATZ,
    });
    expect(cs.summen.positionen).toEqual([{ positionId: 'P1', gesamtpreis: '12.35', gehtInSummeEin: true }]);
    expect(cs.summen.gliederungen).toMatchObject([{ gliederungId: 'T1', summe: '22.35' }]);
    const neu = anwenden(z, cs);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('null und [] entfernen den Ansatz (kein Feld im Zustand); die mitgegebene Menge bleibt stehen', () => {
    const z = anwenden(start(), erwarteOk(lvBefehlAusfuehren(start(), setzen('P1', ANSATZ, '1.235'))));
    for (const leer of [null, []]) {
      const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('P1', leer, '1.235')));
      const nachher = cs.knoten.geaendert[0]?.nachher;
      expect(nachher).toBeDefined();
      expect(nachher && 'mengenansatz' in nachher).toBe(false);
      expect(nachher).toMatchObject({ menge: '1.235' });
      expect(cs.summen.positionen).toEqual([]); // Menge gleich: keine Summe ändert sich
      expect(anwenden(anwenden(z, cs), changeSetUmkehren(cs))).toEqual(z);
    }
    // [] an einer Position ohne Ansatz mit gleicher Menge ändert nichts.
    expect(erwarteOk(lvBefehlAusfuehren(start(), setzen('P1', [], '1.000'))).knoten.geaendert).toEqual([]);
  });

  it('Lesart (b): ein Ansatz mit Fehler kommt mit menge null; der Ansatz steht, die Menge ist leer (U5)', () => {
    const z = start();
    const mitFehler: readonly Ansatzzeile[] = [{ zeile: 1, formel: 91, ausdruck: '1/0', variable: null }];
    const neu = anwenden(z, erwarteOk(lvBefehlAusfuehren(z, setzen('P1', mitFehler, null))));
    expect(positionIn(neu, 'P1')).toMatchObject({ menge: null, mengenansatz: mitFehler });
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
  });

  it('derselbe Ansatz mit derselben Menge liefert ein leeres ChangeSet', () => {
    const z = anwenden(start(), erwarteOk(lvBefehlAusfuehren(start(), setzen('P1', ANSATZ, '1.235'))));
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen('P1', structuredClone(ANSATZ), '1.235')));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen.positionen).toEqual([]);
  });

  it('Formfehler: ungueltige-eingabe mit Feld; der Kern wertet den Ausdruck nicht aus', () => {
    const z = start();
    const zeile = (ueber: Record<string, unknown>) =>
      [{ zeile: 1, formel: 91, ausdruck: '1', variable: null, ...ueber }] as unknown as Ansatzzeile[];
    const mengenansatz = { code: 'ungueltige-eingabe', feld: 'mengenansatz' };
    expect(fehler(z, setzen('P1', zeile({ zeile: 1.5 }), '1.000'))).toEqual(mengenansatz);
    expect(fehler(z, setzen('P1', zeile({ zeile: '1' }), '1.000'))).toEqual(mengenansatz);
    expect(fehler(z, setzen('P1', zeile({ formel: 91.1 }), '1.000'))).toEqual(mengenansatz);
    expect(fehler(z, setzen('P1', zeile({ ausdruck: 3 }), '1.000'))).toEqual(mengenansatz);
    expect(fehler(z, setzen('P1', zeile({ variable: undefined }), '1.000'))).toEqual(mengenansatz);
    expect(fehler(z, setzen('P1', [null] as unknown as Ansatzzeile[], '1.000'))).toEqual(mengenansatz);
    expect(fehler(z, setzen('P1', 'Z1' as unknown as Ansatzzeile[], '1.000'))).toEqual(mengenansatz);
    expect(fehler(z, setzen('P1', ANSATZ, '1.5'))).toEqual({ code: 'ungueltige-eingabe', feld: 'menge' });
    expect(fehler(z, setzen('P1', ANSATZ, '1,500'))).toEqual({ code: 'ungueltige-eingabe', feld: 'menge' });
    // Unsinniger Ausdruck, doppelte Zeilennummer, unbekannte Formel: Sache von `mengen`, nicht des Kerns (A3).
    const unsinn: readonly Ansatzzeile[] = [
      { zeile: 1, formel: 4711, ausdruck: '((', variable: 'x' },
      { zeile: 1, formel: 91, ausdruck: '', variable: null },
    ];
    expect(fehler(z, setzen('P1', unsinn, '7.000'))).toBeNull();
  });

  it('Lesart (a): MengeAendern an einer Position mit Ansatz entfernt den Ansatz im selben ChangeSet; umkehrbar', () => {
    const z = anwenden(start(), erwarteOk(lvBefehlAusfuehren(start(), setzen('P1', ANSATZ, '1.235'))));
    const b: LvBefehl = { art: 'MengeAendern', positionId: id.pos('P1'), menge: '1.000' as Menge };
    const cs = erwarteOk(lvBefehlAusfuehren(z, b));
    expect(cs.knoten.geaendert).toEqual([
      { vorher: positionIn(z, 'P1'), nachher: positionIn(start(), 'P1') },
    ]);
    expect(cs.summen.positionen).toEqual([{ positionId: 'P1', gesamtpreis: '10.00', gehtInSummeEin: true }]);
    const neu = anwenden(z, cs);
    expect(neu).toEqual(start());
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('Anlegen, LV-Anlegen und Einfügen bringen den Ansatz mit (Form geprüft, [] fällt weg); die Kopie behält ihn', () => {
    const z = start();
    const daten = (ansatz: unknown) =>
      ({ ...positionIn(z, 'P2'), menge: '1.235', mengenansatz: ansatz }) as unknown as Position;
    // PositionAnlegen (D-56.1); die Lagefelder der Position stören nicht (der Typ der Daten hat sie nicht).
    const anlegen = (kennung: string, ansatz: unknown): LvBefehl => ({
      art: 'PositionAnlegen',
      id: id.pos(kennung),
      ort: { art: 'ende', elternId: id.eltern('T1') },
      daten: daten(ansatz),
    });
    const mit = anwenden(z, erwarteOk(lvBefehlAusfuehren(z, anlegen('PN', ANSATZ))));
    expect(positionIn(mit, 'PN')).toMatchObject({ menge: '1.235', mengenansatz: ANSATZ });
    expect(
      'mengenansatz' in positionIn(anwenden(z, erwarteOk(lvBefehlAusfuehren(z, anlegen('PN', [])))), 'PN'),
    ).toBe(false);
    expect(fehler(z, anlegen('PN', [{ zeile: 'x' }]))).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'mengenansatz',
    });
    // LeistungsverzeichnisAnlegen
    const lv = (ansatz: unknown) =>
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: z.leistungsverzeichnis.projektId,
        inhalt: {
          name: z.leistungsverzeichnis.name,
          ozMaske: z.leistungsverzeichnis.ozMaske,
          mwstSatz: z.leistungsverzeichnis.mwstSatz,
          nachlass: null,
          wurzelId: LV_ID,
          knoten: [z.leistungsverzeichnis.knoten[0], { ...daten(ansatz), reihenfolge: 0 }].filter(
            (k) => k !== undefined,
          ),
        },
      });
    const lvMitAnsatz = anwenden(null, erwarteOk(lv(ANSATZ)));
    expect(positionIn(lvMitAnsatz, 'P2').mengenansatz).toEqual(ANSATZ);
    expect('mengenansatz' in positionIn(anwenden(null, erwarteOk(lv([]))), 'P2')).toBe(false);
    const lvFehler = lv([{ zeile: 1, formel: 91, ausdruck: null, variable: null }]);
    expect(lvFehler.ok ? null : lvFehler.fehler.feld).toBe('mengenansatz');
    // KnotenEinfuegen (Kopie, D-27)
    const kopie = { ...positionIn(lvMitAnsatz, 'P2'), id: id.pos('PK') };
    const eingefuegt = anwenden(
      lvMitAnsatz,
      erwarteOk(
        lvBefehlAusfuehren(lvMitAnsatz, {
          art: 'KnotenEinfuegen',
          ort: { art: 'ende', elternId: id.eltern('T1') },
          knoten: [kopie],
        }),
      ),
    );
    expect(positionIn(eingefuegt, 'PK')).toMatchObject({ menge: '1.235', mengenansatz: ANSATZ });
    const leer = lvBefehlAusfuehren(lvMitAnsatz, {
      art: 'KnotenEinfuegen',
      ort: { art: 'ende', elternId: id.eltern('T1') },
      knoten: [{ ...kopie, mengenansatz: [] }],
    });
    expect('mengenansatz' in (erwarteOk(leer).knoten.hinzugefuegt[0] ?? {})).toBe(false);
  });

  it('Vorbedingungen wie MengeAendern: unbekannte Kennung, keine Position; Zuschlags- und Pauschalposition wie dort', () => {
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '10.000'),
      posKnoten('PA', 'T1', 1, '1.000', '10.000', {
        merkmale: {
          bedarf: null,
          wahl: null,
          stundenlohn: false,
          pauschal: true,
          zuschlagskennzeichen: false,
        },
      }),
      posKnoten('Z', 'T1', 2, null, null, {
        zuschlag: { prozentsatz: '5.00' as never, bezug: { art: 'gliederung' } },
      }),
    ]);
    expect(fehler(z, setzen('gibt-es-nicht', ANSATZ, '1.000'))?.code).toBe('knoten-unbekannt');
    expect(fehler(z, setzen('T1', ANSATZ, '1.000'))?.code).toBe('knotenart-unzulaessig');
    for (const kennung of ['PA', 'Z']) {
      const menge: LvBefehl = { art: 'MengeAendern', positionId: id.pos(kennung), menge: '2.000' as Menge };
      const mitAnsatz = setzen(kennung, ANSATZ, '2.000');
      expect(lvBefehlAusfuehren(z, mitAnsatz).ok).toBe(lvBefehlAusfuehren(z, menge).ok);
    }
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Aufmaßblatt (Ticket 80, D-36 (1), D-22, D-70.3): Golden-Tests an Blatt 1 und der Korrektur des Tors M4
// (Ticket 85), Formprüfungen, Anwenden und Umkehren.

import type {
  Ansatzzeile,
  Aufmass,
  AufmassBefehl,
  AufmassChangeSet,
  AufmassId,
  AufmassZustand,
  Aufmassposition,
  Befehlsfehler,
  Menge,
  PositionId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { aufmassBefehlAusfuehren } from './aufmass-befehle';
import { aufmassChangeSetAnwenden, aufmassChangeSetUmkehren } from './aufmass-changeset';
import { abrechnungsFixture, erwarteFehler, erwarteOk, fxAufmass, fxAufmassposition } from './testhilfen';

const fx = abrechnungsFixture();
const [erstesBlatt] = fx.aufmasse;
if (erstesBlatt === undefined) throw new Error('Fixture ohne Aufmaßblatt');
const blatt1 = fxAufmass(erstesBlatt.aufmass);
const zustand: AufmassZustand = { aufmass: blatt1 };

const zeile = (
  positionId: string,
  menge: string | null,
  mengenansatz: Ansatzzeile[] | null = null,
): Aufmassposition => ({
  positionId: positionId as PositionId,
  mengenansatz,
  menge: menge as Menge | null,
});
const ansatz = (ausdruck: string): Ansatzzeile[] => [{ zeile: 1, formel: 91, ausdruck, variable: null }];

/** Führt aus und wendet an; prüft dabei, dass die Umkehrung den Ausgangszustand zurückgibt. */
function ausfuehren(
  z: AufmassZustand | null,
  befehl: AufmassBefehl,
): { cs: AufmassChangeSet; danach: AufmassZustand | null } {
  const cs = erwarteOk(aufmassBefehlAusfuehren(z, befehl));
  const danach = aufmassChangeSetAnwenden(z, cs);
  expect(aufmassChangeSetAnwenden(danach, aufmassChangeSetUmkehren(cs))).toEqual(z);
  return { cs, danach };
}

const fehler = (z: AufmassZustand | null, befehl: AufmassBefehl): Befehlsfehler =>
  erwarteFehler(aufmassBefehlAusfuehren(z, befehl));

describe('aufmassBefehlAusfuehren: Tor M4', () => {
  it('Blatt 1 anlegen: ChangeSet mit dem ganzen Blatt, vorher keines', () => {
    const { cs, danach } = ausfuehren(null, { art: 'AufmassAnlegen', aufmass: blatt1 });
    expect(cs).toEqual({ art: 'aufmass', aufmassId: blatt1.id, aufmass: { vorher: null, nachher: blatt1 } });
    expect(danach).toEqual({ aufmass: blatt1 });
  });

  it('die Korrektur nach der Freigabe von AR 1 ersetzt die Zeile an ihrer Stelle (Sollstand der Fixture)', () => {
    const befehl: AufmassBefehl = {
      art: 'AufmasspositionSetzen',
      position: fxAufmassposition(fx.korrektur.befehl.position),
    };
    const { cs, danach } = ausfuehren(zustand, befehl);
    const soll = fxAufmass(fx.korrektur.aufmassNachher);
    expect(cs).toEqual({ art: 'aufmass', aufmassId: blatt1.id, aufmass: { vorher: blatt1, nachher: soll } });
    expect(danach).toEqual({ aufmass: soll });
  });
});

describe('aufmassBefehlAusfuehren: Zeilen', () => {
  it('eine neue Zeile kommt ans Ende', () => {
    const neu = zeile('neue-position', '2.500');
    const { danach } = ausfuehren(zustand, { art: 'AufmasspositionSetzen', position: neu });
    expect(danach?.aufmass.positionen).toEqual([...blatt1.positionen, neu]);
  });

  it('ein leerer Ansatz [] ist keiner: abgelegt wird null (D-22)', () => {
    const { danach } = ausfuehren(zustand, {
      art: 'AufmasspositionSetzen',
      position: zeile('neu', '1.000', []),
    });
    expect(danach?.aufmass.positionen.at(-1)).toEqual(zeile('neu', '1.000', null));
    const leer = { ...blatt1, positionen: [zeile('neu', '1.000', [])] };
    const { danach: angelegt } = ausfuehren(null, { art: 'AufmassAnlegen', aufmass: leer });
    expect(angelegt?.aufmass.positionen).toEqual([zeile('neu', '1.000', null)]);
  });

  it('ein Ansatz mit Fehler kommt mit Menge null (Lesart (b), D-22); eine negative Menge ist ein Abzug', () => {
    const fehlerhaft = zeile('neu', null, ansatz('2*('));
    expect(
      ausfuehren(zustand, {
        art: 'AufmasspositionSetzen',
        position: fehlerhaft,
      }).danach?.aufmass.positionen.at(-1),
    ).toEqual(fehlerhaft);
    const abzug = zeile('neu', '-1.250');
    expect(
      ausfuehren(zustand, { art: 'AufmasspositionSetzen', position: abzug }).danach?.aufmass.positionen.at(
        -1,
      ),
    ).toEqual(abzug);
  });

  it('Zeile entfernen; eine fehlende Zeile ist ungueltige-eingabe (feld positionId)', () => {
    const [erste, ...rest] = blatt1.positionen;
    if (erste === undefined) throw new Error('Blatt ohne Zeilen');
    const { danach } = ausfuehren(zustand, { art: 'AufmasspositionEntfernen', positionId: erste.positionId });
    expect(danach?.aufmass.positionen).toEqual(rest);
    expect(
      fehler(zustand, { art: 'AufmasspositionEntfernen', positionId: 'fehlt' as PositionId }),
    ).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'positionId',
    });
  });
});

describe('aufmassBefehlAusfuehren: Kopf und Löschen', () => {
  it('Kopf setzen ändert Bezeichnung und Datum, nie die Nummer (D-70.9)', () => {
    const { danach } = ausfuehren(zustand, { art: 'AufmasskopfSetzen', bezeichnung: 'Neu', datum: null });
    expect(danach).toEqual({ aufmass: { ...blatt1, bezeichnung: 'Neu', datum: null } });
  });

  it('Löschen trägt den vollen Stand; anwenden liefert null', () => {
    const { cs, danach } = ausfuehren(zustand, { art: 'AufmassLoeschen' });
    expect(cs.aufmass).toEqual({ vorher: blatt1, nachher: null });
    expect(danach).toBeNull();
  });

  it('Anlegen nur ohne Zustand, alle anderen Befehle nur mit (befehl-nicht-zustaendig)', () => {
    expect(fehler(zustand, { art: 'AufmassAnlegen', aufmass: blatt1 }).code).toBe('befehl-nicht-zustaendig');
    for (const b of [
      { art: 'AufmasskopfSetzen', bezeichnung: '', datum: null },
      { art: 'AufmasspositionSetzen', position: zeile('p', '1.000') },
      { art: 'AufmasspositionEntfernen', positionId: 'p' as PositionId },
      { art: 'AufmassLoeschen' },
    ] as const)
      expect(fehler(null, b).code).toBe('befehl-nicht-zustaendig');
  });
});

describe('aufmassBefehlAusfuehren: Formprüfungen (ungueltige-eingabe)', () => {
  const anlegen = (aenderung: Partial<Aufmass>): Befehlsfehler =>
    fehler(null, { art: 'AufmassAnlegen', aufmass: { ...blatt1, ...aenderung } });
  const setzen = (position: Aufmassposition): Befehlsfehler =>
    fehler(zustand, { art: 'AufmasspositionSetzen', position });

  it('Nummer: ganze Zahl ≥ 1', () => {
    for (const nummer of [0, -1, 1.5, Number.NaN])
      expect(anlegen({ nummer })).toMatchObject({ code: 'ungueltige-eingabe', feld: 'nummer' });
  });

  it('Kennungen und Bezeichnung', () => {
    expect(anlegen({ id: '' as AufmassId })).toMatchObject({ code: 'ungueltige-eingabe', feld: 'id' });
    expect(anlegen({ bezeichnung: 7 as unknown as string })).toMatchObject({ feld: 'bezeichnung' });
    expect(
      fehler(zustand, { art: 'AufmasskopfSetzen', bezeichnung: null as unknown as string, datum: null }),
    ).toMatchObject({
      feld: 'bezeichnung',
    });
  });

  it('Datum: JJJJ-MM-TT und ein Tag des Kalenders, oder null', () => {
    for (const datum of ['2026-13-01', '2026-02-29', '2026-1-01', '01.11.2026', ''])
      expect(anlegen({ datum })).toMatchObject({ code: 'ungueltige-eingabe', feld: 'datum' });
    expect(
      ausfuehren(null, { art: 'AufmassAnlegen', aufmass: { ...blatt1, datum: '2028-02-29' } }).danach?.aufmass
        .datum,
    ).toBe('2028-02-29');
    expect(
      fehler(zustand, { art: 'AufmasskopfSetzen', bezeichnung: 'x', datum: '2026-04-31' }),
    ).toMatchObject({ feld: 'datum' });
  });

  it('eine Zeile je Position', () => {
    const [erste] = blatt1.positionen;
    if (erste === undefined) throw new Error('Blatt ohne Zeilen');
    expect(anlegen({ positionen: [...blatt1.positionen, erste] })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'positionen',
      knotenId: erste.positionId,
    });
  });

  it('Menge kanonisch mit 3 Stellen', () => {
    for (const menge of ['1.00', '1,000', '01.000', '-0.000', ''])
      expect(setzen(zeile('p', menge))).toMatchObject({
        code: 'ungueltige-eingabe',
        feld: 'menge',
        knotenId: 'p',
      });
  });

  it('Mengenansatz in der Form des Kerns (Zeile und Formel ganzzahlig, Ausdruck Text, Variable Text oder null)', () => {
    const kaputt = [
      [{ zeile: 1.5, formel: 91, ausdruck: '1', variable: null }],
      [{ zeile: 1, formel: '91', ausdruck: '1', variable: null }],
      [{ zeile: 1, formel: 91, ausdruck: 1, variable: null }],
      [{ zeile: 1, formel: 91, ausdruck: '1', variable: 3 }],
      'kein Ansatz',
    ] as unknown as Ansatzzeile[][];
    for (const mengenansatz of kaputt)
      expect(setzen(zeile('p', '1.000', mengenansatz))).toMatchObject({
        code: 'ungueltige-eingabe',
        feld: 'mengenansatz',
      });
  });

  it('Positionskennung nicht leer, Zeilen als Liste', () => {
    expect(setzen(zeile('', '1.000'))).toMatchObject({ feld: 'positionId' });
    expect(anlegen({ positionen: null as unknown as Aufmassposition[] })).toMatchObject({
      feld: 'positionen',
    });
  });
});

describe('aufmassChangeSetUmkehren', () => {
  it('tauscht vorher und nachher; zweimal umgekehrt ist das ChangeSet selbst', () => {
    const cs = erwarteOk(aufmassBefehlAusfuehren(zustand, { art: 'AufmassLoeschen' }));
    const um = aufmassChangeSetUmkehren(cs);
    expect(um).toEqual({ art: 'aufmass', aufmassId: blatt1.id, aufmass: { vorher: null, nachher: blatt1 } });
    expect(aufmassChangeSetUmkehren(um)).toEqual(cs);
  });

  it('ein ChangeSet, das nicht zum Zustand passt, ist ein Programmfehler', () => {
    const anlegen = erwarteOk(aufmassBefehlAusfuehren(null, { art: 'AufmassAnlegen', aufmass: blatt1 }));
    expect(() => aufmassChangeSetAnwenden(zustand, anlegen)).toThrow();
    const loeschen = erwarteOk(aufmassBefehlAusfuehren(zustand, { art: 'AufmassLoeschen' }));
    expect(() => aufmassChangeSetAnwenden(null, loeschen)).toThrow();
    const fremd = { aufmass: { ...blatt1, id: 'anderes' as AufmassId } };
    expect(() => aufmassChangeSetAnwenden(fremd, loeschen)).toThrow();
  });
});

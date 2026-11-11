// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Einheitspreis, LvBefehl, Menge, Position, PositionId, Prozent, TitelId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  entwurfBefehle,
  entwurfNachfuehren,
  entwurfVon,
  kernFehlerFeld,
  type Positionsentwurf,
} from './positionsentwurf';

const P = 'p1' as PositionId;
const position = (x: Partial<Position> = {}): Position => ({
  art: 'position',
  id: P,
  elternId: 't1' as TitelId,
  reihenfolge: 0,
  ordnungszahl: null,
  ozIndex: null,
  merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
  zuschlag: null,
  kurztext: 'Bauzaun',
  langtext: [],
  menge: '12.000' as Menge,
  einheit: 'm',
  einheitspreis: '7.450' as Einheitspreis,
  epa: null,
  ...x,
});

const mit = (p: Position, x: Partial<Positionsentwurf>): Positionsentwurf => ({ ...entwurfVon(p), ...x });
const arten = (b: readonly LvBefehl[]): string[] => b.map((x) => x.art);

describe('Positionsdialog: Entwurf → Befehle (je geändertes Feld ein Befehl)', () => {
  it('ohne Änderung kein Befehl (auch Abbrechen erzeugt so keinen)', () => {
    const p = position();
    expect(entwurfBefehle(p, entwurfVon(p))).toEqual({ befehle: [], fehler: {} });
  });

  it('zeigt Zahlen im deutschen Format (N4)', () => {
    const e = entwurfVon(position({ menge: '1234.500' as Menge }));
    expect([e.menge, e.einheitspreis, e.einheit]).toEqual(['1.234,500', '7,450', 'm']);
  });

  it('nur geänderte Felder, je ein Befehl, in fester Reihenfolge', () => {
    const p = position();
    const r = entwurfBefehle(p, mit(p, { menge: '13', kurztext: 'Bauzaun, mobil', einheit: '' }));
    expect(r.fehler).toEqual({});
    expect(r.befehle).toEqual([
      { art: 'KurztextAendern', knotenId: P, kurztext: 'Bauzaun, mobil' },
      { art: 'MengeAendern', positionId: P, menge: '13.000' },
      { art: 'EinheitAendern', positionId: P, einheit: null },
    ]);
  });

  it('gleicher Wert in anderer Schreibweise ist keine Änderung', () => {
    const p = position();
    expect(entwurfBefehle(p, mit(p, { menge: '12,0', einheitspreis: ' 7,45 ' })).befehle).toEqual([]);
  });

  it('eine ungültige Zahl bleibt am Feld markiert, die übrigen Felder gehen hinaus (U5)', () => {
    const p = position();
    const r = entwurfBefehle(p, mit(p, { menge: '12,x', einheitspreis: '', kurztext: 'Neu' }));
    expect(arten(r.befehle)).toEqual(['KurztextAendern', 'EinheitspreisAendern']);
    expect(r.befehle[1]).toEqual({ art: 'EinheitspreisAendern', positionId: P, einheitspreis: null });
    expect(Object.keys(r.fehler)).toEqual(['menge']);
    expect(r.fehler['menge']).toMatch(/Menge/);
  });

  it('Langtext: Änderung als LangtextAendern, gleicher Inhalt ist keine Änderung', () => {
    const p = position({ langtext: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'A' }] }] as never });
    expect(entwurfBefehle(p, entwurfVon(p)).befehle).toEqual([]);
    const neu = [{ art: 'absatz', inhalt: [{ art: 'text', text: 'B' }] }] as never;
    expect(entwurfBefehle(p, mit(p, { langtext: neu })).befehle).toEqual([
      { art: 'LangtextAendern', positionId: P, langtext: neu },
    ]);
  });

  it('Ordnungszahl von Hand: OrdnungszahlSetzen, leer heißt null', () => {
    const p = position({ ordnungszahl: '01.0010' as never });
    expect(entwurfBefehle(p, mit(p, { ordnungszahl: '01.0020' })).befehle).toEqual([
      { art: 'OrdnungszahlSetzen', knotenId: P, ordnungszahl: '01.0020', ozIndex: null },
    ]);
    expect(entwurfBefehle(p, mit(p, { ordnungszahl: ' ' })).befehle).toEqual([
      { art: 'OrdnungszahlSetzen', knotenId: P, ordnungszahl: null, ozIndex: null },
    ]);
  });
});

describe('Merkmale und Zuschlag: ein PositionsmerkmaleSetzen', () => {
  it('Bedarf, Stundenlohn, Wahl mit Gruppe, Variante und Grundposition', () => {
    const p = position();
    const r = entwurfBefehle(
      p,
      mit(p, {
        bedarf: 'ohne-gesamtbetrag',
        stundenlohn: true,
        wahl: true,
        wahlGruppe: '2',
        wahlVariante: '1',
        grundpositionId: 'p0' as PositionId,
      }),
    );
    expect(r.befehle).toEqual([
      {
        art: 'PositionsmerkmaleSetzen',
        positionId: P,
        merkmale: {
          bedarf: 'ohne-gesamtbetrag',
          wahl: { gruppe: 2, variante: 1, grundpositionId: 'p0' },
          stundenlohn: true,
          pauschal: false,
          zuschlagskennzeichen: false,
        },
        zuschlag: null,
      },
    ]);
  });

  it('eine Wahlnummer, die keine ganze Zahl ist, bleibt am Feld; die Merkmale gehen dann nicht hinaus', () => {
    const p = position();
    const r = entwurfBefehle(p, mit(p, { wahl: true, wahlGruppe: '1,5', kurztext: 'X' }));
    expect(arten(r.befehle)).toEqual(['KurztextAendern']);
    expect(Object.keys(r.fehler)).toEqual(['wahlGruppe']);
  });

  it('Zuschlagsposition mit Bezugsform Gliederung und Satz 10,00 %', () => {
    const p = position();
    const r = entwurfBefehle(
      p,
      mit(p, {
        zuschlag: true,
        zuschlagssatz: '10',
        bezugsform: 'gliederung',
        menge: '',
        einheit: '',
        einheitspreis: '',
      }),
    );
    expect(r.fehler).toEqual({});
    expect(r.befehle.at(-1)).toEqual({
      art: 'PositionsmerkmaleSetzen',
      positionId: P,
      merkmale: position().merkmale,
      zuschlag: { prozentsatz: '10.00', bezug: { art: 'gliederung' } },
    });
    expect(arten(r.befehle)).toEqual([
      'MengeAendern',
      'EinheitAendern',
      'EinheitspreisAendern',
      'PositionsmerkmaleSetzen',
    ]);
  });

  it('Bezugsform Liste mit Teilmenge; Kennzeichnung; leerer Satz heißt null', () => {
    const p = position();
    const liste = entwurfBefehle(
      p,
      mit(p, {
        zuschlag: true,
        bezugsform: 'positionen',
        bezugspositionen: [
          { positionId: 'a' as PositionId, teilmenge: '' },
          { positionId: 'b' as PositionId, teilmenge: '2,5' },
        ],
      }),
    );
    expect(liste.befehle).toEqual([
      expect.objectContaining({
        zuschlag: {
          prozentsatz: null,
          bezug: {
            art: 'positionen',
            positionen: [
              { positionId: 'a', teilmenge: null },
              { positionId: 'b', teilmenge: '2.500' },
            ],
          },
        },
      }),
    ]);
    const kz = entwurfBefehle(
      p,
      mit(p, { zuschlag: true, bezugsform: 'kennzeichnung', zuschlagssatz: '5,5' }),
    );
    expect(kz.befehle).toEqual([
      expect.objectContaining({ zuschlag: { prozentsatz: '5.50', bezug: { art: 'kennzeichnung' } } }),
    ]);
  });

  it('ungültige Teilmenge oder Satz: Fehler am Feld, kein Merkmalbefehl', () => {
    const p = position();
    const r = entwurfBefehle(
      p,
      mit(p, {
        zuschlag: true,
        zuschlagssatz: 'zehn',
        bezugsform: 'positionen',
        bezugspositionen: [{ positionId: 'a' as PositionId, teilmenge: '1,23456' }],
      }),
    );
    expect(r.befehle).toEqual([]);
    expect(Object.keys(r.fehler).sort()).toEqual(['bezug.0.teilmenge', 'zuschlagssatz']);
  });

  it('eine bestehende Zuschlagsposition bleibt unverändert, wenn nichts geändert ist', () => {
    const p = position({
      zuschlag: {
        prozentsatz: '10.00' as Prozent,
        bezug: { art: 'positionen', positionen: [{ positionId: 'a' as PositionId, teilmenge: null }] },
      },
    });
    expect(entwurfBefehle(p, entwurfVon(p)).befehle).toEqual([]);
    expect(entwurfBefehle(p, mit(p, { zuschlag: false })).befehle).toEqual([
      expect.objectContaining({ art: 'PositionsmerkmaleSetzen', zuschlag: null }),
    ]);
  });
});

describe('Einheitspreisanteile und Leitbeschreibung', () => {
  it('Anteile als ein EinheitspreisanteileSetzen; alle leer heißt null', () => {
    const p = position();
    const e = entwurfVon(p);
    const r = entwurfBefehle(p, { ...e, epa: { ...e.epa, lohn: '5', stoffe: '2,45' }, freiBezeichnung: '' });
    expect(r.befehle).toEqual([
      {
        art: 'EinheitspreisanteileSetzen',
        positionId: P,
        epa: {
          lohn: '5.000',
          stoffe: '2.450',
          geraete: null,
          nachunternehmer: null,
          sonstiges: null,
          frei: null,
          freiBezeichnung: null,
        },
      },
    ]);
    const mitAnteil = position({
      epa: {
        lohn: '5.000',
        stoffe: null,
        geraete: null,
        nachunternehmer: null,
        sonstiges: null,
        frei: null,
        freiBezeichnung: null,
      } as never,
    });
    const leer = entwurfVon(mitAnteil);
    expect(entwurfBefehle(mitAnteil, { ...leer, epa: { ...leer.epa, lohn: '' } }).befehle).toEqual([
      { art: 'EinheitspreisanteileSetzen', positionId: P, epa: null },
    ]);
  });

  it('ungültiger Anteil: Fehler am Feld, keine Anteile', () => {
    const p = position();
    const e = entwurfVon(p);
    const r = entwurfBefehle(p, { ...e, epa: { ...e.epa, geraete: 'x' } });
    expect(r.befehle).toEqual([]);
    expect(Object.keys(r.fehler)).toEqual(['epa.geraete']);
  });

  it('Leitbeschreibung mit Unterbeschreibungen als ganzer neuer Wert', () => {
    const p = position();
    const r = entwurfBefehle(
      p,
      mit(p, {
        leitbeschreibung: true,
        unterbeschreibungen: [
          { nummer: '01', kurztext: 'Teil A', langtext: [], menge: '3', einheit: 'St' },
          { nummer: '02', kurztext: 'Teil B', langtext: [], menge: '', einheit: '' },
        ],
      }),
    );
    expect(r.befehle).toEqual([
      {
        art: 'LeitbeschreibungSetzen',
        positionId: P,
        leitbeschreibung: {
          unterbeschreibungen: [
            { nummer: '01', kurztext: 'Teil A', langtext: [], menge: '3.000', einheit: 'St' },
            { nummer: '02', kurztext: 'Teil B', langtext: [], menge: null, einheit: null },
          ],
        },
      },
    ]);
    const mitLb = position({ leitbeschreibung: { unterbeschreibungen: [] } });
    expect(entwurfBefehle(mitLb, entwurfVon(mitLb)).befehle).toEqual([]);
    expect(entwurfBefehle(mitLb, mit(mitLb, { leitbeschreibung: false })).befehle).toEqual([
      { art: 'LeitbeschreibungSetzen', positionId: P, leitbeschreibung: null },
    ]);
  });
});

describe('Neuer gespeicherter Stand, während der Dialog offen ist', () => {
  it('übernimmt ihn in unberührte Felder; geänderte Felder bleiben, wie der Nutzer sie eingab', () => {
    const alt = position({ kurztext: '' });
    const basis = entwurfVon(alt);
    const eingabe = { ...basis, menge: '13' };
    // Der Kurztext aus dem Grid kommt erst jetzt im Zustand an.
    const neu = position({ kurztext: 'Zuschlag' });
    const e = entwurfNachfuehren(eingabe, basis, entwurfVon(neu));
    expect([e.kurztext, e.menge]).toEqual(['Zuschlag', '13']);
    // Damit überschreibt Übernehmen den neuen Kurztext nicht mit dem alten.
    expect(entwurfBefehle(neu, e).befehle).toEqual([{ art: 'MengeAendern', positionId: P, menge: '13.000' }]);
  });
});

describe('Formfehler des Kerns am Feld', () => {
  it('ordnet das Feld des Befehlsfehlers dem Bereich im Dialog zu', () => {
    expect(kernFehlerFeld('merkmale')).toBe('merkmale');
    expect(kernFehlerFeld('merkmale.wahl')).toBe('wahlGruppe');
    expect(kernFehlerFeld('merkmale.zuschlagskennzeichen')).toBe('merkmale');
    expect(kernFehlerFeld('zuschlag.bezug.positionen')).toBe('bezug');
    expect(kernFehlerFeld('zuschlag')).toBe('zuschlag');
    expect(kernFehlerFeld('epa')).toBe('epa');
    expect(kernFehlerFeld(undefined)).toBe('allgemein');
  });
});

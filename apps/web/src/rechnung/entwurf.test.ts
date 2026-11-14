// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: das Formular „Neue Rechnung“ bzw. „Angaben bearbeiten“: Vorschlag, Lesen der Eingaben (de-DE nur hier, am
// Rand, N4) und die Befehle, die daraus werden (A5).

import type {
  AufmassId,
  AufmassKopf,
  AuftragsLeistungsverzeichnisId,
  Betrag,
  ProjektId,
  Prozent,
  Rechnung,
  RechnungId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  aenderungsbefehle,
  entwurfAus,
  entwurfLesen,
  neuerEntwurf,
  rechnungAnlegenBefehl,
  type Rechnungsentwurf,
} from './entwurf';

const P = 'p1' as ProjektId;
const A = 'a1' as AuftragsLeistungsverzeichnisId;
const blatt = (id: string, nummer: number): AufmassKopf => ({
  id: id as AufmassId,
  projektId: P,
  auftragsLvId: A,
  nummer,
  bezeichnung: '',
  datum: null,
});

const ar1: Rechnung = {
  id: 'r1' as RechnungId,
  projektId: P,
  auftragsLvId: A,
  nummer: 1,
  art: 'abschlag',
  eingang: '2026-09-16',
  rechnungsnummerAuftragnehmer: 'AR-2026-001',
  gefordert: null,
  aufmassIds: ['b1' as AufmassId],
  umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: '0.50' as Prozent }],
  sicherheitSatz: '5.00' as Prozent,
  gewaehrleistungSatz: '3.00' as Prozent,
  freigabe: { zahlbetrag: '8874.40' as Betrag },
};

const leer: Rechnungsentwurf = {
  art: 'abschlag',
  eingang: '',
  rechnungsnummerAuftragnehmer: '',
  gefordertNetto: '',
  gefordertBrutto: '',
  gefordertZahlbetrag: '',
  aufmassIds: [],
  umlagen: [],
  sicherheitSatz: '',
  gewaehrleistungSatz: '',
  vertragsstrafeBetrag: '',
  vertragsstrafeGrund: '',
  skontoSatz: '',
  skontoFrist: '',
  bauabzugsteuer: false,
};

describe('neuerEntwurf', () => {
  it('erste Rechnung: Abschlag, alle Blätter nach Nummer vorgewählt, keine Abzüge', () => {
    const e = neuerEntwurf([], [blatt('b2', 2), blatt('b1', 1)]);
    expect(e).toEqual({ ...leer, aufmassIds: ['b1', 'b2'] });
  });

  it('weitere Rechnung: Umlagen und beide Einbehaltssätze der vorigen als Vorschlag (de-DE), alle Blätter (D-34)', () => {
    const e = neuerEntwurf([ar1], [blatt('b1', 1), blatt('b2', 2)]);
    expect(e).toEqual({
      ...leer,
      aufmassIds: ['b1', 'b2'],
      umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: '0,50' }],
      sicherheitSatz: '5,00',
      gewaehrleistungSatz: '3,00',
    });
  });
});

describe('entwurfLesen', () => {
  it('liest de-DE-Beträge und -Sätze; leere Felder sind null, drei leere Forderungen das äußere null (D-44)', () => {
    const r = entwurfLesen({
      ...leer,
      art: 'schluss',
      eingang: '1.10.2026',
      rechnungsnummerAuftragnehmer: '  SR-7 ',
      aufmassIds: ['b1' as AufmassId],
      umlagen: [
        { bezeichnung: 'Baustrom', satz: '0,5' },
        { bezeichnung: '', satz: '' },
      ],
      gewaehrleistungSatz: '3',
    });
    expect(r).toEqual({
      ok: true,
      wert: {
        angaben: {
          rechnungsart: 'schluss',
          eingang: '2026-10-01',
          rechnungsnummerAuftragnehmer: 'SR-7',
          gefordert: null,
        },
        aufmassIds: ['b1'],
        abzuege: {
          umlagen: [{ bezeichnung: 'Baustrom', satz: '0.50' }],
          sicherheitSatz: null,
          gewaehrleistungSatz: '3.00',
        },
        a5: { vertragsstrafe: null, skonto: null, bauabzugsteuer: false },
      },
    });
  });

  it('nennt jede fehlende Forderung einzeln als null', () => {
    const r = entwurfLesen({ ...leer, gefordertBrutto: '12.121,33' });
    expect(r.ok && r.wert.angaben.gefordert).toEqual({ netto: null, brutto: '12121.33', zahlbetrag: null });
  });

  it('meldet unlesbare Felder mit deutscher Meldung, ohne etwas zu verwerfen', () => {
    const r = entwurfLesen({
      ...leer,
      eingang: '30.02.2026',
      gefordertNetto: '12.34',
      sicherheitSatz: '5,123',
      umlagen: [{ bezeichnung: 'Baustrom', satz: '' }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fehler.map((f) => f.feld)).toEqual([
      'eingang',
      'gefordertNetto',
      'umlagen.0.satz',
      'sicherheitSatz',
    ]);
    for (const f of r.fehler) expect(f.meldung).toMatch(/\S/);
  });
});

describe('Befehle', () => {
  it('Neue Rechnung: RechnungAnlegen mit der nächsten Nummer, nicht freigegeben', () => {
    const r = entwurfLesen(neuerEntwurf([ar1], [blatt('b1', 1), blatt('b2', 2)]));
    if (!r.ok) throw new Error('unlesbar');
    const b = rechnungAnlegenBefehl('r2' as RechnungId, P, A, [ar1], r.wert);
    expect(b).toEqual({
      art: 'RechnungAnlegen',
      rechnung: {
        id: 'r2',
        projektId: P,
        auftragsLvId: A,
        nummer: 2,
        art: 'abschlag',
        eingang: null,
        rechnungsnummerAuftragnehmer: null,
        gefordert: null,
        aufmassIds: ['b1', 'b2'],
        umlagen: ar1.umlagen,
        sicherheitSatz: '5.00',
        gewaehrleistungSatz: '3.00',
        freigabe: null,
      },
    });
  });

  it('Bearbeiten: nur die geänderten Teile als Befehle, unverändert keiner', () => {
    const offen = { ...ar1, freigabe: null };
    expect(entwurfAus(offen).eingang).toBe('16.09.2026');
    const gleich = entwurfLesen(entwurfAus(offen));
    if (!gleich.ok) throw new Error('unlesbar');
    expect(aenderungsbefehle(offen, gleich.wert)).toEqual([]);

    const r = entwurfLesen({
      ...entwurfAus(offen),
      gefordertZahlbetrag: '8.874,40',
      aufmassIds: ['b1', 'b2'] as AufmassId[],
    });
    if (!r.ok) throw new Error('unlesbar');
    expect(aenderungsbefehle(offen, r.wert)).toEqual([
      {
        art: 'RechnungsangabenSetzen',
        rechnungsart: 'abschlag',
        eingang: '2026-09-16',
        rechnungsnummerAuftragnehmer: 'AR-2026-001',
        gefordert: { netto: null, brutto: null, zahlbetrag: '8874.40' },
      },
      { art: 'RechnungsaufmasseSetzen', aufmassIds: ['b1', 'b2'] },
    ]);
  });

  it('die Reihenfolge der Blätter allein ist keine Änderung', () => {
    const offen = { ...ar1, freigabe: null, aufmassIds: ['b2', 'b1'] as AufmassId[] };
    const r = entwurfLesen({ ...entwurfAus(offen), aufmassIds: ['b1', 'b2'] as AufmassId[] });
    if (!r.ok) throw new Error('unlesbar');
    expect(aenderungsbefehle(offen, r.wert)).toEqual([]);
  });
});

// Ticket 152 (A5, D-72): Vertragsstrafe, Skonto und Bauabzugsteuer an der Rechnung.
describe('A5 im Formular', () => {
  const mitA5: Rechnung = {
    ...ar1,
    vertragsstrafe: { betrag: '1500.00' as Betrag, grund: 'Zwischenfrist Rohbau überschritten' },
    skonto: { satz: '3.00' as Prozent, fristTage: 14 },
    bauabzugsteuer: true,
  };

  it('neue Rechnung: Vertragsstrafe, Skonto und Bauabzugsteuer der vorigen als Vorschlag (D-128.3, D-143.5)', () => {
    const e = neuerEntwurf([mitA5], [blatt('b1', 1)]);
    expect(e).toMatchObject({
      vertragsstrafeBetrag: '1.500,00',
      vertragsstrafeGrund: 'Zwischenfrist Rohbau überschritten',
      skontoSatz: '3,00',
      skontoFrist: '14',
      bauabzugsteuer: true,
    });
  });

  it('liest die Felder; Anlegen nimmt sie nur mit, wenn gesetzt („fehlt“ heißt keine/aus, D-128.2)', () => {
    const r = entwurfLesen(neuerEntwurf([mitA5], [blatt('b1', 1)]));
    if (!r.ok) throw new Error('unlesbar');
    expect(r.wert.a5).toEqual({
      vertragsstrafe: { betrag: '1500.00', grund: 'Zwischenfrist Rohbau überschritten' },
      skonto: { satz: '3.00', fristTage: 14 },
      bauabzugsteuer: true,
    });
    const b = rechnungAnlegenBefehl('r2' as RechnungId, P, A, [mitA5], r.wert);
    expect(b.rechnung).toMatchObject({
      vertragsstrafe: { betrag: '1500.00', grund: 'Zwischenfrist Rohbau überschritten' },
      skonto: { satz: '3.00', fristTage: 14 },
      bauabzugsteuer: true,
    });

    const ohne = entwurfLesen(neuerEntwurf([ar1], [blatt('b1', 1)]));
    if (!ohne.ok) throw new Error('unlesbar');
    const c = rechnungAnlegenBefehl('r2' as RechnungId, P, A, [ar1], ohne.wert);
    expect(Object.keys(c.rechnung)).not.toContain('vertragsstrafe');
    expect(Object.keys(c.rechnung)).not.toContain('skonto');
    expect(Object.keys(c.rechnung)).not.toContain('bauabzugsteuer');
  });

  it('meldet unvollständige oder unzulässige Angaben am Feld, ohne etwas zu verwerfen', () => {
    const felder = (e: Partial<Rechnungsentwurf>): string[] => {
      const r = entwurfLesen({ ...leer, ...e });
      return r.ok ? [] : r.fehler.map((f) => f.feld);
    };
    expect(felder({ vertragsstrafeBetrag: '1.500,00' })).toEqual(['vertragsstrafeGrund']);
    expect(felder({ vertragsstrafeGrund: 'Verzug' })).toEqual(['vertragsstrafeBetrag']);
    expect(felder({ vertragsstrafeBetrag: '0,00', vertragsstrafeGrund: 'Verzug' })).toEqual([
      'vertragsstrafeBetrag',
    ]);
    expect(felder({ vertragsstrafeBetrag: '100', vertragsstrafeGrund: '   ' })).toEqual([
      'vertragsstrafeGrund',
    ]);
    expect(felder({ skontoSatz: '3' })).toEqual(['skontoFrist']);
    expect(felder({ skontoFrist: '14' })).toEqual(['skontoSatz']);
    expect(felder({ skontoSatz: '100', skontoFrist: '14' })).toEqual(['skontoSatz']);
    expect(felder({ skontoSatz: '0', skontoFrist: '14' })).toEqual(['skontoSatz']);
    expect(felder({ skontoSatz: '2', skontoFrist: '0' })).toEqual(['skontoFrist']);
    expect(felder({ skontoSatz: '2', skontoFrist: '366' })).toEqual(['skontoFrist']);
    expect(felder({ skontoSatz: '2', skontoFrist: '1,5' })).toEqual(['skontoFrist']);
    expect(felder({ skontoSatz: '2', skontoFrist: ' 365 ' })).toEqual([]);
  });

  it('Bearbeiten: je geänderter Angabe ein Befehl; entfernen schickt null bzw. false', () => {
    const offen = { ...mitA5, freigabe: null };
    const gleich = entwurfLesen(entwurfAus(offen));
    if (!gleich.ok) throw new Error('unlesbar');
    expect(aenderungsbefehle(offen, gleich.wert)).toEqual([]);

    const r = entwurfLesen({
      ...entwurfAus(offen),
      vertragsstrafeBetrag: '',
      vertragsstrafeGrund: '',
      skontoSatz: '2,00',
      skontoFrist: '10',
      bauabzugsteuer: false,
    });
    if (!r.ok) throw new Error('unlesbar');
    expect(aenderungsbefehle(offen, r.wert)).toEqual([
      { art: 'VertragsstrafeSetzen', vertragsstrafe: null },
      { art: 'SkontoSetzen', skonto: { satz: '2.00', fristTage: 10 } },
      { art: 'BauabzugsteuerSetzen', bauabzugsteuer: false },
    ]);
  });
});

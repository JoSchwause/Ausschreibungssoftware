// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 4: was die App aus einer eingelesenen XRechnung in eine Rechnung übernimmt. Gelesen wird mit
// `xrechnungLesen` (Ticket 76) an den selbst verfassten Bau-Dateien aus `packages/erechnung/testdaten/`; die Sollwerte
// stehen in deren README (BT-109, BT-112, BT-115).

import { readFileSync } from 'node:fs';
import { xrechnungLesen, type Eingangsrechnung } from '@tethys/erechnung';
import type { AufmassId, Betrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { entwurfLesen, neuerEntwurf } from './entwurf';
import { entwurfMitXRechnung, xrechnungUebernahme } from './xrechnung';

const testdatei = (name: string): string =>
  readFileSync(new URL(`../../../../packages/erechnung/testdaten/${name}`, import.meta.url), 'utf8');

function gelesen(name: string): Eingangsrechnung {
  const r = xrechnungLesen(testdatei(name)).rechnung;
  if (r === null) throw new Error(`${name} nicht gelesen`);
  return r;
}

describe('xrechnungUebernahme', () => {
  it('Abschlagsrechnung Bau (875, CII): Nummer, Datum, Art und die drei Forderungen', () => {
    expect(xrechnungUebernahme(gelesen('bau-abschlag-875.xml'))).toEqual({
      rechnungsnummer: 'AR-2026-001',
      datum: '2026-09-15',
      artCode: '875',
      art: 'abschlag',
      gefordert: { netto: '10185.99', brutto: '12121.33', zahlbetrag: '12121.33' },
    });
  });

  it('Schlussrechnung Bau (877, UBL) wird Schlussrechnung', () => {
    const u = xrechnungUebernahme(gelesen('bau-schluss-877.xml'));
    expect(u.artCode).toBe('877');
    expect(u.art).toBe('schluss');
  });

  it('jeder andere Code lässt die Art offen (die App fragt)', () => {
    const r = gelesen('bau-abschlag-875.xml');
    expect(xrechnungUebernahme({ ...r, rechnungsart: '380' }).art).toBeNull();
    expect(xrechnungUebernahme({ ...r, rechnungsart: null }).art).toBeNull();
  });

  it('fehlende Beträge bleiben einzeln null, ganz ohne Beträge ist die Forderung null (D-44)', () => {
    const r = gelesen('bau-abschlag-875.xml');
    const ohne = { ...r.summen, netto: null, brutto: null, zahlbetrag: null };
    expect(xrechnungUebernahme({ ...r, summen: { ...ohne, brutto: '5.00' as Betrag } }).gefordert).toEqual({
      netto: null,
      brutto: '5.00',
      zahlbetrag: null,
    });
    expect(xrechnungUebernahme({ ...r, summen: ohne }).gefordert).toBeNull();
  });
});

describe('entwurfMitXRechnung', () => {
  it('setzt Nummer, Eingang (Rechnungsdatum als Vorschlag), Art und Forderungen; Blätter und Abzüge bleiben', () => {
    const vorher = { ...neuerEntwurf([], []), aufmassIds: ['b1' as AufmassId], sicherheitSatz: '5,00' };
    const e = entwurfMitXRechnung(vorher, xrechnungUebernahme(gelesen('bau-abschlag-875.xml')), 'abschlag');
    expect(e).toEqual({
      ...vorher,
      art: 'abschlag',
      eingang: '15.09.2026',
      rechnungsnummerAuftragnehmer: 'AR-2026-001',
      gefordertNetto: '10.185,99',
      gefordertBrutto: '12.121,33',
      gefordertZahlbetrag: '12.121,33',
    });
    const w = entwurfLesen(e);
    expect(w.ok && w.wert.angaben.gefordert).toEqual({
      netto: '10185.99',
      brutto: '12121.33',
      zahlbetrag: '12121.33',
    });
  });

  it('ohne Nummer oder Datum in der Datei bleibt das Feld, wie es war', () => {
    const vorher = { ...neuerEntwurf([], []), eingang: '20.09.2026', rechnungsnummerAuftragnehmer: 'X' };
    const u = { ...xrechnungUebernahme(gelesen('bau-abschlag-875.xml')), rechnungsnummer: null, datum: null };
    const e = entwurfMitXRechnung(vorher, u, 'schluss');
    expect([e.eingang, e.rechnungsnummerAuftragnehmer, e.art]).toEqual(['20.09.2026', 'X', 'schluss']);
  });
});
